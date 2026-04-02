import type { NavigationEntry, NavigationManifest } from '../types/navigation-manifest';
import { deepMapKeysToCamelCase } from './key-normalize';
import { manifestErr, type ManifestValidationIssue } from './manifest-validation-types';

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function readOptionalPermissionKeys(
  o: Record<string, unknown>,
  path: string,
): { keys?: string[]; issues: ManifestValidationIssue[] } {
  const issues: ManifestValidationIssue[] = [];
  const raw = o.requiredPermissionKeys;
  if (raw === undefined) return { issues: [] };
  if (!Array.isArray(raw)) {
    issues.push(
      manifestErr('MANIFEST_STRUCTURE_INVALID', `requiredPermissionKeys doit être un tableau à ${path}`, { path }),
    );
    return { issues };
  }
  const keys: string[] = [];
  raw.forEach((item, i) => {
    if (!isNonEmptyString(item)) {
      issues.push(
        manifestErr('MANIFEST_STRUCTURE_INVALID', `requiredPermissionKeys[${i}] doit être une chaîne non vide à ${path}`, {
          path,
        }),
      );
    } else {
      keys.push(item);
    }
  });
  if (issues.length) return { issues };
  return { keys, issues: [] };
}

function readNavigationEntry(raw: unknown, path: string): { entry?: NavigationEntry; issues: ManifestValidationIssue[] } {
  const issues: ManifestValidationIssue[] = [];
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    issues.push(
      manifestErr('MANIFEST_STRUCTURE_INVALID', `Entrée de navigation invalide à ${path}`, { path }),
    );
    return { issues };
  }
  const o = raw as Record<string, unknown>;
  if (!isNonEmptyString(o.id)) {
    issues.push(manifestErr('MANIFEST_STRUCTURE_INVALID', `Champ id requis (non vide) à ${path}`, { path }));
  }
  if (!isNonEmptyString(o.routeKey)) {
    issues.push(
      manifestErr('MANIFEST_STRUCTURE_INVALID', `Champ routeKey requis (non vide) à ${path}`, { path }),
    );
  }
  const childIssues: ManifestValidationIssue[] = [];
  let children: NavigationEntry[] | undefined;
  if (o.children !== undefined) {
    if (!Array.isArray(o.children)) {
      childIssues.push(
        manifestErr('MANIFEST_STRUCTURE_INVALID', `children doit être un tableau à ${path}`, { path }),
      );
    } else {
      const outChildren: NavigationEntry[] = [];
      o.children.forEach((c, i) => {
        const r = readNavigationEntry(c, `${path}.children[${i}]`);
        childIssues.push(...r.issues);
        if (r.entry) outChildren.push(r.entry);
      });
      if (!childIssues.length) children = outChildren;
    }
  }
  issues.push(...childIssues);
  const perm = readOptionalPermissionKeys(o, path);
  issues.push(...perm.issues);
  if (issues.length) return { issues };

  const entry: NavigationEntry = {
    id: o.id as string,
    routeKey: o.routeKey as string,
    ...(isNonEmptyString(o.path) ? { path: o.path } : {}),
    ...(isNonEmptyString(o.pageKey) ? { pageKey: o.pageKey } : {}),
    ...(isNonEmptyString(o.shortcutId) ? { shortcutId: o.shortcutId } : {}),
    ...(isNonEmptyString(o.labelKey) ? { labelKey: o.labelKey } : {}),
    ...(perm.keys !== undefined && perm.keys.length ? { requiredPermissionKeys: perm.keys } : {}),
    ...(children !== undefined ? { children } : {}),
  };
  return { entry, issues: [] };
}

export function parseNavigationManifestJson(
  text: string,
  sourceLabel = 'navigation',
): { manifest?: NavigationManifest; issues: ManifestValidationIssue[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      issues: [
        manifestErr('MANIFEST_PARSE_ERROR', `JSON invalide (${sourceLabel})`, {
          source: sourceLabel,
          parseMessage: msg,
        }),
      ],
    };
  }
  const normalized = deepMapKeysToCamelCase(parsed);
  if (normalized === null || typeof normalized !== 'object' || Array.isArray(normalized)) {
    return {
      issues: [
        manifestErr('MANIFEST_STRUCTURE_INVALID', `Racine NavigationManifest doit être un objet (${sourceLabel})`, {
          source: sourceLabel,
        }),
      ],
    };
  }
  const root = normalized as Record<string, unknown>;
  if (!isNonEmptyString(root.version)) {
    return {
      issues: [
        manifestErr('MANIFEST_STRUCTURE_INVALID', `Champ version requis (${sourceLabel})`, { source: sourceLabel }),
      ],
    };
  }
  if (!Array.isArray(root.entries)) {
    return {
      issues: [
        manifestErr('MANIFEST_STRUCTURE_INVALID', `Champ entries (tableau) requis (${sourceLabel})`, {
          source: sourceLabel,
        }),
      ],
    };
  }
  const issues: ManifestValidationIssue[] = [];
  const entries: NavigationEntry[] = [];
  root.entries.forEach((item, i) => {
    const r = readNavigationEntry(item, `${sourceLabel}.entries[${i}]`);
    issues.push(...r.issues);
    if (r.entry) entries.push(r.entry);
  });
  if (issues.length) return { issues };
  return { manifest: { version: root.version as string, entries }, issues: [] };
}
