import { describe, expect, it } from 'vitest';
import {
  labelSyncOperationalState,
  parseRecycliqueApiErrorBody,
  recycliqueClientFailureFromSalesHttp,
  SYNC_STATE_CORE_LABELS,
} from '../../src/api/recyclique-api-error';

describe('recyclique-api-error (Story 6.9)', () => {
  it('parse AR21 complet', () => {
    const p = parseRecycliqueApiErrorBody(
      {
        code: 'STEP_UP_PIN_REQUIRED',
        detail: 'PIN requis',
        retryable: false,
        state: 'en_quarantaine',
        correlation_id: 'abc-123',
      },
      403,
      'fallback',
    );
    expect(p.detail).toBe('PIN requis');
    expect(p.code).toBe('STEP_UP_PIN_REQUIRED');
    expect(p.retryable).toBe(false);
    expect(p.state).toBe('en_quarantaine');
    expect(p.correlation_id).toBe('abc-123');
  });

  it('parse legacy detail string seul', () => {
    const p = parseRecycliqueApiErrorBody({ detail: 'Not found' }, 404, 'fallback');
    expect(p.detail).toBe('Not found');
    expect(p.retryable).toBe(false);
  });

  it('429 → retryable par défaut si absent', () => {
    const p = parseRecycliqueApiErrorBody({ detail: 'Slow down' }, 429, 'x');
    expect(p.retryable).toBe(true);
  });

  it('recycliqueClientFailureFromSalesHttp garde les champs', () => {
    const f = recycliqueClientFailureFromSalesHttp({
      status: 503,
      detail: 'Unavailable',
      retryable: true,
      correlation_id: 'r1',
    });
    expect(f.httpStatus).toBe(503);
    expect(f.message).toBe('Unavailable');
    expect(f.retryable).toBe(true);
    expect(f.correlationId).toBe('r1');
  });

  it('FR24 libellés connus', () => {
    expect(labelSyncOperationalState('a_reessayer')).toBe(SYNC_STATE_CORE_LABELS.a_reessayer);
    expect(labelSyncOperationalState('inconnu')).toBe('inconnu');
  });
});
