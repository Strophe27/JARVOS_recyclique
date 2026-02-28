/**
 * Tests CashRegisterSessionClosePage — Story 5.3, 11.2 (Vitest + RTL + MantineProvider).
 * Affichage totaux, saisie closing/actual/variance_comment, envoi POST close, redirection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { CashRegisterSessionClosePage } from './CashRegisterSessionClosePage';

const mockSessionWithTotals = {
  id: 'session-close-1',
  operator_id: 'op-1',
  register_id: 'reg-1',
  site_id: 'site-1',
  initial_amount: 10000,
  current_amount: 15000,
  status: 'open',
  opened_at: '2026-02-27T10:00:00Z',
  closed_at: null,
  current_step: 'exit',
  closing_amount: null,
  actual_amount: null,
  variance: null,
  variance_comment: null,
  session_type: 'real',
  total_sales: 5000,
  total_items: 3,
  created_at: '2026-02-27T10:00:00Z',
  updated_at: '2026-02-27T10:00:00Z',
};

vi.mock('../api/caisse', () => ({
  getCurrentCashSession: vi.fn(),
  closeCashSession: vi.fn().mockResolvedValue({ id: 'session-close-1', status: 'closed' }),
}));
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'bff-session',
  }),
}));

function renderClosePage() {
  return render(
    <MantineProvider>
      <BrowserRouter>
        <CashRegisterSessionClosePage />
      </BrowserRouter>
    </MantineProvider>
  );
}

describe('CashRegisterSessionClosePage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getCurrentCashSession } = await import('../api/caisse');
    vi.mocked(getCurrentCashSession).mockResolvedValue(mockSessionWithTotals);
  });

  it('renders page with test id cash-register-session-close-page', async () => {
    renderClosePage();
    await screen.findByTestId('cash-register-session-close-page');
    expect(screen.getByTestId('cash-register-session-close-page')).toBeInTheDocument();
  });

  it('displays session recap and totals when total_sales/total_items present', async () => {
    renderClosePage();
    await screen.findByTestId('cash-register-session-close-page');
    expect(screen.getByTestId('session-close-totals')).toHaveTextContent(/Total ventes/);
    expect(screen.getByTestId('session-close-totals')).toHaveTextContent('50'); // 5000 centimes = 50 €
    expect(screen.getByTestId('session-close-totals')).toHaveTextContent('3'); // total_items
  });

  it('has closing amount, actual amount and variance comment inputs', async () => {
    renderClosePage();
    await screen.findByTestId('session-close-closing-amount');
    expect(screen.getByTestId('session-close-actual-amount')).toBeInTheDocument();
    expect(screen.getByTestId('session-close-variance-comment')).toBeInTheDocument();
  });

  it('calls closeCashSession on submit', async () => {
    renderClosePage();
    await screen.findByTestId('session-close-submit');
    await act(async () => {
      fireEvent.click(screen.getByTestId('session-close-submit'));
    });
    const { closeCashSession } = await import('../api/caisse');
    await waitFor(() => {
      expect(closeCashSession).toHaveBeenCalledWith(
        'bff-session',
        'session-close-1',
        expect.objectContaining({
          closing_amount: 15000,
          actual_amount: 15000,
        })
      );
    });
  });
});
