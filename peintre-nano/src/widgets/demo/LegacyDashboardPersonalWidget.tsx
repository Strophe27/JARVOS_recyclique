import { ArrowLeft } from 'lucide-react';
import { useAuthSession } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import classes from './LegacyDashboardPersonalWidget.module.css';

function readString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/**
 * Parité minimale avec `BenevoleDashboard.jsx` (legacy) : accueil + texte d’orientation.
 * Contenu statique et chemins issus du PageManifest (`widget_props`) — pas d’agrégation métier.
 */
export function LegacyDashboardPersonalWidget({ widgetProps }: RegisteredWidgetProps) {
  const session = useAuthSession();
  const mainDashboardPath = readString(widgetProps?.mainDashboardPath) ?? '/dashboard';
  const backLabel = readString(widgetProps?.backToSiteDashboardLabel) ?? 'Retour au tableau de bord site';

  const displayName = session.userDisplayLabel?.trim() || 'vous';

  return (
    <div className={classes.page} data-testid="widget-legacy-dashboard-personal" aria-label="Tableau de bord personnel">
      <article className={classes.card}>
        <h1 className={classes.title}>Bienvenue, {displayName} !</h1>
        <p className={classes.body}>Ceci est votre tableau de bord personnel.</p>
        <p className={classes.body}>
          D&apos;ici, vous pourrez bientôt accéder aux communications internes, aux documents importants et à
          d&apos;autres outils utiles pour votre mission au sein de l&apos;association.
        </p>
        <a className={classes.backLink} href={mainDashboardPath} data-testid="legacy-dashboard-personal-back">
          <ArrowLeft size={18} aria-hidden />
          <span>{backLabel}</span>
        </a>
      </article>
    </div>
  );
}
