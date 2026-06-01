from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.database import get_db
from app.services.ingestion import ensure_source
from app.services.queue import enqueue_source_retest
from app.services.source_registry import (
    discover_source_slugs_from_jobs,
    refresh_source_support,
)
from app.utils import paginate, serialize_model

router = APIRouter(prefix="/sources", tags=["sources"])

SUPPORT_TIER_PRIORITY = {
    "disabled": -1,
    "experimental": 0,
    "fallback_supported": 1,
    "live_supported": 2,
}


def _group_source_family(site_key: str, display_name: str) -> tuple[str, str]:
    lowered = site_key.lower()
    if lowered == "ashby" or lowered.startswith("ashby_"):
        return "ashby", "Ashby"
    if lowered == "greenhouse" or lowered.startswith("greenhouse_"):
        return "greenhouse", "Greenhouse"
    if lowered == "lever" or lowered.startswith("lever_"):
        return "lever", "Lever"
    return site_key, display_name


def _group_source_overview(items: list[dict]) -> list[dict]:
    grouped: dict[str, dict] = {}
    working_states = {
        "working",
        "working_for_use_case",
        "working_but_not_for_current_query",
        "working_via_existing_results",
    }

    for item in items:
        group_key, group_label = _group_source_family(item["siteKey"], item["displayName"])
        existing = grouped.get(group_key)

        if existing is None:
            grouped[group_key] = {
                **item,
                "siteKey": group_key,
                "displayName": group_label,
                "memberSiteKeys": [item["siteKey"]],
                "memberCount": 1,
            }
            continue

        existing["memberSiteKeys"] = existing.get("memberSiteKeys", []) + [item["siteKey"]]
        existing["memberCount"] = int(existing.get("memberCount", 1)) + 1
        existing["lastRunJobsFound"] = int(existing.get("lastRunJobsFound", 0)) + int(
            item.get("lastRunJobsFound", 0)
        )
        existing["avgResults7d"] = float(existing.get("avgResults7d", 0)) + float(
            item.get("avgResults7d", 0)
        )
        existing["avgLatencyMs7d"] = max(
            float(existing.get("avgLatencyMs7d", 0)),
            float(item.get("avgLatencyMs7d", 0)),
        )
        existing["successRate7d"] = max(
            float(existing.get("successRate7d", 0)),
            float(item.get("successRate7d", 0)),
        )
        existing["needsApiKey"] = bool(existing.get("needsApiKey")) or bool(item.get("needsApiKey"))
        existing["needsProxy"] = bool(existing.get("needsProxy")) or bool(item.get("needsProxy"))
        existing["needsCompanySlug"] = bool(existing.get("needsCompanySlug")) or bool(
            item.get("needsCompanySlug")
        )
        existing["credentialPresent"] = bool(existing.get("credentialPresent")) or bool(
            item.get("credentialPresent")
        )
        existing["clientVisible"] = bool(existing.get("clientVisible", True)) or bool(
            item.get("clientVisible", True)
        )

        if not existing.get("credentialVerifiedAt"):
            existing["credentialVerifiedAt"] = item.get("credentialVerifiedAt")
        if not existing.get("lastSuccessAt"):
            existing["lastSuccessAt"] = item.get("lastSuccessAt")
        if not existing.get("lastErrorAt"):
            existing["lastErrorAt"] = item.get("lastErrorAt")

        item_is_working = item.get("workingStatus") in working_states
        existing_is_working = existing.get("workingStatus") in working_states
        item_is_successful = item_is_working or item.get("status") == "ready" or int(
            item.get("lastRunJobsFound", 0)
        ) > 0
        existing_is_successful = existing_is_working or existing.get("status") == "ready" or int(
            existing.get("lastRunJobsFound", 0)
        ) > 0

        if item.get("status") == "running" or existing.get("status") == "running":
            existing["status"] = "running"
        elif item_is_successful or existing_is_successful:
            existing["status"] = "ready"
            existing["lastErrorAt"] = None
            existing["lastErrorMessage"] = None
        elif item.get("status") == "failed" or existing.get("status") == "failed":
            existing["status"] = "failed"

        if item_is_successful or existing_is_successful:
            existing["workingStatus"] = "working"
        else:
            error_parts = [existing.get("lastErrorMessage"), item.get("lastErrorMessage")]
            merged_error = " | ".join(str(part) for part in error_parts if part)
            existing["lastErrorMessage"] = merged_error or None

        note_parts = [existing.get("credentialNote"), item.get("credentialNote")]
        merged_note = " | ".join(str(part) for part in note_parts if part)
        existing["credentialNote"] = merged_note or None

        item_notes = [existing.get("notes"), item.get("notes")]
        merged_notes = " | ".join(str(part) for part in item_notes if part)
        existing["notes"] = merged_notes or None

        if existing.get("engine") != item.get("engine"):
            existing["engine"] = f"{existing.get('engine')} + {item.get('engine')}"

        existing_tier = str(existing.get("supportTier") or "experimental")
        item_tier = str(item.get("supportTier") or "experimental")
        if SUPPORT_TIER_PRIORITY.get(item_tier, 0) > SUPPORT_TIER_PRIORITY.get(existing_tier, 0):
            existing["supportTier"] = item_tier
            existing["supportReason"] = item.get("supportReason")
        elif not existing.get("supportReason"):
            existing["supportReason"] = item.get("supportReason")

    return list(grouped.values())


