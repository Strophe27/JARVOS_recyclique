/**
 * Tests AdminCategoriesPage — Story 19.2 (parité 1.4.4).
 * Vitest + RTL + MantineProvider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AdminCategoriesPage } from './AdminCategoriesPage';

/* ── Mocks: auth ──────────────────────────────────────────────────────── */

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

/* ── Mocks: API ───────────────────────────────────────────────────────── */

const mockGetCategoriesHierarchy = vi.fn();
const mockGetExportCsv = vi.fn();
const mockGetImportTemplate = vi.fn();
const mockPostImportAnalyze = vi.fn();
const mockPostImportExecute = vi.fn();
const mockCreateCategory = vi.fn();
const mockUpdateCategory = vi.fn();
const mockDeleteCategory = vi.fn();
const mockRestoreCategory = vi.fn();
const mockHardDeleteCategory = vi.fn();
const mockGetCategoryHasUsage = vi.fn();
vi.mock('../api/categories', () => ({
  getCategoriesHierarchy: (...args: unknown[]) => mockGetCategoriesHierarchy(...args),
  getExportCsv: (...args: unknown[]) => mockGetExportCsv(...args),
  getImportTemplate: (...args: unknown[]) => mockGetImportTemplate(...args),
  postImportAnalyze: (...args: unknown[]) => mockPostImportAnalyze(...args),
  postImportExecute: (...args: unknown[]) => mockPostImportExecute(...args),
  createCategory: (...args: unknown[]) => mockCreateCategory(...args),
  updateCategory: (...args: unknown[]) => mockUpdateCategory(...args),
  deleteCategory: (...args: unknown[]) => mockDeleteCategory(...args),
  restoreCategory: (...args: unknown[]) => mockRestoreCategory(...args),
  hardDeleteCategory: (...args: unknown[]) => mockHardDeleteCategory(...args),
  getCategoryHasUsage: (...args: unknown[]) => mockGetCategoryHasUsage(...args),
}));

/* ── Mocks: dnd-kit ───────────────────────────────────────────────────── */

