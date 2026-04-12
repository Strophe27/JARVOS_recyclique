import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, List, Text, Title } from '@mantine/core';
import type { NavigationEntry } from '../../types/navigation-manifest';
import type { PageManifest } from '../../types/page-manifest';
import { filterNavigation } from '../../runtime/filter-navigation-for-context';
import { pruneNavigationEntriesForLiveToolbar } from '../../runtime/prune-navigation-for-live-toolbar';
import { toolbarSelectedEntryIdFromResolved } from '../../runtime/toolbar-selection-for-live-path';
import { resolvePageAccess } from '../../runtime/resolve-page-access';
import { useAuthSession, useContextEnvelope } from '../auth/AuthRuntimeProvider';
import { useLiveAuthActions } from '../auth/LiveAuthActionsContext';
import { FilteredNavEntries } from '../FilteredNavEntries';
import { ManifestErrorBanner } from '../ManifestErrorBanner';
import { buildPageManifestRegions } from '../PageRenderer';
import { resolveTransverseMainLayoutMode, TransverseMainLayout } from '../templates/transverse';
import { PageAccessBlocked } from '../PageAccessBlocked';
import { RootShell } from '../layouts/RootShell';
import { useUserRuntimePrefs } from '../providers/UserRuntimePrefsProvider';
import mainClasses from '../App.module.css';
import { flattenNavigationEntries } from './flatten-navigation-entries';
import { runtimeServedManifestLoadResult } from './runtime-demo-manifest';
import { transversePageStateFromSearch } from './runtime-demo-transverse-state';
import classes from './RuntimeDemoApp.module.css';
import { LiveShellBrand } from '../shell/LiveShellBrand';
import { LiveShellUserMenu } from '../shell/LiveShellUserMenu';

/** Affiche `restriction_message` quand l’enveloppe le fournit — ne remplace pas `resolvePageAccess`. */
function ContextRestrictionBanner({ message }: { readonly message: string | null | undefined }) {
  const trimmed = message?.trim();
  if (!trimmed) return null;
  return (
    <div
      role="status"
      data-testid="context-envelope-restriction-banner"
      className={classes.contextRestrictionBanner}
    >
      {trimmed}
    </div>
  );
}

function RuntimePrefsToolbar() {
  const { prefs, updatePrefs } = useUserRuntimePrefs();
  return (
    <div className={mainClasses.prefsToolbar} data-testid="runtime-prefs-toolbar">
      <Button
        type="button"
        size="xs"
        variant="light"
        data-testid="prefs-ui-density-toggle"
        onClick={() =>
          updatePrefs({ uiDensity: prefs.uiDensity === 'comfortable' ? 'compact' : 'comfortable' })
        }
      >
        Densité : {prefs.uiDensity}
      </Button>
    </div>
  );
}

/**
 * Parcours démo : même pipeline que le socle (`loadManifestBundle`, filtre nav, garde page, `buildPageManifestRegions`).
 */
const ADMIN_CASH_SESSION_PATH = /^\/admin\/cash-sessions\/[^/]+\/?$/;

/**
 * Story 6.5 : anciennes routes « mini-pages » → workspace nominal `/caisse` (CREOS sans entrées nav dédiées).
 * Story 6.6 : `/caisse/don` (page isolée retirée) → même workspace brownfield que le nominal.
 */
const LEGACY_SPECIAL_CASHFLOW_PATHS = new Set([
  '/caisse/don-sans-article',
  '/caisse/adhesion-cotisation',
  '/caisse/don',
]);

/**
 * Story 11.3 — route legacy observée sur le brownfield ; alias runtime vers `page_key` `cashflow-nominal` (`/caisse` en CREOS),
 * sans entrée `NavigationManifest` dédiée (décision documentée : `peintre-nano/docs/03-contrats-creos-et-donnees.md`).
 */
const CASH_REGISTER_SALE_PATH = '/cash-register/sale';

/** Story 13.2 — mêmes composants legacy (`App.jsx` kioskModeRoutes) ; alias runtime → `cashflow-nominal` (kiosque). */
const CASH_REGISTER_VIRTUAL_SALE_PATH = '/cash-register/virtual/sale';
const CASH_REGISTER_DEFERRED_SALE_PATH = '/cash-register/deferred/sale';

