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
 * Un seul enfant (ex. hub `/admin` manifesté en un slot) : tout le contenu va dans la grille corps pleine
 * largeur — en-tête réservé pour les data-testid / cohérence gabarit sans doubler un titre déjà dans le widget.
 */
export function TransverseHubLayout({ family, children, pageState }: TransverseHubLayoutProps) {
  const items = Children.toArray(children);

  const shellClass =
    family === 'admin' ? `${classes.shell} ${classes.shellAdmin}` : classes.shell;

  if (items.length === 1) {
    return (
      <section
        className={shellClass}
        data-testid="transverse-page-shell"
        data-transverse-layout="hub"
        data-transverse-family={family}
        aria-label="Contenu principal"
      >
        <TransversePageStateSlot pageState={pageState} />
        <header className={classes.pageHeader} data-testid="transverse-page-header" hidden aria-hidden="true" />
        <div
          className={`${classes.bodyGrid} ${classes.bodyGridTrailFull}`}
          data-testid="transverse-body-grid"
        >
          {items[0]}
        </div>
      </section>
    );
  }

  const [head, ...rest] = items;
  const trailFullWidth = rest.length > 0 && rest.length % 2 === 1;

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
