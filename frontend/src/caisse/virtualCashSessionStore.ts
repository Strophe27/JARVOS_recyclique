/**
 * Store Zustand session caisse virtuelle — Story 18-10.
 * In-memory uniquement (pas de persist localStorage).
 * Isolation totale du store réel : openSession force session_type = 'virtual'.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { openCashSession, closeCashSession } from '../api/caisse';
import type { CashSessionItem } from '../api/caisse';

interface CloseBody {
  closing_amount?: number;
  actual_amount?: number;
  variance_comment?: string;
}

export interface VirtualCashSessionState {
  currentSession: CashSessionItem | null;
  readonly isVirtual: true;
  loading: boolean;
  error: string | null;

  openSession(
    token: string,
    body: { initial_amount: number; register_id: string }
  ): Promise<CashSessionItem | null>;

  closeSession(
    token: string,
    sessionId: string,
    body: CloseBody
  ): Promise<boolean>;

  reset(): void;
  clearError(): void;
}

export const useVirtualCashSessionStore = create<VirtualCashSessionState>()(
  devtools(
    (set) => ({
      currentSession: null,
      isVirtual: true as const,
      loading: false,
      error: null,

      openSession: async (token, body) => {
        set({ loading: true, error: null });
        try {
          const session = await openCashSession(token, {
            ...body,
            session_type: 'virtual',
          });
          set({ currentSession: session, loading: false });
          return session;
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : 'Erreur ouverture session virtuelle',
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
            error: e instanceof Error ? e.message : 'Erreur fermeture session virtuelle',
            loading: false,
          });
          return false;
        }
      },

      reset: () => set({ currentSession: null, loading: false, error: null }),
      clearError: () => set({ error: null }),
    }),
    { name: 'virtual-cash-session-store' }
  )
);
