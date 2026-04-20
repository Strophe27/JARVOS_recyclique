"""Schémas API lecture outbox Paheko (Story 8.1)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel, ConfigDict, Field, field_validator

from recyclic_api.schemas.exploitation_live_snapshot import SyncStateCore

# Aligné sur ``paheko_close_batch_builder.PAHEKO_CLOSE_BATCH_STATE_KEY`` (Story 22.7).
_PAHEKO_CLOSE_BATCH_STATE_KEY = "paheko_close_batch_state_v1"

RootCauseDomain = Literal["mapping", "builder", "outbox_http"]

_ROOT_CAUSE_DOMAINS_DOC = (
    "Story 25.10 — taxonomie canonique **déterministe** (spec 25.4 §4 ; Epic 8 supervision 8.3–8.6). "
    "Valeurs possibles : `mapping` (préconditions / résolution mapping 8.3), "
    "`builder` (construction payload/batch depuis snapshot), `outbox_http` (transport HTTP Paheko, retries/terminal)."
)


class PahekoCloseBatchSubWritePublic(BaseModel):
    """Story 22.7 — état d'une sous-écriture dans le batch clôture (payload persisté)."""

    model_config = ConfigDict(extra="forbid")

    index: int
    kind: str
    status: str
    idempotency_sub_key: str = Field(description="Clé d'idempotence HTTP distante pour cette sous-écriture.")
    remote_transaction_id: Optional[str] = None
    last_http_status: Optional[int] = None
    last_error: Optional[str] = None
    observability: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Story 23.1 — ventilation : codes moyen, montants, index de ligne, révision ; null si agrégé 22.7.",
    )


class PahekoCloseBatchStatePublic(BaseModel):
    """Story 22.7 — corrélation batch + succès partiel + sous-états."""

    model_config = ConfigDict(extra="forbid")

    schema_version: int = 1
    retry_policy: str
    partial_success: bool
    all_delivered: bool
    sub_writes: List[PahekoCloseBatchSubWritePublic]


class PahekoResolvedTransactionPreview(BaseModel):
    """Résumé lisible de l'écriture Paheko calculée pour une clôture."""

    model_config = ConfigDict(extra="forbid")

    amount: float = Field(description="Montant qui sera transmis à Paheko.")
    debit: str = Field(description="Code du compte de débit utilisé.")
    credit: str = Field(description="Code du compte de crédit utilisé.")
    id_year: int = Field(description="Identifiant d'exercice Paheko utilisé.")
    label: Optional[str] = Field(default=None, description="Libellé généré pour l'écriture.")
    reference: Optional[str] = Field(default=None, description="Référence générée pour l'écriture.")
    body_type: str = Field(
        default="REVENUE",
        description="Story 23.1 — REVENUE (ligne simplifiée) ou ADVANCED (écriture multi-lignes).",
    )
    advanced_line_count: Optional[int] = Field(
        default=None,
        description="Story 23.1 — nombre de lignes Paheko si body_type=ADVANCED.",
    )


