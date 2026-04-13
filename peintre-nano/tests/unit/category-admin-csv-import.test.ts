import { describe, expect, it } from 'vitest';
import type { CategoryAdminListRowDto } from '../../src/api/admin-categories-client';
import { buildCategoriesCsvLines } from '../../src/domains/admin-config/categories/category-admin-csv-export';
import {
  CATEGORY_CSV_HEADER,
  parseCategoriesCsvForImport,
  parseQuotedCsvRows,
  planCategoryCsvImport,
} from '../../src/domains/admin-config/categories/category-admin-csv-import';

const row = (over: Partial<CategoryAdminListRowDto>): CategoryAdminListRowDto => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Racine',
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

describe('category-admin-csv-import', () => {
  it('parseQuotedCsvRows gère guillemets et virgules', () => {
    const m = parseQuotedCsvRows('"a,b","c""d"' + '\n' + '1,2');
    expect(m).toEqual([
      ['a,b', 'c"d'],
      ['1', '2'],
    ]);
  });

  it('round-trip export → parse → plan (mise à jour)', () => {
    const p = row({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'P', parent_id: null });
    const c = row({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      name: 'Enfant',
      parent_id: p.id,
      price: 2,
      is_visible: false,
    });
    const lines = buildCategoriesCsvLines([{ row: c }], [p, c]);
    const text = lines.join('\n');
    const parsed = parseCategoriesCsvForImport(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const planned = planCategoryCsvImport(parsed.records, [p, c]);
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.plan.creates.length).toBe(0);
    expect(planned.plan.updates.length).toBe(1);
    expect(planned.plan.updates[0].id).toBe(c.id);
    expect(planned.plan.updates[0].body.name).toBe('Enfant');
  });

  it('refuse en-tête inconnu', () => {
    const bad = ['wrong', 'x'].join(',');
    const parsed = parseCategoriesCsvForImport(bad);
    expect(parsed.ok).toBe(false);
  });

  it('ignore ligne archivée dans le CSV', () => {
    const p = row({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
    const header = CATEGORY_CSV_HEADER.join(',');
    const line =
      `"${p.id}","x","${p.name}","",true,"",,,0,0,true,"","","2026-01-01T00:00:00.000Z","2026-01-02T00:00:00.000Z","2026-01-03T00:00:00.000Z"`;
    const parsed = parseCategoriesCsvForImport(`${header}\n${line}`);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const planned = planCategoryCsvImport(parsed.records, [p]);
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.plan.updates.length).toBe(0);
    expect(planned.plan.skipped.length).toBe(1);
  });

  it('planifie une création sans id', () => {
    const p = row({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
    const header = CATEGORY_CSV_HEADER.join(',');
    const line = `"","","Nouveau","","true","${p.id}","","","10","20","true","","","","",""`;
    const parsed = parseCategoriesCsvForImport(`${header}\n${line}`);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const planned = planCategoryCsvImport(parsed.records, [p]);
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.plan.creates.length).toBe(1);
    expect(planned.plan.creates[0].name).toBe('Nouveau');
    expect(planned.plan.creates[0].parent_id).toBe(p.id);
  });
});
