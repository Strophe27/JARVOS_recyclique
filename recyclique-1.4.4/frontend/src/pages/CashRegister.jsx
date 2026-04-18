import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Calculator, Package, Loader2 } from 'lucide-react';
import { CashStoreProvider, useCashStores } from '../providers/CashStoreProvider';
import CashRegisterDashboard from './CashRegister/CashRegisterDashboard';

const CashRegisterContainer = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Title = styled.h1`
  color: #333;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #666;
`;

const LoadingSpinner = styled(Loader2)`
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ComingSoon = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
`;

/**
 * Composant interne qui gère la logique de redirection
 */
function CashRegisterContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cashSessionStore, isVirtualMode } = useCashStores();
  const { currentSession, fetchCurrentSession, loading } = cashSessionStore;

  // Détecter le mode depuis l'URL uniquement (pas depuis le store)
  // /caisse = toujours mode réel
  // /cash-register/virtual = mode virtuel
  const isVirtualRoute = location.pathname.includes('/virtual') && !location.pathname.startsWith('/caisse');
  const basePath = isVirtualRoute ? '/cash-register/virtual' : '/cash-register';

  useEffect(() => {
    // Vérifier l'état de la session au chargement
    const checkSessionStatus = async () => {
      await fetchCurrentSession();
    };

    checkSessionStatus();
  }, [fetchCurrentSession]);

  useEffect(() => {
    // En mode virtuel, toujours afficher le dashboard (pas de redirection auto)
    if (isVirtualRoute) {
      return; // Le dashboard virtuel s'affiche directement
    }

    // En mode réel, redirection conditionnelle basée sur l'état de la session
    if (!loading) {
      if (!currentSession) {
        // Pas de session active, rediriger vers l'ouverture de session
        navigate('/cash-register/session/open');
      } else if (currentSession.status === 'open') {
        // Session active, rediriger vers l'interface de vente
        navigate('/cash-register/sale');
      } else {
        // Session fermée, rediriger vers l'ouverture de session
        navigate('/cash-register/session/open');
      }
    }
  }, [currentSession, loading, navigate, isVirtualRoute]);

  // Toujours afficher le dashboard (il gère lui-même l'affichage selon le mode)
  // Le provider force le bon mode selon l'URL
  return <CashRegisterDashboard />;
}

/**
 * Composant principal avec le provider
 * Force le mode réel pour /caisse, mode virtuel pour /cash-register/virtual
 */
function CashRegister() {
  const location = useLocation();
  const isVirtualRoute = location.pathname.includes('/virtual') && !location.pathname.startsWith('/caisse');
  
  return (
    <CashStoreProvider forceMode={isVirtualRoute ? 'virtual' : 'real'}>
      <CashRegisterContent />
    </CashStoreProvider>
  );
}

export default CashRegister;
