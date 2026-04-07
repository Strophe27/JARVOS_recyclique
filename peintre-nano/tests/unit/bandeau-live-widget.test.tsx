// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { components } from '../../../contracts/openapi/generated/recyclique-api';
import * as runtimeReporting from '../../src/runtime/report-runtime-fallback';
import '../../src/registry';
import { resolveWidget } from '../../src/registry/widget-registry';

type Snapshot = components['schemas']['ExploitationLiveSnapshot'];

const fixture: Snapshot = {
  effective_open_state: 'open',
  cash_session_effectiveness: 'open_effective',
  observed_at: '2026-04-07T10:00:00.000Z',
  sync_operational_summary: {
    worst_state: 'resolu',
    source_reachable: true,
  },
};

afterEach(() => {
  cleanup();
});

describe('widget bandeau-live (Story 4.2)', () => {
  it('résout bandeau-live après import du registre', () => {
    const r = resolveWidget('bandeau-live');
    expect(r.ok).toBe(true);
  });

  it('affiche les signaux représentatifs du snapshot injecté via widget_props', () => {
    const r = resolveWidget('bandeau-live');
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    const C = r.Component;
    render(<C widgetProps={{ snapshot: fixture }} />);

    const root = screen.getByTestId('widget-bandeau-live');
    expect(root.getAttribute('data-bandeau-state')).toBe('live');
    expect(root.getAttribute('data-runtime-severity')).toBe('info');
    expect(root.getAttribute('data-runtime-code')).toBe('BANDEAU_LIVE_NOMINAL');
    expect(root.querySelector('[data-effective-open-state="open"]')).toBeTruthy();
    expect(root.querySelector('[data-field="effective_open_state"]')?.textContent).toMatch(/Ouvert/i);
    expect(root.querySelector('[data-field="cash_session_effectiveness"]')?.textContent).toContain('open_effective');
    expect(root.querySelector('[data-sync-worst="resolu"]')).toBeTruthy();
  });

  it('affiche module_disabled quand le snapshot statique porte bandeau_live_slice_enabled false (Story 4.5)', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});
    try {
      const r = resolveWidget('bandeau-live');
      expect(r.ok).toBe(true);
      if (!r.ok) {
        return;
      }
      const C = r.Component;
      render(
        <C
          widgetProps={{
            snapshot: { ...fixture, bandeau_live_slice_enabled: false },
          }}
        />,
      );
      const root = screen.getByTestId('widget-bandeau-live');
      expect(root.getAttribute('data-bandeau-state')).toBe('module_disabled');
      expect(root.getAttribute('data-runtime-code')).toBe('BANDEAU_LIVE_MODULE_DISABLED');
      expect(root.getAttribute('data-runtime-severity')).toBe('info');
      expect(screen.getByText(/désactivé pour ce site/i)).toBeTruthy();
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'BANDEAU_LIVE_MODULE_DISABLED',
          severity: 'info',
          state: 'bandeau_live_module_disabled',
        }),
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('affiche un état dégradé explicite sans snapshot valide', () => {
    const r = resolveWidget('bandeau-live');
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    const C = r.Component;
    render(<C widgetProps={{}} />);
    const u = screen.getByTestId('widget-bandeau-live');
    expect(u.getAttribute('data-bandeau-state')).toBe('unavailable');
    expect(u.getAttribute('data-runtime-severity')).toBe('degraded');
    expect(u.getAttribute('data-runtime-code')).toBe('BANDEAU_LIVE_UNAVAILABLE_STATIC');
    expect(screen.getByText('Données live non disponibles')).toBeTruthy();
  });
});