class PahekoOutboxItemPublic(BaseModel):
    """Vue admin / support — distingue persistance locale vs cycle outbox vs erreur distante."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: str
    operation_type: str
    idempotency_key: str
    cash_session_id: Optional[str] = None
    site_id: Optional[str] = None

    outbox_status: str = Field(
        description="Cycle technique : pending, processing, delivered, failed (distinct de sync_state_core)."
    )
    sync_state_core: SyncStateCore

    local_session_persisted: bool = Field(
        default=True,
        description="True : clôture locale enregistrée (présence de la ligne outbox liée à une session clôturée). "
        "Ne signifie pas « sync Paheko OK ».",
    )
    remote_attempt_count: int = 0
    last_remote_http_status: Optional[int] = Field(
        default=None,
        description="Statut HTTP de la dernière tentative Paheko ; null si aucune tentative réseau (ex. non configuré).",
    )
    last_error: Optional[str] = None
    next_retry_at: Optional[datetime] = Field(
        default=None,
        description="Prochain créneau éligible pour une tentative HTTP (backoff 8.2) ; null si immédiat ou N/A.",
    )
    rejection_reason: Optional[str] = Field(
        default=None,
        description="Renseigné si sync_state_core=rejete (décision explicite abandon / non-poussée Paheko).",
    )
    mapping_resolution_error: Optional[str] = Field(
        default=None,
        description=(
            "Story 8.3 — échec **avant** tout POST Paheko : résolution mapping (ex. mapping_missing, "
            "mapping_disabled, session_not_found). Distinct des erreurs HTTP Paheko (`last_remote_http_status`)."
        ),
    )
    root_cause_domain: RootCauseDomain = Field(
        description=(
            f"{_ROOT_CAUSE_DOMAINS_DOC} "
            "Règles : mapping > builder > outbox_http, sans heuristique floue (pas de parsing `last_error`)."
        )
    )
    root_cause_code: str = Field(
        min_length=1,
        description=(
            "Story 25.10 — code stable de la cause racine, dérivé sans heuristique. "
            "Exemples : `mapping_missing`, `batch_build_failed`, `http_403`."
        ),
    )
    root_cause_message: Optional[str] = Field(
        default=None,
        description=(
            "Story 25.10 — message de contexte **stable** quand disponible (ex. `payload.preparation_trace_v1.message`). "
            "Null si non applicable (ex. échecs purement HTTP)."
        ),
    )

    correlation_id: str
    created_at: datetime
    updated_at: datetime
    transaction_preview: Optional[PahekoResolvedTransactionPreview] = Field(
        default=None,
        description=(
            "Résumé calculé de l'écriture comptable Paheko (montant + comptes) quand la résolution mapping est possible."
        ),
    )
    close_batch_state: Optional[PahekoCloseBatchStatePublic] = Field(
        default=None,
        description="Story 22.7 — suivi batch multi-sous-écritures (snapshot figé) lorsque présent sur la ligne.",
    )


class PahekoOutboxSyncTransitionPublic(BaseModel):
    """Entrée d'audit append-only (Story 8.4, contrat §6)."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: str
    transition_name: str
    from_sync_state: SyncStateCore
    to_sync_state: SyncStateCore
    from_outbox_status: str
    to_outbox_status: str
    actor_user_id: Optional[str] = None
    occurred_at: datetime
    reason: str
    correlation_id: str
    context_json: Dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Story 8.4 — instantané minimal au moment de la transition (opération, erreurs mapping/HTTP). "
            "La taxonomie `root_cause_*` sur les items (Story 25.10) ne se déduit **pas** de ce champ : "
            "elle utilise `payload`, `mapping_resolution_error`, `last_remote_http_status` et "
            "`recent_sync_transitions` (voir règles dans `derive_root_cause_for_outbox_item`)."
        ),
    )


class PahekoOutboxSyncTransitionListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: List[PahekoOutboxSyncTransitionPublic]
    total: int
    skip: int
    limit: int


class PahekoOutboxItemDetail(PahekoOutboxItemPublic):
    payload: Dict[str, Any] = Field(default_factory=dict)
    last_response_snippet: Optional[str] = None
    recent_sync_transitions: List[PahekoOutboxSyncTransitionPublic] = Field(
        default_factory=list,
        description="Dernières transitions significatives (audit §6), les plus récentes en premier.",
    )


class PahekoOutboxListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: List[PahekoOutboxItemPublic]
    total: int
    skip: int
    limit: int


class PahekoOutboxCorrelationTimelineResponse(BaseModel):
    """Story 8.5 — agrégat support : lignes outbox + audit transitions pour un correlation_id."""

    model_config = ConfigDict(extra="forbid")

    correlation_id: str
    items: List[PahekoOutboxItemPublic]
    sync_transitions: List[PahekoOutboxSyncTransitionPublic]
    sync_transitions_total: int
    sync_transitions_skip: int
    sync_transitions_limit: int


def close_batch_state_from_payload(payload: Dict[str, Any]) -> Optional[PahekoCloseBatchStatePublic]:
    raw = payload.get(_PAHEKO_CLOSE_BATCH_STATE_KEY)
    if not isinstance(raw, dict) or raw.get("schema_version") != 1:
        return None
    subs = raw.get("sub_writes") or []
    out_subs: List[PahekoCloseBatchSubWritePublic] = []
    for s in subs:
        if not isinstance(s, dict):
            continue
        try:
            out_subs.append(
                PahekoCloseBatchSubWritePublic(
                    index=int(s["index"]),
                    kind=str(s.get("kind", "")),
                    status=str(s.get("status", "")),
                    idempotency_sub_key=str(s.get("idempotency_sub_key", "")),
                    remote_transaction_id=s.get("remote_transaction_id"),
                    last_http_status=s.get("last_http_status"),
                    last_error=s.get("last_error"),
                    observability=s.get("observability") if isinstance(s.get("observability"), dict) else None,
                )
            )
        except (KeyError, TypeError, ValueError):
            continue
    return PahekoCloseBatchStatePublic(
        schema_version=1,
        retry_policy=str(raw.get("retry_policy", "")),
        partial_success=bool(raw.get("partial_success")),
        all_delivered=bool(raw.get("all_delivered")),
        sub_writes=out_subs,
    )


