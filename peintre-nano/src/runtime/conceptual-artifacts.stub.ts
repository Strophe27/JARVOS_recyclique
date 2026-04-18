/**
 * Stub **tests + vérification de compilation** uniquement — pas une source de vérité runtime.
 * Importé depuis `main.tsx` pour forcer l'exhaustivité des types au chargement du bundle.
 */
import type { PeintreTruthStack } from './conceptual-artifacts';

export const TRUTH_STACK_STUB_FOR_TESTS: PeintreTruthStack = {
  context: {
    schemaVersion: 'stub-0',
    siteId: null,
    activeRegisterId: null,
    permissions: { permissionKeys: [] },
    issuedAt: 0,
    runtimeStatus: 'ok',
  },
  navigation: { version: 'stub-0', entries: [] },
  page: { version: 'stub-0', pageKey: 'stub', slots: [] },
  prefs: { uiDensity: 'comfortable', sidebarPanelOpen: true, onboardingCompleted: false },
};

void TRUTH_STACK_STUB_FOR_TESTS;
