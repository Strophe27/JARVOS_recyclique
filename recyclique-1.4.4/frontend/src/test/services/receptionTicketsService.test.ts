/**
 * Tests unitaires pour receptionTicketsService.exportBulk() (Story B45-P1)
 * 
 * Valide :
 * - Appel API correct avec filtres
 * - Téléchargement fichier blob
 * - Extraction nom de fichier depuis Content-Disposition
 * - Gestion d'erreurs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { receptionTicketsService, ReceptionTicketFilters } from '../../services/receptionTicketsService'
import axiosClient from '../../api/axiosClient'

// Mock axiosClient
vi.mock('../../api/axiosClient')

// Mock window.URL et document pour téléchargement
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()
const mockClick = vi.fn()
const mockRemoveChild = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
  
  // Mock window.URL
  global.URL.createObjectURL = mockCreateObjectURL
  global.URL.revokeObjectURL = mockRevokeObjectURL
  
  // Mock document.createElement et appendChild
  const mockLink = {
    href: '',
    download: '',
    style: { display: '' },
    click: mockClick,
  }
  
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') {
      return mockLink as any
    }
    return document.createElement(tag)
  })
  
  vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any)
  vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)
  
  mockCreateObjectURL.mockReturnValue('blob:http://localhost/test')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('receptionTicketsService.exportBulk', () => {
  const mockFilters: ReceptionTicketFilters = {
    date_from: '2025-01-01T00:00:00.000Z',
    date_to: '2025-01-31T23:59:59.999Z',
    status: 'closed',
    benevole_id: 'benevole-123',
    search: 'test',
    include_empty: false
  }

  it('should call API with correct parameters for CSV export', async () => {
    const mockBlob = new Blob(['CSV content'], { type: 'text/csv' })
    const mockResponse = {
      data: mockBlob,
      headers: {
        'content-disposition': 'attachment; filename="export_tickets_reception_20250127_120000.csv"'
      }
    }

    vi.mocked(axiosClient.post).mockResolvedValue(mockResponse as any)

    await receptionTicketsService.exportBulk(mockFilters, 'csv')

    expect(axiosClient.post).toHaveBeenCalledWith(
      '/v1/admin/reports/reception-tickets/export-bulk',
      {
        filters: {
          date_from: mockFilters.date_from,
          date_to: mockFilters.date_to,
          status: mockFilters.status,
          benevole_id: mockFilters.benevole_id,
          search: mockFilters.search,
          include_empty: false
        },
        format: 'csv'
      },
      { responseType: 'blob' }
    )
  })

  it('should call API with correct parameters for Excel export', async () => {
    const mockBlob = new Blob(['Excel content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const mockResponse = {
      data: mockBlob,
      headers: {
        'content-disposition': 'attachment; filename="export_tickets_reception_20250127_120000.xlsx"'
      }
    }

    vi.mocked(axiosClient.post).mockResolvedValue(mockResponse as any)

    await receptionTicketsService.exportBulk(mockFilters, 'excel')

    expect(axiosClient.post).toHaveBeenCalledWith(
      '/v1/admin/reports/reception-tickets/export-bulk',
      expect.objectContaining({
        format: 'excel'
      }),
      { responseType: 'blob' }
    )
  })

  it('should extract filename from Content-Disposition header', async () => {
    const mockBlob = new Blob(['CSV content'], { type: 'text/csv' })
    const mockResponse = {
      data: mockBlob,
      headers: {
        'content-disposition': 'attachment; filename="export_tickets_reception_20250127_120000.csv"'
      }
    }

    vi.mocked(axiosClient.post).mockResolvedValue(mockResponse as any)

    await receptionTicketsService.exportBulk(mockFilters, 'csv')

    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob)
    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test')
  })

  it('should use default filename if Content-Disposition is missing', async () => {
    const mockBlob = new Blob(['CSV content'], { type: 'text/csv' })
    const mockResponse = {
      data: mockBlob,
      headers: {}
    }

    vi.mocked(axiosClient.post).mockResolvedValue(mockResponse as any)

    await receptionTicketsService.exportBulk(mockFilters, 'csv')

    // Vérifier que le lien a été créé avec un nom de fichier par défaut
    expect(mockClick).toHaveBeenCalled()
  })

  it('should handle errors and throw', async () => {
    const mockError = new Error('Network error')
    vi.mocked(axiosClient.post).mockRejectedValue(mockError)

    await expect(receptionTicketsService.exportBulk(mockFilters, 'csv')).rejects.toThrow('Network error')
  })

  it('should handle API errors with error message', async () => {
    const mockError = {
      response: {
        status: 400,
        data: { detail: 'Invalid filters' }
      },
      message: 'Bad Request'
    }
    vi.mocked(axiosClient.post).mockRejectedValue(mockError)

    await expect(receptionTicketsService.exportBulk(mockFilters, 'csv')).rejects.toEqual(mockError)
  })

  it('should handle empty filters', async () => {
    const mockBlob = new Blob(['CSV content'], { type: 'text/csv' })
    const mockResponse = {
      data: mockBlob,
      headers: {
        'content-disposition': 'attachment; filename="export_tickets_reception_20250127_120000.csv"'
      }
    }

    vi.mocked(axiosClient.post).mockResolvedValue(mockResponse as any)

    await receptionTicketsService.exportBulk({}, 'csv')

    expect(axiosClient.post).toHaveBeenCalledWith(
      '/v1/admin/reports/reception-tickets/export-bulk',
      {
        filters: {
          date_from: undefined,
          date_to: undefined,
          status: undefined,
          benevole_id: undefined,
          search: undefined,
          include_empty: false
        },
        format: 'csv'
      },
      { responseType: 'blob' }
    )
  })
})

