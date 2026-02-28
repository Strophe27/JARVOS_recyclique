/**
 * Détail ticket réception + lignes de dépôt — Story 6.1, 6.2, 11.3.
 * Alignement visuel 1.4.4 (Mantine Card, typo, espacements). Accessibilité NFR-A1.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Stack,
  Title,
  Text,
  Anchor,
  Button,
  Table,
  NumberInput,
  Select,
  TextInput,
  Checkbox,
  Group,
  Modal,
  Card,
  Alert,
  Loader,
} from '@mantine/core';
import {
  getTicket,
  getCategoriesEntryTickets,
  createLigne,
  updateLigne,
  updateLigneWeight,
  deleteLigne,
  exportTicketCsv,
  closeTicket,
} from '../api/reception';
import type {
  TicketDepotItem,
  LigneDepotItem,
  CategoryEntryItem,
} from '../api/reception';
import { useAuth } from '../auth/AuthContext';
import { PageContainer } from '../shared/layout';

const DESTINATION_OPTIONS = [
  { value: 'recyclage', label: 'Recyclage' },
  { value: 'revente', label: 'Revente' },
  { value: 'destruction', label: 'Destruction' },
  { value: 'don', label: 'Don' },
  { value: 'autre', label: 'Autre' },
];

export function ReceptionTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { accessToken } = useAuth();
  const [ticket, setTicket] = useState<TicketDepotItem | null>(null);
  const [categories, setCategories] = useState<CategoryEntryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Formulaire ajout ligne
  const [poidsKg, setPoidsKg] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isExit, setIsExit] = useState(false);
  const [submitPending, setSubmitPending] = useState(false);
  // État dédié à la modal « Modifier » (séparé du formulaire d'ajout)
  const [editLigne, setEditLigne] = useState<LigneDepotItem | null>(null);
  const [editPoidsKg, setEditPoidsKg] = useState<number | ''>('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editDestination, setEditDestination] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editIsExit, setEditIsExit] = useState(false);
  // Modal « Modifier le poids »
  const [weightLigne, setWeightLigne] = useState<LigneDepotItem | null>(null);
  const [editWeightValue, setEditWeightValue] = useState<number | ''>('');
  const [exportCsvPending, setExportCsvPending] = useState(false);
  const [closeTicketPending, setCloseTicketPending] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const [t, cats] = await Promise.all([
        getTicket(accessToken, ticketId),
        getCategoriesEntryTickets(accessToken),
      ]);
      setTicket(t);
      setCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = useCallback(() => {
    setPoidsKg('');
    setCategoryId(null);
    setDestination(null);
    setNotes('');
    setIsExit(false);
  }, []);

  const handleAddLigne = useCallback(async () => {
    if (!accessToken || !ticketId || destination === null || poidsKg === '' || Number(poidsKg) <= 0) return;
    setSubmitPending(true);
    try {
      await createLigne(accessToken, {
        ticket_id: ticketId,
        category_id: categoryId || undefined,
        poids_kg: Number(poidsKg),
        destination,
        notes: notes.trim() || undefined,
        is_exit: isExit,
      });
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur ajout ligne');
    } finally {
      setSubmitPending(false);
    }
  }, [accessToken, ticketId, destination, poidsKg, categoryId, notes, isExit, resetForm, load]);

  const handleUpdateLigne = useCallback(async () => {
    if (!accessToken || !editLigne || editPoidsKg === '' || Number(editPoidsKg) <= 0 || editDestination === null) return;
    setSubmitPending(true);
    try {
      await updateLigne(accessToken, editLigne.id, {
        poids_kg: Number(editPoidsKg),
        category_id: editCategoryId,
        destination: editDestination,
        notes: editNotes.trim() || null,
        is_exit: editIsExit,
      });
      setEditLigne(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur modification ligne');
    } finally {
      setSubmitPending(false);
    }
  }, [accessToken, editLigne, editPoidsKg, editCategoryId, editDestination, editNotes, editIsExit, load]);

  const handleUpdateWeight = useCallback(async () => {
    if (!accessToken || !ticketId || !weightLigne || editWeightValue === '' || Number(editWeightValue) <= 0) return;
    setSubmitPending(true);
    try {
      await updateLigneWeight(accessToken, ticketId, weightLigne.id, Number(editWeightValue));
      setWeightLigne(null);
      setEditWeightValue('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur modification poids');
    } finally {
      setSubmitPending(false);
    }
  }, [accessToken, ticketId, weightLigne, editWeightValue, load]);

  const handleDeleteLigne = useCallback(async (ligne: LigneDepotItem) => {
    if (!accessToken || !window.confirm('Supprimer cette ligne ?')) return;
    try {
      await deleteLigne(accessToken, ligne.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur suppression');
    }
  }, [accessToken, load]);

  const openEdit = useCallback((l: LigneDepotItem) => {
    setEditLigne(l);
    setEditPoidsKg(l.poids_kg);
    setEditCategoryId(l.category_id);
    setEditDestination(l.destination);
    setEditNotes(l.notes ?? '');
    setEditIsExit(l.is_exit);
  }, []);

  const openWeight = useCallback((l: LigneDepotItem) => {
    setWeightLigne(l);
    setEditWeightValue(l.poids_kg);
  }, []);

  const handleExportCsv = useCallback(async () => {
    if (!accessToken || !ticketId) return;
    setExportCsvPending(true);
    try {
      await exportTicketCsv(accessToken, ticketId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur export CSV');
    } finally {
      setExportCsvPending(false);
    }
  }, [accessToken, ticketId]);

  const handleCloseTicket = useCallback(async () => {
    if (!accessToken || !ticketId) return;
    setCloseTicketPending(true);
    setError(null);
    try {
      const updated = await closeTicket(accessToken, ticketId);
      setTicket(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur fermeture ticket');
    } finally {
      setCloseTicketPending(false);
    }
  }, [accessToken, ticketId]);

  if (!ticketId) {
    return <Text data-testid="reception-ticket-detail-missing-id">ID ticket manquant</Text>;
  }
  if (loading) return <Loader size="sm" data-testid="reception-ticket-detail-loading" />;
  if (error) return <Alert color="red" data-testid="reception-ticket-detail-error">{error}</Alert>;
  if (!ticket) return null;

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const lignes = ticket.lignes ?? [];

  return (
    <PageContainer title="Detail ticket reception" maxWidth={1100} testId="reception-ticket-detail-page">
      <Anchor component={Link} to="/reception" size="sm">← Retour réception</Anchor>

      <Card withBorder padding="md" radius="md">
        <Title order={1} mb="xs">Ticket {ticket.id.slice(0, 8)}…</Title>
        <Stack gap="xs" mb="md">
          <Text size="sm"><strong>Statut :</strong> {ticket.status}</Text>
          <Text size="sm">Créé le : {new Date(ticket.created_at).toLocaleString()}</Text>
          {ticket.closed_at && (
            <Text size="sm">Fermé le : {new Date(ticket.closed_at).toLocaleString()}</Text>
          )}
        </Stack>
        <Group>
          <Button
            variant="light"
            onClick={handleExportCsv}
            loading={exportCsvPending}
            data-testid="reception-ticket-export-csv-btn"
          >
            Export CSV
          </Button>
          {ticket.status === 'opened' && (
            <Button
              variant="light"
              color="red"
              loading={closeTicketPending}
              onClick={handleCloseTicket}
              data-testid="reception-ticket-close-btn"
            >
              Fermer le ticket
            </Button>
          )}
        </Group>
      </Card>

      <Card withBorder padding="md" radius="md">
        <Title order={2} size="h3" mb="sm">Ajouter une ligne</Title>
        <Stack gap="sm" maw={400} role="form" aria-label="Ajouter une ligne de dépôt">
        <NumberInput
          label="Poids (kg)"
          description="Obligatoire"
          value={poidsKg}
          onChange={(v) => setPoidsKg(v === '' ? '' : (typeof v === 'number' ? v : Number(v)))}
          min={0.001}
          step={0.1}
          decimalScale={3}
          data-testid="reception-ligne-poids"
          required
          aria-required="true"
        />
        <Select
          label="Catégorie"
          data={categoryOptions}
          value={categoryId}
          onChange={setCategoryId}
          clearable
          data-testid="reception-ligne-category"
        />
        <Select
          label="Destination"
          data={DESTINATION_OPTIONS}
          value={destination}
          onChange={setDestination}
          data-testid="reception-ligne-destination"
          required
          aria-required="true"
        />
        <TextInput
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          data-testid="reception-ligne-notes"
        />
        <Checkbox
          label="Sortie stock"
          checked={isExit}
          onChange={(e) => setIsExit(e.currentTarget.checked)}
          data-testid="reception-ligne-is-exit"
        />
        <Button
          onClick={handleAddLigne}
          loading={submitPending}
          disabled={poidsKg === '' || Number(poidsKg) <= 0 || !destination}
          data-testid="reception-ligne-submit"
        >
          Ajouter la ligne
        </Button>
        </Stack>
      </Card>

      <Card withBorder padding="md" radius="md">
        <Title order={2} size="h3" mb="sm">Lignes ({lignes.length})</Title>
        {lignes.length === 0 ? (
          <Text size="sm" c="dimmed" data-testid="reception-lignes-empty">Aucune ligne.</Text>
        ) : (
        <Table data-testid="reception-lignes-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Poids (kg)</Table.Th>
              <Table.Th>Catégorie</Table.Th>
              <Table.Th>Destination</Table.Th>
              <Table.Th>Notes</Table.Th>
              <Table.Th>Sortie</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lignes.map((l) => (
              <Table.Tr key={l.id} data-testid={`reception-ligne-row-${l.id}`}>
                <Table.Td>{Number(l.poids_kg)}</Table.Td>
                <Table.Td>{categories.find((c) => c.id === l.category_id)?.name ?? '—'}</Table.Td>
                <Table.Td>{l.destination}</Table.Td>
                <Table.Td>{l.notes ?? '—'}</Table.Td>
                <Table.Td>{l.is_exit ? 'Oui' : 'Non'}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button
                      size="compact-xs"
                      variant="light"
                      onClick={() => openEdit(l)}
                      data-testid={`reception-ligne-edit-${l.id}`}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="light"
                      onClick={() => openWeight(l)}
                      data-testid={`reception-ligne-weight-${l.id}`}
                    >
                      Poids
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="red"
                      onClick={() => handleDeleteLigne(l)}
                      data-testid={`reception-ligne-delete-${l.id}`}
                    >
                      Supprimer
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        )}
      </Card>

      <Modal
        opened={editLigne !== null}
        onClose={() => setEditLigne(null)}
        title="Modifier la ligne"
        data-testid="reception-edit-ligne-modal"
      >
        {editLigne && (
          <Stack gap="sm" role="form" aria-label="Modifier la ligne de dépôt">
            <NumberInput
              label="Poids (kg)"
              value={editPoidsKg}
              onChange={(v) => setEditPoidsKg(v === '' ? '' : (typeof v === 'number' ? v : Number(v)))}
              min={0.001}
              step={0.1}
              decimalScale={3}
              aria-required="true"
            />
            <Select
              label="Catégorie"
              data={categoryOptions}
              value={editCategoryId}
              onChange={setEditCategoryId}
              clearable
            />
            <Select
              label="Destination"
              data={DESTINATION_OPTIONS}
              value={editDestination}
              onChange={setEditDestination}
              aria-required="true"
            />
            <TextInput label="Notes" value={editNotes} onChange={(e) => setEditNotes(e.currentTarget.value)} />
            <Checkbox label="Sortie stock" checked={editIsExit} onChange={(e) => setEditIsExit(e.currentTarget.checked)} />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setEditLigne(null)}>Annuler</Button>
              <Button onClick={handleUpdateLigne} loading={submitPending}>Enregistrer</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={weightLigne !== null}
        onClose={() => { setWeightLigne(null); setEditWeightValue(''); }}
        title="Modifier le poids"
        data-testid="reception-weight-ligne-modal"
        aria-label="Modifier le poids de la ligne"
      >
        {weightLigne && (
          <Stack gap="sm" role="form" aria-label="Poids (kg)">
            <NumberInput
              label="Poids (kg)"
              value={editWeightValue}
              onChange={(v) => setEditWeightValue(v === '' ? '' : (typeof v === 'number' ? v : Number(v)))}
              min={0.001}
              step={0.1}
              decimalScale={3}
              aria-required="true"
              data-testid="reception-weight-modal-poids-input"
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => { setWeightLigne(null); setEditWeightValue(''); }}>Annuler</Button>
              <Button onClick={handleUpdateWeight} loading={submitPending} disabled={editWeightValue === '' || Number(editWeightValue) <= 0}>Enregistrer</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </PageContainer>
  );
}
