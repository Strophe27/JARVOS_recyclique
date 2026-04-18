import type {
  CategoriesDataSource,
  CategoryAdminListRowDto,
} from '../../../api/admin-categories-client';

export type CategoriesSortBy = 'order' | 'name' | 'created';

export type CategoryRowWithDepth = { row: CategoryAdminListRowDto; depth: number };

/** Identifiants des fiches qui ont au moins un enfant (pour replier l’arbre, chevrons, etc.). */
export function parentIdsHavingChildren(
  rows: readonly { id: string; parent_id?: string | null }[],
): Set<string> {
  const out = new Set<string>();
  for (const r of rows) {
    if (r.parent_id) out.add(r.parent_id);
  }
  return out;
}

/**
 * Masque les descendants des nœuds listés dans `collapsedParentIds` (la ligne parent reste visible).
 * `flat` doit être l’ordre profondeur d’abord produit par `orderedRowsWithDepth`.
 */
export function filterFlatRowsHideCollapsedChildren(
  flat: readonly CategoryRowWithDepth[],
  collapsedParentIds: ReadonlySet<string>,
): CategoryRowWithDepth[] {
  if (collapsedParentIds.size === 0) return [...flat];
  const out: CategoryRowWithDepth[] = [];
  let barrierDepth: number | null = null;
  for (const item of flat) {
    if (barrierDepth !== null) {
      if (item.depth <= barrierDepth) barrierDepth = null;
      else continue;
    }
    out.push(item);
    if (collapsedParentIds.has(item.row.id)) {
      barrierDepth = item.depth;
    }
  }
  return out;
}

/** Fil d'Ariane « Parent › Enfant » aligné sur la hiérarchie `parent_id` (données liste courante). */
export function categoryBreadcrumbLabel(
  rows: readonly CategoryAdminListRowDto[],
  categoryId: string,
): string {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const parts: string[] = [];
  let cur: string | null = categoryId;
  while (cur) {
    const row = byId.get(cur);
    if (!row) break;
    parts.unshift(row.name);
    cur = row.parent_id ?? null;
  }
  return parts.join(' › ');
}

/** Filtre `is_visible` en conservant les parents pour l’arborescence (même principe que la recherche). */
export function filterCatsForReceptionVisibility(
  cats: readonly CategoryAdminListRowDto[],
  mode: 'all' | 'visible' | 'hidden',
): CategoryAdminListRowDto[] {
  if (mode === 'all') return [...cats];
  const byId = new Map(cats.map((c) => [c.id, c]));
  const keep = new Set<string>();
  for (const c of cats) {
    const ok = mode === 'visible' ? c.is_visible : !c.is_visible;
    if (!ok) continue;
    keep.add(c.id);
    let pid = c.parent_id;
    while (pid) {
      keep.add(pid);
      pid = byId.get(pid)?.parent_id ?? null;
    }
  }
  return cats.filter((c) => keep.has(c.id));
}

export function filterCatsForSearch(
  cats: readonly CategoryAdminListRowDto[],
  q: string,
): CategoryAdminListRowDto[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [...cats];
  const byId = new Map(cats.map((c) => [c.id, c]));
  const keep = new Set<string>();
  for (const c of cats) {
    const hay = `${c.name} ${c.official_name ?? ''}`.toLowerCase();
    if (!hay.includes(needle)) continue;
    keep.add(c.id);
    let pid = c.parent_id;
    while (pid) {
      keep.add(pid);
      pid = byId.get(pid)?.parent_id ?? null;
    }
  }
  return cats.filter((c) => keep.has(c.id));
}

/** Enfants directs d’un parent, triés comme dans l’arborescence admin (`orderedRowsWithDepth`). */
export function sortedDirectChildrenOf(
  cats: readonly CategoryAdminListRowDto[],
  parentId: string | null,
  sortBy: CategoriesSortBy,
  source: CategoriesDataSource,
): CategoryAdminListRowDto[] {
  const direct = cats.filter((c) => (c.parent_id ?? null) === parentId);
  return [...direct].sort((a, b) => compareSiblings(a, b, sortBy, source));
}

