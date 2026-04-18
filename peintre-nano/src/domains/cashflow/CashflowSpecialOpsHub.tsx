import { Button, Card, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import {
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_REFUND,
  TRANSVERSE_PERMISSION_ADMIN_VIEW,
} from '../../app/auth/default-demo-auth-adapter';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import { useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';

/**
 * Story 24.2 — hub catalogue opérations non nominales (PRD §20.1) : entrées séparées
 * annulation / remboursement ; parcours P1 non livrés explicitement « à venir » (24.6–24.8).
 */
export function CashflowSpecialOpsHub(_props: RegisteredWidgetProps): ReactNode {
  const envelope = useContextEnvelope();
  const keys = envelope.permissions.permissionKeys;
  const canRefund =
    keys.includes(PERMISSION_CASHFLOW_NOMINAL) && keys.includes(PERMISSION_CASHFLOW_REFUND);
  const canAdminSessions = keys.includes(TRANSVERSE_PERMISSION_ADMIN_VIEW);

  return (
    <Stack gap="lg" data-testid="cashflow-special-ops-hub">
      <div>
        <Title order={2}>Opérations spéciales de caisse</Title>
        <Text size="sm" c="dimmed" mt="xs">
          Point d&apos;entrée unique pour les flux hors vente nominale. L&apos;annulation ou la correction d&apos;une vente
          est distincte du remboursement standard (PRD §10.1–10.2).
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card withBorder padding="md" radius="md" data-testid="cashflow-special-ops-card-annuler">
          <Text fw={600}>Annuler ou corriger une vente</Text>
          <Text size="sm" c="dimmed" mt="xs">
            Annulation / correction sensible (distinct du remboursement). Parcours expert documenté Story 6.8 — accès via
            le journal des sessions caisse.
          </Text>
          {canAdminSessions ? (
            <Button
              mt="md"
              variant="light"
              data-testid="cashflow-special-ops-annuler-cta"
              onClick={() => spaNavigateTo('/admin/session-manager')}
            >
              Ouvrir le journal des sessions
            </Button>
          ) : (
            <Text size="sm" c="dimmed" mt="md" data-testid="cashflow-special-ops-annuler-blocked">
              Réservé aux profils avec accès administration (supervision des sessions).
            </Text>
          )}
        </Card>

        <Card withBorder padding="md" radius="md" data-testid="cashflow-special-ops-card-rembourser">
          <Text fw={600}>Rembourser (standard)</Text>
          <Text size="sm" c="dimmed" mt="xs">
            Remboursement contrôlé d&apos;un ticket finalisé — parcours manifesté{' '}
            <code>/caisse/remboursement</code>.
          </Text>
          {canRefund ? (
            <Button
              mt="md"
              variant="light"
              data-testid="cashflow-special-ops-rembourser-cta"
              onClick={() => spaNavigateTo('/caisse/remboursement')}
            >
              Aller au remboursement
            </Button>
          ) : (
            <Text size="sm" c="dimmed" mt="md" data-testid="cashflow-special-ops-rembourser-blocked">
              Permissions <code>caisse.access</code> et <code>caisse.refund</code> requises — aligné{' '}
              <code>page-cashflow-refund</code> / entrée nav <code>cashflow-refund</code>.
            </Text>
          )}
        </Card>

        <Card withBorder padding="md" radius="md" data-testid="cashflow-special-ops-card-decaisser">
          <Text fw={600}>Décaisser</Text>
          <Text size="sm" c="dimmed" mt="xs">
            À venir — story 24.7 (sous-types obligatoires, sans catégorie poubelle). Pas de parcours factice.
          </Text>
        </Card>

        <Card withBorder padding="md" radius="md" data-testid="cashflow-special-ops-card-mouvement-interne">
          <Text fw={600}>Mouvement interne de caisse</Text>
          <Text size="sm" c="dimmed" mt="xs">
            À venir — story 24.8 (distinct charge / remboursement client). Pas de parcours factice.
          </Text>
        </Card>

        <Card withBorder padding="md" radius="md" data-testid="cashflow-special-ops-card-echanger">
          <Text fw={600}>Échanger</Text>
          <Text size="sm" c="dimmed" mt="xs">
            À venir — story 24.6 (échange matière et différence financière). Pas de parcours factice.
          </Text>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
