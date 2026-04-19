// @vitest-environment jsdom
/**
 * Story 24.4 — parcours expert remboursement exercice antérieur clos (N-1) :
 * visibilité proactive sur le hub et dans le wizard, permission accounting.prior_year_refund,
 * happy path E2E (App + fetch) aligné sur les patterns cashflow-refund-6-4 / hub 24-2.
 */
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import {
  createDefaultDemoEnvelope,
  PERMISSION_ACCOUNTING_PRIOR_YEAR_REFUND,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/registry';
import '../../src/styles/tokens.css';

const SESSION = '00000000-0000-4000-8000-000000000001';
const SALE_PRIOR_CLOSED_ID = 'fafafaaf-fafa-4afa-8afa-aaaaaaaaaaaa';
const REVERSAL_PRIOR_ID = 'bdbdbdbe-bdbd-4bdb-8bdb-bbbbbbbbbbbb';

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

function priorClosedCompletedSaleBody() {
  return {
    id: SALE_PRIOR_CLOSED_ID,
    cash_session_id: SESSION,
    lifecycle_status: 'completed' as const,
    total_amount: 12.5,
    payment_method: 'cash',
    note: 'Ticket N-1 test',
    fiscal_branch: 'prior_closed',
    sale_fiscal_year: 2024,
    current_open_fiscal_year: 2026,
    items: [
      {
        id: 'item-prior-1',
        sale_id: SALE_PRIOR_CLOSED_ID,
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

describe('E2E — Story 24.4 remboursement expert N-1 (hub + visibilité + permission)', () => {
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
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
  });

  function renderRefundPage() {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story244' },
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

  it('hub : carte expert N-1 distincte du remboursement standard + CTA → /caisse/remboursement (AC 1)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{}',
      }),
    );

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story244-hub' },
      envelope: createDefaultDemoEnvelope(),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-hub')).toBeTruthy();
    });

    const cardStandard = screen.getByTestId('cashflow-special-ops-card-rembourser');
    const cardExpert = screen.getByTestId('cashflow-special-ops-card-remboursement-n1-expert');
    expect(within(cardStandard).getByText(/Rembourser \(standard\)/i)).toBeTruthy();
    expect(within(cardExpert).getByText(/Remboursement exercice antérieur clos \(expert N-1\)/i)).toBeTruthy();
    expect(within(cardExpert).getByText(/accounting\.prior_year_refund/)).toBeTruthy();

    fireEvent.click(screen.getByTestId('cashflow-special-ops-remboursement-n1-expert-cta'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/caisse/remboursement');
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-refund-step-select')).toBeTruthy();
    });
  });

  it('GET prior_closed : encart + panneau expert visibles avant POST ; sans permission N-1 le bouton reste bloqué (AC 1, 2, 4)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes(`/v1/sales/${SALE_PRIOR_CLOSED_ID}`) && !url.includes('reversals')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(priorClosedCompletedSaleBody()),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRefundPage();

    await waitFor(() => screen.getByTestId('cashflow-refund-step-select'));
    fireEvent.change(screen.getByTestId('cashflow-refund-sale-id-input'), {
      target: { value: SALE_PRIOR_CLOSED_ID },
    });
    fireEvent.click(screen.getByTestId('cashflow-refund-load-sale'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-refund-prior-closed-banner')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-refund-prior-year-panel')).toBeTruthy();
    expect(screen.getByText(/enveloppe ne contient pas.*accounting\.prior_year_refund/i)).toBeTruthy();

    const submit = screen.getByTestId('cashflow-refund-confirm-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fireEvent.click(screen.getByTestId('cashflow-refund-expert-prior-year'));
    expect(submit.disabled).toBe(true);
  });

  it('permission accounting.prior_year_refund + case : POST avec expert_prior_year_refund true → succès libellé expert N-1 (AC 2)', async () => {
    const keys = [...createDefaultDemoEnvelope().permissions.permissionKeys, PERMISSION_ACCOUNTING_PRIOR_YEAR_REFUND];
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story244-ok' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: SESSION,
        permissions: { permissionKeys: keys },
      }),
    });

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes(`/v1/sales/${SALE_PRIOR_CLOSED_ID}`) && !url.includes('reversals')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(priorClosedCompletedSaleBody()),
        });
      }
      if (method === 'POST' && url.includes('/v1/sales/reversals')) {
        const raw = init?.body != null ? String(init.body) : '{}';
        const body = JSON.parse(raw) as { expert_prior_year_refund?: boolean; source_sale_id?: string };
        expect(body.source_sale_id).toBe(SALE_PRIOR_CLOSED_ID);
        expect(body.expert_prior_year_refund).toBe(true);
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: REVERSAL_PRIOR_ID,
              fiscal_branch: 'prior_closed',
              amount_signed: -12.5,
              refund_payment_method: 'cash',
              source_sale_payment_method: 'cash',
              cash_session_id: SESSION,
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/caisse/remboursement');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => screen.getByTestId('cashflow-refund-step-select'));
    fireEvent.change(screen.getByTestId('cashflow-refund-sale-id-input'), {
      target: { value: SALE_PRIOR_CLOSED_ID },
    });
    fireEvent.click(screen.getByTestId('cashflow-refund-load-sale'));

    await waitFor(() => screen.getByTestId('cashflow-refund-prior-closed-banner'));
    fireEvent.click(screen.getByTestId('cashflow-refund-expert-prior-year'));

    const submit = screen.getByTestId('cashflow-refund-confirm-submit') as HTMLButtonElement;
    await waitFor(() => {
      expect(submit.disabled).toBe(false);
    });

    fireEvent.click(submit);

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-refund-success')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-refund-success-expert-n1-label')).toBeTruthy();

    const posts = fetchMock.mock.calls.filter(([u, i]) => {
      const m = ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase();
      return m === 'POST' && requestUrl(u).includes('/v1/sales/reversals');
    });
    expect(posts.length).toBe(1);
  });
});
