import { Alert, Badge, Button, Grid, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getReceptionTicketDetail,
  postReceptionTicketDownloadToken,
  type ReceptionTicketDetail,
} from '../../api/reception-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from '../cashflow/CashflowClientErrorAlert';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';
import {
  destinationLabel,
  formatReceptionDateTimeFr,
  formatReceptionWeightKg,
  ligneFlowPresentation,
  receptionStatusPresentation,
  receptionWeightMetricsFromLignes,
} from './reception-admin-display';

function resolveSameOriginDownloadUrl(downloadUrl: string): string {
  if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
    return downloadUrl;
  }
  if (typeof window !== 'undefined' && downloadUrl.startsWith('/')) {
    return `${window.location.origin}${downloadUrl}`;
  }
  return downloadUrl;
}

function ticketIdFromPath(pathname: string): string | null {
  const m = /^\/admin\/reception-tickets\/([^/]+)\/?$/.exec(pathname);
  return m?.[1]?.trim() ? m[1]!.trim() : null;
}

function KpiCard(props: { label: string; value: string; color?: string }): ReactNode {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {props.label}
      </Text>
      <Text fw={700} size="lg" c={props.color}>
        {props.value}
      </Text>
    </Paper>
  );
}

/**
 * Détail ticket réception admin — lecture seule, export fichier lorsque le serveur l'autorise.
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
  const [exportBusy, setExportBusy] = useState(false);

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

  const metrics = useMemo(() => (ticket ? receptionWeightMetricsFromLignes(ticket.lignes) : null), [ticket]);

  const onExport = async () => {
    if (!ticketId) return;
    setExportBusy(true);
    try {
      const res = await postReceptionTicketDownloadToken(ticketId, auth);
      if (!res.ok) {
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        return;
      }
      const href = resolveSameOriginDownloadUrl(res.downloadUrl);
      window.open(href, '_blank', 'noopener,noreferrer');
    } finally {
      setExportBusy(false);
    }
  };

  if (!ticketId) {
    return (
      <Alert color="gray" title="Adresse incomplète" data-testid="admin-reception-ticket-bad-url">
        <Text size="sm">
          Ouvrez ce détail depuis la liste des sessions de réception, ou indiquez l'identifiant du ticket dans l'URL.
        </Text>
      </Alert>
    );
  }

  const lignes = ticket?.lignes ?? [];
  const st = ticket ? receptionStatusPresentation(ticket.status) : null;

  return (
    <div data-testid="admin-reception-ticket-detail">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <div>
            <Button
              type="button"
              variant="default"
              size="xs"
              leftSection={<ArrowLeft size={14} aria-hidden />}
              mb="sm"
              onClick={() => spaNavigateTo('/admin/reception-sessions')}
            >
              Retour à la liste
            </Button>
            <Title order={3} data-testid="admin-reception-ticket-detail-operation-anchor">
              Détail du ticket de réception
            </Title>
            <Text size="sm" c="dimmed" mt={4} data-testid="admin-reception-ticket-meta">
              Identifiant :{' '}
              <Text span ff="monospace" size="sm">
                {ticketId}
              </Text>
              {ticket ? (
                <>
                  {' '}
                  · Poste {ticket.poste_id} · {st?.label ?? ticket.status}
                </>
              ) : null}
            </Text>
          </div>
          <Group gap="xs">
            <Button type="button" size="xs" variant="light" loading={busy} onClick={() => void load()}>
              Rafraîchir
            </Button>
            <Button type="button" size="xs" variant="filled" loading={exportBusy} onClick={() => void onExport()}>
              Exporter le ticket
            </Button>
          </Group>
        </Group>

        <CashflowClientErrorAlert error={error} testId="admin-reception-ticket-detail-error" />

        {ticket && st && metrics ? (
          <>
            <Paper withBorder p="md">
              <Grid gutter="md">
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Bénévole
                  </Text>
                  <Text fw={600}>{ticket.benevole_username?.trim() || 'Inconnu'}</Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Poste
                  </Text>
                  <Text fw={600} ff="monospace">
                    {ticket.poste_id}
                  </Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Statut
                  </Text>
                  <Badge color={st.color} variant="light" size="lg" mt={4}>
                    {st.label}
                  </Badge>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Date de création
                  </Text>
                  <Text fw={600}>{formatReceptionDateTimeFr(ticket.created_at)}</Text>
                </Grid.Col>
                {ticket.closed_at ? (
                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                      Date de fermeture
                    </Text>
                    <Text fw={600}>{formatReceptionDateTimeFr(ticket.closed_at)}</Text>
                  </Grid.Col>
                ) : null}
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Lignes enregistrées
                  </Text>
                  <Text fw={600}>{lignes.length}</Text>
                </Grid.Col>
              </Grid>
            </Paper>

            <Grid gutter="xs">
              <Grid.Col span={{ base: 6, md: 3 }}>
                <KpiCard label="Poids total traité" value={formatReceptionWeightKg(metrics.totalProcessed)} />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <KpiCard
                  label="Entrée boutique"
                  value={formatReceptionWeightKg(metrics.enteredBoutique)}
                  color="green.7"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <KpiCard
                  label="Recyclage direct"
                  value={formatReceptionWeightKg(metrics.recycledDirect)}
                  color="orange.7"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <KpiCard
                  label="Sortie boutique"
                  value={formatReceptionWeightKg(metrics.recycledFromBoutique)}
                  color="red.7"
                />
              </Grid.Col>
            </Grid>
          </>
        ) : null}

        {lignes.length > 0 ? (
          <Stack gap="xs">
            <Title order={4}>Lignes de dépôt ({lignes.length})</Title>
            <Table striped highlightOnHover data-testid="admin-reception-ticket-lignes-table" mb="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Catégorie</Table.Th>
                  <Table.Th>Poids</Table.Th>
                  <Table.Th>Type de flux</Table.Th>
                  <Table.Th>Destination</Table.Th>
                  <Table.Th>Notes</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {lignes.map((l) => {
                  const flow = ligneFlowPresentation(l);
                  return (
                    <Table.Tr key={l.id} data-testid={`admin-reception-ticket-ligne-${l.id}`}>
                      <Table.Td>{l.category_label?.trim() || 'Non spécifiée'}</Table.Td>
                      <Table.Td>{formatReceptionWeightKg(l.poids_kg)}</Table.Td>
                      <Table.Td>
                        <Badge color={flow.color} size="sm" variant="light">
                          {flow.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{destinationLabel(l.destination)}</Table.Td>
                      <Table.Td>
                        <Text size="sm">{l.notes?.trim() || '—'}</Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Stack>
        ) : null}

        {!busy && ticket && lignes.length === 0 ? (
          <Text size="sm" c="dimmed" mb="md" data-testid="admin-reception-ticket-empty-lignes">
            Aucune ligne de dépôt sur ce ticket.
          </Text>
        ) : null}

        <Text size="xs" c="dimmed" data-testid="admin-reception-ticket-sensitive-note">
          La fermeture du ticket et la modification du poids d&apos;une ligne se font depuis l&apos;administration
          complète, avec les droits adaptés.
        </Text>
      </Stack>
    </div>
  );
}
