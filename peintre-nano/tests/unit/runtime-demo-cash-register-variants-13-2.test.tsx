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

describe('RuntimeDemoApp — variantes caisse virtuelle / saisie différée (Story 13.2)', () => {
  it('alias `/cash-register/virtual/session/open` → `cashflow-nominal`, nav visible, pas kiosque', async () => {
    window.history.pushState(
      {},
      '',
      '/cash-register/virtual/session/open?register_id=31d56e8f-08ec-4907-9163-2a5c49c5f2fe',
    );
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
    });
    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /Ouverture de Session de Caisse/i })).toBeTruthy();
  });

  it('alias `/cash-register/deferred/session/open` → `cashflow-nominal`, intro différée', async () => {
    window.history.pushState({}, '', '/cash-register/deferred/session/open?register_id=r1');
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
    });
    expect(screen.getByText(/date réelle de vente \(cahier\)/i)).toBeTruthy();
  });

  it('alias `/cash-register/virtual/sale` → kiosque (marqueur présent)', async () => {
    window.history.pushState({}, '', '/cash-register/virtual/sale');
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('cash-register-sale-kiosk')).toBeTruthy();
    });
  });

  it('alias `/cash-register/deferred/sale` → kiosque (marqueur présent)', async () => {
    window.history.pushState({}, '', '/cash-register/deferred/sale');
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('cash-register-sale-kiosk')).toBeTruthy();
    });
  });

  it('racine `/cash-register/deferred` normalisée vers `.../session/open`', async () => {
    const replace = vi.spyOn(window.history, 'replaceState');
    window.history.pushState({}, '', '/cash-register/deferred');
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );
    await waitFor(() => {
      expect(replace).toHaveBeenCalled();
    });
    expect(window.location.pathname).toBe('/cash-register/deferred/session/open');
  });
});
