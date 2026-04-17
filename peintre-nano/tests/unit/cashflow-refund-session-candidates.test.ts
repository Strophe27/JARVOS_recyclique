import { describe, expect, it } from 'vitest';
import {
  filterRefundSaleCandidates,
  parseRefundSaleCandidatesFromSessionDetail,
} from '../../src/domains/cashflow/cashflow-refund-session-candidates';

describe('cashflow-refund-session-candidates', () => {
  it('parseRefundSaleCandidatesFromSessionDetail : ignore lignes sans id', () => {
    const rows = parseRefundSaleCandidatesFromSessionDetail([
      { id: 'a1111111-1111-4111-8111-111111111111', total_amount: 10, lifecycle_status: 'completed' },
      { total_amount: 5 },
      {},
    ] as Record<string, unknown>[]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe('a1111111-1111-4111-8111-111111111111');
    expect(rows[0]!.total_amount).toBe(10);
  });

  it('filterRefundSaleCandidates : préfixe UUID sans tirets', () => {
    const base = parseRefundSaleCandidatesFromSessionDetail([
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-222222222222',
        total_amount: 3,
        lifecycle_status: 'completed',
        note: 'foo',
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-333333333333',
        total_amount: 4,
        lifecycle_status: 'held',
      },
    ] as Record<string, unknown>[]);
    const f = filterRefundSaleCandidates(base, 'bbbbbbbb');
    expect(f.map((r) => r.id)).toEqual(['bbbbbbbb-bbbb-4bbb-8bbb-222222222222']);
  });

  it('filterRefundSaleCandidates : note et référence adhérent', () => {
    const base = parseRefundSaleCandidatesFromSessionDetail([
      {
        id: 'dddddddd-dddd-4ddd-8ddd-444444444444',
        total_amount: 1,
        lifecycle_status: 'completed',
        note: 'Ticket spécial XYZ',
        adherent_reference: 'ADH-42',
      },
    ] as Record<string, unknown>[]);
    expect(filterRefundSaleCandidates(base, 'xyz')).toHaveLength(1);
    expect(filterRefundSaleCandidates(base, 'adh-42')).toHaveLength(1);
  });
});
