// Force rebuild: 2025-10-09 01:53
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useCashSessionStoreInjected, useCategoryStoreInjected, usePresetStoreInjected, useCashStores } from '../../providers/CashStoreProvider';
import { useAuthStore } from '../../stores/authStore';
import SaleWizard from '../../components/business/SaleWizard';
import Ticket from '../../components/business/Ticket';
import FinalizationScreen, { FinalizationData } from '../../components/business/FinalizationScreen';
import CashSessionHeader from '../../components/business/CashSessionHeader';
import CashKPIBanner from '../../components/business/CashKPIBanner';
import { Numpad } from '../../components/ui/Numpad';
import type { SaleItemData } from '../../components/business/SaleWizard';
import { useCashWizardStepState } from '../../hooks/useCashWizardStepState';

// ===== KIOSK MODE LAYOUT =====

const KioskContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  overflow: hidden;
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: 1fr auto; /* Ligne contenu + ligne footer */
  flex: 1;
  overflow: hidden;
  max-height: calc(100vh - 50px);
  gap: 0;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr 2fr;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto; /* Pas de footer fixe sur mobile */
    overflow-y: auto;
    overflow-x: hidden;
  }
`;

const LeftColumn = styled.div`
  background: white;
  border-right: 1px solid #e0e0e0;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  /* Hide numpad column when in category/subcategory mode */
  &:has(+ [data-wizard-step="idle"]) {
    display: none;
  }

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
    min-height: 200px;
    padding: 0.75rem;
  }
`;

const CenterColumn = styled.div`
  background: white;
  border-right: 1px solid #e0e0e0;
  padding: 1.5rem;
  overflow: hidden;
  display: grid;
  grid-template-rows: 1fr auto; /* Contenu + Footer */
  gap: 1rem;

  /* Span 2 columns when in category/subcategory mode (numpad hidden) */
  &[data-wizard-step="idle"] {
    grid-column: span 2;
  }

  @media (max-width: 1200px) {
    border-right: none;
  }

  @media (max-width: 768px) {
    padding: 1rem;
    overflow: visible;
    grid-column: span 1;
    grid-template-rows: auto; /* Pas de footer fixe sur mobile */
  }
`;

const RightColumn = styled.div`
  background: white;
  padding: 1rem;
  overflow: hidden;
  display: grid;
  grid-template-rows: 1fr auto; /* Contenu + Footer */

  @media (max-width: 1200px) {
    display: none;
  }

  @media (max-width: 768px) {
    display: grid;
    border-top: 1px solid #e0e0e0;
    grid-template-rows: auto; /* Pas de footer fixe sur mobile */
  }
