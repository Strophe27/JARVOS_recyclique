import type { TransversePageStateConfig } from '../states/transverse';
import { DEFAULT_TRANSVERSE_PAGE_STATE } from '../states/transverse';

/**
 * Paramètre de démo uniquement : `?transverseState=loading|empty|error` sur pages transverses.
 * Ne construit aucune vérité métier — scénarios UX pour le bac à sable.
 */
export function transversePageStateFromSearch(search: string): TransversePageStateConfig {
  const q = new URLSearchParams(search);
  const s = (q.get('transverseState') ?? '').toLowerCase();
  if (s === 'loading') {
    return { kind: 'loading', message: 'Chargement des données transverses…' };
  }
  if (s === 'empty') {
    return {
      kind: 'empty',
      title: 'Liste vide',
      message: 'Réponse backend sans lignes pour cette vue (démonstration).',
    };
  }
  if (s === 'error') {
    return {
      kind: 'error',
      message: 'Impossible de charger les données transverses (démonstration).',
      code: 'TRANSVERSE_DEMO_FETCH_FAILED',
      severity: 'degraded',
    };
  }
  if (s === 'nominal' || s === '') {
    return DEFAULT_TRANSVERSE_PAGE_STATE;
  }
  return DEFAULT_TRANSVERSE_PAGE_STATE;
}
