// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RuntimeDemoApp } from '../../src/app/demo/RuntimeDemoApp';
import { RootProviders } from '../../src/app/providers/RootProviders';
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

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  window.history.pushState({}, '', '/');
});

function fetchResponseCurrentNoSession(): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: async () => 'null',
  } as Response);
}

function fetchResponseCurrentOpenSession(): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        id: '11111111-1111-4111-8111-111111111111',
        initial_amount: 20,
        current_amount: 25,
        status: 'open',
        total_sales: 5,
        total_items: 2,
        total_donations: 0,
        register_id: '31d56e8f-08ec-4907-9163-2a5c49c5f2fe',
      }),
  } as Response);
}

describe('RuntimeDemoApp — alias `…/session/close` (Story 13.3)', () => {
  it('sans session ouverte → redirection vers `/caisse` (aligné legacy CloseSession)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCurrentNoSession();
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/cash-register/session/close');

    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe('/caisse');
    });
    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();
  });

  it('résout `cashflow-nominal` avec session ouverte — surface Fermeture de Caisse (nav visible, pas kiosque)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCurrentOpenSession();
      }
      return Promise.resolve({ ok: true, status: 200, text: async () => '{}' } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/cash-register/virtual/session/close');

    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cash-register-session-close-surface')).toBeTruthy();
    });
    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();
    expect(screen.getByTestId('cashflow-session-close-heading').textContent).toMatch(/Fermeture de Caisse/i);
    expect(screen.getByTestId('cashflow-session-close-back-to-sale')).toBeTruthy();
  });
});
