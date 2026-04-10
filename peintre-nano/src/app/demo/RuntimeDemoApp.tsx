import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, List, Text, Title } from '@mantine/core';
import type { NavigationEntry } from '../../types/navigation-manifest';
import { filterNavigation } from '../../runtime/filter-navigation-for-context';
import { resolvePageAccess } from '../../runtime/resolve-page-access';
import { useContextEnvelope } from '../auth/AuthRuntimeProvider';
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

function pathnameNoTrailingSlashExceptRoot(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function isCashRegisterSaleKioskPath(path: string): boolean {
  return pathnameNoTrailingSlashExceptRoot(path) === CASH_REGISTER_SALE_PATH;
}

function liveAuthPresentationMode(): boolean {
  const v = import.meta.env.VITE_LIVE_AUTH as string | undefined;
  return v === 'true' || v === '1';
}

export function RuntimeDemoApp() {
  const envelope = useContextEnvelope();
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
    setPathRoute(path);
    if (ADMIN_CASH_SESSION_PATH.test(path)) {
      setSelectedEntryId('transverse-admin');
      setSearchSnapshot(window.location.search);
      return;
    }
    if (isCashRegisterSaleKioskPath(path)) {
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
      }
    },
    [],
  );

  const resolvedEntryId = useMemo(() => {
    if (flatFiltered.some((e) => e.id === selectedEntryId)) return selectedEntryId;
    return flatFiltered[0]?.id ?? selectedEntryId;
  }, [flatFiltered, selectedEntryId]);

  const selectedEntry = flatFiltered.find((e) => e.id === resolvedEntryId);

  const resolvedPageKey = useMemo(() => {
    if (ADMIN_CASH_SESSION_PATH.test(pathRoute)) {
      return 'admin-cash-session-detail';
    }
    if (isCashRegisterSaleKioskPath(pathRoute)) {
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

  const pageRegions = useMemo(() => {
    if (!pageForAccess) return undefined;
    const mode = resolveTransverseMainLayoutMode(pageForAccess.pageKey);
    const transversePageState = mode !== null ? transversePageStateFromSearch(searchSnapshot) : undefined;
    const wrapUnmappedSlotContent: ((c: ReactNode) => ReactNode) | undefined =
      mode !== null
        ? (children) => (
            <TransverseMainLayout
              mode={mode}
              pageKey={pageForAccess.pageKey}
              pageState={transversePageState}
            >
              {children}
            </TransverseMainLayout>
          )
        : undefined;
    return buildPageManifestRegions(pageForAccess, { wrapUnmappedSlotContent });
  }, [pageForAccess, searchSnapshot]);
  const pageAccess = pageForAccess ? resolvePageAccess(pageForAccess, envelope) : { allowed: false as const, code: 'MISSING_PERMISSIONS' as const, message: 'Page introuvable.' };

  if (!manifestLoadResult.ok) {
    return (
      <>
        <ContextRestrictionBanner message={envelope.restrictionMessage} />
        <RootShell
          shellPresentation={shellPresentation}
          hideNav={kioskSaleObservable}
          minimalChrome={hideSandboxBanner}
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
        entries={filteredNavigation!.entries}
        envelope={envelope}
        selectedEntryId={resolvedEntryId}
        onSelectEntry={onSelectNavEntry}
        layout={hideSandboxBanner ? 'toolbar' : 'list'}
        toolbarEnd={
          hideSandboxBanner && liveAuthActions ? (
            <Button type="button" variant="light" size="xs" onClick={liveAuthActions.requestLogout}>
              Déconnexion
            </Button>
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

  return (
    <>
      <ContextRestrictionBanner message={envelope.restrictionMessage} />
      <RootShell
        shellPresentation={shellPresentation}
        hideNav={kioskSaleObservable}
        minimalChrome={hideSandboxBanner}
        regions={{
          header: pageRegions?.header,
          nav: navRegion,
          aside: pageRegions?.aside,
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
