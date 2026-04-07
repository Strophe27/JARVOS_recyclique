import { describe, expect, it } from 'vitest';
import { filterNavigation } from '../../src/runtime/filter-navigation-for-context';
import { resolvePageAccess } from '../../src/runtime/resolve-page-access';
import type { ContextEnvelopeStub } from '../../src/types/context-envelope';
import type { NavigationManifest } from '../../src/types/navigation-manifest';
import type { PageManifest } from '../../src/types/page-manifest';
import {
  DEFAULT_USER_RUNTIME_PREFS,
  type UserRuntimePrefs,
} from '../../src/types/user-runtime-prefs';
import { resolveNavEntryDisplayLabel } from '../../src/runtime/resolve-nav-entry-display-label';

/**
 * Les prefs ne sont pas des paramètres de `filterNavigation` / `resolvePageAccess`.
 * Ce test fige l’intention produit : deux états de prefs distincts ne peuvent pas altérer ces résultats
 * (car les fonctions n’en dépendent pas).
 */
describe('UserRuntimePrefs vs autorisation (story 3.5)', () => {
  const envelope: ContextEnvelopeStub = {
    schemaVersion: 't',
    siteId: 's1',
    activeRegisterId: null,
    permissions: { permissionKeys: ['demo'] },
    issuedAt: Date.now(),
    runtimeStatus: 'ok',
  };

  const navigation: NavigationManifest = {
    version: '1',
    entries: [
      { id: 'root-home', routeKey: 'home', requiredPermissionKeys: ['demo'] },
      { id: 'admin-area', routeKey: 'admin', requiredPermissionKeys: ['admin-only'] },
    ],
  };

  const page: PageManifest = {
    version: '1',
    pageKey: 'demo-home',
    slots: [],
    requiredPermissionKeys: ['demo'],
  };

  const prefsA: UserRuntimePrefs = {
    ...DEFAULT_USER_RUNTIME_PREFS,
    uiDensity: 'compact',
    sidebarPanelOpen: false,
  };

  const prefsB: UserRuntimePrefs = {
    ...DEFAULT_USER_RUNTIME_PREFS,
    uiDensity: 'comfortable',
    onboardingCompleted: true,
  };

  it('filterNavigation : même manifest + envelope → même résultat (indépendant des prefs)', () => {
    void prefsA;
    void prefsB;
    const nav1 = filterNavigation(navigation, envelope);
    const nav2 = filterNavigation(navigation, envelope);
    expect(nav1).toEqual(nav2);
    expect(nav1.entries.map((e) => e.id)).toEqual(['root-home']);
  });

  it('resolvePageAccess : même page + envelope → même résultat (indépendant des prefs)', () => {
    void prefsA;
    void prefsB;
    const a1 = resolvePageAccess(page, envelope);
    const a2 = resolvePageAccess(page, envelope);
    expect(a1).toEqual(a2);
    expect(a1).toEqual({ allowed: true });
  });

  it('resolveNavEntryDisplayLabel : ne prend pas UserRuntimePrefs (story 5.5)', () => {
    void prefsA;
    void prefsB;
    const entry = { id: 'root-home', routeKey: 'home', labelKey: 'nav.brand' };
    const env = {
      ...envelope,
      presentationLabels: { 'nav.brand': 'Ma ressourcerie' } as const,
    };
    expect(resolveNavEntryDisplayLabel(entry, env)).toBe('Ma ressourcerie');
  });
});
