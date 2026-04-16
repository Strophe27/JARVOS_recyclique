import { Alert, Badge, Button, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listPahekoCashSessionCloseMappings } from '../../api/admin-paheko-mappings-client';
import { listPahekoOutboxItems } from '../../api/admin-paheko-outbox-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';

type PahekoTransactionPreview = {
  readonly amount: number;
  readonly debit: string;
  readonly credit: string;
  readonly id_year: number;
  readonly label?: string | null;
  readonly reference?: string | null;
};

function formatInstant(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString('fr-FR');
}

function formatCurrency(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

function statusColor(status: string): 'teal' | 'yellow' | 'red' | 'gray' {
  if (status === 'delivered') return 'teal';
  if (status === 'pending' || status === 'processing') return 'yellow';
  if (status === 'failed') return 'red';
  return 'gray';
}

function statusLabel(status: string): string {
  if (status === 'delivered') return 'Transmise';
  if (status === 'pending' || status === 'processing') return 'En cours';
  if (status === 'failed') return 'À vérifier';
  return 'Inconnue';
}

function statusHelper(status: string): string {
  if (status === 'delivered') return 'Clôture transmise à Paheko.';
  if (status === 'pending' || status === 'processing') return 'Transmission en cours de traitement.';
  if (status === 'failed') return 'Une vérification du support technique est nécessaire.';
  return 'Statut à confirmer.';
}

function readTransactionPreview(row: { readonly transaction_preview?: unknown }): PahekoTransactionPreview | null {
  const preview = row.transaction_preview;
  if (!preview || typeof preview !== 'object') return null;
  const candidate = preview as Record<string, unknown>;
  if (
    typeof candidate.amount !== 'number' ||
    !Number.isFinite(candidate.amount) ||
    typeof candidate.debit !== 'string' ||
    typeof candidate.credit !== 'string' ||
    typeof candidate.id_year !== 'number'
  ) {
    return null;
  }
  return {
    amount: candidate.amount,
    debit: candidate.debit,
    credit: candidate.credit,
    id_year: candidate.id_year,
    label: typeof candidate.label === 'string' ? candidate.label : null,
    reference: typeof candidate.reference === 'string' ? candidate.reference : null,
  };
}

function transactionSummary(preview: PahekoTransactionPreview | null): string | null {
  if (!preview) return null;
  return `${formatCurrency(preview.amount)} · Débit ${preview.debit} · Crédit ${preview.credit}`;
}

export function AdminAccountingHubWidget(_props: RegisteredWidgetProps) {
  const auth = useAuthPort();
  const envelope = auth.getContextEnvelope();
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mappingCount, setMappingCount] = useState({ active: 0, disabled: 0 });
  const [outboxSummary, setOutboxSummary] = useState({ pending: 0, delivered: 0, failed: 0 });
  const [recentFlows, setRecentFlows] = useState<
    readonly {
      id: string;
      outbox_status: string;
      updated_at: string;
      transactionPreview: PahekoTransactionPreview | null;
    }[]
  >([]);

  const load = useCallback(async () => {
    setBusy(true);
    setLoadError(null);
    const [mappingsRes, outboxRes] = await Promise.all([
      listPahekoCashSessionCloseMappings(auth, { limit: 200 }),
      listPahekoOutboxItems(auth, { limit: 20, operation_type: 'cash_session_close' }),
    ]);
    if (!mappingsRes.ok) {
      setLoadError(mappingsRes.detail);
      setBusy(false);
      return;
    }
    if (!outboxRes.ok) {
      setLoadError(outboxRes.detail);
      setBusy(false);
      return;
    }
    const currentSiteId = envelope.siteId?.trim() ?? '';
    const siteScopedOutbox = currentSiteId
      ? outboxRes.data.filter((row) => (row.site_id ?? '').trim() === currentSiteId)
      : outboxRes.data;
    setMappingCount({
      active: mappingsRes.data.filter((row) => row.enabled).length,
      disabled: mappingsRes.data.filter((row) => !row.enabled).length,
    });
    const pending = siteScopedOutbox.filter((row) => row.outbox_status === 'pending' || row.outbox_status === 'processing')
      .length;
    const delivered = siteScopedOutbox.filter((row) => row.outbox_status === 'delivered').length;
    const failed = siteScopedOutbox.filter((row) => row.outbox_status === 'failed').length;
    setOutboxSummary({ pending, delivered, failed });
    setRecentFlows(
      siteScopedOutbox.slice(0, 8).map((row) => ({
        id: row.id,
        outbox_status: row.outbox_status,
        updated_at: row.updated_at,
        transactionPreview: readTransactionPreview(row as { readonly transaction_preview?: unknown }),
      })),
    );
    setBusy(false);
  }, [auth, envelope.siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const latestActivity = useMemo(() => recentFlows[0]?.updated_at ?? null, [recentFlows]);
  const hasConfigurationGap = mappingCount.active === 0;
  const hasAttention = outboxSummary.failed > 0;

  return (
    <Stack gap="md" data-testid="admin-accounting-hub">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div>
          <Title order={1} size="h2" m={0}>
            Suivi comptable Paheko
          </Title>
        </div>
        <Button
          variant="default"
          leftSection={<RefreshCw size={16} />}
          onClick={() => void load()}
          loading={busy}
          data-testid="admin-accounting-hub-refresh"
        >
          Actualiser
        </Button>
      </Group>

      {hasConfigurationGap ? (
        <Alert color="orange" title="Configuration à compléter">
          <Text size="sm">
            Aucun réglage de clôture Paheko actif n’est disponible pour le moment. Le paramétrage comptable (super-admin)
            permet d’activer les réglages de clôture et l’intégration Paheko.
          </Text>
        </Alert>
      ) : null}

      {hasAttention ? (
        <Alert color="orange" title="Clôtures à vérifier">
          <Text size="sm">
            Une ou plusieurs clôtures demandent une vérification par le support technique. À traiter depuis le
            paramétrage comptable (super-admin), onglet support Paheko.
          </Text>
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
        <Paper withBorder p="sm">
          <Text size="xs" c="dimmed">
            Transmises
          </Text>
          <Text size="lg" fw={700}>
            {outboxSummary.delivered}
          </Text>
        </Paper>
        <Paper withBorder p="sm">
          <Text size="xs" c="dimmed">
            En cours
          </Text>
          <Text size="lg" fw={700}>
            {outboxSummary.pending}
          </Text>
        </Paper>
        <Paper withBorder p="sm">
          <Text size="xs" c="dimmed">
            À vérifier
          </Text>
          <Text size="lg" fw={700}>
            {outboxSummary.failed}
          </Text>
        </Paper>
        <Paper withBorder p="sm">
          <Text size="xs" c="dimmed">
            Dernière activité
          </Text>
          <Text size="lg" fw={700}>
            {formatInstant(latestActivity)}
          </Text>
        </Paper>
      </SimpleGrid>

      {loadError ? (
        <Alert color="red" title="Chargement partiel">
          {loadError}
        </Alert>
      ) : null}

      <Paper withBorder p="md">
        <Text fw={600} mb="sm">
          Clôtures récentes
        </Text>
        {recentFlows.length === 0 ? (
          <Text size="sm" c="dimmed" data-testid="admin-accounting-hub-no-flows">
            Aucune clôture récente visible.
          </Text>
        ) : (
          <Table striped highlightOnHover data-testid="admin-accounting-hub-history-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Situation</Table.Th>
                <Table.Th>Écriture comptable</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentFlows.map((row) => (
                <Table.Tr key={row.id}>
                  <Table.Td>
                    <Text size="sm">{formatInstant(row.updated_at)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Badge color={statusColor(row.outbox_status)} variant="light">
                        {statusLabel(row.outbox_status)}
                      </Badge>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text size="sm">{transactionSummary(row.transactionPreview) ?? 'Montant et comptes en préparation.'}</Text>
                      <Text size="xs" c="dimmed">
                        {statusHelper(row.outbox_status)}
                      </Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}
