from __future__ import annotations

from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.services.ingestion import ensure_source, ensure_source_credential, ensure_source_health


def imported_job_counts_by_site(db: Session) -> dict[str, int]:
    rows = (
        db.query(models.Job.site, func.count(models.Job.id))
        .group_by(models.Job.site)
        .all()
    )
    return {
        str(site_key).strip().lower(): int(count or 0)
        for site_key, count in rows
        if str(site_key).strip()
    }


def reconcile_source_from_existing_jobs(
    db: Session,
    site_key: str,
    *,
    imported_counts: dict[str, int] | None = None,
    note_prefix: str = "Validated from",
) -> int:
    normalized = str(site_key).strip().lower()
    if not normalized:
        return 0

    counts = imported_counts or imported_job_counts_by_site(db)
    imported_jobs = int(counts.get(normalized, 0))
    if imported_jobs <= 0:
        return 0

    ensure_source(db, normalized)
    health = ensure_source_health(db, normalized)
    credential = ensure_source_credential(db, normalized)
    now = datetime.utcnow()

    health.status = "ready"
    health.last_success_at = health.last_success_at or now
    health.last_error_at = None
    health.last_error_message = None
    health.avg_results_7d = max(float(health.avg_results_7d or 0), float(imported_jobs))
    health.success_rate_7d = max(float(health.success_rate_7d or 0), 100.0)
    health.last_run_jobs_found = max(int(health.last_run_jobs_found or 0), imported_jobs)

    credential.credential_present = True
    credential.credential_verified_at = credential.credential_verified_at or now
    credential.working_status = "working_via_existing_results"
    credential.credential_note = f"{note_prefix} {imported_jobs} existing imported jobs."

    return imported_jobs
