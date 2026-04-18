// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RuntimeDemoApp } from '../../src/app/demo/RuntimeDemoApp';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCoalescedGetCurrentOpenCashSessionForTests } from '../../src/domains/cashflow/caisse-current-session-coalesce';
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
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  window.history.pushState({}, '', '/');
});

describe('RuntimeDemoApp — alias `/cash-register/sale` → cashflow nominal (Story 11.3)', () => {
  it('résout la page CREOS `cashflow-nominal`, masque nav + bac à sable, expose le marqueur kiosque sur le shell', async () => {
    window.history.pushState({}, '', '/cash-register/sale');
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    expect(screen.getByTestId('cash-register-sale-kiosk')).toBeTruthy();
    expect(screen.queryByTestId('shell-zone-nav')).toBeNull();
    expect(screen.queryByText('Démonstration runtime (bac à sable)')).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-kiosk-unified-layout')).toBeTruthy();
    });
    const aside = screen.getByTestId('shell-zone-aside');
    expect(getComputedStyle(aside).display).not.toBe('none');
    expect(within(aside).getByTestId('caisse-current-ticket')).toBeTruthy();
    expect(screen.queryByTestId('flow-renderer-cashflow-nominal')).toBeNull();
    expect(screen.queryByTestId('cashflow-step-prev')).toBeNull();
    expect(screen.queryByTestId('cashflow-step-next')).toBeNull();
    expect(screen.queryByTestId('caisse-dash-poste')).toBeNull();
    expect(screen.queryByText('Aller à l’aide « ouverture / session »')).toBeNull();
  });

  it('traite `/cash-register/sale/` (slash final) comme l’alias kiosque', async () => {
    window.history.pushState({}, '', '/cash-register/sale/');
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cash-register-sale-kiosk')).toBeTruthy();
      expect(screen.getByTestId('cashflow-kiosk-unified-layout')).toBeTruthy();
    });
  });

  it('sur `/caisse` la zone nav reste présente (pas de mode kiosque)', () => {
    window.history.pushState({}, '', '/caisse');
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();
  });

  it('Story 13.8 : sur l’alias kiosque le runtime fusionne la grille catégories (GET /v1/categories/)', async () => {
    resetCoalescedGetCurrentOpenCashSessionForTests();
    resetCashflowOperationalSyncNoticeCacheForTests();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes('/v1/cash-sessions/current')) {
          return { ok: true, status: 200, text: async () => 'null' } as Response;
        }
        if (url.includes('/v1/categories/')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify([
                {
                  id: 'runtime-kiosk-cat',
                  name: 'Tri vente',
                  parent_id: null,
                  is_active: true,
                  display_order: 0,
                },
              ]),
          } as Response;
        }
        if (url.includes('live-snapshot')) {
          return { ok: true, status: 200, text: async () => '{}' } as Response;
        }
        if (url.includes('/v1/cash-registers/status')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                data: [
                  {
                    id: '31d56e8f-08ec-4907-9163-2a5c49c5f2fe',
                    name: 'La Clique Caisse 1',
                    is_open: true,
                    location: 'Entrée',
                    enable_virtual: true,
                    enable_deferred: true,
                  },
                ],
              }),
          } as Response;
        }
        return { ok: true, status: 200, text: async () => '{}' } as Response;
      }),
    );

    try {
      window.history.pushState({}, '', '/cash-register/sale');
      render(
        <RootProviders disableUserPrefsPersistence>
          <RuntimeDemoApp />
        </RootProviders>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('cashflow-kiosk-category-grid')).toBeTruthy();
      });
      expect(screen.getByTestId('cashflow-kiosk-category-runtime-kiosk-cat')).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      resetCoalescedGetCurrentOpenCashSessionForTests();
      resetCashflowOperationalSyncNoticeCacheForTests();
    }
  });
});
