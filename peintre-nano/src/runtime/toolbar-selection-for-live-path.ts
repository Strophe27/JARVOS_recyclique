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
    resolvedEntryId === 'transverse-admin-pending' ||
    resolvedEntryId === 'transverse-admin-cash-registers' ||
    resolvedEntryId === 'transverse-admin-sites'
  ) {
    return 'transverse-admin';
  }
  if (resolvedEntryId === 'cashflow-refund' || resolvedEntryId === 'cashflow-close') {
    return 'cashflow-nominal';
  }
  if (resolvedEntryId === 'transverse-dashboard-benevole') {
    return 'transverse-dashboard';
  }
  return undefined;
}
