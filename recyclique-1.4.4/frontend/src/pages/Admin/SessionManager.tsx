import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import styled from 'styled-components'
import { Calendar, Users, Scale, ShoppingCart, Euro, Search, ChevronUp, ChevronDown, ChevronsUpDown, Download, FileSpreadsheet, FileText, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cashSessionsService, CashSessionFilters, CashSessionKPIs, CashSessionListItem, cashSessionFiltersUrl } from '../../services/cashSessionsService'
import { UsersApi, SitesApi } from '../../generated/api'
import axiosClient from '../../api/axiosClient'
import { getUsers, User } from '../../services/usersService'
import { useSearchParams } from 'react-router-dom'
import { AdvancedFiltersAccordion, FiltersGridContainer, FilterInput, FilterMultiSelect, FilterToggle } from '../../components/Admin/AdvancedFiltersAccordion'

type SortField = 'opened_at' | 'operator_id' | 'status' | 'total_sales' | 'number_of_sales' | 'total_donations' | 'variance'
type SortDirection = 'asc' | 'desc' | null

const Container = styled.div`
  padding: 24px;
`

const TitleBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`

const Title = styled.h1`
  margin: 0;
  font-size: 1.8rem;
  color: #1f2937;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
`

const Button = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: ${p => p.$variant === 'ghost' ? '1px solid #e5e7eb' : 'none'};
  background: ${p => p.$variant === 'ghost' ? '#fff' : '#111827'};
  color: ${p => p.$variant === 'ghost' ? '#111827' : '#fff'};
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ExportButton = styled(Button)`
  position: relative;
`

const DropdownMenu = styled.div<{ $open: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: ${p => p.$open ? 'block' : 'none'};
  min-width: 180px;
  overflow: hidden;
`

