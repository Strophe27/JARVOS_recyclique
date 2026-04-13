import type { ReceptionLigneResponse } from '../../api/reception-client';

export function formatReceptionDateTimeFr(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatReceptionWeightKg(value: number): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : Number.parseFloat(String(value)) || 0;
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

export function formatReceptionWeightKgOrDash(value: number): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : Number.parseFloat(String(value)) || 0;
  if (n === 0) return '—';
  return formatReceptionWeightKg(n);
}

export function receptionStatusPresentation(status: string): { label: string; color: 'green' | 'red' | 'gray' } {
  const s = status.toLowerCase();
  if (s === 'opened' || s === 'open') return { label: 'Ouvert', color: 'green' };
  if (s === 'closed') return { label: 'Fermé', color: 'red' };
  return { label: status.trim() || '—', color: 'gray' };
}

export function destinationLabel(dest: string): string {
  if (dest === 'MAGASIN') return 'Magasin';
  if (dest === 'RECYCLAGE') return 'Recyclage';
  if (dest === 'DECHETERIE') return 'Déchetterie';
  return dest || '—';
}

export function ligneFlowPresentation(ligne: ReceptionLigneResponse): { label: string; color: string } {
  if (ligne.is_exit) return { label: 'Sortie boutique', color: 'red' };
  if (ligne.destination === 'MAGASIN') return { label: 'Entrée boutique', color: 'green' };
  return { label: 'Recyclage direct', color: 'orange' };
}

/** Métriques de poids dérivées des lignes (même logique que l’admin historique). */
export function receptionWeightMetricsFromLignes(lignes: readonly ReceptionLigneResponse[]): {
  totalProcessed: number;
  enteredBoutique: number;
  recycledDirect: number;
  recycledFromBoutique: number;
} {
  const totalProcessed = lignes.reduce((sum, l) => {
    const p = typeof l.poids_kg === 'number' ? l.poids_kg : Number.parseFloat(String(l.poids_kg)) || 0;
    return sum + p;
  }, 0);

  const enteredBoutique = lignes
    .filter((l) => !l.is_exit && l.destination === 'MAGASIN')
    .reduce((sum, l) => {
      const p = typeof l.poids_kg === 'number' ? l.poids_kg : Number.parseFloat(String(l.poids_kg)) || 0;
      return sum + p;
    }, 0);

  const recycledDirect = lignes
    .filter((l) => !l.is_exit && (l.destination === 'RECYCLAGE' || l.destination === 'DECHETERIE'))
    .reduce((sum, l) => {
      const p = typeof l.poids_kg === 'number' ? l.poids_kg : Number.parseFloat(String(l.poids_kg)) || 0;
      return sum + p;
    }, 0);

  const recycledFromBoutique = lignes
    .filter((l) => l.is_exit && (l.destination === 'RECYCLAGE' || l.destination === 'DECHETERIE'))
    .reduce((sum, l) => {
      const p = typeof l.poids_kg === 'number' ? l.poids_kg : Number.parseFloat(String(l.poids_kg)) || 0;
      return sum + p;
    }, 0);

  return { totalProcessed, enteredBoutique, recycledDirect, recycledFromBoutique };
}
