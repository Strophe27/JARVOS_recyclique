// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { SessionManagerAdminWidget } from '../../src/domains/admin-config/SessionManagerAdminWidget';
import '../../src/styles/tokens.css';
import { paymentMethodOptionsJsonBody } from './fixtures/payment-method-options-api';

const authStub: AuthContextPort = {
  getSession: () => ({ authenticated: true, userId: '550e8400-e29b-41d4-a716-446655440001', userDisplayLabel: 'Test' }),
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

const listPayload = {
  data: [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      operator_id: '550e8400-e29b-41d4-a716-446655440001',
      site_id: '550e8400-e29b-41d4-a716-446655440000',
      initial_amount: 50,
      current_amount: 50,
      status: 'closed',
      opened_at: '2026-04-01T10:00:00.000Z',
      number_of_sales: 2,
      total_sales: 42.5,
      total_donations: 3,
      variance: 0,
    },
  ],
  total: 1,
  skip: 0,
  limit: 100,
};

const kpiPayload = {
  total_sessions: 1,
  open_sessions: 0,
  closed_sessions: 1,
  total_sales: 42.5,
  total_items: 0,
  number_of_sales: 2,
  total_donations: 3,
  total_weight_sold: 1.2,
};

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: () => 'blob:vitest-session-manager',
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: () => {},
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function wrap(ui: ReactElement) {
  return (
    <RootProviders authAdapter={authStub} disableUserPrefsPersistence>
      {ui}
    </RootProviders>
  );
}

