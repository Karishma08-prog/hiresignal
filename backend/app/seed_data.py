from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app import models
from app.utils import make_id


DEFAULT_SOURCES = [
    {
        "site_key": "linkedin",
        "display_name": "LinkedIn",
        "category": "search_board",
        "engine": "ever_jobs_http",
        "region": "global",
        "requires_company_slug": False,
        "requires_api_key": False,
        "risk_level": "core",
        "notes": "Broad source, but rate-limit sensitive.",
    },
    {
        "site_key": "indeed",
        "display_name": "Indeed",
        "category": "search_board",
        "engine": "botasaurus",
        "region": "global",
        "requires_company_slug": False,
        "requires_api_key": False,
        "risk_level": "core",
        "notes": "Stealth browser path in current backend.",
    },
    {
        "site_key": "naukri",
        "display_name": "Naukri",
        "category": "search_board",
        "engine": "botasaurus",
        "region": "india",
        "requires_company_slug": False,
        "requires_api_key": False,
        "risk_level": "core",
        "notes": "Strong India-native source after description enrichment.",
    },
    {
        "site_key": "greenhouse",
        "display_name": "Greenhouse",
        "category": "ats",
        "engine": "ats_api",
        "region": "global",
        "requires_company_slug": True,
        "requires_api_key": False,
        "risk_level": "core",
        "notes": "Best ATS source when company slug is known.",
    },
    {
        "site_key": "lever",
        "display_name": "Lever",
        "category": "ats",
        "engine": "ats_api",
        "region": "global",
        "requires_company_slug": True,
        "requires_api_key": False,
        "risk_level": "core",
        "notes": "Common ATS source for startup roles.",
    },
    {
        "site_key": "workday",
        "display_name": "Workday",
        "category": "ats",
        "engine": "ats_api",
        "region": "global",
        "requires_company_slug": True,
        "requires_api_key": False,
        "risk_level": "secondary",
        "notes": "Useful, but often noisier than Greenhouse or Lever.",
    },
]


def _credential_defaults(source: dict) -> dict:
    return {
        "needs_api_key": bool(source.get("requires_api_key", False)),
        "needs_proxy": source.get("engine") == "botasaurus",
        "needs_company_slug": bool(source.get("requires_company_slug", False)),
        "credential_present": False,
        "working_status": "unknown",
        "credential_note": "Seeded source metadata.",
    }


def _credential_defaults_from_model(source: models.Source) -> dict:
    return {
        "needs_api_key": bool(source.requires_api_key or source.category == "ats"),
        "needs_proxy": source.engine == "botasaurus",
        "needs_company_slug": bool(source.requires_company_slug),
        "credential_present": False,
        "working_status": "unknown",
        "credential_note": "Backfilled for an existing source row.",
    }


def seed_sources(db: Session) -> None:
    for source in DEFAULT_SOURCES:
        db_source = (
            db.query(models.Source)
            .filter(models.Source.site_key == source["site_key"])
            .first()
        )
        if db_source is None:
            db_source = models.Source(id=make_id("src"), **source)
            db.add(db_source)

        existing_health = (
            db.query(models.SourceHealth)
            .filter(models.SourceHealth.site_key == source["site_key"])
            .first()
        )
        if existing_health is None:
            db.add(
                models.SourceHealth(
                    id=make_id("srchealth"),
                    site_key=source["site_key"],
                    status="ready",
                    last_success_at=datetime.utcnow(),
                    avg_results_7d=0,
                    avg_latency_ms_7d=0,
                    success_rate_7d=0,
                    last_run_jobs_found=0,
                )
            )

        existing_credential = (
            db.query(models.SourceCredential)
            .filter(models.SourceCredential.site_key == source["site_key"])
            .first()
        )
        if existing_credential is None:
            db.add(
                models.SourceCredential(
                    id=make_id("cred"),
                    site_key=source["site_key"],
                    **_credential_defaults(source),
                )
            )

    existing_sources = db.query(models.Source).all()
    for source in existing_sources:
        existing_credential = (
            db.query(models.SourceCredential)
            .filter(models.SourceCredential.site_key == source.site_key)
            .first()
        )
        if existing_credential is None:
            db.add(
                models.SourceCredential(
                    id=make_id("cred"),
                    site_key=source.site_key,
                    **_credential_defaults_from_model(source),
                )
            )

    db.commit()
