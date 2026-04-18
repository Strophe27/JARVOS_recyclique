"""
Service for statistics and analytics aggregation.
"""
from __future__ import annotations

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, cast, String, case

from recyclic_api.core.exceptions import ValidationError
from recyclic_api.models.ligne_depot import LigneDepot
from recyclic_api.models.ticket_depot import TicketDepot
from recyclic_api.models.category import Category
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.sale import Sale
from recyclic_api.models.cash_session import CashSession
from recyclic_api.schemas.stats import ReceptionSummaryStats, CategoryStats


def _utc_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _created_at_end_filter(column, end_date: datetime):
    """
    Borne supérieure inclusive alignée sur les plages « jour calendaire ».

    Les paramètres de requête au format date (YYYY-MM-DD) sont typés datetime à minuit UTC.
    Sans ajustement, created_at <= minuit exclut le reste de la journée. Pour une borne
    exactement à minuit, on utilise donc created_at < (jour + 1) à minuit UTC.
    Si l'heure n'est pas minuit, on conserve <= end_date (filtre datetime explicite).
    """
    end = _utc_aware(end_date)
    if end.hour == 0 and end.minute == 0 and end.second == 0 and end.microsecond == 0:
        next_midnight = datetime.combine(
            end.date() + timedelta(days=1),
            datetime.min.time(),
            tzinfo=timezone.utc,
        )
        return column < next_midnight
    return column <= end


