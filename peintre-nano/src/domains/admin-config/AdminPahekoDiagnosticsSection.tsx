import { Alert, Badge, Button, Group, Modal, Paper, SimpleGrid, Stack, Table, Text, Textarea } from '@mantine/core';
import { Activity, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getPahekoOutboxCorrelationTimeline,
  getPahekoOutboxItem,
  listPahekoOutboxItems,
  postPahekoOutboxLiftQuarantine,
  type PahekoOutboxCorrelationTimelineResponse,
  type PahekoOutboxItemDetail,
} from '../../api/admin-paheko-outbox-client';
import { fetchAdminHealthSystem } from '../../api/admin-system-health-client';
import { labelSyncOperationalState } from '../../api/recyclique-api-error';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';

function formatInstant(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString('fr-FR');
}

function shorten(value: string | null | undefined, left = 8, right = 4): string {
  const raw = value?.trim() ?? '';
  if (!raw) return '—';
  if (raw.length <= left + right + 1) return raw;
  return `${raw.slice(0, left)}…${raw.slice(-right)}`;
}

function schedulerTaskBadgeColor(enabled: boolean, running: boolean): 'teal' | 'yellow' | 'gray' {
  if (!enabled) return 'gray';
  if (running) return 'yellow';
  return 'teal';
}

function outboxStatusBadgeColor(status: string): 'teal' | 'yellow' | 'red' | 'gray' {
  if (status === 'delivered') return 'teal';
  if (status === 'pending' || status === 'processing') return 'yellow';
  if (status === 'failed') return 'red';
  return 'gray';
}

function outboxStatusLabel(status: string): string {
  if (status === 'delivered') return 'Envoye';
  if (status === 'pending') return 'En attente';
  if (status === 'processing') return 'En cours';
  if (status === 'failed') return 'En erreur';
  return status;
}

