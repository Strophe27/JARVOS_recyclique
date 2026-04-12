// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
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

describe('E2E — variantes caisse virtuelle / saisie différée (Story 13.2)', () => {
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

  it('`/cash-register/virtual/session/open` : `cashflow-nominal`, nav visible, surface ouverture', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState(
      {},
      '',
      '/cash-register/virtual/session/open?register_id=31d56e8f-08ec-4907-9163-2a5c49c5f2fe',
    );

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });
    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 2, name: /Ouverture de Session de Caisse/i }),
    ).toBeTruthy();
  });

  it('`/cash-register/deferred/session/open` : intro différée (cahier) + pas kiosque', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/cash-register/deferred/session/open?register_id=r1');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });
    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
    expect(screen.getByText(/date réelle de vente \(cahier\)/i)).toBeTruthy();
  });

  it('`/cash-register/virtual/sale` : kiosque + flow nominal', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/cash-register/virtual/sale');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cash-register-sale-kiosk')).toBeTruthy();
      expect(screen.getByTestId('flow-renderer-cashflow-nominal')).toBeTruthy();
    });
  });

  it('hub `/cash-register/virtual` : clic Ouvrir sur poste réel → `/cash-register/virtual/session/open` (parité legacy basePath)', async () => {
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
                  id: 'reg-hub-v',
                  name: 'Poste test',
                  is_open: false,
                  enable_virtual: true,
                },
              ],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/cash-register/virtual');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('caisse-hub-register-card').length).toBeGreaterThan(0);
    });

    const cards = screen.getAllByTestId('caisse-hub-register-card');
    fireEvent.click(within(cards[0]).getByRole('button', { name: /^Ouvrir$/i }));

    expect(window.location.pathname).toBe('/cash-register/virtual/session/open');
    expect(new URLSearchParams(window.location.search).get('register_id')).toBe('reg-hub-v');
  });
});
