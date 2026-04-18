import type { NavigationEntry } from '../types/navigation-manifest';

/**
 * Ordre d’affichage de la barre horizontale auth live — parité observée avec `Header.jsx` (recyclique-1.4.4) :
 * Tableau de bord → Caisse → Réception → Administration.
 *
 * Le remboursement est une action **depuis la page Caisse** (`/caisse`), pas une entrée du bandeau global.
 *
 * Les autres entrées du {@link NavigationManifest} restent dans le manifest filtré (résolution de route,
 * liens profonds) ; seul le rendu « topbar » est réduit côté shell.
 */
export const LIVE_LEGACY_TOOLBAR_ENTRY_IDS = [
  'transverse-dashboard',
  'cashflow-nominal',
  'reception-nominal',
  'transverse-admin',
] as const;

const LIVE_SET = new Set<string>(LIVE_LEGACY_TOOLBAR_ENTRY_IDS);

/**
 * Sous-ensemble des entrées racine déjà filtrées par {@link filterNavigation}, dans l’ordre legacy.
 */
export function pruneNavigationEntriesForLiveToolbar(
  entries: readonly NavigationEntry[],
): NavigationEntry[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const out: NavigationEntry[] = [];
  for (const id of LIVE_LEGACY_TOOLBAR_ENTRY_IDS) {
    const e = byId.get(id);
    if (e) out.push(e);
  }
  return out.length ? out : [...entries];
}

export function isLiveLegacyToolbarEntryId(id: string): boolean {
  return LIVE_SET.has(id);
}
