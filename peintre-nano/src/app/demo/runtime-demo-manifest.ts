/**
 * Lot de manifests pour la démo runtime (story 3.7).
 *
 * Source de vérité démo isolée : JSON sous `src/fixtures/manifests/valid/` (importés ici).
 * `public/manifests/` est une copie pour vérification manuelle via fetch — tenir les deux alignés.
 *
 * Story 5.1 : `runtimeServedManifestLoadResult` charge le bundle **commanditaire** sous
 * `contracts/creos/manifests/` (`navigation-transverse-served.json` + pages associées). La navigation
 * servie n’est plus assemblée par concaténation locale de fixtures + slice : un seul NavigationManifest
 * reviewable, aligné Convergence 2 / Epic 4 (entrée bandeau incluse).
 *
 * Story 5.2 : page transverse sous contrat `page-transverse-dashboard.json` (`page_key` `transverse-dashboard`),
 * référencée par `navigation-transverse-served.json` pour `/dashboard`.
 *
 * Story 5.3 : quatre PageManifest transverses (listings + consultation) sous `contracts/creos/manifests/`,
 * référencés par `navigation-transverse-served.json`.
 *
 * Story 5.4 : lot admin transverse (hub `/admin` + access + site).
 * Story 18.1 : entrée manifestée `transverse-admin` sur `/admin` → `page-transverse-admin-reports-hub.json` (hub rapports,
 * gap K explicite, liens vers routes déjà manifestées + legacy). Pas de route nav officielle `/admin/reports` dans le
 * bundle servi ; alias SPA éventuel → `/admin` dans `RuntimeDemoApp` (pas d’`id` nav absent du manifeste).
 *
 *
 * Story 17.2 : pages `transverse-admin-cash-registers` (`/admin/cash-registers`) et `transverse-admin-sites`
 * (`/admin/sites`) — même discipline rail U (gaps G-OA-02 → Epic 16).
 *
 * Story 18.2 : page `transverse-admin-session-manager` (`/admin/session-manager`) — liste sessions gap **K**,
 * détail session inchangé (`page-admin-cash-session-detail`), exports classe **B** exclus à l'UI.
 *
 * Story 19.1 : page `transverse-admin-reception-stats` (`/admin/reception-stats`) — agrégats `recyclique_stats_*` + gap K nominatif.
 *
 * Story 19.2 : `transverse-admin-reception-sessions` (`/admin/reception-sessions`) + `admin-reception-ticket-detail`
 * (`/admin/reception-tickets/:id`) — lectures `recyclique_reception_listTickets` / `recyclique_reception_getTicketDetail`.
 *
 * Story 19.3 : paquet de preuve pilotage réception (matrice + tests + doc § 19.3) ; exports **B** et
 * `/admin/reception-reports` hors critère succès **19.x** mais nommés ; MCP navigateur **NEEDS_HITL** si indisponible au DS
 * (`references/artefacts/2026-04-12_08_preuve-parite-pilotage-reception-19-3-needs-hitl.md`).
 *
 * Story 5.5 : `label_key` transverses préfixés `nav.transverse.*` ; libellés affichés via `ContextEnvelopeStub.presentationLabels`
 * (aligné OpenAPI `presentation_labels`) dans `FilteredNavEntries`.
 *
 * Story 5.6 : gabarits transverses (`templates/transverse/`) appliqués via `wrapUnmappedSlotContent` dans
 * `buildPageManifestRegions` depuis `RuntimeDemoApp` — grilles CSS + `data-testid`, sans changement de sémantique manifeste.
 */
