// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RootProviders } from '../../src/app/providers/RootProviders';
import {
  createDefaultDemoEnvelope,
  getDefaultDemoAuthAdapter,
  PERMISSION_CASHFLOW_SALE_CORRECT,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { AdminAccountingPaymentMethodsWidget } from '../../src/domains/admin-config/AdminAccountingPaymentMethodsWidget';

const { listMock, revisionMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  revisionMock: vi.fn(),
}));

vi.mock('../../src/api/admin-accounting-expert-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/admin-accounting-expert-client')>();
  return {
    ...actual,
    listAccountingExpertPaymentMethods: (...a: unknown[]) => listMock(...a),
    getAccountingExpertLatestRevisionDetail: (...a: unknown[]) => revisionMock(...a),
  };
});

describe('AdminAccountingPaymentMethodsWidget', () => {
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
    listMock.mockReset();
    revisionMock.mockReset();
  });

  it('super-admin : affiche le tableau et le bandeau de dérive si pas de révision', async () => {
    listMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          code: 'cb',
          label: 'CB',
          kind: 'bank',
          paheko_debit_account: '512',
          paheko_refund_credit_account: '707',
          min_amount: null,
          max_amount: null,
          display_order: 1,
          notes: null,
          active: true,
          archived_at: null,
        },
      ],
    });
    revisionMock.mockResolvedValue({ ok: false, detail: 'Aucune révision comptable publiée.', notFound: true });

    const adapter = {
      ...getDefaultDemoAuthAdapter(),
      getAccessToken: () => 'tok',
    };

    render(
      <RootProviders authAdapter={adapter}>
        <AdminAccountingPaymentMethodsWidget widgetProps={{}} />
      </RootProviders>,
    );

    expect(await screen.findByTestId('admin-accounting-payment-methods')).toBeTruthy();
    expect(screen.getByTestId('admin-accounting-payment-methods-drift')).toBeTruthy();
    expect(screen.getByTestId('admin-accounting-payment-methods-table')).toBeTruthy();
    expect(screen.getByText('cb')).toBeTruthy();
  });

  it('super-admin : bandeau dérive si la révision n’expose pas payment_methods dans le snapshot', async () => {
    listMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          code: 'cb',
          label: 'CB',
          kind: 'bank',
          paheko_debit_account: '512',
          paheko_refund_credit_account: '707',
          min_amount: null,
          max_amount: null,
          display_order: 1,
          notes: null,
          active: true,
          archived_at: null,
        },
      ],
    });
    revisionMock.mockResolvedValue({
      ok: true,
      data: {
        id: 'r1',
        revision_seq: 2,
        published_at: '2026-01-01T00:00:00.000Z',
        snapshot: { other: 'shape' },
      },
    });

    const adapter = {
      ...getDefaultDemoAuthAdapter(),
      getAccessToken: () => 'tok',
    };

    render(
      <RootProviders authAdapter={adapter}>
        <AdminAccountingPaymentMethodsWidget widgetProps={{}} />
      </RootProviders>,
    );

    expect(await screen.findByTestId('admin-accounting-payment-methods-drift')).toBeTruthy();
  });

  it('sans proxy super-admin : message d’accès réservé', () => {
    const base = createDefaultDemoEnvelope();
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u' },
      envelope: createDefaultDemoEnvelope({
        permissions: {
          permissionKeys: base.permissions.permissionKeys.filter((k) => k !== PERMISSION_CASHFLOW_SALE_CORRECT),
        },
      }),
      accessToken: 'tok',
    });
    listMock.mockResolvedValue({ ok: true, data: [] });
    revisionMock.mockResolvedValue({
      ok: true,
      data: {
        id: 'r1',
        revision_seq: 1,
        published_at: '2026-01-01T00:00:00.000Z',
        snapshot: { payment_methods: [] },
      },
    });

    render(
      <RootProviders authAdapter={auth}>
        <AdminAccountingPaymentMethodsWidget widgetProps={{}} />
      </RootProviders>,
    );

    expect(screen.getByTestId('admin-accounting-payment-methods-denied')).toBeTruthy();
    expect(listMock).not.toHaveBeenCalled();
  });
});
