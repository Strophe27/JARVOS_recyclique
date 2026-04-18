import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCashSessionStoreInjected, useCashStores } from '../../providers/CashStoreProvider';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e0e0e0;
  }
`;

const Title = styled.h1`
  color: #2e7d32;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h2`
  color: #333;
  margin: 0 0 0.75rem 0;
  font-size: 1.25rem;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 0;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryItem = styled.div`
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #2e7d32;
`;

const SummaryLabel = styled.div`
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.5rem;
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: #333;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #2e7d32;
  }

  &:invalid {
    border-color: #d32f2f;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  min-height: 40px;
  height: 40px;
  resize: vertical;
  transition: border-color 0.2s;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: #2e7d32;
  }

  &:invalid {
    border-color: #d32f2f;
  }
`;

const VarianceDisplay = styled.div<{ $hasVariance: boolean }>`
  padding: 1rem;
  border-radius: 8px;
  background: ${props => props.$hasVariance ? '#fff3e0' : '#e8f5e8'};
  border: 1px solid ${props => props.$hasVariance ? '#ff9800' : '#4caf50'};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
`;

const VarianceIcon = styled.div<{ $hasVariance: boolean }>`
  color: ${props => props.$hasVariance ? '#f57c00' : '#2e7d32'};
`;

const VarianceText = styled.div`
  font-weight: 500;
  color: #333;
`;

