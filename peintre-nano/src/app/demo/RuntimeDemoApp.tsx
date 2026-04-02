import { useMemo, useState } from 'react';
import { Button, List, Text, Title } from '@mantine/core';
import type { NavigationEntry } from '../../types/navigation-manifest';
import { filterNavigation } from '../../runtime/filter-navigation-for-context';
import { resolvePageAccess } from '../../runtime/resolve-page-access';
import { useContextEnvelope } from '../auth/AuthRuntimeProvider';
import { FilteredNavEntries } from '../FilteredNavEntries';
import { ManifestErrorBanner } from '../ManifestErrorBanner';
import { buildPageManifestRegions } from '../PageRenderer';
import { PageAccessBlocked } from '../PageAccessBlocked';
import { RootShell } from '../layouts/RootShell';
import { useUserRuntimePrefs } from '../providers/UserRuntimePrefsProvider';
import mainClasses from '../App.module.css';
import { flattenNavigationEntries } from './flatten-navigation-entries';
import { runtimeDemoManifestLoadResult } from './runtime-demo-manifest';
import classes from './RuntimeDemoApp.module.css';

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
export function RuntimeDemoApp() {
  const envelope = useContextEnvelope();
  const { prefs } = useUserRuntimePrefs();
  const [selectedEntryId, setSelectedEntryId] = useState('root-home');

  const shellPresentation = {
    uiDensity: prefs.uiDensity,
    sidebarPanelOpen: prefs.sidebarPanelOpen,
  };

  const manifestLoadResult = runtimeDemoManifestLoadResult;

  const bundle = manifestLoadResult.ok ? manifestLoadResult.bundle : null;

  const filteredNavigation = useMemo(
    () => (bundle ? filterNavigation(bundle.navigation, envelope) : null),
    [bundle, envelope],
  );

  const flatFiltered = useMemo(
    () => (filteredNavigation ? flattenNavigationEntries(filteredNavigation.entries) : []),
    [filteredNavigation],
  );

  const resolvedEntryId = useMemo(() => {
    if (flatFiltered.some((e) => e.id === selectedEntryId)) return selectedEntryId;
    return flatFiltered[0]?.id ?? selectedEntryId;
  }, [flatFiltered, selectedEntryId]);

  const selectedEntry = flatFiltered.find((e) => e.id === resolvedEntryId);

  const pageForAccess = useMemo(() => {
    if (!bundle) return undefined;
    const key = selectedEntry?.pageKey ?? 'demo-home';
    return bundle.pages.find((p) => p.pageKey === key) ?? bundle.pages.find((p) => p.pageKey === 'demo-home');
  }, [bundle, selectedEntry?.pageKey]);

  const pageRegions = pageForAccess ? buildPageManifestRegions(pageForAccess) : undefined;
  const pageAccess = pageForAccess ? resolvePageAccess(pageForAccess, envelope) : { allowed: false as const, code: 'MISSING_PERMISSIONS' as const, message: 'Page introuvable.' };

  if (!manifestLoadResult.ok) {
    return (
      <RootShell shellPresentation={shellPresentation}>
        <ManifestErrorBanner issues={manifestLoadResult.issues} />
      </RootShell>
    );
  }

  const b = bundle!;

  const navRegion = (
    <>
      <RuntimePrefsToolbar />
      <FilteredNavEntries
        entries={filteredNavigation!.entries}
        selectedEntryId={resolvedEntryId}
        onSelectEntry={(e: NavigationEntry) => setSelectedEntryId(e.id)}
      />
    </>
  );

  if (!pageAccess.allowed) {
    return (
      <RootShell
        shellPresentation={shellPresentation}
        regions={{
          nav: navRegion,
          main: (
            <div className={mainClasses.mainInner} data-testid="runtime-demo-root">
              <div className={classes.sandboxBanner}>
                <p className={classes.sandboxTitle}>Démonstration runtime (bac à sable)</p>
                <p className={classes.sandboxHint}>
                  Parcours contrôlé : navigation et pages issues du NavigationManifest chargé — pas un écran métier.
                </p>
              </div>
              <PageAccessBlocked result={pageAccess} />
            </div>
          ),
        }}
      />
    );
  }

  return (
    <RootShell
      shellPresentation={shellPresentation}
      regions={{
        header: pageRegions?.header,
        nav: navRegion,
        aside: pageRegions?.aside,
        footer: pageRegions?.footer,
        main: (
          <div className={mainClasses.mainInner} data-testid="runtime-demo-root">
            <div className={classes.sandboxBanner}>
              <p className={classes.sandboxTitle}>Démonstration runtime (bac à sable)</p>
              <p className={classes.sandboxHint}>
                Même chaîne que le produit minimal : lot nav + pages chargé ici, nav filtrée par ContextEnvelope, slots via registre.
                Essayez « nav.demoUnknownWidget » (widget non enregistré) ou « nav.demoGuardedPage » (permissions page).
              </p>
            </div>
            <Text size="sm" c="dimmed" mb="sm" data-testid="manifest-bundle-ok">
              Manifests validés — navigation v{b.navigation.version} ; {b.pages.length} page(s) dans le lot.
            </Text>
            {pageRegions?.mainWidgets}
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
          </div>
        ),
      }}
    />
  );
}
