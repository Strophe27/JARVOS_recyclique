import { useSyncExternalStore } from 'react';
import type { RecycliqueClientFailure } from '../../api/recyclique-api-error';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';

export type WidgetDataState = 'NOMINAL' | 'DATA_STALE';

export type TicketLine = {
  readonly id: string;
  /** Code / identifiant contrat envoyé aux POST vente (inchangé). */
  readonly category: string;
  /**
   * Libellé métier (grille kiosque, sous-catégorie) — ticket / a11y uniquement.
   * Si absent ou vide, l’UI retombe sur `category`.
   */
  readonly displayLabel?: string;
  readonly quantity: number;
  readonly weight: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
  /** Story 24.9 — tag métier ligne (optionnel ; prime sur le tag ticket). */
  readonly businessTagKind?: string;
  readonly businessTagCustom?: string;
};

/** Désignation lisible pour ticket et accessibilité (brouillon ou ligne déjà typée). */
export function ticketLineDisplayLabel(line: Pick<TicketLine, 'category' | 'displayLabel'>): string {
  const t = line.displayLabel?.trim();
  return t && t.length > 0 ? t : line.category;
}

/** Mode d’ouverture choisi sur le dashboard brownfield (Story 6.10 / §7) — null si session uniquement serveur / inconnu. */
export type CashflowOperatingMode = 'real' | 'virtual' | 'deferred';

export type CashflowDraftState = {
  readonly lines: readonly TicketLine[];
  readonly totalAmount: number;
  /**
   * Code référentiel expert (`payment_methods.code`) ou `free` pour gratuité.
   * Chaîne vide tant que les options caisse n'ont pas permis de choisir le premier moyen actif.
   */
  readonly paymentMethod: string;
  /** Saisie locale si l'enveloppe ne fournit pas encore `cashSessionId`. */
  readonly cashSessionIdInput: string;
  /** Renseigné après POST d’ouverture explicite depuis `/caisse` (réel / virtuel / différé). */
  readonly operatingMode: CashflowOperatingMode | null;
  readonly widgetDataState: WidgetDataState;
  readonly lastSaleId: string | null;
  /**
   * Story 6.3 — ticket en attente rechargé depuis l'API (vérité serveur pour le panneau ticket).
   * Finalisation via `postFinalizeHeldSale`, pas `postCreateSale`.
   */
  readonly activeHeldSaleId: string | null;
  /** Incrémenté après mise en attente pour recharger la liste serveur (Story 6.3). */
  readonly heldTicketsRefreshToken: number;
  /** Message honnête post-POST (enregistrement local, pas sync comptable). */
  readonly localIssueMessage: string | null;
  /** Erreur saisie locale ou échec API structuré (Story 6.9 / AR21). */
  readonly submitError: CashflowSubmitSurfaceError | null;
  /** Story 24.9 — tag métier au niveau ticket (parcours nominal). */
  readonly ticketBusinessTagKind: string;
  readonly ticketBusinessTagCustom: string;
};

const initialState: CashflowDraftState = {
  lines: [],
  totalAmount: 0,
  paymentMethod: '',
  cashSessionIdInput: '',
  operatingMode: null,
  widgetDataState: 'NOMINAL',
  lastSaleId: null,
  activeHeldSaleId: null,
  heldTicketsRefreshToken: 0,
  localIssueMessage: null,
  submitError: null,
  ticketBusinessTagKind: '',
  ticketBusinessTagCustom: '',
};

let state: CashflowDraftState = initialState;
const listeners = new Set<() => void>();

/** Préfixe sessionStorage — suffixe `:${userKey}` (userId ou `anonymous`). */
export const CASHFLOW_DRAFT_SESSION_STORAGE_PREFIX = 'peintre-nano.cashflow-draft.v1';

const PERSIST_SCHEMA = 'cashflow-draft-v1' as const;

type PersistedCashflowDraftV1 = {
  readonly schema: typeof PERSIST_SCHEMA;
  readonly lines: readonly TicketLine[];
  readonly totalAmount: number;
  readonly paymentMethod: string;
  readonly cashSessionIdInput: string;
  readonly operatingMode: CashflowOperatingMode | null;
  readonly widgetDataState: WidgetDataState;
  readonly lastSaleId: string | null;
  readonly activeHeldSaleId: string | null;
  readonly heldTicketsRefreshToken: number;
  readonly ticketBusinessTagKind: string;
  readonly ticketBusinessTagCustom: string;
};

function draftStorageKey(userKey: string): string {
  return `${CASHFLOW_DRAFT_SESSION_STORAGE_PREFIX}:${userKey}`;
}

