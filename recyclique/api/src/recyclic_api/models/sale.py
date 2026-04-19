import enum
import logging
import uuid

from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import TypeDecorator

from recyclic_api.core.database import Base

logger = logging.getLogger(__name__)


class PaymentMethod(str, enum.Enum):
    """Méthodes de paiement disponibles - codes simples pour éviter problèmes d'encodage"""
    CASH = "cash"
    CARD = "card"
    CHECK = "check"
    FREE = "free"  # Gratuit/Don


def _normalize_payment_method_token(raw: str) -> str | None:
    """Retourne une valeur enum ``cash``/… ou None si chaîne vide."""
    s = (raw or "").strip()
    if not s:
        return None
    low = s.lower()
    if low in ("cash", "card", "check", "free"):
        return low
    up = s.upper()
    if up in ("CASH", "CARD", "CHECK", "FREE"):
        return up.lower()
    return None


class PaymentMethodColumn(TypeDecorator):
    """VARCHAR en base : tolère le brownfield sans ``LookupError`` à l'hydratation (Epic 22 / s22_7).

    ``SQLEnum`` + valeurs héritées (casse, anciens libellés) peut lever ``LookupError`` au chargement
    des ventes / ``payment_transactions``, ce qui casse ``GET /v1/cash-sessions/{id}``.
    """

    impl = String(32)
    cache_ok = True

    def __init__(self, *, allow_none_result: bool = True, **kw):
        super().__init__(**kw)
        self._allow_none_result = allow_none_result

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, PaymentMethod):
            return value.value
        token = _normalize_payment_method_token(str(value))
        if token is not None:
            return token
        logger.warning("payment_method ORM bind inconnu %r ; forcé à cash", value)
        return PaymentMethod.CASH.value

    def process_result_value(self, value, dialect):
        if value is None:
            return None if self._allow_none_result else PaymentMethod.CASH
        token = _normalize_payment_method_token(str(value))
        if token is not None:
            return PaymentMethod(token)
        logger.warning("payment_method ORM lecture inconnue %r ; défaut cash", value)
        return PaymentMethod.CASH


class SaleLifecycleStatus(str, enum.Enum):
    """Story 6.3 — ticket en attente (backend autoritaire)."""

    COMPLETED = "completed"
    HELD = "held"
    ABANDONED = "abandoned"


class SpecialEncaissementKind(str, enum.Enum):
    """Story 6.5 — encaissements sans lignes article (discriminant API figé VS)."""

    DON_SANS_ARTICLE = "DON_SANS_ARTICLE"
    ADHESION_ASSOCIATION = "ADHESION_ASSOCIATION"


class SocialActionKind(str, enum.Enum):
    """Story 6.6 — actions sociales / solidaires (lot 1 figé, distinct de Story 6.5)."""

    DON_LIBRE = "DON_LIBRE"
    DON_MOINS_18 = "DON_MOINS_18"
    MARAUDE = "MARAUDE"
    KIT_INSTALLATION_ETUDIANT = "KIT_INSTALLATION_ETUDIANT"
    DON_AUX_ANIMAUX = "DON_AUX_ANIMAUX"
    FRIPERIE_AUTO_GEREE = "FRIPERIE_AUTO_GEREE"


class Sale(Base):
    """Modèle pour les ventes - étendu pour Story 1.1.1 avec traçage des boutons prédéfinis"""
    __tablename__ = "sales"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cash_session_id = Column(UUID(as_uuid=True), ForeignKey("cash_sessions.id"), nullable=False)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    total_amount = Column(Float, nullable=False)
    donation = Column(Float, nullable=True, default=0.0)
    payment_method = Column(
        PaymentMethodColumn(allow_none_result=True),
        nullable=True,
        default=PaymentMethod.CASH,
    )
    note = Column(Text, nullable=True)  # Story B40-P5: Notes sur les tickets de caisse
    # Story 1.1.2: preset_id et notes déplacés vers sale_items (par item individuel)
    sale_date = Column(DateTime(timezone=True), nullable=True)  # Story B52-P3: Date réelle du ticket (date du cahier)
    lifecycle_status = Column(
        SQLEnum(
            SaleLifecycleStatus,
            name="sale_lifecycle_status",
            native_enum=False,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=SaleLifecycleStatus.COMPLETED,
        server_default=SaleLifecycleStatus.COMPLETED.value,
    )
    # Story 6.5 — persistance traçable ; NULL = vente nominale / autre.
    special_encaissement_kind = Column(String(64), nullable=True)
    # Story 6.6 — mutuellement exclusif avec special_encaissement_kind (contrôlé serveur).
    social_action_kind = Column(String(64), nullable=True)
    adherent_reference = Column(String(200), nullable=True)
    # Story 24.9 — tags métier (ticket) ; surcharge ligne dans ``sale_items`` ; AUTRE + ``business_tag_custom``.
    business_tag_kind = Column(String(64), nullable=True)
    business_tag_custom = Column(String(256), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    cash_session = relationship("CashSession", back_populates="sales")
    operator = relationship("User")
    # Story 1.1.2: Relation preset_button supprimée - presets maintenant sur sale_items
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    # Story B52-P1: Relation vers les paiements multiples
    payments = relationship(
        "PaymentTransaction",
        back_populates="sale",
        cascade="all, delete-orphan",
        foreign_keys="PaymentTransaction.sale_id",
    )

    @property
    def effective_business_tag(self) -> str | None:
        """Tag métier effectif au niveau ticket (héritage legacy si colonnes 24.9 vides)."""
        from recyclic_api.services.business_tag_resolution import ticket_level_effective_key

        return ticket_level_effective_key(self)

    def __repr__(self):
        return f"<Sale(id={self.id}, total_amount={self.total_amount})>"
