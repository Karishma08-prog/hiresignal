from __future__ import annotations

from celery import Task

from app.config import settings
from app.services.celery_app import celery_app
from app.services.orchestrator import execute_campaign_run
from app.services.source_retest import execute_source_retest
from app.services.queue import mark_job_completed, mark_job_failed, mark_job_running


@celery_app.task(
    bind=True,
    name="hiresignal.run_campaign_job",
    max_retries=None,
)
def run_campaign_job_task(
    self: Task,
    job_id: str,
    campaign_id: str,
    run_id: str,
) -> None:
    mark_job_running(job_id)
    try:
        execute_campaign_run(campaign_id, run_id)
    except Exception as exc:
        should_retry = mark_job_failed(job_id, str(exc))
        if should_retry:
            raise self.retry(exc=exc, countdown=settings.queue_retry_delay_seconds)
        raise
    else:
        mark_job_completed(job_id)


@celery_app.task(
    bind=True,
    name="hiresignal.run_source_retest",
    max_retries=None,
)
def run_source_retest_task(
    self: Task,
    job_id: str,
    site_key: str,
) -> None:
    mark_job_running(job_id)
    try:
        execute_source_retest(site_key)
    except Exception as exc:
        should_retry = mark_job_failed(job_id, str(exc))
        if should_retry:
            raise self.retry(exc=exc, countdown=settings.queue_retry_delay_seconds)
        raise
    else:
        mark_job_completed(job_id)
