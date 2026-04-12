import { Children, type ReactNode } from 'react';
import { TransversePageStateSlot, type TransversePageStateConfig } from '../../states/transverse';
import type { TransverseHubFamily } from './resolve-transverse-main-layout';
import classes from './TransverseHubLayout.module.css';

export type TransverseHubLayoutProps = {
  readonly family: TransverseHubFamily;
  readonly children: ReactNode;
  /** État de surface transverse (5.7) — nominal : slot réservé, non intrusif. */
  readonly pageState?: TransversePageStateConfig;
};

/**
 * Patron hub (dashboard, listings, admin) : premier enfant = zone d’en-tête,
 * suivants = grille 2 colonnes ; dernière carte seule sur une ligne impaire occupe toute la largeur.
 */
export function TransverseHubLayout({ family, children, pageState }: TransverseHubLayoutProps) {
  const items = Children.toArray(children);
  const [head, ...rest] = items;
  const trailFullWidth = rest.length > 0 && rest.length % 2 === 1;

  const shellClass =
    family === 'admin' ? `${classes.shell} ${classes.shellAdmin}` : classes.shell;

  return (
    <section
      className={shellClass}
      data-testid="transverse-page-shell"
      data-transverse-layout="hub"
      data-transverse-family={family}
      aria-label="Contenu principal"
    >
      <TransversePageStateSlot pageState={pageState} />
      {head ? (
        <header className={classes.pageHeader} data-testid="transverse-page-header">
          {head}
        </header>
      ) : null}
      {rest.length > 0 ? (
        <div
          className={
            trailFullWidth ? `${classes.bodyGrid} ${classes.bodyGridTrailFull}` : classes.bodyGrid
          }
          data-testid="transverse-body-grid"
        >
          {rest}
        </div>
      ) : null}
    </section>
  );
}
