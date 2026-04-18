import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_USER_RUNTIME_PREFS,
  normalizeUserRuntimePrefs,
  type UserRuntimePrefs,
} from '../../types/user-runtime-prefs';

export const USER_RUNTIME_PREFS_STORAGE_KEY = 'peintre-nano:user-runtime-prefs';

export type UserRuntimePrefsContextValue = {
  readonly prefs: UserRuntimePrefs;
  readonly setPrefs: (next: UserRuntimePrefs | ((prev: UserRuntimePrefs) => UserRuntimePrefs)) => void;
  readonly updatePrefs: (partial: Partial<UserRuntimePrefs>) => void;
};

const UserRuntimePrefsContext = createContext<UserRuntimePrefsContextValue | null>(null);

function readPrefsFromLocalStorage(): UserRuntimePrefs {
  try {
    const raw = localStorage.getItem(USER_RUNTIME_PREFS_STORAGE_KEY);
    if (raw == null) return DEFAULT_USER_RUNTIME_PREFS;
    const parsed: unknown = JSON.parse(raw);
    return normalizeUserRuntimePrefs(parsed);
  } catch {
    return DEFAULT_USER_RUNTIME_PREFS;
  }
}

export type UserRuntimePrefsProviderProps = {
  readonly children: ReactNode;
  /**
   * Tests : désactive lecture/écriture `localStorage` (état mémoire uniquement).
   */
  readonly disablePersistence?: boolean;
};

/**
 * Préférences UI locales uniquement. Ne pas utiliser pour permissions, routes ou vérité métier
 * — voir README du dossier `providers/`.
 */
export function UserRuntimePrefsProvider({
  children,
  disablePersistence = false,
}: UserRuntimePrefsProviderProps) {
  const [prefs, setPrefsState] = useState<UserRuntimePrefs>(() =>
    disablePersistence ? DEFAULT_USER_RUNTIME_PREFS : readPrefsFromLocalStorage(),
  );

  useEffect(() => {
    if (disablePersistence) return;
    try {
      localStorage.setItem(USER_RUNTIME_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* quota / mode privé */
    }
  }, [prefs, disablePersistence]);

  const setPrefs = useCallback(
    (next: UserRuntimePrefs | ((prev: UserRuntimePrefs) => UserRuntimePrefs)) => {
      setPrefsState((prev) => (typeof next === 'function' ? next(prev) : next));
    },
    [],
  );

  const updatePrefs = useCallback((partial: Partial<UserRuntimePrefs>) => {
    setPrefsState((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = useMemo<UserRuntimePrefsContextValue>(
    () => ({ prefs, setPrefs, updatePrefs }),
    [prefs, setPrefs, updatePrefs],
  );

  return (
    <UserRuntimePrefsContext.Provider value={value}>{children}</UserRuntimePrefsContext.Provider>
  );
}

export function useUserRuntimePrefs(): UserRuntimePrefsContextValue {
  const ctx = useContext(UserRuntimePrefsContext);
  if (!ctx) {
    throw new Error('useUserRuntimePrefs doit être utilisé sous UserRuntimePrefsProvider');
  }
  return ctx;
}