class StatsService:
    """Service for generating statistics and analytics."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def _validate_date_range(self, start_date: Optional[datetime], end_date: Optional[datetime]) -> None:
        """
        Validate that start_date is not after end_date.

        Args:
            start_date: Start date to validate
            end_date: End date to validate

        Raises:
            ValidationError: If start_date is after end_date
        """
        if start_date and end_date and start_date > end_date:
            raise ValidationError("start_date cannot be after end_date")

    def get_reception_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> ReceptionSummaryStats:
        """
        Get summary statistics for reception data.

        Story B48-P1: Cette méthode NE FILTRE PAS sur `Category.deleted_at` pour conserver
        les données historiques complètes. Les catégories archivées doivent rester incluses
        dans les statistiques pour la comptabilité et les déclarations éco-organismes.

        Args:
            start_date: Optional start date filter (inclusive)
            end_date: Optional end date filter (inclusive)

        Returns:
            ReceptionSummaryStats with aggregated data

        Raises:
            ValidationError: If start_date is after end_date
        """
        # Validate date range
        self._validate_date_range(start_date, end_date)
        # Build base query
        # Story B48-P1: Ne PAS filtrer Category.deleted_at - conserver toutes les catégories pour stats historiques
        # Story B48-P3: Exclure is_exit=true pour weight_in (poids reçu, pas sorti)
        query = self.db.query(
            func.coalesce(func.sum(LigneDepot.poids_kg), 0).label('total_weight'),
            func.count(LigneDepot.id).label('total_items'),
            func.count(func.distinct(LigneDepot.category_id)).label('unique_categories')
        ).join(
            TicketDepot,
            LigneDepot.ticket_id == TicketDepot.id
        ).filter(
            # Story B48-P3: Exclure les sorties (is_exit=true), inclure is_exit IS NULL pour rétrocompatibilité
            or_(LigneDepot.is_exit == False, LigneDepot.is_exit.is_(None))
        )

        # Apply date filters if provided
        filters = []
        if start_date:
            filters.append(TicketDepot.created_at >= _utc_aware(start_date))
        if end_date:
            filters.append(_created_at_end_filter(TicketDepot.created_at, end_date))

        if filters:
            query = query.filter(and_(*filters))

        # Execute query
        result = query.one()

        return ReceptionSummaryStats(
            total_weight=Decimal(str(result.total_weight)),
            total_items=result.total_items,
            unique_categories=result.unique_categories
        )

    def get_reception_by_category(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[CategoryStats]:
        """
        Get reception statistics grouped by category.

        Story B48-P1: Cette méthode NE FILTRE PAS sur `Category.deleted_at` pour conserver
        les données historiques complètes. Les catégories archivées doivent rester visibles
        dans les statistiques pour :
        - La comptabilité (traçabilité des transactions passées)
        - Les déclarations éco-organismes (mapping des catégories historiques)
        - L'intégrité des données (pas de perte d'information dans les rapports)

        Seules les APIs opérationnelles (caisse/réception) filtrent `deleted_at IS NULL`
        pour masquer les catégories archivées des sélecteurs.

        Les données des catégories enfants sont agrégées vers leurs catégories parentes
        pour n'afficher que les catégories principales dans le dashboard.

        Args:
            start_date: Optional start date filter (inclusive)
            end_date: Optional end date filter (inclusive)

        Returns:
            List of CategoryStats, sorted by total_weight descending (uniquement catégories principales)

        Raises:
            ValidationError: If start_date is after end_date
        """
        # Validate date range
        self._validate_date_range(start_date, end_date)

        # Agréger les données des catégories enfants vers leurs catégories parentes
        # Utiliser un LEFT JOIN pour obtenir la catégorie parente si elle existe
        from sqlalchemy.orm import aliased
        ParentCat = aliased(Category)

        # Build base query avec agrégation vers les catégories principales
        # Story B48-P1: Ne PAS filtrer Category.deleted_at - conserver toutes les catégories pour stats historiques
        # Story B48-P3: Exclure les sorties (is_exit=true), inclure is_exit IS NULL pour rétrocompatibilité
        # Si la catégorie a un parent, on utilise le nom du parent, sinon le nom de la catégorie
        # Commencer depuis LigneDepot pour éviter les problèmes de référence SQL
        query = self.db.query(
            func.coalesce(ParentCat.name, Category.name).label('category_name'),
            func.coalesce(func.sum(LigneDepot.poids_kg), 0).label('total_weight'),
            func.count(LigneDepot.id).label('total_items')
        ).select_from(
            LigneDepot
        ).join(
            Category,
            LigneDepot.category_id == Category.id
        ).outerjoin(
            ParentCat,
            Category.parent_id == ParentCat.id
        ).join(
            TicketDepot,
            LigneDepot.ticket_id == TicketDepot.id
        ).filter(
            # Story B48-P3: Exclure les sorties (is_exit=true), inclure is_exit IS NULL pour rétrocompatibilité
            or_(LigneDepot.is_exit == False, LigneDepot.is_exit.is_(None))
        )

        # Apply date filters if provided
        filters = []
        if start_date:
            filters.append(TicketDepot.created_at >= _utc_aware(start_date))
        if end_date:
            filters.append(_created_at_end_filter(TicketDepot.created_at, end_date))

        if filters:
            query = query.filter(and_(*filters))

        # Group by category principale and order by weight
        query = query.group_by(
            func.coalesce(ParentCat.name, Category.name)
        ).order_by(func.sum(LigneDepot.poids_kg).desc())

        # Execute query
        results = query.all()

        return [
            CategoryStats(
                category_name=row.category_name,
                total_weight=Decimal(str(row.total_weight)),
                total_items=row.total_items
            )
            for row in results
        ]

    def get_sales_by_category(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[CategoryStats]:
        """
        Get sales statistics grouped by main category.

        Story B50-P5: Cette méthode agrège les données de ventes (SaleItem) par catégorie principale.
        Les données des catégories enfants sont agrégées vers leurs catégories parentes
        pour n'afficher que les catégories principales dans le dashboard.
        Rétrocompat : ``SaleItem.category`` peut être soit l'UUID (format canonique), soit le nom
        de catégorie (jeux de données hérités), aligné sur ``CategoryService`` (recherche par nom).

        Args:
            start_date: Optional start date filter (inclusive)
            end_date: Optional end date filter (inclusive)

        Returns:
            List of CategoryStats, sorted by total_weight descending (uniquement catégories principales)

        Raises:
            ValidationError: If start_date is after end_date
        """
        # Validate date range
        self._validate_date_range(start_date, end_date)

        # Agréger les données des catégories enfants vers leurs catégories parentes
        # Utiliser un LEFT JOIN pour obtenir la catégorie parente si elle existe
        from sqlalchemy.orm import aliased
        ParentCat = aliased(Category)

        # Build base query avec agrégation vers les catégories principales
        # Faire exactement comme get_reception_by_category :
        # - JOIN direct sur Category.id (en castant SaleItem.category string en UUID)
        # - LEFT JOIN sur ParentCat pour obtenir le parent
        # - Utiliser func.coalesce(ParentCat.name, Category.name) pour le nom
        # - Filtrer pour ne garder que les catégories principales (parent_id IS NULL)
        # SQLite (tests) : SaleItem.category est une chaîne ; comparer à Category.id casté en String.
        # PostgreSQL : cast string → UUID pour le JOIN **uniquement** si la valeur ressemble à un UUID,
        # sinon jointure sur le nom (données historiques 1.4.x où `sale_items.category` peut être le libellé).
        dialect_name = self.db.get_bind().dialect.name
        if dialect_name == "sqlite":
            # SQLite + UUID PG : formats stockés/castés variables ; comparer sans tirets.
            cat_id_txt = func.lower(func.replace(cast(Category.id, String), "-", ""))
            item_cat_txt = func.lower(func.replace(SaleItem.category, "-", ""))
            category_join_cond = or_(
                item_cat_txt == cat_id_txt,
                SaleItem.category == Category.name,
            )
        else:
            from sqlalchemy.dialects.postgresql import UUID as PGUUID

            _uuid_txt_rx = (
                r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
            )
            looks_like_uuid = SaleItem.category.op("~")(_uuid_txt_rx)
            category_join_cond = case(
                (
                    looks_like_uuid,
                    cast(SaleItem.category, PGUUID) == Category.id,
                ),
                else_=SaleItem.category == Category.name,
            )

        # Libellé affiché : catégorie principale résolue, sinon nom direct, sinon valeur brute
        # (données brownfield : code inconnu, typo, ancien libellé hors table `categories`).
        category_display = func.coalesce(
            ParentCat.name,
            Category.name,
            SaleItem.category,
        )

        query = self.db.query(
            category_display.label('category_name'),
            func.coalesce(func.sum(SaleItem.weight), 0).label('total_weight'),
            func.count(SaleItem.id).label('total_items')
        ).select_from(
            SaleItem
        ).join(
            Sale,
            SaleItem.sale_id == Sale.id
        ).join(
            CashSession,
            Sale.cash_session_id == CashSession.id
        ).outerjoin(
            Category,
            category_join_cond,
        ).outerjoin(
            ParentCat,
            Category.parent_id == ParentCat.id
        ).filter(
            # Ligne résolue vers une catégorie principale (réception dashboard) OU
            # jointure `categories` impossible : on garde quand même la ligne pour
            # aligner le détail sorties avec les KPI (somme des poids sans exiger la FK).
            or_(
                Category.id.is_(None),
                or_(
                    Category.parent_id.is_(None),
                    ParentCat.parent_id.is_(None),
                ),
            ),
        )

        # Apply date filters if provided
        filters = []
        if start_date:
            filters.append(Sale.created_at >= _utc_aware(start_date))
        if end_date:
            filters.append(_created_at_end_filter(Sale.created_at, end_date))

        if filters:
            query = query.filter(and_(*filters))

        # Group by même expression que le libellé (PostgreSQL / SQLite).
        query = query.group_by(category_display).order_by(
            func.sum(SaleItem.weight).desc()
        )

        # Execute query
        results = query.all()
        if results:
            return [
                CategoryStats(
                    category_name=row.category_name,
                    total_weight=Decimal(str(row.total_weight or 0)),
                    total_items=row.total_items
                )
                for row in results
            ]

        # Brownfield fallback: certaines bases ont bien des sorties observables, mais aucune
        # ligne `sale_items` reliée aux ventes encore présentes. On recycle alors les sorties
        # de réception (`is_exit=true`) pour garder un détail cohérent avec le poids de sortie.
        exit_query = self.db.query(
            func.coalesce(ParentCat.name, Category.name).label('category_name'),
            func.coalesce(func.sum(LigneDepot.poids_kg), 0).label('total_weight'),
            func.count(LigneDepot.id).label('total_items'),
        ).select_from(
            LigneDepot
        ).join(
            Category,
            LigneDepot.category_id == Category.id
        ).outerjoin(
            ParentCat,
            Category.parent_id == ParentCat.id
        ).join(
            TicketDepot,
            LigneDepot.ticket_id == TicketDepot.id
        ).filter(
            LigneDepot.is_exit == True,
        )

        exit_filters = []
        if start_date:
            exit_filters.append(TicketDepot.created_at >= _utc_aware(start_date))
        if end_date:
            exit_filters.append(_created_at_end_filter(TicketDepot.created_at, end_date))
        if exit_filters:
            exit_query = exit_query.filter(and_(*exit_filters))

        exit_results = exit_query.group_by(
            func.coalesce(ParentCat.name, Category.name)
        ).order_by(
            func.sum(LigneDepot.poids_kg).desc()
        ).all()

        return [
            CategoryStats(
                category_name=row.category_name,
                total_weight=Decimal(str(row.total_weight or 0)),
                total_items=row.total_items
            )
            for row in exit_results
        ]
