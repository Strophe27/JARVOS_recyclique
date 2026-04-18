import { Children, type ReactNode } from 'react';
import type { TransversePageStateConfig } from '../../states/transverse';
import { TransversePageStateSlot } from '../../states/transverse';
import { TransverseHubLayout } from './TransverseHubLayout';
import classes from './TransverseConsultationLayout.module.css';

export type TransverseConsultationLayoutProps = {
  readonly children: ReactNode;
  readonly pageState?: TransversePageStateConfig;
};

/**
 * Patron consultation / fiche : en-tête, corps deux colonnes (slots 2–3), pied (slot 4).
 * Si le nombre de widgets diffère (évolution manifeste), repli sur le hub pour rester robuste.
 */
export function TransverseConsultationLayout({ children, pageState }: TransverseConsultationLayoutProps) {
  const items = Children.toArray(children);
  if (items.length !== 4) {
    return (
      <TransverseHubLayout family="consultation" pageState={pageState}>
        {children}
      </TransverseHubLayout>
    );
  }

  return (
    <section
      className={classes.shell}
      data-testid="transverse-page-shell"
      data-transverse-layout="consultation"
      data-transverse-family="consultation"
      aria-label="Mise en page transverse consultation"
    >
      <TransversePageStateSlot pageState={pageState} />
      <header className={classes.pageHeader} data-testid="transverse-page-header">
        {items[0]}
      </header>
      <div className={classes.twoColumnBody} data-testid="transverse-two-column-body">
        <div data-testid="transverse-consultation-col-primary">{items[1]}</div>
        <div data-testid="transverse-consultation-col-secondary">{items[2]}</div>
      </div>
      <footer className={classes.footerZone} data-testid="transverse-consultation-footer">
        {items[3]}
      </footer>
    </section>
  );
}
