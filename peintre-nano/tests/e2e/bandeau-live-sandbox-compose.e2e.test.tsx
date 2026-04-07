// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildPageManifestRegions } from '../../src/app/PageRenderer';
import { ManifestErrorBanner } from '../../src/app/ManifestErrorBanner';
import { RootShell } from '../../src/app/layouts/RootShell';
import { RootProviders } from '../../src/app/providers/RootProviders';
import pageBandeauLiveSandbox from '../../../contracts/creos/manifests/page-bandeau-live-sandbox.json';
import navigationBandeauLiveSlice from '../../../contracts/creos/manifests/navigation-bandeau-live-slice.json';
import widgetsCatalogBandeauLive from '../../../contracts/creos/manifests/widgets-catalog-bandeau-live.json';
import { getLiveSnapshotUrl } from '../../src/api/live-snapshot-client';
import { loadManifestBundle } from '../../src/runtime/load-manifest-bundle';
import * as runtimeReporting from '../../src/runtime/report-runtime-fallback';
import { defaultAllowedWidgetTypeSet } from '../../src/validation/allowed-widget-types';
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  cleanup();
});

function BandeauLiveSandboxHarness(props: {
  readonly navigationJson: string;
  readonly pageManifestsJson: readonly string[];
  readonly allowedWidgetTypes?: ReadonlySet<string>;
}) {
  const result = loadManifestBundle({
    navigationJson: props.navigationJson,
    pageManifestsJson: props.pageManifestsJson,
    allowedWidgetTypes: props.allowedWidgetTypes,
  });
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
    result.bundle.pages.find((p) => p.pageKey === 'bandeau-live-sandbox') ?? result.bundle.pages[0];
  const regions = buildPageManifestRegions(page);
  return (
    <RootProviders>
      <RootShell
        regions={{
          header: regions.header,
          nav: regions.nav,
          aside: regions.aside,
          footer: regions.footer,
          main: <div data-testid="e2e-bandeau-live-main">{regions.mainWidgets}</div>,
        }}
      />
    </RootProviders>
  );
}

/** `polling_interval_s` reviewable du catalogue CREOS — entrée `type: bandeau-live` (robuste si l’ordre du catalogue change). */
const MANIFEST_POLLING_INTERVAL_S =
  (widgetsCatalogBandeauLive as {
    widgets: Array<{ type?: string; data_contract?: { polling_interval_s?: number } }>;
  }).widgets.find((w) => w.type === 'bandeau-live')?.data_contract?.polling_interval_s ?? 30;

function pageBandeauLiveWithLiveSource(pollingIntervalS: number): typeof pageBandeauLiveSandbox {
  const mainBandeau = pageBandeauLiveSandbox.slots.find(
    (s) => s.slot_id === 'main' && s.widget_type === 'bandeau-live',
  );
  return {
    ...pageBandeauLiveSandbox,
    slots: pageBandeauLiveSandbox.slots.map((slot) =>
      slot.widget_type === 'bandeau-live'
        ? {
            ...slot,
            widget_props: {
              ...(typeof mainBandeau?.widget_props === 'object' && mainBandeau.widget_props !== null
                ? mainBandeau.widget_props
                : {}),
              use_live_source: true,
              polling_interval_s: pollingIntervalS,
            },
          }
        : slot,
    ),
  };
}

const liveSnapshotOkBody = () =>
  JSON.stringify({
    effective_open_state: 'open',
    cash_session_effectiveness: 'open_effective',
    observed_at: '2026-04-07T12:00:00.000Z',
    sync_operational_summary: { worst_state: 'resolu', source_reachable: true },
  });

