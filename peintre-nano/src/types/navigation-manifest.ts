/**
 * NavigationManifest — structure informationnelle commanditaire (navigation, routes, raccourcis structurels).
 * Propriétaire : commanditaire (Recyclique / contrats CREOS). Le runtime **interprète** sans réinventer la structure métier.
 * Source canonique : `contracts/creos/manifests/` (+ livraison backend). Story 3.0 : types minimaux, pas de chargement JSON.
 */

export interface NavigationEntry {
  readonly id: string;
  /** Clé stable côté contrat (pas une URL locale posée comme vérité métier). */
  readonly routeKey: string;
  /** Chemin présentation / route affichable si le contrat le fournit (unicité contrôlée en validation). */
  readonly path?: string;
  /** Cible `page_key` du PageManifest associé (résolution croisée au chargement). */
  readonly pageKey?: string;
  /** Identifiant de raccourci clavier (ou équivalent) — collisions détectées si présent. */
  readonly shortcutId?: string;
  readonly labelKey?: string;
  /**
   * Clés de permission requises pour afficher l'entrée (intersection avec `ContextEnvelope`).
   * Optionnel, rétrocompatible ; snake_case JSON : `required_permission_keys`.
   */
  readonly requiredPermissionKeys?: readonly string[];
  readonly children?: readonly NavigationEntry[];
}

export interface NavigationManifest {
  readonly version: string;
  readonly entries: readonly NavigationEntry[];
}
