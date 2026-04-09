/**
 * Parsing des erreurs JSON alignées OpenAPI `RecycliqueApiError` (AR21) + libellés FR24 pour affichage caisse.
 * Ne pas inférer de statut métier : consommation des champs fournis par le serveur.
 */

/** États sync opérationnelle (FR24 / SyncStateCore OpenAPI) — affichage uniquement. */
export const SYNC_STATE_CORE_LABELS: Readonly<Record<string, string>> = {
  a_reessayer: 'À réessayer (file de synchronisation)',
  en_quarantaine: 'En quarantaine (traitement bloqué côté serveur)',
  resolu: 'Résolu',
  rejete: 'Rejeté (côté serveur)',
};

export type ParsedRecycliqueApiError = {
  readonly detail: string;
  readonly code?: string;
  readonly retryable: boolean;
  readonly state: string | null | undefined;
  readonly correlation_id?: string;
};

export type RecycliqueClientFailure = {
  readonly httpStatus: number;
  readonly message: string;
  readonly code?: string;
  readonly retryable: boolean;
  readonly state?: string | null;
  readonly correlationId?: string;
  readonly networkError?: boolean;
};

export function labelSyncOperationalState(state: string | undefined | null): string | undefined {
  if (state == null || state === '') return undefined;
  return SYNC_STATE_CORE_LABELS[state] ?? state;
}

export function httpStatusFallbackCode(status: number): string | undefined {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'TOO_MANY_REQUESTS';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return status >= 500 ? 'INTERNAL_SERVER_ERROR' : undefined;
  }
}

export function normalizeRecycliqueDetailField(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'msg' in item) {
          const m = (item as { msg?: unknown }).msg;
          return typeof m === 'string' ? m : JSON.stringify(item);
        }
        return typeof item === 'string' ? item : JSON.stringify(item);
      })
      .filter(Boolean)
      .join(' · ');
  }
  if (detail != null && typeof detail === 'object') {
    return JSON.stringify(detail);
  }
  return '';
}

/**
 * Interprète le corps JSON d’une réponse d’erreur HTTP (RecycliqueApiError ou ancien `detail` seul).
 */
export function parseRecycliqueApiErrorBody(
  json: unknown,
  httpStatus: number,
  fallbackMessage: string,
): ParsedRecycliqueApiError {
  if (typeof json !== 'object' || json === null) {
    return {
      detail: fallbackMessage,
      code: httpStatusFallbackCode(httpStatus),
      retryable: httpStatus === 429 || httpStatus === 503,
      state: null,
    };
  }
  const o = json as Record<string, unknown>;
  const fromDetail = normalizeRecycliqueDetailField(o.detail);
  const detail = fromDetail || fallbackMessage;

  const code =
    typeof o.code === 'string' ? o.code : (httpStatusFallbackCode(httpStatus) ?? 'HTTP_ERROR');

  let retryable = httpStatus === 429 || httpStatus === 503;
  if (typeof o.retryable === 'boolean') {
    retryable = o.retryable;
  }

  let state: string | null | undefined;
  if (o.state === null) state = null;
  else if (typeof o.state === 'string') state = o.state;

  const correlation_id = typeof o.correlation_id === 'string' ? o.correlation_id : undefined;

  return { detail, code, retryable, state, correlation_id };
}

export function toRecycliqueClientFailure(
  httpStatus: number,
  parsed: ParsedRecycliqueApiError,
  networkError?: boolean,
): RecycliqueClientFailure {
  return {
    httpStatus,
    message: parsed.detail,
    code: parsed.code,
    retryable: parsed.retryable,
    state: parsed.state,
    correlationId: parsed.correlation_id,
    networkError,
  };
}

/** À partir d’une erreur typée renvoyée par `sales-client` (Story 6.9). */
export function recycliqueClientFailureFromSalesHttp(err: {
  readonly status: number;
  readonly detail: string;
  readonly code?: string;
  readonly retryable?: boolean;
  readonly state?: string | null;
  readonly correlation_id?: string;
  readonly networkError?: boolean;
}): RecycliqueClientFailure {
  return {
    httpStatus: err.status,
    message: err.detail,
    code: err.code,
    retryable: err.retryable ?? false,
    state: err.state,
    correlationId: err.correlation_id,
    networkError: err.networkError,
  };
}
