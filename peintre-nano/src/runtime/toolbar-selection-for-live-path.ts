import { isLiveLegacyToolbarEntryId } from './prune-navigation-for-live-toolbar';

/**
 * Pour une entrée résolue depuis le manifest complet, id à mettre en surbrillance dans la topbar live
 * (entrées caisse/admin « enfants » → parent unique comme le legacy).
 */
export function toolbarSelectedEntryIdFromResolved(
  resolvedEntryId: string | undefined,
  useLiveToolbar: boolean,
): string | undefined {
  if (!useLiveToolbar || !resolvedEntryId) return resolvedEntryId;
  if (isLiveLegacyToolbarEntryId(resolvedEntryId)) return resolvedEntryId;
  if (
    resolvedEntryId === 'transverse-admin-access' ||
    resolvedEntryId === 'transverse-admin-site' ||
    resolvedEntryId === 'transverse-admin-users' ||
    resolvedEntryId === 'transverse-admin-groups' ||
    resolvedEntryId === 'transverse-admin-categories' ||
    resolvedEntryId === 'transverse-admin-audit-log' ||
    resolvedEntryId === 'transverse-admin-cash-registers' ||
    resolvedEntryId === 'transverse-admin-sites' ||
    resolvedEntryId === 'transverse-admin-sites-and-registers' ||
    resolvedEntryId === 'transverse-admin-session-manager' ||
    resolvedEntryId === 'transverse-admin-settings' ||
    resolvedEntryId === 'transverse-admin-health' ||
    resolvedEntryId === 'transverse-admin-reception-stats' ||
    resolvedEntryId === 'transverse-admin-reception-sessions' ||
    resolvedEntryId === 'transverse-admin-accounting' ||
    resolvedEntryId === 'transverse-admin-accounting-expert'
  ) {
    return 'transverse-admin';
  }
  if (
    resolvedEntryId === 'cashflow-close' ||
    resolvedEntryId === 'cashflow-refund' ||
    resolvedEntryId === 'cashflow-special-ops-hub'
  ) {
    return 'cashflow-nominal';
  }
  if (resolvedEntryId === 'transverse-dashboard-benevole') {
    return 'transverse-dashboard';
  }
  return undefined;
}
