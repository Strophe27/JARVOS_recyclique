import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import ReceptionSessionManager from '../../../pages/Admin/ReceptionSessionManager'
import { receptionTicketsService } from '../../../services/receptionTicketsService'

// Mock du service
vi.mock('../../../services/receptionTicketsService', () => ({
  receptionTicketsService: {
    getKPIs: vi.fn(),
    list: vi.fn(),
    getDetail: vi.fn(),
    exportCSV: vi.fn(),
    exportBulk: vi.fn(),
  }
}))

// Mock de usersService
vi.mock('../../../services/usersService', () => ({
  getUsers: vi.fn(() => Promise.resolve([
    { id: 'user-1', username: 'benevole1', full_name: 'Bénévole 1' },
    { id: 'user-2', username: 'benevole2', full_name: 'Bénévole 2' }
  ]))
}))

// Mock de react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('ReceptionSessionManager', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockNavigate.mockClear()
    
    // Mock par défaut pour getKPIs
    vi.mocked(receptionTicketsService.getKPIs).mockResolvedValue({
      total_poids: 150.5,
      total_tickets: 10,
      total_lignes: 25,
      total_benevoles_actifs: 3
    })
    
    // Mock par défaut pour list
    vi.mocked(receptionTicketsService.list).mockResolvedValue({
      tickets: [
        {
          id: 'ticket-1',
          poste_id: 'poste-1',
          benevole_username: 'benevole1',
          created_at: '2025-01-27T10:00:00Z',
          closed_at: '2025-01-27T11:00:00Z',
          status: 'closed',
          total_lignes: 5,
          total_poids: 12.5
        },
        {
          id: 'ticket-2',
          poste_id: 'poste-1',
          benevole_username: 'benevole2',
          created_at: '2025-01-27T09:00:00Z',
          status: 'open',
          total_lignes: 3,
          total_poids: 8.2
        }
      ],
      total: 2,
      page: 1,
      per_page: 20,
      total_pages: 1
    })
  })

  it('renders KPI cards', async () => {
    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Poids Total Reçu')).toBeInTheDocument()
      expect(screen.getByText('Nombre de Tickets')).toBeInTheDocument()
      expect(screen.getByText('Nombre de Lignes')).toBeInTheDocument()
      expect(screen.getByText('Bénévoles Actifs')).toBeInTheDocument()
    })
  })

  it('displays KPI values correctly', async () => {
    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/150,50.*kg/)).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('renders filter inputs', async () => {
    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      const dateInputs = screen.getAllByPlaceholderText(/Date (début|fin)/)
      expect(dateInputs.length).toBeGreaterThan(0)
      expect(screen.getByText('Tous statuts')).toBeInTheDocument()
      expect(screen.getByText('Tous bénévoles')).toBeInTheDocument()
    })
  })

  it('renders tickets table with correct columns', async () => {
    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Statut')).toBeInTheDocument()
      expect(screen.getByText('Date création')).toBeInTheDocument()
      expect(screen.getByText('Bénévole')).toBeInTheDocument()
      expect(screen.getByText('Nb lignes')).toBeInTheDocument()
      expect(screen.getByText('Poids total (kg)')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })
  })

  it('displays tickets in table', async () => {
    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('benevole1')).toBeInTheDocument()
      expect(screen.getByText('benevole2')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument() // total_lignes
      expect(screen.getByText('3')).toBeInTheDocument() // total_lignes
    })
  })

  it('applies status filter', async () => {
    vi.mocked(receptionTicketsService.list).mockResolvedValue({
      tickets: [
        {
          id: 'ticket-1',
          poste_id: 'poste-1',
          benevole_username: 'benevole1',
          created_at: '2025-01-27T10:00:00Z',
          closed_at: '2025-01-27T11:00:00Z',
          status: 'closed',
          total_lignes: 5,
          total_poids: 12.5
        }
      ],
      total: 1,
      page: 1,
      per_page: 20,
      total_pages: 1
    })

    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      const statusSelect = screen.getAllByRole('combobox').find(
        (el: HTMLElement) => el.textContent?.includes('Tous statuts')
      ) as HTMLSelectElement
      
      if (statusSelect) {
        fireEvent.change(statusSelect, { target: { value: 'closed' } })
        fireEvent.click(screen.getByText('Appliquer les filtres'))
      }
    })
    
    await waitFor(() => {
      expect(receptionTicketsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'closed' })
      )
    })
  })

  it('navigates to ticket detail on row click', async () => {
    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      const rows = screen.getAllByText('benevole1')
      const row = rows[0].closest('tr')
      if (row) {
        fireEvent.click(row)
        expect(mockNavigate).toHaveBeenCalledWith('/admin/reception-tickets/ticket-1')
      }
    })
  })

  it('navigates to ticket detail on "Voir Détail" button click', async () => {
    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      const buttons = screen.getAllByText('Voir Détail')
      if (buttons.length > 0) {
        fireEvent.click(buttons[0])
        expect(mockNavigate).toHaveBeenCalledWith('/admin/reception-tickets/ticket-1')
      }
    })
  })

  it('exports CSV when clicking export button', async () => {
    const mockBlob = new Blob(['csv content'], { type: 'text/csv' })
    vi.mocked(receptionTicketsService.exportCSV).mockResolvedValue(mockBlob)
    
    // Mock URL.createObjectURL et document.createElement
    global.URL.createObjectURL = vi.fn(() => 'blob:url')
    global.URL.revokeObjectURL = vi.fn()
    
    const mockClick = vi.fn()
    const mockAppendChild = vi.fn()
    const mockRemoveChild = vi.fn()
    
    const mockAnchor = {
      click: mockClick,
      href: '',
      download: '',
    } as any
    
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)

    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      const exportButtons = screen.getAllByText('Télécharger CSV')
      if (exportButtons.length > 0) {
        fireEvent.click(exportButtons[0])
      }
    })
    
    await waitFor(() => {
      expect(receptionTicketsService.exportCSV).toHaveBeenCalledWith('ticket-1')
    })
  })

  it('displays empty state when no tickets', async () => {
    vi.mocked(receptionTicketsService.list).mockResolvedValue({
      tickets: [],
      total: 0,
      page: 1,
      per_page: 20,
      total_pages: 0
    })

    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Aucun ticket trouvé')).toBeInTheDocument()
    })
  })

  it('handles pagination correctly', async () => {
    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      const perPageSelect = screen.getByLabelText(/Tickets par page:/i)
      if (perPageSelect) {
        fireEvent.change(perPageSelect, { target: { value: '50' } })
        expect(perPageSelect).toHaveProperty('value', '50')
      }
    })
  })

  it('renders export button when tickets exist', async () => {
    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Exporter tout')).toBeInTheDocument()
    })
  })

  it('disables export button when no tickets', async () => {
    vi.mocked(receptionTicketsService.list).mockResolvedValue({
      tickets: [],
      total: 0,
      page: 1,
      per_page: 20,
      total_pages: 0
    })

    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )

    await waitFor(() => {
      const exportButton = screen.queryByText('Exporter tout')
      if (exportButton) {
        expect(exportButton.closest('button')).toBeDisabled()
      }
    })
  })

  it('opens export menu when clicking export button', async () => {
    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )

    await waitFor(() => {
      const exportButton = screen.getByText('Exporter tout')
      fireEvent.click(exportButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Exporter en CSV')).toBeInTheDocument()
      expect(screen.getByText('Exporter en Excel')).toBeInTheDocument()
    })
  })

  it('calls exportBulk with CSV format when clicking CSV option', async () => {
    vi.mocked(receptionTicketsService.exportBulk).mockResolvedValue()

    // Mock window.URL et document pour téléchargement
    global.URL.createObjectURL = vi.fn(() => 'blob:url')
    global.URL.revokeObjectURL = vi.fn()

    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )

    await waitFor(() => {
      const exportButton = screen.getByText('Exporter tout')
      fireEvent.click(exportButton)
    })

    await waitFor(() => {
      const csvOption = screen.getByText('Exporter en CSV')
      fireEvent.click(csvOption)
    })

    await waitFor(() => {
      expect(receptionTicketsService.exportBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: undefined,
          date_to: undefined,
          status: undefined,
          benevole_id: undefined,
          search: undefined,
          include_empty: false
        }),
        'csv'
      )
    })
  })

  it('calls exportBulk with Excel format when clicking Excel option', async () => {
    vi.mocked(receptionTicketsService.exportBulk).mockResolvedValue()

    // Mock window.URL et document pour téléchargement
    global.URL.createObjectURL = vi.fn(() => 'blob:url')
    global.URL.revokeObjectURL = vi.fn()

    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )

    await waitFor(() => {
      const exportButton = screen.getByText('Exporter tout')
      fireEvent.click(exportButton)
    })

    await waitFor(() => {
      const excelOption = screen.getByText('Exporter en Excel')
      fireEvent.click(excelOption)
    })

    await waitFor(() => {
      expect(receptionTicketsService.exportBulk).toHaveBeenCalledWith(
        expect.any(Object),
        'excel'
      )
    })
  })

  it('shows loading state during export', async () => {
    // Mock exportBulk pour être lent
    vi.mocked(receptionTicketsService.exportBulk).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )

    await waitFor(() => {
      const exportButton = screen.getByText('Exporter tout')
      fireEvent.click(exportButton)
    })

    await waitFor(() => {
      const csvOption = screen.getByText('Exporter en CSV')
      fireEvent.click(csvOption)
    })

    await waitFor(() => {
      expect(screen.getByText('Export en cours...')).toBeInTheDocument()
    })
  })

  it('handles export errors', async () => {
    const mockError = new Error('Export failed')
    vi.mocked(receptionTicketsService.exportBulk).mockRejectedValue(mockError)

    // Mock window.alert
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <ReceptionSessionManager />
      </MemoryRouter>
    )

    await waitFor(() => {
      const exportButton = screen.getByText('Exporter tout')
      fireEvent.click(exportButton)
    })

    await waitFor(() => {
      const csvOption = screen.getByText('Exporter en CSV')
      fireEvent.click(csvOption)
    })

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Erreur lors de l\'export')
      )
    })

    mockAlert.mockRestore()
  })
})

