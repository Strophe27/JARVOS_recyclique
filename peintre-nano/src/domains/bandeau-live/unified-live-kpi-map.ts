import type { UnifiedLiveStatsResponse } from '../../api/dashboard-legacy-stats-client';

/** Vue KPI caisse / réception — alignée sur `GET /v1/stats/live` et le bandeau legacy 1.4.4 (`CashLiveStats`). */
export type CashKpiLiveView = {
  readonly ticketsCount: number;
  readonly lastTicketAmount: number;
  readonly ca: number;
  readonly donations: number;
  readonly weightOut: number;
  readonly weightIn: number;
  /** Horodatage autoritaire côté API (`period_end` ou équivalent). */
  readonly timestampIso: string;
};

function readNum(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = raw[k];
    if (v === undefined || v === null) {
      continue;
    }
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return 0;
}

function readIso(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'string' && v.trim()) {
      return v;
    }
  }
  return new Date().toISOString();
}

/**
 * Normalise une réponse `GET /v1/stats/live` (snake_case JSON) vers une vue stable pour l’UI.
 */
export function mapUnifiedLiveResponseToView(
  res: UnifiedLiveStatsResponse | Record<string, unknown>,
): CashKpiLiveView {
  const raw = res as Record<string, unknown>;
  return {
    ticketsCount: readNum(raw, 'tickets_count', 'ticketsCount'),
    lastTicketAmount: readNum(raw, 'last_ticket_amount', 'lastTicketAmount'),
    ca: readNum(raw, 'ca'),
    donations: readNum(raw, 'donations'),
    weightOut: readNum(raw, 'weight_out', 'weightOut', 'weight_out_sales', 'weightOutSales'),
    weightIn: readNum(raw, 'weight_in', 'weightIn'),
    timestampIso: readIso(raw, 'period_end', 'periodEnd', 'computed_at', 'computedAt'),
  };
}
