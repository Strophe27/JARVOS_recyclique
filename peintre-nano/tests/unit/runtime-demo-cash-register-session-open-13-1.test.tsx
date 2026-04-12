// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuntimeDemoApp } from '../../src/app/demo/RuntimeDemoApp';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCoalescedGetCurrentOpenCashSessionForTests } from '../../src/domains/cashflow/caisse-current-session-coalesce';
import { resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
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
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
  resetCashflowDraft();
  resetCoalescedGetCurrentOpenCashSessionForTests();
});

describe('RuntimeDemoApp — alias `/cash-register/session/open` → cashflow nominal adjacent (Story 13.1)', () => {
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
  it('résout la page CREOS `cashflow-nominal`, conserve la nav (pas de marqueur kiosque), sans wizard dans `main` (hub adjacent)', async () => {
    window.history.pushState(
      {},
      '',
      '/cash-register/session/open?register_id=31d56e8f-08ec-4907-9163-2a5c49c5f2fe',
    );
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();

    expect(screen.queryByTestId('flow-renderer-cashflow-nominal')).toBeNull();

    expect(screen.getByRole('heading', { level: 2, name: /Ouverture de Session de Caisse/i })).toBeTruthy();
    expect(screen.getByTestId('cashflow-session-open-cancel')).toBeTruthy();
    expect(screen.queryByTestId('caisse-variant-entrypoints')).toBeNull();
  });

  it('SPA `/caisse` → clic Ouvrir : `…/session/open?register_id=…`, pushState explicite, sans chrome hub parasite', async () => {
    const REGISTER_ID = '31d56e8f-08ec-4907-9163-2a5c49c5f2fe';
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => 'null',
        } as Response);
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
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/caisse');

    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });
    expect(screen.getAllByTestId('caisse-hub-register-card').length).toBeGreaterThanOrEqual(1);

    pushStateSpy.mockClear();
    const registerCard = screen.getAllByTestId('caisse-hub-register-card')[0]!;
    fireEvent.click(within(registerCard).getByRole('button', { name: /^Ouvrir$/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/cash-register/session/open');
      expect(window.location.search).toContain(`register_id=${encodeURIComponent(REGISTER_ID)}`);
    });

    expect(
      pushStateSpy.mock.calls.some(
        (c) => typeof c[2] === 'string' && c[2].includes('/cash-register/session/open'),
      ),
    ).toBe(true);

    expect(screen.queryAllByTestId('caisse-hub-register-card')).toHaveLength(0);
    expect(screen.queryByRole('heading', { name: /Sélection du Poste de Caisse/i })).toBeNull();
    expect(screen.queryByTestId('caisse-variant-entrypoints')).toBeNull();
    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
    expect(screen.queryByTestId('flow-renderer-cashflow-nominal')).toBeNull();
    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 2, name: /Ouverture de Session de Caisse/i }),
    ).toBeTruthy();
  });

  it('traite `/cash-register/session/open/` (slash final) comme l’alias adjacent', async () => {
    window.history.pushState({}, '', '/cash-register/session/open/');
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
      expect(screen.queryByTestId('flow-renderer-cashflow-nominal')).toBeNull();
    });

    expect(screen.getByRole('heading', { level: 2, name: /Ouverture de Session de Caisse/i })).toBeTruthy();
  });

  /**
   * Poste réel nominal : `/cash-register/session/open` sans `register_id` (reload / deep link legacy 4444).
   * Ne doit pas réafficher le chrome brownfield « hub » (sélecteurs de mode + alerte vente bloquée) — aligné
   * `legacySessionOpenBareForm` + `urlBranch === 'real'` dans `CaisseBrownfieldDashboardWidget`.
   */
  it('deep link `/cash-register/session/open` sans query : formulaire nominal seul, sans chrome hub parasite', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => 'null',
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/cash-register/session/open');

    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Ouverture de Session de Caisse/i })).toBeTruthy();
    });

    expect(screen.queryByRole('heading', { name: /Sélection du Poste de Caisse/i })).toBeNull();
    expect(screen.queryByTestId('cashflow-open-mode-real')).toBeNull();
    expect(screen.queryByTestId('cashflow-open-mode-virtual')).toBeNull();
    expect(screen.queryByTestId('cashflow-open-mode-deferred')).toBeNull();
    expect(screen.queryByTestId('cashflow-opening-required')).toBeNull();
    expect(screen.queryByTestId('caisse-variant-entrypoints')).toBeNull();
    expect(screen.getByTestId('cashflow-opening-register-id')).toBeTruthy();
  });
});
