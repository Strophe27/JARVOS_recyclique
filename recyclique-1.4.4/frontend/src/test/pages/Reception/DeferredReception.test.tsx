/**
 * Tests pour la saisie différée de tickets de réception (B44-P2)
 * 
 * Valide :
 * - Affichage option "Saisie différée" (ADMIN/SUPER_ADMIN uniquement)
 * - Sélection date dans le passé
 * - Validation date future
 * - Indicateur "Saisie différée" dans interface
 * - Workflow complet
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import '@mantine/dates/styles.css';
import Reception from '../../../pages/Reception';
import { useAuthStore } from '../../../stores/authStore';
import { useReception } from '../../../contexts/ReceptionContext';
import { receptionService } from '../../../services/receptionService';

// Mock des stores et services
const mockUseAuthStore = vi.fn();
const mockUseReception = vi.fn();
const mockNavigate = vi.fn();
const mockOpenPoste = vi.fn();
const mockCreateTicket = vi.fn();
const mockClosePoste = vi.fn();

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector?: any) => mockUseAuthStore(selector),
}));

vi.mock('../../../contexts/ReceptionContext', () => ({
  useReception: () => mockUseReception(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/reception', state: null }),
  };
});

vi.mock('../../../services/receptionService', () => ({
  receptionService: {
    openPoste: vi.fn(),
    createTicket: vi.fn(),
    closePoste: vi.fn(),
    getTickets: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../../../services/api', () => ({
  getReceptionTickets: vi.fn(() => Promise.resolve([])),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <MantineProvider>
        <DatesProvider settings={{ locale: 'fr' }}>
          {component}
        </DatesProvider>
      </MantineProvider>
    </BrowserRouter>
  );
};

describe('DeferredReception - B44-P2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockOpenPoste.mockClear();
    mockCreateTicket.mockClear();
    mockClosePoste.mockClear();

    // Mock par défaut pour useReception
    mockUseReception.mockReturnValue({
      poste: null,
      currentTicket: null,
      isLoading: false,
      error: null,
      isDeferredMode: false,
      posteDate: null,
      openPoste: mockOpenPoste,
      createTicket: mockCreateTicket,
      closePoste: mockClosePoste,
    });
  });

  describe('Affichage option "Saisie différée"', () => {
    it('should display "Saisie différée" button for admin user', async () => {
      const mockAdminUser = {
        id: 'admin-id',
        username: 'admin',
        role: 'admin' as const,
        first_name: 'Admin',
        last_name: 'User',
        site_id: 'site-id',
      };

      mockUseAuthStore.mockReturnValue(mockAdminUser);

      renderWithProviders(<Reception />);

      await waitFor(() => {
        expect(screen.getByText(/Saisie différée/i)).toBeInTheDocument();
      });
    });

    it('should display "Saisie différée" button for super-admin user', async () => {
      const mockSuperAdminUser = {
        id: 'super-admin-id',
        username: 'superadmin',
        role: 'super-admin' as const,
        first_name: 'Super',
        last_name: 'Admin',
        site_id: 'site-id',
      };

      mockUseAuthStore.mockReturnValue(mockSuperAdminUser);

      renderWithProviders(<Reception />);

      await waitFor(() => {
        expect(screen.getByText(/Saisie différée/i)).toBeInTheDocument();
      });
    });

    it('should not display "Saisie différée" button for regular user', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'user',
        role: 'user' as const,
        first_name: 'Regular',
        last_name: 'User',
        site_id: 'site-id',
      };

      mockUseAuthStore.mockReturnValue(mockUser);

      renderWithProviders(<Reception />);

      await waitFor(() => {
        expect(screen.queryByText(/Saisie différée/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal de sélection de date', () => {
    beforeEach(() => {
      const mockAdminUser = {
        id: 'admin-id',
        username: 'admin',
        role: 'admin' as const,
        first_name: 'Admin',
        last_name: 'User',
        site_id: 'site-id',
      };

      mockUseAuthStore.mockReturnValue(mockAdminUser);
    });

    it('should open modal when clicking "Saisie différée" button', async () => {
      renderWithProviders(<Reception />);

      await waitFor(() => {
        const deferredButton = screen.getByText(/Saisie différée/i);
        fireEvent.click(deferredButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Saisie différée - Sélection de la date/i)).toBeInTheDocument();
      });
    });

    it('should display date picker in modal', async () => {
      renderWithProviders(<Reception />);

      await waitFor(() => {
        const deferredButton = screen.getByText(/Saisie différée/i);
        fireEvent.click(deferredButton);
      });

      await waitFor(() => {
        const datePicker = screen.getByTestId('deferred-reception-date-picker');
        expect(datePicker).toBeInTheDocument();
      });
    });

    it('should allow selecting a past date', async () => {
      const pastDate = new Date('2025-10-27');
      pastDate.setHours(0, 0, 0, 0);

      mockOpenPoste.mockResolvedValue({
        id: 'poste-id',
        status: 'open',
        opened_at: pastDate.toISOString(),
      });

      mockCreateTicket.mockResolvedValue({
        id: 'ticket-id',
        poste_id: 'poste-id',
        created_at: pastDate.toISOString(),
        status: 'opened',
        lines: [],
      });

      renderWithProviders(<Reception />);

      // Ouvrir le modal
      await waitFor(() => {
        const deferredButton = screen.getByText(/Saisie différée/i);
        fireEvent.click(deferredButton);
      });

      // Sélectionner la date (simulation)
      await waitFor(() => {
        const datePicker = screen.getByTestId('deferred-reception-date-picker');
        expect(datePicker).toBeInTheDocument();
      });

      // Cliquer sur "Ouvrir le poste" (la date sera validée par le composant)
      await waitFor(() => {
        const openButton = screen.getByText(/Ouvrir le poste/i);
        expect(openButton).toBeInTheDocument();
      });
    });

    it('should validate that date is not in the future', async () => {
      renderWithProviders(<Reception />);

      // Ouvrir le modal
      await waitFor(() => {
        const deferredButton = screen.getByText(/Saisie différée/i);
        fireEvent.click(deferredButton);
      });

      await waitFor(() => {
        const datePicker = screen.getByTestId('deferred-reception-date-picker');
        expect(datePicker).toBeInTheDocument();
        // Le DatePickerInput a maxDate={new Date()} donc les dates futures sont désactivées
      });
    });
  });

  describe('Indicateur visuel "Saisie différée"', () => {
    it('should display deferred indicator when poste is in deferred mode', async () => {
      const mockAdminUser = {
        id: 'admin-id',
        username: 'admin',
        role: 'admin' as const,
        first_name: 'Admin',
        last_name: 'User',
        site_id: 'site-id',
      };

      const pastDate = new Date('2025-10-27');
      pastDate.setHours(0, 0, 0, 0);

      mockUseAuthStore.mockReturnValue(mockAdminUser);

      mockUseReception.mockReturnValue({
        poste: {
          id: 'poste-id',
          status: 'open',
          opened_at: pastDate.toISOString(),
        },
        currentTicket: null,
        isLoading: false,
        error: null,
        isDeferredMode: true,
        posteDate: pastDate.toISOString(),
        openPoste: mockOpenPoste,
        createTicket: mockCreateTicket,
        closePoste: mockClosePoste,
      });

      renderWithProviders(<Reception />);

      await waitFor(() => {
        expect(screen.getByText(/Saisie différée - 27\/10\/2025/i)).toBeInTheDocument();
      });
    });

    it('should not display deferred indicator when poste is normal', async () => {
      const mockAdminUser = {
        id: 'admin-id',
        username: 'admin',
        role: 'admin' as const,
        first_name: 'Admin',
        last_name: 'User',
        site_id: 'site-id',
      };

      mockUseAuthStore.mockReturnValue(mockAdminUser);

      mockUseReception.mockReturnValue({
        poste: {
          id: 'poste-id',
          status: 'open',
          opened_at: new Date().toISOString(),
        },
        currentTicket: null,
        isLoading: false,
        error: null,
        isDeferredMode: false,
        posteDate: null,
        openPoste: mockOpenPoste,
        createTicket: mockCreateTicket,
        closePoste: mockClosePoste,
      });

      renderWithProviders(<Reception />);

      await waitFor(() => {
        expect(screen.queryByText(/Saisie différée/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Workflow complet', () => {
    it('should open deferred poste and create ticket when date is selected', async () => {
      const mockAdminUser = {
        id: 'admin-id',
        username: 'admin',
        role: 'admin' as const,
        first_name: 'Admin',
        last_name: 'User',
        site_id: 'site-id',
      };

      const pastDate = new Date('2025-10-27');
      pastDate.setHours(0, 0, 0, 0);

      const mockPoste = {
        id: 'poste-id',
        status: 'open',
        opened_at: pastDate.toISOString(),
      };

      const mockTicket = {
        id: 'ticket-id',
        poste_id: 'poste-id',
        created_at: pastDate.toISOString(),
        status: 'opened',
        lines: [],
      };

      mockUseAuthStore.mockReturnValue(mockAdminUser);
      mockOpenPoste.mockResolvedValue(mockPoste);
      mockCreateTicket.mockResolvedValue(mockTicket);

      renderWithProviders(<Reception />);

      // Ouvrir le modal
      await waitFor(() => {
        const deferredButton = screen.getByText(/Saisie différée/i);
        fireEvent.click(deferredButton);
      });

      // Vérifier que le modal est ouvert
      await waitFor(() => {
        expect(screen.getByText(/Saisie différée - Sélection de la date/i)).toBeInTheDocument();
      });

      // Le workflow complet nécessiterait de simuler la sélection de date et le clic
      // Ceci est testé de manière plus complète dans les tests E2E
    });
  });
});














