/**
 * Tests CashRegisterSessionOpenPage — Story 5.1, 11.2, 18-9 (Vitest + RTL + MantineProvider).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { CashRegisterSessionOpenPage } from './CashRegisterSessionOpenPage';
import { useCashSessionStore } from './useCashSessionStore';
import * as caisseApi from '../api/caisse';

vi.mock('../api/caisse', () => ({
  getCashRegisters: vi.fn().mockResolvedValue([
    {
      id: 'r1',
      name: 'Caisse 1',
      site_id: 's1',
      location: null,
      is_active: true,
      enable_virtual: false,
      enable_deferred: false,
      started_at: null,
      started_by_user_id: null,
      created_at: '',
      updated_at: '',
    },
  ]),
  getCashSessionDeferredCheck: vi
    .fn()
    .mockResolvedValue({ date: '2026-02-27', has_session: false, session_id: null }),
  getCashSessionStatus: vi.fn().mockResolvedValue({
    register_id: 'r1',
    has_open_session: false,
    session_id: null,
    opened_at: null,
  }),
  openCashSession: vi.fn().mockResolvedValue({
    id: 'new-session-1',
    status: 'open',
    register_id: 'r1',
    initial_amount: 5000,
    current_amount: 5000,
    site_id: 's1',
    operator_id: 'op-1',
    opened_at: '2026-03-01T10:00:00Z',
    closed_at: null,
    current_step: 'entry',
    closing_amount: null,
    actual_amount: null,
    variance: null,
    variance_comment: null,
    session_type: 'real',
    total_sales: null,
    total_items: null,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  }),
  getCashSession: vi.fn().mockResolvedValue({
    id: 'existing-session-1',
    status: 'open',
    register_id: 'r1',
    initial_amount: 5000,
    current_amount: 5000,
    site_id: 's1',
    operator_id: 'op-1',
    opened_at: '2026-03-01T10:00:00Z',
    closed_at: null,
    current_step: 'sale',
    closing_amount: null,
    actual_amount: null,
    variance: null,
    variance_comment: null,
    session_type: 'real',
    total_sales: null,
    total_items: null,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  }),
  updateCashSessionStep: vi.fn().mockResolvedValue({}),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'bff-session',
  }),
}));

function renderWithRouter() {
  return render(
    <MantineProvider>
      <BrowserRouter>
        <CashRegisterSessionOpenPage />
      </BrowserRouter>
    </MantineProvider>
  );
}

describe('CashRegisterSessionOpenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useCashSessionStore.setState({
      currentSession: null,
      loading: false,
      error: null,
    });
    // Rétablir le mock par défaut pour getCashSessionStatus
    vi.mocked(caisseApi.getCashSessionStatus).mockResolvedValue({
      register_id: 'r1',
      has_open_session: false,
      session_id: null,
      opened_at: null,
    });
    vi.mocked(caisseApi.openCashSession).mockResolvedValue({
      id: 'new-session-1',
      status: 'open',
      register_id: 'r1',
      initial_amount: 5000,
      current_amount: 5000,
      site_id: 's1',
      operator_id: 'op-1',
      opened_at: '2026-03-01T10:00:00Z',
      closed_at: null,
      current_step: 'entry',
      closing_amount: null,
      actual_amount: null,
      variance: null,
      variance_comment: null,
      session_type: 'real',
      total_sales: null,
      total_items: null,
      created_at: '2026-03-01T10:00:00Z',
      updated_at: '2026-03-01T10:00:00Z',
    });
  });

  it('renders ouverture session title', async () => {
    renderWithRouter();
    expect(await screen.findByRole('heading', { name: /ouverture de session/i })).toBeInTheDocument();
  });

  it('has page test id', async () => {
    renderWithRouter();
    expect(await screen.findByTestId('page-session-open')).toBeInTheDocument();
  });

  it('has session type select and submit button', async () => {
    renderWithRouter();
    expect(await screen.findByTestId('session-open-type')).toBeInTheDocument();
    expect(await screen.findByTestId('session-open-submit')).toBeInTheDocument();
  });

  it('affiche alerte et bouton "Reprendre la session" quand session déjà ouverte', async () => {
    vi.mocked(caisseApi.getCashSessionStatus).mockResolvedValue({
      register_id: 'r1',
      has_open_session: true,
      session_id: 'existing-session-1',
      opened_at: '2026-03-01T10:00:00Z',
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId('session-existing-alert')).toBeInTheDocument();
    });
    expect(screen.getByTestId('session-existing-alert')).toHaveTextContent(
      /session est déjà ouverte/i
    );
    expect(screen.getByTestId('session-open-submit')).toHaveTextContent(/reprendre/i);
  });

  it('soumission formulaire : openCashSession appelé avec initial_amount en centimes', async () => {
    renderWithRouter();

    // Attendre que la page soit prête (formulaire chargé)
    await screen.findByTestId('session-open-initial-amount');

    // Saisir un montant
    fireEvent.change(screen.getByTestId('session-open-initial-amount'), {
      target: { value: '50' },
    });

    // Soumettre
    await act(async () => {
      fireEvent.click(screen.getByTestId('session-open-submit'));
    });

    await waitFor(() => {
      expect(vi.mocked(caisseApi.openCashSession)).toHaveBeenCalledWith(
        'bff-session',
        expect.objectContaining({ initial_amount: 5000 })
      );
    });
  });
});
