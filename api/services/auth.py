# RecyClique API — Service auth (Story 3.1).
# Login, JWT, refresh, logout, password/PIN hashing. Pas de secret en dur.

import hashlib
import json
import logging
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any
from urllib.parse import urlencode
from uuid import UUID

import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.config import get_settings
from api.models import User, UserSession, LoginHistory, RegistrationRequest

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)
_OIDC_FLOW_TTL_SECONDS = 600


class OidcDependencyUnavailableError(RuntimeError):
    pass


class OidcRuntimeConfigurationError(RuntimeError):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("oidc_runtime_config_incomplete")


@dataclass
class PendingOidcFlow:
    code_verifier: str
    nonce: str
    next_path: str
    state_binding_hash: str
    created_at: datetime


_pending_oidc_flows: dict[str, PendingOidcFlow] = {}
_jwks_cache: dict[str, Any] = {"keys": None, "expires_at": datetime.fromtimestamp(0, tz=timezone.utc)}


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _hash_pkce_verifier(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    import base64
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


def _hash_state_binding(binding: str) -> str:
    return hashlib.sha256(binding.encode()).hexdigest()


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

    def validate_oidc_claims(self, claims: dict[str, Any]) -> tuple[bool, str | None]:
        expected_iss = self.settings.oidc_issuer
        expected_aud = self.settings.oidc_audience or self.settings.oidc_client_id
        if not claims.get("sub"):
            return False, "missing_sub"
        if not claims.get("role"):
            return False, "missing_role"
        if not claims.get("tenant"):
            return False, "missing_tenant"
        if expected_iss and claims.get("iss") != expected_iss:
            return False, "invalid_iss"
        aud = claims.get("aud")
        if expected_aud:
            if isinstance(aud, str) and aud != expected_aud:
                return False, "invalid_aud"
            if isinstance(aud, list) and expected_aud not in aud:
                return False, "invalid_aud"
        exp = claims.get("exp")
        if not isinstance(exp, (int, float)) or exp <= _now_utc().timestamp():
            return False, "expired"
        allowed_tenants_csv = self.settings.oidc_allowed_tenants_csv
        if allowed_tenants_csv:
            allowed = {s.strip() for s in allowed_tenants_csv.split(",") if s.strip()}
            if claims.get("tenant") not in allowed:
                return False, "tenant_not_allowed"
        return True, None

    def resolve_user_from_oidc_claims(self, claims: dict[str, Any]) -> User | None:
        email = claims.get("email")
        sub = claims.get("sub")
        user = None
        if isinstance(email, str) and email:
            user = self.get_user_by_email(email)
        if user is None and isinstance(sub, str) and sub:
            user = self.get_user_by_username(sub)
        if user is None:
            return None
        if user.status != "active":
            return None
        claim_role = claims.get("role")
        if isinstance(claim_role, str) and claim_role and claim_role != user.role:
            return None
        return user

    def _resolve_oidc_endpoints(self) -> tuple[str, str, str]:
        issuer = (self.settings.oidc_issuer or "").rstrip("/")
        authz = self.settings.oidc_authorization_endpoint or f"{issuer}/authorize"
        token = self.settings.oidc_token_endpoint or f"{issuer}/token"
        jwks = self.settings.oidc_jwks_uri or f"{issuer}/jwks"
        return authz, token, jwks

    def get_oidc_allowed_algorithms(self) -> set[str]:
        configured = (self.settings.oidc_allowed_algs_csv or "").strip()
        if not configured:
            return {"RS256"}
        return {alg.strip() for alg in configured.split(",") if alg.strip()}

    def get_oidc_runtime_validation_errors(self) -> list[str]:
        if not self.settings.oidc_enabled:
            return []
        errors: list[str] = []
        if not (self.settings.oidc_issuer or "").strip():
            errors.append("missing_oidc_issuer")
        if not (self.settings.oidc_client_id or "").strip():
            errors.append("missing_oidc_client_id")
        if not (self.settings.oidc_redirect_uri or "").strip():
            errors.append("missing_oidc_redirect_uri")
        secret = self.settings.oidc_client_secret
        if secret is None or not secret.get_secret_value().strip():
            errors.append("missing_oidc_client_secret")
        if self.settings.oidc_http_timeout_seconds <= 0:
            errors.append("invalid_oidc_http_timeout_seconds")
        if not self.settings.oidc_fail_closed_strict:
            errors.append("oidc_fail_closed_not_strict")
        return errors

    def ensure_oidc_runtime_ready(self) -> None:
        errors = self.get_oidc_runtime_validation_errors()
        if errors:
            raise OidcRuntimeConfigurationError(errors)

    def get_oidc_runtime_snapshot(self) -> dict[str, Any]:
        errors = self.get_oidc_runtime_validation_errors()
        if not self.settings.oidc_enabled:
            status = "disabled"
        else:
            status = "ok" if not errors else "degraded"
        secret = self.settings.oidc_client_secret
        return {
            "enabled": self.settings.oidc_enabled,
            "status": status,
            "loaded_in_process": True,
            "strict_fail_closed": self.settings.oidc_fail_closed_strict,
            "http_timeout_seconds": self.settings.oidc_http_timeout_seconds,
            "issuer_configured": bool((self.settings.oidc_issuer or "").strip()),
            "client_id_configured": bool((self.settings.oidc_client_id or "").strip()),
            "redirect_uri_configured": bool((self.settings.oidc_redirect_uri or "").strip()),
            "client_secret_configured": bool(secret and secret.get_secret_value().strip()),
            "audience_configured": bool((self.settings.oidc_audience or "").strip()),
            "missing_required": errors,
        }

    def build_oidc_authorization_redirect(self, next_path: str) -> tuple[str, str]:
        authz_endpoint, _, _ = self._resolve_oidc_endpoints()
        state = secrets.token_urlsafe(24)
        nonce = secrets.token_urlsafe(24)
        code_verifier = secrets.token_urlsafe(64)
        state_binding = secrets.token_urlsafe(32)
        code_challenge = _hash_pkce_verifier(code_verifier)
        _pending_oidc_flows[state] = PendingOidcFlow(
            code_verifier=code_verifier,
            nonce=nonce,
            next_path=next_path if next_path.startswith("/") else "/",
            state_binding_hash=_hash_state_binding(state_binding),
            created_at=_now_utc(),
        )
        params = {
            "response_type": "code",
            "client_id": self.settings.oidc_client_id or "",
            "redirect_uri": self.settings.oidc_redirect_uri or "",
            "scope": self.settings.oidc_scope,
            "state": state,
            "nonce": nonce,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        if self.settings.oidc_audience:
            params["audience"] = self.settings.oidc_audience
        return f"{authz_endpoint}?{urlencode(params)}", state_binding

    def consume_oidc_flow(self, state: str, state_binding: str | None) -> tuple[PendingOidcFlow | None, str]:
        if not state_binding:
            return None, "missing_state_binding"
        flow = _pending_oidc_flows.pop(state, None)
        if flow is None:
            return None, "invalid_state"
        if (_now_utc() - flow.created_at).total_seconds() > _OIDC_FLOW_TTL_SECONDS:
            return None, "expired_state"
        if not secrets.compare_digest(flow.state_binding_hash, _hash_state_binding(state_binding)):
            return None, "state_binding_mismatch"
        return flow, "ok"

    async def exchange_oidc_code(self, code: str, code_verifier: str) -> dict[str, Any]:
        _, token_endpoint, _ = self._resolve_oidc_endpoints()
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.settings.oidc_redirect_uri or "",
            "client_id": self.settings.oidc_client_id or "",
            "code_verifier": code_verifier,
        }
        secret = self.settings.oidc_client_secret
        if secret:
            data["client_secret"] = secret.get_secret_value()
        async with httpx.AsyncClient(timeout=self.settings.oidc_http_timeout_seconds) as client:
            try:
                response = await client.post(token_endpoint, data=data)
            except httpx.HTTPError as exc:
                raise OidcDependencyUnavailableError("oidc_token_exchange_unavailable") from exc
            if response.status_code >= 500:
                raise OidcDependencyUnavailableError("oidc_token_exchange_unavailable")
            response.raise_for_status()
            return response.json()

    async def _get_jwks(self) -> dict[str, Any]:
        now = _now_utc()
        if _jwks_cache["keys"] and _jwks_cache["expires_at"] > now:
            return _jwks_cache["keys"]
        _, _, jwks_uri = self._resolve_oidc_endpoints()
        async with httpx.AsyncClient(timeout=self.settings.oidc_http_timeout_seconds) as client:
            try:
                response = await client.get(jwks_uri)
            except httpx.HTTPError as exc:
                raise OidcDependencyUnavailableError("oidc_jwks_unavailable") from exc
            if response.status_code >= 500:
                raise OidcDependencyUnavailableError("oidc_jwks_unavailable")
            response.raise_for_status()
            data = response.json()
        _jwks_cache["keys"] = data
        _jwks_cache["expires_at"] = now + timedelta(minutes=10)
        return data

    async def decode_and_validate_oidc_id_token(self, id_token: str, nonce: str) -> dict[str, Any]:
        jwks = await self._get_jwks()
        header = jwt.get_unverified_header(id_token)
        alg = header.get("alg")
        if not isinstance(alg, str) or alg not in self.get_oidc_allowed_algorithms():
            raise JWTError("invalid_alg")
        kid = header.get("kid")
        if not isinstance(kid, str) or not kid.strip():
            raise JWTError("missing_kid")
        matching_keys = [key for key in jwks.get("keys", []) if key.get("kid") == kid]
        if len(matching_keys) != 1:
            raise JWTError("jwks_key_not_found")
        key_data = matching_keys[0]
        if alg.startswith("RS") and key_data.get("kty") != "RSA":
            raise JWTError("invalid_jwk_type")
        claims = jwt.decode(
            id_token,
            key_data,
            algorithms=[alg],
            audience=self.settings.oidc_audience or self.settings.oidc_client_id,
            issuer=self.settings.oidc_issuer,
            options={"verify_at_hash": False},
        )
        if claims.get("nonce") != nonce:
            raise JWTError("invalid_nonce")
        ok, reason = self.validate_oidc_claims(claims)
        if not ok:
            raise JWTError(reason or "invalid_claims")
        return claims

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

    def trigger_oidc_federated_logout(
        self,
        *,
        request_id: str,
        post_logout_redirect_uri: str | None = None,
        logout_hint: str | None = None,
    ) -> bool:
        endpoint = self.settings.oidc_end_session_endpoint
        if not self.settings.oidc_enabled or not endpoint:
            return False
        params: dict[str, str] = {}
        if self.settings.oidc_client_id:
            params["client_id"] = self.settings.oidc_client_id
        if post_logout_redirect_uri:
            params["post_logout_redirect_uri"] = post_logout_redirect_uri
        if logout_hint:
            params["logout_hint"] = logout_hint
        try:
            with httpx.Client(timeout=self.settings.oidc_http_timeout_seconds, follow_redirects=False) as client:
                response = client.get(endpoint, params=params or None)
            if response.status_code >= 400:
                raise RuntimeError(f"oidc_end_session_http_{response.status_code}")
            return True
        except Exception:
            logger.warning(
                json.dumps(
                    {
                        "event": "OIDC_FEDERATED_LOGOUT_FAILED",
                        "request_id": request_id,
                    },
                    ensure_ascii=True,
                )
            )
            return False

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
