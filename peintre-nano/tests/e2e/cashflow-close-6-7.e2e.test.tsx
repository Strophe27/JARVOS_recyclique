// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CashflowCloseWizard } from '../../src/domains/cashflow/CashflowCloseWizard';
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

describe('E2E — clôture caisse (Story 6.7)', () => {
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

  it('wizard : récap → PIN → POST close + en-têtes step-up/idempotence + relais Epic 8', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: '00000000-0000-4000-8000-000000000071',
              operator_id: 'op1',
              site_id: 'site1',
              initial_amount: 50,
              current_amount: 75,
              status: 'open',
              opened_at: '2026-01-01T00:00:00Z',
              total_sales: 25,
              total_donations: 0,
              total_weight_out: 0,
              totals: { sales_completed: 25, refunds: 0, net: 25 },
            }),
        });
      }

      if (method === 'POST' && url.includes('/v1/cash-sessions/') && url.includes('/close')) {
        const raw = init?.headers;
        const getH = (k: string): string => {
          if (raw instanceof Headers) return raw.get(k) ?? '';
          if (raw && typeof raw === 'object') return String((raw as Record<string, string>)[k] ?? '');
          return '';
        };
        expect(getH('X-Step-Up-Pin')).toBe('1234');
        expect(getH('Idempotency-Key').length).toBeGreaterThan(0);
        expect(getH('X-Request-Id').length).toBeGreaterThan(0);
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: '00000000-0000-4000-8000-000000000071',
              status: 'closed',
              initial_amount: 50,
              current_amount: 75,
              total_sales: 25,
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowCloseWizard widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-close-wizard')).toBeTruthy();
    });

    const flow = screen.getByTestId('flow-renderer-cashflow-close');
    fireEvent.click(within(flow).getByRole('tab', { name: '3. Confirmer' }));

    const pinInput = screen.getByLabelText(/PIN step-up/i);
    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.input(pinInput, { target: { value: '1234' } });

    fireEvent.click(screen.getByTestId('cashflow-close-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-close-success')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-close-relay-epic8').textContent).toMatch(/Paheko/);
    expect(screen.getByTestId('cashflow-close-admin-relay')).toBeTruthy();
    expect(screen.getByTestId('cashflow-close-admin-session-detail')).toBeTruthy();

    const closeCalls = fetchMock.mock.calls.filter(
      (c) => requestUrl(c[0]).includes('/close') && (c[1]?.method ?? 'GET').toUpperCase() === 'POST',
    );
    expect(closeCalls.length).toBe(1);
  });

  it('wizard : POST close refusé CASH_SESSION_CLOSE_HELD_PENDING → alerte, pas de succès', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: '00000000-0000-4000-8000-000000000071',
              operator_id: 'op1',
              site_id: 'site1',
              initial_amount: 50,
              current_amount: 75,
              status: 'open',
              opened_at: '2026-01-01T00:00:00Z',
              total_sales: 25,
              total_donations: 0,
              total_weight_out: 0,
              totals: { sales_completed: 25, refunds: 0, net: 25 },
            }),
        });
      }

      if (method === 'POST' && url.includes('/close')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          text: async () =>
            JSON.stringify({
              code: 'CASH_SESSION_CLOSE_HELD_PENDING',
              detail:
                'Impossible de clôturer la session : au moins un ticket est encore en attente (tenu).',
              retryable: false,
              correlation_id: 'test-corr',
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowCloseWizard widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-close-wizard')).toBeTruthy();
    });

    const flow = screen.getByTestId('flow-renderer-cashflow-close');
    fireEvent.click(within(flow).getByRole('tab', { name: '3. Confirmer' }));

    const pinInput = screen.getByLabelText(/PIN step-up/i);
    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.input(pinInput, { target: { value: '1234' } });

    fireEvent.click(screen.getByTestId('cashflow-close-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-close-submit-error')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-close-submit-error').textContent).toMatch(
      /CASH_SESSION_CLOSE_HELD_PENDING/i,
    );
    expect(screen.queryByTestId('cashflow-close-success')).toBeNull();
  });

  it('wizard : réponse deleted (session vide) → titre explicite + relais Epic 8', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: '00000000-0000-4000-8000-000000000071',
              operator_id: 'op1',
              site_id: 'site1',
              initial_amount: 50,
              current_amount: 50,
              status: 'open',
              opened_at: '2026-01-01T00:00:00Z',
              total_sales: 0,
              total_donations: 0,
              total_weight_out: 0,
              totals: { sales_completed: 0, refunds: 0, net: 0 },
            }),
        });
      }

      if (method === 'POST' && url.includes('/close')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              message: 'Session vide non enregistrée',
              session_id: '00000000-0000-4000-8000-000000000071',
              deleted: true,
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowCloseWizard widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-close-wizard')).toBeTruthy();
    });

    const flow = screen.getByTestId('flow-renderer-cashflow-close');
    fireEvent.click(within(flow).getByRole('tab', { name: '3. Confirmer' }));

    const pinInput = screen.getByLabelText(/PIN step-up/i);
    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.input(pinInput, { target: { value: '1234' } });

    fireEvent.click(screen.getByTestId('cashflow-close-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-close-success')).toBeTruthy();
    });
    const deletedAlert = within(screen.getByTestId('cashflow-close-success')).getByRole('alert');
    expect(deletedAlert.textContent).toMatch(/Session vide non enregistrée/);
    expect(screen.getByTestId('cashflow-close-relay-epic8').textContent).toMatch(/Paheko/);
    expect(screen.getByTestId('cashflow-close-admin-relay-deleted')).toBeTruthy();
  });
});
