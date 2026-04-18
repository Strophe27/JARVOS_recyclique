import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import styled from 'styled-components';
import { Textarea } from '@mantine/core';
import { Heart, CreditCard, StickyNote, Coins } from 'lucide-react';
import { useFeatureFlag } from '../../utils/features';
import { SaleItem } from '../../stores/interfaces/ICashSessionStore';  // B50-P10: Type centralisé
import { useCashStores } from '../../providers/CashStoreProvider';

const Backdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: ${p => (p.$open ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const Modal = styled.div`
  background: #fff;
  border-radius: 8px;
  padding: 1.5rem;
  min-width: 420px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);

  @media (max-width: 480px) {
    min-width: 95vw;
    padding: 1rem;
    border-radius: 12px;
  }
`;

const Title = styled.h3`
  margin: 0 0 1rem 0;
  color: #2c5530;
`;

const InfoMessage = styled.div`
  background: #e8f5e8;
  border: 1px solid #2c5530;
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  color: #2c5530;
  font-size: 0.9rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Row = styled.div`
  display: flex;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1.25rem;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  position: relative;
`;

const Label = styled.label`
  font-weight: 500;
  color: #333;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  &:focus { outline: none; border-color: #2c5530; }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  &:focus { outline: none; border-color: #2c5530; }
`;

const Summary = styled.div`
  background: #f8f9fa;
  border: 2px solid #eee;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  font-weight: 600;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.25rem;
  border: 2px solid ${p => p.$variant === 'primary' ? '#2c5530' : '#ddd'};
  background: ${p => p.$variant === 'primary' ? '#2c5530' : '#fff'};
  color: ${p => p.$variant === 'primary' ? '#fff' : '#333'};
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

export type PaymentMethod = 'cash' | 'card' | 'check' | 'free';

// Story B52-P1: Paiement individuel
export interface Payment {
  paymentMethod: PaymentMethod;
  amount: number;
  cashGiven?: number;
  change?: number;
}

export interface FinalizationData {
  donation: number;
  paymentMethod?: PaymentMethod;  // Déprécié - utiliser payments
  payments?: Payment[];  // Story B52-P1: Liste de paiements multiples
  cashGiven?: number;  // Déprécié
  change?: number;     // Déprécié
  note?: string;
  overrideTotalAmount?: number;  // Story B49-P2: Total négocié globalement
}

interface FinalizationScreenProps {
  open: boolean;
  totalAmount: number; // total ticket
  onCancel: () => void;
  onConfirm: (data: FinalizationData) => void;
  saleNote?: string | null;
  onSaleNoteChange?: (note: string | null) => void;
  isVirtual?: boolean; // Indique si c'est en mode virtuel
  items?: SaleItem[];  // Story B49-P2: Items pour calculer sous-total
}

const FinalizationScreen: React.FC<FinalizationScreenProps> = ({
  open,
  totalAmount,
  onCancel,
  onConfirm,
  saleNote = null,
  onSaleNoteChange,
  isVirtual = false,
  items = []
}) => {
  const cashChequesV2Enabled = useFeatureFlag('cashChequesV2');
  const { cashSessionStore } = useCashStores();  // B50-P4: Utiliser le store injecté pour avoir les bonnes options selon le mode
  const { currentRegisterOptions } = cashSessionStore;
  const { currentUser } = useAuthStore();
  
  // Story B49-P2: Détecter si le mode prix global est activé
  const isNoItemPricingEnabled = currentRegisterOptions?.features?.no_item_pricing?.enabled === true;
  
  // B50-P4: Vérifier si l'utilisateur est admin
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super-admin';
  
  const [donation, setDonation] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');  // Montant reçu (tous moyens de paiement) - affichage seulement pour chèque/carte
  const [manualTotal, setManualTotal] = useState<string>('');  // Story B49-P2: Total à payer saisi manuellement
  const [totalError, setTotalError] = useState<string>('');  // Story B49-P2: Erreur de validation
  const totalInputRef = useRef<HTMLInputElement>(null);  // Story B49-P2: Ref pour focus auto
  // Story B49-P5: Refs pour workflow clavier séquentiel
  const amountReceivedRef = useRef<HTMLInputElement>(null);
  const paymentSelectRef = useRef<HTMLSelectElement>(null);
  const donationRef = useRef<HTMLInputElement>(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<PaymentMethod | null>(null);  // Valeur temporaire lors de navigation flèches
  
  // Story B52-P1: État pour paiements multiples
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState<string>('');
  
  // Spec B52-P1 Keyboard Workflow: Refs pour section paiements multiples
  const currentPaymentAmountRef = useRef<HTMLInputElement>(null);
  const paymentSelectInLoopRef = useRef<HTMLSelectElement>(null);
  
  // Spec B52-P1 Keyboard Workflow: États pour indicateurs visuels et feedback
  const [focusedField, setFocusedField] = useState<'donation' | 'payment-method-loop' | 'payment-amount' | null>(null);
  const [showPaymentAddedFeedback, setShowPaymentAddedFeedback] = useState(false);
  const [lastAddedPaymentAmount, setLastAddedPaymentAmount] = useState<string>('');
  const [lastAddedPaymentMethod, setLastAddedPaymentMethod] = useState<string>('');

  const effectivePaymentMethod: PaymentMethod = pendingPaymentMethod ?? paymentMethod;
  const isCashPayment = effectivePaymentMethod === 'cash';
  const isCheckPayment = effectivePaymentMethod === 'check' && cashChequesV2Enabled;
  const isCardPayment = effectivePaymentMethod === 'card';
  const isFreePayment = effectivePaymentMethod === 'free';
  
  // Montant reçu affiché pour espèces, chèque, carte et gratuit/don
  const showAmountReceived = isCashPayment || effectivePaymentMethod === 'check' || isCardPayment || isFreePayment;

  // Story B49-P2: Calculer le sous-total (somme des items avec prix >0)
  const subtotal = useMemo(() => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => {
      if (item.price && item.price > 0) {
        return sum + (item.total || 0);
      }
      return sum;
    }, 0);
  }, [items]);
  
  // Story B49-P2: Afficher sous-total uniquement si au moins un item a un prix >0
  const shouldShowSubtotal = subtotal > 0;

  // B51-P1: Détecter un ticket "don seul" (ex: preset Don 0€, Don -18 ans) sans autre ligne payante
  const isDonationOnlyTransaction = useMemo(() => {
    if (!items || items.length === 0) return false;
    const hasDonationPreset = items.some(
      (item) => item.presetId === 'don-0' || item.presetId === 'don-18'
    );
    if (!hasDonationPreset) return false;
    const hasPaidItem = items.some((item) => item.price && item.price > 0);
    return !hasPaidItem;
  }, [items]);
  
  // Réinitialiser les champs quand la modal s'ouvre
  // B50-P4: Utiliser useRef pour éviter de réinitialiser si la modal est déjà ouverte
  const wasOpenRef = useRef(false);
  React.useEffect(() => {
    // Ne réinitialiser que lors de l'ouverture de la modal (transition de false à true)
    if (open && !wasOpenRef.current) {
      setDonation('0');
      // B51-P1: Pour un ticket contenant uniquement un don, sélectionner automatiquement "Gratuit / Don"
      const defaultPaymentMethod: PaymentMethod = isDonationOnlyTransaction ? 'free' : 'cash';
      setPaymentMethod(defaultPaymentMethod);
      setAmountReceived('');
      // B51-P1: Pour un ticket "don seul" en mode prix global, pré-remplir avec "0" pour éviter l'erreur de validation HTML5
      // Story B50-P9: Sinon, laisser le champ vide pour permettre la saisie manuelle
      if (isNoItemPricingEnabled && isDonationOnlyTransaction) {
        setManualTotal('0');
      } else {
        setManualTotal('');
      }
      setTotalError('');
      setPendingPaymentMethod(null);  // Story B49-P5: Reset valeur en attente
      // Story B52-P1: Réinitialiser les paiements multiples
      setPayments([]);
      setCurrentPaymentAmount('');
      // Spec B52-P1 Keyboard Workflow: Réinitialiser les états de focus et feedback
      setFocusedField(null);
      setShowPaymentAddedFeedback(false);
      setLastAddedPaymentAmount('');
      setLastAddedPaymentMethod('');
      wasOpenRef.current = true;
    } else if (!open) {
      wasOpenRef.current = false;
    }
  }, [open, isAdmin, shouldShowSubtotal, subtotal, isNoItemPricingEnabled, isDonationOnlyTransaction]);

  // Story B49-P5: Focus auto sur "Total à payer" au chargement (séparé pour éviter dépendances)
  React.useEffect(() => {
    if (!open) return;
    
    const focusTimeout = setTimeout(() => {
      if (isNoItemPricingEnabled && totalInputRef.current) {
        // Mode prix global : focus sur le champ "Total à payer"
        totalInputRef.current.focus();
      } else if (paymentSelectRef.current) {
        // Pas de mode prix global : focus sur "Moyen de paiement" (nouveau workflow)
        paymentSelectRef.current.focus();
      }
    }, 150);
    
    return () => clearTimeout(focusTimeout);
  }, [open, isNoItemPricingEnabled]);
  
  // Story B49-P2: Validation du total manuel
  useEffect(() => {
    if (!isNoItemPricingEnabled || !manualTotal) {
      setTotalError('');
      return;
    }
    
    const num = parseFloat(manualTotal);
    if (isNaN(num)) {
      setTotalError('');
      return; // Pas d'erreur si champ vide
    }
    
    if (num < 0) {
      setTotalError('Le total ne peut pas être négatif');
      return;
    }
    
    if (shouldShowSubtotal && num < subtotal) {
      setTotalError(`Le total doit être au minimum égal au sous-total (${subtotal.toFixed(2)} €)`);
      return;
    }
    
    setTotalError('');
  }, [manualTotal, isNoItemPricingEnabled, shouldShowSubtotal, subtotal]);

  // Montant reçu parsé (utilisé pour calculs et validation)
  const parsedAmountReceived = useMemo(() => {
    const n = parseFloat(amountReceived || '');
    if (isNaN(n) || n <= 0) return undefined;
    return Math.min(n, 999999.99);
  }, [amountReceived]);

  // Story B49-P2: Calculer le montant de base (sans don) pour éviter dépendance circulaire
  const baseAmount = useMemo(() => {
    if (isNoItemPricingEnabled && manualTotal) {
      const parsedManualTotal = parseFloat(manualTotal);
      if (!isNaN(parsedManualTotal) && parsedManualTotal >= 0) {
        return parsedManualTotal;
      }
    }
    return totalAmount;
  }, [totalAmount, isNoItemPricingEnabled, manualTotal]);

  // Don effectif : calcul automatique pour chèques/cartes (si montant >= baseAmount), manuel sinon
  const parsedDonation = useMemo(() => {
    // Pour chèques et cartes : calcul automatique SEULEMENT si montant reçu >= baseAmount
    // Si montant < baseAmount, on permet paiements multiples, donc don manuel
    const isCheckOrCard = (effectivePaymentMethod === 'check' || effectivePaymentMethod === 'card');
    if (isCheckOrCard && parsedAmountReceived && parsedAmountReceived >= baseAmount) {
      // Montant suffisant : calcul automatique du don
      return Number((parsedAmountReceived - baseAmount).toFixed(2));
    }
    // Pour espèces, gratuit/don, ou chèques/cartes avec montant < baseAmount : don manuel
    const n = parseFloat(donation || '0');
    return isNaN(n) || n < 0 ? 0 : Math.min(n, 999999.99);
  }, [donation, parsedAmountReceived, baseAmount, effectivePaymentMethod]);
  
  // Pour espèces : utiliser amountReceived comme cashGiven (rétrocompatibilité)
  const parsedCashGiven = isCashPayment ? parsedAmountReceived : undefined;

  // Story B49-P2: Total à payer = baseAmount + don (0 pour gratuit/don)
  const amountDue = useMemo(() => {
    if (isFreePayment) return 0; // Gratuit/don : total à payer = 0
    return baseAmount + parsedDonation;
  }, [baseAmount, parsedDonation, isFreePayment]);
  
  // Story B52-P1: Calculer le reste dû avec paiements multiples
  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);
  
  const remainingAmount = useMemo(() => {
    // Le reste dû doit toujours inclure le don
    // amountDue = baseAmount + parsedDonation
    // Donc reste = amountDue - totalPaid (inclut le don)
    return Math.max(0, amountDue - totalPaid);
  }, [amountDue, totalPaid]);
  
  // Spec B52-P1 Keyboard Workflow: Focus auto sur "Don" quand reste = 0 (après ajout paiement dans boucle)
  React.useEffect(() => {
    if (payments.length > 0 && remainingAmount <= 0 && focusedField !== 'donation' && focusedField !== null) {
      // Seulement si on était dans la boucle (focusedField !== null) et que le reste devient 0
      const focusTimeout = setTimeout(() => {
        if (donationRef.current) {
          donationRef.current.focus();
          setFocusedField('donation');
        }
      }, 150);
      return () => clearTimeout(focusTimeout);
    }
  }, [payments.length, remainingAmount, focusedField]);
  
  // Spec B52-P1 Keyboard Workflow: Fonction pour obtenir le moyen de paiement suivant (exclut "free" dans la boucle)
  const getNextPaymentMethod = (currentMethod: PaymentMethod): PaymentMethod => {
    // Dans la boucle, on exclut "free" - ordre : cash → check → card → cash
    const availableMethods: PaymentMethod[] = ['cash', 'check', 'card'];
    // Si le moyen actuel est "free" ou n'est pas dans la liste, on commence par "cash"
    const currentIndex = availableMethods.indexOf(currentMethod);
    if (currentIndex === -1) {
      return 'cash';
    }
    const nextIndex = (currentIndex + 1) % availableMethods.length;
    return availableMethods[nextIndex];
  };
  
  // Story B52-P1: Fonction pour ajouter un paiement
  const handleAddPayment = () => {
    // Utiliser currentPaymentAmount en priorité, sinon amountReceived
    const amountToUse = currentPaymentAmount || amountReceived;
    const amount = parseFloat(amountToUse || '0');
    if (isNaN(amount) || amount <= 0) return;
    
    // Spec B52-P1 Keyboard Workflow: Protection - "free" ne peut pas être ajouté dans la boucle
    // Si on est dans la boucle (payments.length > 0), forcer un autre moyen
    let paymentMethodToUse = effectivePaymentMethod;
    if (payments.length > 0 && paymentMethodToUse === 'free') {
      paymentMethodToUse = 'cash'; // Par défaut, utiliser "cash" si "free" est sélectionné dans la boucle
    }
    
    // Limiter le montant au reste dû
    const maxAmount = remainingAmount > 0 ? remainingAmount : amountDue;
    let paymentAmount = Math.min(amount, maxAmount);
    
    // Pour espèces : calculer le change si montant reçu > montant du paiement
    let paymentChange: number | undefined = undefined;
    let cashGiven: number | undefined = undefined;
    
    if (paymentMethodToUse === 'cash') {
      const parsedAmountReceived = parseFloat(amountReceived || currentPaymentAmount || '0');
      if (parsedAmountReceived > 0) {
        cashGiven = parsedAmountReceived;
        // Le montant du paiement est limité au reste dû
        paymentAmount = Math.min(parsedAmountReceived, maxAmount);
        // Le change est la différence entre montant reçu et montant du paiement
        paymentChange = parsedAmountReceived > paymentAmount ? (parsedAmountReceived - paymentAmount) : undefined;
      }
    }
    
    const newPayment: Payment = {
      paymentMethod: paymentMethodToUse,
      amount: paymentAmount,
      cashGiven: cashGiven,
      change: paymentChange
    };
    
    setPayments([...payments, newPayment]);
    setCurrentPaymentAmount('');
    setAmountReceived('');
    
    // Spec B52-P1 Keyboard Workflow: Feedback temporaire après ajout
    const methodLabel = paymentMethodToUse === 'cash' ? 'Espèces' : 
                       paymentMethodToUse === 'check' ? 'Chèque' : 
                       paymentMethodToUse === 'card' ? 'Carte' : 'Gratuit / Don';
    setLastAddedPaymentAmount(paymentAmount.toFixed(2));
    setLastAddedPaymentMethod(methodLabel);
    setShowPaymentAddedFeedback(true);
    setTimeout(() => {
      setShowPaymentAddedFeedback(false);
    }, 2000);
    
    // Spec B52-P1 Keyboard Workflow: Sélectionner le moyen de paiement suivant (exclut "free")
    const nextMethod = getNextPaymentMethod(paymentMethodToUse);
    setPaymentMethod(nextMethod);
    setPendingPaymentMethod(null);
  };
  
  // Story B52-P1: Fonction pour supprimer un paiement
  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  // Story B49-P6: Déterminer si c'est une transaction spéciale (recyclage/déchèterie)
  // Une transaction est spéciale si elle contient au moins un item avec presetId recyclage ou déchèterie
  const isSpecialTransaction = items.some(item => item.presetId === 'recyclage' || item.presetId === 'decheterie');

  // Calcul du don automatique si montant reçu > total à payer
  const autoDonation = useMemo(() => {
    if (!parsedAmountReceived || parsedAmountReceived <= amountDue) return 0;
    return Number((parsedAmountReceived - amountDue).toFixed(2));
  }, [parsedAmountReceived, amountDue]);
  
  const change = useMemo(() => {
    // Pour espèces et gratuit/don : calculer la monnaie à rendre
    if ((isCashPayment || isFreePayment) && parsedAmountReceived != null) {
      if (isFreePayment) {
        // Gratuit/don : monnaie à rendre = montant reçu - don
        return Number((parsedAmountReceived - parsedDonation).toFixed(2));
      } else {
        // Espèces : amountDue inclut déjà parsedDonation, donc pas besoin de l'ajouter
        return Number((parsedAmountReceived - amountDue).toFixed(2));
      }
    }
    return undefined;
  }, [isCashPayment, isFreePayment, parsedAmountReceived, amountDue, parsedDonation]);

  const canConfirm = useMemo(() => {
    // Story B52-P1: Si paiements multiples, vérifier que le total est couvert
    if (payments.length > 0) {
      return remainingAmount <= 0;
    }
    
    // Gratuit/don : TOUJOURS validable (bouton vert), même sans montant reçu
    // Cette condition doit être vérifiée EN PREMIER pour supplanter toutes les autres
    if (isFreePayment) {
      return true;
    }
    
    // Story B49-P6: Pour les transactions spéciales (recyclage/déchèterie), permettre validation à 0€
    if (isSpecialTransaction) {
      return true; // Transaction spéciale : toujours validable, même à 0€ (même sans total manuel en mode prix global)
    }
    
    // Story B49-P2: En mode prix global, valider le total manuel
    if (isNoItemPricingEnabled) {
      if (!manualTotal) {
        return false; // Total requis (sauf pour transactions spéciales, géré ci-dessus)
      }
      const parsedManualTotal = parseFloat(manualTotal);
      if (isNaN(parsedManualTotal) || parsedManualTotal < 0) {
        return false;
      }
      if (shouldShowSubtotal && parsedManualTotal < subtotal) {
        return false;
      }
    }
    
    // Validation selon moyen de paiement
    if (amountDue <= 0) {
      // Pour les autres moyens de paiement avec total = 0, valider seulement si montant reçu > 0
      if (effectivePaymentMethod === 'check' || effectivePaymentMethod === 'card') {
        // Chèque/Carte : montant reçu doit être > 0 (don > 0)
        return parsedAmountReceived != null && parsedAmountReceived > 0;
      } else if (isCashPayment) {
        // Espèces : montant reçu doit être > 0
        return parsedAmountReceived != null && parsedAmountReceived > 0;
      }
      return false;
    } else if (isCashPayment) {
      // Espèces : montant reçu doit être >= total à payer (qui inclut déjà le don)
      if (!parsedAmountReceived) return false;
      return parsedAmountReceived >= amountDue;
    } else if (effectivePaymentMethod === 'check' || effectivePaymentMethod === 'card') {
      // Chèque/Carte : assouplir la validation pour permettre paiements multiples
      // Si montant < baseAmount, on permet la validation (paiements multiples)
      // Si montant >= baseAmount, validation normale
      if (!parsedAmountReceived) return false;
      // Permettre validation même si montant < baseAmount (pour paiements multiples)
      return parsedAmountReceived > 0;
    }
    return true;
  }, [isCashPayment, isCheckPayment, isFreePayment, effectivePaymentMethod, parsedAmountReceived, amountDue, parsedDonation, isNoItemPricingEnabled, manualTotal, shouldShowSubtotal, subtotal, isSpecialTransaction, baseAmount]);

  // Story B49-P2: Gestionnaire Escape pour annuler (T4 - vérifié, existe déjà)
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onCancel]);

  // Story B49-P5: Nouveau workflow clavier - Total → Moyen paiement → Montant reçu → Don → Validation
  const handleTotalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Enter sur "Total à payer" → Focus "Moyen de paiement"
      if (paymentSelectRef.current) {
        paymentSelectRef.current.focus();
      }
    }
  };

  const handleAmountReceivedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Enter sur "Montant reçu" → Focus "Don"
      if (donationRef.current) {
        donationRef.current.focus();
      }
    }
  };

  const handlePaymentKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      // Valider la valeur en attente si elle existe
      if (pendingPaymentMethod !== null) {
        setPaymentMethod(pendingPaymentMethod);
        setPendingPaymentMethod(null);
      }
      // Enter sur "Moyen de paiement" → Focus "Montant reçu"
      if (amountReceivedRef.current) {
        amountReceivedRef.current.focus();
      }
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      // Navigation flèches haut/bas - change seulement la sélection visuelle
      // Ordre : cash → check → free (card est disabled, donc ignoré)
      const currentMethod = pendingPaymentMethod !== null ? pendingPaymentMethod : effectivePaymentMethod;
      if (e.key === 'ArrowUp') {
        // Remonter : free → check → cash → free (boucle)
        if (currentMethod === 'free') {
          setPendingPaymentMethod('check');
        } else if (currentMethod === 'check') {
          setPendingPaymentMethod('cash');
        } else if (currentMethod === 'cash') {
          setPendingPaymentMethod('free'); // Boucle vers le bas
        }
      } else if (e.key === 'ArrowDown') {
        // Descendre : cash → check → free → cash (boucle)
        if (currentMethod === 'cash') {
          setPendingPaymentMethod('check');
        } else if (currentMethod === 'check') {
          setPendingPaymentMethod('free'); // Sauter card (disabled)
        } else if (currentMethod === 'free') {
          setPendingPaymentMethod('cash'); // Boucle vers le haut
        }
      }
      // Forcer le focus à rester sur le select
      requestAnimationFrame(() => {
        if (paymentSelectRef.current) {
          paymentSelectRef.current.focus();
        }
      });
    }
  };

  const handleDonationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Spec B52-P1 Keyboard Workflow: Si reste dû > 0 et premier paiement pas encore ajouté, l'ajouter d'abord
      if (payments.length === 0) {
        // Calculer le montant du premier paiement
        const firstPaymentAmount = parsedAmountReceived || parseFloat(amountReceived || '0');
        if (firstPaymentAmount > 0) {
          // Pour chèques/cartes : si montant < baseAmount, le montant du paiement = montant reçu (pas de don inclus)
          // Pour espèces : montant du paiement = min(montant reçu, amountDue)
          let effectiveAmount: number;
          const isCheckOrCard = (effectivePaymentMethod === 'check' || effectivePaymentMethod === 'card');
          
          if (isCheckOrCard && firstPaymentAmount < baseAmount) {
            // Chèque partiel : le montant du paiement = montant reçu (pas de don)
            effectiveAmount = firstPaymentAmount;
          } else {
            // Cas normal : limiter au total dû (inclut le don si applicable)
            effectiveAmount = Math.min(firstPaymentAmount, amountDue);
          }
          
          // Ajouter le premier paiement
          const firstPayment: Payment = {
            paymentMethod: effectivePaymentMethod,
            amount: effectiveAmount,
            cashGiven: isCashPayment ? firstPaymentAmount : undefined,
            change: isCashPayment && firstPaymentAmount > amountDue ? (firstPaymentAmount - amountDue) : undefined
          };
          setPayments([firstPayment]);
          setAmountReceived('');
          setCurrentPaymentAmount('');
          
          // Calculer le reste après ajout
          // IMPORTANT : Le reste doit toujours inclure le don (amountDue = baseAmount + don)
          // Même pour les chèques partiels, le don doit être inclus dans le reste
          const newRemaining = Math.max(0, amountDue - effectiveAmount);
          
          // Si reste > 0, entrer dans la boucle avec le moyen suivant
          if (newRemaining > 0) {
            // Sélectionner le moyen de paiement suivant (exclut "free")
            // Si le moyen actuel est "free", on commence par "cash"
            const currentMethodForLoop = effectivePaymentMethod === 'free' ? 'cash' : effectivePaymentMethod;
            const nextMethod = getNextPaymentMethod(currentMethodForLoop);
            setPaymentMethod(nextMethod);
            setPendingPaymentMethod(null);
            
            setTimeout(() => {
              if (paymentSelectInLoopRef.current) {
                paymentSelectInLoopRef.current.focus();
                setFocusedField('payment-method-loop');
              }
            }, 150);
          } else {
            // Total couvert, focus reste sur Don pour validation
            setFocusedField('donation');
          }
          return; // Ne pas valider immédiatement
        }
      }
      
      // Validation directe (ferme popup, enregistre vente)
      if (canConfirm) {
        handleSubmit(e as any);
      }
    }
  };
  
  // Spec B52-P1 Keyboard Workflow: Gestionnaire pour "Montant du paiement" dans la boucle
  const handleCurrentPaymentAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Si montant valide et reste dû > 0, ajouter le paiement
      const amount = parseFloat(currentPaymentAmount || '0');
      if (amount > 0 && remainingAmount > 0) {
        handleAddPayment();
        // Gestion du focus après ajout
        setTimeout(() => {
          if (remainingAmount <= 0) {
            // Total couvert → Focus sur "Don"
            if (donationRef.current) {
              donationRef.current.focus();
              setFocusedField('donation');
            }
          } else {
            // Reste dû > 0 → Focus retourne sur "Moyen de paiement" (boucle)
            if (paymentSelectInLoopRef.current) {
              paymentSelectInLoopRef.current.focus();
              setFocusedField('payment-method-loop');
            }
          }
        }, 150);
      }
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      // Force l'ajout même si montant = 0
      handleAddPayment();
      // Même logique de focus après ajout
      setTimeout(() => {
        if (remainingAmount <= 0) {
          if (donationRef.current) {
            donationRef.current.focus();
            setFocusedField('donation');
          }
        } else {
          if (paymentSelectInLoopRef.current) {
            paymentSelectInLoopRef.current.focus();
            setFocusedField('payment-method-loop');
          }
        }
      }, 150);
    }
  };
  
  // Spec B52-P1 Keyboard Workflow: Gestionnaire pour "Moyen de paiement" dans la boucle
  const handlePaymentMethodInLoopKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      // Valider la valeur en attente si elle existe
      if (pendingPaymentMethod !== null) {
        setPaymentMethod(pendingPaymentMethod);
        setPendingPaymentMethod(null);
      }
      // Enter sur "Moyen de paiement" → Focus "Montant du paiement"
      setTimeout(() => {
        if (currentPaymentAmountRef.current) {
          currentPaymentAmountRef.current.focus();
          setFocusedField('payment-amount');
        }
      }, 100);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      // Navigation flèches haut/bas - exclut "free" dans la boucle
      // Ordre : cash → check → card → cash (boucle)
      const currentMethod = pendingPaymentMethod !== null ? pendingPaymentMethod : effectivePaymentMethod;
      const availableMethods: PaymentMethod[] = ['cash', 'check', 'card'];
      const currentIndex = availableMethods.indexOf(currentMethod);
      
      if (e.key === 'ArrowUp') {
        // Remonter : card → check → cash → card (boucle)
        const prevIndex = currentIndex === 0 ? availableMethods.length - 1 : currentIndex - 1;
        setPendingPaymentMethod(availableMethods[prevIndex]);
      } else if (e.key === 'ArrowDown') {
        // Descendre : cash → check → card → cash (boucle)
        const nextIndex = (currentIndex + 1) % availableMethods.length;
        setPendingPaymentMethod(availableMethods[nextIndex]);
      }
      requestAnimationFrame(() => {
        if (paymentSelectInLoopRef.current) {
          paymentSelectInLoopRef.current.focus();
        }
      });
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    // Valider la valeur de paiement en attente le cas échéant
    if (pendingPaymentMethod !== null) {
      setPaymentMethod(pendingPaymentMethod);
      setPendingPaymentMethod(null);
    }
    
    // Story B49-P2: Valider le total manuel avant soumission
    if (isNoItemPricingEnabled && manualTotal) {
      const parsedManualTotal = parseFloat(manualTotal);
      if (isNaN(parsedManualTotal) || parsedManualTotal < 0) {
        setTotalError('Veuillez saisir un total valide');
        return;
      }
      if (shouldShowSubtotal && parsedManualTotal < subtotal) {
        setTotalError(`Le total doit être au minimum égal au sous-total (${subtotal.toFixed(2)} €)`);
        return;
      }
    }
    
    // Story B52-P1: Envoyer paiements multiples si disponibles, sinon rétrocompatibilité
    if (payments.length > 0) {
      // Paiements multiples
      onConfirm({
        donation: Number(parsedDonation.toFixed(2)),
        payments: payments,
        note: saleNote || undefined,
        overrideTotalAmount: isNoItemPricingEnabled && manualTotal 
          ? parseFloat(manualTotal) 
          : undefined,
      });
    } else {
      // Rétrocompatibilité : paiement unique
      onConfirm({
        donation: Number(parsedDonation.toFixed(2)),
        paymentMethod: effectivePaymentMethod,
        cashGiven: (isCashPayment || isFreePayment) ? parsedAmountReceived : undefined,
        change: (isCashPayment || isFreePayment) ? change : undefined,
        note: saleNote || undefined,
        overrideTotalAmount: isNoItemPricingEnabled && manualTotal 
          ? parseFloat(manualTotal) 
          : undefined,
      });
    }
  };

  return (
    <Backdrop $open={open} role="dialog" aria-modal="true" aria-label="Finaliser la vente" data-testid="finalization-screen">
      <Modal>
        <Title>Finaliser la vente</Title>

        {isVirtual && (
          <InfoMessage style={{ backgroundColor: '#fff3cd', borderColor: '#ffeaa7' }}>
            🎓 <strong>Mode Formation :</strong> Cette vente est simulée et ne sera pas enregistrée dans les comptes réels.
          </InfoMessage>
        )}

        {isSpecialTransaction && (
          <InfoMessage>
            💝 <strong>Transaction spéciale :</strong> Cette vente ne nécessite aucun paiement car il s'agit de dons ou de sorties uniquement.
          </InfoMessage>
        )}

        <Form onSubmit={handleSubmit}>
          {/* Story B49-P2: Champ "Sous-total" en lecture seule (affiché conditionnellement) */}
          {shouldShowSubtotal && (
            <Field>
              <Label>Sous-total</Label>
              <Input
                value={subtotal.toFixed(2)}
                readOnly
                style={{
                  backgroundColor: '#f8f9fa',
                  fontWeight: 'normal',
                  color: '#666'
                }}
                data-testid="subtotal-display"
              />
            </Field>
          )}
          
          {/* Story B49-P5: Nouvelle organisation - Ligne 1: Total à payer | Moyen de paiement */}
          <Row>
            {isNoItemPricingEnabled ? (
              <Field>
                <Label htmlFor="manual-total">
                  Total à payer (€) *
                </Label>
                <Input
                  ref={totalInputRef}
                  id="manual-total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualTotal}
                  onChange={(e) => {
                    // B50-P4: S'assurer que le champ est toujours éditable
                    setManualTotal(e.target.value);
                  }}
                  onKeyDown={handleTotalKeyDown}
                  data-testid="manual-total-input"
                  placeholder="0.00"
                  style={{
                    borderColor: totalError ? '#dc3545' : '#ddd'
                  }}
                  required={!isFreePayment && !isSpecialTransaction && !isDonationOnlyTransaction}
                  readOnly={false}
                  disabled={false}
                />
                {totalError && (
                  <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {totalError}
                  </div>
                )}
              </Field>
            ) : (
              <Field>
                <Label>Total à payer</Label>
                <Summary style={{ margin: 0 }}>
                  <span data-testid="amount-due">{amountDue.toFixed(2)} €</span>
                </Summary>
              </Field>
            )}
            <Field>
              <Label htmlFor="payment">
                <CreditCard size={16} style={{ marginRight: '0.5rem', color: '#2c5530' }} />
                Moyen de paiement
              </Label>
              <Select
                ref={paymentSelectRef}
                id="payment"
                value={effectivePaymentMethod}
                onChange={(e) => {
                  const value = e.target.value as PaymentMethod;
                  if (value !== 'card') {
                    setPaymentMethod(value);
                    setPendingPaymentMethod(null);
                  }
                }}
                onKeyDown={handlePaymentKeyDown}
                data-testid="payment-select"
              >
                <option value="cash">💰 Espèces</option>
                <option value="check">📝 Chèque</option>
                <option value="card" disabled>💳 Carte (bientôt disponible)</option>
                <option value="free">🎁 Gratuit / Don</option>
              </Select>
            </Field>
          </Row>

          {/* Story B49-P5: Nouvelle organisation - Ligne 2: Montant reçu | Don */}
          {showAmountReceived && (
            <Row>
              <Field>
                <Label htmlFor="amountReceived">
                  <Coins size={16} style={{ marginRight: '0.5rem', color: '#2c5530' }} />
                  {isCashPayment ? 'Montant reçu (€)' : effectivePaymentMethod === 'check' ? 'Montant du chèque (€)' : isFreePayment ? 'Montant reçu (€)' : 'Montant carte (€)'}
                </Label>
                <Input
                  ref={amountReceivedRef}
                  id="amountReceived"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountReceived}
                  onChange={(e) => {
                    setAmountReceived(e.target.value);
                    // Pour chèques/cartes : calculer et mettre à jour le don automatiquement SEULEMENT si montant >= baseAmount
                    const isCheckOrCard = (effectivePaymentMethod === 'check' || effectivePaymentMethod === 'card');
                    if (isCheckOrCard) {
                      const received = parseFloat(e.target.value);
                      if (!isNaN(received) && received >= baseAmount) {
                        // Montant suffisant : calcul automatique du don
                        const autoDon = received - baseAmount;
                        setDonation(autoDon.toFixed(2));
                      } else {
                        // Montant insuffisant : permettre paiements multiples, don manuel
                        // Ne pas forcer le don à 0, laisser l'utilisateur le saisir
                        if (!donation || parseFloat(donation) === 0) {
                          setDonation('0');
                        }
                      }
                    }
                    // Pour espèces : pas de calcul automatique du don
                  }}
                  onKeyDown={handleAmountReceivedKeyDown}
                  data-testid="amount-received-input"
                  placeholder="0.00"
                />
                {/* Afficher le don calculé pour chèques/cartes (si montant >= baseAmount) */}
                {(effectivePaymentMethod === 'check' || effectivePaymentMethod === 'card') && parsedAmountReceived && parsedAmountReceived >= baseAmount && parsedDonation > 0 && (
                  <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: '#666' }}>
                    Don calculé : {parsedDonation.toFixed(2)} €
                  </div>
                )}
                {/* Indication paiements multiples si montant chèque < baseAmount */}
                {(effectivePaymentMethod === 'check' || effectivePaymentMethod === 'card') && parsedAmountReceived && parsedAmountReceived > 0 && parsedAmountReceived < baseAmount && (
                  <div style={{ 
                    fontSize: '0.875rem', 
                    marginTop: '0.25rem', 
                    color: '#2c5530',
                    background: '#e8f5e9',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #4caf50'
                  }}>
                    💡 <strong>Paiement partiel</strong> - Vous pourrez ajouter d'autres paiements après validation
                    <br/>
                    <span style={{ fontSize: '0.8rem' }}>
                      Reste à payer : {(baseAmount - parsedAmountReceived).toFixed(2)} €
                    </span>
                  </div>
                )}
              </Field>
              <Field>
                <Label htmlFor="donation">
                  <Heart size={16} style={{ marginRight: '0.5rem', color: '#e91e63' }} />
                  Don (€)
                </Label>
                <Input
                  ref={donationRef}
                  id="donation"
                  type="number"
                  step="0.01"
                  min="0"
                  value={donation}
                  onChange={(e) => {
                    // Toujours permettre modification manuelle du don
                    setDonation(e.target.value);
                    
                    // Spec B52-P1: Désactiver le recalcul bidirectionnel pour éviter la confusion
                    // Le don peut être modifié librement sans affecter le montant du chèque
                    // Le recalcul automatique se fait uniquement dans un sens : montant reçu → don
                    // (et seulement si montant >= baseAmount)
                    
                    // Pour chèques/cartes : NE PLUS recalculer le montant reçu quand on modifie le don
                    // Cela permet de :
                    // 1. Saisir un chèque partiel (ex: 15€) puis ajouter un don (ex: 3€) sans que le chèque change
                    // 2. Entrer dans le mode paiements multiples naturellement
                    // 3. Éviter la confusion du recalcul bidirectionnel
                  }}
                  onKeyDown={handleDonationKeyDown}
                  onFocus={() => setFocusedField('donation')}
                  data-testid="donation-input"
                  placeholder={(effectivePaymentMethod === 'check' || effectivePaymentMethod === 'card') && parsedAmountReceived && parsedAmountReceived > baseAmount 
                    ? `${parsedDonation.toFixed(2)} (calculé)` 
                    : '0.00'}
                />
                {/* Spec B52-P1 Keyboard Workflow: Indicateur 2 - Focus sur "Don" (Reste dû = 0, paiements multiples) */}
                {focusedField === 'donation' && remainingAmount <= 0 && payments.length > 0 && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: '#e8f5e9',
                    border: '1px solid #4caf50',
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                  }}>
                    ✅ <strong>Total couvert</strong><br/>
                    💡 <strong>Appuyez sur Enter pour valider la vente</strong>
                  </div>
                )}
                {/* Spec B52-P1 Keyboard Workflow: Indicateur 3 - Focus sur "Don" (Paiement unique, pas de reste) */}
                {focusedField === 'donation' && payments.length === 0 && canConfirm && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: '#e8f5e9',
                    border: '1px solid #4caf50',
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                  }}>
                    💡 <strong>Appuyez sur Enter pour valider la vente</strong>
                  </div>
                )}
              </Field>
            </Row>
          )}

          {/* Story B52-P1: Section paiements multiples */}
          {payments.length > 0 && (
            <Field style={{ marginTop: '1rem' }}>
              <Label style={{ marginBottom: '0.75rem', fontWeight: 600 }}>
                Paiements ajoutés
              </Label>
              <div style={{
                background: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '0.75rem',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {/* Spec B52-P1 Keyboard Workflow: Feedback temporaire après ajout paiement */}
                {showPaymentAddedFeedback && (
                  <div style={{
                    padding: '0.5rem',
                    background: '#4caf50',
                    color: 'white',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    textAlign: 'center'
                  }}>
                    ✓ Paiement ajouté: {lastAddedPaymentAmount} € ({lastAddedPaymentMethod})
                    {remainingAmount > 0 && ` - Reste: ${remainingAmount.toFixed(2)} €`}
                  </div>
                )}
                {payments.map((payment, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem',
                    marginBottom: index < payments.length - 1 ? '0.5rem' : 0,
                    background: '#fff',
                    borderRadius: '4px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {payment.paymentMethod === 'cash' && '💰 Espèces'}
                        {payment.paymentMethod === 'check' && '📝 Chèque'}
                        {payment.paymentMethod === 'card' && '💳 Carte'}
                        {payment.paymentMethod === 'free' && '🎁 Gratuit / Don'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        {payment.amount.toFixed(2)} €
                        {payment.change !== undefined && payment.change > 0 && (
                          <span style={{ marginLeft: '0.5rem', color: '#ff9800' }}>
                            (Monnaie: {payment.change.toFixed(2)} €)
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(index)}
                      style={{
                        background: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div style={{
                  marginTop: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #ddd',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 600
                }}>
                  <span>Total payé:</span>
                  <span>{totalPaid.toFixed(2)} €</span>
                </div>
                {remainingAmount > 0 && (
                  <div style={{
                    marginTop: '0.5rem',
                    color: '#dc3545',
                    fontWeight: 600
                  }}>
                    Reste dû: {remainingAmount.toFixed(2)} €
                  </div>
                )}
                {remainingAmount <= 0 && (
                  <div style={{
                    marginTop: '0.5rem',
                    color: '#4caf50',
                    fontWeight: 600
                  }}>
                    ✓ Total couvert
                  </div>
                )}
              </div>
            </Field>
          )}

          {/* Spec B52-P1 Keyboard Workflow: Section "Ajouter un autre paiement" avec workflow clavier */}
          {remainingAmount > 0 && (
            <Field style={{ marginTop: '1rem' }}>
              <Label style={{ marginBottom: '0.75rem', fontWeight: 600 }}>
                Ajouter un autre paiement
              </Label>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <Field>
                  <Label htmlFor="payment-method-loop">
                    <CreditCard size={16} style={{ marginRight: '0.5rem', color: '#2c5530' }} />
                    Moyen de paiement
                  </Label>
                  <Select
                    ref={paymentSelectInLoopRef}
                    id="payment-method-loop"
                    value={effectivePaymentMethod === 'free' ? 'cash' : effectivePaymentMethod}
                    onChange={(e) => {
                      const value = e.target.value as PaymentMethod;
                      if (value !== 'card' && value !== 'free') {
                        setPaymentMethod(value);
                        setPendingPaymentMethod(null);
                      }
                    }}
                    onKeyDown={handlePaymentMethodInLoopKeyDown}
                    onFocus={() => setFocusedField('payment-method-loop')}
                    data-testid="payment-select-loop"
                  >
                    <option value="cash">💰 Espèces</option>
                    <option value="check">📝 Chèque</option>
                    <option value="card" disabled>💳 Carte (bientôt disponible)</option>
                    {/* Spec B52-P1 Keyboard Workflow: "Gratuit / Don" exclu de la boucle */}
                  </Select>
                  {/* Spec B52-P1 Keyboard Workflow: Indicateur 1 - Focus sur "Moyen de paiement" */}
                  {focusedField === 'payment-method-loop' && remainingAmount > 0 && payments.length > 0 && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      background: '#e1f5ff',
                      border: '1px solid #2c5530',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}>
                      💡 <strong>Choisissez le moyen de paiement puis saisissez le montant</strong><br/>
                      Reste à payer: {remainingAmount.toFixed(2)} €<br/>
                      <span style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem', display: 'block' }}>
                        (Flèches haut/bas pour changer, Enter pour valider)
                      </span>
                    </div>
                  )}
                </Field>
                <Field>
                  <Label htmlFor="current-payment-amount">
                    <Coins size={16} style={{ marginRight: '0.5rem', color: '#2c5530' }} />
                    Montant du paiement (€)
                  </Label>
                  <Input
                    ref={currentPaymentAmountRef}
                    id="current-payment-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={remainingAmount}
                    value={currentPaymentAmount}
                    onChange={(e) => {
                      setCurrentPaymentAmount(e.target.value);
                    }}
                    onKeyDown={handleCurrentPaymentAmountKeyDown}
                    onFocus={() => setFocusedField('payment-amount')}
                    placeholder={`Max: ${remainingAmount.toFixed(2)} €`}
                    data-testid="current-payment-amount-input"
                  />
                  {/* Spec B52-P1 Keyboard Workflow: Indicateur 1B - Focus sur "Montant du paiement" */}
                  {focusedField === 'payment-amount' && remainingAmount > 0 && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      background: '#e1f5ff',
                      border: '1px solid #2c5530',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}>
                      💡 <strong>Appuyez sur Enter pour ajouter ce paiement</strong><br/>
                      Reste à payer: {remainingAmount.toFixed(2)} €
                      {currentPaymentAmount && parseFloat(currentPaymentAmount) > 0 && (
                        <span style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                          (Raccourci: + pour forcer l'ajout)
                        </span>
                      )}
                    </div>
                  )}
                </Field>
                {/* Bouton "+ Ajouter" conservé pour compatibilité souris */}
                <Button
                  type="button"
                  onClick={handleAddPayment}
                  disabled={
                    !currentPaymentAmount || 
                    parseFloat(currentPaymentAmount || '0') <= 0 || 
                    parseFloat(currentPaymentAmount || '0') > remainingAmount
                  }
                  style={{
                    padding: '0.75rem 1.25rem',
                    whiteSpace: 'nowrap',
                    alignSelf: 'flex-start'
                  }}
                >
                  + Ajouter
                </Button>
              </div>
            </Field>
          )}

          {/* Story B49-P5: Nouvelle organisation - Ligne 3: Monnaie à rendre (seule, en dessous, espèces et gratuit/don) */}
          {(isCashPayment || isFreePayment) && payments.length === 0 && (
            <Field>
              <Label>
                <Coins size={16} style={{ marginRight: '0.5rem', color: '#ff9800' }} />
                Monnaie à rendre
              </Label>
              <Input
                value={change != null ? Math.max(0, change).toFixed(2) : '0.00'}
                readOnly
                data-testid="change-output"
                style={{
                  backgroundColor: '#f8f9fa',
                  fontWeight: 'bold',
                  color: change && change > 0 ? '#2c5530' : '#666'
                }}
              />
            </Field>
          )}

          {/* Story B49-P5: T1 - Ordre 6: Note contextuelle (en bas, position finale) */}
          {onSaleNoteChange && (
            <Field>
              <Label htmlFor="sale-note">
                <StickyNote size={16} style={{ marginRight: '0.5rem', color: '#ff9800' }} />
                Note contextuelle (optionnel)
              </Label>
              <Textarea
                id="sale-note"
                data-testid="sale-note-input"
                value={saleNote || ''}
                onChange={(e) => {
                  const value = e.target.value || null;
                  onSaleNoteChange(value);
                }}
                placeholder="Ajouter une note contextuelle pour ce ticket (ex: client régulier, problème technique, etc.)"
                minRows={2}
                maxRows={4}
                style={{
                  marginTop: '8px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.95rem',
                  lineHeight: '1.4',
                  resize: 'vertical'
                }}
              />
            </Field>
          )}

          <Actions>
            <Button type="button" onClick={onCancel} data-testid="cancel-finalization">Annuler</Button>
            <Button type="submit" $variant="primary" disabled={!canConfirm} data-testid="confirm-finalization">Valider</Button>
          </Actions>
        </Form>
      </Modal>
    </Backdrop>
  );
};

export default FinalizationScreen;


