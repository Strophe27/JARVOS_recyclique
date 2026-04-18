import { useState, useEffect, useCallback, useMemo } from 'react';
import { useVirtualCashSessionStore } from '../stores/virtualCashSessionStore';
import { CashLiveStats } from './useCashLiveStats';

export interface UseVirtualCashLiveStatsOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export interface UseVirtualCashLiveStatsReturn {
  // État des données
  data: CashLiveStats | null;
  isLoading: boolean;
  error: string | null;

  // État du polling (simulé)
  isPolling: boolean;
  isOnline: boolean; // Toujours true en mode virtuel
  lastUpdate: Date | null;

  // Contrôles utilisateur
  togglePolling: () => void;
  refresh: () => Promise<void>;
}

/**
 * Hook pour récupérer les statistiques de caisse virtuelles
 * Calcule les stats en temps réel depuis le virtual cash store
 */
export function useVirtualCashLiveStats({
  intervalMs = 5000, // 5 secondes pour mode virtuel (plus réactif)
  enabled = true
}: UseVirtualCashLiveStatsOptions = {}): UseVirtualCashLiveStatsReturn {
  // État des données
  const [data, setData] = useState<CashLiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État du polling (simulé pour cohérence)
  const [isPolling, setIsPolling] = useState(false);
  const [isOnline] = useState(true); // Toujours online en mode virtuel
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Contrôles utilisateur
  const [userEnabled, setUserEnabled] = useState(true);

  // Données du virtual store
  const {
    virtualSales,
    currentSession
  } = useVirtualCashSessionStore();

  /**
   * Calcule les statistiques depuis les données virtuelles
   */
  const calculateVirtualStats = useCallback((): CashLiveStats => {
    const now = new Date();

    // Filtrer les ventes du jour (basé sur la date réelle du ticket - Story B52-P3)
    const today = new Date().toDateString();
    const todaysSales = virtualSales.filter(sale => {
      const saleDate = new Date(sale.sale_date || sale.created_at).toDateString();
      return saleDate === today;
    });

    // Calculer les totaux
    const ticketsCount = todaysSales.length;
    const ca = todaysSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const donations = todaysSales.reduce((sum, sale) => sum + (sale.donation || 0), 0);

    // Calculer les poids (sortis uniquement, pas de poids rentrés en caisse)
    const weightOut = todaysSales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => itemSum + (item.weight || 0), 0);
    }, 0);

    // Dernier ticket (plus récent)
    const lastTicketAmount = todaysSales.length > 0
      ? todaysSales[todaysSales.length - 1].total_amount || 0
      : 0;

    return {
      ticketsCount,
      lastTicketAmount,
      ca,
      donations,
      weightOut,
      weightIn: 0, // Pas de poids rentrés en caisse
      timestamp: now.toISOString()
    };
  }, [virtualSales]);

  /**
   * Met à jour les statistiques
   */
  const updateStats = useCallback(() => {
    if (!userEnabled || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const stats = calculateVirtualStats();
      setData(stats);
      setLastUpdate(new Date());

      console.log('[VirtualCashLiveStats] Stats updated:', stats);
    } catch (err: any) {
      console.error('[VirtualCashLiveStats] Error calculating stats:', err);
      setError('Erreur lors du calcul des statistiques virtuelles');
    } finally {
      setIsLoading(false);
    }
  }, [userEnabled, enabled, calculateVirtualStats]);

  /**
   * Toggle du polling simulé
   */
  const togglePolling = useCallback(() => {
    setUserEnabled(prev => !prev);
  }, []);

  /**
   * Refresh manuel
   */
  const refresh = useCallback(async () => {
    updateStats();
  }, [updateStats]);

  // Mettre à jour les stats quand les données virtuelles changent
  useEffect(() => {
    updateStats();
  }, [virtualSales, currentSession, updateStats]);

  // Polling simulé (met à jour régulièrement même sans changements)
  useEffect(() => {
    if (!userEnabled || !enabled) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    updateStats(); // Update immédiat

    const interval = setInterval(updateStats, Math.max(intervalMs, 2000));

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [userEnabled, enabled, intervalMs, updateStats]);

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















