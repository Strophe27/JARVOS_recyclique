/**
 * Codes stables DOM / `reportRuntimeFallback` — préfixe `TRANSVERSE_*` (story 5.7).
 * Pas de sémantique métier Recyclique : états de surface du shell transverse uniquement.
 */
export const TRANSVERSE_RUNTIME_CODES = {
  LOADING: 'TRANSVERSE_PAGE_LOADING',
  EMPTY: 'TRANSVERSE_PAGE_EMPTY',
  ERROR: 'TRANSVERSE_PAGE_ERROR',
} as const;
