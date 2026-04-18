import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import CashSessionDetail from '../../../pages/Admin/CashSessionDetail'

// Mock de react-router-dom
const mockNavigate = vi.fn()
const mockParams = { id: 'test-session-id' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
  }
})

// Mock de fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock de localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock de useAuthStore
const mockUseAuthStore = vi.fn()
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: mockUseAuthStore,
}))

// Mock des services
vi.mock('../../../services/salesService', () => ({
  getSaleDetail: vi.fn(),
  updateSaleNote: vi.fn(),
  // B52-P2: édition du poids
  updateSaleItemWeight: vi.fn(),
}))

vi.mock('../../../services/categoriesService', () => ({
  getCategories: vi.fn(),
}))

vi.mock('../../../services/usersService', () => ({
  getUsers: vi.fn(),
}))

vi.mock('../../../services/presetService', () => ({
  presetService: {
    getPresets: vi.fn(),
  },
}))

const mockSessionData = {
  id: 'test-session-id',
  operator_id: 'operator-id',
  operator_name: 'Jean Dupont',
  site_id: 'site-id',
  site_name: 'Site Principal',
  initial_amount: 50.0,
  current_amount: 100.0,
  status: 'closed',
  opened_at: '2025-01-27T10:30:00Z',
  closed_at: '2025-01-27T18:00:00Z',
  total_sales: 50.0,
  total_items: 3,
  // B52-P6: poids total sorti sur la session
  total_weight_out: 7.75,
  sales: [
    {
      id: 'sale-1',
      total_amount: 25.0,
      donation: 5.0,
      payment_method: 'cash',
      created_at: '2025-01-27T11:00:00Z',
      sale_date: '2025-01-27T11:00:00Z',
      operator_id: 'operator-id',
      note: 'Vente avec don pour association locale',
      // B52-P6: poids total du panier
      total_weight: 3.5,
    },
    {
      id: 'sale-2',
      total_amount: 20.0,
      donation: 0.0,
      payment_method: 'card',
      created_at: '2025-01-27T12:00:00Z',
      sale_date: '2025-01-27T12:00:00Z',
      operator_id: 'operator-id',
      note: null,
      total_weight: 4.25,
    },
  ],
}

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('CashSessionDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue('mock-token')
  })

  it('should render loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves
    
    renderWithRouter(<CashSessionDetail />)
    
    expect(screen.getByText('Chargement des détails de la session...')).toBeInTheDocument()
  })

  it('should render session details when data is loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionData,
    })

    renderWithRouter(<CashSessionDetail />)
    
    await waitFor(() => {
      expect(screen.getByText('Détail de la Session de Caisse')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
    expect(screen.getByText('Site Principal')).toBeInTheDocument()
    expect(screen.getByText('50,00 €')).toBeInTheDocument() // Initial amount
    expect(screen.getByText('50,00 €')).toBeInTheDocument() // Total sales
    expect(screen.getByText('3')).toBeInTheDocument() // Total items
    expect(screen.getByText('Fermée')).toBeInTheDocument() // Status
    // B52-P6: carte poids sorties par session
    expect(screen.getByText('Poids vendus ou donnés (sorties)')).toBeInTheDocument()
    expect(screen.getByText('7,75 kg')).toBeInTheDocument()
  })

  it('should render sales table with correct data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionData,
    })

    renderWithRouter(<CashSessionDetail />)
    
    await waitFor(() => {
      expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
    })
    
    // Vérifier les en-têtes du tableau
    expect(screen.getByText('Heure')).toBeInTheDocument()
    expect(screen.getByText('Montant')).toBeInTheDocument()
    expect(screen.getByText('Don')).toBeInTheDocument()
    expect(screen.getByText('Poids')).toBeInTheDocument()
    expect(screen.getByText('Paiement')).toBeInTheDocument()
    expect(screen.getByText('Opérateur')).toBeInTheDocument()
    
    // Vérifier les données des ventes
    expect(screen.getByText('25,00 €')).toBeInTheDocument() // Sale 1 amount
    expect(screen.getByText('20,00 €')).toBeInTheDocument() // Sale 2 amount
    expect(screen.getByText('5,00 €')).toBeInTheDocument() // Donation
    expect(screen.getByText('3,50 kg')).toBeInTheDocument() // Sale 1 weight
    expect(screen.getByText('4,25 kg')).toBeInTheDocument() // Sale 2 weight
    expect(screen.getByText('cash')).toBeInTheDocument()
    expect(screen.getByText('card')).toBeInTheDocument()
  })

  it('should render empty sales state when no sales', async () => {
    const sessionWithoutSales = {
      ...mockSessionData,
      sales: []
    }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sessionWithoutSales,
    })

    renderWithRouter(<CashSessionDetail />)
    
    await waitFor(() => {
      expect(screen.getByText('Journal des Ventes (0 vente)')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Aucune vente enregistrée pour cette session.')).toBeInTheDocument()
  })

  it('should handle session with variance', async () => {
    const sessionWithVariance = {
      ...mockSessionData,
      closing_amount: 100.0,
      actual_amount: 95.0,
      variance: -5.0,
      variance_comment: 'Manque de 5€'
    }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sessionWithVariance,
    })

    renderWithRouter(<CashSessionDetail />)
    
    await waitFor(() => {
      expect(screen.getByText('Contrôle de caisse')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Montant théorique: 100,00 €')).toBeInTheDocument()
    expect(screen.getByText('Montant physique: 95,00 €')).toBeInTheDocument()
    expect(screen.getByText('Écart: -5,00 €')).toBeInTheDocument()
    expect(screen.getByText('Commentaire: Manque de 5€')).toBeInTheDocument()
  })

  it('should handle open session', async () => {
    const openSession = {
      ...mockSessionData,
      status: 'open',
      closed_at: null
    }
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => openSession,
    })

    renderWithRouter(<CashSessionDetail />)
    
    await waitFor(() => {
      expect(screen.getByText('Ouverte')).toBeInTheDocument()
    })
  })

  it('should handle API error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    renderWithRouter(<CashSessionDetail />)
    
    await waitFor(() => {
      expect(screen.getByText('Erreur')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('should handle 404 error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })

    renderWithRouter(<CashSessionDetail />)
    
    await waitFor(() => {
      expect(screen.getByText('Session non trouvée')).toBeInTheDocument()
    })
  })

  it('should handle missing session ID', () => {
    // Mock useParams to return undefined id
    vi.mocked(require('react-router-dom').useParams).mockReturnValue({})

    renderWithRouter(<CashSessionDetail />)
    
    expect(screen.getByText('Erreur')).toBeInTheDocument()
    expect(screen.getByText('ID de session manquant')).toBeInTheDocument()
  })

  it('should navigate back when back button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionData,
    })

    renderWithRouter(<CashSessionDetail />)
    
    await waitFor(() => {
      expect(screen.getByText('Retour')).toBeInTheDocument()
    })
    
    const backButton = screen.getByText('Retour')
    backButton.click()
    
    expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard')
  })

  it('should format currency correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionData,
    })

    renderWithRouter(<CashSessionDetail />)
    
    await waitFor(() => {
      expect(screen.getByText('50,00 €')).toBeInTheDocument()
    })
  })

  it('should format dates correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionData,
    })

    renderWithRouter(<CashSessionDetail />)

    await waitFor(() => {
      // Vérifier que les dates sont formatées (format français)
      expect(screen.getByText(/27\/01\/2025/)).toBeInTheDocument()
    })
  })

  // Tests pour B40-P4: Edition des notes côté Admin
  describe('Note Editing (B40-P4)', () => {
    const mockSaleDetail = {
      id: 'sale-1',
      cash_session_id: 'test-session-id',
      total_amount: 25.0,
      donation: 5.0,
      payment_method: 'cash',
      created_at: '2025-01-27T11:00:00Z',
      operator_id: 'operator-id',
      note: 'Vente avec don pour association locale',
      items: []
    }

    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        currentUser: { id: 'admin-id', role: 'admin' },
      })

      vi.mocked(require('../../../services/salesService').getSaleDetail).mockResolvedValue(mockSaleDetail)
      vi.mocked(require('../../../services/categoriesService').getCategories).mockResolvedValue([])
      vi.mocked(require('../../../services/usersService').getUsers).mockResolvedValue([])
      vi.mocked(require('../../../services/presetService').presetService.getPresets).mockResolvedValue([])
    })

    it('should display note field in ticket modal', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionData,
      })

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument()
      })

      // Vérifier que la note est affichée
      expect(screen.getByText('Note:')).toBeInTheDocument()
      expect(screen.getByText('Vente avec don pour association locale')).toBeInTheDocument()
    })

    it('should show edit button for admin users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionData,
      })

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Modifier la note')).toBeInTheDocument()
      })
    })

    it('should hide edit button for non-admin users', async () => {
      mockUseAuthStore.mockReturnValue({
        currentUser: { id: 'user-id', role: 'user' },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionData,
      })

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument()
      })

      // Vérifier que le bouton d'édition n'est pas présent
      expect(screen.queryByText('Modifier la note')).not.toBeInTheDocument()
    })

    it('should enter edit mode when edit button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionData,
      })

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Modifier la note')).toBeInTheDocument()
      })

      // Cliquer sur modifier
      const editButton = screen.getByText('Modifier la note')
      await user.click(editButton)

      // Vérifier que le mode édition est activé
      expect(screen.getByDisplayValue('Vente avec don pour association locale')).toBeInTheDocument()
      expect(screen.getByText('Sauvegarder')).toBeInTheDocument()
      expect(screen.getByText('Annuler')).toBeInTheDocument()
    })

    it('should save note changes successfully', async () => {
      const updatedSale = { ...mockSaleDetail, note: 'Note mise à jour' }
      vi.mocked(require('../../../services/salesService').updateSaleNote).mockResolvedValue(updatedSale)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionData,
      })

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Modifier la note')).toBeInTheDocument()
      })

      // Entrer en mode édition
      const editButton = screen.getByText('Modifier la note')
      await user.click(editButton)

      // Modifier la note
      const textarea = screen.getByDisplayValue('Vente avec don pour association locale')
      await user.clear(textarea)
      await user.type(textarea, 'Note mise à jour')

      // Sauvegarder
      const saveButton = screen.getByText('Sauvegarder')
      await user.click(saveButton)

      // Vérifier que l'API a été appelée
      expect(vi.mocked(require('../../../services/salesService').updateSaleNote)).toHaveBeenCalledWith('sale-1', 'Note mise à jour')

      // Vérifier que la note mise à jour est affichée
      await waitFor(() => {
        expect(screen.getByText('Note mise à jour')).toBeInTheDocument()
      })
    })

    it('should cancel note editing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionData,
      })

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Modifier la note')).toBeInTheDocument()
      })

      // Entrer en mode édition
      const editButton = screen.getByText('Modifier la note')
      await user.click(editButton)

      // Modifier la note
      const textarea = screen.getByDisplayValue('Vente avec don pour association locale')
      await user.clear(textarea)
      await user.type(textarea, 'Note modifiée')

      // Annuler
      const cancelButton = screen.getByText('Annuler')
      await user.click(cancelButton)

      // Vérifier que la note originale est toujours affichée
      expect(screen.getByText('Vente avec don pour association locale')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('Note modifiée')).not.toBeInTheDocument()
    })

    it('should display "Aucune note" when note is null', async () => {
      const saleWithoutNote = { ...mockSaleDetail, note: null }
      vi.mocked(require('../../../services/salesService').getSaleDetail).mockResolvedValue(saleWithoutNote)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionData,
      })

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Aucune note')).toBeInTheDocument()
      })
    })
  })

  // Tests B52-P2: édition du poids des items de vente dans le ticket
  describe('Weight Editing (B52-P2)', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        currentUser: { id: 'admin-id', role: 'admin' },
      })

      const mockSaleDetail = {
        id: 'sale-1',
        cash_session_id: 'test-session-id',
        total_amount: 25.0,
        donation: 0,
        payment_method: 'cash',
        created_at: '2025-01-27T11:00:00Z',
        operator_id: 'operator-id',
        note: null,
        items: [
          {
            id: 'item-1',
            sale_id: 'sale-1',
            category: 'EEE-1',
            quantity: 1,
            weight: 1.5,
            unit_price: 10.0,
            total_price: 10.0,
            preset_id: null,
            notes: null,
          },
        ],
      }

      vi.mocked(require('../../../services/salesService').getSaleDetail).mockResolvedValue(
        mockSaleDetail,
      )
      vi.mocked(require('../../../services/categoriesService').getCategories).mockResolvedValue([])
      vi.mocked(require('../../../services/usersService').getUsers).mockResolvedValue([])
      vi.mocked(
        require('../../../services/presetService').presetService.getPresets,
      ).mockResolvedValue([])
    })

    it('should show weight edit action for admin and call API on save', async () => {
      const mockUpdatedSale = {
        id: 'sale-1',
        cash_session_id: 'test-session-id',
        total_amount: 25.0,
        donation: 0,
        payment_method: 'cash',
        created_at: '2025-01-27T11:00:00Z',
        operator_id: 'operator-id',
        note: null,
        items: [
          {
            id: 'item-1',
            sale_id: 'sale-1',
            category: 'EEE-1',
            quantity: 1,
            weight: 2.75,
            unit_price: 10.0,
            total_price: 10.0,
            preset_id: null,
            notes: null,
          },
        ],
      }

      const mockGetSaleDetail = vi.mocked(
        require('../../../services/salesService').getSaleDetail,
      )
      // Première fois: détails initiaux, deuxième fois: détails après update
      mockGetSaleDetail
        .mockResolvedValueOnce(mockUpdatedSale) // utilisé lors de l'ouverture du ticket
        .mockResolvedValueOnce(mockUpdatedSale) // utilisé après sauvegarde

      const mockUpdateWeight = vi.mocked(
        require('../../../services/salesService').updateSaleItemWeight,
      )
      mockUpdateWeight.mockResolvedValue({
        id: 'item-1',
        sale_id: 'sale-1',
        category: 'EEE-1',
        quantity: 1,
        weight: 2.75,
        unit_price: 10.0,
        total_price: 10.0,
        preset_id: null,
        notes: null,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionData,
      })

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(
          screen.getByText('Journal des Ventes (2 ventes)'),
        ).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument()
      })

      // Vérifier que le bouton "Modifier poids" est présent
      const editButtons = screen.getAllByText('Modifier poids')
      expect(editButtons.length).toBeGreaterThan(0)

      // Cliquer sur "Modifier poids"
      await user.click(editButtons[0])

      // Modifier la valeur du poids
      const input = screen.getByDisplayValue('1.5')
      await user.clear(input)
      await user.type(input, '2.75')

      // Cliquer sur ✓ pour sauvegarder
      const saveButton = screen.getByText('✓')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateWeight).toHaveBeenCalledWith('sale-1', 'item-1', 2.75)
      })
    })
  })

  // Story B40-P4: Tests for notes functionality
  describe('Notes Column and Functionality', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSessionData),
      })

      mockUseAuthStore.mockReturnValue({
        currentUser: { id: 'admin-user', role: 'admin' },
      })
    })

    it('should display Notes column in session list', async () => {
      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Vérifier que la colonne Notes est présente
      expect(screen.getByText('Notes')).toBeInTheDocument()
    })

    it('should show note preview in session list', async () => {
      const sessionWithNotes = {
        ...mockSessionData,
        sales: [
          {
            ...mockSessionData.sales[0],
            note: 'Test note for sale'
          },
          mockSessionData.sales[1]
        ]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sessionWithNotes),
      })

      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Vérifier que la note est affichée dans la colonne
      expect(screen.getByText('Test note for sale')).toBeInTheDocument()
    })

    it('should show dash when no note in session list', async () => {
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Vérifier qu'un tiret est affiché pour les ventes sans note
      const dashes = screen.getAllByText('-')
      expect(dashes.length).toBeGreaterThan(0)
    })

    it('should always show note section in ticket popup', async () => {
      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket (sans note)
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument()
      })

      // Vérifier que la section Note est toujours affichée
      expect(screen.getByText('Note:')).toBeInTheDocument()
      expect(screen.getByText('Aucune note')).toBeInTheDocument()
    })

    it('should show note section when sale has note', async () => {
      // Mock d'une vente avec note
      const mockSaleWithNote = {
        id: 'sale-1',
        cash_session_id: 'session-1',
        total_amount: 25.0,
        donation: 5.0,
        payment_method: 'cash',
        created_at: '2025-01-27T11:00:00Z',
        operator_id: 'operator-1',
        operator_name: 'John Doe',
        note: 'This is a test note',
        items: []
      }

      const mockGetSaleDetail = vi.mocked(require('../../../services/salesService').getSaleDetail)
      mockGetSaleDetail.mockResolvedValue(mockSaleWithNote)

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument()
      })

      // Vérifier que la section Note est affichée avec le contenu
      expect(screen.getByText('Note:')).toBeInTheDocument()
      expect(screen.getByText('This is a test note')).toBeInTheDocument()
    })

    it('should show edit button only for admin users', async () => {
      const mockSaleWithNote = {
        id: 'sale-1',
        cash_session_id: 'session-1',
        total_amount: 25.0,
        donation: 5.0,
        payment_method: 'cash',
        created_at: '2025-01-27T11:00:00Z',
        operator_id: 'operator-1',
        operator_name: 'John Doe',
        note: 'This is a test note',
        items: []
      }

      const mockGetSaleDetail = vi.mocked(require('../../../services/salesService').getSaleDetail)
      mockGetSaleDetail.mockResolvedValue(mockSaleWithNote)

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument()
      })

      // Vérifier que le bouton "Modifier la note" est visible pour admin
      expect(screen.getByText('Modifier la note')).toBeInTheDocument()
    })

    it('should show "Ajouter une note" button when no note exists', async () => {
      const mockSaleWithoutNote = {
        id: 'sale-1',
        cash_session_id: 'session-1',
        total_amount: 25.0,
        donation: 5.0,
        payment_method: 'cash',
        created_at: '2025-01-27T11:00:00Z',
        operator_id: 'operator-1',
        operator_name: 'John Doe',
        note: null, // Pas de note
        items: []
      }

      const mockGetSaleDetail = vi.mocked(require('../../../services/salesService').getSaleDetail)
      mockGetSaleDetail.mockResolvedValue(mockSaleWithoutNote)

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument()
      })

      // Vérifier que le bouton "Ajouter une note" est visible
      expect(screen.getByText('Ajouter une note')).toBeInTheDocument()
      expect(screen.getByText('Aucune note')).toBeInTheDocument()
    })

    it('should hide edit button for non-admin users', async () => {
      mockUseAuthStore.mockReturnValue({
        currentUser: { id: 'user-user', role: 'user' },
      })

      const mockSaleWithNote = {
        id: 'sale-1',
        cash_session_id: 'session-1',
        total_amount: 25.0,
        donation: 5.0,
        payment_method: 'cash',
        created_at: '2025-01-27T11:00:00Z',
        operator_id: 'operator-1',
        operator_name: 'John Doe',
        note: 'This is a test note',
        items: []
      }

      const mockGetSaleDetail = vi.mocked(require('../../../services/salesService').getSaleDetail)
      mockGetSaleDetail.mockResolvedValue(mockSaleWithNote)

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument()
      })

      // Vérifier que les boutons d'édition ne sont pas visibles pour user
      expect(screen.queryByText('Modifier la note')).not.toBeInTheDocument()
      expect(screen.queryByText('Ajouter une note')).not.toBeInTheDocument()
    })

    it('should log audit information when updating existing note', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const mockSaleWithNote = {
        id: 'sale-1',
        cash_session_id: 'session-1',
        total_amount: 25.0,
        donation: 5.0,
        payment_method: 'cash',
        created_at: '2025-01-27T11:00:00Z',
        operator_id: 'operator-1',
        operator_name: 'John Doe',
        note: 'Original note',
        items: []
      }

      const mockGetSaleDetail = vi.mocked(require('../../../services/salesService').getSaleDetail)
      mockGetSaleDetail.mockResolvedValue(mockSaleWithNote)

      const mockUpdateSaleNote = vi.mocked(require('../../../services/salesService').updateSaleNote)
      mockUpdateSaleNote.mockResolvedValue({
        ...mockSaleWithNote,
        note: 'Updated note'
      })

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument()
      })

      // Cliquer sur "Modifier la note"
      const editButton = screen.getByText('Modifier la note')
      await user.click(editButton)

      // Modifier la note
      const textarea = screen.getByDisplayValue('Original note')
      await user.clear(textarea)
      await user.type(textarea, 'Updated note')

      // Sauvegarder
      const saveButton = screen.getByText('Sauvegarder')
      await user.click(saveButton)

      // Vérifier que l'audit log a été appelé avec action 'update'
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('[AUDIT] Note modification', {
          userId: 'admin-user',
          userRole: 'admin',
          saleId: 'sale-1',
          timestamp: expect.any(String),
          oldNote: 'Original note',
          newNote: 'Updated note',
          action: 'update'
        })
      })

      consoleSpy.mockRestore()
    })

    it('should log audit information when creating new note', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const mockSaleWithoutNote = {
        id: 'sale-1',
        cash_session_id: 'session-1',
        total_amount: 25.0,
        donation: 5.0,
        payment_method: 'cash',
        created_at: '2025-01-27T11:00:00Z',
        operator_id: 'operator-1',
        operator_name: 'John Doe',
        note: null, // Pas de note initiale
        items: []
      }

      const mockGetSaleDetail = vi.mocked(require('../../../services/salesService').getSaleDetail)
      mockGetSaleDetail.mockResolvedValue(mockSaleWithoutNote)

      const mockUpdateSaleNote = vi.mocked(require('../../../services/salesService').updateSaleNote)
      mockUpdateSaleNote.mockResolvedValue({
        ...mockSaleWithoutNote,
        note: 'New note added'
      })

      const user = userEvent.setup()
      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Journal des Ventes (2 ventes)')).toBeInTheDocument()
      })

      // Ouvrir la modal du ticket
      const viewTicketButton = screen.getAllByText('Voir le ticket')[0]
      await user.click(viewTicketButton)

      await waitFor(() => {
        expect(screen.getByText('Ticket de Caisse')).toBeInTheDocument()
      })

      // Cliquer sur "Ajouter une note"
      const editButton = screen.getByText('Ajouter une note')
      await user.click(editButton)

      // Ajouter une note
      const textarea = screen.getByDisplayValue('')
      await user.type(textarea, 'New note added')

      // Sauvegarder
      const saveButton = screen.getByText('Sauvegarder')
      await user.click(saveButton)

      // Vérifier que l'audit log a été appelé avec action 'create'
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('[AUDIT] Note modification', {
          userId: 'admin-user',
          userRole: 'admin',
          saleId: 'sale-1',
          timestamp: expect.any(String),
          oldNote: '',
          newNote: 'New note added',
          action: 'create'
        })
      })

      consoleSpy.mockRestore()
    })

    it('should show return to cash register button when session is open', async () => {
      const sessionDataWithOpenStatus = {
        ...mockSessionData,
        status: 'open'
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sessionDataWithOpenStatus),
      })

      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Retour à la caisse')).toBeInTheDocument()
      })

      // Vérifier que c'est un bouton (pas un span)
      const returnButton = screen.getByText('Retour à la caisse')
      expect(returnButton.tagName).toBe('BUTTON')
    })

    it('should show closed status badge when session is closed', async () => {
      const sessionDataWithClosedStatus = {
        ...mockSessionData,
        status: 'closed'
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sessionDataWithClosedStatus),
      })

      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Fermée')).toBeInTheDocument()
      })

      // Vérifier que c'est un span (pas un bouton)
      const statusElement = screen.getByText('Fermée')
      expect(statusElement.tagName).toBe('SPAN')
    })

    it('should navigate to cash register when return button is clicked', async () => {
      const sessionDataWithOpenStatus = {
        ...mockSessionData,
        status: 'open',
        id: 'session-123'
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sessionDataWithOpenStatus),
      })

      const { userEvent } = await import('@testing-library/user-event')
      const user = userEvent.setup()

      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Retour à la caisse')).toBeInTheDocument()
      })

      const returnButton = screen.getByText('Retour à la caisse')
      await user.click(returnButton)

      expect(mockNavigate).toHaveBeenCalledWith('/cash-register/sale')
    })

    it('should not show return button when session is closed', async () => {
      const sessionDataWithClosedStatus = {
        ...mockSessionData,
        status: 'closed',
        id: 'session-123'
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sessionDataWithClosedStatus),
      })

      renderWithRouter(<CashSessionDetail />)

      await waitFor(() => {
        expect(screen.getByText('Fermée')).toBeInTheDocument()
      })

      // Vérifier que le bouton de retour n'est pas affiché
      expect(screen.queryByText('Retour à la caisse')).not.toBeInTheDocument()
    })
  })
})
