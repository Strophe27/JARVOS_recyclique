import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Paper, Title, TextInput, Button, Group, Alert, LoadingOverlay } from '@mantine/core';
import { IconCash, IconCurrencyEuro, IconAlertCircle, IconCalendar } from '@tabler/icons-react';
import { useCashSessionStoreInjected, useCashStores } from '../../providers/CashStoreProvider';
import { cashSessionService, cashRegisterDashboardService } from '../../services/cashSessionService';
import { useAuthStore } from '../../stores/authStore';
import { getCashRegister } from '../../services/api';

interface OpenCashSessionProps {
  onSessionOpened?: (sessionId: string) => void;
}

const OpenCashSession: React.FC<OpenCashSessionProps> = ({ onSessionOpened }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuthStore();
  const { cashSessionStore, isVirtualMode, isDeferredMode } = useCashStores();  // B44-P1
  const { 
    openSession, 
    loading, 
    error, 
    clearError ,
    resumeSession,
    fetchCurrentSession  // B44-P1: Pour charger la session au montage en mode différé
  } = cashSessionStore;
  
  const basePath = isDeferredMode ? '/cash-register/deferred' : (isVirtualMode ? '/cash-register/virtual' : '/cash-register');

  // B49-P7: Récupérer register_id depuis route params ou state
  const registerIdFromParams = searchParams.get('register_id');
  const registerIdFromState = (location.state as any)?.register_id;
  const registerId = registerIdFromParams || registerIdFromState;

  const [formData, setFormData] = useState({
    operator_id: currentUser?.id || 'test-user-id',
    site_id: '',
    register_id: registerId || '',
    initial_amount: ''  // B44-P3: String vide pour afficher placeholder "0.00" en gris
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [registerStatus, setRegisterStatus] = useState<{ is_active: boolean; session_id: string | null }>({ is_active: false, session_id: null });
  const [sessionDate, setSessionDate] = useState<string>('');  // B49-P7: String pour input type="date" (format YYYY-MM-DD)
  const [loadingRegister, setLoadingRegister] = useState(false);
  // Si on vient avec une intention de reprise, tenter immédiatement
  useEffect(() => {
    const tryImmediateResume = async () => {
      const st: any = location.state;
      if (st?.intent === 'resume' && st?.register_id) {
        if (isVirtualMode) {
          // En mode virtuel, vérifier la session depuis le store virtuel
          const { currentSession } = cashSessionStore;
          if (currentSession && currentSession.status === 'open') {
            navigate(`${basePath}/sale`);
          }
        } else if (isDeferredMode) {
          // B44-P1: En mode différé, vérifier que la session est bien différée
          const { currentSession } = cashSessionStore;
          if (currentSession && currentSession.status === 'open' && currentSession.opened_at) {
            const openedAtDate = new Date(currentSession.opened_at);
            const now = new Date();
            if (openedAtDate < now) {
              // Session différée valide
              navigate(`${basePath}/sale`);
            }
            // Sinon, ne pas reprendre (session normale)
          }
        } else {
          // Mode réel : vérifier via l'API
        const status = await cashSessionService.getRegisterSessionStatus(st.register_id);
        if (status.is_active && status.session_id) {
          const ok = await resumeSession(status.session_id);
          if (ok) {
              navigate(`${basePath}/sale`);
            }
          }
        }
      }
    };
    tryImmediateResume();
  }, [location.state, navigate, resumeSession, isVirtualMode, isDeferredMode, cashSessionStore, basePath]);

  // Effacer les erreurs au montage du composant
  useEffect(() => {
    clearError();
  }, [clearError]);

  // B44-P1: Charger la session actuelle au montage en mode différé pour vérifier l'état réel
  const fetchCurrentSessionRef = useRef(fetchCurrentSession);
  useEffect(() => {
    fetchCurrentSessionRef.current = fetchCurrentSession;
  }, [fetchCurrentSession]);
  
  useEffect(() => {
    if (isDeferredMode) {
      fetchCurrentSessionRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeferredMode]); // fetchCurrentSession est mis à jour via ref pour éviter les boucles infinies

  // B50-P4: Charger register_id et site_id depuis route params au montage
  // En mode virtuel, si aucun register_id n'est fourni, charger automatiquement la première caisse avec enable_virtual=true
  useEffect(() => {
    const loadRegisterData = async () => {
      let finalRegisterId = registerId;
      
      // B50-P4: En mode virtuel/différé, si pas de register_id, trouver automatiquement la première caisse appropriée
      // IMPORTANT: On ne remplace PAS un register_id déjà fourni (préservation du fonctionnement normal pour les admins)
      if (!finalRegisterId && (isVirtualMode || isDeferredMode)) {
        try {
          const registers = await cashRegisterDashboardService.getRegistersStatus();
          if (isVirtualMode) {
            const firstVirtualRegister = registers.find(r => r.enable_virtual === true);
            if (firstVirtualRegister) {
              finalRegisterId = firstVirtualRegister.id;
              console.log('[OpenCashSession] Caisse virtuelle automatique sélectionnée:', firstVirtualRegister.name, firstVirtualRegister.id);
            }
          } else if (isDeferredMode) {
            const firstDeferredRegister = registers.find(r => r.enable_deferred === true);
            if (firstDeferredRegister) {
              finalRegisterId = firstDeferredRegister.id;
              console.log('[OpenCashSession] Caisse différée automatique sélectionnée:', firstDeferredRegister.name, firstDeferredRegister.id);
            }
          }
        } catch (error) {
          console.error('Erreur lors du chargement des caisses pour mode virtuel/différé:', error);
        }
      }
      
      // Si pas de register_id (et pas en mode virtuel), rediriger vers dashboard
      if (!finalRegisterId && !isVirtualMode && !isDeferredMode) {
        navigate('/caisse', { replace: true });
        return;
      }

      // Si on a un register_id, charger les détails pour obtenir site_id
      if (finalRegisterId) {
        setLoadingRegister(true);
        try {
          const register = await getCashRegister(finalRegisterId);
          if (register && register.site_id) {
            setFormData(prev => ({
              ...prev,
              register_id: finalRegisterId,
              site_id: register.site_id
            }));
          } else {
            console.error('Register non trouvé ou sans site_id');
            // En mode virtuel, on peut continuer sans site_id
            if (!isVirtualMode && !isDeferredMode) {
              const dashboardPath = isDeferredMode ? '/cash-register/deferred' : (isVirtualMode ? '/cash-register/virtual' : '/caisse');
              navigate(dashboardPath, { replace: true });
            }
          }
        } catch (error) {
          console.error('Erreur lors du chargement du register:', error);
          // En mode virtuel, on peut continuer même si le register n'est pas trouvé
          if (!isVirtualMode && !isDeferredMode) {
            const dashboardPath = isDeferredMode ? '/cash-register/deferred' : (isVirtualMode ? '/cash-register/virtual' : '/caisse');
            navigate(dashboardPath, { replace: true });
          }
        } finally {
          setLoadingRegister(false);
        }
      }
    };

    // Charger le register pour obtenir site_id (nécessaire pour l'API même en mode virtuel/différé)
    if (registerId) {
      // Charger le register pour obtenir site_id, même en mode virtuel/différé
      loadRegisterData();
    } else if (!isVirtualMode && !isDeferredMode) {
      // En mode réel sans register_id, rediriger vers dashboard
      const dashboardPath = '/caisse';
      navigate(dashboardPath, { replace: true });
    }
    // En mode virtuel/différé sans register_id, on peut continuer (site_id sera optionnel)
  }, [registerId, navigate, isVirtualMode, isDeferredMode]);

  // UX-B10: Vérifier le statut de la caisse quand le register_id change (mode réel uniquement)
  useEffect(() => {
    if (isVirtualMode) {
      // En mode virtuel, vérifier depuis le store
      const { currentSession } = cashSessionStore;
      setRegisterStatus({
        is_active: currentSession?.status === 'open' || false,
        session_id: currentSession?.id || null
      });
      return;
    }
    
    if (isDeferredMode) {
      // B44-P1: En mode différé, vérifier que la session est bien différée (opened_at dans le passé) ET OUVERTE
      const { currentSession } = cashSessionStore;
      if (currentSession?.status === 'open' && currentSession.opened_at) {
        const openedAtDate = new Date(currentSession.opened_at);
        const now = new Date();
        // Session différée valide uniquement si opened_at est dans le passé ET status est 'open'
        if (openedAtDate < now) {
          setRegisterStatus({
            is_active: true,
            session_id: currentSession.id
          });
        } else {
          // Session normale trouvée, ne pas l'utiliser en mode différé
          setRegisterStatus({
            is_active: false,
            session_id: null
          });
        }
      } else {
        // Pas de session, session fermée, ou session sans opened_at
        setRegisterStatus({
          is_active: false,
          session_id: null
        });
      }
      return;
    }
    
    const checkRegisterStatus = async () => {
      if (!formData.register_id) {
        setRegisterStatus({ is_active: false, session_id: null });
        return;
      }
      const status = await cashSessionService.getRegisterSessionStatus(formData.register_id);
      setRegisterStatus(status);
    };
    checkRegisterStatus();
  }, [formData.register_id, isVirtualMode, isDeferredMode, cashSessionStore]);

  // B50-P10: Pré-remplir les champs date et fond de caisse lors de la reprise d'une session différée
  useEffect(() => {
    if (isDeferredMode && registerStatus.is_active && registerStatus.session_id) {
      const { currentSession } = cashSessionStore;
      if (currentSession && currentSession.opened_at && currentSession.initial_amount !== undefined) {
        // Pré-remplir la date (format YYYY-MM-DD pour input type="date")
        const openedAtDate = new Date(currentSession.opened_at);
        const dateStr = openedAtDate.toISOString().split('T')[0];
        if (!sessionDate) {
          setSessionDate(dateStr);
        }
        
        // Pré-remplir le fond de caisse (format français avec virgule)
        if (!formData.initial_amount || formData.initial_amount === '') {
          const amountStr = currentSession.initial_amount.toString().replace('.', ',');
          setFormData(prev => ({
            ...prev,
            initial_amount: amountStr
          }));
        }
      }
    }
  }, [isDeferredMode, registerStatus.is_active, registerStatus.session_id, cashSessionStore.currentSession]);

  // Reprise intelligente : Vérifier si une session existe pour la date saisie
  const [existingSessionInfo, setExistingSessionInfo] = useState<{ exists: boolean; session_id: string | null; opened_at?: string; initial_amount?: number; total_sales?: number; total_items?: number } | null>(null);
  const [checkingSession, setCheckingSession] = useState(false);

  useEffect(() => {
    // Vérifier l'existence d'une session uniquement en mode différé et si une date est saisie
    if (isDeferredMode && sessionDate && sessionDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const checkSession = async () => {
        setCheckingSession(true);
        try {
          const result = await cashSessionService.checkDeferredSessionByDate(sessionDate);
          if (result) {
            setExistingSessionInfo(result);
            // Si une session existe, pré-remplir le fond de caisse
            if (result.exists && result.initial_amount !== undefined && (!formData.initial_amount || formData.initial_amount === '')) {
              const amountStr = result.initial_amount.toString().replace('.', ',');
              setFormData(prev => ({
                ...prev,
                initial_amount: amountStr
              }));
            }
          } else {
            setExistingSessionInfo(null);
          }
        } catch (error) {
          console.error('Erreur lors de la vérification de session:', error);
          setExistingSessionInfo(null);
        } finally {
          setCheckingSession(false);
        }
      };
      
      // Délai pour éviter trop de requêtes pendant la saisie
      const timeoutId = setTimeout(checkSession, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setExistingSessionInfo(null);
    }
  }, [sessionDate, isDeferredMode, formData.initial_amount]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Effacer l'erreur de validation pour ce champ
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // B44-P3: Gestion spéciale de la saisie du montant initial (support point/virgule)
  // Format français : affichage avec virgule, conversion en point au submit
  const handleInitialAmountChange = (value: string) => {
    // Accepter uniquement les chiffres, point et virgule
    let sanitized = value.replace(/[^\d.,]/g, '');
    
    // Normaliser : remplacer tous les points par des virgules pour l'affichage français
    // (on garde la virgule pour l'affichage, conversion en point au submit)
    sanitized = sanitized.replace(/\./g, ',');
    
    // Valider le format : max 2 décimales, un seul séparateur décimal
    const parts = sanitized.split(',');
    if (parts.length > 2) {
      // Plusieurs virgules : garder seulement la première
      sanitized = parts[0] + ',' + parts.slice(1).join('');
    }
    
    // Limiter à 2 décimales
    if (parts.length === 2 && parts[1].length > 2) {
      sanitized = parts[0] + ',' + parts[1].substring(0, 2);
    }
    
    // Permettre la saisie d'une virgule seule (ex: "50," pour taper "50,20")
    // ou une chaîne vide pour réinitialiser
    if (sanitized === '' || sanitized === ',') {
      setFormData(prev => ({
        ...prev,
        initial_amount: sanitized
      }));
    } else {
      // Valider le format avec regex : /^\d*,?\d{0,2}$/ (virgule pour affichage français)
      const isValidFormat = /^\d*,?\d{0,2}$/.test(sanitized);
      if (isValidFormat) {
        setFormData(prev => ({
          ...prev,
          initial_amount: sanitized
        }));
      }
      // Si format invalide, ne pas mettre à jour (garder la valeur précédente)
    }
    
    // Effacer l'erreur de validation
    if (validationErrors.initial_amount) {
      setValidationErrors(prev => ({
        ...prev,
        initial_amount: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.operator_id) {
      errors.operator_id = 'Veuillez sélectionner un opérateur';
    } else if (!/^[0-9a-fA-F-]{36}$/.test(formData.operator_id)) {
      errors.operator_id = 'ID opérateur invalide';
    }

    // B49-P7: site_id et register_id sont préremplis depuis route params, validation minimale
    // En mode virtuel/différé, site_id et register_id sont optionnels (mais recommandés pour hériter des options)
    if (!isVirtualMode && !isDeferredMode) {
      // Mode réel : site_id et register_id sont obligatoires
      if (!formData.site_id) {
        errors.site_id = 'Site non trouvé';
      } else if (!/^[0-9a-fA-F-]{36}$/.test(formData.site_id)) {
        errors.site_id = 'ID site invalide';
      }

      if (!formData.register_id) {
        errors.register_id = 'Caisse non trouvée';
      } else if (!/^[0-9a-fA-F-]{36}$/.test(formData.register_id)) {
        errors.register_id = 'ID caisse invalide';
      }
    } else {
      // Mode virtuel/différé : site_id et register_id sont optionnels mais validés si présents
      if (formData.site_id && !/^[0-9a-fA-F-]{36}$/.test(formData.site_id)) {
        errors.site_id = 'ID site invalide';
      }
      if (formData.register_id && !/^[0-9a-fA-F-]{36}$/.test(formData.register_id)) {
        errors.register_id = 'ID caisse invalide';
      }
    }

    // B44-P3: Validation du montant initial (string avec virgule pour format français)
    // B50-P10: En mode différé, le montant initial est optionnel lors de la reprise d'une session
    const initialAmountStr = formData.initial_amount.toString().trim();
    const isResumingDeferredSession = isDeferredMode && registerStatus.is_active && registerStatus.session_id;
    
    if (initialAmountStr === '' || initialAmountStr === ',') {
      if (!isResumingDeferredSession) {
        errors.initial_amount = 'Veuillez saisir un montant initial';
      }
      // Si on reprend une session différée, le montant est optionnel (sera pris de la session existante)
    } else {
      // Convertir virgule en point pour la validation numérique
      const initialAmountNum = parseFloat(initialAmountStr.replace(',', '.'));
      if (isNaN(initialAmountNum)) {
        errors.initial_amount = 'Montant invalide';
      } else if (initialAmountNum < 0) {
        errors.initial_amount = 'Le montant initial ne peut pas être négatif';
      } else if (initialAmountNum > 10000) {
        errors.initial_amount = 'Le montant initial ne peut pas dépasser 10 000€';
      }
    }

    // B49-P7: Validation de la date de session pour saisie différée (format YYYY-MM-DD)
    // B50-P10: En mode différé, la date est optionnelle lors de la reprise d'une session
    if (isDeferredMode) {
      if (!sessionDate) {
        if (!isResumingDeferredSession) {
          errors.sessionDate = 'Veuillez sélectionner une date de session';
        }
        // Si on reprend une session différée, la date est optionnelle (sera prise de la session existante)
      } else {
        const now = new Date();
        now.setHours(0, 0, 0, 0);  // Comparer seulement les dates, pas les heures
        const selectedDate = new Date(sessionDate);
        selectedDate.setHours(0, 0, 0, 0);
        if (isNaN(selectedDate.getTime())) {
          errors.sessionDate = 'Date invalide';
        } else if (selectedDate > now) {
          errors.sessionDate = 'La date de session ne peut pas être dans le futur';
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Logging en dev
    if (import.meta.env.MODE !== 'production') {
      console.debug('Payload session:', formData);
      console.debug('Types des valeurs:', {
        operator_id_type: typeof formData.operator_id,
        site_id_type: typeof formData.site_id,
        register_id_type: typeof formData.register_id,
        initial_amount_type: typeof formData.initial_amount
      });
    }

    try {
      // B50-P10: En mode différé, si on reprend une session, utiliser les valeurs de la session existante si les champs sont vides
      const isResumingDeferredSession = isDeferredMode && registerStatus.is_active && registerStatus.session_id;
      let finalInitialAmount = formData.initial_amount;
      let finalSessionDate = sessionDate;
      
      if (isResumingDeferredSession) {
        const { currentSession } = cashSessionStore;
        if (currentSession) {
          // Utiliser le montant de la session si le champ est vide
          if (!finalInitialAmount || finalInitialAmount === '') {
            finalInitialAmount = currentSession.initial_amount?.toString().replace('.', ',') || '0';
          }
          // Utiliser la date de la session si le champ est vide
          if (!finalSessionDate) {
            const openedAtDate = new Date(currentSession.opened_at);
            finalSessionDate = openedAtDate.toISOString().split('T')[0];
          }
        }
      }
      
      // B44-P3: Convertir initial_amount de string (format français avec virgule) à number (point) AVANT toute autre opération
      // Cette conversion doit être faite en premier pour garantir que les stores virtuel/différé reçoivent toujours un number valide
      const initialAmountStr = finalInitialAmount.toString().trim();
      if (initialAmountStr === '' || initialAmountStr === ',') {
        if (!isResumingDeferredSession) {
          setValidationErrors({ initial_amount: 'Veuillez saisir un montant initial' });
          return;
        }
        // Si on reprend une session, utiliser 0 par défaut
        finalInitialAmount = '0';
      }
      // Convertir virgule en point pour parseFloat
      const initialAmountNum = parseFloat(finalInitialAmount.toString().replace(',', '.'));
      if (isNaN(initialAmountNum)) {
        setValidationErrors({ initial_amount: 'Montant invalide' });
        return;
      }
      if (initialAmountNum < 0) {
        setValidationErrors({ initial_amount: 'Le montant initial ne peut pas être négatif' });
        return;
      }

      // UX-B10: si une session est active pour cette caisse, reprendre
      // B44-P1: En mode différé, ne PAS reprendre une session normale existante
      if (!isVirtualMode && !isDeferredMode && registerStatus.is_active && registerStatus.session_id) {
        // En mode réel uniquement : vérifier via l'API
        const ok = await resumeSession(registerStatus.session_id);
        if (ok) {
          if (onSessionOpened) {
            onSessionOpened(registerStatus.session_id);
          } else {
            navigate(`${basePath}/sale`);
          }
          return;
        }
      }
      
      // En mode différé, vérifier d'abord si une session existe pour cette date (via existingSessionInfo)
      if (isDeferredMode && sessionDate && existingSessionInfo?.exists && existingSessionInfo.session_id) {
        // Une session existe déjà pour cette date : la reprendre au lieu d'en créer une nouvelle
        console.log('[handleSubmit] Session existante détectée pour la date, reprise:', existingSessionInfo.session_id);
        const ok = await resumeSession(existingSessionInfo.session_id);
        if (ok) {
          navigate(`${basePath}/sale`);
          return;
        } else {
          console.warn('[handleSubmit] Échec de la reprise de session existante, création d\'une nouvelle session');
          // Continuer pour créer une nouvelle session (fallback)
        }
      }
      
      // En mode virtuel ou différé, vérifier la session depuis le store
      if (isVirtualMode || isDeferredMode) {
        const { currentSession } = cashSessionStore;
        if (currentSession && currentSession.status === 'open') {
          // B44-P1: En mode différé, vérifier que c'est bien une session différée ET que la date correspond
          if (isDeferredMode) {
            const openedAtDate = new Date(currentSession.opened_at);
            const now = new Date();
            if (openedAtDate >= now) {
              // Session normale trouvée, ne pas la reprendre en mode différé
              console.warn('[handleSubmit] Session normale trouvée en mode différé, création d\'une nouvelle session');
            } else {
              // Vérifier que la date de la session correspond à la date saisie
              if (sessionDate) {
                const sessionDateObj = new Date(sessionDate + 'T00:00:00Z');
                const sessionDateOnly = sessionDateObj.toISOString().split('T')[0];
                const openedAtDateOnly = openedAtDate.toISOString().split('T')[0];
                
                if (sessionDateOnly === openedAtDateOnly) {
                  // Session différée valide ET date correspond : reprendre explicitement
                  console.log('[handleSubmit] Reprise de session différée pour la date:', sessionDateOnly);
                  // Reprendre explicitement la session pour charger les données
                  const ok = await resumeSession(currentSession.id);
                  if (ok) {
                    navigate(`${basePath}/sale`);
                    return;
                  } else {
                    console.warn('[handleSubmit] Échec de la reprise, création d\'une nouvelle session');
                    // Continuer pour créer une nouvelle session
                  }
                } else {
                  // Date différente : ne pas reprendre, créer une nouvelle session
                  console.log('[handleSubmit] Session différée trouvée mais date différente. Session:', openedAtDateOnly, 'Saisie:', sessionDateOnly);
                }
              } else {
                // Pas de date saisie mais session différée trouvée : ne pas reprendre (besoin d'une date)
                console.warn('[handleSubmit] Session différée trouvée mais pas de date saisie, création d\'une nouvelle session');
              }
            }
          } else {
            // Mode virtuel
            navigate(`${basePath}/sale`);
            return;
          }
        }
      }

      // B44-P1: Inclure opened_at si mode différé et date fournie
      // En mode virtuel/différé, site_id peut être vide - le store gérera le fallback
      // Ne pas envoyer site_id ou register_id s'ils sont vides (chaînes vides causent des erreurs UUID)
      const sessionData: any = {
        operator_id: formData.operator_id,
        initial_amount: initialAmountNum
      };
      
      // Ajouter site_id seulement s'il n'est pas vide
      // En mode différé, le store gérera le fallback si site_id n'est pas fourni
      if (formData.site_id && formData.site_id.trim() !== '') {
        sessionData.site_id = formData.site_id;
      } else if (!isVirtualMode && !isDeferredMode) {
        // En mode réel uniquement, site_id est obligatoire
        setValidationErrors({ site_id: 'Site non trouvé' });
        return;
      }
      // En mode virtuel/différé, on laisse le store gérer le fallback pour site_id
      
      // Ajouter register_id seulement s'il n'est pas vide
      if (formData.register_id && formData.register_id.trim() !== '') {
        sessionData.register_id = formData.register_id;
      }
      
      // B49-P7: sessionDate est maintenant une string au format YYYY-MM-DD (input type="date")
      // B50-P10: Utiliser finalSessionDate qui peut être pré-rempli depuis la session existante
      if (isDeferredMode && finalSessionDate) {
        // Convertir la date string (YYYY-MM-DD) en ISO 8601 avec timezone UTC
        // IMPORTANT: On doit créer une date à minuit UTC pour éviter les problèmes de timezone
        const dateObj = new Date(finalSessionDate);
        if (isNaN(dateObj.getTime())) {
          throw new Error('Date invalide');
        }
        
        // Créer une date à minuit UTC pour la date sélectionnée (évite les problèmes de timezone)
        // On extrait l'année, le mois et le jour de la date sélectionnée
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        const day = dateObj.getDate();
        
        // Créer une nouvelle date à minuit UTC avec ces valeurs
        const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const dateStr = utcDate.toISOString();
        
        sessionData.opened_at = dateStr;
        console.log('[handleSubmit] Using deferred date:', dateStr, 'from selected date:', finalSessionDate, 'UTC date:', utcDate);
      }

      console.log('[handleSubmit] Opening session with data:', sessionData);
      const session = await openSession(sessionData);

      if (session) {
        console.log('[handleSubmit] Session opened successfully:', session);
        // Redirection vers l'interface de vente
        if (onSessionOpened) {
          onSessionOpened(session.id);
        } else {
          navigate(`${basePath}/sale`);
        }
      } else {
        console.error('[handleSubmit] Session is null, error should be set in store');
        // L'erreur devrait être dans le store, mais on peut aussi vérifier ici
        const storeError = cashSessionStore.error;
        if (storeError) {
          console.error('[handleSubmit] Store error:', storeError);
          // Forcer l'affichage de l'erreur si elle existe
          setValidationErrors({ general: storeError });
        } else {
          // Si pas d'erreur explicite mais session null, c'est un problème
          console.error('[handleSubmit] Session null sans erreur explicite');
          setValidationErrors({ general: 'Impossible d\'ouvrir la session. Veuillez réessayer.' });
        }
      }
    } catch (error) {
      console.error('[handleSubmit] Exception during session opening:', error);
      // L'erreur devrait être gérée par le store, mais on peut aussi l'afficher ici
      const storeError = cashSessionStore.error;
      if (storeError) {
        console.error('[handleSubmit] Store error after exception:', storeError);
      }
    }
  };

  const handleCancel = () => {
    // Retourner au dashboard approprié selon le mode
    if (isDeferredMode) {
      navigate('/cash-register/deferred');
    } else {
      navigate(isVirtualMode ? '/cash-register/virtual' : '/caisse');
    }
  };

  return (
    <Container size="sm" py="xl">
      <Paper shadow="sm" p="xl" radius="md">
        <LoadingOverlay visible={loading} />
        
        <Group mb="xl">
          <IconCash size={32} color="#228be6" />
          <Title order={2}>Ouverture de Session de Caisse</Title>
        </Group>

        {(error || validationErrors.general) && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title={(error || validationErrors.general)?.includes('déjà ouverte') ? 'Session existante' : 'Erreur'}
            color={(error || validationErrors.general)?.includes('déjà ouverte') ? 'blue' : 'red'}
            mb="md"
            onClose={() => { 
              clearError(); 
              setValidationErrors(prev => { const { general, ...rest } = prev; return rest; });
            }}
            withCloseButton
          >
            {error || validationErrors.general}
            {(error || validationErrors.general)?.includes('déjà ouverte') && (
              <Group mt="sm">
                <Button
                  size="sm"
                  variant="light"
                  onClick={() => navigate(`${basePath}/sale`)}
                >
                  Aller à la vente
                </Button>
              </Group>
            )}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* B49-P7: Dropdowns Site et Caisse supprimés, récupérés depuis route params */}
          {/* B49-P7: DatePickerInput remplacé par input type="date" pour saisie différée */}
          {isDeferredMode && (
            <>
              <TextInput
                type="date"
                label="Date du cahier"
                placeholder="Sélectionnez la date de vente"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}  // Pas de date future (format YYYY-MM-DD)
                required
                error={validationErrors.sessionDate}
                icon={<IconCalendar size={16} />}
                mb="md"
                description="Date réelle de vente (date du cahier papier)"
                data-testid="deferred-session-date-input"
                styles={{
                  input: {
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }
                }}
              />
              
              {/* Reprise intelligente : Afficher si une session existe pour cette date */}
              {checkingSession && (
                <Alert icon={<IconAlertCircle size={16} />} color="blue" mb="md">
                  Vérification de l'existence d'une session...
                </Alert>
              )}
              
              {!checkingSession && existingSessionInfo?.exists && (
                <Alert 
                  icon={<IconAlertCircle size={16} />} 
                  color="blue" 
                  mb="md"
                  title={`Session du ${new Date(existingSessionInfo.opened_at || '').toLocaleDateString('fr-FR')} déjà ouverte`}
                  withCloseButton
                  onClose={() => setExistingSessionInfo(null)}
                >
                  <p style={{ marginBottom: '8px' }}>
                    Une session différée existe déjà pour cette date.
                  </p>
                  {existingSessionInfo.total_sales !== undefined && existingSessionInfo.total_sales > 0 && (
                    <p style={{ marginBottom: '8px', fontSize: '0.9rem', color: '#666' }}>
                      Ventes : {existingSessionInfo.total_sales.toFixed(2)}€ ({existingSessionInfo.total_items || 0} articles)
                    </p>
                  )}
                  <p style={{ marginBottom: '12px', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    Cliquez sur "Ouvrir la session" pour reprendre cette session existante.
                  </p>
                </Alert>
              )}
            </>
          )}

          <TextInput
            label="Fond de caisse initial"
            placeholder="0.00"
            value={formData.initial_amount}
            onChange={(e) => handleInitialAmountChange(e.target.value)}
            type="text"
            required
            error={validationErrors.initial_amount}
            icon={<IconCurrencyEuro size={16} />}
            mb="xl"
            description="Montant en euros (ex: 50.00 ou 50,00)"
            data-testid="initial-amount-input"
            autoFocus
          />
          {/* Erreur rendue via TextInput.error pour éviter les doublons */}

          <Group position="right">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Annuler
            </Button>
            {registerStatus.is_active ? (
              <Button
                type="submit"
                loading={loading}
                leftSection={<IconCash size={16} />}
                color="green"
              >
                Reprendre la Session
              </Button>
            ) : (
              <Button
                type="submit"
                loading={loading}
                leftSection={<IconCash size={16} />}
              >
                Ouvrir la Session
              </Button>
            )}
          </Group>
        </form>
      </Paper>
    </Container>
  );
};

export default OpenCashSession;
