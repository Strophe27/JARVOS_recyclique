import {
  ActionIcon,
  Badge,
  Button,
  Grid,
  Group,
  LoadingOverlay,
  Modal,
  NativeSelect,
  NumberInput,
  Pagination,
  Paper,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { Download, Eye, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  getAdminAuditLogList,
  type AdminAuditLogEntryDto,
  type AdminAuditLogPageDto,
} from '../../api/admin-audit-log-client';
import {
  getAdminTransactionLogsList,
  type AdminTransactionLogEntryDto,
  type AdminTransactionLogsPageDto,
} from '../../api/admin-transaction-logs-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from '../cashflow/CashflowClientErrorAlert';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';

const ACTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les types' },
  { value: 'login_success', label: 'Connexion réussie' },
  { value: 'login_failed', label: 'Connexion échouée' },
  { value: 'logout', label: 'Déconnexion' },
  { value: 'user_created', label: 'Utilisateur créé' },
  { value: 'user_updated', label: 'Utilisateur modifié' },
  { value: 'user_deleted', label: 'Utilisateur supprimé' },
  { value: 'user_status_changed', label: 'Statut utilisateur changé' },
  { value: 'user_role_changed', label: 'Rôle utilisateur changé' },
  { value: 'password_forced', label: 'Mot de passe forcé' },
  { value: 'password_reset', label: 'Réinitialisation mot de passe' },
  { value: 'pin_reset', label: 'Réinitialisation PIN' },
  { value: 'permission_granted', label: 'Permission accordée' },
  { value: 'permission_revoked', label: 'Permission révoquée' },
  { value: 'group_assigned', label: 'Groupe assigné' },
  { value: 'group_removed', label: 'Groupe retiré' },
  { value: 'system_config_changed', label: 'Configuration système modifiée' },
  { value: 'data_exported', label: 'Données exportées' },
  { value: 'backup_created', label: 'Sauvegarde créée' },
  { value: 'db_import', label: 'Restauration base (import)' },
  { value: 'db_export', label: 'Export base (sauvegarde)' },
  { value: 'db_purge', label: 'Purge données transactionnelles' },
];

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('fr-FR');
  } catch {
    return '-';
  }
}

function formatActionType(actionType: string): string {
  return ACTION_TYPE_OPTIONS.find((a) => a.value === actionType)?.label ?? actionType;
}

function badgeColor(actionType: string): string {
  if (actionType.includes('success') || actionType.includes('created')) return 'green';
  if (actionType.includes('failed') || actionType.includes('deleted')) return 'red';
  if (actionType.includes('changed') || actionType.includes('updated')) return 'blue';
  if (actionType.includes('reset') || actionType.includes('forced')) return 'orange';
  return 'gray';
}

type AuditFilterForm = {
  actionType: string;
  actorUsername: string;
  startDate: string;
  endDate: string;
  search: string;
  pageSize: number;
};

const EMPTY_FILTERS: AuditFilterForm = {
  actionType: '',
  actorUsername: '',
  startDate: '',
  endDate: '',
  search: '',
  pageSize: 20,
};

