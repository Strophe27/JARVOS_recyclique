import '@mantine/core/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { RootProviders } from './app/providers/RootProviders';
import './styles/tokens.css';
import './runtime/conceptual-artifacts.stub';

const el = document.getElementById('root');
if (!el) {
  throw new Error('Élément #root introuvable');
}

createRoot(el).render(
  <StrictMode>
    <RootProviders>
      <App />
    </RootProviders>
  </StrictMode>,
);
