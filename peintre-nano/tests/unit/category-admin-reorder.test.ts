import { describe, expect, it } from 'vitest';
import type { CategoryAdminListRowDto } from '../../src/api/admin-categories-client';
import {
  arrayMove,
  computeOrdersAfterDragWithinSiblings,
  getSiblingDragPlacementHint,
  swapCaisseOrderWithNeighbor,
  swapReceptionOrderWithNeighbor,
} from '../../src/domains/admin-config/categories/category-admin-reorder';

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
  updated_at: '2026-01-01T00:00:00.000Z',
  deleted_at: null,
  ...over,
});

describe('category-admin-reorder', () => {
  it('arrayMove déplace un élément', () => {
    expect(arrayMove(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('getSiblingDragPlacementHint indique avant / après selon la direction du glissement', () => {
    const a = row({ id: 'a', name: 'A', parent_id: null, display_order: 10, display_order_entry: 0 });
    const b = row({ id: 'b', name: 'B', parent_id: null, display_order: 20, display_order_entry: 0 });
    const c = row({ id: 'c', name: 'C', parent_id: null, display_order: 30, display_order_entry: 0 });
    expect(getSiblingDragPlacementHint([a, b, c], 'sale', 'c', 'a')).toEqual({
      placement: 'before',
      targetName: 'A',
    });
    expect(getSiblingDragPlacementHint([a, b, c], 'sale', 'a', 'c')).toEqual({
      placement: 'after',
      targetName: 'C',
    });
  });

  it('computeOrdersAfterDragWithinSiblings recalcule les ordres caisse', () => {
    const a = row({ id: 'a', name: 'A', parent_id: null, display_order: 10, display_order_entry: 0 });
    const b = row({ id: 'b', name: 'B', parent_id: null, display_order: 20, display_order_entry: 0 });
    const c = row({ id: 'c', name: 'C', parent_id: null, display_order: 30, display_order_entry: 0 });
    const patches = computeOrdersAfterDragWithinSiblings([a, b, c], 'sale', 'c', 'a');
    expect(patches).not.toBeNull();
    expect(patches!.map((p) => p.categoryId)).toEqual(['c', 'a', 'b']);
    expect(patches!.map((p) => p.display_order)).toEqual([0, 10, 20]);
  });

  it('computeOrdersAfterDragWithinSiblings recalcule les ordres réception (display_order_entry)', () => {
    const a = row({ id: 'a', name: 'A', parent_id: null, display_order: 0, display_order_entry: 10 });
    const b = row({ id: 'b', name: 'B', parent_id: null, display_order: 0, display_order_entry: 20 });
    const c = row({ id: 'c', name: 'C', parent_id: null, display_order: 0, display_order_entry: 30 });
    const patches = computeOrdersAfterDragWithinSiblings([a, b, c], 'entry', 'c', 'a');
    expect(patches).not.toBeNull();
    expect(patches!.map((p) => p.categoryId)).toEqual(['c', 'a', 'b']);
    expect(patches!.map((p) => p.display_order_entry)).toEqual([0, 10, 20]);
    expect(patches!.every((p) => p.display_order === undefined)).toBe(true);
  });

  it('swapCaisseOrderWithNeighbor reste cohérent pour deux sœurs', () => {
    const a = row({ id: 'a', parent_id: null, display_order: 1, display_order_entry: 0 });
    const b = row({ id: 'b', parent_id: null, display_order: 2, display_order_entry: 0 });
    const ops = swapCaisseOrderWithNeighbor([a, b], 'b', 'up');
    expect(ops).not.toBeNull();
    expect(ops!.map((o) => o.body.display_order)).toEqual([1, 2]);
  });

  it('swapReceptionOrderWithNeighbor échange display_order_entry entre deux sœurs', () => {
    const a = row({ id: 'a', parent_id: null, display_order: 0, display_order_entry: 5 });
    const b = row({ id: 'b', parent_id: null, display_order: 0, display_order_entry: 15 });
    const ops = swapReceptionOrderWithNeighbor([a, b], 'b', 'up');
    expect(ops).not.toBeNull();
    expect(ops!.map((o) => o.body.display_order_entry)).toEqual([5, 15]);
  });
});
