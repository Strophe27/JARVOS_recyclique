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
const LIGNE_1 = '44444444-4444-4444-8444-444444444444';
const LIGNE_2 = '55555555-5555-5555-8555-555555555555';

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

describe('E2E — lignes réception Story 7.3 (PUT / DELETE / PATCH mockés)', () => {
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
    'édition PUT, suppression DELETE, PATCH poids après fermeture ticket',
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

    let ticketClosed = false;

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
              closed_at: ticketClosed ? '2026-04-09T11:00:00Z' : null,
              status: ticketClosed ? 'closed' : 'opened',
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
          is_exit?: boolean;
        };
        const id = lignes.length === 0 ? LIGNE_1 : LIGNE_2;
        lignes.push({
          id,
          ticket_id: TICKET_ID,
          category_id: CAT_ID,
          category_label: 'Cat test',
          poids_kg: Number(body.poids_kg),
          destination: String(body.destination),
          notes: body.notes ?? null,
          is_exit: Boolean(body.is_exit),
        });
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id,
              ticket_id: TICKET_ID,
              category_id: CAT_ID,
              category_label: 'Cat test',
              poids_kg: body.poids_kg,
              destination: body.destination,
              notes: body.notes ?? null,
              is_exit: Boolean(body.is_exit),
            }),
        } as Response);
      }
      if (url.includes(`/v1/reception/lignes/${LIGNE_1}`) && method === 'PUT') {
        const raw = init?.body != null ? String(init.body) : '{}';
        const body = JSON.parse(raw) as { poids_kg?: number; destination?: string };
        const idx = lignes.findIndex((l) => l.id === LIGNE_1);
        if (idx < 0) {
          return Promise.resolve({
            ok: false,
            status: 404,
            text: async () => JSON.stringify({ detail: 'Ligne introuvable' }),
          } as Response);
        }
        lignes[idx] = {
          ...lignes[idx],
          poids_kg: Number(body.poids_kg ?? lignes[idx].poids_kg),
          destination: String(body.destination ?? lignes[idx].destination),
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(lignes[idx]),
        } as Response);
      }
      if (url.includes(`/v1/reception/lignes/${LIGNE_2}`) && method === 'DELETE') {
        const idx = lignes.findIndex((l) => l.id === LIGNE_2);
        if (idx >= 0) lignes.splice(idx, 1);
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: 'deleted' }),
        } as Response);
      }
      if (
        url.includes(`/v1/reception/tickets/${TICKET_ID}/lignes/${LIGNE_1}/weight`) &&
        method === 'PATCH'
      ) {
        const raw = init?.body != null ? String(init.body) : '{}';
        const body = JSON.parse(raw) as { poids_kg?: number };
        const idx = lignes.findIndex((l) => l.id === LIGNE_1);
        if (idx < 0) {
          return Promise.resolve({
            ok: false,
            status: 404,
            text: async () => JSON.stringify({ detail: 'Ligne introuvable' }),
          } as Response);
        }
        lignes[idx] = { ...lignes[idx], poids_kg: Number(body.poids_kg) };
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(lignes[idx]),
        } as Response);
      }
      if (url.includes(`/v1/reception/tickets/${TICKET_ID}/close`) && method === 'POST') {
        ticketClosed = true;
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
      expect(screen.getByTestId('reception-poste-id').getAttribute('title')).toBe(POSTE_ID);
    });

    fireEvent.click(screen.getByTestId('reception-create-ticket'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-ticket-id').getAttribute('title')).toBe(TICKET_ID);
    });

    await waitFor(() => {
      expect(screen.getByTestId('reception-step-ligne')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId(`reception-category-tile-${CAT_ID}`));
    await waitFor(() => {
      expect(screen.getByTestId('reception-keypad-1')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('reception-keypad-1'));
    fireEvent.click(screen.getByTestId('reception-add-ligne'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-lignes-list').querySelectorAll('li').length).toBe(1);
    });
    expect(screen.getByTestId('reception-ticket-summary-count').textContent ?? '').toContain('1');
    expect(screen.getByTestId('reception-ticket-summary-total').textContent ?? '').toContain('1.00 kg');
    expect(screen.getByTestId('reception-ticket-summary-latest').textContent ?? '').toContain('1');

    fireEvent.click(screen.getByTestId(`reception-category-tile-${CAT_ID}`));
    await waitFor(() => {
      expect(screen.getByTestId('reception-keypad-2')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('reception-keypad-2'));
    fireEvent.click(screen.getByTestId('reception-add-ligne'));
    await waitFor(() => {
      expect(screen.getByTestId('reception-lignes-list').querySelectorAll('li').length).toBe(2);
    });
    expect(screen.getByTestId('reception-ticket-summary-total').textContent ?? '').toContain('3.00 kg');

    fireEvent.click(screen.getByTestId(`reception-edit-ligne-${LIGNE_1}`));
    const step = screen.getByTestId('reception-step-ligne');
    // Mantine NumberInput : rôle `spinbutton` en jsdom — préférer testid stable
    const poidsInput = within(step).getByTestId('reception-input-poids-kg');
    fireEvent.change(poidsInput, { target: { value: '9.5' } });
    fireEvent.click(screen.getByTestId('reception-save-ligne-edit'));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([u, i]) => requestUrl(u).includes(`/lignes/${LIGNE_1}`) && (i as RequestInit).method === 'PUT')).toBe(true);
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByTestId(`reception-delete-ligne-${LIGNE_2}`));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([u, i]) => requestUrl(u).includes(LIGNE_2) && (i as RequestInit).method === 'DELETE')).toBe(true);
    });
    confirmSpy.mockRestore();

    fireEvent.click(screen.getByTestId('reception-close-ticket'));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([u, i]) =>
            requestUrl(u).includes(`/v1/reception/tickets/${TICKET_ID}/close`) &&
            (i as RequestInit).method === 'POST',
        ),
      ).toBe(true);
    });
    // refreshTicket (GET détail) après close — sinon ticket encore « ouvert » côté état
    await waitFor(() => {
      expect(screen.getByTestId('reception-admin-patch-weight')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByTestId('reception-admin-patch-weight')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('reception-admin-patch-apply'));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([u, i]) =>
            requestUrl(u).includes(`/lignes/${LIGNE_1}/weight`) && (i as RequestInit).method === 'PATCH',
        ),
      ).toBe(true);
    });
  },
    20_000,
  );

  it(
    'PATCH poids 403 : alerte reception-api-error (cohérence garde-fous 7.2 / AC5)',
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

      let ticketClosed = false;

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
                closed_at: ticketClosed ? '2026-04-09T11:00:00Z' : null,
                status: ticketClosed ? 'closed' : 'opened',
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
            is_exit?: boolean;
          };
          lignes.push({
            id: LIGNE_1,
            ticket_id: TICKET_ID,
            category_id: CAT_ID,
            category_label: 'Cat test',
            poids_kg: Number(body.poids_kg),
            destination: String(body.destination),
            notes: body.notes ?? null,
            is_exit: Boolean(body.is_exit),
          });
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                id: LIGNE_1,
                ticket_id: TICKET_ID,
                category_id: CAT_ID,
                category_label: 'Cat test',
                poids_kg: body.poids_kg,
                destination: body.destination,
                notes: body.notes ?? null,
                is_exit: Boolean(body.is_exit),
              }),
          } as Response);
        }
        if (
          url.includes(`/v1/reception/tickets/${TICKET_ID}/lignes/${LIGNE_1}/weight`) &&
          method === 'PATCH'
        ) {
          return Promise.resolve({
            ok: false,
            status: 403,
            text: async () =>
              JSON.stringify({ detail: 'Correction poids réservée aux administrateurs' }),
          } as Response);
        }
        if (url.includes(`/v1/reception/tickets/${TICKET_ID}/close`) && method === 'POST') {
          ticketClosed = true;
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
        expect(screen.getByTestId('reception-poste-id').getAttribute('title')).toBe(POSTE_ID);
      });

      fireEvent.click(screen.getByTestId('reception-create-ticket'));
      await waitFor(() => {
        expect(screen.getByTestId('reception-ticket-id').getAttribute('title')).toBe(TICKET_ID);
      });

      await waitFor(() => {
        expect(screen.getByTestId('reception-step-ligne')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId(`reception-category-tile-${CAT_ID}`));
      await waitFor(() => {
        expect(screen.getByTestId('reception-keypad-1')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('reception-keypad-1'));
      fireEvent.click(screen.getByTestId('reception-add-ligne'));
      await waitFor(() => {
        expect(screen.getByTestId('reception-lignes-list').querySelectorAll('li').length).toBe(1);
      });
      expect(screen.getByTestId('reception-ticket-summary-total').textContent ?? '').toContain('1.00 kg');

      fireEvent.click(screen.getByTestId('reception-close-ticket'));
      await waitFor(() => {
        expect(screen.getByTestId('reception-admin-patch-weight')).toBeTruthy();
      });

      await waitFor(() => {
        expect(screen.getByTestId('reception-admin-patch-apply')).toBeTruthy();
      });
      fireEvent.click(screen.getByTestId('reception-admin-patch-apply'));

      await waitFor(() => {
        const alertEl = screen.getByTestId('reception-api-error');
        expect(alertEl).toBeTruthy();
        expect(within(alertEl).getByTestId('reception-api-error-http-status').textContent).toMatch(/403/);
      });
    },
    20_000,
  );
});