def _effective_credential_state(
    source: models.Source | None,
    credential: models.SourceCredential,
) -> tuple[bool, str, str | None]:
    credential_present = credential.credential_present
    working_status = credential.working_status
    credential_note = credential.credential_note

    if source and source.category == "ats" and credential.needs_api_key and not settings.scrappa_token:
        return (
            False,
            "needs_setup",
            "ATS discovery needs SCRAPPA_TOKEN.",
        )

    if source and source.site_key == "ats_discovery" and not settings.scrappa_token:
        return (
            False,
            "needs_setup",
            "SCRAPPA_TOKEN is required to run scrappa_ats.mjs.",
        )

    return credential_present, working_status, credential_note


@router.post("/retest-all", response_model=schemas.SourceRetestBatchRead)
def retest_all_sources(db: Session = Depends(get_db)):
    sources = db.query(models.Source).order_by(models.Source.display_name.asc()).all()
    if not sources:
        raise HTTPException(status_code=404, detail="No sources found to retest.")

    jobs = [enqueue_source_retest(db, source.site_key) for source in sources]
    return schemas.SourceRetestBatchRead(
        queuedCount=len(jobs),
        queueJobIds=[job.id for job in jobs],
        siteKeys=[source.site_key for source in sources],
        status="queued",
        message="Queued retest jobs for all registered sources.",
    )


@router.get("", response_model=schemas.PaginatedResponse)
def list_sources(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=100),
    db: Session = Depends(get_db),
):
    sources = db.query(models.Source).order_by(models.Source.display_name.asc()).all()
    items = [serialize_model(schemas.SourceRead.model_validate(source)) for source in sources]
    return paginate(items, page, page_size)


@router.get("/health", response_model=schemas.PaginatedResponse)
def list_source_health(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=100),
    db: Session = Depends(get_db),
):
    health_rows = db.query(models.SourceHealth).order_by(models.SourceHealth.site_key.asc()).all()
    items = [serialize_model(schemas.SourceHealthRead.model_validate(row)) for row in health_rows]
    return paginate(items, page, page_size)


@router.get("/credentials", response_model=schemas.PaginatedResponse)
def list_source_credentials(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=100),
    db: Session = Depends(get_db),
):
    source_map = {
        row.site_key: row
        for row in db.query(models.Source).all()
    }
    rows = (
        db.query(models.SourceCredential)
        .order_by(models.SourceCredential.site_key.asc())
        .all()
    )
    items = []
    for row in rows:
        source = source_map.get(row.site_key)
        credential_present, working_status, credential_note = _effective_credential_state(source, row)
        items.append(
            schemas.SourceCredentialRead(
                siteKey=row.site_key,
                needsApiKey=row.needs_api_key,
                needsProxy=row.needs_proxy,
                needsCompanySlug=row.needs_company_slug,
                credentialPresent=credential_present,
                credentialVerifiedAt=row.credential_verified_at if credential_present else None,
                workingStatus=working_status,
                credentialNote=credential_note,
            ).model_dump()
        )
    return paginate(items, page, page_size)


@router.get("/support", response_model=schemas.PaginatedResponse)
def list_source_support(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, alias="pageSize", ge=1, le=200),
    db: Session = Depends(get_db),
):
    sources = db.query(models.Source).order_by(models.Source.display_name.asc()).all()
    health_map = {row.site_key: row for row in db.query(models.SourceHealth).all()}
    credential_map = {row.site_key: row for row in db.query(models.SourceCredential).all()}

    items = []
    for source in sources:
        support = refresh_source_support(
            db,
            source.site_key,
            source=source,
            health=health_map.get(source.site_key),
            credential=credential_map.get(source.site_key),
        )
        items.append(serialize_model(schemas.SourceSupportRead.model_validate(support)))
    db.commit()
    return paginate(items, page, page_size)