/**
 * Story 13.1 — écran adjacent pré-kiosque : ouverture de session (`OpenCashSession` legacy sur `/cash-register/session/open`).
 * Alias runtime vers le même `page_key` **`cashflow-nominal`** que le hub `/caisse` ; **pas** de mode kiosque (nav visible).
 */
const CASH_REGISTER_SESSION_OPEN_PATH = '/cash-register/session/open';

/** Story 13.2 — ouverture session branches (`OpenCashSession.tsx` legacy `basePath`). */
const CASH_REGISTER_VIRTUAL_SESSION_OPEN_PATH = '/cash-register/virtual/session/open';
const CASH_REGISTER_DEFERRED_SESSION_OPEN_PATH = '/cash-register/deferred/session/open';

/** Story 13.3 — clôture / fin de session (`CloseSession.tsx` legacy sur `…/session/close`). */
const CASH_REGISTER_SESSION_CLOSE_PATH = '/cash-register/session/close';
const CASH_REGISTER_VIRTUAL_SESSION_CLOSE_PATH = '/cash-register/virtual/session/close';
const CASH_REGISTER_DEFERRED_SESSION_CLOSE_PATH = '/cash-register/deferred/session/close';

/** Hub virtuel legacy (`CashRegisterDashboard` en `isVirtualMode`) — même `page_key` CREOS que `/caisse`, écart surface documenté matrice. */
const CASH_REGISTER_VIRTUAL_ROOT_PATH = '/cash-register/virtual';

/** Racine différée legacy : redirection immédiate vers `.../session/open` (`CashRegisterDashboard.tsx`). */
const CASH_REGISTER_DEFERRED_ROOT_PATH = '/cash-register/deferred';

