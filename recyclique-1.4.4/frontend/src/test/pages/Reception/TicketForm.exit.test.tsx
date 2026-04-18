/**
 * Tests pour Story B48-P3: Sorties de Stock depuis Écran Réception
 * 
 * Valide :
 * - Checkbox "Sortie de stock" fonctionne
 * - Filtrage destinations dynamique (masquer MAGASIN si sortie)
 * - Destination par défaut change à RECYCLAGE si checkbox activée
 * - Indicateur visuel pour lignes sortie dans liste
 * - Envoi is_exit dans requêtes API
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TicketForm from '../../../pages/Reception/TicketForm';
import { useReception } from '../../../contexts/ReceptionContext';
import { useCategoryStore } from '../../../stores/categoryStore';
import { receptionService } from '../../../services/receptionService';

// Mock des stores et services
const mockUseReception = vi.fn();
const mockUseCategoryStore = vi.fn();
const mockAddLineToTicket = vi.fn();
const mockUpdateTicketLine = vi.fn();
const mockAddLine = vi.fn();
const mockUpdateLine = vi.fn();

vi.mock('../../../contexts/ReceptionContext', () => ({
  useReception: () => mockUseReception(),
}));

vi.mock('../../../stores/categoryStore', () => ({
  useCategoryStore: () => mockUseCategoryStore(),
}));

vi.mock('../../../services/receptionService', () => ({
  receptionService: {
    addLineToTicket: vi.fn(),
    updateTicketLine: vi.fn(),
    getTicket: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ ticketId: 'test-ticket-id' }),
  };
});

vi.mock('../../../services/sessionState', () => ({
  useStepState: () => ({
    stepState: { currentStep: 'ENTRY' },
    handleCategorySelected: vi.fn(),
    handleWeightInputStarted: vi.fn(),
    handleWeightInputCompleted: vi.fn(),
    handleItemValidated: vi.fn(),
    handleTicketClosed: vi.fn(),
  }),
}));

vi.mock('../../../stores/receptionShortcutStore', () => ({
  useReceptionShortcutStore: () => ({
    initializeShortcuts: vi.fn(),
    activateShortcuts: vi.fn(),
    deactivateShortcuts: vi.fn(),
    getKeyForPosition: vi.fn(),
    isActive: false,
  }),
}));

vi.mock('../../../components/SessionHeader', () => ({
  default: ({ title }: { title: string }) => <div data-testid="session-header">{title}</div>,
}));

vi.mock('../../../components/business/ReceptionKPIBanner', () => ({
  ReceptionKPIBanner: () => <div data-testid="kpi-banner">KPI Banner</div>,
}));

vi.mock('../../../components/ui/NumericKeypad', () => ({
  default: ({ onKeyPress, onClear, onBackspace }: any) => (
    <div data-testid="numeric-keypad">
      <button onClick={() => onKeyPress('1')}>1</button>
      <button onClick={() => onKeyPress('.')}>.</button>
      <button onClick={onClear}>C</button>
      <button onClick={onBackspace}>←</button>
    </div>
  ),
}));

const mockCategories = [
  { id: 'cat-1', name: 'EEE-1', parent_id: null, display_order: 1, is_active: true },
  { id: 'cat-2', name: 'EEE-2', parent_id: null, display_order: 2, is_active: true },
];

const mockTicket = {
  id: 'test-ticket-id',
  status: 'opened',
  created_at: new Date().toISOString(),
  lignes: [],
};

describe('TicketForm - B48-P3 Exit Lines', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseReception.mockReturnValue({
      currentTicket: null,
      isLoading: false,
      addLineToTicket: mockAddLineToTicket,
      updateTicketLine: mockUpdateTicketLine,
      deleteTicketLine: vi.fn(),
      closeTicket: vi.fn(),
      closePoste: vi.fn(),
      poste: { id: 'poste-1', status: 'open' },
      isDeferredMode: false,
      posteDate: null,
    });

    mockUseCategoryStore.mockReturnValue({
      visibleCategories: mockCategories,
      activeCategories: mockCategories,
      fetchVisibleCategories: vi.fn(),
      fetchCategories: vi.fn(),
      loading: false,
      error: null,
    });

    (receptionService.getTicket as any).mockResolvedValue(mockTicket);
    (receptionService.addLineToTicket as any).mockResolvedValue({
      id: 'line-1',
      ticket_id: 'test-ticket-id',
      category_id: 'cat-1',
      poids_kg: 5.5,
      destination: 'MAGASIN',
      is_exit: false,
    });
  });

  describe('Checkbox "Sortie de stock"', () => {
    it('should display checkbox "Sortie de stock"', async () => {
      render(
        <MemoryRouter>
          <TicketForm />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Sortie de stock/i)).toBeInTheDocument();
      });
    });

    it('should toggle is_exit state when checkbox is clicked', async () => {
      render(
        <MemoryRouter>
          <TicketForm />
        </MemoryRouter>
      );

      await waitFor(() => {
        const checkbox = screen.getByText(/Sortie de stock/i).previousElementSibling as HTMLInputElement;
        expect(checkbox).toBeInTheDocument();
        expect(checkbox.type).toBe('checkbox');
        expect(checkbox.checked).toBe(false);
      });

      const checkbox = screen.getByText(/Sortie de stock/i).previousElementSibling as HTMLInputElement;
      
      await act(async () => {
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        expect(checkbox.checked).toBe(true);
      });
    });
  });

  describe('Filtrage destinations dynamique', () => {
    it('should show all destinations when is_exit is false', async () => {
      render(
        <MemoryRouter>
          <TicketForm />
        </MemoryRouter>
      );

      await waitFor(() => {
        const select = screen.getByLabelText(/Destination/i) as HTMLSelectElement;
        expect(select).toBeInTheDocument();
        
        const options = Array.from(select.options).map(opt => opt.value);
        expect(options).toContain('MAGASIN');
        expect(options).toContain('RECYCLAGE');
        expect(options).toContain('DECHETERIE');
      });
    });

    it('should hide MAGASIN and show only RECYCLAGE/DECHETERIE when is_exit is true', async () => {
      render(
        <MemoryRouter>
          <TicketForm />
        </MemoryRouter>
      );

      await waitFor(() => {
        const checkbox = screen.getByText(/Sortie de stock/i).previousElementSibling as HTMLInputElement;
        expect(checkbox).toBeInTheDocument();
      });

      const checkbox = screen.getByText(/Sortie de stock/i).previousElementSibling as HTMLInputElement;
      
      await act(async () => {
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        const select = screen.getByLabelText(/Destination/i) as HTMLSelectElement;
        const options = Array.from(select.options).map(opt => opt.value);
        
        expect(options).not.toContain('MAGASIN');
        expect(options).toContain('RECYCLAGE');
        expect(options).toContain('DECHETERIE');
      });
    });

    it('should change default destination to RECYCLAGE when checkbox is activated', async () => {
      render(
        <MemoryRouter>
          <TicketForm />
        </MemoryRouter>
      );

      await waitFor(() => {
        const checkbox = screen.getByText(/Sortie de stock/i).previousElementSibling as HTMLInputElement;
        expect(checkbox).toBeInTheDocument();
      });

      const checkbox = screen.getByText(/Sortie de stock/i).previousElementSibling as HTMLInputElement;
      const select = screen.getByLabelText(/Destination/i) as HTMLSelectElement;
      
      // Vérifier destination initiale
      expect(select.value).toBe('MAGASIN');

      await act(async () => {
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        expect(select.value).toBe('RECYCLAGE');
      });
    });
  });

  describe('Envoi is_exit dans requêtes API', () => {
    it('should send is_exit=false when creating line without checkbox', async () => {
      render(
        <MemoryRouter>
          <TicketForm />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('EEE-1')).toBeInTheDocument();
      });

      // Sélectionner catégorie
      const categoryButton = screen.getByText('EEE-1');
      await act(async () => {
        fireEvent.click(categoryButton);
      });

      // Saisir poids
      await waitFor(() => {
        const keypad = screen.getByTestId('numeric-keypad');
        expect(keypad).toBeInTheDocument();
      });

      const key1 = screen.getByText('1');
      await act(async () => {
        fireEvent.click(key1);
        fireEvent.click(key1);
      });

      // Ajouter ligne
      await waitFor(() => {
        const addButton = screen.getByText(/Ajouter l'objet/i);
        expect(addButton).toBeInTheDocument();
      });

      const addButton = screen.getByText(/Ajouter l'objet/i);
      await act(async () => {
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(receptionService.addLineToTicket).toHaveBeenCalledWith(
          'test-ticket-id',
          expect.objectContaining({
            is_exit: false,
          })
        );
      });
    });

    it('should send is_exit=true when creating line with checkbox activated', async () => {
      render(
        <MemoryRouter>
          <TicketForm />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('EEE-1')).toBeInTheDocument();
      });

      // Activer checkbox
      const checkbox = screen.getByText(/Sortie de stock/i).previousElementSibling as HTMLInputElement;
      await act(async () => {
        fireEvent.click(checkbox);
      });

      // Sélectionner catégorie
      const categoryButton = screen.getByText('EEE-1');
      await act(async () => {
        fireEvent.click(categoryButton);
      });

      // Saisir poids
      const key1 = screen.getByText('1');
      await act(async () => {
        fireEvent.click(key1);
        fireEvent.click(key1);
      });

      // Ajouter ligne
      await waitFor(() => {
        const addButton = screen.getByText(/Ajouter l'objet/i);
        expect(addButton).toBeInTheDocument();
      });

      const addButton = screen.getByText(/Ajouter l'objet/i);
      await act(async () => {
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(receptionService.addLineToTicket).toHaveBeenCalledWith(
          'test-ticket-id',
          expect.objectContaining({
            is_exit: true,
            destination: 'RECYCLAGE',
          })
        );
      });
    });
  });

  describe('Indicateur visuel pour lignes sortie', () => {
    it('should display "SORTIE" badge for lines with is_exit=true', async () => {
      const ticketWithExitLine = {
        ...mockTicket,
        lignes: [
          {
            id: 'line-1',
            category_id: 'cat-1',
            category_label: 'EEE-1',
            poids_kg: 5.5,
            destination: 'RECYCLAGE',
            is_exit: true,
          },
          {
            id: 'line-2',
            category_id: 'cat-2',
            category_label: 'EEE-2',
            poids_kg: 3.0,
            destination: 'MAGASIN',
            is_exit: false,
          },
        ],
      };

      (receptionService.getTicket as any).mockResolvedValue(ticketWithExitLine);

      render(
        <MemoryRouter>
          <TicketForm />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('SORTIE')).toBeInTheDocument();
      });

      // Vérifier que seule la ligne avec is_exit=true a le badge
      const sortieBadges = screen.getAllByText('SORTIE');
      expect(sortieBadges.length).toBe(1);
    });

    it('should not display "SORTIE" badge for lines with is_exit=false', async () => {
      const ticketWithoutExitLine = {
        ...mockTicket,
        lignes: [
          {
            id: 'line-1',
            category_id: 'cat-1',
            category_label: 'EEE-1',
            poids_kg: 5.5,
            destination: 'MAGASIN',
            is_exit: false,
          },
        ],
      };

      (receptionService.getTicket as any).mockResolvedValue(ticketWithoutExitLine);

      render(
        <MemoryRouter>
          <TicketForm />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('SORTIE')).not.toBeInTheDocument();
      });
    });
  });
});

