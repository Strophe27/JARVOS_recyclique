import { describe, expect, it } from 'vitest';
import { liveSnapshotFromJsonBody } from '../../src/domains/bandeau-live/live-snapshot-normalize';

describe('liveSnapshotFromJsonBody — sync_operational_summary F4 complet', () => {
  it('propage deferred_remote_retry, partial_success et sync_aggregate_unavailable', () => {
    const snap = liveSnapshotFromJsonBody({
      observed_at: '2026-04-18T12:00:00Z',
      effective_open_state: 'open',
      cash_session_effectiveness: 'not_applicable',
      sync_aggregate_unavailable: true,
      sync_operational_summary: {
        worst_state: 'a_reessayer',
        source_reachable: true,
        deferred_remote_retry: true,
        partial_success: true,
      },
    });
    expect(snap).not.toBeNull();
    expect(snap?.sync_aggregate_unavailable).toBe(true);
    expect(snap?.sync_operational_summary).toMatchObject({
      worst_state: 'a_reessayer',
      source_reachable: true,
      deferred_remote_retry: true,
      partial_success: true,
    });
  });
});
