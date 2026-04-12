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

describe('RuntimeDemoApp — alias `/cash-register/session/open` → cashflow nominal adjacent (Story 13.1)', () => {
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
});
