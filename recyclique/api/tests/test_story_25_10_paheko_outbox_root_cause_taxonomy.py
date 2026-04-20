"""Story 25.10 — taxonomie canonique root-cause mapping vs builder vs outbox_http."""

from __future__ import annotations

from types import SimpleNamespace

from recyclic_api.schemas.paheko_outbox import derive_root_cause_for_outbox_item


def _row(**kwargs):
    return SimpleNamespace(**kwargs)


def _transition(name: str):
    return SimpleNamespace(transition_name=name)


def test_root_cause_mapping_has_priority_over_http_status() -> None:
    row = _row(
        payload={},
        mapping_resolution_error="mapping_missing",
        last_http_status=500,
    )
    domain, code, msg = derive_root_cause_for_outbox_item(row, recent_sync_transitions=None)
    assert domain == "mapping"
    assert code == "mapping_missing"
    assert msg is None


def test_root_cause_mapping_from_preparation_trace_with_message() -> None:
    row = _row(
        payload={
            "preparation_trace_v1": {
                "failure_domain": "mapping",
                "code": "mapping_missing",
                "message": "Résolution mapping Paheko impossible.",
            }
        },
        mapping_resolution_error="mapping_missing",
        last_http_status=500,
    )
    domain, code, msg = derive_root_cause_for_outbox_item(row)
    assert domain == "mapping"
    assert code == "mapping_missing"
    assert msg and "mapping" in msg.lower()


def test_root_cause_builder_from_preparation_trace() -> None:
    row = _row(
        payload={
            "preparation_trace_v1": {
                "failure_domain": "builder",
                "code": "batch_build_failed",
                "message": "échec construction payload (test)",
            }
        },
        mapping_resolution_error=None,
        last_http_status=None,
    )
    domain, code, msg = derive_root_cause_for_outbox_item(row, recent_sync_transitions=None)
    assert domain == "builder"
    assert code == "batch_build_failed"
    assert msg == "échec construction payload (test)"


def test_root_cause_outbox_http_from_http_status() -> None:
    row = _row(
        payload={},
        mapping_resolution_error=None,
        last_http_status=403,
    )
    domain, code, msg = derive_root_cause_for_outbox_item(row, recent_sync_transitions=None)
    assert domain == "outbox_http"
    assert code == "http_403"
    assert msg is None


def test_root_cause_outbox_http_from_max_attempts_transition_only() -> None:
    row = _row(payload={}, mapping_resolution_error=None, last_http_status=None)
    recent = [_transition("auto_quarantine_max_attempts_exceeded")]
    domain, code, msg = derive_root_cause_for_outbox_item(row, recent_sync_transitions=recent)
    assert domain == "outbox_http"
    assert code == "auto_quarantine_max_attempts_exceeded"
    assert msg is None


def test_root_cause_mapping_detected_when_transition_present_but_not_latest() -> None:
    """
    La spec de story 25.10 parle de transition « présente dans l'audit récent »,
    pas uniquement la transition la plus récente.
    """
    row = _row(payload={}, mapping_resolution_error=None, last_http_status=None)
    recent = [
        _transition("manual_lift_quarantine_to_retry"),
        _transition("auto_quarantine_mapping_resolution"),
    ]
    domain, code, msg = derive_root_cause_for_outbox_item(row, recent_sync_transitions=recent)
    assert domain == "mapping"
    assert code == "unknown"
    assert msg is None
