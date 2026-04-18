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

describe('RuntimeDemoApp — chrome caisse certifié (Story 13.6)', () => {
  it('sur `/caisse` en démo masque bac à sable, bandeau versions manifests et toolbar prefs', async () => {
    vi.stubEnv('VITE_LIVE_AUTH', '');
    window.history.pushState({}, '', '/caisse');
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    expect(screen.queryByText('Démonstration runtime (bac à sable)')).toBeNull();
    expect(screen.queryByTestId('manifest-bundle-ok')).toBeNull();
    expect(screen.queryByTestId('runtime-prefs-toolbar')).toBeNull();

    // Hub `/caisse` (13.1) : pas de FlowRenderer wizard — surface brownfield dédiée.
    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });
  });

  it('sur `/cash-register/session/open` en démo applique le même masquage technique', async () => {
    vi.stubEnv('VITE_LIVE_AUTH', '');
    window.history.pushState({}, '', '/cash-register/session/open?register_id=test');
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    expect(screen.queryByText('Démonstration runtime (bac à sable)')).toBeNull();
    expect(screen.queryByTestId('manifest-bundle-ok')).toBeNull();
    expect(screen.queryByTestId('runtime-prefs-toolbar')).toBeNull();

    // Non-régression surface `session_open` : bloc d’ouverture (legacy) toujours présent — distinct du kiosque `/sale`.
    await waitFor(() => {
      expect(screen.getByTestId('caisse-session-open-hint')).toBeTruthy();
      expect(screen.getByRole('heading', { name: /Ouverture de Session de Caisse/i })).toBeTruthy();
      expect(screen.getByTestId('cashflow-submit-opening')).toBeTruthy();
    });
  });

  it('sur `/cash-register/sale` en démo masque bac à sable, bandeau manifests et toolbar prefs (kiosque certifié)', async () => {
    vi.stubEnv('VITE_LIVE_AUTH', '');
    window.history.pushState({}, '', '/cash-register/sale');
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );

    expect(screen.queryByText('Démonstration runtime (bac à sable)')).toBeNull();
    expect(screen.queryByTestId('manifest-bundle-ok')).toBeNull();
    expect(screen.queryByTestId('runtime-prefs-toolbar')).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('cash-register-sale-kiosk')).toBeTruthy();
    });

    // Story 13.6 — pas de chrome hub « Sélection du Poste » sur l’alias kiosque (reload / deep link).
    expect(screen.queryByRole('heading', { name: /Sélection du Poste de Caisse/i })).toBeNull();

    // Correctif kiosque vente — pas du Paper d’ouverture brownfield (`caisse-session-open-hint` + submit POST session).
    // NB : libellés type « ouverture / session » peuvent exister ailleurs (ex. CTA scroll) — ne pas matcher en texte brut.
    expect(screen.queryByTestId('caisse-session-open-hint')).toBeNull();
    expect(screen.queryByTestId('cashflow-submit-opening')).toBeNull();
    expect(screen.queryByTestId('cashflow-opening-amount')).toBeNull();
  });
});
