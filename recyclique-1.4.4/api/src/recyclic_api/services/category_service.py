from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from fastapi import HTTPException
from datetime import datetime, timezone

from ..models.category import Category
from ..schemas.category import CategoryCreate, CategoryUpdate, CategoryRead, CategoryWithChildren


class CategoryService:
    """Service for category management operations"""
    
    MAX_HIERARCHY_DEPTH = 5  # Maximum depth for category hierarchy

    def __init__(self, db: Session):
        self.db = db


    def _get_hierarchy_depth(self, category_id: UUID) -> int:
        """Calculate the depth of a category in the hierarchy (1-based)"""
        depth = 1  # Start at 1 for the category itself
        current_id = category_id
        
        while current_id:
            category = self.db.query(Category).filter(Category.id == current_id).first()
            if not category or not category.parent_id:
                break
            current_id = category.parent_id
            depth += 1
            
            # Safety check to prevent infinite loops
            if depth > self.MAX_HIERARCHY_DEPTH + 1:
                break
                
        return depth

    async def create_category(self, category_data: CategoryCreate) -> CategoryRead:
        """Create a new category with unique name validation and optional parent"""

        # Check if category name already exists
        existing = self.db.query(Category).filter(Category.name == category_data.name).first()

        if existing:
            raise HTTPException(status_code=400, detail=f"Category with name '{category_data.name}' already exists")

        # Validate parent_id if provided
        parent_id = None
        if category_data.parent_id:
            try:
                parent_id = UUID(category_data.parent_id)
                # Check if parent exists and is active
                parent = self.db.query(Category).filter(
                    Category.id == parent_id,
                    Category.is_active == True
                ).first()
                if not parent:
                    raise HTTPException(status_code=400, detail=f"Parent category with ID '{category_data.parent_id}' not found or inactive")

                # NEW RULE: If parent has prices, remove them automatically to make it a container
                if parent.price is not None or parent.max_price is not None:
                    parent.price = None
                    parent.max_price = None
                    # Commit the parent update immediately
                    self.db.commit()

                # Check hierarchy depth
                parent_depth = self._get_hierarchy_depth(parent_id)
                if parent_depth >= self.MAX_HIERARCHY_DEPTH:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot create category: maximum hierarchy depth of {self.MAX_HIERARCHY_DEPTH} levels exceeded"
                    )
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid parent_id format: '{category_data.parent_id}'")

        # Create new category
        new_category = Category(
            name=category_data.name,  # Nom court/rapide (obligatoire)
            official_name=category_data.official_name,  # Story B48-P5: Nom complet officiel (optionnel)
            is_active=True,
            parent_id=parent_id,
            price=category_data.price,
            max_price=category_data.max_price,
            display_order=category_data.display_order if category_data.display_order is not None else 0,
            is_visible=category_data.is_visible if category_data.is_visible is not None else True,
            shortcut_key=category_data.shortcut_key
        )

        self.db.add(new_category)

        try:
            self.db.commit()
            self.db.refresh(new_category)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"Category with name '{category_data.name}' already exists")

        return CategoryRead.model_validate(new_category)

    async def get_categories(self, is_active: Optional[bool] = None, include_archived: bool = False) -> List[CategoryRead]:
        """Get all categories, optionally filtered by active status.
        
        Story B48-P1: Par défaut, exclut les catégories archivées (deleted_at IS NULL).
        Utiliser include_archived=True pour les APIs admin qui doivent voir toutes les catégories.
        """

        query = self.db.query(Category)

        # Story B48-P1: Filtrer les catégories archivées par défaut (sauf si include_archived=True)
        if not include_archived:
            query = query.filter(Category.deleted_at.is_(None))

        if is_active is not None:
            query = query.filter(Category.is_active == is_active)

        query = query.order_by(Category.display_order, Category.name)
        categories = query.all()

        return [CategoryRead.model_validate(cat) for cat in categories]

    async def get_category_by_id(self, category_id: str) -> Optional[CategoryRead]:
        """Get a single category by ID"""

        try:
            cat_uuid = UUID(category_id)
        except ValueError:
            return None

        category = self.db.query(Category).filter(Category.id == cat_uuid).first()

        if not category:
            return None

        return CategoryRead.model_validate(category)

    async def update_category(self, category_id: str, category_data: CategoryUpdate) -> Optional[CategoryRead]:
        """Update a category"""

        try:
            cat_uuid = UUID(category_id)
        except ValueError:
            return None

        # Check if category exists
        category = self.db.query(Category).filter(Category.id == cat_uuid).first()

        if not category:
            return None

        # Check for duplicate name if name is being updated
        if category_data.name and category_data.name != category.name:
            existing = self.db.query(Category).filter(Category.name == category_data.name).first()

            if existing:
                raise HTTPException(status_code=400, detail=f"Category with name '{category_data.name}' already exists")

        # Determine final parent_id value for validation
        # We need to check if parent_id was provided in the update, even if it's None
        update_data_dict = category_data.model_dump(exclude_unset=True)
        parent_id_provided = 'parent_id' in update_data_dict

        final_parent_id = category.parent_id  # Start with current value
        if parent_id_provided:
            if category_data.parent_id:
                try:
                    final_parent_id = UUID(category_data.parent_id)
                    # Check if parent exists and is active
                    parent = self.db.query(Category).filter(
                        Category.id == final_parent_id,
                        Category.is_active == True
                    ).first()
                    if not parent:
                        raise HTTPException(status_code=400, detail=f"Parent category with ID '{category_data.parent_id}' not found or inactive")

                    # NEW RULE: If parent has prices, remove them automatically to make it a container
                    if parent.price is not None or parent.max_price is not None:
                        parent.price = None
                        parent.max_price = None
                        # Commit the parent update immediately
                        self.db.commit()

                    # Prevent self-reference
                    if final_parent_id == cat_uuid:
                        raise HTTPException(status_code=400, detail="Category cannot be its own parent")

                    # Check hierarchy depth
                    parent_depth = self._get_hierarchy_depth(final_parent_id)
                    if parent_depth >= self.MAX_HIERARCHY_DEPTH:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Cannot update category: maximum hierarchy depth of {self.MAX_HIERARCHY_DEPTH} levels exceeded"
                        )
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Invalid parent_id format: '{category_data.parent_id}'")
            else:
                final_parent_id = None

        # NEW RULE: Validate price fields - prices can only be set on "leaf" categories (without children)
        # Check if trying to set price on a category that has children
        has_new_price_fields = any([
            category_data.price is not None,
            category_data.max_price is not None
        ])

        if has_new_price_fields:
            # Count existing children
            children_count = self.db.query(Category).filter(
                Category.parent_id == cat_uuid,
                Category.is_active == True
            ).count()

            if children_count > 0:
                raise HTTPException(
                    status_code=422,
                    detail="Cannot set prices on a category that has subcategories. Prices can only be set on leaf categories (without children)."
                )

        # Update fields
        update_data = update_data_dict  # Already computed above
        # Always update parent_id if it was provided in the request (even if None)
        if parent_id_provided:
            update_data['parent_id'] = final_parent_id

        if update_data:
            for key, value in update_data.items():
                setattr(category, key, value)

            try:
                self.db.commit()
                self.db.refresh(category)
            except IntegrityError:
                self.db.rollback()
                raise HTTPException(status_code=400, detail=f"Category with name '{category_data.name}' already exists")

        return CategoryRead.model_validate(category)

    async def get_categories_hierarchy(self, is_active: Optional[bool] = None, include_archived: bool = False) -> List[CategoryWithChildren]:
        """Get all categories with their children in a hierarchical structure.
        
        Story B48-P1: Par défaut, exclut les catégories archivées (deleted_at IS NULL).
        """
        
        query = self.db.query(Category)
        
        # Story B48-P1: Filtrer les catégories archivées par défaut
        if not include_archived:
            query = query.filter(Category.deleted_at.is_(None))
        
        if is_active is not None:
            query = query.filter(Category.is_active == is_active)
        
        # Load parent-child relationships with recursive loading
        query = query.options(selectinload(Category.children).selectinload(Category.children))
        
        # Get only root categories (no parent)
        query = query.filter(Category.parent_id.is_(None))
        
        query = query.order_by(Category.name)
        root_categories = query.all()
        
        return [self._build_category_hierarchy(cat, include_archived) for cat in root_categories]
    
    def _build_category_hierarchy(self, category: Category, include_archived: bool = False) -> CategoryWithChildren:
        """Recursively build category hierarchy.
        
        Story B48-P1: Filtre les enfants archivés si include_archived=False.
        """
        children = []
        for child in category.children:
            # Story B48-P1: Filtrer les enfants archivés si nécessaire
            if include_archived or child.deleted_at is None:
                if child.is_active:  # Only include active children
                    children.append(self._build_category_hierarchy(child, include_archived))
        
        # Sort children by name for consistent ordering
        children.sort(key=lambda x: x.name)
        
        return CategoryWithChildren(
            id=str(category.id),
            name=category.name,
            is_active=category.is_active,
            parent_id=str(category.parent_id) if category.parent_id else None,
            created_at=category.created_at,
            updated_at=category.updated_at,
            deleted_at=category.deleted_at,
            children=children
        )
    
    async def get_category_children(self, category_id: str) -> List[CategoryRead]:
        """Get direct children of a category.
        
        Story B48-P1: Exclut les enfants archivés (deleted_at IS NULL).
        """
        
        try:
            cat_uuid = UUID(category_id)
        except ValueError:
            return []
        
        children = self.db.query(Category).filter(
            Category.parent_id == cat_uuid,
            Category.is_active == True,
            Category.deleted_at.is_(None)  # Story B48-P1: Exclure les enfants archivés
        ).order_by(Category.name).all()
        
        return [CategoryRead.model_validate(child) for child in children]
    
    async def get_category_parent(self, category_id: str) -> Optional[CategoryRead]:
        """Get parent of a category"""
        
        try:
            cat_uuid = UUID(category_id)
        except ValueError:
            return None
        
        category = self.db.query(Category).filter(Category.id == cat_uuid).first()
        
        if not category or not category.parent_id:
            return None
        
        parent = self.db.query(Category).filter(
            Category.id == category.parent_id,
            Category.is_active == True
        ).first()
        
        return CategoryRead.model_validate(parent) if parent else None

    async def get_category_breadcrumb(self, category_id: str) -> List[CategoryRead]:
        """Get the full breadcrumb path from root to category"""
        
        try:
            cat_uuid = UUID(category_id)
        except ValueError:
            return []
        
        # Get the category
        category = self.db.query(Category).filter(Category.id == cat_uuid).first()
        if not category:
            return []
        
        # Build breadcrumb by traversing up the hierarchy
        breadcrumb = []
        current_id = cat_uuid
        
        while current_id:
            cat = self.db.query(Category).filter(Category.id == current_id).first()
            if not cat:
                break
            breadcrumb.insert(0, CategoryRead.model_validate(cat))  # Insert at beginning for root->leaf order
            current_id = cat.parent_id
            
            # Safety check to prevent infinite loops
            if len(breadcrumb) > self.MAX_HIERARCHY_DEPTH + 1:
                break
        
        return breadcrumb

    async def soft_delete_category(self, category_id: str) -> Optional[CategoryRead]:
        """Soft delete a category by setting deleted_at timestamp.
        
        Story B48-P1: Validation hiérarchie - empêche la désactivation si la catégorie
        a des enfants actifs (deleted_at IS NULL).
        """

        try:
            cat_uuid = UUID(category_id)
        except ValueError:
            return None

        # Check if category exists
        category = self.db.query(Category).filter(Category.id == cat_uuid).first()

        if not category:
            return None

        # Story B48-P1: Validation hiérarchie - vérifier qu'il n'y a pas d'enfants actifs
        active_children_count = self.db.query(Category).filter(
            Category.parent_id == cat_uuid,
            Category.deleted_at.is_(None)
        ).count()

        if active_children_count > 0:
            raise HTTPException(
                status_code=422,
                detail={
                    "detail": "Impossible de désactiver cette catégorie car elle contient des sous-catégories actives. Veuillez d'abord désactiver ou transférer les sous-catégories.",
                    "category_id": str(category_id),
                    "active_children_count": active_children_count
                }
            )

        # Soft delete by setting deleted_at timestamp
        category.deleted_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(category)

        return CategoryRead.model_validate(category)

    async def hard_delete_category(self, category_id: str) -> None:
        """Hard delete a category from the database.

        Guard: refuse deletion if the category has active or inactive children.
        """
        try:
            cat_uuid = UUID(category_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid category id")

        category = self.db.query(Category).filter(Category.id == cat_uuid).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        # Guard: any children (active or not)
        has_children = self.db.query(Category).filter(Category.parent_id == cat_uuid).first() is not None
        if has_children:
            raise HTTPException(status_code=422, detail="Impossible de supprimer: la catégorie possède des sous-catégories")

        self.db.delete(category)
        self.db.commit()

    async def restore_category(self, category_id: str) -> Optional[CategoryRead]:
        """Restore a soft-deleted category by setting deleted_at to NULL.
        
        Story B48-P1: Restauration d'une catégorie archivée.
        """

        try:
            cat_uuid = UUID(category_id)
        except ValueError:
            return None

        # Check if category exists
        category = self.db.query(Category).filter(Category.id == cat_uuid).first()

        if not category:
            return None

        # Check if category is already active (not deleted)
        if category.deleted_at is None:
            raise HTTPException(
                status_code=400,
                detail="Category is already active (not deleted)"
            )

        # Restore by setting deleted_at to NULL
        category.deleted_at = None
        self.db.commit()
        self.db.refresh(category)

        return CategoryRead.model_validate(category)

    async def has_usage(self, category_id: str) -> bool:
        """Check if a category has any usage (ligne_depot, preset_buttons, children, or sale_items).
        
        Returns True if the category is used anywhere, False if it can be safely hard-deleted.
        """
        try:
            cat_uuid = UUID(category_id)
        except ValueError:
            return True  # If invalid ID, assume it's used to be safe

        category = self.db.query(Category).filter(Category.id == cat_uuid).first()
        if not category:
            return True  # If not found, assume it's used to be safe

        # Check for children (subcategories)
        has_children = self.db.query(Category).filter(Category.parent_id == cat_uuid).first() is not None
        if has_children:
            return True

        # Check for ligne_depot usage
        from recyclic_api.models.ligne_depot import LigneDepot
        has_ligne_depot = self.db.query(LigneDepot).filter(LigneDepot.category_id == cat_uuid).first() is not None
        if has_ligne_depot:
            return True

        # Check for preset_buttons usage
        from recyclic_api.models.preset_button import PresetButton
        has_preset_buttons = self.db.query(PresetButton).filter(PresetButton.category_id == cat_uuid).first() is not None
        if has_preset_buttons:
            return True

        # Check for sale_items usage (by category name, not FK)
        from recyclic_api.models.sale_item import SaleItem
        has_sale_items = self.db.query(SaleItem).filter(SaleItem.category == category.name).first() is not None
        if has_sale_items:
            return True

        return False  # No usage found, safe to hard delete