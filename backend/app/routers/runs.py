from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.queue import get_run_queue_job
from app.utils import paginate, serialize_model

router = APIRouter(prefix="/campaign-runs", tags=["campaign-runs"])


def _infer_run_mode(db: Session, run: models.CampaignRun) -> str:
    notes = (run.run_notes or "").strip().lower()
    if notes.startswith("[fresh_live]"):
        return "fresh_live"
    if notes.startswith("[historical_import]"):
        return "historical_import"
    if notes.startswith("[live_attempt_failed]"):
        return "live_attempt_failed"
    if notes.startswith("[demo_fallback]"):
        return "demo_fallback"

    logs = (
        db.query(models.RunLog)
        .filter(models.RunLog.campaign_run_id == run.id)
        .order_by(models.RunLog.created_at.desc())
        .all()
    )
    for log in logs:
        if log.message == "No output files found; using demo fallback.":
            return "demo_fallback"
        if log.message == "Discovered output files for ingestion.":
            if bool(log.details_json.get("freshRunOutputs")):
                return "fresh_live"
            return "historical_import"
    if run.raw_job_count > 0:
        return "historical_import"
    if run.status == "failed":
        return "live_attempt_failed"
    return "unknown"


def _serialize_run(db: Session, run: models.CampaignRun) -> dict:
    item = serialize_model(schemas.CampaignRunRead.model_validate(run))
    item["runMode"] = _infer_run_mode(db, run)
    return item


@router.get("", response_model=schemas.PaginatedResponse)
def list_runs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    campaign_id: str | None = Query(default=None, alias="campaignId"),
    db: Session = Depends(get_db),
):
    query = db.query(models.CampaignRun)
    if campaign_id:
        query = query.filter(models.CampaignRun.campaign_id == campaign_id)
    runs = query.order_by(models.CampaignRun.started_at.desc(), models.CampaignRun.id.desc()).all()
    items = [_serialize_run(db, run) for run in runs]
    return paginate(items, page, page_size)


@router.get("/{run_id}", response_model=schemas.ItemResponse)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.get(models.CampaignRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Campaign run not found")
    return {"item": _serialize_run(db, run)}


@router.get("/{run_id}/queue", response_model=schemas.ItemResponse)
def get_run_queue(run_id: str, db: Session = Depends(get_db)):
    job = get_run_queue_job(db, run_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Queue job not found for run")
    return {"item": serialize_model(schemas.QueueJobRead.model_validate(job))}


@router.get("/{run_id}/jobs", response_model=schemas.PaginatedResponse)
def list_run_jobs(
    run_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    db: Session = Depends(get_db),
):
    jobs = (
        db.query(models.Job)
        .filter(models.Job.campaign_run_id == run_id)
        .order_by(models.Job.created_at.desc())
        .all()
    )
    items = [serialize_model(schemas.JobRead.model_validate(job)) for job in jobs]
    return paginate(items, page, page_size)


@router.get("/{run_id}/companies", response_model=schemas.PaginatedResponse)
def list_run_companies(
    run_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    db: Session = Depends(get_db),
):
    company_ids = (
        db.query(models.Job.company_id)
        .filter(models.Job.campaign_run_id == run_id, models.Job.company_id.isnot(None))
        .distinct()
        .all()
    )
    companies = (
        db.query(models.Company)
        .filter(models.Company.id.in_([company_id for (company_id,) in company_ids]))
        .all()
        if company_ids
        else []
    )
    items = [serialize_model(schemas.CompanyRead.model_validate(company)) for company in companies]
    return paginate(items, page, page_size)


@router.get("/{run_id}/logs", response_model=schemas.PaginatedResponse)
def list_run_logs(
    run_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(models.RunLog)
        .filter(models.RunLog.campaign_run_id == run_id)
        .order_by(models.RunLog.created_at.desc())
        .all()
    )
    items = [serialize_model(schemas.RunLogRead.model_validate(log)) for log in logs]
    return paginate(items, page, page_size)
