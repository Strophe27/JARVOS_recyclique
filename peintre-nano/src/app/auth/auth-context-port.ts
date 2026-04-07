import type { ContextEnvelopeStub } from '../../types/context-envelope';

/** Session UI minimale — pas de secrets ; alignement futur OpenAPI / Epic 2. */
export interface AuthSessionState {
  readonly authenticated: boolean;
  readonly userId?: string;
}

/**
 * Façade stable (Convergence 1) : un client HTTP / TanStack Query pourra implémenter ce port
 * sans modifier les consommateurs `useAuthSession` / `useContextEnvelope`.
 */
export interface AuthContextPort {
  getSession(): AuthSessionState;
  getContextEnvelope(): ContextEnvelopeStub;
  /**
   * Jeton Bearer si stocké côté adaptateur. Cookies httpOnly : omettre cette méthode et s’appuyer sur
   * `credentials: 'include'` sur les appels `fetch` (OpenAPI `bearerOrCookie`).
   */
  getAccessToken?: () => string | undefined;
}
