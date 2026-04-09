import { useSyncExternalStore } from 'react';
import type { RecycliqueClientFailure } from '../../api/recyclique-api-error';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';

export type WidgetDataState = 'NOMINAL' | 'DATA_STALE';

export type TicketLine = {
  readonly id: string;
  readonly category: string;
  readonly quantity: number;
  readonly weight: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
};

/** Mode d’ouverture choisi sur le dashboard brownfield (Story 6.10 / §7) — null si session uniquement serveur / inconnu. */
export type CashflowOperatingMode = 'real' | 'virtual' | 'deferred';

export type CashflowDraftState = {
  readonly lines: readonly TicketLine[];
  readonly totalAmount: number;
  readonly paymentMethod: 'cash' | 'card';
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
};

const initialState: CashflowDraftState = {
  lines: [],
  totalAmount: 0,
  paymentMethod: 'cash',
  cashSessionIdInput: '',
  operatingMode: null,
  widgetDataState: 'NOMINAL',
  lastSaleId: null,
  activeHeldSaleId: null,
  heldTicketsRefreshToken: 0,
  localIssueMessage: null,
  submitError: null,
};

let state: CashflowDraftState = initialState;
const listeners = new Set<() => void>();

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

export function setPaymentMethod(m: 'cash' | 'card'): void {
  state = { ...state, paymentMethod: m };
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
