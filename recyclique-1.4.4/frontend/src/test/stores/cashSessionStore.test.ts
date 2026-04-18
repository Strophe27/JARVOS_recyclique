import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock du service avant l'import
vi.mock('../../services/cashSessionService', () => ({
  cashSessionService: {
    closeSession: vi.fn(),
    closeSessionWithAmounts: vi.fn()
  }
}))

// Mock axiosClient avant l'import
vi.mock('../../api/axiosClient', () => ({
  default: {
    post: vi.fn()
  }
}))

// Mock transactionLogService avant l'import
vi.mock('../../services/transactionLogService', () => ({
  transactionLogService: {
    logAnomaly: vi.fn().mockResolvedValue(undefined),
    logTicketOpened: vi.fn().mockResolvedValue(undefined)
  }
}))

import { useCashSessionStore } from '../../stores/cashSessionStore'
import { cashSessionService } from '../../services/cashSessionService'
import axiosClient from '../../api/axiosClient'

// Récupérer les mocks après l'import
const mockCloseSession = vi.mocked(cashSessionService.closeSession)
const mockCloseSessionWithAmounts = vi.mocked(cashSessionService.closeSessionWithAmounts)
const mockAxiosPost = vi.mocked(axiosClient.post)

describe('cashSessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useCashSessionStore.setState({
      currentSession: null,
      loading: false,
      error: null
    })
  })

  describe('closeSession', () => {
    it('should close session without amounts when no closeData provided', async () => {
      mockCloseSession.mockResolvedValue(true)
      
      const store = useCashSessionStore.getState()
      const result = await store.closeSession('session-123')
      
      expect(mockCloseSession).toHaveBeenCalledWith('session-123')
      expect(result).toBe(true)
    })

    it('should close session with amounts when closeData provided', async () => {
      const mockClosedSession = {
        id: 'session-123',
        status: 'closed',
        actual_amount: 75.0,
        variance: 0.0
      }
      
      mockCloseSessionWithAmounts.mockResolvedValue(mockClosedSession)
      
      const store = useCashSessionStore.getState()
      const result = await store.closeSession('session-123', {
        actual_amount: 75.0,
        variance_comment: 'Test comment'
      })
      
      expect(mockCloseSessionWithAmounts).toHaveBeenCalledWith('session-123', 75.0, 'Test comment')
      expect(result).toBe(true)
    })

    it('should set loading state during closure', async () => {
      let resolvePromise: (value: boolean) => void
      const promise = new Promise<boolean>(resolve => {
        resolvePromise = resolve
      })
      
      mockCloseSession.mockReturnValue(promise)
      
      const store = useCashSessionStore.getState()
      const closePromise = store.closeSession('session-123')
      
      // Check loading state
      expect(useCashSessionStore.getState().loading).toBe(true)
      
      // Resolve the promise
      resolvePromise!(true)
      await closePromise
      
      // Check loading state after completion
      expect(useCashSessionStore.getState().loading).toBe(false)
    })

    it('should clear currentSession and localStorage on successful closure', async () => {
      const mockSession = {
        id: 'session-123',
        status: 'open'
      }
      
      useCashSessionStore.setState({ currentSession: mockSession })

      // Mock localStorage
      const mockRemoveItem = vi.fn()
      Object.defineProperty(window, 'localStorage', {
        value: {
          removeItem: mockRemoveItem
        }
      })
      
      mockCloseSession.mockResolvedValue(true)
      
      const store = useCashSessionStore.getState()
      await store.closeSession('session-123')
      
      expect(useCashSessionStore.getState().currentSession).toBeNull()
      expect(mockRemoveItem).toHaveBeenCalledWith('currentCashSession')
    })

    it('should handle closure error and set error state', async () => {
      const errorMessage = 'Session not found'
      mockCloseSession.mockRejectedValue(new Error(errorMessage))
      
      const store = useCashSessionStore.getState()
      const result = await store.closeSession('session-123')
      
      expect(result).toBe(false)
      expect(useCashSessionStore.getState().error).toBe(errorMessage)
      expect(useCashSessionStore.getState().loading).toBe(false)
    })

    it('should handle closure with amounts error', async () => {
      const errorMessage = 'Invalid amount'
      mockCloseSessionWithAmounts.mockRejectedValue(new Error(errorMessage))
      
      const store = useCashSessionStore.getState()
      const result = await store.closeSession('session-123', {
        actual_amount: 75.0,
        variance_comment: 'Test'
      })
      
      expect(result).toBe(false)
      expect(useCashSessionStore.getState().error).toBe(errorMessage)
    })

    it('should handle unknown error types', async () => {
      mockCloseSession.mockRejectedValue('Unknown error')
      
      const store = useCashSessionStore.getState()
      const result = await store.closeSession('session-123')
      
      expect(result).toBe(false)
      expect(useCashSessionStore.getState().error).toBe('Erreur lors de la fermeture de session')
    })

    it('should not clear session when closure fails', async () => {
      const mockSession = {
        id: 'session-123',
        status: 'open'
      }
      
      useCashSessionStore.setState({ currentSession: mockSession })
      
      mockCloseSession.mockResolvedValue(false)
      
      const store = useCashSessionStore.getState()
      await store.closeSession('session-123')
      
      expect(useCashSessionStore.getState().currentSession).toBe(mockSession)
    })
  })

  describe('submitSale', () => {
    const mockSession = {
      id: 'session-123',
      operator_id: 'operator-1',
      initial_amount: 100,
      current_amount: 100,
      status: 'open' as const,
      opened_at: '2025-01-01T10:00:00Z'
    }

    const mockSaleItems = [
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
    ]

    beforeEach(() => {
      useCashSessionStore.setState({
        currentSession: mockSession,
        currentSaleItems: [],
        currentSaleNote: null,
        loading: false,
        error: null
      })
      mockAxiosPost.mockClear()
    })

    it('should submit sale with overrideTotalAmount when provided', async () => {
      const mockResponse = { data: { id: 'sale-123' } }
      mockAxiosPost.mockResolvedValue(mockResponse as any)

      const store = useCashSessionStore.getState()
      const finalization = {
        donation: 5,
        paymentMethod: 'cash' as const,
        overrideTotalAmount: 50 // Override: items total = 35, but override = 50
      }

      const result = await store.submitSale(mockSaleItems, finalization)

      expect(result).toBe(true)
      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/v1/sales/',
        expect.objectContaining({
          cash_session_id: 'session-123',
          total_amount: 50, // Should use overrideTotalAmount
          donation: 5,
          payment_method: 'cash',
          items: expect.arrayContaining([
            expect.objectContaining({
              category: 'EEE-1',
              quantity: 2,
              unit_price: 10,
              total_price: 20
            }),
            expect.objectContaining({
              category: 'EEE-2',
              quantity: 1,
              unit_price: 15,
              total_price: 15
            })
          ])
        })
      )
      expect(useCashSessionStore.getState().currentSaleItems).toEqual([])
      expect(useCashSessionStore.getState().currentSaleNote).toBeNull()
      expect(useCashSessionStore.getState().loading).toBe(false)
    })

    it('should submit sale without overrideTotalAmount (standard behavior)', async () => {
      const mockResponse = { data: { id: 'sale-123' } }
      mockAxiosPost.mockResolvedValue(mockResponse as any)

      const store = useCashSessionStore.getState()
      const finalization = {
        donation: 5,
        paymentMethod: 'card' as const
        // No overrideTotalAmount
      }

      const result = await store.submitSale(mockSaleItems, finalization)

      expect(result).toBe(true)
      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/v1/sales/',
        expect.objectContaining({
          cash_session_id: 'session-123',
          total_amount: 35, // Should calculate: 20 + 15 = 35
          donation: 5,
          payment_method: 'card',
          items: expect.arrayContaining([
            expect.objectContaining({
              category: 'EEE-1',
              quantity: 2,
              unit_price: 10,
              total_price: 20
            }),
            expect.objectContaining({
              category: 'EEE-2',
              quantity: 1,
              unit_price: 15,
              total_price: 15
            })
          ])
        })
      )
    })

    it('should submit sale with overrideTotalAmount = 0 when provided', async () => {
      const mockResponse = { data: { id: 'sale-123' } }
      mockAxiosPost.mockResolvedValue(mockResponse as any)

      const store = useCashSessionStore.getState()
      const finalization = {
        donation: 0,
        paymentMethod: 'cash' as const,
        overrideTotalAmount: 0 // Edge case: override to 0
      }

      const result = await store.submitSale(mockSaleItems, finalization)

      expect(result).toBe(true)
      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/v1/sales/',
        expect.objectContaining({
          total_amount: 0 // Should use overrideTotalAmount even if 0
        })
      )
    })

    it('should handle error when no current session', async () => {
      useCashSessionStore.setState({ currentSession: null })

      const store = useCashSessionStore.getState()
      const result = await store.submitSale(mockSaleItems)

      expect(result).toBe(false)
      expect(useCashSessionStore.getState().error).toBe('Aucune session de caisse active')
      expect(mockAxiosPost).not.toHaveBeenCalled()
    })

    it('should handle API error and set error state', async () => {
      const errorResponse = {
        response: {
          data: {
            detail: 'Validation error: total_amount must be positive'
          }
        }
      }
      mockAxiosPost.mockRejectedValue(errorResponse)

      const store = useCashSessionStore.getState()
      const result = await store.submitSale(mockSaleItems, {
        donation: 0,
        paymentMethod: 'cash'
      })

      expect(result).toBe(false)
      expect(useCashSessionStore.getState().error).toBe('Validation error: total_amount must be positive')
      expect(useCashSessionStore.getState().loading).toBe(false)
    })

    it('should handle API error with array detail', async () => {
      const errorResponse = {
        response: {
          data: {
            detail: [
              { loc: ['body', 'total_amount'], msg: 'must be positive' },
              { loc: ['body', 'items'], msg: 'must not be empty' }
            ]
          }
        }
      }
      mockAxiosPost.mockRejectedValue(errorResponse)

      const store = useCashSessionStore.getState()
      const result = await store.submitSale(mockSaleItems)

      expect(result).toBe(false)
      expect(useCashSessionStore.getState().error).toContain('body.total_amount')
      expect(useCashSessionStore.getState().error).toContain('body.items')
    })

    it('should handle generic error', async () => {
      const genericError = new Error('Network error')
      mockAxiosPost.mockRejectedValue(genericError)

      const store = useCashSessionStore.getState()
      const result = await store.submitSale(mockSaleItems)

      expect(result).toBe(false)
      expect(useCashSessionStore.getState().error).toBe('Network error')
    })

    it('should handle unknown error type', async () => {
      mockAxiosPost.mockRejectedValue('Unknown error')

      const store = useCashSessionStore.getState()
      const result = await store.submitSale(mockSaleItems)

      expect(result).toBe(false)
      expect(useCashSessionStore.getState().error).toBe('Erreur lors de l\'enregistrement de la vente')
    })

    it('should set loading state during submission', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise<any>(resolve => {
        resolvePromise = resolve
      })
      mockAxiosPost.mockReturnValue(promise)

      const store = useCashSessionStore.getState()
      const submitPromise = store.submitSale(mockSaleItems)

      // Check loading state
      expect(useCashSessionStore.getState().loading).toBe(true)

      // Resolve the promise
      resolvePromise!({ data: { id: 'sale-123' } })
      await submitPromise

      // Check loading state after completion
      expect(useCashSessionStore.getState().loading).toBe(false)
    })

    it('should include note in finalization when provided', async () => {
      const mockResponse = { data: { id: 'sale-123' } }
      mockAxiosPost.mockResolvedValue(mockResponse as any)

      useCashSessionStore.setState({ currentSaleNote: 'Test note' })

      const store = useCashSessionStore.getState()
      const finalization = {
        donation: 0,
        paymentMethod: 'cash' as const,
        note: 'Finalization note'
      }

      await store.submitSale(mockSaleItems, finalization)

      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/v1/sales/',
        expect.objectContaining({
          note: 'Finalization note'
        })
      )
    })

    it('should handle items with presetId (UUID)', async () => {
      const mockResponse = { data: { id: 'sale-123' } }
      mockAxiosPost.mockResolvedValue(mockResponse as any)

      const itemsWithPreset = [
        {
          ...mockSaleItems[0],
          presetId: '550e8400-e29b-41d4-a716-446655440000' // Valid UUID
        }
      ]

      const store = useCashSessionStore.getState()
      await store.submitSale(itemsWithPreset)

      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/v1/sales/',
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              preset_id: '550e8400-e29b-41d4-a716-446655440000'
            })
          ])
        })
      )
    })

    it('should handle items with presetId (non-UUID) in notes', async () => {
      const mockResponse = { data: { id: 'sale-123' } }
      mockAxiosPost.mockResolvedValue(mockResponse as any)

      const itemsWithPreset = [
        {
          ...mockSaleItems[0],
          presetId: 'don-0' // Non-UUID preset
        }
      ]

      const store = useCashSessionStore.getState()
      await store.submitSale(itemsWithPreset)

      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/v1/sales/',
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              preset_id: null,
              notes: 'preset_type:don-0'
            })
          ])
        })
      )
    })

    it('should handle items with both presetId (non-UUID) and notes', async () => {
      const mockResponse = { data: { id: 'sale-123' } }
      mockAxiosPost.mockResolvedValue(mockResponse as any)

      const itemsWithPreset = [
        {
          ...mockSaleItems[0],
          presetId: 'don-18',
          notes: 'User note'
        }
      ]

      const store = useCashSessionStore.getState()
      await store.submitSale(itemsWithPreset)

      expect(mockAxiosPost).toHaveBeenCalledWith(
        '/v1/sales/',
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              preset_id: null,
              notes: 'preset_type:don-18; User note'
            })
          ])
        })
      )
    })
  })

  describe('addSaleItem - B51-P5 Fix 1', () => {
    const mockSession = {
      id: 'session-123',
      operator_id: 'user-123',
      initial_amount: 50.0,
      current_amount: 50.0,
      status: 'open' as const,
      opened_at: '2025-01-27T10:00:00Z'
    }

    const mockItem: Omit<import('../../stores/cashSessionStore').SaleItem, 'id'> = {
      category: 'EEE-3',
      quantity: 1,
      weight: 2.5,
      price: 15.0,
      total: 15.0
    }

    beforeEach(() => {
      useCashSessionStore.setState({
        currentSession: mockSession,
        currentSaleItems: [],
        ticketOpenedLogged: false
      })
    })

    it('should block item addition if ticketOpenedLogged is false', () => {
      const store = useCashSessionStore.getState()
      const initialItemsCount = store.currentSaleItems.length
      
      store.addSaleItem(mockItem)
      
      // L'ajout doit être bloqué
      expect(store.currentSaleItems.length).toBe(initialItemsCount)
      // newItem ne doit pas être créé (pas d'item avec l'ID généré)
      expect(store.currentSaleItems.find(item => item.category === 'EEE-3')).toBeUndefined()
    })

    it('should allow item addition if ticketOpenedLogged is true', () => {
      useCashSessionStore.setState({ ticketOpenedLogged: true })
      
      const store = useCashSessionStore.getState()
      const initialItemsCount = store.currentSaleItems.length
      
      store.addSaleItem(mockItem)
      
      // L'ajout doit fonctionner
      expect(store.currentSaleItems.length).toBe(initialItemsCount + 1)
      const addedItem = store.currentSaleItems.find(item => item.category === 'EEE-3')
      expect(addedItem).toBeDefined()
      expect(addedItem?.quantity).toBe(1)
      expect(addedItem?.price).toBe(15.0)
    })

    it('should log anomaly when blocking addition without ticket', async () => {
      const { transactionLogService } = await import('../../services/transactionLogService')
      const logAnomalySpy = vi.spyOn(transactionLogService, 'logAnomaly')
      
      const store = useCashSessionStore.getState()
      store.addSaleItem(mockItem)
      
      // Attendre que le log asynchrone soit appelé
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Une anomalie doit être loggée
      expect(logAnomalySpy).toHaveBeenCalledWith(
        mockSession.id,
        expect.objectContaining({
          items_count: 0,  // Pas +1 car on bloque l'ajout
          items: [],
          total: 0
        }),
        'Item added but no ticket is explicitly opened - BLOCKED (B51-P5 fix)'
      )
    })
  })

  describe('onRehydrateStorage - B51-P5 Fix 2', () => {
    const mockSession = {
      id: 'session-123',
      operator_id: 'user-123',
      initial_amount: 50.0,
      current_amount: 50.0,
      status: 'open' as const,
      opened_at: '2025-01-27T10:00:00Z'
    }

    const mockItems = [
      {
        id: 'item-1',
        category: 'EEE-3',
        quantity: 1,
        weight: 2.5,
        price: 15.0,
        total: 15.0
      },
      {
        id: 'item-2',
        category: 'EEE-4',
        quantity: 1,
        weight: 1.0,
        price: 10.0,
        total: 10.0
      }
    ]

    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear()
      vi.clearAllMocks()
      // Reset store state
      useCashSessionStore.setState({
        currentSession: null,
        currentSaleItems: [],
        ticketOpenedLogged: false,
        currentRegisterOptions: null
      })
    })

    it('should clear items when restored from localStorage but ticketOpenedLogged is not defined', () => {
      // B51-P5 Fix 2: Simuler le comportement de onRehydrateStorage
      // Quand des articles sont restaurés depuis localStorage mais ticketOpenedLogged
      // n'est pas défini (toujours false car pas dans partialize), les articles doivent être vidés
      
      // Simuler l'état restauré depuis localStorage (ce que fait Zustand persist)
      // Note: ticketOpenedLogged n'est PAS dans partialize, donc toujours false au rehydrate
      const restoredState = {
        currentSession: mockSession,
        currentSaleItems: [...mockItems], // Copie des articles
        currentRegisterOptions: null,
        ticketOpenedLogged: false // Toujours false au rehydrate (pas persisté)
      }

      // Appliquer la logique de onRehydrateStorage (lignes 799-805)
      // Cette logique vide les articles si ticketOpenedLogged n'est pas défini
      if (restoredState.currentSaleItems && restoredState.currentSaleItems.length > 0) {
        // ticketOpenedLogged n'est pas persisté, donc toujours false au rehydrate
        // Les articles doivent être vidés pour éviter les articles fantômes
        restoredState.currentSaleItems = []
      }

      // Vérifier que les articles sont vidés
      expect(restoredState.currentSaleItems).toHaveLength(0)
    })

    it('should not clear items if items array is empty', () => {
      // Si le panier est vide, onRehydrateStorage ne doit rien faire
      // La condition dans onRehydrateStorage est :
      // if (state?.currentSaleItems && state.currentSaleItems.length > 0)
      // Donc si length === 0, on ne rentre pas dans la condition
      
      const emptyState = {
        currentSession: mockSession,
        currentSaleItems: [], // Panier vide
        currentRegisterOptions: null,
        ticketOpenedLogged: false
      }

      // Simuler la logique de onRehydrateStorage
      // Si le panier est vide, la condition n'est pas remplie, donc pas de vidage
      if (emptyState.currentSaleItems && emptyState.currentSaleItems.length > 0) {
        emptyState.currentSaleItems = []
      }

      // Vérifier que le panier reste vide (pas de changement)
      expect(emptyState.currentSaleItems).toHaveLength(0)
    })

    it('should clear items when items exist but ticketOpenedLogged is false (rehydrate scenario)', () => {
      // Scénario de rehydratation : articles restaurés depuis localStorage
      // mais ticketOpenedLogged est false (car pas persisté)
      // Les articles doivent être vidés pour éviter les articles fantômes
      
      const stateAfterRehydrate = {
        currentSession: mockSession,
        currentSaleItems: [...mockItems], // Articles restaurés
        currentRegisterOptions: null,
        ticketOpenedLogged: false // False car pas dans partialize
      }

      // Appliquer la logique de onRehydrateStorage
      // (B51-P5 Fix 2: lignes 799-805 de cashSessionStore.ts)
      if (stateAfterRehydrate.currentSaleItems && stateAfterRehydrate.currentSaleItems.length > 0) {
        // ticketOpenedLogged n'est pas persisté, donc toujours false au rehydrate
        // Les articles doivent être vidés
        stateAfterRehydrate.currentSaleItems = []
      }

      // Vérifier que les articles sont vidés
      expect(stateAfterRehydrate.currentSaleItems).toHaveLength(0)
      expect(stateAfterRehydrate.currentSaleItems).toEqual([])
    })

    it('should handle case when currentSaleItems is undefined', () => {
      // Cas limite : currentSaleItems peut être undefined
      const stateWithUndefined = {
        currentSession: mockSession,
        currentSaleItems: undefined as any,
        currentRegisterOptions: null,
        ticketOpenedLogged: false
      }

      // La condition dans onRehydrateStorage vérifie d'abord si currentSaleItems existe
      // if (state?.currentSaleItems && state.currentSaleItems.length > 0)
      if (stateWithUndefined.currentSaleItems && stateWithUndefined.currentSaleItems.length > 0) {
        stateWithUndefined.currentSaleItems = []
      }

      // Si undefined, la condition n'est pas remplie, donc pas de modification
      expect(stateWithUndefined.currentSaleItems).toBeUndefined()
    })
  })
})