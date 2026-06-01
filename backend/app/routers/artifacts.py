from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


@router.get("/{artifact_id}", response_model=schemas.ItemResponse)
def get_artifact(artifact_id: str, db: Session = Depends(get_db)):
    artifact = db.get(models.Artifact, artifact_id)
    if artifact is None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return {"item": schemas.ArtifactRead.model_validate(artifact).model_dump(by_alias=False)}


@router.get("/{artifact_id}/download")
def download_artifact(artifact_id: str, db: Session = Depends(get_db)):
    artifact = db.get(models.Artifact, artifact_id)
    if artifact is None:
        raise HTTPException(status_code=404, detail="Artifact not found")

    file_path = Path(artifact.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Artifact file is missing")

    return FileResponse(
        path=file_path,
        media_type=artifact.mime_type,
        filename=artifact.file_name,
    )
