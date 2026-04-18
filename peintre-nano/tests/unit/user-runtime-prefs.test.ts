import { describe, expect, it } from 'vitest';
import { isUiDensity } from '../../src/types/user-runtime-prefs';

describe('user-runtime-prefs', () => {
  it('isUiDensity restreint aux densités supportées', () => {
    expect(isUiDensity('comfortable')).toBe(true);
    expect(isUiDensity('compact')).toBe(true);
    expect(isUiDensity('unknown')).toBe(false);
  });

  it('isUiDensity rejette chaîne vide et valeurs proches mais invalides', () => {
    expect(isUiDensity('')).toBe(false);
    expect(isUiDensity('Comfortable')).toBe(false);
  });
});
