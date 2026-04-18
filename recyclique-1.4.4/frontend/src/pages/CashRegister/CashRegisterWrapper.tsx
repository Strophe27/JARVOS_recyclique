import React from 'react';
import { CashStoreProvider } from '../../providers/CashStoreProvider';
import CashRegisterDashboard from './CashRegisterDashboard';

/**
 * Wrapper pour CashRegisterDashboard avec le provider
 * Détecte automatiquement le mode depuis l'URL (/virtual = mode virtuel)
 */
export const CashRegisterWrapper: React.FC = () => {
  return (
    <CashStoreProvider>
      <CashRegisterDashboard />
    </CashStoreProvider>
  );
};

export default CashRegisterWrapper;

