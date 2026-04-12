import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { AdminListPageShell } from './AdminListPageShell';

/**
 * Story 17.1 — liste « pending » observable legacy (`/admin/pending`) sans binding `data_contract` :
 * l'operation `GET /v1/admin/users/pending` est absente du OpenAPI canon monorepo ; branchement live → Epic 16 (rail K).
 * Story 17.3 — consommateur de `AdminListPageShell` (primitive liste admin mutualisee).
 */
export function PendingUsersDemoPlaceholder(_: RegisteredWidgetProps) {
  return (
    <AdminListPageShell
      widgetRootTestId="widget-admin-pending-users-demo"
      listTitle="Utilisateurs en attente (démonstration)"
      contractGapAlertTitle="Données non branchées — dette contractuelle"
      contractGapAlertBody={
        <>
          Aucun appel réseau : en l'état, <code>contracts/openapi/recyclique-api.yaml</code> ne matérialise pas{' '}
          <code>GET /v1/admin/users/pending</code> (ni liste utilisateurs admin). Fermeture prévue côté{' '}
          <strong>Epic 16</strong> avant tout widget <code>data_contract</code> généré depuis le YAML.
        </>
      }
      listBullets={[
        'Chargement : non applicable (pas de fetch).',
        'Liste : vide — données mockées volontairement absentes pour ne pas simuler un contrat inexistant.',
        'Actions approuver / rejeter : hors scope tant que les chemins OpenAPI ne sont pas publiés.',
      ]}
    />
  );
}
