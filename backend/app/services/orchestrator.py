from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path

from app import models
from app.config import settings
from app.database import SessionLocal
from app.services.ats_discovery import run_generic_ats_discovery
from app.services.ats_public_jobs import (
    fetch_public_ats_board_jobs,
    register_discovered_ats_rows,
    write_public_ats_csv,
)
from app.services.ingestion import (
    OutputFile,
    _csv_has_ats_schema,
    _csv_has_job_schema,
    discover_output_files,
    ensure_source_credential,
    ensure_source_health,
    ingest_campaign_outputs,
    output_file_matches_campaign,
    snapshot_results,
)
from app.services.leadership_strategy import (
    build_search_batches,
    preferred_ats_boards_for_campaign,
    preferred_search_boards_for_campaign,
)
from app.services.script_workers import ScriptWorkerService
from app.services.storage import materialize_artifact_to_path
from app.services.source_runtime import get_preferred_live_search_boards
from app.utils import make_id


def _log_run(
    db,
    run_id: str,
    level: str,
    message: str,
    *,
    source_key: str | None = None,
    details: dict | None = None,
    ) -> None:
    db.add(
        models.RunLog(
            id=make_id("log"),
            campaign_run_id=run_id,
            source_key=source_key,
            level=level,
            message=message,
            details_json=details or {},
        )
    )


def _log_run_and_commit(
    db,
    run_id: str,
    level: str,
    message: str,
    *,
    source_key: str | None = None,
    details: dict | None = None,
) -> None:
    _log_run(
        db,
        run_id,
        level,
        message,
        source_key=source_key,
        details=details,
    )
    db.commit()


def _mark_source_failure(db, site_key: str, error: str) -> None:
    health = ensure_source_health(db, site_key)
    credential = ensure_source_credential(db, site_key)
    health.status = "failed"
    health.last_error_at = datetime.utcnow()
    health.last_error_message = error[:500]
    credential.working_status = "failing_or_unreliable"


def _empty_run_summary(source_summary: list[dict]) -> dict[str, object]:
    return {
        "job_count": 0,
        "company_count": 0,
        "matched_company_count": 0,
        "source_summary": source_summary,
    }


def _seed_demo_run(db, campaign: models.Campaign, run: models.CampaignRun) -> dict[str, object]:
    company = models.Company(
        id=make_id("com"),
        name="Pepper",
        website="https://www.pepper.inc",
        domain="pepper.inc",
        industry="AI Content Operations",
        location=campaign.location,
        description="Demo fallback record used when no scraper output files are available.",
        open_roles=1,
        status="active",
        revengineer_fit="medium",
        priority="medium",
        objective_signal="Demo fallback signal",
        title_match=campaign.role_query.split("OR")[0].strip(),
        days_active=1,
        source="Demo seed",
        web_evidence="No real output files were available for this run, so the backend seeded a placeholder record.",
        web_sources=[],
    )
    db.add(company)
    db.flush()

    job = models.Job(
        id=make_id("job"),
        campaign_run_id=run.id,
        company_id=company.id,
        site="demo_seed",
        engine="backend_seed",
        external_id=make_id("ext"),
        job_url="https://example.com/demo-job",
        title=campaign.role_query.split("OR")[0].strip() or "Demo role",
        company_name=company.name,
        location=campaign.location,
        date_posted=datetime.utcnow().date().isoformat(),
        job_type="fulltime",
        is_remote=campaign.remote_only,
        description="Demo fallback job row.",
        normalized_hash=make_id("hash"),
        matched_title=True,
        matched_objective=bool(campaign.objective_filter_config),
        raw_payload_json={},
    )
    db.add(job)
    db.add(
        models.CompanySignal(
            id=make_id("sig"),
            company_id=company.id,
            campaign_run_id=run.id,
            objective_score=5,
            objective_classification="possible",
            matched_signals=["demo fallback"],
            evidence_snippet=company.web_evidence,
        )
    )
    report = models.Report(
        id=make_id("rep"),
        campaign_run_id=run.id,
        name=f"{campaign.name} Demo Output",
        report_type="campaign_export",
        status="ready",
        focus="Campaign output",
        metric="1 demo job",
        summary="No real scraper outputs were found, so the backend returned a placeholder run.",
        generated_at=datetime.utcnow(),
    )
    db.add(report)
    return {
        "job_count": 1,
        "company_count": 1,
        "matched_company_count": 1,
        "source_summary": [
            {
                "siteKey": "demo_seed",
                "status": "completed",
                "jobsFound": 1,
                "durationMs": None,
                "error": None,
            }
        ],
    }


