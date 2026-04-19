// @vitest-environment jsdom
/**
 * Story 24.3 — remboursement standard : moyen effectif, distinction origine, hint chaîne Paheko,
 * bandeau sync (live-snapshot) nominal ou dégradé sur le parcours wizard.
 */
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCashflowOperationalSyncNoticeCacheForTests } from '../../src/domains/cashflow/cashflow-operational-sync-notice';
import '../../src/registry';
import '../../src/styles/tokens.css';

const SESSION = '00000000-0000-4000-8000-000000000099';
const SALE_24_3_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-999999999999';
const REVERSAL_24_3_ID = 'cccccccc-cccc-4ccc-8ccc-aaaaaaaaaaaa';

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

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function paymentMethodOptionsBody(): string {
  return JSON.stringify([
    { code: 'cash', label: 'Espèces', kind: 'cash' },
    { code: 'card', label: 'Carte bancaire', kind: 'card' },
    { code: 'check', label: 'Chèque', kind: 'check' },
  ]);
}

function liveSnapshotResoluBody(): string {
  return JSON.stringify({
    sync_operational_summary: { worst_state: 'resolu', source_reachable: true },
    context: { site_id: 'site-demo' },
    effective_open_state: 'open',
    cash_session_effectiveness: 'open_effective',
    observed_at: new Date().toISOString(),
  });
}

function completedSaleCashOrigin() {
  return {
    id: SALE_24_3_ID,
    cash_session_id: SESSION,
    lifecycle_status: 'completed' as const,
    total_amount: 12.5,
    payment_method: 'cash',
    note: 'Ticket 24.3',
    items: [
      {
        id: 'item-243-1',
        sale_id: SALE_24_3_ID,
        category: 'EEE-1',
        quantity: 1,
        weight: 1,
        unit_price: 12.5,
        total_price: 12.5,
      },
    ],
    payments: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

describe('E2E — remboursement Story 24.3 (terrain + Paheko + sync)', () => {
  beforeEach(() => {
    resetCashflowOperationalSyncNoticeCacheForTests();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
    resetCashflowOperationalSyncNoticeCacheForTests();
  });

  function renderRefundPage() {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story-24-3-e2e' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });
    window.history.pushState({}, '', '/caisse/remboursement');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );
    return auth;
  }

  it('succès enrichi : moyen effectif carte, origine vente cash distincte, hint serveur, fiscal courant, sync résolu', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes('/v1/sales/payment-method-options')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => paymentMethodOptionsBody(),
        });
      }
      if (method === 'GET' && url.includes('/v2/exploitation/live-snapshot')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => liveSnapshotResoluBody(),
        });
      }
      if (method === 'GET' && url.includes(`/v1/sales/${SALE_24_3_ID}`) && !url.includes('reversals')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(completedSaleCashOrigin()),
        });
      }
      if (method === 'POST' && url.includes('/v1/sales/reversals')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: REVERSAL_24_3_ID,
              source_sale_id: SALE_24_3_ID,
              cash_session_id: SESSION,
              amount_signed: -12.5,
              refund_payment_method: 'card',
              source_sale_payment_method: 'cash',
              fiscal_branch: 'current',
              sale_fiscal_year: 2026,
              current_open_fiscal_year: 2026,
              paheko_accounting_sync_hint:
                'Indicateur test 24.3 : écriture comptable via snapshot de clôture de session uniquement.',
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRefundPage();

    await waitFor(() => screen.getByTestId('cashflow-refund-step-select'));
    await waitFor(() => screen.getByTestId('cashflow-sync-notice-resolu'));

    fireEvent.change(screen.getByTestId('cashflow-refund-sale-id-input'), {
      target: { value: SALE_24_3_ID },
    });
    fireEvent.click(screen.getByTestId('cashflow-refund-load-sale'));

    await waitFor(() => screen.getByTestId('cashflow-refund-step-confirm'));
    fireEvent.change(screen.getByTestId('cashflow-refund-payment-method'), { target: { value: 'card' } });
    fireEvent.click(screen.getByTestId('cashflow-refund-confirm-submit'));

    await waitFor(() => screen.getByTestId('cashflow-refund-success'));

    expect(screen.getByTestId('cashflow-refund-success-effective-pm').textContent).toMatch(/Carte bancaire/);
    expect(screen.getByTestId('cashflow-refund-success-paheko-hint').textContent).toMatch(/Indicateur test 24.3/);
    expect(screen.getByTestId('cashflow-refund-success-paheko-hint').textContent).toMatch(/clôture/);
    expect(screen.getByTestId('cashflow-refund-success-fiscal').textContent).toMatch(/exercice courant/);
    expect(screen.getByTestId('cashflow-refund-success').textContent).toMatch(/cash/);
    expect(screen.getByTestId('cashflow-sync-notice-resolu')).toBeTruthy();
  });

  it('dégradé live-snapshot : bandeau sync indisponible conservé après succès + hint Paheko explicite', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes('/v1/sales/payment-method-options')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => paymentMethodOptionsBody(),
        });
      }
      if (method === 'GET' && url.includes('/v2/exploitation/live-snapshot')) {
        return Promise.resolve({
          ok: false,
          status: 503,
          text: async () => JSON.stringify({ detail: 'Service unavailable' }),
        });
      }
      if (method === 'GET' && url.includes(`/v1/sales/${SALE_24_3_ID}`) && !url.includes('reversals')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(completedSaleCashOrigin()),
        });
      }
      if (method === 'POST' && url.includes('/v1/sales/reversals')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: REVERSAL_24_3_ID,
              refund_payment_method: 'cash',
              source_sale_payment_method: 'cash',
              paheko_accounting_sync_hint:
                'Pas d’écriture Paheko immédiate : lot exporté après clôture (test dégradé 24.3).',
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRefundPage();

    await waitFor(() => screen.getByTestId('cashflow-refund-step-select'));
    await waitFor(() => screen.getByTestId('cashflow-sync-notice-degraded'));
    expect(screen.getByTestId('cashflow-sync-notice-degraded').textContent).toMatch(/503/);

    fireEvent.change(screen.getByTestId('cashflow-refund-sale-id-input'), {
      target: { value: SALE_24_3_ID },
    });
    fireEvent.click(screen.getByTestId('cashflow-refund-load-sale'));

    await waitFor(() => screen.getByTestId('cashflow-refund-step-confirm'));
    fireEvent.click(screen.getByTestId('cashflow-refund-confirm-submit'));

    await waitFor(() => screen.getByTestId('cashflow-refund-success'));

    expect(screen.getByTestId('cashflow-sync-notice-degraded')).toBeTruthy();
    expect(screen.getByTestId('cashflow-refund-success-paheko-hint').textContent).toMatch(/clôture/);
    expect(screen.getByTestId('cashflow-refund-success-paheko-hint').textContent).toMatch(/dégradé 24.3/);
  });
});
