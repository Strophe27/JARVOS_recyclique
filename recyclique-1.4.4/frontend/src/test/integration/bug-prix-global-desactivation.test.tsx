/**
 * Story B50-P6: Tests de reproduction du bug de désactivation subite du mode prix global
 * 
 * Ce fichier contient les tests pour reproduire et valider la correction du bug
 * où le mode prix global se désactive subitement après rafraîchissement ou sortie de veille.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCashSessionStore } from '../../stores/cashSessionStore';
import { cashSessionService } from '../../services/cashSessionService';

// Mock du service
vi.mock('../../services/cashSessionService', () => ({
  cashSessionService: {
    createSession: vi.fn(),
    getSession: vi.fn(),
    getCurrentSession: vi.fn(),
    getRegisterSessionStatus: vi.fn()
  }
}));

describe('Bug B50-P6: Désactivation subite du mode prix global', () => {
  beforeEach(() => {
    // Réinitialiser le store avant chaque test
    const store = useCashSessionStore.getState();
    store.setCurrentSession(null);
    store.setCurrentRegisterOptions(null);
    store.clearCurrentSale();
    
    // Nettoyer localStorage
    localStorage.clear();
    
    // Réinitialiser les mocks
    vi.clearAllMocks();
  });

  describe('T1: Flux de chargement des options', () => {
    it('devrait charger register_options lors de l\'ouverture de session', async () => {
      const mockRegisterOptions = {
        features: {
          no_item_pricing: { enabled: true }
        }
      };

      const mockSession = {
        id: 'session-1',
        operator_id: 'operator-1',
        initial_amount: 100,
        current_amount: 100,
        status: 'open' as const,
        opened_at: new Date().toISOString(),
        register_options: mockRegisterOptions
      };

      vi.mocked(cashSessionService.createSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useCashSessionStore());

      await act(async () => {
        await result.current.openSession({
          operator_id: 'operator-1',
          site_id: 'site-1',
          register_id: 'register-1',
          initial_amount: 100
        });
      });

      await waitFor(() => {
        expect(result.current.currentSession).toBeTruthy();
        expect(result.current.currentRegisterOptions).toEqual(mockRegisterOptions);
      });

      expect(result.current.currentRegisterOptions?.features?.no_item_pricing?.enabled).toBe(true);
    });

    it('devrait conserver currentRegisterOptions si session n\'a pas register_options', async () => {
      const existingOptions = {
        features: {
          no_item_pricing: { enabled: true }
        }
      };

      // Simuler un état où on a déjà des options
      const store = useCashSessionStore.getState();
      store.setCurrentRegisterOptions(existingOptions);

      const mockSession = {
        id: 'session-1',
        operator_id: 'operator-1',
        initial_amount: 100,
        current_amount: 100,
        status: 'open' as const,
        opened_at: new Date().toISOString()
        // Pas de register_options
      };

      vi.mocked(cashSessionService.createSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useCashSessionStore());

      await act(async () => {
        await result.current.openSession({
          operator_id: 'operator-1',
          site_id: 'site-1',
          register_id: 'register-1',
          initial_amount: 100
        });
      });

      await waitFor(() => {
        expect(result.current.currentSession).toBeTruthy();
      });

      // Les options existantes doivent être conservées
      expect(result.current.currentRegisterOptions).toEqual(existingOptions);
    });
  });

  describe('T3: Rafraîchissement de page', () => {
    it('devrait restaurer currentRegisterOptions après rafraîchissement', async () => {
      const mockRegisterOptions = {
        features: {
          no_item_pricing: { enabled: true }
        }
      };

      const mockSession = {
        id: 'session-1',
        operator_id: 'operator-1',
        initial_amount: 100,
        current_amount: 100,
        status: 'open' as const,
        opened_at: new Date().toISOString(),
        register_options: mockRegisterOptions
      };

      // Simuler localStorage avec session persistée
      localStorage.setItem('currentCashSession', JSON.stringify(mockSession));
      
      // Simuler Zustand persist qui restaure l'état
      const store = useCashSessionStore.getState();
      store.setCurrentSession(mockSession);
      store.setCurrentRegisterOptions(mockRegisterOptions);

      // Simuler fetchCurrentSession qui recharge depuis serveur
      // Scénario: serveur retourne session SANS register_options (bug)
      const serverSessionWithoutOptions = {
        ...mockSession,
        register_options: undefined
      };

      vi.mocked(cashSessionService.getSession).mockResolvedValue(serverSessionWithoutOptions);

      const { result } = renderHook(() => useCashSessionStore());

      await act(async () => {
        await result.current.fetchCurrentSession();
      });

      await waitFor(() => {
        expect(result.current.currentSession).toBeTruthy();
      });

      // B50-P6: Les options doivent être conservées même si le serveur ne les retourne pas
      expect(result.current.currentRegisterOptions).toEqual(mockRegisterOptions);
      expect(result.current.currentRegisterOptions?.features?.no_item_pricing?.enabled).toBe(true);
    });

    it('devrait utiliser register_options du serveur s\'ils sont disponibles', async () => {
      const mockRegisterOptions = {
        features: {
          no_item_pricing: { enabled: true }
        }
      };

      const mockSession = {
        id: 'session-1',
        operator_id: 'operator-1',
        initial_amount: 100,
        current_amount: 100,
        status: 'open' as const,
        opened_at: new Date().toISOString(),
        register_options: mockRegisterOptions
      };

      localStorage.setItem('currentCashSession', JSON.stringify(mockSession));

      // Serveur retourne session AVEC register_options (cas normal)
      vi.mocked(cashSessionService.getSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useCashSessionStore());

      await act(async () => {
        await result.current.fetchCurrentSession();
      });

      await waitFor(() => {
        expect(result.current.currentSession).toBeTruthy();
      });

      // Les options du serveur doivent être utilisées
      expect(result.current.currentRegisterOptions).toEqual(mockRegisterOptions);
    });
  });

  describe('T7: Test de reproduction du bug', () => {
    it('reproduit le bug: mode prix global se désactive après rafraîchissement', async () => {
      const mockRegisterOptions = {
        features: {
          no_item_pricing: { enabled: true }
        }
      };

      // Étape 1: Ouvrir session avec mode prix global
      const mockSession = {
        id: 'session-1',
        operator_id: 'operator-1',
        initial_amount: 100,
        current_amount: 100,
        status: 'open' as const,
        opened_at: new Date().toISOString(),
        register_options: mockRegisterOptions
      };

      vi.mocked(cashSessionService.createSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useCashSessionStore());

      await act(async () => {
        await result.current.openSession({
          operator_id: 'operator-1',
          site_id: 'site-1',
          register_id: 'register-1',
          initial_amount: 100
        });
      });

      await waitFor(() => {
        expect(result.current.currentRegisterOptions?.features?.no_item_pricing?.enabled).toBe(true);
      });

      // Étape 2: Simuler rafraîchissement (fetchCurrentSession avec session sans options)
      const sessionWithoutOptions = {
        ...mockSession,
        register_options: undefined
      };

      localStorage.setItem('currentCashSession', JSON.stringify(mockSession));
      vi.mocked(cashSessionService.getSession).mockResolvedValue(sessionWithoutOptions);

      await act(async () => {
        await result.current.fetchCurrentSession();
      });

      await waitFor(() => {
        expect(result.current.currentSession).toBeTruthy();
      });

      // Étape 3: Vérifier que le mode prix global est toujours actif (correction B50-P6)
      // AVANT la correction: currentRegisterOptions serait null
      // APRÈS la correction: currentRegisterOptions doit être conservé
      expect(result.current.currentRegisterOptions).not.toBeNull();
      expect(result.current.currentRegisterOptions?.features?.no_item_pricing?.enabled).toBe(true);
    });
  });

  describe('T2: Persistance Zustand', () => {
    it('devrait persister currentRegisterOptions dans localStorage', async () => {
      const mockRegisterOptions = {
        features: {
          no_item_pricing: { enabled: true }
        }
      };

      const mockSession = {
        id: 'session-1',
        operator_id: 'operator-1',
        initial_amount: 100,
        current_amount: 100,
        status: 'open' as const,
        opened_at: new Date().toISOString(),
        register_options: mockRegisterOptions
      };

      vi.mocked(cashSessionService.createSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useCashSessionStore());

      await act(async () => {
        await result.current.openSession({
          operator_id: 'operator-1',
          site_id: 'site-1',
          register_id: 'register-1',
          initial_amount: 100
        });
      });

      await waitFor(() => {
        expect(result.current.currentRegisterOptions).toEqual(mockRegisterOptions);
      });

      // Vérifier que les options sont dans localStorage (via Zustand persist)
      const persistedState = localStorage.getItem('cash-session-store');
      expect(persistedState).toBeTruthy();
      
      if (persistedState) {
        const parsed = JSON.parse(persistedState);
        expect(parsed.state.currentRegisterOptions).toEqual(mockRegisterOptions);
      }
    });
  });
});