export function AdminPahekoDiagnosticsSection() {
  const auth = useAuthPort();
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [items, setItems] = useState<readonly {
    id: string;
    correlation_id: string;
    cash_session_id?: string | null;
    outbox_status: string;
    sync_state_core: string;
    last_remote_http_status?: number | null;
    last_error?: string | null;
    next_retry_at?: string | null;
    updated_at: string;
  }[]>([]);
  const [pahekoTask, setPahekoTask] = useState<{
    name: string;
    enabled: boolean;
    running: boolean;
    interval_minutes: number;
    last_run?: string | null;
    next_run?: string | null;
  } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PahekoOutboxItemDetail | null>(null);
  const [timelineBusy, setTimelineBusy] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<PahekoOutboxCorrelationTimelineResponse | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setLoadError(null);
    const [healthRes, outboxRes] = await Promise.allSettled([
      fetchAdminHealthSystem(auth),
      listPahekoOutboxItems(auth, { limit: 10, operation_type: 'cash_session_close' }),
    ]);

    if (healthRes.status === 'fulfilled') {
      const task = healthRes.value.scheduler_status?.tasks?.find((row) => row.name === 'paheko_outbox') ?? null;
      setPahekoTask(task);
    } else {
      setPahekoTask(null);
    }

    if (outboxRes.status === 'fulfilled' && outboxRes.value.ok) {
      setItems(outboxRes.value.data);
    } else {
      setItems([]);
      const msg =
        outboxRes.status === 'fulfilled' ? outboxRes.value.detail : outboxRes.reason instanceof Error ? outboxRes.reason.message : 'Erreur inconnue';
      setLoadError(msg);
    }
    setBusy(false);
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    let pending = 0;
    let failed = 0;
    let delivered = 0;
    for (const item of items) {
      if (item.outbox_status === 'pending' || item.outbox_status === 'processing') pending += 1;
      else if (item.outbox_status === 'failed') failed += 1;
      else if (item.outbox_status === 'delivered') delivered += 1;
    }
    return { pending, failed, delivered };
  }, [items]);

  const openDetail = useCallback(
    async (itemId: string) => {
      setDetailOpen(true);
      setDetailBusy(true);
      setDetailError(null);
      setDetail(null);
      setTimeline(null);
      setTimelineError(null);
      setActionMessage(null);
      const res = await getPahekoOutboxItem(auth, itemId);
      setDetailBusy(false);
      if (!res.ok) {
        setDetailError(res.detail);
        return;
      }
      setDetail(res.item);
      setTimelineBusy(true);
      const timelineRes = await getPahekoOutboxCorrelationTimeline(auth, res.item.correlation_id);
      setTimelineBusy(false);
      if (!timelineRes.ok) {
        setTimelineError(timelineRes.detail);
        return;
      }
      setTimeline(timelineRes.timeline);
    },
    [auth],
  );

  const liftQuarantine = useCallback(async () => {
    if (!detail?.id) return;
    setActionBusy(true);
    setActionMessage(null);
    const res = await postPahekoOutboxLiftQuarantine(auth, detail.id, {
      reason: 'Relance contrôlée depuis le panel super-admin Paheko',
    });
    setActionBusy(false);
    if (!res.ok) {
      setActionMessage(res.detail);
      return;
    }
    setDetail(res.item);
    setActionMessage('Quarantaine levée: la ligne est repassée en file de retry.');
    await load();
  }, [auth, detail, load]);

  return (
    <Stack gap="md">
      <Alert color="gray" title="Support super-admin">
        Ce bloc aide à comprendre un envoi bloqué ou à confirmer qu’une clôture est bien partie vers Paheko. Les
        réglages de clôture restent dans le bloc précédent.
      </Alert>

      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Group gap="xs">
          <Badge color="teal" variant="light">
            Super-admin
          </Badge>
          <Text size="sm" c="dimmed">
            Vue support orientée exploitation, avec relance contrôlée uniquement pour les lignes en quarantaine.
          </Text>
        </Group>
        <Button
          variant="default"
          leftSection={<RefreshCw size={16} />}
          onClick={() => void load()}
          loading={busy}
          data-testid="admin-paheko-diagnostics-refresh"
        >
          Actualiser
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
        <Paper withBorder p="sm">
          <Text size="xs" c="dimmed">
            Traitement automatique
          </Text>
          {pahekoTask ? (
            <>
              <Badge color={schedulerTaskBadgeColor(pahekoTask.enabled, pahekoTask.running)} variant="light" mt={6}>
                {pahekoTask.enabled ? (pahekoTask.running ? 'En cours' : 'Actif') : 'Désactivé'}
              </Badge>
              <Text size="sm" mt={8}>
                Fréquence ~{pahekoTask.interval_minutes} min
              </Text>
            </>
          ) : (
            <Text size="sm" mt={8}>
              Tâche non exposée
            </Text>
          )}
        </Paper>
        <Paper withBorder p="sm">
          <Text size="xs" c="dimmed">
            En attente
          </Text>
          <Text size="xl" fw={700}>
            {counts.pending}
          </Text>
        </Paper>
        <Paper withBorder p="sm">
          <Text size="xs" c="dimmed">
            En erreur
          </Text>
          <Text size="xl" fw={700}>
            {counts.failed}
          </Text>
        </Paper>
        <Paper withBorder p="sm">
          <Text size="xs" c="dimmed">
            Envoyes visibles
          </Text>
          <Text size="xl" fw={700}>
            {counts.delivered}
          </Text>
        </Paper>
      </SimpleGrid>

      {pahekoTask ? (
        <Alert color="blue" title="Traitement automatique Paheko">
          Dernier passage {formatInstant(pahekoTask.last_run)}. Prochaine tentative {formatInstant(pahekoTask.next_run)}.
        </Alert>
      ) : null}

      {loadError ? (
        <Alert color="red" title="Diagnostic partiel">
          {loadError}
        </Alert>
      ) : null}

      <Paper withBorder p="md">
        <Group gap="xs" mb="sm">
          <Activity size={16} />
          <Text fw={600}>Derniers envois vers Paheko</Text>
        </Group>
        {items.length === 0 && !busy ? (
          <Text size="sm" c="dimmed" data-testid="admin-paheko-diagnostics-empty">
            Aucun envoi Paheko récent.
          </Text>
        ) : null}
        {items.length > 0 ? (
          <Table striped highlightOnHover data-testid="admin-paheko-diagnostics-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Clôture</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>HTTP</Table.Th>
                <Table.Th>Réf. suivi</Table.Th>
                <Table.Th>Erreur / prochaine relance</Table.Th>
                <Table.Th> </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Text size="sm" title={item.cash_session_id ?? undefined}>
                      {shorten(item.cash_session_id)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Badge color={outboxStatusBadgeColor(item.outbox_status)} variant="light">
                        {outboxStatusLabel(item.outbox_status)}
                      </Badge>
                      <Text size="sm">{labelSyncOperationalState(item.sync_state_core) ?? item.sync_state_core}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{item.last_remote_http_status ?? '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" title={item.correlation_id}>
                      {shorten(item.correlation_id, 10, 6)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>
                      {item.last_error?.trim() || `Prochain créneau: ${formatInstant(item.next_retry_at)}`}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Button size="xs" variant="light" onClick={() => void openDetail(item.id)}>
                      Inspecter
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : null}
      </Paper>

      <Modal opened={detailOpen} onClose={() => setDetailOpen(false)} title="Détail d’un envoi Paheko" size="xl">
        <Stack gap="sm">
          {detailError ? (
            <Alert color="red" title="Chargement impossible">
              {detailError}
            </Alert>
          ) : null}
          {detailBusy ? (
            <Text size="sm" c="dimmed">
              Chargement…
            </Text>
          ) : null}
          {detail ? (
            <>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <Paper withBorder p="sm">
                  <Text size="xs" c="dimmed">
                    Réf. suivi
                  </Text>
                  <Text size="sm" title={detail.correlation_id}>
                    {detail.correlation_id}
                  </Text>
                </Paper>
                <Paper withBorder p="sm">
                  <Text size="xs" c="dimmed">
                    Dernier statut
                  </Text>
                  <Text size="sm">
                    {outboxStatusLabel(detail.outbox_status)} /{' '}
                    {labelSyncOperationalState(detail.sync_state_core) ?? detail.sync_state_core}
                  </Text>
                </Paper>
              </SimpleGrid>
              {actionMessage ? (
                <Alert
                  color={actionMessage.startsWith('Quarantaine levée') ? 'green' : 'red'}
                  title="Action support"
                  data-testid="admin-paheko-diagnostics-action-message"
                >
                  {actionMessage}
                </Alert>
              ) : null}
              {detail.sync_state_core === 'en_quarantaine' ? (
                <Group justify="flex-end">
                  <Button
                    variant="light"
                    onClick={() => void liftQuarantine()}
                    loading={actionBusy}
                    data-testid="admin-paheko-diagnostics-lift-quarantine"
                  >
                    Retirer de la quarantaine
                  </Button>
                </Group>
              ) : null}
              <Textarea label="Contenu envoye" value={JSON.stringify(detail.payload ?? {}, null, 2)} minRows={8} readOnly />
              <Textarea
                label="Dernière réponse Paheko"
                value={detail.last_response_snippet ?? ''}
                minRows={6}
                readOnly
              />
              <Paper withBorder p="sm">
                <Text fw={600} size="sm" mb="xs">
                  Dernières étapes de suivi
                </Text>
                {detail.recent_sync_transitions.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    Aucune transition récente.
                  </Text>
                ) : (
                  <Stack gap={6}>
                    {detail.recent_sync_transitions.map((row) => (
                      <Text key={row.id} size="sm">
                        {formatInstant(row.occurred_at)} · {row.transition_name} · {row.from_sync_state} → {row.to_sync_state}
                      </Text>
                    ))}
                  </Stack>
                )}
              </Paper>
              <Paper withBorder p="sm">
                <Text fw={600} size="sm" mb="xs">
                  Historique complet de suivi
                </Text>
                {timelineError ? (
                  <Alert color="red" title="Timeline indisponible">
                    {timelineError}
                  </Alert>
                ) : null}
                {timelineBusy ? (
                  <Text size="sm" c="dimmed">
                    Chargement timeline…
                  </Text>
                ) : null}
                {timeline ? (
                  <Stack gap={6} data-testid="admin-paheko-diagnostics-timeline">
                    <Text size="sm" c="dimmed">
                      {timeline.items.length} ligne(s) outbox, {timeline.sync_transitions_total} transition(s) connues pour{' '}
                      {timeline.correlation_id}.
                    </Text>
                    {timeline.sync_transitions.map((row) => (
                      <Text key={row.id} size="sm">
                        {formatInstant(row.occurred_at)} · {row.transition_name} · {row.from_outbox_status} → {row.to_outbox_status}
                      </Text>
                    ))}
                  </Stack>
                ) : null}
              </Paper>
            </>
          ) : null}
        </Stack>
      </Modal>
    </Stack>
  );
}
