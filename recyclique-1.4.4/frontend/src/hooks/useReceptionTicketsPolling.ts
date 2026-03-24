import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseReceptionTicketsPollingOptions {
  pollInterval?: number; // in milliseconds, default 30000 (30s)
  enabled?: boolean; // whether polling is enabled, default true
  immediate?: boolean; // whether to fetch immediately on mount, default true
}

export interface UseReceptionTicketsPollingReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Hook for polling reception tickets data with live updates
 * @param fetchFunction - Function that returns a Promise with the tickets data
 * @param options - Polling configuration options
 */
export function useReceptionTicketsPolling<T>(
  fetchFunction: () => Promise<T>,
  options: UseReceptionTicketsPollingOptions = {}
): UseReceptionTicketsPollingReturn<T> {
  const {
    pollInterval = 30000, // 30 seconds default
    enabled = true,
    immediate = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const result = await fetchFunction();
      if (mountedRef.current) {
        setData(result);
        setLastUpdated(new Date());
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue lors du chargement des données';
        setError(errorMessage);
        console.error('Erreur de polling des tickets:', err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFunction]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Setup polling
  useEffect(() => {
    if (!enabled || pollInterval <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch if immediate
    if (immediate && !data) {
      fetchData();
    }

    // Setup interval
    intervalRef.current = setInterval(fetchData, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, pollInterval, immediate, fetchData, data]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      if (enabled && !intervalRef.current) {
        fetchData(); // Immediate refetch when coming back online
        intervalRef.current = setInterval(fetchData, pollInterval);
      }
    };

    const handleOffline = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, pollInterval, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    lastUpdated
  };
}
