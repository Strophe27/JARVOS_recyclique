"""Client HTTP minimal vers Paheko — slice comptable (Story 8.1)."""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from typing import Any, Callable

import httpx

from recyclic_api.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PahekoHttpResult:
    http_status: int | None
    response_text: str
    error_message: str | None


class PahekoAccountingClient:
    """POST JSON vers Paheko ; injectable / mockable en test (même contrat d'appel)."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_user: str | None = None,
        api_password: str | None = None,
        token: str | None = None,
        timeout_seconds: float | None = None,
        close_path: str | None = None,
        client_factory: Callable[[], httpx.Client] | None = None,
    ) -> None:
        self._base_url = (base_url if base_url is not None else settings.PAHEKO_API_BASE_URL or "").rstrip("/")
        explicit_legacy_token = token is not None
        # Si un token legacy est injecté explicitement sans couple Basic explicite,
        # on n'importe pas silencieusement les identifiants Basic depuis les settings.
        if explicit_legacy_token and api_user is None and api_password is None:
            self._api_user = None
            self._api_password = None
        else:
            self._api_user = api_user if api_user is not None else settings.PAHEKO_API_USER
            self._api_password = api_password if api_password is not None else settings.PAHEKO_API_PASSWORD
        self._token = token if token is not None else settings.PAHEKO_API_TOKEN
        self._timeout = timeout_seconds if timeout_seconds is not None else settings.PAHEKO_HTTP_TIMEOUT_SECONDS
        self._close_path = close_path if close_path is not None else settings.PAHEKO_ACCOUNTING_CASH_SESSION_CLOSE_PATH
        self._client_factory = client_factory

    def _build_authorization_header(self) -> tuple[str | None, str]:
        """Basic prioritaire (doc Paheko). Bearer reste accepté en compat transitoire."""
        user = (self._api_user or "").strip()
        password = self._api_password or ""
        has_user = bool(user)
        has_password = bool(password)
        if has_user and has_password:
            raw = f"{user}:{password}".encode("utf-8")
            encoded = base64.b64encode(raw).decode("ascii")
            return f"Basic {encoded}", "basic"
        if has_user != has_password:
            logger.warning(
                "paheko_http auth_basic_incomplete base_url=%s user_present=%s password_present=%s",
                self._base_url,
                has_user,
                has_password,
            )
        if self._token:
            return f"Bearer {self._token}", "bearer_legacy"
        return None, "anonymous"

    def post_cash_session_close(
        self,
        payload: dict[str, Any],
        *,
        correlation_id: str,
        idempotency_key: str,
    ) -> PahekoHttpResult:
        if not self._base_url:
            msg = "PAHEKO_API_BASE_URL non configuré — tentative sortante impossible (explicite)."
            logger.warning("paheko_http %s correlation_id=%s", msg, correlation_id)
            return PahekoHttpResult(http_status=None, response_text="", error_message=msg)

        url = f"{self._base_url}{self._close_path}"
        headers = {
            "Content-Type": "application/json",
            "X-Correlation-ID": correlation_id,
            "Idempotency-Key": idempotency_key,
        }
        auth_header, auth_mode = self._build_authorization_header()
        if auth_header:
            headers["Authorization"] = auth_header

        try:
            if self._client_factory:
                client = self._client_factory()
                try:
                    resp = client.post(url, json=payload, headers=headers, timeout=self._timeout)
                finally:
                    client.close()
            else:
                with httpx.Client(timeout=self._timeout) as client:
                    resp = client.post(url, json=payload, headers=headers)
            text = (resp.text or "")[:4000]
            logger.info(
                "paheko_http cash_session_close status=%s correlation_id=%s url=%s auth_mode=%s",
                resp.status_code,
                correlation_id,
                url,
                auth_mode,
            )
            return PahekoHttpResult(http_status=resp.status_code, response_text=text, error_message=None)
        except httpx.RequestError as exc:
            err = f"paheko_request_error: {exc!r}"
            logger.warning(
                "paheko_http correlation_id=%s auth_mode=%s %s",
                correlation_id,
                auth_mode,
                err,
            )
            return PahekoHttpResult(http_status=None, response_text="", error_message=err)