describe('E2E — Convergence 2 / story 4.6 (chaîne manifest → runtime → live)', () => {
  const navigationJson = JSON.stringify(navigationBandeauLiveSlice);

  it('deux ticks de polling : intervalle = polling_interval_s CREOS, URL live-snapshot, X-Correlation-ID distincts', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: async () => liveSnapshotOkBody(),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const pageLive = pageBandeauLiveWithLiveSource(MANIFEST_POLLING_INTERVAL_S);
    render(
      <BandeauLiveSandboxHarness
        navigationJson={navigationJson}
        pageManifestsJson={[JSON.stringify(pageLive)]}
      />,
    );

    const expectedUrl = getLiveSnapshotUrl();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const first = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string>; method?: string },
    ];
    expect(first[0]).toBe(expectedUrl);
    expect(first[1].method).toBe('GET');
    expect(first[1].headers['X-Correlation-ID']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    await vi.advanceTimersByTimeAsync(MANIFEST_POLLING_INTERVAL_S * 1000);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    const second = fetchMock.mock.calls[1] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(second[0]).toBe(expectedUrl);
    expect(second[1].method).toBe('GET');
    expect(second[1].headers['X-Correlation-ID']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(second[1].headers['X-Correlation-ID']).not.toBe(first[1].headers['X-Correlation-ID']);

    const main = screen.getByTestId('e2e-bandeau-live-main');
    await waitFor(() => {
      expect(within(main).getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'live',
      );
    });
    expect(within(main).getByTestId('widget-bandeau-live').getAttribute('data-runtime-code')).toBe(
      'BANDEAU_LIVE_NOMINAL',
    );
  });

  it('échec HTTP 502 : fallback visible + reportRuntimeFallback (HTTP)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () =>
        JSON.stringify({
          detail: 'bad gateway',
          retryable: true,
          correlation_id: 'srv-corr',
        }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    const pageLive = pageBandeauLiveWithLiveSource(3600);
    render(
      <BandeauLiveSandboxHarness
        navigationJson={navigationJson}
        pageManifestsJson={[JSON.stringify(pageLive)]}
      />,
    );

    const main = screen.getByTestId('e2e-bandeau-live-main');
    await waitFor(() => {
      expect(within(main).getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'error',
      );
    });
    const bandeau = within(main).getByTestId('widget-bandeau-live');
    expect(bandeau.getAttribute('data-runtime-code')).toBe('BANDEAU_LIVE_HTTP_ERROR');
    expect(within(bandeau).getByText(/Live indisponible/i)).toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BANDEAU_LIVE_HTTP_ERROR', severity: 'degraded' }),
    );

    spy.mockRestore();
  });

  it('réponse 200 non JSON : fallback parse visible + corrélation client', async () => {
    const fixedCorr = 'eeeeeeee-bbbb-4ccc-dddd-eeeeeeeeeeee';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(fixedCorr);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<<<not-json>>>',
    });
    vi.stubGlobal('fetch', fetchMock);
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    const pageLive = pageBandeauLiveWithLiveSource(3600);
    render(
      <BandeauLiveSandboxHarness
        navigationJson={navigationJson}
        pageManifestsJson={[JSON.stringify(pageLive)]}
      />,
    );

    const main = screen.getByTestId('e2e-bandeau-live-main');
    await waitFor(() => {
      expect(within(main).getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'error',
      );
    });
    const bandeau = within(main).getByTestId('widget-bandeau-live');
    expect(bandeau.getAttribute('data-runtime-code')).toBe('BANDEAU_LIVE_PARSE_ERROR');
    expect(bandeau.getAttribute('data-correlation-id')).toBe(fixedCorr);
    expect(within(bandeau).getByText(/Live indisponible/i)).toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BANDEAU_LIVE_PARSE_ERROR',
        correlationId: fixedCorr,
        severity: 'degraded',
      }),
    );

    spy.mockRestore();
  });
});

