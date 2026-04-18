/**
 * Convention guards — Story 17.3 (rail U, Epic 17).
 *
 * **Source de vérité** : les `PageManifest` CREOS servis + le `ContextEnvelope` (permissions effectives,
 * site actif). Le runtime **interprète** ces signaux (filtrage nav, refus de rendu) et ne doit pas
 * réintroduire une autorisation métier parallèle (voir `peintre-nano/docs/03-contrats-creos-et-donnees.md`).
 *
 * Alignement legacy : routes sous `adminOnly` sans permission fantôme — uniquement la clé transverse
 * déjà utilisée par le hub admin observable.
 */
export const ADMIN_TRANSVERSE_LIST_PAGE_MANIFEST_GUARDS = {
  requiredPermissionKeys: ['transverse.admin.view'] as const,
  requiresSite: true as const,
} as const;

export type AdminTransverseListPageManifestGuards = typeof ADMIN_TRANSVERSE_LIST_PAGE_MANIFEST_GUARDS;
