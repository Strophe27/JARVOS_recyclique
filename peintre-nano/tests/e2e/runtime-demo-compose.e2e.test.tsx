// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { RootProviders } from '../../src/app/providers/RootProviders';
import * as runtimeReporting from '../../src/runtime/report-runtime-fallback';
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
  vi.restoreAllMocks();
  cleanup();
});

describe('E2E — page démo runtime composé (story 3.7)', () => {
  it('chemin nominal : bac à sable visible + widget résolu depuis le PageManifest', () => {
    render(
      <RootProviders>
        <App />
      </RootProviders>,
    );

    const root = screen.getByTestId('runtime-demo-root');
    expect(within(root).getByText(/Démonstration runtime/i)).toBeTruthy();
    expect(within(root).getByTestId('manifest-bundle-ok')).toBeTruthy();
    expect(within(root).getByTestId('widget-demo-kpi')).toBeTruthy();
  });

  it('chemin fallback : widget déclaré dans le lot mais non enregistré → zone dégradée + reporter', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    render(
      <RootProviders>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    const unknownNav = within(nav).getByTestId('nav-entry-demo-fallback-unknown-widget');
    fireEvent.click(within(unknownNav).getByRole('button'));

    const root = screen.getByTestId('runtime-demo-root');
    const err = within(root).getByTestId('widget-resolve-error');
    expect(err.getAttribute('data-widget-type')).toBe('demo.runtime.stub-only');
    expect(err.getAttribute('data-runtime-severity')).toBe('degraded');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'degraded',
        code: 'UNKNOWN_WIDGET_TYPE',
        state: 'widget_resolve_failed',
      }),
    );
  });

  it('chemin fallback : page autorisée en nav mais refusée par garde manifeste → PageAccessBlocked + reporter', () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    render(
      <RootProviders>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    const guardedNav = within(nav).getByTestId('nav-entry-demo-guarded-nav');
    fireEvent.click(within(guardedNav).getByRole('button'));

    const root = screen.getByTestId('runtime-demo-root');
    const blocked = within(root).getByTestId('page-access-blocked');
    expect(blocked.getAttribute('data-block-code')).toBe('MISSING_PERMISSIONS');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'blocked',
        code: 'MISSING_PERMISSIONS',
        state: 'page_access_denied',
      }),
    );
  });
});
