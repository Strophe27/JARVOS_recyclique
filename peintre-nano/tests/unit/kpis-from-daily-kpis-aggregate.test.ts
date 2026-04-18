import { describe, expect, it } from 'vitest';
import { kpisFromDailyKpisAggregate } from '../../src/domains/dashboard/kpis-from-daily-kpis-aggregate';

describe('kpisFromDailyKpisAggregate', () => {
  it('mappe les clés UnifiedLiveStats / daily_kpis_aggregate sans agrégation', () => {
    const rows = kpisFromDailyKpisAggregate({
      tickets_count: 12,
      ca: 345.67,
      items_received: 89,
      donations: 10.5,
    });
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({ label: 'Tickets caisse (jour)', value: 12 });
    expect(rows[1].label).toBe("Chiffre d'affaires (jour)");
    expect(rows[1].value).toMatch(/345/);
    expect(rows[2]).toEqual({ label: 'Articles réception (jour)', value: 89 });
    expect(rows[3].label).toBe('Dons caisse (jour)');
    expect(rows[3].value).toMatch(/10/);
  });

  it('utilise le tiret cadratin pour les champs absents', () => {
    const rows = kpisFromDailyKpisAggregate({});
    expect(rows.every((r) => r.value === '—')).toBe(true);
  });
});
