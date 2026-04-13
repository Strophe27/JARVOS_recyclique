import { Button, Grid, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { ArrowLeft, Banknote, Building2 } from 'lucide-react';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';

/**
 * Parité legacy 4445 : page intermédiaire « Sites & Caisses » avant les écrans CRUD.
 */
export function AdminSitesAndRegistersHubWidget(_props: RegisteredWidgetProps) {
  return (
    <Stack gap="md" data-testid="admin-sites-and-registers-hub">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <Title order={1} size="h2" m={0} style={{ flex: '1 1 240px' }}>
          Gestion des sites et caisses
        </Title>
        <Button
          variant="subtle"
          leftSection={<ArrowLeft size={16} aria-hidden />}
          onClick={() => spaNavigateTo('/admin')}
          data-testid="admin-sites-and-registers-back-dashboard"
        >
          Retour au tableau de bord
        </Button>
      </Group>

      <Paper p="md" withBorder bg="gray.0" radius="md">
        <Text size="md" c="dimmed" ta="center">
          Choisissez l&apos;option que vous souhaitez gérer
        </Text>
      </Paper>

      <Paper p="md" withBorder radius="md">
        <Stack gap="md">
          <Title order={2} size="h4" ta="center" mb="xs">
            Options de gestion
          </Title>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Button
                variant="light"
                color="blue"
                fullWidth
                size="md"
                leftSection={<Building2 size={20} aria-hidden />}
                onClick={() => spaNavigateTo('/admin/sites')}
                data-testid="admin-sites-and-registers-nav-sites"
              >
                <Stack gap={4} align="center" py={4}>
                  <Text fw={700}>Gérer les sites</Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Sites de collecte et paramètres associés
                  </Text>
                </Stack>
              </Button>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Button
                variant="light"
                color="teal"
                fullWidth
                size="md"
                leftSection={<Banknote size={20} aria-hidden />}
                onClick={() => spaNavigateTo('/admin/cash-registers')}
                data-testid="admin-sites-and-registers-nav-cash-registers"
              >
                <Stack gap={4} align="center" py={4}>
                  <Text fw={700}>Gérer les postes de caisse</Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Postes de caisse et paramètres associés
                  </Text>
                </Stack>
              </Button>
            </Grid.Col>
          </Grid>
        </Stack>
      </Paper>
    </Stack>
  );
}
