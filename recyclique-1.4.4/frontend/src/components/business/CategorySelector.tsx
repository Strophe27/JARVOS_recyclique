import React, { useEffect } from 'react'
import styled from 'styled-components'
import { useCategoryStore } from '../../stores/categoryStore'

const CategoryContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
`

const CategoryButton = styled.button<{ $selected?: boolean }>`
  padding: 1rem;
  border: 2px solid ${props => props.$selected ? '#2c5530' : '#ddd'};
  background: ${props => props.$selected ? '#e8f5e8' : 'white'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    border-color: #2c5530;
    background: #f0f8f0;
  }

  &:focus {
    outline: 2px solid #2c5530;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const CategoryName = styled.div`
  font-weight: bold;
  margin-bottom: 0.5rem;
`

const CategoryDescription = styled.div`
  font-size: 0.9rem;
  color: #666;
`

const ShortcutBadge = styled.div`
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  background: rgba(44, 85, 48, 0.9);
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  pointer-events: none;
`

interface CategorySelectorProps {
  onSelect: (category: string) => void
  selectedCategory?: string
  shortcutKeys?: { [categoryId: string]: string }
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  onSelect,
  selectedCategory,
  shortcutKeys = {}
}) => {
  const { 
    activeCategories, 
    loading, 
    error, 
    fetchCategories 
  } = useCategoryStore()

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

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

  // Filtrer pour ne montrer que les catégories racines (sans parent_id)
  // Trier par display_order puis par nom pour la caisse
  const rootCategories = activeCategories
    .filter(category => !category.parent_id)
    .sort((a, b) => {
      // Trier par display_order d'abord, puis par nom
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <CategoryContainer role="group" aria-label="Sélection de catégorie">
      {rootCategories.map((category) => (
        <CategoryButton
          key={category.id}
          $selected={selectedCategory === category.id}
          onClick={() => onSelect(category.id)}
          data-testid={`category-${category.id}`}
          data-selected={selectedCategory === category.id ? 'true' : 'false'}
          aria-pressed={selectedCategory === category.id}
          title={category.official_name ? `Dénomination officielle : ${category.official_name}` : undefined}  // Story B48-P5: Tooltip avec nom complet officiel si présent
          aria-label={
            shortcutKeys[category.id]
              ? `Sélectionner la catégorie ${category.name}. Raccourci clavier: ${shortcutKeys[category.id].toUpperCase()}`
              : `Sélectionner la catégorie ${category.name}`
          }
          style={{ position: 'relative' }}
          tabIndex={-1}
        >
          <CategoryName>{category.name}</CategoryName>  {/* Story B48-P5: Nom court/rapide (toujours utilisé) */}
          {category.description && (
            <CategoryDescription>{category.description}</CategoryDescription>
          )}
          {shortcutKeys[category.id] && (
            <ShortcutBadge
              aria-hidden="true"
              data-testid={`category-shortcut-${category.id}`}
            >
              {shortcutKeys[category.id].toUpperCase()}
            </ShortcutBadge>
          )}
        </CategoryButton>
      ))}
    </CategoryContainer>
  )
}

export default CategorySelector
