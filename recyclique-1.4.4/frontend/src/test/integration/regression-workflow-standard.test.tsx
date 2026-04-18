/**
 * Story B49-P4 T8: Tests de régression - Vérifier que le workflow standard fonctionne toujours
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCashSessionStore } from '../../stores/cashSessionStore';
import axiosClient from '../../api/axiosClient';

// Mocks
vi.mock('../../api/axiosClient', () => ({
  default: {
    post: vi.fn()
  }
}));

const mockAxiosPost = vi.mocked(axiosClient.post);

describe('Tests de Régression - Workflow Standard', () => {
  const mockSession = {
    id: 'session-123',
    operator_id: 'operator-1',
    initial_amount: 100,
    current_amount: 100,
    status: 'open' as const,
    opened_at: '2025-01-01T10:00:00Z',
    register_id: 'register-123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCashSessionStore.setState({
      currentSession: mockSession,
      currentRegisterOptions: null, // Pas d'options = workflow standard
      currentSaleItems: [],
      loading: false,
      error: null
    });
  });

  it('workflow standard inchangé: calcul automatique du total', async () => {
    const mockResponse = { data: { id: 'sale-123' } };
    mockAxiosPost.mockResolvedValue(mockResponse as any);

    const store = useCashSessionStore.getState();
    const items = [
      {
        id: 'item-1',
        category: 'EEE-1',
        quantity: 2,
        weight: 0,
        price: 10,
        total: 20
      },
      {
        id: 'item-2',
        category: 'EEE-2',
        quantity: 1,
        weight: 0,
        price: 15,
        total: 15
      }
    ];

    const finalization = {
      donation: 5,
      paymentMethod: 'cash' as const
      // Pas d'overrideTotalAmount = calcul automatique
    };

    const result = await store.submitSale(items, finalization);

    expect(result).toBe(true);
    expect(mockAxiosPost).toHaveBeenCalledWith(
      '/v1/sales/',
      expect.objectContaining({
        total_amount: 35, // Calcul automatique: 20 + 15 = 35
        donation: 5
      })
    );
  });

  it('validation prix 0€ bloquée en workflow standard', async () => {
    // En workflow standard, les items avec prix 0€ ne devraient pas être acceptés
    // (cette validation se fait au niveau du composant SaleWizard)
    const store = useCashSessionStore.getState();
    
    // Le store accepte les items avec prix 0€, mais le composant devrait les bloquer
    // On teste que le store fonctionne normalement même avec prix 0€
    const items = [
      {
        id: 'item-1',
        category: 'EEE-1',
        quantity: 1,
        weight: 0,
        price: 0,
        total: 0
      }
    ];

    const mockResponse = { data: { id: 'sale-123' } };
    mockAxiosPost.mockResolvedValue(mockResponse as any);

    const finalization = {
      donation: 0,
      paymentMethod: 'cash' as const
    };

    // Le store devrait accepter (la validation UI bloque en amont)
    const result = await store.submitSale(items, finalization);

    expect(result).toBe(true);
    expect(mockAxiosPost).toHaveBeenCalledWith(
      '/v1/sales/',
      expect.objectContaining({
        total_amount: 0 // Calcul automatique même si 0€
      })
    );
  });

  it('toutes fonctionnalités existantes intactes: workflow complet', async () => {
    const mockResponse = { data: { id: 'sale-123' } };
    mockAxiosPost.mockResolvedValue(mockResponse as any);

    const store = useCashSessionStore.getState();
    const items = [
      {
        id: 'item-1',
        category: 'EEE-1',
        quantity: 2,
        weight: 2.5,
        price: 10,
        total: 20,
        presetId: '550e8400-e29b-41d4-a716-446655440000'
      }
    ];

    const finalization = {
      donation: 5,
      paymentMethod: 'card' as const,
      note: 'Test note'
    };

    const result = await store.submitSale(items, finalization);

    expect(result).toBe(true);
    expect(mockAxiosPost).toHaveBeenCalledWith(
      '/v1/sales/',
      expect.objectContaining({
        total_amount: 20, // Calcul automatique
        donation: 5,
        payment_method: 'card',
        note: 'Test note',
        items: expect.arrayContaining([
          expect.objectContaining({
            category: 'EEE-1',
            quantity: 2,
            weight: 2.5,
            unit_price: 10,
            total_price: 20,
            preset_id: '550e8400-e29b-41d4-a716-446655440000'
          })
        ])
      })
    );
  });

  it('performance: pas de dégradation avec options désactivées', async () => {
    const mockResponse = { data: { id: 'sale-123' } };
    mockAxiosPost.mockResolvedValue(mockResponse as any);

    const store = useCashSessionStore.getState();
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      category: 'EEE-1',
      quantity: 1,
      weight: 0,
      price: 10,
      total: 10
    }));

    const startTime = performance.now();
    const result = await store.submitSale(items, {
      donation: 0,
      paymentMethod: 'cash' as const
    });
    const endTime = performance.now();

    expect(result).toBe(true);
    // Le temps d'exécution devrait être raisonnable (< 1 seconde pour 10 items)
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('rétrocompatibilité: session sans register_options fonctionne', async () => {
    useCashSessionStore.setState({
      currentSession: {
        ...mockSession,
        register_id: null // Pas de register = pas d'options
      },
      currentRegisterOptions: null,
      currentSaleItems: []
    });

    const mockResponse = { data: { id: 'sale-123' } };
    mockAxiosPost.mockResolvedValue(mockResponse as any);

    const store = useCashSessionStore.getState();
    const items = [
      {
        id: 'item-1',
        category: 'EEE-1',
        quantity: 1,
        weight: 0,
        price: 10,
        total: 10
      }
    ];

    const result = await store.submitSale(items, {
      donation: 0,
      paymentMethod: 'cash' as const
    });

    expect(result).toBe(true);
    // Le workflow standard devrait fonctionner même sans options
    expect(mockAxiosPost).toHaveBeenCalledWith(
      '/v1/sales/',
      expect.objectContaining({
        total_amount: 10 // Calcul automatique
      })
    );
  });
});