def _record_batch_result(source_summary: list[dict], site_key: str, exit_code: int, stderr: str) -> None:
    source_summary.append(
        {
            "siteKey": site_key,
            "status": "completed" if exit_code == 0 else "failed",
            "jobsFound": 0,
            "durationMs": None,
            "error": None if exit_code == 0 else stderr[:300],
        }
    )


def _hours_old(days: int) -> int:
    return max(days, 1) * 24


def _campaign_boards(campaign: models.Campaign) -> tuple[list[str], list[str], list[str]]:
    config = campaign.source_config or {}
    search_boards = [str(item).strip() for item in config.get("searchBoards", []) if str(item).strip()]
    browser_boards = [str(item).strip() for item in config.get("browserBoards", []) if str(item).strip()]
    ats_boards = [str(item).strip() for item in config.get("atsBoards", []) if str(item).strip()]
    search_boards = preferred_search_boards_for_campaign(campaign, search_boards)
    ats_boards = preferred_ats_boards_for_campaign(campaign, ats_boards)
    return search_boards, browser_boards, ats_boards


def _selected_source_keys(campaign: models.Campaign) -> set[str]:
    search_boards, browser_boards, ats_boards = _campaign_boards(campaign)
    return {
        str(item).strip().lower()
        for item in [*search_boards, *browser_boards, *ats_boards]
        if str(item).strip()
    }


def _campaign_search_term(campaign: models.Campaign) -> str:
    return campaign.role_query.strip() or campaign.name.strip() or "marketing"


def _normalized_live_location(location: str | None) -> str:
    normalized = (location or "").strip().lower()
    if normalized in {"entire world", "worldwide", "global", "remote worldwide", "anywhere"}:
        return ""
    return (location or "").strip()


def _cleanup_temp_run_files(run_id: str) -> list[str]:
    removed: list[str] = []
    if not settings.cleanup_temp_results:
        return removed

    candidate_dirs = [
        settings.results_dir,
        settings.data_dir,
    ]

    for base_dir in candidate_dirs:
        if not base_dir.exists():
            continue
        for path in base_dir.iterdir():
            if not path.is_file():
                continue
            if not path.name.startswith(f"{run_id}-"):
                continue
            try:
                path.unlink(missing_ok=True)
                removed.append(str(path))
            except Exception:
                continue
    return removed


def _is_strict_live_campaign(campaign: models.Campaign) -> bool:
    search_boards, browser_boards, ats_boards = _campaign_boards(campaign)
    return bool(search_boards or browser_boards or ats_boards)


