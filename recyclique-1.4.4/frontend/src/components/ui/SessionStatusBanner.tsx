import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AlertCircle, RefreshCw, Wifi, WifiOff, CheckCircle2, LogIn } from 'lucide-react';
import { useSessionHeartbeat } from '../../hooks/useSessionHeartbeat';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

const BannerContainer = styled.div<{ $severity: 'info' | 'warning' | 'error' | 'success' }>`
  background: ${props => {
    switch (props.$severity) {
      case 'error':
        return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      case 'warning':
        return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      case 'info':
        return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      case 'success':
        return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      default:
        return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    }
  }};
  color: white;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-height: 50px;
  position: sticky;
  top: 0;
  z-index: 1000;

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
`;

const BannerContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  font-size: 0.9rem;
`;

const BannerIcon = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const BannerMessage = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const BannerTitle = styled.span`
  font-weight: 600;
  font-size: 0.95rem;
`;

const BannerSubtitle = styled.span`
  font-size: 0.85rem;
  opacity: 0.9;
`;

const BannerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.4);
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

/**
 * Format time in milliseconds to human-readable string
 */
function formatTimeRemaining(ms: number): string {
  if (ms < 0) {
    return 'expiré';
  }
  
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes} min ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * SessionStatusBanner component
 * 
 * Displays session status with countdown and actions:
 * - Success: Session secure, token valid
 * - Warning: Token expiring soon, refresh in progress
 * - Error: Connection lost, refresh failed
 * 
 * B42-P3: Implements AC4 - Gestion offline & alertes
 */
export const SessionStatusBanner: React.FC = () => {
  // ⚠️ IMPORTANT: Tous les hooks doivent être appelés AVANT tout return conditionnel
  // pour respecter les règles des Hooks de React
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tokenExpiration = useAuthStore((state) => state.tokenExpiration);
  const { 
    timeUntilExpiration, 
    isExpiringSoon, 
    isRefreshing,
    refreshToken,
    isTabVisible,
    hasRecentActivity,
    refreshFailed,
    clearRefreshFailed
  } = useSessionHeartbeat();
  
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Calculate countdown directly from tokenExpiration to ensure immediate update after refresh
  // This avoids the delay from timeUntilExpiration recalculation
  useEffect(() => {
    if (!isAuthenticated || !tokenExpiration) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = tokenExpiration > now ? tokenExpiration - now : 0;
      setCountdown(remaining);
    };

    // Update immediately
    updateCountdown();
    console.debug('Countdown reset to:', tokenExpiration, 'ms from now (', Math.round((tokenExpiration - Date.now()) / 1000), 'seconds)');

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, tokenExpiration]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show banner if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // B42-P6: Banner is hidden by default, only shown for errors/inactivity/warnings
  // Determine severity and message
  let severity: 'info' | 'warning' | 'error' | 'success' = 'success';
  let title = 'Session sécurisée';
  let subtitle = '';
  let showActions = false;
  let shouldShow = false;

  // Priority 1: Connection lost (always show)
  if (!isOnline) {
    severity = 'error';
    title = 'Connexion perdue';
    subtitle = 'Vérifiez votre connexion internet. La session expirera si la connexion n\'est pas rétablie.';
    showActions = true;
    shouldShow = true;
  }
  // Priority 2: Refresh failed (error state) - only show if it's a real error, not inactivity
  else if (refreshFailed && !isRefreshing) {
    severity = 'error';
    title = 'Connexion perdue';
    subtitle = 'Impossible de renouveler la session. Vérifiez votre connexion et cliquez sur "Actualiser".';
    showActions = true;
    shouldShow = true;
  }
  // Priority 3: Refreshing (show info during refresh)
  else if (isRefreshing) {
    if (!hasRecentActivity) {
      // Refreshing but user inactive - show info
      severity = 'info';
      title = 'Actualisation de la session...';
      subtitle = 'Votre session est en cours de renouvellement.';
      shouldShow = true;
    } else {
      // Refreshing with active user - hide (silent refresh)
      shouldShow = false;
    }
  }
  // Priority 4: User inactive and token expiring
  else if (!hasRecentActivity && (isExpiringSoon || (countdown !== null && countdown < 60000))) {
    severity = 'warning';
    title = 'Session expirant - inactivité détectée';
    subtitle = `La session expirera dans ${formatTimeRemaining(countdown || 0)}. Vous êtes inactif depuis plus de 5 minutes.`;
    showActions = true;
    shouldShow = true;
  }
  // Priority 5: Token expiring soon (user active but token expiring)
  else if (isExpiringSoon && hasRecentActivity) {
    // Check if session is too short for automatic refresh
    const timeUntilExp = timeUntilExpiration || 0;
    const minutesUntilExp = timeUntilExp / (60 * 1000);
    if (minutesUntilExp < 2) {
      // Session too short - show warning, allow manual refresh
      severity = 'warning';
      title = 'Session expirant bientôt';
      subtitle = `La session expirera dans ${formatTimeRemaining(countdown || 0)}. Cliquez sur "Actualiser" pour renouveler.`;
      showActions = true;
      shouldShow = true;
    } else {
      // Should trigger automatic refresh - hide banner (refresh in progress or will happen)
      shouldShow = false;
    }
  }
  // Priority 6: Everything fine - hide banner
  else if (hasRecentActivity && !isExpiringSoon) {
    shouldShow = false;
  }
  // Fallback: show warning if expiring soon
  else if (isExpiringSoon || (countdown !== null && countdown < 120000)) {
    severity = 'warning';
    title = 'Session expirant bientôt';
    subtitle = `La session expirera dans ${formatTimeRemaining(countdown || 0)}.`;
    showActions = true;
    shouldShow = true;
  }

  // B42-P6: Hide banner by default if user is active and refresh succeeded
  if (!shouldShow) {
    return null;
  }

  const handleRefresh = async () => {
    try {
      // The hook's refreshToken already handles clearRefreshFailed internally
      const success = await refreshToken();
      if (success) {
        console.debug('Manual refresh succeeded');
        // Banner will hide automatically when refreshFailed becomes false
      } else {
        console.warn('Manual refresh failed');
        // Banner will show error state when refreshFailed becomes true
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  };

  const handleReconnect = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <BannerContainer $severity={severity}>
      <BannerContent>
        <BannerIcon>
          {severity === 'error' && <AlertCircle size={20} />}
          {severity === 'warning' && <AlertCircle size={20} />}
          {severity === 'info' && <RefreshCw size={20} className={isRefreshing ? 'spinning' : ''} />}
          {severity === 'success' && <CheckCircle2 size={20} />}
        </BannerIcon>
        <BannerMessage>
          <BannerTitle>{title}</BannerTitle>
          {subtitle && <BannerSubtitle>{subtitle}</BannerSubtitle>}
        </BannerMessage>
        {!isOnline && (
          <BannerIcon>
            <WifiOff size={18} />
          </BannerIcon>
        )}
        {isOnline && !isTabVisible && (
          <BannerIcon>
            <Wifi size={18} />
          </BannerIcon>
        )}
      </BannerContent>
      {showActions && (
        <BannerActions>
          {severity === 'error' && (
            <ActionButton 
              onClick={handleReconnect} 
              title="Se reconnecter"
            >
              <LogIn size={16} />
              Se reconnecter
            </ActionButton>
          )}
          <ActionButton 
            onClick={handleRefresh} 
            disabled={isRefreshing || !isOnline}
            title="Forcer le rafraîchissement de la session"
          >
            <RefreshCw size={16} className={isRefreshing ? 'spinning' : ''} />
            Actualiser
          </ActionButton>
        </BannerActions>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </BannerContainer>
  );
};

