/**
 * Story 25.8 — en-têtes optionnels alignés OpenAPI `RecycliqueContext*IdHeader`.
 * Hors scope : file offline PWA complète (stories 13.8 / 25.15).
 */

export const HEADER_RECYCLIQUE_CONTEXT_SITE_ID = 'X-Recyclique-Context-Site-Id';
export const HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID = 'X-Recyclique-Context-Cash-Session-Id';

export type RecycliqueContextBinding = {
  readonly siteId?: string | null;
  readonly cashSessionId?: string | null;
};

/** Ajoute les en-têtes si les valeurs sont non vides (rétrocompat : aucun en-tête si tout absent). */
export function applyRecycliqueContextBindingHeaders(
  headers: Record<string, string>,
  binding: RecycliqueContextBinding | undefined,
): void {
  if (!binding) return;
  const site = binding.siteId?.trim();
  const sess = binding.cashSessionId?.trim();
  if (site) headers[HEADER_RECYCLIQUE_CONTEXT_SITE_ID] = site;
  if (sess) headers[HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID] = sess;
}
