import { Alert, Button, Grid, Group, NumberInput, Paper, Select, Stack, Switch, Text, TextInput } from '@mantine/core';
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react';
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
import { useReceptionEntryBlock } from './reception-entry-gate';
import {
  setReceptionCriticalDataState,
  useReceptionCriticalDataState,
} from './reception-critical-data-state';
import {
  applyReceptionPoidsKeyboardKey,
  normalizeReceptionPoidsInput,
  parseReceptionPoidsInput,
} from './reception-poids-keyboard';
import { setReceptionPosteUiState } from './reception-poste-ui-state';
import styles from './ReceptionNominalWizard.module.css';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';
import { formatReceptionCompactId } from '../admin-config/reception-admin-display';

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

const RECEPTION_POSITION_SHORTCUT_KEYS = [
  'A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
  'Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M',
  'W', 'X', 'C', 'V', 'B', 'N',
] as const;

function getReceptionShortcutKeyForIndex(index: number): string | null {
  return RECEPTION_POSITION_SHORTCUT_KEYS[index] ?? null;
}

function getReceptionShortcutIndex(key: string): number {
  return RECEPTION_POSITION_SHORTCUT_KEYS.indexOf(key.toUpperCase() as (typeof RECEPTION_POSITION_SHORTCUT_KEYS)[number]);
}

function shouldPreventReceptionShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.contentEditable === 'true'
  ) {
    return true;
  }
  return target.getAttribute('role') === 'textbox';
}

/**
 * Story 7.1 — parcours nominal réception (poste → ticket → ligne kg → fermetures), vérité serveur uniquement.
 */
