from __future__ import annotations

from collections.abc import Iterable

from fastapi import APIRouter, Body, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Campaign, CampaignRun, Source

router = APIRouter(tags=["compat"])


def _paginated(items: list[dict]) -> dict:
    total = len(items)
    return {
        "items": items,
        "options": items,
        "page": 1,
        "pageSize": total,
        "total": total,
        "totalPages": 1,
    }


def _extract_source_count(payload: dict) -> int:
    source_config = payload.get("sourceConfig")
    if isinstance(source_config, dict):
        count = 0
        for key in ("searchBoards", "browserBoards", "atsBoards"):
            boards = source_config.get(key)
            if isinstance(boards, Iterable) and not isinstance(boards, (str, bytes, dict)):
                count += len(list(boards))
        if count:
            return count

    for key in ("sources", "platforms"):
        value = payload.get(key)
        if isinstance(value, Iterable) and not isinstance(value, (str, bytes, dict)):
            return len(list(value))

    source = payload.get("source")
    if isinstance(source, str) and source.strip():
        return 1

    source_preset = payload.get("sourcePreset")
    if source_preset == "free_zero_config":
        return 12

    return 1


@router.get("/projects/active")
def get_active_project(db: Session = Depends(get_db)) -> dict:
    campaign_count = len(db.scalars(select(Campaign.id)).all())
    latest_run = db.scalars(
        select(CampaignRun).order_by(CampaignRun.finished_at.desc().nullslast(), CampaignRun.id.desc())
    ).first()

    item = {
        "id": "hiresignal",
        "name": "HireSignal Workspace",
        "status": "active",
        "campaignCount": campaign_count,
        "lastRunId": latest_run.id if latest_run else None,
        "lastRunStatus": latest_run.status if latest_run else "idle",
    }
    return {"item": item, "project": item}


@router.get("/settings")
def get_legacy_settings(db: Session = Depends(get_db)) -> dict:
    source_count = len(db.scalars(select(Source.id)).all())
    item = {
        "appName": "HireSignal",
        "apiBaseUrl": "/api",
        "queueMode": settings.queue_mode,
        "scriptExecutionEnabled": settings.enable_script_execution,
        "scrappaConfigured": bool(settings.scrappa_token),
        "proxyConfigured": bool(settings.jobs_bota_proxy or settings.jobs_proxy),
        "sourceCount": source_count,
    }
    return {"item": item, "settings": item}


@router.get("/presets/niches")
def get_niche_presets() -> dict:
    items = [
        {"id": "marketing", "label": "Marketing Leadership", "value": "marketing"},
        {"id": "sales", "label": "Sales Leadership", "value": "sales"},
        {"id": "gtm", "label": "GTM Expansion", "value": "gtm"},
        {"id": "product", "label": "Product Hiring", "value": "product"},
        {"id": "engineering", "label": "Engineering", "value": "engineering"},
    ]
    return _paginated(items)


@router.get("/presets/cities")
def get_city_presets() -> dict:
    items = [
        {"id": "remote-us", "label": "Remote - United States", "value": "Remote, United States"},
        {"id": "new-york", "label": "New York", "value": "New York, United States"},
        {"id": "san-francisco", "label": "San Francisco", "value": "San Francisco, United States"},
        {"id": "austin", "label": "Austin", "value": "Austin, United States"},
        {"id": "bengaluru", "label": "Bengaluru", "value": "Bengaluru, India"},
    ]
    return _paginated(items)


@router.get("/presets/platforms")
def get_platform_presets(db: Session = Depends(get_db)) -> dict:
    sources = db.scalars(select(Source).order_by(Source.display_name.asc())).all()
    items = [
        {"id": source.site_key, "label": source.display_name, "value": source.site_key}
        for source in sources[:20]
    ]
    return _paginated(items)


@router.get("/presets/posted-within")
def get_posted_within_presets() -> dict:
    items = [
        {"id": "1", "label": "Past 24 hours", "value": 1},
        {"id": "3", "label": "Past 3 days", "value": 3},
        {"id": "7", "label": "Past week", "value": 7},
        {"id": "14", "label": "Past 2 weeks", "value": 14},
        {"id": "30", "label": "Past 30 days", "value": 30},
    ]
    return _paginated(items)


@router.post("/runs/estimate")
def estimate_run(payload: dict = Body(default={})) -> dict:
    source_count = max(_extract_source_count(payload), 1)
    results_per_source = int(payload.get("resultsPerSource") or 25)
    estimated_results = min(source_count * results_per_source, 500)
    estimated_companies = max(1, min(estimated_results, max(source_count * 2, estimated_results // 2)))
    warnings: list[str] = []

    location = payload.get("location")
    if isinstance(location, str) and not location.strip():
        warnings.append("No location was supplied, so result quality may vary.")

    item = {
        "sourceCount": source_count,
        "estimatedResults": estimated_results,
        "estimatedCompanies": estimated_companies,
        "runWindow": "2-10 minutes",
        "warnings": warnings,
    }
    return {
        "item": item,
        "sourceCount": source_count,
        "estimatedResults": estimated_results,
        "estimatedCompanies": estimated_companies,
        "runWindow": item["runWindow"],
        "warnings": warnings,
    }
