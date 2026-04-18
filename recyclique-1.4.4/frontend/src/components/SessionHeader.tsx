import React from 'react';
import styled from 'styled-components';
import { ArrowLeft, Check } from 'lucide-react';
import { IconCalendar } from '@tabler/icons-react';

const HeaderContainer = styled.div<{ $hasDeferred: boolean }>`
  display: grid;
  grid-template-columns: ${props => props.$hasDeferred ? '1fr auto 1fr' : '1fr auto'};
  align-items: center;
  padding: 12px 24px;
  background: #2e7d32;
  color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 1rem;

  @media (max-width: 480px) {
    padding: 8px 12px;
    gap: 0.5rem;
  }
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  justify-self: start;

  @media (max-width: 480px) {
    gap: 8px;
  }
`;

const MiddleSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-self: center;
`;

const DeferredBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 152, 0, 0.2);
  border: 1px solid rgba(255, 152, 0, 0.4);
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #ff9800;
  
  @media (max-width: 768px) {
    font-size: 0.75rem;
    padding: 0.4rem 0.8rem;
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: 11px;
    gap: 4px;

    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

const TicketTitle = styled.h1`
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;

  @media (max-width: 480px) {
    font-size: 0.9rem;
  }
`;

const CloseTicketButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #ffc107;
  color: #212529;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);

  &:hover {
    background: #ffca28;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: 10px;
    gap: 4px;
    white-space: nowrap;

    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

interface SessionHeaderProps {
  ticketId: string;
  onBack?: () => void;
  onCloseTicket: () => void;
  isLoading?: boolean;
  title?: string; // Titre personnalisé (par défaut: Ticket #ID)
  showBackButton?: boolean; // Afficher le bouton retour (par défaut: true)
  isDeferred?: boolean; // Mode saisie différée
  deferredDate?: string | null; // Date du poste différé
}

const SessionHeader: React.FC<SessionHeaderProps> = ({
  ticketId,
  onBack,
  onCloseTicket,
  isLoading = false,
  title,
  showBackButton = true,
  isDeferred = false,
  deferredDate = null
}) => {
  // Afficher les 8 derniers caractères de l'ID du ticket
  const shortTicketId = ticketId.slice(-8);
  const displayTitle = title || `Ticket #${shortTicketId}`;

  // Formater la date du poste différé
  const formatDeferredDate = (dateString: string | null): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const hasDeferred = isDeferred && deferredDate;

  return (
    <HeaderContainer $hasDeferred={hasDeferred}>
      <LeftSection>
        {showBackButton && onBack && (
          <BackButton onClick={onBack}>
            <ArrowLeft size={20} />
            Retour
          </BackButton>
        )}
        <TicketTitle>{displayTitle}</TicketTitle>
      </LeftSection>
      {hasDeferred && (
        <MiddleSection>
          <DeferredBadge data-testid="deferred-reception-badge">
            <IconCalendar size={14} />
            <span>Saisie différée - {formatDeferredDate(deferredDate)}</span>
          </DeferredBadge>
        </MiddleSection>
      )}
      <CloseTicketButton onClick={onCloseTicket} disabled={isLoading} style={{ justifySelf: 'end' }}>
        <Check size={20} />
        Clôturer le ticket
      </CloseTicketButton>
    </HeaderContainer>
  );
};

export default SessionHeader;
