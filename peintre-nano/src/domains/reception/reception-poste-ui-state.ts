import { useSyncExternalStore } from 'react';

let posteOpened = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeReceptionPosteUiState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getReceptionPosteUiStateSnapshot(): boolean {
  return posteOpened;
}

export function setReceptionPosteUiState(next: boolean): void {
  if (posteOpened === next) return;
  posteOpened = next;
  emit();
}

export function useReceptionPosteUiState(): boolean {
  return useSyncExternalStore(
    subscribeReceptionPosteUiState,
    getReceptionPosteUiStateSnapshot,
    getReceptionPosteUiStateSnapshot,
  );
}
