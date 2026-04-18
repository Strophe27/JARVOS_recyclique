import { useState, useEffect, useCallback, useRef } from 'react';
import { getUnifiedLiveStats } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { LIVE_NETWORK_POLL_INTERVAL_MIN_MS, mapLiveNetworkStatsError } from './liveNetworkPolling';

export interface ReceptionKPILiveStats {
  tickets_open: number;
  tickets_closed_24h: number;
  tickets_count: number; // Nombre de tickets de caisse (ventes) - Story B48-P7
  items_received: number;
  turnover_eur: number;
  donations_eur: number;
  weight_in: number;
  weight_out: number;
}

export interface UseReceptionKPILiveStatsOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export interface UseReceptionKPILiveStatsReturn {
  // État des données
  data: ReceptionKPILiveStats | null;
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
 * Hook pour récupérer les statistiques KPI de réception en temps réel.
 * Appelle `getUnifiedLiveStats` (endpoint unifié `/v1/stats/live`, Story B48-P7) et mappe
 * la réponse vers le shape KPI réception (turnover/dons depuis `ca` / `donations`).
 * Le polling n'est actif que pour les admins; le hook gère aussi les erreurs et l'état offline.
 */
export function useReceptionKPILiveStats({
  intervalMs = LIVE_NETWORK_POLL_INTERVAL_MIN_MS,
  enabled = true
}: UseReceptionKPILiveStatsOptions = {}): UseReceptionKPILiveStatsReturn {
  // État des données
  const [data, setData] = useState<ReceptionKPILiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État du polling
  const [isPolling, setIsPolling] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Contrôles utilisateur
  const [userEnabled, setUserEnabled] = useState(true);

  // Vérifier les permissions de l'utilisateur (admin ou super-admin requis)
  const isAdmin = useAuthStore((state) => {
    const currentUser = state.currentUser;
    return currentUser?.role === 'admin' || currentUser?.role === 'super-admin';
  });

  // Références pour le polling
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  /**
   * Récupère les données live depuis l'API unifiée
   * Utilise le nouvel endpoint /v1/stats/live (Story B48-P7)
   */
  const fetchLiveStats = useCallback(async () => {
    if (!mountedRef.current || !userEnabled || !isAdmin) return;

    try {
      setIsLoading(true);
      setError(null);

      // Récupérer les stats unifiées depuis le nouvel endpoint
      const unifiedStats = await getUnifiedLiveStats('daily');
      
      // Extraire les stats réception depuis la réponse unifiée
      const stats: ReceptionKPILiveStats = {
        tickets_open: unifiedStats.tickets_open || 0,
        tickets_closed_24h: unifiedStats.tickets_closed_24h || 0,
        tickets_count: unifiedStats.tickets_count || 0, // Nombre de tickets de caisse (ventes) - Story B48-P7
        items_received: unifiedStats.items_received || 0,
        turnover_eur: unifiedStats.ca || 0, // Utiliser ca de la réponse unifiée
        donations_eur: unifiedStats.donations || 0, // Utiliser donations de la réponse unifiée
        weight_in: unifiedStats.weight_in || 0,
        weight_out: unifiedStats.weight_out || 0
      };

      setData(stats);
      setLastUpdate(new Date());
    } catch (err: unknown) {
      console.error('Erreur lors de la récupération des stats KPI réception:', err);
      setError(mapLiveNetworkStatsError(err));
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [userEnabled, isAdmin]);

  /**
   * Démarre le polling
   */
  const startPolling = useCallback(() => {
    if (!userEnabled || !isOnline || !isAdmin || intervalRef.current) return;

    setIsPolling(true);
    fetchLiveStats(); // Fetch immédiat

    intervalRef.current = setInterval(
      fetchLiveStats,
      Math.max(intervalMs, LIVE_NETWORK_POLL_INTERVAL_MIN_MS)
    );
  }, [userEnabled, isOnline, isAdmin, intervalMs, fetchLiveStats]);

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
    if (userEnabled && isOnline && enabled && isAdmin) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [userEnabled, isOnline, enabled, isAdmin, startPolling, stopPolling]);

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

