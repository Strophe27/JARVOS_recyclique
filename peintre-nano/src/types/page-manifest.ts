/**
 * PageManifest — composition de page déclarative (références widgets / slots selon contrats CREOS).
 * Propriétaire : commanditaire. Direction schémas : `contracts/creos/schemas/widget-declaration.schema.json`.
 * Story 3.0 : types minimaux uniquement.
 */

export interface PageSlotPlacement {
  readonly slotId: string;
  /** Type de widget dans le catalogue CREOS (`type` côté schéma widget-declaration). */
  readonly widgetType: string;
}

export interface PageManifest {
  readonly version: string;
  readonly pageKey: string;
  readonly slots: readonly PageSlotPlacement[];
}
