import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';
import './styles/global.css';
import App from './App.jsx';
import HydrationWrapper from './components/HydrationWrapper.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Désactiver React.StrictMode en production/staging pour éviter le double rendu
const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

const AppContent = (
  <HydrationWrapper>
    <MantineProvider>
      <BrowserRouter>
        <App />
        <Notifications />
      </BrowserRouter>
    </MantineProvider>
  </HydrationWrapper>
);

root.render(
  isProduction ? AppContent : <React.StrictMode>{AppContent}</React.StrictMode>
);
