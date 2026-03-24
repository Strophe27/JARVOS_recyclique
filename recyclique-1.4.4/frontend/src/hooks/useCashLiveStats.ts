import { useState, useEffect, useCallback, useRef } from 'react';
import { getUnifiedLiveStats } from '../services/api';
import { LIVE_NETWORK_POLL_INTERVAL_MIN_MS, mapLiveNetworkStatsError } from './liveNetworkPolling';

export interface CashLiveStats {
  ticketsCount: number; // Nombre de tickets du jour
  lastTicketAmount: number; // Montant du dernier ticket
  ca: number; // Chiffre d'affaires du jour
  donations: number; // Dons du jour
  weightOut: number; // Poids sortis (vendus)
  weightIn: number; // Poids rentrés (reçus)
  timestamp: string; // ISO string
}

export interface UseCashLiveStatsOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export interface UseCashLiveStatsReturn {
  // État des données
  data: CashLiveStats | null;
  isLoading: boolean;
  error: string | null;

  // État du polling
  isPolling: boolean;
  isOnline: boolean;
  lastUpdate: Date | null;

  // Contrôles utilisateur
  togglePolling: () => void;
  refresh: () => Promise<void>;
}

/**
 * Hook pour récupérer les statistiques de caisse en temps réel
 * Gère le polling automatique, les erreurs, et le mode offline
 */
export function useCashLiveStats({
  intervalMs = LIVE_NETWORK_POLL_INTERVAL_MIN_MS,
  enabled = true
}: UseCashLiveStatsOptions = {}): UseCashLiveStatsReturn {
  // État des données
  const [data, setData] = useState<CashLiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État du polling
  const [isPolling, setIsPolling] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Contrôles utilisateur
  const [userEnabled, setUserEnabled] = useState(true);

  // Références pour le polling
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  /**
   * Récupère les données live depuis l'API unifiée
   * Utilise le nouvel endpoint /v1/stats/live (Story B48-P7)
   */
  const fetchLiveStats = useCallback(async () => {
    if (!mountedRef.current || !userEnabled) return;

    try {
      setIsLoading(true);
      setError(null);

      // Récupérer les stats unifiées depuis le nouvel endpoint
      const unifiedStats = await getUnifiedLiveStats('daily');

      // Extraire les stats caisse depuis la réponse unifiée
      const stats: CashLiveStats = {
        ticketsCount: unifiedStats.tickets_count || 0,
        lastTicketAmount: unifiedStats.last_ticket_amount || 0,
        ca: unifiedStats.ca || 0,
        donations: unifiedStats.donations || 0,
        weightOut: unifiedStats.weight_out || 0, // Inclut ventes + is_exit=true
        weightIn: unifiedStats.weight_in || 0, // Exclut is_exit=true
        timestamp: unifiedStats.period_end || new Date().toISOString()
      };

      setData(stats);
      setLastUpdate(new Date());
    } catch (err: unknown) {
      console.error('Erreur lors de la récupération des stats live:', err);
      setError(mapLiveNetworkStatsError(err));
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [userEnabled]);

  /**
   * Démarre le polling
   */
  const startPolling = useCallback(() => {
    if (!userEnabled || !isOnline || intervalRef.current) return;

    setIsPolling(true);
    fetchLiveStats(); // Fetch immédiat

    intervalRef.current = setInterval(
      fetchLiveStats,
      Math.max(intervalMs, LIVE_NETWORK_POLL_INTERVAL_MIN_MS)
    );
  }, [userEnabled, isOnline, intervalMs, fetchLiveStats]);

  /**
   * Arrête le polling
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  /**
   * Toggle manuel du polling par l'utilisateur
   */
  const togglePolling = useCallback(() => {
    setUserEnabled(prev => !prev);
  }, []);

  /**
   * Refresh manuel des données
   */
  const refresh = useCallback(async () => {
    await fetchLiveStats();
  }, [fetchLiveStats]);

  // Gestionnaire d'événements online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setError(null);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setError('Connexion perdue, polling suspendu');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Gestion du polling automatique
  useEffect(() => {
    if (userEnabled && isOnline && enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [userEnabled, isOnline, enabled, startPolling, stopPolling]);

  // Cleanup au démontage
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return {
    // État des données
    data,
    isLoading,
    error,

    // État du polling
    isPolling,
    isOnline,
    lastUpdate,

    // Contrôles utilisateur
    togglePolling,
    refresh
  };
}

