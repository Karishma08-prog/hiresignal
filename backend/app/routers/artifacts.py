from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.storage import build_download_response, repair_artifact_storage

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
    repair_artifact_storage(db, artifact)
    return build_download_response(artifact)
