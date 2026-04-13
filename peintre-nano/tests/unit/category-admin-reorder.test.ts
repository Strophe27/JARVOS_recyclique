import { describe, expect, it } from 'vitest';
import type { CategoryAdminListRowDto } from '../../src/api/admin-categories-client';
import {
  siblingsForCaisseOrder,
  siblingsForReceptionOrder,
  swapCaisseOrderWithNeighbor,
  swapReceptionOrderWithNeighbor,
} from '../../src/domains/admin-config/categories/category-admin-reorder';

const base = (over: Partial<CategoryAdminListRowDto>): CategoryAdminListRowDto => ({
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'A',
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

describe('category-admin-reorder', () => {
  it('ordonne les sœurs par display_order pour la caisse', () => {
    const a = base({ id: 'a', name: 'x', display_order: 10, display_order_entry: 0 });
    const b = base({ id: 'b', name: 'y', display_order: 5, display_order_entry: 0 });
    const s = siblingsForCaisseOrder([a, b], 'a');
    expect(s.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('swap caisse up retourne deux PUT inversés', () => {
    const a = base({ id: 'a', display_order: 10, display_order_entry: 1 });
    const b = base({ id: 'b', display_order: 20, display_order_entry: 2 });
    const ops = swapCaisseOrderWithNeighbor([a, b], 'b', 'up');
    expect(ops).not.toBeNull();
    expect(ops).toHaveLength(2);
    expect(ops![0]).toEqual({ categoryId: 'b', body: { display_order: 10 } });
    expect(ops![1]).toEqual({ categoryId: 'a', body: { display_order: 20 } });
  });

  it('swap réception : ordre sur display_order_entry', () => {
    const a = base({ id: 'a', display_order: 0, display_order_entry: 5 });
    const b = base({ id: 'b', display_order: 0, display_order_entry: 10 });
    const s = siblingsForReceptionOrder([a, b], 'b');
    expect(s.map((r) => r.id)).toEqual(['a', 'b']);
    const ops = swapReceptionOrderWithNeighbor([a, b], 'b', 'up');
    expect(ops).not.toBeNull();
    expect(ops![0]).toEqual({ categoryId: 'b', body: { display_order_entry: 5 } });
    expect(ops![1]).toEqual({ categoryId: 'a', body: { display_order_entry: 10 } });
  });

  it('pas de swap en bord de liste', () => {
    const a = base({ id: 'a', display_order: 1 });
    const b = base({ id: 'b', display_order: 2 });
    expect(swapCaisseOrderWithNeighbor([a, b], 'a', 'up')).toBeNull();
    expect(swapCaisseOrderWithNeighbor([a, b], 'b', 'down')).toBeNull();
  });
});
