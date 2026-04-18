import React from 'react';
import { CashStoreProvider } from '../../providers/CashStoreProvider';
import CloseSession from './CloseSession';

/**
 * Wrapper pour CloseSession avec le provider
 * Détecte automatiquement le mode depuis l'URL
 */
export const CloseSessionWrapper: React.FC = () => {
  return (
    <CashStoreProvider>
      <CloseSession />
    </CashStoreProvider>
  );
};

export default CloseSessionWrapper;
















