import { useState, useEffect, useCallback, useRef } from 'react';
import { getReceptionLiveStats } from '../services/api';
import { useFeatureFlag } from '../utils/features';

export interface LiveReceptionStats {
  total_weight: number;
  total_items: number;
  unique_categories: number;
  timestamp: string; // ISO string
}

export interface UseLiveReceptionStatsOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export interface UseLiveReceptionStatsReturn {
  // État des données
  data: LiveReceptionStats | null;
  isLoading: boolean;
  error: string | null;

  // État du polling
  isPolling: boolean;
  isOnline: boolean;
  lastUpdate: Date | null;

  // Contrôles utilisateur
  togglePolling: () => void;
  refresh: () => Promise<void>;

  // Métadonnées
  featureEnabled: boolean;
}

/**
 * Hook pour récupérer les statistiques de réception en temps réel
 * Gère le polling automatique, les erreurs, et le mode offline
 */
export function useLiveReceptionStats({
  intervalMs = 10000, // 10 secondes minimum
  enabled = true
}: UseLiveReceptionStatsOptions = {}): UseLiveReceptionStatsReturn {
  const featureEnabled = useFeatureFlag('liveReceptionStats');

  // État des données
  const [data, setData] = useState<LiveReceptionStats | null>(null);
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
   * Récupère les données live depuis l'API
   */
  const fetchLiveStats = useCallback(async () => {
    if (!mountedRef.current || !featureEnabled || !userEnabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getReceptionLiveStats();
      const stats: LiveReceptionStats = {
        total_weight: response.total_weight,
        total_items: response.total_items,
        unique_categories: response.unique_categories,
        timestamp: new Date().toISOString()
      };

      setData(stats);
      setLastUpdate(new Date());
    } catch (err: unknown) {
      console.error('Erreur lors de la récupération des stats live:', err);

      // Message d'erreur user-friendly basé sur le type d'erreur
      let errorMessage = 'Erreur réseau, stats live suspendues';

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as any;
        switch (axiosError.response?.status) {
          case 404:
            errorMessage = 'Endpoint live stats non disponible';
            break;
          case 403:
            errorMessage = 'Accès non autorisé aux stats live';
            break;
          case 500:
          case 502:
          case 503:
            errorMessage = 'Erreur serveur, stats live indisponibles';
            break;
          default:
            errorMessage = 'Erreur réseau, stats live suspendues';
        }
      }

      setError(errorMessage);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [featureEnabled, userEnabled]);

  /**
   * Démarre le polling
   */
  const startPolling = useCallback(() => {
    if (!featureEnabled || !userEnabled || !isOnline || intervalRef.current) return;

    setIsPolling(true);
    fetchLiveStats(); // Fetch immédiat

    intervalRef.current = setInterval(fetchLiveStats, Math.max(intervalMs, 10000));
  }, [featureEnabled, userEnabled, isOnline, intervalMs, fetchLiveStats]);

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
  // Démarre/arrête le polling basé sur: feature flag + contrôle utilisateur + connexion + hook activé
  useEffect(() => {
    if (featureEnabled && userEnabled && isOnline && enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [featureEnabled, userEnabled, isOnline, enabled, startPolling, stopPolling]);

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
    refresh,

    // Métadonnées
    featureEnabled
  };
}
