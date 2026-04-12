// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { DEMO_AUTH_STUB_SITE_ID, DEMO_AUTH_STUB_USER_ID } from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCoalescedGetCurrentOpenCashSessionForTests } from '../../src/domains/cashflow/caisse-current-session-coalesce';
import { resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
import '../../src/registry';
import '../../src/styles/tokens.css';

const REGISTER_ID = '31d56e8f-08ec-4907-9163-2a5c49c5f2fe';
const SESSION_ID = '00000000-0000-4000-8000-0000000000aa';

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

function fetchResponseCashSessionsCurrentNoSession(): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: async () => 'null',
  } as Response);
}

function fetchResponseCashSessionsCurrentOpen(): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        id: SESSION_ID,
        operator_id: DEMO_AUTH_STUB_USER_ID,
        site_id: DEMO_AUTH_STUB_SITE_ID,
        register_id: REGISTER_ID,
        initial_amount: 25,
        current_amount: 25,
        status: 'open',
      }),
  } as Response);
}

describe('E2E — hub `/caisse` → Ouvrir → session/open → vente (Story 13.6, parité legacy)', () => {
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

  it('après POST ouverture : navigation vers `/cash-register/sale`, pas d’atterrissage hybride sur `…/session/open`', async () => {
    /** Après ouverture : GET courant reflète la session (comportement reload navigateur). */
    let treatCurrentSessionAsOpen = false;
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
        return treatCurrentSessionAsOpen
          ? fetchResponseCashSessionsCurrentOpen()
          : fetchResponseCashSessionsCurrentNoSession();
      }
      if (url.includes('/v1/cash-registers/status')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [
                {
                  id: REGISTER_ID,
                  name: 'La Clique Caisse 1',
                  is_open: false,
                  location: 'Entrée Principale',
                  enable_virtual: true,
                  enable_deferred: true,
                },
              ],
            }),
        } as Response);
      }
      if (url.includes('/v1/cash-sessions/') && method === 'POST') {
        treatCurrentSessionAsOpen = true;
        return Promise.resolve({
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              id: SESSION_ID,
              operator_id: DEMO_AUTH_STUB_USER_ID,
              site_id: DEMO_AUTH_STUB_SITE_ID,
              register_id: REGISTER_ID,
              initial_amount: 25,
              current_amount: 25,
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
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });

    expect(screen.queryByTestId('flow-renderer-cashflow-nominal')).toBeNull();
    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();

    /** Grille postes = GET `/v1/cash-registers/status` (hub compact) : attendre le rendu pour éviter la course dashboard → cartes. */
    await waitFor(() => {
      expect(screen.getAllByTestId('caisse-hub-register-card').length).toBeGreaterThan(0);
    });
    const registerCard = screen.getAllByTestId('caisse-hub-register-card')[0]!;
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    pushStateSpy.mockClear();

    fireEvent.click(within(registerCard).getByRole('button', { name: /^Ouvrir$/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/cash-register/session/open');
      expect(window.location.search).toContain(`register_id=${encodeURIComponent(REGISTER_ID)}`);
    });

    /** Story 13.1 / correctif remount : navigation SPA via `history.pushState` (pas `window.location = …`). */
    expect(
      pushStateSpy.mock.calls.some(
        (c) => typeof c[2] === 'string' && c[2].includes('/cash-register/session/open'),
      ),
    ).toBe(true);

    /** Pas d’écran hybride (hub postes + surface ouverture) après transition. */
    expect(screen.queryAllByTestId('caisse-hub-register-card')).toHaveLength(0);
    expect(screen.queryByRole('heading', { name: /Sélection du Poste de Caisse/i })).toBeNull();
    expect(screen.queryByTestId('caisse-variant-entrypoints')).toBeNull();
    expect(screen.queryByTestId('caisse-hub-card-virtual')).toBeNull();
    expect(screen.queryByTestId('caisse-hub-card-deferred')).toBeNull();

    expect(
      screen.getByRole('heading', { level: 2, name: /Ouverture de Session de Caisse/i }),
    ).toBeTruthy();
    expect(screen.queryByTestId('flow-renderer-cashflow-nominal')).toBeNull();

    fireEvent.change(screen.getByLabelText(/Fond de caisse/i), {
      target: { value: '25' },
    });
    fireEvent.click(screen.getByTestId('cashflow-submit-opening'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/cash-register/sale');
    });

    expect(screen.getByTestId('cash-register-sale-kiosk')).toBeTruthy();
    expect(screen.queryByTestId('shell-zone-nav')).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('flow-renderer-cashflow-nominal')).toBeTruthy();
    });

    expect(window.location.pathname).not.toContain('session/open');
    expect(
      screen.queryByRole('heading', { level: 2, name: /Ouverture de Session de Caisse/i }),
    ).toBeNull();
    expect(screen.queryByRole('heading', { name: /Sélection du Poste de Caisse/i })).toBeNull();

    const postOpens = fetchMock.mock.calls.filter(
      ([u, i]) =>
        requestUrl(u).includes('/v1/cash-sessions/') &&
        ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase() === 'POST',
    );
    expect(postOpens.length).toBeGreaterThanOrEqual(1);

    // --- Simulation reload F5 sur `/cash-register/sale` (Story 13.6) : pas de chrome hub parasite ---
    resetCoalescedGetCurrentOpenCashSessionForTests();
    resetCashflowDraft();
    cleanup();
    expect(window.location.pathname).toBe('/cash-register/sale');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cash-register-sale-kiosk')).toBeTruthy();
    });
    expect(screen.queryByTestId('shell-zone-nav')).toBeNull();
    expect(screen.queryByRole('heading', { level: 2, name: /Sélection du Poste de Caisse/i })).toBeNull();
    expect(screen.queryByTestId('caisse-legacy-register-row')).toBeNull();
    expect(
      screen.queryByRole('heading', { level: 2, name: /Ouverture de Session de Caisse/i }),
    ).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('flow-renderer-cashflow-nominal')).toBeTruthy();
    });
  });
});
