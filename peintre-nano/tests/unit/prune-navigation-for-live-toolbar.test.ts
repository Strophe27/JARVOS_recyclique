import { describe, expect, it } from 'vitest';
import type { NavigationEntry } from '../../src/types/navigation-manifest';
import {
  LIVE_LEGACY_TOOLBAR_ENTRY_IDS,
  pruneNavigationEntriesForLiveToolbar,
} from '../../src/runtime/prune-navigation-for-live-toolbar';
import { toolbarSelectedEntryIdFromResolved } from '../../src/runtime/toolbar-selection-for-live-path';

function entry(id: string): NavigationEntry {
  return {
    id,
    routeKey: id,
    path: `/${id}`,
    pageKey: id,
  };
}

describe('pruneNavigationEntriesForLiveToolbar', () => {
  it('ordonne les entrées comme le menu legacy (dashboard, caisse, réception, admin)', () => {
    const mixed: NavigationEntry[] = [
      entry('transverse-admin'),
      entry('transverse-dashboard'),
      entry('bandeau-live-sandbox'),
      entry('cashflow-nominal'),
      entry('reception-nominal'),
    ];
    const pruned = pruneNavigationEntriesForLiveToolbar(mixed);
    expect(pruned.map((e) => e.id)).toEqual([
      'transverse-dashboard',
      'cashflow-nominal',
      'reception-nominal',
      'transverse-admin',
    ]);
  });

  it('omet les entrées absentes du filtre (ex. pas de réception)', () => {
    const pruned = pruneNavigationEntriesForLiveToolbar([
      entry('transverse-dashboard'),
      entry('cashflow-nominal'),
      entry('transverse-admin'),
    ]);
    expect(pruned.map((e) => e.id)).toEqual([
      'transverse-dashboard',
      'cashflow-nominal',
      'transverse-admin',
    ]);
  });

  it('retourne une copie complète si aucune entrée legacy ne matche', () => {
    const only = [entry('bandeau-live-sandbox')];
    expect(pruneNavigationEntriesForLiveToolbar(only)).toEqual(only);
  });

  it('expose la liste canonique des ids toolbar', () => {
    expect(LIVE_LEGACY_TOOLBAR_ENTRY_IDS.length).toBe(4);
  });
});

describe('toolbarSelectedEntryIdFromResolved', () => {
  it('remonte les sous-routes admin vers transverse-admin', () => {
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-access', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-site', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-users', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-groups', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-categories', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-audit-log', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-cash-registers', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-sites', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-sites-and-registers', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-session-manager', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-settings', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-health', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-reception-stats', true)).toBe('transverse-admin');
    expect(toolbarSelectedEntryIdFromResolved('transverse-admin-reception-sessions', true)).toBe('transverse-admin');
  });

  it('remonte remboursement / clôture vers cashflow-nominal', () => {
    expect(toolbarSelectedEntryIdFromResolved('cashflow-refund', true)).toBe('cashflow-nominal');
    expect(toolbarSelectedEntryIdFromResolved('cashflow-close', true)).toBe('cashflow-nominal');
  });

  it('remonte le dashboard personnel vers transverse-dashboard (un seul lien « site » dans la barre)', () => {
    expect(toolbarSelectedEntryIdFromResolved('transverse-dashboard-benevole', true)).toBe('transverse-dashboard');
  });

  it('laisse passer les ids toolbar tels quels', () => {
    expect(toolbarSelectedEntryIdFromResolved('transverse-dashboard', true)).toBe('transverse-dashboard');
  });

  it('sans mode live, renvoie l’id résolu inchangé', () => {
    expect(toolbarSelectedEntryIdFromResolved('transverse-listing-articles', false)).toBe(
      'transverse-listing-articles',
    );
  });

  it('sans correspondance toolbar, pas de surbrillance (undefined)', () => {
    expect(toolbarSelectedEntryIdFromResolved('bandeau-live-sandbox', true)).toBeUndefined();
  });
});
