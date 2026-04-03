"""
Service de recalcul des statistiques après modification du poids.

Story B52-P2: Permet de recalculer uniquement les statistiques affectées
après modification du poids d'un item de vente ou d'une ligne de réception.
"""
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.sale import Sale
from recyclic_api.models.ligne_depot import LigneDepot
from recyclic_api.models.ticket_depot import TicketDepot
from recyclic_api.models.cash_session import CashSession


class StatisticsRecalculationService:
    """Service pour recalculer les statistiques après modification du poids."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def recalculate_after_sale_item_weight_update(
        self,
        sale_id: UUID,
        item_id: UUID,
        old_weight: float,
        new_weight: float
    ) -> Dict[str, Any]:
        """
        Recalcule les statistiques après modification du poids d'un item de vente.
        
        Args:
            sale_id: ID de la vente
            item_id: ID de l'item modifié
            old_weight: Ancien poids
            new_weight: Nouveau poids
            
        Returns:
            Dict avec les statistiques recalculées
        """
        # Récupérer la vente et sa session
        sale = self.db.query(Sale).filter(Sale.id == sale_id).first()
        if not sale:
            return {}
        
        # Recalculer le poids total de la session
        if sale.cash_session_id:
            session = self.db.query(CashSession).filter(
                CashSession.id == sale.cash_session_id
            ).first()
            
            if session:
                # Recalculer le poids total des ventes de la session
                total_weight_result = (
                    self.db.query(func.sum(SaleItem.weight))
                    .join(Sale, SaleItem.sale_id == Sale.id)
                    .filter(Sale.cash_session_id == session.id)
                    .scalar()
                )
                # Note: Le poids total de session n'est pas stocké dans CashSession,
                # mais peut être recalculé à la volée via get_session_stats()
        
        return {
            "sale_id": str(sale_id),
            "item_id": str(item_id),
            "old_weight": old_weight,
            "new_weight": new_weight,
            "weight_delta": new_weight - old_weight
        }
    
    def recalculate_after_ligne_weight_update(
        self,
        ticket_id: UUID,
        ligne_id: UUID,
        old_weight: float,
        new_weight: float
    ) -> Dict[str, Any]:
        """
        Recalcule les statistiques après modification du poids d'une ligne de réception.
        
        Args:
            ticket_id: ID du ticket
            ligne_id: ID de la ligne modifiée
            old_weight: Ancien poids
            new_weight: Nouveau poids
            
        Returns:
            Dict avec les statistiques recalculées
        """
        # Récupérer la ligne pour obtenir ses propriétés (is_exit, destination)
        ligne = self.db.query(LigneDepot).filter(LigneDepot.id == ligne_id).first()
        if not ligne:
            return {}
        
        # Les statistiques de réception sont calculées à la volée dans les services
        # (ReceptionLiveStatsService, StatsService), donc pas besoin de recalculer
        # ici. Le recalcul se fera automatiquement lors de la prochaine requête.
        
        return {
            "ticket_id": str(ticket_id),
            "ligne_id": str(ligne_id),
            "old_weight": old_weight,
            "new_weight": new_weight,
            "weight_delta": new_weight - old_weight,
            "is_exit": ligne.is_exit,
            "destination": ligne.destination.value if ligne.destination else None
        }
    
    def invalidate_cache_for_date_range(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> None:
        """
        Invalide le cache des statistiques pour une plage de dates.
        
        Note: Pour l'instant, les statistiques sont calculées à la volée,
        donc cette méthode est un placeholder pour une future implémentation
        de cache (Redis, etc.).
        
        Args:
            date_from: Date de début (optionnel)
            date_to: Date de fin (optionnel)
        """
        # TODO: Implémenter l'invalidation de cache si un système de cache est ajouté
        pass



