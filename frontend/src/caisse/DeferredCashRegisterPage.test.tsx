/**
 * Tests DeferredCashRegisterPage — Story 18-10.
 * Vitest + RTL + MantineProvider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { DeferredCashRegisterPage } from './DeferredCashRegisterPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockOpenSession = vi.fn();
const mockSetDeferredDate = vi.fn();
const mockClearError = vi.fn();
const mockReset = vi.fn();

let mockDeferredState = {
  currentSession: null as null | { id: string; status: string },
  deferredDate: null as string | null,
  loading: false,
  error: null as string | null,
  isDeferred: true as const,
  openSession: mockOpenSession,
  setDeferredDate: mockSetDeferredDate,
  clearError: mockClearError,
  reset: mockReset,
};

vi.mock('./deferredCashSessionStore', () => ({
  useDeferredCashSessionStore: (selector?: (s: typeof mockDeferredState) => unknown) => {
    if (typeof selector === 'function') return selector(mockDeferredState);
    return mockDeferredState;
  },
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ accessToken: 'token' }),
}));

const mockGetCashSessionDeferredCheck = vi.fn();
vi.mock('../api/caisse', () => ({
  getCashRegisters: vi.fn().mockResolvedValue([
    { id: 'reg-d1', name: 'Caisse Diff1', enable_virtual: false, enable_deferred: true, is_active: true, site_id: 's1', location: null, started_at: null, started_by_user_id: null, created_at: '', updated_at: '' },
  ]),
  getCashSessionDeferredCheck: (...args: unknown[]) => mockGetCashSessionDeferredCheck(...args),
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
        <DeferredCashRegisterPage />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('DeferredCashRegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeferredState = {
      currentSession: null,
      deferredDate: null,
      loading: false,
      error: null,
      isDeferred: true as const,
      openSession: mockOpenSession,
      setDeferredDate: mockSetDeferredDate,
      clearError: mockClearError,
      reset: mockReset,
    };
    mockNavigate.mockReset();
    mockGetCashSessionDeferredCheck.mockResolvedValue({ has_session: false, session_id: null, date: '' });
  });

  it('affiche le badge DIFFÉRÉ visible', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('deferred-mode-badge')).toBeInTheDocument();
    });
    expect(screen.getByTestId('deferred-mode-badge')).toHaveTextContent(/DIFFÉRÉ/i);
  });

  it('affiche le champ date obligatoire', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('deferred-session-date')).toBeInTheDocument();
    });
  });

  it('saisie date appelle setDeferredDate', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('deferred-session-date')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('deferred-session-date'), {
      target: { value: '2026-01-15' },
    });

    expect(mockSetDeferredDate).toHaveBeenCalledWith('2026-01-15');
  });

  it('soumission appelle openSession avec session_type = deferred et opened_at', async () => {
    mockDeferredState = { ...mockDeferredState };
    const fakeSession = { id: 'd1', status: 'open' };
    mockOpenSession.mockResolvedValueOnce(fakeSession);

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('deferred-session-date')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('deferred-session-date'), {
      target: { value: '2026-01-15' },
    });

    fireEvent.submit(screen.getByTestId('deferred-session-submit').closest('form')!);

    await waitFor(() => {
      expect(mockOpenSession).toHaveBeenCalledWith('token', {
        initial_amount: 0,
        register_id: 'reg-d1',
        opened_at: '2026-01-15T00:00:00.000Z',
      });
    });
  });

  it('session ouverte : navigue vers /cash-register/sale', async () => {
    mockDeferredState = { ...mockDeferredState, currentSession: { id: 'd1', status: 'open' } };

    renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cash-register/sale');
    });
  });

  it('vérification doublon : message si session existe déjà', async () => {
    mockGetCashSessionDeferredCheck.mockResolvedValueOnce({
      has_session: true,
      session_id: 'existing',
      date: '2026-01-15',
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('deferred-session-date')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('deferred-session-date'), {
      target: { value: '2026-01-15' },
    });

    fireEvent.click(screen.getByTestId('deferred-session-check'));

    await waitFor(() => {
      expect(screen.getByTestId('deferred-session-check-message')).toHaveTextContent(
        /existe déjà/i
      );
    });
  });

  it('affiche l erreur si openSession échoue', async () => {
    mockDeferredState = { ...mockDeferredState, error: 'Erreur ouverture différée' };

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('deferred-session-error')).toHaveTextContent(
        'Erreur ouverture différée'
      );
    });
  });
});
