/**
 * Libellés et clés alignés sur `UnifiedLiveStatsResponse` / `daily_kpis_aggregate`
 * (`GET /v2/exploitation/live-snapshot`, Story 2.7 — OpenAPI `ExploitationLiveSnapshot`).
 * Aucune agrégation métier : lecture de champs déjà calculés côté serveur.
 */
export type DashboardKpiRow = { label: string; value: string | number };

const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function readFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  return undefined;
}

function readIntish(v: unknown): number | undefined {
  const n = readFiniteNumber(v);
  if (n === undefined) {
    return undefined;
  }
  return Math.trunc(n);
}

/**
 * Produit les 4 lignes KPI affichées sur le dashboard transverse à partir du bloc
 * `daily_kpis_aggregate` (snake_case JSON serveur).
 */
export function kpisFromDailyKpisAggregate(
  agg: Record<string, unknown> | null | undefined,
): DashboardKpiRow[] {
  const tickets = readIntish(agg?.tickets_count);
  const ca = readFiniteNumber(agg?.ca);
  const items = readIntish(agg?.items_received);
  const donations = readFiniteNumber(agg?.donations);

  return [
    {
      label: 'Tickets caisse (jour)',
      value: tickets !== undefined ? tickets : '—',
    },
    {
      label: "Chiffre d'affaires (jour)",
      value: ca !== undefined ? EUR.format(ca) : '—',
    },
    {
      label: 'Articles réception (jour)',
      value: items !== undefined ? items : '—',
    },
    {
      label: 'Dons caisse (jour)',
      value: donations !== undefined ? EUR.format(donations) : '—',
    },
  ];
}
