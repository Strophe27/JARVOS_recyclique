import type { ReactNode } from 'react';
import type { UserRuntimePrefs } from '../../types/user-runtime-prefs';
import classes from './RootShell.module.css';

export type ShellRegionId = 'header' | 'nav' | 'main' | 'aside' | 'footer';

/** Sous-ensemble des prefs appliqué au nœud racine du shell (présentation uniquement). */
export type ShellPresentationPrefs = Pick<UserRuntimePrefs, 'uiDensity' | 'sidebarPanelOpen'>;

export type RootShellProps = {
  children?: ReactNode;
  /** Remplace le contenu par défaut des zones nommées ; `main` prime sur `children` si défini. */
  regions?: Partial<Record<ShellRegionId, ReactNode>>;
  /**
   * Présentation locale (`UserRuntimePrefs`) : `data-*` + classes — ne participe pas au filtrage nav / garde page.
   * Si absent : densité comfortable, panneau latéral ouvert.
   */
  shellPresentation?: ShellPresentationPrefs;
  /**
   * Story 11.3 — alias runtime `/cash-register/sale` : masque la zone nav (pas d’entrée `NavigationManifest` dédiée).
   */
  hideNav?: boolean;
  /**
   * Présentation « app » : masque aside / footer décoratifs (auth live / tableau de bord observable).
   */
  minimalChrome?: boolean;
};

/**
 * Enveloppe racine : grille CSS et régions nommées. Le contenu applicatif par défaut se place dans `main` via `children`.
 */
export function RootShell({
  children,
  regions,
  shellPresentation,
  hideNav = false,
  minimalChrome = false,
}: RootShellProps) {
  const mainContent = regions?.main !== undefined ? regions.main : children;
  const uiDensity = shellPresentation?.uiDensity ?? 'comfortable';
  const sidebarPanelOpen = shellPresentation?.sidebarPanelOpen ?? true;

  return (
    <div
      className={`${classes.root}${hideNav ? ` ${classes.rootKioskNavHidden}` : ''}${minimalChrome ? ` ${classes.rootMinimalChrome}` : ''}`}
      data-testid="peintre-nano-shell"
      data-pn-ui-density={uiDensity}
      data-pn-sidebar-panel={sidebarPanelOpen ? 'open' : 'closed'}
      data-pn-kiosk-nav-hidden={hideNav ? 'true' : undefined}
    >
      {hideNav ? (
        <span data-testid="cash-register-sale-kiosk" style={{ display: 'none' }} aria-hidden="true" />
      ) : null}
      <header
        className={`${classes.header} ${minimalChrome && regions?.header ? classes.headerApp : classes.zone}`}
        data-testid="shell-zone-header"
      >
        {regions?.header ?? (
          <>
            <span className={classes.zoneLabel}>Zone header</span>
            {' — placeholder shell (pas de routes métier)'}
          </>
        )}
      </header>
      {!hideNav ? (
        <nav
          className={`${classes.nav} ${minimalChrome ? classes.navApp : classes.zone}`}
          data-testid="shell-zone-nav"
          aria-label="Zone navigation"
        >
          {regions?.nav ?? (
            <>
              <span className={classes.zoneLabel}>Zone nav</span>
              {' — futur NavigationManifest'}
            </>
          )}
        </nav>
      ) : null}
      <main className={classes.main} data-testid="shell-zone-main">
        {mainContent}
      </main>
      <aside className={`${classes.aside} ${classes.zone}`} data-testid="shell-zone-aside">
        {regions?.aside ?? (
          <>
            <span className={classes.zoneLabel}>Zone aside</span>
            {' — slot latéral'}
          </>
        )}
      </aside>
      <footer className={`${classes.footer} ${classes.zone}`} data-testid="shell-zone-footer">
        {regions?.footer ?? (
          <>
            <span className={classes.zoneLabel}>Zone footer</span>
            {' — shell'}
          </>
        )}
      </footer>
    </div>
  );
}
