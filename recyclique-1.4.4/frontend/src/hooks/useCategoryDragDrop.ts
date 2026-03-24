import { useCallback } from 'react'
import { Category } from '../services/categoryService'

/**
 * Hook pour gérer le drag-and-drop des catégories
 * Story B48-P4: Réorganisation limitée au même niveau hiérarchique
 */
export const useCategoryDragDrop = (
  categories: Category[],
  useDisplayOrderEntry: boolean,
  onReorder: (categoryId: string, newOrder: number) => Promise<void>
) => {
  /**
   * Vérifie si un drop est valide (même niveau hiérarchique)
   */
  const isValidDrop = useCallback((
    draggedCategory: Category,
    targetCategory: Category
  ): boolean => {
    // Même catégorie : invalide
    if (draggedCategory.id === targetCategory.id) {
      return false
    }

    // Vérifier que c'est le même niveau hiérarchique
    const draggedParentId = draggedCategory.parent_id || null
    const targetParentId = targetCategory.parent_id || null

    if (draggedParentId !== targetParentId) {
      return false
    }

    // Vérifier qu'on ne déplace pas une catégorie sous elle-même ou ses descendants
    const isDescendant = (categoryId: string, parentId: string): boolean => {
      const category = categories.find(c => c.id === categoryId)
      if (!category || !category.parent_id) return false
      if (category.parent_id === parentId) return true
      return isDescendant(category.parent_id, parentId)
    }

    if (isDescendant(targetCategory.id, draggedCategory.id)) {
      return false
    }

    return true
  }, [categories])

  /**
   * Recalcule les display_order d'un niveau avec incréments de 10
   */
  const recalculateOrderForLevel = useCallback((
    levelCategories: Category[],
    draggedCategoryId: string,
    newIndex: number
  ): Array<{ id: string; order: number }> => {
    // Trier les catégories par ordre actuel
    const sorted = [...levelCategories].sort((a, b) => {
      const orderA = useDisplayOrderEntry ? a.display_order_entry : a.display_order
      const orderB = useDisplayOrderEntry ? b.display_order_entry : b.display_order
      return orderA - orderB
    })

    // Retirer la catégorie déplacée
    const draggedIndex = sorted.findIndex(c => c.id === draggedCategoryId)
    if (draggedIndex === -1) return []

    const dragged = sorted.splice(draggedIndex, 1)[0]

    // Insérer à la nouvelle position
    sorted.splice(newIndex, 0, dragged)

    // Recalculer les ordres avec incréments de 10
    return sorted.map((cat, index) => ({
      id: cat.id,
      order: index * 10
    }))
  }, [useDisplayOrderEntry])

  /**
   * Gère le drop d'une catégorie
   */
  const handleDrop = useCallback(async (
    draggedCategoryId: string,
    targetCategoryId: string
  ): Promise<boolean> => {
    const draggedCategory = categories.find(c => c.id === draggedCategoryId)
    const targetCategory = categories.find(c => c.id === targetCategoryId)

    if (!draggedCategory || !targetCategory) {
      return false
    }

    // Vérifier la validité du drop
    if (!isValidDrop(draggedCategory, targetCategory)) {
      return false
    }

    // Trouver toutes les catégories du même niveau
    const parentId = draggedCategory.parent_id || null
    const levelCategories = categories.filter(c => 
      (c.parent_id || null) === parentId
    )

    // Trouver la nouvelle position (index de la catégorie cible)
    const sorted = [...levelCategories].sort((a, b) => {
      const orderA = useDisplayOrderEntry ? a.display_order_entry : a.display_order
      const orderB = useDisplayOrderEntry ? b.display_order_entry : b.display_order
      return orderA - orderB
    })

    const targetIndex = sorted.findIndex(c => c.id === targetCategoryId)
    if (targetIndex === -1) return false

    // Recalculer les ordres
    const newOrders = recalculateOrderForLevel(levelCategories, draggedCategoryId, targetIndex)

    // Sauvegarder tous les changements
    try {
      await Promise.all(
        newOrders.map(({ id, order }) => onReorder(id, order))
      )
      return true
    } catch (error) {
      console.error('Error reordering categories:', error)
      return false
    }
  }, [categories, isValidDrop, recalculateOrderForLevel, onReorder, useDisplayOrderEntry])

  return {
    isValidDrop,
    handleDrop,
    recalculateOrderForLevel
  }
}



