import { describe, expect, it } from 'vitest';
import '../../src/registry';
import type { RegisteredWidgetProps } from '../../src/registry/widget-registry';
import {
  getRegisteredWidgetTypes,
  registerWidget,
  resolveWidget,
} from '../../src/registry/widget-registry';

function Dummy(_p: RegisteredWidgetProps) {
  return null;
}

describe('widget-registry', () => {
  it('expose une liste de types enregistrés (catalogue démo)', () => {
    const types = getRegisteredWidgetTypes();
    expect(types).toContain('demo.text.block');
    expect(types).toContain('demo.card');
    expect(types).toContain('demo.kpi');
    expect(types).toContain('demo.list.simple');
  });

  it('résout un type démo en composant', () => {
    const r = resolveWidget('demo.kpi');
    expect(r.ok).toBe(true);
  });

  it('renvoie une erreur structurée pour un type inconnu', () => {
    const r = resolveWidget('totally.unknown.widget');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('UNKNOWN_WIDGET_TYPE');
      expect(r.error.widgetType).toBe('totally.unknown.widget');
    }
  });

  it('rejette un enregistrement avec type vide (sans polluer le registre)', () => {
    expect(() => registerWidget('', Dummy)).toThrow();
  });
});
