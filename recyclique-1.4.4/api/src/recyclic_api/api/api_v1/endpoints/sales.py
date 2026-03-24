from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID
from datetime import datetime, timezone
from recyclic_api.core.database import get_db
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from recyclic_api.core.security import verify_token
from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.payment_transaction import PaymentTransaction
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.sale import SaleResponse, SaleCreate, SaleUpdate, SaleItemUpdate, SaleItemResponse, SaleItemWeightUpdate
from recyclic_api.core.logging import log_transaction_event
from recyclic_api.core.auth import require_role_strict
from recyclic_api.services.statistics_recalculation_service import StatisticsRecalculationService
from recyclic_api.core.audit import log_audit
from recyclic_api.models.audit_log import AuditActionType
from sqlalchemy.orm import selectinload

router = APIRouter()
auth_scheme = HTTPBearer(auto_error=False)

@router.get("/", response_model=List[SaleResponse])
async def get_sales(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all sales"""
    # Story B52-P1: Eager load payments pour éviter N+1 queries
    sales = db.query(Sale).options(
        selectinload(Sale.payments),
        selectinload(Sale.items)
    ).offset(skip).limit(limit).all()
    return sales

@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(sale_id: str, db: Session = Depends(get_db)):
    """Get sale by ID"""
    try:
        sale_uuid = UUID(sale_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid sale ID format")

    # Story B52-P1: Eager load payments pour éviter N+1 queries
    sale = db.query(Sale).options(
        selectinload(Sale.payments),
        selectinload(Sale.items)
    ).filter(Sale.id == sale_uuid).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    return sale

@router.put("/{sale_id}", response_model=SaleResponse)
async def update_sale_note(
    sale_id: str,
    sale_update: SaleUpdate,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """
    Update sale note (admin only).

    STORY-B40-P4: Edition des notes côté Admin
    - Restricted to Admin/SuperAdmin roles
    - Updates only the note field
    """
    # Enforce 401 when no Authorization header is provided
    if credentials is None:
        raise HTTPException(status_code=401, detail="Unauthorized", headers={"WWW-Authenticate": "Bearer"})

    # Validate token and extract user_id
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized", headers={"WWW-Authenticate": "Bearer"})

    # Check user role - only admin/super-admin can edit notes
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient permissions. Admin access required.")

    # Validate sale ID
    try:
        sale_uuid = UUID(sale_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid sale ID format")

    # Find and update the sale
    sale = db.query(Sale).filter(Sale.id == sale_uuid).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    # Update only the note field
    if sale_update.note is not None:
        sale.note = sale_update.note

    db.commit()
    db.refresh(sale)
    return sale


@router.patch("/{sale_id}/items/{item_id}/weight", response_model=SaleItemResponse)
async def update_sale_item_weight(
    sale_id: str,
    item_id: str,
    weight_update: SaleItemWeightUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Modifier le poids d'un item de vente (admin uniquement).
    
    Story B52-P2: Permet de corriger les erreurs de saisie de poids après validation.
    - Seuls les administrateurs peuvent modifier
    - Recalcule automatiquement les statistiques affectées
    - Log d'audit complet
    """
    # Valider les UUIDs
    try:
        sale_uuid = UUID(sale_id)
        item_uuid = UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Récupérer l'item
    item = db.query(SaleItem).filter(
        SaleItem.id == item_uuid,
        SaleItem.sale_id == sale_uuid
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Sale item not found")
    
    # Sauvegarder l'ancien poids pour l'audit et le recalcul
    old_weight = float(item.weight) if item.weight else 0.0
    new_weight = weight_update.weight
    
    # Mettre à jour le poids
    item.weight = new_weight
    db.flush()  # Flush pour avoir l'ID disponible pour l'audit
    
    # Recalculer les statistiques affectées
    recalculation_result = None
    try:
        recalculation_service = StatisticsRecalculationService(db)
        recalculation_result = recalculation_service.recalculate_after_sale_item_weight_update(
            sale_id=sale_uuid,
            item_id=item_uuid,
            old_weight=old_weight,
            new_weight=new_weight
        )
    except Exception as e:  # pragma: no cover - chemin de secours
        # En cas d'échec du recalcul, on conserve la modification de poids
        # mais on trace l'erreur dans les détails d'audit.
        recalculation_result = {"error": str(e)}
    
    # Logger l'audit
    log_audit(
        action_type=AuditActionType.SYSTEM_CONFIG_CHANGED,
        actor=current_user,
        target_id=item_uuid,
        target_type="sale_item",
        details={
            "sale_id": str(sale_uuid),
            "item_id": str(item_uuid),
            "old_weight": old_weight,
            "new_weight": new_weight,
            "weight_delta": new_weight - old_weight,
            "recalculation_result": recalculation_result
        },
        description=f"Modification du poids d'un item de vente: {old_weight} kg → {new_weight} kg",
        db=db
    )
    
    db.commit()
    db.refresh(item)
    
    # Construire la réponse
    return SaleItemResponse(
        id=str(item.id),
        sale_id=str(item.sale_id),
        category=item.category,
        quantity=item.quantity,
        weight=float(item.weight) if item.weight else 0.0,
        unit_price=float(item.unit_price),
        total_price=float(item.total_price),
        preset_id=str(item.preset_id) if item.preset_id else None,
        notes=item.notes
    )


@router.post("/", response_model=SaleResponse)
async def create_sale(
    sale_data: SaleCreate,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """
    Create new sale with items and operator traceability.

    STORY-B12-P5: Finalisation du Ticket de Caisse
    - Accepts: category, weight (kg), unit_price, total_price for each item
    - CRITICAL: total_amount = sum of all total_price (NO multiplication by weight)
    - Example: Item with weight=2.5kg and total_price=15.0 contributes 15.0 to total (NOT 37.5)
    """
    # Enforce 401 when no Authorization header is provided
    if credentials is None:
        raise HTTPException(status_code=401, detail="Unauthorized", headers={"WWW-Authenticate": "Bearer"})

    # Validate token and extract user_id (operator)
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized", headers={"WWW-Authenticate": "Bearer"})

    # Récupérer la session pour vérifier si elle est différée (B44-P1)
    cash_session = db.query(CashSession).filter(CashSession.id == sale_data.cash_session_id).first()
    if not cash_session:
        raise HTTPException(status_code=404, detail="Session de caisse non trouvée")
    
    # B51-P5 FIX 3: Validation supplémentaire (sécurité backend)
    # Note: Le problème principal est résolu côté frontend, mais cette validation
    # empêche toute création de vente si le frontend est contourné
    if cash_session.status != CashSessionStatus.OPEN:
        raise HTTPException(
            status_code=422,
            detail=f"Impossible de créer une vente pour une session fermée (statut: {cash_session.status.value})"
        )
    
    # Story B49-P2: Validation métier pour mode prix global
    # Calculer le sous-total (somme des total_price des items avec prix >0)
    subtotal = sum(item.total_price for item in sale_data.items if item.total_price > 0)
    
    # Validation : si un sous-total existe, total_amount doit être >= sous-total
    if subtotal > 0 and sale_data.total_amount < subtotal:
        raise HTTPException(
            status_code=400,
            detail=f"Le total ({sale_data.total_amount}) ne peut pas être inférieur au sous-total ({subtotal})"
        )
    
    # Story B52-P1: Validation des paiements multiples
    # Si payments est fourni, utiliser payments; sinon utiliser payment_method pour rétrocompatibilité
    payments_to_create = []
    if sale_data.payments:
        # Paiements multiples
        total_payments = sum(p.amount for p in sale_data.payments)
        if total_payments < sale_data.total_amount:
            raise HTTPException(
                status_code=400,
                detail=f"La somme des paiements ({total_payments}) doit être supérieure ou égale au total ({sale_data.total_amount})"
            )
        payments_to_create = sale_data.payments
    elif sale_data.payment_method:
        # Rétrocompatibilité : créer un paiement unique depuis payment_method
        from recyclic_api.schemas.sale import PaymentCreate
        payments_to_create = [PaymentCreate(
            payment_method=sale_data.payment_method,
            amount=sale_data.total_amount
        )]
    else:
        # Par défaut : espèces
        from recyclic_api.schemas.sale import PaymentCreate
        from recyclic_api.models.sale import PaymentMethod
        payments_to_create = [PaymentCreate(
            payment_method=PaymentMethod.CASH,
            amount=sale_data.total_amount
        )]
    
    # Story B52-P3: Déterminer sale_date (date réelle du ticket) et created_at (date d'enregistrement)
    # Pour sessions normales : sale_date = NOW(), created_at = NOW() (même valeur)
    # Pour sessions différées : sale_date = opened_at (date du cahier), created_at = NOW() (date de saisie)
    now = datetime.now(timezone.utc)
    sale_date = now  # Par défaut, sale_date = NOW() pour sessions normales
    
    if cash_session.opened_at:
        # S'assurer que opened_at est timezone-aware pour la comparaison
        session_opened_at = cash_session.opened_at
        if session_opened_at.tzinfo is None:
            session_opened_at = session_opened_at.replace(tzinfo=timezone.utc)
        
        # Story B52-P3: Une session est différée si opened_at est à plus de 24 heures dans le passé
        # Cela distingue les sessions différées (créées avec opened_at personnalisé) des sessions normales
        # qui durent simplement longtemps. Un seuil de 24h évite d'utiliser opened_at pour les sessions
        # normales qui ont été ouvertes hier mais qui continuent aujourd'hui.
        time_diff_hours = (now - session_opened_at).total_seconds() / 3600
        if time_diff_hours > 24:  # Plus de 24 heures dans le passé = session différée
            sale_date = session_opened_at  # Date réelle du ticket = date du cahier
    
    # Create the sale with operator_id for traceability
    # Story 1.1.2: preset_id et notes sont maintenant sur sale_items (par item individuel)
    # Story B40-P5: Ajout du champ note sur le ticket de caisse
    # Story B52-P3: sale_date = date réelle du ticket, created_at = date d'enregistrement (toujours NOW())
    db_sale = Sale(
        cash_session_id=sale_data.cash_session_id,
        operator_id=user_id,  # Associate sale with current operator
        total_amount=sale_data.total_amount,
        donation=sale_data.donation,
        payment_method=sale_data.payment_method,
        note=sale_data.note,  # Story B40-P5: Notes sur les tickets
        sale_date=sale_date  # Story B52-P3: Date réelle du ticket
    )
    # created_at sera automatiquement défini à NOW() par le modèle (server_default)
    
    db.add(db_sale)
    db.flush()  # Get the sale ID
    
    # Create sale items - Story 1.1.2: Support preset_id and notes per item
    for item_data in sale_data.items:
        db_item = SaleItem(
            sale_id=db_sale.id,
            category=item_data.category,
            quantity=item_data.quantity,
            weight=item_data.weight,  # Poids en kg avec décimales
            unit_price=item_data.unit_price,
            total_price=item_data.total_price,  # Note: total_price = unit_price (pas de multiplication)
            preset_id=item_data.preset_id,  # Story 1.1.2: Preset par item
            notes=item_data.notes  # Story 1.1.2: Notes par item
        )
        db.add(db_item)

    # Story B52-P1: Créer les transactions de paiement
    for payment_data in payments_to_create:
        db_payment = PaymentTransaction(
            sale_id=db_sale.id,
            payment_method=payment_data.payment_method,
            amount=payment_data.amount
        )
        db.add(db_payment)

    # Commit to ensure the sale is in the database before querying
    db.commit()

    # Update cash session counters (cash_session déjà récupéré plus haut)
    if cash_session:
        # Calculate total sales and items for this session (includes the sale we just created)
        session_sales = db.query(
            func.coalesce(func.sum(Sale.total_amount), 0).label('total_sales'),
            func.count(Sale.id).label('total_items')
        ).filter(Sale.cash_session_id == sale_data.cash_session_id).first()

        # Update session with totals from all sales
        cash_session.total_sales = float(session_sales.total_sales)
        cash_session.total_items = session_sales.total_items
        cash_session.current_amount = cash_session.initial_amount + cash_session.total_sales

        db.commit()
    
    # B48-P2: Logger la validation paiement
    # Construire l'état du panier AVANT validation (items reçus dans la requête)
    cart_state_before = {
        "items_count": len(sale_data.items),
        "items": [
            {
                "id": f"item-{idx}",
                "category": item.category,
                "weight": item.weight,
                "price": item.total_price
            }
            for idx, item in enumerate(sale_data.items)
        ],
        "total": sale_data.total_amount
    }
    
    # État du panier APRÈS validation (devrait être vide car le frontend vide le panier après succès)
    cart_state_after = {
        "items_count": 0,
        "items": [],
        "total": 0.0
    }
    
    # Story B52-P1: Logger les paiements multiples
    payment_methods_log = [p.payment_method.value if hasattr(p.payment_method, 'value') else str(p.payment_method) for p in payments_to_create]
    payment_amounts_log = [float(p.amount) for p in payments_to_create]
    
    log_transaction_event("PAYMENT_VALIDATED", {
        "user_id": str(user_id),
        "session_id": str(sale_data.cash_session_id),
        "transaction_id": str(db_sale.id),
        "cart_state_before": cart_state_before,
        "cart_state_after": cart_state_after,
        "payment_method": payment_methods_log[0] if len(payment_methods_log) == 1 else None,  # Rétrocompatibilité
        "payment_methods": payment_methods_log,  # Story B52-P1: Liste des méthodes de paiement
        "payment_amounts": payment_amounts_log,  # Story B52-P1: Liste des montants
        "amount": float(sale_data.total_amount)
    })
    
    # Story B52-P1: Eager load payments pour la réponse
    db.refresh(db_sale)
    # Recharger avec les relations pour inclure les paiements dans la réponse
    db_sale = db.query(Sale).options(
        selectinload(Sale.payments),
        selectinload(Sale.items)
    ).filter(Sale.id == db_sale.id).first()
    return db_sale

@router.patch("/{sale_id}/items/{item_id}", response_model=SaleItemResponse)
async def update_sale_item(
    sale_id: str,
    item_id: str,
    item_update: SaleItemUpdate,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    """
    Update a sale item (preset, notes, quantity, weight, price).
    
    STORY-B52-P4: Amélioration éditeur d'item (destination et prix)
    - Preset and notes: editable by all operators
    - Price: editable by admin/super-admin only
    - Quantity and weight: editable by all operators
    - Price modifications are logged in audit log
    """
    # Enforce 401 when no Authorization header is provided
    if credentials is None:
        raise HTTPException(status_code=401, detail="Unauthorized", headers={"WWW-Authenticate": "Bearer"})

    # Validate token and extract user_id
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized", headers={"WWW-Authenticate": "Bearer"})

    # Get current user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Validate sale ID
    try:
        sale_uuid = UUID(sale_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid sale ID format")

    # Validate item ID
    try:
        item_uuid = UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    # Find the sale
    sale = db.query(Sale).filter(Sale.id == sale_uuid).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    # Find the item
    item = db.query(SaleItem).filter(SaleItem.id == item_uuid, SaleItem.sale_id == sale_uuid).first()
    if not item:
        raise HTTPException(status_code=404, detail="Sale item not found")

    # Check permissions for price modification
    if item_update.unit_price is not None:
        if user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions. Admin access required to modify price."
            )
        
        # Log price modification in audit log
        old_price = item.unit_price
        new_price = item_update.unit_price
        
        # Validate price >= 0
        if new_price < 0:
            raise HTTPException(status_code=400, detail="Price must be >= 0")
        
        log_audit(
            action_type=AuditActionType.SYSTEM_CONFIG_CHANGED,
            actor=user,
            target_id=item_uuid,
            target_type="sale_item",
            details={
                "sale_id": str(sale_uuid),
                "item_id": str(item_uuid),
                "old_price": float(old_price),
                "new_price": float(new_price),
                "user_id": str(user_id),
                "username": user.username or user.telegram_id
            },
            description=f"Price modification: {old_price} → {new_price} for item {item_id}",
            db=db
        )

    # Update fields
    if item_update.quantity is not None:
        if item_update.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be > 0")
        item.quantity = item_update.quantity
    
    if item_update.weight is not None:
        if item_update.weight <= 0:
            raise HTTPException(status_code=400, detail="Weight must be > 0")
        item.weight = item_update.weight
    
    if item_update.unit_price is not None:
        item.unit_price = item_update.unit_price
        # Recalculate total_price (total_price = unit_price for consistency with create_sale)
        item.total_price = item_update.unit_price
    
    if item_update.preset_id is not None:
        item.preset_id = item_update.preset_id
    
    if item_update.notes is not None:
        item.notes = item_update.notes

    db.commit()
    db.refresh(item)
    
    return item
