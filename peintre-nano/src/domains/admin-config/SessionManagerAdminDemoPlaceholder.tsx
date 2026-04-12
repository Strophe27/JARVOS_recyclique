import { Alert, Text } from '@mantine/core';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { AdminListPageShell } from './AdminListPageShell';

/**
 * Story 18.2 — surface liste legacy `/admin/session-manager` sans données factices :
 * gaps **K** nommés ; exports par session / bulk classe **B** exclus visuellement (Epic 16).
 */
export function SessionManagerAdminDemoPlaceholder(_: RegisteredWidgetProps) {
  return (
    <AdminListPageShell
      widgetRootTestId="widget-admin-session-manager-demo"
      listTitle="Sessions de caisse (liste — démonstration)"
      contractGapAlertTitle="Données liste et KPIs non branchées — dette contractuelle"
      contractGapAlertBody={
        <>
          Aucun appel réseau : <code>contracts/openapi/recyclique-api.yaml</code> ne porte pas{' '}
          <code>GET /v1/cash-sessions/</code> ni <code>GET /v1/cash-sessions/stats/summary</code>. Le détail d&apos;une
          session existante reste couvert par <code>GET /v1/cash-sessions/{'{session_id}'}</code> — page dédiée{' '}
          <code>/admin/cash-sessions/&lt;id&gt;</code> (même shell admin, hors entrée nav dédiée). Fermeture liste / stats
          live → <strong>Epic 16</strong> (rail <strong>K</strong>).
        </>
      }
      listBullets={[
        'Chargement liste paginée : non applicable (pas de fetch tant que le YAML ne porte pas la collection).',
        'KPIs agrégés : non applicable — pas de contournement via dashboard-legacy-stats ni autre client hors contrat.',
        'Drill-down métier factice : volontairement absent — seul le détail contractuel est disponible sur la route manifestée côté runtime.',
      ]}
      supplementaryContent={
        <Alert color="gray" title="Exports sensibles exclus (classe B)" mt="md" data-testid="admin-session-manager-export-debt">
          <Text size="sm">
            Le legacy peut déclencher un export par session (<code>GET /v1/admin/reports/cash-sessions/by-session/:id</code>,
            blob) et le hub documente <code>recyclique_admin_reports_cashSessionsExportBulk</code> (POST, step-up). Ces flux
            ne sont pas exposés dans Peintre tant que l&apos;autorité reviewable n&apos;est pas stabilisée côté{' '}
            <strong>Epic 16</strong> — exclusion volontaire et visible, pas une simple absence silencieuse.
          </Text>
        </Alert>
      }
    />
  );
}
