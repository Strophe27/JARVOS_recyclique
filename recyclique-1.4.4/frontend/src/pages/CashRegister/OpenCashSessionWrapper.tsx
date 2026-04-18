import React from 'react';
import { CashStoreProvider } from '../../providers/CashStoreProvider';
import OpenCashSession from './OpenCashSession';

/**
 * Wrapper pour OpenCashSession avec le provider
 * Détecte automatiquement le mode depuis l'URL
 */
export const OpenCashSessionWrapper: React.FC = () => {
  return (
    <CashStoreProvider>
      <OpenCashSession />
    </CashStoreProvider>
  );
};

export default OpenCashSessionWrapper;
















