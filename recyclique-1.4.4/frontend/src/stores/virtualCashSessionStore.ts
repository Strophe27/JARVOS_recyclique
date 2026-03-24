import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getCashRegister } from '../services/api';  // B49-P3: Pour charger les options de workflow depuis la caisse source

// Import types from the regular cash session store
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
}

export interface CashSessionUpdate {
  status?: 'open' | 'closed';
  current_amount?: number;
  total_sales?: number;
  total_items?: number;
}

export interface SaleCreate {
  cash_session_id: string;
  items: {
    category: string;
    quantity: number;
    weight: number;
    unit_price: number;
    total_price: number;
    preset_id?: string | null;
    notes?: string | null;
  }[];
  total_amount: number;
  donation?: number;
  payment_method?: string;
  note?: string | null;
}

interface ScrollState {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  canScrollUp: boolean;
  canScrollDown: boolean;
  isScrollable: boolean;
}

interface VirtualCashSessionState {
  // State
  currentSession: CashSession | null;
  sessions: CashSession[];
  currentSaleItems: SaleItem[];
  currentSaleNote: string | null;
  loading: boolean;
  error: string | null;
  ticketOpenedLogged: boolean;  // B51-P5: Flag pour détecter anomalies (ITEM_ADDED_WITHOUT_TICKET)

  // Scroll state for ticket display
  ticketScrollState: ScrollState;

  // Virtual mode specific
  isVirtualMode: boolean;
  virtualSessions: CashSession[];
  virtualSales: any[];

  // B49-P3: Options de workflow héritées de la caisse source
  currentRegisterOptions: Record<string, any> | null;

  // Actions
  setCurrentSession: (session: CashSession | null) => void;
  setSessions: (sessions: CashSession[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setCurrentRegisterOptions: (options: Record<string, any> | null) => void;  // B49-P3: Définir les options héritées

  // Sale actions
  addSaleItem: (item: Omit<SaleItem, 'id'>) => void;
  removeSaleItem: (itemId: string) => void;
  updateSaleItem: (itemId: string, newQuantity: number, newWeight: number, newPrice: number, presetId?: string, notes?: string) => void;
  setCurrentSaleNote: (note: string | null) => void;
  clearCurrentSale: () => void;
  submitSale: (items: SaleItem[], finalization?: { donation: number; paymentMethod: 'cash'|'card'|'check'; cashGiven?: number; change?: number; overrideTotalAmount?: number; }) => Promise<boolean>;

  // Scroll actions
  setScrollPosition: (scrollTop: number) => void;
  updateScrollableState: (isScrollable: boolean, canScrollUp: boolean, canScrollDown: boolean, scrollHeight: number, clientHeight: number) => void;
  resetScrollState: () => void;

  // Async actions
  openSession: (data: CashSessionCreate) => Promise<CashSession | null>;
  closeSession: (sessionId: string) => Promise<boolean>;
  updateSession: (sessionId: string, data: CashSessionUpdate) => Promise<boolean>;
  fetchSessions: () => Promise<void>;
  fetchCurrentSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
  resumeSession: (sessionId: string) => Promise<boolean>;

  // Virtual mode specific actions
  enableVirtualMode: () => void;
  disableVirtualMode: () => void;
  resetVirtualData: () => void;
}

// Storage keys for virtual mode
const VIRTUAL_STORAGE_KEYS = {
  SESSIONS: 'virtual_cash_sessions',
  CURRENT_SESSION: 'virtual_current_session',
  SALES: 'virtual_sales',
  SALE_ITEMS: 'virtual_sale_items',
  SALE_NOTE: 'virtual_sale_note'
};

// Helper functions for localStorage operations
const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[VirtualCashStore] Failed to save to localStorage:', error);
  }
};

