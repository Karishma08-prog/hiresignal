from __future__ import annotations

import hashlib
import mimetypes
from pathlib import Path
from typing import Iterable

from fastapi import HTTPException
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy import inspect, text

from app.config import settings

DB_STORAGE_SCHEME = "db://artifact"


def _db_storage_location(artifact_id: str, file_name: str) -> str:
    return f"{DB_STORAGE_SCHEME}/{artifact_id}/{Path(file_name).name}"


def _is_s3_location(location: str) -> bool:
    return location.startswith("s3://")


def _is_db_location(location: str) -> bool:
    return location.startswith(DB_STORAGE_SCHEME)


def _require_boto3():
    try:
        import boto3  # type: ignore
    except Exception as exc:  # pragma: no cover - import guard
        raise RuntimeError(
            "boto3 is required when HIRESIGNAL_ARTIFACT_BACKEND=s3."
        ) from exc
    return boto3


def _get_s3_client():
    boto3 = _require_boto3()
    return boto3.client(
        "s3",
        region_name=settings.s3_region,
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
    )


def _build_s3_key(artifact_id: str, file_name: str) -> str:
    safe_file_name = Path(file_name).name
    prefix = settings.s3_prefix.strip("/")
    if prefix:
        return f"{prefix}/{artifact_id}/{safe_file_name}"
    return f"{artifact_id}/{safe_file_name}"


def _artifact_checksum(payload: bytes) -> str:
    return hashlib.sha1(payload).hexdigest()


def ensure_artifact_storage_columns(engine) -> None:
    inspector = inspect(engine)
    try:
        column_names = {column["name"] for column in inspector.get_columns("artifacts")}
    except Exception:
        return

    ddl_by_column: dict[str, str] = {
        "storage_backend": "ALTER TABLE artifacts ADD COLUMN storage_backend VARCHAR DEFAULT 'database'",
        "byte_count": "ALTER TABLE artifacts ADD COLUMN byte_count INTEGER DEFAULT 0",
        "checksum_sha1": "ALTER TABLE artifacts ADD COLUMN checksum_sha1 VARCHAR",
        "file_blob": (
            "ALTER TABLE artifacts ADD COLUMN file_blob BYTEA"
            if engine.dialect.name == "postgresql"
            else "ALTER TABLE artifacts ADD COLUMN file_blob BLOB"
        ),
    }

    with engine.begin() as connection:
        for column_name, ddl in ddl_by_column.items():
            if column_name in column_names:
                continue
            connection.execute(text(ddl))


def hydrate_artifact_record(artifact, source_path: Path) -> None:
    source_path = source_path.resolve()
    if not source_path.exists():
        raise FileNotFoundError(f"Artifact source file does not exist: {source_path}")

    payload = source_path.read_bytes()
    artifact.file_blob = payload
    artifact.byte_count = len(payload)
    artifact.checksum_sha1 = _artifact_checksum(payload)
    artifact.storage_backend = "database"
    artifact.file_path = _db_storage_location(artifact.id, artifact.file_name)


def _iter_s3_chunks(body) -> Iterable[bytes]:
    while True:
        chunk = body.read(1024 * 1024)
        if not chunk:
            break
        yield chunk


def _read_legacy_artifact_bytes(location: str) -> bytes | None:
    if not location:
        return None
    if _is_db_location(location):
        return None
    if _is_s3_location(location):
        bucket, _, key = location.removeprefix("s3://").partition("/")
        if not bucket or not key:
            return None
        client = _get_s3_client()
        response = client.get_object(Bucket=bucket, Key=key)
        return response["Body"].read()

    file_path = Path(location)
    if not file_path.exists():
        return None
    return file_path.read_bytes()


def _read_local_artifact_bytes_by_name(file_name: str) -> bytes | None:
    candidate = settings.artifacts_dir / Path(file_name).name
    if candidate.exists():
        return candidate.read_bytes()
    return None


def backfill_artifact_blobs(db) -> int:
    from app import models

    artifacts = (
        db.query(models.Artifact)
        .filter((models.Artifact.file_blob.is_(None)) | (models.Artifact.byte_count == 0))
        .all()
    )

    updated = 0
    for artifact in artifacts:
        payload = _read_legacy_artifact_bytes(artifact.file_path)
        if payload is None:
            payload = _read_local_artifact_bytes_by_name(artifact.file_name)
        if payload is None:
            continue
        artifact.file_blob = payload
        artifact.byte_count = len(payload)
        artifact.checksum_sha1 = _artifact_checksum(payload)
        artifact.storage_backend = "database"
        artifact.file_path = _db_storage_location(artifact.id, artifact.file_name)
        updated += 1

    if updated:
        db.commit()
    return updated


