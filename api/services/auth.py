# RecyClique API — Service auth (Story 3.1).
# Login, JWT, refresh, logout, password/PIN hashing. Pas de secret en dur.

import hashlib
import json
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.config import get_settings
from api.models import User, UserSession, LoginHistory, RegistrationRequest

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class AuthService:
    """Service d'authentification : mots de passe, JWT, sessions."""

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def hash_password(self, plain: str) -> str:
        return pwd_context.hash(plain)

    def verify_password(self, plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    def hash_pin(self, plain: str) -> str:
        return pwd_context.hash(plain)

    def verify_pin(self, plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    def create_access_token(self, subject: str | UUID) -> str:
        expire = _now_utc() + timedelta(minutes=self.settings.jwt_access_token_expire_minutes)
        to_encode = {"sub": str(subject), "exp": expire, "type": "access"}
        return jwt.encode(
            to_encode,
            self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm,
        )

    def create_refresh_token(self) -> str:
        return secrets.token_urlsafe(64)

    def create_session_token(self) -> str:
        return secrets.token_urlsafe(64)

    def decode_access_token(self, token: str) -> str | None:
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret_key,
                algorithms=[self.settings.jwt_algorithm],
            )
            if payload.get("type") != "access":
                return None
            return payload.get("sub")
        except JWTError:
            return None

    def get_user_by_username(self, username: str) -> User | None:
        return self.db.execute(select(User).where(User.username == username)).scalars().one_or_none()

    def get_user_by_id(self, user_id: UUID) -> User | None:
        return self.db.execute(select(User).where(User.id == user_id)).scalars().one_or_none()

    def get_user_by_email(self, email: str) -> User | None:
        return self.db.execute(select(User).where(User.email == email)).scalars().one_or_none()

    def log_login(
        self,
        user_id: UUID | None,
        username: str | None,
        success: bool,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        entry = LoginHistory(
            user_id=user_id,
            username=username,
            ip_address=ip,
            user_agent=user_agent[:512] if user_agent else None,
            success=success,
        )
        self.db.add(entry)
        self.db.commit()

    def create_session(self, user_id: UUID, refresh_token: str) -> UserSession:
        expires = _now_utc() + timedelta(days=self.settings.jwt_refresh_token_expire_days)
        session = UserSession(
            user_id=user_id,
            refresh_token_hash=_hash_refresh_token(refresh_token),
            expires_at=expires,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def add_session_no_commit(self, user_id: UUID, refresh_token: str) -> UserSession:
        """Ajoute une session en base sans commit (pour regroupement transactionnel, ex. + audit)."""
        expires = _now_utc() + timedelta(days=self.settings.jwt_refresh_token_expire_days)
        session = UserSession(
            user_id=user_id,
            refresh_token_hash=_hash_refresh_token(refresh_token),
            expires_at=expires,
        )
        self.db.add(session)
        return session

    def find_session_by_refresh_token(self, refresh_token: str) -> UserSession | None:
        h = _hash_refresh_token(refresh_token)
        return (
            self.db.execute(
                select(UserSession).where(
                    UserSession.refresh_token_hash == h,
                    UserSession.expires_at > _now_utc(),
                )
            )
            .scalars()
            .one_or_none()
        )

    def delete_session(self, session: UserSession) -> None:
        self.db.delete(session)
        self.db.commit()

    def create_bff_session(self, user_id: UUID) -> tuple[UserSession, str]:
        session_token = self.create_session_token()
        expires = _now_utc() + timedelta(seconds=self.settings.auth_session_cookie_max_age_seconds)
        session = UserSession(
            user_id=user_id,
            refresh_token_hash=_hash_refresh_token(session_token),
            expires_at=expires,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session, session_token

    def find_bff_session(self, session_token: str) -> UserSession | None:
        h = _hash_refresh_token(session_token)
        return (
            self.db.execute(
                select(UserSession).where(
                    UserSession.refresh_token_hash == h,
                    UserSession.expires_at > _now_utc(),
                )
            )
            .scalars()
            .one_or_none()
        )

    def rotate_bff_session(self, old_session: UserSession) -> tuple[UserSession, str]:
        self.db.delete(old_session)
        self.db.commit()
        return self.create_bff_session(old_session.user_id)

    def log_security_event(
        self,
        *,
        event: str,
        request_id: str,
        success: bool,
        details: dict[str, Any] | None = None,
    ) -> None:
        payload: dict[str, Any] = {
            "event": event,
            "request_id": request_id,
            "success": success,
        }
        if details:
            payload["details"] = details
        logger.info(json.dumps(payload, ensure_ascii=True))

    def create_registration_request(
        self,
        username: str,
        email: str,
        password_hash: str,
        first_name: str | None = None,
        last_name: str | None = None,
    ) -> RegistrationRequest:
        req = RegistrationRequest(
            username=username,
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name,
            status="pending",
        )
        self.db.add(req)
        self.db.commit()
        self.db.refresh(req)
        return req
