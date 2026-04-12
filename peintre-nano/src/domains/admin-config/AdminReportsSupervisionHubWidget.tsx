import type { ReactNode } from 'react';
import { Button, Grid, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Banknote, ClipboardList, FileWarning, LayoutList, Recycle, ShieldAlert, Ticket } from 'lucide-react';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';

function isCompactPresentation(widgetProps: Readonly<Record<string, unknown>> | undefined): boolean {
  const p = widgetProps?.presentation;
  return p === 'compact';
}

function SupervisionEntryButtons(): ReactNode {
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
          color="blue"
          fullWidth
          leftSection={<ClipboardList size={18} />}
          onClick={() => spaNavigateTo('/admin/pending')}
          data-testid="admin-hub-link-pending"
        >
          Utilisateurs en attente
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
          Sites (legacy)
        </Button>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
        <Button
          variant="light"
          color="violet"
          fullWidth
          leftSection={<LayoutList size={18} />}
          onClick={() => spaNavigateTo('/admin/session-manager')}
          data-testid="admin-hub-link-session-manager"
        >
          Sessions caisse (supervision)
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
          Stats reception (supervision)
        </Button>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
        <Button
          variant="light"
          color="cyan"
          fullWidth
          leftSection={<Ticket size={18} />}
          onClick={() => spaNavigateTo('/admin/reception-sessions')}
          data-testid="admin-hub-link-reception-sessions"
        >
          Sessions reception (tickets)
        </Button>
      </Grid.Col>
    </Grid>
  );
}

/**
 * Story 18.1 — hub rapports admin / points d'entrée supervision caisse (rail U).
 * Aucun fetch : écarts **gap K** nommés ; exports bulk classe **B** → Epic 16 ; listes session-manager → Story 18.2.
 */
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
            Rapports et supervision caisse (aperçu)
          </Text>
          <Text size="sm" c="dimmed">
            Sous <code>/v1/admin/reports/</code>, pas de <strong>GET</strong> de synthèse pour un hub lecture seule —
            gap <strong>K</strong> (fermeture <strong>Epic 16</strong> / rail <strong>K</strong>). Aucune donnée simulée.
          </Text>
          <Group gap="sm" wrap="wrap">
            <Button size="xs" variant="filled" onClick={() => spaNavigateTo('/admin')} data-testid="admin-hub-open-reports-full">
              Ouvrir le hub rapports
            </Button>
          </Group>
          <Title order={5} size="h6">
            Entrées manifestées
          </Title>
          <SupervisionEntryButtons />
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md" data-testid="admin-reports-supervision-hub">
      <Text size="sm" c="dimmed">
        Structure observable alignée sur l&apos;intention legacy <code>ReportsHub</code> / pilotage — sans seconde
        vérité métier ni données simulées.
      </Text>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" h="100%">
            <Stack gap="sm">
              <FileWarning size={22} aria-hidden />
              <Title order={3} size="h4">
                Synthèses « hub rapports » lecture seule
              </Title>
              <Text size="sm">
                Sous le préfixe <code>/v1/admin/reports/</code>, le contrat canon ne documente à ce jour que des{' '}
                <strong>POST</strong> sensibles (exports bulk) — <strong>aucun GET</strong> de liste ou d&apos;agrégats
                pour un tableau de bord rapports. Toute tuile KPI « live » ici serait un contournement : gap{' '}
                <strong>K</strong> jusqu&apos;à ajout d&apos;opérations lecture dans le YAML (fermeture{' '}
                <strong>Epic 16</strong> / rail <strong>K</strong>).
              </Text>
            </Stack>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" h="100%">
            <Stack gap="sm">
              <ShieldAlert size={22} aria-hidden />
              <Title order={3} size="h4">
                Exports bulk (classe B)
              </Title>
              <Text size="sm">
                Opérations documentées : <code>recyclique_admin_reports_cashSessionsExportBulk</code>,{' '}
                <code>recyclique_admin_reports_receptionTicketsExportBulk</code> — <strong>step-up</strong>, hors rail U
                lecture. Console d&apos;export → <strong>Epic 16</strong> après arbitrage contractuel.
              </Text>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      <Title order={3} size="h4">
        Entrées de supervision (navigation manifestée)
      </Title>
      <Text size="sm" c="dimmed" mb="xs">
        Liens vers des <code>route_key</code> déjà servis dans <code>navigation-transverse-served.json</code> — pas de
        plan de routes parallèle.
      </Text>
      <SupervisionEntryButtons />

      <Paper withBorder p="md" bg="gray.0">
        <Title order={4} size="h5" mb="xs">
          Sessions de caisse (liste / détail)
        </Title>
        <Text size="sm" mb="sm">
          <strong>Story 18.2</strong> : entrée nav <code>transverse-admin-session-manager</code> sur{' '}
          <code>/admin/session-manager</code> (liste : gaps <strong>K</strong> explicites) ; détail{' '}
          <code>/admin/cash-sessions/:id</code> via <code>page_key</code> <code>admin-cash-session-detail</code> (sans
          entrée nav dédiée). Exports par session / bulk classe <strong>B</strong> : exclus visuellement —{' '}
          <strong>Epic 16</strong>.
        </Text>
        <Button size="xs" variant="light" onClick={() => spaNavigateTo('/admin/session-manager')}>
          Ouvrir le gestionnaire (manifesté)
        </Button>
      </Paper>
    </Stack>
  );
}
