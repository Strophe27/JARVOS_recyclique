import { useCallback, useEffect, useState } from 'react';
import {
  getCashRegistersStatus,
  type CashRegisterStatusRowV1,
} from '../../api/cash-session-client';
import {
  recycliqueClientFailureFromSalesHttp,
  type RecycliqueClientFailure,
} from '../../api/recyclique-api-error';
import type { AuthContextPort } from '../../app/auth/auth-context-port';

export type CashRegistersStatusState = {
  readonly rows: readonly CashRegisterStatusRowV1[];
  readonly loading: boolean;
  readonly failure: RecycliqueClientFailure | null;
  readonly refresh: () => void;
};

/**
 * Hub `/caisse` : même source que le legacy — `GET /v1/cash-registers/status`.
 * Désactivé quand `enabled` est faux (évite un aller-retour réseau inutile hors hub).
 */
export function useCashRegistersStatus(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  enabled: boolean,
): CashRegistersStatusState {
  const [rows, setRows] = useState<CashRegisterStatusRowV1[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [failure, setFailure] = useState<RecycliqueClientFailure | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRows([]);
      setFailure(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailure(null);
    void getCashRegistersStatus(auth).then((r) => {
      if (cancelled) return;
      if (!r.ok) {
        setFailure(recycliqueClientFailureFromSalesHttp(r));
        setRows([]);
      } else {
        setFailure(null);
        setRows(r.rows);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [auth, enabled, refreshToken]);

  return { rows, loading, failure, refresh };
}