vi.mock('@dnd-kit/core', () => ({
  DndContext: (props: { children: React.ReactNode }) => props.children,
  closestCenter: {},
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: () => ({}),
  useSensors: () => [],
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: (props: { children: React.ReactNode }) => props.children,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: (arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  },
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

/* ── Helpers ──────────────────────────────────────────────────────────── */

function renderWithProviders() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <AdminCategoriesPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

const baseCat = {
  parent_id: null,
  official_name: null,
  is_visible_sale: true,
  is_visible_reception: true,
  display_order: 0,
  display_order_entry: 0,
  price: null,
  max_price: null,
  deleted_at: null,
  created_at: '',
  updated_at: '',
  children: [] as unknown[],
};

/* ── Tests ────────────────────────────────────────────────────────────── */

describe('AdminCategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      accessToken: 'token',
      permissions: ['admin'],
    });
    mockGetCategoriesHierarchy.mockResolvedValue([]);
    mockGetCategoryHasUsage.mockResolvedValue({ has_usage: false });
  });

  it('renders page with title', async () => {
    renderWithProviders();
    await screen.findByTestId('categories-tree');
    expect(screen.getByTestId('admin-categories-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Catégories/ })).toBeInTheDocument();
  });

  it('shows Import, Export and Refresh buttons', async () => {
    renderWithProviders();
    await screen.findByTestId('categories-tree');
    expect(screen.getByTestId('admin-categories-import')).toBeInTheDocument();
    expect(screen.getByTestId('admin-categories-export')).toBeInTheDocument();
    expect(screen.getByTestId('admin-categories-refresh')).toBeInTheDocument();
  });

  it('shows forbidden when user lacks admin permission', () => {
    mockUseAuth.mockReturnValue({ accessToken: null, permissions: ['operator'] });
    renderWithProviders();
    expect(screen.getByTestId('admin-categories-forbidden')).toBeInTheDocument();
  });

  it('shows empty state when no categories', async () => {
    renderWithProviders();
    await screen.findByTestId('admin-categories-empty');
    expect(screen.getByTestId('categories-tree')).toBeInTheDocument();
  });

  it('shows categories tree with hierarchy and name prefixes', async () => {
    mockGetCategoriesHierarchy.mockResolvedValue([
      { ...baseCat, id: 'c1', name: 'Cat A', official_name: 'Official A' },
    ]);
    renderWithProviders();
    await screen.findByTestId('category-row-c1');
    expect(screen.getByText('(Cat A) Official A')).toBeInTheDocument();
    expect(screen.getByTestId('archive-c1')).toBeInTheDocument();
    expect(screen.getByTestId('edit-category-c1')).toBeInTheDocument();
  });

  it('shows restore and hard-delete icons for archived category', async () => {
    mockGetCategoriesHierarchy.mockResolvedValue([
      {
        ...baseCat,
        id: 'c2',
        name: 'Cat archivée',
        is_visible_sale: false,
        is_visible_reception: false,
        deleted_at: '2026-01-01T00:00:00Z',
      },
    ]);
    renderWithProviders();
    await screen.findByTestId('category-row-c2');
    expect(screen.getByTestId('restore-c2')).toBeInTheDocument();
    expect(screen.getByTestId('hard-delete-c2')).toBeInTheDocument();
  });

  it('shows Nouvelle catégorie button and opens form modal on click', async () => {
    renderWithProviders();
    await screen.findByTestId('categories-tree');
    const btn = screen.getByTestId('admin-categories-new-category');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Nouvelle catégorie');
    fireEvent.click(btn);
    await screen.findByTestId('admin-categories-form-modal');
    const submitBtn = await screen.findByTestId('form-category-submit');
    expect(submitBtn).toHaveTextContent('Créer');
  });

  it('opens edit form with Mettre à jour for active category', async () => {
    mockGetCategoriesHierarchy.mockResolvedValue([
      { ...baseCat, id: 'c1', name: 'Cat A', official_name: 'Official A' },
    ]);
    renderWithProviders();
    await screen.findByTestId('category-row-c1');
    const editBtn = screen.getByTestId('edit-category-c1');
    fireEvent.click(editBtn);
    await screen.findByTestId('admin-categories-form-modal');
    const submitBtn = await screen.findByTestId('form-category-submit');
    expect(submitBtn).toHaveTextContent('Mettre à jour');
  });

  /* ── Archiver / Restaurer ──────────────────────────────────────────── */

  it('shows archive ActionIcon for active categories', async () => {
    mockGetCategoriesHierarchy.mockResolvedValue([{ ...baseCat, id: 'c1', name: 'Cat A' }]);
    renderWithProviders();
    await screen.findByTestId('category-row-c1');
    expect(screen.getByTestId('archive-c1')).toBeInTheDocument();
  });

  it('dims archived categories and shows restore icon', async () => {
    mockGetCategoriesHierarchy.mockResolvedValue([
      { ...baseCat, id: 'c2', name: 'Archived Cat', deleted_at: '2026-01-01T00:00:00Z' },
    ]);
    renderWithProviders();
    await screen.findByTestId('category-row-c2');
    expect(screen.getByTestId('restore-c2')).toBeInTheDocument();
  });

  /* ── Expand/Collapse ───────────────────────────────────────────────── */

  it('shows expand/collapse chevron on parent and toggles children visibility', async () => {
    mockGetCategoriesHierarchy.mockResolvedValue([
      {
        ...baseCat,
        id: 'p1',
        name: 'Parent',
        children: [{ ...baseCat, id: 'ch1', name: 'Enfant', parent_id: 'p1' }],
      },
    ]);
    renderWithProviders();
    await screen.findByTestId('category-row-p1');

    expect(screen.getByTestId('toggle-expand-p1')).toBeInTheDocument();
    expect(screen.getByTestId('category-row-ch1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('toggle-expand-p1'));
    expect(screen.queryByTestId('category-row-ch1')).not.toBeInTheDocument();
  });

  /* ── Toggle Caisse / Réception ─────────────────────────────────────── */

  it('shows Caisse / Réception toggle buttons', async () => {
    renderWithProviders();
    await screen.findByTestId('categories-tree');
    expect(screen.getByTestId('view-mode-toggle')).toBeInTheDocument();
    expect(screen.getByText('Caisse')).toBeInTheDocument();
    expect(screen.getByText('Réception')).toBeInTheDocument();
  });

  it('shows reception alert when switching to Réception mode', async () => {
    renderWithProviders();
    await screen.findByTestId('categories-tree');
    fireEvent.click(screen.getByText('Réception'));
    expect(screen.getByTestId('reception-mode-alert')).toBeInTheDocument();
    expect(screen.getByText('Mode Réception')).toBeInTheDocument();
  });

  /* ── Barre de recherche ────────────────────────────────────────────── */

  it('search bar filters categories by name', async () => {
    mockGetCategoriesHierarchy.mockResolvedValue([
      { ...baseCat, id: 'c1', name: 'Vêtements' },
      { ...baseCat, id: 'c2', name: 'Livres' },
    ]);
    renderWithProviders();
    await screen.findByTestId('category-row-c1');

    const input = screen.getByPlaceholderText('Rechercher une catégorie...');
    fireEvent.change(input, { target: { value: 'Livres' } });

    expect(screen.queryByTestId('category-row-c1')).not.toBeInTheDocument();
    expect(screen.getByTestId('category-row-c2')).toBeInTheDocument();
  });

  /* ── API call verification tests ────────────────────────────────────── */

  it('calls createCategory API when form is submitted for new category', async () => {
    mockCreateCategory.mockResolvedValue({
      id: 'new-1',
      name: 'Test',
      parent_id: null,
      official_name: null,
      is_visible_sale: true,
      is_visible_reception: true,
      display_order: 0,
      display_order_entry: 0,
      price: null,
      max_price: null,
      deleted_at: null,
      created_at: '',
      updated_at: '',
      children: [],
    });
    mockGetCategoriesHierarchy.mockResolvedValue([]);
    renderWithProviders();
    await screen.findByTestId('categories-tree');

    fireEvent.click(screen.getByTestId('admin-categories-new-category'));
    await screen.findByTestId('admin-categories-form-modal');

    const nameWrapper = await screen.findByTestId('form-category-name');
    const nameInput = nameWrapper.querySelector('input') ?? nameWrapper;
    fireEvent.change(nameInput, { target: { value: 'Nouvelle' } });
    fireEvent.click(screen.getByTestId('form-category-submit'));

    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalledWith('token', {
        name: 'Nouvelle',
        parent_id: null,
        official_name: null,
        price: null,
        max_price: null,
      });
    });
  });

  it('calls deleteCategory API when archive is confirmed', async () => {
    mockDeleteCategory.mockResolvedValue(undefined);
    mockGetCategoriesHierarchy.mockResolvedValue([{ ...baseCat, id: 'c1', name: 'Cat A' }]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders();
    await screen.findByTestId('category-row-c1');

    fireEvent.click(screen.getByTestId('archive-c1'));

    await waitFor(() => {
      expect(mockDeleteCategory).toHaveBeenCalledWith('token', 'c1');
    });

    vi.restoreAllMocks();
  });

  it('calls updateCategory API when visibility checkbox is toggled', async () => {
    mockUpdateCategory.mockResolvedValue(undefined);
    mockGetCategoriesHierarchy.mockResolvedValue([
      { ...baseCat, id: 'c1', name: 'Cat A', is_visible_sale: true },
    ]);
    renderWithProviders();
    await screen.findByTestId('category-row-c1');

    const visibilityEl = screen.getByTestId('visibility-c1');
    const checkbox = visibilityEl.querySelector('input') ?? visibilityEl;
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockUpdateCategory).toHaveBeenCalledWith('token', 'c1', {
        is_visible_sale: false,
      });
    });
  });

  /* ── Drag-and-drop ──────────────────────────────────────────────────── */

  it('shows drag handle grip icon for each category', async () => {
    mockGetCategoriesHierarchy.mockResolvedValue([
      { ...baseCat, id: 'c1', name: 'Cat A' },
    ]);
    renderWithProviders();
    await screen.findByTestId('category-row-c1');
    expect(screen.getByTestId('grip-c1')).toBeInTheDocument();
  });

  /* ── Prix dans le formulaire ────────────────────────────────────────── */

  it('shows price and max_price fields in creation form', async () => {
    renderWithProviders();
    await screen.findByTestId('categories-tree');
    fireEvent.click(screen.getByTestId('admin-categories-new-category'));
    await screen.findByTestId('admin-categories-form-modal');
    expect(await screen.findByText('Prix fixe')).toBeInTheDocument();
    expect(screen.getByText('Prix maximum')).toBeInTheDocument();
  });

  /* ── Sort select ────────────────────────────────────────────────────── */

  it('shows sort select with default value', async () => {
    renderWithProviders();
    await screen.findByTestId('categories-tree');
    expect(screen.getByTestId('sort-select')).toBeInTheDocument();
  });

  /* ── Expand/Collapse all ────────────────────────────────────────────── */

  it('shows expand-all and collapse-all buttons with visible text', async () => {
    renderWithProviders();
    await screen.findByTestId('categories-tree');
    const expandBtn = screen.getByTestId('expand-all');
    const collapseBtn = screen.getByTestId('collapse-all');
    expect(expandBtn).toBeInTheDocument();
    expect(collapseBtn).toBeInTheDocument();
    expect(expandBtn).toHaveTextContent('Tout déplier');
    expect(collapseBtn).toHaveTextContent('Tout replier');
  });

  /* ── Download template in import modal ──────────────────────────────── */

  it('shows download template button inside import modal', async () => {
    renderWithProviders();
    await screen.findByTestId('categories-tree');
    fireEvent.click(screen.getByTestId('admin-categories-import'));
    await screen.findByTestId('admin-categories-download-template');
    expect(screen.getByTestId('admin-categories-download-template')).toBeInTheDocument();
  });
});
