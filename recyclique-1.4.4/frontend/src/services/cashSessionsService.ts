import axiosClient from '../api/axiosClient'

export interface CashSessionListItem {
  id: string
  operator_id: string
  site_id: string
  register_id?: string
  initial_amount: number
  current_amount: number
  status: 'open' | 'closed'
  opened_at: string
  closed_at?: string
  total_sales?: number
  total_items?: number
  number_of_sales?: number
  total_donations?: number
  closing_amount?: number
  actual_amount?: number
  variance?: number
  variance_comment?: string
}

export interface CashSessionListResponse {
  data: CashSessionListItem[]
  total: number
  skip: number
  limit: number
}

export interface CashSessionKPIs {
  total_sessions: number
  open_sessions: number
  closed_sessions: number
  total_sales: number
  total_items: number
  number_of_sales: number
  total_donations: number
  total_weight_sold: number
  average_session_duration?: number | null
}

export interface CashSessionFilters {
  skip?: number
  limit?: number
  status?: 'open' | 'closed'
  operator_id?: string
  site_id?: string
  date_from?: string
  date_to?: string
  search?: string
  include_empty?: boolean
  // B45-P2: Filtres avancés
  amount_min?: number
  amount_max?: number
  variance_threshold?: number
  variance_has_variance?: boolean
  duration_min_hours?: number
  duration_max_hours?: number
  payment_methods?: string[]
  has_donation?: boolean
}

