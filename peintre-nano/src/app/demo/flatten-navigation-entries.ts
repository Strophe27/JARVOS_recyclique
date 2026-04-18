import type { NavigationEntry } from '../../types/navigation-manifest';

/** Aplatit le manifest filtré (arbre optionnel) pour résolution `page_key` par `id` d’entrée. */
export function flattenNavigationEntries(entries: readonly NavigationEntry[]): NavigationEntry[] {
  const out: NavigationEntry[] = [];
  for (const e of entries) {
    out.push(e);
    if (e.children?.length) {
      out.push(...flattenNavigationEntries(e.children));
    }
  }
  return out;
}
