// @vitest-environment jsdom
/**
 * Story 24.9 — tag métier ticket dans le parcours kiosque nominal : sélecteur + payload POST /v1/sales/.
 */
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCoalescedGetCurrentOpenCashSessionForTests } from '../../src/domains/cashflow/caisse-current-session-coalesce';
import { getCashflowDraftSnapshot, resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
import '../../src/registry';
import '../../src/styles/tokens.css';
import { expectCashflowNominalSaleSurface } from '../helpers/cashflow-nominal-sale-surface';
import { paymentMethodOptionsJsonBody } from '../unit/fixtures/payment-method-options-api';
import { addOneLineKioskSale } from './helpers/kiosk-sale-add-line';

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

function fetchResponseSalePaymentMethodOptions(): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(paymentMethodOptionsJsonBody()),
  } as Response);
}

function paymentMethodOptionsIfGet(url: string, method: string): Promise<Response> | null {
  if (method === 'GET' && url.includes('/v1/sales/payment-method-options')) {
    return fetchResponseSalePaymentMethodOptions();
  }
  return null;
}

/** Comme `kioskFillSessionOpenFinalizeAndConfirmSale` + tag métier ticket avant envoi. */
async function kioskFinalizeWithTicketBusinessTag(sessionId: string, ticketTagKind: string): Promise<void> {
  fireEvent.click(screen.getByTestId('cashflow-kiosk-micro-price'));
  await waitFor(() => {
    expect(screen.getByTestId('cashflow-input-session-id')).toBeTruthy();
  });
  fireEvent.change(screen.getByTestId('cashflow-input-session-id'), {
    target: { value: sessionId },
  });
  fireEvent.change(screen.getByTestId('cashflow-select-business-tag-ticket'), {
    target: { value: ticketTagKind },
  });
  expect(getCashflowDraftSnapshot().ticketBusinessTagKind).toBe(ticketTagKind);

  await waitFor(() => {
    expect(screen.getByTestId('cashflow-submit-sale').hasAttribute('disabled')).toBe(false);
  });
  fireEvent.click(screen.getByTestId('cashflow-submit-sale'));
  await waitFor(() => {
    expect(screen.getByTestId('cashflow-finalize-amount-received')).toBeTruthy();
  });
  const dueRaw = screen.getByTestId('cashflow-finalize-amount-due').textContent ?? '';
  const m = dueRaw.match(/(\d+(?:[.,]\d+)?)/);
  const dueStr = m ? m[1]!.replace(',', '.') : '5';
  fireEvent.change(screen.getByTestId('cashflow-finalize-amount-received'), {
    target: { value: dueStr },
  });
  await waitFor(() => {
    expect((screen.getByTestId('cashflow-submit-sale-confirm') as HTMLButtonElement).disabled).toBe(false);
  });
  fireEvent.click(screen.getByTestId('cashflow-submit-sale-confirm'));
}

function navigateToForRuntime(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

describe('E2E — tag métier ticket kiosque (Story 24.9)', () => {
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

  it(
    'POST /v1/sales/ inclut business_tag_kind issu du sélecteur (kiosque nominal)',
    async () => {
      const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = requestUrl(input);
        const method = (init?.method ?? 'GET').toUpperCase();

        if (url.includes('/v1/cash-sessions/current')) {
          return fetchResponseCashSessionsCurrentNoSession();
        }

        if (url.includes('/v1/sales/') && method === 'POST' && !url.includes('finalize-held') && !url.includes('hold')) {
          const raw = init?.body != null ? String(init.body) : '{}';
          const body = JSON.parse(raw) as { business_tag_kind?: string; items?: unknown[] };
          expect(body.business_tag_kind).toBe('GRATIFERIA');
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ id: 'sale-e2e-249-tags' }),
          });
        }

        if (method === 'GET' && url.includes('/v1/sales/sale-e2e-249-tags')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                id: 'sale-e2e-249-tags',
                cash_session_id: '00000000-0000-4000-8000-000000000001',
                total_amount: 5,
                business_tag_kind: 'GRATIFERIA',
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
                items: [
                  {
                    id: 'item-1',
                    sale_id: 'sale-e2e-249-tags',
                    category: 'EEE-1',
                    quantity: 1,
                    weight: 1,
                    unit_price: 5,
                    total_price: 5,
                  },
                ],
                payments: [],
              }),
          });
        }

        {
          const pm = paymentMethodOptionsIfGet(url, method);
          if (pm) return pm;
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => '{}',
        });
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

      navigateToForRuntime('/cash-register/sale');

      await waitFor(() => {
        expect(screen.getByTestId('cashflow-nominal-wizard')).toBeTruthy();
      });

      expectCashflowNominalSaleSurface();

      await addOneLineKioskSale();
      await kioskFinalizeWithTicketBusinessTag('00000000-0000-4000-8000-000000000001', 'GRATIFERIA');

      await waitFor(() => {
        expect(screen.getByTestId('caisse-last-sale-id').getAttribute('data-sale-id')).toBe('sale-e2e-249-tags');
      });

      const createCalls = fetchMock.mock.calls.filter(([u, i]) => {
        const m = ((i as RequestInit | undefined)?.method ?? 'GET').toUpperCase();
        return m === 'POST' && requestUrl(u).includes('/v1/sales/') && !requestUrl(u).includes('finalize-held');
      });
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
    },
    20_000,
  );
});
