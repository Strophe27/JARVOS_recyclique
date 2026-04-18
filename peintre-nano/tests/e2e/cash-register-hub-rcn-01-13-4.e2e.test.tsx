// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCoalescedGetCurrentOpenCashSessionForTests } from '../../src/domains/cashflow/caisse-current-session-coalesce';
import { resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
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

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function fetchResponseCashSessionsCurrentNoSession(): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: async () => 'null',
  } as Response);
}

describe('E2E — hub `/caisse` RCN-01 (Story 13.4)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
    resetCashflowDraft();
    resetCoalescedGetCurrentOpenCashSessionForTests();
  });

  it('affiche le hub caisse (titres, cartes poste + variantes) sans wizard vente ni kiosque', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      if (url.includes('/v1/cash-registers/status')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [
                {
                  id: '31d56e8f-08ec-4907-9163-2a5c49c5f2fe',
                  name: 'La Clique Caisse 1',
                  is_open: false,
                  location: 'Entrée Principale',
                  enable_virtual: true,
                  enable_deferred: true,
                },
              ],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/caisse');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });

    expect(screen.queryByTestId('flow-renderer-cashflow-nominal')).toBeNull();
    expect(screen.queryByTestId('cash-register-sale-kiosk')).toBeNull();
    expect(screen.getByTestId('shell-zone-nav')).toBeTruthy();

    expect(
      screen.getByRole('heading', { level: 2, name: /Sélection du Poste de Caisse/i }),
    ).toBeTruthy();
    expect(screen.getAllByTestId('caisse-hub-register-card').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /^Ouvrir$/i })).toBeTruthy();
    expect(screen.getByTestId('caisse-hub-card-virtual')).toBeTruthy();
    expect(screen.getByTestId('caisse-hub-card-deferred')).toBeTruthy();
  });

  it('affiche Reprendre et le badge Ouverte lorsque le poste signale une session ouverte (is_open)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      if (url.includes('/v1/cash-registers/status')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: [
                {
                  id: '31d56e8f-08ec-4907-9163-2a5c49c5f2fe',
                  name: 'La Clique Caisse 1',
                  is_open: true,
                  location: 'Entrée Principale',
                  enable_virtual: true,
                  enable_deferred: true,
                },
              ],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/caisse');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText('Ouverte')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /^Reprendre$/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Ouvrir$/i })).toBeNull();
  });

  it('affiche l’état chargement des postes (aria-busy) tant que GET /v1/cash-registers/status est en attente', async () => {
    let resolveRegistersStatus!: (value: Response) => void;
    const registersStatusPromise = new Promise<Response>((resolve) => {
      resolveRegistersStatus = resolve;
    });

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      if (url.includes('/v1/cash-registers/status')) {
        return registersStatusPromise;
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/caisse');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-brownfield-dashboard')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByTestId('caisse-legacy-register-row').getAttribute('aria-busy')).toBe('true');
    });

    resolveRegistersStatus({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: [
            {
              id: '31d56e8f-08ec-4907-9163-2a5c49c5f2fe',
              name: 'La Clique Caisse 1',
              is_open: false,
              location: 'Entrée Principale',
              enable_virtual: true,
              enable_deferred: true,
            },
          ],
        }),
    } as Response);

    await waitFor(() => {
      expect(screen.getByTestId('caisse-legacy-register-row').getAttribute('aria-busy')).not.toBe('true');
    });
    expect(screen.getByRole('button', { name: /^Ouvrir$/i })).toBeTruthy();
  });

  it('affiche l’alerte liste vide lorsque l’API retourne zéro poste actif', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/v1/cash-sessions/current')) {
        return fetchResponseCashSessionsCurrentNoSession();
      }
      if (url.includes('/v1/cash-registers/status')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ data: [] }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/caisse');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('caisse-hub-empty-register-list')).toBeTruthy();
    });
    expect(screen.queryByTestId('caisse-hub-register-card')).toBeNull();
  });
});
