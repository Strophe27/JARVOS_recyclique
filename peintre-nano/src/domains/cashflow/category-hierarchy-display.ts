/**
 * Libellés hiérarchiques pour codes catégorie caisse (`GET /v1/categories/` — id ou nom legacy).
 */

export type CategoryHierarchyRow = {
  readonly id: string;
  readonly name: string;
  readonly parent_id?: string | null;
};

/** Chaîne « Parent › Enfant › … » pour affichage caissier ; chaîne vide si inconnu dans la liste. */
export function formatCategoryHierarchyLabel(
  storedCode: string,
  list: readonly CategoryHierarchyRow[],
): string {
  const raw = storedCode.trim();
  if (!raw || list.length === 0) return '';
  const leaf =
    list.find((c) => c.id === raw) ??
    list.find((c) => c.name.trim() === raw || c.id === raw.replace(/\s+/g, ''));
  if (!leaf) return '';
  const parts: string[] = [];
  let cur: CategoryHierarchyRow | undefined = leaf;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    parts.unshift(cur.name.trim());
    const pid = cur.parent_id?.trim();
    if (!pid) break;
    cur = list.find((c) => c.id === pid);
  }
  return parts.filter(Boolean).join(' › ');
}
