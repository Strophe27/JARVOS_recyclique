import { describe, expect, it } from 'vitest';
import { formatCategoryHierarchyLabel } from '../../src/domains/cashflow/category-hierarchy-display';

describe('formatCategoryHierarchyLabel', () => {
  it('remonte la chaîne parent › enfant à partir de l’id feuille', () => {
    const list = [
      { id: 'root-1', name: 'EEE', parent_id: null },
      { id: 'child-1', name: 'Petit électro', parent_id: 'root-1' },
    ];
    expect(formatCategoryHierarchyLabel('child-1', list)).toBe('EEE › Petit électro');
  });

  it('accepte un code legacy égal au nom si l’id est absent', () => {
    const list = [{ id: 'x', name: 'EEE-1', parent_id: null }];
    expect(formatCategoryHierarchyLabel('EEE-1', list)).toBe('EEE-1');
  });

  it('retourne vide si inconnu', () => {
    expect(formatCategoryHierarchyLabel('unknown-uuid', [])).toBe('');
  });
});
