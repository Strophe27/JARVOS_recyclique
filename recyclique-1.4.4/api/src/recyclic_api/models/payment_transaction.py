from sqlalchemy import Column, Float, ForeignKey, Enum as SQLEnum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from recyclic_api.core.database import Base
from recyclic_api.models.sale import PaymentMethod


class PaymentTransaction(Base):
    """Modèle pour les transactions de paiement - Story B52-P1: Paiements multiples"""
    __tablename__ = "payment_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False)
    payment_method = Column(SQLEnum(PaymentMethod, name="payment_method", native_enum=False), nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sale = relationship("Sale", back_populates="payments")

    def __repr__(self):
        return f"<PaymentTransaction(id={self.id}, payment_method={self.payment_method}, amount={self.amount})>"



