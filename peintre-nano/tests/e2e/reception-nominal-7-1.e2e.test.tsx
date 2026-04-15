// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/registry';
import '../../src/styles/tokens.css';

const POSTE_ID = '11111111-1111-4111-8111-111111111111';
const TICKET_ID = '22222222-2222-4222-8222-222222222222';
const CAT_ID = '33333333-3333-4333-8333-333333333333';
const LIGNE_ID = '44444444-4444-4444-8444-444444444444';

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

describe('E2E — parcours réception nominal (Story 7.1)', () => {
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
  });

  it(
    'depuis /reception : FlowRenderer + chaîne POST/GET réception mockée (AC 1)',
    { timeout: 15_000 },
    async () => {
    const lignes: Array<{
      id: string;
      ticket_id: string;
      category_id: string;
      category_label: string;
      poids_kg: number;
      destination: string;
      notes: string | null;
      is_exit: boolean;
    }> = [];

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (
        method === 'GET' &&
        url.includes('/v1/reception/tickets') &&
        !/\/v1\/reception\/tickets\/[^/?]+/.test(url)
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ tickets: [], total: 0, page: 1, per_page: 20, total_pages: 0 }),
        } as Response);
      }

      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: POSTE_ID, status: 'opened' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: TICKET_ID }),
        } as Response);
      }
      if (url.includes('/v1/reception/categories') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: CAT_ID, name: 'Cat test' }]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${TICKET_ID}`) && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: TICKET_ID,
              poste_id: POSTE_ID,
              benevole_username: 'tester',
              created_at: '2026-04-09T10:00:00Z',
              closed_at: null,
              status: 'opened',
              lignes: [...lignes],
            }),
        } as Response);
      }
      if (url.includes('/v1/reception/lignes') && method === 'POST') {
        const raw = init?.body != null ? String(init.body) : '{}';
        const body = JSON.parse(raw) as {
          poids_kg?: number;
          destination?: string;
          notes?: string | null;
        };
        expect(body.poids_kg).toBeGreaterThan(0);
        expect(['MAGASIN', 'RECYCLAGE', 'DECHETERIE']).toContain(body.destination);
        expect(body.notes).toBe('note e2e story 7.1');
        lignes.push({
          id: LIGNE_ID,
          ticket_id: TICKET_ID,
          category_id: CAT_ID,
          category_label: 'Cat test',
          poids_kg: Number(body.poids_kg),
          destination: String(body.destination),
          notes: body.notes ?? null,
          is_exit: false,
        });
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: LIGNE_ID,
              ticket_id: TICKET_ID,
              category_id: CAT_ID,
              category_label: 'Cat test',
              poids_kg: body.poids_kg,
              destination: body.destination,
              notes: body.notes ?? null,
              is_exit: false,
            }),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${TICKET_ID}/close`) && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: 'closed' }),
        } as Response);
      }
      if (url.includes(`/v1/reception/postes/${POSTE_ID}/close`) && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: 'closed' }),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => 'null',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/reception');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('reception-nominal-wizard')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-poste-id').textContent).toContain(POSTE_ID);
    });

    fireEvent.click(screen.getByTestId('reception-create-ticket'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-ticket-id').textContent).toContain(TICKET_ID);
    });

    await waitFor(() => {
      const step = screen.getByTestId('reception-step-ligne');
      expect(within(step).getByTestId('reception-select-category')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('reception-input-notes'), {
      target: { value: 'note e2e story 7.1' },
    });
    fireEvent.click(screen.getByTestId('reception-keypad-1'));
    fireEvent.click(screen.getByTestId('reception-add-ligne'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-ticket-lignes-summary').textContent).toMatch(/Lignes côté serveur : 1/);
    });

    fireEvent.click(screen.getByTestId('reception-close-ticket'));
    fireEvent.click(screen.getByTestId('reception-close-poste'));

    await waitFor(() => {
      expect(screen.queryByTestId('reception-poste-id')).toBeNull();
    });

    const receptionPosts = fetchMock.mock.calls.filter(
      ([u, i]) =>
        requestUrl(u).includes('/v1/reception/postes/open') &&
        ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase() === 'POST',
    );
    expect(receptionPosts.length).toBeGreaterThanOrEqual(1);

    const closeTicketPosts = fetchMock.mock.calls.filter(
      ([u, i]) =>
        requestUrl(u).includes(`/v1/reception/tickets/${TICKET_ID}/close`) &&
        ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase() === 'POST',
    );
    expect(closeTicketPosts.length).toBeGreaterThanOrEqual(1);

    const closePostePosts = fetchMock.mock.calls.filter(
      ([u, i]) =>
        requestUrl(u).includes(`/v1/reception/postes/${POSTE_ID}/close`) &&
        ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase() === 'POST',
    );
    expect(closePostePosts.length).toBeGreaterThanOrEqual(1);

    const lignePosts = fetchMock.mock.calls.filter(
      ([u, i]) =>
        requestUrl(u).includes('/v1/reception/lignes') &&
        ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase() === 'POST',
    );
    expect(lignePosts.length).toBeGreaterThanOrEqual(1);
  });

  it('refus serveur à l’ouverture poste : alerte surface (régression API)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (
        method === 'GET' &&
        url.includes('/v1/reception/tickets') &&
        !/\/v1\/reception\/tickets\/[^/?]+/.test(url)
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ tickets: [], total: 0, page: 1, per_page: 20, total_pages: 0 }),
        } as Response);
      }
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 403,
          text: async () => JSON.stringify({ detail: 'Accès réception refusé' }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => 'null',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/reception');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('reception-nominal-wizard')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-api-error')).toBeTruthy();
      expect(screen.getByTestId('reception-api-error-http-status').textContent).toMatch(/403/);
    });
  });

  it('Story 7.5 — DATA_STALE (bouton test) : bannière, attribut widget et fermeture ticket bloquée via App', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (
        method === 'GET' &&
        url.includes('/v1/reception/tickets') &&
        !/\/v1\/reception\/tickets\/[^/?]+/.test(url)
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ tickets: [], total: 0, page: 1, per_page: 20, total_pages: 0 }),
        } as Response);
      }
      if (url.includes('/v1/reception/postes/open') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: POSTE_ID, status: 'opened' }),
        } as Response);
      }
      if (url.includes('/v1/reception/tickets') && method === 'POST' && !url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: TICKET_ID }),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${TICKET_ID}`) && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: TICKET_ID,
              poste_id: POSTE_ID,
              benevole_username: 'tester',
              created_at: '2026-04-09T10:00:00Z',
              closed_at: null,
              status: 'opened',
              lignes: [],
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => 'null',
      } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.pushState({}, '', '/reception');

    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('reception-nominal-wizard')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('reception-open-poste'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-poste-id').textContent).toContain(POSTE_ID);
    });

    fireEvent.click(screen.getByTestId('reception-create-ticket'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-ticket-id').textContent).toContain(TICKET_ID);
    });

    fireEvent.click(screen.getByTestId('reception-trigger-stale'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-nominal-stale-banner')).toBeTruthy();
    });
    expect(screen.getByTestId('reception-nominal-wizard').getAttribute('data-widget-data-state')).toBe('DATA_STALE');
    expect(screen.getByTestId('reception-close-ticket').hasAttribute('disabled')).toBe(true);
  });
});
