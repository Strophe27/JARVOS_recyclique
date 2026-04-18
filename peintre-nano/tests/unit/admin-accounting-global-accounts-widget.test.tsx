// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RootProviders } from '../../src/app/providers/RootProviders';
import {
  createDefaultDemoEnvelope,
  getDefaultDemoAuthAdapter,
  PERMISSION_CASHFLOW_SALE_CORRECT,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { AdminAccountingGlobalAccountsWidget } from '../../src/domains/admin-config/AdminAccountingGlobalAccountsWidget';

const getGlobalAccountsMock = vi.fn();
const patchGlobalAccountsMock = vi.fn();

vi.mock('../../src/api/admin-accounting-expert-client', async () => {
  const actual = await vi.importActual<typeof import('../../src/api/admin-accounting-expert-client')>(
    '../../src/api/admin-accounting-expert-client',
  );
  return {
    ...actual,
    getGlobalAccounts: (...args: unknown[]) => getGlobalAccountsMock(...args),
    patchGlobalAccounts: (...args: unknown[]) => patchGlobalAccountsMock(...args),
  };
});

describe('AdminAccountingGlobalAccountsWidget', () => {
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

  afterEach(() => {
    cleanup();
    getGlobalAccountsMock.mockReset();
    patchGlobalAccountsMock.mockReset();
  });

  it('charge et affiche les comptes (super-admin UI)', async () => {
    getGlobalAccountsMock.mockResolvedValue({
      ok: true,
      data: {
        default_sales_account: '707',
        default_donation_account: '756',
        prior_year_refund_account: '512',
        updated_at: '2026-04-16T10:00:00.000Z',
      },
    });
    render(
      <RootProviders authAdapter={getDefaultDemoAuthAdapter()}>
        <AdminAccountingGlobalAccountsWidget widgetType="admin.accounting.global.accounts" widgetProps={{}} />
      </RootProviders>,
    );
    await waitFor(() => expect(getGlobalAccountsMock).toHaveBeenCalled());
    expect((screen.getByTestId('admin-global-accounts-sales') as HTMLInputElement).value).toBe('707');
    expect(screen.getByTestId('admin-accounting-global-accounts')).toBeTruthy();
  });

  it('enregistre avec PATCH et PIN step-up', async () => {
    getGlobalAccountsMock.mockResolvedValue({
      ok: true,
      data: {
        default_sales_account: '707',
        default_donation_account: '756',
        prior_year_refund_account: '512',
        updated_at: '2026-04-16T10:00:00.000Z',
      },
    });
    patchGlobalAccountsMock.mockResolvedValue({
      ok: true,
      data: {
        default_sales_account: '707',
        default_donation_account: '756',
        prior_year_refund_account: '512',
        updated_at: '2026-04-16T10:00:01.000Z',
      },
    });
    render(
      <RootProviders authAdapter={getDefaultDemoAuthAdapter()}>
        <AdminAccountingGlobalAccountsWidget widgetType="admin.accounting.global.accounts" widgetProps={{}} />
      </RootProviders>,
    );
    await waitFor(() => expect(getGlobalAccountsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('admin-global-accounts-step-up'), { target: { value: '9999' } });
    fireEvent.click(screen.getByTestId('admin-global-accounts-save'));
    await waitFor(() => expect(patchGlobalAccountsMock).toHaveBeenCalled());
    const call = patchGlobalAccountsMock.mock.calls[0];
    expect(call?.[1]).toMatchObject({
      default_sales_account: '707',
      default_donation_account: '756',
      prior_year_refund_account: '512',
    });
    expect(call?.[2]).toMatchObject({ stepUpPin: '9999' });
  });

  it('sans proxy super-admin : message d’accès réservé', () => {
    const env = createDefaultDemoEnvelope();
    const keys = env.permissions.permissionKeys.filter((k) => k !== PERMISSION_CASHFLOW_SALE_CORRECT);
    const adapter = createMockAuthAdapter({
      envelope: {
        ...env,
        permissions: { permissionKeys: keys },
      },
    });
    render(
      <RootProviders authAdapter={adapter}>
        <AdminAccountingGlobalAccountsWidget widgetType="admin.accounting.global.accounts" widgetProps={{}} />
      </RootProviders>,
    );
    expect(screen.getByText(/Accès réservé/i)).toBeTruthy();
    expect(getGlobalAccountsMock).not.toHaveBeenCalled();
  });
});
