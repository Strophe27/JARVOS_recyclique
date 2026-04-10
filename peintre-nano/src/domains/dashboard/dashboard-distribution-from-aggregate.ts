/**
 * Segments visuels dérivés de `daily_kpis_aggregate` (live-snapshot, Story 2.7).
 * Aucune agrégation métier : lecture de champs déjà présents dans le contrat OpenAPI.
 */

const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const KG = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

function readFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  return undefined;
}

function readNonNeg(v: unknown): number {
  const n = readFiniteNumber(v);
  if (n === undefined || n < 0) {
    return 0;
  }
  return n;
}

export type MoneyBar = { label: string; value: number; displayValue: string; widthPct: number };

export type CountBar = { label: string; value: number; displayValue: string; widthPct: number };

export type WeightBar = { label: string; valueKg: number; displayValue: string; widthPct: number };

export type DashboardDistributionFromAggregate = {
  readonly moneyBars: MoneyBar[];
  readonly countBars: CountBar[];
  readonly weightBars: WeightBar[];
};

/**
 * Prépare barres horizontales (largeur relative au max du groupe) pour la zone tendances / répartition.
 */
export function dashboardDistributionFromDailyAggregate(
  agg: Record<string, unknown> | null | undefined,
): DashboardDistributionFromAggregate | null {
  if (agg === null || agg === undefined) {
    return null;
  }

  const ca = readNonNeg(agg.ca);
  const donations = readNonNeg(agg.donations);
  const moneyMax = Math.max(ca, donations, 1e-6);
  const moneyBars: MoneyBar[] = [
    {
      label: "Chiffre d'affaires",
      value: ca,
      displayValue: EUR.format(ca),
      widthPct: (ca / moneyMax) * 100,
    },
    {
      label: 'Dons caisse',
      value: donations,
      displayValue: EUR.format(donations),
      widthPct: (donations / moneyMax) * 100,
    },
  ];

  const tickets = readNonNeg(agg.tickets_count);
  const items = readNonNeg(agg.items_received);
  const openT = readNonNeg(agg.tickets_open);
  const closed = readNonNeg(agg.tickets_closed_24h);
  const countMax = Math.max(tickets, items, openT, closed, 1);
  const countBars: CountBar[] = [
    {
      label: 'Tickets caisse',
      value: tickets,
      displayValue: String(Math.trunc(tickets)),
      widthPct: (tickets / countMax) * 100,
    },
    {
      label: 'Articles réception',
      value: items,
      displayValue: String(Math.trunc(items)),
      widthPct: (items / countMax) * 100,
    },
    {
      label: 'Tickets dépôt ouverts',
      value: openT,
      displayValue: String(Math.trunc(openT)),
      widthPct: (openT / countMax) * 100,
    },
    {
      label: 'Tickets dépôt clôturés (24 h)',
      value: closed,
      displayValue: String(Math.trunc(closed)),
      widthPct: (closed / countMax) * 100,
    },
  ];

  const win = readNonNeg(agg.weight_in);
  const wout = readNonNeg(agg.weight_out);
  const wMax = Math.max(win, wout, 1e-6);
  const weightBars: WeightBar[] = [
    {
      label: 'Poids entrée',
      valueKg: win,
      displayValue: `${KG.format(win)} kg`,
      widthPct: (win / wMax) * 100,
    },
    {
      label: 'Poids sortie',
      valueKg: wout,
      displayValue: `${KG.format(wout)} kg`,
      widthPct: (wout / wMax) * 100,
    },
  ];

  return { moneyBars, countBars, weightBars };
}