import navigationTransverseServed from '../../../../contracts/creos/manifests/navigation-transverse-served.json';
import pageBandeauLiveSandbox from '../../../../contracts/creos/manifests/page-bandeau-live-sandbox.json';
import pageDemoGuardedPage from '../../../../contracts/creos/manifests/page-demo-guarded-page.json';
import pageDemoHome from '../../../../contracts/creos/manifests/page-demo-home.json';
import pageDemoUnknownWidget from '../../../../contracts/creos/manifests/page-demo-unknown-widget.json';
import pageTransverseAdminAccessOverview from '../../../../contracts/creos/manifests/page-transverse-admin-access-overview.json';
import pageTransverseAdminPlaceholder from '../../../../contracts/creos/manifests/page-transverse-admin-placeholder.json';
import pageTransverseAdminReportsHub from '../../../../contracts/creos/manifests/page-transverse-admin-reports-hub.json';
import pageTransverseAdminSiteOverview from '../../../../contracts/creos/manifests/page-transverse-admin-site-overview.json';
import pageTransverseAdminUsers from '../../../../contracts/creos/manifests/page-transverse-admin-users.json';
import pageTransverseAdminGroups from '../../../../contracts/creos/manifests/page-transverse-admin-groups.json';
import pageTransverseAdminHealth from '../../../../contracts/creos/manifests/page-transverse-admin-health.json';
import pageTransverseAdminCategories from '../../../../contracts/creos/manifests/page-transverse-admin-categories.json';
import pageTransverseAdminAuditLog from '../../../../contracts/creos/manifests/page-transverse-admin-audit-log.json';
import pageTransverseAdminCashRegisters from '../../../../contracts/creos/manifests/page-transverse-admin-cash-registers.json';
import pageTransverseAdminSites from '../../../../contracts/creos/manifests/page-transverse-admin-sites.json';
import pageTransverseAdminSitesAndRegisters from '../../../../contracts/creos/manifests/page-transverse-admin-sites-and-registers.json';
import pageTransverseAdminReceptionSessions from '../../../../contracts/creos/manifests/page-transverse-admin-reception-sessions.json';
import pageTransverseAdminReceptionStats from '../../../../contracts/creos/manifests/page-transverse-admin-reception-stats.json';
import pageTransverseAdminSessionManager from '../../../../contracts/creos/manifests/page-transverse-admin-session-manager.json';
import pageTransverseAdminSettings from '../../../../contracts/creos/manifests/page-transverse-admin-settings.json';
import pageTransverseConsultationArticle from '../../../../contracts/creos/manifests/page-transverse-consultation-article.json';
import pageTransverseConsultationDon from '../../../../contracts/creos/manifests/page-transverse-consultation-don.json';
import pageTransverseDashboard from '../../../../contracts/creos/manifests/page-transverse-dashboard.json';
import pageTransverseDashboardBenevole from '../../../../contracts/creos/manifests/page-transverse-dashboard-benevole.json';
import pageTransverseListingArticles from '../../../../contracts/creos/manifests/page-transverse-listing-articles.json';
import pageTransverseListingDons from '../../../../contracts/creos/manifests/page-transverse-listing-dons.json';
import pageCashflowNominal from '../../../../contracts/creos/manifests/page-cashflow-nominal.json';
import pageCashflowRefund from '../../../../contracts/creos/manifests/page-cashflow-refund.json';
import pageAdminCashSessionDetail from '../../../../contracts/creos/manifests/page-admin-cash-session-detail.json';
import pageAdminReceptionTicketDetail from '../../../../contracts/creos/manifests/page-admin-reception-ticket-detail.json';
import pageCashflowClose from '../../../../contracts/creos/manifests/page-cashflow-close.json';
import pageReceptionNominal from '../../../../contracts/creos/manifests/page-reception-nominal.json';
import pageLoginPublic from '../../../../contracts/creos/manifests/page-login-public.json';
import widgetsCatalogBandeauLive from '../../../../contracts/creos/manifests/widgets-catalog-bandeau-live.json';
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

/**
 * Bundle chargé par `RuntimeDemoApp` en application servie : contrats CREOS reviewables (story 5.1).
 */
