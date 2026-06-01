from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.database import SessionLocal
from app.services.source_health_reconcile import (
    imported_job_counts_by_site,
    reconcile_source_from_existing_jobs,
)


def main() -> None:
    db = SessionLocal()
    try:
        imported_counts = imported_job_counts_by_site(db)
        repaired = []

        for site_key in sorted(imported_counts):
            restored_jobs = reconcile_source_from_existing_jobs(
                db,
                site_key,
                imported_counts=imported_counts,
            )
            if restored_jobs > 0:
                repaired.append((site_key, restored_jobs))

        db.commit()
        print(f"Reconciled {len(repaired)} sources from imported jobs.")
        for site_key, restored_jobs in repaired:
            print(f"{site_key}: {restored_jobs}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
