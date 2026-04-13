import type { CategoryAdminListRowDto, CategoryV1UpdateRequestBody } from '../../../api/admin-categories-client';

export type ReorderMove = 'up' | 'down';

function sameParent(a: CategoryAdminListRowDto, b: CategoryAdminListRowDto): boolean {
  return (a.parent_id ?? null) === (b.parent_id ?? null);
}

/** Voisins directs (même parent), tri pour contrôle « ordre caisse » (display_order puis tie-break). */
export function siblingsForCaisseOrder(
  rows: readonly CategoryAdminListRowDto[],
  categoryId: string,
): CategoryAdminListRowDto[] {
  const t = rows.find((r) => r.id === categoryId);
  if (!t) return [];
  const pid = t.parent_id ?? null;
  return [...rows]
    .filter((r) => (r.parent_id ?? null) === pid)
    .sort(
      (a, b) =>
        a.display_order - b.display_order ||
        a.display_order_entry - b.display_order_entry ||
        a.name.localeCompare(b.name, 'fr'),
    );
}

/** Voisins directs (même parent), tri pour contrôle « ordre réception » (display_order_entry puis tie-break). */
export function siblingsForReceptionOrder(
  rows: readonly CategoryAdminListRowDto[],
  categoryId: string,
): CategoryAdminListRowDto[] {
  const t = rows.find((r) => r.id === categoryId);
  if (!t) return [];
  const pid = t.parent_id ?? null;
  return [...rows]
    .filter((r) => (r.parent_id ?? null) === pid)
    .sort(
      (a, b) =>
        a.display_order_entry - b.display_order_entry ||
        a.display_order - b.display_order ||
        a.name.localeCompare(b.name, 'fr'),
    );
}

function neighborIndex(move: ReorderMove, idx: number, len: number): number | null {
  if (move === 'up') {
    const j = idx - 1;
    return j >= 0 ? j : null;
  }
  const j = idx + 1;
  return j < len ? j : null;
}

/** Échange uniquement `display_order` entre deux sœurs (ordre caisse). */
export function swapCaisseOrderWithNeighbor(
  rows: readonly CategoryAdminListRowDto[],
  categoryId: string,
  move: ReorderMove,
): readonly { categoryId: string; body: CategoryV1UpdateRequestBody }[] | null {
  const sibs = siblingsForCaisseOrder(rows, categoryId);
  const idx = sibs.findIndex((r) => r.id === categoryId);
  if (idx < 0) return null;
  const j = neighborIndex(move, idx, sibs.length);
  if (j === null) return null;
  const a = sibs[idx];
  const b = sibs[j];
  if (!sameParent(a, b)) return null;
  return [
    { categoryId: a.id, body: { display_order: b.display_order } },
    { categoryId: b.id, body: { display_order: a.display_order } },
  ];
}

/** Échange uniquement `display_order_entry` entre deux sœurs (ordre réception). */
export function swapReceptionOrderWithNeighbor(
  rows: readonly CategoryAdminListRowDto[],
  categoryId: string,
  move: ReorderMove,
): readonly { categoryId: string; body: CategoryV1UpdateRequestBody }[] | null {
  const sibs = siblingsForReceptionOrder(rows, categoryId);
  const idx = sibs.findIndex((r) => r.id === categoryId);
  if (idx < 0) return null;
  const j = neighborIndex(move, idx, sibs.length);
  if (j === null) return null;
  const a = sibs[idx];
  const b = sibs[j];
  if (!sameParent(a, b)) return null;
  return [
    { categoryId: a.id, body: { display_order_entry: b.display_order_entry } },
    { categoryId: b.id, body: { display_order_entry: a.display_order_entry } },
  ];
}
