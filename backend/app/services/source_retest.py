from __future__ import annotations

import csv
import os
import time
from datetime import datetime
from pathlib import Path

from app import models
from app.config import settings
from app.database import SessionLocal
from app.services.ats_discovery import run_generic_ats_discovery
from app.services.ingestion import ensure_source, ensure_source_credential, ensure_source_health
from app.services.source_registry import record_source_evidence, refresh_source_support
from app.services.source_runtime import has_proven_source_success
from app.services.script_workers import ScriptWorkerService


def _count_csv_rows(path: Path) -> int:
    if not path.exists() or path.stat().st_size <= 0:
        return 0
    try:
        with path.open("r", encoding="utf-8", newline="") as handle:
            return sum(1 for _ in csv.DictReader(handle))
    except Exception:
        return 0


def _sample_query_for_source(source: models.Source) -> dict[str, object]:
    board_profiles: dict[str, dict[str, object]] = {
        "linkedin": {
            "term": "software engineer",
            "country": "USA",
            "location": "United States",
            "remote": False,
        },
        "remotive": {
            "term": "software engineer",
            "country": "USA",
            "location": "Remote",
            "remote": True,
        },
        "weworkremotely": {
            "term": "software engineer",
            "country": "USA",
            "location": "Remote",
            "remote": True,
        },
        "himalayas": {
            "term": "software engineer",
            "country": "USA",
            "location": "Remote",
            "remote": True,
        },
        "arbeitnow": {
            "term": "software engineer",
            "country": "USA",
            "location": "Remote",
            "remote": True,
        },
        "themuse": {
            "term": "software engineer",
            "country": "USA",
            "location": "United States",
            "remote": False,
        },
        "builtin": {
            "term": "software engineer",
            "country": "USA",
            "location": "United States",
            "remote": False,
        },
        "landingjobs": {
            "term": "software engineer",
            "country": "USA",
            "location": "Remote",
            "remote": True,
        },
        "powertofly": {
            "term": "software engineer",
            "country": "USA",
            "location": "Remote",
            "remote": True,
        },
        "virtualvocations": {
            "term": "customer success manager",
            "country": "USA",
            "location": "Remote",
            "remote": True,
        },
        "jobspresso": {
            "term": "software engineer",
            "country": "USA",
            "location": "Remote",
            "remote": True,
        },
        "workingnomads": {
            "term": "software engineer",
            "country": "USA",
            "location": "Remote",
            "remote": True,
        },
        "google": {
            "term": "software engineer",
            "country": "USA",
            "location": "United States",
            "remote": False,
        },
    }
    if source.site_key in board_profiles:
        return board_profiles[source.site_key]

    if source.site_key == "naukri":
        return {
            "term": "software engineer",
            "country": "INDIA",
            "location": "Bangalore",
            "remote": False,
        }

    if source.region == "india":
        return {
            "term": "marketing manager",
            "country": "INDIA",
            "location": "India",
            "remote": False,
        }

    if source.category == "remote":
        return {
            "term": "software engineer",
            "country": "USA",
            "location": "Remote",
            "remote": True,
        }

    regional_profiles = {
        "finland": ("software engineer", "FINLAND", "Finland"),
        "switzerland": ("software engineer", "SWITZERLAND", "Switzerland"),
        "singapore": ("software engineer", "SINGAPORE", "Singapore"),
        "russia": ("software engineer", "RUSSIA", "Russia"),
    }
    if source.region in regional_profiles:
        term, country, location = regional_profiles[source.region]
        return {
            "term": term,
            "country": country,
            "location": location,
            "remote": False,
        }

    return {
        "term": "software engineer",
        "country": "USA",
        "location": "United States",
        "remote": False,
    }


def _verify_credential_state(source: models.Source, credential: models.SourceCredential) -> tuple[bool, str | None]:
    if source.category == "ats" and credential.needs_api_key and not settings.scrappa_token:
        credential.credential_present = False
        return False, "ATS discovery needs SCRAPPA_TOKEN."

    credential.credential_present = True
    return True, None


