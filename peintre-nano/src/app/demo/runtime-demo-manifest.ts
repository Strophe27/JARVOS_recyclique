/**
 * Lot de manifests pour la démo runtime (story 3.7).
 *
 * Source de vérité : JSON sous `src/fixtures/manifests/valid/` (importés ici).
 * `public/manifests/` est une copie pour vérification manuelle via fetch — tenir les deux alignés.
 */
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
