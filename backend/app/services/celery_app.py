from __future__ import annotations

from celery import Celery

from app.config import settings


celery_app = Celery(
    "hiresignal",
    broker=settings.redis_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_track_started=True,
    result_expires=3600,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

celery_app.autodiscover_tasks(["app.services"])
