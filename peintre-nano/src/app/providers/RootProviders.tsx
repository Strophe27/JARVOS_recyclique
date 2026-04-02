import { MantineProvider, createTheme } from '@mantine/core';
import type { ReactNode } from 'react';

const theme = createTheme({
  fontFamily: 'var(--pn-font-sans)',
  primaryColor: 'blue',
});

export function RootProviders({ children }: { children: ReactNode }) {
  return <MantineProvider theme={theme}>{children}</MantineProvider>;
}
