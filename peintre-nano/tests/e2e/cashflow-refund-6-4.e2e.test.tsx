// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_REFUND,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/registry';
import '../../src/styles/tokens.css';

const SESSION = '00000000-0000-4000-8000-000000000001';
const SALE_COMPLETED_ID = 'cccccccc-cccc-4ccc-8ddd-333333333333';
const REVERSAL_ID = 'dddddddd-dddd-4ddd-8ddd-444444444444';

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
        id: 'item-refund-1',
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

describe('E2E — remboursement contrôlé (Story 6.4)', () => {
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
      session: { authenticated: true, userId: 'u-story64' },
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

  it('navigation : entrée Remboursement → /caisse/remboursement + wizard étape 1 (AC 1)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{}',
      }),
    );

    window.history.pushState({}, '', '/');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    const entry = within(nav).getByTestId('nav-entry-cashflow-refund');
    fireEvent.click(within(entry).getByRole('button'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/caisse/remboursement');
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-refund-step-select')).toBeTruthy();
    });
    expect(screen.getByText(/reversal, pas une vente nominale/i)).toBeTruthy();
  });

  it('sans permission caisse.refund : entrée nav absente (AC 2)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{}',
      }),
    );

    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_REFUND,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story64-no-refund' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: keys },
      }),
    });

    window.history.pushState({}, '', '/');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    expect(within(nav).queryByTestId('nav-entry-cashflow-refund')).toBeNull();
  });

  it('sans permission caisse.refund : URL /caisse/remboursement ne résout pas la page remboursement (entrée absente du nav filtré → pas de wizard, AC 2)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{}',
      }),
    );

    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_REFUND,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story64-no-refund-b' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: keys },
      }),
    });

    window.history.pushState({}, '', '/caisse/remboursement');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('four-artifacts-list')).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/caisse/remboursement');
    expect(screen.queryByTestId('cashflow-refund-step-select')).toBeNull();
    expect(screen.queryByTestId('cashflow-refund-context-blocked')).toBeNull();
  });

  it('flux heureux : GET getSale (completed) → confirmation → POST reversals → succès (AC 1, 2, 5)', async () => {
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
        const raw = init?.body != null ? String(init.body) : '{}';
        const body = JSON.parse(raw) as {
          source_sale_id?: string;
          reason_code?: string;
        };
        expect(body.source_sale_id).toBe(SALE_COMPLETED_ID);
        expect(body.reason_code).toBe('RETOUR_ARTICLE');
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: REVERSAL_ID }),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRefundPage();

    await waitFor(() => screen.getByTestId('cashflow-refund-step-select'));

    fireEvent.change(screen.getByTestId('cashflow-refund-sale-id-input'), {
      target: { value: SALE_COMPLETED_ID },
    });
    fireEvent.click(screen.getByTestId('cashflow-refund-load-sale'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-refund-step-confirm')).toBeTruthy();
    });
    expect(screen.getByText(/Confirmation — reversal/i)).toBeTruthy();
    expect(screen.getByText(/12\.50/)).toBeTruthy();

    fireEvent.click(screen.getByTestId('cashflow-refund-confirm-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-refund-success')).toBeTruthy();
    });
    expect(screen.getByText(new RegExp(REVERSAL_ID))).toBeTruthy();

    const reversalPosts = fetchMock.mock.calls.filter(([u, i]) => {
      const m = ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase();
      return m === 'POST' && requestUrl(u).includes('/v1/sales/reversals');
    });
    expect(reversalPosts.length).toBeGreaterThanOrEqual(1);
  });

  it('vente source non completed (held) : message bloquant après chargement (AC 5)', async () => {
    const held = { ...completedSaleBody(), lifecycle_status: 'held' as const };

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes(`/v1/sales/${SALE_COMPLETED_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(held),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRefundPage();

    await waitFor(() => screen.getByTestId('cashflow-refund-step-select'));

    fireEvent.change(screen.getByTestId('cashflow-refund-sale-id-input'), {
      target: { value: SALE_COMPLETED_ID },
    });
    fireEvent.click(screen.getByTestId('cashflow-refund-load-sale'));

    await waitFor(() => {
      const err = screen.getByTestId('cashflow-refund-error').textContent ?? '';
      expect(err).toMatch(/finalisé|completed/i);
    });
    expect(screen.queryByTestId('cashflow-refund-step-confirm')).toBeNull();
  });

  it('motif Autre sans détail : validation avant POST (AC 2)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes(`/v1/sales/${SALE_COMPLETED_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(completedSaleBody()),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRefundPage();

    await waitFor(() => screen.getByTestId('cashflow-refund-step-select'));

    fireEvent.change(screen.getByTestId('cashflow-refund-sale-id-input'), {
      target: { value: SALE_COMPLETED_ID },
    });
    fireEvent.click(screen.getByTestId('cashflow-refund-load-sale'));

    await waitFor(() => screen.getByTestId('cashflow-refund-step-confirm'));

    fireEvent.change(screen.getByTestId('cashflow-refund-reason'), { target: { value: 'AUTRE' } });
    fireEvent.change(screen.getByTestId('cashflow-refund-detail'), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('cashflow-refund-confirm-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-refund-error').textContent ?? '').toMatch(/Autre/i);
    });

    const reversalPosts = fetchMock.mock.calls.filter(([u, i]) => {
      const m = ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase();
      return m === 'POST' && requestUrl(u).includes('/v1/sales/reversals');
    });
    expect(reversalPosts.length).toBe(0);
  });

  it('erreur API sur POST reversal : message affiché (AC 2)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes(`/v1/sales/${SALE_COMPLETED_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(completedSaleBody()),
        });
      }
      if (method === 'POST' && url.includes('/v1/sales/reversals')) {
        return Promise.resolve({
          ok: false,
          status: 403,
          text: async () => JSON.stringify({ detail: 'Permission remboursement refusée' }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderRefundPage();

    await waitFor(() => screen.getByTestId('cashflow-refund-step-select'));

    fireEvent.change(screen.getByTestId('cashflow-refund-sale-id-input'), {
      target: { value: SALE_COMPLETED_ID },
    });
    fireEvent.click(screen.getByTestId('cashflow-refund-load-sale'));

    await waitFor(() => screen.getByTestId('cashflow-refund-step-confirm'));
    fireEvent.click(screen.getByTestId('cashflow-refund-confirm-submit'));

    await waitFor(() => {
      const err = screen.getByTestId('cashflow-refund-error').textContent ?? '';
      expect(err).toMatch(/403/);
    });
  });
});
