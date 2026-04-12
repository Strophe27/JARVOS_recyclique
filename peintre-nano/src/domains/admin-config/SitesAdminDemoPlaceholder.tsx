import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { AdminListPageShell } from './AdminListPageShell';

/**
 * Story 17.2 — sites (`/admin/sites`) sans binding `data_contract` :
 * gap Sites **G-OA-02** ; coexistence documentée avec le hub `/admin/site` (CREOS) — Epic 16 pour contrat live.
 * Story 17.3 — `AdminListPageShell`.
 */
export function SitesAdminDemoPlaceholder(_: RegisteredWidgetProps) {
  return (
    <AdminListPageShell
      widgetRootTestId="widget-admin-sites-demo"
      listTitle="Sites et emplacements (démonstration)"
      contractGapAlertTitle="Données non branchées — dette contractuelle"
      contractGapAlertBody={
        <>
          Aucun appel réseau : les opérations legacy sur <code>/v1/sites/</code> et dépendances ne sont pas alignées
          dans <code>contracts/openapi/recyclique-api.yaml</code> au DS 2026-04-12. Le hub léger{' '}
          <strong>/admin/site</strong> (singulier) reste la surface CREOS distincte de cette route **plurielle** legacy.{' '}
          Fermeture <strong>Epic 16</strong> avant tout <code>data_contract</code> généré.
        </>
      }
      listBullets={[
        'Chargement : non applicable (pas de fetch).',
        'Liste : vide — pas de jeu de données inventé.',
        'Actions CRUD : hors scope tant que le YAML canon ne porte pas les opérations.',
      ]}
    />
  );
}
