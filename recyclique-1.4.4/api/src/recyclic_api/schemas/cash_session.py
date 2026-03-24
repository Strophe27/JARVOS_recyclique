from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class CashSessionStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"


class CashSessionStep(str, Enum):
    ENTRY = "ENTRY"      # Phase de réception/dépôt d'objets
    SALE = "SALE"        # Phase de vente (caisse)
    EXIT = "EXIT"        # Phase de clôture


class CashSessionBase(BaseModel):
    """Schéma de base pour les sessions de caisse."""
    model_config = ConfigDict(from_attributes=True)
    
    operator_id: str = Field(..., description="ID de l'opérateur (caissier)")
    site_id: str = Field(..., description="ID du site")
    register_id: Optional[str] = Field(None, description="ID du poste de caisse (registre)")
    initial_amount: float = Field(..., ge=0, description="Montant initial du fond de caisse")
    
    @field_validator('initial_amount')
    @classmethod
    def validate_initial_amount(cls, v):
        if v < 0:
            raise ValueError('Le montant initial ne peut pas être négatif')
        if v > 10000:
            raise ValueError('Le montant initial ne peut pas dépasser 10 000€')
        return v
    
    @field_validator('operator_id', 'site_id', 'register_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convertit les UUIDs en strings pour la sérialisation"""
        if v is None:
            return v
        if hasattr(v, '__str__'):
            return str(v)
        return v


class CashSessionCreate(CashSessionBase):
    """Schéma pour la création d'une session de caisse."""
    opened_at: Optional[datetime] = Field(None, description="Date d'ouverture personnalisée (pour saisie différée, ADMIN/SUPER_ADMIN uniquement)")
    
    @field_validator('opened_at')
    @classmethod
    def validate_opened_at(cls, v):
        """Valide que opened_at n'est pas dans le futur."""
        if v is not None:
            from datetime import timezone
            now = datetime.now(timezone.utc)
            # S'assurer que v est timezone-aware
            if v.tzinfo is None:
                v = v.replace(tzinfo=timezone.utc)
            if v > now:
                raise ValueError("La date d'ouverture ne peut pas être dans le futur")
        return v


class CashSessionUpdate(BaseModel):
    """Schéma pour la mise à jour d'une session de caisse."""
    status: Optional[CashSessionStatus] = Field(None, description="Nouveau statut de la session")
    current_amount: Optional[float] = Field(None, ge=0, description="Montant actuel en caisse")
    total_sales: Optional[float] = Field(None, ge=0, description="Total des ventes")
    total_items: Optional[int] = Field(None, ge=0, description="Nombre total d'articles vendus")


class CashSessionClose(BaseModel):
    """Schéma pour la fermeture d'une session de caisse avec contrôle des montants."""
    actual_amount: float = Field(..., ge=0, description="Montant physique compté en caisse")
    variance_comment: Optional[str] = Field(None, description="Commentaire obligatoire en cas d'écart")
    
    @field_validator('actual_amount')
    @classmethod
    def validate_actual_amount(cls, v):
        if v < 0:
            raise ValueError('Le montant physique ne peut pas être négatif')
        return v


class CashSessionResponse(CashSessionBase):
    """Schéma de réponse pour une session de caisse."""
    id: str = Field(..., description="ID unique de la session")
    current_amount: float = Field(..., description="Montant actuel en caisse")
    status: CashSessionStatus = Field(..., description="Statut de la session")
    opened_at: datetime = Field(..., description="Date et heure d'ouverture")
    closed_at: Optional[datetime] = Field(None, description="Date et heure de fermeture")
    total_sales: Optional[float] = Field(None, description="Total des ventes")
    total_items: Optional[int] = Field(None, description="Nombre total d'articles vendus")
    number_of_sales: Optional[int] = Field(None, description="Nombre de ventes effectuées")
    total_donations: Optional[float] = Field(None, description="Total des dons collectés")
    total_weight_out: Optional[float] = Field(None, description="Poids total vendu ou donné sur la session (kg)")
    closing_amount: Optional[float] = Field(None, description="Montant théorique calculé à la fermeture")
    actual_amount: Optional[float] = Field(None, description="Montant physique compté à la fermeture")
    variance: Optional[float] = Field(None, description="Écart entre théorique et physique")
    variance_comment: Optional[str] = Field(None, description="Commentaire sur l'écart")
    
    report_download_url: Optional[str] = Field(None, description="URL de telechargement du rapport genere")
    report_email_sent: Optional[bool] = Field(None, description="Indique si l'envoi du rapport par email a reussi")
    
    # Story B49-P1: Options de workflow du registre associé
    register_options: Optional[Dict[str, Any]] = Field(None, description="Options de workflow du poste de caisse associé")

    @field_validator('id', mode='before')
    @classmethod
    def convert_id_uuid_to_str(cls, v):
        """Convertit l'ID UUID en string pour la sérialisation"""
        if hasattr(v, '__str__'):
            return str(v)
        return v


class CashSessionSummary(BaseModel):
    """Schéma pour le résumé d'une session de caisse."""
    session_id: str = Field(..., description="ID de la session")
    site_id: str = Field(..., description="ID du site")
    register_id: Optional[str] = Field(None, description="ID du poste de caisse")
    operator: str = Field(..., description="Nom de l'opérateur")
    opened_at: datetime = Field(..., description="Date d'ouverture")
    closed_at: Optional[datetime] = Field(None, description="Date de fermeture")
    initial_amount: float = Field(..., description="Montant initial")
    current_amount: float = Field(..., description="Montant actuel")
    total_sales: float = Field(..., description="Total des ventes")
    total_items: int = Field(..., description="Nombre d'articles vendus")
    status: CashSessionStatus = Field(..., description="Statut de la session")


class CashSessionListResponse(BaseModel):
    """Schéma de réponse pour la liste des sessions de caisse."""
    data: List[CashSessionResponse] = Field(..., description="Liste des sessions")
    total: int = Field(..., description="Nombre total de sessions")
    skip: int = Field(..., description="Nombre de sessions ignorées")
    limit: int = Field(..., description="Limite de sessions par page")


class CashSessionFilters(BaseModel):
    """Schéma pour les filtres de recherche des sessions."""
    skip: int = Field(0, ge=0, description="Nombre de sessions à ignorer")
    # Augmentation de la limite max pour permettre les exports (le=10000 au lieu de 100)
    # La limite de l'endpoint API REST reste à 100 via Query param
    limit: int = Field(20, ge=1, le=10000, description="Nombre maximum de sessions à retourner")
    status: Optional[CashSessionStatus] = Field(None, description="Filtrer par statut")
    operator_id: Optional[str] = Field(None, description="Filtrer par opérateur")
    site_id: Optional[str] = Field(None, description="Filtrer par site")
    register_id: Optional[str] = Field(None, description="Filtrer par registre")
    date_from: Optional[datetime] = Field(None, description="Date de début")
    date_to: Optional[datetime] = Field(None, description="Date de fin")
    search: Optional[str] = Field(None, description="Recherche textuelle (nom opérateur ou ID de session)")
    include_empty: bool = Field(False, description="B44-P3: Inclure les sessions vides (sans transaction) dans les résultats")
    # B45-P2: Filtres avancés
    amount_min: Optional[float] = Field(None, ge=0, description="Montant minimum (CA total)")
    amount_max: Optional[float] = Field(None, ge=0, description="Montant maximum (CA total)")
    variance_threshold: Optional[float] = Field(None, description="Seuil de variance (écart minimum)")
    variance_has_variance: Optional[bool] = Field(None, description="Filtrer par présence/absence de variance (true=avec variance, false=sans variance)")
    duration_min_hours: Optional[float] = Field(None, ge=0, description="Durée minimum de session (en heures)")
    duration_max_hours: Optional[float] = Field(None, ge=0, description="Durée maximum de session (en heures)")
    payment_methods: Optional[List[str]] = Field(None, description="Méthodes de paiement (multi-sélection)")
    has_donation: Optional[bool] = Field(None, description="Filtrer par présence de don (true=avec don, false=sans don)")


class CashSessionStats(BaseModel):
    """Schéma pour les statistiques des sessions de caisse."""
    total_sessions: int = Field(..., description="Nombre total de sessions")
    open_sessions: int = Field(..., description="Nombre de sessions ouvertes")
    closed_sessions: int = Field(..., description="Nombre de sessions fermées")
    total_sales: float = Field(..., description="Total des ventes")
    total_items: int = Field(..., description="Total des articles vendus")
    number_of_sales: int = Field(..., description="Nombre total de ventes")
    total_donations: float = Field(..., description="Total des dons sur la période")
    total_weight_sold: float = Field(..., description="Poids total vendu (kg)")
    average_session_duration: Optional[float] = Field(None, description="Durée moyenne des sessions en heures")


class PaymentDetail(BaseModel):
    """Story B52-P1: Schéma pour un paiement individuel dans une vente."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="ID du paiement")
    sale_id: str = Field(..., description="ID de la vente")
    payment_method: str = Field(..., description="Méthode de paiement")
    amount: float = Field(..., description="Montant du paiement")
    created_at: datetime = Field(..., description="Date et heure du paiement")
    
    @field_validator('id', 'sale_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convertit les UUIDs en strings pour la sérialisation"""
        if v is None:
            return v
        if hasattr(v, '__str__'):
            return str(v)
        return v


class SaleDetail(BaseModel):
    """Schéma pour les détails d'une vente dans une session."""
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="ID de la vente")
    total_amount: float = Field(..., description="Montant total de la vente")
    donation: Optional[float] = Field(None, description="Montant du don")
    payment_method: Optional[str] = Field(None, description="Méthode de paiement (déprécié - utiliser payments)")
    payments: Optional[List[PaymentDetail]] = Field(None, description="Story B52-P1: Liste de paiements multiples")
    sale_date: datetime = Field(..., description="Date réelle du ticket (date du cahier)")  # Story B52-P3: Date réelle du ticket
    created_at: datetime = Field(..., description="Date et heure d'enregistrement")  # Story B52-P3: Date d'enregistrement
    operator_id: Optional[str] = Field(None, description="ID de l'opérateur")
    operator_name: Optional[str] = Field(None, description="Nom de l'opérateur")
    note: Optional[str] = Field(None, description="Note associée à la vente")  # Story B40-P4: Notes dans liste sessions
    total_weight: Optional[float] = Field(None, description="B52-P6: Poids total du panier (somme des poids des items)")
    
    @field_validator('id', 'operator_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convertit les UUIDs en strings pour la sérialisation"""
        if v is None:
            return v
        if hasattr(v, '__str__'):
            return str(v)
        return v


class CashSessionDetailResponse(CashSessionResponse):
    """Schéma de réponse détaillée pour une session de caisse avec ses ventes."""
    sales: List[SaleDetail] = Field(..., description="Liste des ventes de la session")
    operator_name: Optional[str] = Field(None, description="Nom de l'opérateur")
    site_name: Optional[str] = Field(None, description="Nom du site")


class CashSessionStepUpdate(BaseModel):
    """Schéma pour la mise à jour de l'étape actuelle d'une session."""
    step: CashSessionStep = Field(..., description="Nouvelle étape du workflow")
    timestamp: Optional[datetime] = Field(None, description="Timestamp de la mise à jour (auto-généré si non fourni)")

    @field_validator('timestamp', mode='before')
    @classmethod
    def set_default_timestamp(cls, v):
        """Définit le timestamp par défaut si non fourni."""
        return v or datetime.now()


class CashSessionStepResponse(BaseModel):
    """Schéma de réponse pour les métriques d'étape d'une session."""
    session_id: str = Field(..., description="ID de la session")
    current_step: Optional[CashSessionStep] = Field(None, description="Étape actuelle du workflow")
    step_start_time: Optional[datetime] = Field(None, description="Début de l'étape actuelle")
    last_activity: Optional[datetime] = Field(None, description="Dernière activité utilisateur")
    step_duration_seconds: Optional[float] = Field(None, description="Durée écoulée dans l'étape actuelle")
