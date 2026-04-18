import type { ReceptionCategoryRow } from '../../api/reception-client';

/** Même partition que `ReceptionNominalWizard` : racines avec enfants d’abord, puis feuilles racines. */
export function receptionRootCategoriesOrdered(categories: ReceptionCategoryRow[]): ReceptionCategoryRow[] {
  const roots = categories.filter((category) => category.parent_id == null || category.parent_id === '');
  const rootsWithChildren = roots.filter((root) => categories.some((category) => category.parent_id === root.id));
  const leafRoots = roots.filter((root) => !categories.some((category) => category.parent_id === root.id));
  return [...rootsWithChildren, ...leafRoots];
}
