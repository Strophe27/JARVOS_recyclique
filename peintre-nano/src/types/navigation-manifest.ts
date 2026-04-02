/**
 * NavigationManifest — structure informationnelle commanditaire (navigation, routes, raccourcis structurels).
 * Propriétaire : commanditaire (Recyclique / contrats CREOS). Le runtime **interprète** sans réinventer la structure métier.
 * Source canonique : `contracts/creos/manifests/` (+ livraison backend). Story 3.0 : types minimaux, pas de chargement JSON.
 */

export interface NavigationEntry {
  readonly id: string;
  /** Clé stable côté contrat (pas une URL locale posée comme vérité métier). */
  readonly routeKey: string;
  readonly labelKey?: string;
  readonly children?: readonly NavigationEntry[];
}

export interface NavigationManifest {
  readonly version: string;
  readonly entries: readonly NavigationEntry[];
}
