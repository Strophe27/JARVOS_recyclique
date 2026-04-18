import type { AuthContextPort } from '../../app/auth/auth-context-port';
import { getCurrentOpenCashSession, type GetCurrentCashSessionResult } from '../../api/cash-session-client';

let inFlight: Promise<GetCurrentCashSessionResult> | null = null;

/**
 * Mutualise GET /v1/cash-sessions/current quand plusieurs widgets brownfield montent ensemble (header + main).
 */
export function coalescedGetCurrentOpenCashSession(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<GetCurrentCashSessionResult> {
  if (!inFlight) {
    inFlight = getCurrentOpenCashSession(auth).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Vitest : évite qu’un inFlight pende entre scénarios si le fetch est mocké sans résolution. */
export function resetCoalescedGetCurrentOpenCashSessionForTests(): void {
  if (typeof process === 'undefined' || process.env.VITEST !== 'true') return;
  inFlight = null;
}
