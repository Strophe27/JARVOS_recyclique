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
  it('expose une liste de types enregistrés (démo + bandeau live + caisse 6.1)', () => {
    const types = getRegisteredWidgetTypes();
    expect(types).toContain('demo.text.block');
    expect(types).toContain('demo.card');
    expect(types).toContain('demo.kpi');
    expect(types).toContain('demo.list.simple');
    expect(types).toContain('demo.legacy.app.topstrip');
    expect(types).toContain('demo.legacy.dashboard.workspace');
    expect(types).toContain('bandeau-live');
    expect(types).toContain('caisse-brownfield-dashboard');
    expect(types).toContain('caisse-current-ticket');
    expect(types).toContain('cashflow-nominal-wizard');
    expect(types).toContain('cashflow-refund-wizard');
    expect(types).toContain('cashflow-special-ops-hub');
    expect(types).toContain('cashflow-close-wizard');
    expect(types).toContain('cashflow-sale-correction-wizard');
    expect(types).toContain('admin-cash-session-detail');
    expect(types).toContain('admin.reception.tickets.list');
    expect(types).toContain('admin-reception-ticket-detail');
    expect(types).toContain('cashflow-special-don-wizard');
    expect(types).toContain('cashflow-special-adhesion-wizard');
    expect(types).toContain('cashflow-social-don-wizard');
    expect(types).toContain('reception-nominal-wizard');
    expect(types).toContain('reception-history-panel');
    expect(types).toContain('auth.live.public-login');
    expect(types).toContain('admin.legacy.dashboard.home');
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
