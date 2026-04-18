import { describe, expect, it } from 'vitest';
import { dashboardDistributionFromDailyAggregate } from '../../src/domains/dashboard/dashboard-distribution-from-aggregate';

describe('dashboardDistributionFromDailyAggregate', () => {
  it('retourne null si agrégat absent', () => {
    expect(dashboardDistributionFromDailyAggregate(undefined)).toBeNull();
    expect(dashboardDistributionFromDailyAggregate(null)).toBeNull();
  });

  it('produit barres monétaires, volumes et poids à partir des clés contrat', () => {
    const dist = dashboardDistributionFromDailyAggregate({
      ca: 100,
      donations: 2.5,
      tickets_count: 3,
      items_received: 7,
      tickets_open: 1,
      tickets_closed_24h: 4,
      weight_in: 12.2,
      weight_out: 5,
    });
    expect(dist).not.toBeNull();
    expect(dist!.moneyBars).toHaveLength(2);
    expect(dist!.moneyBars[0].label).toBe("Chiffre d'affaires");
    expect(dist!.countBars).toHaveLength(4);
    expect(dist!.weightBars).toHaveLength(2);
    expect(dist!.weightBars[0].displayValue).toMatch(/kg/);
  });
});
