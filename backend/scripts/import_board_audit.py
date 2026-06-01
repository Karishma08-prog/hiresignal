from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.database import SessionLocal
from app.services.ingestion import ensure_source, ensure_source_credential, ensure_source_health
from app.services.source_health_reconcile import (
    imported_job_counts_by_site,
    reconcile_source_from_existing_jobs,
)


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python scripts/import_board_audit.py <path-to-audit-json>")

    audit_path = Path(sys.argv[1]).resolve()
    payload = json.loads(audit_path.read_text(encoding="utf-8"))
    generated_at = payload.get("generatedAt")
    results = payload.get("results", [])

    db = SessionLocal()
    try:
        imported_counts = imported_job_counts_by_site(db)
        for item in results:
            site_key = str(item.get("board") or "").strip()
            if not site_key:
                continue
            ensure_source(db, site_key)
            health = ensure_source_health(db, site_key)
            credential = ensure_source_credential(db, site_key)

            rows_found = int(item.get("primaryRows") or item.get("fallbackRows") or 0)
            status = str(item.get("status") or "unknown")
            reason = str(item.get("reason") or "")

            if status in {"working_for_use_case", "working_but_not_for_current_query"}:
                health.status = "ready"
                health.last_success_at = datetime.now(UTC)
                health.last_error_at = None
                health.last_error_message = None
                health.avg_results_7d = float(rows_found)
                health.success_rate_7d = 100.0
                health.last_run_jobs_found = rows_found
                credential.working_status = "working"
                credential.credential_verified_at = datetime.now(UTC)
                note_suffix = (
                    "Smoke-tested from"
                    if status == "working_for_use_case"
                    else "Validated via fallback/feed audit from"
                )
                credential.credential_note = f"{note_suffix} {audit_path.name}."
            else:
                restored_jobs = reconcile_source_from_existing_jobs(
                    db,
                    site_key,
                    imported_counts=imported_counts,
                )
                if restored_jobs > 0:
                    credential.credential_note = (
                        f"Validated from {restored_jobs} existing imported jobs. "
                        f"Latest audit from {audit_path.name} did not pass the smoke query from this machine."
                    )
                else:
                    health.status = "failed"
                    health.last_error_at = datetime.now(UTC)
                    health.last_error_message = reason[:500]
                    health.success_rate_7d = 0.0
                    health.last_run_jobs_found = 0
                    credential.working_status = "failing_or_unreliable"
                    credential.credential_note = f"Audit failure from {audit_path.name}: {reason}"

        db.commit()
        print(
            f"Imported {len(results)} audit rows from {audit_path.name}"
            + (f" (generated {generated_at})." if generated_at else ".")
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