def _historical_output_fallbacks(
    db,
    campaign: models.Campaign,
    run_id: str,
    *,
    limit: int = 6,
) -> list[OutputFile]:
    selected_sources = {
        *(_campaign_boards(campaign)[0]),
        *(_campaign_boards(campaign)[1]),
        *(_campaign_boards(campaign)[2]),
    }
    if not selected_sources:
        return []

    candidate_runs = (
        db.query(models.CampaignRun)
        .filter(
            models.CampaignRun.id != run_id,
            models.CampaignRun.status == "completed",
            models.CampaignRun.raw_job_count > 0,
        )
        .order_by(models.CampaignRun.finished_at.desc())
        .all()
    )

    outputs: list[OutputFile] = []
    seen_paths: set[str] = set()
    for candidate_run in candidate_runs:
        summary = candidate_run.source_summary or []
        matching_sources = {
            str(item.get("siteKey"))
            for item in summary
            if item.get("status") == "completed" and str(item.get("siteKey")) in selected_sources
        }
        if not matching_sources:
            continue

        reports = (
            db.query(models.Report)
            .filter(models.Report.campaign_run_id == candidate_run.id)
            .order_by(models.Report.generated_at.desc())
            .all()
        )
        compatible_outputs: list[OutputFile] = []
        for report in reports:
            artifacts = (
                db.query(models.Artifact)
                .filter(models.Artifact.report_id == report.id)
                .all()
            )
            for artifact in artifacts:
                try:
                    path = materialize_artifact_to_path(
                        artifact,
                        settings.data_dir / "materialized_artifacts",
                    )
                except FileNotFoundError:
                    continue
                if str(path) in seen_paths:
                    continue

                suffix = path.suffix.lower()
                if suffix == ".csv":
                    if not (_csv_has_job_schema(path) or _csv_has_ats_schema(path)):
                        continue
                    if not output_file_matches_campaign(path, campaign):
                        continue
                elif suffix == ".xlsx":
                    if not output_file_matches_campaign(path, campaign):
                        continue
                else:
                    continue

                compatible_outputs.append(
                    OutputFile(
                        path=path,
                        kind=suffix.lstrip("."),
                        source_key=next(iter(matching_sources), None),
                    )
                )
                seen_paths.add(str(path))
                if len(compatible_outputs) >= limit:
                    outputs.extend(compatible_outputs)
                    return outputs[:limit]

        if compatible_outputs:
            outputs.extend(compatible_outputs)
            return outputs[:limit]

    return outputs


def _completed_fallback_summary(output_files: list[OutputFile]) -> list[dict]:
    source_keys = []
    for output in output_files:
        if output.source_key and output.source_key not in source_keys:
            source_keys.append(output.source_key)

    if not source_keys:
        return [
            {
                "siteKey": "historical_artifact",
                "status": "completed",
                "jobsFound": 0,
                "durationMs": None,
                "error": None,
            }
        ]

    return [
        {
            "siteKey": source_key,
            "status": "completed",
            "jobsFound": 0,
            "durationMs": None,
            "error": None,
        }
        for source_key in source_keys
    ]


def _summary_has_source_failures(summary: dict[str, object]) -> bool:
    return any(
        item.get("status") == "failed"
        for item in list(summary.get("source_summary") or [])
        if isinstance(item, dict)
    )


