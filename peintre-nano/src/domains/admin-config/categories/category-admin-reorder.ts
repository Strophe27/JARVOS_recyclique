import type { CategoryAdminListRowDto, CategoryV1UpdateRequestBody } from '../../../api/admin-categories-client';

export type ReorderMove = 'up' | 'down';

/** Aligné sur l’admin : vue caisse (ordre ticket vente) ou réception (ordre dépôt). */
export type CategoryOrderMainView = 'sale' | 'entry';

export type CategoryDisplayOrderPatchItem = {
  readonly categoryId: string;
  readonly display_order?: number;
  readonly display_order_entry?: number;
};

/** Indique où la ligne déplacée se retrouvera par rapport à la ligne survolée (même sémantique que `arrayMove` legacy / dnd-kit). */
export type SiblingDragPlacementHint = {
  readonly placement: 'before' | 'after';
  readonly targetName: string;
};

/**
 * Prévisualise le résultat d’un dépôt sur une ligne sœur (même parent), sans modifier les données.
 * `before` = la ligne déplacée montera au-dessus de la cible ; `after` = elle descendra en dessous.
 */
export function getSiblingDragPlacementHint(
  rows: readonly CategoryAdminListRowDto[],
  mainView: CategoryOrderMainView,
  draggedId: string,
  targetId: string,
): SiblingDragPlacementHint | null {
  if (draggedId === targetId) return null;
  const siblings =
    mainView === 'entry' ? siblingsForReceptionOrder(rows, draggedId) : siblingsForCaisseOrder(rows, draggedId);
  const oi = siblings.findIndex((r) => r.id === draggedId);
  const ti = siblings.findIndex((r) => r.id === targetId);
  if (oi < 0 || ti < 0) return null;
  const active = siblings[oi];
  const over = siblings[ti];
  if ((active.parent_id ?? null) !== (over.parent_id ?? null)) return null;
  const placement: 'before' | 'after' = oi < ti ? 'after' : 'before';
  return { placement, targetName: over.name };
}

export function arrayMove<T>(arr: readonly T[], from: number, to: number): T[] {
  if (from === to) return [...arr];
  const a = [...arr];
  const [it] = a.splice(from, 1);
  a.splice(to, 0, it);
  return a;
}

/**
 * Recalcule les ordres (incréments de 10, comme le legacy) après glisser-déposer entre deux sœurs.
 */
export function computeOrdersAfterDragWithinSiblings(
  rows: readonly CategoryAdminListRowDto[],
  mainView: CategoryOrderMainView,
  activeId: string,
  overId: string,
): CategoryDisplayOrderPatchItem[] | null {
  if (activeId === overId) return null;
  const siblings =
    mainView === 'entry' ? siblingsForReceptionOrder(rows, activeId) : siblingsForCaisseOrder(rows, activeId);
  const oi = siblings.findIndex((r) => r.id === activeId);
  const ti = siblings.findIndex((r) => r.id === overId);
  if (oi < 0 || ti < 0) return null;
  const active = siblings[oi];
  const over = siblings[ti];
  if ((active.parent_id ?? null) !== (over.parent_id ?? null)) return null;
  const reordered = arrayMove(siblings, oi, ti);
  const step = 10;
  return reordered.map((r, i) => ({
    categoryId: r.id,
    ...(mainView === 'entry' ? { display_order_entry: i * step } : { display_order: i * step }),
  }));
}

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
