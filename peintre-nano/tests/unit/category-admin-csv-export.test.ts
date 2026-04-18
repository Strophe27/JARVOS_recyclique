import { describe, expect, it } from 'vitest';
import type { CategoryAdminListRowDto } from '../../src/api/admin-categories-client';
import {
  buildCategoriesCsvLines,
  csvEscapeCell,
} from '../../src/domains/admin-config/categories/category-admin-csv-export';

const row = (over: Partial<CategoryAdminListRowDto>): CategoryAdminListRowDto => ({
  id: 'id',
  name: 'N',
  official_name: null,
  is_active: true,
  parent_id: null,
  price: null,
  max_price: null,
  display_order: 0,
  display_order_entry: 0,
  is_visible: true,
  shortcut_key: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  deleted_at: null,
  ...over,
});

describe('category-admin-csv-export', () => {
  it('csvEscapeCell échappe les guillemets', () => {
    expect(csvEscapeCell('a"b')).toBe('"a""b"');
  });

  it('buildCategoriesCsvLines inclut le chemin et les identifiants', () => {
    const p = row({ id: 'p', name: 'Écrans', parent_id: null });
    const c = row({ id: 'c', name: 'Portable', parent_id: 'p', price: 1.5 });
    const lines = buildCategoriesCsvLines([{ row: c }], [p, c]);
    expect(lines[0]).toContain('chemin');
    expect(lines[1]).toContain('Écrans › Portable');
    expect(lines[1]).toContain('c');
  });
});
