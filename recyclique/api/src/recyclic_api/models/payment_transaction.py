import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from recyclic_api.core.database import Base
from recyclic_api.models.payment_method import PaymentMethodDefinition
from recyclic_api.models.sale import PaymentMethod, PaymentMethodColumn


class PaymentTransactionNature(str, enum.Enum):
    SALE_PAYMENT = "sale_payment"
    DONATION_SURPLUS = "donation_surplus"
    REFUND_PAYMENT = "refund_payment"
    # Story 24.7 — sortie trésorerie hors ticket client (distinct remboursement / mouvement interne 24.8).
    DISBURSEMENT = "disbursement"
    # Story 24.8 — mouvement interne typé (appoint, banque, transfert caisses, etc.) — pas décaissement §10.5.
    CASH_INTERNAL_TRANSFER = "cash_internal_transfer"


class PaymentTransactionDirection(str, enum.Enum):
    INFLOW = "inflow"
    OUTFLOW = "outflow"


class PaymentTransaction(Base):
    """Journal détaillé des transactions de paiement."""

    __tablename__ = "payment_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)
    payment_method = Column(
        PaymentMethodColumn(allow_none_result=False),
        nullable=False,
    )
    payment_method_id = Column(UUID(as_uuid=True), ForeignKey("payment_methods.id"), nullable=True)
    nature = Column(
        SQLEnum(
            PaymentTransactionNature,
            name="payment_transaction_nature",
            native_enum=False,
            values_callable=lambda values: [value.value for value in values],
        ),
        nullable=True,
    )
    direction = Column(
        SQLEnum(
            PaymentTransactionDirection,
            name="payment_transaction_direction",
            native_enum=False,
            values_callable=lambda values: [value.value for value in values],
        ),
        nullable=True,
    )
    original_sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=True)
    original_payment_method_id = Column(UUID(as_uuid=True), ForeignKey("payment_methods.id"), nullable=True)
    is_prior_year_special_case = Column(Boolean, nullable=False, default=False)
    paheko_account_override = Column(String(32), nullable=True)
    notes = Column(Text, nullable=True)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sale = relationship("Sale", back_populates="payments", foreign_keys=[sale_id])
    payment_method_ref = relationship(PaymentMethodDefinition, foreign_keys=[payment_method_id])
    original_sale = relationship("Sale", foreign_keys=[original_sale_id])
    original_payment_method_ref = relationship(PaymentMethodDefinition, foreign_keys=[original_payment_method_id])

    @property
    def payment_method_code(self) -> str | None:
        if self.payment_method_ref is not None:
            return self.payment_method_ref.code
        method = self.payment_method
        return method.value if hasattr(method, "value") else method

    def __repr__(self):
        return (
            f"<PaymentTransaction(id={self.id}, payment_method={self.payment_method}, "
            f"nature={self.nature}, direction={self.direction}, amount={self.amount})>"
        )
