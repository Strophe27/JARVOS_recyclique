"""Tests purs sur les helpers d'identité utilisateur (sans DB)."""

import pytest

from recyclic_api.core.user_identity import username_or_telegram_id


@pytest.mark.no_db
@pytest.mark.parametrize(
    "username,telegram_id,expected",
    [
        ("alice", "123", "alice"),
        ("", "tg42", "tg42"),
        (None, "999", "999"),
        (None, None, None),
    ],
)
def test_username_or_telegram_id_matches_or_semantics(username, telegram_id, expected):
    assert username_or_telegram_id(username, telegram_id) == expected
