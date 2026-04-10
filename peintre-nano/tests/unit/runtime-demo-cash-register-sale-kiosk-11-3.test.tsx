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
      expect(screen.getByTestId('flow-renderer-cashflow-nominal')).toBeTruthy();
    });
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
      expect(screen.getByTestId('flow-renderer-cashflow-nominal')).toBeTruthy();
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
});
