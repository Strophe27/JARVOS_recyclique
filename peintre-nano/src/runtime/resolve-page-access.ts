import { isEnvelopeStale } from './context-envelope-freshness';
import type { PageManifest } from '../types/page-manifest';
import type { ContextEnvelopeStub } from '../types/context-envelope';

export type PageAccessDenialCode =
  | 'FORBIDDEN'
  | 'STALE_CONTEXT'
  | 'DEGRADED_CONTEXT'
  | 'MISSING_SITE'
  | 'MISSING_PERMISSIONS';

export type PageAccessResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly code: PageAccessDenialCode; readonly message: string };

/**
 * Options pour `resolvePageAccess` (ex. horloge). Aucun paramètre **UserRuntimePrefs** : les prefs UI ne participent pas à la garde page.
 */
export type ResolvePageAccessOptions = {
  readonly nowMs?: number;
};

function permissionsSatisfied(page: PageManifest, envelope: ContextEnvelopeStub): boolean {
  const effective = new Set(envelope.permissions.permissionKeys);
  const reqAll = page.requiredPermissionKeys;
  if (reqAll?.length && !reqAll.every((k) => effective.has(k))) {
    return false;
  }
  const reqAny = page.requiredPermissionAnyKeys;
  if (reqAny?.length && !reqAny.some((k) => effective.has(k))) {
    return false;
  }
  return true;
}

/**
 * Résolution pure : le rendu métier du `PageManifest` n'est autorisé que si l'enveloppe
 * autoritative le permet (statut, fraîcheur, site, permissions).
 */
export function resolvePageAccess(
  page: PageManifest,
  envelope: ContextEnvelopeStub,
  options?: ResolvePageAccessOptions,
): PageAccessResult {
  const nowMs = options?.nowMs ?? Date.now();

  if (envelope.runtimeStatus === 'forbidden') {
    return {
      allowed: false,
      code: 'FORBIDDEN',
      message: 'Contexte interdit — rendu métier bloqué.',
    };
  }

  if (isEnvelopeStale(envelope, nowMs)) {
    return {
      allowed: false,
      code: 'STALE_CONTEXT',
      message: 'Contexte périmé — rafraîchissement requis avant rendu métier.',
    };
  }

  if (envelope.runtimeStatus === 'degraded') {
    return {
      allowed: false,
      code: 'DEGRADED_CONTEXT',
      message: 'Contexte dégradé — pas de supposition de configuration métier valide.',
    };
  }

  if (page.requiresSite === true && envelope.siteId == null) {
    return {
      allowed: false,
      code: 'MISSING_SITE',
      message: 'Site actif requis pour cette page.',
    };
  }

  if (!permissionsSatisfied(page, envelope)) {
    return {
      allowed: false,
      code: 'MISSING_PERMISSIONS',
      message: 'Permissions insuffisantes pour afficher cette page.',
    };
  }

  return { allowed: true };
}
