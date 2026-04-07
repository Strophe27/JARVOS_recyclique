import type { ContextEnvelopeStub } from '../types/context-envelope';
import type { NavigationEntry } from '../types/navigation-manifest';

/**
 * Résolution déterministe du texte affiché pour une entrée de navigation transverse.
 *
 * Politique (story 5.5, réutilisable 5.6–5.8) :
 * 1. Si l’enveloppe fournit une valeur non vide pour `entry.labelKey` dans `presentationLabels`, l’utiliser.
 * 2. Sinon fallback : `labelKey` du manifeste (clé stable contractuelle), puis `routeKey`.
 *
 * Ne consulte pas `UserRuntimePrefs` ; ne déduit aucune permission.
 */
export function resolveNavEntryDisplayLabel(entry: NavigationEntry, envelope: ContextEnvelopeStub): string {
  const key = entry.labelKey;
  if (key) {
    const resolved = envelope.presentationLabels?.[key];
    if (resolved != null && typeof resolved === 'string') {
      const trimmed = resolved.trim();
      if (trimmed !== '') {
        return trimmed;
      }
    }
    return key;
  }
  return entry.routeKey;
}
