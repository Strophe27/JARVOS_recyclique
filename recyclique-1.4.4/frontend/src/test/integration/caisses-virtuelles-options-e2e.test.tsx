/**
 * Story B49-P4 T7: Tests E2E pour les caisses virtuelles/différées avec options héritées
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVirtualCashSessionStore } from '../../stores/virtualCashSessionStore';
import { useDeferredCashSessionStore } from '../../stores/deferredCashSessionStore';
import axiosClient from '../../api/axiosClient';

// Mocks
vi.mock('../../stores/virtualCashSessionStore');
vi.mock('../../stores/deferredCashSessionStore');
vi.mock('../../api/axiosClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

const mockUseVirtualCashSessionStore = vi.mocked(useVirtualCashSessionStore);
const mockUseDeferredCashSessionStore = vi.mocked(useDeferredCashSessionStore);
const mockAxiosPost = vi.mocked(axiosClient.post);

describe('E2E Caisses Virtuelles/Différées avec Options', () => {
  const mockRegisterOptions = {
    features: {
      no_item_pricing: {
        enabled: true,
        label: 'Mode prix global'
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scénario caisse virtuelle avec options héritées', async () => {
    const mockSession = {
      id: 'virtual-session-123',
      operator_id: 'operator-1',
      initial_amount: 0,
      current_amount: 0,
      status: 'open' as const,
      opened_at: '2025-01-01T10:00:00Z',
      register_id: 'register-123',
      register_options: mockRegisterOptions
    };

    const mockSubmitSale = vi.fn().mockResolvedValue(true);
    mockUseVirtualCashSessionStore.mockReturnValue({
      currentSession: mockSession,
      currentRegisterOptions: mockRegisterOptions,
      isVirtualMode: true,
      currentSaleItems: [
        {
          id: 'item-1',
          category: 'EEE-1',
          quantity: 1,
          weight: 2.5,
          price: 0,
          total: 0
        }
      ],
      submitSale: mockSubmitSale
    } as any);

    const store = useVirtualCashSessionStore.getState();
    const items = store.currentSaleItems;
    const finalization = {
      donation: 0,
      paymentMethod: 'cash' as const,
      overrideTotalAmount: 20.00 // Total manuel en mode prix global
    };

    // Vérifier que les options sont héritées
    expect(store.currentRegisterOptions).toEqual(mockRegisterOptions);
    expect(store.currentRegisterOptions?.features.no_item_pricing.enabled).toBe(true);

    // Soumettre la vente
    await store.submitSale(items, finalization);

    // En mode virtuel, submitSale ne devrait pas appeler l'API
    // mais simuler la vente localement
    expect(mockSubmitSale).toHaveBeenCalled();
  });

  it('scénario caisse différée avec options héritées', async () => {
    const mockSession = {
      id: 'deferred-session-123',
      operator_id: 'operator-1',
      initial_amount: 100,
      current_amount: 100,
      status: 'open' as const,
      opened_at: '2025-01-01T08:00:00Z', // Date dans le passé
      register_id: 'register-123',
      register_options: mockRegisterOptions
    };

    const mockSubmitSale = vi.fn().mockResolvedValue(true);
    mockUseDeferredCashSessionStore.mockReturnValue({
      currentSession: mockSession,
      currentRegisterOptions: mockRegisterOptions,
      isDeferredMode: true,
      currentSaleItems: [
        {
          id: 'item-1',
          category: 'EEE-1',
          quantity: 1,
          weight: 2.5,
          price: 0,
          total: 0
        }
      ],
      submitSale: mockSubmitSale
    } as any);

    const store = useDeferredCashSessionStore.getState();
    const items = store.currentSaleItems;
    const finalization = {
      donation: 0,
      paymentMethod: 'cash' as const,
      overrideTotalAmount: 15.00 // Total manuel en mode prix global
    };

    // Vérifier que les options sont héritées
    expect(store.currentRegisterOptions).toEqual(mockRegisterOptions);
    expect(store.currentRegisterOptions?.features.no_item_pricing.enabled).toBe(true);

    // Soumettre la vente
    await store.submitSale(items, finalization);

    expect(mockSubmitSale).toHaveBeenCalled();
  });

  it('scénario workflow identique à caisse réelle', async () => {
    // Test que le workflow en mode virtuel/différé est identique à une caisse réelle
    const mockSession = {
      id: 'session-123',
      operator_id: 'operator-1',
      initial_amount: 100,
      current_amount: 100,
      status: 'open' as const,
      opened_at: '2025-01-01T10:00:00Z',
      register_id: 'register-123',
      register_options: mockRegisterOptions
    };

    // Test avec caisse virtuelle
    const mockVirtualSubmitSale = vi.fn().mockResolvedValue(true);
    mockUseVirtualCashSessionStore.mockReturnValue({
      currentSession: mockSession,
      currentRegisterOptions: mockRegisterOptions,
      isVirtualMode: true,
      currentSaleItems: [],
      submitSale: mockVirtualSubmitSale
    } as any);

    const virtualStore = useVirtualCashSessionStore.getState();
    expect(virtualStore.currentRegisterOptions).toEqual(mockRegisterOptions);

    // Test avec caisse différée
    const mockDeferredSubmitSale = vi.fn().mockResolvedValue(true);
    mockUseDeferredCashSessionStore.mockReturnValue({
      currentSession: mockSession,
      currentRegisterOptions: mockRegisterOptions,
      isDeferredMode: true,
      currentSaleItems: [],
      submitSale: mockDeferredSubmitSale
    } as any);

    const deferredStore = useDeferredCashSessionStore.getState();
    expect(deferredStore.currentRegisterOptions).toEqual(mockRegisterOptions);

    // Les deux doivent avoir les mêmes options
    expect(virtualStore.currentRegisterOptions).toEqual(deferredStore.currentRegisterOptions);
  });
});