function pathnameNoTrailingSlashExceptRoot(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function isCashRegisterSaleKioskPath(path: string): boolean {
  const p = pathnameNoTrailingSlashExceptRoot(path);
  return (
    p === CASH_REGISTER_SALE_PATH ||
    p === CASH_REGISTER_VIRTUAL_SALE_PATH ||
    p === CASH_REGISTER_DEFERRED_SALE_PATH
  );
}

function isCashRegisterSessionOpenPath(path: string): boolean {
  const p = pathnameNoTrailingSlashExceptRoot(path);
  return (
    p === CASH_REGISTER_SESSION_OPEN_PATH ||
    p === CASH_REGISTER_VIRTUAL_SESSION_OPEN_PATH ||
    p === CASH_REGISTER_DEFERRED_SESSION_OPEN_PATH
  );
}

function isCashRegisterSessionClosePath(path: string): boolean {
  const p = pathnameNoTrailingSlashExceptRoot(path);
  return (
    p === CASH_REGISTER_SESSION_CLOSE_PATH ||
    p === CASH_REGISTER_VIRTUAL_SESSION_CLOSE_PATH ||
    p === CASH_REGISTER_DEFERRED_SESSION_CLOSE_PATH
  );
}

function sessionCloseSaleLegacyPath(pathRoute: string): string {
  const p = pathnameNoTrailingSlashExceptRoot(pathRoute);
  if (p.startsWith('/cash-register/deferred')) return '/cash-register/deferred/sale';
  if (p.startsWith('/cash-register/virtual')) return '/cash-register/virtual/sale';
  return '/cash-register/sale';
}

function isCashRegisterVirtualHubPath(path: string): boolean {
  return pathnameNoTrailingSlashExceptRoot(path) === CASH_REGISTER_VIRTUAL_ROOT_PATH;
}

/**
 * Story 13.1 — alias documenté `/cash-register/session/open` : même `page_key` CREOS, surcouche
 * `widget_props` présentationnelle (pas second manifeste ; aligné `03-contrats-creos-et-donnees.md` § 13.1).
 */
function withCashflowNominalSessionOpenPresentation(page: PageManifest, pathRoute: string): PageManifest {
  if (page.pageKey !== 'cashflow-nominal' || !isCashRegisterSessionOpenPath(pathRoute)) return page;
  const p = pathnameNoTrailingSlashExceptRoot(pathRoute);
  const isDeferredBranch = p === CASH_REGISTER_DEFERRED_SESSION_OPEN_PATH;
  return {
    ...page,
    slots: page.slots.map((slot) => {
      if (slot.widgetType !== 'caisse-brownfield-dashboard') return slot;
      const base = slot.widgetProps ?? {};
      return {
        ...slot,
        widgetProps: {
          ...base,
          presentation_surface: 'session_open',
          workspace_heading: 'Ouverture de Session de Caisse',
          workspace_intro: isDeferredBranch
            ? 'Renseignez la date réelle de vente (cahier), le fond de caisse initial, puis validez — ou annulez pour revenir au hub caisse.'
            : 'Indiquez le fond de caisse initial, puis validez pour ouvrir la session, ou annulez pour revenir à la sélection du poste.',
          fund_field_label: 'Fond de caisse initial',
          submit_session_label: 'Ouvrir la Session',
          show_cancel_to_caisse_hub: true,
          hide_register_selection_row: true,
          hide_variant_entrypoint_cards: true,
        },
      };
    }),
  };
}

/**
 * Story 13.1 — hub `/caisse` seul : composition « legacy » (poste + variantes), sans formulaire d’ouverture détaillé.
 * Les autres routes `cashflow-nominal` (ex. `/cash-register/sale`) gardent `presentation_surface` du manifest (`hub` = plein).
 */
/**
 * Story 13.3 — alias `…/session/close` : même `page_key` **`cashflow-nominal`**, surcouche `widget_props`
 * (`presentation_surface: session_close`, chemin retour vente legacy).
 */
function withCashflowNominalSessionClosePresentation(page: PageManifest, pathRoute: string): PageManifest {
  if (page.pageKey !== 'cashflow-nominal' || !isCashRegisterSessionClosePath(pathRoute)) return page;
  return {
    ...page,
    slots: page.slots.map((slot) => {
      if (slot.widgetType !== 'caisse-brownfield-dashboard') return slot;
      const base = slot.widgetProps ?? {};
      return {
        ...slot,
        widgetProps: {
          ...base,
          presentation_surface: 'session_close',
          session_close_sale_path: sessionCloseSaleLegacyPath(pathRoute),
        },
      };
    }),
  };
}

function withCashflowNominalCaisseHubPresentation(page: PageManifest, pathRoute: string): PageManifest {
  const p = pathnameNoTrailingSlashExceptRoot(pathRoute);
  if (page.pageKey !== 'cashflow-nominal' || (p !== '/caisse' && !isCashRegisterVirtualHubPath(pathRoute))) {
    return page;
  }
  /** Alignement legacy `CashRegisterDashboard` : `basePath` = `/cash-register` ou `/cash-register/virtual` pour postes réels. */
  const cashRegisterHubBasePath = isCashRegisterVirtualHubPath(pathRoute)
    ? CASH_REGISTER_VIRTUAL_ROOT_PATH
    : '/cash-register';
  return {
    ...page,
    slots: page.slots.map((slot) => {
      if (slot.widgetType !== 'caisse-brownfield-dashboard') return slot;
      const base = slot.widgetProps ?? {};
      return {
        ...slot,
        widgetProps: {
          ...base,
          presentation_surface: 'caisse_hub',
          cash_register_hub_base_path: cashRegisterHubBasePath,
        },
      };
    }),
  };
}

function liveAuthPresentationMode(): boolean {
  const v = import.meta.env.VITE_LIVE_AUTH as string | undefined;
  return v === 'true' || v === '1';
}

export function RuntimeDemoApp() {
  const envelope = useContextEnvelope();
  const authSession = useAuthSession();
  const liveAuthActions = useLiveAuthActions();
  const hideSandboxBanner = liveAuthPresentationMode();
  const { prefs } = useUserRuntimePrefs();
  const [selectedEntryId, setSelectedEntryId] = useState('root-home');
  const [pathRoute, setPathRoute] = useState(
    () => (typeof window !== 'undefined' ? window.location.pathname : '/'),
  );
  const [searchSnapshot, setSearchSnapshot] = useState(() =>
    typeof window !== 'undefined' ? window.location.search : '',
  );

  const shellPresentation = {
    uiDensity: prefs.uiDensity,
    sidebarPanelOpen: prefs.sidebarPanelOpen,
  };

  const manifestLoadResult = runtimeServedManifestLoadResult;

  const bundle = manifestLoadResult.ok ? manifestLoadResult.bundle : null;

  const filteredNavigation = useMemo(
    () => (bundle ? filterNavigation(bundle.navigation, envelope) : null),
    [bundle, envelope],
  );

  const flatFiltered = useMemo(
    () => (filteredNavigation ? flattenNavigationEntries(filteredNavigation.entries) : []),
    [filteredNavigation],
  );

  const syncSelectionFromPath = useCallback(() => {
    let path = window.location.pathname;
    if (LEGACY_SPECIAL_CASHFLOW_PATHS.has(path)) {
      window.history.replaceState({}, '', '/caisse');
      path = '/caisse';
    }
    const normalized = pathnameNoTrailingSlashExceptRoot(path);
    if (normalized === CASH_REGISTER_DEFERRED_ROOT_PATH) {
      const qs = window.location.search;
      window.history.replaceState({}, '', `${CASH_REGISTER_DEFERRED_SESSION_OPEN_PATH}${qs}`);
      path = window.location.pathname;
    }
    setPathRoute(path);
    const pathForMatch = pathnameNoTrailingSlashExceptRoot(path);
    if (ADMIN_CASH_SESSION_PATH.test(path)) {
      setSelectedEntryId('transverse-admin');
      setSearchSnapshot(window.location.search);
      return;
    }
    if (isCashRegisterSessionOpenPath(path)) {
      setSelectedEntryId('cashflow-nominal');
      setSearchSnapshot(window.location.search);
      return;
    }
    if (isCashRegisterSessionClosePath(path)) {
      setSelectedEntryId('cashflow-nominal');
      setSearchSnapshot(window.location.search);
      return;
    }
    if (isCashRegisterSaleKioskPath(path)) {
      setSelectedEntryId('cashflow-nominal');
      setSearchSnapshot(window.location.search);
      return;
    }
    if (pathForMatch === CASH_REGISTER_VIRTUAL_ROOT_PATH) {
      setSelectedEntryId('cashflow-nominal');
      setSearchSnapshot(window.location.search);
      return;
    }
    const match = flatFiltered.find((e) => e.path === path);
    if (match) setSelectedEntryId(match.id);
    setSearchSnapshot(window.location.search);
  }, [flatFiltered]);

  useLayoutEffect(() => {
    syncSelectionFromPath();
  }, [syncSelectionFromPath]);

  useLayoutEffect(() => {
    const onPop = () => syncSelectionFromPath();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [syncSelectionFromPath]);

  const onSelectNavEntry = useCallback(
    (entry: NavigationEntry) => {
      setSelectedEntryId(entry.id);
      if (entry.path) {
        window.history.pushState({}, '', entry.path);
        setSearchSnapshot(window.location.search);
        syncSelectionFromPath();
      }
    },
    [syncSelectionFromPath],
  );

  const goPersonalDashboardFromMenu = useCallback(() => {
    window.history.pushState({}, '', '/dashboard/benevole');
    syncSelectionFromPath();
  }, [syncSelectionFromPath]);

  const resolvedEntryId = useMemo(() => {
    if (flatFiltered.some((e) => e.id === selectedEntryId)) return selectedEntryId;
    return flatFiltered[0]?.id ?? selectedEntryId;
  }, [flatFiltered, selectedEntryId]);

  const navEntriesForDisplay = useMemo(
    () =>
      hideSandboxBanner && filteredNavigation
        ? pruneNavigationEntriesForLiveToolbar(filteredNavigation.entries)
        : filteredNavigation?.entries ?? [],
    [hideSandboxBanner, filteredNavigation],
  );

  const toolbarSelectedEntryId = useMemo(
    () => toolbarSelectedEntryIdFromResolved(resolvedEntryId, hideSandboxBanner),
    [resolvedEntryId, hideSandboxBanner],
  );

  const selectedEntry = flatFiltered.find((e) => e.id === resolvedEntryId);

  const resolvedPageKey = useMemo(() => {
    if (ADMIN_CASH_SESSION_PATH.test(pathRoute)) {
      return 'admin-cash-session-detail';
    }
    if (
      isCashRegisterSessionOpenPath(pathRoute) ||
      isCashRegisterSessionClosePath(pathRoute) ||
      isCashRegisterSaleKioskPath(pathRoute)
    ) {
      return 'cashflow-nominal';
    }
    return selectedEntry?.pageKey ?? 'demo-home';
  }, [pathRoute, selectedEntry?.pageKey]);

  const kioskSaleObservable = isCashRegisterSaleKioskPath(pathRoute);
  const showSandboxBanner = !hideSandboxBanner && !kioskSaleObservable;

  const pageForAccess = useMemo(() => {
    if (!bundle) return undefined;
    const key = resolvedPageKey;
    return bundle.pages.find((p) => p.pageKey === key) ?? bundle.pages.find((p) => p.pageKey === 'demo-home');
  }, [bundle, resolvedPageKey]);

  /**
   * Story 13.1 — parité observable legacy : le hub `/caisse` et l’alias `/cash-register/session/open`
   * n’affichent pas le workspace vente (wizard + ticket latéral) sous la même page que la sélection / l’ouverture.
   * La vente plein écran reste sur l’alias `/cash-register/sale` (Story 11.3).
   */
  const suppressCashflowNominalWorkspaceSaleAndAside = useMemo(() => {
    if (pageForAccess?.pageKey !== 'cashflow-nominal') return false;
    const p = pathnameNoTrailingSlashExceptRoot(pathRoute);
    return p === '/caisse' || isCashRegisterSessionOpenPath(pathRoute) || isCashRegisterSessionClosePath(pathRoute);
  }, [pageForAccess?.pageKey, pathRoute]);

  const pageManifestForRegions = useMemo(() => {
    if (!pageForAccess) return undefined;
    let p = withCashflowNominalSessionOpenPresentation(pageForAccess, pathRoute);
    p = withCashflowNominalSessionClosePresentation(p, pathRoute);
    p = withCashflowNominalCaisseHubPresentation(p, pathRoute);
    /** Hub `/caisse` et ouverture session : le wizard + ticket latéral sont retirés ; le dashboard reste en slot `main` (pas le faux header shell). */
    if (suppressCashflowNominalWorkspaceSaleAndAside) {
      p = {
        ...p,
        slots: p.slots.filter((s) => s.widgetType !== 'cashflow-nominal-wizard'),
      };
    }
    return p;
  }, [pageForAccess, pathRoute, suppressCashflowNominalWorkspaceSaleAndAside]);

  const pageRegions = useMemo(() => {
    if (!pageManifestForRegions) return undefined;
    const mode = resolveTransverseMainLayoutMode(pageManifestForRegions.pageKey);
    const transversePageState = mode !== null ? transversePageStateFromSearch(searchSnapshot) : undefined;
    const wrapUnmappedSlotContent: ((c: ReactNode) => ReactNode) | undefined =
      mode !== null
        ? (children) => (
            <TransverseMainLayout
              mode={mode}
              pageKey={pageManifestForRegions.pageKey}
              pageState={transversePageState}
            >
              {children}
            </TransverseMainLayout>
          )
        : undefined;
    return buildPageManifestRegions(pageManifestForRegions, { wrapUnmappedSlotContent });
  }, [pageManifestForRegions, searchSnapshot]);
  const pageAccess = pageForAccess ? resolvePageAccess(pageForAccess, envelope) : { allowed: false as const, code: 'MISSING_PERMISSIONS' as const, message: 'Page introuvable.' };

  if (!manifestLoadResult.ok) {
    return (
      <>
        <ContextRestrictionBanner message={envelope.restrictionMessage} />
        <RootShell
          shellPresentation={shellPresentation}
          hideNav={kioskSaleObservable}
          minimalChrome={hideSandboxBanner}
          navPresentation={hideSandboxBanner ? 'legacyToolbar' : 'default'}
        >
          <ManifestErrorBanner issues={manifestLoadResult.issues} />
        </RootShell>
      </>
    );
  }

  const b = bundle!;

  const navRegion = (
    <>
      {!hideSandboxBanner ? <RuntimePrefsToolbar /> : null}
      <FilteredNavEntries
        entries={navEntriesForDisplay}
        envelope={envelope}
        selectedEntryId={hideSandboxBanner ? toolbarSelectedEntryId : resolvedEntryId}
        onSelectEntry={onSelectNavEntry}
        layout={hideSandboxBanner ? 'toolbar' : 'list'}
        navChrome={hideSandboxBanner ? 'legacyToolbar' : 'default'}
        toolbarStart={hideSandboxBanner ? <LiveShellBrand /> : undefined}
        toolbarEnd={
          hideSandboxBanner && liveAuthActions ? (
            authSession.authenticated && authSession.userDisplayLabel ? (
              <LiveShellUserMenu
                displayLabel={authSession.userDisplayLabel}
                onLogout={liveAuthActions.requestLogout}
                onPersonalDashboard={
                  flatFiltered.some((e) => e.id === 'transverse-dashboard-benevole')
                    ? goPersonalDashboardFromMenu
                    : undefined
                }
              />
            ) : (
              <Button type="button" variant="light" size="xs" onClick={liveAuthActions.requestLogout}>
                Déconnexion
              </Button>
            )
          ) : undefined
        }
      />
    </>
  );

  if (!pageAccess.allowed) {
    return (
      <>
        <ContextRestrictionBanner message={envelope.restrictionMessage} />
        <RootShell
          shellPresentation={shellPresentation}
          hideNav={kioskSaleObservable}
          minimalChrome={hideSandboxBanner}
          navPresentation={hideSandboxBanner ? 'legacyToolbar' : 'default'}
          regions={{
            nav: navRegion,
            main: (
              <div className={mainClasses.mainInner} data-testid="runtime-demo-root">
                {showSandboxBanner ? (
                  <div className={classes.sandboxBanner}>
                    <p className={classes.sandboxTitle}>Démonstration runtime (bac à sable)</p>
                    <p className={classes.sandboxHint}>
                      Parcours contrôlé : navigation et pages issues du NavigationManifest chargé — pas un écran métier.
                    </p>
                  </div>
                ) : null}
                <PageAccessBlocked result={pageAccess} />
              </div>
            ),
          }}
        />
      </>
    );
  }

  const asideRegion =
    suppressCashflowNominalWorkspaceSaleAndAside && pageRegions?.aside
      ? null
      : pageRegions?.aside;

  return (
    <>
      <ContextRestrictionBanner message={envelope.restrictionMessage} />
      <RootShell
        shellPresentation={shellPresentation}
        hideNav={kioskSaleObservable}
        minimalChrome={hideSandboxBanner}
        navPresentation={hideSandboxBanner ? 'legacyToolbar' : 'default'}
        regions={{
          header: pageRegions?.header,
          nav: navRegion,
          aside: asideRegion === null ? <></> : asideRegion,
          footer: pageRegions?.footer,
          main: (
            <div className={mainClasses.mainInner} data-testid="runtime-demo-root">
              {showSandboxBanner ? (
                <div className={classes.sandboxBanner}>
                  <p className={classes.sandboxTitle}>Démonstration runtime (bac à sable)</p>
                  <p className={classes.sandboxHint}>
                    Même chaîne que le produit minimal : lot nav + pages chargé ici, nav filtrée par ContextEnvelope, slots via registre.
                    Essayez « nav.demoUnknownWidget » (widget non enregistré) ou « nav.demoGuardedPage » (permissions page).
                  </p>
                </div>
              ) : null}
              {!hideSandboxBanner ? (
                <Text size="sm" c="dimmed" mb="sm" data-testid="manifest-bundle-ok">
                  Manifests validés — navigation v{b.navigation.version} ; {b.pages.length} page(s) dans le lot.
                </Text>
              ) : null}
              {pageRegions?.mainWidgets}
              {pageForAccess?.pageKey === 'demo-home' ? (
                <>
                  <Title order={1}>Socle Peintre_nano</Title>
                  <Text c="dimmed">
                    Fondation React + TypeScript + Vite (story 3.0). La navigation, les pages et le contexte autoritatif
                    viendront des contrats commanditaires ; ce socle ne les substitue pas par des routes ou permissions métier
                    codées en dur.
                  </Text>
                  <div>
                    <Text fw={600} mb="xs">
                      Quatre artefacts minimaux (hiérarchie de vérité)
                    </Text>
                    <List className={mainClasses.list} spacing="xs" type="ordered" data-testid="four-artifacts-list">
                      <List.Item>
                        <strong>ContextEnvelope</strong> — OpenAPI / backend ; Piste A : mocks structurels jusqu'à Convergence 1.
                      </List.Item>
                      <List.Item>
                        <strong>NavigationManifest</strong> — contrats CREOS / commanditaire ; le runtime interprète.
                      </List.Item>
                      <List.Item>
                        <strong>PageManifest</strong> — composition déclarative (slots / widgets CREOS).
                      </List.Item>
                      <List.Item>
                        <strong>UserRuntimePrefs</strong> — préférences UI locales, jamais source de vérité métier.
                      </List.Item>
                    </List>
                  </div>
                </>
              ) : null}
            </div>
          ),
        }}
      />
    </>
  );
}
