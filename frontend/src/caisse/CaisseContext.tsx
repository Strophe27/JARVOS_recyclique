/**
 * Contexte caisse — Story 3.3, 3.5.
 * État verrouillé / déverrouillé et opérateur ayant déverrouillé.
 *
 * Dépendance : CaisseProvider doit être rendu à l'intérieur de AuthProvider (useAuth).
 * Ordre recommandé dans l'app : MantineProvider > AuthProvider > CaisseProvider > … .
 */
import React, { createContext, useCallback, useContext, useState } from 'react';
import type { UserInToken } from '../api/auth';
import { postPinUnlock } from '../api/auth';
import { useAuth } from '../auth/AuthContext';

export interface CaisseState {
  isLocked: boolean;
  unlockedBy: UserInToken | null;
  /** Poste caisse sélectionné (Story 3.5). null = pas de poste actif. */
  currentRegisterId: string | null;
  /** Le poste courant a été démarré par un admin (GET /v1/cash-registers/status). */
  currentRegisterStarted: boolean;
}

interface CaisseContextValue extends CaisseState {
  unlockWithPin: (pin: string) => Promise<void>;
  lock: () => void;
  /** Définir le poste caisse courant (dashboard). started = issu de status API. */
  setCurrentRegister: (registerId: string | null, started: boolean) => void;
  /** true quand un poste caisse démarré est sélectionné (menu restreint si isLocked). */
  isCashRegisterActive: boolean;
}

const CaisseContext = createContext<CaisseContextValue | null>(null);

export function CaisseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CaisseState>({
    isLocked: true,
    unlockedBy: null,
    currentRegisterId: null,
    currentRegisterStarted: false,
  });
  const auth = useAuth();

  const setCurrentRegister = useCallback((registerId: string | null, started: boolean) => {
    setState((s) => ({
      ...s,
      currentRegisterId: registerId,
      currentRegisterStarted: started,
    }));
  }, []);

  const isCashRegisterActive =
    state.currentRegisterId !== null && state.currentRegisterStarted;

  const unlockWithPin = useCallback(
    async (pin: string) => {
      const data = await postPinUnlock(pin);
      auth.setFromPinLogin(data.user, data.permissions);
      setState((s) => ({ ...s, isLocked: false, unlockedBy: data.user }));
    },
    [auth]
  );

  const lock = useCallback(() => {
    setState((s) => ({ ...s, isLocked: true, unlockedBy: null }));
    // Ne pas invalider le JWT (story 3.3) ; garder currentRegisterId/Started (story 3.5)
  }, []);

  return (
    <CaisseContext.Provider
      value={{
        ...state,
        unlockWithPin,
        lock,
        setCurrentRegister,
        isCashRegisterActive,
      }}
    >
      {children}
    </CaisseContext.Provider>
  );
}

export function useCaisse(): CaisseContextValue {
  const ctx = useContext(CaisseContext);
  if (!ctx) throw new Error('useCaisse must be used within CaisseProvider');
  return ctx;
}
