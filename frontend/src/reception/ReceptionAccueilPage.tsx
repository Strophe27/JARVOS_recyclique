/**
 * Accueil réception — Story 6.1, 6.3.
 * État du poste (ouvert/fermé), boutons Ouvrir poste, Créer ticket, Fermer poste,
 * liste des tickets du poste courant. KPI live (stats/live), export lignes (période).
 * Alignement visuel 1.4.4 (Mantine Card, typo, espacements).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal, Stack, Title, Text, Group, TextInput, Anchor, Card, Alert, Loader, Table } from '@mantine/core';
import {
  getCurrentPoste,
  openPoste,
  closePoste,
  getTickets,
  createTicket,
  closeTicket,
  getReceptionStatsLive,
  exportLignesCsv,
} from '../api/reception';
import type { PosteReceptionItem, TicketDepotItem, ReceptionStatsLive } from '../api/reception';
import { useAuth } from '../auth/AuthContext';
import { PageContainer } from '../shared/layout';

export function ReceptionAccueilPage() {
  const { accessToken } = useAuth();
  const [poste, setPoste] = useState<PosteReceptionItem | null | undefined>(undefined);
  const [tickets, setTickets] = useState<TicketDepotItem[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [openedAtValue, setOpenedAtValue] = useState('');
  const [stats, setStats] = useState<ReceptionStatsLive | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [exportLignesFrom, setExportLignesFrom] = useState('');
  const [exportLignesTo, setExportLignesTo] = useState('');
  const [exportLignesPending, setExportLignesPending] = useState(false);
  const [exportLignesModal, setExportLignesModal] = useState(false);
  const [closingTicketId, setClosingTicketId] = useState<string | null>(null);

  const loadPoste = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const p = await getCurrentPoste(accessToken);
      setPoste(p);
      return p;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement poste');
      setPoste(null);
      return null;
    }
  }, [accessToken]);

  const loadTickets = useCallback(
    async (posteId: string) => {
      if (!accessToken) return;
      try {
        const res = await getTickets(accessToken, { poste_id: posteId, page: 1, page_size: 50 });
        setTickets(res.items);
        setTotalTickets(res.total);
      } catch {
        setTickets([]);
        setTotalTickets(0);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    loadPoste().then((p) => {
      if (p?.id) loadTickets(p.id);
      setLoading(false);
    });
  }, [accessToken, loadPoste, loadTickets]);

  const loadStats = useCallback(async () => {
    if (!accessToken) return;
    setStatsLoading(true);
    try {
      const s = await getReceptionStatsLive(accessToken);
      setStats(s);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    loadStats();
    const interval = setInterval(loadStats, 30_000);
    return () => clearInterval(interval);
  }, [accessToken, loadStats]);

  const handleExportLignes = useCallback(async () => {
    if (!accessToken || !exportLignesFrom || !exportLignesTo) return;
    setExportLignesPending(true);
    try {
      await exportLignesCsv(accessToken, exportLignesFrom, exportLignesTo);
      setExportLignesModal(false);
      setExportLignesFrom('');
      setExportLignesTo('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur export lignes');
    } finally {
      setExportLignesPending(false);
    }
  }, [accessToken, exportLignesFrom, exportLignesTo]);

  const handleOpenPoste = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    setLoading(true);
    try {
      const openedAt = openedAtValue.trim()
        ? new Date(openedAtValue).toISOString()
        : undefined;
      const p = await openPoste(accessToken, openedAt ? { opened_at: openedAt } : undefined);
      setPoste(p);
      setOpenModal(false);
      setOpenedAtValue('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur ouverture poste');
    } finally {
      setLoading(false);
    }
  }, [accessToken, openedAtValue]);

  const handleClosePoste = useCallback(async () => {
    if (!accessToken || !poste?.id) return;
    setError(null);
    setLoading(true);
    try {
      await closePoste(accessToken, poste.id);
      setPoste(null);
      setTickets([]);
      setTotalTickets(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur fermeture poste');
    } finally {
      setLoading(false);
    }
  }, [accessToken, poste?.id]);

  const handleCreateTicket = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    setLoading(true);
    try {
      const t = await createTicket(accessToken);
      if (poste?.id) {
        setTickets((prev) => [t, ...prev]);
        setTotalTickets((n) => n + 1);
      } else {
        setPoste({ id: t.poste_id } as PosteReceptionItem);
        setTickets([t]);
        setTotalTickets(1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur création ticket');
    } finally {
      setLoading(false);
    }
  }, [accessToken, poste?.id]);

  const handleCloseTicket = useCallback(
    async (t: TicketDepotItem) => {
      if (!accessToken || t.status !== 'opened') return;
      setClosingTicketId(t.id);
      setError(null);
      try {
        await closeTicket(accessToken, t.id);
        setTickets((prev) => prev.filter((x) => x.id !== t.id));
        setTotalTickets((n) => Math.max(0, n - 1));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur fermeture ticket');
      } finally {
        setClosingTicketId(null);
      }
    },
    [accessToken]
  );

  return (
    <PageContainer title="Réception" maxWidth={1100} testId="reception-accueil-page">
      {loading && <Loader size="sm" data-testid="reception-loading" />}
      {error && (
        <Alert color="red" data-testid="reception-error">
          {error}
        </Alert>
      )}

      <Card withBorder padding="md" radius="md" data-testid="reception-kpi-banner">
        <Title order={2} size="h3" mb="xs">
          Indicateurs
        </Title>
        {statsLoading && (
          <Text size="sm" c="dimmed">
            Chargement des indicateurs…
          </Text>
        )}
        {!statsLoading && stats && (
          <Group gap="lg">
            <Text size="sm">
              <strong>Tickets aujourd&apos;hui :</strong> {stats.tickets_today}
            </Text>
            <Text size="sm">
              <strong>Poids total (kg) :</strong> {stats.total_weight_kg}
            </Text>
            <Text size="sm">
              <strong>Lignes :</strong> {stats.lines_count}
            </Text>
          </Group>
        )}
      </Card>

      <Card withBorder padding="md" radius="md">
        <Title order={2} size="h3" mb="xs">
          Poste courant
        </Title>
        {!loading && !poste && !error && (
          <Text data-testid="reception-poste-status" c="dimmed">
            Aucun poste ouvert
          </Text>
        )}
        {!loading && poste && (
          <Text data-testid="reception-poste-status" size="sm" mb="md">
            Poste ouvert le {new Date(poste.opened_at).toLocaleString()} (statut : {poste.status})
          </Text>
        )}
        <Group>
          {!poste ? (
            <Button
              data-testid="reception-open-poste-btn"
              onClick={() => setOpenModal(true)}
              loading={loading}
            >
              Ouvrir poste
            </Button>
          ) : (
            <>
              <Button
                data-testid="reception-create-ticket-btn"
                onClick={handleCreateTicket}
                loading={loading}
              >
                Créer ticket
              </Button>
              <Button
                variant="light"
                color="red"
                data-testid="reception-close-poste-btn"
                onClick={handleClosePoste}
                loading={loading}
              >
                Fermer poste
              </Button>
            </>
          )}
        </Group>
      </Card>

      <Button
        variant="light"
        data-testid="reception-export-lignes-btn"
        onClick={() => setExportLignesModal(true)}
      >
        Export lignes (période)
      </Button>

      <Modal
        opened={openModal}
        onClose={() => { setOpenModal(false); setOpenedAtValue(''); }}
        title="Ouverture de poste"
        data-testid="reception-open-poste-modal"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Date d&apos;ouverture (optionnel, saisie différée) :
          </Text>
          <TextInput
            type="datetime-local"
            data-testid="reception-opened-at-input"
            value={openedAtValue}
            onChange={(e) => setOpenedAtValue(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => { setOpenModal(false); setOpenedAtValue(''); }}>
              Annuler
            </Button>
            <Button data-testid="reception-open-poste-submit" onClick={handleOpenPoste} loading={loading}>
              Confirmer
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={exportLignesModal}
        onClose={() => { setExportLignesModal(false); setExportLignesFrom(''); setExportLignesTo(''); }}
        title="Export lignes (période)"
        data-testid="reception-export-lignes-modal"
      >
        <Stack gap="sm">
          <TextInput
            type="date"
            label="Du"
            value={exportLignesFrom}
            onChange={(e) => setExportLignesFrom(e.currentTarget.value)}
            data-testid="reception-export-lignes-date-from"
          />
          <TextInput
            type="date"
            label="Au"
            value={exportLignesTo}
            onChange={(e) => setExportLignesTo(e.currentTarget.value)}
            data-testid="reception-export-lignes-date-to"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => { setExportLignesModal(false); setExportLignesFrom(''); setExportLignesTo(''); }}>
              Annuler
            </Button>
            <Button
              data-testid="reception-export-lignes-submit"
              onClick={handleExportLignes}
              loading={exportLignesPending}
              disabled={!exportLignesFrom || !exportLignesTo}
            >
              Télécharger CSV
            </Button>
          </Group>
        </Stack>
      </Modal>

      {poste && (
        <Card withBorder padding="md" radius="md" data-testid="reception-tickets-section">
          <Title order={2} size="h3" mb="sm">
            Tickets du poste ({totalTickets})
          </Title>
          <Table data-testid="reception-tickets-list">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Lignes</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tickets.map((t) => (
                <Table.Tr key={t.id} data-testid={`reception-ticket-row-${t.id}`}>
                  <Table.Td>
                    <Anchor
                      component={Link}
                      to={`/reception/tickets/${t.id}`}
                      size="sm"
                      data-testid={`reception-ticket-${t.id}`}
                    >
                      {t.id.slice(0, 8)}…
                    </Anchor>
                  </Table.Td>
                  <Table.Td>{new Date(t.created_at).toLocaleString()}</Table.Td>
                  <Table.Td>{t.status}</Table.Td>
                  <Table.Td>{t.lignes?.length ?? '—'}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        component={Link}
                        to={`/reception/tickets/${t.id}`}
                        variant="light"
                        size="compact-xs"
                      >
                        Détail
                      </Button>
                      {t.status === 'opened' && (
                        <Button
                          variant="light"
                          color="red"
                          size="compact-xs"
                          loading={closingTicketId === t.id}
                          onClick={() => handleCloseTicket(t)}
                          data-testid={`reception-close-ticket-${t.id}`}
                        >
                          Fermer
                        </Button>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </PageContainer>
  );
}
