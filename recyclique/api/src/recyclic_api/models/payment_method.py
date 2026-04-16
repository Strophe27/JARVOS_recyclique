import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from recyclic_api.core.database import Base


class PaymentMethodKind(str, enum.Enum):
    CASH = "cash"
    BANK = "bank"
    THIRD_PARTY = "third_party"
    OTHER = "other"


class PaymentMethodDefinition(Base):
    """Référentiel canonique des moyens de paiement administrables."""

    __tablename__ = "payment_methods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(64), nullable=False, unique=True)
    label = Column(String(120), nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    kind = Column(
        SQLEnum(
            PaymentMethodKind,
            name="payment_method_kind",
            native_enum=False,
            values_callable=lambda values: [value.value for value in values],
        ),
        nullable=False,
    )
    paheko_debit_account = Column(String(32), nullable=False)
    paheko_refund_credit_account = Column(String(32), nullable=False)
    min_amount = Column(Float, nullable=True)
    max_amount = Column(Float, nullable=True)
    display_order = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<PaymentMethodDefinition(id={self.id}, code={self.code}, active={self.active})>"
