import type { NavigationEntry, NavigationManifest } from '../types/navigation-manifest';
import type { PageManifest } from '../types/page-manifest';
import { manifestErr, type ManifestValidationIssue } from './manifest-validation-types';

function flattenNavEntries(entries: readonly NavigationEntry[]): NavigationEntry[] {
  const out: NavigationEntry[] = [];
  function walk(e: NavigationEntry) {
    out.push(e);
    if (e.children) e.children.forEach(walk);
  }
  entries.forEach(walk);
  return out;
}

/** Règles croisées : unicités, liens nav → page, widgets autorisés. */
export function validateManifestBundle(
  navigation: NavigationManifest,
  pages: readonly PageManifest[],
  allowedWidgetTypes: ReadonlySet<string>,
): { issues: ManifestValidationIssue[] } {
  const flat = flattenNavEntries(navigation.entries);
  const issues: ManifestValidationIssue[] = [];

  const routeKeyMap = new Map<string, string[]>();
  for (const e of flat) {
    const list = routeKeyMap.get(e.routeKey) ?? [];
    list.push(e.id);
    routeKeyMap.set(e.routeKey, list);
  }
  for (const [routeKey, ids] of routeKeyMap) {
    if (ids.length > 1) {
      issues.push(
        manifestErr('ROUTE_KEY_COLLISION', `route_key dupliqué : ${routeKey}`, {
          routeKey,
          entryIds: ids,
        }),
      );
    }
  }

  const pathMap = new Map<string, string[]>();
  for (const e of flat) {
    if (e.path === undefined) continue;
    const list = pathMap.get(e.path) ?? [];
    list.push(e.id);
    pathMap.set(e.path, list);
  }
  for (const [path, ids] of pathMap) {
    if (ids.length > 1) {
      issues.push(
        manifestErr('PATH_COLLISION', `path dupliqué : ${path}`, {
          path,
          entryIds: ids,
        }),
      );
    }
  }

  const shortcutMap = new Map<string, string[]>();
  for (const e of flat) {
    if (e.shortcutId === undefined) continue;
    const list = shortcutMap.get(e.shortcutId) ?? [];
    list.push(e.id);
    shortcutMap.set(e.shortcutId, list);
  }
  for (const [shortcutId, ids] of shortcutMap) {
    if (ids.length > 1) {
      issues.push(
        manifestErr('SHORTCUT_COLLISION', `Raccourci dupliqué : ${shortcutId}`, {
          shortcutId,
          entryIds: ids,
        }),
      );
    }
  }

  const pageKeyMap = new Map<string, number>();
  for (const p of pages) {
    pageKeyMap.set(p.pageKey, (pageKeyMap.get(p.pageKey) ?? 0) + 1);
  }
  for (const [pageKey, count] of pageKeyMap) {
    if (count > 1) {
      issues.push(
        manifestErr('PAGE_KEY_COLLISION', `page_key dupliqué dans le lot : ${pageKey}`, {
          pageKey,
          count,
        }),
      );
    }
  }

  const pageKeysLoaded = new Set(pages.map((p) => p.pageKey));
  for (const e of flat) {
    if (e.pageKey === undefined) continue;
    if (!pageKeysLoaded.has(e.pageKey)) {
      issues.push(
        manifestErr('NAV_PAGE_LINK_UNRESOLVED', `Lien navigation vers page_key introuvable : ${e.pageKey}`, {
          pageKey: e.pageKey,
          navigationEntryId: e.id,
        }),
      );
    }
  }

  for (const p of pages) {
    for (const slot of p.slots) {
      if (!allowedWidgetTypes.has(slot.widgetType)) {
        issues.push(
          manifestErr('UNKNOWN_WIDGET_TYPE', `widgetType non autorisé : ${slot.widgetType}`, {
            pageKey: p.pageKey,
            slotId: slot.slotId,
            widgetType: slot.widgetType,
          }),
        );
      }
    }
  }

  return { issues };
}
