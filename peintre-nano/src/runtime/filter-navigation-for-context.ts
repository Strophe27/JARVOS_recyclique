import type { NavigationEntry, NavigationManifest } from '../types/navigation-manifest';
import type { ContextEnvelopeStub } from '../types/context-envelope';
import { isEnvelopeStale } from './context-envelope-freshness';

/**
 * Options pour `filterNavigation` uniquement (fraîcheur / horloge).
 * Les **UserRuntimePrefs** n’y figurent **pas** : la personnalisation locale ne doit pas influencer le masquage nav.
 */
export type FilterNavigationOptions = {
  readonly nowMs?: number;
};

function entryPermissionKeysSatisfied(entry: NavigationEntry, effective: ReadonlySet<string>): boolean {
  const req = entry.requiredPermissionKeys;
  if (!req?.length) return true;
  return req.every((k) => effective.has(k));
}

function filterNavEntry(entry: NavigationEntry, effective: ReadonlySet<string>): NavigationEntry | null {
  if (!entryPermissionKeysSatisfied(entry, effective)) return null;

  if (!entry.children?.length) {
    const { children: _c, ...rest } = entry;
    return rest as NavigationEntry;
  }

  const nextChildren = entry.children
    .map((c) => filterNavEntry(c, effective))
    .filter((c): c is NavigationEntry => c !== null);

  return {
    ...entry,
    children: nextChildren.length ? nextChildren : undefined,
  };
}

/**
 * Vue filtrée du manifest de navigation : une entrée est exclue si ses `requiredPermissionKeys`
 * ne sont pas couvertes par `envelope.permissions.permissionKeys` (intersection autoritative).
 * Si l'enveloppe est interdite, dégradée ou périmée, aucune entrée n'est exposée (pas de navigation
 * « métier » supposée valide).
 */
export function filterNavigation(
  manifest: NavigationManifest,
  envelope: ContextEnvelopeStub,
  options?: FilterNavigationOptions,
): NavigationManifest {
  const nowMs = options?.nowMs ?? Date.now();
  if (envelope.runtimeStatus === 'forbidden' || envelope.runtimeStatus === 'degraded' || isEnvelopeStale(envelope, nowMs)) {
    return { version: manifest.version, entries: [] };
  }

  const effective = new Set(envelope.permissions.permissionKeys);
  const entries = manifest.entries
    .map((e) => filterNavEntry(e, effective))
    .filter((e): e is NavigationEntry => e !== null);
  return { version: manifest.version, entries };
}
