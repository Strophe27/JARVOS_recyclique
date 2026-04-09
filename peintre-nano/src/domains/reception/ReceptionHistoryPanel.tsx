import { Alert, Button, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { RecycliqueClientErrorAlert } from '../../api/recyclique-client-error-alert';
import { recycliqueClientFailureFromReceptionHttp } from '../../api/recyclique-api-error';
import {
  getReceptionTicketDetail,
  getReceptionTicketsList,
  postReceptionTicketDownloadToken,
  type ReceptionTicketDetail,
  type ReceptionTicketSummary,
} from '../../api/reception-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';
import { useReceptionEntryBlock } from './reception-entry-gate';

function resolveSameOriginDownloadUrl(downloadUrl: string): string {
  if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
    return downloadUrl;
  }
  if (typeof window !== 'undefined' && downloadUrl.startsWith('/')) {
    return `${window.location.origin}${downloadUrl}`;
  }
  return downloadUrl;
}

/**
 * Story 7.4 — historique réception : liste et détail issus de l’API uniquement (pas de vérité locale).
 */
export function ReceptionHistoryPanel(_props: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  const entry = useReceptionEntryBlock();
  const [rows, setRows] = useState<readonly ReceptionTicketSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReceptionTicketDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [surfaceError, setSurfaceError] = useState<CashflowSubmitSurfaceError | null>(null);

  const loadList = useCallback(async () => {
    setBusy(true);
    setSurfaceError(null);
    const res = await getReceptionTicketsList(auth, { page, per_page: 20 });
    setBusy(false);
    if (!res.ok) {
      setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(res) });
      setRows([]);
      setTotal(0);
      return;
    }
    setRows(res.data.tickets);
    setTotal(res.data.total);
  }, [auth, page]);

  const loadDetail = useCallback(
    async (ticketId: string) => {
      setBusy(true);
      setSurfaceError(null);
      const res = await getReceptionTicketDetail(ticketId, auth);
      setBusy(false);
      if (!res.ok) {
        setDetail(null);
        setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(res) });
        return;
      }
      setDetail(res.ticket);
    },
    [auth],
  );

  const onSelectRow = (id: string) => {
    setSelectedId(id);
    void loadDetail(id);
  };

  useEffect(() => {
    if (entry.blocked) return;
    void loadList();
  }, [entry.blocked, loadList]);

  const onExportCsv = async () => {
    if (!selectedId) return;
    setBusy(true);
    setSurfaceError(null);
    const res = await postReceptionTicketDownloadToken(selectedId, auth);
    setBusy(false);
    if (!res.ok) {
      setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(res) });
      return;
    }
    const href = resolveSameOriginDownloadUrl(res.downloadUrl);
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  if (entry.blocked) {
    return (
      <Alert color="orange" title={entry.title} data-testid="reception-history-blocked">
        {entry.body}
      </Alert>
    );
  }

  return (
    <Stack gap="md" data-testid="reception-history-panel">
      <Title order={4}>Historique réception</Title>
      <Text size="sm" c="dimmed">
        Données chargées depuis le serveur à chaque actualisation (liste paginée, détail, export admin).
      </Text>
      {surfaceError ? (
        <RecycliqueClientErrorAlert
          error={surfaceError}
          testId="reception-history-api-error"
          supportContextHint="le contexte réception"
        />
      ) : null}
      <Group>
        <Button size="xs" variant="light" loading={busy} onClick={() => void loadList()} data-testid="reception-history-refresh">
          Actualiser la liste
        </Button>
        {selectedId ? (
          <Button size="xs" variant="outline" loading={busy} onClick={() => void onExportCsv()} data-testid="reception-history-export">
            Exporter CSV (admin)
          </Button>
        ) : null}
      </Group>
      <Text size="xs" c="dimmed">
        Total : {total} ticket(s) — page {page}
      </Text>
      <Group>
        <Button
          size="compact-xs"
          variant="subtle"
          disabled={page <= 1 || busy}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Page préc.
        </Button>
        <Button size="compact-xs" variant="subtle" disabled={busy} onClick={() => setPage((p) => p + 1)}>
          Page suiv.
        </Button>
      </Group>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Statut</Table.Th>
            <Table.Th>Bénévole</Table.Th>
            <Table.Th>Créé</Table.Th>
            <Table.Th>Lignes</Table.Th>
            <Table.Th>Poids kg</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr
              key={r.id}
              onClick={() => onSelectRow(r.id)}
              style={{ cursor: 'pointer' }}
              bg={selectedId === r.id ? 'var(--mantine-color-blue-light)' : undefined}
              data-testid={`reception-history-row-${r.id}`}
            >
              <Table.Td>{r.status}</Table.Td>
              <Table.Td>{r.benevole_username}</Table.Td>
              <Table.Td>{r.created_at}</Table.Td>
              <Table.Td>{r.total_lignes}</Table.Td>
              <Table.Td>{r.total_poids}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {detail ? (
        <Paper p="md" withBorder data-testid="reception-history-detail">
          <Text fw={600}>Ticket {detail.id}</Text>
          <Text size="sm">Poste {detail.poste_id}</Text>
          <Text size="sm">{detail.lignes.length} ligne(s)</Text>
        </Paper>
      ) : null}
    </Stack>
  );
}
