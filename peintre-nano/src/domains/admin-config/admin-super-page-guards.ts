/**
 * Garde pages / nav réservées super-admin (proxy permission : `caisse.sale_correct` dans ContextEnvelope,
 * aligné OpenAPI — ajoutée côté serveur uniquement pour super-admin).
 */
export const ADMIN_SUPER_PAGE_MANIFEST_GUARDS = {
  requiredPermissionKeys: ['transverse.admin.view', 'caisse.sale_correct'] as const,
  requiresSite: true as const,
} as const;
