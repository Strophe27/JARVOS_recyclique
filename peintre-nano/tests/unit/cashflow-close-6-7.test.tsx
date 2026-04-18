// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  CLOSE_VARIANCE_TOLERANCE_EUR,
  needsVarianceComment,
  theoreticalCloseAmount,
} from '../../src/api/cash-session-client';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CashflowCloseWizard } from '../../src/domains/cashflow/CashflowCloseWizard';
import '../../src/registry';
import '../../src/styles/tokens.css';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe('Story 6.7 — helpers clôture', () => {
  it('theoreticalCloseAmount = initial + total_sales + total_donations sans champ serveur', () => {
    expect(
      theoreticalCloseAmount({
        id: 's1',
        initial_amount: 50,
        current_amount: 50,
        status: 'open',
        total_sales: 25,
        total_donations: 2,
      }),
    ).toBe(77);
  });

  it('theoreticalCloseAmount priorise closing_preview_theoretical_amount du serveur', () => {
    expect(
      theoreticalCloseAmount({
        id: 's1',
        initial_amount: 10,
        current_amount: 23,
        status: 'open',
        total_sales: 13,
        total_donations: 0,
        closing_preview_theoretical_amount: 23,
      }),
    ).toBe(23);
  });

  it('needsVarianceComment au-delà de la tolérance', () => {
    expect(needsVarianceComment(10.1, 10)).toBe(true);
    expect(needsVarianceComment(10.04, 10)).toBe(false);
    expect(CLOSE_VARIANCE_TOLERANCE_EUR).toBe(0.05);
  });
});

describe('Story 6.7 — CashflowCloseWizard (gate + chargement)', () => {
  it('affiche le récap quand GET current retourne une session', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: '00000000-0000-4000-8000-000000000099',
              operator_id: 'op1',
              site_id: 'site1',
              initial_amount: 50,
              current_amount: 75,
              status: 'open',
              opened_at: '2026-01-01T00:00:00Z',
              total_sales: 25,
              total_donations: 0,
              total_weight_out: 1.5,
              totals: { sales_completed: 25, refunds: 0, net: 25 },
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowCloseWizard widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-close-recap')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-close-theoretical').textContent).toMatch(/75/);
    const recap = screen.getByTestId('cashflow-close-recap');
    expect(within(recap).getByText(/Ventes complétées/i)).toBeTruthy();
    expect(within(recap).getByText('1.5')).toBeTruthy();
  });

  it('refuse la clôture côté UI si écart > tolérance sans commentaire (pas de POST close)', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: '00000000-0000-4000-8000-000000000099',
              operator_id: 'op1',
              site_id: 'site1',
              initial_amount: 50,
              current_amount: 75,
              status: 'open',
              opened_at: '2026-01-01T00:00:00Z',
              total_sales: 25,
              total_donations: 0,
              total_weight_out: 0,
              totals: { sales_completed: 25, refunds: 0, net: 25 },
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowCloseWizard widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-close-recap')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Continuer vers le comptage/i }));

    const amountInput = screen.getByLabelText(/Montant compté/i);
    fireEvent.change(amountInput, { target: { value: '80' } });

    fireEvent.click(screen.getByRole('button', { name: /Continuer vers le PIN/i }));

    const pinInput = screen.getByLabelText(/PIN step-up/i);
    fireEvent.change(pinInput, { target: { value: '1234' } });

    fireEvent.click(screen.getByTestId('cashflow-close-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-close-submit-error')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-close-submit-error').textContent).toMatch(/commentaire/i);
    const closePosts = fetchMock.mock.calls.filter(
      (c) =>
        (typeof c[0] === 'string' ? c[0] : c[0] instanceof URL ? c[0].href : c[0].url).includes(
          '/close',
        ) && (c[1]?.method ?? 'GET').toUpperCase() === 'POST',
    );
    expect(closePosts.length).toBe(0);
  });
});
