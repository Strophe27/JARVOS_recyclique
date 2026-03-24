import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { cashSessionService } from '../services/cashSessionService';
import axiosClient from '../api/axiosClient';

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
  presetId?: string;  // ID du preset utilisé pour cet item
  notes?: string;     // Notes pour cet item
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

export interface SaleItem {
  id: string;
  category: string;
  subcategory?: string;
  categoryName?: string;
  subcategoryName?: string;
  quantity: number;
  weight: number;  // Poids en kg
  price: number;
  total: number;
}

export interface SaleCreate {
  cash_session_id: string;
  items: {
    category: string;
    quantity: number;
    weight: number;  // Poids en kg
    unit_price: number;
    total_price: number;
    preset_id?: string | null;  // Story 1.1.2: Preset par item
    notes?: string | null;  // Story 1.1.2: Notes par item
  }[];
  total_amount: number;
  donation?: number;
  payment_method?: string;
  note?: string | null;  // Story B40-P1: Notes sur les tickets de caisse
}

interface ScrollState {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  canScrollUp: boolean;
  canScrollDown: boolean;
  isScrollable: boolean;
}

interface CashSessionState {
  // State
  currentSession: CashSession | null;
  sessions: CashSession[];
  currentSaleItems: SaleItem[];
  currentSaleNote: string | null;  // Story B40-P1: Notes sur les tickets de caisse
  loading: boolean;
  error: string | null;

  // Scroll state for ticket display
  ticketScrollState: ScrollState;

  // B48-P2: Flag pour tracker si un TICKET_OPENED a été loggé pour la session courante
  // Permet de détecter l'anomalie "ITEM_ADDED_WITHOUT_TICKET"
  ticketOpenedLogged: boolean;

  // B49-P3: Options de workflow du register courant
  currentRegisterOptions: Record<string, any> | null;

