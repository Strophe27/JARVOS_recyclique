// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { AdminReceptionTicketDetailWidget } from '../../src/domains/admin-config/AdminReceptionTicketDetailWidget';
import '../../src/styles/tokens.css';

const authStub: AuthContextPort = {
  getSession: () => ({ authenticated: true, userId: 'u1', userDisplayLabel: 'Test' }),
  getContextEnvelope: () => ({
    schemaVersion: '1',
    siteId: '550e8400-e29b-41d4-a716-446655440000',
    activeRegisterId: null,
    permissions: { permissionKeys: ['transverse.admin.view'] },
    issuedAt: Date.now(),
    runtimeStatus: 'ok',
  }),
  getAccessToken: () => 'tok',
};

function wrap(ui: ReactElement) {
  return <RootProviders authAdapter={authStub}>{ui}</RootProviders>;
}

function okJson(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}

describe('AdminReceptionTicketDetailWidget', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as typeof ResizeObserver;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('permet de modifier le poids d’une ligne via le patch admin', async () => {
    window.history.pushState({}, '', '/admin/reception-tickets/ticket-1');

    let currentWeight = 9;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method ?? 'GET').toUpperCase();

      if (method === 'PATCH' && url.includes('/v1/reception/tickets/ticket-1/lignes/ligne-1/weight')) {
        const body = init?.body ? (JSON.parse(String(init.body)) as { poids_kg?: number }) : {};
        currentWeight = body.poids_kg ?? currentWeight;
        return okJson(
          {
            id: 'ligne-1',
            ticket_id: 'ticket-1',
            category_id: 'cat-1',
            category_label: 'A - Deco Divers',
            poids_kg: currentWeight,
            destination: 'MAGASIN',
            notes: null,
            is_exit: false,
          },
          200,
        );
      }

      if (method === 'GET' && url.includes('/v1/reception/tickets/ticket-1')) {
        return okJson({
          id: 'ticket-1',
          poste_id: 'poste-1',
          benevole_username: 'laclique',
          created_at: '2026-01-09T16:39:53.000Z',
          closed_at: '2026-01-09T16:45:00.000Z',
          status: 'closed',
          lignes: [
            {
              id: 'ligne-1',
              ticket_id: 'ticket-1',
              category_id: 'cat-1',
              category_label: 'A - Deco Divers',
              poids_kg: currentWeight,
              destination: 'MAGASIN',
              notes: null,
              is_exit: false,
            },
          ],
        });
      }

      if (method === 'POST' && url.includes('/download-token')) {
        return okJson({ download_url: '/download/test.csv', filename: 'test.csv', expires_in_seconds: 30 });
      }

      return okJson({}, 404);
    });

    vi.stubGlobal('fetch', fetchMock);
    render(wrap(<AdminReceptionTicketDetailWidget widgetId="w" pageManifest={{ page_key: 'x', slots: [] }} />));

    await waitFor(() => expect(screen.getByTestId('admin-reception-ticket-edit-weight-ligne-1')).toBeTruthy());
    fireEvent.click(screen.getByTestId('admin-reception-ticket-edit-weight-ligne-1'));

    const input = screen.getByTestId('admin-reception-ticket-ligne-poids-input-ligne-1');
    expect(input).toBeTruthy();
    fireEvent.change(input as HTMLInputElement, { target: { value: '12.5' } });
    fireEvent.click(screen.getByTestId('admin-reception-ticket-save-weight-ligne-1'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/weight'), expect.objectContaining({ method: 'PATCH' })));
    await waitFor(() =>
      expect(within(screen.getByTestId('admin-reception-ticket-ligne-ligne-1')).getByText('12,50 kg')).toBeTruthy(),
    );
  });

  it('permet de clôturer un ticket ouvert depuis le détail admin', async () => {
    window.history.pushState({}, '', '/admin/reception-tickets/ticket-open');

    let ticketStatus = 'opened';
    let closedAt: string | null = null;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method ?? 'GET').toUpperCase();

      if (method === 'POST' && url.includes('/v1/reception/tickets/ticket-open/close')) {
        ticketStatus = 'closed';
        closedAt = '2026-01-09T16:45:00.000Z';
        return okJson({}, 200);
      }

      if (method === 'GET' && url.includes('/v1/reception/tickets/ticket-open')) {
        return okJson({
          id: 'ticket-open',
          poste_id: 'poste-1',
          benevole_username: 'laclique',
          created_at: '2026-01-09T16:39:53.000Z',
          closed_at: closedAt,
          status: ticketStatus,
          lignes: [],
        });
      }

      if (method === 'POST' && url.includes('/download-token')) {
        return okJson({ download_url: '/download/test.csv', filename: 'test.csv', expires_in_seconds: 30 });
      }

      return okJson({}, 404);
    });

    vi.stubGlobal('fetch', fetchMock);
    render(wrap(<AdminReceptionTicketDetailWidget widgetId="w" pageManifest={{ page_key: 'x', slots: [] }} />));

    await waitFor(() => expect(screen.getByTestId('admin-reception-ticket-close')).toBeTruthy());
    fireEvent.click(screen.getByTestId('admin-reception-ticket-close'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/reception/tickets/ticket-open/close'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    await waitFor(() => expect(screen.queryByTestId('admin-reception-ticket-close')).toBeNull());
    expect(screen.getByTestId('admin-reception-ticket-summary-status').textContent ?? '').toContain('Fermé');
  });

  it('affiche un panneau résumé dense aligné sur les totaux et l’état du ticket', async () => {
    window.history.pushState({}, '', '/admin/reception-tickets/ticket-summary');

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method ?? 'GET').toUpperCase();

      if (method === 'GET' && url.includes('/v1/reception/tickets/ticket-summary')) {
        return okJson({
          id: 'ticket-summary',
          poste_id: 'poste-summary',
          benevole_username: 'laclique',
          created_at: '2026-01-09T16:39:53.000Z',
          closed_at: '2026-01-09T16:45:00.000Z',
          status: 'closed',
          lignes: [
            {
              id: 'ligne-1',
              ticket_id: 'ticket-summary',
              category_id: 'cat-1',
              category_label: 'A - Deco Divers',
              poids_kg: 9,
              destination: 'MAGASIN',
              notes: null,
              is_exit: false,
            },
          ],
        });
      }

      if (method === 'POST' && url.includes('/download-token')) {
        return okJson({ download_url: '/download/test.csv', filename: 'test.csv', expires_in_seconds: 30 });
      }

      return okJson({}, 404);
    });

    vi.stubGlobal('fetch', fetchMock);
    render(wrap(<AdminReceptionTicketDetailWidget widgetId="w" pageManifest={{ page_key: 'x', slots: [] }} />));

    await waitFor(() => expect(screen.getByTestId('admin-reception-ticket-summary-panel')).toBeTruthy());
    expect(screen.getByTestId('admin-reception-ticket-summary-status')).toBeTruthy();
    expect(screen.getByTestId('admin-reception-ticket-summary-total').textContent ?? '').toContain('9,00 kg');
    expect(screen.getByTestId('admin-reception-ticket-summary-entered').textContent ?? '').toContain('9,00 kg');
    expect(screen.getByTestId('admin-reception-ticket-summary-lines').textContent ?? '').toContain('1');
  });
});
