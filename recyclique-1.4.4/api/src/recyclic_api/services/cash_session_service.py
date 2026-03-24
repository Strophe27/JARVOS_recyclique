from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func, cast, String
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timedelta, timezone
import json

from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.schemas.cash_register import WorkflowOptions
from uuid import UUID
from recyclic_api.models.user import User
from recyclic_api.models.sale import Sale, PaymentMethod
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.ligne_depot import LigneDepot
from recyclic_api.models.ticket_depot import TicketDepot
from recyclic_api.schemas.cash_session import CashSessionFilters
from recyclic_api.core.logging import log_transaction_event


class CashSessionService:
    """Service pour la gestion des sessions de caisse."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_session(self, operator_id: str, site_id: str, initial_amount: float, register_id: Optional[str] = None, opened_at: Optional[datetime] = None) -> CashSession:
        """Crée une nouvelle session de caisse.
        
        Args:
            operator_id: ID de l'opérateur
            site_id: ID du site
            initial_amount: Montant initial du fond de caisse
            register_id: ID du poste de caisse (optionnel)
            opened_at: Date d'ouverture personnalisée (optionnel, pour saisie différée)
        
        Raises:
            ValueError: Si opened_at est dans le futur ou si une session est déjà ouverte
        """
        try:
            # Validation de opened_at si fourni
            if opened_at is not None:
                now = datetime.now(timezone.utc)
                # S'assurer que opened_at est timezone-aware
                if opened_at.tzinfo is None:
                    opened_at = opened_at.replace(tzinfo=timezone.utc)
                # Vérifier que la date n'est pas dans le futur
                if opened_at > now:
                    raise ValueError("La date d'ouverture ne peut pas être dans le futur")
            
            # Vérifier que l'opérateur existe
            # Ensure UUID types for DB comparisons
            operator_uuid = UUID(str(operator_id)) if not isinstance(operator_id, UUID) else operator_id
            site_uuid = UUID(str(site_id)) if not isinstance(site_id, UUID) else site_id
            register_uuid: Optional[UUID]
            if register_id is not None:
                register_uuid = UUID(str(register_id)) if not isinstance(register_id, UUID) else register_id
            else:
                register_uuid = None

            operator = self.db.query(User).filter(User.id == operator_uuid).first()
            if not operator:
                raise ValueError("Opérateur non trouvé")

            # Déterminer le registre à utiliser si non fourni (compatibilité tests existants)
            if register_uuid is None:
                # Chercher un poste actif pour le site, sinon en créer un par défaut
                default_register = (
                    self.db.query(CashRegister)
                    .filter(
                        CashRegister.is_active.is_(True),
                        CashRegister.site_id == site_uuid,
                    )
                    .first()
                )
                if default_register is None:
                    default_register = CashRegister(name="Default Register", site_id=site_uuid, is_active=True)
                    self.db.add(default_register)
                    self.db.commit()
                    self.db.refresh(default_register)
                register_uuid = default_register.id  # type: ignore[assignment]

            # B44-P1: Unicité: pas de session ouverte pour ce registre
            # Exception: les sessions différées peuvent être créées même si le registre a une session normale ouverte
            if opened_at is None:
                # Pour les sessions normales, vérifier qu'il n'y a pas déjà une session ouverte pour ce registre
                existing_register_open = self.db.query(CashSession).filter(
                    CashSession.register_id == register_uuid,
                    CashSession.status == CashSessionStatus.OPEN
                ).first()
                if existing_register_open:
                    raise ValueError("Une session est déjà ouverte pour ce poste de caisse")
            # Pour les sessions différées, on permet la création même si le registre a une session normale ouverte

            # Créer la session avec opened_at personnalisé si fourni
            session_kwargs = {
                "operator_id": operator_uuid,
                "site_id": site_uuid,
                "register_id": register_uuid,
                "initial_amount": initial_amount,
                "current_amount": initial_amount,
                "status": CashSessionStatus.OPEN
            }
            
            # Si opened_at est fourni, l'utiliser (sinon le modèle utilisera func.now() par défaut)
            if opened_at is not None:
                session_kwargs["opened_at"] = opened_at
            
            cash_session = CashSession(**session_kwargs)

            self.db.add(cash_session)
            self.db.commit()
            self.db.refresh(cash_session)

            # B48-P2: Logger l'ouverture de session
            log_transaction_event("SESSION_OPENED", {
                "user_id": str(operator_uuid),
                "session_id": str(cash_session.id),
                "opened_at": cash_session.opened_at.isoformat() + "Z" if cash_session.opened_at else None
            })

            return cash_session
        except Exception as e:
            # Log any unexpected error in service layer
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in CashSessionService.create_session: {e}", exc_info=True)
            # Re-raise to let endpoint handle it properly
            raise
    
    def get_session_by_id(self, session_id: str) -> Optional[CashSession]:
        """Récupère une session par son ID."""
        sid = UUID(str(session_id)) if not isinstance(session_id, UUID) else session_id
        return self.db.query(CashSession).filter(CashSession.id == sid).first()
    
    def get_session_with_details(self, session_id: str) -> Optional[CashSession]:
        """Récupère une session avec toutes ses relations (opérateur, site, ventes)."""
        from sqlalchemy.orm import selectinload
        from recyclic_api.models.sale import Sale

        sid = UUID(str(session_id)) if not isinstance(session_id, UUID) else session_id
        return (
            self.db.query(CashSession)
            .options(
                selectinload(CashSession.operator),
                selectinload(CashSession.site),
                selectinload(CashSession.sales).selectinload(Sale.payments),  # Story B52-P1: Charger les paiements multiples
                selectinload(CashSession.register)  # Story B49-P1: Charger le register pour les options
            )
            .filter(CashSession.id == sid)
            .first()
        )

    def get_session_weight_aggregations(self, session: CashSession) -> Tuple[float, Dict[str, float]]:
        """B52-P6: Calcule les agrégations de poids pour une session de caisse.

        Cette méthode retourne :
        - le poids total sorti sur la session (somme de tous les SaleItem.weight)
        - un mapping {sale_id: total_weight} pour chaque vente de la session
        """
        # Agréger les poids par vente en une seule requête
        weight_rows = (
            self.db.query(
                Sale.id,
                func.coalesce(func.sum(SaleItem.weight), 0.0).label("total_weight"),
            )
            .join(SaleItem, SaleItem.sale_id == Sale.id)
            .filter(Sale.cash_session_id == session.id)
            .group_by(Sale.id)
            .all()
        )

        sale_weights: Dict[str, float] = {
            str(sale_id): float(total_weight or 0.0)
            for sale_id, total_weight in weight_rows
        }

        total_weight_out = float(sum(sale_weights.values())) if sale_weights else 0.0

        return total_weight_out, sale_weights
    
    def _get_register_options(self, register: Optional[CashRegister]) -> Dict[str, Any]:
        """Story B49-P1: Helper pour récupérer et valider les options de workflow d'un registre.
        
        Args:
            register: Le registre de caisse (peut être None)
            
        Returns:
            Dictionnaire validé des options de workflow (valeurs par défaut si None)
        """
        if not register or not register.workflow_options:
            return WorkflowOptions().model_dump()  # Retourne les valeurs par défaut

        try:
            # Assurez-vous que workflow_options est un dict, pas une chaîne JSON
            if isinstance(register.workflow_options, str):
                options_dict = json.loads(register.workflow_options)
            else:
                options_dict = register.workflow_options
            
            # Valider avec le schéma Pydantic pour s'assurer de la structure
            validated_options = WorkflowOptions.model_validate(options_dict)
            return validated_options.model_dump()
        except (json.JSONDecodeError, ValueError) as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Invalid workflow_options for register {register.id}: {e}. Returning default options.")
            return WorkflowOptions().model_dump()
    
    def get_register_options(self, session: CashSession) -> Optional[Dict[str, Any]]:
        """Story B49-P1: Récupère les options de workflow du register associé à la session.
        
        Args:
            session: La session de caisse
            
        Returns:
            Dictionnaire validé des options de workflow, ou None si aucun register associé
        """
        if not session.register_id:
            return None
        
        # Charger le register si pas déjà chargé
        if not hasattr(session, 'register') or session.register is None:
            register = self.db.query(CashRegister).filter(CashRegister.id == session.register_id).first()
            if not register:
                return None
        else:
            register = session.register
        
        # Utiliser la méthode helper qui valide avec Pydantic
        return self._get_register_options(register)
    
    def get_open_session_by_operator(self, operator_id: str) -> Optional[CashSession]:
        """Récupère la session ouverte d'un opérateur.
        
        Retourne uniquement les sessions normales (status = OPEN).
        Les sessions différées sont exclues en vérifiant que opened_at n'est pas
        trop dans le passé (seuil de 90 jours pour couvrir tous les cas d'usage).
        
        Pour les sessions différées, utiliser get_deferred_session_by_operator() ou
        get_deferred_session_by_date().
        
        Note: Les sessions normales peuvent rester ouvertes plusieurs jours sans limite.
        On utilise un seuil de 90 jours uniquement pour exclure les sessions différées
        qui ont été créées avec opened_at explicitement défini dans le passé lointain.
        """
        oid = UUID(str(operator_id)) if not isinstance(operator_id, UUID) else operator_id
        now = datetime.now(timezone.utc)
        # Seuil de 90 jours : exclure uniquement les sessions différées créées avec
        # opened_at explicitement défini dans le passé lointain. Les sessions normales
        # peuvent rester ouvertes indéfiniment.
        threshold = now - timedelta(days=90)
        return self.db.query(CashSession).filter(
            and_(
                CashSession.operator_id == oid,
                CashSession.status == CashSessionStatus.OPEN,
                # Exclure uniquement les sessions différées très anciennes
                # (sessions normales peuvent rester ouvertes indéfiniment)
                CashSession.opened_at >= threshold
            )
        ).first()

    def get_open_session_by_register(self, register_id: str) -> Optional[CashSession]:
        """Récupère la session ouverte pour un poste de caisse donné.
        
        Retourne uniquement les sessions normales (status = OPEN).
        Les sessions différées sont exclues en vérifiant que opened_at n'est pas
        trop dans le passé (seuil de 90 jours pour couvrir tous les cas d'usage).
        
        Pour les sessions différées, utiliser get_deferred_session_by_register() ou
        get_deferred_session_by_date().
        
        Note: Les sessions normales peuvent rester ouvertes plusieurs jours sans limite.
        On utilise un seuil de 90 jours uniquement pour exclure les sessions différées
        qui ont été créées avec opened_at explicitement défini dans le passé lointain.
        """
        rid = UUID(str(register_id)) if not isinstance(register_id, UUID) else register_id
        now = datetime.now(timezone.utc)
        # Seuil de 90 jours : exclure uniquement les sessions différées créées avec
        # opened_at explicitement défini dans le passé lointain. Les sessions normales
        # peuvent rester ouvertes indéfiniment.
        threshold = now - timedelta(days=90)
        return (
            self.db.query(CashSession)
            .filter(
                and_(
                    CashSession.register_id == rid,
                    CashSession.status == CashSessionStatus.OPEN,
                    # Exclure uniquement les sessions différées très anciennes
                    # (sessions normales peuvent rester ouvertes indéfiniment)
                    CashSession.opened_at >= threshold
                )
            )
            .first()
        )
    
    def get_deferred_session_by_operator(self, operator_id: str) -> Optional[CashSession]:
        """Récupère la session différée ouverte d'un opérateur.
        
        Retourne uniquement les sessions différées (opened_at à plus de 90 jours dans le passé).
        
        Note: Cette méthode est principalement utilisée pour le nettoyage. Pour rechercher
        une session différée par date spécifique, utiliser get_deferred_session_by_date().
        """
        oid = UUID(str(operator_id)) if not isinstance(operator_id, UUID) else operator_id
        now = datetime.now(timezone.utc)
        # Seuil de 90 jours : identifier les sessions différées créées avec opened_at
        # explicitement défini dans le passé lointain
        threshold = now - timedelta(days=90)
        return self.db.query(CashSession).filter(
            and_(
                CashSession.operator_id == oid,
                CashSession.status == CashSessionStatus.OPEN,
                # Inclure uniquement les sessions différées très anciennes
                CashSession.opened_at < threshold
            )
        ).first()
    
    def get_deferred_session_by_register(self, register_id: str) -> Optional[CashSession]:
        """Récupère la session différée ouverte pour un poste de caisse donné.
        
        Retourne uniquement les sessions différées (opened_at à plus de 90 jours dans le passé).
        
        Note: Cette méthode est principalement utilisée pour le nettoyage. Pour rechercher
        une session différée par date spécifique, utiliser get_deferred_session_by_date().
        """
        rid = UUID(str(register_id)) if not isinstance(register_id, UUID) else register_id
        now = datetime.now(timezone.utc)
        # Seuil de 90 jours : identifier les sessions différées créées avec opened_at
        # explicitement défini dans le passé lointain
        threshold = now - timedelta(days=90)
        return (
            self.db.query(CashSession)
            .filter(
                and_(
                    CashSession.register_id == rid,
                    CashSession.status == CashSessionStatus.OPEN,
                    # Inclure uniquement les sessions différées très anciennes
                    CashSession.opened_at < threshold
                )
            )
            .first()
        )
    
    def get_deferred_session_by_date(self, operator_id: str, target_date: datetime) -> Optional[CashSession]:
        """Récupère une session différée ouverte pour une date spécifique.
        
        Args:
            operator_id: ID de l'opérateur
            target_date: Date cible (doit être timezone-aware)
        
        Returns:
            La session différée ouverte pour cette date, ou None si aucune
        """
        oid = UUID(str(operator_id)) if not isinstance(operator_id, UUID) else operator_id
        
        # S'assurer que target_date est timezone-aware
        if target_date.tzinfo is None:
            target_date = target_date.replace(tzinfo=timezone.utc)
        
        # Calculer le début et la fin de la journée pour la date cible
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        now = datetime.now(timezone.utc)
        
        return (
            self.db.query(CashSession)
            .filter(
                and_(
                    CashSession.operator_id == oid,
                    CashSession.status == CashSessionStatus.OPEN,
                    # Session différée : opened_at < maintenant
                    CashSession.opened_at < now,
                    # Date correspond à la journée cible
                    CashSession.opened_at >= start_of_day,
                    CashSession.opened_at < end_of_day
                )
            )
            .first()
        )
    
    def get_sessions_with_filters(self, filters: CashSessionFilters) -> Tuple[List[CashSession], int]:
        """Récupère les sessions avec filtres et pagination."""
        query = self.db.query(CashSession)

        # Appliquer les filtres
        if filters.status:
            query = query.filter(CashSession.status == filters.status)
        if filters.operator_id:
            oid = UUID(str(filters.operator_id)) if not isinstance(filters.operator_id, UUID) else filters.operator_id
            query = query.filter(CashSession.operator_id == oid)
        if filters.site_id:
            sid = UUID(str(filters.site_id)) if not isinstance(filters.site_id, UUID) else filters.site_id
            query = query.filter(CashSession.site_id == sid)
        if getattr(filters, 'register_id', None):
            rid = UUID(str(filters.register_id)) if not isinstance(filters.register_id, UUID) else filters.register_id
            query = query.filter(CashSession.register_id == rid)
        if filters.date_from:
            date_from = filters.date_from
            if date_from.tzinfo is None:
                date_from = date_from.replace(tzinfo=timezone.utc)
            query = query.filter(CashSession.opened_at >= date_from)
        if filters.date_to:
            date_to = filters.date_to
            if date_to.tzinfo is None:
                date_to = date_to.replace(tzinfo=timezone.utc)
            query = query.filter(CashSession.opened_at <= date_to)

        # Recherche textuelle
        if getattr(filters, 'search', None):
            search_value = f"%{filters.search.strip()}%"
            query = query.join(User, User.id == CashSession.operator_id).filter(
                or_(
                    User.username.ilike(search_value),
                    cast(CashSession.id, String).ilike(search_value)
                )
            )

        # B44-P3: Exclure les sessions vides par défaut (sauf si include_empty=True)
        include_empty = getattr(filters, 'include_empty', False)
        if not include_empty:
            # Exclure les sessions où total_sales = 0 ET total_items = 0
            # (sessions vides sans transaction)
            query = query.filter(
                or_(
                    CashSession.total_sales > 0,
                    CashSession.total_items > 0,
                    CashSession.total_sales.is_(None),  # Inclure les sessions non calculées
                    CashSession.total_items.is_(None)   # Inclure les sessions non calculées
                )
            )

        # B45-P2: Filtres avancés - Montant (CA total)
        if getattr(filters, 'amount_min', None) is not None:
            # Exclure les sessions avec total_sales=None car on ne peut pas les comparer
            query = query.filter(
                and_(
                    CashSession.total_sales.isnot(None),
                    CashSession.total_sales >= filters.amount_min
                )
            )
        if getattr(filters, 'amount_max', None) is not None:
            # Exclure les sessions avec total_sales=None car on ne peut pas les comparer
            query = query.filter(
                and_(
                    CashSession.total_sales.isnot(None),
                    CashSession.total_sales <= filters.amount_max
                )
            )

        # B45-P2: Filtres avancés - Variance
        if getattr(filters, 'variance_threshold', None) is not None:
            # Filtrer par seuil de variance (valeur absolue)
            # Exclure les sessions avec variance=None car on ne peut pas les comparer
            query = query.filter(
                and_(
                    CashSession.variance.isnot(None),
                    func.abs(CashSession.variance) >= filters.variance_threshold
                )
            )
        if getattr(filters, 'variance_has_variance', None) is not None:
            if filters.variance_has_variance:
                # Avec variance (non-null et != 0)
                query = query.filter(
                    and_(
                        CashSession.variance.isnot(None),
                        CashSession.variance != 0.0
                    )
                )
            else:
                # Sans variance (null ou = 0)
                query = query.filter(
                    or_(
                        CashSession.variance.is_(None),
                        CashSession.variance == 0.0
                    )
                )

        # B45-P2: Filtres avancés - Durée de session
        if getattr(filters, 'duration_min_hours', None) is not None or getattr(filters, 'duration_max_hours', None) is not None:
            # Calculer la durée en heures (closed_at - opened_at)
            # Seulement pour les sessions fermées (closed_at non null)
            duration_seconds = func.extract('epoch', CashSession.closed_at - CashSession.opened_at)
            duration_hours = duration_seconds / 3600.0
            
            if filters.duration_min_hours is not None:
                query = query.filter(
                    and_(
                        CashSession.closed_at.isnot(None),  # Seulement sessions fermées
                        duration_hours >= filters.duration_min_hours
                    )
                )
            if filters.duration_max_hours is not None:
                query = query.filter(
                    and_(
                        CashSession.closed_at.isnot(None),  # Seulement sessions fermées
                        duration_hours <= filters.duration_max_hours
                    )
                )

        # B45-P2: Filtres avancés - Méthodes de paiement (multi-sélection)
        if getattr(filters, 'payment_methods', None) and len(filters.payment_methods) > 0:
            # Filtrer les sessions qui ont au moins une vente avec une des méthodes de paiement spécifiées
            # Utiliser EXISTS pour éviter les doublons
            payment_method_enums = [PaymentMethod(method) for method in filters.payment_methods if method in [pm.value for pm in PaymentMethod]]
            if payment_method_enums:
                subquery = (
                    self.db.query(Sale.id)
                    .filter(
                        and_(
                            Sale.cash_session_id == CashSession.id,
                            Sale.payment_method.in_(payment_method_enums)
                        )
                    )
                    .exists()
                )
                query = query.filter(subquery)

        # B45-P2: Filtres avancés - Présence de don
        if getattr(filters, 'has_donation', None) is not None:
            if filters.has_donation:
                # Avec don (au moins une vente avec donation > 0)
                subquery = (
                    self.db.query(Sale.id)
                    .filter(
                        and_(
                            Sale.cash_session_id == CashSession.id,
                            Sale.donation.isnot(None),
                            Sale.donation > 0.0
                        )
                    )
                    .exists()
                )
                query = query.filter(subquery)
            else:
                # Sans don (aucune vente avec donation > 0)
                # Utiliser NOT EXISTS pour les sessions sans don
                subquery = (
                    self.db.query(Sale.id)
                    .filter(
                        and_(
                            Sale.cash_session_id == CashSession.id,
                            Sale.donation.isnot(None),
                            Sale.donation > 0.0
                        )
                    )
                    .exists()
                )
                query = query.filter(~subquery)

        # Compter le total avant la pagination
        total = query.count()

        # Appliquer la pagination et l'ordre
        sessions = query.order_by(desc(CashSession.opened_at)).offset(filters.skip).limit(filters.limit).all()
        session_ids = [s.id for s in sessions]

        if not session_ids:
            return [], total

        # --- Optimisation N+1 ---
        # 1. Calculer le nombre de ventes par session en une seule requête
        sales_count_subq = (
            self.db.query(
                Sale.cash_session_id,
                func.count(Sale.id).label("sales_count")
            )
            .filter(Sale.cash_session_id.in_(session_ids))
            .group_by(Sale.cash_session_id)
            .subquery()
        )

        # 2. Calculer la somme des dons par session en une seule requête
        donations_sum_subq = (
            self.db.query(
                Sale.cash_session_id,
                func.sum(Sale.donation).label("total_donations")
            )
            .filter(Sale.cash_session_id.in_(session_ids), Sale.donation.isnot(None))
            .group_by(Sale.cash_session_id)
            .subquery()
        )

        # Récupérer les résultats des agrégations
        sales_counts = self.db.query(sales_count_subq).all()
        donations_sums = self.db.query(donations_sum_subq).all()

        # Mapper les résultats dans des dictionnaires pour un accès rapide
        sales_map = {str(sid): count for sid, count in sales_counts}
        donations_map = {str(sid): total for sid, total in donations_sums}

        # Enrichir les sessions sans requêtes supplémentaires dans la boucle
        for session in sessions:
            session.number_of_sales = sales_map.get(str(session.id), 0)
            session.total_donations = float(donations_map.get(str(session.id), 0.0))

        return sessions, total
    
    def update_session(self, session_id: str, update_data: Dict[str, Any]) -> Optional[CashSession]:
        """Met à jour une session de caisse."""
        session = self.get_session_by_id(session_id)
        if not session:
            return None
        
        # Mettre à jour les champs fournis
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(session, field) and value is not None:
                setattr(session, field, value)
        
        # Si on ferme la session, mettre à jour la date de fermeture
        if update_data.status == CashSessionStatus.CLOSED:
            session.closed_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(session)
        
        return session
    
    def close_session(self, session_id: str) -> Optional[CashSession]:
        """Ferme une session de caisse."""
        session = self.get_session_by_id(session_id)
        if not session:
            return None
        
        if session.status == CashSessionStatus.CLOSED:
            return session
        
        session.status = CashSessionStatus.CLOSED
        session.closed_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(session)
        
        return session

    def is_session_empty(self, session: CashSession) -> bool:
        """B44-P3: Vérifie si une session est vide (aucune transaction).
        
        Une session est considérée comme vide si :
        - total_sales est 0 (ou None/null)
        - ET total_items est 0 (ou None/null)
        
        Args:
            session: La session à vérifier
            
        Returns:
            True si la session est vide, False sinon
        """
        total_sales = session.total_sales or 0.0
        total_items = session.total_items or 0
        
        return total_sales == 0.0 and total_items == 0

    def delete_session(self, session_id: str) -> bool:
        """B44-P3: Supprime une session de caisse et toutes ses ventes associées (cascade).
        
        Args:
            session_id: ID de la session à supprimer
            
        Returns:
            True si la session a été supprimée, False si elle n'existe pas
        """
        session = self.get_session_by_id(session_id)
        if not session:
            return False
        
        # La suppression en cascade des ventes est gérée par la relation SQLAlchemy
        # (cascade="all, delete-orphan" dans le modèle)
        self.db.delete(session)
        self.db.commit()
        
        return True

    def close_session_with_amounts(self, session_id: str, actual_amount: float, variance_comment: str = None) -> Optional[CashSession]:
        """B44-P3: Ferme une session de caisse avec contrôle des montants.
        
        Si la session est vide (aucune transaction), elle est supprimée au lieu d'être fermée.
        
        Args:
            session_id: ID de la session à fermer
            actual_amount: Montant physique compté
            variance_comment: Commentaire sur l'écart (optionnel)
            
        Returns:
            La session fermée, ou None si la session était vide et a été supprimée
        """
        session = self.get_session_by_id(session_id)
        if not session:
            return None
        
        if session.status == CashSessionStatus.CLOSED:
            return session
        
        # B44-P3: Vérifier si la session est vide avant de la fermer
        if self.is_session_empty(session):
            # Session vide : supprimer au lieu de fermer
            self.delete_session(session_id)
            return None
        
        # Session avec transactions : fermer normalement
        # B50-P10: Calculer le montant théorique en incluant les dons
        total_donations = self.db.query(func.coalesce(func.sum(Sale.donation), 0)).filter(
            Sale.cash_session_id == session_id
        ).scalar() or 0.0
        total_donations = float(total_donations)
        
        # Calculer le montant théorique (fond initial + ventes + dons)
        theoretical_amount = session.initial_amount + (session.total_sales or 0) + total_donations
        
        # Utiliser la nouvelle méthode du modèle avec le montant théorique calculé
        session.close_with_amounts(actual_amount, variance_comment, theoretical_amount)
        
        self.db.commit()
        self.db.refresh(session)
        
        return session
    
    def add_sale_to_session(self, session_id: str, amount: float) -> bool:
        """Ajoute une vente à une session."""
        session = self.get_session_by_id(session_id)
        if not session or session.status != CashSessionStatus.OPEN:
            return False
        
        session.add_sale(amount)
        self.db.commit()
        
        return True
    
    def get_session_stats(self, date_from: Optional[datetime] = None,
                         date_to: Optional[datetime] = None,
                         site_id: Optional[str] = None) -> Dict[str, Any]:
        """Récupère les statistiques des sessions et agrégations KPI.
        
        Exclut automatiquement les sessions différées (sessions avec opened_at dans le passé
        par rapport à date_from). Cela garantit que les stats live n'incluent que les sessions
        réellement ouvertes dans la période demandée.
        """
        query = self.db.query(CashSession)
        
        if site_id:
            sid = UUID(str(site_id)) if not isinstance(site_id, UUID) else site_id
            query = query.filter(CashSession.site_id == sid)
        
        # Appliquer les filtres de date
        # CRITICAL: Exclure les sessions différées en s'assurant que opened_at >= date_from
        # Les sessions différées ont opened_at dans le passé, donc elles seront automatiquement exclues
        if date_from:
            # Rendre la date consciente du fuseau horaire (UTC)
            if date_from.tzinfo is None:
                date_from = date_from.replace(tzinfo=timezone.utc)
            # Filtrer pour exclure les sessions différées (opened_at < date_from)
            query = query.filter(CashSession.opened_at >= date_from)
        if date_to:
            # Rendre la date consciente du fuseau horaire (UTC)
            if date_to.tzinfo is None:
                date_to = date_to.replace(tzinfo=timezone.utc)
            query = query.filter(CashSession.opened_at <= date_to)
        
        # Statistiques de base
        total_sessions = query.count()
        open_sessions = query.filter(CashSession.status == CashSessionStatus.OPEN).count()
        closed_sessions = query.filter(CashSession.status == CashSessionStatus.CLOSED).count()
        
        # Récupérer l'ensemble des IDs de sessions filtrées
        session_ids_subq = query.with_entities(CashSession.id).subquery()

        # Construire la requête de base pour les ventes avec filtres de date
        # IMPORTANT: Filtrer les ventes par leur date de création, pas seulement par session
        # Cela garantit que les stats quotidiennes sont correctes
        sales_query = self.db.query(Sale).filter(
            Sale.cash_session_id.in_(self.db.query(session_ids_subq.c.id))
        )
        
        # Filtrer les ventes par leur date de création si des dates sont fournies
        # C'est crucial pour avoir les bonnes stats quotidiennes
        if date_from:
            if date_from.tzinfo is None:
                date_from = date_from.replace(tzinfo=timezone.utc)
            sales_query = sales_query.filter(Sale.created_at >= date_from)
        if date_to:
            if date_to.tzinfo is None:
                date_to = date_to.replace(tzinfo=timezone.utc)
            sales_query = sales_query.filter(Sale.created_at <= date_to)

        # Nombre de ventes (COUNT sur Sale avec filtres de date)
        number_of_sales = int(sales_query.count() or 0)

        # Total des ventes (SUM sur Sale.total_amount avec filtres de date)
        # Utiliser les ventes filtrées par date, pas le champ total_sales de la session
        total_sales_result = (
            sales_query
            .with_entities(func.sum(Sale.total_amount))
            .scalar()
        )
        total_sales = float(total_sales_result or 0.0)

        # Total des articles (COUNT sur SaleItem avec filtres de date)
        sale_ids_subq = sales_query.with_entities(Sale.id).subquery()
        total_items_result = (
            self.db.query(func.count(SaleItem.id))
            .join(Sale, SaleItem.sale_id == Sale.id)
            .filter(Sale.id.in_(self.db.query(sale_ids_subq.c.id)))
            .scalar()
        )
        total_items = int(total_items_result or 0)

        # Total des dons (SUM sur Sale.donation avec filtres de date)
        total_donations_result = (
            sales_query
            .with_entities(func.sum(Sale.donation))
            .scalar()
        )
        total_donations = float(total_donations_result or 0.0)

        # Poids total vendu (SUM sur SaleItem.weight avec filtres de date)
        total_weight_result = (
            self.db.query(func.sum(SaleItem.weight))
            .join(Sale, SaleItem.sale_id == Sale.id)
            .filter(Sale.id.in_(self.db.query(sale_ids_subq.c.id)))
            .scalar()
        )
        poids_ventes = float(total_weight_result or 0.0)
        
        # Story B48-P3: Ajouter les sorties depuis réception (is_exit=true) pour weight_out
        if date_from and date_to:
            poids_exit_reception = (
                self.db.query(func.coalesce(func.sum(LigneDepot.poids_kg), 0))
                .join(TicketDepot, LigneDepot.ticket_id == TicketDepot.id)
                .filter(
                    and_(
                        LigneDepot.is_exit == True,  # Uniquement les sorties
                        TicketDepot.created_at >= date_from,
                        TicketDepot.created_at <= date_to
                    )
                )
                .scalar()
            )
            poids_exit_reception = float(poids_exit_reception or 0.0)
        else:
            poids_exit_reception = 0.0
        
        total_weight_sold = poids_ventes + poids_exit_reception
        
        # Durée moyenne des sessions fermées
        closed_sessions_with_duration = query.filter(
            and_(
                CashSession.status == CashSessionStatus.CLOSED,
                CashSession.closed_at.isnot(None)
            )
        ).all()
        
        if closed_sessions_with_duration:
            total_duration = sum(
                (session.closed_at - session.opened_at).total_seconds() / 3600
                for session in closed_sessions_with_duration
            )
            average_duration = total_duration / len(closed_sessions_with_duration)
        else:
            average_duration = None
        
        return {
            "total_sessions": total_sessions,
            "open_sessions": open_sessions,
            "closed_sessions": closed_sessions,
            "total_sales": total_sales,
            "total_items": total_items,
            "number_of_sales": number_of_sales,
            "total_donations": total_donations,
            "total_weight_sold": total_weight_sold,
            "average_session_duration": average_duration,
        }
    
    def get_operator_sessions(self, operator_id: str, limit: int = 10) -> List[CashSession]:
        """Récupère les dernières sessions d'un opérateur."""
        oid = UUID(str(operator_id)) if not isinstance(operator_id, UUID) else operator_id
        return self.db.query(CashSession).filter(
            CashSession.operator_id == oid
        ).order_by(desc(CashSession.opened_at)).limit(limit).all()
    
    def get_daily_sessions(self, date: datetime) -> List[CashSession]:
        """Récupère les sessions d'une journée donnée."""
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        return self.db.query(CashSession).filter(
            and_(
                CashSession.opened_at >= start_of_day,
                CashSession.opened_at < end_of_day
            )
        ).order_by(CashSession.opened_at).all()
