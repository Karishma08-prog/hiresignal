from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app import models
from app.config import settings
from app.database import SessionLocal
from app.services.monitoring import runtime_metrics
from app.services.storage import storage_readiness

router = APIRouter(tags=["ops"])


def _database_readiness() -> dict[str, object]:
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"ok": True, "url": settings.db_url}
    except Exception as exc:
        return {"ok": False, "detail": str(exc), "url": settings.db_url}
    finally:
        db.close()


def _queue_readiness() -> dict[str, object]:
    if settings.queue_mode == "celery":
        try:
            import redis  # type: ignore

            client = redis.from_url(settings.redis_url)
            client.ping()
            return {
                "ok": True,
                "mode": "celery",
                "redisUrl": settings.redis_url,
            }
        except Exception as exc:
            return {
                "ok": False,
                "mode": "celery",
                "redisUrl": settings.redis_url,
                "detail": str(exc),
            }

    db = SessionLocal()
    try:
        latest = (
            db.query(models.WorkerHeartbeat)
            .order_by(models.WorkerHeartbeat.last_seen_at.desc())
            .first()
        )
        if settings.embedded_worker:
            if latest is None:
                return {
                    "ok": False,
                    "mode": "database",
                    "detail": "Embedded worker heartbeat not found yet.",
                }
            fresh_after = datetime.utcnow() - timedelta(seconds=settings.worker_heartbeat_seconds * 2)
            return {
                "ok": latest.last_seen_at >= fresh_after,
                "mode": "database",
                "workerName": latest.worker_name,
                "lastSeenAt": latest.last_seen_at.isoformat(),
                "embeddedWorker": True,
            }

        if latest is None:
            return {
                "ok": False,
                "mode": "database",
                "embeddedWorker": False,
                "detail": "Separate worker heartbeat not found.",
            }
        fresh_after = datetime.utcnow() - timedelta(seconds=settings.worker_heartbeat_seconds * 2)
        return {
            "ok": latest.last_seen_at >= fresh_after,
            "mode": "database",
            "embeddedWorker": False,
            "workerName": latest.worker_name,
            "lastSeenAt": latest.last_seen_at.isoformat(),
        }
    finally:
        db.close()


@router.get("/live")
def livecheck():
    metrics = runtime_metrics.snapshot()
    return {
        "status": "alive",
        "service": "hiresignal-backend",
        "uptimeSeconds": metrics["uptimeSeconds"],
    }


@router.get("/ready")
def readiness():
    checks = {
        "database": _database_readiness(),
        "storage": storage_readiness(),
        "queue": _queue_readiness(),
    }
    ok = all(bool(component.get("ok")) for component in checks.values())
    payload = {
        "status": "ready" if ok else "degraded",
        "checks": checks,
        "queueMode": settings.queue_mode,
        "embeddedWorker": settings.embedded_worker,
        "artifactBackend": settings.artifact_backend,
    }
    return JSONResponse(status_code=200 if ok else 503, content=payload)


@router.get("/metrics")
def metrics():
    snapshot = runtime_metrics.snapshot()
    snapshot.update(
        {
            "queueMode": settings.queue_mode,
            "embeddedWorker": settings.embedded_worker,
            "artifactBackend": settings.artifact_backend,
            "authEnabled": bool(settings.api_token),
        }
    )
    return snapshot