@router.get("/slugs", response_model=schemas.PaginatedResponse)
def list_source_slugs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, alias="pageSize", ge=1, le=200),
    site_key: str | None = Query(default=None, alias="siteKey"),
    db: Session = Depends(get_db),
):
    query = db.query(models.SourceSlug).order_by(
        models.SourceSlug.last_verified_at.desc(),
        models.SourceSlug.last_discovered_at.desc(),
        models.SourceSlug.updated_at.desc(),
    )
    if site_key:
        query = query.filter(models.SourceSlug.site_key == site_key.strip().lower())
    rows = query.all()
    items = [serialize_model(schemas.SourceSlugRead.model_validate(row)) for row in rows]
    return paginate(items, page, page_size)


@router.get("/evidence", response_model=schemas.PaginatedResponse)
def list_source_evidence(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, alias="pageSize", ge=1, le=200),
    site_key: str | None = Query(default=None, alias="siteKey"),
    run_id: str | None = Query(default=None, alias="runId"),
    db: Session = Depends(get_db),
):
    query = db.query(models.SourceEvidence).order_by(models.SourceEvidence.created_at.desc())
    if site_key:
        query = query.filter(models.SourceEvidence.site_key == site_key.strip().lower())
    if run_id:
        query = query.filter(models.SourceEvidence.run_id == run_id)
    rows = query.all()
    items = [serialize_model(schemas.SourceEvidenceRead.model_validate(row)) for row in rows]
    return paginate(items, page, page_size)


@router.get("/overview", response_model=schemas.PaginatedResponse)
def list_source_overview(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, alias="pageSize", ge=1, le=200),
    db: Session = Depends(get_db),
):
    sources = db.query(models.Source).order_by(models.Source.display_name.asc()).all()
    health_map = {
        row.site_key: row
        for row in db.query(models.SourceHealth).all()
    }
    credential_map = {
        row.site_key: row
        for row in db.query(models.SourceCredential).all()
    }

    items = []
    for source in sources:
        health = health_map.get(source.site_key)
        credential = credential_map.get(source.site_key)
        support = refresh_source_support(
            db,
            source.site_key,
            source=source,
            health=health,
            credential=credential,
        )
        credential_present = credential.credential_present if credential else False
        credential_verified_at = credential.credential_verified_at if credential else None
        working_status = credential.working_status if credential else "unknown"
        credential_note = credential.credential_note if credential else None

        if credential is not None:
            credential_present, working_status, credential_note = _effective_credential_state(source, credential)
            if not credential_present:
                credential_verified_at = None

        items.append(
            schemas.SourceOverviewRead(
                siteKey=source.site_key,
                displayName=source.display_name,
                category=source.category,
                engine=source.engine,
                region=source.region,
                status=health.status if health else "unknown",
                supportTier=support.support_tier,
                supportReason=support.support_reason,
                clientVisible=support.client_visible,
                lastSuccessAt=health.last_success_at if health else None,
                lastErrorAt=health.last_error_at if health else None,
                lastErrorMessage=health.last_error_message if health else None,
                avgResults7d=health.avg_results_7d if health else 0,
                avgLatencyMs7d=health.avg_latency_ms_7d if health else 0,
                successRate7d=health.success_rate_7d if health else 0,
                lastRunJobsFound=health.last_run_jobs_found if health else 0,
                needsApiKey=credential.needs_api_key if credential else False,
                needsProxy=credential.needs_proxy if credential else False,
                needsCompanySlug=credential.needs_company_slug if credential else False,
                credentialPresent=credential_present,
                credentialVerifiedAt=credential_verified_at,
                workingStatus=working_status,
                credentialNote=credential_note,
                notes=source.notes,
            ).model_dump()
        )
    db.commit()
    grouped_items = _group_source_overview(items)
    grouped_items.sort(key=lambda item: str(item.get("displayName", "")).lower())
    return paginate(grouped_items, page, page_size)


@router.post("/{site_key}/discover-slugs", response_model=schemas.PaginatedResponse)
def discover_source_slugs(
    site_key: str,
    db: Session = Depends(get_db),
):
    source = ensure_source(db, site_key)
    rows = discover_source_slugs_from_jobs(db, source.site_key)
    db.commit()
    items = [serialize_model(schemas.SourceSlugRead.model_validate(row)) for row in rows]
    return paginate(items, page=1, page_size=max(len(items), 1))


@router.post("/{site_key}/retest", response_model=schemas.SourceRetestRead)
def retest_source(site_key: str, db: Session = Depends(get_db)):
    source = ensure_source(db, site_key)
    job = enqueue_source_retest(db, source.site_key)
    return schemas.SourceRetestRead(
        siteKey=source.site_key,
        queueJobId=job.id,
        status="queued",
        message=f"Queued a retest for {source.display_name}.",
    )
