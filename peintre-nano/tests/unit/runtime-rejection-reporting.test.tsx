// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildPageManifestRegions } from '../../src/app/PageRenderer';
import { PageAccessBlocked } from '../../src/app/PageAccessBlocked';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { RootShell } from '../../src/app/layouts/RootShell';
import '../../src/registry';
import validPageHomeFixture from '../../src/fixtures/manifests/valid/page-home.json';
import { loadManifestBundle } from '../../src/runtime/load-manifest-bundle';
import * as runtimeReporting from '../../src/runtime/report-runtime-fallback';
import type { PageManifest } from '../../src/types/page-manifest';
import '../../src/styles/tokens.css';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const validPage = JSON.stringify(validPageHomeFixture);

describe('reportRuntimeFallback — story 3.6', () => {
  it('loadManifestBundle invalide appelle le reporter (sévérité blocked)', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});
    const nav = {
      version: '1',
      entries: [
        { id: 'a', route_key: 'dup', page_key: 'demo-home' },
        { id: 'b', route_key: 'dup', page_key: 'demo-home' },
      ],
    };
    const r = loadManifestBundle({
      navigationJson: JSON.stringify(nav),
      pageManifestsJson: [validPage],
    });
    expect(r.ok).toBe(false);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.some((c) => c[0]?.severity === 'blocked' && c[0]?.code === 'ROUTE_KEY_COLLISION')).toBe(
      true,
    );
  });

  it('widget inconnu au rendu : signal UI degraded + reporter (sévérité degraded)', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});
    const page: PageManifest = {
      version: '1',
      pageKey: 't',
      slots: [{ slotId: 'main', widgetType: 'not.registered.type' }],
    };
    const regions = buildPageManifestRegions(page);
    render(
      <RootProviders>
        <RootShell regions={{ main: regions.mainWidgets }} />
      </RootProviders>,
    );
    const err = screen.getByTestId('widget-resolve-error');
    expect(err.getAttribute('data-runtime-severity')).toBe('degraded');
    expect(err.getAttribute('data-runtime-code')).toBe('UNKNOWN_WIDGET_TYPE');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'degraded',
        code: 'UNKNOWN_WIDGET_TYPE',
        state: 'widget_resolve_failed',
      }),
    );
  });

  it('PageAccessBlocked : attributs runtime + reporter blocked', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});
    render(
      <RootProviders>
        <PageAccessBlocked
          result={{ allowed: false, code: 'MISSING_PERMISSIONS', message: 'Permissions insuffisantes.' }}
        />
      </RootProviders>,
    );
    const el = screen.getByTestId('page-access-blocked');
    expect(el.getAttribute('data-runtime-severity')).toBe('blocked');
    expect(el.getAttribute('data-runtime-code')).toBe('MISSING_PERMISSIONS');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'blocked',
        code: 'MISSING_PERMISSIONS',
        state: 'page_access_denied',
      }),
    );
  });
});
