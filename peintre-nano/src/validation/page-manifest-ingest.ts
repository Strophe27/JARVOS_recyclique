import type { PageManifest, PageSlotPlacement } from '../types/page-manifest';
import { deepMapKeysToCamelCase } from './key-normalize';
import { manifestErr, type ManifestValidationIssue } from './manifest-validation-types';

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function readOptionalPermissionKeysRoot(
  root: Record<string, unknown>,
  sourceLabel: string,
): { keys?: string[]; issues: ManifestValidationIssue[] } {
  const issues: ManifestValidationIssue[] = [];
  const raw = root.requiredPermissionKeys;
  if (raw === undefined) return { issues: [] };
  if (!Array.isArray(raw)) {
    issues.push(
      manifestErr('MANIFEST_STRUCTURE_INVALID', `requiredPermissionKeys doit être un tableau (${sourceLabel})`, {
        source: sourceLabel,
      }),
    );
    return { issues };
  }
  const keys: string[] = [];
  raw.forEach((item, i) => {
    if (!isNonEmptyString(item)) {
      issues.push(
        manifestErr('MANIFEST_STRUCTURE_INVALID', `requiredPermissionKeys[${i}] invalide (${sourceLabel})`, {
          source: sourceLabel,
        }),
      );
    } else {
      keys.push(item);
    }
  });
  if (issues.length) return { issues };
  return { keys, issues: [] };
}

function readSlot(raw: unknown, path: string): { slot?: PageSlotPlacement; issues: ManifestValidationIssue[] } {
  const issues: ManifestValidationIssue[] = [];
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    issues.push(manifestErr('MANIFEST_STRUCTURE_INVALID', `Slot invalide à ${path}`, { path }));
    return { issues };
  }
  const o = raw as Record<string, unknown>;
  if (!isNonEmptyString(o.slotId)) {
    issues.push(manifestErr('MANIFEST_STRUCTURE_INVALID', `slotId requis à ${path}`, { path }));
  }
  if (!isNonEmptyString(o.widgetType)) {
    issues.push(manifestErr('MANIFEST_STRUCTURE_INVALID', `widgetType requis à ${path}`, { path }));
  }
  let widgetProps: PageSlotPlacement['widgetProps'];
  if (o.widgetProps !== undefined && o.widgetProps !== null) {
    if (typeof o.widgetProps !== 'object' || Array.isArray(o.widgetProps)) {
      issues.push(
        manifestErr('MANIFEST_STRUCTURE_INVALID', `widgetProps doit être un objet à ${path}`, { path }),
      );
    } else {
      widgetProps = o.widgetProps as PageSlotPlacement['widgetProps'];
    }
  }
  if (issues.length) return { issues };
  return {
    slot: {
      slotId: o.slotId as string,
      widgetType: o.widgetType as string,
      ...(widgetProps !== undefined ? { widgetProps } : {}),
    },
    issues: [],
  };
}

export function parsePageManifestJson(
  text: string,
  sourceLabel = 'page',
): { manifest?: PageManifest; issues: ManifestValidationIssue[] } {
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
        manifestErr('MANIFEST_STRUCTURE_INVALID', `Racine PageManifest doit être un objet (${sourceLabel})`, {
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
  if (!isNonEmptyString(root.pageKey)) {
    return {
      issues: [
        manifestErr('MANIFEST_STRUCTURE_INVALID', `Champ pageKey requis (${sourceLabel})`, { source: sourceLabel }),
      ],
    };
  }
  if (!Array.isArray(root.slots)) {
    return {
      issues: [
        manifestErr('MANIFEST_STRUCTURE_INVALID', `Champ slots (tableau) requis (${sourceLabel})`, {
          source: sourceLabel,
        }),
      ],
    };
  }
  const issues: ManifestValidationIssue[] = [];
  const slots: PageSlotPlacement[] = [];
  root.slots.forEach((item, i) => {
    const r = readSlot(item, `${sourceLabel}.slots[${i}]`);
    issues.push(...r.issues);
    if (r.slot) slots.push(r.slot);
  });
  if (issues.length) return { issues };

  const perm = readOptionalPermissionKeysRoot(root, sourceLabel);
  issues.push(...perm.issues);
  let requiresSite: boolean | undefined;
  if (root.requiresSite !== undefined) {
    if (typeof root.requiresSite !== 'boolean') {
      issues.push(
        manifestErr('MANIFEST_STRUCTURE_INVALID', `requiresSite doit être un booléen (${sourceLabel})`, {
          source: sourceLabel,
        }),
      );
    } else {
      requiresSite = root.requiresSite;
    }
  }
  if (issues.length) return { issues };

  return {
    manifest: {
      version: root.version as string,
      pageKey: root.pageKey as string,
      slots,
      ...(perm.keys !== undefined && perm.keys.length ? { requiredPermissionKeys: perm.keys } : {}),
      ...(requiresSite !== undefined ? { requiresSite } : {}),
    },
    issues: [],
  };
}
