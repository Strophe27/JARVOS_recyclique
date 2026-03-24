/**
 * Interface commune pour les stores de session de caisse
 * Story B50-P10: Unification des stores caisse
 * 
 * Cette interface définit le contrat que tous les stores de caisse doivent respecter:
 * - cashSessionStore (mode réel)
 * - virtualCashSessionStore (mode virtuel/démo)
 * - deferredCashSessionStore (mode saisie différée)
 */

// ============================================
// Types de base
// ============================================

export interface CashSession {
  id: string;
  operator_id: string;
  initial_amount: number;
  current_amount: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
  total_sales?: number;
  total_items?: number;
  total_donations?: number;  // B50-P10: Total des dons pour le calcul du montant théorique
  register_id?: string;
  register_options?: Record<string, unknown>;
}

export interface SaleItem {
  id: string;
  category: string;
  subcategory?: string;
  categoryName?: string;
  subcategoryName?: string;
  quantity: number;
  weight: number;
  price: number;
  total: number;
  presetId?: string;
  notes?: string;
}

export interface CashSessionCreate {
  operator_id: string;
  site_id: string;
  register_id?: string;
  initial_amount: number;
  opened_at?: string;  // Pour saisie différée
}

export interface CashSessionUpdate {
  status?: 'open' | 'closed';
  current_amount?: number;
  total_sales?: number;
  total_items?: number;
}

export interface SaleItemPayload {
  category: string;
  quantity: number;
  weight: number;
  unit_price: number;
  total_price: number;
  preset_id?: string | null;
  notes?: string | null;
}

export interface SaleCreate {
  cash_session_id: string;
  items: SaleItemPayload[];
  total_amount: number;
  donation?: number;
  payment_method?: string;
  note?: string | null;
}

// ============================================
// Types pour les actions
// ============================================

/**
 * Story B52-P1: Paiement individuel dans une liste de paiements multiples
 */
export interface Payment {
  paymentMethod: 'cash' | 'card' | 'check' | 'free';
  amount: number;
  cashGiven?: number;  // Pour espèces uniquement
  change?: number;     // Pour espèces uniquement
}

/**
 * Données de finalisation d'une vente
 * Utilisé par submitSale() pour inclure les informations de paiement
 * Story B52-P1: Support paiements multiples
 */
export interface FinalizationData {
  donation: number;
  paymentMethod?: 'cash' | 'card' | 'check' | 'free';  // Déprécié - utiliser payments
  payments?: Payment[];  // Story B52-P1: Liste de paiements multiples
  cashGiven?: number;  // Déprécié - utiliser payments[].cashGiven
  change?: number;     // Déprécié - utiliser payments[].change
  note?: string;
  /**
   * Story B49-P2: Montant total override (mode prix global)
   * Si fourni, ce montant remplace le calcul automatique depuis les items
   */
  overrideTotalAmount?: number;
}

/**
 * Données pour fermer une session de caisse
 */
export interface CloseSessionData {
  actual_amount: number;
  variance_comment?: string;
}

/**
 * État du scroll pour l'affichage du ticket
 */
export interface ScrollState {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  canScrollUp: boolean;
  canScrollDown: boolean;
  isScrollable: boolean;
}

// ============================================
// Interface principale du store
// ============================================

/**
 * Interface commune pour tous les stores de session de caisse
 * 
 * Tous les stores (réel, virtuel, différé) doivent implémenter cette interface
 * pour garantir la compatibilité avec le CashStoreProvider et les composants.
 */
export interface ICashSessionStore {
  // ========== State ==========
  
  /** Session de caisse courante */
  currentSession: CashSession | null;
  
  /** Liste des sessions */
  sessions: CashSession[];
  
  /** Items de la vente en cours */
  currentSaleItems: SaleItem[];
  
  /** Note de la vente en cours */
  currentSaleNote: string | null;
  
  /** Indicateur de chargement */
  loading: boolean;
  
  /** Message d'erreur */
  error: string | null;
  
  /** État du scroll du ticket */
  ticketScrollState: ScrollState;
  
  /** Options de workflow du registre courant (B49-P3) */
  currentRegisterOptions: Record<string, unknown> | null;

