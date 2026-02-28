import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any

import httpx

from api.config import get_settings


class PahekoClientError(RuntimeError):
    pass


@dataclass
class PahekoMembersPage:
    items: list[dict[str, Any]]
    next_cursor: str | None = None


class PahekoClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _require_config(self) -> tuple[str, str]:
        base_url = (self.settings.paheko_api_base_url or "").strip()
        token = self.settings.paheko_api_token.get_secret_value() if self.settings.paheko_api_token else ""
        if not base_url or not token:
            raise PahekoClientError("paheko_api_not_configured")
        return base_url.rstrip("/"), token

    def _resolve_retry_delay(self, response: httpx.Response, default_delay: float) -> float:
        retry_after = response.headers.get("Retry-After")
        if not retry_after:
            return default_delay
        retry_after = retry_after.strip()
        if not retry_after:
            return default_delay
        try:
            return max(float(retry_after), 0.0)
        except ValueError:
            pass
        try:
            parsed = parsedate_to_datetime(retry_after)
        except (TypeError, ValueError):
            return default_delay
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        delta = (parsed - datetime.now(timezone.utc)).total_seconds()
        return max(delta, 0.0)

    def _request_with_retries(
        self,
        *,
        method: str,
        url: str,
        headers: dict[str, str],
        params: dict[str, Any],
    ) -> httpx.Response:
        retries = max(1, self.settings.paheko_members_max_retries)
        delay = max(0.0, self.settings.paheko_members_backoff_seconds)
        factor = max(1.0, self.settings.paheko_members_backoff_factor)
        retryable_statuses = {408, 429, 500, 502, 503, 504}
        last_error: Exception | None = None
        for attempt in range(1, retries + 1):
            try:
                with httpx.Client(timeout=30.0) as client:
                    response = client.request(method, url, headers=headers, params=params)
                if response.status_code in retryable_statuses and attempt < retries:
                    time.sleep(self._resolve_retry_delay(response, delay))
                    delay = delay * factor
                    continue
                return response
            except httpx.HTTPError as exc:
                last_error = exc
                if attempt < retries:
                    time.sleep(delay)
                    delay = delay * factor
                    continue
                break
        raise PahekoClientError(str(last_error.__class__.__name__ if last_error else "request_failed"))

    def fetch_members_page(
        self,
        *,
        cursor: str | None = None,
        updated_after: datetime | None = None,
    ) -> PahekoMembersPage:
        base_url, token = self._require_config()
        endpoint = self.settings.paheko_members_endpoint or "/api/members"
        url = f"{base_url}/{endpoint.lstrip('/')}"
        params: dict[str, Any] = {"limit": self.settings.paheko_members_page_size}
        if cursor:
            params["cursor"] = cursor
        if updated_after is not None:
            if updated_after.tzinfo is None:
                updated_after = updated_after.replace(tzinfo=timezone.utc)
            params["updated_after"] = updated_after.isoformat()
        response = self._request_with_retries(
            method="GET",
            url=url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            params=params,
        )
        if response.status_code >= 400:
            raise PahekoClientError(f"http_{response.status_code}")
        payload = response.json()
        if isinstance(payload, list):
            return PahekoMembersPage(items=[x for x in payload if isinstance(x, dict)], next_cursor=None)
        if not isinstance(payload, dict):
            raise PahekoClientError("invalid_payload")
        raw_items = payload.get("items")
        if raw_items is None:
            raw_items = payload.get("members")
        if raw_items is None:
            raw_items = payload.get("results")
        if not isinstance(raw_items, list):
            raise PahekoClientError("invalid_members_list")
        next_cursor = payload.get("next_cursor")
        if next_cursor is None and isinstance(payload.get("meta"), dict):
            next_cursor = payload["meta"].get("next_cursor")
        if next_cursor is None and isinstance(payload.get("pagination"), dict):
            next_cursor = payload["pagination"].get("next_cursor")
        if next_cursor is not None and not isinstance(next_cursor, str):
            next_cursor = str(next_cursor)
        return PahekoMembersPage(
            items=[x for x in raw_items if isinstance(x, dict)],
            next_cursor=next_cursor,
        )