  // Actions
  setCurrentSession: (session: CashSession | null) => void;
  setSessions: (sessions: CashSession[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setCurrentRegisterOptions: (options: Record<string, any> | null) => void;  // B49-P3: Définir les options du register

  // Sale actions
  addSaleItem: (item: Omit<SaleItem, 'id'>) => void;
  removeSaleItem: (itemId: string) => void;
  updateSaleItem: (itemId: string, newQuantity: number, newWeight: number, newPrice: number, presetId?: string | null, notes?: string) => void;
  setCurrentSaleNote: (note: string | null) => void;  // Story B40-P1: Notes sur les tickets de caisse
  clearCurrentSale: () => void;
  submitSale: (items: SaleItem[], finalization?: { donation: number; paymentMethod: 'cash'|'card'|'check'; cashGiven?: number; change?: number; note?: string; overrideTotalAmount?: number; }) => Promise<boolean>;

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
  // UX-B10
  resumeSession: (sessionId: string) => Promise<boolean>;
}

export const useCashSessionStore = create<CashSessionState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentSession: null,
        sessions: [],
        currentSaleItems: [],
        currentSaleNote: null,  // Story B40-P1: Notes sur les tickets de caisse
        loading: false,
        error: null,
        ticketOpenedLogged: false,  // B48-P2: Flag pour détecter anomalies (ITEM_ADDED_WITHOUT_TICKET)
        currentRegisterOptions: null,  // B49-P3: Options de workflow du register courant
        ticketScrollState: {
          scrollTop: 0,
          scrollHeight: 0,
          clientHeight: 0,
          canScrollUp: false,
          canScrollDown: false,
          isScrollable: false
        },

        // Setters
        setCurrentSession: (session) => {
          // B50-P6: Logging pour tracer le chargement des options
          const registerOptions = (session as any)?.register_options || null;
          console.log('[Store] setCurrentSession appelé avec register_options:', registerOptions);
          console.log('[Store] currentRegisterOptions avant set:', get().currentRegisterOptions);
          
          set({ 
            currentSession: session,
            ticketOpenedLogged: false,  // B48-P2: Réinitialiser le flag lors d'un changement de session
            // B49-P3: Charger les options depuis register_options de la session
            // B50-P6: Si session n'a pas register_options mais qu'on a déjà des options persistées, les conserver
            currentRegisterOptions: registerOptions || get().currentRegisterOptions
          });
          
          console.log('[Store] currentRegisterOptions après set:', get().currentRegisterOptions);
        },
        setCurrentRegisterOptions: (options) => {
          // B50-P6: Logging pour tracer les changements d'options
          console.log('[Store] setCurrentRegisterOptions appelé avec:', options);
          console.log('[Store] currentRegisterOptions avant set:', get().currentRegisterOptions);
          set({ currentRegisterOptions: options });
          console.log('[Store] currentRegisterOptions après set:', get().currentRegisterOptions);
        },
        setSessions: (sessions) => set({ sessions }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

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
            
            // Logger l'anomalie
            if (currentState.currentSession) {
              import('../services/transactionLogService').then(({ transactionLogService }) => {
                const cartState = {
                  items_count: currentState.currentSaleItems.length,  // Pas +1 car on bloque l'ajout
                  items: currentState.currentSaleItems.map(item => ({
                    id: item.id,
                    category: item.category,
                    weight: item.weight,
                    price: item.total
                  })),
                  total: currentState.currentSaleItems.reduce((sum, item) => sum + item.total, 0)
                };
                transactionLogService.logAnomaly(
                  currentState.currentSession!.id,
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
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            presetId: item.presetId,
            notes: item.notes
          };
          
          set({
            currentSaleItems: [...state.currentSaleItems, newItem]
          });

          // B48-P2: Détection d'anomalies et logging
          if (state.currentSession) {
            // Import dynamique et appel asynchrone (fire-and-forget)
            import('../services/transactionLogService').then(({ transactionLogService }) => {
              const cartState = {
                items_count: state.currentSaleItems.length + 1,  // +1 car on vient d'ajouter l'item
                items: [...state.currentSaleItems, newItem].map(item => ({
                  id: item.id,
                  category: item.category,
                  weight: item.weight,
                  price: item.total
                })),
                total: [...state.currentSaleItems, newItem].reduce((sum, item) => sum + item.total, 0)
              };

              // Cas normal: panier était vide, on ouvre un nouveau ticket
              // (TICKET_OPENED a déjà été loggé précédemment, donc pas d'anomalie)
              if (wasEmpty) {
                transactionLogService.logTicketOpened(
                  state.currentSession!.id,
                  cartState,
                  false // Pas d'anomalie
                ).catch((err) => {
                  console.error('[TransactionLog] Erreur lors du log TICKET_OPENED:', err);
                });
              }
              // Si le panier n'était pas vide et qu'un TICKET_OPENED a déjà été loggé,
              // c'est normal (ajout d'item à un ticket existant), pas besoin de logger
            }).catch((err) => {
              console.error('[TransactionLog] Erreur lors de l\'import du service:', err);
            }); // Logger les erreurs d'import pour diagnostic
          }
        },

        removeSaleItem: (itemId: string) => {
          set((state) => ({
            currentSaleItems: state.currentSaleItems.filter(item => item.id !== itemId)
          }));
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
                    total: newQuantity * newPrice,  // total = quantité × prix
                    // presetId: undefined => ne pas toucher ; null => effacer ; string => nouveau preset
                    presetId: presetId !== undefined ? (presetId === null ? undefined : presetId) : item.presetId,
                    notes: notes !== undefined ? notes : item.notes
                  }
                : item
            )
          }));
        },

        setCurrentSaleNote: (note: string | null) => {
          set({ currentSaleNote: note });
        },

        clearCurrentSale: () => {
          const state = get();
          const cartStateBefore = state.currentSaleItems.length > 0 ? {
            items_count: state.currentSaleItems.length,
            items: state.currentSaleItems.map(item => ({
              id: item.id,
              category: item.category,
              weight: item.weight,
              price: item.total
            })),
            total: state.currentSaleItems.reduce((sum, item) => sum + item.total, 0)
          } : undefined;

          set({
            currentSaleItems: [],
            currentSaleNote: null,  // Story B40-P1: Réinitialiser la note lors du clear
            ticketOpenedLogged: false,  // B48-P2: Réinitialiser le flag lors du reset
            ticketScrollState: {
              scrollTop: 0,
              scrollHeight: 0,
              clientHeight: 0,
              canScrollUp: false,
              canScrollDown: false,
              isScrollable: false
            }
          });

          // B48-P2: Logger TICKET_RESET avec l'état du panier avant le reset
          if (cartStateBefore && state.currentSession) {
            // Import dynamique et appel asynchrone (fire-and-forget)
            import('../services/transactionLogService').then(({ transactionLogService }) => {
              // Détecter anomalie: si le panier n'était pas vide alors qu'il aurait dû l'être
              // (mais en fait, c'est normal de reset un panier non vide)
              transactionLogService.logTicketReset(
                state.currentSession!.id,
                cartStateBefore,
                false // Pas d'anomalie par défaut
              ).catch((err) => {
                console.error('[TransactionLog] Erreur lors du log TICKET_RESET:', err);
              }); // Logger les erreurs pour diagnostic
            }).catch((err) => {
              console.error('[TransactionLog] Erreur lors de l\'import du service:', err);
            }); // Logger les erreurs d'import pour diagnostic
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

        submitSale: async (items: SaleItem[], finalization?: { donation: number; paymentMethod: 'cash'|'card'|'check'; cashGiven?: number; change?: number; note?: string; overrideTotalAmount?: number; }): Promise<boolean> => {
          const { currentSession } = get();

          if (!currentSession) {
            const errorMsg = 'Aucune session de caisse active';
            console.error('[submitSale]', errorMsg);
            set({ error: errorMsg });
            return false;
          }

          set({ loading: true, error: null });

          try {
            // Fonction pour valider si une chaîne est un UUID valide
            const isValidUUID = (str: string | undefined | null): boolean => {
              if (!str) return false;
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              return uuidRegex.test(str);
            };

            // Story B49-P2: Utiliser overrideTotalAmount si fourni, sinon calcul automatique
            const calculatedTotal = items.reduce((sum, item) => sum + item.total, 0);
            const finalTotalAmount = finalization?.overrideTotalAmount !== undefined 
              ? finalization.overrideTotalAmount 
              : calculatedTotal;
            
            const saleData: SaleCreate = {
              cash_session_id: currentSession.id,
              items: items.map(item => {
                // Si presetId n'est pas un UUID valide (comme "don-0", "don-18", etc.), 
                // on le stocke dans notes pour préserver l'information du type de preset
                const presetId = item.presetId && isValidUUID(item.presetId) ? item.presetId : null;
                let notes = item.notes || null;
                
                // Si presetId n'est pas un UUID valide, l'ajouter dans notes pour traçabilité
                if (item.presetId && !isValidUUID(item.presetId)) {
                  const presetTypeNote = `preset_type:${item.presetId}`;
                  notes = notes ? `${presetTypeNote}; ${notes}` : presetTypeNote;
                }
                
                return {
                  category: item.subcategory || item.category,
                  quantity: item.quantity,
                  weight: item.weight,  // Ajout du poids
                  unit_price: item.price,
                  total_price: item.total,
                  preset_id: presetId,  // UUID valide ou null
                  notes: notes  // Notes utilisateur + type de preset si non-UUID
                };
              }),
              total_amount: finalTotalAmount  // Story B49-P2: Utiliser overrideTotalAmount si fourni
            };

            // Étendre le payload pour inclure finalisation (don, paiement)
            // Story 1.1.2: preset_id et notes sont maintenant par item, pas au niveau vente globale
            // Story B40-P1: note au niveau ticket (pas au niveau item)
            // Story B52-P1: Support paiements multiples
            // Les codes de paiement sont maintenant simples (cash/card/check) pour éviter problèmes d'encodage
            const { currentSaleNote } = get();
            
            // Story B52-P1: Construire la liste de paiements
            let payments: Array<{ payment_method: string; amount: number }> | undefined;
            if (finalization?.payments && finalization.payments.length > 0) {
              // Paiements multiples
              console.log('[submitSale] Paiements multiples détectés:', finalization.payments);
              payments = finalization.payments.map(p => ({
                payment_method: p.paymentMethod,
                amount: p.amount
              }));
              console.log('[submitSale] Paiements construits pour API:', payments);
            } else if (finalization?.paymentMethod) {
              // Rétrocompatibilité : paiement unique
              console.log('[submitSale] Paiement unique (rétrocompatibilité):', finalization.paymentMethod);
              payments = [{
                payment_method: finalization.paymentMethod,
                amount: finalTotalAmount
              }];
            } else {
              // Par défaut : espèces
              console.log('[submitSale] Paiement par défaut (espèces)');
              payments = [{
                payment_method: 'cash',
                amount: finalTotalAmount
              }];
            }
            
            const extendedPayload = {
              ...saleData,
              donation: finalization?.donation ?? 0,
              payment_method: finalization?.paymentMethod ?? 'cash',  // Déprécié - utiliser payments
              payments: payments,  // Story B52-P1: Liste de paiements multiples
              note: finalization?.note || null,  // Story B40-P1-CORRECTION: Notes déplacées vers popup de paiement
              // preset_id et notes supprimés du niveau vente - maintenant dans chaque item
            };

            // Call API to create sale using axiosClient (handles auth automatically)
            const response = await axiosClient.post('/v1/sales/', extendedPayload);

            // Clear current sale on success
            set({
              currentSaleItems: [],
              currentSaleNote: null,  // Story B40-P1: Réinitialiser la note après soumission réussie
              loading: false
            });

            return true;
          } catch (error: any) {
            // Extraire le détail de l'erreur de validation Pydantic si disponible
            let errorMessage = 'Erreur lors de l\'enregistrement de la vente';
            if (error?.response?.data?.detail) {
              const detail = error.response.data.detail;
              if (Array.isArray(detail)) {
                // Erreur de validation Pydantic avec plusieurs champs
                const errors = detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
                errorMessage = `Erreur de validation: ${errors}`;
              } else if (typeof detail === 'string') {
                errorMessage = detail;
              }
            } else if (error instanceof Error) {
              errorMessage = error.message;
            }
            console.error('[submitSale] Error:', errorMessage);
            set({ error: errorMessage, loading: false });
            return false;
          }
        },

        // Async actions
        openSession: async (data: CashSessionCreate): Promise<CashSession | null> => {
          set({ loading: true, error: null });
          
          try {
            // B50-P6: Logging pour tracer l'ouverture de session
            console.log('[Store] openSession - Début, register_id:', data.register_id);
            
            // Pré-check 1: vérifier s'il y a déjà une session ouverte sur ce poste de caisse
            // Le backend filtre maintenant automatiquement les sessions différées (opened_at >= now)
            if (data.register_id) {
              const status = await cashSessionService.getRegisterSessionStatus(data.register_id);
              if (status.is_active && status.session_id) {
                const existingByRegister = await cashSessionService.getSession(status.session_id);
                console.log('[Store] openSession - Session existante par register, register_options:', (existingByRegister as any)?.register_options);
                if (existingByRegister) {
                  // Sécurité supplémentaire : vérifier que ce n'est pas une session différée
                  // (le backend devrait déjà l'avoir filtrée, mais on double-vérifie)
                  if (existingByRegister.opened_at) {
                    const openedAtDate = new Date(existingByRegister.opened_at);
                    const now = new Date();
                    if (openedAtDate < now) {
                      console.warn('[Store] openSession - Session différée détectée, ignorée (ne devrait pas arriver avec le backend corrigé)');
                      // Ne pas utiliser cette session, continuer pour en créer une nouvelle
                    } else {
                      get().setCurrentSession(existingByRegister);
                      localStorage.setItem('currentCashSession', JSON.stringify(existingByRegister));
                      set({ loading: false });
                      return existingByRegister;
                    }
                  } else {
                    // Session sans opened_at, l'utiliser
                    get().setCurrentSession(existingByRegister);
                    localStorage.setItem('currentCashSession', JSON.stringify(existingByRegister));
                    set({ loading: false });
                    return existingByRegister;
                  }
                }
              }
            }

            // Pré-check 2: session ouverte pour l'opérateur courant (fallback)
            // Le backend filtre maintenant automatiquement les sessions différées (opened_at >= now)
            const existing = await cashSessionService.getCurrentSession();
            console.log('[Store] openSession - Session existante opérateur, register_options:', (existing as any)?.register_options);
            if (existing) {
              // Sécurité supplémentaire : vérifier que ce n'est pas une session différée
              // (le backend devrait déjà l'avoir filtrée, mais on double-vérifie)
              if (existing.opened_at) {
                const openedAtDate = new Date(existing.opened_at);
                const now = new Date();
                if (openedAtDate < now) {
                  console.warn('[Store] openSession - Session différée détectée, ignorée (ne devrait pas arriver avec le backend corrigé)');
                  // Ne pas utiliser cette session, continuer pour en créer une nouvelle
                } else {
                  get().setCurrentSession(existing);
                  localStorage.setItem('currentCashSession', JSON.stringify(existing));
                  set({ loading: false });
                  return existing;
                }
              } else {
                // Session sans opened_at, l'utiliser
                get().setCurrentSession(existing);
                localStorage.setItem('currentCashSession', JSON.stringify(existing));
                set({ loading: false });
                return existing;
              }
            }

            const session = await cashSessionService.createSession(data);
            console.log('[Store] openSession - Nouvelle session créée, register_options:', (session as any)?.register_options);
            get().setCurrentSession(session);
            
            // Sauvegarder en local pour la persistance
            localStorage.setItem('currentCashSession', JSON.stringify(session));
            set({ loading: false });
            
            return session;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'ouverture de session';
            
            // Si l'API renvoie que la session est déjà ouverte, tenter de reprendre automatiquement
            if (data.register_id && /déjà ouverte|already open/i.test(errorMessage)) {
              try {
                const status = await cashSessionService.getRegisterSessionStatus(data.register_id);
                if (status.is_active && status.session_id) {
                  const existing = await cashSessionService.getSession(status.session_id);
                  if (existing) {
                    get().setCurrentSession(existing);
                    localStorage.setItem('currentCashSession', JSON.stringify(existing));
                    set({ loading: false });
                    return existing;
                  }
                }
              } catch {
                // ignore and fall through
              }
            }
            set({ error: errorMessage, loading: false });
            return null;
          }
        },

        closeSession: async (sessionId: string, closeData?: { actual_amount: number; variance_comment?: string }): Promise<boolean> => {
          set({ loading: true, error: null });
          
          try {
            let success: boolean;
            
            if (closeData) {
              // Fermeture avec contrôle des montants
              console.log('[closeSession] Fermeture avec montants:', { sessionId, closeData });
              const closedSession = await cashSessionService.closeSessionWithAmounts(
                sessionId, 
                closeData.actual_amount, 
                closeData.variance_comment
              );
              console.log('[closeSession] Réponse closeSessionWithAmounts:', closedSession);
              // B44-P3: closedSession peut être null si la session était vide et a été supprimée
              // null = session supprimée (succès), CashSession = session fermée (succès)
              // Si on arrive ici sans exception, c'est toujours un succès
              success = true;
            } else {
              // Fermeture simple
              console.log('[closeSession] Fermeture simple:', { sessionId });
              success = await cashSessionService.closeSession(sessionId);
              console.log('[closeSession] Réponse closeSession (simple):', success);
            }
            
            if (success) {
              set({ 
                currentSession: null, 
                loading: false 
              });
              
              // Supprimer de la persistance locale
              localStorage.removeItem('currentCashSession');
            }
            
            return success;
          } catch (error: any) {
            // Story B50-P9 QA: Amélioration gestion d'erreurs avec détails
            let errorMessage = 'Erreur lors de la fermeture de session';
            
            if (error?.response?.data?.detail) {
              const detail = error.response.data.detail;
              if (Array.isArray(detail)) {
                errorMessage = detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
              } else if (typeof detail === 'string') {
                errorMessage = detail;
              }
            } else if (error instanceof Error) {
              errorMessage = error.message;
            }
            
            console.error('[closeSession] Erreur détaillée:', {
              message: errorMessage,
              sessionId,
              closeData,
              originalError: error
            });
            
            set({ error: errorMessage, loading: false });
            return false;
          }
        },

        updateSession: async (sessionId: string, data: CashSessionUpdate): Promise<boolean> => {
          set({ loading: true, error: null });
          
          try {
            const updatedSession = await cashSessionService.updateSession(sessionId, data);
            
            if (updatedSession) {
              const { currentSession } = get();
              
              // Mettre à jour la session courante si c'est la même
              if (currentSession && currentSession.id === sessionId) {
                set({ 
                  currentSession: updatedSession, 
                  loading: false 
                });
                
                // Mettre à jour la persistance locale
                localStorage.setItem('currentCashSession', JSON.stringify(updatedSession));
              }
            }
            
            return !!updatedSession;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour de session';
            set({ error: errorMessage, loading: false });
            return false;
          }
        },

        fetchSessions: async (): Promise<void> => {
          set({ loading: true, error: null });
          
          try {
            const sessions = await cashSessionService.getSessions();
            set({ sessions, loading: false });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des sessions';
            set({ error: errorMessage, loading: false });
          }
        },

        fetchCurrentSession: async (): Promise<void> => {
          set({ loading: true, error: null });
          
          try {
            // B50-P6: Logging pour tracer le rafraîchissement
            console.log('[Store] fetchCurrentSession - Début');
            console.log('[Store] fetchCurrentSession - currentRegisterOptions avant:', get().currentRegisterOptions);
            
            // Essayer de récupérer depuis le localStorage d'abord
            const localSession = localStorage.getItem('currentCashSession');
            if (localSession) {
              const session = JSON.parse(localSession);
              console.log('[Store] fetchCurrentSession - Session locale trouvée, register_options:', (session as any)?.register_options);
              
              // Vérifier que la session est toujours ouverte côté serveur
              const serverSession = await cashSessionService.getSession(session.id);
              console.log('[Store] fetchCurrentSession - Session serveur, register_options:', (serverSession as any)?.register_options);
              
              if (serverSession && serverSession.status === 'open') {
                // B50-P6: Si serverSession n'a pas register_options, utiliser ceux de la session locale ou du store
                const optionsToUse = (serverSession as any)?.register_options 
                  || (session as any)?.register_options 
                  || get().currentRegisterOptions;
                
                // Créer une session enrichie avec les options si nécessaire
                const enrichedSession = {
                  ...serverSession,
                  register_options: optionsToUse || (serverSession as any)?.register_options
                };
                
                console.log('[Store] fetchCurrentSession - Options à utiliser:', optionsToUse);
                get().setCurrentSession(enrichedSession);
                set({ loading: false });
                return;
              } else {
                // Session fermée côté serveur, nettoyer le localStorage
                localStorage.removeItem('currentCashSession');
              }
            }
            // Pas de session locale: interroger l'API pour la session courante de l'opérateur
            const current = await cashSessionService.getCurrentSession();
            console.log('[Store] fetchCurrentSession - Session courante API, register_options:', (current as any)?.register_options);
            
            if (current && current.status === 'open') {
              // B50-P6: Si current n'a pas register_options, utiliser ceux du store si disponibles
              const optionsToUse = (current as any)?.register_options || get().currentRegisterOptions;
              
              // Créer une session enrichie avec les options si nécessaire
              const enrichedSession = {
                ...current,
                register_options: optionsToUse || (current as any)?.register_options
              };
              
              console.log('[Store] fetchCurrentSession - Options à utiliser (session courante):', optionsToUse);
              get().setCurrentSession(enrichedSession);
              localStorage.setItem('currentCashSession', JSON.stringify(enrichedSession));
              set({ loading: false });
              return;
            }

            get().setCurrentSession(null);
            set({ loading: false });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la récupération de la session';
            console.error('[Store] fetchCurrentSession - Erreur:', errorMessage);
            set({ error: errorMessage, loading: false });
          }
        },

        refreshSession: async (): Promise<void> => {
          const { currentSession } = get();
          if (currentSession) {
            await get().fetchCurrentSession();
          }
        },

        // UX-B10: reprendre une session existante
        resumeSession: async (sessionId: string): Promise<boolean> => {
          set({ loading: true, error: null });
          try {
            // B50-P6: Logging pour tracer resumeSession
            console.log('[Store] resumeSession - Début, sessionId:', sessionId);
            console.log('[Store] resumeSession - currentRegisterOptions avant:', get().currentRegisterOptions);
            
            const session = await cashSessionService.getSession(sessionId);
            console.log('[Store] resumeSession - Session récupérée, register_options:', (session as any)?.register_options);
            
            if (session && session.status === 'open') {
              // B50-P6: Si session n'a pas register_options, utiliser ceux du store si disponibles
              const optionsToUse = (session as any)?.register_options || get().currentRegisterOptions;
              
              // Créer une session enrichie avec les options si nécessaire
              const enrichedSession = {
                ...session,
                register_options: optionsToUse || (session as any)?.register_options
              };
              
              console.log('[Store] resumeSession - Options à utiliser:', optionsToUse);
              get().setCurrentSession(enrichedSession);
              localStorage.setItem('currentCashSession', JSON.stringify(enrichedSession));
              set({ loading: false });
              return true;
            }
            set({ loading: false, error: "Aucune session ouverte trouvée pour cet identifiant" });
            return false;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la reprise de session';
            console.error('[Store] resumeSession - Erreur:', errorMessage);
            set({ error: errorMessage, loading: false });
            return false;
          }
        }
      }),
      {
        name: 'cash-session-store',
        partialize: (state) => ({
          currentSession: state.currentSession,
          currentSaleItems: state.currentSaleItems,
          currentRegisterOptions: state.currentRegisterOptions  // B49-P7: Persister les options de workflow
        }),
        // B50-P6: Réhydratation - restaurer currentRegisterOptions depuis currentSession.register_options si nécessaire
        onRehydrateStorage: () => (state) => {
          console.log('[Store] onRehydrateStorage - Début');
          console.log('[Store] onRehydrateStorage - currentSession:', state?.currentSession);
          console.log('[Store] onRehydrateStorage - currentRegisterOptions restauré:', state?.currentRegisterOptions);
          
          if (state?.currentSession) {
            const sessionOptions = (state.currentSession as any)?.register_options;
            console.log('[Store] onRehydrateStorage - register_options dans session:', sessionOptions);
            
            // Si currentRegisterOptions n'est pas restauré mais que la session a register_options, les restaurer
            if (!state.currentRegisterOptions && sessionOptions) {
              console.log('[Store] onRehydrateStorage - Restauration currentRegisterOptions depuis session');
              state.setCurrentRegisterOptions(sessionOptions);
            }
            // Si currentRegisterOptions est restauré mais que la session a aussi register_options, 
            // prioriser ceux de la session (plus à jour)
            else if (state.currentRegisterOptions && sessionOptions) {
              console.log('[Store] onRehydrateStorage - Mise à jour currentRegisterOptions depuis session (plus à jour)');
              state.setCurrentRegisterOptions(sessionOptions);
            }
          }
          
          // B51-P5 FIX 2: Si des articles sont restaurés depuis localStorage mais ticketOpenedLogged n'est pas défini,
          // vider les articles pour éviter les articles fantômes
          if (state?.currentSaleItems && state.currentSaleItems.length > 0) {
            // Si ticketOpenedLogged n'est pas persisté (toujours false au rechargement),
            // et qu'on a des articles, c'est suspect - les vider pour sécurité
            // Note: ticketOpenedLogged n'est pas dans partialize, donc toujours false au rehydrate
            console.warn('[Store] onRehydrateStorage - Articles restaurés mais ticketOpenedLogged non défini, vidage du panier');
            state.currentSaleItems = [];
          }
          
          console.log('[Store] onRehydrateStorage - currentRegisterOptions final:', state?.currentRegisterOptions);
          return state;
        }
      }
    ),
    {
      name: 'cash-session-store'
    }
  )
);

export default useCashSessionStore;