def _generic_live_outputs(
    db,
    campaign: models.Campaign,
    run: models.CampaignRun,
    worker: ScriptWorkerService,
    source_summary: list[dict],
) -> list[OutputFile]:
    outputs: list[OutputFile] = []
    search_boards, browser_boards, ats_boards = _campaign_boards(campaign)
    search_term = _campaign_search_term(campaign)

    if search_boards:
        live_location = _normalized_live_location(campaign.location)
        search_batches = build_search_batches(campaign, search_boards)
        _log_run_and_commit(
            db,
            run.id,
            "info",
            "Prepared leadership-aware search batches.",
            source_key="generic_search",
            details={
                "requestedBoards": search_boards,
                "batches": [
                    {"label": batch.label, "query": batch.query, "boards": batch.boards}
                    for batch in search_batches
                ],
            },
        )
        for index, batch in enumerate(search_batches, start=1):
            search_csv = settings.results_dir / f"{run.id}-search-{index}.csv"
            payload = {
                "searchTerm": batch.query,
                "country": campaign.country,
                "location": live_location,
                "hoursOld": _hours_old(campaign.days),
                "resultsWanted": campaign.results_per_source,
                "isRemote": campaign.remote_only,
                "siteType": batch.boards,
                "linkedinFetchDescription": True,
                "proxies": [settings.jobs_proxy] if settings.jobs_proxy else None,
            }
            _log_run_and_commit(
                db,
                run.id,
                "info",
                "Starting generic ever-jobs search batch.",
                source_key="generic_search",
                details={
                    "batchLabel": batch.label,
                    "query": batch.query,
                    "boards": batch.boards,
                    "outputCsv": str(search_csv),
                    "timeoutSec": settings.search_timeout_seconds,
                },
            )
            result = worker.run_ever_jobs_search(payload, str(search_csv))
            search_ok = result.exit_code == 0 and search_csv.exists() and search_csv.stat().st_size > 0
            _log_run(
                db,
                run.id,
                "info" if search_ok else "error",
                "Executed generic ever-jobs search batch.",
                source_key="generic_search",
                details={
                    "batchLabel": batch.label,
                    "query": batch.query,
                    "exitCode": result.exit_code,
                    "boards": batch.boards,
                    "outputCsv": str(search_csv),
                    "stderr": result.stderr[:800],
                },
            )
            for board in batch.boards:
                _record_batch_result(
                    source_summary,
                    board,
                    0 if search_ok else max(result.exit_code, 1),
                    result.stderr or "Search completed without producing a usable output file.",
                )
            if search_ok:
                outputs.append(OutputFile(path=search_csv, kind="csv"))

    if browser_boards:
        bota_csv = settings.results_dir / f"{run.id}-browser.csv"
        live_location = _normalized_live_location(campaign.location)
        config = {
            "searchTerm": search_term,
            "country": campaign.country,
            "location": live_location,
            "days": campaign.days,
            "resultsWanted": campaign.results_per_source,
            "sites": browser_boards,
            "proxy": settings.jobs_bota_proxy or None,
            "outputCsv": str(bota_csv),
            "headless": True,
            "budgetSec": max(90, 45 + (len(browser_boards) * 45)),
        }
        _log_run_and_commit(
            db,
            run.id,
            "info",
            "Starting browser-backed scrape.",
            source_key="generic_browser",
            details={
                "boards": browser_boards,
                "outputCsv": str(bota_csv),
                "budgetSec": config["budgetSec"],
            },
        )
        result = worker.run_bota_scraper(config)
        browser_ok = result.exit_code == 0 and bota_csv.exists() and bota_csv.stat().st_size > 0
        _log_run(
            db,
            run.id,
            "info" if browser_ok else "error",
            "Executed generic browser scrape.",
            source_key="generic_browser",
            details={
                "exitCode": result.exit_code,
                "boards": browser_boards,
                "outputCsv": str(bota_csv),
                "stderr": result.stderr[:800],
            },
        )
        for board in browser_boards:
            _record_batch_result(
                source_summary,
                board,
                0 if browser_ok else max(result.exit_code, 1),
                result.stderr or "Browser scrape completed without producing a usable output file.",
            )
        if browser_ok:
            outputs.append(OutputFile(path=bota_csv, kind="csv"))
            if "naukri" in browser_boards:
                enriched_csv = settings.results_dir / f"{run.id}-naukri-enriched.csv"
                enrichment = worker.run_naukri_description_enrichment(
                    str(bota_csv),
                    str(enriched_csv),
                    limit=min(campaign.results_per_source, 50),
                )
                _log_run(
                    db,
                    run.id,
                    "info" if enrichment.exit_code == 0 else "warning",
                    "Executed generic naukri description enrichment.",
                    source_key="naukri",
                    details={
                        "exitCode": enrichment.exit_code,
                        "inputCsv": str(bota_csv),
                        "outputCsv": str(enriched_csv),
                        "stderr": enrichment.stderr[:800],
                    },
                )
                if enrichment.exit_code == 0 and enriched_csv.exists():
                    outputs[-1] = OutputFile(path=enriched_csv, kind="csv")

    if ats_boards:
        public_ats_rows: list[dict] = []
        public_ats_errors: dict[str, str] = {}
        ats_public_counts: dict[str, int] = {}
        unresolved_ats_boards = list(ats_boards)
        discovery_count = 0
        _log_run_and_commit(
            db,
            run.id,
            "info",
            "Starting ATS collection.",
            source_key="ats_discovery",
            details={"boards": ats_boards, "paidDiscoveryEnabled": bool(settings.scrappa_token)},
        )

        _log_run(
            db,
            run.id,
            "info",
            "Attempting public ATS fetchers from the slug registry first.",
            source_key="ats_discovery",
            details={"boards": ats_boards},
        )
        db.commit()
        for board in ats_boards:
            _log_run_and_commit(
                db,
                run.id,
                "info",
                f"Starting public ATS fetch for {board}.",
                source_key=board,
                details={
                    "siteKey": board,
                    "resultsWanted": campaign.results_per_source,
                },
            )
            rows, fetch_error = fetch_public_ats_board_jobs(
                db,
                site_key=board,
                campaign=campaign,
                limit=campaign.results_per_source,
            )
            if rows:
                public_ats_rows.extend(rows)
                ats_public_counts[board] = len(rows)
                _log_run_and_commit(
                    db,
                    run.id,
                    "info",
                    f"Completed public ATS fetch for {board}.",
                    source_key=board,
                    details={
                        "siteKey": board,
                        "jobsFound": len(rows),
                    },
                )
            elif fetch_error:
                public_ats_errors[board] = fetch_error
                _log_run_and_commit(
                    db,
                    run.id,
                    "warning",
                    f"Public ATS fetch for {board} returned no usable jobs.",
                    source_key=board,
                    details={
                        "siteKey": board,
                        "error": fetch_error,
                    },
                )

        unresolved_ats_boards = [board for board in ats_boards if ats_public_counts.get(board, 0) <= 0]

        if settings.scrappa_token and unresolved_ats_boards:
            ats_csv = settings.results_dir / f"{run.id}-ats.csv"
            discovery_count = run_generic_ats_discovery(
                token=settings.scrappa_token,
                role_query=search_term,
                country=campaign.country,
                location=_normalized_live_location(campaign.location),
                ats_boards=unresolved_ats_boards,
                output_csv=ats_csv,
            )
            _log_run(
                db,
                run.id,
                "info",
                "Executed generic ATS discovery for unresolved boards.",
                source_key="ats_discovery",
                details={
                    "boards": unresolved_ats_boards,
                    "outputCsv": str(ats_csv),
                    "rows": discovery_count,
                },
            )
            if ats_csv.exists():
                outputs.append(OutputFile(path=ats_csv, kind="csv", source_key="ats_discovery"))
                try:
                    with ats_csv.open("r", encoding="utf-8", errors="ignore", newline="") as handle:
                        register_discovered_ats_rows(db, list(csv.DictReader(handle)))
                except Exception:
                    pass
                for board in unresolved_ats_boards:
                    _log_run_and_commit(
                        db,
                        run.id,
                        "info",
                        f"Retrying public ATS fetch for {board} after ATS discovery.",
                        source_key=board,
                        details={"siteKey": board},
                    )
                    rows, fetch_error = fetch_public_ats_board_jobs(
                        db,
                        site_key=board,
                        campaign=campaign,
                        limit=campaign.results_per_source,
                    )
                    if rows:
                        public_ats_rows.extend(rows)
                        ats_public_counts[board] = len(rows)
                        public_ats_errors.pop(board, None)
                        _log_run_and_commit(
                            db,
                            run.id,
                            "info",
                            f"Completed post-discovery ATS fetch for {board}.",
                            source_key=board,
                            details={
                                "siteKey": board,
                                "jobsFound": len(rows),
                            },
                        )
                    elif fetch_error:
                        public_ats_errors[board] = fetch_error
                        _log_run_and_commit(
                            db,
                            run.id,
                            "warning",
                            f"Post-discovery ATS fetch for {board} still returned no usable jobs.",
                            source_key=board,
                            details={
                                "siteKey": board,
                                "error": fetch_error,
                            },
                        )

        if public_ats_rows:
            public_ats_csv = settings.results_dir / f"{run.id}-ats-public.csv"
            write_public_ats_csv(public_ats_csv, public_ats_rows)
            outputs.append(OutputFile(path=public_ats_csv, kind="csv"))

        if not ats_public_counts:
            for row in public_ats_rows:
                site_key = str(row.get("site") or "").strip().lower()
                ats_public_counts[site_key] = ats_public_counts.get(site_key, 0) + 1

        for board in ats_boards:
            jobs_found = ats_public_counts.get(board, 0)
            discovery_found = discovery_count if settings.scrappa_token else 0
            has_any_signal = jobs_found > 0 or discovery_found > 0
            source_summary.append(
                {
                    "siteKey": board,
                    "status": "completed" if has_any_signal else "failed",
                    "jobsFound": jobs_found,
                    "durationMs": None,
                    "error": None if has_any_signal else public_ats_errors.get(
                        board,
                        (
                            "No ATS discovery rows were found."
                            if settings.scrappa_token
                            else "No verified ATS slugs or public ATS jobs were available for this family."
                        ),
                    ),
                }
            )

    return outputs


