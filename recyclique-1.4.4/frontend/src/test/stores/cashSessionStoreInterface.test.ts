/**
 * Tests de non-régression pour l'interface commune ICashSessionStore
 * Story B50-P10: Unification des stores caisse
 * 
 * Ces tests vérifient que tous les stores implémentent correctement l'interface
 * et que les comportements critiques sont cohérents entre les 3 stores.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useCashSessionStore } from '../../stores/cashSessionStore';
import { useVirtualCashSessionStore } from '../../stores/virtualCashSessionStore';
import { useDeferredCashSessionStore } from '../../stores/deferredCashSessionStore';
import type { ICashSessionStore, SaleItem, FinalizationData } from '../../stores/interfaces/ICashSessionStore';

// Mock axios
vi.mock('../../api/axiosClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock cashSessionService
vi.mock('../../services/cashSessionService', () => ({
  cashSessionService: {
    createSession: vi.fn(),
    getSession: vi.fn(),
    getSessions: vi.fn(),
    getCurrentSession: vi.fn(),
    closeSession: vi.fn(),
    closeSessionWithAmounts: vi.fn(),
    updateSession: vi.fn(),
    getRegisterSessionStatus: vi.fn()
  }
}));

// Mock API service
vi.mock('../../services/api', () => ({
  getCashRegister: vi.fn(),
  getSites: vi.fn().mockResolvedValue([{ id: 'site-1', name: 'Test Site' }])
}));

describe('ICashSessionStore Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset stores
    useCashSessionStore.setState({
      currentSession: null,
      sessions: [],
      currentSaleItems: [],
      currentSaleNote: null,
      loading: false,
      error: null,
      currentRegisterOptions: null
    });
    useVirtualCashSessionStore.setState({
      currentSession: null,
      sessions: [],
      currentSaleItems: [],
      currentSaleNote: null,
      loading: false,
      error: null,
      isVirtualMode: true,
      virtualSessions: [],
      virtualSales: [],
      currentRegisterOptions: null
    });
    useDeferredCashSessionStore.setState({
      currentSession: null,
      sessions: [],
      currentSaleItems: [],
      currentSaleNote: null,
      loading: false,
      error: null,
      openedAt: null,
      currentRegisterOptions: null
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Interface Compliance', () => {
    /**
     * AC1: Vérifier que tous les stores ont les méthodes de base
     */
    it('cashSessionStore should implement all required methods', () => {
      const store = useCashSessionStore.getState();
      
      // State
      expect(store).toHaveProperty('currentSession');
      expect(store).toHaveProperty('sessions');
      expect(store).toHaveProperty('currentSaleItems');
      expect(store).toHaveProperty('currentSaleNote');
      expect(store).toHaveProperty('loading');
      expect(store).toHaveProperty('error');
      expect(store).toHaveProperty('currentRegisterOptions');
      
      // Methods
      expect(typeof store.submitSale).toBe('function');
      expect(typeof store.closeSession).toBe('function');
      expect(typeof store.openSession).toBe('function');
      expect(typeof store.refreshSession).toBe('function');
      expect(typeof store.addSaleItem).toBe('function');
      expect(typeof store.removeSaleItem).toBe('function');
      expect(typeof store.updateSaleItem).toBe('function');
      expect(typeof store.clearCurrentSale).toBe('function');
      expect(typeof store.setCurrentSaleNote).toBe('function');
    });

    it('virtualCashSessionStore should implement all required methods', () => {
      const store = useVirtualCashSessionStore.getState();
      
      // State
      expect(store).toHaveProperty('currentSession');
      expect(store).toHaveProperty('sessions');
      expect(store).toHaveProperty('currentSaleItems');
      expect(store).toHaveProperty('currentSaleNote');
      expect(store).toHaveProperty('loading');
      expect(store).toHaveProperty('error');
      expect(store).toHaveProperty('currentRegisterOptions');
      
      // Methods
      expect(typeof store.submitSale).toBe('function');
      expect(typeof store.closeSession).toBe('function');
      expect(typeof store.openSession).toBe('function');
      expect(typeof store.refreshSession).toBe('function');
      expect(typeof store.addSaleItem).toBe('function');
      expect(typeof store.removeSaleItem).toBe('function');
      expect(typeof store.updateSaleItem).toBe('function');
      expect(typeof store.clearCurrentSale).toBe('function');
      expect(typeof store.setCurrentSaleNote).toBe('function');
    });

    it('deferredCashSessionStore should implement all required methods', () => {
      const store = useDeferredCashSessionStore.getState();
      
      // State
      expect(store).toHaveProperty('currentSession');
      expect(store).toHaveProperty('sessions');
      expect(store).toHaveProperty('currentSaleItems');
      expect(store).toHaveProperty('currentSaleNote');
      expect(store).toHaveProperty('loading');
      expect(store).toHaveProperty('error');
      expect(store).toHaveProperty('currentRegisterOptions');
      
      // Methods
      expect(typeof store.submitSale).toBe('function');
      expect(typeof store.closeSession).toBe('function');
      expect(typeof store.openSession).toBe('function');
      expect(typeof store.refreshSession).toBe('function');
      expect(typeof store.addSaleItem).toBe('function');
      expect(typeof store.removeSaleItem).toBe('function');
      expect(typeof store.updateSaleItem).toBe('function');
      expect(typeof store.clearCurrentSale).toBe('function');
      expect(typeof store.setCurrentSaleNote).toBe('function');
    });
  });

  describe('Sale Item Operations', () => {
    /**
     * AC4: Vérifier que addSaleItem fonctionne de manière cohérente
     */
    const testItem: Omit<SaleItem, 'id'> = {
      category: 'EEE-1',
      quantity: 2,
      weight: 1.5,
      price: 10,
      total: 20
    };

    it('should add item in cashSessionStore', () => {
      const store = useCashSessionStore.getState();
      
      // Setup session
      useCashSessionStore.setState({
        currentSession: {
          id: 'session-1',
          operator_id: 'op-1',
          initial_amount: 100,
          current_amount: 100,
          status: 'open',
          opened_at: new Date().toISOString()
        }
      });

      act(() => {
        store.addSaleItem(testItem);
      });

      const updatedStore = useCashSessionStore.getState();
      expect(updatedStore.currentSaleItems).toHaveLength(1);
      expect(updatedStore.currentSaleItems[0].category).toBe('EEE-1');
      expect(updatedStore.currentSaleItems[0].total).toBe(20);
    });

    it('should add item in virtualCashSessionStore', () => {
      const store = useVirtualCashSessionStore.getState();
      
      // Enable virtual mode
      useVirtualCashSessionStore.setState({
        isVirtualMode: true,
        currentSession: {
          id: 'virtual-session-1',
          operator_id: 'op-1',
          initial_amount: 100,
          current_amount: 100,
          status: 'open',
          opened_at: new Date().toISOString()
        }
      });

      act(() => {
        store.addSaleItem(testItem);
      });

      const updatedStore = useVirtualCashSessionStore.getState();
      expect(updatedStore.currentSaleItems).toHaveLength(1);
      expect(updatedStore.currentSaleItems[0].category).toBe('EEE-1');
      expect(updatedStore.currentSaleItems[0].total).toBe(20);
    });

    it('should add item in deferredCashSessionStore', () => {
      const store = useDeferredCashSessionStore.getState();
      
      // Setup deferred session
      useDeferredCashSessionStore.setState({
        currentSession: {
          id: 'deferred-session-1',
          operator_id: 'op-1',
          initial_amount: 100,
          current_amount: 100,
          status: 'open',
          opened_at: new Date(Date.now() - 86400000).toISOString() // Yesterday
        }
      });

      act(() => {
        store.addSaleItem(testItem);
      });

      const updatedStore = useDeferredCashSessionStore.getState();
      expect(updatedStore.currentSaleItems).toHaveLength(1);
      expect(updatedStore.currentSaleItems[0].category).toBe('EEE-1');
      expect(updatedStore.currentSaleItems[0].total).toBe(20);
    });

    /**
     * AC4: Vérifier que clearCurrentSale réinitialise correctement
     */
    it('should clear sale items in all stores', () => {
      // Setup items in all stores
      const item = { ...testItem, id: 'test-item' };
      
      useCashSessionStore.setState({ currentSaleItems: [item as SaleItem] });
      useVirtualCashSessionStore.setState({ currentSaleItems: [item as SaleItem] });
      useDeferredCashSessionStore.setState({ currentSaleItems: [item as SaleItem] });

      // Clear in all stores
      act(() => {
        useCashSessionStore.getState().clearCurrentSale();
        useVirtualCashSessionStore.getState().clearCurrentSale();
        useDeferredCashSessionStore.getState().clearCurrentSale();
      });

      expect(useCashSessionStore.getState().currentSaleItems).toHaveLength(0);
      expect(useVirtualCashSessionStore.getState().currentSaleItems).toHaveLength(0);
      expect(useDeferredCashSessionStore.getState().currentSaleItems).toHaveLength(0);
    });
  });

  describe('overrideTotalAmount Behavior', () => {
    /**
     * AC4: Vérifier que submitSale avec overrideTotalAmount=50 enregistre 50 (pas le sous-total)
     * Ce test est critique pour B49-P2 (mode prix global)
     */
    
    const testItems: SaleItem[] = [
      {
        id: 'item-1',
        category: 'EEE-1',
        quantity: 1,
        weight: 2.5,
        price: 0,  // Prix à 0 car mode prix global
        total: 0
      }
    ];

    const finalizationWithOverride: FinalizationData = {
      donation: 0,
      paymentMethod: 'cash',
      overrideTotalAmount: 50  // Le total réellement négocié
    };

    it('virtualCashSessionStore should use overrideTotalAmount (50) not subtotal (0)', async () => {
      // Enable virtual mode and setup session
      useVirtualCashSessionStore.setState({
        isVirtualMode: true,
        currentSession: {
          id: 'virtual-session-1',
          operator_id: 'op-1',
          initial_amount: 100,
          current_amount: 100,
          status: 'open',
          opened_at: new Date().toISOString()
        },
        currentSaleItems: testItems,
        virtualSales: []
      });

      const store = useVirtualCashSessionStore.getState();
      
      let result: boolean = false;
      await act(async () => {
        result = await store.submitSale(testItems, finalizationWithOverride);
      });

      expect(result).toBe(true);
      
      // Vérifier que la vente enregistrée a le bon total (50, pas 0)
      const updatedStore = useVirtualCashSessionStore.getState();
      expect(updatedStore.virtualSales).toHaveLength(1);
      expect(updatedStore.virtualSales[0].total_amount).toBe(50);  // overrideTotalAmount utilisé
    });

    it('submitSale without overrideTotalAmount should calculate from items', async () => {
      const itemsWithPrice: SaleItem[] = [
        {
          id: 'item-1',
          category: 'EEE-1',
          quantity: 2,
          weight: 1.5,
          price: 10,
          total: 20  // 2 * 10
        }
      ];

      const finalizationWithoutOverride: FinalizationData = {
        donation: 0,
        paymentMethod: 'cash'
        // Pas d'overrideTotalAmount
      };

      // Enable virtual mode and setup session - reset virtualSales explicitly
      useVirtualCashSessionStore.setState({
        isVirtualMode: true,
        currentSession: {
          id: 'virtual-session-2',
          operator_id: 'op-1',
          initial_amount: 100,
          current_amount: 100,
          status: 'open',
          opened_at: new Date().toISOString()
        },
        currentSaleItems: itemsWithPrice,
        virtualSales: []  // Reset explicit
      });

      // Get fresh store state after reset
      const store = useVirtualCashSessionStore.getState();
      expect(store.virtualSales).toHaveLength(0);  // Verify reset worked
      
      let result: boolean = false;
      await act(async () => {
        result = await store.submitSale(itemsWithPrice, finalizationWithoutOverride);
      });

      expect(result).toBe(true);
      
      // Vérifier que la vente enregistrée a le total calculé (20)
      const updatedStore = useVirtualCashSessionStore.getState();
      // Le test précédent peut avoir ajouté une vente - vérifier la dernière vente
      const lastSale = updatedStore.virtualSales[updatedStore.virtualSales.length - 1];
      expect(lastSale.total_amount).toBe(20);  // Calculé depuis items
    });
  });

  describe('closeSession Behavior', () => {
    /**
     * AC4: Vérifier que closeSession retourne false si l'API échoue
     * et met currentSession à null si succès
     */

    it('virtualCashSessionStore closeSession should set currentSession to null on success', async () => {
      // Setup session
      useVirtualCashSessionStore.setState({
        isVirtualMode: true,
        currentSession: {
          id: 'virtual-session-1',
          operator_id: 'op-1',
          initial_amount: 100,
          current_amount: 100,
          status: 'open',
          opened_at: new Date().toISOString()
        }
      });

      const store = useVirtualCashSessionStore.getState();
      
      let result: boolean = false;
      await act(async () => {
        result = await store.closeSession('virtual-session-1');
      });

      expect(result).toBe(true);
      expect(useVirtualCashSessionStore.getState().currentSession).toBeNull();
    });

    it('virtualCashSessionStore closeSession should return false if mode is not virtual', async () => {
      // Setup session but disable virtual mode
      useVirtualCashSessionStore.setState({
        isVirtualMode: false,
        currentSession: {
          id: 'virtual-session-1',
          operator_id: 'op-1',
          initial_amount: 100,
          current_amount: 100,
          status: 'open',
          opened_at: new Date().toISOString()
        }
      });

      const store = useVirtualCashSessionStore.getState();
      
      let result: boolean = false;
      await act(async () => {
        result = await store.closeSession('virtual-session-1');
      });

      expect(result).toBe(false);
    });
  });
});

