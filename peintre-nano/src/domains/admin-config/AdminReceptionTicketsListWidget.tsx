import { Alert, Button, Group, Paper, Stack, Table, Text } from '@mantine/core';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { getReceptionTicketsList, type ReceptionTicketSummary } from '../../api/reception-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from '../cashflow/CashflowClientErrorAlert';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';
/**
 * Story 19.2 — liste tickets réception (`recyclique_reception_listTickets`) pour le rail admin
 * `/admin/reception-sessions` ; champs strictement `ReceptionTicketSummary` ; drill-down manifesté.
 */
export function AdminReceptionTicketsListWidget(_: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<readonly ReceptionTicketSummary[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await getReceptionTicketsList(auth, { page, per_page: 20 });
      if (!res.ok) {
        setRows([]);
        setTotalPages(0);
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        return;
      }
      setRows(res.data.tickets);
      setTotalPages(Number.isFinite(res.data.total_pages) ? res.data.total_pages : 0);
    } finally {
      setBusy(false);
    }
  }, [auth, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div data-testid="widget-admin-reception-tickets-list">
      <Stack gap="md">
        <Text size="sm" c="dimmed" data-testid="admin-reception-tickets-operation-anchors">
          Données via <code>GET /v1/reception/tickets</code> — <code>recyclique_reception_listTickets</code> (
          <code>reception-client.ts</code>).
        </Text>
        <Group gap="sm">
          <Button type="button" size="xs" variant="light" loading={busy} onClick={() => void load()}>
            Rafraîchir
          </Button>
          <Button
            type="button"
            size="xs"
            variant="default"
            disabled={page <= 1 || busy}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Page précédente
          </Button>
          <Button
            type="button"
            size="xs"
            variant="default"
            disabled={busy || totalPages === 0 || page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Page suivante
          </Button>
          <Text size="xs" c="dimmed">
            Page {page}
            {totalPages > 0 ? ` / ${totalPages}` : ''}
          </Text>
        </Group>
        <CashflowClientErrorAlert error={error} testId="admin-reception-tickets-list-error" />
        {!busy && !error && rows.length === 0 ? (
          <Text size="sm" c="dimmed" data-testid="admin-reception-tickets-list-empty">
            Aucun ticket sur cette page.
          </Text>
        ) : null}
        {rows.length > 0 ? (
          <Table striped highlightOnHover data-testid="admin-reception-tickets-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Ticket</Table.Th>
                <Table.Th>Poste</Table.Th>
                <Table.Th>Bénévole</Table.Th>
                <Table.Th>Créé</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Lignes</Table.Th>
                <Table.Th>Poids total</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((t) => (
                <Table.Tr key={t.id} data-testid={`admin-reception-ticket-row-${t.id}`}>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {t.id}
                    </Text>
                  </Table.Td>
                  <Table.Td>{t.poste_id}</Table.Td>
                  <Table.Td>{t.benevole_username || '—'}</Table.Td>
                  <Table.Td>{t.created_at || '—'}</Table.Td>
                  <Table.Td>{t.status || '—'}</Table.Td>
                  <Table.Td>{t.total_lignes}</Table.Td>
                  <Table.Td>{t.total_poids}</Table.Td>
                  <Table.Td>
                    <Button
                      type="button"
                      size="xs"
                      variant="light"
                      onClick={() => spaNavigateTo(`/admin/reception-tickets/${encodeURIComponent(t.id)}`)}
                      data-testid={`admin-reception-ticket-open-${t.id}`}
                    >
                      Détail
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : null}
        <Alert color="gray" title="Actions hors périmètre lecture (Story 19.2)" data-testid="admin-reception-tickets-scope-note">
          <Text size="sm">
            Fermeture ticket, export CSV, jeton téléchargement, patch poids ligne, export bulk admin : non branchés —{' '}
            <strong>Epic 16</strong> / step-up ; pas d&apos;appel silencieux à ces <code>operation_id</code>.
          </Text>
        </Alert>
        <Paper withBorder p="sm" mt="xs" data-testid="admin-reception-tickets-drilldown-note">
          <Text size="xs" c="dimmed" fw={600} mb={4}>
            Drill-down manifesté (Story 19.2)
          </Text>
          <Text size="sm">
            Le bouton « Détail » ouvre la page CREOS <code>admin-reception-ticket-detail</code> sur{' '}
            <code>/admin/reception-tickets/&lt;id&gt;</code>, alimentée par{' '}
            <code>recyclique_reception_getTicketDetail</code> (<code>reception-client.ts</code>).
          </Text>
        </Paper>
      </Stack>
    </div>
  );
}