const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: #fff;
  color: #111827;
  cursor: pointer;
  font-size: 0.9rem;
  text-align: left;
  
  &:hover {
    background: #f3f4f6;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const FiltersBar = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr)) 1fr;
  gap: 12px;
  margin-bottom: 16px;
`

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
`

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #fff;
`

const KPICards = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(180px, 1fr));
  gap: 12px;
  margin: 12px 0 20px 0;
`

const Card = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
`

const CardIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #f3f4f6;
  color: #111827;
`

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
`

const CardLabel = styled.div`
  font-size: 0.8rem;
  color: #6b7280;
`

const CardValue = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
`

const Th = styled.th<{ $sortable?: boolean }>`
  text-align: left;
  padding: 12px;
  background: #f9fafb;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: #4b5563;
  border-bottom: 1px solid #e5e7eb;
  cursor: ${p => p.$sortable ? 'pointer' : 'default'};
  user-select: none;
  position: relative;
  
  &:hover {
    background: ${p => p.$sortable ? '#f3f4f6' : '#f9fafb'};
  }
`

const SortIcon = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  vertical-align: middle;
`

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.95rem;
  color: #1f2937;
`

const StatusDot = styled.span<{ variant: 'open' | 'closed' }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  margin-right: 8px;
  background: ${p => p.variant === 'open' ? '#16a34a' : '#ef4444'};
`

const ActionsCell = styled.div`
  display: flex;
  gap: 8px;
`

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`

const PaginationInfo = styled.div`
  font-size: 0.9rem;
  color: #6b7280;
`

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const PageButton = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: ${p => p.$active ? '#111827' : '#fff'};
  color: ${p => p.$active ? '#fff' : '#111827'};
  cursor: pointer;
  font-size: 0.9rem;
  
  &:hover:not(:disabled) {
    background: ${p => p.$active ? '#111827' : '#f3f4f6'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

function formatCurrency(value: number): string {
  return (value ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

const SessionManager: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<CashSessionFilters>(() => {
    // B45-P2: Charger les filtres depuis l'URL au montage
    const urlFilters = cashSessionFiltersUrl.decode(searchParams)
    return { limit: 20, skip: 0, ...urlFilters }
  })
  const [kpis, setKpis] = useState<CashSessionKPIs | null>(null)
  const [allSessions, setAllSessions] = useState<CashSessionListItem[]>([]) // Toutes les sessions chargées
  const [rows, setRows] = useState<CashSessionListItem[]>([]) // Sessions paginées à afficher
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [operators, setOperators] = useState<{ id: string, label: string }[]>([])
  const [sites, setSites] = useState<{ id: string, name: string }[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [sortField, setSortField] = useState<SortField>('opened_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Fonction pour récupérer le nom de l'utilisateur
  const getUserName = useCallback((userId: string): string => {
    const user = users.find(u => u.id === userId)
    return user ? (user.full_name || user.first_name || user.username || userId) : userId
  }, [users])

  const load = useCallback(async (currentFilters: CashSessionFilters = filters) => {
    setLoading(true)
    setError(null)
    try {
      // Formater les dates pour l'API (ISO 8601)
      const formattedFilters: CashSessionFilters = {
        ...currentFilters,
        date_from: currentFilters.date_from ? `${currentFilters.date_from}T00:00:00.000Z` : undefined,
        date_to: currentFilters.date_to ? `${currentFilters.date_to}T23:59:59.999Z` : undefined,
      }
      
      // Charger les KPIs
      const kpiRes = await cashSessionsService.getKPIs({ 
        date_from: formattedFilters.date_from, 
        date_to: formattedFilters.date_to, 
        site_id: formattedFilters.site_id 
      })
      setKpis(kpiRes)
      
      // Charger TOUTES les sessions par lots de 100 (limite max du backend)
      // pour pouvoir trier sur l'ensemble
      let allSessions: CashSessionListItem[] = []
      let skip = 0
      const limit = 100 // Limite maximale du backend
      let hasMore = true
      
      while (hasMore) {
        const fetchFilters: CashSessionFilters = {
          ...formattedFilters,
          limit,
          skip
        }
        
        const listRes = await cashSessionsService.list(fetchFilters)
        const batch = Array.isArray(listRes?.data) ? listRes.data : Array.isArray(listRes) ? listRes : []
        
        if (batch.length === 0) {
          hasMore = false
        } else {
          allSessions = [...allSessions, ...batch]
          skip += limit
          
          // Si on a reçu moins que la limite, on a tout chargé
          if (batch.length < limit) {
            hasMore = false
          }
          
          // Sécurité : ne pas charger plus de 1000 sessions (10 lots)
          if (allSessions.length >= 1000) {
            hasMore = false
          }
        }
      }
      
      // Tri côté client sur TOUTES les sessions chargées
      if (sortField && sortDirection) {
        allSessions = [...allSessions].sort((a, b) => {
          let aVal: any = a[sortField]
          let bVal: any = b[sortField]
          
          // Gestion spéciale pour les dates
          if (sortField === 'opened_at') {
            aVal = new Date(aVal).getTime()
            bVal = new Date(bVal).getTime()
          }
          
          // Gestion spéciale pour operator_id (tri par nom)
          if (sortField === 'operator_id') {
            const aName = getUserName(a.operator_id).toLowerCase()
            const bName = getUserName(b.operator_id).toLowerCase()
            if (aName < bName) return sortDirection === 'asc' ? -1 : 1
            if (aName > bName) return sortDirection === 'asc' ? 1 : -1
            return 0
          }
          
          // Tri numérique pour les nombres
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
          }
          
          // Tri string
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortDirection === 'asc' 
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal)
          }
          
          // Fallback
          if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
          if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
          return 0
        })
      }
      
      // Stocker toutes les sessions triées
      setAllSessions(allSessions)
      setTotal(allSessions.length)
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du chargement des sessions')
    } finally {
      setLoading(false)
    }
  }, [filters, sortField, sortDirection, getUserName])
  
  // Pagination côté client sur les sessions triées
  useEffect(() => {
    if (allSessions.length === 0) {
      setRows([])
      return
    }
    
    const startIndex = filters.skip || 0
    const limit = filters.limit || 20
    const endIndex = startIndex + limit
    
    const paginatedSessions = allSessions.slice(startIndex, endIndex)
    setRows(paginatedSessions)
  }, [allSessions, filters.skip, filters.limit])

  useEffect(() => {
    ;(async () => {
      try {
        const [ops, sts, usersData] = await Promise.all([
          UsersApi.activeoperatorsapiv1usersactiveoperatorsget().catch(() => []),
          SitesApi.sitesapiv1sitesget().catch(() => []),
          getUsers().catch(() => [])
        ])
        const opsOpts = (ops as any[]).map((u) => ({ id: String(u.id), label: u.username || u.full_name || u.telegram_id || String(u.id) }))
        const siteOpts = (sts as any[]).map((s) => ({ id: String(s.id), name: s.name || String(s.id) }))
        setOperators(opsOpts)
        setSites(siteOpts)
        setUsers(usersData)
      } catch {}
    })()
  }, [])

  // Charger les données initiales au montage
  useEffect(() => {
    load(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // B45-P2: Synchroniser les filtres avec l'URL
  useEffect(() => {
    const queryString = cashSessionFiltersUrl.encode(filters)
    const newSearchParams = new URLSearchParams(queryString)
    setSearchParams(newSearchParams, { replace: true })
  }, [filters, setSearchParams])

  // Recharger quand les filtres ou le tri changent (mais pas au montage initial)
  // Note: skip et limit ne déclenchent pas de rechargement car la pagination est côté client
  useEffect(() => {
    const timer = setTimeout(() => {
      load(filters)
    }, 100)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.status, filters.operator_id, filters.site_id, filters.search, 
    filters.date_from, filters.date_to, 
    // B45-P2: Filtres avancés - utiliser JSON.stringify pour comparer les tableaux
    filters.amount_min, filters.amount_max, filters.variance_threshold, 
    filters.variance_has_variance, filters.duration_min_hours, filters.duration_max_hours,
    JSON.stringify(filters.payment_methods || []),
    filters.has_donation,
    sortField, sortDirection
  ])

  const onFilterChange = (patch: Partial<CashSessionFilters>) => {
    const next = { ...filters, ...patch, skip: 0 } // Reset pagination when filters change
    setFilters(next)
  }

  const onApplyFilters = () => {
    // Reset pagination et recharger avec les nouveaux filtres
    const next = { ...filters, skip: 0 }
    setFilters(next)
    // Le useEffect se chargera du rechargement automatiquement
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle: desc -> asc -> null -> desc
      if (sortDirection === 'desc') {
        setSortDirection('asc')
      } else if (sortDirection === 'asc') {
        setSortDirection(null)
        setSortField('opened_at') // Reset to default
        setSortDirection('desc')
      }
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    // Reset pagination à la première page lors du tri
    setFilters(prev => ({ ...prev, skip: 0 }))
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />
    }
    if (sortDirection === 'asc') {
      return <ChevronUp size={14} />
    }
    if (sortDirection === 'desc') {
      return <ChevronDown size={14} />
    }
    return <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />
  }

  const currentPage = Math.floor((filters.skip || 0) / (filters.limit || 20)) + 1
  const totalPages = Math.max(1, Math.ceil((total || 0) / (filters.limit || 20)))
  
  const handlePageChange = (newPage: number) => {
    const newSkip = (newPage - 1) * (filters.limit || 20)
    setFilters({ ...filters, skip: newSkip })
  }

  // Fermer le menu d'export si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [exportMenuOpen])

  const handleExport = async (format: 'csv' | 'excel') => {
    setExportMenuOpen(false)
    setExporting(true)
    try {
      // Préparer les filtres pour l'export (sans pagination)
      // Formater les dates pour l'API (ISO 8601 avec heure)
      const exportFilters: CashSessionFilters = {
        date_from: filters.date_from ? `${filters.date_from}T00:00:00.000Z` : undefined,
        date_to: filters.date_to ? `${filters.date_to}T23:59:59.999Z` : undefined,
        status: filters.status,
        operator_id: filters.operator_id,
        site_id: filters.site_id,
        search: filters.search,
        include_empty: filters.include_empty
      }
      
      await cashSessionsService.exportBulk(exportFilters, format)
    } catch (error: any) {
      console.error('Erreur lors de l\'export:', error)
      let errorMessage = error.message || 'Erreur inconnue'
      
      if (error.response?.data) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text()
            try {
              const json = JSON.parse(text)
              errorMessage = json.detail || text
            } catch {
              errorMessage = text
            }
          } catch (e) {
            console.error('Erreur lecture blob:', e)
          }
        } else {
          errorMessage = error.response.data.detail || JSON.stringify(error.response.data)
        }
      }
      
      alert(`Erreur lors de l'export: ${errorMessage}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Container>
      <TitleBar>
        <Title>Gestionnaire de Sessions de Caisse</Title>
      </TitleBar>

      <FiltersBar>
        <Input 
          type="date" 
          value={filters.date_from || ''} 
          onChange={e => onFilterChange({ date_from: e.target.value })} 
          placeholder="Date début"
          title="Laisser vide pour voir toutes les sessions (y compris les saisies différées)"
        />
        <Input 
          type="date" 
          value={filters.date_to || ''} 
          onChange={e => onFilterChange({ date_to: e.target.value })} 
          placeholder="Date fin"
          title="Laisser vide pour voir toutes les sessions (y compris les saisies différées)"
        />
        <Select value={filters.status || ''} onChange={e => onFilterChange({ status: (e.target.value || undefined) as any })}>
          <option value="">Tous statuts</option>
          <option value="open">Ouvertes</option>
          <option value="closed">Fermées</option>
        </Select>
        <Select value={filters.operator_id || ''} onChange={e => onFilterChange({ operator_id: e.target.value || undefined })}>
          <option value="">Tous opérateurs</option>
          {operators.map(op => (
            <option key={op.id} value={op.id}>{op.label}</option>
          ))}
        </Select>
      </FiltersBar>

      <FiltersBar>
        <Select value={filters.site_id || ''} onChange={e => onFilterChange({ site_id: e.target.value || undefined })}>
          <option value="">Tous sites</option>
          {sites.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={16} />
          <Input placeholder="Recherche (opérateur ou ID session)" value={filters.search || ''} onChange={e => onFilterChange({ search: e.target.value || undefined })} onKeyDown={e => e.key === 'Enter' && onApplyFilters()} />
        </div>
        <Button onClick={onApplyFilters} $variant="primary">Appliquer les filtres</Button>
        <Button onClick={() => navigate('/admin/quick-analysis')} $variant="ghost">
          <BarChart3 size={16} />
          Analyse Rapide
        </Button>
        <Toolbar ref={exportMenuRef}>
          <ExportButton 
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            disabled={exporting || total === 0}
            $variant="primary"
          >
            <Download size={16} />
            {exporting ? 'Export en cours...' : 'Exporter (CSV / Excel)'}
          </ExportButton>
          <DropdownMenu $open={exportMenuOpen}>
            <DropdownItem onClick={() => handleExport('csv')} disabled={exporting}>
              <FileText size={16} />
              Exporter en CSV
            </DropdownItem>
            <DropdownItem onClick={() => handleExport('excel')} disabled={exporting}>
              <FileSpreadsheet size={16} />
              Exporter en Excel
            </DropdownItem>
          </DropdownMenu>
        </Toolbar>
        <div />
      </FiltersBar>

      {/* B45-P2: Filtres avancés */}
      <AdvancedFiltersAccordion title="Filtres Avancés">
        <FiltersGridContainer>
          <FilterInput
            label="Montant minimum (€)"
            type="number"
            value={filters.amount_min}
            onChange={(v) => onFilterChange({ amount_min: v ? parseFloat(v) : undefined })}
            placeholder="0.00"
            min={0}
            step={0.01}
          />
          <FilterInput
            label="Montant maximum (€)"
            type="number"
            value={filters.amount_max}
            onChange={(v) => onFilterChange({ amount_max: v ? parseFloat(v) : undefined })}
            placeholder="0.00"
            min={0}
            step={0.01}
          />
          <FilterInput
            label="Seuil de variance (€)"
            type="number"
            value={filters.variance_threshold}
            onChange={(v) => onFilterChange({ variance_threshold: v ? parseFloat(v) : undefined })}
            placeholder="0.00"
            min={0}
            step={0.01}
          />
          <FilterToggle
            label="Avec variance"
            checked={filters.variance_has_variance}
            onChange={(checked) => onFilterChange({ variance_has_variance: checked || undefined })}
          />
          <FilterInput
            label="Durée minimum (heures)"
            type="number"
            value={filters.duration_min_hours}
            onChange={(v) => onFilterChange({ duration_min_hours: v ? parseFloat(v) : undefined })}
            placeholder="0.0"
            min={0}
            step={0.1}
          />
          <FilterInput
            label="Durée maximum (heures)"
            type="number"
            value={filters.duration_max_hours}
            onChange={(v) => onFilterChange({ duration_max_hours: v ? parseFloat(v) : undefined })}
            placeholder="0.0"
            min={0}
            step={0.1}
          />
          <FilterMultiSelect
            label="Méthodes de paiement"
            selected={filters.payment_methods || []}
            onChange={(selected) => onFilterChange({ payment_methods: selected.length > 0 ? selected : undefined })}
            options={[
              { value: 'cash', label: 'Espèces' },
              { value: 'card', label: 'Carte' },
              { value: 'check', label: 'Chèque' }
            ]}
          />
          <FilterToggle
            label="Avec don"
            checked={filters.has_donation}
            onChange={(checked) => onFilterChange({ has_donation: checked || undefined })}
          />
        </FiltersGridContainer>
      </AdvancedFiltersAccordion>

      <KPICards>
        <Card>
          <CardIcon><Euro size={18} /></CardIcon>
          <CardContent>
            <CardLabel>Chiffre d'Affaires Total</CardLabel>
            <CardValue>{formatCurrency(kpis?.total_sales || 0)}</CardValue>
          </CardContent>
        </Card>
        <Card>
          <CardIcon><ShoppingCart size={18} /></CardIcon>
          <CardContent>
            <CardLabel>Nombre de Ventes</CardLabel>
            <CardValue>{kpis?.number_of_sales ?? 0}</CardValue>
          </CardContent>
        </Card>
        <Card>
          <CardIcon><Scale size={18} /></CardIcon>
          <CardContent>
            <CardLabel>Poids Total Vendu</CardLabel>
            <CardValue>{(kpis?.total_weight_sold ?? 0).toLocaleString('fr-FR')} kg</CardValue>
          </CardContent>
        </Card>
        <Card>
          <CardIcon><Euro size={18} /></CardIcon>
          <CardContent>
            <CardLabel>Total des Dons</CardLabel>
            <CardValue>{formatCurrency(kpis?.total_donations || 0)}</CardValue>
          </CardContent>
        </Card>
        <Card>
          <CardIcon><Users size={18} /></CardIcon>
          <CardContent>
            <CardLabel>Nombre de Sessions</CardLabel>
            <CardValue>{kpis?.total_sessions ?? 0}</CardValue>
          </CardContent>
        </Card>
      </KPICards>

      {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Chargement...</div>}
      {error && <div style={{ padding: '20px', color: '#ef4444', background: '#fee2e2', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}
      
      <Table>
        <thead>
          <tr>
            <Th $sortable onClick={() => handleSort('status')}>
              Statut
              <SortIcon>{getSortIcon('status')}</SortIcon>
            </Th>
            <Th $sortable onClick={() => handleSort('opened_at')}>
              Ouverture
              <SortIcon>{getSortIcon('opened_at')}</SortIcon>
            </Th>
            <Th $sortable onClick={() => handleSort('operator_id')}>
              Opérateur
              <SortIcon>{getSortIcon('operator_id')}</SortIcon>
            </Th>
            <Th $sortable onClick={() => handleSort('number_of_sales')}>
              Nb ventes
              <SortIcon>{getSortIcon('number_of_sales')}</SortIcon>
            </Th>
            <Th $sortable onClick={() => handleSort('total_sales')}>
              Total ventes
              <SortIcon>{getSortIcon('total_sales')}</SortIcon>
            </Th>
            <Th $sortable onClick={() => handleSort('total_donations')}>
              Total dons
              <SortIcon>{getSortIcon('total_donations')}</SortIcon>
            </Th>
            <Th $sortable onClick={() => handleSort('variance')}>
              Écart
              <SortIcon>{getSortIcon('variance')}</SortIcon>
            </Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !loading ? (
            <tr>
              <Td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                Aucune session trouvée
              </Td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} onClick={() => window.location.assign(`/admin/cash-sessions/${row.id}`)} style={{ cursor: 'pointer' }}>
                <Td><StatusDot variant={row.status} />{row.status === 'open' ? 'Ouverte' : 'Fermée'}</Td>
                <Td>{new Date(row.opened_at).toLocaleString('fr-FR')}</Td>
                <Td>{row.operator_id ? getUserName(row.operator_id) : '-'}</Td>
                <Td>{row.number_of_sales || 0}</Td>
                <Td>{formatCurrency(row.total_sales || 0)}</Td>
                <Td>{formatCurrency(row.total_donations || 0)}</Td>
                <Td>{row.variance !== undefined ? formatCurrency(row.variance) : '-'}</Td>
                <Td>
                  <ActionsCell>
                    <Button onClick={(e) => {
                      e.stopPropagation()
                      window.location.assign(`/admin/cash-sessions/${row.id}`)
                    }}>Voir Détail</Button>
                    <Button $variant='ghost' onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        // Utiliser le nouvel endpoint qui génère le rapport directement par session ID
                        const blobRes = await axiosClient.get(`/v1/admin/reports/cash-sessions/by-session/${row.id}`, { responseType: 'blob' })
                        const url = URL.createObjectURL(blobRes.data)
                        const a = document.createElement('a')
                        a.href = url
                        // Extraire le nom de fichier depuis le Content-Disposition header si disponible
                        const contentDisposition = blobRes.headers['content-disposition'] || blobRes.headers['Content-Disposition']
                        let filename = `session_caisse_${row.id}.csv`
                        if (contentDisposition) {
                          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
                          if (filenameMatch && filenameMatch[1]) {
                            filename = filenameMatch[1].replace(/['"]/g, '')
                          }
                        }
                        a.download = filename
                        a.click()
                        URL.revokeObjectURL(url)
                      } catch (err) {
                        console.error('Erreur lors du téléchargement du rapport:', err)
                      }
                    }}>Télécharger CSV</Button>
                  </ActionsCell>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {total > 0 && (
        <PaginationContainer>
          <PaginationInfo>
            Affichage de {Math.min((filters.skip || 0) + 1, total)} à {Math.min((filters.skip || 0) + (filters.limit || 20), total)} sur {total} sessions
          </PaginationInfo>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '0.9rem', color: '#6b7280' }} htmlFor="items-per-page">
              Sessions par page:
            </label>
            <Select 
              id="items-per-page"
              value={filters.limit || 20} 
              onChange={(e) => {
                const newLimit = parseInt(e.target.value, 10)
                setFilters({ ...filters, limit: newLimit, skip: 0 })
              }}
              style={{ width: 'auto', minWidth: '80px' }}
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
          </div>
          <PaginationControls>
            <PageButton 
              onClick={() => handlePageChange(1)} 
              disabled={currentPage === 1}
            >
              Première
            </PageButton>
            <PageButton 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1}
            >
              Précédent
            </PageButton>
            <span style={{ padding: '0 8px', fontSize: '0.9rem' }}>
              Page {currentPage} sur {totalPages}
            </span>
            <PageButton 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage >= totalPages}
            >
              Suivant
            </PageButton>
            <PageButton 
              onClick={() => handlePageChange(totalPages)} 
              disabled={currentPage >= totalPages}
            >
              Dernière
            </PageButton>
          </PaginationControls>
        </PaginationContainer>
      )}
    </Container>
  )
}

export default SessionManager