def repair_artifact_storage(db, artifact) -> bool:
    if artifact.file_blob is not None and artifact.byte_count:
        return False

    payload = _read_legacy_artifact_bytes(artifact.file_path)
    if payload is None:
        payload = _read_local_artifact_bytes_by_name(artifact.file_name)
    if payload is None:
        return False

    artifact.file_blob = payload
    artifact.byte_count = len(payload)
    artifact.checksum_sha1 = _artifact_checksum(payload)
    artifact.storage_backend = "database"
    artifact.file_path = _db_storage_location(artifact.id, artifact.file_name)
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    return True


def build_download_response(artifact):
    if artifact.file_blob is not None:
        return Response(
            content=artifact.file_blob,
            media_type=artifact.mime_type,
            headers={"Content-Disposition": f'attachment; filename="{artifact.file_name}"'},
        )

    location = artifact.file_path
    if _is_db_location(location):
        payload = _read_local_artifact_bytes_by_name(artifact.file_name)
        if payload is not None:
          return Response(
              content=payload,
              media_type=artifact.mime_type,
              headers={"Content-Disposition": f'attachment; filename="{artifact.file_name}"'},
          )

    if _is_s3_location(location):
        bucket, _, key = location.removeprefix("s3://").partition("/")
        if not bucket or not key:
            raise HTTPException(status_code=500, detail="Artifact storage location is invalid.")
        client = _get_s3_client()
        response = client.get_object(Bucket=bucket, Key=key)
        body = response["Body"]
        return StreamingResponse(
            _iter_s3_chunks(body),
            media_type=artifact.mime_type,
            headers={"Content-Disposition": f'attachment; filename="{artifact.file_name}"'},
        )

    file_path = Path(location)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Artifact file is missing")
    return FileResponse(path=file_path, media_type=artifact.mime_type, filename=artifact.file_name)


def materialize_artifact_to_path(artifact, target_dir: Path) -> Path:
    target_dir.mkdir(parents=True, exist_ok=True)

    if artifact.file_blob is not None:
        target_path = target_dir / f"{artifact.id}-{Path(artifact.file_name).name}"
        needs_write = True
        if target_path.exists() and artifact.checksum_sha1:
            existing_checksum = _artifact_checksum(target_path.read_bytes())
            needs_write = existing_checksum != artifact.checksum_sha1
        if needs_write:
            target_path.write_bytes(artifact.file_blob)
        return target_path

    location = artifact.file_path
    if _is_s3_location(location):
        payload = _read_legacy_artifact_bytes(location)
        if payload is None:
            raise FileNotFoundError(f"Artifact source file does not exist: {location}")
        target_path = target_dir / f"{artifact.id}-{Path(artifact.file_name).name}"
        target_path.write_bytes(payload)
        return target_path

    source_path = Path(location)
    if not source_path.exists():
        raise FileNotFoundError(f"Artifact source file does not exist: {location}")
    return source_path


def storage_readiness() -> dict[str, object]:
    backend = settings.artifact_backend
    if backend == "s3":
        if not settings.s3_bucket:
            return {
                "ok": False,
                "backend": "s3",
                "detail": "HIRESIGNAL_S3_BUCKET is not configured.",
            }
        try:
            client = _get_s3_client()
            client.head_bucket(Bucket=settings.s3_bucket)
        except Exception as exc:
            return {
                "ok": False,
                "backend": "s3",
                "detail": str(exc),
            }
        return {
            "ok": True,
            "backend": "s3",
            "bucket": settings.s3_bucket,
            "prefix": settings.s3_prefix,
        }

    if backend == "database":
        return {
            "ok": True,
            "backend": "database",
            "detail": "Artifacts are stored as blobs in the primary database.",
        }

    try:
        settings.artifacts_dir.mkdir(parents=True, exist_ok=True)
        probe = settings.artifacts_dir / ".storage-check"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
    except Exception as exc:
        return {
            "ok": False,
            "backend": "local",
            "detail": str(exc),
        }
    return {
        "ok": True,
        "backend": "local",
        "path": str(settings.artifacts_dir),
    }


def guess_media_type(file_name: str) -> str:
    media_type, _ = mimetypes.guess_type(file_name)
    return media_type or "application/octet-stream"
