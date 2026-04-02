import { MantineProvider, createTheme } from '@mantine/core';
import type { ReactNode } from 'react';
import type { AuthContextPort } from '../auth/auth-context-port';
import { AuthRuntimeProvider } from '../auth/AuthRuntimeProvider';
import { UserRuntimePrefsProvider } from './UserRuntimePrefsProvider';

const theme = createTheme({
  fontFamily: 'var(--pn-font-sans)',
  primaryColor: 'blue',
});

export type RootProvidersProps = {
  readonly children: ReactNode;
  /** Surcharge Piste A / tests — défaut : adaptateur démo session + enveloppe. */
  readonly authAdapter?: AuthContextPort;
  /** Tests : désactive la persistance `localStorage` des prefs UI. */
  readonly disableUserPrefsPersistence?: boolean;
};

export function RootProviders({
  children,
  authAdapter,
  disableUserPrefsPersistence = false,
}: RootProvidersProps) {
  return (
    <MantineProvider theme={theme}>
      <AuthRuntimeProvider adapter={authAdapter}>
        <UserRuntimePrefsProvider disablePersistence={disableUserPrefsPersistence}>
          {children}
        </UserRuntimePrefsProvider>
      </AuthRuntimeProvider>
    </MantineProvider>
  );
}
