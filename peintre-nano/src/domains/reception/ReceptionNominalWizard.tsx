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
import { setReceptionPosteUiState } from './reception-poste-ui-state';
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
  const showTestControls = import.meta.env.MODE === 'test';
  const [posteId, setPosteId] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<ReceptionTicketDetail | null>(null);
  const [categories, setCategories] = useState<ReceptionCategoryRow[]>([]);
  const [categoriesError, setCategoriesError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [surfaceError, setSurfaceError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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
    if (poidsPostAddFeedbackTimeoutRef.current != null) {
      window.clearTimeout(poidsPostAddFeedbackTimeoutRef.current);
      poidsPostAddFeedbackTimeoutRef.current = null;
    }
    initialRootFocusDoneRef.current = false;
  }, []);

  const clearError = () => setSurfaceError(null);

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
  const triggerPoidsPostAddFeedback = useCallback(() => {
    setPoidsPostAddFeedback(false);
    if (poidsPostAddFeedbackTimeoutRef.current != null) {
      window.clearTimeout(poidsPostAddFeedbackTimeoutRef.current);
    }
    window.setTimeout(() => {
      setPoidsPostAddFeedback(true);
      poidsPostAddFeedbackTimeoutRef.current = window.setTimeout(() => {
        setPoidsPostAddFeedback(false);
        poidsPostAddFeedbackTimeoutRef.current = null;
      }, 1200);
    }, 0);
  }, []);

  const selectCategoryAndFocusPoids = useCallback(
    (nextCategoryId: string | null) => {
      setCategoryId(nextCategoryId);
      if (!ticketId || dataStale || nextCategoryId == null) return;
      focusPoidsInput();
    },
    [ticketId, dataStale, focusPoidsInput],
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
    setCategoryId((prev) => prev ?? (r.categories[0]?.id ?? null));
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
      focusPoidsInput();
      triggerPoidsPostAddFeedback();
      await refreshTicketUntilLigneVisible(r.ligne.id);
    } finally {
      setBusy(null);
    }
  };

  const beginEditLigne = (l: ReceptionLigneResponse) => {
    setEditingLigneId(l.id);
    setCategoryId(l.category_id);
    setPoidsKg(l.poids_kg);
    setPoidsDraft(String(l.poids_kg));
    setDestination(l.destination);
    setNotes(l.notes ?? '');
    setIsExit(l.is_exit);
  };

  const cancelEditLigne = () => {
    setEditingLigneId(null);
    setPoidsKg(0);
    setPoidsDraft('0');
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

  const appendPoidsKey = (key: string) => {
    const current = poidsDraft;
    if (key === '.' && current.includes('.')) return;
    const base = current === '0' && key !== '.' ? '' : current;
    const nextRaw = key === '.' && base === '' ? '0.' : `${base}${key}`;
    const nextValue = Number(nextRaw);
    if (Number.isNaN(nextValue)) return;
    setPoidsDraft(nextRaw);
    setPoidsKg(nextValue);
  };

  const clearPoids = () => {
    setPoidsKg(0);
    setPoidsDraft('0');
  };

  const backspacePoids = () => {
    const current = poidsDraft;
    const nextRaw = current.slice(0, -1);
    if (!nextRaw || nextRaw === '-' || nextRaw === '-0') {
      setPoidsDraft('0');
      setPoidsKg(0);
      return;
    }
    const nextValue = Number(nextRaw);
    setPoidsDraft(nextRaw);
    setPoidsKg(Number.isNaN(nextValue) ? 0 : nextValue);
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

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  /** Tant que le GET détail n’a pas répondu, on suppose ticket ouvert (création récente). */
  const ticketIsOpen = !ticketDetail || ticketDetail.status === 'opened';
  const canAddLigne = Boolean(ticketId && categoryId && poidsKg > 0 && ticketIsOpen && !dataStale && busy !== 'ligne');

  const onPoidsInputKeyDown = (event: KeyboardEvent<HTMLElement>) => {
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
    if (!selectedCategory) return rootCategories[0]?.id ?? null;
    return selectedCategory.parent_id ?? selectedCategory.id;
  }, [selectedCategory, rootCategories]);
  const activeRoot = useMemo(
    () => rootCategories.find((category) => category.id === activeRootId) ?? null,
    [rootCategories, activeRootId],
  );
  const activeChildren = useMemo(
    () => categories.filter((category) => category.parent_id === activeRootId),
    [categories, activeRootId],
  );
  const hasHierarchy = useMemo(() => categories.some((category) => category.parent_id != null && category.parent_id !== ''), [categories]);
  useEffect(() => {
    if (!ticketId) {
      initialRootFocusDoneRef.current = false;
      return;
    }
    if (!hasHierarchy || dataStale || rootCategories.length === 0 || initialRootFocusDoneRef.current) return;
    initialRootFocusDoneRef.current = true;
    focusActiveRootButton();
  }, [ticketId, hasHierarchy, dataStale, rootCategories.length, focusActiveRootButton]);
  const focusSubcategoryButtonByIndex = useCallback((index: number) => {
    const buttons = childGridRef.current?.querySelectorAll<HTMLButtonElement>('button[data-testid^="reception-subcategory-tile-"]');
    if (!buttons || index < 0 || index >= buttons.length) return;
    buttons[index]?.focus();
  }, []);
  const onSubcategoryTileKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, categoryIdForTile: string, index: number) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectCategoryAndFocusPoids(categoryIdForTile);
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
    },
    [activeChildren.length, focusSubcategoryButtonByIndex, selectCategoryAndFocusPoids],
  );

  const onSelectRootCategory = useCallback(
    (rootId: string) => {
      const children = categories.filter((category) => category.parent_id === rootId);
      if (children.length > 0) {
        const nextCategoryId =
          (() => {
            if (categoryId && children.some((child) => child.id === categoryId)) return categoryId;
            return children[0]?.id ?? null;
          })();
        if (nextCategoryId) {
          selectCategoryAndFocusPoids(nextCategoryId);
        }
        return;
      }
      selectCategoryAndFocusPoids(rootId);
    },
    [categories, categoryId, selectCategoryAndFocusPoids],
  );
  const onSelectRootCategoryFromKeyboard = useCallback(
    (rootId: string) => {
      const children = categories.filter((category) => category.parent_id === rootId);
      if (children.length === 0) {
        selectCategoryAndFocusPoids(rootId);
        return;
      }
      const nextChildIndex =
        categoryId != null ? children.findIndex((child) => child.id === categoryId) : -1;
      const safeChildIndex = nextChildIndex >= 0 ? nextChildIndex : 0;
      setCategoryId(children[safeChildIndex]?.id ?? null);
      requestAnimationFrame(() => {
        focusSubcategoryButtonByIndex(safeChildIndex);
      });
    },
    [categories, categoryId, focusSubcategoryButtonByIndex, selectCategoryAndFocusPoids],
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

  useEffect(() => {
    if (!hasHierarchy || !activeRootId) return;
    const children = categories.filter((category) => category.parent_id === activeRootId);
    if (children.length === 0) return;
    const selectedIsChildOfActiveRoot = children.some((child) => child.id === categoryId);
    if (!selectedIsChildOfActiveRoot) {
      setCategoryId(children[0]?.id ?? null);
    }
  }, [hasHierarchy, activeRootId, categories, categoryId]);

  return (
    <Stack
      gap="md"
      data-testid="reception-nominal-wizard"
      data-widget-data-state={criticalDataState}
    >
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Text size="sm" fw={600}>
          Poste de réception
        </Text>
        {showTestControls ? (
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => setReceptionCriticalDataState('DATA_STALE')}
            data-testid="reception-trigger-stale"
          >
            Marquer DATA_STALE (test)
          </Button>
        ) : null}
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

      <Paper withBorder p="md" data-testid="reception-step-poste">
        <Stack gap="sm">
          <Text size="sm" fw={600}>
            Poste
          </Text>
          <Text size="sm" c="dimmed">
            {posteId
              ? <>Ouvre un poste de réception côté serveur (<code>recyclique_reception_openPoste</code>).</>
              : 'Ouvre un poste de réception pour démarrer le parcours opérateur.'}
          </Text>
          {posteId ? (
            <Text size="sm">
              Poste courant : <code data-testid="reception-poste-id">{posteId}</code>
            </Text>
          ) : null}
          <Group gap="sm">
            <Button
              onClick={() => void onOpenPoste()}
              loading={busy === 'open-poste'}
              disabled={!!posteId || dataStale}
              data-testid="reception-open-poste"
            >
              Ouvrir le poste
            </Button>
            {posteId ? (
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
        </Stack>
      </Paper>

      <Paper withBorder p="md" data-testid="reception-step-ticket">
        <Stack gap="sm">
          <Text size="sm" fw={600}>
            Ticket courant
          </Text>
          <Text size="sm" c="dimmed">
            {posteId
              ? <>Crée un ticket dans le poste ouvert (<code>recyclique_reception_createTicket</code>).</>
              : 'Le ticket de réception est préparé avec l’ouverture du poste.'}
          </Text>
          {!posteId ? <Text size="sm">Ouvrez d’abord un poste.</Text> : null}
          {ticketId ? (
            <Text size="sm">
              Ticket courant : <code data-testid="reception-ticket-id">{ticketId}</code>
            </Text>
          ) : null}
          <Group gap="sm">
            <Button
              onClick={() => void onCreateTicket()}
              disabled={!posteId || !!ticketId || dataStale}
              loading={busy === 'create-ticket'}
              data-testid="reception-create-ticket"
            >
              Créer le ticket
            </Button>
            {ticketId ? (
              <Button
                color="orange"
                onClick={() => void onCloseTicket()}
                disabled={dataStale}
                loading={busy === 'close-ticket'}
                data-testid="reception-close-ticket"
              >
                Fermer le ticket
              </Button>
            ) : null}
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="md" data-testid="reception-step-ligne">
        <Stack gap="sm">
          <Text size="sm" fw={600}>
            Cockpit réception
          </Text>
          <Text size="sm" c="dimmed">
            {ticketId ? (
              <>
                Catégories : <code>recyclique_reception_listCategories</code> — poids en <strong>kg</strong> (serveur). Édition /
                suppression : <code>recyclique_reception_updateLigne</code>, <code>recyclique_reception_deleteLigne</code> (ticket
                ouvert). Correction poids admin : <code>recyclique_reception_patchLigneWeight</code>.
              </>
            ) : (
              <>Le cockpit détaillé s’active une fois le poste ouvert.</>
            )}
          </Text>
          <RecycliqueClientErrorAlert
            error={categoriesError}
            testId="reception-categories-error"
            supportContextHint="le contexte réception"
          />
          {!ticketId ? (
            <Paper withBorder p="sm" radius="md" bg="gray.0" data-testid="reception-cockpit-inactive">
              <Stack gap="xs">
                <Text size="sm" fw={600}>
                  Cockpit en attente
                </Text>
                <Text size="sm" c="dimmed">
                  Ouvrez d’abord le poste pour lancer la réception. Le cockpit détaillé s’active ensuite avec le ticket.
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
          {ticketId ? <Grid gutter="md" data-testid="reception-cockpit-layout">
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Paper withBorder p="sm" data-testid="reception-cockpit-left">
                <Stack gap="sm">
                  <Text size="sm" fw={600}>
                    Catégorie et flux
                  </Text>
                  <Text size="xs" c="dimmed">
                    {hasHierarchy ? 'Choisir une famille puis une sous-catégorie.' : 'Choisir une catégorie serveur.'}
                  </Text>
                  {activeRoot || selectedCategory ? (
                    <Paper withBorder p="xs" radius="md" data-testid="reception-category-active-summary">
                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          Famille active : <strong>{activeRoot?.name ?? selectedCategory?.name ?? 'Aucune'}</strong>
                        </Text>
                        <Text size="xs" c="dimmed">
                          Sous-catégorie active : <strong>{selectedCategory?.name ?? 'Aucune'}</strong>
                        </Text>
                      </Stack>
                    </Paper>
                  ) : null}
                  <Grid gutter="xs" data-testid="reception-category-root-grid" ref={rootGridRef}>
                    {rootCategories.map((category, index) => (
                      <Grid.Col key={category.id} span={6}>
                        <Button
                          fullWidth
                          variant={activeRootId === category.id ? 'filled' : 'light'}
                          color={activeRootId === category.id ? 'green' : 'gray'}
                          justify="flex-start"
                          onClick={() => onSelectRootCategory(category.id)}
                          onKeyDown={(event) => onRootTileKeyDown(event, category.id, index)}
                          onFocus={() => setFocusedRootId(category.id)}
                          onBlur={() => setFocusedRootId((current) => (current === category.id ? null : current))}
                          disabled={!ticketId || dataStale}
                          tabIndex={activeRootId === category.id ? 0 : -1}
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
                          data-selected={activeRootId === category.id ? 'true' : 'false'}
                          data-focused={focusedRootId === category.id ? 'true' : 'false'}
                          data-testid={`reception-category-tile-${category.id}`}
                        >
                          {category.name}
                        </Button>
                      </Grid.Col>
                    ))}
                  </Grid>
                  {hasHierarchy && activeRoot ? (
                    <Stack gap="xs" data-testid="reception-category-child-panel">
                      <Text size="xs" fw={600} c="dimmed">
                        Sous-catégories {activeRoot.name}
                      </Text>
                      <Grid gutter="xs" data-testid="reception-category-child-grid" ref={childGridRef}>
                        {activeChildren.map((category, index) => (
                          <Grid.Col key={category.id} span={6}>
                            <Button
                              fullWidth
                              variant={categoryId === category.id ? 'filled' : 'default'}
                              color={categoryId === category.id ? 'green' : 'gray'}
                              justify="flex-start"
                              onClick={() => selectCategoryAndFocusPoids(category.id)}
                              onKeyDown={(event) => onSubcategoryTileKeyDown(event, category.id, index)}
                              onFocus={() => setFocusedChildId(category.id)}
                              onBlur={() => setFocusedChildId((current) => (current === category.id ? null : current))}
                              disabled={!ticketId || dataStale}
                              tabIndex={categoryId === category.id ? 0 : -1}
                              style={
                                focusedChildId === category.id
                                  ? {
                                      outline: '3px solid var(--mantine-color-blue-5)',
                                      outlineOffset: 2,
                                      boxShadow: categoryId === category.id ? '0 0 0 1px var(--mantine-color-green-8)' : undefined,
                                    }
                                  : undefined
                              }
                              data-selected={categoryId === category.id ? 'true' : 'false'}
                              data-focused={focusedChildId === category.id ? 'true' : 'false'}
                              data-testid={`reception-subcategory-tile-${category.id}`}
                            >
                              {category.name}
                            </Button>
                          </Grid.Col>
                        ))}
                      </Grid>
                    </Stack>
                  ) : null}
                  <div data-testid="reception-category-grid">
                  <Select
                    label="Catégorie"
                    data={categoryOptions}
                    value={categoryId}
                    onChange={(v) => selectCategoryAndFocusPoids(v)}
                    disabled={!ticketId || categories.length === 0 || dataStale}
                    data-testid="reception-select-category"
                  />
                  </div>
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
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Paper withBorder p="sm" data-testid="reception-cockpit-center">
                <Stack gap="sm">
                  <Text size="sm" fw={600}>
                    Poids et action
                  </Text>
                  <Paper withBorder p="sm" radius="md" data-testid="reception-poids-display">
                    <Text size="xs" c="dimmed" fw={600}>
                      Poids saisi
                    </Text>
                    <Text fw={700} size="xl">
                      {(Number.isFinite(poidsKg) ? poidsKg : 0).toFixed(2)} kg
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
                            outline: poidsPostAddFeedback
                              ? '3px solid var(--mantine-color-green-5)'
                              : '3px solid var(--mantine-color-blue-5)',
                            outlineOffset: 2,
                            borderRadius: 'var(--mantine-radius-md)',
                            padding: 'var(--mantine-spacing-xs)',
                            boxShadow: poidsPostAddFeedback
                              ? '0 0 0 2px var(--mantine-color-green-1)'
                              : undefined,
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
                    <div
                      ref={poidsInputWrapperRef}
                      data-testid="reception-poids-focus-ring"
                      data-focused={poidsInputFocused ? 'true' : 'false'}
                      onKeyDownCapture={onPoidsInputKeyDown}
                      style={
                        poidsInputFocused
                          ? {
                              outline: '3px solid var(--mantine-color-blue-5)',
                              outlineOffset: 2,
                              borderRadius: 'var(--mantine-radius-md)',
                            }
                          : undefined
                      }
                    >
                      <NumberInput
                        label="Poids (kg)"
                        min={0.001}
                        step={0.1}
                        value={poidsKg}
                        onChange={(v) => {
                          const nextValue = Number(v) || 0;
                          setPoidsKg(nextValue);
                          setPoidsDraft(String(v ?? '0'));
                        }}
                        onFocus={() => setPoidsInputFocused(true)}
                        onBlur={() => setPoidsInputFocused(false)}
                        disabled={!ticketId || dataStale}
                        data-testid="reception-input-poids-kg"
                      />
                    </div>
                    <Grid gutter="xs" data-testid="reception-poids-keypad">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '<-'].map((key) => (
                        <Grid.Col key={key} span={4}>
                          <Button
                            fullWidth
                            variant={key === '<-' ? 'default' : 'light'}
                            onClick={() => (key === '<-' ? backspacePoids() : appendPoidsKey(key))}
                            disabled={!ticketId || dataStale}
                            data-testid={`reception-keypad-${key === '.' ? 'dot' : key === '<-' ? 'backspace' : key}`}
                          >
                            {key}
                          </Button>
                        </Grid.Col>
                      ))}
                    </Grid>
                    <Group grow>
                      <Button
                        color="gray"
                        variant="default"
                        onClick={clearPoids}
                        disabled={!ticketId || dataStale}
                        data-testid="reception-keypad-clear"
                      >
                        C
                      </Button>
                    </Group>
                  </div>
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
                        disabled={!ticketId || !categoryId || poidsKg <= 0 || dataStale}
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
                      disabled={!canAddLigne}
                      loading={busy === 'ligne'}
                      data-testid="reception-add-ligne"
                    >
                      Ajouter la ligne
                    </Button>
                  )}
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper withBorder p="sm" data-testid="reception-cockpit-right">
                <Stack gap="sm">
                  <Text size="sm" fw={600}>
                    Résumé du ticket
                  </Text>
                  {ticketDetail ? (
                    <Stack gap="sm" data-testid="reception-ticket-lignes-summary">
                      <Text size="sm" fw={600}>
                        Lignes côté serveur : {ticketDetail.lignes.length}
                      </Text>
                      <Grid gutter="xs">
                        <Grid.Col span={6}>
                          <Paper withBorder p="xs" radius="md" data-testid="reception-ticket-summary-count">
                            <Text size="xs" c="dimmed">
                              Lignes
                            </Text>
                            <Text fw={700}>{ticketDetail.lignes.length}</Text>
                          </Paper>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Paper withBorder p="xs" radius="md" data-testid="reception-ticket-summary-total">
                            <Text size="xs" c="dimmed">
                              Poids total
                            </Text>
                            <Text fw={700}>{ticketTotalPoids.toFixed(2)} kg</Text>
                          </Paper>
                        </Grid.Col>
                      </Grid>
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
                      ) : (
                        <Text size="sm" c="dimmed">
                          Aucune ligne ajoutée.
                        </Text>
                      )}
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
                    </Stack>
                  ) : (
                    <Text size="sm" c="dimmed">
                      Aucun ticket chargé.
                    </Text>
                  )}
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid> : null}
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
          {posteId ? (
            <Button variant="light" size="xs" onClick={() => void refreshTicket()} disabled={!ticketId}>
              Rafraîchir le ticket (GET détail)
            </Button>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}