// Generate virtual IDs
const generateVirtualId = (prefix: string = 'virtual'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useVirtualCashSessionStore = create<VirtualCashSessionState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentSession: null,
      sessions: [],
      currentSaleItems: [],
      currentSaleNote: null,
      loading: false,
      error: null,
      ticketOpenedLogged: false,  // B51-P5: Flag pour détecter anomalies (ITEM_ADDED_WITHOUT_TICKET)
      currentRegisterOptions: null,  // B49-P3: Options de workflow héritées de la caisse source
      ticketScrollState: {
        scrollTop: 0,
        scrollHeight: 0,
        clientHeight: 0,
        canScrollUp: false,
        canScrollDown: false,
        isScrollable: false
      },

      // Virtual mode specific
      isVirtualMode: false,
      virtualSessions: [],
      virtualSales: [],

      // Setters
      setCurrentSession: (session) => {
        set({ currentSession: session });
        if (get().isVirtualMode && session) {
          saveToStorage(VIRTUAL_STORAGE_KEYS.CURRENT_SESSION, session);
        }
      },

      setSessions: (sessions) => set({ sessions }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      setCurrentRegisterOptions: (options) => set({ currentRegisterOptions: options }),  // B49-P3: Définir les options héritées

      // Sale actions
      addSaleItem: (item: Omit<SaleItem, 'id'>) => {
        const state = get();
        
        const wasEmpty = state.currentSaleItems.length === 0;
        
        // Si le panier était vide, c'est l'ouverture d'un nouveau ticket
        // On marque ticketOpenedLogged à true IMMÉDIATEMENT pour permettre les ajouts
        if (wasEmpty && !state.ticketOpenedLogged) {
          set({ ticketOpenedLogged: true });
        }
        
        // B51-P5 FIX 1: Validation CRITIQUE - Bloquer l'ajout si aucun ticket n'est explicitement ouvert
        // IMPORTANT: Vérifier AVANT de créer newItem et AVANT d'ajouter au panier
        // Mais permettre l'ajout si le panier était vide (ouverture normale d'un ticket)
        const currentState = get(); // Obtenir l'état à jour après le set()
        if (!currentState.ticketOpenedLogged && !wasEmpty) {
          console.warn('[addSaleItem] Tentative d\'ajout d\'article sans ticket ouvert - BLOQUÉ');
          
          // Logger l'anomalie (pour les sessions virtuelles, on peut logger mais pas nécessairement envoyer au backend)
          if (state.currentSession) {
            import('../services/transactionLogService').then(({ transactionLogService }) => {
              const cartState = {
                items_count: state.currentSaleItems.length,  // Pas +1 car on bloque l'ajout
                items: state.currentSaleItems.map(item => ({
                  id: item.id,
                  category: item.category,
                  weight: item.weight,
                  price: item.total
                })),
                total: state.currentSaleItems.reduce((sum, item) => sum + item.total, 0)
              };
              transactionLogService.logAnomaly(
                state.currentSession!.id,
                cartState,
                'Item added but no ticket is explicitly opened - BLOCKED (B51-P5 fix)'
              ).catch(err => console.error('[TransactionLog] Erreur:', err));
            }).catch(err => console.error('[TransactionLog] Erreur lors de l\'import:', err));
          }
          
          // B51-P5 FIX 1: BLOQUER l'ajout - ne pas créer newItem ni l'ajouter au panier
          return; // Sortir immédiatement, ne pas ajouter l'item
        }
        
        // Si ticketOpenedLogged = true, continuer normalement
        const newItem: SaleItem = {
          ...item,
          id: generateVirtualId('item'),
          presetId: item.presetId,
          notes: item.notes
        };

        set((state) => ({
          currentSaleItems: [...state.currentSaleItems, newItem]
        }));

        // Save to storage in virtual mode
        if (get().isVirtualMode) {
          const updatedItems = [...get().currentSaleItems, newItem];
          saveToStorage(VIRTUAL_STORAGE_KEYS.SALE_ITEMS, updatedItems);
        }
      },

      removeSaleItem: (itemId: string) => {
        set((state) => ({
          currentSaleItems: state.currentSaleItems.filter(item => item.id !== itemId)
        }));

        // Save to storage in virtual mode
        if (get().isVirtualMode) {
          const updatedItems = get().currentSaleItems.filter(item => item.id !== itemId);
          saveToStorage(VIRTUAL_STORAGE_KEYS.SALE_ITEMS, updatedItems);
        }
      },

      updateSaleItem: (itemId: string, newQuantity: number, newWeight: number, newPrice: number, presetId?: string | null, notes?: string) => {
        set((state) => ({
          currentSaleItems: state.currentSaleItems.map(item =>
            item.id === itemId
              ? {
                  ...item,
                  quantity: newQuantity,
                  weight: newWeight,
                  price: newPrice,
                  total: newQuantity * newPrice,
                  // presetId: undefined => ne pas toucher ; null => effacer ; string => nouveau preset
                  presetId: presetId !== undefined ? (presetId === null ? undefined : presetId) : item.presetId,
                  notes: notes !== undefined ? notes : item.notes
                }
              : item
          )
        }));

        // Save to storage in virtual mode
        if (get().isVirtualMode) {
          const updatedItems = get().currentSaleItems.map(item =>
            item.id === itemId
              ? {
                  ...item,
                  quantity: newQuantity,
                  weight: newWeight,
                  price: newPrice,
                  total: newQuantity * newPrice,
                  presetId: presetId !== undefined ? (presetId === null ? undefined : presetId) : item.presetId,
                  notes: notes !== undefined ? notes : item.notes
                }
              : item
          );
          saveToStorage(VIRTUAL_STORAGE_KEYS.SALE_ITEMS, updatedItems);
        }
      },

      setCurrentSaleNote: (note: string | null) => {
        set({ currentSaleNote: note });

        // Save to storage in virtual mode
        if (get().isVirtualMode) {
          saveToStorage(VIRTUAL_STORAGE_KEYS.SALE_NOTE, note);
        }
      },

      clearCurrentSale: () => {
        set({
          currentSaleItems: [],
          currentSaleNote: null,
          ticketOpenedLogged: false,  // B51-P5: Réinitialiser le flag lors du reset
          ticketScrollState: {
            scrollTop: 0,
            scrollHeight: 0,
            clientHeight: 0,
            canScrollUp: false,
            canScrollDown: false,
            isScrollable: false
          }
        });

        // Clear storage in virtual mode
        if (get().isVirtualMode) {
          saveToStorage(VIRTUAL_STORAGE_KEYS.SALE_ITEMS, []);
          saveToStorage(VIRTUAL_STORAGE_KEYS.SALE_NOTE, null);
        }
      },

      submitSale: async (items: SaleItem[], finalization?: { donation: number; paymentMethod: 'cash'|'card'|'check'; cashGiven?: number; change?: number; overrideTotalAmount?: number; }): Promise<boolean> => {
        console.warn('[VirtualCashStore] VIRTUAL MODE: Sale data will not be persisted to database');

        const { currentSession } = get();

        if (!currentSession) {
          const errorMsg = 'Aucune session de caisse active';
          console.error('[submitSale]', errorMsg);
          set({ error: errorMsg });
          return false;
        }

        if (!get().isVirtualMode) {
          const errorMsg = 'Mode virtuel non activé';
          set({ error: errorMsg });
          return false;
        }

        set({ loading: true, error: null });

        try {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));

          // Story B50-P9: Utiliser overrideTotalAmount si fourni, sinon calcul automatique
          const calculatedTotal = items.reduce((sum, item) => sum + item.total, 0);
          const finalTotalAmount = finalization?.overrideTotalAmount !== undefined 
            ? finalization.overrideTotalAmount 
            : calculatedTotal;

          // Create virtual sale record
          const virtualSale = {
            id: generateVirtualId('sale'),
            cash_session_id: currentSession.id,
            items: items,
            total_amount: finalTotalAmount,
            donation: finalization?.donation ?? 0,
            payment_method: finalization?.paymentMethod ?? 'cash',
            note: get().currentSaleNote || null,
            created_at: new Date().toISOString()
          };

          // Store virtual sale
          const existingSales = getFromStorage(VIRTUAL_STORAGE_KEYS.SALES, []);
          const updatedSales = [...existingSales, virtualSale];
          saveToStorage(VIRTUAL_STORAGE_KEYS.SALES, updatedSales);

          // Update session totals
          // B50-P10: Inclure total_donations dans le calcul
          const currentTotalDonations = currentSession.total_donations || 0;
          const saleDonation = finalization?.donation || 0;
          const updatedSession = {
            ...currentSession,
            total_sales: (currentSession.total_sales || 0) + virtualSale.total_amount,
            total_items: (currentSession.total_items || 0) + items.length,
            total_donations: currentTotalDonations + saleDonation  // B50-P10: Ajouter les dons
          };

          set({ currentSession: updatedSession });
          saveToStorage(VIRTUAL_STORAGE_KEYS.CURRENT_SESSION, updatedSession);

          // Clear current sale on success
          set({
            currentSaleItems: [],
            currentSaleNote: null,
            loading: false,
            virtualSales: updatedSales
          });

          // Clear sale items from storage
          saveToStorage(VIRTUAL_STORAGE_KEYS.SALE_ITEMS, []);
          saveToStorage(VIRTUAL_STORAGE_KEYS.SALE_NOTE, null);

          console.log('[VirtualCashStore] Virtual sale recorded:', virtualSale);
          return true;
        } catch (error: any) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement de la vente';
          console.error('[submitSale] Error:', errorMessage);
          set({ error: errorMessage, loading: false });
          return false;
        }
      },

      // Scroll actions
      setScrollPosition: (scrollTop: number) => {
        set((state) => ({
          ticketScrollState: {
            ...state.ticketScrollState,
            scrollTop,
            canScrollUp: scrollTop > 0,
            canScrollDown: scrollTop < state.ticketScrollState.scrollHeight - state.ticketScrollState.clientHeight - 1
          }
        }));
      },

      updateScrollableState: (isScrollable: boolean, canScrollUp: boolean, canScrollDown: boolean, scrollHeight: number, clientHeight: number) => {
        set((state) => ({
          ticketScrollState: {
            ...state.ticketScrollState,
            isScrollable,
            canScrollUp,
            canScrollDown,
            scrollHeight,
            clientHeight
          }
        }));
      },

      resetScrollState: () => {
        set({
          ticketScrollState: {
            scrollTop: 0,
            scrollHeight: 0,
            clientHeight: 0,
            canScrollUp: false,
            canScrollDown: false,
            isScrollable: false
          }
        });
      },

      // Async actions
      openSession: async (data: CashSessionCreate): Promise<CashSession | null> => {
        console.warn('[VirtualCashStore] VIRTUAL MODE: Session data will not be persisted to database');

        if (!get().isVirtualMode) {
          const errorMsg = 'Mode virtuel non activé';
          set({ error: errorMsg, loading: false });
          return null;
        }

        set({ loading: true, error: null });

        try {
          // Validation: s'assurer que initial_amount est un number valide
          const initialAmount = typeof data.initial_amount === 'number' 
            ? data.initial_amount 
            : parseFloat(String(data.initial_amount || '0').replace(',', '.'));
          
          if (isNaN(initialAmount) || initialAmount < 0) {
            const errorMsg = 'Montant initial invalide';
            set({ error: errorMsg, loading: false });
            return null;
          }

          // B49-P3: Charger les options de workflow depuis la caisse source si register_id est présent
          let registerOptions: Record<string, any> | null = null;
          if (data.register_id) {
            try {
              const register = await getCashRegister(data.register_id);
              if (register?.workflow_options) {
                registerOptions = register.workflow_options;
                console.log('[VirtualCashStore] Options héritées de la caisse source:', registerOptions);
              }
            } catch (error) {
              console.warn('[VirtualCashStore] Impossible de charger les options de la caisse source:', error);
            }
          }

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));

          const session: CashSession = {
            id: generateVirtualId('session'),
            operator_id: data.operator_id,
            initial_amount: initialAmount,
            current_amount: initialAmount,
            status: 'open',
            opened_at: new Date().toISOString(),
            total_sales: 0,
            total_items: 0
          };

          // Store session
          const existingSessions = getFromStorage(VIRTUAL_STORAGE_KEYS.SESSIONS, []);
          const updatedSessions = [...existingSessions, session];
          saveToStorage(VIRTUAL_STORAGE_KEYS.SESSIONS, updatedSessions);

          set({
            currentSession: session,
            sessions: updatedSessions,
            virtualSessions: updatedSessions,
            currentRegisterOptions: registerOptions,  // B49-P3: Stocker les options héritées
            loading: false
          });

          saveToStorage(VIRTUAL_STORAGE_KEYS.CURRENT_SESSION, session);

          console.log('[VirtualCashStore] Virtual session opened:', session);
          return session;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'ouverture de session';
          set({ error: errorMessage, loading: false });
          return null;
        }
      },

      closeSession: async (sessionId: string, closeData?: { actual_amount: number; variance_comment?: string }): Promise<boolean> => {
        console.warn('[VirtualCashStore] VIRTUAL MODE: Session data will not be persisted to database');

        if (!get().isVirtualMode) {
          const errorMsg = 'Mode virtuel non activé';
          set({ error: errorMsg, loading: false });
          return false;
        }

        set({ loading: true, error: null });

        try {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));

          const { currentSession } = get();
          if (!currentSession || currentSession.id !== sessionId) {
            set({ error: 'Session non trouvée', loading: false });
            return false;
          }

          const closedSession: CashSession = {
            ...currentSession,
            status: 'closed',
            closed_at: new Date().toISOString(),
            current_amount: closeData?.actual_amount ?? currentSession.current_amount
          };

          // Update stored sessions
          const existingSessions = getFromStorage(VIRTUAL_STORAGE_KEYS.SESSIONS, []);
          const updatedSessions = existingSessions.map(s =>
            s.id === sessionId ? closedSession : s
          );
          saveToStorage(VIRTUAL_STORAGE_KEYS.SESSIONS, updatedSessions);

          set({
            currentSession: null,
            sessions: updatedSessions,
            virtualSessions: updatedSessions,
            loading: false
          });

          // Clear current session from storage
          localStorage.removeItem(VIRTUAL_STORAGE_KEYS.CURRENT_SESSION);

          console.log('[VirtualCashStore] Virtual session closed:', closedSession);
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la fermeture de session';
          set({ error: errorMessage, loading: false });
          return false;
        }
      },

      updateSession: async (sessionId: string, data: CashSessionUpdate): Promise<boolean> => {
        console.warn('[VirtualCashStore] VIRTUAL MODE: Session data will not be persisted to database');

        if (!get().isVirtualMode) {
          return false;
        }

        try {
          const existingSessions = getFromStorage(VIRTUAL_STORAGE_KEYS.SESSIONS, []);
          const sessionIndex = existingSessions.findIndex(s => s.id === sessionId);

          if (sessionIndex === -1) {
            return false;
          }

          const updatedSession = { ...existingSessions[sessionIndex], ...data };
          existingSessions[sessionIndex] = updatedSession;

          saveToStorage(VIRTUAL_STORAGE_KEYS.SESSIONS, existingSessions);

          const { currentSession } = get();
          if (currentSession && currentSession.id === sessionId) {
            set({ currentSession: updatedSession });
            saveToStorage(VIRTUAL_STORAGE_KEYS.CURRENT_SESSION, updatedSession);
          }

          set({ sessions: existingSessions, virtualSessions: existingSessions });
          return true;
        } catch (error) {
          console.error('[updateSession] Error:', error);
          return false;
        }
      },

      fetchSessions: async (): Promise<void> => {
        if (!get().isVirtualMode) {
          set({ sessions: [] });
          return;
        }

        try {
          const sessions = getFromStorage(VIRTUAL_STORAGE_KEYS.SESSIONS, []);
          set({ sessions, virtualSessions: sessions });
        } catch (error) {
          console.error('[fetchSessions] Error:', error);
          set({ sessions: [], virtualSessions: [] });
        }
      },

      fetchCurrentSession: async (): Promise<void> => {
        if (!get().isVirtualMode) {
          set({ currentSession: null });
          return;
        }

        try {
          const session = getFromStorage(VIRTUAL_STORAGE_KEYS.CURRENT_SESSION, null);
          const saleItems = getFromStorage(VIRTUAL_STORAGE_KEYS.SALE_ITEMS, []);
          const saleNote = getFromStorage(VIRTUAL_STORAGE_KEYS.SALE_NOTE, null);

          if (session) {
            set({
              currentSession: session,
              currentSaleItems: saleItems,
              currentSaleNote: saleNote
            });
          } else {
            set({
              currentSession: null,
              currentSaleItems: [],
              currentSaleNote: null
            });
          }
        } catch (error) {
          console.error('[fetchCurrentSession] Error:', error);
          set({ currentSession: null, currentSaleItems: [], currentSaleNote: null });
        }
      },

      refreshSession: async (): Promise<void> => {
        await get().fetchCurrentSession();
      },

      resumeSession: async (sessionId: string): Promise<boolean> => {
        if (!get().isVirtualMode) {
          return false;
        }

        try {
          const sessions = getFromStorage(VIRTUAL_STORAGE_KEYS.SESSIONS, []);
          const session = sessions.find(s => s.id === sessionId && s.status === 'open');

          if (session) {
            set({ currentSession: session });
            saveToStorage(VIRTUAL_STORAGE_KEYS.CURRENT_SESSION, session);

            // Load associated sale data if any
            const saleItems = getFromStorage(VIRTUAL_STORAGE_KEYS.SALE_ITEMS, []);
            const saleNote = getFromStorage(VIRTUAL_STORAGE_KEYS.SALE_NOTE, null);
            set({ currentSaleItems: saleItems, currentSaleNote: saleNote });

            return true;
          }

          return false;
        } catch (error) {
          console.error('[resumeSession] Error:', error);
          return false;
        }
      },

      // Virtual mode specific actions
      enableVirtualMode: () => {
        console.warn('[VirtualCashStore] VIRTUAL MODE ENABLED: All operations will use local storage only');
        set({ isVirtualMode: true });

        // Load existing virtual data
        const sessions = getFromStorage(VIRTUAL_STORAGE_KEYS.SESSIONS, []);
        const currentSession = getFromStorage(VIRTUAL_STORAGE_KEYS.CURRENT_SESSION, null);
        const saleItems = getFromStorage(VIRTUAL_STORAGE_KEYS.SALE_ITEMS, []);
        const saleNote = getFromStorage(VIRTUAL_STORAGE_KEYS.SALE_NOTE, null);
        const sales = getFromStorage(VIRTUAL_STORAGE_KEYS.SALES, []);

        set({
          virtualSessions: sessions,
          currentSession,
          currentSaleItems: saleItems,
          currentSaleNote: saleNote,
          virtualSales: sales
        });
      },

      disableVirtualMode: () => {
        console.log('[VirtualCashStore] VIRTUAL MODE DISABLED: Switching back to production mode');
        set({
          isVirtualMode: false,
          currentSession: null,
          sessions: [],
          currentSaleItems: [],
          currentSaleNote: null,
          virtualSessions: [],
          virtualSales: []
        });
      },

      resetVirtualData: () => {
        console.warn('[VirtualCashStore] Resetting all virtual cash data');

        // Clear all virtual storage
        Object.values(VIRTUAL_STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });

        // Reset state
        set({
          currentSession: null,
          sessions: [],
          currentSaleItems: [],
          currentSaleNote: null,
          virtualSessions: [],
          virtualSales: [],
          ticketScrollState: {
            scrollTop: 0,
            scrollHeight: 0,
            clientHeight: 0,
            canScrollUp: false,
            canScrollDown: false,
            isScrollable: false
          }
        });
      }
    }),
    {
      name: 'virtual-cash-session-store'
    }
  )
);

export default useVirtualCashSessionStore;








