import { Alert, Button, Group, NumberInput, Select, Stack, Switch, Text, TextInput } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { RecycliqueClientErrorAlert } from '../../api/recyclique-client-error-alert';
import { recycliqueClientFailureFromReceptionHttp } from '../../api/recyclique-api-error';
import {
  deleteReceptionLigne,
  getReceptionCategories,
  getReceptionTicketDetail,
  patchReceptionLigneWeight,
  postClosePoste,
  postCloseReceptionTicket,
  postCreateReceptionLigne,
  postCreateReceptionTicket,
  postOpenPoste,
  putUpdateReceptionLigne,
  type ReceptionCategoryRow,
  type ReceptionDestinationV1,
  type ReceptionLigneResponse,
  type ReceptionTicketDetail,
} from '../../api/reception-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import { FlowRenderer } from '../../flows/FlowRenderer';
import { useReceptionEntryBlock } from './reception-entry-gate';
import {
  setReceptionCriticalDataState,
  useReceptionCriticalDataState,
} from './reception-critical-data-state';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';

/** Refus serveur sur le flux nominal : ne pas laisser un état local « avancé » incohérent (Story 7.2). */
function isReceptionAuthoritativeFailure(httpStatus: number): boolean {
  return httpStatus === 401 || httpStatus === 403 || httpStatus === 409;
}

const DESTINATIONS: { value: ReceptionDestinationV1; label: string }[] = [
  { value: 'MAGASIN', label: 'Magasin' },
  { value: 'RECYCLAGE', label: 'Recyclage' },
  { value: 'DECHETERIE', label: 'Déchetterie' },
];

const DESTINATIONS_EXIT: { value: ReceptionDestinationV1; label: string }[] = [
  { value: 'RECYCLAGE', label: 'Recyclage' },
  { value: 'DECHETERIE', label: 'Déchetterie' },
];

/**
 * Story 7.1 — parcours nominal réception (poste → ticket → ligne kg → fermetures), vérité serveur uniquement.
 */
