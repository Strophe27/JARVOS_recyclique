import type { ContextEnvelopeStub } from '../types/context-envelope';
import type { NavigationEntry } from '../types/navigation-manifest';
import { NAV_LABEL_PRESENTATION_FALLBACKS } from './nav-label-presentation-fallbacks';

/**
 * Résolution déterministe du texte affiché pour une entrée de navigation transverse.
 *
 * Politique (story 5.5, réutilisable 5.6–5.8) :
 * 1. Si l’enveloppe fournit une valeur non vide pour `entry.labelKey` dans `presentationLabels`, l’utiliser.
 * 2. Si la clé est présente dans `presentationLabels` mais la valeur est vide : afficher `labelKey` (comportement documenté tests).
 * 3. Sinon libellé produit connu (`nav-label-presentation-fallbacks`), puis `labelKey`.
 *
 * Ne consulte pas `UserRuntimePrefs` ; ne déduit aucune permission.
 */
export function resolveNavEntryDisplayLabel(entry: NavigationEntry, envelope: ContextEnvelopeStub): string {
  const key = entry.labelKey;
  if (key) {
    const pl = envelope.presentationLabels;
    if (pl != null && Object.prototype.hasOwnProperty.call(pl, key)) {
      const resolved = pl[key];
      if (resolved != null && typeof resolved === 'string') {
        const trimmed = resolved.trim();
        if (trimmed !== '') {
          return trimmed;
        }
        return key;
      }
    }
    return NAV_LABEL_PRESENTATION_FALLBACKS[key] ?? key;
  }
  return entry.routeKey;
}
