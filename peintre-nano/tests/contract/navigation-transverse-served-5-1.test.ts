import { describe, expect, it } from 'vitest';
import { runtimeServedManifestLoadResult } from '../../src/app/demo/runtime-demo-manifest';
import {
  createDefaultDemoEnvelope,
  DEMO_PERMISSION_VIEW_HOME,
  DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD,
  NAV_LABEL_KEY_TRANSVERSE_DASHBOARD,
  RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND,
  TRANSVERSE_PERMISSION_ADMIN_VIEW,
  TRANSVERSE_PERMISSION_CONSULTATION_HUB_VIEW,
  TRANSVERSE_PERMISSION_DASHBOARD_VIEW,
  TRANSVERSE_PERMISSION_LISTINGS_HUB_VIEW,
} from '../../src/app/auth/default-demo-auth-adapter';
import { filterNavigation } from '../../src/runtime/filter-navigation-for-context';
import { resolveNavEntryDisplayLabel } from '../../src/runtime/resolve-nav-entry-display-label';
import { resolvePageAccess } from '../../src/runtime/resolve-page-access';

/**
 * Story 5.1 : le bundle servi est entièrement résolu depuis `contracts/creos/manifests/`
 * (pas de navigation orpheline : chaque page_key de la nav a un PageManifest dans le lot).
 */
