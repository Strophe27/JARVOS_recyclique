import { Alert, Button, Stack, Table, Text } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getReceptionTicketDetail, type ReceptionTicketDetail } from '../../api/reception-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from '../cashflow/CashflowClientErrorAlert';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';

function ticketIdFromPath(pathname: string): string | null {
  const m = /^\/admin\/reception-tickets\/([^/]+)\/?$/.exec(pathname);
  return m?.[1]?.trim() ? m[1]!.trim() : null;
}

/**
 * Story 19.2 — détail ticket réception admin (`recyclique_reception_getTicketDetail`), lecture seule ;
 * exclusions visibles pour mutations / exports (AC4).
 */
export function AdminReceptionTicketDetailWidget(_props: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  const [pathname, setPathname] = useState(
    () => (typeof window !== 'undefined' ? window.location.pathname : ''),
  );
  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const ticketId = useMemo(() => ticketIdFromPath(pathname), [pathname]);

  const [ticket, setTicket] = useState<ReceptionTicketDetail | null>(null);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!ticketId) {
      setTicket(null);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await getReceptionTicketDetail(ticketId, auth);
      if (!res.ok) {
        setTicket(null);
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        return;
      }
      setTicket(res.ticket);
    } finally {
      setBusy(false);
    }
  }, [ticketId, auth]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ticketId) {
    return (
      <Alert color="gray" title="URL attendue" data-testid="admin-reception-ticket-bad-url">
        <Text size="sm">
          Ouvrez une URL du type <code>/admin/reception-tickets/&lt;uuid&gt;</code> (lien depuis la liste sessions ou
          bookmark admin).
        </Text>
      </Alert>
    );
  }

  const lignes = ticket?.lignes ?? [];

  return (
    <div data-testid="admin-reception-ticket-detail">
      <Text fw={600} mb="xs" data-testid="admin-reception-ticket-detail-operation-anchor">
        Ticket <code>{ticketId}</code> — <code>{'GET /v1/reception/tickets/{ticket_id}'}</code> (
        <code>recyclique_reception_getTicketDetail</code>)
      </Text>
      <Button type="button" size="xs" variant="light" mb="sm" loading={busy} onClick={() => void load()}>
        Rafraîchir
      </Button>
      <CashflowClientErrorAlert error={error} testId="admin-reception-ticket-detail-error" />
      {ticket ? (
        <Stack gap="sm" mb="md">
          <Text size="sm" c="dimmed" data-testid="admin-reception-ticket-meta">
            Poste : {ticket.poste_id} — bénévole : {ticket.benevole_username || '—'} — statut : {ticket.status} — créé
            : {ticket.created_at}
            {ticket.closed_at ? ` — clôturé : ${ticket.closed_at}` : ''}
          </Text>
        </Stack>
      ) : null}
      {lignes.length > 0 ? (
        <Table striped highlightOnHover data-testid="admin-reception-ticket-lignes-table" mb="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Ligne</Table.Th>
              <Table.Th>Catégorie</Table.Th>
              <Table.Th>Poids kg</Table.Th>
              <Table.Th>Destination</Table.Th>
              <Table.Th>Sortie</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lignes.map((l) => (
              <Table.Tr key={l.id} data-testid={`admin-reception-ticket-ligne-${l.id}`}>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {l.id}
                  </Text>
                </Table.Td>
                <Table.Td>{l.category_label}</Table.Td>
                <Table.Td>{l.poids_kg}</Table.Td>
                <Table.Td>{l.destination}</Table.Td>
                <Table.Td>{l.is_exit ? 'oui' : 'non'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : null}
      {!busy && ticket && lignes.length === 0 ? (
        <Text size="sm" c="dimmed" mb="md" data-testid="admin-reception-ticket-empty-lignes">
          Aucune ligne sur ce ticket.
        </Text>
      ) : null}

      <Alert color="orange" title="Non disponible dans le rail U lecture (19.2)" data-testid="admin-reception-ticket-excluded-actions">
        <Text size="sm">
          Les actions <code>recyclique_reception_closeTicket</code>,{' '}
          <code>recyclique_reception_createTicketDownloadToken</code>, <code>recyclique_reception_exportTicketCsv</code>,{' '}
          <code>recyclique_reception_patchLigneWeight</code> et l&apos;export bulk{' '}
          <code>recyclique_admin_reports_receptionTicketsExportBulk</code> restent hors UI tant que l&apos;autorité + step-up{' '}
          <strong>Epic 16</strong> n&apos;est pas stabilisée — exclusion volontaire et visible.
        </Text>
      </Alert>
    </div>
  );
}
