// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { DEMO_AUTH_STUB_SITE_ID, DEMO_AUTH_STUB_USER_ID } from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCoalescedGetCurrentOpenCashSessionForTests } from '../../src/domains/cashflow/caisse-current-session-coalesce';
import { getCashflowDraftSnapshot, resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
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

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Aligné sur `RuntimeDemoApp` : `pushState` seul ne recharge pas l’arbre ; `popstate` synchronise `pathRoute`. */
function navigateToForRuntime(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** GET courante sans session ouverte — corps valide pour le client (évite `{}` → erreur parse). */
function fetchResponseCashSessionsCurrentNoSession(): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: async () => 'null',
  } as Response);
}

describe('E2E — parcours caisse nominal (Story 6.1)', () => {
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
    resetCoalescedGetCurrentOpenCashSessionForTests();
  });

  it('depuis /caisse : FlowRenderer + ticket critique + POST JSON + GET getSale → ticket serveur + issue locale (AC 1, 3, 4)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }

      if (url.includes('/v1/sales/') && method === 'POST') {
        const raw = init?.body != null ? String(init.body) : '{}';
        const body = JSON.parse(raw) as {
          items?: Array<{ unit_price: number; quantity: number; total_price: number }>;
        };
        if (body.items?.length) {
          const it = body.items[0];
          expect(it.total_price).toBeCloseTo(it.unit_price * it.quantity, 5);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'sale-e2e-story61' }),
        });
      }

      if (method === 'GET' && url.includes('/v1/sales/sale-e2e-story61')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 'sale-e2e-story61',
              cash_session_id: '00000000-0000-4000-8000-000000000001',
              total_amount: 5,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
              items: [
                {
                  id: 'item-1',
                  sale_id: 'sale-e2e-story61',
                  category: 'EEE-1',
                  quantity: 1,
                  weight: 1,
                  unit_price: 5,
                  total_price: 5,
                },
              ],
              payments: [],
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/caisse');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });

    navigateToForRuntime('/cash-register/sale');

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-nominal-wizard')).toBeTruthy();
    });

    expect(screen.getByRole('heading', { level: 2, name: /Sélection du Poste de Caisse/i })).toBeTruthy();
    expect(screen.getByTestId('caisse-legacy-register-row')).toBeTruthy();

    expect(document.getElementById('caisse-sale-workspace')).toBeTruthy();
    expect(screen.getByTestId('caisse-kpi-strip')).toBeTruthy();

    expect(screen.getByTestId('flow-renderer-cashflow-nominal')).toBeTruthy();
    const ticketAside = screen.getByTestId('caisse-current-ticket');
    expect(ticketAside.getAttribute('data-operation-id')).toBe('recyclique_sales_getSale');

    fireEvent.click(screen.getByTestId('cashflow-add-line'));
    expect(screen.getByTestId('cashflow-lines-count').textContent ?? '').toContain('Lignes : 1');

    fireEvent.click(screen.getByTestId('cashflow-step-next'));
    fireEvent.click(screen.getByTestId('cashflow-step-next'));

    fireEvent.change(screen.getByRole('textbox', { name: /UUID session caisse/i }), {
      target: { value: '00000000-0000-4000-8000-000000000001' },
    });

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));

    await waitFor(() => {
      const t = screen.getByTestId('caisse-last-sale-id').textContent ?? '';
      expect(t).toContain('sale-e2e-story61');
    });

    await waitFor(() => {
      expect(screen.queryByTestId('caisse-ticket-loading')).toBeNull();
    });

    expect(screen.getByTestId('caisse-current-ticket').getAttribute('data-widget-data-state')).toBe('NOMINAL');

    const ticketText = screen.getByTestId('caisse-current-ticket').textContent ?? '';
    expect(ticketText).toMatch(/Total \(serveur\)/);
    expect(ticketText).toMatch(/EEE-1/);

    const localMsg = screen.getByTestId('caisse-local-issue-message').textContent ?? '';
    expect(localMsg).toMatch(/localement dans Recyclique/i);
    expect(localMsg).toMatch(/Paheko/i);

    const postCalls = fetchMock.mock.calls.filter(
      ([, i]) => ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase() === 'POST',
    );
    expect(postCalls.length).toBeGreaterThanOrEqual(1);
    const getSaleCalls = fetchMock.mock.calls.filter(([u, i]) => {
      const m = ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase();
      return m === 'GET' && requestUrl(u).includes('/v1/sales/sale-e2e-story61');
    });
    expect(getSaleCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /v1/cash-sessions/current au chargement /caisse : bandeau session + brouillon alignés (parité /caisse/cloture)', async () => {
    const SESSION_ID = '00000000-0000-4000-8000-000000000099';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: SESSION_ID,
              operator_id: 'op1',
              site_id: DEMO_AUTH_STUB_SITE_ID,
              initial_amount: 10,
              current_amount: 10,
              status: 'open',
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/caisse');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([u]) => requestUrl(u).includes('/v1/cash-sessions/current')),
      ).toBe(true);
    });

    await waitFor(() => {
      const row = screen.getByTestId('caisse-legacy-register-row');
      expect(row.getAttribute('data-resolved-session-id')).toBe(SESSION_ID);
      expect(row.getAttribute('data-server-session-loading')).toBe('false');
    });

    navigateToForRuntime('/cash-register/sale');

    await waitFor(() => {
      const input = screen.getByTestId('cashflow-input-session-id') as HTMLInputElement;
      expect(input.value).toBe(SESSION_ID);
    });
  });

  it('bandeau poste : `register_id` de GET /v1/cash-sessions/current si enveloppe sans poste', async () => {
    const SESSION_ID = '00000000-0000-4000-8000-000000000088';
    const REGISTER_ID = '00000000-0000-4000-8000-000000000077';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: SESSION_ID,
              register_id: REGISTER_ID,
              operator_id: 'op1',
              site_id: DEMO_AUTH_STUB_SITE_ID,
              initial_amount: 10,
              current_amount: 10,
              status: 'open',
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/caisse');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      const row = screen.getByTestId('caisse-legacy-register-row');
      expect(row.getAttribute('data-resolved-poste-id')).toBe(REGISTER_ID);
      expect(row.getAttribute('data-server-poste-loading')).toBe('false');
    });
  });

  it('ouverture brownfield explicite : POST /v1/cash-sessions/ avec fond de caisse puis session visible', async () => {
    const SESSION_ID = '00000000-0000-4000-8000-000000000055';
    const REGISTER_ID = '00000000-0000-4000-8000-000000000044';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/users/me') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ id: DEMO_AUTH_STUB_USER_ID, site_id: DEMO_AUTH_STUB_SITE_ID }),
        } as Response);
      }
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      if (url.includes('/v1/cash-sessions/') && method === 'POST') {
        const raw = init?.body != null ? String(init.body) : '{}';
        const body = JSON.parse(raw) as {
          operator_id: string;
          site_id: string;
          register_id: string;
          initial_amount: number;
        };
        expect(body.operator_id).toBe(DEMO_AUTH_STUB_USER_ID);
        expect(body.site_id).toBe(DEMO_AUTH_STUB_SITE_ID);
        expect(body.register_id).toBe(REGISTER_ID);
        expect(body.initial_amount).toBe(42.5);
        return Promise.resolve({
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              id: SESSION_ID,
              operator_id: DEMO_AUTH_STUB_USER_ID,
              site_id: DEMO_AUTH_STUB_SITE_ID,
              register_id: REGISTER_ID,
              initial_amount: 42.5,
              current_amount: 42.5,
              status: 'open',
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState(
      {},
      '',
      `/cash-register/session/open?register_id=${encodeURIComponent(REGISTER_ID)}`,
    );
    window.dispatchEvent(new PopStateEvent('popstate'));

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/Fond de caisse/i), {
      target: { value: '42.5' },
    });
    fireEvent.click(screen.getByTestId('cashflow-submit-opening'));

    await waitFor(() => {
      const session = screen.getByTestId('caisse-dash-session');
      expect(session.getAttribute('data-resolved-session-id')).toBe(SESSION_ID);
      expect(getCashflowDraftSnapshot().operatingMode).toBe('real');
    });

    expect(screen.getByTestId('cashflow-opening-success').textContent ?? '').toContain(SESSION_ID);

    navigateToForRuntime('/cash-register/sale');

    await waitFor(() => {
      expect((screen.getByTestId('cashflow-input-session-id') as HTMLInputElement).value).toBe(SESSION_ID);
    });
    expect(screen.getByTestId('caisse-goto-sale-workspace').getAttribute('disabled')).toBeNull();
  });

  it('ouverture mode virtuel : POST /v1/cash-sessions/ + marquage simulation (brouillon + wizard §7)', async () => {
    const SESSION_ID = '00000000-0000-4000-8000-000000000066';
    const REGISTER_ID = '00000000-0000-4000-8000-000000000055';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/users/me') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ id: DEMO_AUTH_STUB_USER_ID, site_id: DEMO_AUTH_STUB_SITE_ID }),
        } as Response);
      }
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      if (url.includes('/v1/cash-sessions/') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              id: SESSION_ID,
              operator_id: DEMO_AUTH_STUB_USER_ID,
              site_id: DEMO_AUTH_STUB_SITE_ID,
              register_id: REGISTER_ID,
              initial_amount: 10,
              current_amount: 10,
              status: 'open',
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState(
      {},
      '',
      `/cash-register/virtual/session/open?register_id=${encodeURIComponent(REGISTER_ID)}`,
    );
    window.dispatchEvent(new PopStateEvent('popstate'));

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/Fond de caisse/i), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByTestId('cashflow-submit-opening'));

    await waitFor(() => {
      expect(getCashflowDraftSnapshot().operatingMode).toBe('virtual');
    });

    expect(screen.getByTestId('caisse-dash-active-mode-virtual')).toBeTruthy();

    navigateToForRuntime('/cash-register/sale');

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-operating-mode-virtual-banner')).toBeTruthy();
    });
  });

  it('ouverture saisie différée : POST /v1/cash-sessions/ avec opened_at ISO', async () => {
    const SESSION_ID = '00000000-0000-4000-8000-000000000077';
    const REGISTER_ID = '00000000-0000-4000-8000-000000000066';
    const openedAtDateOnly = '2026-02-01';
    const openedAtExpectedIso = new Date(`${openedAtDateOnly}T12:00:00`).toISOString();
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/users/me') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ id: DEMO_AUTH_STUB_USER_ID, site_id: DEMO_AUTH_STUB_SITE_ID }),
        } as Response);
      }
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      if (url.includes('/v1/cash-sessions/') && method === 'POST') {
        const raw = init?.body != null ? String(init.body) : '{}';
        const body = JSON.parse(raw) as { opened_at?: string };
        expect(body.opened_at).toBe(openedAtExpectedIso);
        return Promise.resolve({
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              id: SESSION_ID,
              operator_id: DEMO_AUTH_STUB_USER_ID,
              site_id: DEMO_AUTH_STUB_SITE_ID,
              register_id: REGISTER_ID,
              initial_amount: 0,
              current_amount: 0,
              status: 'open',
              opened_at: body.opened_at,
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState(
      {},
      '',
      `/cash-register/deferred/session/open?register_id=${encodeURIComponent(REGISTER_ID)}`,
    );
    window.dispatchEvent(new PopStateEvent('popstate'));

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/Fond de caisse/i), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByTestId('cashflow-opening-opened-at'), {
      target: { value: openedAtDateOnly },
    });
    fireEvent.click(screen.getByTestId('cashflow-submit-opening'));

    await waitFor(() => {
      expect(getCashflowDraftSnapshot().operatingMode).toBe('deferred');
    });

    navigateToForRuntime('/cash-register/sale');

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-operating-mode-deferred-banner')).toBeTruthy();
    });
  });

  it('sans poste résolu, l’ouverture est bloquée explicitement et la vente n’est pas promue silencieusement', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes('/v1/cash-sessions/current')) {
          return fetchResponseCashSessionsCurrentNoSession();
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => '{}',
        } as Response);
      }),
    );

    window.history.pushState({}, '', '/cash-register/session/open');
    window.dispatchEvent(new PopStateEvent('popstate'));

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-opening-required')).toBeTruthy();
    });

    expect(screen.getByTestId('cashflow-submit-opening').getAttribute('disabled')).not.toBeNull();
    expect(screen.getByTestId('cashflow-opening-blocked-reason').textContent ?? '').toMatch(/poste de caisse/i);
  });

  it('échec GET getSale après vente : DATA_STALE sur le widget ticket (AC 4)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      if (url.includes('/v1/sales/') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'sale-get-fails' }),
        });
      }
      if (method === 'GET' && url.includes('/v1/sales/sale-get-fails')) {
        return Promise.resolve({
          ok: false,
          status: 503,
          text: async () => JSON.stringify({ detail: 'indisponible' }),
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

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));

    await waitFor(() => {
      expect(screen.getByTestId('caisse-current-ticket').getAttribute('data-widget-data-state')).toBe('DATA_STALE');
    });
    expect(screen.getByTestId('caisse-ticket-stale-banner')).toBeTruthy();
  });

  it('GET getSale 200 mais corps invalide (sans items) → DATA_STALE (validation client sales-client)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      if (url.includes('/v1/sales/') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'sale-invalid-body' }),
        });
      }
      if (method === 'GET' && url.includes('/v1/sales/sale-invalid-body')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'sale-invalid-body' }),
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

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));

    await waitFor(() => {
      expect(screen.getByTestId('caisse-current-ticket').getAttribute('data-widget-data-state')).toBe('DATA_STALE');
    });
    expect(screen.getByTestId('caisse-ticket-stale-banner')).toBeTruthy();
  });

  it('erreur réseau sur GET getSale → DATA_STALE', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      if (url.includes('/v1/sales/') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'sale-net-err' }),
        });
      }
      if (method === 'GET' && url.includes('/v1/sales/sale-net-err')) {
        return Promise.reject(new Error('Network unreachable'));
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

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));

    await waitFor(() => {
      expect(screen.getByTestId('caisse-current-ticket').getAttribute('data-widget-data-state')).toBe('DATA_STALE');
    });
    expect(screen.getByTestId('caisse-ticket-stale-banner')).toBeTruthy();
  });

  it('navigation : entrée manifeste Caisse → /caisse et wizard visible (AC 1)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes('/v1/cash-sessions/current')) {
          return fetchResponseCashSessionsCurrentNoSession();
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => '{}',
        } as Response);
      }),
    );

    window.history.pushState({}, '', '/');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    const caisseEntry = within(nav).getByTestId('nav-entry-cashflow-nominal');
    fireEvent.click(within(caisseEntry).getByRole('button'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/caisse');
    });
    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-nominal-wizard')).toBeNull();

    navigateToForRuntime('/cash-register/sale');
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-nominal-wizard')).toBeTruthy();
    });
  });

  it('erreur API POST vente : message d’erreur affiché (AC 1)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      if (url.includes('/v1/sales/') && init?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 403,
          text: async () => JSON.stringify({ detail: 'Opérateur non autorisé pour cette session' }),
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

    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));

    await waitFor(() => {
      const err = screen.getByTestId('cashflow-submit-error').textContent ?? '';
      expect(err).toMatch(/403/);
    });
  });
});
