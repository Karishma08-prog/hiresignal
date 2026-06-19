from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.utils import make_id

PBKDF2_ITERATIONS = 390000
SESSION_TOKEN_PREFIX = "hsu_"


@dataclass(frozen=True)
class AuthPrincipal:
    kind: str
    token: str
    user_id: str | None = None
    email: str | None = None
    role: str | None = None


def normalize_email(value: str) -> str:
    return (value or "").strip().lower()


def hash_password(password: str, *, salt: str | None = None) -> str:
    actual_salt = salt or secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        actual_salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${actual_salt}${derived}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iteration_text, salt, digest = password_hash.split("$", 3)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    try:
        iterations = int(iteration_text)
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()
    return hmac.compare_digest(candidate, digest)


def _session_token_hash(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_session(db: Session, user: models.User) -> tuple[models.UserSession, str]:
    raw_token = f"{SESSION_TOKEN_PREFIX}{secrets.token_urlsafe(32)}"
    session = models.UserSession(
        id=make_id("sess"),
        user_id=user.id,
        token_hash=_session_token_hash(raw_token),
        expires_at=datetime.utcnow() + timedelta(hours=max(settings.session_hours, 1)),
        last_seen_at=datetime.utcnow(),
    )
    db.add(session)
    user.last_login_at = datetime.utcnow()
    db.flush()
    return session, raw_token


def revoke_session(db: Session, raw_token: str) -> None:
    token_hash = _session_token_hash(raw_token)
    session = (
        db.query(models.UserSession)
        .filter(models.UserSession.token_hash == token_hash)
        .first()
    )
    if session is None or session.revoked_at is not None:
        return
    session.revoked_at = datetime.utcnow()
    db.flush()


def authenticate_user(db: Session, email: str, password: str) -> models.User | None:
    normalized_email = normalize_email(email)
    user = db.query(models.User).filter(models.User.email == normalized_email).first()
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def principal_from_bearer_token(db: Session, token: str) -> AuthPrincipal | None:
    service_token = settings.api_token
    if service_token and hmac.compare_digest(token.strip(), service_token):
        return AuthPrincipal(kind="service", token=token.strip(), role="service")

    if not settings.user_auth_enabled or not token.startswith(SESSION_TOKEN_PREFIX):
        return None

    session = (
        db.query(models.UserSession)
        .join(models.User)
        .filter(models.UserSession.token_hash == _session_token_hash(token.strip()))
        .first()
    )
    if session is None or session.revoked_at is not None or session.expires_at <= datetime.utcnow():
        return None
    if session.user is None or not session.user.is_active:
        return None
    session.last_seen_at = datetime.utcnow()
    db.flush()
    return AuthPrincipal(
        kind="user",
        token=token.strip(),
        user_id=session.user.id,
        email=session.user.email,
        role=session.user.role,
    )


def ensure_default_admin_user(db: Session) -> models.User | None:
    if not settings.user_auth_enabled:
        return None
    existing = db.query(models.User).filter(models.User.email == settings.default_admin_email).first()
    if existing is not None:
        return existing
    any_user = db.query(models.User.id).first()
    if any_user is not None:
        return None
    user = models.User(
        id=make_id("usr"),
        name=settings.default_admin_name,
        email=settings.default_admin_email,
        password_hash=hash_password(settings.default_admin_password),
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user