function exportPageToCsv(data: AdminAuditLogPageDto): void {
  const headers = ['Horodatage', 'Acteur', 'Action', 'Cible', 'Description', 'Adresse IP', 'Détails'];
  const rows = data.entries.map((entry) => [
    formatTimestamp(entry.timestamp),
    entry.actor_username || 'Système',
    formatActionType(entry.action_type),
    entry.target_username || entry.target_type || '',
    entry.description || '',
    entry.ip_address || '',
    JSON.stringify(entry.details ?? {}),
  ]);
  const csvContent = [headers, ...rows]
    .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  const day = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `audit-log-${day}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDetailsForDisplay(details: unknown): string {
  if (details == null) return '';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

const EVENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les événements' },
  { value: 'SESSION_OPENED', label: 'Session ouverte' },
  { value: 'TICKET_OPENED', label: 'Ticket ouvert' },
  { value: 'TICKET_RESET', label: 'Ticket réinitialisé' },
  { value: 'PAYMENT_VALIDATED', label: 'Paiement validé' },
  { value: 'ANOMALY_DETECTED', label: 'Anomalie détectée' },
];

function formatTransactionTimestamp(timestamp: string): string {
  if (!timestamp) return '-';
  try {
    let dateStr = timestamp;
    if (dateStr.endsWith('Z')) {
      if (!dateStr.includes('+00:00Z') && !dateStr.slice(0, -1).includes('+', dateStr.lastIndexOf('T'))) {
        dateStr = dateStr.slice(0, -1) + '+00:00';
      } else if (dateStr.includes('+00:00Z')) {
        dateStr = dateStr.replace('+00:00Z', '+00:00');
      } else {
        dateStr = dateStr.slice(0, -1) + '+00:00';
      }
    }
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      const date2 = new Date(timestamp);
      return Number.isNaN(date2.getTime()) ? '-' : date2.toLocaleString('fr-FR');
    }
    return date.toLocaleString('fr-FR');
  } catch {
    return '-';
  }
}

function formatEventTypeLabel(eventType: string): string {
  return EVENT_TYPE_OPTIONS.find((e) => e.value === eventType)?.label ?? eventType;
}

function eventBadgeColor(eventType: string): string {
  if (eventType === 'PAYMENT_VALIDATED') return 'green';
  if (eventType === 'ANOMALY_DETECTED') return 'red';
  if (eventType === 'TICKET_RESET') return 'orange';
  return 'blue';
}

function txString(entry: AdminTransactionLogEntryDto, key: string): string {
  const v = entry[key];
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

function txEvent(entry: AdminTransactionLogEntryDto): string {
  return txString(entry, 'event');
}

function txIsAnomaly(entry: AdminTransactionLogEntryDto): boolean {
  if (entry.anomaly === true) return true;
  return txEvent(entry) === 'ANOMALY_DETECTED';
}

function txAnomalyLabel(entry: AdminTransactionLogEntryDto): string {
  const t = entry.anomaly_type;
  if (typeof t === 'string' && t.trim()) return t;
  return 'Anomalie';
}

function exportTransactionLogsToCsv(data: AdminTransactionLogsPageDto): void {
  const headers = [
    'Date et heure',
    'Événement',
    'Compte',
    'Session',
    'Transaction',
    'Alerte',
    'Type alerte',
    'Détails',
    'Montant',
    'Paiement',
    'Articles',
    'Panier',
    'Panier avant',
    'Panier après',
  ];
  const rows = data.entries.map((entry) => {
    const cart = entry.cart_state;
    const cartBefore = entry.cart_state_before;
    const cartAfter = entry.cart_state_after;
    const itemsCount =
      (isRecord(cart) && typeof cart.items_count === 'number' ? cart.items_count : null) ??
      (isRecord(cartBefore) && typeof cartBefore.items_count === 'number' ? cartBefore.items_count : null) ??
      '';
    return [
      formatTransactionTimestamp(txString(entry, 'timestamp')),
      txEvent(entry),
      txString(entry, 'user_id'),
      txString(entry, 'session_id'),
      txString(entry, 'transaction_id'),
      txIsAnomaly(entry) ? 'Oui' : 'Non',
      typeof entry.anomaly_type === 'string' ? entry.anomaly_type : '',
      typeof entry.details === 'string'
        ? entry.details
        : entry.details != null
          ? formatDetailsForDisplay(entry.details)
          : '',
      typeof entry.amount === 'number' ? String(entry.amount) : txString(entry, 'amount'),
      txString(entry, 'payment_method'),
      String(itemsCount),
      isRecord(cart) ? JSON.stringify(cart) : '',
      isRecord(cartBefore) ? JSON.stringify(cartBefore) : '',
      isRecord(cartAfter) ? JSON.stringify(cartAfter) : '',
    ];
  });
  const csvContent = [headers, ...rows]
    .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  const day = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `journal-transactions-${day}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type TxFilterForm = {
  eventType: string;
  userId: string;
  sessionId: string;
  startDate: string;
  endDate: string;
  pageSize: number;
};

const EMPTY_TX_FILTERS: TxFilterForm = {
  eventType: '',
  userId: '',
  sessionId: '',
  startDate: '',
  endDate: '',
  pageSize: 50,
};

function TransactionLogsPanel(): ReactNode {
  const auth = useAuthPort();

  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<TxFilterForm>(EMPTY_TX_FILTERS);
  const [applied, setApplied] = useState<TxFilterForm>(EMPTY_TX_FILTERS);

  const [data, setData] = useState<AdminTransactionLogsPageDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [selected, setSelected] = useState<AdminTransactionLogEntryDto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const query = useMemo(
    () => ({
      page,
      page_size: applied.pageSize,
      ...(applied.eventType ? { event_type: applied.eventType } : {}),
      ...(applied.userId.trim() ? { user_id: applied.userId.trim() } : {}),
      ...(applied.sessionId.trim() ? { session_id: applied.sessionId.trim() } : {}),
      ...(applied.startDate ? { start_date: `${applied.startDate}T00:00:00.000Z` } : {}),
      ...(applied.endDate ? { end_date: `${applied.endDate}T23:59:59.999Z` } : {}),
    }),
    [page, applied],
  );

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    const res = await getAdminTransactionLogsList(auth, query);
    if (!res.ok) {
      setData(null);
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      setBusy(false);
      return;
    }
    setData(res.data);
    setBusy(false);
  }, [auth, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setApplied(draft);
    setPage(1);
  };

  const resetFilters = () => {
    setDraft(EMPTY_TX_FILTERS);
    setApplied(EMPTY_TX_FILTERS);
    setPage(1);
  };

  return (
    <Stack gap="md" data-testid="admin-transaction-logs-root">
      <Paper withBorder p="md" component="form" onSubmit={onSearchSubmit}>
        <Grid>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <NativeSelect
              label="Type d'événement"
              data={EVENT_TYPE_OPTIONS}
              value={draft.eventType}
              onChange={(e) => setDraft((d) => ({ ...d, eventType: e.currentTarget.value }))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label="Compte"
              placeholder="Filtrer par référence compte…"
              value={draft.userId}
              onChange={(e) => setDraft((d) => ({ ...d, userId: e.currentTarget.value }))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label="Session"
              placeholder="Filtrer par référence session…"
              value={draft.sessionId}
              onChange={(e) => setDraft((d) => ({ ...d, sessionId: e.currentTarget.value }))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label="Date de début"
              placeholder="AAAA-MM-JJ"
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraft((d) => ({ ...d, startDate: e.currentTarget.value }))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label="Date de fin"
              placeholder="AAAA-MM-JJ"
              type="date"
              value={draft.endDate}
              onChange={(e) => setDraft((d) => ({ ...d, endDate: e.currentTarget.value }))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <NumberInput
              label="Taille de page"
              min={1}
              max={200}
              value={draft.pageSize}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  pageSize: typeof v === 'number' && v > 0 ? Math.min(200, v) : 50,
                }))
              }
            />
          </Grid.Col>
        </Grid>
        <Group mt="md" gap="sm">
          <Button type="submit" size="sm" leftSection={<Search size={16} />} loading={busy}>
            Rechercher
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            leftSection={<RefreshCw size={16} />}
            onClick={resetFilters}
            disabled={busy}
          >
            Réinitialiser
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            leftSection={<Download size={16} />}
            disabled={!data || data.entries.length === 0 || busy}
            onClick={() => data && exportTransactionLogsToCsv(data)}
          >
            Exporter CSV
          </Button>
        </Group>
      </Paper>

      <CashflowClientErrorAlert error={error} testId="admin-transaction-logs-error" />

      <Paper withBorder pos="relative" style={{ minHeight: 120 }}>
        <LoadingOverlay visible={busy} zIndex={2} />
        {!busy && !error && data && data.entries.length === 0 ? (
          <Text size="sm" c="dimmed" p="md" data-testid="admin-transaction-logs-empty">
            Aucune entrée sur cette page.
          </Text>
        ) : null}
        {data && data.entries.length > 0 ? (
          <>
            <Table striped highlightOnHover data-testid="admin-transaction-logs-table">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date et heure</Table.Th>
                  <Table.Th>Événement</Table.Th>
                  <Table.Th>Compte</Table.Th>
                  <Table.Th>Session</Table.Th>
                  <Table.Th>Alerte</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.entries.map((entry, idx) => {
                  const ev = txEvent(entry);
                  const rowKey = `${txString(entry, 'timestamp')}-${ev}-${idx}`;
                  const highlight = txIsAnomaly(entry);
                  return (
                    <Table.Tr
                      key={rowKey}
                      data-testid={`admin-transaction-logs-row-${idx}`}
                      style={
                        highlight
                          ? { backgroundColor: 'rgba(255, 152, 0, 0.1)' }
                          : undefined
                      }
                    >
                      <Table.Td>
                        <Text size="sm">{formatTransactionTimestamp(txString(entry, 'timestamp'))}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={eventBadgeColor(ev)} size="sm">
                          {formatEventTypeLabel(ev)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {txString(entry, 'user_id') || '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {txString(entry, 'session_id') || '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {highlight ? (
                          <Badge color="red" size="sm" variant="filled">
                            {txAnomalyLabel(entry)}
                          </Badge>
                        ) : (
                          <Text size="sm" c="dimmed">
                            -
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label="Voir les détails">
                          <ActionIcon
                            variant="subtle"
                            aria-label="Voir les détails"
                            onClick={() => {
                              setSelected(entry);
                              setModalOpen(true);
                            }}
                          >
                            <Eye size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
            {data.pagination.total_pages > 1 ? (
              <Group justify="center" mt="md" p="md">
                <Pagination
                  value={data.pagination.page}
                  onChange={(p) => setPage(p)}
                  total={data.pagination.total_pages}
                  size="sm"
                />
              </Group>
            ) : null}
            <Text size="sm" c="dimmed" p="md" ta="center" data-testid="admin-transaction-logs-total">
              {data.pagination.total_count} entrée(s) au total
            </Text>
          </>
        ) : null}
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Détail de l'événement" size="lg">
        {selected ? (
          <div style={{ maxHeight: 500, overflow: 'auto' }}>
            <Paper p="sm" withBorder>
              <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap' }}>
                {formatDetailsForDisplay(selected)}
              </Text>
            </Paper>
          </div>
        ) : null}
      </Modal>
    </Stack>
  );
}

export function AdminAuditLogWidget(_: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  useContextEnvelope();

  const [journalTab, setJournalTab] = useState<string | null>('audit');

  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<AuditFilterForm>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<AuditFilterForm>(EMPTY_FILTERS);

  const [data, setData] = useState<AdminAuditLogPageDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [selected, setSelected] = useState<AdminAuditLogEntryDto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const query = useMemo(
    () => ({
      page,
      page_size: applied.pageSize,
      ...(applied.actionType ? { action_type: applied.actionType } : {}),
      ...(applied.actorUsername.trim() ? { actor_username: applied.actorUsername.trim() } : {}),
      ...(applied.startDate ? { start_date: `${applied.startDate}T00:00:00.000Z` } : {}),
      ...(applied.endDate ? { end_date: `${applied.endDate}T23:59:59.999Z` } : {}),
      ...(applied.search.trim() ? { search: applied.search.trim() } : {}),
    }),
    [page, applied],
  );

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    const res = await getAdminAuditLogList(auth, query);
    if (!res.ok) {
      setData(null);
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      setBusy(false);
      return;
    }
    setData(res.data);
    setBusy(false);
  }, [auth, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setApplied(draft);
    setPage(1);
  };

  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  const openDetails = (entry: AdminAuditLogEntryDto) => {
    setSelected(entry);
    setModalOpen(true);
  };

  const targetCellLabel = (entry: AdminAuditLogEntryDto) =>
    entry.target_username || entry.target_type || '-';

  return (
    <Stack gap="md" data-testid="widget-admin-audit-log">
      <div data-testid="admin-audit-log-operation-anchor">
        <Title order={1} mb="xl">
          Journal d&apos;audit
        </Title>
      </div>

      <Tabs value={journalTab} onChange={setJournalTab}>
        <Tabs.List>
          <Tabs.Tab value="audit">Journal d&apos;audit</Tabs.Tab>
          <Tabs.Tab value="transactions" data-testid="admin-audit-log-tab-transactions">
            Journal des transactions
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="audit" pt="md">
      <Paper withBorder p="md" component="form" onSubmit={onSearchSubmit}>
        <Grid>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <NativeSelect
              label="Type d'action"
              data={ACTION_TYPE_OPTIONS}
              value={draft.actionType}
              onChange={(e) => setDraft((d) => ({ ...d, actionType: e.currentTarget.value }))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label="Acteur"
              placeholder="Filtrer par acteur…"
              value={draft.actorUsername}
              onChange={(e) => setDraft((d) => ({ ...d, actorUsername: e.currentTarget.value }))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label="Date de début"
              placeholder="AAAA-MM-JJ"
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraft((d) => ({ ...d, startDate: e.currentTarget.value }))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label="Date de fin"
              placeholder="AAAA-MM-JJ"
              type="date"
              value={draft.endDate}
              onChange={(e) => setDraft((d) => ({ ...d, endDate: e.currentTarget.value }))}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <NumberInput
              label="Taille de page"
              min={1}
              max={100}
              value={draft.pageSize}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  pageSize: typeof v === 'number' && v > 0 ? Math.min(100, v) : 20,
                }))
              }
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Recherche"
              placeholder="Rechercher dans les descriptions…"
              value={draft.search}
              onChange={(e) => setDraft((d) => ({ ...d, search: e.currentTarget.value }))}
            />
          </Grid.Col>
        </Grid>
        <Group mt="md" gap="sm">
          <Button type="submit" size="sm" leftSection={<Search size={16} />} loading={busy}>
            Rechercher
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            leftSection={<RefreshCw size={16} />}
            onClick={resetFilters}
            disabled={busy}
          >
            Réinitialiser
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            leftSection={<Download size={16} />}
            disabled={!data || data.entries.length === 0 || busy}
            onClick={() => data && exportPageToCsv(data)}
          >
            Exporter CSV
          </Button>
        </Group>
      </Paper>

      <CashflowClientErrorAlert error={error} testId="admin-audit-log-error" />

      <Paper withBorder pos="relative" style={{ minHeight: 120 }}>
        <LoadingOverlay visible={busy} zIndex={2} />
        {!busy && !error && data && data.entries.length === 0 ? (
          <Text size="sm" c="dimmed" p="md" data-testid="admin-audit-log-empty">
            Aucune entrée sur cette page.
          </Text>
        ) : null}
        {data && data.entries.length > 0 ? (
          <>
            <Table striped highlightOnHover data-testid="admin-audit-log-table">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Timestamp</Table.Th>
                  <Table.Th>Acteur</Table.Th>
                  <Table.Th>Action</Table.Th>
                  <Table.Th>Cible</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>IP</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.entries.map((entry) => (
                  <Table.Tr key={entry.id} data-testid={`admin-audit-log-row-${entry.id}`}>
                    <Table.Td>
                      <Text size="sm">{formatTimestamp(entry.timestamp)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{entry.actor_username || 'Système'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={badgeColor(entry.action_type)} size="sm">
                        {formatActionType(entry.action_type)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{targetCellLabel(entry)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={2}>
                        {entry.description || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{entry.ip_address || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label="Voir les détails">
                        <ActionIcon variant="subtle" aria-label="Voir les détails" onClick={() => openDetails(entry)}>
                          <Eye size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {data.pagination.total_pages > 1 ? (
              <Group justify="center" mt="md" p="md">
                <Pagination
                  value={data.pagination.page}
                  onChange={(p) => setPage(p)}
                  total={data.pagination.total_pages}
                  size="sm"
                />
              </Group>
            ) : null}
            <Text size="sm" c="dimmed" p="md" ta="center" data-testid="admin-audit-log-total">
              {data.pagination.total_count} entrée(s) au total
            </Text>
          </>
        ) : null}
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Détails de l'entrée d'audit" size="lg">
        {selected ? (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" fw={500}>
                  Date et heure
                </Text>
                <Text size="sm">{formatTimestamp(selected.timestamp)}</Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" fw={500}>
                  Acteur
                </Text>
                <Text size="sm">{selected.actor_username || 'Système'}</Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" fw={500} mb={4}>
                  Action
                </Text>
                <Badge color={badgeColor(selected.action_type)} size="sm">
                  {formatActionType(selected.action_type)}
                </Badge>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" fw={500}>
                  Cible
                </Text>
                <Text size="sm">{selected.target_username || selected.target_type || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="sm" fw={500}>
                  Description
                </Text>
                <Text size="sm">{selected.description || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" fw={500}>
                  Adresse IP
                </Text>
                <Text size="sm">{selected.ip_address || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" fw={500}>
                  Navigateur
                </Text>
                <Text size="sm" lineClamp={3}>
                  {selected.user_agent || '-'}
                </Text>
              </Grid.Col>
              {selected.details != null ? (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">
                    Détails
                  </Text>
                  <Paper p="sm" withBorder>
                    <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap' }}>
                      {formatDetailsForDisplay(selected.details)}
                    </Text>
                  </Paper>
                </Grid.Col>
              ) : null}
            </Grid>
          </div>
        ) : null}
      </Modal>
        </Tabs.Panel>

        <Tabs.Panel value="transactions" pt="md">
          <TransactionLogsPanel />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
