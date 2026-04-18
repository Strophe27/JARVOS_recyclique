// Pont minimal entre l'intercepteur axios (hors React) et react-router (SPA).
import type { NavigateFunction } from 'react-router-dom';

let navigateRef: NavigateFunction | null = null;

export function registerAuthNavigate(navigate: NavigateFunction): void {
  navigateRef = navigate;
}

export function unregisterAuthNavigate(): void {
  navigateRef = null;
}

/** Après logout forcé (401) : navigation client sans rechargement pleine page. */
export function navigateToLoginReplace(): void {
  if (navigateRef) {
    navigateRef('/login', { replace: true });
    return;
  }
  window.location.assign('/login');
}
