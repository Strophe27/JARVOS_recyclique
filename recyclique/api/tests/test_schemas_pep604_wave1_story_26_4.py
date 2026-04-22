"""Story 26.4 — smoke Pydantic sur la vague 1 PEP 604 (schémas uniquement, pas de logique métier)."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from recyclic_api.models.email_log import EmailStatus, EmailType
from recyclic_api.schemas.category import CategoryCreate, CategoryUpdate
from recyclic_api.schemas.context_envelope import (
    ContextEnvelopeResponse,
    ContextRuntimeState,
    ExploitationContextIdsOut,
)
from recyclic_api.schemas.email_log import EmailLogFilters, EmailLogResponse


def test_category_schemas_accept_explicit_none_pep604():
    create = CategoryCreate(
        name="x",
        official_name=None,
        parent_id=None,
        price=None,
        max_price=None,
        shortcut_key=None,
    )
    assert create.name == "x"
    assert create.official_name is None
    assert create.parent_id is None

    upd = CategoryUpdate(
        name=None,
        official_name=None,
        is_active=None,
        parent_id=None,
        price=None,
        max_price=None,
        display_order=None,
        display_order_entry=None,
        is_visible=None,
        shortcut_key=None,
    )
    d = upd.model_dump()
    assert d["name"] is d["official_name"] is d["is_active"] is None
    assert d["parent_id"] is d["shortcut_key"] is None


def test_context_envelope_optional_nested_and_fields_none():
    now = datetime.now(timezone.utc)
    env = ContextEnvelopeResponse(
        runtime_state=ContextRuntimeState.ok,
        context=None,
        permission_keys=[],
        computed_at=now,
        restriction_message=None,
        presentation_labels=None,
    )
    assert env.context is None
    assert env.restriction_message is None
    assert env.presentation_labels is None

    env2 = ContextEnvelopeResponse(
        runtime_state=ContextRuntimeState.degraded,
        context=ExploitationContextIdsOut(
            site_id=None,
            cash_register_id=None,
            cash_session_id=None,
            reception_post_id=None,
        ),
        computed_at=now,
    )
    assert env2.context is not None
    assert env2.context.site_id is None


def test_email_log_schemas_optional_filters_and_response():
    flt = EmailLogFilters(
        recipient_email=None,
        status=None,
        email_type=None,
        user_id=None,
    )
    assert flt.page == 1
    assert flt.recipient_email is None

    uid = uuid4()
    now = datetime.now(timezone.utc)
    row = EmailLogResponse(
        recipient_email="a@b.c",
        recipient_name=None,
        subject="s",
        body_text=None,
        body_html=None,
        email_type=EmailType.WELCOME,
        status=EmailStatus.PENDING,
        external_id=None,
        error_message=None,
        sent_at=None,
        delivered_at=None,
        opened_at=None,
        clicked_at=None,
        bounced_at=None,
        created_at=now,
        updated_at=now,
        user_id=None,
        additional_data=None,
        id=uid,
    )
    assert row.recipient_name is None
    assert row.user_id is None
