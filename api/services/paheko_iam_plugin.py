from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse, urlunparse

import httpx

from api.config import get_settings


class PahekoIamPluginDependencyError(RuntimeError):
    pass


class PahekoIamPluginBusinessError(RuntimeError):
    def __init__(self, *, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


@dataclass
class PahekoIamPluginResult:
    data: dict | list
    status_code: int


def _coerce_error_code(status_code: int) -> str:
    if status_code == 400:
        return "bad_request"
    if status_code == 401:
        return "unauthorized"
    if status_code == 403:
        return "forbidden"
    if status_code == 404:
        return "not_found"
    if status_code == 409:
        return "conflict"
    if status_code == 422:
        return "validation_error"
    if status_code == 429:
        return "rate_limited"
    return "plugin_error"


class PahekoIamPluginService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _resolve_base_url(self) -> tuple[str, str]:
        explicit = (getattr(self.settings, "paheko_iam_plugin_url", None) or "").strip()
        if explicit:
            secret = (
                self.settings.paheko_plugin_secret.get_secret_value()
                if self.settings.paheko_plugin_secret
                else ""
            )
            if not secret:
                raise PahekoIamPluginDependencyError("paheko_plugin_secret_missing")
            return explicit.rstrip("/"), secret

        plugin_url = (self.settings.paheko_plugin_url or "").strip()
        secret = (
            self.settings.paheko_plugin_secret.get_secret_value()
            if self.settings.paheko_plugin_secret
            else ""
        )
        if not plugin_url or not secret:
            raise PahekoIamPluginDependencyError("paheko_iam_plugin_not_configured")
        parsed = urlparse(plugin_url)
        origin = urlunparse((parsed.scheme, parsed.netloc, "", "", "", ""))
        return f"{origin.rstrip('/')}/plugin/recyclic/iam/v1", secret

    def request(
        self,
        *,
        method: str,
        path: str,
        request_id: str,
        idempotency_key: str | None = None,
        payload: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> PahekoIamPluginResult:
        base_url, secret = self._resolve_base_url()
        url = f"{base_url}/{path.lstrip('/')}"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Paheko-Secret": secret,
            "X-Request-Id": request_id,
        }
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.request(
                    method,
                    url,
                    headers=headers,
                    json=payload or None,
                    params=params or None,
                )
        except httpx.HTTPError as exc:
            raise PahekoIamPluginDependencyError("paheko_iam_dependency_unavailable") from exc

        if response.status_code >= 500:
            raise PahekoIamPluginDependencyError("paheko_iam_dependency_unavailable")

        if response.status_code >= 400:
            code = _coerce_error_code(response.status_code)
            message = f"plugin_http_{response.status_code}"
            body: Any = None
            try:
                body = response.json()
            except ValueError:
                body = None
            if isinstance(body, dict):
                error = body.get("error")
                if isinstance(error, dict):
                    code = str(error.get("code") or code)
                    message = str(error.get("message") or message)
                elif isinstance(body.get("detail"), str):
                    message = body["detail"]
            raise PahekoIamPluginBusinessError(
                status_code=response.status_code,
                code=code,
                message=message,
            )

        try:
            body = response.json()
        except ValueError:
            body = {"result": "ok"}
        return PahekoIamPluginResult(data=body, status_code=response.status_code)
