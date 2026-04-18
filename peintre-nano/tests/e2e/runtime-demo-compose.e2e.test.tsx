// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/registry';
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
  window.history.pushState({}, '', '/');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  cleanup();
});

describe('E2E — page démo runtime composé (story 3.7)', () => {
  it('story 4.6b : /bandeau-live-sandbox affiche le bandeau live (pas la démo KPI 42)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          effective_open_state: 'open',
          cash_session_effectiveness: 'open_effective',
          observed_at: '2026-04-07T12:00:00.000Z',
          sync_operational_summary: { worst_state: 'resolu', source_reachable: true },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/bandeau-live-sandbox');

    render(
      <RootProviders>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('widget-bandeau-live')).toBeTruthy();
    });
    expect(screen.queryByTestId('widget-demo-kpi')).toBeNull();
    expect(fetchMock).toHaveBeenCalled();
  });

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

});
