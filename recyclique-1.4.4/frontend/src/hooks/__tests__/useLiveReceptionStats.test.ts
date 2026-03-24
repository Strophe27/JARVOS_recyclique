import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useLiveReceptionStats } from '../useLiveReceptionStats';

// Mock des dépendances
vi.mock('../../services/api', () => ({
  getReceptionLiveStats: vi.fn()
}));

vi.mock('../../utils/features', () => ({
  useFeatureFlag: vi.fn()
}));

import { getReceptionLiveStats } from '../../services/api';
import { useFeatureFlag } from '../../utils/features';

const mockGetReceptionLiveStats = vi.mocked(getReceptionLiveStats);
const mockUseFeatureFlag = vi.mocked(useFeatureFlag);

describe('useLiveReceptionStats', () => {
  const mockStatsResponse = {
    total_weight: 125.5,
    total_items: 42,
    unique_categories: 8
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Feature flag désactivé', () => {
    beforeEach(() => {
      mockUseFeatureFlag.mockReturnValue(false);
    });

    it('ne fait pas de polling quand le feature flag est désactivé', () => {
      const { result } = renderHook(() => useLiveReceptionStats());

      expect(result.current.featureEnabled).toBe(false);
      expect(result.current.isPolling).toBe(false);
      expect(mockGetReceptionLiveStats).not.toHaveBeenCalled();
    });

    it('retourne null pour les données quand le flag est désactivé', () => {
      const { result } = renderHook(() => useLiveReceptionStats());

      expect(result.current.data).toBeNull();
    });
  });

  describe('Feature flag activé', () => {
    beforeEach(() => {
      mockUseFeatureFlag.mockReturnValue(true);
      mockGetReceptionLiveStats.mockResolvedValue(mockStatsResponse);
    });

    it('démarre le polling automatiquement quand le flag est activé', async () => {
      const { result } = renderHook(() => useLiveReceptionStats());

      expect(result.current.featureEnabled).toBe(true);
      expect(result.current.isPolling).toBe(true);

      // Attend que le premier fetch soit fait
      await waitFor(() => {
        expect(mockGetReceptionLiveStats).toHaveBeenCalledTimes(1);
      });

      expect(result.current.data).toEqual({
        total_weight: 125.5,
        total_items: 42,
        unique_categories: 8,
        timestamp: expect.any(String)
      });
    });

    it('respecte l\'interval minimum de 10 secondes', () => {
      const { result } = renderHook(() => useLiveReceptionStats({ intervalMs: 5000 }));

      expect(result.current.isPolling).toBe(true);

      // Avance de 10 secondes
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(mockGetReceptionLiveStats).toHaveBeenCalledTimes(2); // 1 initial + 1 après 10s
    });

    it('permet le contrôle manuel du polling', async () => {
      const { result } = renderHook(() => useLiveReceptionStats());

      // Attend le démarrage initial
      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });

      // Désactive le polling
      act(() => {
        result.current.togglePolling();
      });

      expect(result.current.isPolling).toBe(false);

      // Réactive le polling
      act(() => {
        result.current.togglePolling();
      });

      expect(result.current.isPolling).toBe(true);
    });

    it('suspend le polling quand hors ligne', async () => {
      const { result } = renderHook(() => useLiveReceptionStats());

      // Attend le démarrage
      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });

      // Simule offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
        expect(result.current.isPolling).toBe(false);
        expect(result.current.error).toContain('Connexion perdue');
      });
    });

    it('reprendre le polling quand reconnecté', async () => {
      const { result } = renderHook(() => useLiveReceptionStats());

      // Simule offline puis online
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });

      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
        expect(result.current.isPolling).toBe(true);
        expect(result.current.error).toBe(null);
      });
    });

    it('gère les erreurs API correctement', async () => {
      mockGetReceptionLiveStats.mockRejectedValueOnce({
        response: { status: 500 }
      });

      const { result } = renderHook(() => useLiveReceptionStats());

      await waitFor(() => {
        expect(result.current.error).toContain('Erreur serveur');
      });

      expect(result.current.data).toBeNull();
    });

    it('permet le refresh manuel', async () => {
      const { result } = renderHook(() => useLiveReceptionStats());

      await waitFor(() => {
        expect(mockGetReceptionLiveStats).toHaveBeenCalledTimes(1);
      });

      // Refresh manuel
      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetReceptionLiveStats).toHaveBeenCalledTimes(2);
    });

    it('nettoie les timers au démontage', () => {
      const { unmount } = renderHook(() => useLiveReceptionStats());

      expect(result.current.isPolling).toBe(true);

      unmount();

      // Le timer devrait être nettoyé
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Pas d'appel supplémentaire après démontage
      expect(mockGetReceptionLiveStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Options du hook', () => {
    beforeEach(() => {
      mockUseFeatureFlag.mockReturnValue(true);
    });

    it('respecte l\'option enabled = false', () => {
      const { result } = renderHook(() => useLiveReceptionStats({ enabled: false }));

      expect(result.current.isPolling).toBe(false);
      expect(mockGetReceptionLiveStats).not.toHaveBeenCalled();
    });

    it('accepte un interval personnalisé (minimum 10s)', () => {
      const { result } = renderHook(() => useLiveReceptionStats({ intervalMs: 15000 }));

      expect(result.current.isPolling).toBe(true);

      act(() => {
        vi.advanceTimersByTime(15000);
      });

      expect(mockGetReceptionLiveStats).toHaveBeenCalledTimes(2);
    });
  });
});















