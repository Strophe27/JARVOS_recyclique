"""
Story 24.9 — tags métier ticket/ligne, réconciliation avec ``special_encaissement_kind`` / ``social_action_kind``.

Règle de surcharge : le tag explicite en **ligne** prime sur le tag **ticket** ;
à défaut, le tag ticket ou le **résidu legacy** (6.5 / 6.6) alimente l’agrégation.
"""
from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Optional, Tuple

from recyclic_api.models.sale import SocialActionKind, SpecialEncaissementKind

if TYPE_CHECKING:
    from recyclic_api.models.sale import Sale
    from recyclic_api.models.sale_item import SaleItem


class BusinessTagKind(str, enum.Enum):
    """Tags métier canoniques (PRD + réconciliation Stories 6.5 / 6.6)."""

    GRATIFERIA = "GRATIFERIA"
    CAMPAGNE_SOCIALE = "CAMPAGNE_SOCIALE"
    SPECIAL_DON_SANS_ARTICLE = "SPECIAL_DON_SANS_ARTICLE"
    ADHESION_ASSOCIATION = "ADHESION_ASSOCIATION"
    SOCIAL_DON_LIBRE = "SOCIAL_DON_LIBRE"
    SOCIAL_DON_MOINS_18 = "SOCIAL_DON_MOINS_18"
    SOCIAL_MARAUDE = "SOCIAL_MARAUDE"
    SOCIAL_KIT_INSTALLATION_ETUDIANT = "SOCIAL_KIT_INSTALLATION_ETUDIANT"
    SOCIAL_DON_AUX_ANIMAUX = "SOCIAL_DON_AUX_ANIMAUX"
    SOCIAL_FRIPERIE_AUTO_GEREE = "SOCIAL_FRIPERIE_AUTO_GEREE"
    AUTRE = "AUTRE"


def _social_enum_to_tag(kind: SocialActionKind) -> BusinessTagKind:
    return {
        SocialActionKind.DON_LIBRE: BusinessTagKind.SOCIAL_DON_LIBRE,
        SocialActionKind.DON_MOINS_18: BusinessTagKind.SOCIAL_DON_MOINS_18,
        SocialActionKind.MARAUDE: BusinessTagKind.SOCIAL_MARAUDE,
        SocialActionKind.KIT_INSTALLATION_ETUDIANT: BusinessTagKind.SOCIAL_KIT_INSTALLATION_ETUDIANT,
        SocialActionKind.DON_AUX_ANIMAUX: BusinessTagKind.SOCIAL_DON_AUX_ANIMAUX,
        SocialActionKind.FRIPERIE_AUTO_GEREE: BusinessTagKind.SOCIAL_FRIPERIE_AUTO_GEREE,
    }[kind]


def legacy_expected_tag_key(
    special: Optional[SpecialEncaissementKind],
    social: Optional[SocialActionKind],
) -> Optional[str]:
    """Clé métier attendue à partir des seuls discriminants 6.5 / 6.6 (exclusifs)."""
    if social is not None:
        return _social_enum_to_tag(social).value
    if special is not None:
        if special == SpecialEncaissementKind.DON_SANS_ARTICLE:
            return BusinessTagKind.SPECIAL_DON_SANS_ARTICLE.value
        if special == SpecialEncaissementKind.ADHESION_ASSOCIATION:
            return BusinessTagKind.ADHESION_ASSOCIATION.value
    return None


def normalize_explicit_tag_key(
    kind: Optional[BusinessTagKind],
    custom: Optional[str],
) -> Optional[str]:
    """Clé stable pour comparaisons (AUTRE → préfixe ``AUTRE:`` + texte)."""
    if kind is None and not (custom or "").strip():
        return None
    if kind == BusinessTagKind.AUTRE or (kind is None and (custom or "").strip()):
        c = (custom or "").strip()
        return f"AUTRE:{c}" if c else None
    if kind is not None:
        return kind.value
    return None


def validate_tag_pair(kind: Optional[BusinessTagKind], custom: Optional[str]) -> None:
    from recyclic_api.core.exceptions import ValidationError

    c = (custom or "").strip()
    if kind == BusinessTagKind.AUTRE:
        if not c:
            raise ValidationError("business_tag_custom est obligatoire lorsque business_tag_kind vaut AUTRE.")
        if len(c) > 200:
            raise ValidationError("business_tag_custom ne peut pas dépasser 200 caractères.")
    elif kind is not None and kind != BusinessTagKind.AUTRE and c:
        raise ValidationError(
            "business_tag_custom doit être absent sauf pour business_tag_kind = AUTRE "
            "(ou laisser AUTRE pour un libellé libre)."
        )


def assert_explicit_matches_legacy(
    legacy_key: Optional[str],
    explicit_kind: Optional[BusinessTagKind],
    explicit_custom: Optional[str],
) -> None:
    """Pas de double vérité silencieuse : explicit vs legacy doit correspondre si les deux sont fournis."""
    from recyclic_api.core.exceptions import ValidationError

    explicit = normalize_explicit_tag_key(explicit_kind, explicit_custom)
    if legacy_key and explicit and legacy_key != explicit:
        raise ValidationError(
            "Incohérence entre tags métier explicites (business_tag_*) "
            "et special_encaissement_kind / social_action_kind : "
            f"attendu {legacy_key!r}, reçu {explicit!r}."
        )


def ticket_level_effective_key(sale: "Sale") -> Optional[str]:
    """Tag effectif au niveau ticket (sans tenir compte des lignes)."""
    kind_enum: Optional[BusinessTagKind] = None
    if sale.business_tag_kind:
        try:
            kind_enum = BusinessTagKind(sale.business_tag_kind)
        except ValueError:
            kind_enum = None
    nk = normalize_explicit_tag_key(kind_enum, sale.business_tag_custom)
    if nk:
        return nk
    return legacy_expected_tag_key_from_strings(
        sale.special_encaissement_kind,
        sale.social_action_kind,
    )


def legacy_expected_tag_key_from_strings(
    special_s: Optional[str],
    social_s: Optional[str],
) -> Optional[str]:
    if social_s:
        try:
            sk = SocialActionKind(social_s)
        except ValueError:
            return f"SOCIAL_{social_s}"
        return _social_enum_to_tag(sk).value
    if special_s:
        try:
            sp = SpecialEncaissementKind(special_s)
        except ValueError:
            return special_s
        return legacy_expected_tag_key(sp, None)
    return None


def line_effective_key(sale: "Sale", item: "SaleItem") -> Optional[str]:
    """Tag effectif pour une ligne : ligne > ticket > legacy."""
    kind_enum: Optional[BusinessTagKind] = None
    if item.business_tag_kind:
        try:
            kind_enum = BusinessTagKind(item.business_tag_kind)
        except ValueError:
            kind_enum = None
    nk = normalize_explicit_tag_key(kind_enum, item.business_tag_custom)
    if nk:
        return nk
    return ticket_level_effective_key(sale)