`;

const Sale: React.FC = () => {
  const navigate = useNavigate();
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [finalizationData, setFinalizationData] = useState<FinalizationData | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState<boolean>(false);
  const [lastTicketAmount, setLastTicketAmount] = useState<number>(0);

  // Numpad state - separated by step type
  const [quantityValue, setQuantityValue] = useState<string>('1');
  const [quantityError, setQuantityError] = useState<string>('');
  const [quantityIsDefault, setQuantityIsDefault] = useState<boolean>(true); // Track if quantity is still at default value "1"
  const [priceValue, setPriceValue] = useState<string>('');
  const [pricePrefilled, setPricePrefilled] = useState<boolean>(false);
  const [priceError, setPriceError] = useState<string>('');
  const [weightValue, setWeightValue] = useState<string>('');
  const [weightError, setWeightError] = useState<string>('');
  const [numpadMode, setNumpadMode] = useState<'quantity' | 'price' | 'weight' | 'idle'>('idle');

  // Utiliser les stores injectés (réel ou virtuel selon le contexte)
  const cashSessionStore = useCashSessionStoreInjected();
  const { isDeferredMode, isVirtualMode } = useCashStores();  // B44-P1, B49-P3
  const {
    currentSession,
    currentSaleItems,
    currentSaleNote,  // Story B40-P1: Notes sur les tickets de caisse
    addSaleItem,
    removeSaleItem,
    updateSaleItem,
    setCurrentSaleNote,  // Story B40-P1: Notes sur les tickets de caisse
    submitSale,
    loading,
    currentRegisterOptions  // B49-P3: Options de workflow du register
  } = cashSessionStore;

  const { currentUser } = useAuthStore();
  const { getCategoryById, fetchCategories } = useCategoryStoreInjected();
  const { clearSelection, selectedPreset, notes } = usePresetStoreInjected();
  const { stepState } = useCashWizardStepState();  // Story B49-P2: Pour détecter l'étape Catégorie
  
  // B44-P1: Vérifier si la session est différée ET OUVERTE
  const isDeferredSession = useMemo(() => {
    if (!currentSession || !isDeferredMode) return false;
    // La session doit être OUVERTE pour être considérée comme active
    if (currentSession.status !== 'open') return false;
    if (currentSession.opened_at) {
      const openedAtDate = new Date(currentSession.opened_at);
      const now = new Date();
      return openedAtDate < now;
    }
    return false;
  }, [currentSession, isDeferredMode]);
  
  // B44-P1: Formater la date de session pour affichage
  const formattedSessionDate = useMemo(() => {
    if (!currentSession?.opened_at || !isDeferredSession) return null;
    // B44-P1: Corriger le formatage de date en gérant le timezone
    const date = new Date(currentSession.opened_at);
    // Utiliser UTC pour éviter les problèmes de timezone
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }, [currentSession, isDeferredSession]);

  // Numpad handlers - défini AVANT les useEffect qui l'utilisent
  const getCurrentValue = () => {
    switch (numpadMode) {
      case 'quantity': return quantityValue;
      case 'price': return priceValue;
      case 'weight': return weightValue;
      default: return '';
    }
  };

  const getCurrentError = () => {
    switch (numpadMode) {
      case 'quantity': return quantityError;
      case 'price': return priceError;
      case 'weight': return weightError;
      default: return '';
    }
  };

  const setCurrentValue = (value: string) => {
    switch (numpadMode) {
      case 'quantity': 
        setQuantityValue(value);
        // Si on réinitialise à "1", c'est la valeur par défaut
        if (value === '1') {
          setQuantityIsDefault(true);
        } else {
          setQuantityIsDefault(false);
        }
        break;
      case 'price': setPriceValue(value); break;
      case 'weight': setWeightValue(value); break;
    }
  };
  
  // Wrapper pour setQuantityValue qui gère aussi quantityIsDefault
  const setQuantityValueWithDefault = (value: string) => {
    setQuantityValue(value);
    if (value === '1') {
      setQuantityIsDefault(true);
    } else {
      setQuantityIsDefault(false);
    }
  };

  const setCurrentError = (error: string) => {
    switch (numpadMode) {
      case 'quantity': setQuantityError(error); break;
      case 'price': setPriceError(error); break;
      case 'weight': setWeightError(error); break;
    }
  };

  const numpadCallbacks = {
    quantityValue,
    quantityError,
    priceValue,
    priceError,
    weightValue,
    weightError,
    setQuantityValue: setQuantityValueWithDefault, // Utiliser le wrapper qui gère quantityIsDefault
    setQuantityError,
    setPriceValue,
    setPriceError,
    setWeightValue,
    setWeightError,
    setMode: setNumpadMode,
    setPricePrefilled: setPricePrefilled
  };

  // Load categories on component mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!currentSession) {
      navigate('/cash-register');
    }
  }, [currentSession, navigate]);

  // Auto-focus sur le champ prix à l'entrée de l'écran d'encaissement (B39-P4)
  useEffect(() => {
    if (currentSession && numpadMode === 'idle') {
      // Délai pour s'assurer que le DOM est rendu
      const timer = setTimeout(() => {
        const priceInput = document.querySelector('[data-testid="price-input"]');
        if (priceInput instanceof HTMLElement) {
          priceInput.focus();
          // Basculer automatiquement vers le mode prix
          numpadCallbacks.setMode('price');
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentSession, numpadMode, numpadCallbacks]);

  const handleItemComplete = (itemData: SaleItemData) => {
    // Get category names from the category store
    const category = getCategoryById(itemData.category);
    const subcategory = itemData.subcategory ? getCategoryById(itemData.subcategory) : null;


    addSaleItem({
      category: itemData.category,
      subcategory: itemData.subcategory,
      categoryName: category?.name,
      subcategoryName: subcategory?.name,
      quantity: itemData.quantity,
      weight: itemData.weight,
      price: itemData.price,
      total: itemData.total,
      presetId: itemData.preset_id,  // Utiliser le preset_id de l'item (déjà isolé par transaction)
      notes: itemData.notes  // Utiliser les notes de l'item (déjà isolées par transaction)
    });

    // Plus besoin de clearSelection() - l'état est maintenant géré par transaction dans SaleWizard
  };

  const handleFinalizeSale = async () => {
    if (currentSaleItems.length === 0) return;
    setIsFinalizing(true);
  };

  const handleCloseSession = () => {
    // Utiliser le bon chemin selon le mode (détecté depuis l'URL ou le store)
    const isVirtual = window.location.pathname.includes('/virtual');
    const isDeferred = window.location.pathname.includes('/deferred') || isDeferredMode;
    let basePath: string;
    if (isDeferred) {
      basePath = '/cash-register/deferred';
    } else if (isVirtual) {
      basePath = '/cash-register/virtual';
    } else {
      basePath = '/cash-register';
    }
    navigate(`${basePath}/session/close`);
  };

  if (!currentSession) {
    return null;
  }

  const ticketTotal = useMemo(() => currentSaleItems.reduce((sum, it) => sum + (it.total || 0), 0), [currentSaleItems]);
  
  // Nom du caissier pour le header
  const cashierName = currentUser 
    ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username || 'Caissier'
    : 'Caissier';

  const handleCancelFinalization = () => {
    setIsFinalizing(false);
    setFinalizationData(null);
  };

  const handleConfirmFinalization = async (data: FinalizationData) => {
    setFinalizationData(data);
    setIsFinalizing(false);

    // Calculer le montant total avant soumission
    const totalAmount = ticketTotal + (data.donation || 0);

    const success = await submitSale(currentSaleItems, data);
    if (success) {
      // Enregistrer le montant du dernier ticket validé
      setLastTicketAmount(totalAmount);

      // Effacer la sélection de preset après une vente réussie
      clearSelection();

      // Afficher une popup de succès qui disparaît automatiquement après 3 secondes
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
    } else {
      const storeError = cashSessionStore.error;
      alert(`❌ Erreur lors de l'enregistrement de la vente: ${storeError || 'Erreur inconnue'}`);
    }
  };

  // Numpad handlers
  const handleNumpadDigit = (digit: string) => {
    const currentValue = getCurrentValue();

    if (numpadMode === 'quantity') {
      // Logique pour la quantité :
      // - Par défaut : "1" est affiché et quantityIsDefault = true
      // - Si quantityIsDefault = true ET currentValue === '1' : le premier chiffre tapé remplace le "1"
      // - Sinon : ajouter normalement (concaténation) pour permettre "11", "15", etc.
      console.log('[handleNumpadDigit] quantity mode:', {
        digit,
        currentValue,
        quantityIsDefault,
        numpadMode
      });
      
      let newValue: string;
      const shouldReplace = quantityIsDefault && currentValue === '1';
      
      console.log('[handleNumpadDigit] shouldReplace:', shouldReplace);
      
      if (shouldReplace) {
        // Si c'est la valeur par défaut "1", remplacer par le chiffre tapé
        // Exemple: tape "1" → remplace "1" par "1" (reste "1" mais quantityIsDefault devient false)
        //          tape "5" → remplace "1" par "5" (devient "5")
        newValue = digit;
        console.log('[handleNumpadDigit] REPLACING default "1" with:', digit, '→ newValue:', newValue);
      } else {
        // Sinon, ajouter normalement (concaténation) pour permettre les nombres à plusieurs chiffres
        // Exemple: si currentValue = "1" (mais quantityIsDefault = false), on concatène pour faire "11", "15", etc.
        newValue = currentValue + digit;
        console.log('[handleNumpadDigit] CONCATENATING:', currentValue, '+', digit, '→ newValue:', newValue);
      }
      
      // Toujours mettre quantityIsDefault à false après une saisie (sauf si on réinitialise explicitement)
      setQuantityIsDefault(false);
      console.log('[handleNumpadDigit] Set quantityIsDefault to false');

      if (/^\d*$/.test(newValue) && parseInt(newValue || '0', 10) <= 9999) {
        // Pour la quantité, empêcher les valeurs < 1
        const numValue = parseInt(newValue || '0', 10);
        if (numValue >= 1) {
          // Utiliser setQuantityValue directement (pas le wrapper) car on gère quantityIsDefault manuellement
          console.log('[handleNumpadDigit] Setting quantityValue to:', newValue);
          setQuantityValue(newValue);
          setQuantityError('');
        } else {
          console.log('[handleNumpadDigit] Rejected: numValue < 1:', numValue);
        }
      } else {
        console.log('[handleNumpadDigit] Rejected: invalid format or > 9999');
      }
    } else if (numpadMode === 'price') {
      const newValue = pricePrefilled ? digit : currentValue + digit;
      if (/^\d*\.?\d{0,2}$/.test(newValue) && parseFloat(newValue || '0') <= 9999.99) {
        setPriceValue(newValue);
        setPriceError('');
        setPricePrefilled(false);
      }
    } else if (numpadMode === 'weight') {
      const newValue = currentValue + digit;
      if (/^\d*\.?\d{0,2}$/.test(newValue) && parseFloat(newValue || '0') <= 9999.99) {
        setWeightValue(newValue);
        setWeightError('');
      }
    }
  };

  const handleNumpadClear = useCallback(() => {
    setCurrentValue('');
    setCurrentError('');
    if (numpadMode === 'price') {
      setPricePrefilled(false);
    } else if (numpadMode === 'quantity') {
      setQuantityValueWithDefault('1'); // Réinitialiser à la valeur par défaut (gère aussi quantityIsDefault)
    }
  }, [numpadMode, getCurrentValue, setCurrentValue, setCurrentError, setQuantityValueWithDefault, setPricePrefilled]);

  const handleNumpadBackspace = useCallback(() => {
    if (numpadMode === 'price' && pricePrefilled) {
      setPriceValue('');
      setPricePrefilled(false);
      return;
    }
    const newValue = getCurrentValue().slice(0, -1);
    if (numpadMode === 'quantity' && (newValue === '' || newValue === '0')) {
      // Si on efface tout ou qu'on arrive à 0, remettre "1" par défaut
      setQuantityValue('1');
      setQuantityIsDefault(true);
    } else if (numpadMode === 'quantity') {
      // Pour la quantité, utiliser setQuantityValue directement et gérer quantityIsDefault
      setQuantityValue(newValue);
      setQuantityIsDefault(false); // Après backspace, ce n'est plus la valeur par défaut
    } else {
      setCurrentValue(newValue);
    }
  }, [numpadMode, pricePrefilled, getCurrentValue, setQuantityValue, setQuantityIsDefault, setPriceValue, setPricePrefilled, setCurrentValue]);

  const handleNumpadDecimal = useCallback(() => {
    const currentValue = getCurrentValue();
    if ((numpadMode === 'price' || numpadMode === 'weight') && !currentValue.includes('.')) {
      if (numpadMode === 'price' && pricePrefilled) {
        setPriceValue('0.');
        setPricePrefilled(false);
        return;
      }
      setCurrentValue(currentValue + '.');
    }
  }, [numpadMode, pricePrefilled, getCurrentValue, setPriceValue, setPricePrefilled, setCurrentValue]);

  // Mapping AZERTY vers chiffres (comme en Réception)
  const AZERTY_NUMERIC_MAP: Record<string, string> = {
    '&': '1',
    'é': '2',
    '"': '3',
    "'": '4',
    '(': '5',
    '-': '6',
    'è': '7',
    '_': '8',
    'ç': '9',
    'à': '0'
  };

  // Gestionnaires de raccourcis clavier globaux
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorer si on est dans un input ou textarea
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Raccourcis pour les chiffres directs (0-9) - gère aussi le pavé numérique
      // Vérifier event.key (qui donne le caractère) et event.code (qui donne la touche physique)
      let digit: string | null = null;
      
      // D'abord vérifier event.key (fonctionne pour la plupart des cas)
      if (event.key >= '0' && event.key <= '9') {
        digit = event.key;
      }
      // Sinon, vérifier event.code pour les touches du pavé numérique
      else if (event.code.startsWith('Numpad')) {
        // Extraire le chiffre de "Numpad0", "Numpad1", ..., "Numpad9"
        const numpadMatch = event.code.match(/^Numpad(\d)$/);
        if (numpadMatch) {
          digit = numpadMatch[1];
        }
      }
      // Gérer aussi les codes Digit0-Digit9 (touches numériques en haut du clavier)
      else if (event.code.startsWith('Digit')) {
        const digitMatch = event.code.match(/^Digit(\d)$/);
        if (digitMatch) {
          digit = digitMatch[1];
        }
      }
      
      if (digit) {
        event.preventDefault();
        handleNumpadDigit(digit);
        return;
      }

      // Raccourcis AZERTY pour les chiffres (comme en Réception)
      if (AZERTY_NUMERIC_MAP[event.key]) {
        event.preventDefault();
        handleNumpadDigit(AZERTY_NUMERIC_MAP[event.key]);
        return;
      }

      // Raccourci pour le point décimal
      if (event.key === '.' || event.key === ',') {
        event.preventDefault();
        handleNumpadDecimal();
        return;
      }
      
      // Raccourci pour effacer (Backspace)
      if (event.key === 'Backspace') {
        event.preventDefault();
        handleNumpadBackspace();
        return;
      }
      
      // Raccourci pour tout effacer (Escape)
      if (event.key === 'Escape') {
        event.preventDefault();
        handleNumpadClear();
        return;
      }
      
      // Story B49-P2: Raccourci Enter sur onglet Catégorie = Finaliser la vente
      if (event.key === 'Enter' && stepState.currentStep === 'category' && currentSaleItems.length > 0) {
        event.preventDefault();
        handleFinalizeSale();
        return;
      }

      // Raccourci pour "+" (touche "=" en AZERTY) en mode weight pour ajouter une pesée
      // Laisser MultipleWeightEntry gérer le "+" directement, mais mapper "=" vers "+"
      if (numpadMode === 'weight' && event.key === '=') {
        event.preventDefault();
        // Simuler un événement "+" pour que MultipleWeightEntry le gère
        const plusEvent = new KeyboardEvent('keydown', {
          key: '+',
          code: 'Equal',
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(plusEvent);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [numpadMode, quantityValue, priceValue, weightValue, handleNumpadDigit, handleNumpadBackspace, handleNumpadClear, handleNumpadDecimal, stepState.currentStep, currentSaleItems.length, handleFinalizeSale]);

  return (
    <KioskContainer>
      {/* Header de session en haut */}
      <CashSessionHeader
        cashierName={cashierName}
        sessionId={currentSession.id}
        onCloseSession={handleCloseSession}
        isLoading={loading}
        isDeferred={isDeferredSession}
        deferredDate={formattedSessionDate}
      />

      {/* Bandeau KPI temps réel (B40-P2) */}
      <CashKPIBanner lastTicketAmount={lastTicketAmount} />

      {/* Layout principal à 3 colonnes: Numpad | Action Zone | Ticket */}
      <MainLayout>
        {/* Colonne de gauche - Numpad unifié (présent à partir de Poids) */}
        <LeftColumn>
          {numpadMode !== 'idle' ? (
            <Numpad
              value={getCurrentValue()}
              error={getCurrentError()}
              onDigit={handleNumpadDigit}
              onClear={handleNumpadClear}
              onBackspace={handleNumpadBackspace}
              onDecimal={(numpadMode === 'price' || numpadMode === 'weight') ? handleNumpadDecimal : undefined}
              unit={numpadMode === 'price' ? '€' : numpadMode === 'weight' ? 'kg' : ''}
              showDecimal={numpadMode === 'price' || numpadMode === 'weight'}
              placeholder="0"
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '2rem'
            }}>
              Sélectionnez une étape nécessitant une saisie numérique
            </div>
          )}
        </LeftColumn>

        {/* Colonne centrale - SaleWizard (s'étend sur colonnes 1+2 pour catégories) */}
        <CenterColumn data-wizard-step={numpadMode}>
          <SaleWizard
            onItemComplete={handleItemComplete}
            numpadCallbacks={numpadCallbacks}
            currentMode={numpadMode}
            registerOptions={currentRegisterOptions}  // B49-P3: Passer les options héritées
          />

          {/* Success popup */}
          {showSuccessPopup && (
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#4caf50',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              zIndex: 3000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              textAlign: 'center'
            }}>
              ✅ Vente enregistrée avec succès !
            </div>
          )}
        </CenterColumn>

        {/* Colonne de droite - Ticket */}
        <RightColumn>
          <Ticket
            items={currentSaleItems.map(it => ({ ...it, total: it.total }))}
            onRemoveItem={removeSaleItem}
            onUpdateItem={updateSaleItem}
            onFinalizeSale={handleFinalizeSale}
            loading={loading}
            saleNote={currentSaleNote}
          />
        </RightColumn>
      </MainLayout>

      {/* Finalization modal (overlay) */}
      <FinalizationScreen
        open={isFinalizing}
        totalAmount={ticketTotal}
        onCancel={handleCancelFinalization}
        onConfirm={handleConfirmFinalization}
        saleNote={currentSaleNote}
        onSaleNoteChange={setCurrentSaleNote}
        items={currentSaleItems}  // Story B49-P2: Passer les items pour calculer sous-total
      />
    </KioskContainer>
  );
};

export default Sale;