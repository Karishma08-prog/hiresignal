from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.utils import paginate, serialize_model

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=schemas.PaginatedResponse)
def list_jobs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    campaign_run_id: str | None = Query(default=None, alias="campaignRunId"),
    site: str | None = None,
    matched_title: bool | None = Query(default=None, alias="matchedTitle"),
    matched_objective: bool | None = Query(default=None, alias="matchedObjective"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Job)
    if campaign_run_id:
        query = query.filter(models.Job.campaign_run_id == campaign_run_id)
    if site:
        query = query.filter(models.Job.site == site)
    if matched_title is not None:
        query = query.filter(models.Job.matched_title == matched_title)
    if matched_objective is not None:
        query = query.filter(models.Job.matched_objective == matched_objective)

    jobs = query.order_by(models.Job.created_at.desc()).all()
    items = [serialize_model(schemas.JobRead.model_validate(job)) for job in jobs]
    return paginate(items, page, page_size)