def execute_source_retest(site_key: str) -> None:
    db = SessionLocal()
    had_proven_success = False
    previous_jobs_found = 0
    sample: dict[str, object] = {}
    try:
        source = ensure_source(db, site_key)
        health = ensure_source_health(db, site_key)
        credential = ensure_source_credential(db, site_key)
        had_proven_success = has_proven_source_success(health, credential)
        previous_jobs_found = int(health.last_run_jobs_found or 0)
        worker = ScriptWorkerService()

        started_at = time.perf_counter()
        health.status = "running"
        health.last_error_message = None
        db.commit()

        if not settings.enable_script_execution or not worker.root.exists():
            raise RuntimeError("Script execution is disabled or scraper workspace is unavailable.")

        credential_ok, credential_error = _verify_credential_state(source, credential)
        if not credential_ok:
            raise RuntimeError(credential_error or "Source setup is incomplete.")

        sample = _sample_query_for_source(source)
        query_signature = (
            f"{sample.get('term','')}|{sample.get('country','')}|"
            f"{sample.get('location','')}|{sample.get('remote', False)}"
        )
        output_dir = settings.data_dir / "source-retests"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_csv = output_dir / f"{source.site_key}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"

        exit_code = 1
        stderr = ""
        rows_found = 0

        if source.category == "ats":
            rows_found = run_generic_ats_discovery(
                token=settings.scrappa_token,
                role_query=str(sample["term"]),
                country=str(sample["country"]),
                location=str(sample["location"]),
                ats_boards=[source.site_key],
                output_csv=output_csv,
            )
            exit_code = 0 if rows_found > 0 else 1
            stderr = "" if rows_found > 0 else "ATS discovery returned no rows."
        elif source.engine == "botasaurus":
            browser_proxy = (
                settings.jobs_bota_proxy
                or settings.jobs_proxy
                or os.getenv("JOBS_BOTA_PROXY", "").strip()
                or os.getenv("JOBS_PROXY", "").strip()
            )
            result = worker.run_bota_scraper(
                {
                    "searchTerm": sample["term"],
                    "country": sample["country"],
                    "location": sample["location"],
                    "days": 7,
                    "resultsWanted": 3,
                    "sites": [source.site_key],
                    "proxy": browser_proxy or None,
                    "outputCsv": str(output_csv),
                    "headless": True,
                    "budgetSec": 75,
                }
            )
            exit_code = result.exit_code
            stderr = result.stderr.strip()
            if exit_code != 0:
                stderr = (
                    f"python_exe={worker.python_exe}\n"
                    f"browser_python_exe={getattr(worker, 'browser_python_exe', worker.python_exe)}\n"
                    f"jobs_bota_proxy={bool(settings.jobs_bota_proxy)} jobs_proxy={bool(settings.jobs_proxy)}\n"
                    f"{stderr}"
                ).strip()
            rows_found = _count_csv_rows(output_csv)
        else:
            result = worker.run_ever_jobs_search(
                {
                    "searchTerm": sample["term"],
                    "country": sample["country"],
                    "location": sample["location"],
                    "hoursOld": 24 * 7,
                    "resultsWanted": 3,
                    "isRemote": sample["remote"],
                    "siteType": [source.site_key],
                    "linkedinFetchDescription": False,
                    "proxies": [settings.jobs_proxy] if settings.jobs_proxy else None,
                },
                str(output_csv),
            )
            exit_code = result.exit_code
            stderr = result.stderr.strip()
            rows_found = _count_csv_rows(output_csv)

        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        if source.category == "ats" and rows_found <= 0:
            health.status = "ready"
            health.last_error_at = None
            health.last_error_message = None
            health.last_run_jobs_found = previous_jobs_found
            health.avg_latency_ms_7d = float(duration_ms)
            credential.working_status = (
                "working_but_not_for_current_query" if had_proven_success else "unknown"
            )
            credential.credential_present = True
            credential.credential_note = "Configured and reachable, but live ATS discovery returned no public rows for the current smoke query."
            record_source_evidence(
                db,
                site_key=source.site_key,
                evidence_type="live_retest",
                jobs_found=0,
                succeeded=False,
                query_signature=query_signature,
                country=str(sample.get("country") or ""),
                location=str(sample.get("location") or ""),
                details={"reason": "ATS discovery returned no rows."},
            )
            refresh_source_support(db, source.site_key, source=source, health=health, credential=credential)
            db.commit()
            return

        if exit_code != 0 or rows_found <= 0:
            raise RuntimeError(stderr or "Retest finished without returning any rows.")

        health.status = "ready"
        health.last_success_at = datetime.utcnow()
        health.last_error_at = None
        health.last_error_message = None
        health.avg_results_7d = float(rows_found)
        health.avg_latency_ms_7d = float(duration_ms)
        health.success_rate_7d = 100.0
        health.last_run_jobs_found = rows_found
        credential.working_status = "working"
        credential.credential_verified_at = datetime.utcnow()
        credential.credential_note = f"Last retest returned {rows_found} rows."
        record_source_evidence(
            db,
            site_key=source.site_key,
            evidence_type="live_retest",
            jobs_found=rows_found,
            succeeded=True,
            query_signature=query_signature,
            country=str(sample.get("country") or ""),
            location=str(sample.get("location") or ""),
            details={"durationMs": duration_ms, "outputCsv": str(output_csv)},
        )
        refresh_source_support(db, source.site_key, source=source, health=health, credential=credential)
        db.commit()
    except Exception as exc:
        source = ensure_source(db, site_key)
        health = ensure_source_health(db, site_key)
        credential = ensure_source_credential(db, site_key)
        error_message = str(exc)[:500]
        if had_proven_success:
            health.status = "ready"
            health.last_error_at = datetime.utcnow()
            health.last_error_message = error_message
            health.last_run_jobs_found = max(int(health.last_run_jobs_found or 0), previous_jobs_found)
            credential.working_status = "working_but_not_for_current_query"
            credential.credential_note = (
                "Latest retest did not return rows for the smoke query, but this source has prior successful imports from this backend environment."
            )
        else:
            health.status = "failed"
            health.last_error_at = datetime.utcnow()
            health.last_error_message = error_message
            health.last_run_jobs_found = 0
            health.success_rate_7d = 0
            credential.working_status = "failing_or_unreliable"
            if not credential.credential_note:
                credential.credential_note = "Latest retest failed."
        record_source_evidence(
            db,
            site_key=source.site_key,
            evidence_type="live_retest",
            jobs_found=0,
            succeeded=False,
            query_signature=(
                f"{sample.get('term','')}|{sample.get('country','')}|"
                f"{sample.get('location','')}|{sample.get('remote', False)}"
                if sample
                else None
            ),
            country=str(sample.get("country") or "") if sample else None,
            location=str(sample.get("location") or "") if sample else None,
            details={"error": error_message},
        )
        refresh_source_support(db, source.site_key, source=source, health=health, credential=credential)
        db.commit()
    finally:
        db.close()
