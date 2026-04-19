// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_REFUND,
} from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCashflowOperationalSyncNoticeCacheForTests } from '../../src/domains/cashflow/cashflow-operational-sync-notice';
import { CashflowRefundWizard } from '../../src/domains/cashflow/CashflowRefundWizard';
import '../../src/registry';

const SALE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

describe('Story 24.3 — remboursement standard (moyen effectif + hint Paheko)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetCashflowOperationalSyncNoticeCacheForTests();
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
    resetCashflowOperationalSyncNoticeCacheForTests();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = requestUrl(input);
        if (url.includes('/v1/sales/payment-method-options')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify([
                { code: 'cash', label: 'Espèces', kind: 'cash' },
                { code: 'card', label: 'Carte', kind: 'bank' },
                { code: 'check', label: 'Chèque', kind: 'bank' },
              ]),
          } as Response;
        }
        if (url.includes('/v2/exploitation/live-snapshot')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                sync_operational_summary: { worst_state: 'resolu', source_reachable: true },
                context: { site_id: 's' },
                observed_at: new Date().toISOString(),
              }),
          } as Response;
        }
        if (url.includes(`/v1/sales/${SALE_ID}`) && !url.includes('/reversals')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                id: SALE_ID,
                cash_session_id: '00000000-0000-4000-8000-000000000099',
                lifecycle_status: 'completed',
                total_amount: 25,
                payment_method: 'card',
                items: [],
              }),
          } as Response;
        }
        if (url.includes('/v1/sales/reversals') && (init?.method ?? 'GET') === 'POST') {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                source_sale_id: SALE_ID,
                cash_session_id: '00000000-0000-4000-8000-000000000099',
                operator_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
                amount_signed: -25,
                reason_code: 'RETOUR_ARTICLE',
                created_at: new Date().toISOString(),
                refund_payment_method: 'cash',
                source_sale_payment_method: 'card',
                fiscal_branch: 'current',
                sale_fiscal_year: 2026,
                current_open_fiscal_year: 2026,
                paheko_accounting_sync_hint: 'TEST hint snapshot outbox clôture',
              }),
          } as Response;
        }
        return { ok: true, status: 200, text: async () => '{}' } as Response;
      }),
    );
  });

  it('écran succès : moyen effectif, distinction vente source, bandeau Paheko et sync agrégé', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: [PERMISSION_CASHFLOW_NOMINAL, PERMISSION_CASHFLOW_REFUND] },
      }),
    });

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowRefundWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.change(screen.getByTestId('cashflow-refund-sale-id-input'), {
      target: { value: SALE_ID },
    });
    fireEvent.click(screen.getByTestId('cashflow-refund-load-sale'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-refund-step-confirm')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('cashflow-refund-confirm-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-refund-success')).toBeTruthy();
    });

    expect(screen.getByTestId('cashflow-refund-success-effective-pm').textContent).toMatch(/Espèces/);
    expect(screen.getByTestId('cashflow-refund-success-paheko-hint').textContent).toMatch(/TEST hint/);
    expect(screen.getByTestId('cashflow-refund-success-paheko-hint').textContent).toMatch(/outbox/i);
    expect(screen.getByText(/Moyen de paiement d’origine sur le ticket/i)).toBeTruthy();
  });
});