describe('E2E — bac à sable bandeau live (Story 4.2)', () => {
  const navigationJson = JSON.stringify(navigationBandeauLiveSlice);
  const pageJson = JSON.stringify(pageBandeauLiveSandbox);

  it('live + slice désactivé (Story 4.5) : module_disabled sans casser le shell (fetch mock)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          bandeau_live_slice_enabled: false,
          observed_at: '2026-04-07T12:00:00.000Z',
          effective_open_state: 'not_applicable',
          cash_session_effectiveness: 'not_applicable',
        }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    const mainBandeau = pageBandeauLiveSandbox.slots.find(
      (s) => s.slot_id === 'main' && s.widget_type === 'bandeau-live',
    );
    const pageLiveOff = {
      ...pageBandeauLiveSandbox,
      slots: pageBandeauLiveSandbox.slots.map((slot) =>
        slot.widget_type === 'bandeau-live'
          ? {
              ...slot,
              widget_props: {
                ...(typeof mainBandeau?.widget_props === 'object' && mainBandeau.widget_props !== null
                  ? mainBandeau.widget_props
                  : {}),
                use_live_source: true,
                polling_interval_s: 3600,
              },
            }
          : slot,
      ),
    };

    render(
      <BandeauLiveSandboxHarness
        navigationJson={navigationJson}
        pageManifestsJson={[JSON.stringify(pageLiveOff)]}
      />,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const main = screen.getByTestId('e2e-bandeau-live-main');
    const bandeau = within(main).getByTestId('widget-bandeau-live');
    expect(bandeau.getAttribute('data-bandeau-state')).toBe('module_disabled');
    expect(bandeau.getAttribute('data-runtime-code')).toBe('BANDEAU_LIVE_MODULE_DISABLED');
    expect(within(bandeau).getByText(/désactivé pour ce site/i)).toBeTruthy();
    expect(
      within(screen.getByTestId('shell-zone-header')).getByText(/Slice bandeau live/i),
    ).toBeTruthy();
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'BANDEAU_LIVE_MODULE_DISABLED', severity: 'info' }),
      );
    });

    spy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('compose le shell depuis les manifests reviewables et affiche le bandeau live avec les signaux du snapshot', () => {
    render(
      <BandeauLiveSandboxHarness navigationJson={navigationJson} pageManifestsJson={[pageJson]} />,
    );

    const main = screen.getByTestId('e2e-bandeau-live-main');
    const bandeau = within(main).getByTestId('widget-bandeau-live');
    expect(bandeau.getAttribute('data-bandeau-state')).toBe('live');
    expect(bandeau.getAttribute('data-runtime-code')).toBe('BANDEAU_LIVE_NOMINAL');
    expect(bandeau.getAttribute('data-runtime-severity')).toBe('info');
    expect(bandeau.getAttribute('role')).toBe('status');
    expect(within(bandeau).getByRole('heading', { name: /Exploitation live/i })).toBeTruthy();
    expect(bandeau.querySelector('[data-effective-open-state="open"]')).toBeTruthy();
    expect(bandeau.querySelector('[data-field="effective_open_state"]')?.textContent).toMatch(/Ouvert/i);
    expect(bandeau.querySelector('[data-field="cash_session_effectiveness"]')?.textContent).toContain(
      'open_effective',
    );
    expect(bandeau.querySelector('[data-field="observed_at"]')?.textContent?.length).toBeGreaterThan(0);
    expect(within(bandeau).getByText(/état : resolu/i)).toBeTruthy();
    expect(within(bandeau).getByText(/source joignable : oui/i)).toBeTruthy();

    expect(
      within(screen.getByTestId('shell-zone-header')).getByText(/Slice bandeau live/i),
    ).toBeTruthy();
  });

  it('affiche l’état dégradé du bandeau quand le slot bandeau-live n’a pas de snapshot exploitable', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    const pageSansSnapshot = {
      ...pageBandeauLiveSandbox,
      slots: pageBandeauLiveSandbox.slots.map((slot) =>
        slot.widget_type === 'bandeau-live'
          ? { ...slot, widget_props: {} }
          : slot,
      ),
    };
    const degradedPageJson = JSON.stringify(pageSansSnapshot);

    render(
      <BandeauLiveSandboxHarness navigationJson={navigationJson} pageManifestsJson={[degradedPageJson]} />,
    );

    const main = screen.getByTestId('e2e-bandeau-live-main');
    const bandeau = within(main).getByTestId('widget-bandeau-live');
    expect(bandeau.getAttribute('data-bandeau-state')).toBe('unavailable');
    expect(bandeau.getAttribute('data-runtime-code')).toBe('BANDEAU_LIVE_UNAVAILABLE_STATIC');
    expect(within(bandeau).getByText(/Données live non disponibles/i)).toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BANDEAU_LIVE_UNAVAILABLE_STATIC',
        severity: 'degraded',
      }),
    );

    spy.mockRestore();
  });

  it('laisse un widget voisin en main rendu quand le bandeau est indisponible (fixture en mémoire)', () => {
    const pageTwinMain = {
      ...pageBandeauLiveSandbox,
      slots: [
        ...pageBandeauLiveSandbox.slots.filter((s) => s.slot_id !== 'main'),
        {
          slot_id: 'main',
          widget_type: 'bandeau-live',
          widget_props: {},
        },
        {
          slot_id: 'main',
          widget_type: 'demo.text.block',
          widget_props: {
            title: 'Voisin nominal',
            body: 'Le bandeau est en échec non bloquant ; ce bloc reste visible.',
          },
        },
      ],
    };

    render(
      <BandeauLiveSandboxHarness
        navigationJson={navigationJson}
        pageManifestsJson={[JSON.stringify(pageTwinMain)]}
      />,
    );

    const main = screen.getByTestId('e2e-bandeau-live-main');
    expect(within(main).getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
      'unavailable',
    );
    expect(within(main).getByRole('heading', { name: /Voisin nominal/i })).toBeTruthy();
    expect(
      within(screen.getByTestId('shell-zone-aside')).getByText(/Placeholder aside/i),
    ).toBeTruthy();
  });

  it('affiche un fallback widget inconnu dans main sans casser header ni aside (allowlist étendue en test)', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    const allowed = new Set([
      ...defaultAllowedWidgetTypeSet(),
      'fixture.unknown.widget',
    ]);

    const pageWithUnknown = {
      ...pageBandeauLiveSandbox,
      slots: [
        ...pageBandeauLiveSandbox.slots.filter((s) => s.slot_id !== 'main'),
        {
          slot_id: 'main',
          widget_type: 'fixture.unknown.widget',
          widget_props: {},
        },
        pageBandeauLiveSandbox.slots.find((s) => s.slot_id === 'main')!,
      ],
    };

    render(
      <BandeauLiveSandboxHarness
        navigationJson={navigationJson}
        pageManifestsJson={[JSON.stringify(pageWithUnknown)]}
        allowedWidgetTypes={allowed}
      />,
    );

    const main = screen.getByTestId('e2e-bandeau-live-main');
    const resolveErr = within(main).getByTestId('widget-resolve-error');
    expect(resolveErr.getAttribute('data-runtime-code')).toBe('UNKNOWN_WIDGET_TYPE');
    expect(within(main).getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
      'live',
    );
    expect(
      within(screen.getByTestId('shell-zone-aside')).getByText(/Placeholder aside/i),
    ).toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UNKNOWN_WIDGET_TYPE',
        severity: 'degraded',
      }),
    );

    spy.mockRestore();
  });

  it('rejette le lot manifeste si le slot bandeau-live déclare un widgetType hors allowlist', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    const pageFakeType = {
      ...pageBandeauLiveSandbox,
      slots: pageBandeauLiveSandbox.slots.map((slot) =>
        slot.widget_type === 'bandeau-live'
          ? { ...slot, widget_type: 'bandeau-live.never.registered' }
          : slot,
      ),
    };

    render(
      <BandeauLiveSandboxHarness
        navigationJson={navigationJson}
        pageManifestsJson={[JSON.stringify(pageFakeType)]}
      />,
    );

    const main = screen.getByTestId('shell-zone-main');
    const alert = within(main).getByRole('alert');
    expect(within(alert).getByText(/Manifests invalides/i)).toBeTruthy();
    expect(within(main).getByText(/UNKNOWN_WIDGET_TYPE/i)).toBeTruthy();
    expect(within(main).getByText(/bandeau-live\.never\.registered/i)).toBeTruthy();
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
