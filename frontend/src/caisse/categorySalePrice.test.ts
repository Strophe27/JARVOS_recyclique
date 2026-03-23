/**
 * Tests unitaires prix fixe catégorie / preset — Story 19.7.
 */
import { describe, it, expect } from 'vitest';
import {
  getCategoryFixedUnitPriceCents,
  resolvePresetUnitPriceCents,
} from './categorySalePrice';

describe('getCategoryFixedUnitPriceCents', () => {
  it('retourne null si aucun prix', () => {
    expect(getCategoryFixedUnitPriceCents({})).toBeNull();
    expect(getCategoryFixedUnitPriceCents({ price: null, max_price: null })).toBeNull();
  });

  it('prix seul (euros) → centimes', () => {
    expect(getCategoryFixedUnitPriceCents({ price: 3 })).toBe(300);
    expect(getCategoryFixedUnitPriceCents({ price: 3, max_price: null })).toBe(300);
  });

  it('price et max_price égaux → prix fixe', () => {
    expect(getCategoryFixedUnitPriceCents({ price: 3, max_price: 3 })).toBe(300);
  });

  it('price et max_price différents → pas de prix fixe unique (null)', () => {
    expect(getCategoryFixedUnitPriceCents({ price: 1, max_price: 5 })).toBeNull();
  });

  it('seul max_price → centimes', () => {
    expect(getCategoryFixedUnitPriceCents({ price: null, max_price: 2.5 })).toBe(250);
  });
});

describe('resolvePresetUnitPriceCents', () => {
  const categories = [
    { id: 'c1', price: 3 as number | null, max_price: 3 as number | null },
  ];

  it('sans catégorie liée → preset_price', () => {
    expect(
      resolvePresetUnitPriceCents(
        { preset_price: 500, category_id: null },
        categories
      )
    ).toBe(500);
  });

  it('catégorie avec prix fixe → ignore preset_price erroné', () => {
    expect(
      resolvePresetUnitPriceCents(
        { preset_price: 999, category_id: 'c1' },
        categories
      )
    ).toBe(300);
  });
});
