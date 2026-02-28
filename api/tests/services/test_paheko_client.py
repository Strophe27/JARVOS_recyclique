from types import SimpleNamespace

import httpx

from api.services import paheko_client as paheko_client_module
from api.services.paheko_client import PahekoClient


def _build_test_client() -> PahekoClient:
    client = PahekoClient()
    client.settings = SimpleNamespace(
        paheko_members_max_retries=3,
        paheko_members_backoff_seconds=1.0,
        paheko_members_backoff_factor=2.0,
    )
    return client


def test_request_with_retries_retries_on_429_and_honors_retry_after(monkeypatch) -> None:
    client = _build_test_client()
    responses = [
        httpx.Response(429, headers={"Retry-After": "3"}),
        httpx.Response(200),
    ]

    class FakeClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb) -> None:
            return None

        def request(self, method: str, url: str, headers: dict, params: dict) -> httpx.Response:
            return responses.pop(0)

    sleep_calls: list[float] = []
    monkeypatch.setattr(paheko_client_module.httpx, "Client", FakeClient)
    monkeypatch.setattr(paheko_client_module.time, "sleep", lambda value: sleep_calls.append(value))

    response = client._request_with_retries(
        method="GET",
        url="https://example.test/api/members",
        headers={},
        params={},
    )

    assert response.status_code == 200
    assert sleep_calls == [3.0]


def test_request_with_retries_retries_on_408_with_exponential_backoff(monkeypatch) -> None:
    client = _build_test_client()
    responses = [
        httpx.Response(408),
        httpx.Response(408),
        httpx.Response(200),
    ]

    class FakeClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb) -> None:
            return None

        def request(self, method: str, url: str, headers: dict, params: dict) -> httpx.Response:
            return responses.pop(0)

    sleep_calls: list[float] = []
    monkeypatch.setattr(paheko_client_module.httpx, "Client", FakeClient)
    monkeypatch.setattr(paheko_client_module.time, "sleep", lambda value: sleep_calls.append(value))

    response = client._request_with_retries(
        method="GET",
        url="https://example.test/api/members",
        headers={},
        params={},
    )

    assert response.status_code == 200
    assert sleep_calls == [1.0, 2.0]
