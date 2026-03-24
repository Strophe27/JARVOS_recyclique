/**
 * Story B50-P9: Tests unitaires pour virtualCashSessionStore - overrideTotalAmount
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVirtualCashSessionStore } from '../../stores/virtualCashSessionStore';

// Mock localStorage
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); })
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('virtualCashSessionStore - overrideTotalAmount (Story B50-P9)', () => {
  beforeEach(() => {
    // Reset store
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
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('submitSale with overrideTotalAmount', () => {
    it('should use overrideTotalAmount when provided', async () => {
      // Arrange
      const store = useVirtualCashSessionStore.getState();
      
      // Set up virtual mode with a session
      store.enableVirtualMode();
      await store.openSession({
        operator_id: 'test-operator',
        site_id: 'test-site',
        initial_amount: 0
      });

      const items = [
        { id: 'item-1', category: 'EEE-1', quantity: 1, weight: 2.5, price: 10, total: 10 },
        { id: 'item-2', category: 'EEE-2', quantity: 2, weight: 1.5, price: 15, total: 30 }
      ];
      const finalization = {
        donation: 0,
        paymentMethod: 'cash' as const,
        overrideTotalAmount: 50  // Override: items total = 40, but override = 50
      };

      // Act
      const success = await store.submitSale(items, finalization);

      // Assert
      expect(success).toBe(true);
      
      // Vérifier que le virtualSale créé a total_amount = 50
      const salesStr = localStorage.getItem('virtual_sales');
      expect(salesStr).toBeTruthy();
      const sales = JSON.parse(salesStr!);
      expect(sales).toHaveLength(1);
      expect(sales[0].total_amount).toBe(50);  // Should use override, not calculated (40)
    });

    it('should calculate total from items when overrideTotalAmount is not provided', async () => {
      // Arrange
      const store = useVirtualCashSessionStore.getState();
      
      store.enableVirtualMode();
      await store.openSession({
        operator_id: 'test-operator',
        site_id: 'test-site',
        initial_amount: 0
      });

      const items = [
        { id: 'item-1', category: 'EEE-1', quantity: 1, weight: 2.5, price: 10, total: 10 },
        { id: 'item-2', category: 'EEE-2', quantity: 2, weight: 1.5, price: 15, total: 30 }
      ];
      const finalization = {
        donation: 0,
        paymentMethod: 'cash' as const
        // No overrideTotalAmount
      };

      // Act
      const success = await store.submitSale(items, finalization);

      // Assert
      expect(success).toBe(true);
      
      const salesStr = localStorage.getItem('virtual_sales');
      expect(salesStr).toBeTruthy();
      const sales = JSON.parse(salesStr!);
      expect(sales).toHaveLength(1);
      expect(sales[0].total_amount).toBe(40);  // Should use calculated total (10 + 30)
    });

    it('should use overrideTotalAmount=0 when explicitly provided as 0', async () => {
      // Arrange
      const store = useVirtualCashSessionStore.getState();
      
      store.enableVirtualMode();
      await store.openSession({
        operator_id: 'test-operator',
        site_id: 'test-site',
        initial_amount: 0
      });

      const items = [
        { id: 'item-1', category: 'EEE-1', quantity: 1, weight: 2.5, price: 10, total: 10 }
      ];
      const finalization = {
        donation: 5,
        paymentMethod: 'cash' as const,
        overrideTotalAmount: 0  // Explicit 0 (e.g., free/donation transaction)
      };

      // Act
      const success = await store.submitSale(items, finalization);

      // Assert
      expect(success).toBe(true);
      
      const salesStr = localStorage.getItem('virtual_sales');
      expect(salesStr).toBeTruthy();
      const sales = JSON.parse(salesStr!);
      expect(sales).toHaveLength(1);
      expect(sales[0].total_amount).toBe(0);  // Should use explicit 0
      expect(sales[0].donation).toBe(5);
    });
  });
});






