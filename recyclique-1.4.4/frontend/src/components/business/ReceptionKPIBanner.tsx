import React from 'react';
import styled from 'styled-components';
import { Activity, WifiOff } from 'lucide-react';
import { useReceptionKPILiveStats } from '../../hooks/useReceptionKPILiveStats';

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

/**
 * Composant Bandeau KPI pour la réception
 * Affiche les indicateurs clés en temps réel avec rafraîchissement automatique
 * Clone du design CashKPIBanner avec adaptation des KPIs de réception
 */
export const ReceptionKPIBanner: React.FC = () => {
  const { data, isLoading, error, isOnline, lastUpdate } = useReceptionKPILiveStats({
    intervalMs: 10000, // 10 secondes
    enabled: true
  });

  // Données avec fallback pour mode offline
  const stats = data || {
    tickets_open: 0,
    tickets_closed_24h: 0,
    tickets_count: 0, // Nombre de tickets de caisse (ventes) - Story B48-P7
    items_received: 0,
    turnover_eur: 0,
    donations_eur: 0,
    weight_in: 0,
    weight_out: 0
  };

  return (
    <BannerContainer data-testid="reception-kpi-banner">
      <KPIGrid>
        <KPIItem>
          <KPILabel>Tickets caisse</KPILabel>
          <KPIValue>{stats.tickets_count}</KPIValue>
        </KPIItem>

        <KPIItem>
          <KPILabel>CA jour</KPILabel>
          <KPIValue>{formatCurrency(stats.turnover_eur)}</KPIValue>
        </KPIItem>

        <KPIItem>
          <KPILabel>Dons jour</KPILabel>
          <KPIValue>{formatCurrency(stats.donations_eur)}</KPIValue>
        </KPIItem>

        <KPIItem>
          <KPILabel>Poids sortis</KPILabel>
          <KPIValue>{formatWeight(stats.weight_out)}</KPIValue>
        </KPIItem>

        <KPIItem>
          <KPILabel>Poids rentrés</KPILabel>
          <KPIValue>{formatWeight(stats.weight_in)}</KPIValue>
        </KPIItem>

        <KPIItem>
          <KPILabel>Objets</KPILabel>
          <KPIValue>{stats.items_received}</KPIValue>
        </KPIItem>
      </KPIGrid>

      <StatusSection>
        <LiveIndicator $isOnline={isOnline && !error}>
          {isOnline && !error ? (
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
      </StatusSection>
    </BannerContainer>
  );
};

export default ReceptionKPIBanner;

