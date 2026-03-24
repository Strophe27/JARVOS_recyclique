import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import SessionManager from '../../pages/Admin/SessionManager'
import { cashSessionsService } from '../../services/cashSessionsService'

// Mock du service
vi.mock('../../services/cashSessionsService', () => ({
  cashSessionsService: {
    getStats: vi.fn(),
    list: vi.fn(),
    exportBulk: vi.fn(),
  }
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

// Mock axiosClient pour les autres appels
vi.mock('../../api/axiosClient', () => {
  return {
    default: {
      get: vi.fn((url: string) => {
        if (url.includes('/v1/cash-sessions/stats/summary')) {
          return Promise.resolve({ data: {
            total_sessions: 1,
            open_sessions: 0,
            closed_sessions: 1,
            total_sales: 100,
            total_items: 3,
            number_of_sales: 2,
            total_donations: 5,
            total_weight_sold: 1.5,
            average_session_duration: 2
          } })
        }
        if (url.includes('/v1/cash-sessions/')) {
          return Promise.resolve({ data: { data: [], total: 0, skip: 0, limit: 20 } })
        }
        if (url.includes('/v1/admin/reports/cash-sessions')) {
          return Promise.resolve({ data: { reports: [] } })
        }
        return Promise.resolve({ data: [] })
      })
    }
  }
})

describe('SessionManager', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockNavigate.mockClear()
    
    // Mock par défaut pour getStats
    vi.mocked(cashSessionsService.getStats).mockResolvedValue({
      total_sessions: 1,
      open_sessions: 0,
      closed_sessions: 1,
      total_sales: 100,
      total_items: 3,
      number_of_sales: 2,
      total_donations: 5,
      total_weight_sold: 1.5,
      average_session_duration: 2
    })
    
    // Mock par défaut pour list
    vi.mocked(cashSessionsService.list).mockResolvedValue({
      sessions: [],
      total: 0,
      page: 1,
      per_page: 20,
      total_pages: 0
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders KPI cards', async () => {
    render(
      <MemoryRouter>
        <SessionManager />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText("Chiffre d'Affaires Total")).toBeInTheDocument()
      expect(screen.getByText('Nombre de Ventes')).toBeInTheDocument()
      expect(screen.getByText('Poids Total Vendu')).toBeInTheDocument()
      expect(screen.getByText('Total des Dons')).toBeInTheDocument()
      expect(screen.getByText('Nombre de Sessions')).toBeInTheDocument()
    })
  })

  it('renders export button when sessions exist', async () => {
    vi.mocked(cashSessionsService.list).mockResolvedValue({
      sessions: [
        {
          id: 'session-1',
          operator_id: 'operator-1',
          site_id: 'site-1',
          status: 'closed',
          created_at: '2025-01-27T10:00:00Z',
          closed_at: '2025-01-27T11:00:00Z',
          total_sales: 100,
          total_items: 5
        }
      ],
      total: 1,
      page: 1,
      per_page: 20,
      total_pages: 1
    })

    render(
      <MemoryRouter>
        <SessionManager />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Exporter tout')).toBeInTheDocument()
    })
  })

  it('disables export button when no sessions', async () => {
    render(
      <MemoryRouter>
        <SessionManager />
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
    vi.mocked(cashSessionsService.list).mockResolvedValue({
      sessions: [
        {
          id: 'session-1',
          operator_id: 'operator-1',
          site_id: 'site-1',
          status: 'closed',
          created_at: '2025-01-27T10:00:00Z',
          closed_at: '2025-01-27T11:00:00Z',
          total_sales: 100,
          total_items: 5
        }
      ],
      total: 1,
      page: 1,
      per_page: 20,
      total_pages: 1
    })

    render(
      <MemoryRouter>
        <SessionManager />
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
    vi.mocked(cashSessionsService.list).mockResolvedValue({
      sessions: [
        {
          id: 'session-1',
          operator_id: 'operator-1',
          site_id: 'site-1',
          status: 'closed',
          created_at: '2025-01-27T10:00:00Z',
          closed_at: '2025-01-27T11:00:00Z',
          total_sales: 100,
          total_items: 5
        }
      ],
      total: 1,
      page: 1,
      per_page: 20,
      total_pages: 1
    })

    vi.mocked(cashSessionsService.exportBulk).mockResolvedValue()

    // Mock window.URL et document pour téléchargement
    global.URL.createObjectURL = vi.fn(() => 'blob:url')
    global.URL.revokeObjectURL = vi.fn()

    render(
      <MemoryRouter>
        <SessionManager />
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
      expect(cashSessionsService.exportBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: undefined,
          date_to: undefined,
          status: undefined,
          operator_id: undefined,
          site_id: undefined,
          search: undefined,
          include_empty: false
        }),
        'csv'
      )
    })
  })

  it('calls exportBulk with Excel format when clicking Excel option', async () => {
    vi.mocked(cashSessionsService.list).mockResolvedValue({
      sessions: [
        {
          id: 'session-1',
          operator_id: 'operator-1',
          site_id: 'site-1',
          status: 'closed',
          created_at: '2025-01-27T10:00:00Z',
          closed_at: '2025-01-27T11:00:00Z',
          total_sales: 100,
          total_items: 5
        }
      ],
      total: 1,
      page: 1,
      per_page: 20,
      total_pages: 1
    })

    vi.mocked(cashSessionsService.exportBulk).mockResolvedValue()

    // Mock window.URL et document pour téléchargement
    global.URL.createObjectURL = vi.fn(() => 'blob:url')
    global.URL.revokeObjectURL = vi.fn()

    render(
      <MemoryRouter>
        <SessionManager />
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
      expect(cashSessionsService.exportBulk).toHaveBeenCalledWith(
        expect.any(Object),
        'excel'
      )
    })
  })

  it('shows loading state during export', async () => {
    vi.mocked(cashSessionsService.list).mockResolvedValue({
      sessions: [
        {
          id: 'session-1',
          operator_id: 'operator-1',
          site_id: 'site-1',
          status: 'closed',
          created_at: '2025-01-27T10:00:00Z',
          closed_at: '2025-01-27T11:00:00Z',
          total_sales: 100,
          total_items: 5
        }
      ],
      total: 1,
      page: 1,
      per_page: 20,
      total_pages: 1
    })

    // Mock exportBulk pour être lent
    vi.mocked(cashSessionsService.exportBulk).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(
      <MemoryRouter>
        <SessionManager />
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
    vi.mocked(cashSessionsService.list).mockResolvedValue({
      sessions: [
        {
          id: 'session-1',
          operator_id: 'operator-1',
          site_id: 'site-1',
          status: 'closed',
          created_at: '2025-01-27T10:00:00Z',
          closed_at: '2025-01-27T11:00:00Z',
          total_sales: 100,
          total_items: 5
        }
      ],
      total: 1,
      page: 1,
      per_page: 20,
      total_pages: 1
    })

    const mockError = new Error('Export failed')
    vi.mocked(cashSessionsService.exportBulk).mockRejectedValue(mockError)

    // Mock window.alert
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <SessionManager />
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