function parsePersistedDraft(raw: string): Partial<CashflowDraftState> | null {
  try {
    const j = JSON.parse(raw) as unknown;
    if (j === null || typeof j !== 'object') return null;
    const o = j as Record<string, unknown>;
    if (o.schema !== PERSIST_SCHEMA) return null;
    if (!Array.isArray(o.lines)) return null;
    const lines: TicketLine[] = [];
    for (const row of o.lines) {
      if (row === null || typeof row !== 'object') return null;
      const L = row as Record<string, unknown>;
      if (typeof L.id !== 'string' || typeof L.category !== 'string') return null;
      if (typeof L.quantity !== 'number' || typeof L.weight !== 'number') return null;
      if (typeof L.unitPrice !== 'number' || typeof L.totalPrice !== 'number') return null;
      lines.push({
        id: L.id,
        category: L.category,
        ...(typeof L.displayLabel === 'string' ? { displayLabel: L.displayLabel } : {}),
        quantity: L.quantity,
        weight: L.weight,
        unitPrice: L.unitPrice,
        totalPrice: L.totalPrice,
        ...(typeof L.businessTagKind === 'string' ? { businessTagKind: L.businessTagKind } : {}),
        ...(typeof L.businessTagCustom === 'string' ? { businessTagCustom: L.businessTagCustom } : {}),
      });
    }
    const totalAmount = typeof o.totalAmount === 'number' ? o.totalAmount : null;
    if (totalAmount === null || !Number.isFinite(totalAmount)) return null;
    const paymentMethod = typeof o.paymentMethod === 'string' ? o.paymentMethod : '';
    const cashSessionIdInput = typeof o.cashSessionIdInput === 'string' ? o.cashSessionIdInput : '';
    const om = o.operatingMode;
    const operatingMode =
      om === null || om === undefined
        ? null
        : om === 'real' || om === 'virtual' || om === 'deferred'
          ? om
          : null;
    const wds = o.widgetDataState === 'DATA_STALE' || o.widgetDataState === 'NOMINAL' ? o.widgetDataState : 'NOMINAL';
    const lastSaleId =
      o.lastSaleId === null || o.lastSaleId === undefined
        ? null
        : typeof o.lastSaleId === 'string'
          ? o.lastSaleId
          : null;
    const activeHeldSaleId =
      o.activeHeldSaleId === null || o.activeHeldSaleId === undefined
        ? null
        : typeof o.activeHeldSaleId === 'string'
          ? o.activeHeldSaleId
          : null;
    const heldTicketsRefreshToken =
      typeof o.heldTicketsRefreshToken === 'number' && Number.isFinite(o.heldTicketsRefreshToken)
        ? o.heldTicketsRefreshToken
        : 0;
    const ticketBusinessTagKind = typeof o.ticketBusinessTagKind === 'string' ? o.ticketBusinessTagKind : '';
    const ticketBusinessTagCustom = typeof o.ticketBusinessTagCustom === 'string' ? o.ticketBusinessTagCustom : '';
    return {
      lines,
      totalAmount,
      paymentMethod,
      cashSessionIdInput,
      operatingMode,
      widgetDataState: wds,
      lastSaleId,
      activeHeldSaleId,
      heldTicketsRefreshToken,
      ticketBusinessTagKind,
      ticketBusinessTagCustom,
    };
  } catch {
    return null;
  }
}

function serializeDraft(s: CashflowDraftState): PersistedCashflowDraftV1 {
  return {
    schema: PERSIST_SCHEMA,
    lines: [...s.lines],
    totalAmount: s.totalAmount,
    paymentMethod: s.paymentMethod,
    cashSessionIdInput: s.cashSessionIdInput,
    operatingMode: s.operatingMode,
    widgetDataState: s.widgetDataState,
    lastSaleId: s.lastSaleId,
    activeHeldSaleId: s.activeHeldSaleId,
    heldTicketsRefreshToken: s.heldTicketsRefreshToken,
    ticketBusinessTagKind: s.ticketBusinessTagKind,
    ticketBusinessTagCustom: s.ticketBusinessTagCustom,
  };
}

/** À appeler à la déconnexion — supprime tous les brouillons persistés de l’onglet. */
export function clearAllCashflowDraftSessionKeys(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  const prefix = `${CASHFLOW_DRAFT_SESSION_STORAGE_PREFIX}:`;
  const toRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith(prefix)) {
      toRemove.push(k);
    }
  }
  for (const k of toRemove) {
    sessionStorage.removeItem(k);
  }
}

/**
 * Hydratation + persistance debouncée du brouillon caisse (sessionStorage, survit au F5).
 * À activer depuis le wizard nominal quand l’utilisateur est connu.
 */
