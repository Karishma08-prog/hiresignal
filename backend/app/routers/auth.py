from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app import models
from app import schemas
from app.database import get_db
from app.security import get_request_principal
from app.services.auth import authenticate_user, create_session, revoke_session

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(payload: schemas.AuthLoginRequest, db=Depends(get_db)) -> dict:
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    session, token = create_session(db, user)
    db.commit()
    db.refresh(user)
    return {
        "item": schemas.AuthLoginResponse(
            user=schemas.UserRead.model_validate(user),
            token=token,
            expiresAt=session.expires_at,
        )
    }


@router.post("/logout")
def logout(request: Request, principal=Depends(get_request_principal), db=Depends(get_db)) -> dict:
    if principal.kind == "user" and principal.token:
        revoke_session(db, principal.token)
        db.commit()
    return {"item": {"success": True}}


@router.get("/me")
def me(request: Request, principal=Depends(get_request_principal), db=Depends(get_db)) -> dict:
    if principal.kind != "user" or not principal.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A signed-in user session is required.",
        )
    user = db.query(models.User).filter_by(id=principal.user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return {"item": schemas.UserRead.model_validate(user)}
