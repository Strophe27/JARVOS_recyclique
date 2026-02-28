import { describe, expect, it } from 'vitest';
import { getHierarchyIndentPx, visualTokens } from './tokens';

describe('visualTokens', () => {
  it('expose une echelle de spacing centralisee', () => {
    expect(visualTokens.spacing.xs).toBe(8);
    expect(visualTokens.spacing.md).toBe(16);
    expect(visualTokens.spacing.xl).toBe(32);
  });

  it('centralise les valeurs de typo et palette de marque', () => {
    expect(visualTokens.typography.fontSizeMd).toBe(15);
    expect(visualTokens.colors.brandScale).toHaveLength(10);
  });

  it('calcule l indentation de hierarchie avec tokens partages', () => {
    expect(getHierarchyIndentPx(0)).toBe(8);
    expect(getHierarchyIndentPx(1)).toBe(24);
    expect(getHierarchyIndentPx(3)).toBe(56);
  });

  it('ignore les profondeurs negatives', () => {
    expect(getHierarchyIndentPx(-2)).toBe(8);
  });
});