def _search_rescue_outputs(
    db,
    campaign: models.Campaign,
    run: models.CampaignRun,
    worker: ScriptWorkerService,
    source_summary: list[dict],
) -> list[OutputFile]:
    search_boards, _, _ = _campaign_boards(campaign)
    if not search_boards:
        return []

    rescue_candidates = get_preferred_live_search_boards(
        db,
        allowed_site_keys=search_boards if len(search_boards) > 1 else None,
        exclude_site_keys=search_boards if len(search_boards) == 1 else None,
        limit=6,
    )
    if not rescue_candidates:
        return []

    rescue_csv = settings.results_dir / f"{run.id}-rescue-search.csv"
    payload = {
        "searchTerm": _campaign_search_term(campaign),
        "country": campaign.country,
        "location": _normalized_live_location(campaign.location),
        "hoursOld": _hours_old(campaign.days),
        "resultsWanted": campaign.results_per_source,
        "isRemote": campaign.remote_only,
        "siteType": rescue_candidates,
        "linkedinFetchDescription": True,
        "proxies": [settings.jobs_proxy] if settings.jobs_proxy else None,
    }
    _log_run_and_commit(
        db,
        run.id,
        "warning",
        "Starting healthy-source rescue search.",
        source_key="search_rescue",
        details={
            "boards": rescue_candidates,
            "outputCsv": str(rescue_csv),
            "timeoutSec": settings.search_timeout_seconds,
        },
    )
    result = worker.run_ever_jobs_search(payload, str(rescue_csv))
    rescue_ok = result.exit_code == 0 and rescue_csv.exists() and rescue_csv.stat().st_size > 0
    _log_run(
        db,
        run.id,
        "info" if rescue_ok else "warning",
        "Executed healthy-source rescue search.",
        source_key="search_rescue",
        details={
            "exitCode": result.exit_code,
            "boards": rescue_candidates,
            "outputCsv": str(rescue_csv),
            "stderr": result.stderr[:800],
        },
    )
    if not rescue_ok:
        return []

    for board in rescue_candidates:
        source_summary.append(
            {
                "siteKey": board,
                "status": "completed",
                "jobsFound": 0,
                "durationMs": None,
                "error": None,
            }
        )

    return [OutputFile(path=rescue_csv, kind="csv")]


