from __future__ import annotations

from typing import Optional, List, Tuple
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, desc, and_, String
from fastapi import HTTPException, status

from recyclic_api.models import (
    PosteReception,
    PosteReceptionStatus,
    TicketDepot,
    TicketDepotStatus,
    LigneDepot,
    Destination as DBLigneDestination,
)
from recyclic_api.repositories.reception import (
    PosteReceptionRepository,
    TicketDepotRepository,
    UserRepository,
    LigneDepotRepository,
    CategoryRepository,
)


class ReceptionService:
    """Service métier pour la gestion des postes de réception et des tickets."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.poste_repo = PosteReceptionRepository(db)
        self.ticket_repo = TicketDepotRepository(db)
        self.user_repo = UserRepository(db)
        self.ligne_repo = LigneDepotRepository(db)
        self.category_repo = CategoryRepository(db)

    # Postes
    def open_poste(self, opened_by_user_id: UUID, opened_at: Optional[datetime] = None) -> PosteReception:
        """
        Ouvrir un poste de réception.
        
        Args:
            opened_by_user_id: ID de l'utilisateur qui ouvre le poste
            opened_at: Date d'ouverture optionnelle (pour saisie différée, uniquement ADMIN/SUPER_ADMIN)
        
        Returns:
            PosteReception: Le poste créé
        """
        # Validation de la date si fournie
        if opened_at is not None:
            now = datetime.now(timezone.utc)
            # Normaliser opened_at en UTC si nécessaire
            if opened_at.tzinfo is None:
                opened_at = opened_at.replace(tzinfo=timezone.utc)
            elif opened_at.tzinfo != timezone.utc:
                opened_at = opened_at.astimezone(timezone.utc)
            
            # Vérifier que la date n'est pas dans le futur
            if opened_at > now:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La date d'ouverture ne peut pas être dans le futur"
                )
        
        # Créer le poste avec la date fournie ou None (utilisera la valeur par défaut)
        poste = PosteReception(
            opened_by_user_id=opened_by_user_id,
            status=PosteReceptionStatus.OPENED.value,
            opened_at=opened_at if opened_at is not None else None
        )
        self.db.add(poste)
        self.db.commit()
        self.db.refresh(poste)
        return poste

    def close_poste(self, poste_id: UUID) -> PosteReception:
        poste: Optional[PosteReception] = self.poste_repo.get(poste_id)
        if not poste:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poste introuvable")

        # Contrainte métier: pas de tickets ouverts
        open_tickets = self.poste_repo.count_open_tickets(poste.id)
        if open_tickets > 0:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Des tickets ouverts empêchent la fermeture du poste")

        poste.status = PosteReceptionStatus.CLOSED.value
        from sqlalchemy.sql import func

        poste.closed_at = func.now()
        return self.poste_repo.update(poste)

    # Tickets
    def create_ticket(self, poste_id: UUID, benevole_user_id: UUID) -> TicketDepot:
        # Vérifier que le poste existe et est ouvert
        poste: Optional[PosteReception] = self.poste_repo.get(poste_id)
        if not poste:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poste introuvable")
        if poste.status != PosteReceptionStatus.OPENED.value:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Poste fermé")

        # Vérifier l'utilisateur
        if not self.user_repo.get(benevole_user_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

        # Déterminer la date de création du ticket
        # Si le poste est différé (opened_at < now()), utiliser opened_at du poste
        ticket_created_at = None
        if poste.opened_at:
            now = datetime.now(timezone.utc)
            # Normaliser opened_at en UTC si nécessaire
            poste_opened_at = poste.opened_at
            if poste_opened_at.tzinfo is None:
                poste_opened_at = poste_opened_at.replace(tzinfo=timezone.utc)
            elif poste_opened_at.tzinfo != timezone.utc:
                poste_opened_at = poste_opened_at.astimezone(timezone.utc)
            
            # Si le poste est différé (date dans le passé), utiliser cette date
            if poste_opened_at < now:
                ticket_created_at = poste_opened_at

        ticket = TicketDepot(
            poste_id=poste.id,
            benevole_user_id=benevole_user_id,
            status=TicketDepotStatus.OPENED.value,
            created_at=ticket_created_at if ticket_created_at is not None else None
        )
        return self.ticket_repo.add(ticket)

    def close_ticket(self, ticket_id: UUID) -> TicketDepot:
        ticket: Optional[TicketDepot] = self.ticket_repo.get(ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket introuvable")
        if ticket.status == TicketDepotStatus.CLOSED.value:
            return ticket

        from sqlalchemy.sql import func

        ticket.status = TicketDepotStatus.CLOSED.value
        ticket.closed_at = func.now()
        return self.ticket_repo.update(ticket)


    # Lignes de dépôt
    def create_ligne(self, *, ticket_id: UUID, category_id: UUID, poids_kg: float, destination: Optional[str], notes: Optional[str], is_exit: Optional[bool] = False) -> LigneDepot:
        """Créer une ligne de dépôt avec règles métier: poids>0 et ticket ouvert."""
        ticket: Optional[TicketDepot] = self.ticket_repo.get(ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket introuvable")
        if ticket.status != TicketDepotStatus.OPENED.value:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ticket fermé")

        if not self.category_repo.exists(category_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catégorie introuvable")

        # Validation poids côté service (déjà validé par Pydantic au niveau schéma d'entrée)
        if poids_kg <= 0:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="poids_kg doit être > 0")

        # Convertir destination en enum DB si string fournie
        dest_value = None
        if destination is not None:
            dest_value = DBLigneDestination(destination)

        # Story B48-P3: Validation is_exit + destination
        # Si is_exit=true, destination doit être RECYCLAGE ou DECHETERIE (pas MAGASIN)
        if is_exit is True:
            if dest_value is None or dest_value not in [DBLigneDestination.RECYCLAGE, DBLigneDestination.DECHETERIE]:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Une sortie de stock (is_exit=true) ne peut avoir comme destination que RECYCLAGE ou DECHETERIE"
                )

        ligne = LigneDepot(
            ticket_id=ticket.id,
            category_id=category_id,
            poids_kg=poids_kg,
            destination=dest_value,
            notes=notes,
            is_exit=is_exit if is_exit is not None else False,
        )
        return self.ligne_repo.add(ligne)

    def update_ligne(
        self,
        *,
        ligne_id: UUID,
        category_id: Optional[UUID] = None,
        poids_kg: Optional[float] = None,
        destination: Optional[str] = None,
        notes: Optional[str] = None,
        is_exit: Optional[bool] = None,
    ) -> LigneDepot:
        ligne: Optional[LigneDepot] = self.ligne_repo.get(ligne_id)
        if not ligne:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ligne introuvable")

        # On ne peut modifier que si le ticket est ouvert
        ticket: Optional[TicketDepot] = self.ticket_repo.get(ligne.ticket_id)
        assert ticket is not None
        if ticket.status != TicketDepotStatus.OPENED.value:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ticket fermé")

        if category_id is not None:
            if not self.category_repo.exists(category_id):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catégorie introuvable")
            ligne.category_id = category_id

        if poids_kg is not None:
            if poids_kg <= 0:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="poids_kg doit être > 0")
            ligne.poids_kg = poids_kg

        if destination is not None:
            ligne.destination = DBLigneDestination(destination)

        if notes is not None:
            ligne.notes = notes

        # Story B48-P3: Mise à jour is_exit avec validation
        if is_exit is not None:
            # Si on passe is_exit à True, vérifier que la destination est valide
            final_is_exit = is_exit
            final_destination = ligne.destination if destination is None else DBLigneDestination(destination)
            
            if final_is_exit is True:
                if final_destination not in [DBLigneDestination.RECYCLAGE, DBLigneDestination.DECHETERIE]:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Une sortie de stock (is_exit=true) ne peut avoir comme destination que RECYCLAGE ou DECHETERIE"
                    )
            ligne.is_exit = final_is_exit

        return self.ligne_repo.update(ligne)
    
    def update_ligne_weight_admin(
        self,
        *,
        ligne_id: UUID,
        poids_kg: float,
    ) -> LigneDepot:
        """
        Modifier uniquement le poids d'une ligne de dépôt (admin uniquement).
        
        Story B52-P2: Permet de modifier le poids même si le ticket est fermé,
        pour corriger les erreurs de saisie après validation.
        
        Args:
            ligne_id: ID de la ligne à modifier
            poids_kg: Nouveau poids en kg
            
        Returns:
            LigneDepot: La ligne modifiée
            
        Raises:
            HTTPException: Si la ligne n'existe pas ou si le poids est invalide
        """
        ligne: Optional[LigneDepot] = self.ligne_repo.get(ligne_id)
        if not ligne:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ligne introuvable")
        
        # Validation du poids
        if poids_kg <= 0:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="poids_kg doit être > 0")
        
        # Note: On ne vérifie PAS le statut du ticket ici car c'est une opération admin
        # qui doit pouvoir corriger les erreurs même après fermeture
        
        ligne.poids_kg = poids_kg
        return self.ligne_repo.update(ligne)

    def delete_ligne(self, *, ligne_id: UUID) -> None:
        ligne: Optional[LigneDepot] = self.ligne_repo.get(ligne_id)
        if not ligne:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ligne introuvable")
        ticket: Optional[TicketDepot] = self.ticket_repo.get(ligne.ticket_id)
        assert ticket is not None
        if ticket.status != TicketDepotStatus.OPENED.value:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ticket fermé")
        self.ligne_repo.delete(ligne)

    # Méthodes pour l'historique des tickets
    def get_tickets_list(
        self, 
        page: int = 1, 
        per_page: int = 10, 
        status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        benevole_id: Optional[UUID] = None,
        search: Optional[str] = None,
        include_empty: bool = False,
        # B45-P2: Filtres avancés
        poids_min: Optional[float] = None,
        poids_max: Optional[float] = None,
        categories: Optional[List[UUID]] = None,
        destinations: Optional[List[str]] = None,
        lignes_min: Optional[int] = None,
        lignes_max: Optional[int] = None,
    ) -> Tuple[List[TicketDepot], int]:
        """Récupérer la liste paginée des tickets avec leurs informations de base."""
        offset = (page - 1) * per_page
        
        # Requête avec eager loading pour éviter les N+1 queries
        query = self.db.query(TicketDepot).options(
            selectinload(TicketDepot.benevole),
            selectinload(TicketDepot.lignes)
        ).order_by(desc(TicketDepot.created_at))
        
        # Appliquer les filtres
        if status:
            query = query.filter(TicketDepot.status == status)
        
        if date_from:
            query = query.filter(TicketDepot.created_at >= date_from)
        
        if date_to:
            # Ajouter 23h59:59.999 pour inclure toute la journée
            date_to_end = date_to.replace(hour=23, minute=59, second=59, microsecond=999999)
            query = query.filter(TicketDepot.created_at <= date_to_end)
        
        if benevole_id:
            query = query.filter(TicketDepot.benevole_user_id == benevole_id)
        
        if search:
            # Recherche dans l'ID du ticket (UUID) ou le nom d'utilisateur du bénévole
            search_lower = search.lower()
            # Joindre avec User pour rechercher dans username
            from recyclic_api.models import User
            # Rechercher dans l'ID du ticket (convertir UUID en string) ou le username du bénévole
            query = query.join(User, TicketDepot.benevole_user_id == User.id).filter(
                (func.lower(User.username).contains(search_lower)) |
                (func.lower(func.cast(TicketDepot.id, String)).contains(search_lower))
            )
        
        # B44-P4: Exclure les tickets vides (sans lignes) par défaut, comme pour les sessions de caisse
        if not include_empty:
            # Exclure les tickets qui n'ont aucune ligne de dépôt
            # On utilise une sous-requête pour compter les lignes par ticket
            from recyclic_api.models import LigneDepot
            tickets_with_lignes = (
                self.db.query(LigneDepot.ticket_id)
                .group_by(LigneDepot.ticket_id)
                .subquery()
            )
            query = query.join(tickets_with_lignes, TicketDepot.id == tickets_with_lignes.c.ticket_id)
        
        # B45-P2: Filtres avancés - Poids total (min/max)
        if poids_min is not None or poids_max is not None:
            # Calculer le poids total par ticket (somme des poids_kg des lignes)
            poids_total_subq = (
                self.db.query(
                    LigneDepot.ticket_id,
                    func.sum(LigneDepot.poids_kg).label("total_poids")
                )
                .group_by(LigneDepot.ticket_id)
                .subquery()
            )
            query = query.join(poids_total_subq, TicketDepot.id == poids_total_subq.c.ticket_id)
            
            if poids_min is not None:
                query = query.filter(poids_total_subq.c.total_poids >= Decimal(str(poids_min)))
            if poids_max is not None:
                query = query.filter(poids_total_subq.c.total_poids <= Decimal(str(poids_max)))
        
        # B45-P2: Filtres avancés - Catégories (multi-sélection)
        if categories and len(categories) > 0:
            # Filtrer les tickets qui ont au moins une ligne avec une des catégories spécifiées
            tickets_with_categories = (
                self.db.query(LigneDepot.ticket_id)
                .filter(LigneDepot.category_id.in_(categories))
                .distinct()
                .subquery()
            )
            query = query.join(tickets_with_categories, TicketDepot.id == tickets_with_categories.c.ticket_id)
        
        # B45-P2: Filtres avancés - Destinations (multi-sélection)
        if destinations and len(destinations) > 0:
            # Convertir les strings en enum Destination
            dest_enums = []
            for dest_str in destinations:
                try:
                    dest_enums.append(DBLigneDestination(dest_str))
                except ValueError:
                    # Ignorer les destinations invalides
                    continue
            
            if dest_enums:
                # Filtrer les tickets qui ont au moins une ligne avec une des destinations spécifiées
                tickets_with_destinations = (
                    self.db.query(LigneDepot.ticket_id)
                    .filter(LigneDepot.destination.in_(dest_enums))
                    .distinct()
                    .subquery()
                )
                query = query.join(tickets_with_destinations, TicketDepot.id == tickets_with_destinations.c.ticket_id)
        
        # B45-P2: Filtres avancés - Nombre de lignes (min/max)
        if lignes_min is not None or lignes_max is not None:
            # Compter le nombre de lignes par ticket
            lignes_count_subq = (
                self.db.query(
                    LigneDepot.ticket_id,
                    func.count(LigneDepot.id).label("lignes_count")
                )
                .group_by(LigneDepot.ticket_id)
                .subquery()
            )
            query = query.join(lignes_count_subq, TicketDepot.id == lignes_count_subq.c.ticket_id)
            
            if lignes_min is not None:
                query = query.filter(lignes_count_subq.c.lignes_count >= lignes_min)
            if lignes_max is not None:
                query = query.filter(lignes_count_subq.c.lignes_count <= lignes_max)
        
        # Compter le total
        total = query.count()
        
        # Récupérer les tickets paginés
        tickets = query.offset(offset).limit(per_page).all()
        
        return tickets, total

    def get_ticket_detail(self, ticket_id: UUID) -> Optional[TicketDepot]:
        """Récupérer les détails complets d'un ticket avec ses lignes."""
        return self.db.query(TicketDepot).options(
            selectinload(TicketDepot.benevole),
            selectinload(TicketDepot.lignes).selectinload(LigneDepot.category)
        ).filter(TicketDepot.id == ticket_id).first()

    def _calculate_ticket_totals(self, ticket: TicketDepot) -> Tuple[int, Decimal, Decimal, Decimal, Decimal]:
        """
        Calculer le nombre de lignes et les poids par flux d'un ticket.
        
        B50-P2: Cette fonction retourne TOUJOURS 5 valeurs. Tous les appels doivent déballer
        les 5 valeurs correctement pour éviter les erreurs "ValueError: too many values to unpack".
        
        Args:
            ticket: TicketDepot pour lequel calculer les totaux
            
        Returns:
            Tuple de 5 valeurs :
            - total_lignes (int): Nombre total de lignes de dépôt
            - total_poids (Decimal): Poids total de toutes les lignes (kg)
            - poids_entree (Decimal): Poids des lignes avec destination=MAGASIN et is_exit=False (kg)
            - poids_direct (Decimal): Poids des lignes avec destination IN (RECYCLAGE, DECHETERIE) et is_exit=False (kg)
            - poids_sortie (Decimal): Poids des lignes avec is_exit=True (kg)
            
        Note:
            total_poids = poids_entree + poids_direct + poids_sortie
            
        Example:
            >>> service = ReceptionService(db)
            >>> totals = service._calculate_ticket_totals(ticket)
            >>> total_lignes, total_poids, poids_entree, poids_direct, poids_sortie = totals
        """
        total_lignes = len(ticket.lignes)
        total_poids = Decimal(0)
        poids_entree = Decimal(0)  # is_exit=false AND destination=MAGASIN
        poids_direct = Decimal(0)   # is_exit=false AND destination IN (RECYCLAGE, DECHETERIE)
        poids_sortie = Decimal(0)   # is_exit=true
        
        for ligne in ticket.lignes:
            poids = ligne.poids_kg
            total_poids += poids
            
            if ligne.is_exit:
                # Sortie de boutique
                poids_sortie += poids
            elif ligne.destination == 'MAGASIN':
                # Entrée en boutique
                poids_entree += poids
            elif ligne.destination in ('RECYCLAGE', 'DECHETERIE'):
                # Recyclage/déchetterie direct
                poids_direct += poids
        
        return total_lignes, total_poids, poids_entree, poids_direct, poids_sortie

    def get_lignes_depot_filtered(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[UUID] = None,
        page: int = 1,
        per_page: int = 50
    ) -> Tuple[List[LigneDepot], int]:
        """
        Récupérer les lignes de dépôt avec filtres et pagination.
        
        Args:
            start_date: Date de début (inclusive)
            end_date: Date de fin (inclusive)
            category_id: ID de la catégorie à filtrer
            page: Numéro de page (commence à 1)
            per_page: Nombre d'éléments par page
            
        Returns:
            Tuple[List[LigneDepot], int]: (lignes, total_count)
        """
        offset = (page - 1) * per_page
        
        # Requête de base avec eager loading
        query = self.db.query(LigneDepot).options(
            selectinload(LigneDepot.category),
            selectinload(LigneDepot.ticket).selectinload(TicketDepot.benevole)
        )
        
        # Appliquer les filtres
        if start_date or end_date:
            # Joindre avec la table ticket pour filtrer par date de création
            query = query.join(TicketDepot, LigneDepot.ticket_id == TicketDepot.id)
            
            if start_date:
                query = query.filter(TicketDepot.created_at >= start_date)
            if end_date:
                # Ajouter 1 jour pour inclure toute la journée de fin
                from datetime import timedelta
                end_date_inclusive = end_date + timedelta(days=1)
                query = query.filter(TicketDepot.created_at < end_date_inclusive)
        
        if category_id:
            query = query.filter(LigneDepot.category_id == category_id)
        
        # Compter le total avant pagination
        total = query.count()
        
        # Appliquer la pagination et l'ordre
        lignes = query.order_by(desc(LigneDepot.id)).offset(offset).limit(per_page).all()
        
        return lignes, total

    def get_lignes_depot_for_export(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[UUID] = None
    ) -> List[LigneDepot]:
        """
        Récupérer toutes les lignes de dépôt pour l'export CSV (sans pagination).
        
        Args:
            start_date: Date de début (inclusive)
            end_date: Date de fin (inclusive)
            category_id: ID de la catégorie à filtrer
            
        Returns:
            List[LigneDepot]: Toutes les lignes correspondant aux filtres
        """
        # Requête de base avec eager loading
        query = self.db.query(LigneDepot).options(
            selectinload(LigneDepot.category),
            selectinload(LigneDepot.ticket).selectinload(TicketDepot.benevole)
        )
        
        # Appliquer les filtres
        if start_date or end_date:
            # Joindre avec la table ticket pour filtrer par date de création
            query = query.join(TicketDepot, LigneDepot.ticket_id == TicketDepot.id)
            
            if start_date:
                query = query.filter(TicketDepot.created_at >= start_date)
            if end_date:
                # Ajouter 1 jour pour inclure toute la journée de fin
                from datetime import timedelta
                end_date_inclusive = end_date + timedelta(days=1)
                query = query.filter(TicketDepot.created_at < end_date_inclusive)
        
        if category_id:
            query = query.filter(LigneDepot.category_id == category_id)
        
        # Récupérer toutes les lignes correspondant aux filtres
        return query.order_by(desc(LigneDepot.id)).all()

