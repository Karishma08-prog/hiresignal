from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.database import get_db
from app.routers.runs import _is_demo_fallback_run
from app.services.queue import enqueue_campaign_run, launch_campaign_run_now
from app.services.source_catalog import FREE_ZERO_CONFIG_BOARDS
from app.services.source_runtime import get_preferred_live_search_boards
from app.utils import make_id, paginate, serialize_model
from app.routers.runs import _serialize_run

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _should_launch_inline(triggered_by: str) -> bool:
    return settings.queue_mode == "database" and triggered_by in {"frontend", "frontend_preset", "manual"}


@router.post("", response_model=schemas.ItemResponse, status_code=201)
def create_campaign(payload: schemas.CampaignCreate, db: Session = Depends(get_db)):
    campaign = models.Campaign(
        id=make_id("cmp"),
        name=payload.name,
        role_query=payload.roleQuery,
        country=payload.country,
        location=payload.location,
        days=payload.days,
        remote_only=payload.remoteOnly,
        results_per_source=payload.resultsPerSource,
        status="draft",
        title_filter_config=payload.titleFilterConfig,
        objective_filter_config=payload.objectiveFilterConfig,
        source_config=payload.sourceConfig,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return {"item": serialize_model(schemas.CampaignRead.model_validate(campaign))}


@router.post("/presets/free-zero-config", response_model=schemas.ItemResponse, status_code=202)
def launch_free_zero_config_campaign(
    payload: schemas.CampaignPresetLaunch,
    db: Session = Depends(get_db),
):
    resolved_search_boards = get_preferred_live_search_boards(
        db,
        allowed_site_keys=FREE_ZERO_CONFIG_BOARDS,
        limit=12,
    ) or ["linkedin"]

    launch_inline = _should_launch_inline(payload.triggeredBy)

    campaign = models.Campaign(
        id=make_id("cmp"),
        name=payload.name,
        role_query=payload.roleQuery,
        country=payload.country,
        location=payload.location,
        days=payload.days,
        remote_only=payload.remoteOnly,
        results_per_source=payload.resultsPerSource,
        status="running" if launch_inline else "queued",
        title_filter_config=payload.titleFilterConfig,
        objective_filter_config=payload.objectiveFilterConfig,
        source_config={
            "searchBoards": resolved_search_boards,
            "browserBoards": [],
            "atsBoards": [],
            "preset": "free_zero_config",
            "requestedBoardCount": len(FREE_ZERO_CONFIG_BOARDS),
            "resolvedBoardCount": len(resolved_search_boards),
        },
    )
    run = models.CampaignRun(
        id=make_id("run"),
        campaign_id=campaign.id,
        status="running" if launch_inline else "queued",
        triggered_by=payload.triggeredBy,
        source_summary=[],
        run_notes=(
            (
                "Launching immediately from the free zero-config preset using the currently "
                f"healthiest {len(resolved_search_boards)} zero-config sources in this backend environment."
            )
            if launch_inline
            else (
                "Queued from the free zero-config preset using the currently healthiest "
                f"{len(resolved_search_boards)} zero-config sources in this backend environment."
            )
        ),
    )
    campaign.last_run_id = run.id
    db.add(campaign)
    db.add(run)
    db.commit()
    db.refresh(campaign)
    db.refresh(run)

    if launch_inline:
        launch_campaign_run_now(db, campaign.id, run.id)
    else:
        enqueue_campaign_run(db, campaign.id, run.id)
    return {
        "item": {
            "campaign": serialize_model(schemas.CampaignRead.model_validate(campaign)),
            "run": _serialize_run(db, run),
        }
    }


@router.get("", response_model=schemas.PaginatedResponse)
def list_campaigns(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    include_demo: bool = Query(default=False, alias="includeDemo"),
    db: Session = Depends(get_db),
):
    campaigns = db.query(models.Campaign).order_by(models.Campaign.created_at.desc()).all()
    if not include_demo:
        visible_campaigns: list[models.Campaign] = []
        for campaign in campaigns:
            if not campaign.last_run_id:
                visible_campaigns.append(campaign)
                continue
            last_run = db.get(models.CampaignRun, campaign.last_run_id)
            if last_run is None or not _is_demo_fallback_run(db, last_run):
                visible_campaigns.append(campaign)
        campaigns = visible_campaigns
    items = [serialize_model(schemas.CampaignRead.model_validate(campaign)) for campaign in campaigns]
    return paginate(items, page, page_size)


@router.get("/{campaign_id}", response_model=schemas.ItemResponse)
def get_campaign(campaign_id: str, db: Session = Depends(get_db)):
    campaign = db.get(models.Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"item": serialize_model(schemas.CampaignRead.model_validate(campaign))}


@router.patch("/{campaign_id}", response_model=schemas.ItemResponse)
def update_campaign(campaign_id: str, payload: schemas.CampaignUpdate, db: Session = Depends(get_db)):
    campaign = db.get(models.Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    updates = payload.model_dump(exclude_unset=True)
    mapping = {
        "roleQuery": "role_query",
        "remoteOnly": "remote_only",
        "resultsPerSource": "results_per_source",
        "titleFilterConfig": "title_filter_config",
        "objectiveFilterConfig": "objective_filter_config",
        "sourceConfig": "source_config",
    }
    for key, value in updates.items():
        setattr(campaign, mapping.get(key, key), value)
    db.commit()
    db.refresh(campaign)
    return {"item": serialize_model(schemas.CampaignRead.model_validate(campaign))}


@router.post("/{campaign_id}/run", response_model=schemas.ItemResponse, status_code=202)
def trigger_campaign_run(
    campaign_id: str,
    payload: schemas.RunTrigger,
    db: Session = Depends(get_db),
):
    campaign = db.get(models.Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    launch_inline = _should_launch_inline(payload.triggeredBy)

    run = models.CampaignRun(
        id=make_id("run"),
        campaign_id=campaign.id,
        status="running" if launch_inline else "queued",
        triggered_by=payload.triggeredBy,
        source_summary=[],
        run_notes="Launching immediately from the frontend." if launch_inline else None,
    )
    campaign.status = "running" if launch_inline else "queued"
    campaign.last_run_id = run.id
    db.add(run)
    db.commit()
    db.refresh(run)

    if launch_inline:
        launch_campaign_run_now(db, campaign.id, run.id)
    else:
        enqueue_campaign_run(db, campaign.id, run.id)
    return {"item": _serialize_run(db, run)}
