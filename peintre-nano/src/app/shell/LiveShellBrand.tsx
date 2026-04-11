import { Recycle } from 'lucide-react';
import classes from './LiveShellBrand.module.css';

export type LiveShellBrandProps = {
  readonly title?: string;
};

/** Bloc marque aligné sur la zone logo du `Header` legacy (présentation seule). */
export function LiveShellBrand({ title = 'RecyClique' }: LiveShellBrandProps) {
  return (
    <div className={classes.root} data-testid="live-shell-brand">
      <Recycle size={22} strokeWidth={2.25} aria-hidden className={classes.icon} />
      <span className={classes.title}>{title}</span>
    </div>
  );
}
