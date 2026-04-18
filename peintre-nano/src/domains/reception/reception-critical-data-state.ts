import { useSyncExternalStore } from 'react';

/**
 * État « ticket courant / poste » pour le widget réception **critical** (CREOS `data_contract.critical: true`).
 * DATA_STALE = hard stop sur les mutations tant que le GET détail n’a pas rétabli une vérité serveur explicite (Story 7.5).
 */
export type ReceptionCriticalDataState = 'NOMINAL' | 'DATA_STALE';

let state: ReceptionCriticalDataState = 'NOMINAL';
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function subscribeReceptionCriticalData(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getReceptionCriticalDataSnapshot(): ReceptionCriticalDataState {
  return state;
}

export function setReceptionCriticalDataState(next: ReceptionCriticalDataState): void {
  if (state === next) return;
  state = next;
  emit();
}

/** Pour tests / démo — même idée que `setCashflowWidgetDataState` (Epic 6). */
export function useReceptionCriticalDataState(): ReceptionCriticalDataState {
  return useSyncExternalStore(
    subscribeReceptionCriticalData,
    getReceptionCriticalDataSnapshot,
    getReceptionCriticalDataSnapshot,
  );
}
