import type { ReactNode } from 'react';
import { Button, Grid, Paper, Stack, Text, Title } from '@mantine/core';
import { Banknote, Recycle } from 'lucide-react';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';

function isCompactPresentation(widgetProps: Readonly<Record<string, unknown>> | undefined): boolean {
  return widgetProps?.presentation === 'compact';
}

function isSecondaryStripPresentation(widgetProps: Readonly<Record<string, unknown>> | undefined): boolean {
  return widgetProps?.presentation === 'secondary-strip';
}

/**
 * Raccourcis vers des routes déjà dans la nav transverse, sans refaire la grille 6+3 du tableau de bord legacy.
 */
function HorsGrilleAdminSecondaryLinks(): ReactNode {
  return (
    <Grid gutter="sm">
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
        <Button
          variant="light"
          color="teal"
          fullWidth
          leftSection={<Banknote size={18} />}
          onClick={() => spaNavigateTo('/admin/cash-registers')}
          data-testid="admin-hub-link-cash-registers"
        >
          Caisses enregistrées
        </Button>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
        <Button
          variant="light"
          color="gray"
          fullWidth
          onClick={() => spaNavigateTo('/admin/sites')}
          data-testid="admin-hub-link-sites"
        >
          Sites enregistrés
        </Button>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
        <Button
          variant="light"
          color="green"
          fullWidth
          leftSection={<Recycle size={18} />}
          onClick={() => spaNavigateTo('/admin/reception-stats')}
          data-testid="admin-hub-link-reception-stats"
        >
          Statistiques réception (supervision)
        </Button>
      </Grid.Col>
    </Grid>
  );
}

function AvailabilityNote({ dense }: { dense?: boolean }): ReactNode {
  return (
    <Paper withBorder p={dense ? 'sm' : 'md'} bg="gray.0">
      <Text size="sm" c="dimmed">
        Certaines synthèses avancées et exports sensibles ne sont pas encore disponibles ici.
      </Text>
    </Paper>
  );
}

/** Bandeau d’accès secondaires (placeholder / layouts hors `/admin` servi). Aucun fetch. */
export function AdminReportsSupervisionHubWidget({ widgetProps }: RegisteredWidgetProps) {
  if (isCompactPresentation(widgetProps)) {
    return (
      <Paper
        withBorder
        p="md"
        radius="md"
        bg="gray.0"
        data-testid="admin-reports-supervision-hub-compact"
      >
        <Stack gap="sm">
          <Text size="sm" fw={500}>
            Accès complémentaires
          </Text>
          <AvailabilityNote dense />
          <Title order={5} size="h6">
            Liens complémentaires
          </Title>
          <HorsGrilleAdminSecondaryLinks />
        </Stack>
      </Paper>
    );
  }

  const strip = isSecondaryStripPresentation(widgetProps) || widgetProps?.presentation == null;

  if (!strip) {
    return (
      <Stack gap="md" data-testid="admin-reports-supervision-hub">
        <Text size="sm" c="dimmed">
          Accès complémentaires à l’administration.
        </Text>
        <AvailabilityNote />
        <Title order={4} size="h5">
          Liens complémentaires
        </Title>
        <HorsGrilleAdminSecondaryLinks />
      </Stack>
    );
  }

  return (
    <Stack gap="md" data-testid="admin-reports-supervision-hub">
      <Text size="sm" c="dimmed">
        Accès complémentaires à l’administration, en dehors de la grille principale.
      </Text>
      <AvailabilityNote />
      <Title order={4} size="h5">
        Liens complémentaires
      </Title>
      <Text size="sm" c="dimmed">
        Les mêmes intentions que dans la navigation transverse (caisses, sites, stats réception) sont regroupées ici pour les gabarits compact / démo.
      </Text>
      <HorsGrilleAdminSecondaryLinks />
    </Stack>
  );
}
