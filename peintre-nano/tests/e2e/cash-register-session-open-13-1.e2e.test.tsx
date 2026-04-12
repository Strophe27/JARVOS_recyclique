// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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

describe('E2E — alias `/cash-register/session/open` (écran adjacent pré-kiosque, Story 13.1)', () => {
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

  it('résout le même `cashflow-nominal` que `/caisse`, nav visible, surface « ouverture session » legacy, pas de marqueur kiosque', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
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
      '/cash-register/session/open?register_id=31d56e8f-08ec-4907-9163-2a5c49c5f2fe',
    );

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-nominal-wizard')).toBeNull();

    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();
    expect(screen.queryByTestId('flow-renderer-cashflow-nominal')).toBeNull();
    expect(
      screen.getByRole('heading', { level: 2, name: /Ouverture de Session de Caisse/i }),
    ).toBeTruthy();
    expect(screen.getByTestId('cashflow-session-open-cancel')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ouvrir la Session/i })).toBeTruthy();
    /** Story 13.2 — parité legacy : pas de champ « Poste » visible quand `register_id` est dans l’URL. */
    expect(screen.queryByRole('textbox', { name: /Poste de caisse/i })).toBeNull();
    expect(window.location.search).toContain('register_id=31d56e8f-08ec-4907-9163-2a5c49c5f2fe');
  });

  it('normalise `/cash-register/session/open/` (slash final) comme l’alias adjacent', async () => {
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

    window.history.pushState({}, '', '/cash-register/session/open/');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
      expect(screen.queryByTestId('flow-renderer-cashflow-nominal')).toBeNull();
    });
  });

  it('régression 11.3 : `/cash-register/sale` reste distinct (kiosque, nav masquée)', async () => {
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

    window.history.pushState({}, '', '/cash-register/sale');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cash-register-sale-kiosk')).toBeTruthy();
      expect(screen.getByTestId('flow-renderer-cashflow-nominal')).toBeTruthy();
    });
    expect(screen.queryByTestId('shell-zone-nav')).toBeNull();
  });
});
