/**
 * Tests CategoryGrid — Story 18-6 AC#1, AC#2, AC#4 (Vitest + RTL).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { CategoryGrid } from './CategoryGrid';
import type { CategoryItem } from '../api/caisse';

function makeCat(overrides: Partial<CategoryItem> = {}): CategoryItem {
  return {
    id: 'cat-1',
    name: 'Vetements',
    parent_id: null,
    official_name: null,
    is_visible_sale: true,
    is_visible_reception: true,
    display_order: 1,
    display_order_entry: 1,
    deleted_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

interface RenderGridOptions {
  selectedCategoryId?: string | null;
  onCategorySelect?: (id: string) => void;
  onParentCategoryClick?: (id: string) => void;
  filterParentId?: string | null;
  categoryShortcuts?: Array<{ category: CategoryItem; letter: string }>;
}

function renderGrid(
  categories: CategoryItem[],
  {
    selectedCategoryId = null,
    onCategorySelect = vi.fn(),
    onParentCategoryClick = vi.fn(),
    filterParentId = undefined,
    categoryShortcuts = [],
  }: RenderGridOptions = {}
) {
  return render(
    <MantineProvider>
      <CategoryGrid
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={onCategorySelect}
        onParentCategoryClick={onParentCategoryClick}
        filterParentId={filterParentId}
        categoryShortcuts={categoryShortcuts}
      />
    </MantineProvider>
  );
}

describe('CategoryGrid — etat vide', () => {
  it('affiche data-testid="category-grid-empty" quand categories est vide', () => {
    renderGrid([]);
    expect(screen.getByTestId('category-grid-empty')).toBeInTheDocument();
  });

  it('affiche un message adequat dans l\'etat vide', () => {
    renderGrid([]);
    expect(screen.getByText(/Aucune categorie disponible/)).toBeInTheDocument();
  });

  it('affiche l\'etat vide quand filterParentId ne correspond a aucune sous-categorie', () => {
    const cats = [makeCat({ id: 'c1' })];
    renderGrid(cats, { filterParentId: 'parent-inexistant' });
    expect(screen.getByTestId('category-grid-empty')).toBeInTheDocument();
  });
});

describe('CategoryGrid — rendu categories racines', () => {
  it('affiche data-testid="caisse-category-grid" pour les categories racines', () => {
    renderGrid([makeCat({ id: 'c1' })]);
    expect(screen.getByTestId('caisse-category-grid')).toBeInTheDocument();
  });

  it('affiche 3 cards pour 3 categories racines', () => {
    const cats = [
      makeCat({ id: 'c1', name: 'Vetements' }),
      makeCat({ id: 'c2', name: 'Livres' }),
      makeCat({ id: 'c3', name: 'Jouets' }),
    ];
    renderGrid(cats);
    expect(screen.getByTestId('category-card-c1')).toBeInTheDocument();
    expect(screen.getByTestId('category-card-c2')).toBeInTheDocument();
    expect(screen.getByTestId('category-card-c3')).toBeInTheDocument();
  });

  it('n\'affiche pas les sous-categories en mode racines', () => {
    const parent = makeCat({ id: 'parent', name: 'Parent' });
    const child = makeCat({ id: 'child', name: 'Enfant', parent_id: 'parent' });
    renderGrid([parent, child]);
    expect(screen.getByTestId('category-card-parent')).toBeInTheDocument();
    expect(screen.queryByTestId('category-card-child')).not.toBeInTheDocument();
  });

  it('affiche official_name si renseigne', () => {
    const cat = makeCat({ id: 'c1', official_name: 'B48-P5' });
    renderGrid([cat]);
    expect(screen.getByText('B48-P5')).toBeInTheDocument();
  });

  it('card avec official_name a la classe categoryCardOfficial (distinction visuelle AC1)', () => {
    const cat = makeCat({ id: 'c1', official_name: 'B48-P5' });
    renderGrid([cat]);
    const card = screen.getByTestId('category-card-c1');
    expect(card.className).toMatch(/categoryCardOfficial/);
  });

  it('card sans official_name n\'a pas la classe categoryCardOfficial', () => {
    const cat = makeCat({ id: 'c1', official_name: null });
    renderGrid([cat]);
    const card = screen.getByTestId('category-card-c1');
    expect(card.className).not.toMatch(/categoryCardOfficial/);
  });

  it('affiche le badge raccourci lettre', () => {
    const cat = makeCat({ id: 'c1', name: 'Vetements' });
    renderGrid([cat], {
      categoryShortcuts: [{ category: cat, letter: 'V' }],
    });
    expect(screen.getByText('V')).toBeInTheDocument();
  });
});

describe('CategoryGrid — mode sous-categories (filterParentId)', () => {
  it('affiche data-testid="subcategory-grid" quand filterParentId est defini', () => {
    const parent = makeCat({ id: 'parent' });
    const child = makeCat({ id: 'child', parent_id: 'parent' });
    renderGrid([parent, child], { filterParentId: 'parent' });
    expect(screen.getByTestId('subcategory-grid')).toBeInTheDocument();
  });

  it('affiche uniquement les sous-categories du parent specifie', () => {
    const parent1 = makeCat({ id: 'p1', name: 'Parent 1' });
    const parent2 = makeCat({ id: 'p2', name: 'Parent 2' });
    const child1 = makeCat({ id: 'c1', name: 'Enfant P1', parent_id: 'p1' });
    const child2 = makeCat({ id: 'c2', name: 'Enfant P2', parent_id: 'p2' });
    renderGrid([parent1, parent2, child1, child2], { filterParentId: 'p1' });
    expect(screen.getByTestId('category-card-c1')).toBeInTheDocument();
    expect(screen.queryByTestId('category-card-c2')).not.toBeInTheDocument();
  });
});

describe('CategoryGrid — selection et surbrillance', () => {
  it('la card selectionnee a la classe categoryCardSelected', () => {
    const cat = makeCat({ id: 'c1' });
    renderGrid([cat], { selectedCategoryId: 'c1' });
    const card = screen.getByTestId('category-card-c1');
    expect(card.className).toMatch(/categoryCardSelected/);
  });

  it('la card non selectionnee n\'a pas la classe categoryCardSelected', () => {
    const cat = makeCat({ id: 'c1' });
    renderGrid([cat], { selectedCategoryId: null });
    const card = screen.getByTestId('category-card-c1');
    expect(card.className).not.toMatch(/categoryCardSelected/);
  });
});

describe('CategoryGrid — interactions clic', () => {
  it('clic sur categorie sans enfants appelle onCategorySelect avec le bon id', async () => {
    const onCategorySelect = vi.fn();
    const cat = makeCat({ id: 'c1' });
    renderGrid([cat], { onCategorySelect });
    await userEvent.click(screen.getByTestId('category-card-c1'));
    expect(onCategorySelect).toHaveBeenCalledWith('c1');
  });

  it('clic sur categorie avec enfants appelle onParentCategoryClick (pas onCategorySelect)', async () => {
    const onCategorySelect = vi.fn();
    const onParentCategoryClick = vi.fn();
    const parent = makeCat({ id: 'parent' });
    const child = makeCat({ id: 'child', parent_id: 'parent' });
    renderGrid([parent, child], { onCategorySelect, onParentCategoryClick });
    await userEvent.click(screen.getByTestId('category-card-parent'));
    expect(onParentCategoryClick).toHaveBeenCalledWith('parent');
    expect(onCategorySelect).not.toHaveBeenCalled();
  });

  it('clic sur sous-categorie (sans enfants) appelle onCategorySelect', async () => {
    const onCategorySelect = vi.fn();
    const parent = makeCat({ id: 'parent' });
    const child = makeCat({ id: 'child', parent_id: 'parent' });
    renderGrid([parent, child], {
      onCategorySelect,
      filterParentId: 'parent',
    });
    await userEvent.click(screen.getByTestId('category-card-child'));
    expect(onCategorySelect).toHaveBeenCalledWith('child');
  });
});
