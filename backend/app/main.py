from __future__ import annotations

import threading
from time import perf_counter

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine
from app.routers import artifacts, auth, campaigns, companies, compat, health, jobs, ops, reports, runs, sources
from app.security import is_auth_exempt, validate_bearer_token
from app.services.auth import ensure_default_admin_user
from app.services.monitoring import runtime_metrics
from app.services.queue import start_embedded_worker, stop_embedded_worker
from app.services.storage import backfill_artifact_blobs, ensure_artifact_storage_columns
from app.seed_data import seed_sources
from app.database import SessionLocal


def _backfill_artifacts_in_background() -> None:
    db = SessionLocal()
    try:
        backfill_artifact_blobs(db)
    finally:
        db.close()


def _start_worker_in_background() -> None:
    start_embedded_worker()


app = FastAPI(
    title="HireSignal Backend",
    version="0.1.0",
    description="API and orchestration layer for HireSignal campaigns, jobs, companies, sources, and reports.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def auth_and_monitoring_middleware(request: Request, call_next):
    started = perf_counter()
    path = request.url.path

    if request.method.upper() != "OPTIONS" and path.startswith("/api") and not is_auth_exempt(path):
        db = SessionLocal()
        try:
            principal = validate_bearer_token(db, request.headers.get("Authorization"))
            request.state.auth_principal = principal
        except Exception as exc:
            duration_ms = (perf_counter() - started) * 1000
            status_code = getattr(exc, "status_code", 500)
            runtime_metrics.record_request(
                method=request.method,
                path=path,
                status_code=status_code,
                duration_ms=duration_ms,
            )
            detail = getattr(exc, "detail", "Unauthorized")
            return JSONResponse(status_code=status_code, content={"detail": detail})
        finally:
            db.close()

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (perf_counter() - started) * 1000
        runtime_metrics.record_request(
            method=request.method,
            path=path,
            status_code=500,
            duration_ms=duration_ms,
        )
        raise

    duration_ms = (perf_counter() - started) * 1000
    runtime_metrics.record_request(
        method=request.method,
        path=path,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )
    return response


@app.on_event("startup")
def on_startup() -> None:
    ensure_artifact_storage_columns(engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_sources(db)
        ensure_default_admin_user(db)
        db.commit()
    finally:
        db.close()
    threading.Thread(
        target=_backfill_artifacts_in_background,
        name="hiresignal-artifact-backfill",
        daemon=True,
    ).start()
    threading.Thread(
        target=_start_worker_in_background,
        name="hiresignal-embedded-worker-bootstrap",
        daemon=True,
    ).start()


@app.on_event("shutdown")
def on_shutdown() -> None:
    stop_embedded_worker()


app.include_router(health.router, prefix="/api")
app.include_router(ops.router, prefix="/api")
app.include_router(compat.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(campaigns.router, prefix="/api")
app.include_router(runs.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(artifacts.router, prefix="/api")
