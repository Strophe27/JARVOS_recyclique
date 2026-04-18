import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { ArrowLeft, Calendar, User, DollarSign, Package, Clock, Heart, Eye, Scale } from 'lucide-react'
import axiosClient from '../../api/axiosClient'
import { getSaleDetail, SaleDetail, SaleItem, updateSaleNote, updateSaleItemWeight } from '../../services/salesService'
import { getCategories, Category } from '../../services/categoriesService'
import { getUsers, User as UserType } from '../../services/usersService'
import { presetService } from '../../services/presetService'
import { useAuthStore } from '../../stores/authStore'

// Fonction utilitaire pour convertir les codes de paiement en libellés français
const getPaymentMethodLabel = (code?: string): string => {
  if (!code) return 'Non spécifié'
  const labels: Record<string, string> = {
    'cash': 'Espèces',
    'card': 'Carte bancaire',
    'check': 'Chèque',
    // Support des anciennes valeurs pour compatibilité
    'espèces': 'Espèces',
    'carte bancaire': 'Carte bancaire',
    'chèque': 'Chèque'
  }
  return labels[code] || code
}

// Story B52-P1: Paiement individuel
interface PaymentSummary {
  id: string
  sale_id: string
  payment_method: string
  amount: number
  created_at: string
}

// Types pour les données de la session
interface SaleSummary {
  id: string
  total_amount: number
  donation?: number
  payment_method?: string  // Déprécié - utiliser payments
  payments?: PaymentSummary[]  // Story B52-P1: Liste de paiements multiples
  sale_date: string  // Story B52-P3: Date réelle du ticket (date du cahier)
  created_at: string  // Date d'enregistrement (pour traçabilité)
  operator_id?: string
  note?: string  // Story B40-P4: Notes dans liste sessions
  // B52-P6: Poids total du panier (somme des SaleItem.weight)
  total_weight?: number
}

interface CashSessionDetail {
  id: string
  operator_id: string
  operator_name?: string
  site_id: string
  site_name?: string
  initial_amount: number
  current_amount: number
  status: string
  opened_at: string
  closed_at?: string
  total_sales: number
  total_items: number
  closing_amount?: number
  actual_amount?: number
  variance?: number
  variance_comment?: string
  // B52-P6: Poids total sorti sur la session (somme des poids des items de vente)
  total_weight_out?: number
  sales: SaleSummary[]
}

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #374151;
  transition: all 0.2s ease;

  &:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }
`

const Title = styled.h1`
  margin: 0;
  font-size: 1.8rem;
  color: #1f2937;
`

const LoadingState = styled.div`
  padding: 60px 0;
  text-align: center;
  color: #4b5563;
  font-size: 1.1rem;
`

const ErrorState = styled.div`
  padding: 24px;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 10px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SessionInfo = styled.div`
  background: white;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.06);
  border: 1px solid #e5e7eb;
  margin-bottom: 24px;
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
`

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`

const InfoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #dbeafe;
  border-radius: 8px;
  color: #1d4ed8;
`

const InfoContent = styled.div`
  flex: 1;
`

const InfoLabel = styled.div`
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 4px;
`

const InfoValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
`

const StatusBadge = styled.span<{ variant?: 'open' | 'closed' }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${(props) => (props.variant === 'open' ? '#dcfce7' : '#fee2e2')};
  color: ${(props) => (props.variant === 'open' ? '#166534' : '#991b1b')};
`

const ReturnToCashButton = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid #16a34a;
  background: #16a34a;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`

const SalesSection = styled.div`
  background: white;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.06);
  border: 1px solid #e5e7eb;
`

const SectionTitle = styled.h2`
  margin: 0 0 20px 0;
  font-size: 1.3rem;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 12px;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const Th = styled.th`
  text-align: left;
  padding: 12px;
  background: #f9fafb;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #4b5563;
  border-bottom: 1px solid #e5e7eb;
`

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.95rem;
  color: #1f2937;
`

const EmptyState = styled.div`
  padding: 32px;
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;
`

// Styles pour la modal du ticket
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
`

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: #1f2937;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  
  &:hover {
    color: #374151;
  }
`

const TicketInfo = styled.div`
  margin-bottom: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
`

const TicketRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
    font-weight: 600;
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
  }
`

const ItemsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
`

