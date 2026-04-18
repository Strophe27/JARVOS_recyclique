import { Button, Card, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import {
  PERMISSION_ACCOUNTING_PRIOR_YEAR_REFUND,
  PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND,
  PERMISSION_CASHFLOW_EXCHANGE,
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_REFUND,
  TRANSVERSE_PERMISSION_ADMIN_VIEW,
} from '../../app/auth/default-demo-auth-adapter';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import { useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';

/**
 * Story 24.2 — hub catalogue opérations non nominales (PRD §20.1) : entrées séparées
 * annulation / remboursement ; parcours P1 restants « à venir » (24.7–24.8) ; échange 24.6 manifesté.
 */
export function CashflowSpecialOpsHub(_props: RegisteredWidgetProps): ReactNode {
  const envelope = useContextEnvelope();
  const keys = envelope.permissions.permissionKeys;
  const canRefund =
    keys.includes(PERMISSION_CASHFLOW_NOMINAL) && keys.includes(PERMISSION_CASHFLOW_REFUND);
  const canExceptionalRefund =
    keys.includes(PERMISSION_CASHFLOW_NOMINAL) && keys.includes(PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND);
  const canExchange =
    keys.includes(PERMISSION_CASHFLOW_NOMINAL) && keys.includes(PERMISSION_CASHFLOW_EXCHANGE);
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

        <Card withBorder padding="md" radius="md" data-testid="cashflow-special-ops-card-remboursement-exceptionnel">
          <Text fw={600}>Remboursement exceptionnel (sans ticket)</Text>
          <Text size="sm" c="dimmed" mt="xs">
            Remboursement sans ticket source : PIN step-up obligatoire, justification et motif codifié.
          </Text>
          {canExceptionalRefund ? (
            <Button
              mt="md"
              variant="light"
              data-testid="cashflow-special-ops-remboursement-exceptionnel-cta"
              onClick={() => spaNavigateTo('/caisse/remboursement-exceptionnel')}
            >
              Ouvrir le remboursement exceptionnel
            </Button>
          ) : (
            <Text
              size="sm"
              c="dimmed"
              mt="md"
              data-testid="cashflow-special-ops-remboursement-exceptionnel-blocked"
            >
              Permissions <code>caisse.access</code> et <code>refund.exceptional</code> requises.
            </Text>
          )}
        </Card>

        <Card withBorder padding="md" radius="md" data-testid="cashflow-special-ops-card-remboursement-n1-expert">
          <Text fw={600}>Remboursement exercice antérieur clos (expert N-1)</Text>
          <Text size="sm" c="dimmed" mt="xs">
            Distinct du remboursement standard : même URL <code>/caisse/remboursement</code>, mais parcours et
            habilitation séparés. Le ticket est signalé <strong>avant</strong> la validation finale lorsque l&apos;exercice
            source est clos ; double contrôle serveur (<code>expert_prior_year_refund</code> + permission{' '}
            <code>{PERMISSION_ACCOUNTING_PRIOR_YEAR_REFUND}</code>).
          </Text>
          {canRefund ? (
            <Button
              mt="md"
              variant="outline"
              color="grape"
              data-testid="cashflow-special-ops-remboursement-n1-expert-cta"
              onClick={() => spaNavigateTo('/caisse/remboursement')}
            >
              Ouvrir le remboursement (parcours expert N-1)
            </Button>
          ) : (
            <Text size="sm" c="dimmed" mt="md" data-testid="cashflow-special-ops-remboursement-n1-blocked">
              Base caisse standard requise (<code>caisse.access</code>, <code>caisse.refund</code>) pour ouvrir
              l&apos;écran ; la permission expert est distincte (<code>{PERMISSION_ACCOUNTING_PRIOR_YEAR_REFUND}</code>
              ).
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
            Échange matière : complément (vente) ou remboursement (reversal), alignés PRD §11 — route{' '}
            <code>/caisse/echange</code>, <code>page_key</code> <code>cashflow-exchange</code>.
          </Text>
          {canExchange ? (
            <Button
              mt="md"
              variant="light"
              data-testid="cashflow-special-ops-echanger-cta"
              onClick={() => spaNavigateTo('/caisse/echange')}
            >
              Ouvrir l&apos;échange matière
            </Button>
          ) : (
            <Text size="sm" c="dimmed" mt="md" data-testid="cashflow-special-ops-echanger-blocked">
              Permissions <code>caisse.access</code> et <code>{PERMISSION_CASHFLOW_EXCHANGE}</code> requises — aligné{' '}
              <code>page-cashflow-exchange</code>.
            </Text>
          )}
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
