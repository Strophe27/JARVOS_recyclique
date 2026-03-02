/**
 * Contexte auth — Story 12.2.
 * Session BFF via cookie HTTP-only + hydration GET /v1/auth/session.
 * Compatibilité transitoire: expose accessToken marqueur (non-JWT) pour anciens appels frontend.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { UserInToken } from '../api/auth';
import { getSession, postLogin, postLogout } from '../api/auth';

export interface AuthState {
  user: UserInToken | null;
  accessToken: string | null;
  permissions: string[];
  isHydrated: boolean;
}

interface AuthContextValue extends AuthState {
  setFromPinLogin: (user: UserInToken, permissions?: string[]) => void;
  login: (username?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    permissions: [],
    isHydrated: false,
  });

  const setFromPinLogin = useCallback(
    (user: UserInToken, permissions?: string[]) => {
      setState({ user, accessToken: 'bff-session', permissions: permissions ?? [], isHydrated: true });
    },
    []
  );

  const refreshSession = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session.authenticated || !session.user) {
        setState({
          user: null,
          accessToken: null,
          permissions: [],
          isHydrated: true,
        });
        return;
      }
      setState({
        user: session.user,
        accessToken: 'bff-session',
        permissions: session.permissions ?? [],
        isHydrated: true,
      });
    } catch {
      setState((s) => ({ ...s, isHydrated: true }));
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (username?: string, password?: string) => {
    if (!username || !password) {
      throw new Error('Identifiant/mot de passe requis');
    }
    const data = await postLogin(username, password);
    setState({
      user: data.user,
      accessToken: data.access_token,
      permissions: data.permissions ?? [],
      isHydrated: true,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await postLogout();
    } catch {
      // ignore
    }
    setState({
      user: null,
      accessToken: null,
      permissions: [],
      isHydrated: true,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        setFromPinLogin,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