const ItemTh = styled.th`
  text-align: left;
  padding: 8px 12px;
  background: #f3f4f6;
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
`

const ItemTd = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.9rem;
`

const ViewTicketButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #374151;
  transition: all 0.2s ease;
  
  &:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }
`

/**
 * Formate un montant en devise EUR
 * @param value - Montant à formater (peut être null ou undefined)
 * @returns Montant formaté ou '0,00 €' si null/undefined
 */
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) {
    return (0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
  }
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}


/**
 * Formate une date ISO en format français localisé avec secondes
 * @param dateString - Chaîne de date ISO
 * @returns Date formatée (DD/MM/YYYY HH:mm:ss) ou "N/A" si invalide
 * 
 * Story B51-P2: Inclut les secondes pour distinguer les encaissements créés dans la même minute
 */
const formatDate = (dateString: string) => {
  if (!dateString) {
    return 'N/A'
  }
  
  const date = new Date(dateString)
  
  // Vérifier que la date est valide
  if (isNaN(date.getTime())) {
    return 'N/A'
  }
  
  // Format explicite avec secondes pour distinguer les encaissements
  // Format: DD/MM/YYYY HH:mm:ss
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Calcule et formate la durée entre deux dates
 * @param openedAt - Date d'ouverture (ISO string)
 * @param closedAt - Date de fermeture (ISO string, optionnel)
 * @returns Durée formatée (ex: "2h 30m") ou "N/A" si invalide
 */
const formatDuration = (openedAt: string, closedAt?: string) => {
  if (!openedAt) {
    return 'N/A'
  }
  
  const start = new Date(openedAt)
  
  // Vérifier que la date de début est valide
  if (isNaN(start.getTime())) {
    return 'N/A'
  }
  
  const end = closedAt ? new Date(closedAt) : new Date()
  
  // Vérifier que la date de fin est valide
  if (closedAt && isNaN(end.getTime())) {
    return 'N/A'
  }
  
  const diffMs = end.getTime() - start.getTime()
  
  if (diffMs <= 0 || isNaN(diffMs)) return '0h 00m'
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  
  // Vérifier que les valeurs sont valides
  if (isNaN(hours) || isNaN(minutes)) {
    return 'N/A'
  }
  
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

const CashSessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.currentUser)
  const [session, setSession] = useState<CashSessionDetail | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null)
  const [showTicketModal, setShowTicketModal] = useState<boolean>(false)
  const [loadingSale, setLoadingSale] = useState<boolean>(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [presets, setPresets] = useState<any[]>([])  // Pour stocker la liste des presets
  const [loadingData, setLoadingData] = useState<boolean>(false)
  // Story B40-P4: Edition des notes
  const [editingNote, setEditingNote] = useState<boolean>(false)
  const [noteValue, setNoteValue] = useState<string>('')
  const [updatingNote, setUpdatingNote] = useState<boolean>(false)
  // Story B52-P2: Edition du poids
  const [editingItemWeight, setEditingItemWeight] = useState<string | null>(null)
  const [weightValue, setWeightValue] = useState<string>('')
  const [updatingWeight, setUpdatingWeight] = useState<boolean>(false)

  useEffect(() => {
    if (!id) {
      setError('ID de session manquant')
      setLoading(false)
      return
    }

    const fetchSessionDetail = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await axiosClient.get(`/v1/cash-sessions/${id}`)
        setSession(response.data)
      } catch (err) {
        console.error('Erreur lors du chargement de la session:', err)
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    }

    fetchSessionDetail()
  }, [id])

  // Charger les catégories, utilisateurs et presets pour les noms
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setLoadingData(true)
        const [categoriesData, usersData, presetsData] = await Promise.all([
          getCategories(),
          getUsers(),
          presetService.getPresets()
        ])
        setCategories(categoriesData)
        setUsers(usersData)
        setPresets(presetsData)
      } catch (error) {
        console.error('Erreur lors du chargement des données de référence:', error)
      } finally {
        setLoadingData(false)
      }
    }

    loadReferenceData()
  }, [])

  const formatWeight = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0,00 kg'
    }
    return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
  }

  const handleBack = () => {
    navigate('/admin/session-manager')
  }

  const handleViewTicket = async (saleId: string, operatorId?: string) => {
    try {
      setLoadingSale(true)
      const saleDetail = await getSaleDetail(saleId)
      
      // Enrichir avec l'operator_id de la ligne cliquée
      const enrichedSaleDetail = {
        ...saleDetail,
        operator_id: operatorId || saleDetail.operator_id
      }
      
      setSelectedSale(enrichedSaleDetail)
      setShowTicketModal(true)
    } catch (error) {
      console.error('Erreur lors du chargement du ticket:', error)
      // Optionnel: afficher une notification d'erreur
    } finally {
      setLoadingSale(false)
    }
  }

  const closeTicketModal = () => {
    setShowTicketModal(false)
    setSelectedSale(null)
    setEditingNote(false)
    setNoteValue('')
  }

  // Story B40-P4: Edition des notes côté Admin
  const handleEditNote = () => {
    setNoteValue(selectedSale?.note || '')
    setEditingNote(true)
  }

  const handleCancelEdit = () => {
    setEditingNote(false)
    setNoteValue('')
  }

  const handleSaveNote = async () => {
    if (!selectedSale) return

    const oldNote = selectedSale.note || ''
    const newNote = noteValue

    try {
      setUpdatingNote(true)
      const updatedSale = await updateSaleNote(selectedSale.id, noteValue)
      setSelectedSale(updatedSale)
      setEditingNote(false)
      setNoteValue('')

      // Story B40-P4: Audit logging for note modifications
      console.log('[AUDIT] Note modification', {
        userId: user?.id,
        userRole: user?.role,
        saleId: selectedSale.id,
        timestamp: new Date().toISOString(),
        oldNote: oldNote,
        newNote: newNote,
        action: oldNote ? 'update' : 'create'
      })
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la note:', error)
      // TODO: Afficher une notification d'erreur
    } finally {
      setUpdatingNote(false)
    }
  }

  // Vérifier si l'utilisateur peut éditer les notes (Admin/SuperAdmin uniquement)
  const canEditNotes = user?.role === 'admin' || user?.role === 'super-admin'
  // Story B52-P2: Vérifier si l'utilisateur peut éditer le poids (Admin/SuperAdmin uniquement)
  const canEditWeight = user?.role === 'admin' || user?.role === 'super-admin'

  // Story B52-P2: Handlers pour l'édition du poids
  const handleEditItemWeight = (item: SaleItem) => {
    setWeightValue((item.weight ?? 0).toString())
    setEditingItemWeight(item.id)
  }

  const handleCancelEditWeight = () => {
    setEditingItemWeight(null)
    setWeightValue('')
  }

  const handleSaveItemWeight = async () => {
    if (!selectedSale || !editingItemWeight) return

    const item = selectedSale.items.find(i => i.id === editingItemWeight)
    if (!item) return

    const oldWeight = item.weight ?? 0
    const newWeight = parseFloat(weightValue)

    if (isNaN(newWeight) || newWeight <= 0) {
      alert('Le poids doit être un nombre supérieur à 0')
      return
    }

    try {
      setUpdatingWeight(true)
      await updateSaleItemWeight(selectedSale.id, editingItemWeight, newWeight)
      
      // Recharger les détails de la vente
      const updatedSale = await getSaleDetail(selectedSale.id)
      setSelectedSale(updatedSale)
      
      setEditingItemWeight(null)
      setWeightValue('')
      
      // Afficher un message de confirmation
      alert(`Poids modifié avec succès: ${oldWeight.toFixed(2)} kg → ${newWeight.toFixed(2)} kg`)
    } catch (error) {
      console.error('Erreur lors de la mise à jour du poids:', error)
      alert('Erreur lors de la mise à jour du poids. Veuillez réessayer.')
    } finally {
      setUpdatingWeight(false)
    }
  }

  // Gestionnaire de retour à la caisse
  const handleReturnToCashRegister = () => {
    if (session?.status === 'open') {
      navigate('/cash-register/sale')
    }
  }

  // Fonctions utilitaires pour récupérer les noms
  const getUserName = (userId: string): string => {
    const user = users.find(u => u.id === userId)
    return user ? (user.full_name || user.first_name || user.username || userId) : userId
  }

  const getCategoryName = (categoryValue: string): string => {
    // Vérifier si c'est un UUID (ID) ou un nom
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryValue)

    if (isUUID) {
      // C'est un ID, chercher le nom dans les catégories
      const category = categories.find(cat => cat.id === categoryValue)
      return category ? category.name : categoryValue
    } else {
      // C'est déjà un nom, le retourner tel quel
      return categoryValue
    }
  }

  const getPresetName = (presetId?: string, notes?: string): string => {
    // Si preset_id est un UUID valide, chercher dans les presets
    if (presetId) {
      const preset = presets.find(p => p.id === presetId)
      if (preset) return preset.name
    }
    
    // Sinon, essayer d'extraire le type de preset depuis notes (format: "preset_type:don-0")
    if (notes) {
      const presetTypeMatch = notes.match(/preset_type:([^;]+)/)
      if (presetTypeMatch) {
        const presetType = presetTypeMatch[1].trim()
        // Mapper les types de preset aux noms affichables
        const presetNames: Record<string, string> = {
          'don-0': 'Don 0€',
          'don-18': 'Don -18 ans',
          'recyclage': 'Recyclage',
          'decheterie': 'Déchèterie'
        }
        return presetNames[presetType] || presetType
      }
    }
    
    return ''  // Vide pour les ventes normales sans preset
  }


  if (loading) {
    return (
      <Container>
        <LoadingState>Chargement des détails de la session...</LoadingState>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Header>
          <BackButton onClick={handleBack}>
            <ArrowLeft size={16} />
            Retour
          </BackButton>
          <Title>Erreur</Title>
        </Header>
        <ErrorState>
          <div>{error}</div>
          <BackButton onClick={handleBack}>
            Retour au dashboard
          </BackButton>
        </ErrorState>
      </Container>
    )
  }

  if (!session) {
    return (
      <Container>
        <Header>
          <BackButton onClick={handleBack}>
            <ArrowLeft size={16} />
            Retour
          </BackButton>
          <Title>Session non trouvée</Title>
        </Header>
        <ErrorState>
          <div>La session demandée n'a pas été trouvée.</div>
          <BackButton onClick={handleBack}>
            Retour au dashboard
          </BackButton>
        </ErrorState>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={handleBack}>
          <ArrowLeft size={16} />
          Retour
        </BackButton>
        <Title>Détail de la Session de Caisse</Title>
      </Header>

      <SessionInfo>
        <InfoGrid>
          <InfoItem>
            <InfoIcon>
              <User size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Opérateur</InfoLabel>
              <InfoValue>{session.operator_name || 'Inconnu'}</InfoValue>
            </InfoContent>
          </InfoItem>

          <InfoItem>
            <InfoIcon>
              <Calendar size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Ouverture</InfoLabel>
              <InfoValue>{formatDate(session.opened_at)}</InfoValue>
            </InfoContent>
          </InfoItem>

          {session.closed_at && (
            <InfoItem>
              <InfoIcon>
                <Clock size={20} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Fermeture</InfoLabel>
                <InfoValue>{formatDate(session.closed_at)}</InfoValue>
              </InfoContent>
            </InfoItem>
          )}

          <InfoItem>
            <InfoIcon>
              <DollarSign size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Montant initial (fond de caisse)</InfoLabel>
              <InfoValue>{formatCurrency(session.initial_amount)}</InfoValue>
            </InfoContent>
          </InfoItem>

          <InfoItem>
            <InfoIcon>
              <DollarSign size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Total des ventes</InfoLabel>
              <InfoValue>{formatCurrency(session.total_sales)}</InfoValue>
            </InfoContent>
          </InfoItem>

          <InfoItem>
            <InfoIcon>
              <Heart size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Total des dons</InfoLabel>
              <InfoValue>{formatCurrency((session.sales || []).reduce((acc, s) => acc + (s.donation || 0), 0))}</InfoValue>
            </InfoContent>
          </InfoItem>

          <InfoItem>
            <InfoIcon>
              <Package size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Nombre de paniers</InfoLabel>
              <InfoValue>{session.sales.length}</InfoValue>
            </InfoContent>
          </InfoItem>

          {/* B52-P6: Poids vendus ou donnés sur la session (sorties) */}
          {typeof session.total_weight_out === 'number' && (
            <InfoItem>
              <InfoIcon>
                <Scale size={20} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Poids vendus ou donnés (sorties)</InfoLabel>
                <InfoValue>{formatWeight(session.total_weight_out)}</InfoValue>
              </InfoContent>
            </InfoItem>
          )}
        </InfoGrid>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <InfoLabel>Statut:</InfoLabel>
          {session.status === 'open' ? (
            <ReturnToCashButton onClick={handleReturnToCashRegister}>
              Retour à la caisse
            </ReturnToCashButton>
          ) : (
            <StatusBadge variant="closed">
              Fermée
            </StatusBadge>
          )}
        </div>

        {session.variance !== undefined && (
          <div style={{ 
            padding: '16px', 
            background: session.variance === 0 ? '#f0fdf4' : '#fef2f2', 
            border: `1px solid ${session.variance === 0 ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '8px',
            marginTop: '16px'
          }}>
            <InfoLabel>Contrôle de caisse</InfoLabel>
            <div style={{ marginTop: '8px' }}>
              <div>Montant théorique: {formatCurrency(session.closing_amount || 0)}</div>
              <div>Montant physique: {formatCurrency(session.actual_amount || 0)}</div>
              <div style={{ 
                fontWeight: '600', 
                color: session.variance === 0 ? '#166534' : '#991b1b' 
              }}>
                Écart: {formatCurrency(session.variance)}
              </div>
              {session.variance_comment && (
                <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                  Commentaire: {session.variance_comment}
                </div>
              )}
            </div>
          </div>
        )}
      </SessionInfo>

      <SalesSection>
        <SectionTitle>
          <Package size={20} />
          Journal des Ventes ({session.sales.length} vente{session.sales.length > 1 ? 's' : ''})
        </SectionTitle>
        
        {session.sales.length === 0 ? (
          <EmptyState>Aucune vente enregistrée pour cette session.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Heure</Th>
                <Th>Montant</Th>
                <Th>Don</Th>
                <Th>Poids</Th>
                <Th>Paiement</Th>
                <Th>Opérateur</Th>
                <Th>Notes</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {session.sales.map((sale) => (
                <tr key={sale.id} onClick={() => handleViewTicket(sale.id, sale.operator_id)} style={{ cursor: 'pointer' }}>
                  <Td>{formatDate(sale.sale_date)}</Td>
                  <Td>{formatCurrency(sale.total_amount)}</Td>
                  <Td>{sale.donation ? formatCurrency(sale.donation) : '-'}</Td>
                  <Td>{formatWeight(sale.total_weight ?? 0)}</Td>
                  <Td>
                    {/* Story B52-P1: Afficher paiements multiples si disponibles */}
                    {sale.payments && sale.payments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {sale.payments.map((payment: any, index: number) => (
                          <span key={payment.id || index}>
                            {getPaymentMethodLabel(payment.payment_method)}: {formatCurrency(payment.amount)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      getPaymentMethodLabel(sale.payment_method)
                    )}
                  </Td>
                  <Td>{sale.operator_id ? getUserName(sale.operator_id) : '-'}</Td>
                  <Td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sale.note || '-'}
                  </Td>
                  <Td>
                    <ViewTicketButton
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewTicket(sale.id, sale.operator_id)
                      }}
                      disabled={loadingSale}
                    >
                      <Eye size={14} />
                      Voir le ticket
                    </ViewTicketButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </SalesSection>

      {/* Modal du ticket de caisse */}
      {showTicketModal && selectedSale && (
        <ModalOverlay onClick={closeTicketModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Ticket de Caisse</ModalTitle>
              <CloseButton onClick={closeTicketModal}>×</CloseButton>
            </ModalHeader>
            
            <TicketInfo>
              <TicketRow>
                <span>Heure de vente:</span>
                <span>{formatDate(selectedSale.sale_date)}</span>
              </TicketRow>
              <TicketRow>
                <span>Opérateur:</span>
                <span>{selectedSale.operator_id ? getUserName(selectedSale.operator_id) : 'Non spécifié'}</span>
              </TicketRow>
              {/* Story B52-P1: Afficher paiements multiples si disponibles, sinon rétrocompatibilité */}
              {selectedSale.payments && selectedSale.payments.length > 0 ? (
                <TicketRow>
                  <span>Paiements:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    {selectedSale.payments.map((payment, index) => (
                      <span key={payment.id || index}>
                        {getPaymentMethodLabel(payment.payment_method)}: {formatCurrency(payment.amount)}
                      </span>
                    ))}
                    <span style={{ fontWeight: 600, marginTop: '4px', borderTop: '1px solid #ddd', paddingTop: '4px' }}>
                      Total: {formatCurrency(selectedSale.payments.reduce((sum, p) => sum + p.amount, 0))}
                    </span>
                  </div>
                </TicketRow>
              ) : (
                <TicketRow>
                  <span>Méthode de paiement:</span>
                  <span>{getPaymentMethodLabel(selectedSale.payment_method)}</span>
                </TicketRow>
              )}
              <TicketRow>
                <span>Don:</span>
                <span>{selectedSale.donation ? formatCurrency(selectedSale.donation) : 'Aucun'}</span>
              </TicketRow>
              <TicketRow>
                <span>Total:</span>
                <span>{formatCurrency(selectedSale.total_amount)}</span>
              </TicketRow>
              <TicketRow>
                <span>Note:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  {editingNote ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <textarea
                        value={noteValue}
                        onChange={(e) => setNoteValue(e.target.value)}
                        placeholder="Ajouter une note..."
                        style={{
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '0.9rem',
                          minHeight: '60px',
                          resize: 'vertical'
                        }}
                        disabled={updatingNote}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleSaveNote}
                          disabled={updatingNote}
                          style={{
                            padding: '4px 8px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: updatingNote ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          {updatingNote ? 'Sauvegarde...' : 'Sauvegarder'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={updatingNote}
                          style={{
                            padding: '4px 8px',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: updatingNote ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span style={{ flex: 1 }}>
                        {selectedSale.note || 'Aucune note'}
                      </span>
                      {canEditNotes && (
                        <button
                          onClick={handleEditNote}
                          style={{
                            padding: '4px 8px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          {selectedSale.note ? 'Modifier la note' : 'Ajouter une note'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </TicketRow>
            </TicketInfo>

            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#1f2937' }}>
                Articles vendus ({selectedSale.items.length})
              </h3>
              
              {selectedSale.items.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                  Aucun article enregistré pour cette vente.
                </div>
              ) : (
                <ItemsTable>
                  <thead>
                    <tr>
                      <ItemTh>Catégorie</ItemTh>
                      <ItemTh>Poids (kg)</ItemTh>
                      <ItemTh>Prix unitaire</ItemTh>
                      <ItemTh>Total</ItemTh>
                      <ItemTh>Type de transaction</ItemTh>
                      <ItemTh>Notes</ItemTh>
                      {canEditWeight && <ItemTh>Actions</ItemTh>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item) => (
                      <tr key={item.id}>
                        <ItemTd>{getCategoryName(item.category)}</ItemTd>
                        <ItemTd>
                          {editingItemWeight === item.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={weightValue}
                                onChange={(e) => setWeightValue(e.target.value)}
                                style={{
                                  width: '80px',
                                  padding: '4px 8px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px'
                                }}
                                disabled={updatingWeight}
                              />
                              <button
                                onClick={handleSaveItemWeight}
                                disabled={updatingWeight}
                                style={{
                                  padding: '4px 8px',
                                  background: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: updatingWeight ? 'not-allowed' : 'pointer',
                                  fontSize: '0.75rem'
                                }}
                              >
                                ✓
                              </button>
                              <button
                                onClick={handleCancelEditWeight}
                                disabled={updatingWeight}
                                style={{
                                  padding: '4px 8px',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: updatingWeight ? 'not-allowed' : 'pointer',
                                  fontSize: '0.75rem'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            (item.weight ?? 0).toFixed(2)
                          )}
                        </ItemTd>
                        <ItemTd>{formatCurrency(item.unit_price)}</ItemTd>
                        <ItemTd>{formatCurrency(item.total_price)}</ItemTd>
                        {/* Story 1.1.2: Utiliser preset_id et notes de l'item, pas de la vente globale */}
                        <ItemTd>{getPresetName(item.preset_id || undefined, item.notes || undefined)}</ItemTd>
                        <ItemTd>{item.notes ? item.notes.replace(/preset_type:[^;]+;?\s*/g, '').trim() : ''}</ItemTd>
                        {canEditWeight && (
                          <ItemTd>
                            {editingItemWeight !== item.id && (
                              <button
                                onClick={() => handleEditItemWeight(item)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem'
                                }}
                              >
                                Modifier poids
                              </button>
                            )}
                          </ItemTd>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </ItemsTable>
              )}
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  )
}

export default CashSessionDetail
