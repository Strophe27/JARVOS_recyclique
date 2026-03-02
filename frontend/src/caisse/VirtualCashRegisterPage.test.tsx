/**
 * Tests VirtualCashRegisterPage — Story 18-10.
 * Vitest + RTL + MantineProvider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { VirtualCashRegisterPage } from './VirtualCashRegisterPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockOpenSession = vi.fn();
const mockClearError = vi.fn();
const mockReset = vi.fn();

let mockVirtualState = {
  currentSession: null as null | { id: string; status: string },
  loading: false,
  error: null as string | null,
  isVirtual: true as const,
  openSession: mockOpenSession,
  clearError: mockClearError,
  reset: mockReset,
};

vi.mock('./virtualCashSessionStore', () => ({
  useVirtualCashSessionStore: (selector?: (s: typeof mockVirtualState) => unknown) => {
    if (typeof selector === 'function') return selector(mockVirtualState);
    return mockVirtualState;
  },
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ accessToken: 'token' }),
}));

vi.mock('../api/caisse', () => ({
  getCashRegisters: vi.fn().mockResolvedValue([
    { id: 'reg-v1', name: 'Caisse V1', enable_virtual: true, enable_deferred: false, is_active: true, site_id: 's1', location: null, started_at: null, started_by_user_id: null, created_at: '', updated_at: '' },
    { id: 'reg-r1', name: 'Caisse Réelle', enable_virtual: false, enable_deferred: false, is_active: true, site_id: 's1', location: null, started_at: null, started_by_user_id: null, created_at: '', updated_at: '' },
  ]),
  updateCashSessionStep: vi.fn().mockResolvedValue({}),
}));

vi.mock('../shared/layout', () => ({
  PageContainer: ({ children, testId }: { children: React.ReactNode; testId?: string }) => (
    <div data-testid={testId}>{children}</div>
  ),
  PageSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function renderPage() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <VirtualCashRegisterPage />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('VirtualCashRegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVirtualState = {
      currentSession: null,
      loading: false,
      error: null,
      isVirtual: true as const,
      openSession: mockOpenSession,
      clearError: mockClearError,
      reset: mockReset,
    };
    mockNavigate.mockReset();
  });

  it('affiche le badge SIMULATION visible', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('virtual-mode-badge')).toBeInTheDocument();
    });
    expect(screen.getByTestId('virtual-mode-badge')).toHaveTextContent(/SIMULATION/i);
  });

  it('affiche uniquement les postes enable_virtual = true', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryByText('Caisse Réelle')).not.toBeInTheDocument();
    });
  });

  it('session null : affiche le formulaire d ouverture', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('virtual-session-submit')).toBeInTheDocument();
    });
    expect(screen.getByTestId('virtual-session-submit')).toHaveTextContent(/Démarrer la simulation/i);
  });

  it('soumission appelle openSession avec session_type virtual implicite', async () => {
    const fakeSession = { id: 'v1', status: 'open' };
    mockOpenSession.mockResolvedValueOnce(fakeSession);

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('virtual-session-submit')).toBeInTheDocument();
    });

    fireEvent.submit(screen.getByTestId('virtual-session-submit').closest('form')!);

    await waitFor(() => {
      expect(mockOpenSession).toHaveBeenCalledWith('token', {
        initial_amount: 0,
        register_id: 'reg-v1',
      });
    });
  });

  it('session ouverte : navigue vers /cash-register/sale', async () => {
    mockVirtualState = { ...mockVirtualState, currentSession: { id: 'v1', status: 'open' } };

    renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cash-register/sale');
    });
  });

  it('affiche l erreur si openSession échoue', async () => {
    mockVirtualState = { ...mockVirtualState, error: 'Erreur ouverture virtuelle' };

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('virtual-session-error')).toHaveTextContent('Erreur ouverture virtuelle');
    });
  });
});