export const runtimeServedManifestLoadResult: LoadManifestBundleResult = loadManifestBundle({
  navigationJson: JSON.stringify(navigationTransverseServed),
  pageManifestsJson: [
    JSON.stringify(pageDemoHome),
    JSON.stringify(pageDemoUnknownWidget),
    JSON.stringify(pageDemoGuardedPage),
    JSON.stringify(pageBandeauLiveSandboxWithLiveSource()),
    JSON.stringify(pageTransverseDashboard),
    JSON.stringify(pageTransverseDashboardBenevole),
    JSON.stringify(pageTransverseAdminPlaceholder),
    JSON.stringify(pageTransverseAdminAccessOverview),
    JSON.stringify(pageTransverseAdminSiteOverview),
    JSON.stringify(pageTransverseAdminUsers),
    JSON.stringify(pageTransverseAdminGroups),
    JSON.stringify(pageTransverseAdminCategories),
    JSON.stringify(pageTransverseAdminAuditLog),
    JSON.stringify(pageTransverseAdminCashRegisters),
    JSON.stringify(pageTransverseAdminSites),
    JSON.stringify(pageTransverseAdminSitesAndRegisters),
    JSON.stringify(pageTransverseAdminSessionManager),
    JSON.stringify(pageTransverseAdminSettings),
    JSON.stringify(pageTransverseAdminHealth),
    JSON.stringify(pageTransverseAdminReceptionStats),
    JSON.stringify(pageTransverseAdminReceptionSessions),
    JSON.stringify(pageTransverseAdminReportsHub),
    JSON.stringify(pageTransverseListingArticles),
    JSON.stringify(pageTransverseListingDons),
    JSON.stringify(pageTransverseConsultationArticle),
    JSON.stringify(pageTransverseConsultationDon),
    JSON.stringify(pageCashflowNominal),
    JSON.stringify(pageCashflowRefund),
    JSON.stringify(pageCashflowClose),
    JSON.stringify(pageAdminCashSessionDetail),
    JSON.stringify(pageAdminReceptionTicketDetail),
    JSON.stringify(pageReceptionNominal),
    JSON.stringify(pageLoginPublic),
  ],
  allowedWidgetTypes: demoAllowedWidgetTypes(),
  sourceLabels: {
    navigation: 'contracts/creos/manifests/navigation-transverse-served.json',
    page: (i) =>
      (
        [
          'contracts/creos/manifests/page-demo-home.json',
          'contracts/creos/manifests/page-demo-unknown-widget.json',
          'contracts/creos/manifests/page-demo-guarded-page.json',
          'contracts/creos/manifests/page-bandeau-live-sandbox.json (use_live_source)',
          'contracts/creos/manifests/page-transverse-dashboard.json',
          'contracts/creos/manifests/page-transverse-dashboard-benevole.json',
          'contracts/creos/manifests/page-transverse-admin-placeholder.json',
          'contracts/creos/manifests/page-transverse-admin-access-overview.json',
          'contracts/creos/manifests/page-transverse-admin-site-overview.json',
          'contracts/creos/manifests/page-transverse-admin-users.json',
          'contracts/creos/manifests/page-transverse-admin-groups.json',
          'contracts/creos/manifests/page-transverse-admin-categories.json',
          'contracts/creos/manifests/page-transverse-admin-audit-log.json',
          'contracts/creos/manifests/page-transverse-admin-cash-registers.json',
          'contracts/creos/manifests/page-transverse-admin-sites.json',
          'contracts/creos/manifests/page-transverse-admin-sites-and-registers.json',
          'contracts/creos/manifests/page-transverse-admin-session-manager.json',
          'contracts/creos/manifests/page-transverse-admin-settings.json',
          'contracts/creos/manifests/page-transverse-admin-health.json',
          'contracts/creos/manifests/page-transverse-admin-reception-stats.json',
          'contracts/creos/manifests/page-transverse-admin-reception-sessions.json',
          'contracts/creos/manifests/page-transverse-admin-reports-hub.json',
          'contracts/creos/manifests/page-transverse-listing-articles.json',
          'contracts/creos/manifests/page-transverse-listing-dons.json',
          'contracts/creos/manifests/page-transverse-consultation-article.json',
          'contracts/creos/manifests/page-transverse-consultation-don.json',
          'contracts/creos/manifests/page-cashflow-nominal.json',
          'contracts/creos/manifests/page-cashflow-refund.json',
          'contracts/creos/manifests/page-cashflow-close.json',
          'contracts/creos/manifests/page-admin-cash-session-detail.json',
          'contracts/creos/manifests/page-admin-reception-ticket-detail.json',
          'contracts/creos/manifests/page-reception-nominal.json',
          'contracts/creos/manifests/page-login-public.json',
        ] as const
      )[i] ?? `page[${i}]`,
  },
});
