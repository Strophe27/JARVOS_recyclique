from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
import enum

from recyclic_api.core.database import Base

def get_enum_values(enum_class):
    """Extract values from enum class for SQLAlchemy values_callable"""
    return [member.value for member in enum_class]

class AuditActionType(str, enum.Enum):
    """Types d'actions auditées dans le système"""
    # Actions d'authentification
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    
    # Actions de gestion des utilisateurs
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_STATUS_CHANGED = "user_status_changed"
    USER_ROLE_CHANGED = "user_role_changed"
    
    # Actions de sécurité
    PASSWORD_FORCED = "password_forced"
    PASSWORD_RESET = "password_reset"
    PIN_RESET = "pin_reset"
    
    # Actions de permissions
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"
    GROUP_ASSIGNED = "group_assigned"
    GROUP_REMOVED = "group_removed"
    
    # Caisse / terrain (Story 2.5 — ligne de base audit, corrélation support)
    CASH_SESSION_OPENED = "cash_session_opened"
    CASH_SESSION_CLOSED = "cash_session_closed"
    CASH_SESSION_ACCESSED = "cash_session_accessed"
    CASH_SALE_RECORDED = "cash_sale_recorded"
    CASH_SALE_REVERSAL = "cash_sale_reversal"
    # Story 6.8 — correction post-hoc bornée (audit reviewable)
    CASH_SALE_CORRECTED = "cash_sale_corrected"
    # Story 24.5 — remboursement exceptionnel sans ticket
    CASH_EXCEPTIONAL_REFUND = "cash_exceptional_refund"
    # Story 24.6 — échange matière (conteneur ; sous-flux vente / reversal liés)
    CASH_MATERIAL_EXCHANGE = "cash_material_exchange"
    CASH_DISBURSEMENT = "cash_disbursement"
    # Story 24.8 — mouvement interne caisse (distinct remboursement / décaissement charge)
    CASH_INTERNAL_TRANSFER = "cash_internal_transfer"

    # Actions système
    SYSTEM_CONFIG_CHANGED = "system_config_changed"
    SETTING_UPDATED = "setting_updated"
    DATA_EXPORTED = "data_exported"
    BACKUP_CREATED = "backup_created"
    DB_IMPORT = "db_import"
    # Story 16.3 — exports / purges base (cohérent avec DB_IMPORT, filtre audit-log action_type)
    DB_EXPORT = "db_export"
    DB_PURGE = "db_purge"

    # Story 22.3 — gouvernance comptable expert (révision publiée, moyens, comptes globaux)
    ACCOUNTING_GLOBAL_SETTINGS_UPDATED = "accounting_global_settings_updated"
    ACCOUNTING_PAYMENT_METHOD_CHANGED = "accounting_payment_method_changed"
    ACCOUNTING_CONFIG_PUBLISHED = "accounting_config_published"

class AuditLog(Base):
    """Journal d'audit centralisé pour toutes les actions importantes"""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Timestamp de l'événement
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Acteur (qui a fait l'action)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    actor_username = Column(String, nullable=True, index=True)  # Cache pour éviter les JOINs
    
    # Type d'action
    action_type = Column(String, nullable=False, index=True)
    
    # Cible (sur quoi l'action a été faite)
    target_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    target_type = Column(String, nullable=True, index=True)  # "user", "group", "system", etc.
    
    # Détails de l'action (JSON flexible)
    details_json = Column(JSONB, nullable=True)
    
    # Message descriptif pour l'affichage
    description = Column(Text, nullable=True)
    
    # IP et User-Agent pour le contexte
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Relations
    actor = relationship("User", foreign_keys=[actor_id])

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action_type}, actor={self.actor_username}, timestamp={self.timestamp})>"
