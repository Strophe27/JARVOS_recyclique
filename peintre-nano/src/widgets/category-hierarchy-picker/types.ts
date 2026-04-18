import type { CategoryListItem } from '../../api/dashboard-legacy-stats-client';
import type { ReceptionCategoryRow } from '../../api/reception-client';

/** Modèle hiérarchique normalisé (hors fil wire). */
export type CategoryHierarchyRow = {
  readonly id: string;
  readonly parent_id: string | null;
  readonly label: string;
  readonly ordre: number;
  readonly meta?: CategoryHierarchyMeta;
};

export type CategoryHierarchyMeta = {
  readonly cashflowItem?: CategoryListItem;
  readonly receptionItem?: ReceptionCategoryRow;
};

export type CategoryHierarchyPresentation = 'kiosk_drill' | 'reception_rail';

/** Aligné CREOS — discriminant de chargement côté widget enregistré. */
export type CategoryHierarchyCategorySource = 'legacy_categories' | 'reception_categories';
