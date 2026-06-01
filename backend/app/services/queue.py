from __future__ import annotations

import threading
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import case

from app import models
from app.config import settings
from app.database import SessionLocal
from app.services.orchestrator import execute_campaign_run
from app.services.source_retest import execute_source_retest
from app.utils import make_id

QUEUE_MODE_DATABASE = "database"
QUEUE_MODE_CELERY = "celery"

_worker_thread: threading.Thread | None = None
_stop_event = threading.Event()
_worker_lock = threading.Lock()


def enqueue_campaign_run(db: Session, campaign_id: str, run_id: str) -> models.QueueJob:
    existing = (
        db.query(models.QueueJob)
        .filter(models.QueueJob.run_id == run_id, models.QueueJob.job_type == "campaign_run")
        .order_by(models.QueueJob.created_at.desc())
        .first()
    )
    if existing is not None and existing.status in {"queued", "running"}:
        return existing

    job = models.QueueJob(
        id=make_id("qj"),
        job_type="campaign_run",
        status="queued",
        payload_json={"campaignId": campaign_id, "runId": run_id},
        run_id=run_id,
        max_attempts=settings.queue_max_attempts,
        available_at=datetime.utcnow(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    if settings.queue_mode == QUEUE_MODE_CELERY:
        _dispatch_celery_job(job.id, campaign_id, run_id)

    return job


def enqueue_source_retest(db: Session, site_key: str) -> models.QueueJob:
    job = models.QueueJob(
        id=make_id("qj"),
        job_type="source_retest",
        status="queued",
        payload_json={"siteKey": site_key},
        max_attempts=settings.queue_max_attempts,
        available_at=datetime.utcnow(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    if settings.queue_mode == QUEUE_MODE_CELERY:
        _dispatch_celery_source_job(job.id, site_key)

    return job


def get_run_queue_job(db: Session, run_id: str) -> models.QueueJob | None:
    return (
        db.query(models.QueueJob)
        .filter(models.QueueJob.run_id == run_id)
        .order_by(models.QueueJob.created_at.desc())
        .first()
    )


def list_queue_jobs(db: Session, *, status: str | None = None) -> list[models.QueueJob]:
    query = db.query(models.QueueJob).order_by(models.QueueJob.created_at.desc())
    if status:
        query = query.filter(models.QueueJob.status == status)
    return query.all()


def mark_job_running(job_id: str) -> models.QueueJob | None:
    db = SessionLocal()
    try:
        job = db.get(models.QueueJob, job_id)
        if job is None:
            return None
        now = datetime.utcnow()
        job.status = "running"
        if job.started_at is None:
            job.started_at = now
        job.locked_at = now
        job.attempts += 1
        job.last_error = None
        db.commit()
        db.refresh(job)
        return job
    finally:
        db.close()


def mark_job_failed(job_id: str, error: str) -> bool:
    db = SessionLocal()
    try:
        job = db.get(models.QueueJob, job_id)
        if job is None:
            return False
        job.last_error = error[:1000]
        job.locked_at = None
        if job.attempts < job.max_attempts:
            job.status = "queued"
            job.available_at = datetime.utcnow() + timedelta(
                seconds=settings.queue_retry_delay_seconds
            )
            job.finished_at = None
            should_retry = True
        else:
            job.status = "failed"
            job.finished_at = datetime.utcnow()
            should_retry = False
        db.commit()
        return should_retry
    finally:
        db.close()


def mark_job_completed(job_id: str) -> None:
    db = SessionLocal()
    try:
        job = db.get(models.QueueJob, job_id)
        if job is None:
            return
        job.status = "completed"
        job.finished_at = datetime.utcnow()
        job.locked_at = None
        db.commit()
    finally:
        db.close()


def _dispatch_celery_job(job_id: str, campaign_id: str, run_id: str) -> None:
    from app.services.celery_tasks import run_campaign_job_task

    run_campaign_job_task.delay(job_id, campaign_id, run_id)


def _dispatch_celery_source_job(job_id: str, site_key: str) -> None:
    from app.services.celery_tasks import run_source_retest_task

    run_source_retest_task.delay(job_id, site_key)


def _claim_next_job(db: Session) -> models.QueueJob | None:
    now = datetime.utcnow()
    job = (
        db.query(models.QueueJob)
        .filter(
            models.QueueJob.status == "queued",
            models.QueueJob.available_at <= now,
            models.QueueJob.job_type.in_(["campaign_run", "source_retest"]),
        )
        .order_by(
            case((models.QueueJob.job_type == "campaign_run", 0), else_=1),
            models.QueueJob.available_at.asc(),
            models.QueueJob.created_at.asc(),
        )
        .first()
    )
    return job


def process_next_job() -> bool:
    db = SessionLocal()
    job: models.QueueJob | None = None
    try:
        job = _claim_next_job(db)
    finally:
        db.close()

    if job is None:
        return False

    mark_job_running(job.id)

    try:
        if job.job_type == "campaign_run":
            campaign_id = str(job.payload_json.get("campaignId", ""))
            run_id = str(job.payload_json.get("runId", ""))
            execute_campaign_run(campaign_id, run_id)
        elif job.job_type == "source_retest":
            site_key = str(job.payload_json.get("siteKey", ""))
            execute_source_retest(site_key)
        else:
            raise RuntimeError(f"Unsupported queue job type: {job.job_type}")
    except Exception as exc:
        mark_job_failed(job.id, str(exc))
        return True

    mark_job_completed(job.id)
    return True


def run_worker_forever() -> None:
    while not _stop_event.is_set():
        processed = process_next_job()
        if not processed:
            _stop_event.wait(settings.queue_poll_seconds)


def start_embedded_worker() -> None:
    if settings.queue_mode != QUEUE_MODE_DATABASE or not settings.embedded_worker:
        return

    global _worker_thread
    with _worker_lock:
        if _worker_thread is not None and _worker_thread.is_alive():
            return
        _stop_event.clear()
        _worker_thread = threading.Thread(
            target=run_worker_forever,
            name="hiresignal-queue-worker",
            daemon=True,
        )
        _worker_thread.start()


def stop_embedded_worker() -> None:
    _stop_event.set()
    thread = _worker_thread
    if thread is not None and thread.is_alive():
        thread.join(timeout=2)
