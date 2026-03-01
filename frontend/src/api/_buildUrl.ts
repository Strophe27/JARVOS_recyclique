/**
 * Helper pour construire des URLs API valides — Story 15.0.
 * Évite « Failed to construct URL: Invalid URL » quand VITE_API_BASE_URL est vide (mode dev proxy).
 */

const getBase = (): string =>
  (import.meta.env?.VITE_API_BASE_URL as string) ?? '';

/**
 * Construit une URL valide pour les appels API.
 * Utilise getBase() si défini, sinon window.location.origin (mode dev proxy).
 * @param path - Chemin absolu ex. '/v1/categories'
 * @param params - Paramètres query string optionnels
 */
export function buildUrl(path: string, params?: Record<string, string>): URL {
  const base = getBase() || window.location.origin;
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url;
}
