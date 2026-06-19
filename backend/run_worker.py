from __future__ import annotations

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.seed_data import seed_sources
from app.services.queue import recover_stuck_jobs, run_worker_forever, touch_worker_heartbeat
from app.services.storage import backfill_artifact_blobs, ensure_artifact_storage_columns


def main() -> None:
    if settings.queue_mode == "celery":
        raise SystemExit(
            "HIRESIGNAL_QUEUE_MODE is set to 'celery'. Start a Celery worker with "
            "`celery -A app.services.celery_app.celery_app worker --loglevel=info`."
        )
    ensure_artifact_storage_columns(engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_sources(db)
        backfill_artifact_blobs(db)
    finally:
        db.close()
    recovered = recover_stuck_jobs()
    touch_worker_heartbeat(
        details={
            "queueMode": settings.queue_mode,
            "embeddedWorker": settings.embedded_worker,
            "recoveredJobsOnStartup": recovered,
        }
    )
    run_worker_forever()


if __name__ == "__main__":
    main()