const VarianceAmount = styled.div<{ $hasVariance: boolean }>`
  font-size: 1.25rem;
  font-weight: bold;
  color: ${props => props.$hasVariance ? '#f57c00' : '#2e7d32'};
  margin-left: auto;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${props => props.variant === 'primary' ? `
    background: #2e7d32;
    color: white;
    
    &:hover:not(:disabled) {
      background: #1b5e20;
    }
  ` : `
    background: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    
    &:hover:not(:disabled) {
      background: #e0e0e0;
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: #ffebee;
  color: #d32f2f;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #ffcdd2;
  margin-bottom: 1rem;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export default function CloseSession() {
  const navigate = useNavigate();
  const { cashSessionStore, isVirtualMode, isDeferredMode } = useCashStores();
  const { currentSession, closeSession, refreshSession, loading, error } = cashSessionStore;

  const [actualAmount, setActualAmount] = useState<string>('');
  const [varianceComment, setVarianceComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [showEmptySessionWarning, setShowEmptySessionWarning] = useState(false);  // B44-P3: Avertissement session vide

  // Calculer les montants
  // B50-P10: S'assurer que les valeurs sont des nombres et arrondir pour éviter les problèmes d'arrondi
  // Le montant théorique = fond initial + ventes + dons
  const initialAmount = currentSession ? (Number(currentSession.initial_amount) || 0) : 0;
  const totalSales = currentSession ? (Number(currentSession.total_sales) || 0) : 0;
  const totalDonations = currentSession ? (Number(currentSession.total_donations) || 0) : 0;
  const theoreticalAmount = Math.round((initialAmount + totalSales + totalDonations) * 100) / 100; // Arrondir à 2 décimales

  const actualAmountNum = parseFloat(actualAmount) || 0;
  const variance = Math.round((actualAmountNum - theoreticalAmount) * 100) / 100; // Arrondir à 2 décimales
  const hasVariance = Math.abs(variance) > 0.05; // B50-P10: Tolérance de 5 centimes (correspond au backend)

  useEffect(() => {
    // Charger les données actualisées de la session au montage
    const loadSessionData = async () => {
      setIsLoadingSession(true);
      await refreshSession();
      setIsLoadingSession(false);
    };

    loadSessionData();
  }, [refreshSession]);

  // B44-P3: Afficher directement l'avertissement si la session est vide au chargement
  useEffect(() => {
    if (!isLoadingSession && currentSession) {
      const isEmpty = (currentSession.total_sales === 0 || currentSession.total_sales === null || currentSession.total_sales === undefined) &&
                     (currentSession.total_items === 0 || currentSession.total_items === null || currentSession.total_items === undefined);
      if (isEmpty) {
        setShowEmptySessionWarning(true);
      }
    }
  }, [isLoadingSession, currentSession]);

  useEffect(() => {
    // Rediriger si pas de session active (après le chargement initial)
    // Toujours vers /caisse qui gère les 3 modes
    if (!isLoadingSession && (!currentSession || currentSession.status !== 'open')) {
      navigate('/caisse');
    }
  }, [currentSession, navigate, isLoadingSession]);

  // B44-P3: Détecter si la session est vide (aucune transaction)
  const isSessionEmpty = currentSession && 
    (currentSession.total_sales === 0 || currentSession.total_sales === null || currentSession.total_sales === undefined) &&
    (currentSession.total_items === 0 || currentSession.total_items === null || currentSession.total_items === undefined);

  const performCloseSession = async () => {
    if (!currentSession) return;

    // B44-P3: Si la session est vide, pas besoin de saisir le montant
    if (isSessionEmpty) {
      setIsSubmitting(true);
      try {
        // Pour une session vide, on passe le montant initial comme montant physique
        // (pas d'écart possible puisqu'il n'y a pas eu de transaction)
        const success = await closeSession(currentSession.id, {
          actual_amount: currentSession.initial_amount || 0,
          variance_comment: undefined
        });

        if (success) {
          // Session vide supprimée : rediriger immédiatement
          // Ne pas attendre, rediriger tout de suite
          setShowEmptySessionWarning(false);
          navigate('/caisse');
          return;
        } else {
          console.error('[performCloseSession] Échec de la fermeture de session vide');
          // En cas d'échec, forcer le nettoyage du localStorage et rediriger quand même
          localStorage.removeItem('deferredCashSession');
          navigate('/caisse');
        }
      } catch (err) {
        console.error('Erreur lors de la fermeture de session:', err);
        // En cas d'erreur, forcer le nettoyage et rediriger
        localStorage.removeItem('deferredCashSession');
        navigate('/caisse');
      } finally {
        setIsSubmitting(false);
        setShowEmptySessionWarning(false);
      }
      return;
    }

    // Session avec transactions : valider le montant et l'écart
    // B50-P10: Recalculer la variance juste avant la validation pour éviter les problèmes d'arrondi
    // S'assurer que les valeurs sont des nombres et arrondir
    // Le montant théorique = fond initial + ventes + dons
    const initialAmount = Number(currentSession.initial_amount) || 0;
    const totalSales = Number(currentSession.total_sales) || 0;
    const totalDonations = Number(currentSession.total_donations) || 0;
    const currentTheoreticalAmount = Math.round((initialAmount + totalSales + totalDonations) * 100) / 100; // Arrondir à 2 décimales
    const currentActualAmount = parseFloat(actualAmount) || 0;
    const currentVariance = Math.round((currentActualAmount - currentTheoreticalAmount) * 100) / 100; // Arrondir à 2 décimales
    const currentHasVariance = Math.abs(currentVariance) > 0.05; // B50-P10: Tolérance de 5 centimes (correspond au backend)
    
    // B50-P10: Logs de debug pour les bénévoles
    console.log('[performCloseSession] Calcul de variance:', {
      initialAmount,
      totalSales,
      totalDonations,
      currentTheoreticalAmount,
      currentActualAmount,
      currentVariance,
      currentHasVariance,
      isDeferredMode,
      sessionId: currentSession.id,
      currentSession: currentSession
    });
    
    if (currentHasVariance && !varianceComment.trim()) {
      alert(`Un commentaire est obligatoire en cas d'écart entre le montant théorique (${currentTheoreticalAmount.toFixed(2)}€) et le montant physique (${currentActualAmount.toFixed(2)}€). Écart: ${currentVariance > 0 ? '+' : ''}${currentVariance.toFixed(2)}€`);
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await closeSession(currentSession.id, {
        actual_amount: actualAmountNum,
        variance_comment: varianceComment.trim() || undefined
      });

      if (success) {
        // Rediriger selon le mode : toujours vers le menu principal /caisse qui gère les 3 modes
        navigate('/caisse');
      }
    } catch (err: any) {
      console.error('Erreur lors de la fermeture de session:', err);
      // B50-P10: Afficher le message d'erreur du backend à l'utilisateur
      const errorMessage = err?.message || err?.response?.data?.detail || 'Erreur lors de la fermeture de session';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
      setShowEmptySessionWarning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentSession) return;

    // B44-P3: Si la session est vide, l'avertissement est déjà affiché au chargement
    // On ne devrait pas arriver ici si la session est vide (le formulaire est masqué)
    if (isSessionEmpty) {
      return;
    }

    await performCloseSession();
  };

  const handleCancel = () => {
    // Retourner à la vente avec le bon chemin selon le mode
    const basePath = isDeferredMode ? '/cash-register/deferred' : (isVirtualMode ? '/cash-register/virtual' : '/cash-register');
    navigate(`${basePath}/sale`);
  };

  if (isLoadingSession || !currentSession || currentSession.status !== 'open') {
    return (
      <Container>
        <Header>
          <Title>
            <Calculator size={24} />
            Fermeture de Caisse
          </Title>
        </Header>
        {isLoadingSession && (
          <Card>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <LoadingSpinner />
              <p style={{ marginTop: '1rem' }}>Chargement des données de la session...</p>
            </div>
          </Card>
        )}
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={() => {
          const basePath = isDeferredMode ? '/cash-register/deferred' : (isVirtualMode ? '/cash-register/virtual' : '/cash-register');
          navigate(`${basePath}/sale`);
        }}>
          <ArrowLeft size={20} />
          Retour à la vente
        </BackButton>
        <Title>
          <Calculator size={24} />
          Fermeture de Caisse
        </Title>
      </Header>

      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}

      {/* B44-P3: Avertissement pour session vide - affiché directement si session vide */}
      {showEmptySessionWarning && isSessionEmpty ? (
        <Card style={{ border: '2px solid #ff9800', backgroundColor: '#fff3e0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <AlertTriangle size={24} color="#ff9800" />
            <h3 style={{ margin: 0, color: '#e65100' }}>Session sans transaction</h3>
          </div>
          <p style={{ marginBottom: '1rem', color: '#5d4037' }}>
            Cette session n'a eu aucune transaction (aucune vente). Elle ne sera pas enregistrée dans l'historique.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={async () => {
                await performCloseSession();
                // Redirection déjà gérée dans performCloseSession, mais on s'assure qu'elle se fait
                if (!isSubmitting) {
                  navigate('/caisse');
                }
              }}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Suppression...' : 'Continuer quand même'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f5f5f5',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              Annuler
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Formulaire de fermeture normal (seulement si session avec transactions) */}
          <Card>
        <SectionTitle>Résumé de la Session</SectionTitle>
        <SummaryGrid>
          <SummaryItem>
            <SummaryLabel>Fond de Caisse Initial</SummaryLabel>
            <SummaryValue>{currentSession.initial_amount?.toFixed(2)} €</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>Total des Ventes</SummaryLabel>
            <SummaryValue>{currentSession.total_sales?.toFixed(2) || '0.00'} €</SummaryValue>
          </SummaryItem>
          {totalDonations > 0 && (
            <SummaryItem>
              <SummaryLabel>Total des Dons</SummaryLabel>
              <SummaryValue>{totalDonations.toFixed(2)} €</SummaryValue>
            </SummaryItem>
          )}
          <SummaryItem>
            <SummaryLabel>Montant Théorique</SummaryLabel>
            <SummaryValue>{theoreticalAmount.toFixed(2)} €</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>Articles Vendus</SummaryLabel>
            <SummaryValue>{currentSession.total_items || 0}</SummaryValue>
          </SummaryItem>
        </SummaryGrid>
      </Card>

      <Card>
        <SectionTitle>Contrôle des Montants</SectionTitle>
        
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="actual-amount">
              Montant Physique Compté *
            </Label>
            <Input
              id="actual-amount"
              type="number"
              step="0.01"
              min="0"
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </FormGroup>

          {actualAmount && (
            <VarianceDisplay $hasVariance={hasVariance}>
              <VarianceIcon $hasVariance={hasVariance}>
                {hasVariance ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
              </VarianceIcon>
              <VarianceText>
                {hasVariance ? 'Écart détecté' : 'Aucun écart'}
              </VarianceText>
              <VarianceAmount $hasVariance={hasVariance}>
                {variance > 0 ? '+' : ''}{variance.toFixed(2)} €
              </VarianceAmount>
            </VarianceDisplay>
          )}

          {hasVariance && (
            <FormGroup>
              <Label htmlFor="variance-comment">
                Commentaire sur l'écart *
              </Label>
              <TextArea
                id="variance-comment"
                value={varianceComment}
                onChange={(e) => setVarianceComment(e.target.value)}
                placeholder="Expliquez la raison de l'écart..."
                required
              />
            </FormGroup>
          )}

          <ButtonGroup>
            <Button type="button" onClick={handleCancel}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={isSubmitting || !actualAmount || (hasVariance && !varianceComment.trim())}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  Fermeture en cours...
                </>
              ) : (
                'Fermer la Session'
              )}
            </Button>
          </ButtonGroup>
        </Form>
      </Card>
        </>
      )}
    </Container>
  );
}
