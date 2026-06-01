from __future__ import annotations

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.seed_data import seed_sources
from app.services.queue import run_worker_forever


def main() -> None:
    if settings.queue_mode == "celery":
        raise SystemExit(
            "HIRESIGNAL_QUEUE_MODE is set to 'celery'. Start a Celery worker with "
            "`celery -A app.services.celery_app.celery_app worker --loglevel=info`."
        )
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_sources(db)
    finally:
        db.close()
    run_worker_forever()


if __name__ == "__main__":
    main()
