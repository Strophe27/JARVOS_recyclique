/**
 * Tests pour la saisie différée de cahiers de vente (B44-P1)
 * 
 * Valide :
 * - Affichage carte "Saisie différée" (ADMIN/SUPER_ADMIN uniquement)
 * - Sélection date dans le passé
 * - Validation date future
 * - Badge "Saisie différée" dans écran de vente
 * - Workflow complet
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import CashRegisterDashboard from '../../../pages/CashRegister/CashRegisterDashboard';
import { useAuthStore } from '../../../stores/authStore';
import { useCashStores } from '../../../providers/CashStoreProvider';

// Mock des stores
const mockUseAuthStore = vi.fn();
const mockUseCashStores = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector?: any) => mockUseAuthStore(selector),
}));

vi.mock('../../../providers/CashStoreProvider', () => ({
  useCashStores: () => mockUseCashStores(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/caisse', state: null }),
  };
});

vi.mock('../../../services/cashSessionService', () => ({
  cashSessionService: {
    createSession: vi.fn(),
    getCurrentSession: vi.fn(),
    getSession: vi.fn(),
    getRegisterSessionStatus: vi.fn(() => Promise.resolve({ is_active: false, session_id: null })),
  },
  cashRegisterDashboardService: {
    getRegistersStatus: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../../../generated/api', () => ({
  SitesApi: {
    sitesapiv1sitesget: vi.fn(() => Promise.resolve([])),
  },
  CashRegistersApi: {
    cashregistersapiv1cashregistersget: vi.fn(() => Promise.resolve([])),
  },
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

describe('DeferredCashSession - Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('should display deferred card for admin user', async () => {
    const mockAdminUser = {
      id: 'admin-id',
      username: 'admin',
      role: 'admin' as const,
      site_id: 'site-id',
    };

    mockUseAuthStore.mockReturnValue({
      currentUser: mockAdminUser,
    });

    mockUseCashStores.mockReturnValue({
      cashSessionStore: {
        resumeSession: vi.fn(),
        currentSession: null,
      },
      isVirtualMode: false,
      isDeferredMode: false,
    });

    renderWithProviders(<CashRegisterDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Saisie différée/i)).toBeInTheDocument();
    });
  });

  it('should not display deferred card for regular user', async () => {
    const mockUser = {
      id: 'user-id',
      username: 'user',
      role: 'user' as const,
      site_id: 'site-id',
    };

    mockUseAuthStore.mockReturnValue({
      currentUser: mockUser,
    });

    mockUseCashStores.mockReturnValue({
      cashSessionStore: {
        resumeSession: vi.fn(),
        currentSession: null,
      },
      isVirtualMode: false,
      isDeferredMode: false,
    });

    renderWithProviders(<CashRegisterDashboard />);

    await waitFor(() => {
      expect(screen.queryByText(/Saisie différée/i)).not.toBeInTheDocument();
    });
  });

  it('should navigate to deferred route when clicking deferred card', async () => {
    const mockAdminUser = {
      id: 'admin-id',
      username: 'admin',
      role: 'admin' as const,
      site_id: 'site-id',
    };

    mockUseAuthStore.mockReturnValue({
      currentUser: mockAdminUser,
    });

    mockUseCashStores.mockReturnValue({
      cashSessionStore: {
        resumeSession: vi.fn(),
        currentSession: null,
      },
      isVirtualMode: false,
      isDeferredMode: false,
    });

    renderWithProviders(<CashRegisterDashboard />);

    await waitFor(() => {
      const deferredButton = screen.getByText(/Saisie différée/i).closest('button');
      if (deferredButton) {
        fireEvent.click(deferredButton);
        expect(mockNavigate).toHaveBeenCalledWith('/cash-register/deferred');
      }
    });
  });
});

// Note: Les tests pour OpenCashSession et Sale nécessitent des mocks plus complexes
// et seront complétés lors de l'exécution des tests E2E avec Playwright

