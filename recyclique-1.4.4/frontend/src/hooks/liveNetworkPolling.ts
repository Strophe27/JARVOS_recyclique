/**
 * Constantes et helpers partagés par les hooks de polling réseau « live » (stats réception / caisse / KPI).
 * Pas d'abstraction de hook : uniquement le plancher d'intervalle et le mapping d'erreurs Axios -> message UI.
 */

/** Plancher d'intervalle pour le setInterval des hooks live (évite le spam API). */
export const LIVE_NETWORK_POLL_INTERVAL_MIN_MS = 10_000;

const DEFAULT_LIVE_ERROR_MESSAGE = 'Erreur réseau, stats live suspendues';

function isAxiosLikeError(err: unknown): err is { response?: { status?: number } } {
  return err !== null && typeof err === 'object' && 'response' in err;
}

/**
 * Mappe une erreur (souvent Axios) vers un message utilisateur pour les endpoints stats live.
 */
export function mapLiveNetworkStatsError(err: unknown): string {
  if (!isAxiosLikeError(err)) {
    return DEFAULT_LIVE_ERROR_MESSAGE;
  }

  const status = err.response?.status;
  switch (status) {
    case 404:
      return 'Endpoint live stats non disponible';
    case 403:
      return 'Accès non autorisé aux stats live';
    case 500:
    case 502:
    case 503:
      return 'Erreur serveur, stats live indisponibles';
    default:
      return DEFAULT_LIVE_ERROR_MESSAGE;
  }
}
