import type { CategoryListItem } from '../../api/dashboard-legacy-stats-client';
import type { ReceptionCategoryRow } from '../../api/reception-client';
import type { CategoryHierarchyRow } from './types';

export function fromCategoryListItem(items: CategoryListItem[]): CategoryHierarchyRow[] {
  return items.map((item) => ({
    id: item.id,
    parent_id: item.parent_id == null || String(item.parent_id).trim() === '' ? null : String(item.parent_id),
    label: item.name,
    ordre: item.display_order,
    meta: { cashflowItem: item },
  }));
}

export function fromReceptionCategoryRow(items: ReceptionCategoryRow[]): CategoryHierarchyRow[] {
  return items.map((item, index) => ({
    id: item.id,
    parent_id: item.parent_id == null || String(item.parent_id).trim() === '' ? null : String(item.parent_id),
    label: item.name,
    ordre: index,
    meta: { receptionItem: item },
  }));
}
