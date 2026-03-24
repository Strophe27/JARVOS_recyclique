from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel
from recyclic_api.core.database import get_db
from recyclic_api.core.auth import get_current_user
from recyclic_api.models.user import User
from recyclic_api.services.preset_management import PresetManagementService
from recyclic_api.schemas.sale import SaleCreate, SaleResponse
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.core.logging import log_transaction_event

# Import the sale creation function (assuming it exists)
# This would need to be adapted based on the actual sale creation logic
from .sales import create_sale

router = APIRouter()


class TransactionLogRequest(BaseModel):
    """Schéma pour les logs transactionnels envoyés depuis le frontend."""
    event: str  # TICKET_OPENED, TICKET_RESET, ANOMALY_DETECTED, etc.
    session_id: str
    cart_state: Optional[Dict[str, Any]] = None
    cart_state_before: Optional[Dict[str, Any]] = None
    anomaly: Optional[bool] = False
    details: Optional[str] = None  # B48-P2: Détails pour les anomalies


@router.post("/", response_model=SaleResponse)
async def create_transaction(
    transaction_data: SaleCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new transaction (sale) with support for preset buttons and notes.

    Extended to support:
    - preset_id: Reference to a preset button used for this transaction
    - notes: Additional notes for the transaction
    """
    # If preset_id is provided, validate that the preset exists and is active
    if hasattr(transaction_data, 'preset_id') and transaction_data.preset_id:
        preset_service = PresetManagementService(db)
        preset = preset_service.get_preset_button_by_id(str(transaction_data.preset_id))

        if not preset:
            raise HTTPException(
                status_code=400,
                detail=f"Preset button with ID '{transaction_data.preset_id}' not found or inactive"
            )

    # For now, delegate to the existing sale creation logic
    # Story 1.1.2: preset_id et notes sont maintenant sur sale_items (par item individuel)
    return create_sale(transaction_data, db, None)


@router.post("/log")
async def log_transaction(
    log_data: TransactionLogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint pour logger les événements transactionnels depuis le frontend.
    
    B48-P2: Permet au frontend d'envoyer des logs pour les événements qui se produisent
    côté client (TICKET_OPENED, TICKET_RESET, etc.).
    
    **Permissions requises :** Authentification requise (tous les rôles)
    """
    try:
        # Construire les données de log
        log_payload = {
            "user_id": str(current_user.id),
            "session_id": log_data.session_id,
        }
        
        # Ajouter les données spécifiques selon le type d'événement
        if log_data.event == "TICKET_OPENED":
            if log_data.cart_state:
                log_payload["cart_state"] = log_data.cart_state
            log_payload["anomaly"] = log_data.anomaly or False
        elif log_data.event == "TICKET_RESET":
            if log_data.cart_state_before:
                log_payload["cart_state_before"] = log_data.cart_state_before
            log_payload["anomaly"] = log_data.anomaly or False
        elif log_data.event == "ANOMALY_DETECTED":
            log_payload["anomaly_type"] = "ITEM_ADDED_WITHOUT_TICKET"
            if log_data.cart_state:
                log_payload["cart_state"] = log_data.cart_state
            log_payload["details"] = log_data.details or "Item added but no ticket is explicitly opened"
        
        # Logger l'événement
        log_transaction_event(log_data.event, log_payload)
        
        return {"success": True, "message": "Log enregistré"}
    except Exception as e:
        # Best-effort: ne pas interrompre les opérations si le logging échoue
        # On retourne quand même un succès pour ne pas bloquer le frontend
        return {"success": True, "message": "Log enregistré (avec erreur silencieuse)"}
