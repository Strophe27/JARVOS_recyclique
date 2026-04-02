/**
 * Point d’entrée unique pour signaler un rejet / fallback runtime (story 3.6).
 * Aligné UX-DR8 : charge utile structurée pour journaux / diagnostics ; pas de fuite d’impl inutile dans `message`.
 */

export type RuntimeRejectionSeverity = 'info' | 'degraded' | 'blocked';

export type RuntimeFallbackPayload = {
  readonly code: string;
  readonly message: string;
  readonly severity: RuntimeRejectionSeverity;
  readonly detail?: Readonly<Record<string, unknown>>;
  readonly retryable?: boolean;
  readonly correlationId?: string;
  readonly state?: string;
};

function logInDev(payload: RuntimeFallbackPayload): void {
  const line = `[peintre-runtime] ${payload.severity} ${payload.code}: ${payload.message}`;
  const meta = {
    detail: payload.detail,
    retryable: payload.retryable,
    correlationId: payload.correlationId,
    state: payload.state,
  };
  if (payload.severity === 'blocked') {
    console.error(line, meta);
    return;
  }
  if (payload.severity === 'degraded') {
    console.warn(line, meta);
    return;
  }
  console.info(line, meta);
}

/**
 * Émet une charge structurée (tests : `vi.spyOn` sur cette fonction).
 * En dev navigateur (`import.meta.env.DEV`), journalise de façon contrôlée ; pas de console en `MODE === 'test'`.
 */
export function reportRuntimeFallback(payload: RuntimeFallbackPayload): void {
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    logInDev(payload);
  }
}
