import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { ArrowLeft, Calendar, User, Package, Scale } from 'lucide-react'
import { Badge } from '@mantine/core'
import axiosClient from '../../api/axiosClient'
import { receptionTicketsService, ReceptionTicketDetail as ReceptionTicketDetailType, LigneResponse } from '../../services/receptionTicketsService'
import { receptionService } from '../../services/receptionService'
import { useAuthStore } from '../../stores/authStore'

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

const TicketInfo = styled.div`
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

const LignesSection = styled.div`
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

const ExportButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #111827;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-bottom: 20px;
  
  &:hover {
    background: #1f2937;
  }
`

/**
 * Formate une date ISO en format français localisé
 */
const formatDate = (dateString: string) => {
  if (!dateString) {
    return 'N/A'
  }
  
  const date = new Date(dateString)
  
  if (isNaN(date.getTime())) {
    return 'N/A'
  }
  
  return date.toLocaleString('fr-FR')
}

/**
 * Formate un poids en kg
 */
const formatWeight = (value: number): string => {
  const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0
  return numValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * B48-P6: Calcule les 4 métriques de poids depuis les lignes
 */
const calculateMetrics = (lignes: LigneResponse[]) => {
  const totalProcessed = lignes.reduce((sum, l) => {
    const poids = typeof l.poids_kg === 'number' ? l.poids_kg : parseFloat(String(l.poids_kg)) || 0
    return sum + poids
  }, 0)

  const enteredBoutique = lignes
    .filter(l => !l.is_exit && l.destination === 'MAGASIN')
    .reduce((sum, l) => {
      const poids = typeof l.poids_kg === 'number' ? l.poids_kg : parseFloat(String(l.poids_kg)) || 0
      return sum + poids
    }, 0)

  const recycledDirect = lignes
    .filter(l => !l.is_exit && (l.destination === 'RECYCLAGE' || l.destination === 'DECHETERIE'))
    .reduce((sum, l) => {
      const poids = typeof l.poids_kg === 'number' ? l.poids_kg : parseFloat(String(l.poids_kg)) || 0
      return sum + poids
    }, 0)

  const recycledFromBoutique = lignes
    .filter(l => l.is_exit && (l.destination === 'RECYCLAGE' || l.destination === 'DECHETERIE'))
    .reduce((sum, l) => {
      const poids = typeof l.poids_kg === 'number' ? l.poids_kg : parseFloat(String(l.poids_kg)) || 0
      return sum + poids
    }, 0)

  return { totalProcessed, enteredBoutique, recycledDirect, recycledFromBoutique }
}

/**
 * B48-P6: Retourne le badge de type pour une ligne
 */
const getTypeBadge = (ligne: LigneResponse) => {
  if (ligne.is_exit) {
    return <Badge color="red" size="sm">Sortie boutique</Badge>
  }
  if (ligne.destination === 'MAGASIN') {
    return <Badge color="green" size="sm">Entrée boutique</Badge>
  }
  return <Badge color="orange" size="sm">Recyclage direct</Badge>
}

const ReceptionTicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.currentUser)
  const [ticket, setTicket] = useState<ReceptionTicketDetailType | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  // Story B52-P2: Edition du poids
  const [editingLineWeight, setEditingLineWeight] = useState<string | null>(null)
  const [weightValue, setWeightValue] = useState<string>('')
  const [updatingWeight, setUpdatingWeight] = useState<boolean>(false)
  
  // Story B52-P2: Vérifier si l'utilisateur peut éditer le poids (Admin/SuperAdmin uniquement)
  const canEditWeight = user?.role === 'admin' || user?.role === 'super-admin'

  useEffect(() => {
    if (!id) {
      setError('ID de ticket manquant')
      setLoading(false)
      return
    }

    const fetchTicketDetail = async () => {
      try {
        setLoading(true)
        setError(null)

        const ticketData = await receptionTicketsService.getDetail(id)
        setTicket(ticketData)
      } catch (err) {
        console.error('Erreur lors du chargement du ticket:', err)
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    }

    fetchTicketDetail()
  }, [id])

  const handleBack = () => {
    navigate('/admin/reception-sessions')
  }

  const handleExportCSV = async () => {
    if (!id) return
    
    try {
      await receptionTicketsService.exportCSV(id)
    } catch (err) {
      console.error('Erreur lors du téléchargement du CSV:', err)
      alert('Erreur lors du téléchargement du CSV')
    }
  }

  // Story B52-P2: Handlers pour l'édition du poids
  const handleEditLineWeight = (ligne: LigneResponse) => {
    setWeightValue((ligne.poids_kg ?? 0).toString())
    setEditingLineWeight(ligne.id)
  }

  const handleCancelEditWeight = () => {
    setEditingLineWeight(null)
    setWeightValue('')
  }

  const handleSaveLineWeight = async () => {
    if (!id || !editingLineWeight) return

    const ligne = ticket?.lignes.find(l => l.id === editingLineWeight)
    if (!ligne) return

    const oldWeight = ligne.poids_kg ?? 0
    const newWeight = parseFloat(weightValue)

    if (isNaN(newWeight) || newWeight <= 0) {
      alert('Le poids doit être un nombre supérieur à 0')
      return
    }

    try {
      setUpdatingWeight(true)
      await receptionService.updateLineWeight(id, editingLineWeight, newWeight)
      
      // Recharger les détails du ticket
      const updatedTicket = await receptionTicketsService.getDetail(id)
      setTicket(updatedTicket)
      
      setEditingLineWeight(null)
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

  if (loading) {
    return (
      <Container>
        <LoadingState>Chargement des détails du ticket...</LoadingState>
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
            Retour aux sessions de réception
          </BackButton>
        </ErrorState>
      </Container>
    )
  }

  if (!ticket) {
    return (
      <Container>
        <Header>
          <BackButton onClick={handleBack}>
            <ArrowLeft size={16} />
            Retour
          </BackButton>
          <Title>Ticket non trouvé</Title>
        </Header>
        <ErrorState>
          <div>Le ticket demandé n'a pas été trouvé.</div>
          <BackButton onClick={handleBack}>
            Retour aux sessions de réception
          </BackButton>
        </ErrorState>
      </Container>
    )
  }

  // B48-P6: Calculer les 4 métriques de poids
  const metrics = calculateMetrics(ticket.lignes)

  return (
    <Container>
      <Header>
        <BackButton onClick={handleBack}>
          <ArrowLeft size={16} />
          Retour
        </BackButton>
        <Title>Détail du Ticket de Réception</Title>
      </Header>

      <ExportButton onClick={handleExportCSV}>
        Télécharger CSV
      </ExportButton>

      <TicketInfo>
        <InfoGrid>
          <InfoItem>
            <InfoIcon>
              <User size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Bénévole</InfoLabel>
              <InfoValue>{ticket.benevole_username || 'Inconnu'}</InfoValue>
            </InfoContent>
          </InfoItem>

          <InfoItem>
            <InfoIcon>
              <Calendar size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Date création</InfoLabel>
              <InfoValue>{formatDate(ticket.created_at)}</InfoValue>
            </InfoContent>
          </InfoItem>

          {ticket.closed_at && (
            <InfoItem>
              <InfoIcon>
                <Calendar size={20} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Date fermeture</InfoLabel>
                <InfoValue>{formatDate(ticket.closed_at)}</InfoValue>
              </InfoContent>
            </InfoItem>
          )}

          <InfoItem>
            <InfoIcon>
              <Package size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Statut</InfoLabel>
              <InfoValue>
                <StatusBadge variant={ticket.status}>
                  {ticket.status === 'open' ? 'Ouvert' : 'Fermé'}
                </StatusBadge>
              </InfoValue>
            </InfoContent>
          </InfoItem>

          {/* B48-P6: 4 KPIs de poids distincts */}
          <InfoItem>
            <InfoIcon>
              <Scale size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Poids total traité</InfoLabel>
              <InfoValue>{formatWeight(metrics.totalProcessed)} kg</InfoValue>
            </InfoContent>
          </InfoItem>

          <InfoItem>
            <InfoIcon style={{ background: '#d1fae5', color: '#059669' }}>
              <Package size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Poids entré en boutique</InfoLabel>
              <InfoValue>{formatWeight(metrics.enteredBoutique)} kg</InfoValue>
            </InfoContent>
          </InfoItem>

          <InfoItem>
            <InfoIcon style={{ background: '#fed7aa', color: '#d97706' }}>
              <Package size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Poids recyclé directement</InfoLabel>
              <InfoValue>{formatWeight(metrics.recycledDirect)} kg</InfoValue>
            </InfoContent>
          </InfoItem>

          <InfoItem>
            <InfoIcon style={{ background: '#fee2e2', color: '#dc2626' }}>
              <Package size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Poids recyclé depuis boutique</InfoLabel>
              <InfoValue>{formatWeight(metrics.recycledFromBoutique)} kg</InfoValue>
            </InfoContent>
          </InfoItem>

          <InfoItem>
            <InfoIcon>
              <Package size={20} />
            </InfoIcon>
            <InfoContent>
              <InfoLabel>Nombre de lignes</InfoLabel>
              <InfoValue>{ticket.lignes.length}</InfoValue>
            </InfoContent>
          </InfoItem>
        </InfoGrid>
      </TicketInfo>

      <LignesSection>
        <SectionTitle>
          <Package size={20} />
          Lignes de Dépôt ({ticket.lignes.length} ligne{ticket.lignes.length > 1 ? 's' : ''})
        </SectionTitle>
        
        {ticket.lignes.length === 0 ? (
          <EmptyState>Aucune ligne de dépôt enregistrée pour ce ticket.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Catégorie</Th>
                <Th>Poids (kg)</Th>
                <Th>Type</Th>
                <Th>Destination</Th>
                <Th>Notes</Th>
                {canEditWeight && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {ticket.lignes.map((ligne) => (
                <tr key={ligne.id}>
                  <Td>{ligne.category_label || 'Non spécifiée'}</Td>
                  <Td>
                    {editingLineWeight === ligne.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
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
                          onClick={handleSaveLineWeight}
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
                      formatWeight(ligne.poids_kg || 0)
                    )}
                  </Td>
                  <Td>{getTypeBadge(ligne)}</Td>
                  <Td>{ligne.destination || '-'}</Td>
                  <Td>{ligne.notes || '-'}</Td>
                  {canEditWeight && (
                    <Td>
                      {editingLineWeight !== ligne.id && (
                        <button
                          onClick={() => handleEditLineWeight(ligne)}
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
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </LignesSection>
    </Container>
  )
}

export default ReceptionTicketDetail

