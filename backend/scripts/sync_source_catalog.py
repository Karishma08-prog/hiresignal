from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import models
from app.database import SessionLocal
from app.services.ingestion import ensure_source, ensure_source_credential, ensure_source_health
from app.services.source_catalog import SOURCE_METADATA


def main() -> None:
    db = SessionLocal()
    try:
        created = 0
        for site_key in sorted(SOURCE_METADATA):
            before = db.query(models.Source).filter_by(site_key=site_key).first()
            if before is None:
                created += 1
            ensure_source(db, site_key)
            ensure_source_health(db, site_key)
            ensure_source_credential(db, site_key)
        db.commit()
        total = db.execute(text("SELECT COUNT(*) FROM sources")).scalar_one()
        print(f"Synced source catalog. Registered sources: {total}. Newly created entries: {created}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
