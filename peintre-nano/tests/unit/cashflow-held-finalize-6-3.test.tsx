// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CashflowNominalWizard } from '../../src/domains/cashflow/CashflowNominalWizard';
import {
  applyServerHeldSaleToDraft,
  resetCashflowDraft,
  setCashSessionIdInput,
  setTotalAmount,
} from '../../src/domains/cashflow/cashflow-draft-store';
import '../../src/registry';

describe('Story 6.3 — finalisation ticket en attente via API', () => {
  afterEach(() => {
    cleanup();
    resetCashflowDraft();
    vi.unstubAllGlobals();
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
    resetCashflowDraft();
    applyServerHeldSaleToDraft({
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      total_amount: 7,
      items: [
        {
          category: 'EEE-1',
          quantity: 1,
          weight: 1,
          unit_price: 7,
          total_price: 7,
        },
      ],
    });
    setTotalAmount(7);
    setCashSessionIdInput('00000000-0000-4000-8000-000000000002');
  });

  it('appelle …/finalize-held au submit paiement quand activeHeldSaleId est défini', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('payment-method-options')) {
        return Promise.resolve(
          new Response(JSON.stringify([{ code: 'cash', label: 'Espèces', kind: 'cash' }]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      if (url.includes('/finalize-held')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee',
              cash_session_id: '00000000-0000-4000-8000-000000000002',
              total_amount: 7,
              lifecycle_status: 'completed',
              items: [],
              payments: [],
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    });

    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.click(screen.getByTestId('cashflow-step-next'));
    fireEvent.click(screen.getByTestId('cashflow-step-next'));
    fireEvent.click(screen.getByRole('tab', { name: /paiement/i }));

    await waitFor(() => {
      expect((screen.getByTestId('cashflow-submit-sale') as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.click(screen.getByTestId('cashflow-submit-sale'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const finalizeCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes('/finalize-held'),
    );
    expect(finalizeCall).toBeDefined();
    fetchMock.mockRestore();
  });
});
