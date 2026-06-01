from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.utils import paginate_query, serialize_model

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=schemas.PaginatedResponse)
def list_companies(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    campaign_run_id: str | None = Query(default=None, alias="campaignRunId"),
    fit: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Company)
    if campaign_run_id:
        query = query.join(models.Job).filter(models.Job.campaign_run_id == campaign_run_id).distinct()
    if fit:
        query = query.filter(models.Company.revengineer_fit == fit)
    if priority:
        query = query.filter(models.Company.priority == priority)
    if search:
        query = query.filter(models.Company.name.ilike(f"%{search}%"))
    query = query.order_by(models.Company.created_at.desc())
    companies, meta = paginate_query(query, page, page_size)
    items = [serialize_model(schemas.CompanyRead.model_validate(company)) for company in companies]
    return {**meta, "items": items}


@router.get("/{company_id}", response_model=schemas.ItemResponse)
def get_company(company_id: str, db: Session = Depends(get_db)):
    company = db.get(models.Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    jobs = db.query(models.Job).filter(models.Job.company_id == company.id).all()
    signal = (
        db.query(models.CompanySignal)
        .filter(models.CompanySignal.company_id == company.id)
        .order_by(models.CompanySignal.created_at.desc())
        .first()
    )
    return {
        "item": serialize_model(
            schemas.CompanyDetailResponse(
                company=schemas.CompanyRead.model_validate(company),
                jobs=[schemas.JobRead.model_validate(job) for job in jobs],
                signals=schemas.CompanySignalRead.model_validate(signal) if signal else None,
            )
        )
    }