def execute_campaign_run(campaign_id: str, run_id: str) -> None:
    db = SessionLocal()
    try:
        run = db.get(models.CampaignRun, run_id)
        campaign = db.get(models.Campaign, campaign_id)
        if not run or not campaign:
            return

        run.status = "running"
        run.started_at = datetime.utcnow()
        run.source_summary = []
        run.run_notes = "Starting campaign run orchestration."
        db.commit()

        source_summary: list[dict] = []
        before_snapshot = snapshot_results(settings.results_dir)
        worker = ScriptWorkerService()
        fresh_outputs: list[OutputFile] = []
        used_historical_output_fallback = False
        strict_live_mode = (
            settings.enable_script_execution and worker.root.exists() and _is_strict_live_campaign(campaign)
        )
        _log_run(
            db,
            run.id,
            "info",
            "Campaign run started.",
            details={"campaignName": campaign.name, "country": campaign.country},
        )
        db.commit()

        if settings.enable_script_execution and worker.root.exists():
            fresh_outputs = _generic_live_outputs(db, campaign, run, worker, source_summary)
            if strict_live_mode and not fresh_outputs:
                fresh_outputs = _search_rescue_outputs(db, campaign, run, worker, source_summary)

            legacy_fallback_mode = not strict_live_mode

            if legacy_fallback_mode and not fresh_outputs and "ats" in campaign.name.lower():
                result = worker.run_scrappa_ats()
                _record_batch_result(source_summary, "ats_discovery", result.exit_code, result.stderr)
                _log_run(
                    db,
                    run.id,
                    "info" if result.exit_code == 0 else "error",
                    "Executed scrappa_ats.mjs",
                    source_key="ats_discovery",
                    details={"exitCode": result.exit_code, "stderr": result.stderr[:800]},
                )
            elif legacy_fallback_mode and not fresh_outputs and (
                "india" in campaign.name.lower() or campaign.country.upper() == "INDIA"
            ):
                result = worker.run_india_marketing()
                _record_batch_result(source_summary, "india_marketing_batch", result.exit_code, result.stderr)
                _log_run(
                    db,
                    run.id,
                    "info" if result.exit_code == 0 else "error",
                    "Executed india-marketing.mjs",
                    source_key="india_marketing_batch",
                    details={"exitCode": result.exit_code, "stderr": result.stderr[:800]},
                )

                result = worker.run_extra_boards()
                _record_batch_result(source_summary, "extra_boards_batch", result.exit_code, result.stderr)
                _log_run(
                    db,
                    run.id,
                    "info" if result.exit_code == 0 else "error",
                    "Executed extra-boards.mjs",
                    source_key="extra_boards_batch",
                    details={"exitCode": result.exit_code, "stderr": result.stderr[:800]},
                )

                result = worker.run_scrappa_ats()
                _record_batch_result(source_summary, "ats_discovery", result.exit_code, result.stderr)
                _log_run(
                    db,
                    run.id,
                    "info" if result.exit_code == 0 else "error",
                    "Executed scrappa_ats.mjs",
                    source_key="ats_discovery",
                    details={"exitCode": result.exit_code, "stderr": result.stderr[:800]},
                )

                latest_candidate = next(
                    (
                        path
                        for path in discover_output_files(campaign, before_snapshot, limit=20)
                        if path.path.suffix.lower() == ".csv" and "LAST30D_full" in path.path.name
                    ),
                    None,
                )
                if latest_candidate is not None:
                    enriched_path = settings.data_dir / f"{run.id}-naukri-enriched.csv"
                    result = worker.run_naukri_description_enrichment(
                        str(latest_candidate.path),
                        str(enriched_path),
                        limit=25,
                    )
                    _record_batch_result(
                        source_summary,
                        "naukri_description_enrichment",
                        result.exit_code,
                        result.stderr,
                    )
                    _log_run(
                        db,
                        run.id,
                        "info" if result.exit_code == 0 else "error",
                        "Executed naukri_desc.py",
                        source_key="naukri_description_enrichment",
                        details={
                            "exitCode": result.exit_code,
                            "inputCsv": str(latest_candidate.path),
                            "outputCsv": str(enriched_path),
                            "stderr": result.stderr[:800],
                        },
                    )

                result = worker.run_build_excel()
                _record_batch_result(source_summary, "excel_report_build", result.exit_code, result.stderr)
                _log_run(
                    db,
                    run.id,
                    "info" if result.exit_code == 0 else "error",
                    "Executed build_excel.py",
                    source_key="excel_report_build",
                    details={"exitCode": result.exit_code, "stderr": result.stderr[:800]},
                )

                result = worker.run_add_us_target_companies_tab()
                _record_batch_result(
                    source_summary,
                    "us_target_companies_report",
                    result.exit_code,
                    result.stderr,
                )
                _log_run(
                    db,
                    run.id,
                    "info" if result.exit_code == 0 else "error",
                    "Executed add_us_target_companies_tab.py",
                    source_key="us_target_companies_report",
                    details={"exitCode": result.exit_code, "stderr": result.stderr[:800]},
                )

        if strict_live_mode:
            output_files = list(fresh_outputs)
        else:
            output_files = fresh_outputs or discover_output_files(
                campaign,
                before_snapshot,
                allow_fallback=True,
                limit=20,
            )
        if output_files:
            _log_run(
                db,
                run.id,
                "info",
                "Discovered output files for ingestion.",
                details={
                    "files": [str(output.path) for output in output_files],
                    "freshRunOutputs": bool(fresh_outputs),
                },
            )
            run_mode = "fresh_live" if fresh_outputs else "historical_import"
            summary = ingest_campaign_outputs(
                db,
                campaign,
                run,
                output_files,
                _completed_fallback_summary(output_files)
                if used_historical_output_fallback
                else source_summary,
                ingestion_mode=run_mode,
                restrict_to_campaign_title_match=strict_live_mode,
                mark_empty_results_as_failed=strict_live_mode,
                allowed_source_keys=_selected_source_keys(campaign) if used_historical_output_fallback else None,
                source_evidence_type=(
                    "fallback_import"
                    if used_historical_output_fallback
                    else "fresh_live_import" if run_mode == "fresh_live" else "historical_import"
                ),
            )
        elif strict_live_mode:
            _log_run(
                db,
                run.id,
                "error",
                "No fresh output files were produced for this live run.",
                details={"strictLiveMode": True},
            )
            summary = _empty_run_summary(source_summary)
        else:
            _log_run(
                db,
                run.id,
                "error",
                "No output files were produced for this run.",
            )
            summary = _empty_run_summary(source_summary)

        for item in summary["source_summary"]:
            if item.get("status") == "failed":
                _mark_source_failure(db, str(item.get("siteKey")), str(item.get("error") or "Unknown source failure"))
                _log_run(
                    db,
                    run.id,
                    "error",
                    f"Source failed: {item.get('siteKey')}",
                    source_key=str(item.get("siteKey")),
                    details=item,
                )
            else:
                _log_run(
                    db,
                    run.id,
                    "info",
                    f"Source completed: {item.get('siteKey')}",
                    source_key=str(item.get("siteKey")),
                    details=item,
                )

        if output_files:
            if int(summary["job_count"]) == 0:
                run_mode = "live_attempt_failed" if strict_live_mode else "historical_import"
            elif used_historical_output_fallback:
                run_mode = "historical_import"
            elif int(summary["job_count"]) == 0 and _summary_has_source_failures(summary):
                run_mode = "live_attempt_failed"
            else:
                run_mode = "fresh_live" if fresh_outputs else "historical_import"
        else:
            run_mode = "live_attempt_failed"

        run.status = (
            "failed"
            if run_mode == "live_attempt_failed"
            or (
                int(summary["job_count"]) == 0
                and any(item.get("status") == "failed" for item in summary["source_summary"])
            )
            else "completed"
        )
        run.finished_at = datetime.utcnow()
        run.raw_job_count = int(summary["job_count"])
        run.matched_job_count = int(summary["job_count"])
        run.company_count = int(summary["company_count"])
        run.error_count = len(
            [item for item in summary["source_summary"] if item.get("status") == "failed"]
        )
        run.source_summary = list(summary["source_summary"])
        if run_mode == "live_attempt_failed":
            run.run_notes = (
                f"[{run_mode}] Live scrape did not produce campaign-relevant rows. "
                "Check source logs, credentials, and whether historical fallback artifacts match the current role intent."
            )
        elif used_historical_output_fallback:
            run.run_notes = (
                f"[{run_mode}] Live scrape returned no fresh files, so the backend reused the latest "
                f"successful historical artifacts and imported {summary['job_count']} jobs across "
                f"{summary['company_count']} companies."
            )
        else:
            run.run_notes = (
                f"[{run_mode}] Imported {summary['job_count']} jobs and "
                f"{summary['company_count']} companies."
            )

        campaign.status = run.status
        campaign.last_run_id = run.id

        db.commit()
        removed_temp_files = _cleanup_temp_run_files(run.id)
        if removed_temp_files:
            _log_run_and_commit(
                db,
                run.id,
                "info",
                "Cleaned up temporary run output files after database persistence.",
                details={"removedFiles": removed_temp_files},
            )
    except Exception:
        run = db.get(models.CampaignRun, run_id)
        campaign = db.get(models.Campaign, campaign_id)
        if run is not None:
            run.status = "failed"
            run.finished_at = datetime.utcnow()
            run.error_count = max(run.error_count, 1)
            run.run_notes = "Campaign run failed. Check run logs for details."
            _log_run(db, run_id, "error", "Campaign run failed with an unhandled exception.")
        if campaign is not None:
            campaign.status = "failed"
        db.commit()
        raise
    finally:
        db.close()
