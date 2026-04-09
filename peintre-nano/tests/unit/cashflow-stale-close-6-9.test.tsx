// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CashflowCloseWizard } from '../../src/domains/cashflow/CashflowCloseWizard';
import { resetCashflowDraft, setCashflowWidgetDataState } from '../../src/domains/cashflow/cashflow-draft-store';
import '../../src/registry';

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

describe('Story 6.9 — DATA_STALE bloque la clôture (AC 4, transverse)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    resetCashflowDraft();
    setCashflowWidgetDataState('DATA_STALE');
  });

  afterEach(() => {
    cleanup();
    resetCashflowDraft();
    vi.unstubAllGlobals();
  });

  it('affiche l’alerte stale et désactive le bouton de clôture finale', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
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
        if (url.includes('/v2/exploitation/live-snapshot')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                sync_operational_summary: { worst_state: 'resolu', source_reachable: true },
                context: { site_id: 'site1' },
                effective_open_state: 'open',
                cash_session_effectiveness: 'open_effective',
                observed_at: new Date().toISOString(),
              }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
      }),
    );

    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowCloseWizard widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-close-recap')).toBeTruthy();
    });

    expect(screen.getByTestId('cashflow-close-stale-block')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Continuer vers le comptage/i }));
    const amountInput = screen.getByLabelText(/Montant compté/i);
    fireEvent.change(amountInput, { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: /Continuer vers le PIN/i }));

    expect((screen.getByTestId('cashflow-close-submit') as HTMLButtonElement).disabled).toBe(true);
  });
});
