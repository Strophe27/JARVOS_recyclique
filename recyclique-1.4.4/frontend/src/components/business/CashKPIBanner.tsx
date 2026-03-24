import React from 'react';
import styled from 'styled-components';
import { Activity, Wifi, WifiOff, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCashLiveStats, CashLiveStats } from '../../hooks/useCashLiveStats';
import { useVirtualCashLiveStats } from '../../hooks/useVirtualCashLiveStats';
import { useCashStores } from '../../providers/CashStoreProvider';
import { useAuthStore } from '../../stores/authStore';

const BannerContainer = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-height: 60px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    min-height: auto;
    flex-direction: column;
    align-items: stretch;
  }
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  flex: 1;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const KPIItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const KPILabel = styled.span`
  font-size: 0.75rem;
  opacity: 0.9;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const KPIValue = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const StatusSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  opacity: 0.95;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }
`;

const LiveIndicator = styled.div<{ $isOnline: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: ${props => props.$isOnline ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'};
  border-radius: 12px;
  border: 1px solid ${props => props.$isOnline ? 'rgba(76, 175, 80, 0.4)' : 'rgba(244, 67, 54, 0.4)'};
`;

const LiveDot = styled.div<{ $isOnline: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$isOnline ? '#4caf50' : '#f44336'};
  animation: ${props => props.$isOnline ? 'pulse 2s infinite' : 'none'};

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const Timestamp = styled.span`
  font-size: 0.75rem;
  opacity: 0.8;
`;

const AdminLink = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: white;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatWeight = (value: number): string => {
  return `${value.toFixed(1)} kg`;
};

const formatTime = (date: Date | null): string => {
  if (!date) return '--:--';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

interface CashKPIBannerProps {
  lastTicketAmount?: number; // Montant du dernier ticket (depuis le store local)
}

/**
 * Composant Bandeau KPI pour la caisse
 * Affiche les indicateurs clés en temps réel avec rafraîchissement automatique
 * S'adapte automatiquement au mode virtuel
 */
export const CashKPIBanner: React.FC<CashKPIBannerProps> = ({ lastTicketAmount = 0 }) => {
  const navigate = useNavigate();
  const { cashSessionStore, isVirtualMode } = useCashStores();
  const { currentSession } = cashSessionStore;
  const currentUser = useAuthStore((state) => state.currentUser);

  // Utiliser le hook approprié selon le mode
  const virtualStats = useVirtualCashLiveStats({
    intervalMs: 5000, // Plus réactif en mode virtuel
    enabled: isVirtualMode
  });

  const realStats = useCashLiveStats({
    intervalMs: 10000, // 10 secondes pour le mode réel
    enabled: !isVirtualMode
  });

  // Sélectionner les données selon le mode
  const { data, isLoading, error, isOnline, lastUpdate } = isVirtualMode ? virtualStats : realStats;

  // Utiliser le montant du dernier ticket depuis les props ou les données API
  const displayLastTicket = lastTicketAmount > 0 ? lastTicketAmount : (data?.lastTicketAmount || 0);

  // Données avec fallback pour mode offline
  const stats: CashLiveStats = data || {
    ticketsCount: 0,
    lastTicketAmount: displayLastTicket,
    ca: 0,
    donations: 0,
    weightOut: 0,
    weightIn: 0,
    timestamp: new Date().toISOString()
  };

  // Navigation vers la session admin
  const handleViewSessionDetails = () => {
    if (currentSession?.id) {
      navigate(`/admin/cash-sessions/${currentSession.id}`);
    }
  };

  // Vérifier si l'utilisateur peut voir le lien admin (admin ou super-admin)
  const canViewAdminLink = currentUser?.role === 'admin' || currentUser?.role === 'super-admin';

  return (
    <BannerContainer data-testid="cash-kpi-banner">
      <KPIGrid>
        <KPIItem>
          <KPILabel>Tickets</KPILabel>
          <KPIValue>{stats.ticketsCount}</KPIValue>
        </KPIItem>

        <KPIItem>
          <KPILabel>Dernier ticket</KPILabel>
          <KPIValue>{displayLastTicket > 0 ? formatCurrency(displayLastTicket) : '--'}</KPIValue>
        </KPIItem>

        <KPIItem>
          <KPILabel>CA jour</KPILabel>
          <KPIValue>{formatCurrency(stats.ca)}</KPIValue>
        </KPIItem>

        <KPIItem>
          <KPILabel>Dons jour</KPILabel>
          <KPIValue>{formatCurrency(stats.donations)}</KPIValue>
        </KPIItem>

        <KPIItem>
          <KPILabel>Poids sortis</KPILabel>
          <KPIValue>{formatWeight(stats.weightOut)}</KPIValue>
        </KPIItem>

        <KPIItem>
          <KPILabel>Poids rentrés</KPILabel>
          <KPIValue>{formatWeight(stats.weightIn)}</KPIValue>
        </KPIItem>
      </KPIGrid>

      <StatusSection>
        <LiveIndicator $isOnline={isVirtualMode ? true : (isOnline && !error)}>
          {isVirtualMode ? (
            <>
              <LiveDot $isOnline={true} />
              <Activity size={14} />
              <span>Mode virtuel</span>
            </>
          ) : isOnline && !error ? (
            <>
              <LiveDot $isOnline={true} />
              <Activity size={14} />
              <span>Live</span>
            </>
          ) : (
            <>
              <LiveDot $isOnline={false} />
              <WifiOff size={14} />
              <span>Hors ligne</span>
            </>
          )}
        </LiveIndicator>
        {lastUpdate && (
          <Timestamp>
            {formatTime(lastUpdate)}
          </Timestamp>
        )}
        {canViewAdminLink && currentSession?.id && (
          <AdminLink onClick={handleViewSessionDetails} title="Voir les détails de la session">
            <ExternalLink size={14} />
            <span>Session</span>
          </AdminLink>
        )}
      </StatusSection>
    </BannerContainer>
  );
};

export default CashKPIBanner;

