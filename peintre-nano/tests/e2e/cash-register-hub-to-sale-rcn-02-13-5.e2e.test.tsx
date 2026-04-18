// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCoalescedGetCurrentOpenCashSessionForTests } from '../../src/domains/cashflow/caisse-current-session-coalesce';
import { resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
import '../../src/registry';
import '../../src/styles/tokens.css';
import { waitForCashflowNominalSaleSurface } from '../helpers/cashflow-nominal-sale-surface';

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

describe('E2E — transition hub `/caisse` → `/cash-register/sale` RCN-02 (Story 13.5)', () => {
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

  it('hub avec Reprendre → vente kiosque plein cadre (alias runtime, hideNav)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
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
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });

    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Reprendre$/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/cash-register/sale');
    });

    expect(screen.getByTestId('cash-register-sale-kiosk')).toBeTruthy();
    expect(screen.queryByTestId('shell-zone-nav')).toBeNull();

    await waitForCashflowNominalSaleSurface();
  });
});
