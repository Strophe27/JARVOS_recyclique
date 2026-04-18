import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import ReceptionTicketDetail from '../../../pages/Admin/ReceptionTicketDetail'
import { receptionTicketsService } from '../../../services/receptionTicketsService'

// Mock des services
vi.mock('../../../services/receptionTicketsService', () => ({
  receptionTicketsService: {
    getDetail: vi.fn(),
    exportCSV: vi.fn(),
  }
}))

vi.mock('../../../services/receptionService', () => ({
  receptionService: {
    updateLineWeight: vi.fn(),
  },
}))

const mockUseAuthStore = vi.fn()
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: mockUseAuthStore,
}))

// Mock de react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'ticket-1' }),
  }
})

describe('ReceptionTicketDetail', () => {
  const mockTicket = {
    id: 'ticket-1',
    poste_id: 'poste-1',
    benevole_username: 'benevole1',
    created_at: '2025-01-27T10:00:00Z',
    closed_at: '2025-01-27T11:00:00Z',
    status: 'closed',
    lignes: [
      {
        id: 'ligne-1',
        ticket_id: 'ticket-1',
        category_id: 'cat-1',
        category_label: 'EEE-3 Informatique',
        poids_kg: 5.5,
        destination: 'vente',
        notes: 'Ordinateur portable'
      },
      {
        id: 'ligne-2',
        ticket_id: 'ticket-1',
        category_id: 'cat-2',
        category_label: 'EEE-4 Gros électroménager',
        poids_kg: 12.3,
        destination: 'recyclage',
        notes: 'Réfrigérateur'
      }
    ]
  }

  beforeEach(() => {
    vi.resetAllMocks()
    mockNavigate.mockClear()
    mockUseAuthStore.mockReturnValue({
      currentUser: { id: 'admin-id', role: 'admin' },
    })
    vi.mocked(receptionTicketsService.getDetail).mockResolvedValue(mockTicket)
  })

  it('renders ticket information', async () => {
    render(
      <MemoryRouter>
        <ReceptionTicketDetail />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Détail du Ticket de Réception')).toBeInTheDocument()
      expect(screen.getByText('benevole1')).toBeInTheDocument()
      expect(screen.getByText('Fermé')).toBeInTheDocument()
    })
  })

  it('displays ticket details in info cards', async () => {
    render(
      <MemoryRouter>
        <ReceptionTicketDetail />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Bénévole')).toBeInTheDocument()
      expect(screen.getByText('Date création')).toBeInTheDocument()
      expect(screen.getByText('Date fermeture')).toBeInTheDocument()
      expect(screen.getByText('Statut')).toBeInTheDocument()
      expect(screen.getByText('Poids total')).toBeInTheDocument()
      expect(screen.getByText('Nombre de lignes')).toBeInTheDocument()
    })
  })

  it('calculates and displays total weight correctly', async () => {
    render(
      <MemoryRouter>
        <ReceptionTicketDetail />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      // Total poids = 5.5 + 12.3 = 17.8 kg
      expect(screen.getByText(/17,80.*kg/)).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // nombre de lignes
    })
  })

  it('displays lignes table with correct columns', async () => {
    render(
      <MemoryRouter>
        <ReceptionTicketDetail />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Catégorie')).toBeInTheDocument()
      expect(screen.getByText('Poids (kg)')).toBeInTheDocument()
      expect(screen.getByText('Destination')).toBeInTheDocument()
      expect(screen.getByText('Notes')).toBeInTheDocument()
    })
  })

  it('displays all lignes in table', async () => {
    render(
      <MemoryRouter>
        <ReceptionTicketDetail />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('EEE-3 Informatique')).toBeInTheDocument()
      expect(screen.getByText('EEE-4 Gros électroménager')).toBeInTheDocument()
      expect(screen.getByText('Ordinateur portable')).toBeInTheDocument()
      expect(screen.getByText('Réfrigérateur')).toBeInTheDocument()
    })
  })

  it('navigates back when clicking back button', async () => {
    render(
      <MemoryRouter>
        <ReceptionTicketDetail />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      const backButton = screen.getByText('Retour')
      fireEvent.click(backButton)
      expect(mockNavigate).toHaveBeenCalledWith('/admin/reception-sessions')
    })
  })

  it('exports CSV when clicking export button', async () => {
    const mockBlob = new Blob(['csv content'], { type: 'text/csv' })
    vi.mocked(receptionTicketsService.exportCSV).mockResolvedValue(mockBlob)
    
    // Mock URL.createObjectURL et document.createElement
    global.URL.createObjectURL = vi.fn(() => 'blob:url')
    global.URL.revokeObjectURL = vi.fn()
    
    const mockClick = vi.fn()
    const mockAnchor = {
      click: mockClick,
      href: '',
      download: '',
    } as any
    
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)

    render(
      <MemoryRouter>
        <ReceptionTicketDetail />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      const exportButton = screen.getByText('Télécharger CSV')
      fireEvent.click(exportButton)
    })
    
    await waitFor(() => {
      expect(receptionTicketsService.exportCSV).toHaveBeenCalledWith('ticket-1')
    })
  })

  it('displays empty state when ticket has no lignes', async () => {
    const ticketWithoutLignes = {
      ...mockTicket,
      lignes: []
    }
    
    vi.mocked(receptionTicketsService.getDetail).mockResolvedValue(ticketWithoutLignes)

    render(
      <MemoryRouter>
        <ReceptionTicketDetail />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/Aucune ligne de dépôt enregistrée/)).toBeInTheDocument()
    })
  })

  it('handles error state correctly', async () => {
    vi.mocked(receptionTicketsService.getDetail).mockRejectedValue(new Error('Ticket not found'))

    render(
      <MemoryRouter>
        <ReceptionTicketDetail />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Erreur')).toBeInTheDocument()
      expect(screen.getByText(/Ticket not found/)).toBeInTheDocument()
    })
  })

  it('displays loading state initially', () => {
    vi.mocked(receptionTicketsService.getDetail).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(
      <MemoryRouter>
        <ReceptionTicketDetail />
      </MemoryRouter>
    )
    
    expect(screen.getByText(/Chargement des détails du ticket/)).toBeInTheDocument()
  })

  // B52-P2: édition du poids des lignes de réception (admin uniquement)
  it('shows weight edit action for admin and calls API on save', async () => {
    const { receptionService } = require('../../../services/receptionService')
    const mockUpdate = vi.mocked(receptionService.updateLineWeight)
    mockUpdate.mockResolvedValue({
      ...mockTicket.lignes[0],
      poids_kg: 7.25,
      weight: 7.25,
    })

    render(
      <MemoryRouter>
        <ReceptionTicketDetail />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByText('Lignes de Dépôt (2 lignes)'),
      ).toBeInTheDocument()
    })

    // Bouton "Modifier poids" doit être visible pour admin
    const editButtons = screen.getAllByText('Modifier poids')
    expect(editButtons.length).toBeGreaterThan(0)

    // Entrer en mode édition pour la première ligne
    fireEvent.click(editButtons[0])

    const input = screen.getByDisplayValue('5.5')
    fireEvent.change(input, { target: { value: '7.25' } })

    const saveButton = screen.getByText('✓')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('ticket-1', 'ligne-1', 7.25)
    })
  })
})