export function ReceptionNominalWizard(_props: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  const entry = useReceptionEntryBlock();
  const criticalDataState = useReceptionCriticalDataState();
  const dataStale = criticalDataState === 'DATA_STALE';
  const [activeIndex, setActiveIndex] = useState(0);
  const [posteId, setPosteId] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<ReceptionTicketDetail | null>(null);
  const [categories, setCategories] = useState<ReceptionCategoryRow[]>([]);
  const [categoriesError, setCategoriesError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [surfaceError, setSurfaceError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [poidsKg, setPoidsKg] = useState<number>(1);
  const [destination, setDestination] = useState<ReceptionDestinationV1>('MAGASIN');
  const [notes, setNotes] = useState('');
  const [isExit, setIsExit] = useState(false);
  const [editingLigneId, setEditingLigneId] = useState<string | null>(null);
  const [adminPatchLigneId, setAdminPatchLigneId] = useState<string | null>(null);
  const [adminPatchPoidsKg, setAdminPatchPoidsKg] = useState<number>(1);

  const destinationChoices = useMemo(
    () => (isExit ? DESTINATIONS_EXIT : DESTINATIONS),
    [isExit],
  );

  useEffect(() => {
    if (isExit && destination === 'MAGASIN') {
      setDestination('RECYCLAGE');
    }
  }, [isExit, destination]);

  const resetWizardAfterServerRefusal = useCallback(() => {
    setReceptionCriticalDataState('NOMINAL');
    setPosteId(null);
    setTicketId(null);
    setTicketDetail(null);
    setActiveIndex(0);
    setCategories([]);
    setCategoriesError(null);
    setCategoryId(null);
    setPoidsKg(1);
    setDestination('MAGASIN');
    setNotes('');
    setIsExit(false);
    setEditingLigneId(null);
    setAdminPatchLigneId(null);
    setAdminPatchPoidsKg(1);
  }, []);

  const clearError = () => setSurfaceError(null);

  const refreshTicket = useCallback(async (): Promise<boolean> => {
    if (!ticketId) {
      setTicketDetail(null);
      setReceptionCriticalDataState('NOMINAL');
      return true;
    }
    const r = await getReceptionTicketDetail(ticketId, auth);
    if (!r.ok) {
      setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(r) });
      if (isReceptionAuthoritativeFailure(r.status)) {
        resetWizardAfterServerRefusal();
      } else {
        setReceptionCriticalDataState('DATA_STALE');
      }
      return false;
    }
    setReceptionCriticalDataState('NOMINAL');
    setTicketDetail(r.ticket);
    if (r.ticket.status === 'opened') {
      setAdminPatchLigneId(null);
    } else if (r.ticket.lignes.length > 0) {
      const first = r.ticket.lignes[0]!;
      setAdminPatchLigneId((prev) => prev ?? first.id);
      setAdminPatchPoidsKg(first.poids_kg);
    }
    return true;
  }, [ticketId, auth, resetWizardAfterServerRefusal]);

  useEffect(() => {
    void refreshTicket();
  }, [refreshTicket]);

  const loadCategories = useCallback(async () => {
    setCategoriesError(null);
    const r = await getReceptionCategories(auth);
    if (!r.ok) {
      setCategoriesError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(r) });
      setCategories([]);
      if (isReceptionAuthoritativeFailure(r.status)) {
        resetWizardAfterServerRefusal();
      }
      return;
    }
    setCategories(r.categories);
    setCategoryId((prev) => prev ?? (r.categories[0]?.id ?? null));
  }, [auth, resetWizardAfterServerRefusal]);

  useEffect(() => {
    if (activeIndex === 2) void loadCategories();
  }, [activeIndex, loadCategories]);

  useEffect(() => {
    if (ticketDetail && ticketDetail.status !== 'opened') {
      setEditingLigneId(null);
    }
  }, [ticketDetail]);


  const onOpenPoste = async () => {
    clearError();
    setBusy('open-poste');
    try {
      const r = await postOpenPoste(auth);
      if (!r.ok) {
        setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(r) });
        if (isReceptionAuthoritativeFailure(r.status)) {
          resetWizardAfterServerRefusal();
        }
        return;
      }
      setPosteId(r.posteId);
      setActiveIndex(1);
    } finally {
      setBusy(null);
    }
  };

  const onCreateTicket = async () => {
    if (!posteId) return;
    clearError();
    setBusy('create-ticket');
    try {
      const r = await postCreateReceptionTicket(posteId, auth);
      if (!r.ok) {
        setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(r) });
        if (isReceptionAuthoritativeFailure(r.status)) {
          resetWizardAfterServerRefusal();
        }
        return;
      }
      setTicketId(r.ticketId);
      setActiveIndex(2);
    } finally {
      setBusy(null);
    }
  };

  const onAddLigne = async () => {
    if (!ticketId || !categoryId) return;
    clearError();
    setBusy('ligne');
    try {
      const r = await postCreateReceptionLigne(
        {
          ticket_id: ticketId,
          category_id: categoryId,
          poids_kg: poidsKg,
          destination,
          notes: notes.trim() || null,
          is_exit: isExit,
        },
        auth,
      );
      if (!r.ok) {
        setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(r) });
        if (isReceptionAuthoritativeFailure(r.status)) {
          resetWizardAfterServerRefusal();
        }
        return;
      }
      await refreshTicket();
      setIsExit(false);
    } finally {
      setBusy(null);
    }
  };

  const beginEditLigne = (l: ReceptionLigneResponse) => {
    setEditingLigneId(l.id);
    setCategoryId(l.category_id);
    setPoidsKg(l.poids_kg);
    setDestination(l.destination);
    setNotes(l.notes ?? '');
    setIsExit(l.is_exit);
  };

  const cancelEditLigne = () => {
    setEditingLigneId(null);
    setPoidsKg(1);
    setDestination('MAGASIN');
    setNotes('');
    setIsExit(false);
    setCategoryId(categories[0]?.id ?? null);
  };

  const onSaveEditLigne = async () => {
    if (!editingLigneId || !categoryId) return;
    clearError();
    setBusy('save-ligne');
    try {
      const r = await putUpdateReceptionLigne(
        editingLigneId,
        {
          category_id: categoryId,
          poids_kg: poidsKg,
          destination,
          notes: notes.trim() || null,
          is_exit: isExit,
        },
        auth,
      );
      if (!r.ok) {
        setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(r) });
        if (isReceptionAuthoritativeFailure(r.status)) {
          resetWizardAfterServerRefusal();
        }
        return;
      }
      setEditingLigneId(null);
      await refreshTicket();
    } finally {
      setBusy(null);
    }
  };

  const onDeleteLigne = async (ligneId: string) => {
    if (!window.confirm('Supprimer cette ligne côté serveur ?')) return;
    clearError();
    setBusy('delete-ligne');
    try {
      const r = await deleteReceptionLigne(ligneId, auth);
      if (!r.ok) {
        setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(r) });
        if (isReceptionAuthoritativeFailure(r.status)) {
          resetWizardAfterServerRefusal();
        }
        return;
      }
      if (editingLigneId === ligneId) setEditingLigneId(null);
      await refreshTicket();
    } finally {
      setBusy(null);
    }
  };

  const onAdminPatchWeight = async () => {
    if (!ticketId || !adminPatchLigneId) return;
    clearError();
    setBusy('patch-weight');
    try {
      const r = await patchReceptionLigneWeight(ticketId, adminPatchLigneId, adminPatchPoidsKg, auth);
      if (!r.ok) {
        setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(r) });
        if (isReceptionAuthoritativeFailure(r.status)) {
          resetWizardAfterServerRefusal();
        }
        return;
      }
      await refreshTicket();
    } finally {
      setBusy(null);
    }
  };

  const onCloseTicket = async () => {
    if (!ticketId) return;
    clearError();
    setBusy('close-ticket');
    try {
      const r = await postCloseReceptionTicket(ticketId, auth);
      if (!r.ok) {
        setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(r) });
        if (isReceptionAuthoritativeFailure(r.status)) {
          resetWizardAfterServerRefusal();
        }
        return;
      }
      const refreshed = await refreshTicket();
      if (refreshed) {
        setActiveIndex(4);
      }
    } finally {
      setBusy(null);
    }
  };

  const onClosePoste = async () => {
    if (!posteId) return;
    clearError();
    setBusy('close-poste');
    try {
      const r = await postClosePoste(posteId, auth);
      if (!r.ok) {
        setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(r) });
        if (isReceptionAuthoritativeFailure(r.status)) {
          resetWizardAfterServerRefusal();
        }
        return;
      }
      setPosteId(null);
      setTicketId(null);
      setTicketDetail(null);
      setActiveIndex(0);
    } finally {
      setBusy(null);
    }
  };

  if (entry.blocked) {
    return (
      <Alert color="yellow" title={entry.title} data-testid="reception-context-blocked">
        <Text size="sm">{entry.body}</Text>
      </Alert>
    );
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  /** Tant que le GET détail n’a pas répondu, on suppose ticket ouvert (création récente). */
  const ticketIsOpen = !ticketDetail || ticketDetail.status === 'opened';
  const ligneOptionsForAdmin =
    ticketDetail?.lignes.map((l) => ({
      value: l.id,
      label: `${l.category_label} — ${l.poids_kg} kg`,
    })) ?? [];

  const panels = [
    {
      id: 'poste',
      title: '1. Poste',
      content: (
        <Stack gap="sm" data-testid="reception-step-poste">
          <Text size="sm" c="dimmed">
            Ouvre un poste de réception côté serveur (<code>recyclique_reception_openPoste</code>).
          </Text>
          {posteId ? (
            <Text size="sm">
              Poste courant : <code data-testid="reception-poste-id">{posteId}</code>
            </Text>
          ) : null}
          <Button
            onClick={() => void onOpenPoste()}
            loading={busy === 'open-poste'}
            disabled={dataStale}
            data-testid="reception-open-poste"
          >
            Ouvrir le poste
          </Button>
        </Stack>
      ),
    },
    {
      id: 'ticket',
      title: '2. Ticket',
      content: (
        <Stack gap="sm" data-testid="reception-step-ticket">
          <Text size="sm" c="dimmed">
            Crée un ticket dans le poste ouvert (<code>recyclique_reception_createTicket</code>).
          </Text>
          {!posteId ? <Text size="sm">Ouvrez d’abord un poste (étape 1).</Text> : null}
          {ticketId ? (
            <Text size="sm">
              Ticket courant : <code data-testid="reception-ticket-id">{ticketId}</code>
            </Text>
          ) : null}
          <Button
            onClick={() => void onCreateTicket()}
            disabled={!posteId || dataStale}
            loading={busy === 'create-ticket'}
            data-testid="reception-create-ticket"
          >
            Créer le ticket
          </Button>
        </Stack>
      ),
    },
    {
      id: 'ligne',
      title: '3. Ligne (kg)',
      content: (
        <Stack gap="sm" data-testid="reception-step-ligne">
          <Text size="sm" c="dimmed">
            Catégories : <code>recyclique_reception_listCategories</code> — poids en <strong>kg</strong> (serveur). Édition /
            suppression : <code>recyclique_reception_updateLigne</code>, <code>recyclique_reception_deleteLigne</code> (ticket
            ouvert). Correction poids admin : <code>recyclique_reception_patchLigneWeight</code>.
          </Text>
          <RecycliqueClientErrorAlert
            error={categoriesError}
            testId="reception-categories-error"
            supportContextHint="le contexte réception"
          />
          {!ticketId ? <Text size="sm">Créez d’abord un ticket (étape 2).</Text> : null}
          {editingLigneId ? (
            <Alert color="blue" title="Édition d’une ligne">
              <Text size="xs" mb="xs">
                Ligne <code>{editingLigneId}</code> — données renvoyées par le serveur après enregistrement.
              </Text>
            </Alert>
          ) : null}
          <Select
            label="Catégorie"
            data={categoryOptions}
            value={categoryId}
            onChange={(v) => setCategoryId(v)}
            disabled={!ticketId || categories.length === 0 || dataStale}
            data-testid="reception-select-category"
          />
          <NumberInput
            label="Poids (kg)"
            min={0.001}
            step={0.1}
            value={poidsKg}
            onChange={(v) => setPoidsKg(Number(v) || 0)}
            disabled={!ticketId || dataStale}
            data-testid="reception-input-poids-kg"
          />
          <Select
            label="Destination"
            data={destinationChoices.map((d) => ({ value: d.value, label: d.label }))}
            value={destination}
            onChange={(v) => v && setDestination(v as ReceptionDestinationV1)}
            disabled={!ticketId || dataStale}
            data-testid="reception-select-destination"
          />
          <Switch
            label="Sortie de stock (is_exit)"
            checked={isExit}
            onChange={(e) => setIsExit(e.currentTarget.checked)}
            disabled={!ticketId || dataStale}
            data-testid="reception-switch-is-exit"
          />
          <TextInput
            label="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            disabled={!ticketId || dataStale}
            data-testid="reception-input-notes"
          />
          {editingLigneId ? (
            <Group gap="sm">
              <Button
                onClick={() => void onSaveEditLigne()}
                disabled={!ticketId || !categoryId || dataStale}
                loading={busy === 'save-ligne'}
                data-testid="reception-save-ligne-edit"
              >
                Enregistrer (PUT)
              </Button>
              <Button variant="default" onClick={cancelEditLigne} data-testid="reception-cancel-ligne-edit">
                Annuler l’édition
              </Button>
            </Group>
          ) : (
            <Button
              onClick={() => void onAddLigne()}
              disabled={!ticketId || !categoryId || !ticketIsOpen || dataStale}
              loading={busy === 'ligne'}
              data-testid="reception-add-ligne"
            >
              Ajouter la ligne
            </Button>
          )}
          {ticketDetail ? (
            <div data-testid="reception-ticket-lignes-summary">
              <Text size="sm" fw={600}>
                Lignes côté serveur : {ticketDetail.lignes.length}
              </Text>
              <ul data-testid="reception-lignes-list">
                {ticketDetail.lignes.map((l) => (
                  <li key={l.id}>
                    <Group justify="space-between" wrap="nowrap" gap="xs">
                      <Text size="xs">
                        {l.category_label} — {l.poids_kg} kg — {l.destination}
                        {l.is_exit ? ' — sortie' : ''}
                      </Text>
                      {ticketIsOpen ? (
                        <Group gap={4} wrap="nowrap">
                          <Button
                            size="compact-xs"
                            variant="light"
                            onClick={() => beginEditLigne(l)}
                            disabled={dataStale}
                            data-testid={`reception-edit-ligne-${l.id}`}
                          >
                            Modifier
                          </Button>
                          <Button
                            size="compact-xs"
                            color="red"
                            variant="light"
                            onClick={() => void onDeleteLigne(l.id)}
                            loading={busy === 'delete-ligne'}
                            disabled={dataStale}
                            data-testid={`reception-delete-ligne-${l.id}`}
                          >
                            Supprimer
                          </Button>
                        </Group>
                      ) : null}
                    </Group>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {ticketDetail && !ticketIsOpen && ticketDetail.lignes.length > 0 ? (
            <Stack gap="xs" data-testid="reception-admin-patch-weight">
              <Text size="sm" fw={600}>
                Correction poids (admin — PATCH)
              </Text>
              <Text size="xs" c="dimmed">
                Route réservée ADMIN/SUPER_ADMIN ; un utilisateur standard reçoit une 403 exploitable ci-dessus.
              </Text>
              <Select
                label="Ligne"
                placeholder="Choisir une ligne"
                data={ligneOptionsForAdmin}
                value={adminPatchLigneId}
                onChange={(v) => setAdminPatchLigneId(v)}
                disabled={dataStale}
                data-testid="reception-admin-patch-ligne-select"
              />
              <NumberInput
                label="Nouveau poids (kg)"
                min={0.001}
                step={0.1}
                value={adminPatchPoidsKg}
                onChange={(v) => setAdminPatchPoidsKg(Number(v) || 0)}
                disabled={dataStale}
                data-testid="reception-admin-patch-poids"
              />
              <Button
                onClick={() => void onAdminPatchWeight()}
                disabled={!adminPatchLigneId || dataStale}
                loading={busy === 'patch-weight'}
                data-testid="reception-admin-patch-apply"
              >
                Appliquer la correction
              </Button>
            </Stack>
          ) : null}
          <Button variant="light" size="xs" onClick={() => void refreshTicket()} disabled={!ticketId}>
            Rafraîchir le ticket (GET détail)
          </Button>
        </Stack>
      ),
    },
    {
      id: 'close-ticket',
      title: '4. Fermer ticket',
      content: (
        <Stack gap="sm" data-testid="reception-step-close-ticket">
          <Text size="sm" c="dimmed">
            <code>recyclique_reception_closeTicket</code>
          </Text>
          {!ticketId ? <Text size="sm">Aucun ticket courant.</Text> : null}
          <Button
            color="orange"
            onClick={() => void onCloseTicket()}
            disabled={!ticketId || dataStale}
            loading={busy === 'close-ticket'}
            data-testid="reception-close-ticket"
          >
            Fermer le ticket
          </Button>
        </Stack>
      ),
    },
    {
      id: 'close-poste',
      title: '5. Fermer poste',
      content: (
        <Stack gap="sm" data-testid="reception-step-close-poste">
          <Text size="sm" c="dimmed">
            <code>recyclique_reception_closePoste</code>
          </Text>
          {!posteId ? <Text size="sm">Aucun poste ouvert (ou déjà fermé).</Text> : null}
          <Button
            color="red"
            variant="light"
            onClick={() => void onClosePoste()}
            disabled={!posteId || dataStale}
            loading={busy === 'close-poste'}
            data-testid="reception-close-poste"
          >
            Fermer le poste
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Stack
      gap="md"
      data-testid="reception-nominal-wizard"
      data-widget-data-state={criticalDataState}
    >
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Text size="sm" fw={600}>
          Réception — parcours nominal (v2)
        </Text>
        <Button
          size="compact-xs"
          variant="subtle"
          onClick={() => setReceptionCriticalDataState('DATA_STALE')}
          data-testid="reception-trigger-stale"
        >
          Marquer DATA_STALE (test)
        </Button>
      </Group>
      {dataStale ? (
        <Alert color="orange" title="Données périmées (DATA_STALE)" data-testid="reception-nominal-stale-banner">
          <Text size="sm">
            Le détail du ticket courant n’a pas pu être confirmé côté serveur — les mutations sont bloquées jusqu’à un
            rafraîchissement réussi.
          </Text>
        </Alert>
      ) : null}
      <RecycliqueClientErrorAlert
        error={surfaceError}
        testId="reception-api-error"
        supportContextHint="le contexte réception"
      />
      <FlowRenderer
        flowId="reception-nominal"
        panels={panels}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        keepMounted
      />
    </Stack>
  );
}
