/**
 * Story 25.8 — en-têtes optionnels alignés OpenAPI `RecycliqueContext*IdHeader`.
 * Hors scope : file offline PWA complète (stories 13.8 / 25.15).
 *
 * Une mutation ne doit pas laisser de **résidu** d’un binding précédent : toujours repartir
 * de `clearRecycliqueContextBindingHeaders` ou de `applyRecycliqueContextBindingHeaders` qui
 * efface d’abord les deux clés (puis pose au plus **un** site et/ou **une** session selon le
 * `binding` courant — pas deux vérités concurrentes sans réécriture explicite).
 */

export const HEADER_RECYCLIQUE_CONTEXT_SITE_ID = 'X-Recyclique-Context-Site-Id';
export const HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID = 'X-Recyclique-Context-Cash-Session-Id';

export type RecycliqueContextBinding = {
  readonly siteId?: string | null;
  readonly cashSessionId?: string | null;
};

/** Carte mutable ou `Headers` fetch — les deux sont courants côté client. */
export type RecycliqueContextHeadersTarget = Record<string, string> | Headers;

function isWebHeaders(h: RecycliqueContextHeadersTarget): h is Headers {
  return typeof Headers !== 'undefined' && h instanceof Headers;
}

function clearRecycliqueContextBindingHeaderKeysRecord(headers: Record<string, string>): void {
  delete headers[HEADER_RECYCLIQUE_CONTEXT_SITE_ID];
  delete headers[HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID];
}

/**
 * Supprime uniquement les en-têtes Recyclique (utile pour réinitialiser un objet réutilisé).
 */
export function clearRecycliqueContextBindingHeaders(headers: RecycliqueContextHeadersTarget): void {
  if (isWebHeaders(headers)) {
    headers.delete(HEADER_RECYCLIQUE_CONTEXT_SITE_ID);
    headers.delete(HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID);
    return;
  }
  clearRecycliqueContextBindingHeaderKeysRecord(headers);
}

/**
 * Réécrit les en-têtes de liaison (pas de valeurs résiduelles si l'objet `headers` est réutilisé).
 * Rétrocompat : sans `binding` ou sans valeurs non vides, aucun en-tête Recyclique n'est laissé.
 */
export function applyRecycliqueContextBindingHeaders(
  headers: RecycliqueContextHeadersTarget,
  binding: RecycliqueContextBinding | undefined,
): void {
  clearRecycliqueContextBindingHeaders(headers);
  if (!binding) return;
  const site = binding.siteId?.trim();
  const sess = binding.cashSessionId?.trim();
  if (isWebHeaders(headers)) {
    if (site) headers.set(HEADER_RECYCLIQUE_CONTEXT_SITE_ID, site);
    if (sess) headers.set(HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID, sess);
    return;
  }
  if (site) headers[HEADER_RECYCLIQUE_CONTEXT_SITE_ID] = site;
  if (sess) headers[HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID] = sess;
}
