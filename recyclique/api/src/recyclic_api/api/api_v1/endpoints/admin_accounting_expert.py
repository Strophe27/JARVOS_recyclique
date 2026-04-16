"""Story 22.3 — routes super-admin pour paramétrage comptable expert (step-up + audit)."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from recyclic_api.core.audit import log_system_action
from recyclic_api.core.auth import require_super_admin_role
from recyclic_api.core.database import get_db
from recyclic_api.core.redis import get_redis
from recyclic_api.core.step_up import (
    SENSITIVE_OPERATION_ACCOUNTING_EXPERT,
    STEP_UP_PIN_HEADER,
    verify_step_up_pin_header,
)
from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.models.accounting_config import AccountingConfigRevision
from recyclic_api.models.audit_log import AuditActionType
from recyclic_api.models.user import User
from recyclic_api.schemas.accounting_expert import (
    AccountingRevisionDetail,
    AccountingRevisionSummary,
    GlobalAccountsPayload,
    GlobalAccountsResponse,
    PaymentMethodCreate,
    PaymentMethodExpertResponse,
    PaymentMethodOpenSessionUsageResponse,
    PaymentMethodUpdate,
    PublishAccountingRevisionBody,
)
from recyclic_api.schemas.accounting_dual_read import DualReadCompareReport
from recyclic_api.services.accounting_expert_service import AccountingExpertService
from recyclic_api.services.cash_session_dual_read_service import build_dual_read_compare_report
from recyclic_api.utils.domain_exception_http import raise_domain_exception_as_http

router = APIRouter()
logger = logging.getLogger(__name__)

def _revision_snapshot_dict(rev: AccountingConfigRevision) -> dict[str, Any]:
    raw = rev.snapshot_json
    if isinstance(raw, dict):
        return raw
    if raw in (None, ""):
        return {}
    try:
        parsed = json.loads(str(raw))
    except json.JSONDecodeError as exc:
        raise ValidationError("Snapshot révision JSON illisible") from exc
    if not isinstance(parsed, dict):
        raise ValidationError("Snapshot révision invalide (JSON non-objet)")
    return parsed


_DOMAIN = {
    "not_found_status": 404,
    "conflict_status": 409,
    "validation_status": 422,
}


def _audit(
    *,
    request: Request,
    db: Session,
    current_user: User,
    action: AuditActionType,
    target_id: Optional[UUID],
    target_type: str,
    details: dict,
) -> None:
    _ip = request.client.host if request.client else None
    _ua = request.headers.get("user-agent")
    log_system_action(
        action_type=action,
        actor=current_user,
        target_type=target_type,
        target_id=target_id,
        details=details,
        db=db,
        ip_address=_ip,
        user_agent=_ua,
    )
    logger.info(
        "accounting_expert_audit action=%s actor_id=%s target_id=%s",
        getattr(action, "value", action),
        current_user.id,
        target_id,
    )


def _require_step_up(request: Request, current_user: User, redis_client) -> None:
    verify_step_up_pin_header(
        user=current_user,
        pin_header_value=request.headers.get(STEP_UP_PIN_HEADER),
        redis_client=redis_client,
        operation=SENSITIVE_OPERATION_ACCOUNTING_EXPERT,
    )


@router.get(
    "/global-accounts",
    response_model=GlobalAccountsResponse,
    summary="Lire les comptes globaux (paramétrage expert)",
    operation_id="accountingExpertGetGlobalAccounts",
)
async def get_global_accounts(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin_role()),
):
    row = AccountingExpertService(db).get_global_accounts()
    return GlobalAccountsResponse(
        default_sales_account=row.default_sales_account,
        default_donation_account=row.default_donation_account,
        prior_year_refund_account=row.prior_year_refund_account,
        cash_journal_code=(row.cash_journal_code or "").strip() if getattr(row, "cash_journal_code", None) else "",
        default_entry_label_prefix=str(getattr(row, "default_entry_label_prefix", None) or "Z caisse").strip()
        or "Z caisse",
        updated_at=row.updated_at,
    )


@router.patch(
    "/global-accounts",
    response_model=GlobalAccountsResponse,
    summary="Mettre à jour les comptes globaux (step-up requis)",
    operation_id="accountingExpertPatchGlobalAccounts",
)
async def patch_global_accounts(
    request: Request,
    payload: GlobalAccountsPayload,
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    current_user: User = Depends(require_super_admin_role()),
):
    _require_step_up(request, current_user, redis_client)
    try:
        row = AccountingExpertService(db).update_global_accounts(
            default_sales_account=payload.default_sales_account,
            default_donation_account=payload.default_donation_account,
            prior_year_refund_account=payload.prior_year_refund_account,
            cash_journal_code=payload.cash_journal_code,
            default_entry_label_prefix=payload.default_entry_label_prefix,
        )
    except ValidationError as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    _audit(
        request=request,
        db=db,
        current_user=current_user,
        action=AuditActionType.ACCOUNTING_GLOBAL_SETTINGS_UPDATED,
        target_id=row.id,
        target_type="global_accounting_settings",
        details={"accounts": payload.model_dump()},
    )
    return GlobalAccountsResponse(
        default_sales_account=row.default_sales_account,
        default_donation_account=row.default_donation_account,
        prior_year_refund_account=row.prior_year_refund_account,
        cash_journal_code=(row.cash_journal_code or "").strip() if getattr(row, "cash_journal_code", None) else "",
        default_entry_label_prefix=str(getattr(row, "default_entry_label_prefix", None) or "Z caisse").strip()
        or "Z caisse",
        updated_at=row.updated_at,
    )


@router.get(
    "/payment-methods/{payment_method_id}/open-session-usage",
    response_model=PaymentMethodOpenSessionUsageResponse,
    summary="Session ouverte : usage du moyen de paiement (lecture, pas de step-up)",
    operation_id="accountingExpertGetPaymentMethodOpenSessionUsage",
)
async def payment_method_open_session_usage(
    payment_method_id: UUID,
    site_id: Optional[UUID] = Query(
        None,
        description="Si fourni, ne considère que les sessions ouvertes de ce site (alignement contexte caisse).",
    ),
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin_role()),
):
    svc = AccountingExpertService(db)
    try:
        used = svc.is_payment_method_used_in_open_session(payment_method_id, site_id=site_id)
    except NotFoundError as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    return PaymentMethodOpenSessionUsageResponse(used_in_open_session=used)


@router.get(
    "/payment-methods",
    response_model=list[PaymentMethodExpertResponse],
    summary="Lister les moyens de paiement (référentiel expert)",
    operation_id="accountingExpertListPaymentMethods",
)
async def list_payment_methods(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin_role()),
):
    rows = AccountingExpertService(db).list_payment_methods()
    return [PaymentMethodExpertResponse.model_validate(r) for r in rows]


@router.post(
    "/payment-methods",
    response_model=PaymentMethodExpertResponse,
    status_code=201,
    summary="Créer un moyen de paiement (step-up requis)",
    operation_id="accountingExpertCreatePaymentMethod",
)
async def create_payment_method(
    request: Request,
    payload: PaymentMethodCreate,
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    current_user: User = Depends(require_super_admin_role()),
):
    _require_step_up(request, current_user, redis_client)
    svc = AccountingExpertService(db)
    try:
        pm = svc.create_payment_method(
            code=payload.code,
            label=payload.label,
            kind=payload.kind,
            paheko_debit_account=payload.paheko_debit_account,
            paheko_refund_credit_account=payload.paheko_refund_credit_account,
            min_amount=payload.min_amount,
            max_amount=payload.max_amount,
            display_order=payload.display_order,
            notes=payload.notes,
            active=payload.active,
        )
    except (ValidationError, ConflictError) as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    _audit(
        request=request,
        db=db,
        current_user=current_user,
        action=AuditActionType.ACCOUNTING_PAYMENT_METHOD_CHANGED,
        target_id=pm.id,
        target_type="payment_method",
        details={"operation": "create", "code": pm.code},
    )
    return PaymentMethodExpertResponse.model_validate(pm)


@router.patch(
    "/payment-methods/{payment_method_id}",
    response_model=PaymentMethodExpertResponse,
    summary="Modifier un moyen de paiement (step-up requis)",
    operation_id="accountingExpertPatchPaymentMethod",
)
async def patch_payment_method(
    request: Request,
    payment_method_id: UUID,
    payload: PaymentMethodUpdate,
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    current_user: User = Depends(require_super_admin_role()),
):
    _require_step_up(request, current_user, redis_client)
    svc = AccountingExpertService(db)
    data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    try:
        pm = svc.update_payment_method(payment_method_id, data)
    except NotFoundError as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    except (ValidationError, ConflictError) as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    _audit(
        request=request,
        db=db,
        current_user=current_user,
        action=AuditActionType.ACCOUNTING_PAYMENT_METHOD_CHANGED,
        target_id=pm.id,
        target_type="payment_method",
        details={"operation": "update", "fields": list(data.keys())},
    )
    return PaymentMethodExpertResponse.model_validate(pm)


@router.post(
    "/payment-methods/{payment_method_id}/active",
    response_model=PaymentMethodExpertResponse,
    summary="Activer ou désactiver un moyen de paiement (step-up requis)",
    operation_id="accountingExpertSetPaymentMethodActive",
)
async def set_payment_method_active(
    request: Request,
    payment_method_id: UUID,
    active: bool = Query(..., description="true = actif, false = inactif"),
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    current_user: User = Depends(require_super_admin_role()),
):
    _require_step_up(request, current_user, redis_client)
    svc = AccountingExpertService(db)
    try:
        pm = svc.set_active(payment_method_id, active)
    except NotFoundError as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    except ConflictError as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    _audit(
        request=request,
        db=db,
        current_user=current_user,
        action=AuditActionType.ACCOUNTING_PAYMENT_METHOD_CHANGED,
        target_id=pm.id,
        target_type="payment_method",
        details={"operation": "set_active", "active": active},
    )
    return PaymentMethodExpertResponse.model_validate(pm)


@router.post(
    "/revisions/publish",
    response_model=AccountingRevisionDetail,
    summary="Publier une révision comptable (snapshot stable, step-up requis)",
    operation_id="accountingExpertPublishRevision",
)
async def publish_revision(
    request: Request,
    body: PublishAccountingRevisionBody,
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
    current_user: User = Depends(require_super_admin_role()),
):
    _require_step_up(request, current_user, redis_client)
    svc = AccountingExpertService(db)
    try:
        rev = svc.publish_revision(actor_user_id=current_user.id, note=body.note)
    except ValidationError as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    except ConflictError as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    _audit(
        request=request,
        db=db,
        current_user=current_user,
        action=AuditActionType.ACCOUNTING_CONFIG_PUBLISHED,
        target_id=rev.id,
        target_type="accounting_config_revision",
        details={"revision_seq": rev.revision_seq},
    )
    try:
        snap = _revision_snapshot_dict(rev)
    except ValidationError as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    return AccountingRevisionDetail(
        id=rev.id,
        revision_seq=rev.revision_seq,
        published_at=rev.published_at,
        actor_user_id=rev.actor_user_id,
        note=rev.note,
        snapshot=snap,
    )


@router.get(
    "/revisions",
    response_model=list[AccountingRevisionSummary],
    summary="Historique des révisions publiées",
    operation_id="accountingExpertListRevisions",
)
async def list_revisions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin_role()),
):
    rows = AccountingExpertService(db).list_revisions(skip=skip, limit=limit)
    return [
        AccountingRevisionSummary(
            id=r.id,
            revision_seq=r.revision_seq,
            published_at=r.published_at,
            actor_user_id=r.actor_user_id,
            note=r.note,
        )
        for r in rows
    ]


@router.get(
    "/revisions/latest",
    response_model=AccountingRevisionDetail,
    summary="Dernière révision publiée",
    operation_id="accountingExpertGetLatestRevision",
)
async def get_latest_revision(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin_role()),
):
    r = AccountingExpertService(db).get_latest_revision()
    if r is None:
        raise_domain_exception_as_http(
            NotFoundError("Aucune révision comptable publiée"),
            **_DOMAIN,
        )
    try:
        snap = _revision_snapshot_dict(r)
    except ValidationError as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    return AccountingRevisionDetail(
        id=r.id,
        revision_seq=r.revision_seq,
        published_at=r.published_at,
        actor_user_id=r.actor_user_id,
        note=r.note,
        snapshot=snap,
    )


@router.get(
    "/revisions/{revision_id}",
    response_model=AccountingRevisionDetail,
    summary="Détail d'une révision (snapshot immuable)",
    operation_id="accountingExpertGetRevision",
)
async def get_revision(
    revision_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin_role()),
):
    try:
        r = AccountingExpertService(db).get_revision(revision_id)
    except NotFoundError as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    try:
        snap = _revision_snapshot_dict(r)
    except ValidationError as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
    return AccountingRevisionDetail(
        id=r.id,
        revision_seq=r.revision_seq,
        published_at=r.published_at,
        actor_user_id=r.actor_user_id,
        note=r.note,
        snapshot=snap,
    )


@router.get(
    "/cash-sessions/{cash_session_id}/dual-read-compare",
    response_model=DualReadCompareReport,
    summary="Double lecture legacy vs journal canonique (22.2)",
    operation_id="accountingExpertDualReadCompare",
)
async def dual_read_compare(
    cash_session_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin_role()),
):
    """Story 22.2 — comparatif structuré pour pilotage cutover ; ne supprime pas le legacy."""
    try:
        return build_dual_read_compare_report(db, cash_session_id)
    except NotFoundError as e:
        raise_domain_exception_as_http(e, **_DOMAIN)
