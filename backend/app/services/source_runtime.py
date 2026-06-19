from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.services.source_catalog import (
    APPROVED_BROWSER_SOURCE_KEYS,
    APPROVED_SEARCH_SOURCE_KEYS,
    FREE_ZERO_CONFIG_BOARDS,
)

WORKING_SOURCE_STATUSES = {
    "working",
    "working_for_use_case",
    "working_but_not_for_current_query",
    "working_via_existing_results",
}


def credential_is_ready(source: models.Source, credential: models.SourceCredential | None) -> bool:
    if credential is None:
        return source.category not in {"ats"} and source.engine != "botasaurus"

    if source.category == "ats" and credential.needs_api_key and not settings.scrappa_token:
        return False

    if credential.needs_proxy and not (settings.jobs_bota_proxy or settings.jobs_proxy):
        return False

    if credential.credential_present or credential.credential_verified_at is not None:
        return True

    return not credential.needs_api_key and not credential.needs_proxy


def has_proven_source_success(
    health: models.SourceHealth | None,
    credential: models.SourceCredential | None,
) -> bool:
    if credential and credential.working_status in WORKING_SOURCE_STATUSES:
        return True

    if health is None:
        return False

    return bool(
        health.last_success_at
        or health.last_run_jobs_found > 0
        or health.avg_results_7d > 0
        or health.success_rate_7d > 0
    )


def is_recent_source_success(health: models.SourceHealth | None, *, days: int = 14) -> bool:
    if health is None or health.last_success_at is None:
        return False
    return health.last_success_at >= datetime.utcnow() - timedelta(days=days)


def _search_source_rows(db: Session) -> list[tuple[models.Source, models.SourceHealth | None, models.SourceCredential | None]]:
    sources = db.query(models.Source).order_by(models.Source.display_name.asc()).all()
    health_map = {row.site_key: row for row in db.query(models.SourceHealth).all()}
    credential_map = {row.site_key: row for row in db.query(models.SourceCredential).all()}
    rows: list[tuple[models.Source, models.SourceHealth | None, models.SourceCredential | None]] = []

    for source in sources:
        if source.category == "ats":
            continue
        if source.engine in {"script_bridge", "botasaurus"}:
            continue
        rows.append((source, health_map.get(source.site_key), credential_map.get(source.site_key)))

    return rows


def get_preferred_live_search_boards(
    db: Session,
    *,
    allowed_site_keys: list[str] | set[str] | None = None,
    exclude_site_keys: list[str] | set[str] | None = None,
    limit: int = 8,
) -> list[str]:
    allowed = {item.strip().lower() for item in allowed_site_keys or [] if str(item).strip()}
    excluded = {item.strip().lower() for item in exclude_site_keys or [] if str(item).strip()}
    support_map = {row.site_key: row for row in db.query(models.SourceSupport).all()}

    ranked: list[tuple[tuple[int, int, int, int, str], str]] = []
    fallback: list[str] = []

    for source, health, credential in _search_source_rows(db):
        site_key = source.site_key.lower()
        if allowed and site_key not in allowed:
            continue
        if site_key in excluded:
            continue
        if site_key not in APPROVED_SEARCH_SOURCE_KEYS and site_key not in APPROVED_BROWSER_SOURCE_KEYS:
            continue
        if not credential_is_ready(source, credential):
            continue

        support = support_map.get(source.site_key)
        proven = has_proven_source_success(health, credential)
        recent = is_recent_source_success(health)
        working = credential.working_status == "working" if credential else False
        degraded = bool(
            (health and health.status == "failed")
            or (credential and credential.working_status == "failing_or_unreliable")
        )
        preferred_risk = 0 if source.risk_level == "core" else 1
        jobs_rank = -(int(health.last_run_jobs_found) if health else 0)
        recent_rank = 0 if recent else 1
        proven_rank = 0 if proven else 1
        working_rank = 0 if working else 1
        support_rank = 2
        if support and support.support_tier == "live_supported":
            support_rank = 0
        elif support and support.support_tier == "fallback_supported":
            support_rank = 1
        rank = (support_rank, working_rank, recent_rank, proven_rank, preferred_risk, jobs_rank, source.display_name.lower())

        if degraded:
            fallback.append(site_key)
        elif support and support.support_tier in {"live_supported", "fallback_supported"}:
            ranked.append((rank, site_key))
        elif support and support.support_tier == "experimental":
            fallback.append(site_key)

    ranked.sort(key=lambda item: item[0])
    preferred = [site_key for _, site_key in ranked]

    if preferred:
        return preferred[:limit]

    if allowed:
        ordered_allowed = [site_key for site_key in FREE_ZERO_CONFIG_BOARDS if site_key in allowed and site_key not in excluded]
        if ordered_allowed:
            return ordered_allowed[:limit]

    return []
