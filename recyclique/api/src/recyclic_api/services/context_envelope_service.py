"""
Agrégation serveur du ContextEnvelope minimal (Story 2.2).
Toujours relire l'utilisateur et les entités d'exploitation en base — pas de vérité dérivée du client.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple

from sqlalchemy import desc, inspect, select
from sqlalchemy.orm import Session, noload

from recyclic_api.core.auth import get_user_permissions
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.poste_reception import PosteReception, PosteReceptionStatus
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.context_envelope import (
    ContextEnvelopeResponse,
    ContextRuntimeState,
    ExploitationContextIdsOut,
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _evaluate_runtime(
    user: User,
    cash_session: Optional[CashSession],
) -> Tuple[ContextRuntimeState, Optional[str]]:
    """Détermine ok / degraded / forbidden et un message explicite si besoin."""
    if user.status == UserStatus.REJECTED:
        return ContextRuntimeState.forbidden, "Compte refusé — exploitation interdite"

    msg: Optional[str] = None
    state = ContextRuntimeState.ok

    if user.status != UserStatus.ACTIVE:
        state = ContextRuntimeState.degraded
        msg = "Compte non actif — exploitation limitée jusqu'à activation"

    site_id_val = user.site_id
    if site_id_val is None:
        state = ContextRuntimeState.degraded
        msg = msg or "Aucun site d'exploitation affecté — sélection ou affectation requise"

    if cash_session is not None and site_id_val is not None:
        if cash_session.site_id != site_id_val:
            state = ContextRuntimeState.degraded
            msg = "Session de caisse ouverte sur un autre site que l'affectation courante — recalcul de contexte requis"

    return state, msg


def build_context_envelope(db: Session, user_id: uuid.UUID) -> ContextEnvelopeResponse:
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if user is None:
        return ContextEnvelopeResponse(
            runtime_state=ContextRuntimeState.forbidden,
            context=None,
            permission_keys=[],
            computed_at=_utc_now(),
            restriction_message="Utilisateur introuvable",
        )

    if user.status == UserStatus.REJECTED:
        return ContextEnvelopeResponse(
            runtime_state=ContextRuntimeState.forbidden,
            context=None,
            permission_keys=[],
            computed_at=_utc_now(),
            restriction_message="Compte refusé — exploitation interdite",
        )

    # noload(register) : évite le JOIN lazy="joined" vers cash_registers (tables pilotes SQLite incomplètes).
    cash_session = db.execute(
        select(CashSession)
        .options(noload(CashSession.register))
        .where(
            CashSession.operator_id == user_id,
            CashSession.status == CashSessionStatus.OPEN,
        )
        .order_by(desc(CashSession.opened_at))
        .limit(1)
    ).scalar_one_or_none()

    poste = None
    bind = db.get_bind()
    if bind is not None and inspect(bind).has_table(PosteReception.__tablename__):
        poste = db.execute(
            select(PosteReception)
            .where(
                PosteReception.opened_by_user_id == user_id,
                PosteReception.status == PosteReceptionStatus.OPENED.value,
                PosteReception.closed_at.is_(None),
            )
            .order_by(desc(PosteReception.opened_at))
            .limit(1)
        ).scalar_one_or_none()

    runtime_state, restriction_message = _evaluate_runtime(user, cash_session)

    site_id_val = user.site_id
    cash_register_id = cash_session.register_id if cash_session else None
    cash_session_id = cash_session.id if cash_session else None
    reception_post_id = poste.id if poste else None

    ctx = ExploitationContextIdsOut(
        site_id=str(site_id_val) if site_id_val else None,
        cash_register_id=str(cash_register_id) if cash_register_id else None,
        cash_session_id=str(cash_session_id) if cash_session_id else None,
        reception_post_id=str(reception_post_id) if reception_post_id else None,
    )

    permission_keys = list(get_user_permissions(user, db))
    # Epic 5 / CREOS — hub transverse admin : clé UI attendue par les manifests (non forcément en table permissions).
    if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        permission_keys.append("transverse.admin.view")
    # Story 6.8 — clé UI pour correction vente : émise uniquement pour SUPER_ADMIN (pas dans la table permissions).
    if user.role == UserRole.SUPER_ADMIN:
        permission_keys.append("caisse.sale_correct")
    permission_keys = sorted(set(permission_keys))

    return ContextEnvelopeResponse(
        runtime_state=runtime_state,
        context=ctx,
        permission_keys=permission_keys,
        computed_at=_utc_now(),
        restriction_message=restriction_message,
    )
