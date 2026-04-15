import { Alert, Badge, Button, Grid, Group, NumberInput, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getReceptionTicketDetail,
  patchReceptionLigneWeight,
  postCloseReceptionTicket,
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
  formatReceptionCompactId,
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

function KpiCard(props: { label: string; value: ReactNode; color?: string; testId?: string }): ReactNode {
  return (
    <Paper withBorder p="md" radius="md" data-testid={props.testId}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {props.label}
      </Text>
      <Text component="div" fw={700} size="lg" c={props.color}>
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
  const [closeBusy, setCloseBusy] = useState(false);
  const [editingWeightLigneId, setEditingWeightLigneId] = useState<string | null>(null);
  const [editingWeightValue, setEditingWeightValue] = useState<number>(0);
  const [patchBusy, setPatchBusy] = useState<string | null>(null);

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

  const onCloseTicket = async () => {
    if (!ticketId) return;
    setCloseBusy(true);
    setError(null);
    try {
      const res = await postCloseReceptionTicket(ticketId, auth);
      if (!res.ok) {
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        return;
      }
      await load();
    } finally {
      setCloseBusy(false);
    }
  };

  const beginWeightEdit = (ligneId: string, poidsKg: number) => {
    setError(null);
    setEditingWeightLigneId(ligneId);
    setEditingWeightValue(poidsKg);
  };

  const cancelWeightEdit = () => {
    setEditingWeightLigneId(null);
    setEditingWeightValue(0);
  };

  const onPatchWeight = async () => {
    if (!ticketId || !editingWeightLigneId) return;
    setPatchBusy(editingWeightLigneId);
    setError(null);
    try {
      const res = await patchReceptionLigneWeight(ticketId, editingWeightLigneId, editingWeightValue, auth);
      if (!res.ok) {
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        return;
      }
      cancelWeightEdit();
      await load();
    } finally {
      setPatchBusy(null);
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
  const ticketDisplay = formatReceptionCompactId(ticketId);
  const posteDisplay = formatReceptionCompactId(ticket?.poste_id ?? '');

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
              <Text span ff="monospace" size="sm" title={ticketDisplay.title}>
                {ticketDisplay.display}
              </Text>
              {ticket ? (
                <>
                  {' '}
                  · Poste{' '}
                  <Text span ff="monospace" size="sm" title={posteDisplay.title}>
                    {posteDisplay.display}
                  </Text>{' '}
                  · {st?.label ?? ticket.status}
                </>
              ) : null}
            </Text>
          </div>
          <Group gap="xs">
            {ticket?.status === 'opened' ? (
              <Button
                type="button"
                size="xs"
                color="yellow"
                variant="filled"
                loading={closeBusy}
                onClick={() => void onCloseTicket()}
                data-testid="admin-reception-ticket-close"
              >
                Clôturer le ticket
              </Button>
            ) : null}
            <Button type="button" size="xs" variant="light" loading={busy} onClick={() => void load()}>
              Rafraîchir
            </Button>
            <Button type="button" size="xs" variant="filled" loading={exportBusy} onClick={() => void onExport()}>
              Télécharger CSV
            </Button>
          </Group>
        </Group>

        <CashflowClientErrorAlert error={error} testId="admin-reception-ticket-detail-error" />

        {ticket && st && metrics ? (
          <Paper withBorder p="md" data-testid="admin-reception-ticket-summary-panel">
            <Grid gutter="xs">
              <Grid.Col span={{ base: 6, md: 3 }}>
                <KpiCard
                  label="Bénévole"
                  value={ticket.benevole_username?.trim() || 'Inconnu'}
                  testId="admin-reception-ticket-summary-benevole"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <KpiCard
                  label="Date création"
                  value={formatReceptionDateTimeFr(ticket.created_at)}
                  testId="admin-reception-ticket-summary-created-at"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <KpiCard
                  label="Statut"
                  value={
                    <Badge color={st.color} variant="light" size="lg" mt={4}>
                      {st.label}
                    </Badge>
                  }
                  testId="admin-reception-ticket-summary-status"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <KpiCard
                  label="Poids total traité"
                  value={formatReceptionWeightKg(metrics.totalProcessed)}
                  testId="admin-reception-ticket-summary-total"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <KpiCard
                  label="Entrée boutique"
                  value={formatReceptionWeightKg(metrics.enteredBoutique)}
                  color="green.7"
                  testId="admin-reception-ticket-summary-entered"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <KpiCard
                  label="Recyclage direct"
                  value={formatReceptionWeightKg(metrics.recycledDirect)}
                  color="orange.7"
                  testId="admin-reception-ticket-summary-direct"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <KpiCard
                  label="Sortie boutique"
                  value={formatReceptionWeightKg(metrics.recycledFromBoutique)}
                  color="red.7"
                  testId="admin-reception-ticket-summary-exit"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <KpiCard label="Nombre de lignes" value={String(lignes.length)} testId="admin-reception-ticket-summary-lines" />
              </Grid.Col>
              {ticket.closed_at ? (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <KpiCard
                    label="Date fermeture"
                    value={formatReceptionDateTimeFr(ticket.closed_at)}
                    testId="admin-reception-ticket-summary-closed-at"
                  />
                </Grid.Col>
              ) : null}
              <Grid.Col span={{ base: 12, md: ticket.closed_at ? 6 : 12 }}>
                <KpiCard
                  label="Poste"
                  value={
                    <Text ff="monospace" title={posteDisplay.title}>
                      {posteDisplay.display}
                    </Text>
                  }
                  testId="admin-reception-ticket-summary-poste"
                />
              </Grid.Col>
            </Grid>
          </Paper>
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
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {lignes.map((l) => {
                  const flow = ligneFlowPresentation(l);
                  const editingThisRow = editingWeightLigneId === l.id;
                  return (
                    <Table.Tr key={l.id} data-testid={`admin-reception-ticket-ligne-${l.id}`}>
                      <Table.Td>{l.category_label?.trim() || 'Non spécifiée'}</Table.Td>
                      <Table.Td>
                        {editingThisRow ? (
                          <NumberInput
                            aria-label={`Poids ligne ${l.id}`}
                            min={0.001}
                            step={0.1}
                            decimalScale={3}
                            value={editingWeightValue}
                            onChange={(value) => setEditingWeightValue(typeof value === 'number' ? value : Number(value) || 0)}
                            data-testid={`admin-reception-ticket-ligne-poids-input-${l.id}`}
                          />
                        ) : (
                          formatReceptionWeightKg(l.poids_kg)
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={flow.color} size="sm" variant="light">
                          {flow.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{destinationLabel(l.destination)}</Table.Td>
                      <Table.Td>
                        <Text size="sm">{l.notes?.trim() || '—'}</Text>
                      </Table.Td>
                      <Table.Td>
                        {editingThisRow ? (
                          <Group gap={6} wrap="nowrap">
                            <Button
                              type="button"
                              size="compact-xs"
                              variant="filled"
                              loading={patchBusy === l.id}
                              disabled={editingWeightValue <= 0}
                              onClick={() => void onPatchWeight()}
                              data-testid={`admin-reception-ticket-save-weight-${l.id}`}
                            >
                              Enregistrer
                            </Button>
                            <Button
                              type="button"
                              size="compact-xs"
                              variant="default"
                              disabled={patchBusy === l.id}
                              onClick={cancelWeightEdit}
                              data-testid={`admin-reception-ticket-cancel-weight-${l.id}`}
                            >
                              Annuler
                            </Button>
                          </Group>
                        ) : (
                          <Button
                            type="button"
                            size="compact-xs"
                            variant="light"
                            onClick={() => beginWeightEdit(l.id, l.poids_kg)}
                            data-testid={`admin-reception-ticket-edit-weight-${l.id}`}
                          >
                            Modifier poids
                          </Button>
                        )}
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
          Fermeture du ticket et modification du poids d&apos;une ligne : administration complète (droits adaptés).
        </Text>
      </Stack>
    </div>
  );
}
