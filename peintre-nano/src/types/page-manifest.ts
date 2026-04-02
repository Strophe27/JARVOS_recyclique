/**
 * PageManifest — composition de page déclarative (références widgets / slots selon contrats CREOS).
 * Propriétaire : commanditaire. Direction schémas : `contracts/creos/schemas/widget-declaration.schema.json`.
 * Story 3.0 : types minimaux uniquement.
 */

/** Objet plat JSON-sérialisable (camelCase après ingest ; JSON source : `widget_props`). */
export type PageWidgetProps = Readonly<Record<string, unknown>>;

export interface PageSlotPlacement {
  readonly slotId: string;
  /** Type de widget dans le catalogue CREOS (`type` côté schéma widget-declaration). */
  readonly widgetType: string;
  /** Optionnel — transmis au composant résolu (`widget_props` en snake_case côté JSON). */
  readonly widgetProps?: PageWidgetProps;
}

export interface PageManifest {
  readonly version: string;
  readonly pageKey: string;
  readonly slots: readonly PageSlotPlacement[];
  /**
   * Permissions minimales pour autoriser le rendu métier de la page (intersection enveloppe).
   * snake_case JSON : `required_permission_keys`.
   */
  readonly requiredPermissionKeys?: readonly string[];
  /** Si true, `siteId` non nul requis sur l'enveloppe. snake_case JSON : `requires_site`. */
  readonly requiresSite?: boolean;
}
