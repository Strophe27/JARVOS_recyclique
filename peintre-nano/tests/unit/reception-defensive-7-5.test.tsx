// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { ReceptionHistoryPanel } from '../../src/domains/reception/ReceptionHistoryPanel';
import { ReceptionNominalWizard } from '../../src/domains/reception/ReceptionNominalWizard';
import { setReceptionCriticalDataState } from '../../src/domains/reception/reception-critical-data-state';
import '../../src/registry';

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

describe('Story 7.5 — réception défensive (AR21, DATA_STALE, pas de faux succès)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    setReceptionCriticalDataState('NOMINAL');
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

  it('DATA_STALE : bannière + fermeture ticket désactivée (widget critical)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    const tid = 'ticket-stale-test';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'poste-s', status: 'open' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes(tid)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: tid }),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${tid}`) && method === 'GET' && !url.includes('export')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: tid,
              poste_id: 'poste-s',
              benevole_username: 'v',
              created_at: '2026-01-01',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
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
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-poste-id').textContent).toContain('poste-s');
    });
    fireEvent.click(screen.getByTestId('reception-create-ticket'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-ticket-id').textContent).toContain(tid);
    });

    setReceptionCriticalDataState('DATA_STALE');
    await waitFor(() => {
      expect(screen.getByTestId('reception-nominal-stale-banner')).toBeTruthy();
    });
    expect(screen.getByTestId('reception-nominal-wizard').getAttribute('data-widget-data-state')).toBe('DATA_STALE');
    expect(screen.getByTestId('reception-close-ticket').hasAttribute('disabled')).toBe(true);
  });

  it('erreur open poste : pas de libellé de succès ; correlation_id discret', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: async () =>
            JSON.stringify({
              detail: 'Refus test',
              code: 'TEST_CODE',
              retryable: false,
              correlation_id: 'corr-rx-7-5',
            }),
        } as Response),
      ),
    );

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-api-error')).toBeTruthy();
    });
    const root = screen.getByTestId('reception-nominal-wizard');
    expect(root.textContent ?? '').not.toMatch(/enregistré avec succès|terminé avec succès/i);
    expect(screen.getByTestId('reception-api-error-correlation-id').textContent ?? '').toMatch(/corr-rx-7-5/);
  });

  it('export CSV : 200 sans download_url → erreur explicite, pas d’ouverture de fenêtre', async () => {
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
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ download_url: '', filename: 'x.csv', expires_in_seconds: 60 }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => 'not found',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

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
      expect(screen.getByTestId('reception-history-api-error')).toBeTruthy();
    });
    expect(screen.getByTestId('reception-history-api-error-primary').textContent ?? '').toMatch(/URL/i);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('retryable true : invite à réessayer (lecture liste)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          text: async () => JSON.stringify({ detail: 'Indispo', retryable: true }),
        } as Response),
      ),
    );

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionHistoryPanel widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('reception-history-api-error')).toBeTruthy();
    });
    expect(screen.getByTestId('reception-history-api-error').textContent ?? '').toMatch(/Nouvel essai possible/i);
  });
});
