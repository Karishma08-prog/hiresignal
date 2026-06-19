from __future__ import annotations

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.services.auth import AuthPrincipal, principal_from_bearer_token

AUTH_EXEMPT_PATHS = {
    "/api/health",
    "/api/live",
    "/api/ready",
    "/api/metrics",
    "/api/auth/login",
}


def auth_enabled() -> bool:
    return bool(settings.api_token or settings.user_auth_enabled)


def is_auth_exempt(path: str) -> bool:
    return path in AUTH_EXEMPT_PATHS


def validate_bearer_token(db: Session, authorization: str | None) -> AuthPrincipal:
    if not auth_enabled():
        return AuthPrincipal(kind="service", token="", role="service")

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token.",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme.",
        )

    principal = principal_from_bearer_token(db, token.strip())
    if principal is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token.",
        )
    return principal


def get_request_principal(request: Request) -> AuthPrincipal:
    principal = getattr(request.state, "auth_principal", None)
    if principal is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return principal
