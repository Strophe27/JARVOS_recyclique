/**
 * Store Zustand session caisse — Story 18-9.
 * Gère currentSession, openSession, closeSession, refreshSession, resumeSession.
 * accessToken passé en paramètre à chaque action (pas de couplage avec AuthContext).
 * Persistance localStorage sous la clé 'currentCashSession'.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  openCashSession,
  closeCashSession,
  getCurrentCashSession,
  getCashSession,
} from '../api/caisse';
import type { CashSessionItem } from '../api/caisse';

export interface CashSessionStoreState {
  currentSession: CashSessionItem | null;
  loading: boolean;
  error: string | null;

  openSession(
    token: string,
    body: {
      initial_amount: number;
      register_id: string;
      session_type?: string;
      opened_at?: string;
    }
  ): Promise<CashSessionItem | null>;

  closeSession(
    token: string,
    sessionId: string,
    body: {
      closing_amount?: number;
      actual_amount?: number;
      variance_comment?: string;
    }
  ): Promise<boolean>;

  refreshSession(token: string): Promise<void>;

  resumeSession(token: string, sessionId: string): Promise<boolean>;

  clearError(): void;
}

export const useCashSessionStore = create<CashSessionStoreState>()(
  devtools(
    persist(
      (set) => ({
        currentSession: null,
        loading: false,
        error: null,

        openSession: async (token, body) => {
          set({ loading: true, error: null });
          try {
            const session = await openCashSession(token, body);
            set({ currentSession: session, loading: false });
            return session;
          } catch (e) {
            set({
              error: e instanceof Error ? e.message : 'Erreur ouverture session',
              loading: false,
            });
            return null;
          }
        },

        closeSession: async (token, sessionId, body) => {
          set({ loading: true, error: null });
          try {
            await closeCashSession(token, sessionId, body);
            set({ currentSession: null, loading: false });
            return true;
          } catch (e) {
            set({
              error: e instanceof Error ? e.message : 'Erreur fermeture session',
              loading: false,
            });
            return false;
          }
        },

        refreshSession: async (token) => {
          set({ loading: true, error: null });
          try {
            const session = await getCurrentCashSession(token);
            set({ currentSession: session, loading: false });
          } catch (e) {
            set({
              error: e instanceof Error ? e.message : 'Erreur rafraîchissement session',
              loading: false,
            });
          }
        },

        resumeSession: async (token, sessionId) => {
          set({ loading: true, error: null });
          try {
            const session = await getCashSession(token, sessionId);
            if (session && session.status === 'open') {
              set({ currentSession: session, loading: false });
              return true;
            }
            set({ loading: false });
            return false;
          } catch (e) {
            set({
              error: e instanceof Error ? e.message : 'Erreur reprise session',
              loading: false,
            });
            return false;
          }
        },

        clearError: () => set({ error: null }),
      }),
      {
        name: 'currentCashSession',
        partialize: (state) => ({ currentSession: state.currentSession }),
        onRehydrateStorage: () => (state) => {
          if (state?.currentSession?.status !== 'open') {
            if (state) state.currentSession = null;
          }
        },
      }
    ),
    { name: 'cash-session-store' }
  )
);