function compareSiblings(
  a: CategoryAdminListRowDto,
  b: CategoryAdminListRowDto,
  sortBy: CategoriesSortBy,
  source: CategoriesDataSource,
): number {
  if (sortBy === 'name') {
    return a.name.localeCompare(b.name, 'fr');
  }
  if (sortBy === 'created') {
    return a.created_at.localeCompare(b.created_at);
  }
  if (source === 'entry') {
    const de = a.display_order_entry - b.display_order_entry;
    if (de !== 0) return de;
    const o = a.display_order - b.display_order;
    if (o !== 0) return o;
  } else if (source === 'sale') {
    const o = a.display_order - b.display_order;
    if (o !== 0) return o;
    const de = a.display_order_entry - b.display_order_entry;
    if (de !== 0) return de;
  } else {
    const o = a.display_order - b.display_order;
    if (o !== 0) return o;
    const de = a.display_order_entry - b.display_order_entry;
    if (de !== 0) return de;
  }
  return a.name.localeCompare(b.name, 'fr');
}

export function orderedRowsWithDepth(
  cats: readonly CategoryAdminListRowDto[],
  sortBy: CategoriesSortBy,
  source: CategoriesDataSource,
): CategoryRowWithDepth[] {
  const children = new Map<string | null, CategoryAdminListRowDto[]>();
  for (const c of cats) {
    const pid = c.parent_id ?? null;
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid)!.push(c);
  }
  for (const arr of children.values()) {
    arr.sort((a, b) => compareSiblings(a, b, sortBy, source));
  }
  const out: CategoryRowWithDepth[] = [];
  const walk = (pid: string | null, depth: number) => {
    for (const c of children.get(pid) ?? []) {
      out.push({ row: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** Identifiants descendants directs et indirects de `rootId` (sans `rootId`). */
export function getDescendantIds(
  rows: readonly { id: string; parent_id?: string | null }[],
  rootId: string,
): Set<string> {
  const childrenByParent = new Map<string | null, string[]>();
  for (const r of rows) {
    const p = r.parent_id ?? null;
    if (!childrenByParent.has(p)) childrenByParent.set(p, []);
    childrenByParent.get(p)!.push(r.id);
  }
  const out = new Set<string>();
  const stack = [...(childrenByParent.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(childrenByParent.get(id) ?? []));
  }
  return out;
}

/** Catégories autorisées comme nouveau parent (exclut la fiche déplacée et tout son sous-arbre). */
export function getForbiddenReparentTargets(
  rows: readonly { id: string; parent_id?: string | null }[],
  movingCategoryId: string,
): Set<string> {
  const forbidden = new Set<string>([movingCategoryId]);
  for (const d of getDescendantIds(rows, movingCategoryId)) forbidden.add(d);
  return forbidden;
}

export type ReparentSelectOption = { value: string; label: string };

const ROOT_VALUE = '';

/** Données pour un `Select` Mantine : valeur vide = racine (`parent_id` null). */
export function buildReparentParentSelectData(
  rows: readonly CategoryAdminListRowDto[],
  movingCategoryId: string,
): ReparentSelectOption[] {
  const forbidden = getForbiddenReparentTargets(rows, movingCategoryId);

  const opts = rows
    .filter((r) => !forbidden.has(r.id))
    .map((r) => ({ value: r.id, label: categoryBreadcrumbLabel(rows, r.id) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

  return [{ value: ROOT_VALUE, label: '(Racine — aucun parent)' }, ...opts];
}

export function parentIdFromReparentSelectValue(value: string | null): string | null {
  if (value === null || value === undefined || value === ROOT_VALUE) return null;
  return value;
}

export function reparentSelectValueFromParentId(parentId: string | null): string {
  return parentId ?? ROOT_VALUE;
}

/** Parents possibles pour une nouvelle fiche (aucune exclusion de sous-arbre). */
export function buildParentSelectDataForCreate(rows: readonly CategoryAdminListRowDto[]): ReparentSelectOption[] {
  const opts = rows
    .map((r) => ({ value: r.id, label: categoryBreadcrumbLabel(rows, r.id) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  return [{ value: ROOT_VALUE, label: '(Racine — aucun parent)' }, ...opts];
}
