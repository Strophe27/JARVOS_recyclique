import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test/test-utils';
import { useVirtualCashSessionStore } from '../../../stores/virtualCashSessionStore';
import { useAuthStore } from '../../../stores/authStore';
import VirtualCashRegister from '../VirtualCashRegister';

// Mock the stores
vi.mock('../../../stores/virtualCashSessionStore');
vi.mock('../../../stores/authStore');
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

const mockUseVirtualCashSessionStore = useVirtualCashSessionStore as any;
const mockUseAuthStore = useAuthStore as any;

describe('VirtualCashRegister', () => {
  const mockNavigate = vi.fn();

  const defaultMockStore = {
    isVirtualMode: true,
    currentSession: null,
    virtualSessions: [
      {
        id: 'virtual-session-1',
        operator_id: 'user-1',
        initial_amount: 50,
        current_amount: 50,
        status: 'open' as const,
        opened_at: '2024-01-01T10:00:00Z',
        total_sales: 0,
        total_items: 0
      }
    ],
    virtualSales: [],
    enableVirtualMode: vi.fn(),
    disableVirtualMode: vi.fn(),
    resetVirtualData: vi.fn(),
    fetchCurrentSession: vi.fn(),
    loading: false,
    error: null
  };

  const defaultAuthStore = {
    currentUser: {
      id: 'user-1',
      username: 'Test User'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockUseVirtualCashSessionStore.mockReturnValue(defaultMockStore);
    mockUseAuthStore.mockReturnValue(defaultAuthStore);

    // Mock react-router-dom
    vi.mocked(await import('react-router-dom')).useNavigate = vi.fn(() => mockNavigate);
  });

  it('should display virtual mode badge', () => {
    render(<VirtualCashRegister />);

    expect(screen.getByText('Mode virtuel')).toBeInTheDocument();
  });

  it('should display training mode alert', () => {
    render(<VirtualCashRegister />);

    expect(screen.getByText('Mode Simulation')).toBeInTheDocument();
    expect(screen.getByText(/Toutes les opérations sont simulées localement/)).toBeInTheDocument();
  });

  it('should show reset session button', () => {
    render(<VirtualCashRegister />);

    const resetButton = screen.getByRole('button', { name: /réinitialiser la session/i });
    expect(resetButton).toBeInTheDocument();
  });

  it('should show exit virtual mode button', () => {
    render(<VirtualCashSession />);

    const exitButton = screen.getByRole('button', { name: /quitter le mode virtuel/i });
    expect(exitButton).toBeInTheDocument();
  });

  it('should display virtual statistics when no active session', () => {
    render(<VirtualCashRegister />);

    expect(screen.getByText('Statistiques de Simulation')).toBeInTheDocument();
    expect(screen.getByText('Sessions simulées')).toBeInTheDocument();
    expect(screen.getByText('Ventes enregistrées')).toBeInTheDocument();
    expect(screen.getByText('Chiffre d\'affaires')).toBeInTheDocument();
  });

  it('should display open virtual session button when no active session', () => {
    render(<VirtualCashRegister />);

    const openSessionButton = screen.getByRole('button', { name: /ouvrir une session virtuelle/i });
    expect(openSessionButton).toBeInTheDocument();
  });

  it('should display active session info when session exists', () => {
    const mockStoreWithSession = {
      ...defaultMockStore,
      currentSession: defaultMockStore.virtualSessions[0]
    };

    mockUseVirtualCashSessionStore.mockReturnValue(mockStoreWithSession);

    render(<VirtualCashRegister />);

    expect(screen.getByText('Session Active')).toBeInTheDocument();
    expect(screen.getByText('Ouverte')).toBeInTheDocument();
    expect(screen.getByText('Fond initial:')).toBeInTheDocument();
    expect(screen.getByText('50.00€')).toBeInTheDocument();
  });

  it('should show resume session button when session is active', () => {
    const mockStoreWithSession = {
      ...defaultMockStore,
      currentSession: defaultMockStore.virtualSessions[0]
    };

    mockUseVirtualCashSessionStore.mockReturnValue(mockStoreWithSession);

    render(<VirtualCashRegister />);

    const resumeButton = screen.getByRole('button', { name: /continuer la session/i });
    expect(resumeButton).toBeInTheDocument();
  });

  it('should call resetVirtualData when reset button is clicked and confirmed', async () => {
    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<VirtualCashRegister />);

    const resetButton = screen.getByRole('button', { name: /réinitialiser la session/i });
    fireEvent.click(resetButton);

    expect(confirmSpy).toHaveBeenCalledWith(
      'Êtes-vous sûr de vouloir réinitialiser toutes les données virtuelles ? Cette action est irréversible.'
    );

    await waitFor(() => {
      expect(defaultMockStore.resetVirtualData).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it('should not call resetVirtualData when reset is cancelled', () => {
    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<VirtualCashRegister />);

    const resetButton = screen.getByRole('button', { name: /réinitialiser la session/i });
    fireEvent.click(resetButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(defaultMockStore.resetVirtualData).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should call disableVirtualMode when exit button is clicked', () => {
    render(<VirtualCashRegister />);

    const exitButton = screen.getByRole('button', { name: /quitter le mode virtuel/i });
    fireEvent.click(exitButton);

    expect(defaultMockStore.disableVirtualMode).toHaveBeenCalled();
  });

  it('should enable virtual mode on component mount if not already enabled', () => {
    const mockStoreDisabled = {
      ...defaultMockStore,
      isVirtualMode: false
    };

    mockUseVirtualCashSessionStore.mockReturnValue(mockStoreDisabled);

    render(<VirtualCashRegister />);

    expect(mockStoreDisabled.enableVirtualMode).toHaveBeenCalled();
  });

  it('should display virtual training badge with pulsing animation', () => {
    render(<VirtualCashRegister />);

    const badge = screen.getByText('🏆 MODE FORMATION');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('mantine-Badge-root');
  });
});















