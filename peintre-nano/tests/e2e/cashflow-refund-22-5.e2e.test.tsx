// @vitest-environment jsdom
/**
 * Story 22.5 — remboursement canonique : erreurs HTTP 409 stables affichées côté wizard
 * (autorité exercice / parcours expert), sans inférer le métier — préparation caisse pour corrélation backend.
 */
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/registry';
import '../../src/styles/tokens.css';

const SESSION = '00000000-0000-4000-8000-000000000002';
const SALE_COMPLETED_ID = 'eeeeeeee-eeee-4eee-8eee-555555555555';

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

function completedSaleBody() {
  return {
    id: SALE_COMPLETED_ID,
    cash_session_id: SESSION,
    lifecycle_status: 'completed' as const,
    total_amount: 12.5,
    items: [
      {
        id: 'item-s225-1',
        sale_id: SALE_COMPLETED_ID,
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

describe('E2E — remboursement Story 22.5 (409 autorité / expert)', () => {
  beforeEach(() => {
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
  });

  function renderRefundPage() {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story225' },
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

  async function goToConfirmStep(fetchMock: typeof vi.fn) {
    vi.stubGlobal('fetch', fetchMock);
    renderRefundPage();
    await waitFor(() => screen.getByTestId('cashflow-refund-step-select'));
    fireEvent.change(screen.getByTestId('cashflow-refund-sale-id-input'), {
      target: { value: SALE_COMPLETED_ID },
    });
    fireEvent.click(screen.getByTestId('cashflow-refund-load-sale'));
    await waitFor(() => screen.getByTestId('cashflow-refund-step-confirm'));
  }

  it('409 CONFLICT + détail [PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH] : alerte opératrice (AC 6–7)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes(`/v1/sales/${SALE_COMPLETED_ID}`) && !url.includes('reversals')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(completedSaleBody()),
        });
      }
      if (method === 'POST' && url.includes('/v1/sales/reversals')) {
        return Promise.resolve({
          ok: false,
          status: 409,
          text: async () =>
            JSON.stringify({
              detail:
                '[PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH] Remboursement sur exercice antérieur clos : parcours expert requis.',
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });

    await goToConfirmStep(fetchMock);
    fireEvent.click(screen.getByTestId('cashflow-refund-confirm-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-refund-error')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-refund-prior-year-panel')).toBeTruthy();
    expect(within(screen.getByTestId('cashflow-refund-error')).getByTestId('cashflow-error-http-status').textContent).toMatch(
      /409/,
    );
    const primary = within(screen.getByTestId('cashflow-refund-error')).getByTestId('cashflow-error-primary')
      .textContent;
    expect(primary).toMatch(/PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH/);
  });

  it('409 + détail [ACCOUNTING_PERIOD_AUTHORITY_UNAVAILABLE] : pas de succès (AC 3, 6)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes(`/v1/sales/${SALE_COMPLETED_ID}`) && !url.includes('reversals')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(completedSaleBody()),
        });
      }
      if (method === 'POST' && url.includes('/v1/sales/reversals')) {
        return Promise.resolve({
          ok: false,
          status: 409,
          text: async () =>
            JSON.stringify({
              detail:
                '[ACCOUNTING_PERIOD_AUTHORITY_UNAVAILABLE] Aucune autorité comptable locale — blocage (Story 22.5).',
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });

    await goToConfirmStep(fetchMock);
    fireEvent.click(screen.getByTestId('cashflow-refund-confirm-submit'));

    await waitFor(() => {
      const primary = within(screen.getByTestId('cashflow-refund-error')).getByTestId('cashflow-error-primary')
        .textContent;
      expect(primary).toMatch(/ACCOUNTING_PERIOD_AUTHORITY_UNAVAILABLE/);
    });
    expect(screen.queryByTestId('cashflow-refund-success')).toBeNull();
  });

  it('409 + détail [ACCOUNTING_PERIOD_AUTHORITY_STALE] : message périmé visible (AC 3, 6)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes(`/v1/sales/${SALE_COMPLETED_ID}`) && !url.includes('reversals')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(completedSaleBody()),
        });
      }
      if (method === 'POST' && url.includes('/v1/sales/reversals')) {
        return Promise.resolve({
          ok: false,
          status: 409,
          text: async () =>
            JSON.stringify({
              detail:
                '[ACCOUNTING_PERIOD_AUTHORITY_STALE] Instantané autorité trop ancien — rafraîchir (Story 22.5).',
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });

    await goToConfirmStep(fetchMock);
    fireEvent.click(screen.getByTestId('cashflow-refund-confirm-submit'));

    await waitFor(() => {
      const primary = within(screen.getByTestId('cashflow-refund-error')).getByTestId('cashflow-error-primary')
        .textContent;
      expect(primary).toMatch(/ACCOUNTING_PERIOD_AUTHORITY_STALE/);
    });
  });
});
