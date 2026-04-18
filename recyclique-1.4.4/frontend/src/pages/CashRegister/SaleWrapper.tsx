import React from 'react';
import { CashStoreProvider } from '../../providers/CashStoreProvider';
import Sale from './Sale';

/**
 * Wrapper pour Sale avec le provider
 * Détecte automatiquement le mode depuis l'URL (/virtual = mode virtuel)
 */
export const SaleWrapper: React.FC = () => {
  return (
    <CashStoreProvider>
      <Sale />
    </CashStoreProvider>
  );
};

export default SaleWrapper;
















