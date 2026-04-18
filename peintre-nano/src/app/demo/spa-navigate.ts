/**
 * Navigation client dans le shell démo (RuntimeDemoApp) : `pushState` + `popstate`
 * pour resynchroniser la sélection de route sans rechargement complet.
 */
export function spaNavigateTo(path: string): void {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