export function ReceptionNominalWizard(_props: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  const entry = useReceptionEntryBlock();
  const criticalDataState = useReceptionCriticalDataState();
  const dataStale = criticalDataState === 'DATA_STALE';
  const showTestControls = import.meta.env.MODE === 'test';
  const [posteId, setPosteId] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<ReceptionTicketDetail | null>(null);
  const [categories, setCategories] = useState<ReceptionCategoryRow[]>([]);
  const [categoriesError, setCategoriesError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [surfaceError, setSurfaceError] = useState<CashflowSubmitSurfaceError | null>(null);
  const posteRef = posteId ? formatReceptionCompactId(posteId) : null;
  const ticketRef = ticketId ? formatReceptionCompactId(ticketId) : null;
  const sessionStatusLabel = !posteId
    ? 'Aucun poste ouvert.'
    : ticketId
      ? 'Reception en cours.'
      : 'Poste ouvert.';
  const [busy, setBusy] = useState<string | null>(null);

  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [poidsKg, setPoidsKg] = useState<number>(0);
  const [poidsDraft, setPoidsDraft] = useState('0');
  const [destination, setDestination] = useState<ReceptionDestinationV1>('MAGASIN');
  const [notes, setNotes] = useState('');
  const [isExit, setIsExit] = useState(false);
  const [editingLigneId, setEditingLigneId] = useState<string | null>(null);
  const [adminPatchLigneId, setAdminPatchLigneId] = useState<string | null>(null);
  const [adminPatchPoidsKg, setAdminPatchPoidsKg] = useState<number>(1);
  const [focusedRootId, setFocusedRootId] = useState<string | null>(null);
  const [focusedChildId, setFocusedChildId] = useState<string | null>(null);
  const [poidsInputFocused, setPoidsInputFocused] = useState(false);
  const [poidsEntryZoneFocused, setPoidsEntryZoneFocused] = useState(false);
  const [poidsPostAddFeedback, setPoidsPostAddFeedback] = useState(false);
  const [keyboardShortcutScope, setKeyboardShortcutScope] = useState<'root' | 'child'>('root');
  const poidsInputWrapperRef = useRef<HTMLDivElement | null>(null);
  const rootGridRef = useRef<HTMLDivElement | null>(null);
  const childGridRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const initialRootFocusDoneRef = useRef(false);
  const poidsPostAddFeedbackTimeoutRef = useRef<number | null>(null);
  const ticketSyncRequestRef = useRef(0);

  const destinationChoices = useMemo(
    () => (isExit ? DESTINATIONS_EXIT : DESTINATIONS),
    [isExit],
  );

  useEffect(() => {
    if (isExit && destination === 'MAGASIN') {
      setDestination('RECYCLAGE');
    }
  }, [isExit, destination]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const setCriticalDataStateIfMounted = useCallback((next: 'NOMINAL' | 'DATA_STALE') => {
    if (!isMountedRef.current) return;
    setReceptionCriticalDataState(next);
  }, []);

  const resetWizardAfterServerRefusal = useCallback(() => {
    if (!isMountedRef.current) return;
    setReceptionCriticalDataState('NOMINAL');
    setPosteId(null);
    setTicketId(null);
    setReceptionPosteUiState(false);
    setTicketDetail(null);
    setCategories([]);
    setCategoriesError(null);
    setSelectedRootId(null);
    setCategoryId(null);
    setPoidsKg(0);
    setPoidsDraft('0');
    setDestination('MAGASIN');
    setNotes('');
    setIsExit(false);
    setEditingLigneId(null);
    setAdminPatchLigneId(null);
    setAdminPatchPoidsKg(1);
    setFocusedRootId(null);
    setFocusedChildId(null);
    setPoidsInputFocused(false);
    setPoidsEntryZoneFocused(false);
    setPoidsPostAddFeedback(false);
    setKeyboardShortcutScope('root');
    if (poidsPostAddFeedbackTimeoutRef.current != null) {
      window.clearTimeout(poidsPostAddFeedbackTimeoutRef.current);
      poidsPostAddFeedbackTimeoutRef.current = null;
    }
    initialRootFocusDoneRef.current = false;
  }, []);

  const clearError = () => setSurfaceError(null);

  const applyPoidsRaw = useCallback((raw: string) => {
    const normalized = normalizeReceptionPoidsInput(raw);
    setPoidsDraft(normalized.length > 0 ? normalized : '0');
    setPoidsKg(parseReceptionPoidsInput(normalized));
  }, []);

  const focusPoidsInput = useCallback(() => {
    window.setTimeout(() => {
      const input = poidsInputWrapperRef.current?.querySelector('input');
      if (!input) return;
      input.focus();
      input.select();
    }, 0);
  }, []);
  const focusActiveRootButton = useCallback(() => {
    window.setTimeout(() => {
      const activeButton =
        rootGridRef.current?.querySelector<HTMLButtonElement>('button[data-testid^="reception-category-tile-"][data-selected="true"]') ??
        rootGridRef.current?.querySelector<HTMLButtonElement>('button[data-testid^="reception-category-tile-"]');
      activeButton?.focus();
    }, 0);
  }, []);
  const onPoidsEntryZoneBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocusedNode = event.relatedTarget;
    if (nextFocusedNode instanceof Node && event.currentTarget.contains(nextFocusedNode)) return;
    setPoidsEntryZoneFocused(false);
  };
  const selectCategoryAndFocusPoids = useCallback(
    (nextCategoryId: string | null) => {
      setCategoryId(nextCategoryId);
      const nextCategory = categories.find((category) => category.id === nextCategoryId) ?? null;
      setSelectedRootId(nextCategory ? (nextCategory.parent_id ?? nextCategory.id) : null);
      setKeyboardShortcutScope(nextCategory?.parent_id ? 'child' : 'root');
      if (!ticketId || dataStale || nextCategoryId == null) return;
      focusPoidsInput();
    },
    [categories, ticketId, dataStale, focusPoidsInput],
  );

  const refreshTicket = useCallback(async (): Promise<boolean> => {
    const syncRequestId = ++ticketSyncRequestRef.current;
    if (!ticketId) {
      setTicketDetail(null);
      setCriticalDataStateIfMounted('NOMINAL');
      return true;
    }
    const r = await getReceptionTicketDetail(ticketId, auth);
    if (!r.ok) {
      if (syncRequestId !== ticketSyncRequestRef.current) return false;
      setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(r) });
      if (isReceptionAuthoritativeFailure(r.status)) {
        resetWizardAfterServerRefusal();
      } else {
        setCriticalDataStateIfMounted('DATA_STALE');
      }
      return false;
    }
    if (syncRequestId !== ticketSyncRequestRef.current) return true;
    setCriticalDataStateIfMounted('NOMINAL');
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
  const applyOptimisticCreatedLigne = useCallback((ligne: ReceptionLigneResponse) => {
    setTicketDetail((prev) => {
      if (!prev) {
        return {
          id: ligne.ticket_id,
          poste_id: posteId ?? '',
          benevole_username: '',
          created_at: '',
          closed_at: null,
          status: 'opened',
          lignes: [ligne],
        };
      }
      if (prev.id !== ligne.ticket_id) return prev;
      const nextLignes = [...prev.lignes.filter((item) => item.id !== ligne.id), ligne];
      return { ...prev, lignes: nextLignes };
    });
  }, [posteId]);
  const refreshTicketUntilLigneVisible = useCallback(
    async (expectedLigneId: string): Promise<boolean> => {
      const syncRequestId = ++ticketSyncRequestRef.current;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const r = await getReceptionTicketDetail(ticketId ?? '', auth);
        if (!r.ok) {
          if (syncRequestId !== ticketSyncRequestRef.current) return false;
          setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(r) });
          if (isReceptionAuthoritativeFailure(r.status)) {
            resetWizardAfterServerRefusal();
          } else {
            setCriticalDataStateIfMounted('DATA_STALE');
          }
          return false;
        }
        if (r.ticket.lignes.some((ligne) => ligne.id === expectedLigneId)) {
          if (syncRequestId !== ticketSyncRequestRef.current) return true;
          setCriticalDataStateIfMounted('NOMINAL');
          setTicketDetail(r.ticket);
          if (r.ticket.status === 'opened') {
            setAdminPatchLigneId(null);
          } else if (r.ticket.lignes.length > 0) {
            const first = r.ticket.lignes[0]!;
            setAdminPatchLigneId((prev) => prev ?? first.id);
            setAdminPatchPoidsKg(first.poids_kg);
          }
          return true;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      return true;
    },
    [ticketId, auth, resetWizardAfterServerRefusal, setCriticalDataStateIfMounted],
  );

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
    setSelectedRootId(null);
    setCategoryId(null);
  }, [auth, resetWizardAfterServerRefusal]);

  useEffect(() => {
    if (ticketId) void loadCategories();
  }, [ticketId, loadCategories]);

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
      setReceptionPosteUiState(true);
      const ticketResponse = await postCreateReceptionTicket(r.posteId, auth);
      if (!ticketResponse.ok) {
        setSurfaceError({ kind: 'api', failure: recycliqueClientFailureFromReceptionHttp(ticketResponse) });
        if (isReceptionAuthoritativeFailure(ticketResponse.status)) {
          resetWizardAfterServerRefusal();
        }
        return;
      }
      setTicketId(ticketResponse.ticketId);
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
      applyOptimisticCreatedLigne(r.ligne);
      setPoidsKg(0);
      setPoidsDraft('0');
      setNotes('');
      setIsExit(false);
      setSelectedRootId(null);
      setCategoryId(null);
      setKeyboardShortcutScope('root');
      setFocusedRootId(null);
      setFocusedChildId(null);
      setPoidsInputFocused(false);
      setPoidsEntryZoneFocused(false);
      setPoidsPostAddFeedback(false);
      if (poidsPostAddFeedbackTimeoutRef.current != null) {
        window.clearTimeout(poidsPostAddFeedbackTimeoutRef.current);
        poidsPostAddFeedbackTimeoutRef.current = null;
      }
      focusActiveRootButton();
      await refreshTicketUntilLigneVisible(r.ligne.id);
    } finally {
      setBusy(null);
    }
  };

  const beginEditLigne = (l: ReceptionLigneResponse) => {
    setEditingLigneId(l.id);
    const editingCategory = categories.find((category) => category.id === l.category_id) ?? null;
    setSelectedRootId(editingCategory ? (editingCategory.parent_id ?? editingCategory.id) : null);
    setCategoryId(l.category_id);
    setPoidsKg(l.poids_kg);
    setPoidsDraft(String(l.poids_kg));
    setDestination(l.destination);
    setNotes(l.notes ?? '');
    setIsExit(l.is_exit);
  };

  const cancelEditLigne = () => {
    setEditingLigneId(null);
    setSelectedRootId(null);
    setPoidsKg(0);
    setPoidsDraft('0');
    setDestination('MAGASIN');
    setNotes('');
    setIsExit(false);
    setCategoryId(null);
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

  const appendPoidsKey = (key: string) => {
    const nextRaw = applyReceptionPoidsKeyboardKey(poidsDraft, key, key === '.' ? 'Period' : `Digit${key}`);
    if (nextRaw == null) return;
    applyPoidsRaw(nextRaw);
  };

  const clearPoids = () => {
    applyPoidsRaw('');
  };

  const backspacePoids = () => {
    const nextRaw = applyReceptionPoidsKeyboardKey(poidsDraft, 'Backspace', 'Backspace');
    applyPoidsRaw(nextRaw ?? '');
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
      if (refreshed) return;
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
      setReceptionPosteUiState(false);
      setTicketDetail(null);
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

  /** Tant que le GET détail n’a pas répondu, on suppose ticket ouvert (création récente). */
  const ticketIsOpen = !ticketDetail || ticketDetail.status === 'opened';
  const canAddLigne = Boolean(ticketId && categoryId && poidsKg > 0 && ticketIsOpen && !dataStale && busy !== 'ligne');

  const onPoidsInputKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target instanceof HTMLElement && poidsInputWrapperRef.current?.contains(event.target)) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (hasHierarchy) {
          onReturnToChildStage();
        } else {
          onReturnToRootStage();
        }
        return;
      }
      const nextRaw = applyReceptionPoidsKeyboardKey(poidsDraft, event.key, event.code);
      if (nextRaw != null) {
        event.preventDefault();
        applyPoidsRaw(nextRaw);
        return;
      }
    }
    if (event.key !== 'Enter' || !canAddLigne || editingLigneId) return;
    event.preventDefault();
    void onAddLigne();
  };
  const ligneOptionsForAdmin =
    ticketDetail?.lignes.map((l) => ({
      value: l.id,
      label: `${l.category_label} — ${l.poids_kg} kg`,
    })) ?? [];
  const ticketTotalPoids = ticketDetail?.lignes.reduce((sum, ligne) => sum + ligne.poids_kg, 0) ?? 0;
  const latestLigne = ticketDetail?.lignes.at(-1) ?? null;
  const rootCategories = useMemo(() => {
    const roots = categories.filter((category) => category.parent_id == null || category.parent_id === '');
    const rootsWithChildren = roots.filter((root) => categories.some((category) => category.parent_id === root.id));
    const leafRoots = roots.filter((root) => !categories.some((category) => category.parent_id === root.id));
    return [...rootsWithChildren, ...leafRoots];
  }, [categories]);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const activeRootId = useMemo(() => {
    if (selectedRootId) return selectedRootId;
    if (!selectedCategory) return null;
    return selectedCategory.parent_id ?? selectedCategory.id;
  }, [selectedCategory, selectedRootId]);
  const activeRoot = useMemo(
    () => rootCategories.find((category) => category.id === activeRootId) ?? null,
    [rootCategories, activeRootId],
  );
  const activeChildren = useMemo(
    () => (activeRootId ? categories.filter((category) => category.parent_id === activeRootId) : []),
    [categories, activeRootId],
  );
  const hasHierarchy = useMemo(() => categories.some((category) => category.parent_id != null && category.parent_id !== ''), [categories]);
  const workflowStage = useMemo<'root' | 'child' | 'poids'>(() => {
    if (categoryId) return 'poids';
    if (hasHierarchy && selectedRootId) return 'child';
    return 'root';
  }, [categoryId, hasHierarchy, selectedRootId]);
  const selectionSummaryLabel = useMemo(() => {
    if (workflowStage === 'root') return 'Choisir une famille';
    if (workflowStage === 'child') return activeRoot ? `Choisir une sous-categorie dans ${activeRoot.name}` : 'Choisir une sous-categorie';
    return 'Saisie poids';
  }, [workflowStage, activeRoot]);
  const isPoidsStepVisible = workflowStage === 'poids';
  useEffect(() => {
    if (!ticketId) {
      initialRootFocusDoneRef.current = false;
      setKeyboardShortcutScope('root');
      return;
    }
    if (!hasHierarchy || dataStale || rootCategories.length === 0 || initialRootFocusDoneRef.current) return;
    initialRootFocusDoneRef.current = true;
    setKeyboardShortcutScope('root');
    focusActiveRootButton();
  }, [ticketId, hasHierarchy, dataStale, rootCategories.length, focusActiveRootButton]);
  const focusSubcategoryButtonByIndex = useCallback((index: number) => {
    const buttons = childGridRef.current?.querySelectorAll<HTMLButtonElement>('button[data-testid^="reception-subcategory-tile-"]');
    if (!buttons || index < 0 || index >= buttons.length) return;
    buttons[index]?.focus();
  }, []);
  const onSubcategoryTileKeyDown = (event: KeyboardEvent<HTMLButtonElement>, categoryIdForTile: string, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectCategoryAndFocusPoids(categoryIdForTile);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onReturnToRootStage();
      return;
    }
    const nextIndexByKey: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index + 2,
      ArrowUp: index - 2,
      Home: 0,
      End: activeChildren.length - 1,
    };
    const nextIndex = nextIndexByKey[event.key];
    if (nextIndex == null) return;
    event.preventDefault();
    focusSubcategoryButtonByIndex(nextIndex);
  };

  const onSelectRootCategory = useCallback(
    (rootId: string) => {
      const children = categories.filter((category) => category.parent_id === rootId);
      setSelectedRootId(rootId);
      setKeyboardShortcutScope(children.length > 0 ? 'child' : 'root');
      if (children.length > 0) {
        setCategoryId(null);
        return;
      }
      selectCategoryAndFocusPoids(rootId);
    },
    [categories, selectCategoryAndFocusPoids],
  );
  const onSelectRootCategoryFromKeyboard = useCallback(
    (rootId: string) => {
      const children = categories.filter((category) => category.parent_id === rootId);
      setSelectedRootId(rootId);
      if (children.length === 0) {
        setKeyboardShortcutScope('root');
        selectCategoryAndFocusPoids(rootId);
        return;
      }
      setKeyboardShortcutScope('child');
      setCategoryId(null);
      requestAnimationFrame(() => {
        focusSubcategoryButtonByIndex(0);
      });
    },
    [categories, focusSubcategoryButtonByIndex, selectCategoryAndFocusPoids],
  );
  const focusRootButtonByIndex = useCallback((index: number) => {
    const buttons = rootGridRef.current?.querySelectorAll<HTMLButtonElement>('button[data-testid^="reception-category-tile-"]');
    if (!buttons || index < 0 || index >= buttons.length) return;
    buttons[index]?.focus();
  }, []);
  const onRootTileKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, rootId: string, index: number) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelectRootCategoryFromKeyboard(rootId);
        return;
      }
      const nextIndexByKey: Record<string, number> = {
        ArrowRight: index + 1,
        ArrowLeft: index - 1,
        ArrowDown: index + 2,
        ArrowUp: index - 2,
        Home: 0,
        End: rootCategories.length - 1,
      };
      const nextIndex = nextIndexByKey[event.key];
      if (nextIndex == null) return;
      event.preventDefault();
      focusRootButtonByIndex(nextIndex);
    },
    [focusRootButtonByIndex, onSelectRootCategoryFromKeyboard, rootCategories.length],
  );

  const onReturnToRootStage = useCallback(() => {
    setSelectedRootId(null);
    setCategoryId(null);
    setKeyboardShortcutScope('root');
    focusActiveRootButton();
  }, [focusActiveRootButton]);
  const onReturnToChildStage = useCallback(() => {
    if (!hasHierarchy || !selectedRootId || activeChildren.length === 0) {
      onReturnToRootStage();
      return;
    }
    setCategoryId(null);
    setKeyboardShortcutScope('child');
    requestAnimationFrame(() => {
      const currentIndex =
        selectedCategory != null ? activeChildren.findIndex((child) => child.id === selectedCategory.id) : -1;
      focusSubcategoryButtonByIndex(currentIndex >= 0 ? currentIndex : 0);
    });
  }, [activeChildren, focusSubcategoryButtonByIndex, hasHierarchy, onReturnToRootStage, selectedCategory, selectedRootId]);

  useEffect(() => {
    if (!ticketId || dataStale || editingLigneId) return;
    const onWeightInputMicroRailKeyDown = (event: globalThis.KeyboardEvent) => {
      const poidsInput = poidsInputWrapperRef.current?.querySelector('input');
      if (!poidsInput || document.activeElement !== poidsInput) return;

      if (event.key === '=' || event.code === 'Equal') {
        event.preventDefault();
        event.stopPropagation();
        setIsExit((current) => {
          const next = !current;
          setDestination(next ? 'RECYCLAGE' : 'MAGASIN');
          return next;
        });
        return;
      }

      if (event.key === 'ArrowDown' || event.code === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setDestination((current) => {
          const available = isExit ? DESTINATIONS_EXIT : DESTINATIONS;
          const currentIndex = available.findIndex((choice) => choice.value === current);
          const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % available.length;
          return available[nextIndex]?.value ?? available[0]!.value;
        });
      }
    };

    document.addEventListener('keydown', onWeightInputMicroRailKeyDown, true);
    return () => document.removeEventListener('keydown', onWeightInputMicroRailKeyDown, true);
  }, [ticketId, dataStale, editingLigneId, isExit]);

  useEffect(() => {
    if (!ticketId || dataStale || editingLigneId) return;
    const onTabKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Tab' || event.ctrlKey || event.altKey || event.metaKey) return;

      const activeElement = document.activeElement;
      const poidsInput = poidsInputWrapperRef.current?.querySelector('input');
      const activeInPoids = activeElement != null && activeElement === poidsInput;
      const activeInRoot = activeElement instanceof Node && !!rootGridRef.current?.contains(activeElement);
      const activeInChild = activeElement instanceof Node && !!childGridRef.current?.contains(activeElement);

      if (!activeInPoids && !activeInRoot && !activeInChild) return;

      event.preventDefault();
      event.stopPropagation();

      if (activeInPoids) {
        if (hasHierarchy) {
          onReturnToChildStage();
        } else {
          onReturnToRootStage();
        }
        return;
      }

      if (activeInChild && activeElement instanceof HTMLButtonElement) {
        const nextCategoryId = activeElement.getAttribute('data-testid')?.replace('reception-subcategory-tile-', '') ?? null;
        if (nextCategoryId) {
          selectCategoryAndFocusPoids(nextCategoryId);
        }
        return;
      }

      if (activeInRoot && activeElement instanceof HTMLButtonElement) {
        const nextRootId = activeElement.getAttribute('data-testid')?.replace('reception-category-tile-', '') ?? null;
        if (!nextRootId) return;
        onSelectRootCategoryFromKeyboard(nextRootId);
      }
    };

    document.addEventListener('keydown', onTabKeyDown, true);
    return () => document.removeEventListener('keydown', onTabKeyDown, true);
  }, [
    dataStale,
    editingLigneId,
    hasHierarchy,
    onReturnToChildStage,
    onReturnToRootStage,
    onSelectRootCategoryFromKeyboard,
    selectCategoryAndFocusPoids,
    ticketId,
  ]);

  useEffect(() => {
    if (!ticketId || dataStale || editingLigneId) return;
    const onShortcutKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      const targetIsPoidsInput =
        event.target instanceof Node && !!poidsInputWrapperRef.current?.contains(event.target);
      if (targetIsPoidsInput) return;
      if (shouldPreventReceptionShortcut(event.target)) return;
      const shortcutIndex = getReceptionShortcutIndex(event.key);
      if (shortcutIndex < 0) return;
      const scopedCategories =
        hasHierarchy && keyboardShortcutScope === 'child' && activeChildren.length > 0 ? activeChildren : rootCategories;
      const nextCategory = scopedCategories[shortcutIndex];
      if (!nextCategory) return;
      event.preventDefault();
      event.stopPropagation();
      if (hasHierarchy && keyboardShortcutScope === 'child' && activeChildren.length > 0) {
        selectCategoryAndFocusPoids(nextCategory.id);
        return;
      }
      onSelectRootCategoryFromKeyboard(nextCategory.id);
    };
    document.addEventListener('keydown', onShortcutKeyDown, true);
    return () => document.removeEventListener('keydown', onShortcutKeyDown, true);
  }, [
    ticketId,
    dataStale,
    editingLigneId,
    hasHierarchy,
    keyboardShortcutScope,
    activeChildren,
    rootCategories,
    onSelectRootCategoryFromKeyboard,
    selectCategoryAndFocusPoids,
  ]);

  return (
    <Stack
      gap="md"
      data-testid="reception-nominal-wizard"
      data-widget-data-state={criticalDataState}
    >
      {showTestControls ? (
        <Group justify="flex-end">
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => setReceptionCriticalDataState('DATA_STALE')}
            data-testid="reception-trigger-stale"
          >
            Marquer DATA_STALE (test)
          </Button>
        </Group>
      ) : null}
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

      <Paper withBorder p={0} data-testid="reception-step-session" className={styles.chromeShell}>
        <div className={styles.chromeHeader}>
          <div className={styles.chromeHeaderTop}>
            <Text className={styles.chromeTitle}>
              {ticketId ? `Reception : Ticket #${ticketRef?.display ?? '--------'}` : 'Reception'}
            </Text>
            <Group gap="xs" wrap="wrap" className={styles.chromeHeaderActions}>
              <Button
                onClick={() => void onCreateTicket()}
                disabled={!posteId || !!ticketId || dataStale}
                loading={busy === 'create-ticket'}
                data-testid="reception-create-ticket"
                style={{ display: posteId && !ticketId ? undefined : 'none' }}
              >
                Créer le ticket
              </Button>
              {ticketId ? (
                <Button
                  className={styles.chromePrimaryAction}
                  onClick={() => void onCloseTicket()}
                  disabled={dataStale}
                  loading={busy === 'close-ticket'}
                  data-testid="reception-close-ticket"
                >
                  Clôturer le ticket
                </Button>
              ) : null}
              <Button
                onClick={() => void onOpenPoste()}
                loading={busy === 'open-poste'}
                disabled={!!posteId || dataStale}
                data-testid="reception-open-poste"
                style={{ display: posteId ? 'none' : undefined }}
              >
                Ouvrir le poste
              </Button>
              {posteId && (!ticketId || ticketDetail?.status === 'closed') ? (
                <Button
                  color="red"
                  variant="light"
                  onClick={() => void onClosePoste()}
                  disabled={dataStale}
                  loading={busy === 'close-poste'}
                  data-testid="reception-close-poste"
                >
                  Fermer le poste
                </Button>
              ) : null}
            </Group>
          </div>
          <div className={`${styles.chromeMetaRow} ${styles.visuallyHidden}`}>
            <div className={styles.chromeMetaItem}>
              <Text span className={styles.chromeMetaLabel}>Etat</Text>
              <Text span className={styles.chromeMetaValue}>{sessionStatusLabel}</Text>
            </div>
            {posteId ? (
              <div className={styles.chromeMetaItem}>
                <Text
                  span
                  className={styles.chromeMetaValue}
                  title={posteId}
                  aria-label={`Reference poste ${posteId}`}
                  data-testid="reception-poste-id"
                >
                  {posteRef?.display ?? '—'}
                </Text>
              </div>
            ) : null}
            {ticketId ? (
              <div className={styles.chromeMetaItem}>
                <Text
                  span
                  className={styles.chromeMetaValue}
                  title={ticketId}
                  aria-label={`Reference ticket ${ticketId}`}
                  data-testid="reception-ticket-id"
                >
                  {ticketRef?.display ?? '—'}
                </Text>
              </div>
            ) : null}
          </div>
        </div>
      </Paper>

      <Paper withBorder p="md" data-testid="reception-step-ligne" className={styles.workspaceShell}>
        <Stack gap="sm">
          <RecycliqueClientErrorAlert
            error={categoriesError}
            testId="reception-categories-error"
            supportContextHint="le contexte réception"
          />
          {!ticketId ? (
            <Paper withBorder p="sm" radius="md" bg="gray.0" data-testid="reception-cockpit-inactive">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Ouvrez poste puis ticket.
                </Text>
              </Stack>
            </Paper>
          ) : null}
          {editingLigneId ? (
            <Alert color="blue" title="Édition d’une ligne">
              <Text size="xs" mb="xs">
                Ligne <code>{editingLigneId}</code> — données renvoyées par le serveur après enregistrement.
              </Text>
            </Alert>
          ) : null}
          {ticketId ? <div className={styles.desktopLayout} data-testid="reception-cockpit-layout">
            <div className={styles.stickyColumn}>
              <Paper withBorder p={0} data-testid="reception-cockpit-left" className={styles.panel}>
                <div className={styles.visuallyHidden}>
                  <div className={styles.panelHeader}>
                    <Text className={styles.panelTitle}>Parcours article</Text>
                    <Text size="xs" c="dimmed">
                      {selectionSummaryLabel}
                    </Text>
                  </div>
                </div>
                <div className={`${styles.panelBody} ${styles.leftPanelBody}`}>
                  <Stack gap="sm">
                    <div className={styles.visuallyHidden} data-testid="reception-category-active-summary">
                      Famille active : {activeRoot?.name ?? selectedCategory?.name ?? 'Aucune'} Sous-catégorie active :{' '}
                      {selectedCategory?.name ?? 'Aucune'}
                    </div>
                    <div data-testid="reception-category-grid" className={styles.categoryRail}>
                      <div className={styles.categorySection}>
                        <Text className={styles.visuallyHidden}>Familles</Text>
                        <Grid gutter="xs" data-testid="reception-category-root-grid" ref={rootGridRef}>
                          {rootCategories.map((category, index) => (
                            <Grid.Col key={category.id} span={{ base: 6, lg: 4 }}>
                              <Button
                                fullWidth
                                variant={activeRootId === category.id ? 'filled' : 'light'}
                                color={activeRootId === category.id ? 'green' : 'gray'}
                                justify="flex-start"
                                className={styles.categoryTile}
                                onClick={() => onSelectRootCategory(category.id)}
                                onKeyDown={(event) => onRootTileKeyDown(event, category.id, index)}
                                onFocus={() => {
                                  setFocusedRootId(category.id);
                                  setKeyboardShortcutScope('root');
                                }}
                                onBlur={() => setFocusedRootId((current) => (current === category.id ? null : current))}
                                disabled={!ticketId || dataStale}
                                tabIndex={focusedRootId === category.id || (focusedRootId == null && index === 0) ? 0 : -1}
                                style={
                                  focusedRootId === category.id
                                    ? {
                                        outline: '3px solid var(--mantine-color-blue-5)',
                                        outlineOffset: 2,
                                        boxShadow: activeRootId === category.id ? '0 0 0 1px var(--mantine-color-green-8)' : undefined,
                                      }
                                    : undefined
                                }
                                aria-current={activeRootId === category.id ? 'true' : undefined}
                                aria-label={
                                  getReceptionShortcutKeyForIndex(index)
                                    ? `Selectionner ${category.name}. Raccourci clavier: ${getReceptionShortcutKeyForIndex(index)} (position ${index + 1})`
                                    : `Selectionner ${category.name}`
                                }
                                data-selected={activeRootId === category.id ? 'true' : 'false'}
                                data-focused={focusedRootId === category.id ? 'true' : 'false'}
                                data-testid={`reception-category-tile-${category.id}`}
                              >
                                <span className={styles.categoryTileContent}>
                                  <span className={styles.categoryTileLabel}>{category.name}</span>
                                  {getReceptionShortcutKeyForIndex(index) ? (
                                    <span className={styles.categoryTileShortcutBadge} aria-hidden="true">
                                      Touche <span className={styles.categoryTileShortcutKey}>{getReceptionShortcutKeyForIndex(index)}</span>
                                    </span>
                                  ) : null}
                                </span>
                              </Button>
                            </Grid.Col>
                          ))}
                        </Grid>
                      </div>
                      {hasHierarchy && activeRoot && workflowStage === 'child' ? (
                        <Stack gap="xs" data-testid="reception-category-child-panel" className={styles.categoryChildrenRow}>
                          <Group justify="space-between" align="center" className={styles.categoryBackAction}>
                            <Text className={styles.visuallyHidden}>Sous-categories {activeRoot.name}</Text>
                            <Button variant="subtle" size="compact-xs" onClick={onReturnToRootStage}>
                              Retour familles
                            </Button>
                          </Group>
                          <Grid gutter="xs" data-testid="reception-category-child-grid" ref={childGridRef}>
                            {activeChildren.map((category, index) => (
                              <Grid.Col key={category.id} span={{ base: 6, lg: 4 }}>
                                <Button
                                  fullWidth
                                  variant={categoryId === category.id ? 'filled' : 'default'}
                                  color={categoryId === category.id ? 'green' : 'gray'}
                                  justify="flex-start"
                                  className={styles.categoryTile}
                                  onClick={() => selectCategoryAndFocusPoids(category.id)}
                                  onKeyDown={(event) => onSubcategoryTileKeyDown(event, category.id, index)}
                                  onFocus={() => {
                                    setFocusedChildId(category.id);
                                    setKeyboardShortcutScope('child');
                                  }}
                                  onBlur={() => setFocusedChildId((current) => (current === category.id ? null : current))}
                                  disabled={!ticketId || dataStale}
                                  tabIndex={focusedChildId === category.id || (focusedChildId == null && index === 0) ? 0 : -1}
                                  style={
                                    focusedChildId === category.id
                                      ? {
                                          outline: '3px solid var(--mantine-color-blue-5)',
                                          outlineOffset: 2,
                                          boxShadow: categoryId === category.id ? '0 0 0 1px var(--mantine-color-green-8)' : undefined,
                                        }
                                      : undefined
                                  }
                                  aria-label={
                                    getReceptionShortcutKeyForIndex(index)
                                      ? `Selectionner ${category.name}. Raccourci clavier: ${getReceptionShortcutKeyForIndex(index)} (position ${index + 1})`
                                      : `Selectionner ${category.name}`
                                  }
                                  data-selected={categoryId === category.id ? 'true' : 'false'}
                                  data-focused={focusedChildId === category.id ? 'true' : 'false'}
                                  data-testid={`reception-subcategory-tile-${category.id}`}
                                >
                                  <span className={styles.categoryTileContent}>
                                    <span className={styles.categoryTileLabel}>{category.name}</span>
                                    {getReceptionShortcutKeyForIndex(index) ? (
                                      <span className={styles.categoryTileShortcutBadge} aria-hidden="true">
                                        Touche <span className={styles.categoryTileShortcutKey}>{getReceptionShortcutKeyForIndex(index)}</span>
                                      </span>
                                    ) : null}
                                  </span>
                                </Button>
                              </Grid.Col>
                            ))}
                          </Grid>
                        </Stack>
                      ) : null}
                    </div>
                  </Stack>
                </div>
              </Paper>
            </div>
            <div>
              <Paper withBorder p={0} data-testid="reception-cockpit-center" className={styles.panel}>
                <div className={styles.visuallyHidden}>
                  <div className={styles.panelHeader}>
                    <Text className={styles.panelTitle}>Poste de saisie</Text>
                    {ticketId ? (
                      <div className={styles.workspaceHint}>
                        <Text size="xs" c="dimmed">
                          Famille {'>'} sous-categorie {'>'} poids, sans masquer le rail article.
                        </Text>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className={`${styles.panelBody} ${styles.centerPanelBody}`}>
                  <Stack gap="sm">
                    {!isPoidsStepVisible ? (
                      <Paper withBorder p="md" radius="md" bg="gray.0" data-testid="reception-await-selection">
                        <Text size="sm" fw={600}>
                          {workflowStage === 'root' ? 'Choisissez une famille.' : 'Choisissez une sous-categorie.'}
                        </Text>
                      </Paper>
                    ) : (
                      <>
                        <Paper withBorder p="sm" radius="md" data-testid="reception-poids-display" className={styles.weightHeaderCard}>
                          <Text className={styles.weightHeaderLabel}>
                            Poids (kg) *
                          </Text>
                          <Text className={styles.weightHeaderValue}>
                            {(Number.isFinite(poidsKg) ? poidsKg : 0).toFixed(2)}
                            <span className={styles.visuallyHidden}> kg</span>
                          </Text>
                        </Paper>
                        <div
                          data-testid="reception-poids-entry-zone"
                          data-focused={poidsEntryZoneFocused ? 'true' : 'false'}
                          data-feedback={poidsPostAddFeedback ? 'ready-next' : 'idle'}
                          onFocusCapture={() => setPoidsEntryZoneFocused(true)}
                          onBlurCapture={onPoidsEntryZoneBlur}
                          style={
                            poidsEntryZoneFocused || poidsPostAddFeedback
                              ? {
                                  outline: poidsPostAddFeedback ? '2px solid var(--mantine-color-green-5)' : undefined,
                                  borderRadius: 'var(--mantine-radius-md)',
                                  padding: '2px',
                                  boxShadow: poidsPostAddFeedback ? '0 0 0 1px var(--mantine-color-green-1)' : undefined,
                                }
                              : undefined
                          }
                        >
                          {poidsPostAddFeedback ? (
                            <Paper
                              p="xs"
                              radius="md"
                              bg="green.0"
                              c="green.9"
                              data-testid="reception-poids-ready-next-banner"
                            >
                              <Text size="sm" fw={700}>
                                Pret pour l'article suivant
                              </Text>
                            </Paper>
                          ) : null}
                          <div className={styles.weightCompose}>
                            <div className={styles.weightKeypadColumn}>
                              <div
                                ref={poidsInputWrapperRef}
                                data-testid="reception-poids-focus-ring"
                                data-focused={poidsInputFocused ? 'true' : 'false'}
                                onKeyDownCapture={onPoidsInputKeyDown}
                                className={styles.weightInputShell}
                                style={
                                  poidsInputFocused
                                    ? {
                                        outline: '2px solid var(--mantine-color-blue-5)',
                                        borderRadius: 'var(--mantine-radius-md)',
                                      }
                                    : undefined
                                }
                              >
                                <NumberInput
                                  label="Poids (kg)"
                                  min={0}
                                  step={0.1}
                                  value={poidsDraft}
                                  onChange={(v) => {
                                    applyPoidsRaw(String(v ?? ''));
                                  }}
                                  onFocus={() => setPoidsInputFocused(true)}
                                  onBlur={() => setPoidsInputFocused(false)}
                                  disabled={!ticketId || dataStale}
                                  data-testid="reception-input-poids-kg"
                                />
                              </div>
                              <Grid gutter="xs" data-testid="reception-poids-keypad" className={styles.keypadGrid}>
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'].map((key) => (
                                  <Grid.Col key={key} span={key === '0' ? 8 : 4} className={styles.keypadButton}>
                                    <Button
                                      fullWidth
                                      variant="light"
                                      onClick={() => appendPoidsKey(key)}
                                      disabled={!ticketId || dataStale}
                                      data-testid={`reception-keypad-${key === '.' ? 'dot' : key}`}
                                    >
                                      {key}
                                    </Button>
                                  </Grid.Col>
                                ))}
                              </Grid>
                              <div className={styles.keypadActionRow}>
                                <div className={styles.keypadActionButton}>
                                  <Button
                                    fullWidth
                                    color="green"
                                    onClick={clearPoids}
                                    disabled={!ticketId || dataStale}
                                    data-testid="reception-keypad-clear"
                                  >
                                    C
                                  </Button>
                                </div>
                                <div className={styles.keypadActionButton}>
                                  <Button
                                    fullWidth
                                    color="green"
                                    onClick={backspacePoids}
                                    disabled={!ticketId || dataStale}
                                    data-testid="reception-keypad-backspace"
                                  >
                                    ←
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div className={styles.weightControlsColumn}>
                              <Switch
                                label="Sortie de stock"
                                checked={isExit}
                                onChange={(e) => setIsExit(e.currentTarget.checked)}
                                disabled={!ticketId || dataStale}
                                data-testid="reception-switch-is-exit"
                                className={styles.compactControl}
                              />
                              <Select
                                label="Destination"
                                data={destinationChoices.map((d) => ({ value: d.value, label: d.label }))}
                                value={destination}
                                onChange={(v) => v && setDestination(v as ReceptionDestinationV1)}
                                disabled={!ticketId || dataStale}
                                data-testid="reception-select-destination"
                                className={styles.compactControl}
                              />
                              <TextInput
                                label="Notes (optionnel)"
                                value={notes}
                                onChange={(e) => setNotes(e.currentTarget.value)}
                                disabled={!ticketId || dataStale}
                                data-testid="reception-input-notes"
                                className={styles.compactControl}
                              />
                              {editingLigneId ? (
                                <Group gap="sm">
                                  <Button
                                    onClick={() => void onSaveEditLigne()}
                                    disabled={!ticketId || !categoryId || poidsKg <= 0 || dataStale}
                                    loading={busy === 'save-ligne'}
                                    data-testid="reception-save-ligne-edit"
                                  >
                                    Enregistrer
                                  </Button>
                                  <Button variant="default" onClick={cancelEditLigne} data-testid="reception-cancel-ligne-edit">
                                    Annuler l'edition
                                  </Button>
                                </Group>
                              ) : (
                                <div className={styles.ctaButton}>
                                  <Button
                                    fullWidth
                                    onClick={() => void onAddLigne()}
                                    disabled={!canAddLigne}
                                    loading={busy === 'ligne'}
                                    data-testid="reception-add-ligne"
                                  >
                                    Ajouter l'objet
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </Stack>
                </div>
              </Paper>
            </div>
            <div className={styles.stickyColumn}>
              <div data-testid="reception-cockpit-right" className={styles.ticketShell}>
                <div className={styles.ticketTitleBar}>Résumé du ticket</div>
                <div className={styles.ticketBody}>
                  <div className={styles.visuallyHidden}>
                    <div className={styles.ticketSummaryGrid}>
                      <Paper withBorder p="xs" radius="md" data-testid="reception-ticket-summary-count">
                        <Text size="xs" c="dimmed">
                          Lignes
                        </Text>
                        <Text fw={700}>{ticketDetail?.lignes.length === 0 ? '0 ligne' : ticketDetail?.lignes.length ?? 0}</Text>
                      </Paper>
                      <Paper withBorder p="xs" radius="md" data-testid="reception-ticket-summary-total">
                        <Text size="xs" c="dimmed">
                          Poids total
                        </Text>
                        <Text fw={700}>{ticketTotalPoids.toFixed(2)} kg</Text>
                      </Paper>
                    </div>
                    {latestLigne ? (
                      <Paper withBorder p="xs" radius="md" data-testid="reception-ticket-summary-latest">
                        <Text size="xs" c="dimmed">
                          Dernière ligne
                        </Text>
                        <Text size="sm" fw={600}>
                          {latestLigne.category_label}
                        </Text>
                        <Text size="xs">
                          {latestLigne.poids_kg} kg — {latestLigne.destination}
                          {latestLigne.is_exit ? ' — sortie' : ''}
                        </Text>
                      </Paper>
                    ) : null}
                  </div>
                  {ticketDetail && ticketDetail.lignes.length > 0 ? (
                    <Stack gap="sm" data-testid="reception-ticket-lignes-summary">
                      <ul data-testid="reception-lignes-list" className={styles.ticketList}>
                        {ticketDetail.lignes.map((l) => (
                          <li key={l.id} className={styles.ticketListItem}>
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
                    </Stack>
                  ) : <div className={styles.ticketEmptyState}>Aucune ligne ajoutée</div>}
                  <div className={styles.ticketFooter}>
                    {(ticketDetail?.lignes.length ?? 0)} ligne{(ticketDetail?.lignes.length ?? 0) > 1 ? 's' : ''} • Total: {ticketTotalPoids.toFixed(2)} kg
                  </div>
                </div>
              </div>
            </div>
          </div> : null}
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
          {posteId && dataStale ? (
            <Button variant="light" size="xs" onClick={() => void refreshTicket()} disabled={!ticketId}>
              Actualiser le ticket
            </Button>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}
