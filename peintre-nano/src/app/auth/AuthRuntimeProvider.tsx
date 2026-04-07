import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ContextEnvelopeStub } from '../../types/context-envelope';
import type { AuthContextPort, AuthSessionState } from './auth-context-port';
import { getDefaultDemoAuthAdapter } from './default-demo-auth-adapter';

const AuthPortContext = createContext<AuthContextPort | null>(null);

export type AuthRuntimeProviderProps = {
  readonly children: ReactNode;
  /** Défaut : adaptateur démo Piste A. */
  readonly adapter?: AuthContextPort;
};

export function AuthRuntimeProvider({ children, adapter }: AuthRuntimeProviderProps) {
  const [fallbackAdapter] = useState(() => getDefaultDemoAuthAdapter());
  const value = adapter ?? fallbackAdapter;
  return <AuthPortContext.Provider value={value}>{children}</AuthPortContext.Provider>;
}

export function useAuthPort(): AuthContextPort {
  const port = useContext(AuthPortContext);
  if (!port) {
    throw new Error('useAuthSession / useContextEnvelope : enveloppez l\'arbre avec <AuthRuntimeProvider>.');
  }
  return port;
}

export function useAuthSession(): AuthSessionState {
  return useAuthPort().getSession();
}

export function useContextEnvelope(): ContextEnvelopeStub {
  return useAuthPort().getContextEnvelope();
}
