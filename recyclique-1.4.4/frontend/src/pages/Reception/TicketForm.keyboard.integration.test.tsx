import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TicketForm from './TicketForm';
import { ReceptionProvider, useReception } from '../../contexts/ReceptionContext';
import { useCategoryStore } from '../../stores/categoryStore';
import { useAuthStore } from '../../stores/authStore';
import { receptionService } from '../../services/receptionService';
import type { Category } from '../../services/categoryService';

// Mock the stores
vi.mock('../../stores/categoryStore', () => ({
  useCategoryStore: vi.fn()
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn()
}));

vi.mock('../../contexts/ReceptionContext', () => ({
  ReceptionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReception: vi.fn()
}));

// Mock the services
vi.mock('../../services/receptionService', () => ({
  receptionService: {
    getTicket: vi.fn(),
    addLineToTicket: vi.fn(),
    updateTicketLine: vi.fn(),
    deleteTicketLine: vi.fn(),
    closeTicket: vi.fn()
  }
}));

const mockUseCategoryStore = vi.mocked(useCategoryStore);
const mockUseAuthStore = vi.mocked(useAuthStore);
const mockUseReception = vi.mocked(useReception);
const mockGetTicket = vi.mocked(receptionService.getTicket);

const mockCategories: Category[] = [
  {
    id: 'cat-a',
    name: 'Category A',
    shortcut_key: 'a',
    is_active: true,
    parent_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'cat-b',
    name: 'Category B',
    shortcut_key: 'b',
    is_active: true,
    parent_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'cat-c',
    name: 'Category C',
    shortcut_key: null,
    is_active: true,
    parent_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];

const mockCurrentTicket = {
  id: 'ticket-1',
  status: 'open',
  lignes: []
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter initialEntries={['/reception/ticket-1']}>
    <Routes>
      <Route
        path="/reception/:ticketId"
        element={<ReceptionProvider>{children}</ReceptionProvider>}
      />
    </Routes>
  </MemoryRouter>
);

describe('TicketForm Keyboard Shortcuts Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock stores
    mockUseCategoryStore.mockReturnValue({
      activeCategories: mockCategories,
      visibleCategories: [],
      loading: false,
      error: null,
      fetchCategories: vi.fn(),
      fetchVisibleCategories: vi.fn(),
      getActiveCategories: vi.fn(() => mockCategories),
      getCategoryById: vi.fn((id) => mockCategories.find(cat => cat.id === id)),
      clearError: vi.fn()
    });

    mockUseAuthStore.mockReturnValue({
      currentUser: {
        id: 'user-1',
        username: 'testuser',
        role: 'user',
        status: 'active',
        is_active: true
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn()
    });

    mockUseReception.mockReturnValue({
      currentTicket: mockCurrentTicket,
      isLoading: false,
      addLineToTicket: vi.fn(),
      updateTicketLine: vi.fn(),
      deleteTicketLine: vi.fn(),
      closeTicket: vi.fn()
    });

    mockGetTicket.mockResolvedValue(mockCurrentTicket as never);

    // Setup DOM for keyboard events
    document.body.innerHTML = `
      <div id="root"></div>
      <input type="text" id="test-input" style="position: absolute; left: -9999px;" />
    `;
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = `
      <div id="root"></div>
      <input type="text" id="test-input" style="position: absolute; left: -9999px;" />
    `;
  });

  describe('shortcut display', () => {
    it('should display shortcut badges for categories with shortcuts', async () => {
      render(
        <TestWrapper>
          <TicketForm />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Category A')).toBeInTheDocument();
      });

      // Raccourcis positionnels AZERTY (receptionKeyboardShortcuts) : 1→A, 2→Z, 3→E
      const catA = screen.getByText('Category A').closest('button');
      const catZ = screen.getByText('Category B').closest('button');
      const catE = screen.getByText('Category C').closest('button');
      expect(catA?.querySelector('[aria-hidden="true"]')?.textContent).toBe('A');
      expect(catZ?.querySelector('[aria-hidden="true"]')?.textContent).toBe('Z');
      expect(catE?.querySelector('[aria-hidden="true"]')?.textContent).toBe('E');
    });

    it('should have proper accessibility labels', async () => {
      render(
        <TestWrapper>
          <TicketForm />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Category A')).toBeInTheDocument();
      });

      const categoryAButton = screen.getByText('Category A').closest('button');
      expect(categoryAButton).toHaveAttribute(
        'aria-label',
        'Sélectionner Category A. Raccourci clavier: A (position 1)'
      );

      const categoryCButton = screen.getByText('Category C').closest('button');
      expect(categoryCButton).toHaveAttribute(
        'aria-label',
        'Sélectionner Category C. Raccourci clavier: E (position 3)'
      );
    });
  });

  describe('keyboard shortcuts functionality', () => {
    it('should trigger category selection via keyboard shortcut', async () => {
      render(
        <TestWrapper>
          <TicketForm />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Category A')).toBeInTheDocument();
      });

      // body → bubble vers document où le handler ReceptionKeyboardShortcutHandler est branché
      fireEvent.keyDown(document.body, { key: 'a', bubbles: true, cancelable: true });

      await waitFor(() => {
        expect(screen.getByText('Catégorie sélectionnée:')).toBeInTheDocument();
      });
      // « Category A » apparaît à la fois sur le bouton catégorie et dans le fil du centre
      expect(screen.getAllByText('Category A').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle uppercase shortcut keys', async () => {
      render(
        <TestWrapper>
          <TicketForm />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Category A')).toBeInTheDocument();
      });

      fireEvent.keyDown(document.body, { key: 'A', shiftKey: false, bubbles: true, cancelable: true });

      await waitFor(() => {
        expect(screen.getByText('Catégorie sélectionnée:')).toBeInTheDocument();
      });
    });

    it('should not trigger shortcuts when ticket is closed', async () => {
      // Avec :ticketId dans l'URL, le ticket affiché vient de getTicket (loadedTicket), pas du contexte
      mockGetTicket.mockResolvedValue({ ...mockCurrentTicket, status: 'closed' } as never);

      render(
        <TestWrapper>
          <TicketForm />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Category A')).toBeInTheDocument();
      });

      fireEvent.keyDown(document.body, { key: 'a', bubbles: true, cancelable: true });

      // Should not select category (no breadcrumb)
      expect(screen.queryByText('Catégorie sélectionnée:')).not.toBeInTheDocument();
    });

    it('should prevent shortcuts when input is focused', async () => {
      render(
        <TestWrapper>
          <TicketForm />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Category A')).toBeInTheDocument();
      });

      // Focus on an input element
      const input = document.getElementById('test-input') as HTMLInputElement;
      input.focus();

      fireEvent.keyDown(input, { key: 'a', bubbles: true, cancelable: true });

      // Should not select category
      expect(screen.queryByText('Catégorie sélectionnée:')).not.toBeInTheDocument();
    });
  });

  describe('user role compatibility', () => {
    it('should work for benevole (user) role', async () => {
      mockUseAuthStore.mockReturnValue({
        currentUser: {
          id: 'user-1',
          username: 'benevole',
          role: 'user',
          status: 'active',
          is_active: true
        },
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn()
      });

      render(
        <TestWrapper>
          <TicketForm />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Category A')).toBeInTheDocument();
      });

      const btnB = screen.getByText('Category B').closest('button');
      expect(btnB?.querySelector('[aria-hidden="true"]')?.textContent).toBe('Z');
    });

    it('should work for admin role', async () => {
      mockUseAuthStore.mockReturnValue({
        currentUser: {
          id: 'admin-1',
          username: 'admin',
          role: 'admin',
          status: 'active',
          is_active: true
        },
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn()
      });

      render(
        <TestWrapper>
          <TicketForm />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Category A')).toBeInTheDocument();
      });

      const btnB = screen.getByText('Category B').closest('button');
      expect(btnB?.querySelector('[aria-hidden="true"]')?.textContent).toBe('Z');
    });

    it('should work for superadmin role', async () => {
      mockUseAuthStore.mockReturnValue({
        currentUser: {
          id: 'superadmin-1',
          username: 'superadmin',
          role: 'super-admin',
          status: 'active',
          is_active: true
        },
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn()
      });

      render(
        <TestWrapper>
          <TicketForm />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Category A')).toBeInTheDocument();
      });

      const btnB = screen.getByText('Category B').closest('button');
      expect(btnB?.querySelector('[aria-hidden="true"]')?.textContent).toBe('Z');
    });
  });
});
