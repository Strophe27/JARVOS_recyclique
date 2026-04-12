// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuntimeDemoApp } from '../../src/app/demo/RuntimeDemoApp';
import { RootProviders } from '../../src/app/providers/RootProviders';
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

describe('RuntimeDemoApp — transition hub `/caisse` → `/cash-register/sale` RCN-02 (Story 13.5)', () => {
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
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  it('depuis le hub, clic Reprendre (session ouverte) → URL `/cash-register/sale`, nav masquée, marqueur kiosque, wizard vente', async () => {
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
                  id: '31d56e8f-08ec-4907-9163-2a5c49c5f2fe',
                  name: 'La Clique Caisse 1',
                  is_open: true,
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

    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });

    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();
    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^Reprendre$/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/cash-register/sale');
    });

    expect(screen.getByTestId('cash-register-sale-kiosk')).toBeTruthy();
    expect(screen.queryByTestId('shell-zone-nav')).toBeNull();
    expect(screen.queryByText('Démonstration runtime (bac à sable)')).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('flow-renderer-cashflow-nominal')).toBeTruthy();
    });
  });
});
