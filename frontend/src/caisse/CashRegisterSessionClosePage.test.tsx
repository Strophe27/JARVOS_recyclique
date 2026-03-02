/**
 * Tests CashRegisterSessionClosePage — Story 5.3, 11.2, 18-9 (Vitest + RTL + MantineProvider).
 * Affichage totaux, saisie closing/actual/variance_comment, variance temps réel,
 * session vide, envoi POST close + step exit, redirection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { CashRegisterSessionClosePage } from './CashRegisterSessionClosePage';
import { useCashSessionStore } from './useCashSessionStore';
import * as caisseApi from '../api/caisse';

const mockSessionWithTotals = {
  id: 'session-close-1',
  operator_id: 'op-1',
  register_id: 'reg-1',
  site_id: 'site-1',
  initial_amount: 10000,  // 100€
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
  total_sales: 5000,  // 50€
  total_items: 3,
  created_at: '2026-02-27T10:00:00Z',
  updated_at: '2026-02-27T10:00:00Z',
};

const mockSessionEmpty = {
  ...mockSessionWithTotals,
  id: 'session-empty-1',
  total_sales: 0,
  total_items: 0,
  current_amount: 10000,
};

vi.mock('../api/caisse', () => ({
  getCurrentCashSession: vi.fn(),
  closeCashSession: vi.fn().mockResolvedValue({ id: 'session-close-1', status: 'closed' }),
  updateCashSessionStep: vi.fn().mockResolvedValue({}),
  getCashRegisters: vi.fn().mockResolvedValue([]),
  getCashSessionStatus: vi.fn().mockResolvedValue({ has_open_session: false, session_id: null }),
  openCashSession: vi.fn().mockResolvedValue({}),
  getCashSession: vi.fn().mockResolvedValue(null),
  getCashSessionDeferredCheck: vi.fn().mockResolvedValue({}),
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
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useCashSessionStore.setState({
      currentSession: null,
      loading: false,
      error: null,
    });
    vi.mocked(caisseApi.getCurrentCashSession).mockResolvedValue(mockSessionWithTotals as any);
    vi.mocked(caisseApi.closeCashSession).mockResolvedValue({
      id: 'session-close-1',
      status: 'closed',
    } as any);
    vi.mocked(caisseApi.updateCashSessionStep).mockResolvedValue({} as any);
  });

  it('renders page with test id cash-register-session-close-page', async () => {
    renderClosePage();
    await screen.findByTestId('cash-register-session-close-page');
    expect(screen.getByTestId('cash-register-session-close-page')).toBeInTheDocument();
  });

  it('displays session recap and totals when total_sales/total_items present', async () => {
    renderClosePage();
    await screen.findByTestId('cash-register-session-close-page');
    // Attendre que la session charge
    await screen.findByTestId('session-close-totals');
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
    await waitFor(() => {
      expect(vi.mocked(caisseApi.closeCashSession)).toHaveBeenCalledWith(
        'bff-session',
        'session-close-1',
        expect.objectContaining({
          closing_amount: 15000,
          actual_amount: 15000,
        })
      );
    });
  });

  // ——— Nouveaux tests Story 18-9 ———

  it('session vide : affiche alerte, formulaire masqué, bouton "Fermer quand même" présent', async () => {
    vi.mocked(caisseApi.getCurrentCashSession).mockResolvedValue(mockSessionEmpty as any);

    renderClosePage();
    await screen.findByTestId('cash-register-session-close-page');

    await waitFor(() => {
      expect(screen.getByTestId('session-close-empty-confirm')).toBeInTheDocument();
    });

    expect(screen.getByTestId('session-close-empty-confirm')).toHaveTextContent(/fermer quand même/i);
    expect(screen.queryByTestId('session-close-submit')).not.toBeInTheDocument();
  });

  it('variance > 5cts : affiche indicateur orange', async () => {
    renderClosePage();
    await screen.findByTestId('session-close-actual-amount');

    // Montant théorique = (10000 + 5000) / 100 = 150€
    // Saisir 160€ → écart = +1000 centimes > 5cts
    const input = screen.getByTestId('session-close-actual-amount');
    fireEvent.change(input, { target: { value: '160' } });

    await waitFor(() => {
      expect(screen.getByTestId('variance-indicator-warn')).toBeInTheDocument();
    });
  });

  it('variance ≤ 5cts : affiche indicateur vert', async () => {
    renderClosePage();
    await screen.findByTestId('session-close-actual-amount');

    // Montant théorique = 150€, saisir 150.05€ → écart = 5 centimes
    // VARIANCE_TOLERANCE_CENTS = 5 → condition : Math.abs(5) > 5 → false → indicateur vert
    const input = screen.getByTestId('session-close-actual-amount');
    fireEvent.change(input, { target: { value: '150.05' } });

    await waitFor(() => {
      expect(screen.getByTestId('variance-indicator-ok')).toBeInTheDocument();
    });
  });

  it('montant compté = montant théorique → indicateur vert (aucun écart)', async () => {
    renderClosePage();
    await screen.findByTestId('session-close-actual-amount');

    // Théorique = 150€, saisir exactement 150€ → écart 0
    const input = screen.getByTestId('session-close-actual-amount');
    fireEvent.change(input, { target: { value: '150' } });

    await waitFor(() => {
      expect(screen.getByTestId('variance-indicator-ok')).toBeInTheDocument();
    });
  });

  it('variance > 5cts et commentaire vide → soumission bloquée (bouton disabled)', async () => {
    renderClosePage();
    await screen.findByTestId('session-close-actual-amount');

    // Saisir un montant avec écart > 5cts
    const input = screen.getByTestId('session-close-actual-amount');
    fireEvent.change(input, { target: { value: '200' } });

    await waitFor(() => {
      expect(screen.getByTestId('variance-indicator-warn')).toBeInTheDocument();
    });

    // Le bouton submit doit être disabled car commentaire vide
    expect(screen.getByTestId('session-close-submit')).toBeDisabled();
  });

  it('soumission correcte : closeCashSession et updateCashSessionStep appelés avec step="exit"', async () => {
    renderClosePage();
    await screen.findByTestId('session-close-submit');

    await act(async () => {
      fireEvent.click(screen.getByTestId('session-close-submit'));
    });

    await waitFor(() => {
      expect(vi.mocked(caisseApi.updateCashSessionStep)).toHaveBeenCalledWith(
        'bff-session',
        'session-close-1',
        'exit'
      );
      expect(vi.mocked(caisseApi.closeCashSession)).toHaveBeenCalled();
    });
  });

  it('total_donations présent : montant théorique inclut les dons', async () => {
    const sessionWithDonations = {
      ...mockSessionWithTotals,
      total_donations: 1000,  // 10€ de dons → théorique = 100+50+10 = 160€
    };
    vi.mocked(caisseApi.getCurrentCashSession).mockResolvedValue(sessionWithDonations as any);

    renderClosePage();
    await screen.findByTestId('session-close-recap');

    await waitFor(() => {
      // Le récapitulatif doit afficher 160.00€ comme montant théorique
      expect(screen.getByTestId('session-close-recap')).toHaveTextContent('160.00');
    });
  });

  it('total_donations absent/null : montant théorique = initial + ventes sans erreur', async () => {
    const sessionWithoutDonations = {
      ...mockSessionWithTotals,
      total_donations: undefined,
    };
    vi.mocked(caisseApi.getCurrentCashSession).mockResolvedValue(sessionWithoutDonations as any);

    renderClosePage();
    await screen.findByTestId('session-close-recap');

    await waitFor(() => {
      // Théorique = 100+50 = 150€
      expect(screen.getByTestId('session-close-recap')).toHaveTextContent('150.00');
    });
  });
});
