// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, within } from '@testing-library/react';
import { useMemo } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ManifestErrorBanner } from '../../src/app/ManifestErrorBanner';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { RootShell } from '../../src/app/layouts/RootShell';
import validPageHomeFixture from '../../src/fixtures/manifests/valid/page-home.json';
import { loadManifestBundle } from '../../src/runtime/load-manifest-bundle';
import * as runtimeReporting from '../../src/runtime/report-runtime-fallback';
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

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

const validPageJson = JSON.stringify(validPageHomeFixture);

/**
 * Même principe que l’App : lot nav + pages validé au rendu, bandeau d’erreur si rejet explicite.
 * Permet d’exercer le chemin UI erreur sans modifier `App.tsx`.
 */
function ManifestBundleHarness(props: { navigationJson: string; pageManifestsJson: string[] }) {
  const result = useMemo(
    () =>
      loadManifestBundle({
        navigationJson: props.navigationJson,
        pageManifestsJson: props.pageManifestsJson,
      }),
    [props.navigationJson, props.pageManifestsJson],
  );
  return (
    <RootProviders>
      <RootShell>
        {!result.ok ? (
          <ManifestErrorBanner issues={result.issues} />
        ) : (
          <p data-testid="harness-bundle-ok">Lot de manifests valide</p>
        )}
      </RootShell>
    </RootProviders>
  );
}

describe('E2E — chargement / validation manifests (story 3.2)', () => {
  it('affiche une alerte structurée en cas de collision route_key (rejet explicite)', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    const navigationJson = JSON.stringify({
      version: '1',
      entries: [
        { id: 'a', route_key: 'same', page_key: 'demo-home' },
        { id: 'b', route_key: 'same', page_key: 'demo-home' },
      ],
    });

    render(
      <ManifestBundleHarness
        navigationJson={navigationJson}
        pageManifestsJson={[validPageJson]}
      />,
    );

    const main = screen.getByTestId('shell-zone-main');
    const alert = within(main).getByRole('alert');
    expect(within(alert).getByText(/Manifests invalides/i)).toBeTruthy();
    expect(within(main).getByTestId('manifest-load-error')).toBeTruthy();
    expect(within(main).getByTestId('manifest-load-error').getAttribute('data-runtime-severity')).toBe('blocked');
    expect(within(main).getByText(/ROUTE_KEY_COLLISION/i)).toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'blocked',
        code: 'ROUTE_KEY_COLLISION',
        state: 'manifest_bundle_invalid',
      }),
    );

    spy.mockRestore();
  });

  it('accepte un jeu cohérent nav + page (chemin heureux intégré shell)', () => {
    const navigationJson = JSON.stringify({
      version: '1',
      entries: [{ id: 'home', route_key: 'home', page_key: 'demo-home' }],
    });

    render(
      <ManifestBundleHarness
        navigationJson={navigationJson}
        pageManifestsJson={[validPageJson]}
      />,
    );

    expect(within(screen.getByTestId('shell-zone-main')).getByTestId('harness-bundle-ok')).toBeTruthy();
  });

  it('affiche une alerte si la nav référence une page_key absente du lot (rejet explicite)', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    const navigationJson = JSON.stringify({
      version: '1',
      entries: [{ id: 'x', route_key: 'x', page_key: 'missing-page' }],
    });

    render(
      <ManifestBundleHarness
        navigationJson={navigationJson}
        pageManifestsJson={[validPageJson]}
      />,
    );

    const main = screen.getByTestId('shell-zone-main');
    const alert = within(main).getByRole('alert');
    expect(within(alert).getByText(/Manifests invalides/i)).toBeTruthy();
    expect(within(main).getByTestId('manifest-load-error').getAttribute('data-runtime-severity')).toBe(
      'blocked',
    );
    expect(within(main).getByText(/NAV_PAGE_LINK_UNRESOLVED/i)).toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'blocked',
        code: 'NAV_PAGE_LINK_UNRESOLVED',
        state: 'manifest_bundle_invalid',
      }),
    );

    spy.mockRestore();
  });

  it("affiche une alerte si un widgetType n'est pas dans l'allowlist (rejet explicite)", () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    const navigationJson = JSON.stringify({
      version: '1',
      entries: [{ id: 'home', route_key: 'home', page_key: 'demo-home' }],
    });
    const badPageJson = JSON.stringify({
      version: '1',
      page_key: 'demo-home',
      slots: [{ slot_id: 'main', widget_type: 'totally.unknown.widget' }],
    });

    render(
      <ManifestBundleHarness
        navigationJson={navigationJson}
        pageManifestsJson={[badPageJson]}
      />,
    );

    const main = screen.getByTestId('shell-zone-main');
    const alert = within(main).getByRole('alert');
    expect(within(alert).getByText(/Manifests invalides/i)).toBeTruthy();
    expect(within(main).getByTestId('manifest-load-error').getAttribute('data-runtime-severity')).toBe(
      'blocked',
    );
    expect(within(main).getByText(/UNKNOWN_WIDGET_TYPE/i)).toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'blocked',
        code: 'UNKNOWN_WIDGET_TYPE',
        state: 'manifest_bundle_invalid',
      }),
    );

    spy.mockRestore();
  });
});
