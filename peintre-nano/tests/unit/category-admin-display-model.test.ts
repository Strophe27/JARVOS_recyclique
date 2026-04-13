import { describe, expect, it } from 'vitest';
import type { CategoryAdminListRowDto } from '../../src/api/admin-categories-client';
import {
  buildParentSelectDataForCreate,
  buildReparentParentSelectData,
  categoryBreadcrumbLabel,
  filterCatsForSearch,
  getDescendantIds,
  getForbiddenReparentTargets,
  orderedRowsWithDepth,
  parentIdFromReparentSelectValue,
  reparentSelectValueFromParentId,
} from '../../src/domains/admin-config/categories/category-admin-display-model';

const baseRow = (over: Partial<CategoryAdminListRowDto>): CategoryAdminListRowDto => ({
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
  updated_at: '2026-01-01T00:00:00.000Z',
  deleted_at: null,
  ...over,
});

describe('category-admin-display-model', () => {
  it('buildParentSelectDataForCreate liste toutes les fiches comme parents possibles', () => {
    const a = baseRow({ id: 'a', name: 'Racine', parent_id: null });
    const b = baseRow({ id: 'b', name: 'Enfant', parent_id: 'a' });
    const data = buildParentSelectDataForCreate([a, b]);
    expect(data.some((d) => d.value === 'a')).toBe(true);
    expect(data.some((d) => d.value === 'b')).toBe(true);
  });

  it('categoryBreadcrumbLabel construit le chemin hiérarchique', () => {
    const a = baseRow({ id: 'a', name: 'Racine', parent_id: null });
    const b = baseRow({ id: 'b', name: 'Enfant', parent_id: 'a' });
    expect(categoryBreadcrumbLabel([a, b], 'b')).toBe('Racine › Enfant');
  });

  it('filterCatsForSearch conserve les ancêtres des correspondances', () => {
    const a = baseRow({ id: 'a', name: 'Racine', parent_id: null });
    const b = baseRow({ id: 'b', name: 'Enfant', parent_id: 'a' });
    const out = filterCatsForSearch([a, b], 'enf');
    expect(out.map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  it('orderedRowsWithDepth respecte la source entry pour le tri par défaut', () => {
    const p = baseRow({
      id: 'p',
      name: 'P',
      display_order: 2,
      display_order_entry: 5,
      parent_id: null,
    });
    const c = baseRow({
      id: 'c',
      name: 'C',
      display_order: 1,
      display_order_entry: 1,
      parent_id: 'p',
    });
    const ordered = orderedRowsWithDepth([p, c], 'order', 'entry');
    expect(ordered.map((x) => x.row.id)).toEqual(['p', 'c']);
  });

  it('getDescendantIds couvre toute la profondeur', () => {
    const rows = [
      baseRow({ id: 'r', parent_id: null }),
      baseRow({ id: 'c1', parent_id: 'r' }),
      baseRow({ id: 'c2', parent_id: 'c1' }),
    ];
    expect([...getDescendantIds(rows, 'r')].sort()).toEqual(['c1', 'c2']);
    expect([...getDescendantIds(rows, 'c1')]).toEqual(['c2']);
  });

  it('getForbiddenReparentTargets inclut la racine déplacée et ses descendants', () => {
    const rows = [
      baseRow({ id: 'r', parent_id: null }),
      baseRow({ id: 'c1', parent_id: 'r' }),
    ];
    const f = getForbiddenReparentTargets(rows, 'r');
    expect(f.has('r')).toBe(true);
    expect(f.has('c1')).toBe(true);
  });

  it('buildReparentParentSelectData exclut sous-arbre et trie par chemin', () => {
    const z = baseRow({ id: 'z', name: 'Zoo', parent_id: null });
    const a = baseRow({ id: 'a', name: 'Alpha', parent_id: null });
    const b = baseRow({ id: 'b', name: 'Beta', parent_id: 'a' });
    const data = buildReparentParentSelectData([z, a, b], 'a');
    const values = data.map((d) => d.value);
    expect(values).not.toContain('a');
    expect(values).not.toContain('b');
    expect(values).toContain('z');
    expect(values[0]).toBe('');
    expect(data.some((d) => d.label.includes('Zoo'))).toBe(true);
  });

  it('reparentSelectValueFromParentId et parentIdFromReparentSelectValue sont réversibles', () => {
    expect(reparentSelectValueFromParentId(null)).toBe('');
    expect(parentIdFromReparentSelectValue('')).toBe(null);
    expect(parentIdFromReparentSelectValue('uuid')).toBe('uuid');
  });
});
