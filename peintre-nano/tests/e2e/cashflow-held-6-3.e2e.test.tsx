// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { getCashflowDraftSnapshot, resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
import '../../src/registry';
import '../../src/styles/tokens.css';

const SESSION = '00000000-0000-4000-8000-000000000001';
const HELD_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-111111111111';

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

function heldSaleBody(overrides?: { lifecycle_status?: string }) {
  return {
    id: HELD_ID,
    cash_session_id: SESSION,
    total_amount: 5,
    lifecycle_status: overrides?.lifecycle_status ?? 'held',
    items: [
      {
        id: 'item-held-1',
        sale_id: HELD_ID,
        category: 'EEE-1',
        quantity: 1,
        weight: 1,
        unit_price: 5,
        total_price: 5,
      },
    ],
    payments: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

describe('E2E — ticket en attente (Story 6.3)', () => {
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
    resetCashflowDraft();
  });

  function renderCaisseWithSession() {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-story63' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: SESSION,
      }),
    });
    window.history.pushState({}, '', '/caisse');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );
    return auth;
  }

  it('mise en attente → liste GET /held → reprise GET getSale → finalisation POST finalize-held (AC 1, 2, 4)', async () => {
    let heldList: ReturnType<typeof heldSaleBody>[] = [];

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (method === 'POST' && url.includes('/v1/sales/hold')) {
        heldList = [heldSaleBody()];
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: HELD_ID }),
        });
      }

      if (method === 'GET' && url.includes('/v1/sales/held')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(heldList),
        });
      }

      if (method === 'GET' && url.includes(`/v1/sales/${HELD_ID}`) && !url.includes('finalize')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(heldList[0] ?? heldSaleBody()),
        });
      }

      if (method === 'POST' && url.includes(`/v1/sales/${HELD_ID}/finalize-held`)) {
        const completed = {
          ...heldSaleBody({ lifecycle_status: 'completed' }),
          id: 'bbbbbbbb-bbbb-4ccc-8ddd-222222222222',
        };
        heldList = [];
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(completed),
        });
      }

      if (method === 'POST' && url.includes('/v1/sales/') && !url.includes('hold') && !url.includes('finalize') && !url.includes('abandon')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'unexpected-create' }),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderCaisseWithSession();

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-nominal-wizard')).toBeTruthy();
    });

    await waitFor(() => {
      expect(getCashflowDraftSnapshot().cashSessionIdInput).toBe(SESSION);
    });

    fireEvent.click(screen.getByTestId('cashflow-add-line'));
    expect(screen.getByTestId('cashflow-lines-count').textContent ?? '').toContain('Lignes : 1');

    fireEvent.click(screen.getByTestId('cashflow-put-on-hold'));

    await waitFor(() => {
      expect(screen.getByTestId('caisse-local-issue-message').textContent ?? '').toMatch(/mis en attente côté serveur/i);
    });

    await waitFor(() => {
      expect(screen.getByTestId(`cashflow-resume-held-${HELD_ID}`)).toBeTruthy();
    });

    const holdPosts = fetchMock.mock.calls.filter(
      ([u, i]) =>
        (i as RequestInit | undefined)?.method?.toUpperCase() === 'POST' && requestUrl(u).includes('/v1/sales/hold'),
    );
    expect(holdPosts.length).toBeGreaterThanOrEqual(1);

    const listCalls = fetchMock.mock.calls.filter(([u]) => requestUrl(u).includes('/v1/sales/held'));
    expect(listCalls.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByTestId(`cashflow-resume-held-${HELD_ID}`));

    await waitFor(() => {
      expect(screen.getByTestId('caisse-held-ticket-banner')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('caisse-ticket-loading')).toBeNull();
    });
    expect(screen.getByTestId('caisse-active-held-id').textContent ?? '').toContain(HELD_ID);

    fireEvent.click(screen.getByRole('tab', { name: /paiement/i }));

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));

    await waitFor(() => {
      const t = screen.getByTestId('cashflow-ticket-sale-id').textContent ?? '';
      expect(t).toContain('bbbbbbbb-bbbb-4ccc-8ddd-222222222222');
    });

    const finalizeCalls = fetchMock.mock.calls.filter(([u, i]) => {
      const m = ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase();
      return m === 'POST' && requestUrl(u).includes('/finalize-held');
    });
    expect(finalizeCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('reprise refusée si getSale ne renvoie plus lifecycle held : erreur dans le store (AC 2)', async () => {
    const completedOnly = heldSaleBody({ lifecycle_status: 'completed' });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (method === 'GET' && url.includes('/v1/sales/held')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([completedOnly]),
        });
      }

      if (method === 'GET' && url.includes(`/v1/sales/${HELD_ID}`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(completedOnly),
        });
      }

      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderCaisseWithSession();

    await waitFor(() => screen.getByTestId('cashflow-held-tickets-panel'));
    await waitFor(() => screen.getByTestId(`cashflow-resume-held-${HELD_ID}`));

    fireEvent.click(screen.getByTestId(`cashflow-resume-held-${HELD_ID}`));

    await waitFor(() => {
      const se = getCashflowDraftSnapshot().submitError;
      const msg =
        se?.kind === 'local' ? se.message : se?.kind === 'api' ? se.failure.message : '';
      expect(msg).toMatch(/plus en attente/i);
    });
  });

  it('abandon POST …/abandon-held puis rafraîchissement liste (AC 1, 2)', async () => {
    let heldList: ReturnType<typeof heldSaleBody>[] = [heldSaleBody()];

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (method === 'GET' && url.includes('/v1/sales/held')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(heldList),
        });
      }

      if (method === 'POST' && url.includes(`/v1/sales/${HELD_ID}/abandon-held`)) {
        heldList = [];
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ ok: true }),
        });
      }

      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderCaisseWithSession();

    await waitFor(() => screen.getByTestId(`cashflow-abandon-held-${HELD_ID}`));

    fireEvent.click(screen.getByTestId(`cashflow-abandon-held-${HELD_ID}`));

    await waitFor(() => {
      const abandonCalls = fetchMock.mock.calls.filter(([u, i]) => {
        const m = ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase();
        return m === 'POST' && requestUrl(u).includes('/abandon-held');
      });
      expect(abandonCalls.length).toBeGreaterThanOrEqual(1);
    });

    await waitFor(() => {
      const panel = screen.getByTestId('cashflow-held-tickets-panel');
      expect(within(panel).getByText(/Aucun ticket en attente/i)).toBeTruthy();
    });
  });

  it('ne déclenche pas de GET /v1/sales/held tant que l’UUID session (brouillon) est incomplet (saisie progressive)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (method === 'GET' && url.includes('/v1/sales/held')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([]),
        });
      }

      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-held-partial' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: null,
      }),
    });
    window.history.pushState({}, '', '/caisse');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-nominal-wizard')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('cashflow-step-next'));
    fireEvent.click(screen.getByTestId('cashflow-step-next'));

    const sessionInput = await screen.findByTestId('cashflow-input-session-id');
    const full = '00000000-0000-4000-8000-000000000099';
    for (let len = 1; len < full.length; len += 1) {
      fireEvent.change(sessionInput, { target: { value: full.slice(0, len) } });
    }

    const heldDuringPartial = fetchMock.mock.calls.filter(
      ([u, i]) =>
        ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase() === 'GET' &&
        requestUrl(u).includes('/v1/sales/held'),
    );
    expect(heldDuringPartial.length).toBe(0);

    fireEvent.change(sessionInput, { target: { value: full } });

    await waitFor(() => {
      const after = fetchMock.mock.calls.filter(
        ([u, i]) =>
          ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase() === 'GET' &&
          requestUrl(u).includes('/v1/sales/held'),
      );
      expect(after.length).toBeGreaterThanOrEqual(1);
    });
  });
});
