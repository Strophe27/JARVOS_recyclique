"""Tests purs sur les helpers d'identité utilisateur (sans DB)."""

import pytest

from recyclic_api.core.user_identity import username_for_audit


@pytest.mark.no_db
@pytest.mark.parametrize(
    "username,ignored_legacy_contact,expected",
    [
        ("alice", "123", "alice"),
        ("", "ext42", None),
        (None, "999", None),
        (None, None, None),
        ("  bob  ", "x", "bob"),
    ],
)
def test_username_for_audit_username_only_no_legacy_fallback(username, ignored_legacy_contact, expected):
    assert username_for_audit(username, ignored_legacy_contact) == expected
