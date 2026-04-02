// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { buildPageManifestRegions } from '../../src/app/PageRenderer';
import { ManifestErrorBanner } from '../../src/app/ManifestErrorBanner';
import { RootShell } from '../../src/app/layouts/RootShell';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { loadManifestBundle } from '../../src/runtime/load-manifest-bundle';
import * as runtimeReporting from '../../src/runtime/report-runtime-fallback';
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

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

function DeclarativePageHarness(props: { navigationJson: string; pageManifestsJson: string[] }) {
  const result = loadManifestBundle(props);
  if (!result.ok) {
    return (
      <RootProviders>
        <RootShell>
          <ManifestErrorBanner issues={result.issues} />
        </RootShell>
      </RootProviders>
    );
  }
  const page =
    result.bundle.pages.find((p) => p.pageKey === 'demo-home') ?? result.bundle.pages[0];
  const regions = buildPageManifestRegions(page);
  return (
    <RootProviders>
      <RootShell
        regions={{
          header: regions.header,
          nav: regions.nav,
          aside: regions.aside,
          footer: regions.footer,
          main: <div data-testid="e2e-declarative-main">{regions.mainWidgets}</div>,
        }}
      />
    </RootProviders>
  );
}

describe('E2E — registre widgets, slots et rendu déclaratif (story 3.3)', () => {
  it('expose les quatre widgets du catalogue starter (demo.*) dans les zones shell attendues', () => {
    render(
      <RootProviders>
        <App />
      </RootProviders>,
    );

    expect(
      within(screen.getByTestId('shell-zone-header')).getByTestId('widget-demo-text-block'),
    ).toBeTruthy();
    const main = screen.getByTestId('shell-zone-main');
    expect(within(main).getByTestId('widget-demo-kpi')).toBeTruthy();
    expect(within(main).getByTestId('widget-demo-card')).toBeTruthy();
    expect(
      within(screen.getByTestId('shell-zone-aside')).getByTestId('widget-demo-list-simple'),
    ).toBeTruthy();
  });

  it('affiche le contenu piloté par widget_props du manifest (chemins visibles utilisateur)', () => {
    render(
      <RootProviders>
        <App />
      </RootProviders>,
    );

    const header = screen.getByTestId('shell-zone-header');
    expect(within(header).getByText(/Démo composition/i)).toBeTruthy();
    expect(within(header).getByText(/Blocs déclaratifs/i)).toBeTruthy();

    const main = screen.getByTestId('shell-zone-main');
    expect(within(main).getByText(/Indicateur démo/i)).toBeTruthy();
    expect(within(main).getByText('42')).toBeTruthy();
    expect(within(main).getByText(/Contenu mock issu du manifest/i)).toBeTruthy();

    const aside = screen.getByTestId('shell-zone-aside');
    expect(within(aside).getByText('Entrée A')).toBeTruthy();
    expect(within(aside).getByText('Entrée B')).toBeTruthy();
  });

  it('rend les widgets d’un slot_id non mappé dans la zone main avec page-slot-unmapped (bundle valide)', () => {
    const navigationJson = JSON.stringify({
      version: '1',
      entries: [{ id: 'home', route_key: 'home', page_key: 'demo-home' }],
    });
    const pageJson = JSON.stringify({
      version: '1',
      page_key: 'demo-home',
      slots: [
        {
          slot_id: 'orphan-custom-region',
          widget_type: 'demo.text.block',
          widget_props: {
            title: 'Région non mappée',
            body: 'Contenu explicite pour slot inconnu du shell.',
          },
        },
      ],
    });

    render(
      <DeclarativePageHarness navigationJson={navigationJson} pageManifestsJson={[pageJson]} />,
    );

    const main = screen.getByTestId('e2e-declarative-main');
    const unmapped = within(main).getByTestId('page-slot-unmapped');
    expect(within(unmapped).getByText(/Région non mappée/i)).toBeTruthy();
    expect(within(unmapped).getByText(/Contenu explicite pour slot inconnu/i)).toBeTruthy();
  });

  it('affiche widget-resolve-error quand le type est inconnu au rendu (PageRenderer sans re-validation)', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    const regions = buildPageManifestRegions({
      version: '1',
      pageKey: 'isolated',
      slots: [{ slotId: 'main', widgetType: 'acme.widget.never.registered' }],
    });

    render(
      <RootProviders>
        <RootShell
          regions={{
            main: <div data-testid="e2e-resolve-error-wrap">{regions.mainWidgets}</div>,
          }}
        />
      </RootProviders>,
    );

    const wrap = screen.getByTestId('e2e-resolve-error-wrap');
    const err = within(wrap).getByTestId('widget-resolve-error');
    expect(err.getAttribute('data-widget-type')).toBe('acme.widget.never.registered');
    expect(err.getAttribute('data-runtime-severity')).toBe('degraded');
    expect(err.getAttribute('data-runtime-code')).toBe('UNKNOWN_WIDGET_TYPE');
    expect(within(err).getByText(/UNKNOWN_WIDGET_TYPE/i)).toBeTruthy();
    expect(within(err).getByText(/acme\.widget\.never\.registered/i)).toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'degraded',
        code: 'UNKNOWN_WIDGET_TYPE',
        state: 'widget_resolve_failed',
      }),
    );

    spy.mockRestore();
  });
});
