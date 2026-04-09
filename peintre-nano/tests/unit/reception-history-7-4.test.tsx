// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { ReceptionHistoryPanel } from '../../src/domains/reception/ReceptionHistoryPanel';
import '../../src/registry';

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

describe('Story 7.4 — panneau historique réception (API mockée)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });

  it('affiche une erreur API si GET liste tickets retourne 403 (sécurité liste / 7.2)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/tickets') && method === 'GET' && !/\/v1\/reception\/tickets\/[^/?]+/.test(url)) {
        return Promise.resolve({
          ok: false,
          status: 403,
          text: async () => JSON.stringify({ detail: 'Liste interdite' }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionHistoryPanel widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('reception-history-api-error')).toBeTruthy();
    });
    expect(screen.getByTestId('reception-history-api-error-http-status').textContent ?? '').toMatch(/403/);
    expect(screen.getByTestId('reception-history-api-error-primary').textContent ?? '').toMatch(/Liste interdite/);
  });

  it('affiche le blocage lorsque l’enveloppe est forbidden (7.2)', () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        runtimeStatus: 'forbidden',
        restrictionMessage: 'Refus test',
      }),
      accessToken: 'tok',
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionHistoryPanel widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('reception-history-blocked')).toBeTruthy();
    expect(screen.getByText(/Refus test/)).toBeTruthy();
  });

  it('liste + détail depuis le mock ; export admin 403 affiché', async () => {
    const tid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/tickets') && method === 'GET' && !url.includes(tid)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              tickets: [
                {
                  id: tid,
                  poste_id: 'p1',
                  benevole_username: 'vol',
                  created_at: '2026-01-01T10:00:00Z',
                  closed_at: null,
                  status: 'closed',
                  total_lignes: 1,
                  total_poids: 2,
                  poids_entree: 2,
                  poids_direct: 0,
                  poids_sortie: 0,
                },
              ],
              total: 1,
              page: 1,
              per_page: 20,
              total_pages: 1,
            }),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'p1',
              benevole_username: 'vol',
              created_at: '2026-01-01T10:00:00Z',
              closed_at: null,
              status: 'closed',
              lignes: [],
            }),
        } as Response);
      }
      if (url.includes('/download-token') && method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 403,
          text: async () => JSON.stringify({ detail: 'Interdit' }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionHistoryPanel widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId(`reception-history-row-${tid}`)).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId(`reception-history-row-${tid}`));
    await waitFor(() => {
      expect(screen.getByTestId('reception-history-detail')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('reception-history-export'));
    await waitFor(() => {
      const box = screen.getByTestId('reception-history-api-error');
      expect(box.textContent ?? '').toMatch(/Interdit/);
    });
  });
});
