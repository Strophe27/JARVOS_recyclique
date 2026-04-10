import { createContext, useContext, type ReactNode } from 'react';

export type LiveAuthActions = {
  readonly requestLogout: () => void;
};

const LiveAuthActionsContext = createContext<LiveAuthActions | null>(null);

export function LiveAuthActionsProvider({
  value,
  children,
}: {
  readonly value: LiveAuthActions;
  readonly children: ReactNode;
}) {
  return <LiveAuthActionsContext.Provider value={value}>{children}</LiveAuthActionsContext.Provider>;
}

/** Présent uniquement sous `LiveAuthShell` en session prête ; sinon `null`. */
export function useLiveAuthActions(): LiveAuthActions | null {
  return useContext(LiveAuthActionsContext);
}
