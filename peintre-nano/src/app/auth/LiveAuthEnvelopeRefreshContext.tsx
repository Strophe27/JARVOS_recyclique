import { createContext, useContext, type ReactNode } from 'react';
import type { ContextEnvelopeStub } from '../../types/context-envelope';

export type LiveEnvelopeRefreshApi = {
  /**
   * Recharge l’enveloppe depuis le serveur (GET contexte). Retourne l’enveloppe si OK, sinon null.
   * Les 401 déclenchent la purge de session côté `LiveAuthShell`.
   */
  readonly refreshEnvelope: () => Promise<ContextEnvelopeStub | null>;
};

const LiveEnvelopeRefreshContext = createContext<LiveEnvelopeRefreshApi | null>(null);

export function LiveEnvelopeRefreshProvider({
  value,
  children,
}: {
  readonly value: LiveEnvelopeRefreshApi;
  readonly children: ReactNode;
}) {
  return (
    <LiveEnvelopeRefreshContext.Provider value={value}>{children}</LiveEnvelopeRefreshContext.Provider>
  );
}

/** Hors `LiveAuthShell` connecté : `null` (démo / tests). */
export function useLiveEnvelopeRefresh(): LiveEnvelopeRefreshApi | null {
  return useContext(LiveEnvelopeRefreshContext);
}