  // ========== Setters ==========
  
  /** Définir la session courante */
  setCurrentSession: (session: CashSession | null) => void;
  
  /** Définir la liste des sessions */
  setSessions: (sessions: CashSession[]) => void;
  
  /** Définir l'état de chargement */
  setLoading: (loading: boolean) => void;
  
  /** Définir le message d'erreur */
  setError: (error: string | null) => void;
  
  /** Effacer l'erreur */
  clearError: () => void;
  
  /** Définir les options du registre courant (B49-P3) */
  setCurrentRegisterOptions: (options: Record<string, unknown> | null) => void;

  // ========== Actions sur les ventes ==========
  
  /** Ajouter un item à la vente courante */
  addSaleItem: (item: Omit<SaleItem, 'id'>) => void;
  
  /** Supprimer un item de la vente courante */
  removeSaleItem: (itemId: string) => void;
  
  /** Mettre à jour un item de la vente courante */
  updateSaleItem: (
    itemId: string, 
    newQuantity: number, 
    newWeight: number, 
    newPrice: number, 
    presetId?: string, 
    notes?: string
  ) => void;
  
  /** Définir la note de la vente courante */
  setCurrentSaleNote: (note: string | null) => void;
  
  /** Effacer la vente courante */
  clearCurrentSale: () => void;
  
  /**
   * Soumettre une vente
   * 
   * @param items - Items à vendre
   * @param finalization - Données de finalisation (paiement, don, etc.)
   * @returns true si la vente a été enregistrée avec succès
   * 
   * IMPORTANT: Si finalization.overrideTotalAmount est fourni, il doit être utilisé
   * comme total_amount au lieu du calcul automatique depuis les items.
   */
  submitSale: (items: SaleItem[], finalization?: FinalizationData) => Promise<boolean>;

  // ========== Actions sur le scroll ==========
  
  /** Définir la position du scroll */
  setScrollPosition: (scrollTop: number) => void;
  
  /** Mettre à jour l'état du scroll */
  updateScrollableState: (
    isScrollable: boolean, 
    canScrollUp: boolean, 
    canScrollDown: boolean, 
    scrollHeight: number, 
    clientHeight: number
  ) => void;
  
  /** Réinitialiser l'état du scroll */
  resetScrollState: () => void;

  // ========== Actions asynchrones ==========
  
  /**
   * Ouvrir une nouvelle session de caisse
   * @returns La session créée ou null en cas d'erreur
   */
  openSession: (data: CashSessionCreate) => Promise<CashSession | null>;
  
  /**
   * Fermer une session de caisse
   * 
   * @param sessionId - ID de la session à fermer
   * @param closeData - Données de fermeture (montant réel, commentaire écart)
   * @returns true si la fermeture a réussi
   * 
   * IMPORTANT: Cette méthode DOIT retourner false si l'API échoue.
   * Elle DOIT mettre currentSession à null si la fermeture réussit.
   */
  closeSession: (sessionId: string, closeData?: CloseSessionData) => Promise<boolean>;
  
  /** Mettre à jour une session */
  updateSession: (sessionId: string, data: CashSessionUpdate) => Promise<boolean>;
  
  /** Charger la liste des sessions */
  fetchSessions: () => Promise<void>;
  
  /** Charger la session courante */
  fetchCurrentSession: () => Promise<void>;
  
  /** Rafraîchir la session courante */
  refreshSession: () => Promise<void>;
  
  /** Reprendre une session existante */
  resumeSession: (sessionId: string) => Promise<boolean>;
}

// ============================================
// Type guards et utilitaires
// ============================================

/**
 * Vérifie si un objet implémente l'interface ICashSessionStore
 */
export function isICashSessionStore(obj: unknown): obj is ICashSessionStore {
  if (!obj || typeof obj !== 'object') return false;
  
  const store = obj as Record<string, unknown>;
  
  // Vérifier les propriétés requises
  const requiredProperties = [
    'currentSession',
    'currentSaleItems',
    'loading',
    'error',
    'submitSale',
    'closeSession',
    'openSession',
    'refreshSession'
  ];
  
  return requiredProperties.every(prop => prop in store);
}