export function attachCashflowDraftSessionPersistence(userKey: string): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const key = draftStorageKey(userKey.trim() || 'anonymous');
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const partial = parsePersistedDraft(raw);
      if (partial && (partial.lines?.length || (partial.totalAmount ?? 0) > 0 || partial.cashSessionIdInput?.trim())) {
        state = {
          ...state,
          ...partial,
          submitError: null,
          localIssueMessage: null,
        };
        emit();
      }
    }
  } catch {
    /* noop */
  }

  let timeout: ReturnType<typeof setTimeout> | null = null;
  const persist = () => {
    try {
      sessionStorage.setItem(key, JSON.stringify(serializeDraft(state)));
    } catch {
      /* quota */
    }
  };

  const unsub = subscribeCashflowDraft(() => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = null;
      persist();
    }, 300);
  });

  return () => {
    unsub();
    if (timeout !== null) {
      clearTimeout(timeout);
    }
  };
}

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeCashflowDraft(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCashflowDraftSnapshot(): CashflowDraftState {
  return state;
}

export function resetCashflowDraft(): void {
  state = { ...initialState };
  emit();
}

export function addTicketLine(line: Omit<TicketLine, 'id'> & { id?: string }): void {
  const id = line.id ?? `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  state = {
    ...state,
    lines: [...state.lines, { ...line, id }],
    localIssueMessage: null,
    submitError: null,
  };
  emit();
}

export function setTotalAmount(n: number): void {
  state = { ...state, totalAmount: n, localIssueMessage: null, submitError: null };
  emit();
}

export function setPaymentMethod(m: string): void {
  state = { ...state, paymentMethod: m };
  emit();
}

/** Story 24.9 — tag métier ticket (AUTRE → renseigner le custom). */
export function setTicketBusinessTags(kind: string, custom: string): void {
  state = { ...state, ticketBusinessTagKind: kind, ticketBusinessTagCustom: custom };
  emit();
}

export function setCashSessionIdInput(v: string): void {
  state = { ...state, cashSessionIdInput: v };
  emit();
}

export function setCashflowOperatingMode(m: CashflowOperatingMode | null): void {
  state = { ...state, operatingMode: m };
  emit();
}

/** Exposé pour tests / démo — simule DATA_STALE sur le widget critique ticket. */
export function setCashflowWidgetDataState(s: WidgetDataState): void {
  state = { ...state, widgetDataState: s };
  emit();
}

export function clearCashflowDraftSubmitError(): void {
  state = { ...state, submitError: null };
  emit();
}

export function setCashflowDraftLocalSubmitError(message: string): void {
  state = { ...state, submitError: { kind: 'local', message } };
  emit();
}

export function setCashflowDraftApiSubmitError(failure: RecycliqueClientFailure): void {
  state = { ...state, submitError: { kind: 'api', failure } };
  emit();
}

/** @deprecated Préférer clearCashflowDraftSubmitError / setCashflowDraftLocalSubmitError / setCashflowDraftApiSubmitError */
export function setSubmitError(msg: string | null): void {
  if (msg === null) {
    clearCashflowDraftSubmitError();
    return;
  }
  setCashflowDraftLocalSubmitError(msg);
}

export function setAfterSuccessfulSale(saleId: string): void {
  state = {
    ...state,
    lastSaleId: saleId,
    activeHeldSaleId: null,
    totalAmount: 0,
    paymentMethod: '',
    ticketBusinessTagKind: '',
    ticketBusinessTagCustom: '',
    localIssueMessage:
      'Vente enregistrée localement dans Recyclique. La synchronisation comptable avec Paheko n’est pas prétendue finalisée sur cet écran.',
    widgetDataState: 'NOMINAL',
    submitError: null,
    lines: [],
  };
  emit();
}

/** Story 6.3 — charge un ticket « held » renvoyé par GET /v1/sales/{id} (vérité API). */
export function applyServerHeldSaleToDraft(sale: {
  id: string;
  total_amount: number;
  items: Array<{
    id?: string;
    category: string;
    quantity: number;
    weight: number;
    unit_price: number;
    total_price: number;
  }>;
}): void {
  const lines: TicketLine[] = sale.items.map((it, i) => ({
    id: it.id ?? `held-${i}`,
    category: it.category,
    quantity: it.quantity,
    weight: it.weight,
    unitPrice: it.unit_price,
    totalPrice: it.total_price,
  }));
  state = {
    ...state,
    lines,
    totalAmount: sale.total_amount,
    activeHeldSaleId: sale.id,
    lastSaleId: null,
    widgetDataState: 'NOMINAL',
    submitError: null,
    localIssueMessage: null,
  };
  emit();
}

export function clearActiveHeldSale(): void {
  state = { ...state, activeHeldSaleId: null };
  emit();
}

export function bumpHeldTicketsListRefresh(): void {
  state = { ...state, heldTicketsRefreshToken: state.heldTicketsRefreshToken + 1 };
  emit();
}

/** Après mise en attente réussie : brouillon vidé, pas de ticket finalisé. */
export function setAfterSuccessfulHold(): void {
  state = {
    ...state,
    lines: [],
    totalAmount: 0,
    activeHeldSaleId: null,
    lastSaleId: null,
    ticketBusinessTagKind: '',
    ticketBusinessTagCustom: '',
    widgetDataState: 'NOMINAL',
    submitError: null,
    heldTicketsRefreshToken: state.heldTicketsRefreshToken + 1,
    localIssueMessage:
      'Ticket mis en attente côté serveur. Reprenez-le depuis la liste ou continuez un autre encaissement.',
  };
  emit();
}

export function useCashflowDraft(): CashflowDraftState {
  return useSyncExternalStore(subscribeCashflowDraft, getCashflowDraftSnapshot, getCashflowDraftSnapshot);
}

export function linesSubtotal(lines: readonly TicketLine[]): number {
  return lines.reduce((acc, l) => acc + l.totalPrice, 0);
}
