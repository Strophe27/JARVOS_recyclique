import { describe, expect, it } from 'vitest';
import { buildBusinessTagPayload } from '../../src/domains/cashflow/cashflow-business-tag-payload';

describe('buildBusinessTagPayload (Story 24.9)', () => {
  it('returns empty when kind blank', () => {
    expect(buildBusinessTagPayload('', '')).toEqual({});
  });

  it('maps AUTRE with custom', () => {
    expect(buildBusinessTagPayload('AUTRE', 'Campagne solidaire X')).toEqual({
      business_tag_kind: 'AUTRE',
      business_tag_custom: 'Campagne solidaire X',
    });
  });

  it('maps GRATIFERIA without custom', () => {
    expect(buildBusinessTagPayload('GRATIFERIA', '')).toEqual({
      business_tag_kind: 'GRATIFERIA',
    });
  });

  it('maps CAMPAGNE_SOCIALE without custom', () => {
    expect(buildBusinessTagPayload('CAMPAGNE_SOCIALE', '')).toEqual({
      business_tag_kind: 'CAMPAGNE_SOCIALE',
    });
  });
});