def _transition_name_from_rows(rows: Optional[List[Any]]) -> Optional[str]:
    """
    Retourne le nom de transition le plus récent dans une liste déjà triée par `occurred_at desc`
    (cf. `recent_sync_transitions` dans les endpoints admin outbox).
    """
    if not rows:
        return None
    name = getattr(rows[0], "transition_name", None)
    return str(name) if isinstance(name, str) and name.strip() else None


def _recent_transition_names(rows: Optional[List[Any]]) -> set[str]:
    """
    Retourne l'ensemble des noms de transition présents dans un extrait d'audit récent.

    La story 25.10 parle de transition « présente » (pas uniquement la plus récente).
    """
    out: set[str] = set()
    for r in rows or []:
        name = getattr(r, "transition_name", None)
        if isinstance(name, str):
            s = name.strip()
            if s:
                out.add(s)
    return out


def _first_recent_transition_name(rows: Optional[List[Any]], allowed: set[str]) -> Optional[str]:
    """Retourne la première transition (dans l'ordre reçu) qui appartient à `allowed`."""
    for r in rows or []:
        name = getattr(r, "transition_name", None)
        if isinstance(name, str):
            s = name.strip()
            if s and s in allowed:
                return s
    return None


def derive_root_cause_for_outbox_item(
    row: Any,
    *,
    recent_sync_transitions: Optional[List[Any]] = None,
) -> Tuple[RootCauseDomain, str, Optional[str]]:
    """
    Story 25.10 — dérivation canonique des causes racines (mapping vs builder vs outbox_http).

    Normatif : spec 25.4 §4 (mapping obligatoire, échec visible), Epic 8 (supervision), règles story 25.10.
    Important : aucune heuristique basée sur du texte libre (`last_error`) — seulement des signaux stables.

    ``recent_sync_transitions`` est le même extrait que l’admin (ordre **récent d’abord** : index 0 = dernière transition) :
    au plus les 10 dernières lignes d’audit par item.

    - Règles **1 à 3** : on inspecte l’**ensemble des noms** de transition dans cet extrait (et le payload / champs item),
      pas seulement la ligne la plus récente — ex. `auto_quarantine_mapping_resolution` compte même si une levée
      manuelle plus récente existe.
    - Règle **4** (résiduel / **builder**) : aucun signal mapping/builder/outbox_http fort (règles 1–3) ;
      domaine fixé à ``builder`` avec code = nom de la **dernière** transition connue ou ``unknown``.
      Cas limite : item sans transitions ni trace — étiquette **support** peut rester générique ; analyser
      ``recent_sync_transitions`` / payload plutôt que ``root_cause_*`` seuls.
    """
    pl = dict(getattr(row, "payload", None) or {})
    trace = pl.get("preparation_trace_v1")
    trace_domain = None
    trace_code = None
    trace_message = None
    if isinstance(trace, dict):
        trace_domain = trace.get("failure_domain")
        trace_code = trace.get("code")
        trace_message = trace.get("message")

    mapping_resolution_error = getattr(row, "mapping_resolution_error", None)
    if isinstance(mapping_resolution_error, str) and not mapping_resolution_error.strip():
        mapping_resolution_error = None

    last_http_status = getattr(row, "last_http_status", None)
    try:
        http_status_value = int(last_http_status) if last_http_status is not None else None
    except (TypeError, ValueError):
        http_status_value = None

    transition_name = _transition_name_from_rows(recent_sync_transitions)
    transition_names = _recent_transition_names(recent_sync_transitions)
    has_mapping_transition = "auto_quarantine_mapping_resolution" in transition_names
    has_builder_transition = "auto_quarantine_builder_preparation" in transition_names
    http_transition_names = {
        "auto_quarantine_http_non_retryable",
        "auto_quarantine_max_attempts_exceeded",
    }
    has_http_transition = bool(transition_names.intersection(http_transition_names))

    # Règle (1) — mapping (prioritaire)
    if trace_domain == "mapping" or has_mapping_transition or mapping_resolution_error:
        code = (
            (mapping_resolution_error or "").strip()
            or (str(trace_code).strip() if isinstance(trace_code, str) and trace_code.strip() else "")
            or "unknown"
        )
        msg = str(trace_message) if isinstance(trace_message, str) and trace_message.strip() else None
        return "mapping", code, msg

    # Règle (2) — builder
    if trace_domain == "builder" or has_builder_transition:
        code = str(trace_code).strip() if isinstance(trace_code, str) and trace_code.strip() else "unknown"
        msg = str(trace_message) if isinstance(trace_message, str) and trace_message.strip() else None
        return "builder", code, msg

    # Règle (3) — outbox_http
    if http_status_value is not None or has_http_transition:
        if http_status_value is not None:
            return "outbox_http", f"http_{http_status_value}", None
        # Si le statut est inconnu (ex. incidents hors client HTTP) : retourner une transition outbox_http stable.
        best = _first_recent_transition_name(recent_sync_transitions, http_transition_names) or transition_name
        return "outbox_http", best or "unknown", None

    # Règle (4) — résiduel : builder
    return "builder", transition_name or "unknown", None


class PahekoOutboxRejectBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=1, max_length=4000, description="Motif traçable du rejet (8.2).")

    @field_validator("reason")
    @classmethod
    def reason_not_blank(cls, v: str) -> str:
        s = (v or "").strip()
        if not s:
            raise ValueError("reason ne peut pas être vide")
        return s


def outbox_item_to_public(
    row: Any,
    *,
    transaction_preview: Optional[PahekoResolvedTransactionPreview] = None,
    recent_sync_transitions: Optional[List[Any]] = None,
) -> PahekoOutboxItemPublic:
    local_ok = row.cash_session_id is not None
    pl = dict(row.payload or {}) if getattr(row, "payload", None) is not None else {}
    cb = close_batch_state_from_payload(pl)
    root_domain, root_code, root_msg = derive_root_cause_for_outbox_item(
        row,
        recent_sync_transitions=recent_sync_transitions,
    )
    return PahekoOutboxItemPublic(
        id=str(row.id),
        operation_type=row.operation_type,
        idempotency_key=row.idempotency_key,
        cash_session_id=str(row.cash_session_id) if row.cash_session_id else None,
        site_id=str(row.site_id) if row.site_id else None,
        outbox_status=row.outbox_status,
        sync_state_core=SyncStateCore(row.sync_state_core),
        local_session_persisted=local_ok,
        remote_attempt_count=row.attempt_count or 0,
        last_remote_http_status=row.last_http_status,
        last_error=row.last_error,
        next_retry_at=row.next_retry_at,
        rejection_reason=row.rejection_reason,
        mapping_resolution_error=getattr(row, "mapping_resolution_error", None),
        root_cause_domain=root_domain,
        root_cause_code=root_code,
        root_cause_message=root_msg,
        correlation_id=row.correlation_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
        transaction_preview=transaction_preview,
        close_batch_state=cb,
    )


def sync_transition_to_public(row: Any) -> PahekoOutboxSyncTransitionPublic:
    return PahekoOutboxSyncTransitionPublic(
        id=str(row.id),
        transition_name=row.transition_name,
        from_sync_state=SyncStateCore(row.from_sync_state),
        to_sync_state=SyncStateCore(row.to_sync_state),
        from_outbox_status=row.from_outbox_status,
        to_outbox_status=row.to_outbox_status,
        actor_user_id=str(row.actor_user_id) if row.actor_user_id else None,
        occurred_at=row.occurred_at,
        reason=row.reason,
        correlation_id=row.correlation_id,
        context_json=dict(row.context_json or {}),
    )


def outbox_item_to_detail(
    row: Any,
    *,
    recent_sync_transitions: Optional[List[Any]] = None,
    transaction_preview: Optional[PahekoResolvedTransactionPreview] = None,
) -> PahekoOutboxItemDetail:
    base = outbox_item_to_public(
        row,
        transaction_preview=transaction_preview,
        recent_sync_transitions=recent_sync_transitions,
    ).model_dump()
    base["payload"] = dict(row.payload or {})
    base["last_response_snippet"] = row.last_response_snippet
    base["recent_sync_transitions"] = [
        sync_transition_to_public(t) for t in (recent_sync_transitions or [])
    ]
    return PahekoOutboxItemDetail(**base)
