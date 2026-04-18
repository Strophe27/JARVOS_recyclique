import { useCallback, useEffect, useState } from 'react';
import {
  recycliqueClientFailureFromSalesHttp,
  type RecycliqueClientFailure,
} from '../../api/recyclique-api-error';
import type { CashSessionCurrentV1 } from '../../api/cash-session-client';
import type { AuthContextPort } from '../../app/auth/auth-context-port';
import { coalescedGetCurrentOpenCashSession } from './caisse-current-session-coalesce';

export type CaisseServerCurrentSessionState = {
  readonly session: CashSessionCurrentV1 | null;
  readonly loading: boolean;
  readonly failure: RecycliqueClientFailure | null;
  readonly refresh: () => void;
};

/**
 * Lecture serveur de la session caisse ouverte (Story 6.x brownfield) — aligné {@link CashflowCloseWizard}.
 */
export function useCaisseServerCurrentSession(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): CaisseServerCurrentSessionState {
  const [session, setSession] = useState<CashSessionCurrentV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<RecycliqueClientFailure | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailure(null);
    void coalescedGetCurrentOpenCashSession(auth).then((r) => {
      if (cancelled) return;
      if (!r.ok) {
        setFailure(recycliqueClientFailureFromSalesHttp(r));
        setSession(null);
      } else {
        setFailure(null);
        setSession(r.session);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [auth, refreshToken]);

  return { session, loading, failure, refresh };
}
