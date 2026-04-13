import { describe, expect, it } from 'vitest';
import { runtimeServedManifestLoadResult } from '../../src/app/demo/runtime-demo-manifest';
import {
  createDefaultDemoEnvelope,
  DEMO_PERMISSION_VIEW_HOME,
  DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD,
  NAV_LABEL_KEY_TRANSVERSE_DASHBOARD,
  PERMISSION_CASHFLOW_DEFERRED,
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_REFUND,
  PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT,
  PERMISSION_CASHFLOW_VIRTUAL,
  RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND,
  TRANSVERSE_PERMISSION_ADMIN_VIEW,
  TRANSVERSE_PERMISSION_CONSULTATION_HUB_VIEW,
  TRANSVERSE_PERMISSION_DASHBOARD_VIEW,
  TRANSVERSE_PERMISSION_LISTINGS_HUB_VIEW,
} from '../../src/app/auth/default-demo-auth-adapter';
import { filterNavigation } from '../../src/runtime/filter-navigation-for-context';
import { resolveNavEntryDisplayLabel } from '../../src/runtime/resolve-nav-entry-display-label';
import { ADMIN_TRANSVERSE_LIST_PAGE_MANIFEST_GUARDS } from '../../src/domains/admin-config/admin-transverse-list-page-guards';
import { ADMIN_TRANSVERSE_LIST_SHELL_SLOT_IDS } from '../../src/domains/admin-config/admin-transverse-list-shell-slots';
import { resolvePageAccess } from '../../src/runtime/resolve-page-access';

/**
 * Story 5.1 : le bundle servi est entièrement résolu depuis `contracts/creos/manifests/`
 * (pas de navigation orpheline : chaque page_key de la nav a un PageManifest dans le lot).
 */
