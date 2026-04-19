// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import {
  createDefaultDemoEnvelope,
  PERMISSION_ACCOUNTING_PRIOR_YEAR_REFUND,
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_REFUND,
} from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { CashflowRefundWizard } from '../../src/domains/cashflow/CashflowRefundWizard';
import * as salesClient from '../../src/api/sales-client';
import '../../src/registry';

const baseSale = (fiscal: { fiscal_branch: string | null; sale_fiscal_year?: number; current_open_fiscal_year?: number }) => ({
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  cash_session_id: '11111111-2222-3333-4444-555555555555',
  operator_id: null,
  lifecycle_status: 'completed' as const,
  total_amount: 42,
  donation: 0,
  payment_method: 'cash',
  note: null,
  sale_date: '2024-03-15T12:00:00.000Z',
  created_at: '2024-03-15T12:00:01.000Z',
  updated_at: '2024-03-15T12:00:01.000Z',
  items: [
    {
      category: 'EEE-1',
      quantity: 1,
      weight: 1,
      unit_price: 42,
      total_price: 42,
      id: 'item-1',
      sale_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    },
  ],
  payments: [],
  ...fiscal,
});

describe('Story 24.4 — parcours expert N-1 (visibilité proactive)', () => {
  afterEach(() => {
    cleanup();
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

  it('GET vente prior_closed : encart + panneau expert avant validation (sans attendre 409)', async () => {
    const getSaleSpy = vi.spyOn(salesClient, 'getSale').mockResolvedValue({
      ok: true,
      sale: baseSale({
        fiscal_branch: 'prior_closed',
        sale_fiscal_year: 2024,
        current_open_fiscal_year: 2026,
      }),
    });

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
    });

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowRefundWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.change(screen.getByTestId('cashflow-refund-sale-id-input'), {
      target: { value: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
    });
    fireEvent.click(screen.getByTestId('cashflow-refund-load-sale'));

    await vi.waitFor(() => expect(getSaleSpy).toHaveBeenCalled());

    expect(await screen.findByTestId('cashflow-refund-prior-closed-banner')).toBeTruthy();
    expect(screen.getByTestId('cashflow-refund-prior-year-panel')).toBeTruthy();
    const submit1 = screen.getByTestId('cashflow-refund-confirm-submit') as HTMLButtonElement;
    expect(submit1.disabled).toBe(true);
  });

  it('permission accounting.prior_year_refund + case cochée : bouton activé', async () => {
    vi.spyOn(salesClient, 'getSale').mockResolvedValue({
      ok: true,
      sale: baseSale({
        fiscal_branch: 'prior_closed',
        sale_fiscal_year: 2024,
        current_open_fiscal_year: 2026,
      }),
    });

    const keys = new Set(createDefaultDemoEnvelope().permissions.permissionKeys);
    keys.add(PERMISSION_ACCOUNTING_PRIOR_YEAR_REFUND);

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: [...keys] },
      }),
    });

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowRefundWizard widgetProps={{}} />
      </RootProviders>,
    );

    fireEvent.change(screen.getByTestId('cashflow-refund-sale-id-input'), {
      target: { value: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
    });
    fireEvent.click(screen.getByTestId('cashflow-refund-load-sale'));

    const submit = (await screen.findByTestId('cashflow-refund-confirm-submit')) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fireEvent.click(screen.getByTestId('cashflow-refund-expert-prior-year'));
    expect(submit.disabled).toBe(false);
  });

  it('régression 6.4 : caisse nominal + refund sans permission N-1 suffisent pour l’entrée wizard', () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k === PERMISSION_CASHFLOW_NOMINAL || k === PERMISSION_CASHFLOW_REFUND,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope({ permissions: { permissionKeys: keys } }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowRefundWizard widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByTestId('cashflow-refund-step-select')).toBeTruthy();
  });
});
