import { describe, expect, it } from 'vitest';
import { liveSnapshotFromJsonBody } from '../../src/domains/bandeau-live/live-snapshot-normalize';

describe('liveSnapshotFromJsonBody — daily_kpis_aggregate', () => {
  it('propage daily_kpis_aggregate depuis le JSON serveur', () => {
    const snap = liveSnapshotFromJsonBody({
      bandeau_live_slice_enabled: true,
      observed_at: '2026-04-10T12:00:00Z',
      effective_open_state: 'open',
      cash_session_effectiveness: 'not_applicable',
      daily_kpis_aggregate: {
        tickets_count: 5,
        ca: 12.34,
        items_received: 20,
        donations: 0,
      },
    });
    expect(snap).not.toBeNull();
    expect(snap?.daily_kpis_aggregate).toMatchObject({
      tickets_count: 5,
      ca: 12.34,
      items_received: 20,
      donations: 0,
    });
  });
});
