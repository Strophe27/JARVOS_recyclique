import axiosClient from '../api/axiosClient'

export interface ReceptionTicketListItem {
  id: string
  poste_id: string
  benevole_username: string
  created_at: string
  closed_at?: string
  status: 'open' | 'closed'
  total_lignes: number
  total_poids: number
  // B48-P6: Répartition des poids par flux
  poids_entree: number
  poids_direct: number
  poids_sortie: number
}

export interface ReceptionTicketListResponse {
  tickets: ReceptionTicketListItem[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ReceptionTicketKPIs {
  total_poids: number
  total_tickets: number
  total_lignes: number
  total_benevoles_actifs: number
}

export interface ReceptionTicketFilters {
  page?: number
  per_page?: number
  status?: 'open' | 'closed'
  benevole_id?: string
  site_id?: string
  date_from?: string
  date_to?: string
  search?: string
  include_empty?: boolean
  // B45-P2: Filtres avancés
  poids_min?: number
  poids_max?: number
  categories?: string[]
  destinations?: string[]
  lignes_min?: number
  lignes_max?: number
}

export interface LigneResponse {
  id: string
  ticket_id: string
  category_id: string
  category_label: string
  poids_kg: number
  destination?: string
  notes?: string
  is_exit?: boolean
}

export interface ReceptionTicketDetail {
  id: string
  poste_id: string
  benevole_username: string
  created_at: string
  closed_at?: string
  status: 'open' | 'closed'
  lignes: LigneResponse[]
}

export const receptionTicketsService = {
  async getKPIs(params: Partial<Pick<ReceptionTicketFilters, 'date_from' | 'date_to' | 'benevole_id' | 'site_id'>> = {}): Promise<ReceptionTicketKPIs> {
    // Pour l'instant, calculer côté client depuis les tickets filtrés
    // TODO: Créer endpoint backend /v1/reception/tickets/stats/summary si nécessaire
    // Charger tous les tickets par lots de 100 (limite max du backend)
    let allTickets: ReceptionTicketListItem[] = []
    let page = 1
    const perPage = 100 // Limite maximale du backend
    let hasMore = true
    
    while (hasMore) {
      const listRes = await this.list({ ...params, page, per_page: perPage, include_empty: true })
      const batch = listRes?.tickets || []
      
      if (batch.length === 0) {
        hasMore = false
      } else {
        allTickets = [...allTickets, ...batch]
        page += 1
        
        // Si on a reçu moins que la limite, on a tout chargé
        if (batch.length < perPage) {
          hasMore = false
        }
        
        // Sécurité : ne pas charger plus de 1000 tickets (10 lots)
        if (allTickets.length >= 1000) {
          hasMore = false
        }
      }
    }
    
    // Filtrer les tickets vides pour les KPIs (exclure ceux avec 0 lignes)
    const filteredTickets = allTickets.filter(t => t.total_lignes > 0)
    
    const totalPoids = filteredTickets.reduce((sum, t) => {
      const poids = typeof t.total_poids === 'number' ? t.total_poids : parseFloat(String(t.total_poids)) || 0
      return sum + poids
    }, 0)
    const totalTickets = filteredTickets.length
    const totalLignes = filteredTickets.reduce((sum, t) => {
      const lignes = typeof t.total_lignes === 'number' ? t.total_lignes : parseInt(String(t.total_lignes), 10) || 0
      return sum + lignes
    }, 0)
    const benevolesUniques = new Set(filteredTickets.map(t => t.benevole_username)).size
    
    return {
      total_poids: totalPoids,
      total_tickets: totalTickets,
      total_lignes: totalLignes,
      total_benevoles_actifs: benevolesUniques
    }
  },

  async list(params: ReceptionTicketFilters = {}): Promise<ReceptionTicketListResponse> {
    // B45-P2: Sérialiser les paramètres manuellement pour gérer correctement les tableaux
    // FastAPI attend "destinations=value1&destinations=value2" (sans crochets)
    // alors qu'axios sérialise par défaut "destinations[]=value1&destinations[]=value2"
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
    
    const response = await axiosClient.get(`/v1/reception/tickets?${serializedParams.toString()}`)
    return response.data
  },

  async getDetail(id: string): Promise<ReceptionTicketDetail> {
    const response = await axiosClient.get(`/v1/reception/tickets/${id}`)
    return response.data
  },

  /**
   * Génère un token de téléchargement et lance le téléchargement direct via un lien `<a>`.
   * Cette approche garantit que le navigateur effectue une requête HTTP classique et respecte
   * le header Content-Disposition renvoyé par l'API.
   */
  async exportCSV(id: string): Promise<void> {
    try {
      const response = await axiosClient.post(`/v1/reception/tickets/${id}/download-token`)
      const { download_url } = response.data as { download_url: string }

      // Créer un lien temporaire et déclencher un clic (compatible pop-up blockers)
      const link = document.createElement('a')
      link.href = download_url
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error: any) {
      console.error('Erreur lors de l\'export CSV:', error)
      throw error
    }
  },

  /**
   * Exporte tous les tickets filtrés en format CSV ou Excel.
   * @param filters Filtres à appliquer pour l'export
   * @param format Format d'export: 'csv' ou 'excel'
   * @returns Promise qui se résout quand le téléchargement est déclenché
   */
  async exportBulk(filters: ReceptionTicketFilters, format: 'csv' | 'excel'): Promise<void> {
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
      if (filters.benevole_id) {
        filtersPayload.benevole_id = filters.benevole_id
      }
      if (filters.search) {
        filtersPayload.search = filters.search
      }
      
      // B50-P2: Log pour debug
      console.log('Export bulk payload:', JSON.stringify({ filters: filtersPayload, format }, null, 2))
      
      const response = await axiosClient.post(
        '/v1/admin/reports/reception-tickets/export-bulk',
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
      let filename = `export_tickets_reception_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`
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
  }
}

/**
 * B45-P2: Fonctions d'encodage/décodage des filtres dans l'URL
 */
export const receptionTicketFiltersUrl = {
  /**
   * Encode les filtres dans l'URL (query params)
   */
  encode(filters: ReceptionTicketFilters): string {
    const params = new URLSearchParams()
    
    // Filtres de base
    if (filters.page !== undefined) params.set('page', String(filters.page))
    if (filters.per_page !== undefined) params.set('per_page', String(filters.per_page))
    if (filters.status) params.set('status', filters.status)
    if (filters.benevole_id) params.set('benevole_id', filters.benevole_id)
    if (filters.site_id) params.set('site_id', filters.site_id)
    if (filters.date_from) params.set('date_from', filters.date_from)
    if (filters.date_to) params.set('date_to', filters.date_to)
    if (filters.search) params.set('search', filters.search)
    if (filters.include_empty) params.set('include_empty', 'true')
    
    // Filtres avancés
    if (filters.poids_min !== undefined) params.set('poids_min', String(filters.poids_min))
    if (filters.poids_max !== undefined) params.set('poids_max', String(filters.poids_max))
    if (filters.categories && filters.categories.length > 0) {
      filters.categories.forEach(cat => params.append('categories[]', cat))
    }
    if (filters.destinations && filters.destinations.length > 0) {
      filters.destinations.forEach(dest => params.append('destinations[]', dest))
    }
    if (filters.lignes_min !== undefined) params.set('lignes_min', String(filters.lignes_min))
    if (filters.lignes_max !== undefined) params.set('lignes_max', String(filters.lignes_max))
    
    return params.toString()
  },

  /**
   * Décode les filtres depuis l'URL (query params)
   */
  decode(searchParams: URLSearchParams): ReceptionTicketFilters {
    const filters: ReceptionTicketFilters = {}
    
    // Filtres de base
    const page = searchParams.get('page')
    if (page) filters.page = parseInt(page, 10)
    
    const perPage = searchParams.get('per_page')
    if (perPage) filters.per_page = parseInt(perPage, 10)
    
    const status = searchParams.get('status')
    if (status && (status === 'open' || status === 'closed')) {
      filters.status = status
    }
    
    const benevoleId = searchParams.get('benevole_id')
    if (benevoleId) filters.benevole_id = benevoleId
    
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
    const poidsMin = searchParams.get('poids_min')
    if (poidsMin) filters.poids_min = parseFloat(poidsMin)
    
    const poidsMax = searchParams.get('poids_max')
    if (poidsMax) filters.poids_max = parseFloat(poidsMax)
    
    const categories = searchParams.getAll('categories[]')
    if (categories.length > 0) filters.categories = categories
    
    const destinations = searchParams.getAll('destinations[]')
    if (destinations.length > 0) filters.destinations = destinations
    
    const lignesMin = searchParams.get('lignes_min')
    if (lignesMin) filters.lignes_min = parseInt(lignesMin, 10)
    
    const lignesMax = searchParams.get('lignes_max')
    if (lignesMax) filters.lignes_max = parseInt(lignesMax, 10)
    
    return filters
  }
}

