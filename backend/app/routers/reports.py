from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.utils import paginate, serialize_model

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=schemas.PaginatedResponse)
def list_reports(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    db: Session = Depends(get_db),
):
    reports = db.query(models.Report).order_by(models.Report.generated_at.desc()).all()
    items = [serialize_model(schemas.ReportRead.model_validate(report)) for report in reports]
    return paginate(items, page, page_size)


@router.get("/{report_id}", response_model=schemas.ItemResponse)
def get_report(report_id: str, db: Session = Depends(get_db)):
    report = db.get(models.Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"item": serialize_model(schemas.ReportRead.model_validate(report))}
