import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { AdminListPageShell } from './AdminListPageShell';

/**
 * Story 17.2 — postes caisse (`/admin/cash-registers`) sans binding `data_contract` :
 * famille Registers **G-OA-02** absente du OpenAPI canon ; branchement live → Epic 16 (rail K).
 * Story 17.3 — `AdminListPageShell`.
 */
export function CashRegistersAdminDemoPlaceholder(_: RegisteredWidgetProps) {
  return (
    <AdminListPageShell
      widgetRootTestId="widget-admin-cash-registers-demo"
      listTitle="Postes de caisse (démonstration)"
      contractGapAlertTitle="Données non branchées — dette contractuelle"
      contractGapAlertBody={
        <>
          Aucun appel réseau : à ce stade, <code>contracts/openapi/recyclique-api.yaml</code> ne matérialise pas les
          opérations CRUD legacy sur les caisses enregistrées (recherche <code>cash-registers</code> vide au DS
          2026-04-12). Fermeture prévue côté <strong>Epic 16</strong> avant tout widget <code>data_contract</code>{' '}
          généré depuis le YAML.
        </>
      }
      listBullets={[
        'Chargement : non applicable (pas de fetch).',
        'Liste : vide — pas de données simulées comme si le contrat existait.',
        'Création / édition / suppression : hors scope rail U tant que les chemins OpenAPI ne sont pas publiés.',
      ]}
    />
  );
}
