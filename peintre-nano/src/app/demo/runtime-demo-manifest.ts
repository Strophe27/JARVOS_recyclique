/**
 * Lot de manifests pour la démo runtime (story 3.7).
 *
 * Source de vérité : JSON sous `src/fixtures/manifests/valid/` (importés ici).
 * `public/manifests/` est une copie pour vérification manuelle via fetch — tenir les deux alignés.
 *
 * Story 4.6b : `runtimeServedManifestLoadResult` fusionne ce lot avec les manifests Epic 4
 * (`src/fixtures/contracts-creos/`, alignés sur `contracts/creos/manifests/`) pour l’app servie.
 */
import navigationBandeauLiveSlice from '../../fixtures/contracts-creos/navigation-bandeau-live-slice.json';
import pageBandeauLiveSandbox from '../../fixtures/contracts-creos/page-bandeau-live-sandbox.json';
import widgetsCatalogBandeauLive from '../../fixtures/contracts-creos/widgets-catalog-bandeau-live.json';
import validNavigationFixture from '../../fixtures/manifests/valid/navigation.json';
import validPageGuardedFixture from '../../fixtures/manifests/valid/page-guarded.json';
import validPageHomeFixture from '../../fixtures/manifests/valid/page-home.json';
import validPageUnknownWidgetFixture from '../../fixtures/manifests/valid/page-unknown-widget.json';
import { defaultAllowedWidgetTypeSet } from '../../validation/allowed-widget-types';
import { loadManifestBundle, type LoadManifestBundleResult } from '../../runtime/load-manifest-bundle';

/**
 * Type présent dans l’allowlist du chargement démo uniquement, volontairement absent du registre
 * → `resolveWidget` échoue au rendu (fallback dégradé visible + `reportRuntimeFallback`).
 */
export const DEMO_RUNTIME_STUB_ONLY_WIDGET_TYPE = 'demo.runtime.stub-only';

function demoAllowedWidgetTypes(): ReadonlySet<string> {
  const s = new Set(defaultAllowedWidgetTypeSet());
  s.add(DEMO_RUNTIME_STUB_ONLY_WIDGET_TYPE);
  return s;
}

export const runtimeDemoManifestLoadResult: LoadManifestBundleResult = loadManifestBundle({
  navigationJson: JSON.stringify(validNavigationFixture),
  pageManifestsJson: [
    JSON.stringify(validPageHomeFixture),
    JSON.stringify(validPageUnknownWidgetFixture),
    JSON.stringify(validPageGuardedFixture),
  ],
  allowedWidgetTypes: demoAllowedWidgetTypes(),
  sourceLabels: {
    navigation: 'fixtures/manifests/valid/navigation.json',
    page: (i) =>
      ['fixtures/.../page-home.json', 'fixtures/.../page-unknown-widget.json', 'fixtures/.../page-guarded.json'][i] ??
      `page[${i}]`,
  },
});

const MANIFEST_POLLING_INTERVAL_S =
  (
    widgetsCatalogBandeauLive as {
      widgets: Array<{ type?: string; data_contract?: { polling_interval_s?: number } }>;
    }
  ).widgets.find((w) => w.type === 'bandeau-live')?.data_contract?.polling_interval_s ?? 30;

/** Page bac à sable Epic 4 avec `use_live_source` aligné sur le catalogue CREOS (appels réels en stack locale). */
function pageBandeauLiveSandboxWithLiveSource(): Record<string, unknown> {
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
              polling_interval_s: MANIFEST_POLLING_INTERVAL_S,
            },
          }
        : slot,
    ),
  };
}

const mergedNavigationForServedApp = {
  version: '1',
  entries: [...validNavigationFixture.entries, ...navigationBandeauLiveSlice.entries],
};

/**
 * Bundle chargé par `RuntimeDemoApp` en application servie : démo Epic 3 + slice bandeau live Epic 4 (reviewables).
 */
export const runtimeServedManifestLoadResult: LoadManifestBundleResult = loadManifestBundle({
  navigationJson: JSON.stringify(mergedNavigationForServedApp),
  pageManifestsJson: [
    JSON.stringify(validPageHomeFixture),
    JSON.stringify(validPageUnknownWidgetFixture),
    JSON.stringify(validPageGuardedFixture),
    JSON.stringify(pageBandeauLiveSandboxWithLiveSource()),
  ],
  allowedWidgetTypes: demoAllowedWidgetTypes(),
  sourceLabels: {
    navigation: 'fixtures/navigation.json + contracts/creos/navigation-bandeau-live-slice.json',
    page: (i) =>
      (
        [
          'fixtures/.../page-home.json',
          'fixtures/.../page-unknown-widget.json',
          'fixtures/.../page-guarded.json',
          'contracts/creos/page-bandeau-live-sandbox.json (use_live_source)',
        ] as const
      )[i] ?? `page[${i}]`,
  },
});
