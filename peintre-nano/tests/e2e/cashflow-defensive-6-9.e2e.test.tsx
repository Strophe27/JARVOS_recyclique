// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
import { resetCashflowOperationalSyncNoticeCacheForTests } from '../../src/domains/cashflow/cashflow-operational-sync-notice';
import '../../src/registry';
import '../../src/styles/tokens.css';

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

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

describe('E2E — caisse défensive / sync / erreurs (Story 6.9)', () => {
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
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
    resetCashflowDraft();
    resetCashflowOperationalSyncNoticeCacheForTests();
  });

  it('bandeau sync différée (a_reessayer) sur le workspace vente quand le live-snapshot le signale', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes('/v2/exploitation/live-snapshot')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              sync_operational_summary: { worst_state: 'a_reessayer', source_reachable: true },
              context: { site_id: 'site-demo' },
              effective_open_state: 'open',
              cash_session_effectiveness: 'open_effective',
              observed_at: new Date().toISOString(),
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/cash-register/sale');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-nominal-wizard')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sync-notice-deferred')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-sync-notice-deferred').textContent).toMatch(/file côté serveur/i);
  });

  it('échec live-snapshot : bandeau dégradé sans prétendre un état sync détaillé', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes('/v2/exploitation/live-snapshot')) {
        return Promise.resolve({
          ok: false,
          status: 502,
          text: async () => JSON.stringify({ detail: 'Bad gateway' }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/cash-register/sale');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-nominal-wizard')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sync-notice-degraded')).toBeTruthy();
    });
  });

  it('POST vente avec retryable : message explicite + pas de ticket succès', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/sales/') && method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 429,
          text: async () =>
            JSON.stringify({
              code: 'RATE_LIMIT',
              detail: 'Trop de requêtes',
              retryable: true,
              correlation_id: 'e2e-69-rl',
            }),
        });
      }
      if (method === 'GET' && url.includes('/v2/exploitation/live-snapshot')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              sync_operational_summary: { worst_state: 'resolu', source_reachable: true },
              context: { site_id: 's' },
              effective_open_state: 'open',
              cash_session_effectiveness: 'open_effective',
              observed_at: new Date().toISOString(),
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/cash-register/sale');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => screen.getByTestId('cashflow-nominal-wizard'));

    fireEvent.click(screen.getByTestId('cashflow-add-line'));
    fireEvent.click(screen.getByTestId('cashflow-step-next'));
    fireEvent.click(screen.getByTestId('cashflow-step-next'));

    fireEvent.change(screen.getByRole('textbox', { name: /UUID session caisse/i }), {
      target: { value: '00000000-0000-4000-8000-000000000001' },
    });

    fireEvent.click(screen.getByRole('tab', { name: /paiement/i }));
    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-submit-error')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-submit-error').textContent).toMatch(/429/);
    expect(screen.getByTestId('cashflow-submit-error').textContent).toMatch(/Nouvel essai possible/i);
    expect(screen.getByTestId('cashflow-ticket-sale-id').textContent).toMatch(/Aucune vente finalisée/i);
  });
});
