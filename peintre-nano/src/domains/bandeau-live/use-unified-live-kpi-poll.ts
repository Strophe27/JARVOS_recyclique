import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DashboardLegacyApiError,
  fetchUnifiedLiveStats,
  type UnifiedLiveStatsResponse,
} from '../../api/dashboard-legacy-stats-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import { mapUnifiedLiveResponseToView, type CashKpiLiveView } from './unified-live-kpi-map';

/** Aligné legacy `LIVE_NETWORK_POLL_INTERVAL_MIN_MS` — `GET /v1/stats/live` polling caisse/réception. */
export const UNIFIED_LIVE_KPI_POLL_INTERVAL_MS = 10_000;

export type UseUnifiedLiveKpiPollOptions = {
  readonly siteId?: string | null;
  readonly periodType?: '24h' | 'daily';
  /** Défaut : {@link UNIFIED_LIVE_KPI_POLL_INTERVAL_MS} */
  readonly intervalMs?: number;
  readonly enabled?: boolean;
};

export type UseUnifiedLiveKpiPollResult = {
  readonly data: CashKpiLiveView | null;
  readonly isLoading: boolean;
  /** Rafraîchissement en cours alors que des données sont déjà affichées (évite le flash « … » du premier chargement). */
  readonly isRefreshing: boolean;
  readonly error: string | null;
  readonly isOnline: boolean;
  readonly lastUpdate: Date | null;
};

/**
 * Polling des agrégats live unifiés (`/v1/stats/live`) — même sémantique que le hook legacy `useCashLiveStats`
 * (période `daily`, intervalle ≥ 10 s).
 */
export function useUnifiedLiveKpiPoll(options: UseUnifiedLiveKpiPollOptions = {}): UseUnifiedLiveKpiPollResult {
  const auth = useAuthPort();
  const {
    siteId = null,
    periodType = 'daily',
    intervalMs = UNIFIED_LIVE_KPI_POLL_INTERVAL_MS,
    enabled = true,
  } = options;

  const [data, setData] = useState<CashKpiLiveView | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      setError(null);
    };
    const onOffline = () => {
      setIsOnline(false);
      setError('Connexion perdue, stats live suspendues');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const fetchTick = useCallback(async () => {
    if (!mountedRef.current || !enabled) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res: UnifiedLiveStatsResponse = await fetchUnifiedLiveStats(auth, {
        period_type: periodType,
        site_id: siteId ?? undefined,
      });
      if (!mountedRef.current) {
        return;
      }
      setData(mapUnifiedLiveResponseToView(res));
      setLastUpdate(new Date());
    } catch (e: unknown) {
      if (!mountedRef.current) {
        return;
      }
      const msg =
        e instanceof DashboardLegacyApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Erreur réseau, stats live suspendues';
      setError(msg);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [auth, enabled, periodType, siteId]);

  useEffect(() => {
    if (!enabled || !isOnline) {
      return;
    }

    let intervalId: number | undefined;
    const run = () => void fetchTick();

    void run();
    intervalId = window.setInterval(run, Math.max(intervalMs, UNIFIED_LIVE_KPI_POLL_INTERVAL_MS));

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [enabled, isOnline, intervalMs, fetchTick]);

  return {
    data,
    isLoading,
    isRefreshing: isLoading && data !== null,
    error,
    isOnline,
    lastUpdate,
  };
}
