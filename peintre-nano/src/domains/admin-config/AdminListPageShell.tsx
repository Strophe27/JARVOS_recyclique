import { Alert, List, Paper, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export type AdminListPageShellProps = {
  /** Conservé pour les tests e2e / non-régression par slice (`widget-admin-*-demo`). */
  widgetRootTestId: string;
  listTitle: string;
  contractGapAlertTitle: string;
  contractGapAlertBody: ReactNode;
  /** Libellés de la liste d'état (placeholder honnête, sans fetch). */
  listBullets: readonly string[];
  /** Contenu optionnel sous la liste (ex. dette exports classe B — Story 18.2). */
  supplementaryContent?: ReactNode;
  /**
   * Bandeau « détail simple » **démo** : statique, sans `data_contract` ni cache métier dans
   * UserRuntimePrefs (Story 17.3, AC 8–9).
   */
  showDetailSimpleDemoStrip?: boolean;
};

/**
 * Coquille visuelle partagée des widgets liste admin transverse (Stories 17.1–17.3).
 * Ne porte aucune donnée métier : uniquement structure + messages alignés sur l'absence de contrat live.
 */
export function AdminListPageShell({
  widgetRootTestId,
  listTitle,
  contractGapAlertTitle,
  contractGapAlertBody,
  listBullets,
  supplementaryContent,
  showDetailSimpleDemoStrip = true,
}: AdminListPageShellProps) {
  return (
    <Stack gap="md" data-testid="admin-list-page-shell">
      <div data-testid={widgetRootTestId}>
        <Title order={2} mb="sm">
          {listTitle}
        </Title>
        <Alert color="yellow" title={contractGapAlertTitle} mb="md">
          {contractGapAlertBody}
        </Alert>
        <Text c="dimmed" size="sm" mb="xs">
          État interface (placeholder honnête) :
        </Text>
        <List spacing="xs" size="sm" withPadding>
          {listBullets.map((text) => (
            <List.Item key={text}>{text}</List.Item>
          ))}
        </List>
        {supplementaryContent}
      </div>
      {showDetailSimpleDemoStrip ? <AdminDetailSimpleDemoStrip /> : null}
    </Stack>
  );
}

/** Strip « détail simple » démo (Story 17.3) — réutilisable hors `AdminListPageShell` (ex. Story 19.1). */
export function AdminDetailSimpleDemoStrip() {
  return (
    <Paper withBorder p="sm" mt="xs" data-testid="admin-detail-simple-demo-strip">
      <Text size="xs" c="dimmed" fw={600} mb={4}>
        Démo UI — pattern « détail simple » (Story 17.3)
      </Text>
      <Text size="sm">
        Aucune donnée contractuelle affichée ici : exemple statique uniquement. Un vrai drill-down
        attendra des opérations publiées dans <code>contracts/openapi/recyclique-api.yaml</code> et un
        second <code>PageManifest</code> ou panneau alimenté par données déjà portées par le contrat
        (fermeture gaps → <strong>Epic 16</strong> / stories futures).
      </Text>
    </Paper>
  );
}
