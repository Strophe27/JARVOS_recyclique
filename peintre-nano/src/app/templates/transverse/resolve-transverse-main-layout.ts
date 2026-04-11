/**
 * Résolution présentationnelle : choix du patron transverse pour la zone `main`
 * (slots non mappés vers header/nav/aside/footer). Les `page_key` listés ici
 * reflètent les contrats CREOS sous `contracts/creos/manifests/` — pas de nouvelle
 * vérité navigation ; uniquement du gabarit CSS.
 */
export type TransverseMainLayoutMode = 'hub' | 'consultation';

export function resolveTransverseMainLayoutMode(pageKey: string | undefined): TransverseMainLayoutMode | null {
  if (!pageKey?.startsWith('transverse-')) return null;
  if (pageKey === 'transverse-consultation-article' || pageKey === 'transverse-consultation-don') {
    return 'consultation';
  }
  if (
    pageKey === 'transverse-dashboard' ||
    pageKey.startsWith('transverse-dashboard-') ||
    pageKey.startsWith('transverse-listing-') ||
    pageKey.startsWith('transverse-admin')
  ) {
    return 'hub';
  }
  return null;
}

export type TransverseHubFamily = 'dashboard' | 'listing' | 'admin' | 'consultation';

/** Sous-étiquette `data-transverse-family` pour tests et doc (hub et repli consultation). */
export function resolveTransverseHubFamily(pageKey: string): TransverseHubFamily {
  if (pageKey === 'transverse-dashboard' || pageKey.startsWith('transverse-dashboard-')) return 'dashboard';
  if (pageKey.startsWith('transverse-listing-')) return 'listing';
  if (pageKey.startsWith('transverse-consultation-')) return 'consultation';
  return 'admin';
}
