/**
 * Store Zustand session saisie différée — Story 18-10.
 * Persist localStorage (clé 'deferredCashSession') : currentSession + deferredDate.
 * openSession force session_type = 'deferred' et passe opened_at.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { openCashSession, closeCashSession } from '../api/caisse';
import type { CashSessionItem } from '../api/caisse';

interface CloseBody {
  closing_amount?: number;
  actual_amount?: number;
  variance_comment?: string;
}

export interface DeferredCashSessionState {
  currentSession: CashSessionItem | null;
  deferredDate: string | null;
  readonly isDeferred: true;
  loading: boolean;
  error: string | null;

  setDeferredDate(date: string): void;

  openSession(
    token: string,
    body: { initial_amount: number; register_id: string; opened_at: string }
  ): Promise<CashSessionItem | null>;

  closeSession(
    token: string,
    sessionId: string,
    body: CloseBody
  ): Promise<boolean>;

  reset(): void;
  clearError(): void;
}

export const useDeferredCashSessionStore = create<DeferredCashSessionState>()(
  devtools(
    persist(
      (set) => ({
        currentSession: null,
        deferredDate: null,
        isDeferred: true as const,
        loading: false,
        error: null,

        setDeferredDate: (date) => set({ deferredDate: date }),

        openSession: async (token, body) => {
          if (!body.opened_at) {
            set({ error: 'Date de session différée requise', loading: false });
            return null;
          }
          set({ loading: true, error: null });
          try {
            const session = await openCashSession(token, {
              initial_amount: body.initial_amount,
              register_id: body.register_id,
              session_type: 'deferred',
              opened_at: body.opened_at,
            });
            set({ currentSession: session, loading: false });
            return session;
          } catch (e) {
            set({
              error: e instanceof Error ? e.message : 'Erreur ouverture session différée',
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
              error: e instanceof Error ? e.message : 'Erreur fermeture session différée',
              loading: false,
            });
            return false;
          }
        },

        reset: () => set({ currentSession: null, deferredDate: null, loading: false, error: null }),
        clearError: () => set({ error: null }),
      }),
      {
        name: 'deferredCashSession',
        partialize: (state) => ({
          currentSession: state.currentSession,
          deferredDate: state.deferredDate,
        }),
        onRehydrateStorage: () => (state) => {
          if (state?.currentSession?.status !== 'open') {
            if (state) state.currentSession = null;
          }
        },
      }
    ),
    { name: 'deferred-cash-session-store' }
  )
);