describe('SessionManagerAdminWidget', () => {
  it('affiche le tableau et les indicateurs après chargement liste + KPIs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v1/users') && !url.includes('/v1/users/me')) {
          const body = [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              username: 'op',
              first_name: 'Pat',
              last_name: 'Op',
            },
          ];
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          };
        }
        if (url.includes('/v1/cash-sessions/stats/summary')) {
          return {
            ok: true,
            status: 200,
            json: async () => kpiPayload,
            text: async () => JSON.stringify(kpiPayload),
          };
        }
        if (url.includes('/v1/cash-sessions/') && !url.includes('by-session') && !url.includes('stats/summary')) {
          return {
            ok: true,
            status: 200,
            json: async () => listPayload,
            text: async () => JSON.stringify(listPayload),
          };
        }
        if (url.includes('/v1/sites/')) {
          const body = [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Site test' }];
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          };
        }
        if (url.includes('/v1/sales/payment-method-options')) {
          const body = paymentMethodOptionsJsonBody();
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          };
        }
        return { ok: true, status: 200, json: async () => [], text: async () => '[]' };
      }),
    );

    render(wrap(<SessionManagerAdminWidget widgetProps={{}} />));

    await waitFor(() => {
      const root = screen.getByTestId('widget-admin-session-manager-demo');
      expect(within(root).getByTestId('admin-session-manager-sessions-table')).toBeTruthy();
      expect(root.textContent).toMatch(/Fermée/);
      expect(root.textContent).toMatch(/42,50/);
      expect(root.textContent).toContain('Pat Op');
    });
    const urls = vi.mocked(fetch).mock.calls.map((c) =>
      typeof c[0] === 'string' ? c[0] : c[0] instanceof URL ? c[0].href : (c[0] as Request).url,
    );
    expect(urls.some((u) => u.includes('/v1/users'))).toBe(true);
  });

  it('appelle POST export-bulk avec code et idempotence pour export CSV', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (init?.method === 'POST' && url.includes('/v1/admin/reports/cash-sessions/export-bulk')) {
          const headers = init.headers;
          const hget = (name: string): string | null => {
            if (headers instanceof Headers) return headers.get(name);
            if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
              const rec = headers as Record<string, string>;
              const direct = rec[name] ?? rec[name.toLowerCase()];
              if (typeof direct === 'string') return direct;
            }
            return null;
          };
          expect(hget('X-Step-Up-Pin')).toBe('4242');
          expect(hget('Idempotency-Key')?.length).toBeGreaterThan(0);
          const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
          expect(body.format).toBe('csv');
          expect(body.filters.include_empty).toBe(false);
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'Content-Disposition': 'attachment; filename="bulk.csv"' }),
            blob: async () => new Blob(['x'], { type: 'text/csv' }),
            text: async () => '',
          };
        }
        if (url.includes('/v1/users') && !url.includes('/v1/users/me')) {
          const body = [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              username: 'op',
              first_name: 'Pat',
              last_name: 'Op',
            },
          ];
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          };
        }
        if (url.includes('/v1/cash-sessions/stats/summary')) {
          return {
            ok: true,
            status: 200,
            json: async () => kpiPayload,
            text: async () => JSON.stringify(kpiPayload),
          };
        }
        if (url.includes('/v1/cash-sessions/') && !url.includes('by-session') && !url.includes('stats/summary')) {
          return {
            ok: true,
            status: 200,
            json: async () => listPayload,
            text: async () => JSON.stringify(listPayload),
          };
        }
        if (url.includes('/v1/sites/')) {
          const body = [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Site test' }];
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          };
        }
        if (url.includes('/v1/sales/payment-method-options')) {
          const body = paymentMethodOptionsJsonBody();
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          };
        }
        return { ok: true, status: 200, json: async () => [], text: async () => '[]' };
      }),
    );

    render(wrap(<SessionManagerAdminWidget widgetProps={{}} />));

    await waitFor(() => {
      expect(screen.getByTestId('admin-session-manager-bulk-export')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('admin-session-manager-bulk-pin'), { target: { value: '4242' } });
    fireEvent.click(screen.getByTestId('admin-session-manager-bulk-csv'));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const bulk = calls.find((c) => {
        const url = typeof c[0] === 'string' ? c[0] : c[0] instanceof URL ? c[0].href : (c[0] as Request).url;
        const init = c[1];
        return Boolean(init && init.method === 'POST' && url.includes('export-bulk'));
      });
      expect(bulk).toBeTruthy();
      const init = bulk![1] as RequestInit;
      const parsed = typeof init.body === 'string' ? JSON.parse(init.body) : {};
      expect(parsed.filters).not.toHaveProperty('amount_min');
      expect(parsed.filters).not.toHaveProperty('amount_max');
      expect(parsed.filters).not.toHaveProperty('payment_methods');
    });
  });

  it('désactive export groupé tant que des filtres avancés sont actifs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v1/users') && !url.includes('/v1/users/me')) {
          const body = [
            { id: '550e8400-e29b-41d4-a716-446655440001', username: 'op', first_name: 'Pat', last_name: 'Op' },
          ];
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          };
        }
        if (url.includes('/v1/cash-sessions/stats/summary')) {
          return {
            ok: true,
            status: 200,
            json: async () => kpiPayload,
            text: async () => JSON.stringify(kpiPayload),
          };
        }
        if (url.includes('/v1/cash-sessions/') && !url.includes('by-session') && !url.includes('stats/summary')) {
          return {
            ok: true,
            status: 200,
            json: async () => listPayload,
            text: async () => JSON.stringify(listPayload),
          };
        }
        if (url.includes('/v1/sites/')) {
          const body = [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Site test' }];
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          };
        }
        if (url.includes('/v1/sales/payment-method-options')) {
          const body = paymentMethodOptionsJsonBody();
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          };
        }
        return { ok: true, status: 200, json: async () => [], text: async () => '[]' };
      }),
    );

    render(wrap(<SessionManagerAdminWidget widgetProps={{}} />));

    await waitFor(() => {
      expect(screen.getByTestId('admin-session-manager-sessions-table')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Filtres avancés/i }));
    const minMontant = await screen.findByLabelText(/Montant minimum/i);
    fireEvent.change(minMontant, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByTestId('admin-session-manager-bulk-export-blocked')).toBeTruthy();
      const csv = screen.getByTestId('admin-session-manager-bulk-csv') as HTMLButtonElement;
      const xlsx = screen.getByTestId('admin-session-manager-bulk-xlsx') as HTMLButtonElement;
      expect(csv.disabled).toBe(true);
      expect(xlsx.disabled).toBe(true);
    });

    fireEvent.change(minMontant, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByTestId('admin-session-manager-bulk-export-blocked')).toBeNull();
      expect((screen.getByTestId('admin-session-manager-bulk-csv') as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it('filtre moyens de paiement : libellés issus de GET payment-method-options (ordre serveur / fixture)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v1/users') && !url.includes('/v1/users/me')) {
          const body = [
            { id: '550e8400-e29b-41d4-a716-446655440001', username: 'op', first_name: 'Pat', last_name: 'Op' },
          ];
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          };
        }
        if (url.includes('/v1/cash-sessions/stats/summary')) {
          return {
            ok: true,
            status: 200,
            json: async () => kpiPayload,
            text: async () => JSON.stringify(kpiPayload),
          };
        }
        if (url.includes('/v1/cash-sessions/') && !url.includes('by-session') && !url.includes('stats/summary')) {
          return {
            ok: true,
            status: 200,
            json: async () => listPayload,
            text: async () => JSON.stringify(listPayload),
          };
        }
        if (url.includes('/v1/sites/')) {
          const body = [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Site test' }];
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          };
        }
        if (url.includes('/v1/sales/payment-method-options')) {
          const body = paymentMethodOptionsJsonBody();
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          };
        }
        return { ok: true, status: 200, json: async () => [], text: async () => '[]' };
      }),
    );

    render(wrap(<SessionManagerAdminWidget widgetProps={{}} />));

    await waitFor(() => {
      expect(screen.getByTestId('admin-session-manager-sessions-table')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Filtres avancés/i }));

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Virement SEPA' })).toBeTruthy();
      expect(screen.getByRole('checkbox', { name: 'Chèque cadeau' })).toBeTruthy();
      expect(screen.getByRole('checkbox', { name: 'Espèces caisse' })).toBeTruthy();
    });
  });
});
