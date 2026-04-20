"""Epic 25 / Story 2.5 — corrélation HTTP (X-Request-Id).

La suite SQLite de test n'inclut pas ``audit_logs`` (voir ``conftest._sqlite_skip_audit_log_commit``) :
le masquage et l'échec de persistance audit restent couverts par ``test_audit_story_25.py``.
"""

from __future__ import annotations

import uuid


def test_x_request_id_echoed_when_client_sends_value(client):
    """Le middleware réutilise l'en-tête client et le renvoie sur la réponse."""
    rid = "trace-story-25-abc"
    response = client.get("/", headers={"X-Request-Id": rid})
    assert response.status_code == 200
    assert response.headers.get("X-Request-Id") == rid


def test_x_request_id_trimmed(client):
    response = client.get("/", headers={"X-Request-Id": "  trimmed-id  "})
    assert response.status_code == 200
    assert response.headers.get("X-Request-Id") == "trimmed-id"


def test_x_request_id_generated_as_uuid_when_absent(client):
    response = client.get("/")
    assert response.status_code == 200
    hdr = response.headers.get("X-Request-Id")
    assert hdr
    uuid.UUID(hdr)


def test_x_request_id_generated_when_empty_or_whitespace_only(client):
    for bad in ("", "   ", "\t"):
        response = client.get("/", headers={"X-Request-Id": bad})
        assert response.status_code == 200
        hdr = response.headers.get("X-Request-Id")
        assert hdr
        uuid.UUID(hdr)
