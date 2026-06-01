from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app import models
from app.services.ats_discovery import _slug_and_type
from app.utils import make_id

WORKING_STATUSES = {
    "working",
    "working_for_use_case",
}

PROVEN_STATUSES = {
    "working",
    "working_for_use_case",
    "working_but_not_for_current_query",
    "working_via_existing_results",
}

GENERIC_SLUGS = {
    "",
    "company",
    "companies",
    "job",
    "jobs",
    "job-board",
    "job_board",
    "career",
    "careers",
    "apply",
}


def derive_support_tier(
    source: models.Source,
    health: models.SourceHealth | None,
    credential: models.SourceCredential | None,
) -> tuple[str, str]:
    working_status = credential.working_status if credential else "unknown"
    last_jobs_found = int(health.last_run_jobs_found or 0) if health else 0

    if working_status in WORKING_STATUSES and health and health.status == "ready":
        return "live_supported", "Recent live retest succeeded for this source."

    if working_status in PROVEN_STATUSES or last_jobs_found > 0:
        return "fallback_supported", "This source has proven historical evidence in this backend environment."

    if credential and (
        credential.credential_present
        or credential.needs_api_key
        or credential.needs_proxy
        or credential.needs_company_slug
    ):
        return "experimental", "Configured or partially configured, but not yet reliably live-working."

    if source.category == "ats" or source.engine == "botasaurus":
        return "experimental", "Needs more environment or fetch validation before client-facing use."

    return "experimental", "Known source family that still needs runtime validation."


def ensure_source_support(db: Session, site_key: str) -> models.SourceSupport:
    from app.services.ingestion import ensure_source

    source = ensure_source(db, site_key)
    support = (
        db.query(models.SourceSupport)
        .filter(models.SourceSupport.site_key == source.site_key)
        .first()
    )
    if support is not None:
        return support

    support = models.SourceSupport(
        id=make_id("srcsup"),
        site_key=source.site_key,
        support_tier="experimental",
        support_reason="Awaiting policy review.",
        client_visible=True,
        owned_by="backend",
    )
    db.add(support)
    db.flush()
    return support


def refresh_source_support(
    db: Session,
    site_key: str,
    *,
    source: models.Source | None = None,
    health: models.SourceHealth | None = None,
    credential: models.SourceCredential | None = None,
) -> models.SourceSupport:
    from app.services.ingestion import ensure_source

    source = source or ensure_source(db, site_key)
    support = ensure_source_support(db, source.site_key)
    tier, reason = derive_support_tier(source, health, credential)
    support.support_tier = tier
    support.support_reason = reason
    support.client_visible = tier != "disabled"
    support.last_policy_review_at = support.last_policy_review_at or datetime.utcnow()
    return support


def record_source_evidence(
    db: Session,
    *,
    site_key: str,
    evidence_type: str,
    jobs_found: int,
    succeeded: bool,
    run_id: str | None = None,
    query_signature: str | None = None,
    country: str | None = None,
    location: str | None = None,
    details: dict | None = None,
) -> models.SourceEvidence:
    from app.services.ingestion import ensure_source

    source = ensure_source(db, site_key)
    evidence = models.SourceEvidence(
        id=make_id("srcevd"),
        site_key=source.site_key,
        run_id=run_id,
        evidence_type=evidence_type,
        jobs_found=max(int(jobs_found or 0), 0),
        query_signature=query_signature,
        country=country,
        location=location,
        succeeded=succeeded,
        details_json=details or {},
    )
    db.add(evidence)
    db.flush()
    return evidence


def discover_source_slugs_from_jobs(db: Session, site_key: str) -> list[models.SourceSlug]:
    from app.services.ingestion import ensure_source

    source = ensure_source(db, site_key)
    jobs = (
        db.query(models.Job)
        .filter(models.Job.site == source.site_key)
        .order_by(models.Job.created_at.desc())
        .all()
    )

    discovered: dict[str, models.SourceSlug] = {}
    for job in jobs:
        slug, url_type = _slug_and_type(source.site_key, job.job_url)
        if not slug or slug.lower() in GENERIC_SLUGS:
            continue

        existing = discovered.get(slug)
        if existing is None:
            existing = (
                db.query(models.SourceSlug)
                .filter(
                    models.SourceSlug.site_key == source.site_key,
                    models.SourceSlug.company_slug == slug,
                )
                .first()
            )
            if existing is None:
                existing = models.SourceSlug(
                    id=make_id("srcslug"),
                    site_key=source.site_key,
                    company_slug=slug,
                )
                db.add(existing)
            discovered[slug] = existing

        existing.company_name = existing.company_name or job.company_name
        existing.job_board_url = job.job_url
        existing.discovery_method = "job_url_scan"
        existing.status = "verified" if url_type == "post" else "discovered"
        existing.last_discovered_at = datetime.utcnow()
        existing.last_verified_at = datetime.utcnow() if url_type == "post" else existing.last_verified_at
        existing.last_error = None
        existing.notes = "Derived from previously imported job URLs."

    db.flush()
    return list(discovered.values())
