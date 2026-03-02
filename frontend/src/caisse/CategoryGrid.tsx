/**
 * Grille de selection de categories avec navigation hierarchique — Story 18-6.
 * Mode racines : affiche categories parent_id=null.
 * Mode sous-categories : affiche categories dont parent_id === filterParentId.
 * Clic sur categorie avec enfants : appelle onParentCategoryClick (navigation vers sous-cats).
 * Clic sur categorie sans enfants : appelle onCategorySelect (selection directe).
 */
import type { CategoryItem } from '../api/caisse';
import { Text } from '@mantine/core';
import styles from './CashRegisterSalePage.module.css';

interface CategoryGridProps {
  categories: CategoryItem[];
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string) => void;
  onParentCategoryClick?: (parentId: string) => void;
  filterParentId?: string | null;
  categoryShortcuts: Array<{ category: CategoryItem; letter: string }>;
}

export function CategoryGrid({
  categories,
  selectedCategoryId,
  onCategorySelect,
  onParentCategoryClick,
  filterParentId,
  categoryShortcuts,
}: CategoryGridProps) {
  const isSubcategoryMode = filterParentId != null;

  const visibleCategories = isSubcategoryMode
    ? categories.filter((c) => c.parent_id === filterParentId)
    : categories.filter((c) => c.parent_id === null);

  const testId = isSubcategoryMode ? 'subcategory-grid' : 'caisse-category-grid';

  if (visibleCategories.length === 0) {
    return (
      <Text c="dimmed" data-testid="category-grid-empty">
        Aucune categorie disponible. Contactez un administrateur.
      </Text>
    );
  }

  function handleClick(category: CategoryItem) {
    const hasChildren = categories.some((c) => c.parent_id === category.id);
    if (hasChildren && onParentCategoryClick) {
      onParentCategoryClick(category.id);
    } else {
      onCategorySelect(category.id);
    }
  }

  return (
    <div className={styles.categoryGrid} data-testid={testId}>
      {visibleCategories.map((category) => {
        const shortcut = categoryShortcuts.find((s) => s.category.id === category.id);
        const selected = selectedCategoryId === category.id;
        return (
          <button
            key={category.id}
            type="button"
            className={[
              styles.categoryCard,
              category.official_name ? styles.categoryCardOfficial : '',
              selected ? styles.categoryCardSelected : '',
            ].filter(Boolean).join(' ')}
            data-testid={`category-card-${category.id}`}
            onClick={() => handleClick(category)}
          >
            <Text size="sm" fw={500}>{category.name}</Text>
            {category.official_name && (
              <Text size="xs" c="dimmed">{category.official_name}</Text>
            )}
            <span className={styles.shortcutBadge}>{shortcut?.letter ?? ''}</span>
          </button>
        );
      })}
    </div>
  );
}
