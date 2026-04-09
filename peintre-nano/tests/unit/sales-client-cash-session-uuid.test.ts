import { describe, expect, it } from 'vitest';
import { isPlausibleCashSessionUuid } from '../../src/api/sales-client';

describe('isPlausibleCashSessionUuid', () => {
  it('accepte un UUID complet (casse mixte)', () => {
    expect(isPlausibleCashSessionUuid('00000000-0000-4000-8000-000000000001')).toBe(true);
    expect(isPlausibleCashSessionUuid('  AAAAAAAA-BBBB-4CCC-8DDD-111111111111  ')).toBe(true);
  });

  it('refuse fragment, préfixe ou suffixe hors format', () => {
    expect(isPlausibleCashSessionUuid('')).toBe(false);
    expect(isPlausibleCashSessionUuid('00000000')).toBe(false);
    expect(isPlausibleCashSessionUuid('00000000-0000-4000-8000-00000000000')).toBe(false);
    expect(isPlausibleCashSessionUuid('not-a-uuid-at-all-here')).toBe(false);
    expect(isPlausibleCashSessionUuid('00000000-0000-4000-8000-000000000001-extra')).toBe(false);
  });
});
