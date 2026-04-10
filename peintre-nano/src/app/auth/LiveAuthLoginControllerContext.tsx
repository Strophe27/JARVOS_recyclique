import { createContext, useContext, type FormEvent, type ReactNode } from 'react';

export type LiveAuthLoginController = {
  readonly username: string;
  readonly password: string;
  readonly setUsername: (v: string) => void;
  readonly setPassword: (v: string) => void;
  readonly onSubmit: (e: FormEvent) => void | Promise<void>;
  readonly formError: string | null;
  readonly busy: boolean;
  readonly hasStoredToken: boolean;
  readonly onRetryStoredToken: () => void;
  readonly onClearStoredSession: () => void;
};

const LiveAuthLoginControllerContext = createContext<LiveAuthLoginController | null>(null);

export function LiveAuthLoginControllerProvider({
  value,
  children,
}: {
  readonly value: LiveAuthLoginController;
  readonly children: ReactNode;
}) {
  return (
    <LiveAuthLoginControllerContext.Provider value={value}>{children}</LiveAuthLoginControllerContext.Provider>
  );
}

export function useLiveAuthLoginController(): LiveAuthLoginController {
  const v = useContext(LiveAuthLoginControllerContext);
  if (!v) {
    throw new Error('useLiveAuthLoginController hors LiveAuthLoginControllerProvider');
  }
  return v;
}