describe('contract — navigation transverse servie (story 5.1)', () => {
  it('charge le lot sans erreur de validation', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    const pageKeys = new Set(bundle.pages.map((p) => p.pageKey));
    const flat = bundle.navigation.entries.flatMap(function walk(e): typeof bundle.navigation.entries {
      return [e, ...(e.children?.flatMap(walk) ?? [])];
    });
    for (const e of flat) {
      if (e.pageKey) {
        expect(pageKeys.has(e.pageKey), `page_key manquant pour nav ${e.id} → ${e.pageKey}`).toBe(
          true,
        );
      }
    }
  });

  it('expose les entrées transverse avec l’enveloppe démo par défaut', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const filtered = filterNavigation(
      runtimeServedManifestLoadResult.bundle.navigation,
      createDefaultDemoEnvelope(),
    );
    const ids = filtered.entries.map((e) => e.id);
    expect(ids).toContain('transverse-dashboard');
    expect(ids).toContain('transverse-admin');
    expect(ids).toContain('transverse-admin-access');
    expect(ids).toContain('transverse-admin-site');
    expect(ids).toContain('transverse-listing-articles');
    expect(ids).toContain('transverse-listing-dons');
    expect(ids).toContain('transverse-consultation-article');
    expect(ids).toContain('transverse-consultation-don');
  });

  it('masque les entrées listings si transverse.listings.hub.view est absente (story 5.3)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const filtered = filterNavigation(
      runtimeServedManifestLoadResult.bundle.navigation,
      createDefaultDemoEnvelope({
        permissions: {
          permissionKeys: [
            DEMO_PERMISSION_VIEW_HOME,
            RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND,
            TRANSVERSE_PERMISSION_DASHBOARD_VIEW,
            TRANSVERSE_PERMISSION_ADMIN_VIEW,
            TRANSVERSE_PERMISSION_CONSULTATION_HUB_VIEW,
          ],
        },
      }),
    );
    const ids = filtered.entries.map((e) => e.id);
    expect(ids).not.toContain('transverse-listing-articles');
    expect(ids).not.toContain('transverse-listing-dons');
    expect(ids).toContain('transverse-consultation-article');
  });

  it('resolvePageAccess refuse une page listing sans permission listings.hub (story 5.3)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find(
      (p) => p.pageKey === 'transverse-listing-articles',
    );
    expect(page).toBeDefined();
    if (!page) return;
    const denied = resolvePageAccess(
      page,
      createDefaultDemoEnvelope({
        permissions: {
          permissionKeys: [
            DEMO_PERMISSION_VIEW_HOME,
            RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND,
            TRANSVERSE_PERMISSION_DASHBOARD_VIEW,
            TRANSVERSE_PERMISSION_ADMIN_VIEW,
            TRANSVERSE_PERMISSION_CONSULTATION_HUB_VIEW,
          ],
        },
      }),
    );
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('MISSING_PERMISSIONS');
  });

  /**
   * Story 5.2 : manifest dashboard stable `page-transverse-dashboard.json`, page_key `transverse-dashboard`,
   * slots transverses bornés (présentation uniquement — gap data documenté dans le manifeste).
   */
  it('résout la page transverse-dashboard avec garde permission + site (story 5.2)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const dash = runtimeServedManifestLoadResult.bundle.pages.find(
      (p) => p.pageKey === 'transverse-dashboard',
    );
    expect(dash, 'PageManifest transverse-dashboard absente du bundle servi').toBeDefined();
    if (!dash) return;
    expect(dash.requiredPermissionKeys).toEqual(['transverse.dashboard.view']);
    expect(dash.requiresSite).toBe(true);
    const slotIds = dash.slots.map((s) => s.slotId);
    expect(slotIds).toEqual([
      'dashboard.header',
      'dashboard.overview',
      'dashboard.hints',
      'dashboard.data-gap',
    ]);
    for (const s of dash.slots) {
      expect(s.widgetType).toBe('demo.text.block');
    }
  });

  /**
   * Story 5.3 : quatre PageManifest reviewables, chemins et page_key alignés sur le gate epic.
   */
  it('résout le lot listings + consultation (story 5.3)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    const expected = [
      {
        pageKey: 'transverse-listing-articles',
        path: '/listings/articles',
        perm: ['transverse.listings.hub.view'],
        slotPrefix: 'listing.hub',
      },
      {
        pageKey: 'transverse-listing-dons',
        path: '/listings/dons',
        perm: ['transverse.listings.hub.view'],
        slotPrefix: 'listing.hub',
      },
      {
        pageKey: 'transverse-consultation-article',
        path: '/consultation/article',
        perm: ['transverse.consultation.hub.view'],
        slotPrefix: 'consultation',
      },
      {
        pageKey: 'transverse-consultation-don',
        path: '/consultation/don',
        perm: ['transverse.consultation.hub.view'],
        slotPrefix: 'consultation',
      },
    ] as const;

    const flat = bundle.navigation.entries.flatMap(function walk(e): typeof bundle.navigation.entries {
      return [e, ...(e.children?.flatMap(walk) ?? [])];
    });

    for (const spec of expected) {
      const nav = flat.find((e) => e.pageKey === spec.pageKey);
      expect(nav, `entrée nav pour ${spec.pageKey}`).toBeDefined();
      if (!nav) continue;
      expect(nav.path).toBe(spec.path);

      const page = bundle.pages.find((p) => p.pageKey === spec.pageKey);
      expect(page, `PageManifest ${spec.pageKey}`).toBeDefined();
      if (!page) continue;
      expect(page.requiredPermissionKeys).toEqual([...spec.perm]);
      expect(page.requiresSite).toBe(true);
      expect(page.slots).toHaveLength(4);
      for (const s of page.slots) {
        expect(s.widgetType).toBe('demo.text.block');
      }
      expect(page.slots.some((s) => s.slotId.includes(spec.slotPrefix))).toBe(true);
    }
  });

  /**
   * Story 5.4 : trois PageManifest admin, chemins /admin, /admin/access, /admin/site ; même permission + site.
   */
  it('résout le lot admin transverse (story 5.4)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    const expected = [
      {
        pageKey: 'transverse-admin-placeholder',
        path: '/admin',
        slotIds: ['admin.header', 'admin.overview', 'admin.subpages', 'admin.boundaries', 'admin.data-gap'],
      },
      {
        pageKey: 'transverse-admin-access-overview',
        path: '/admin/access',
        slotIds: ['admin.access.header', 'admin.access.scope', 'admin.access.not-matrix', 'admin.access.data-gap'],
      },
      {
        pageKey: 'transverse-admin-site-overview',
        path: '/admin/site',
        slotIds: ['admin.site.header', 'admin.site.scope', 'admin.site.not-sync', 'admin.site.data-gap'],
      },
    ] as const;

    const flat = bundle.navigation.entries.flatMap(function walk(e): typeof bundle.navigation.entries {
      return [e, ...(e.children?.flatMap(walk) ?? [])];
    });

    for (const spec of expected) {
      const nav = flat.find((e) => e.pageKey === spec.pageKey);
      expect(nav, `entrée nav pour ${spec.pageKey}`).toBeDefined();
      if (!nav) continue;
      expect(nav.path).toBe(spec.path);

      const page = bundle.pages.find((p) => p.pageKey === spec.pageKey);
      expect(page, `PageManifest ${spec.pageKey}`).toBeDefined();
      if (!page) continue;
      expect(page.requiredPermissionKeys).toEqual(['transverse.admin.view']);
      expect(page.requiresSite).toBe(true);
      expect(page.slots.map((s) => s.slotId)).toEqual([...spec.slotIds]);
      for (const s of page.slots) {
        expect(s.widgetType).toBe('demo.text.block');
      }
    }
  });

  it('masque les trois entrées admin si transverse.admin.view est absente (story 5.4)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const filtered = filterNavigation(
      runtimeServedManifestLoadResult.bundle.navigation,
      createDefaultDemoEnvelope({
        permissions: {
          permissionKeys: [
            DEMO_PERMISSION_VIEW_HOME,
            RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND,
            TRANSVERSE_PERMISSION_DASHBOARD_VIEW,
            TRANSVERSE_PERMISSION_LISTINGS_HUB_VIEW,
            TRANSVERSE_PERMISSION_CONSULTATION_HUB_VIEW,
          ],
        },
      }),
    );
    const ids = filtered.entries.map((e) => e.id);
    expect(ids).not.toContain('transverse-admin');
    expect(ids).not.toContain('transverse-admin-access');
    expect(ids).not.toContain('transverse-admin-site');
  });

  it('resolvePageAccess refuse /admin/access sans transverse.admin.view (story 5.4)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find(
      (p) => p.pageKey === 'transverse-admin-access-overview',
    );
    expect(page).toBeDefined();
    if (!page) return;
    const denied = resolvePageAccess(
      page,
      createDefaultDemoEnvelope({
        permissions: {
          permissionKeys: [
            DEMO_PERMISSION_VIEW_HOME,
            RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND,
            TRANSVERSE_PERMISSION_DASHBOARD_VIEW,
            TRANSVERSE_PERMISSION_LISTINGS_HUB_VIEW,
            TRANSVERSE_PERMISSION_CONSULTATION_HUB_VIEW,
          ],
        },
      }),
    );
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('MISSING_PERMISSIONS');
  });

  const envelopeSansAdminView = createDefaultDemoEnvelope({
    permissions: {
      permissionKeys: [
        DEMO_PERMISSION_VIEW_HOME,
        RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND,
        TRANSVERSE_PERMISSION_DASHBOARD_VIEW,
        TRANSVERSE_PERMISSION_LISTINGS_HUB_VIEW,
        TRANSVERSE_PERMISSION_CONSULTATION_HUB_VIEW,
      ],
    },
  });

  it('resolvePageAccess refuse le hub /admin sans transverse.admin.view (story 5.4)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find(
      (p) => p.pageKey === 'transverse-admin-placeholder',
    );
    expect(page).toBeDefined();
    if (!page) return;
    const denied = resolvePageAccess(page, envelopeSansAdminView);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('MISSING_PERMISSIONS');
  });

  it('resolvePageAccess refuse /admin/site sans transverse.admin.view (story 5.4)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find(
      (p) => p.pageKey === 'transverse-admin-site-overview',
    );
    expect(page).toBeDefined();
    if (!page) return;
    const denied = resolvePageAccess(page, envelopeSansAdminView);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('MISSING_PERMISSIONS');
  });

  describe('Story 5.5 — label_key nav.transverse.* + résolution enveloppe', () => {
    it('porte des label_key stables préfixés nav.transverse.* sur le lot transverse servi', () => {
      expect(runtimeServedManifestLoadResult.ok).toBe(true);
      if (!runtimeServedManifestLoadResult.ok) return;
      const flat = runtimeServedManifestLoadResult.bundle.navigation.entries.flatMap(function walk(
        e,
      ): typeof runtimeServedManifestLoadResult.bundle.navigation.entries {
        return [e, ...(e.children?.flatMap(walk) ?? [])];
      });
      const transverseIds = new Set([
        'transverse-dashboard',
        'transverse-admin',
        'transverse-admin-access',
        'transverse-admin-site',
        'transverse-listing-articles',
        'transverse-listing-dons',
        'transverse-consultation-article',
        'transverse-consultation-don',
      ]);
      for (const e of flat) {
        if (!transverseIds.has(e.id)) continue;
        expect(e.labelKey?.startsWith('nav.transverse.')).toBe(true);
      }
    });

    it('résout le libellé dashboard depuis presentation_labels de l’enveloppe démo', () => {
      expect(runtimeServedManifestLoadResult.ok).toBe(true);
      if (!runtimeServedManifestLoadResult.ok) return;
      const dash = runtimeServedManifestLoadResult.bundle.navigation.entries.find(
        (x) => x.id === 'transverse-dashboard',
      );
      expect(dash?.labelKey).toBe(NAV_LABEL_KEY_TRANSVERSE_DASHBOARD);
      if (!dash) return;
      expect(resolveNavEntryDisplayLabel(dash, createDefaultDemoEnvelope())).toBe(
        DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD,
      );
    });
  });
});
