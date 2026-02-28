/**
 * Point d'entrée React — Story 3.5.
 * Monte AuthProvider, CaisseProvider, puis App (Router + Guard + Nav + routes).
 * Mantine (Story 6.1 review) : styles + MantineProvider.
 * Story 10.1 : DisplayServicesProvider (LayoutConfigService, VisualProvider stubs).
 */
import '@mantine/core/styles.css';
import './shared/theme/global.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { AuthProvider } from './auth/AuthContext';
import { CaisseProvider } from './caisse';
import { cssVariablesResolver, mantineTheme } from './shared/theme';
import { DisplayServicesProvider } from './shared/display-services';
import { layoutConfigStub } from './shared/layout';
import { visualProviderStub } from './shared/visual';
import { App } from './App';

// v2+ : basculer sur implémentations réelles via env (ex. VITE_USE_REAL_DISPLAY_SERVICES=true).

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider
      theme={mantineTheme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="light"
    >
      <AuthProvider>
        <DisplayServicesProvider
          layoutConfigService={layoutConfigStub}
          visualProvider={visualProviderStub}
        >
          <CaisseProvider>
            <App />
          </CaisseProvider>
        </DisplayServicesProvider>
      </AuthProvider>
    </MantineProvider>
  </React.StrictMode>
);
