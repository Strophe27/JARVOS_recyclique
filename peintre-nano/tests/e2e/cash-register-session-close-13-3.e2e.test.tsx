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

describe('E2E — alias `…/session/close` (clôture caisse, Story 13.3)', () => {
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

  it('sans session → redirection `/caisse` + hub brownfield (nonrégression routage App)', async () => {
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

    window.history.pushState({}, '', '/cash-register/deferred/session/close');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe('/caisse');
    });
    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });
    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();
  });

  it('session ouverte → surface clôture visible sur `/cash-register/session/close`', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: '22222222-2222-4222-8222-222222222222',
              initial_amount: 10,
              current_amount: 15,
              status: 'open',
              total_sales: 5,
              total_items: 1,
              total_donations: 0,
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

    window.history.pushState({}, '', '/cash-register/session/close');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cash-register-session-close-surface')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-session-close-summary')).toBeTruthy();
    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
  });
});
