/**
 * Domaine caisse — poste caisse, ventes, sessions.
 * Story 3.3 : déverrouillage par PIN, état locked/unlocked.
 * Story 3.5 : garde de routes, menu restreint en mode verrouillé.
 */
export { CaisseProvider, useCaisse } from './CaisseContext';
export type { CaisseState } from './CaisseContext';
export { PinUnlockModal } from './PinUnlockModal';
export type { PinUnlockModalProps } from './PinUnlockModal';
export { LockButton } from './LockButton';
export type { LockButtonProps } from './LockButton';
export { CashRegisterGuard } from './CashRegisterGuard';
export type { CashRegisterGuardProps } from './CashRegisterGuard';
export { useCashRegisterLock } from './useCashRegisterLock';
export type { UseCashRegisterLockResult } from './useCashRegisterLock';
export {
  isCaisseAllowedPath,
  CAISSE_ALLOWED_PATH_PREFIXES,
  CAISSE_DEFAULT_REDIRECT,
  CAISSE_PIN_PATH,
  CAISSE_SESSION_CLOSE_PATH,
} from './cashRegisterRoutes';
export { AppNav } from './AppNav';
export type { NavItem } from './AppNav';
export { CaisseDashboardPage } from './CaisseDashboardPage';
export { CashRegisterSalePage } from './CashRegisterSalePage';
export { VirtualCashRegisterPage } from './VirtualCashRegisterPage';
export { DeferredCashRegisterPage } from './DeferredCashRegisterPage';
export { useVirtualCashSessionStore } from './virtualCashSessionStore';
export type { VirtualCashSessionState } from './virtualCashSessionStore';
export { useDeferredCashSessionStore } from './deferredCashSessionStore';
export type { DeferredCashSessionState } from './deferredCashSessionStore';