describe('cashSessionStoreUtils', () => {
  /**
   * AC2: Tester les fonctions utilitaires
   */
  
  // Import dynamique pour éviter les problèmes de mock
  it('should validate UUID correctly', async () => {
    const { isValidUUID } = await import('../../stores/cashSessionStoreUtils');
    
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('don-0')).toBe(false);
    expect(isValidUUID('don-18')).toBe(false);
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
  });

  it('should calculate total amount with override', async () => {
    const { calculateTotalAmount } = await import('../../stores/cashSessionStoreUtils');
    
    const items: SaleItem[] = [
      { id: '1', category: 'EEE-1', quantity: 1, weight: 1, price: 10, total: 10 }
    ];

    // Sans override
    expect(calculateTotalAmount(items)).toBe(10);

    // Avec override
    expect(calculateTotalAmount(items, { overrideTotalAmount: 50, donation: 0, paymentMethod: 'cash' })).toBe(50);
    expect(calculateTotalAmount(items, { overrideTotalAmount: 0, donation: 0, paymentMethod: 'cash' })).toBe(0);
  });

  it('should create sale payload correctly', async () => {
    const { createSalePayload } = await import('../../stores/cashSessionStoreUtils');
    
    const items: SaleItem[] = [
      { 
        id: '1', 
        category: 'EEE-1', 
        quantity: 1, 
        weight: 1.5, 
        price: 0, 
        total: 0,
        presetId: 'don-0'  // Non-UUID, doit être dans notes
      }
    ];

    const payload = createSalePayload('session-1', items, {
      donation: 5,
      paymentMethod: 'cash',
      overrideTotalAmount: 50
    });

    expect(payload.cash_session_id).toBe('session-1');
    expect(payload.total_amount).toBe(50);  // Override utilisé
    expect(payload.donation).toBe(5);
    expect(payload.payment_method).toBe('cash');
    expect(payload.items[0].preset_id).toBeNull();  // Non-UUID
    expect(payload.items[0].notes).toContain('preset_type:don-0');  // Stocké dans notes
  });

  it('should extract error message correctly', async () => {
    const { extractErrorMessage } = await import('../../stores/cashSessionStoreUtils');
    
    // Erreur simple
    expect(extractErrorMessage({ message: 'Test error' })).toBe('Test error');
    
    // Erreur Axios avec detail string
    expect(extractErrorMessage({
      response: { data: { detail: 'API error' } }
    })).toBe('API error');
    
    // Erreur Axios avec detail array (Pydantic)
    expect(extractErrorMessage({
      response: { data: { detail: [{ loc: ['body', 'field'], msg: 'required' }] } }
    })).toBe('body.field: required');
    
    // Défaut
    expect(extractErrorMessage(null, 'Default error')).toBe('Default error');
  });
});

