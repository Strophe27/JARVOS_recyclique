import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import styled from 'styled-components'
import { Checkbox, Group, Stack, Text, ActionIcon, NumberInput, Tooltip, Button } from '@mantine/core'
import { IconChevronDown, IconChevronRight, IconGripVertical, IconEdit, IconTrash, IconArchive, IconChevronsDown, IconChevronsUp } from '@tabler/icons-react'
import { useCategoryStore } from '../../stores/categoryStore'
import { notifications } from '@mantine/notifications'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const CategoryContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 1rem 0;
`

const CategoryItem = styled.div<{ $level?: number }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  margin-left: ${props => (props.$level || 0) * 1.5}rem;
  transition: all 0.2s ease;

  &:hover {
    background: #f5f5f5;
    border-color: #2c5530;
    transform: translateX(2px);
  }
`

const CategoryName = styled.div<{ $isRoot?: boolean }>`
  font-weight: ${props => props.$isRoot ? 600 : 400};
  flex: 1;
  font-size: ${props => props.$isRoot ? '1rem' : '0.95rem'};
`

const CategoryInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
`

const OrderInput = styled(NumberInput)`
  width: 80px;
`

// Story B48-P4: Helper pour convertir et valider les prix
const getPriceValue = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? null : parsed;
  }
  // Gérer les objets Decimal (si sérialisés comme objets)
  if (typeof value === 'object' && value !== null) {
    // Si c'est un Decimal ou un objet avec une propriété value
    if ('value' in value && typeof value.value === 'number') {
      return value.value;
    }
    if ('toString' in value && typeof value.toString === 'function') {
      const str = value.toString();
      const parsed = parseFloat(str);
      return isNaN(parsed) ? null : parsed;
    }
  }
  return null;
}

// Story B48-P4: Composant pour item draggable
interface SortableCategoryItemProps {
  category: any
  level: number
  hasChildren: boolean
  isExpanded: boolean
  isUpdating: boolean
  isSelected: boolean
  shouldShowParent: boolean
  showVisibilityControls: boolean
  showDisplayOrder: boolean
  showActions: boolean
  useDisplayOrderEntry: boolean
  onToggleExpand: (id: string) => void
  onVisibilityToggle: (id: string, current: boolean) => void
  onDisplayOrderChange: (id: string, value: number) => void
  onSelect?: (id: string) => void
  onEdit?: (category: any) => void
  onDelete?: (category: any) => void
  enableDragDrop: boolean
}

const SortableCategoryItem: React.FC<SortableCategoryItemProps> = ({
  category,
  level,
  hasChildren,
  isExpanded,
  isUpdating,
  isSelected,
  shouldShowParent,
  showVisibilityControls,
  showDisplayOrder,
  showActions,
  useDisplayOrderEntry,
  onToggleExpand,
  onVisibilityToggle,
  onDisplayOrderChange,
  onSelect,
  onEdit,
  onDelete,
  enableDragDrop
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: category.id,
    disabled: !enableDragDrop || isUpdating
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <CategoryItem
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: isSelected ? '#e8f5e8' : undefined,
        borderColor: isSelected ? '#2c5530' : undefined
      }}
      $level={level}
    >
      {enableDragDrop && (
        <Tooltip label="Glisser-déposer pour réorganiser (même niveau uniquement)" withArrow>
          <ActionIcon
            {...attributes}
            {...listeners}
            variant="subtle"
            size="sm"
            style={{ cursor: 'grab' }}
          >
            <IconGripVertical size={16} />
          </ActionIcon>
        </Tooltip>
      )}
      {hasChildren && (
        <ActionIcon
          variant="subtle"
          onClick={() => onToggleExpand(category.id)}
          size="sm"
          data-testid={`expand-${category.id}`}
        >
          {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        </ActionIcon>
      )}
      {!hasChildren && <div style={{ width: 24 }} />}

      {showVisibilityControls && (
        <Checkbox
          checked={category.is_visible}
          onChange={() => onVisibilityToggle(category.id, category.is_visible)}
          disabled={isUpdating}
          data-testid={`visibility-checkbox-${category.id}`}
          aria-label={`Afficher/masquer ${category.name}`}
        />
      )}

      <CategoryInfo>
        {category.deleted_at && (
          <IconArchive size={16} style={{ color: 'var(--mantine-color-gray-6)', marginRight: '0.5rem' }} />
        )}

        <CategoryName
          $isRoot={!category.parent_id}
          onClick={() => onSelect?.(category.id)}
          style={{
            cursor: onSelect ? 'pointer' : 'default',
            opacity: category.deleted_at ? 0.6 : 1,
            fontStyle: category.deleted_at ? 'italic' : 'normal',
            color: category.deleted_at ? 'var(--mantine-color-gray-6)' : undefined
          }}
          data-testid={`category-${category.id}`}
          title={category.official_name || category.name}
        >
          {category.name}
          {shouldShowParent && (
            <Text size="xs" c="dimmed" component="span" style={{ marginLeft: '0.5rem' }}>
              (sous-catégories masquées)
            </Text>
          )}
        </CategoryName>

        {/* Story B48-P4: Affichage des prix pour l'onglet Caisse uniquement */}
        {(() => {
          // Debug: log des valeurs brutes (à retirer après débogage)
          if (!useDisplayOrderEntry && (category.price != null || category.max_price != null)) {
            console.log(`[DEBUG] Category ${category.name}: price=${category.price} (${typeof category.price}), max_price=${category.max_price} (${typeof category.max_price})`);
          }
          
          const price = getPriceValue(category.price);
          const maxPrice = getPriceValue(category.max_price);
          
          if (!useDisplayOrderEntry && (price !== null || maxPrice !== null)) {
            return (
              <Text size="sm" c="dimmed" style={{ marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
                {price !== null && maxPrice !== null
                  ? `${price.toFixed(2)}€ - ${maxPrice.toFixed(2)}€`
                  : price !== null
                  ? `${price.toFixed(2)}€`
                  : maxPrice !== null
                  ? `max ${maxPrice.toFixed(2)}€`
                  : ''}
              </Text>
            );
          }
          return null;
        })()}

        {category.shortcut_key && (
          <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
            {category.shortcut_key.toUpperCase()}
          </Text>
        )}
      </CategoryInfo>

      {showDisplayOrder && (
        <Tooltip label={useDisplayOrderEntry ? 'Ordre d\'affichage pour les tickets ENTRY/DEPOT' : 'Ordre d\'affichage pour les tickets SALE/CASH'} withArrow>
          <OrderInput
            value={useDisplayOrderEntry ? category.display_order_entry : category.display_order}
            onChange={(value) => {
              const numValue = typeof value === 'number' ? value : parseInt(value || '0', 10)
              if (!isNaN(numValue) && numValue >= 0) {
                const currentValue = useDisplayOrderEntry ? category.display_order_entry : category.display_order
                if (numValue !== currentValue) {
                  onDisplayOrderChange(category.id, numValue)
                }
              }
            }}
            min={0}
            step={1}
            disabled={isUpdating}
            size="xs"
            data-testid={`display-order-${category.id}`}
          />
        </Tooltip>
      )}

      {showActions && (
        <Group gap="xs">
          {onEdit && (
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => onEdit(category)}
              title="Modifier"
              data-testid={`edit-${category.id}`}
            >
              <IconEdit size={18} />
            </ActionIcon>
          )}
          {onDelete && (
            <ActionIcon
              variant="light"
              color="red"
              onClick={() => onDelete(category)}
              title="Supprimer"
              data-testid={`delete-${category.id}`}
            >
              <IconTrash size={18} />
            </ActionIcon>
          )}
        </Group>
      )}
    </CategoryItem>
  )
}

interface EnhancedCategorySelectorProps {
  /** Callback when category is selected (for ticket creation) */
  onSelect?: (categoryId: string) => void
  /** Currently selected category ID */
  selectedCategory?: string
  /** If true, shows checkboxes for visibility management (admin mode) */
  showVisibilityControls?: boolean
  /** If true, shows display order controls */
  showDisplayOrder?: boolean
  /** If true, uses visibleCategories (for ENTRY tickets). If false, uses activeCategories (for SALE tickets) */
  useVisibleCategories?: boolean
  /** Story B48-P4: If true, uses display_order_entry (ENTRY/DEPOT) instead of display_order (SALE/CASH) */
  useDisplayOrderEntry?: boolean
  /** Story B48-P4: If true, shows action buttons (edit, delete) */
  showActions?: boolean
  /** Story B48-P4: Callback when edit button is clicked */
  onEdit?: (category: any) => void
  /** Story B48-P4: Callback when delete button is clicked */
  onDelete?: (category: any) => void
  /** Story B48-P4: If provided, use these categories instead of store categories (for admin with archived) */
  overrideCategories?: any[]
  /** Story B48-P4: Callback when display order is changed (to update parent state) */
  onDisplayOrderChange?: (categoryId: string, newOrder: number) => void
  /** Story B48-P4: Callback when visibility is changed (to update parent state when using overrideCategories) */
  onVisibilityChange?: (categoryId: string, isVisible: boolean) => void
  /** Story B48-P4: Enable drag-and-drop for reordering */
  enableDragDrop?: boolean
  /** Story B48-P4: Sort option: 'order' | 'name' | 'created' */
  sortBy?: 'order' | 'name' | 'created'
  /** Story B48-P4: Search query to filter categories */
  searchQuery?: string
}

export const EnhancedCategorySelector: React.FC<EnhancedCategorySelectorProps> = ({
  onSelect,
  selectedCategory,
  showVisibilityControls = false,
  showDisplayOrder = false,
  useVisibleCategories = true, // Par défaut, utiliser les catégories visibles (pour ENTRY tickets)
  useDisplayOrderEntry = false, // Story B48-P4: Par défaut, utiliser display_order (SALE/CASH)
  showActions = false, // Story B48-P4: Par défaut, ne pas afficher les actions
  onEdit,
  onDelete,
  overrideCategories, // Story B48-P4: Catégories fournies par le parent (pour admin avec archivées)
  onDisplayOrderChange, // Story B48-P4: Callback pour mettre à jour le state parent
  onVisibilityChange, // Story B48-P4: Callback pour mettre à jour le state parent quand la visibilité change
  enableDragDrop = false, // Story B48-P4: Drag-and-drop désactivé par défaut
  sortBy = 'order', // Story B48-P4: Tri par défaut par ordre d'affichage
  searchQuery = '' // Story B48-P4: Recherche vide par défaut
}) => {
  const {
    categories,
    activeCategories,
    visibleCategories,
    loading,
    error,
    fetchCategories,
    fetchVisibleCategories,
    toggleCategoryVisibility,
    updateDisplayOrder,
    updateDisplayOrderEntry  // Story B48-P4
  } = useCategoryStore()

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [updatingCategories, setUpdatingCategories] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)

  // Story B48-P4: Sensors pour drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de mouvement avant activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    // Story B48-P4: En mode admin (showVisibilityControls ou showActions), toujours utiliser fetchCategories
    // pour charger toutes les catégories sans passer par l'endpoint entry-tickets
    if (showVisibilityControls || showActions) {
      // Admin view: fetch all categories
      fetchCategories()
    } else if (useVisibleCategories) {
      // ENTRY tickets: fetch visible categories only
      fetchVisibleCategories()
    } else {
      // SALE tickets: fetch all active categories (ignore visibility)
      fetchCategories()
    }
  }, [fetchCategories, fetchVisibleCategories, showVisibilityControls, useVisibleCategories, showActions])


  const toggleExpand = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }, [])

  const handleVisibilityToggle = useCallback(async (categoryId: string, currentVisibility: boolean) => {
    const newVisibility = !currentVisibility
    
    // Mise à jour optimiste IMMÉDIATE du state local si overrideCategories est utilisé
    if (onVisibilityChange) {
      onVisibilityChange(categoryId, newVisibility)
    }
    
    setUpdatingCategories(prev => new Set(prev).add(categoryId))
    
    try {
      // Mise à jour optimiste : le store met à jour immédiatement sans recharger
      await toggleCategoryVisibility(categoryId, newVisibility)
      notifications.show({
        title: 'Visibilité mise à jour',
        message: `La catégorie a été ${newVisibility ? 'affichée' : 'masquée'}`,
        color: 'green'
      })
    } catch (err: any) {
      // En cas d'erreur, restaurer l'état précédent
      if (onVisibilityChange) {
        onVisibilityChange(categoryId, currentVisibility)
      }
      notifications.show({
        title: 'Erreur',
        message: err.response?.data?.detail || 'Erreur lors de la mise à jour de la visibilité',
        color: 'red'
      })
    } finally {
      setUpdatingCategories(prev => {
        const next = new Set(prev)
        next.delete(categoryId)
        return next
      })
    }
  }, [toggleCategoryVisibility, onVisibilityChange])

  const handleDisplayOrderChange = useCallback(async (categoryId: string, newOrder: number) => {
    setUpdatingCategories(prev => new Set(prev).add(categoryId))

    try {
      // Story B48-P4: Utiliser la bonne méthode selon le mode (SALE/CASH vs ENTRY/DEPOT)
      if (useDisplayOrderEntry) {
        await updateDisplayOrderEntry(categoryId, newOrder)
      } else {
        await updateDisplayOrder(categoryId, newOrder)
      }
      
      // Story B48-P4: Appeler le callback pour mettre à jour le state parent si overrideCategories est utilisé
      if (onDisplayOrderChange) {
        onDisplayOrderChange(categoryId, newOrder)
      }
      
      notifications.show({
        title: 'Ordre mis à jour',
        message: 'L\'ordre d\'affichage a été modifié',
        color: 'green'
      })
    } catch (err: any) {
      notifications.show({
        title: 'Erreur',
        message: err.response?.data?.detail || 'Erreur lors de la mise à jour de l\'ordre',
        color: 'red'
      })
    } finally {
      setUpdatingCategories(prev => {
        const next = new Set(prev)
        next.delete(categoryId)
        return next
      })
    }
  }, [updateDisplayOrder, updateDisplayOrderEntry, useDisplayOrderEntry, onDisplayOrderChange])

  // Story B48-P4: Filtrer les catégories selon la recherche (récursif)
  const filterCategories = useCallback((categories: typeof activeCategories, query: string): typeof activeCategories => {
    if (!query.trim()) {
      return categories
    }

    const lowerQuery = query.toLowerCase()
    const matchingIds = new Set<string>()

    // Trouver les catégories qui correspondent
    categories.forEach(cat => {
      if (cat.name.toLowerCase().includes(lowerQuery) || 
          (cat.official_name && cat.official_name.toLowerCase().includes(lowerQuery))) {
        matchingIds.add(cat.id)
        // Ajouter tous les parents
        let current = cat
        while (current.parent_id) {
          matchingIds.add(current.parent_id)
          current = categories.find(c => c.id === current.parent_id)!
          if (!current) break
        }
      }
    })

    // Inclure les enfants des catégories correspondantes
    categories.forEach(cat => {
      if (cat.parent_id && matchingIds.has(cat.parent_id)) {
        matchingIds.add(cat.id)
      }
    })

    return categories.filter(cat => matchingIds.has(cat.id))
  }, [])

  // Story B48-P4: Déterminer quelles catégories afficher selon le contexte
  // - Si overrideCategories fourni: utiliser ces catégories (admin avec archivées)
  // - Admin (showVisibilityControls ou showActions): toutes les catégories actives
  // - ENTRY tickets (useVisibleCategories): seulement les catégories visibles
  // - SALE tickets: toutes les catégories actives
  const categoriesToDisplay = useMemo(() => {
    return overrideCategories
      ? overrideCategories
      : (showVisibilityControls || showActions)
        ? activeCategories
        : (useVisibleCategories ? visibleCategories : activeCategories)
  }, [overrideCategories, showVisibilityControls, showActions, activeCategories, useVisibleCategories, visibleCategories])

  // Story B48-P4: Fonctions pour tout déplier/replier (après categoriesToDisplay)
  const expandAll = useCallback(() => {
    // Trouver toutes les catégories qui ont des enfants
    const categoriesWithChildren = categoriesToDisplay.filter(cat => 
      categoriesToDisplay.some(child => child.parent_id === cat.id)
    )
    setExpandedCategories(new Set(categoriesWithChildren.map(cat => cat.id)))
  }, [categoriesToDisplay])

  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set())
  }, [])

  // Story B48-P4: Gestion du drag-and-drop (après categoriesToDisplay)
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    // Filtrer selon la recherche si nécessaire
    const filteredCategories = searchQuery ? filterCategories(categoriesToDisplay, searchQuery) : categoriesToDisplay

    const draggedCategory = filteredCategories.find(c => c.id === active.id)
    const targetCategory = filteredCategories.find(c => c.id === over.id)

    if (!draggedCategory || !targetCategory) {
      return
    }

    // Vérifier que c'est le même niveau hiérarchique
    const draggedParentId = draggedCategory.parent_id || null
    const targetParentId = targetCategory.parent_id || null

    if (draggedParentId !== targetParentId) {
      notifications.show({
        title: 'Action impossible',
        message: 'Vous ne pouvez réorganiser que les catégories du même niveau',
        color: 'yellow'
      })
      return
    }

    // Trouver toutes les catégories du même niveau
    const parentId = draggedParentId
    const levelCategories = filteredCategories.filter(c => 
      (c.parent_id || null) === parentId
    )

    // Trier par ordre actuel
    const sorted = [...levelCategories].sort((a, b) => {
      const orderA = useDisplayOrderEntry ? a.display_order_entry : a.display_order
      const orderB = useDisplayOrderEntry ? b.display_order_entry : b.display_order
      return orderA - orderB
    })

    // Trouver les indices
    const oldIndex = sorted.findIndex(c => c.id === active.id)
    const newIndex = sorted.findIndex(c => c.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Recalculer les ordres avec incréments de 10
    const reordered = arrayMove(sorted, oldIndex, newIndex)
    const newOrders = reordered.map((cat, index) => ({
      id: cat.id,
      order: index * 10
    }))

    // Mise à jour optimiste IMMÉDIATE de l'UI (avant les appels API)
    // Cela rend l'interface réactive instantanément
    if (onDisplayOrderChange) {
      // Mettre à jour localement immédiatement pour une expérience fluide
      newOrders.forEach(({ id, order }) => {
        onDisplayOrderChange(id, order)
      })
    }

    // Marquer les catégories comme en cours de mise à jour (pour l'indicateur visuel)
    setUpdatingCategories(prev => {
      const next = new Set(prev)
      newOrders.forEach(({ id }) => next.add(id))
      return next
    })

    // Synchroniser avec le serveur en arrière-plan (sans bloquer l'UI)
    Promise.all(
      newOrders.map(({ id, order }) => {
        if (useDisplayOrderEntry) {
          return updateDisplayOrderEntry(id, order)
        } else {
          return updateDisplayOrder(id, order)
        }
      })
    )
      .then(() => {
        // Succès silencieux - l'UI est déjà mise à jour
        setUpdatingCategories(prev => {
          const next = new Set(prev)
          newOrders.forEach(({ id }) => next.delete(id))
          return next
        })
      })
      .catch((err: any) => {
        // En cas d'erreur, afficher une notification mais ne pas rollback (l'utilisateur a déjà vu le changement)
        notifications.show({
          title: 'Erreur de synchronisation',
          message: 'L\'ordre a été mis à jour localement, mais la synchronisation avec le serveur a échoué. Veuillez rafraîchir la page.',
          color: 'yellow'
        })
        setUpdatingCategories(prev => {
          const next = new Set(prev)
          newOrders.forEach(({ id }) => next.delete(id))
          return next
        })
      })
  }, [categoriesToDisplay, searchQuery, filterCategories, useDisplayOrderEntry, updateDisplayOrder, updateDisplayOrderEntry, onDisplayOrderChange, overrideCategories, fetchCategories])

  // Build category tree
  const buildCategoryTree = (categories: typeof activeCategories, parentId: string | null = null, level: number = 0): JSX.Element[] => {
    // Story B48-P4: Filtrer selon la recherche si nécessaire
    const filteredCategories = searchQuery ? filterCategories(categories, searchQuery) : categories

    const children = filteredCategories
      .filter(cat => {
        if (parentId === null) {
          return !cat.parent_id
        }
        return cat.parent_id === parentId
      })
      .sort((a, b) => {
        // Story B48-P4: Trier selon l'option sélectionnée
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name)
        } else if (sortBy === 'created') {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA // Plus récent en premier
        } else {
          // Tri par ordre d'affichage (défaut)
          const orderFieldA = useDisplayOrderEntry ? a.display_order_entry : a.display_order
          const orderFieldB = useDisplayOrderEntry ? b.display_order_entry : b.display_order

          if (orderFieldA !== orderFieldB) {
            return orderFieldA - orderFieldB
          }
          return a.name.localeCompare(b.name)
        }
      })

    const items = children.map(category => {
      const hasChildren = categories.some(cat => cat.parent_id === category.id)
      const isExpanded = expandedCategories.has(category.id)
      const isUpdating = updatingCategories.has(category.id)
      const isSelected = selectedCategory === category.id

      // AC 1.2.2: If no subcategories are visible, parent category is sufficient
      const visibleChildren = categories.filter(cat => 
        cat.parent_id === category.id && cat.is_visible
      )
      const shouldShowParent = hasChildren && visibleChildren.length === 0 && category.is_visible

      return (
        <React.Fragment key={category.id}>
          <SortableCategoryItem
            category={category}
            level={level}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            isUpdating={isUpdating}
            isSelected={isSelected}
            shouldShowParent={shouldShowParent}
            showVisibilityControls={showVisibilityControls}
            showDisplayOrder={showDisplayOrder}
            showActions={showActions}
            useDisplayOrderEntry={useDisplayOrderEntry}
            onToggleExpand={toggleExpand}
            onVisibilityToggle={handleVisibilityToggle}
            onDisplayOrderChange={handleDisplayOrderChange}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            enableDragDrop={enableDragDrop}
          />

          {hasChildren && isExpanded && (
            <div>
              {buildCategoryTree(filteredCategories, category.id, level + 1)}
            </div>
          )}
        </React.Fragment>
      )
    })

    // Story B48-P4: Envelopper dans SortableContext si drag-and-drop activé
    if (enableDragDrop && children.length > 0) {
      const itemIds = children.map(c => c.id)
      return [
        <SortableContext key={`sortable-${parentId || 'root'}`} items={itemIds} strategy={verticalListSortingStrategy}>
          {items}
        </SortableContext>
      ]
    }

    return items
  }

  if (loading) {
    return (
      <div role="status" aria-live="polite">
        Chargement des catégories...
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" aria-live="assertive">
        Erreur lors du chargement des catégories: {error}
      </div>
    )
  }

  const treeContent = buildCategoryTree(categoriesToDisplay)
  const activeCategory = activeId ? categoriesToDisplay.find(c => c.id === activeId) : null

  // Story B48-P4: Boutons pour tout déplier/replier
  const expandCollapseButtons = (
    <Group gap="xs" mb="sm" style={{ padding: '0 8px' }}>
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconChevronsDown size={16} />}
        onClick={expandAll}
        title="Déplier toutes les catégories"
      >
        Tout déplier
      </Button>
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconChevronsUp size={16} />}
        onClick={collapseAll}
        title="Replier toutes les catégories"
      >
        Tout replier
      </Button>
    </Group>
  )

  // Story B48-P4: Envelopper dans DndContext si drag-and-drop activé
  if (enableDragDrop) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <CategoryContainer role="group" aria-label="Sélection de catégorie">
          {expandCollapseButtons}
          {treeContent}
        </CategoryContainer>
        <DragOverlay>
          {activeCategory ? (
            <CategoryItem
              $level={0}
              style={{
                opacity: 0.5,
                transform: 'rotate(1deg)',
                boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
              }}
            >
              <IconGripVertical size={16} />
              <CategoryInfo>
                <CategoryName>{activeCategory.name}</CategoryName>
              </CategoryInfo>
            </CategoryItem>
          ) : null}
        </DragOverlay>
      </DndContext>
    )
  }

  return (
    <CategoryContainer role="group" aria-label="Sélection de catégorie">
      {expandCollapseButtons}
      {treeContent}
    </CategoryContainer>
  )
}

export default EnhancedCategorySelector
