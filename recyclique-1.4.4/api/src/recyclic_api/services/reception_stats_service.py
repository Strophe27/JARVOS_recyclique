"""
Service for live reception statistics aggregation.
"""
from __future__ import annotations

from typing import Optional, Literal, Dict, Any
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from prometheus_client import Counter, Histogram

from recyclic_api.models.ticket_depot import TicketDepot, TicketDepotStatus
from recyclic_api.models.ligne_depot import LigneDepot
from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.poste_reception import PosteReception
from recyclic_api.models.cash_session import CashSession

# Prometheus metrics - créées au niveau du module pour éviter les duplications
_stats_requests = Counter(
    'reception_live_stats_requests_total',
    'Total number of live stats requests'
)
_stats_duration = Histogram(
    'reception_live_stats_duration_seconds',
    'Time spent calculating live stats'
)
_stats_errors = Counter(
    'reception_live_stats_errors_total',
    'Total number of errors during stats calculation'
)


class ReceptionLiveStatsService:
    """
    Service for calculating live reception statistics.
    Provides real-time aggregation of reception KPIs for the admin dashboard.
    """

    def __init__(self, db: Session) -> None:
        self.db = db
        # Les métriques Prometheus sont définies au niveau du module pour éviter les duplications

    async def get_live_stats(self, site_id: Optional[str] = None) -> dict:
        """
        Calculate live reception statistics for the admin dashboard.

        Args:
            site_id: Optional site filter (for future multi-site support)

        Returns:
            Dict containing:
            - tickets_open: Count of currently open tickets
            - tickets_closed_24h: Count of tickets closed in last 24h
            - turnover_eur: Total sales amount in EUR for last 24h
            - donations_eur: Total donations in EUR for last 24h
            - weight_in: Total weight received in kg (open + closed in 24h)
            - weight_out: Total weight sold in kg (sales in last 24h)

        Raises:
            ValueError: If site_id format is invalid
            RuntimeError: If database query fails
        """
        # Input validation
        if site_id is not None and not isinstance(site_id, str):
            raise ValueError("site_id must be a string or None")

        with _stats_duration.time():
            try:
                _stats_requests.inc()

                # Calculate time threshold (24 hours ago)
                threshold_24h = datetime.now(timezone.utc) - timedelta(hours=24)
                
                # Calculate start of today (00:00:00) to exclude deferred tickets/sessions
                # This ensures that only tickets/sessions opened today are included in live stats
                now = datetime.now(timezone.utc)
                start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

                # 1. Count open tickets (exclude deferred tickets)
                tickets_open = self._count_open_tickets(site_id, start_of_today)

                # 2. Count tickets closed in last 24h (exclude deferred tickets)
                tickets_closed_24h = self._count_closed_tickets_24h(site_id, threshold_24h, start_of_today)

                # 3. Count items/lines received (from closed tickets in 24h, exclude deferred)
                items_received = self._count_items_received_24h(site_id, threshold_24h, start_of_today)

                # 4. Calculate turnover (sales in last 24h, exclude deferred sessions)
                turnover_eur = self._calculate_turnover_24h(site_id, threshold_24h, start_of_today)

                # 5. Calculate donations (from sales in last 24h, exclude deferred sessions)
                donations_eur = self._calculate_donations_24h(site_id, threshold_24h, start_of_today)

                # 6. Calculate weight received (open tickets + closed in 24h, exclude deferred)
                weight_in = self._calculate_weight_in(site_id, threshold_24h, start_of_today)

                # 7. Calculate weight sold (from sales in last 24h, exclude deferred sessions)
                weight_out = self._calculate_weight_out(site_id, threshold_24h, start_of_today)

                return {
                    "tickets_open": tickets_open,
                    "tickets_closed_24h": tickets_closed_24h,
                    "items_received": items_received,
                    "turnover_eur": float(turnover_eur),
                    "donations_eur": float(donations_eur),
                    "weight_in": float(weight_in),
                    "weight_out": float(weight_out),
                }

            except Exception as e:
                _stats_errors.inc()
                # Re-raise with more context for debugging
                raise RuntimeError(f"Failed to calculate live reception stats: {str(e)}") from e

    def _count_open_tickets(self, site_id: Optional[str], start_of_today: datetime) -> int:
        """Count currently open tickets, excluding deferred tickets (tickets from posts opened in the past)."""
        query = self.db.query(func.count(TicketDepot.id)).join(
            PosteReception, TicketDepot.poste_id == PosteReception.id
        ).filter(
            and_(
                TicketDepot.status == TicketDepotStatus.OPENED.value,
                # Exclude deferred tickets: only include tickets from posts opened today
                PosteReception.opened_at >= start_of_today
            )
        )

        # Note: site filtering not implemented yet as tickets don't have direct site relationship
        # This will be added when multi-site support is implemented

        return query.scalar() or 0

    def _count_closed_tickets_24h(self, site_id: Optional[str], threshold: datetime, start_of_today: datetime) -> int:
        """Count tickets closed within the last 24 hours, excluding deferred tickets."""
        query = self.db.query(func.count(TicketDepot.id)).join(
            PosteReception, TicketDepot.poste_id == PosteReception.id
        ).filter(
            and_(
                TicketDepot.status == TicketDepotStatus.CLOSED.value,
                TicketDepot.closed_at.isnot(None),
                TicketDepot.closed_at >= threshold,
                # Exclude deferred tickets: only include tickets from posts opened today
                PosteReception.opened_at >= start_of_today
            )
        )

        return query.scalar() or 0

    def _count_items_received_24h(self, site_id: Optional[str], threshold: datetime, start_of_today: datetime) -> int:
        """Count items/lines received from tickets closed in the last 24 hours, excluding deferred tickets."""
        query = self.db.query(func.count(LigneDepot.id)).join(
            TicketDepot, LigneDepot.ticket_id == TicketDepot.id
        ).join(
            PosteReception, TicketDepot.poste_id == PosteReception.id
        ).filter(
            and_(
                TicketDepot.status == TicketDepotStatus.CLOSED.value,
                TicketDepot.closed_at.isnot(None),
                TicketDepot.closed_at >= threshold,
                # Exclude deferred tickets: only include tickets from posts opened today
                PosteReception.opened_at >= start_of_today
            )
        )

        return query.scalar() or 0

    def _calculate_turnover_24h(self, site_id: Optional[str], threshold: datetime, start_of_today: datetime) -> Decimal:
        """Calculate total sales amount in EUR for the last 24 hours, excluding sales from deferred sessions."""
        query = self.db.query(func.coalesce(func.sum(Sale.total_amount), 0)).join(
            CashSession, Sale.cash_session_id == CashSession.id
        ).filter(
            and_(
                Sale.created_at >= threshold,
                # Exclude deferred sessions: only include sales from sessions opened today
                CashSession.opened_at >= start_of_today
            )
        )

        # Note: For now, we calculate all sales in the last 24h
        # In the future, this could be filtered by site if sales are linked to sites

        return Decimal(str(query.scalar() or 0))

    def _calculate_donations_24h(self, site_id: Optional[str], threshold: datetime, start_of_today: datetime) -> Decimal:
        """Calculate total donations in EUR for the last 24 hours, excluding donations from deferred sessions."""
        query = self.db.query(func.coalesce(func.sum(Sale.donation), 0)).join(
            CashSession, Sale.cash_session_id == CashSession.id
        ).filter(
            and_(
                Sale.created_at >= threshold,
                Sale.donation.isnot(None),
                # Exclude deferred sessions: only include donations from sessions opened today
                CashSession.opened_at >= start_of_today
            )
        )

        return Decimal(str(query.scalar() or 0))

    def _calculate_weight_in(self, site_id: Optional[str], threshold: datetime, start_of_today: datetime) -> Decimal:
        """Calculate total weight received in kg (open tickets + closed in 24h), excluding deferred tickets and exit lines."""
        # Story B48-P3: Exclure les lignes avec is_exit=true du calcul weight_in
        # Rétrocompatibilité: inclure les lignes avec is_exit IS NULL (lignes existantes avant migration)
        
        # Get weight from open tickets (exclude deferred and exit lines)
        open_weight_query = self.db.query(func.coalesce(func.sum(LigneDepot.poids_kg), 0)).join(
            TicketDepot, LigneDepot.ticket_id == TicketDepot.id
        ).join(
            PosteReception, TicketDepot.poste_id == PosteReception.id
        ).filter(
            and_(
                TicketDepot.status == TicketDepotStatus.OPENED.value,
                # Exclude deferred tickets: only include tickets from posts opened today
                PosteReception.opened_at >= start_of_today,
                # Story B48-P3: Exclure les sorties (is_exit=true), inclure is_exit IS NULL pour rétrocompatibilité
                or_(LigneDepot.is_exit == False, LigneDepot.is_exit.is_(None))
            )
        )

        # Get weight from tickets closed in last 24h (exclude deferred and exit lines)
        closed_weight_query = self.db.query(func.coalesce(func.sum(LigneDepot.poids_kg), 0)).join(
            TicketDepot, LigneDepot.ticket_id == TicketDepot.id
        ).join(
            PosteReception, TicketDepot.poste_id == PosteReception.id
        ).filter(
            and_(
                TicketDepot.status == TicketDepotStatus.CLOSED.value,
                TicketDepot.closed_at.isnot(None),
                TicketDepot.closed_at >= threshold,
                # Exclude deferred tickets: only include tickets from posts opened today
                PosteReception.opened_at >= start_of_today,
                # Story B48-P3: Exclure les sorties (is_exit=true), inclure is_exit IS NULL pour rétrocompatibilité
                or_(LigneDepot.is_exit == False, LigneDepot.is_exit.is_(None))
            )
        )

        open_weight = Decimal(str(open_weight_query.scalar() or 0))
        closed_weight = Decimal(str(closed_weight_query.scalar() or 0))

        return open_weight + closed_weight

    def _calculate_weight_out(self, site_id: Optional[str], threshold: datetime, start_of_today: datetime) -> Decimal:
        """Calculate total weight sold in kg from sales in the last 24 hours, plus exit lines from reception, excluding deferred sessions."""
        # Story B48-P3: weight_out = poids des ventes + poids des lignes avec is_exit=true
        
        # 1. Calculer le poids des ventes (comportement existant)
        poids_ventes_query = self.db.query(func.coalesce(func.sum(SaleItem.weight), 0)).join(
            Sale, SaleItem.sale_id == Sale.id
        ).join(
            CashSession, Sale.cash_session_id == CashSession.id
        ).filter(
            and_(
                Sale.created_at >= threshold,
                # Exclude deferred sessions: only include sales from sessions opened today
                CashSession.opened_at >= start_of_today
            )
        )
        poids_ventes = Decimal(str(poids_ventes_query.scalar() or 0))
        
        # 2. Calculer le poids des sorties depuis réception (lignes avec is_exit=true)
        # Appliquer les mêmes filtres de date/threshold que pour weight_in (exclure deferred)
        poids_exit_reception_query = self.db.query(func.coalesce(func.sum(LigneDepot.poids_kg), 0)).join(
            TicketDepot, LigneDepot.ticket_id == TicketDepot.id
        ).join(
            PosteReception, TicketDepot.poste_id == PosteReception.id
        ).filter(
            and_(
                # Story B48-P3: Inclure uniquement les lignes avec is_exit=true
                LigneDepot.is_exit == True,
                # Exclude deferred tickets: only include tickets from posts opened today
                PosteReception.opened_at >= start_of_today,
                # Filtrer par date de fermeture du ticket (si fermé) ou date de création (si ouvert)
                # Pour les tickets ouverts, inclure toutes les lignes sortie
                # Pour les tickets fermés, inclure uniquement ceux fermés dans les 24h
                or_(
                    and_(
                        TicketDepot.status == TicketDepotStatus.OPENED.value
                    ),
                    and_(
                        TicketDepot.status == TicketDepotStatus.CLOSED.value,
                        TicketDepot.closed_at.isnot(None),
                        TicketDepot.closed_at >= threshold
                    )
                )
            )
        )
        poids_exit_reception = Decimal(str(poids_exit_reception_query.scalar() or 0))
        
        return poids_ventes + poids_exit_reception

    async def get_unified_live_stats(
        self,
        period_type: Literal["24h", "daily"] = "daily",
        site_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate unified live statistics for all modules (caisse + réception).

        Args:
            period_type: Type of period - "daily" (minuit-minuit) or "24h" (24h glissantes)
            site_id: Optional site filter (for future multi-site support)

        Returns:
            Dict containing all unified stats (caisse + réception + matière)

        Raises:
            ValueError: If site_id format is invalid
            RuntimeError: If database query fails
        """
        if site_id is not None and not isinstance(site_id, str):
            raise ValueError("site_id must be a string or None")

        with _stats_duration.time():
            try:
                _stats_requests.inc()

                # Calculate period based on period_type
                now = datetime.now(timezone.utc)
                
                if period_type == "daily":
                    # Journée complète : minuit-minuit (UTC)
                    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_of_today = start_of_today + timedelta(days=1)
                    threshold = start_of_today
                    period_start = start_of_today
                    period_end = end_of_today
                else:  # period_type == "24h"
                    # 24h glissantes (comportement actuel)
                    threshold = now - timedelta(hours=24)
                    start_of_today = threshold  # Pas de filtre "deferred" en mode 24h
                    period_start = threshold
                    period_end = now

                # Stats Réception (utiliser méthodes existantes)
                tickets_open = self._count_open_tickets(site_id, start_of_today)
                tickets_closed_24h = self._count_closed_tickets_24h(site_id, threshold, start_of_today)
                items_received = self._count_items_received_24h(site_id, threshold, start_of_today)
                weight_in = self._calculate_weight_in(site_id, threshold, start_of_today)
                weight_out = self._calculate_weight_out(site_id, threshold, start_of_today)

                # Stats Caisse (nouvelle méthode)
                cash_stats = self._calculate_cash_stats(site_id, threshold, start_of_today, period_type)

                return {
                    # Stats Caisse
                    "tickets_count": cash_stats["tickets_count"],
                    "last_ticket_amount": cash_stats["last_ticket_amount"],
                    "ca": cash_stats["ca"],
                    "donations": cash_stats["donations"],
                    "weight_out_sales": cash_stats["weight_out_sales"],
                    # Stats Réception
                    "tickets_open": tickets_open,
                    "tickets_closed_24h": tickets_closed_24h,
                    "items_received": items_received,
                    # Stats Matière (unifiées)
                    "weight_in": float(weight_in),
                    "weight_out": float(weight_out),
                    # Métadonnées
                    "period_start": period_start,
                    "period_end": period_end,
                }

            except Exception as e:
                _stats_errors.inc()
                raise RuntimeError(f"Failed to calculate unified live stats: {str(e)}") from e

    def _calculate_cash_stats(
        self,
        site_id: Optional[str],
        threshold: datetime,
        start_of_today: datetime,
        period_type: Literal["24h", "daily"]
    ) -> Dict[str, Any]:
        """
        Calculate cash statistics (tickets_count, ca, donations, weight_out_sales).

        Args:
            site_id: Optional site filter
            threshold: Date threshold for filtering (24h ago or start of today)
            start_of_today: Start of today (for excluding deferred sessions)
            period_type: Type of period ("daily" or "24h")

        Returns:
            Dict with cash stats
        """
        # Base query for sales in period
        sales_query = self.db.query(Sale).join(
            CashSession, Sale.cash_session_id == CashSession.id
        ).filter(
            and_(
                Sale.created_at >= threshold,
                # Exclude deferred sessions: only include sales from sessions opened today (or in period for 24h)
                CashSession.opened_at >= start_of_today
            )
        )

        # Filter by site if provided (future multi-site support)
        # Note: Sales don't have direct site relationship, would need to join through CashSession
        if site_id:
            # For now, site filtering not implemented for sales
            # This will be added when multi-site support is implemented
            pass

        # 1. tickets_count: Nombre de tickets vendus (Sale) dans période
        tickets_count = sales_query.count()

        # 2. last_ticket_amount: Montant dernier ticket (dernière Sale.created_at)
        last_sale = sales_query.order_by(desc(Sale.created_at)).first()
        last_ticket_amount = float(last_sale.total_amount) if last_sale else 0.0

        # 3. ca: Chiffre d'affaires total (SUM Sale.total_amount)
        ca_result = sales_query.with_entities(func.sum(Sale.total_amount)).scalar()
        ca = float(ca_result or 0.0)

        # 4. donations: Dons totaux (SUM Sale.donation)
        donations_result = sales_query.with_entities(func.sum(Sale.donation)).scalar()
        donations = float(donations_result or 0.0)

        # 5. weight_out_sales: Poids vendus uniquement (SUM SaleItem.weight, exclut is_exit=true)
        # Note: weight_out_sales = seulement ventes (SaleItem.weight)
        # weight_out (dans réponse unifiée) = ventes + is_exit=true (calculé via _calculate_weight_out)
        sale_ids_subq = sales_query.with_entities(Sale.id).subquery()
        weight_out_sales_result = (
            self.db.query(func.sum(SaleItem.weight))
            .join(Sale, SaleItem.sale_id == Sale.id)
            .filter(Sale.id.in_(self.db.query(sale_ids_subq.c.id)))
            .scalar()
        )
        weight_out_sales = float(weight_out_sales_result or 0.0)

        return {
            "tickets_count": tickets_count,
            "last_ticket_amount": last_ticket_amount,
            "ca": ca,
            "donations": donations,
            "weight_out_sales": weight_out_sales,
        }
