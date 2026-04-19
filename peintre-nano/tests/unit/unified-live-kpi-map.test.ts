import { describe, expect, it } from 'vitest';
import { mapUnifiedLiveResponseToView } from '../../src/domains/bandeau-live/unified-live-kpi-map';

describe('mapUnifiedLiveResponseToView', () => {
  it('normalise snake_case GET /v1/stats/live', () => {
    const v = mapUnifiedLiveResponseToView({
      tickets_count: 3,
      last_ticket_amount: 12.5,
      ca: 100,
      donations: 2,
      weight_out: 4.2,
      weight_in: 1,
      period_end: '2026-04-07T12:00:00.000Z',
    });
    expect(v.ticketsCount).toBe(3);
    expect(v.lastTicketAmount).toBe(12.5);
    expect(v.ca).toBe(100);
    expect(v.donations).toBe(2);
    expect(v.weightOut).toBe(4.2);
    expect(v.weightIn).toBe(1);
    expect(v.timestampIso).toBe('2026-04-07T12:00:00.000Z');
  });

  it('accepte weight_out_sales en repli', () => {
    const v = mapUnifiedLiveResponseToView({
      weight_out_sales: 9,
      period_end: '2026-01-01T00:00:00.000Z',
    });
    expect(v.weightOut).toBe(9);
  });
});