describe('contract — navigation transverse servie (story 5.1)', () => {
  it('ne sert plus d’entrées nav démo parasites (hors parcours produit / legacy observable)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const rawIds = runtimeServedManifestLoadResult.bundle.navigation.entries.map((e) => e.id);
    for (const id of [
      'demo-guarded-nav',
      'runtime-demo-sandbox',
      'demo-fallback-unknown-widget',
      'admin-area',
    ] as const) {
      expect(rawIds).not.toContain(id);
    }
  });

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
    expect(ids).toContain('transverse-dashboard-benevole');
    expect(ids).toContain('transverse-admin');
    expect(ids).toContain('transverse-admin-access');
    expect(ids).toContain('transverse-admin-site');
    expect(ids).toContain('transverse-admin-users');
    expect(ids).toContain('transverse-admin-groups');
    expect(ids).toContain('transverse-admin-categories');
    expect(ids).toContain('transverse-admin-audit-log');
    expect(ids).toContain('transverse-admin-cash-registers');
    expect(ids).toContain('transverse-admin-sites');
    expect(ids).toContain('transverse-admin-session-manager');
    expect(ids).toContain('transverse-admin-settings');
    expect(ids).toContain('transverse-admin-reception-stats');
    expect(ids).toContain('transverse-admin-reception-sessions');
    expect(ids).toContain('transverse-listing-articles');
    expect(ids).toContain('transverse-listing-dons');
    expect(ids).toContain('transverse-consultation-article');
    expect(ids).toContain('transverse-consultation-don');
    expect(ids).toContain('cashflow-nominal');
    expect(ids).toContain('cashflow-refund');
    expect(ids).not.toContain('cashflow-special-don');
    expect(ids).not.toContain('cashflow-special-adhesion');
    expect(ids).not.toContain('cashflow-social-don');
    expect(ids).toContain('cashflow-close');
    expect(ids).not.toContain('cashflow-sale-correction');
    expect(ids).toContain('reception-nominal');
  });

  it('expose l’entrée /caisse avec une permission virtuelle seule (brownfield réel|virtuel|différé)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const filtered = filterNavigation(
      runtimeServedManifestLoadResult.bundle.navigation,
      createDefaultDemoEnvelope({
        permissions: {
          permissionKeys: [DEMO_PERMISSION_VIEW_HOME, RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND, PERMISSION_CASHFLOW_VIRTUAL],
        },
      }),
    );
    expect(filtered.entries.map((e) => e.id)).toContain('cashflow-nominal');

    const page = runtimeServedManifestLoadResult.bundle.pages.find((p) => p.pageKey === 'cashflow-nominal');
    expect(page).toBeDefined();
    if (!page) return;
    expect(resolvePageAccess(page, createDefaultDemoEnvelope({
      permissions: {
        permissionKeys: [DEMO_PERMISSION_VIEW_HOME, RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND, PERMISSION_CASHFLOW_VIRTUAL],
      },
    }))).toEqual({ allowed: true });
  });

  it('expose l’entrée /caisse avec une permission différée seule (brownfield réel|virtuel|différé)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const filtered = filterNavigation(
      runtimeServedManifestLoadResult.bundle.navigation,
      createDefaultDemoEnvelope({
        permissions: {
          permissionKeys: [DEMO_PERMISSION_VIEW_HOME, RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND, PERMISSION_CASHFLOW_DEFERRED],
        },
      }),
    );
    expect(filtered.entries.map((e) => e.id)).toContain('cashflow-nominal');
  });

  it('ne sert plus d’entrée transverse caisse « correction ticket » (Story 6.8 — locus admin)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    const flat = bundle.navigation.entries.flatMap(function walk(e): typeof bundle.navigation.entries {
      return [e, ...(e.children?.flatMap(walk) ?? [])];
    });
    expect(flat.some((e) => e.path === '/caisse/correction-ticket')).toBe(false);
    const pageKeys = new Set(bundle.pages.map((p) => p.pageKey));
    expect(pageKeys.has('admin-cash-session-detail')).toBe(true);
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
    expect(slotIds).toEqual(['main']);
    expect(dash.slots.map((s) => s.widgetType)).toEqual(['demo.legacy.dashboard.workspace']);
  });

  it('résout la page transverse-dashboard-benevole (dashboard personnel, parité legacy)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find(
      (p) => p.pageKey === 'transverse-dashboard-benevole',
    );
    expect(page, 'PageManifest transverse-dashboard-benevole absente du bundle servi').toBeDefined();
    if (!page) return;
    expect(page.requiredPermissionKeys).toEqual(['transverse.dashboard.view']);
    expect(page.requiresSite).toBe(true);
    expect(page.slots.map((s) => s.slotId)).toEqual(['main']);
    expect(page.slots.map((s) => s.widgetType)).toEqual(['demo.legacy.dashboard.personal']);
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
   * Story 5.4 + 18.1 : hub `/admin` → `transverse-admin-reports-hub` ; `/admin/access`, `/admin/site` inchangés.
   */
  it('résout le lot admin transverse (story 5.4)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    const expected = [
      {
        pageKey: 'transverse-admin-reports-hub',
        path: '/admin',
        slotIds: ['admin.dashboard.legacy'],
        widgetTypes: ['admin.legacy.dashboard.home'],
      },
      {
        pageKey: 'transverse-admin-access-overview',
        path: '/admin/access',
        slotIds: ['admin.access.header', 'admin.access.scope', 'admin.access.not-matrix', 'admin.access.data-gap'],
        widgetTypes: ['demo.text.block', 'demo.text.block', 'demo.text.block', 'demo.text.block'],
      },
      {
        pageKey: 'transverse-admin-site-overview',
        path: '/admin/site',
        slotIds: ['admin.site.header', 'admin.site.scope', 'admin.site.not-sync', 'admin.site.data-gap'],
        widgetTypes: ['demo.text.block', 'demo.text.block', 'demo.text.block', 'demo.text.block'],
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
      expect(page.slots.map((s) => s.widgetType)).toEqual([...spec.widgetTypes]);
    }
  });

  /**
   * Story 18.1 : entrée unique `transverse-admin` sur `/admin` → `transverse-admin-reports-hub`
   * (pas de seconde entrée nav `/admin/reports` — collision `page_key`).
   */
  it('résout le hub rapports admin sur /admin (Story 18.1)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    const flat = bundle.navigation.entries.flatMap(function walk(e): typeof bundle.navigation.entries {
      return [e, ...(e.children?.flatMap(walk) ?? [])];
    });
    expect(flat.some((e) => e.id === 'transverse-admin-reports')).toBe(false);
    const nav = flat.find((e) => e.pageKey === 'transverse-admin-reports-hub');
    expect(nav?.path).toBe('/admin');
    expect(nav?.id).toBe('transverse-admin');

    const page = bundle.pages.find((p) => p.pageKey === 'transverse-admin-reports-hub');
    expect(page).toBeDefined();
    if (!page) return;
    expect(page.requiredPermissionKeys).toEqual(['transverse.admin.view']);
    expect(page.requiresSite).toBe(true);
    expect(page.slots.map((s) => s.slotId)).toEqual(['admin.dashboard.legacy']);
    expect(page.slots.map((s) => s.widgetType)).toEqual(['admin.legacy.dashboard.home']);
  });

  it('ne manifeste aucune entrée nav sur le chemin SPA /admin/reports (alias runtime → /admin ; Story 18.1 CR)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    const flat = bundle.navigation.entries.flatMap(function walk(e): typeof bundle.navigation.entries {
      return [e, ...(e.children?.flatMap(walk) ?? [])];
    });
    expect(flat.some((e) => e.path === '/admin/reports')).toBe(false);
    expect(flat.some((e) => e.id === 'transverse-admin-reports')).toBe(false);
    const hub = flat.find((e) => e.pageKey === 'transverse-admin-reports-hub');
    expect(hub?.path).toBe('/admin');
    expect(hub?.id).toBe('transverse-admin');
  });

  it('ne manifeste aucune entrée nav sur le chemin SPA /admin/pending (rail retiré ; alias runtime → /admin)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    const flat = bundle.navigation.entries.flatMap(function walk(e): typeof bundle.navigation.entries {
      return [e, ...(e.children?.flatMap(walk) ?? [])];
    });
    expect(flat.some((e) => e.path === '/admin/pending')).toBe(false);
    expect(flat.some((e) => e.id === 'transverse-admin-pending')).toBe(false);
    const hub = flat.find((e) => e.pageKey === 'transverse-admin-reports-hub');
    expect(hub?.path).toBe('/admin');
    expect(hub?.id).toBe('transverse-admin');
  });

  /**
   * Pages admin transverse : shell liste homogène ou slot principal seul selon la page ;
   * guards documentés (`admin-transverse-list-page-guards.ts`).
   */
  it('résout les pages admin liste transverse (stories 17.1–17.3)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    const flat = bundle.navigation.entries.flatMap(function walk(e): typeof bundle.navigation.entries {
      return [e, ...(e.children?.flatMap(walk) ?? [])];
    });

    const cases = [
      {
        pageKey: 'transverse-admin-users',
        path: '/admin/users',
        navId: 'transverse-admin-users',
        mainWidget: 'admin.users.demo',
      },
      {
        pageKey: 'transverse-admin-groups',
        path: '/admin/groups',
        navId: 'transverse-admin-groups',
        mainWidget: 'admin.groups.demo',
      },
      {
        pageKey: 'transverse-admin-categories',
        path: '/admin/categories',
        navId: 'transverse-admin-categories',
        mainWidget: 'admin.categories.demo',
      },
      {
        pageKey: 'transverse-admin-audit-log',
        path: '/admin/audit-log',
        navId: 'transverse-admin-audit-log',
        mainWidget: 'admin.audit-log.demo',
      },
      {
        pageKey: 'transverse-admin-cash-registers',
        path: '/admin/cash-registers',
        navId: 'transverse-admin-cash-registers',
        mainWidget: 'admin.cash-registers.demo',
      },
      {
        pageKey: 'transverse-admin-sites',
        path: '/admin/sites',
        navId: 'transverse-admin-sites',
        mainWidget: 'admin.sites.demo',
      },
      {
        pageKey: 'transverse-admin-session-manager',
        path: '/admin/session-manager',
        navId: 'transverse-admin-session-manager',
        mainWidget: 'admin.session-manager.demo',
      },
      {
        pageKey: 'transverse-admin-settings',
        path: '/admin/settings',
        navId: 'transverse-admin-settings',
        mainWidget: 'admin.advanced.settings.demo',
      },
      {
        pageKey: 'transverse-admin-reception-stats',
        path: '/admin/reception-stats',
        navId: 'transverse-admin-reception-stats',
        mainWidget: 'admin.reception.stats.supervision',
      },
      {
        pageKey: 'transverse-admin-reception-sessions',
        path: '/admin/reception-sessions',
        navId: 'transverse-admin-reception-sessions',
        mainWidget: 'admin.reception.tickets.list',
      },
    ] as const;

    for (const spec of cases) {
      const nav = flat.find((e) => e.pageKey === spec.pageKey);
      expect(nav?.path).toBe(spec.path);
      expect(nav?.id).toBe(spec.navId);

      const page = bundle.pages.find((p) => p.pageKey === spec.pageKey);
      expect(page).toBeDefined();
      if (!page) continue;
      expect(page.requiredPermissionKeys).toEqual([
        ...ADMIN_TRANSVERSE_LIST_PAGE_MANIFEST_GUARDS.requiredPermissionKeys,
      ]);
      expect(page.requiresSite).toBe(ADMIN_TRANSVERSE_LIST_PAGE_MANIFEST_GUARDS.requiresSite);
      if (
        spec.pageKey === 'transverse-admin-users' ||
        spec.pageKey === 'transverse-admin-groups' ||
        spec.pageKey === 'transverse-admin-categories' ||
        spec.pageKey === 'transverse-admin-audit-log' ||
        spec.pageKey === 'transverse-admin-cash-registers' ||
        spec.pageKey === 'transverse-admin-sites' ||
        spec.pageKey === 'transverse-admin-session-manager' ||
        spec.pageKey === 'transverse-admin-settings' ||
        spec.pageKey === 'transverse-admin-reception-sessions'
      ) {
        expect(page.slots.map((s) => s.slotId)).toEqual(['admin.transverse-list.main']);
        expect(page.slots.map((s) => s.widgetType)).toEqual([spec.mainWidget]);
        continue;
      }
      expect(page.slots.map((s) => s.slotId)).toEqual([...ADMIN_TRANSVERSE_LIST_SHELL_SLOT_IDS]);
      expect(page.slots.map((s) => s.widgetType)).toEqual([
        'demo.text.block',
        'demo.text.block',
        spec.mainWidget,
      ]);
    }
  });

  it('masque les entrées admin si transverse.admin.view est absente (story 5.4 + 17.1)', () => {
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
    expect(ids).not.toContain('transverse-admin-users');
    expect(ids).not.toContain('transverse-admin-groups');
    expect(ids).not.toContain('transverse-admin-categories');
    expect(ids).not.toContain('transverse-admin-audit-log');
    expect(ids).not.toContain('transverse-admin-cash-registers');
    expect(ids).not.toContain('transverse-admin-sites');
    expect(ids).not.toContain('transverse-admin-session-manager');
    expect(ids).not.toContain('transverse-admin-settings');
    expect(ids).not.toContain('transverse-admin-reception-stats');
    expect(ids).not.toContain('transverse-admin-reception-sessions');
    expect(ids).not.toContain('transverse-admin-reports');
  });

  it('ne sert plus d’entrées nav dédiées don / adhésion spéciaux (Story 6.5 — variantes dans /caisse)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    const flat = bundle.navigation.entries.flatMap(function walk(e): typeof bundle.navigation.entries {
      return [e, ...(e.children?.flatMap(walk) ?? [])];
    });
    expect(flat.some((e) => e.id === 'cashflow-special-don')).toBe(false);
    expect(flat.some((e) => e.id === 'cashflow-special-adhesion')).toBe(false);
  });

  it('pas d’entrée nav dédiée Don social — Story 6.6 (locus workspace `/caisse`, widget dans le nominal)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const filtered = filterNavigation(
      runtimeServedManifestLoadResult.bundle.navigation,
      createDefaultDemoEnvelope(),
    );
    const ids = filtered.entries.map((e) => e.id);
    expect(ids).not.toContain('cashflow-social-don');
  });

  it('n’embarque plus les PageManifest isolés don / adhésion spéciaux dans le bundle servi (Story 6.5)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    expect(bundle.pages.some((p) => p.pageKey === 'cashflow-special-don')).toBe(false);
    expect(bundle.pages.some((p) => p.pageKey === 'cashflow-special-adhesion')).toBe(false);
  });

  it('n’embarque pas de PageManifest isolé don social — Story 6.6 (widget dans le nominal)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    expect(bundle.pages.some((p) => p.pageKey === 'cashflow-social-don')).toBe(false);
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
      (p) => p.pageKey === 'transverse-admin-reports-hub',
    );
    expect(page).toBeDefined();
    if (!page) return;
    const denied = resolvePageAccess(page, envelopeSansAdminView);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('MISSING_PERMISSIONS');
  });

  it('resolvePageAccess refuse /admin/users sans transverse.admin.view', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find(
      (p) => p.pageKey === 'transverse-admin-users',
    );
    expect(page).toBeDefined();
    if (!page) return;
    const denied = resolvePageAccess(page, envelopeSansAdminView);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('MISSING_PERMISSIONS');
  });

  it('resolvePageAccess refuse /admin/cash-registers sans transverse.admin.view (story 17.2)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find(
      (p) => p.pageKey === 'transverse-admin-cash-registers',
    );
    expect(page).toBeDefined();
    if (!page) return;
    const denied = resolvePageAccess(page, envelopeSansAdminView);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('MISSING_PERMISSIONS');
  });

  it('resolvePageAccess refuse /admin/sites sans transverse.admin.view (story 17.2)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find((p) => p.pageKey === 'transverse-admin-sites');
    expect(page).toBeDefined();
    if (!page) return;
    const denied = resolvePageAccess(page, envelopeSansAdminView);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('MISSING_PERMISSIONS');
  });

  it('resolvePageAccess refuse /admin/session-manager sans transverse.admin.view (story 18.2)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find(
      (p) => p.pageKey === 'transverse-admin-session-manager',
    );
    expect(page).toBeDefined();
    if (!page) return;
    const denied = resolvePageAccess(page, envelopeSansAdminView);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('MISSING_PERMISSIONS');
  });

  it('resolvePageAccess refuse /admin/reception-stats sans transverse.admin.view (story 19.1)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find(
      (p) => p.pageKey === 'transverse-admin-reception-stats',
    );
    expect(page).toBeDefined();
    if (!page) return;
    const denied = resolvePageAccess(page, envelopeSansAdminView);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('MISSING_PERMISSIONS');
  });

  it('resolvePageAccess refuse /admin/reception-sessions sans transverse.admin.view (story 19.2)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find(
      (p) => p.pageKey === 'transverse-admin-reception-sessions',
    );
    expect(page).toBeDefined();
    if (!page) return;
    const denied = resolvePageAccess(page, envelopeSansAdminView);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.code).toBe('MISSING_PERMISSIONS');
  });

  /**
   * Story 18.3 — détail session caisse admin : PageManifest reviewable + widget principal seul
   * (données live uniquement via `recyclique_cashSessions_getSessionDetail` côté client, pas d’`operationId` inventé).
   */
  it('résout la page admin-cash-session-detail du bundle servi (Story 18.3)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find((p) => p.pageKey === 'admin-cash-session-detail');
    expect(page, 'PageManifest admin-cash-session-detail absente du bundle servi').toBeDefined();
    if (!page) return;
    expect(page.requiredPermissionKeys).toEqual(['transverse.admin.view']);
    expect(page.requiresSite).toBe(true);
    expect(page.slots.map((s) => s.slotId)).toEqual(['main']);
    expect(page.slots.map((s) => s.widgetType)).toEqual(['admin-cash-session-detail']);
    expect(resolvePageAccess(page, envelopeSansAdminView).allowed).toBe(false);
  });

  it('résout la page admin-reception-ticket-detail du bundle servi (Story 19.2)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find(
      (p) => p.pageKey === 'admin-reception-ticket-detail',
    );
    expect(page, 'PageManifest admin-reception-ticket-detail absente du bundle servi').toBeDefined();
    if (!page) return;
    expect(page.requiredPermissionKeys).toEqual(['transverse.admin.view']);
    expect(page.requiresSite).toBe(true);
    expect(page.slots.map((s) => s.slotId)).toEqual(['main']);
    expect(page.slots.map((s) => s.widgetType)).toEqual(['admin-reception-ticket-detail']);
    expect(resolvePageAccess(page, envelopeSansAdminView).allowed).toBe(false);
  });

  /**
   * Story 19.2 — AC 10 : présence manifeste liste `/admin/reception-sessions` + page détail ticket
   * (`/admin/reception-tickets/<uuid>` résolu au runtime, sans entrée nav statique — cf. e2e).
   */
  it('AC 10 (Story 19.2) — entrée nav liste réception + PageManifest détail ticket accessibles (démo)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const { bundle } = runtimeServedManifestLoadResult;
    const flat = bundle.navigation.entries.flatMap(function walk(e): typeof bundle.navigation.entries {
      return [e, ...(e.children?.flatMap(walk) ?? [])];
    });
    expect(
      flat.some(
        (e) => e.pageKey === 'transverse-admin-reception-sessions' && e.path === '/admin/reception-sessions',
      ),
    ).toBe(true);
    const listPage = bundle.pages.find((p) => p.pageKey === 'transverse-admin-reception-sessions');
    const detailPage = bundle.pages.find((p) => p.pageKey === 'admin-reception-ticket-detail');
    expect(listPage).toBeDefined();
    expect(detailPage).toBeDefined();
    if (!listPage || !detailPage) return;
    expect(resolvePageAccess(listPage, createDefaultDemoEnvelope()).allowed).toBe(true);
    expect(resolvePageAccess(detailPage, createDefaultDemoEnvelope()).allowed).toBe(true);
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

  it('resolvePageAccess refuse le hub /admin (rapports) sans transverse.admin.view (Story 18.1)', () => {
    expect(runtimeServedManifestLoadResult.ok).toBe(true);
    if (!runtimeServedManifestLoadResult.ok) return;
    const page = runtimeServedManifestLoadResult.bundle.pages.find((p) => p.pageKey === 'transverse-admin-reports-hub');
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
        'transverse-dashboard-benevole',
        'transverse-admin',
        'transverse-admin-access',
        'transverse-admin-site',
        'transverse-admin-users',
        'transverse-admin-groups',
        'transverse-admin-categories',
        'transverse-admin-audit-log',
        'transverse-admin-cash-registers',
        'transverse-admin-sites',
        'transverse-admin-session-manager',
        'transverse-admin-settings',
        'transverse-admin-reception-stats',
        'transverse-admin-reception-sessions',
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

  /**
   * Story 18.3 — ancrage contrat bundle : hub `/admin`, session-manager, détail cash-session ;
   * preuve machine lisible pour la matrice (sans simulation d’API hors OpenAPI).
   */
  describe('Story 18.3 — surfaces admin supervision caisse (CREOS bundle)', () => {
    it('embarque hub rapports + session-manager + reception-stats + reception-sessions + pages détail session / ticket dans le bundle servi', () => {
      expect(runtimeServedManifestLoadResult.ok).toBe(true);
      if (!runtimeServedManifestLoadResult.ok) return;
      const { bundle } = runtimeServedManifestLoadResult;
      const pageKeys = new Set(bundle.pages.map((p) => p.pageKey));
      expect(pageKeys.has('transverse-admin-reports-hub')).toBe(true);
      expect(pageKeys.has('transverse-admin-session-manager')).toBe(true);
      expect(pageKeys.has('transverse-admin-reception-stats')).toBe(true);
      expect(pageKeys.has('transverse-admin-reception-sessions')).toBe(true);
      expect(pageKeys.has('transverse-admin-settings')).toBe(true);
      expect(pageKeys.has('admin-cash-session-detail')).toBe(true);
      expect(pageKeys.has('admin-reception-ticket-detail')).toBe(true);
      const flat = bundle.navigation.entries.flatMap(function walk(e): typeof bundle.navigation.entries {
        return [e, ...(e.children?.flatMap(walk) ?? [])];
      });
      expect(flat.some((e) => e.path === '/admin' && e.pageKey === 'transverse-admin-reports-hub')).toBe(true);
      expect(flat.some((e) => e.path === '/admin/session-manager')).toBe(true);
      expect(flat.some((e) => e.path === '/admin/reception-stats')).toBe(true);
      expect(flat.some((e) => e.path === '/admin/reception-sessions')).toBe(true);
      expect(flat.some((e) => e.path === '/admin/settings')).toBe(true);
      expect(flat.some((e) => e.path === '/admin/groups')).toBe(true);
      expect(flat.some((e) => e.path === '/admin/categories')).toBe(true);
      expect(flat.some((e) => e.path === '/admin/audit-log')).toBe(true);
      expect(flat.some((e) => e.path === '/admin/reports')).toBe(false);
      expect(flat.some((e) => e.path === '/admin/pending')).toBe(false);
    });
  });

  /**
   * Story 19.3 — pilotage réception : pas de nav CREOS pour `/admin/reception-reports` (ligne matrice isolée) ;
   * branches export **B** restent documentées dans le manifeste liste (slot contract-gap), sans activation UI.
   */
  describe('Story 19.3 — pilotage réception (bundle CREOS)', () => {
    it('ne manifeste aucune entrée nav sur /admin/reception-reports (exports legacy hors rail U prouvé)', () => {
      expect(runtimeServedManifestLoadResult.ok).toBe(true);
      if (!runtimeServedManifestLoadResult.ok) return;
      const { bundle } = runtimeServedManifestLoadResult;
      const flat = bundle.navigation.entries.flatMap(function walk(e): typeof bundle.navigation.entries {
        return [e, ...(e.children?.flatMap(walk) ?? [])];
      });
      expect(flat.some((e) => e.path === '/admin/reception-reports')).toBe(false);
      expect(flat.some((e) => e.id === 'transverse-admin-reception-reports')).toBe(false);
    });

    it('manifeste la liste reception-sessions comme une seule zone principale (widget liste, sans slots doublons)', () => {
      expect(runtimeServedManifestLoadResult.ok).toBe(true);
      if (!runtimeServedManifestLoadResult.ok) return;
      const page = runtimeServedManifestLoadResult.bundle.pages.find(
        (p) => p.pageKey === 'transverse-admin-reception-sessions',
      );
      expect(page).toBeDefined();
      if (!page) return;
      expect(page.slots.map((s) => s.slotId)).toEqual(['admin.transverse-list.main']);
      expect(page.slots.map((s) => s.widgetType)).toEqual(['admin.reception.tickets.list']);
    });
  });
});