export const cashSessionsService = {
  async getKPIs(params: Partial<Pick<CashSessionFilters, 'date_from' | 'date_to' | 'site_id'>> = {}): Promise<CashSessionKPIs> {
    const response = await axiosClient.get('/v1/cash-sessions/stats/summary', { params })
    return response.data
  },

  async list(params: CashSessionFilters = {}): Promise<CashSessionListResponse> {
    // B45-P2: Sérialiser les paramètres manuellement pour gérer correctement les tableaux
    // FastAPI attend "payment_methods=value1&payment_methods=value2" (sans crochets)
    // alors qu'axios sérialise par défaut "payment_methods[]=value1&payment_methods[]=value2"
    const serializedParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      
      if (Array.isArray(value)) {
        // Pour les tableaux, ajouter chaque valeur avec la même clé (sans crochets)
        value.forEach(v => serializedParams.append(key, String(v)))
      } else if (typeof value === 'boolean') {
        serializedParams.append(key, value ? 'true' : 'false')
      } else {
        serializedParams.append(key, String(value))
      }
    })
    
    const response = await axiosClient.get(`/v1/cash-sessions/?${serializedParams.toString()}`)
    return response.data
  },

  /**
   * Exporte toutes les sessions filtrées en format CSV ou Excel.
   * @param filters Filtres à appliquer pour l'export
   * @param format Format d'export: 'csv' ou 'excel'
   * @returns Promise qui se résout quand le téléchargement est déclenché
   */
  async exportBulk(filters: CashSessionFilters, format: 'csv' | 'excel'): Promise<void> {
    try {
      // Construire l'objet filters en excluant les valeurs undefined
      const filtersPayload: any = {
        include_empty: filters.include_empty ?? false
      }
      
      if (filters.date_from) {
        filtersPayload.date_from = filters.date_from
      }
      if (filters.date_to) {
        filtersPayload.date_to = filters.date_to
      }
      if (filters.status) {
        filtersPayload.status = filters.status
      }
      if (filters.operator_id) {
        filtersPayload.operator_id = filters.operator_id
      }
      if (filters.site_id) {
        filtersPayload.site_id = filters.site_id
      }
      if (filters.search) {
        filtersPayload.search = filters.search
      }
      
      const response = await axiosClient.post(
        '/v1/admin/reports/cash-sessions/export-bulk',
        {
          filters: filtersPayload,
          format
        },
        { responseType: 'blob' }
      )

      // Créer un blob et déclencher le téléchargement
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Extraire le nom de fichier depuis le header Content-Disposition
      const contentDisposition = response.headers['content-disposition']
      let filename = `export_sessions_caisse_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Erreur lors de l\'export bulk:', error)
      throw error
    }
  },
}

export interface CashSessionReportEntry {
  filename: string
  size_bytes: number
  modified_at: string
  download_url: string
}

export const cashSessionReportHelper = {
  async findReportForSession(sessionId: string): Promise<CashSessionReportEntry | null> {
    try {
      const res = await axiosClient.get('/v1/admin/reports/cash-sessions')
      const list: { reports: CashSessionReportEntry[] } = res.data
      const match = list.reports.find(r => r.filename.includes(sessionId))
      return match || null
    } catch (e) {
      return null
    }
  },

  async downloadReport(downloadUrl: string): Promise<Blob> {
    const res = await axiosClient.get(downloadUrl, { responseType: 'blob' })
    return res.data as Blob
  }
}

/**
 * B45-P2: Fonctions d'encodage/décodage des filtres dans l'URL
 */
export const cashSessionFiltersUrl = {
  /**
   * Encode les filtres dans l'URL (query params)
   */
  encode(filters: CashSessionFilters): string {
    const params = new URLSearchParams()
    
    // Filtres de base
    if (filters.skip !== undefined) params.set('skip', String(filters.skip))
    if (filters.limit !== undefined) params.set('limit', String(filters.limit))
    if (filters.status) params.set('status', filters.status)
    if (filters.operator_id) params.set('operator_id', filters.operator_id)
    if (filters.site_id) params.set('site_id', filters.site_id)
    if (filters.date_from) params.set('date_from', filters.date_from)
    if (filters.date_to) params.set('date_to', filters.date_to)
    if (filters.search) params.set('search', filters.search)
    if (filters.include_empty) params.set('include_empty', 'true')
    
    // Filtres avancés
    if (filters.amount_min !== undefined) params.set('amount_min', String(filters.amount_min))
    if (filters.amount_max !== undefined) params.set('amount_max', String(filters.amount_max))
    if (filters.variance_threshold !== undefined) params.set('variance_threshold', String(filters.variance_threshold))
    if (filters.variance_has_variance !== undefined) params.set('variance_has_variance', String(filters.variance_has_variance))
    if (filters.duration_min_hours !== undefined) params.set('duration_min_hours', String(filters.duration_min_hours))
    if (filters.duration_max_hours !== undefined) params.set('duration_max_hours', String(filters.duration_max_hours))
    if (filters.payment_methods && filters.payment_methods.length > 0) {
      filters.payment_methods.forEach(method => params.append('payment_methods[]', method))
    }
    if (filters.has_donation !== undefined) params.set('has_donation', String(filters.has_donation))
    
    return params.toString()
  },

  /**
   * Décode les filtres depuis l'URL (query params)
   */
  decode(searchParams: URLSearchParams): CashSessionFilters {
    const filters: CashSessionFilters = {}
    
    // Filtres de base
    const skip = searchParams.get('skip')
    if (skip) filters.skip = parseInt(skip, 10)
    
    const limit = searchParams.get('limit')
    if (limit) filters.limit = parseInt(limit, 10)
    
    const status = searchParams.get('status')
    if (status && (status === 'open' || status === 'closed')) {
      filters.status = status
    }
    
    const operatorId = searchParams.get('operator_id')
    if (operatorId) filters.operator_id = operatorId
    
    const siteId = searchParams.get('site_id')
    if (siteId) filters.site_id = siteId
    
    const dateFrom = searchParams.get('date_from')
    if (dateFrom) filters.date_from = dateFrom
    
    const dateTo = searchParams.get('date_to')
    if (dateTo) filters.date_to = dateTo
    
    const search = searchParams.get('search')
    if (search) filters.search = search
    
    const includeEmpty = searchParams.get('include_empty')
    if (includeEmpty === 'true') filters.include_empty = true
    
    // Filtres avancés
    const amountMin = searchParams.get('amount_min')
    if (amountMin) filters.amount_min = parseFloat(amountMin)
    
    const amountMax = searchParams.get('amount_max')
    if (amountMax) filters.amount_max = parseFloat(amountMax)
    
    const varianceThreshold = searchParams.get('variance_threshold')
    if (varianceThreshold) filters.variance_threshold = parseFloat(varianceThreshold)
    
    const varianceHasVariance = searchParams.get('variance_has_variance')
    if (varianceHasVariance === 'true') filters.variance_has_variance = true
    else if (varianceHasVariance === 'false') filters.variance_has_variance = false
    
    const durationMinHours = searchParams.get('duration_min_hours')
    if (durationMinHours) filters.duration_min_hours = parseFloat(durationMinHours)
    
    const durationMaxHours = searchParams.get('duration_max_hours')
    if (durationMaxHours) filters.duration_max_hours = parseFloat(durationMaxHours)
    
    const paymentMethods = searchParams.getAll('payment_methods[]')
    if (paymentMethods.length > 0) filters.payment_methods = paymentMethods
    
    const hasDonation = searchParams.get('has_donation')
    if (hasDonation === 'true') filters.has_donation = true
    else if (hasDonation === 'false') filters.has_donation = false
    
    return filters
  }
}


