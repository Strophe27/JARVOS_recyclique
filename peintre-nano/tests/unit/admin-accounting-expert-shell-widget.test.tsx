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
import { AdminAccountingExpertShellWidget } from '../../src/domains/admin-config/AdminAccountingExpertShellWidget';

const { listMethodsMock, revisionMock, getGlobalAccountsMock } = vi.hoisted(() => ({
  listMethodsMock: vi.fn(),
  revisionMock: vi.fn(),
  getGlobalAccountsMock: vi.fn(),
}));

vi.mock('../../src/api/admin-accounting-expert-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/admin-accounting-expert-client')>();
  return {
    ...actual,
    listAccountingExpertPaymentMethods: (...a: unknown[]) => listMethodsMock(...a),
    getAccountingExpertLatestRevisionDetail: (...a: unknown[]) => revisionMock(...a),
    getGlobalAccounts: (...a: unknown[]) => getGlobalAccountsMock(...a),
  };
});

vi.mock('../../src/api/admin-paheko-mappings-client', () => ({
  listPahekoCashSessionCloseMappings: vi.fn().mockResolvedValue({
    ok: true,
    data: [],
    total: 0,
    skip: 0,
    limit: 200,
  }),
}));

vi.mock('../../src/api/admin-paheko-outbox-client', () => ({
  getPahekoOutboxCorrelationTimeline: vi.fn().mockResolvedValue({ ok: false, detail: 'skip' }),
  getPahekoOutboxItem: vi.fn().mockResolvedValue({ ok: false, detail: 'skip' }),
  listPahekoOutboxItems: vi.fn().mockResolvedValue({
    ok: true,
    data: [],
    total: 0,
    skip: 0,
    limit: 10,
  }),
  postPahekoOutboxLiftQuarantine: vi.fn(),
  deletePahekoOutboxFailedItem: vi.fn(),
}));

vi.mock('../../src/api/admin-health-client', () => ({
  getAdminHealthSnapshot: vi.fn().mockResolvedValue({
    ok: true,
    value: {
      system_health: {
        overall_status: 'healthy',
        anomalies_detected: 0,
        critical_anomalies: 0,
        active_tasks: 0,
        scheduler_running: true,
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      anomalies: {},
      recommendations: [],
      scheduler_status: { running: true, total_tasks: 0, tasks: [] },
    },
  }),
}));

describe('AdminAccountingExpertShellWidget', () => {
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
    listMethodsMock.mockReset();
    revisionMock.mockReset();
    getGlobalAccountsMock.mockReset();
  });

  it('super-admin : affiche les onglets et bascule vers comptes globaux', async () => {
    listMethodsMock.mockResolvedValue({ ok: true, data: [], total: 0, skip: 0, limit: 200 });
    revisionMock.mockResolvedValue({ ok: false, detail: 'Aucune révision comptable publiée.', notFound: true });
    getGlobalAccountsMock.mockResolvedValue({
      ok: true,
      data: {
        default_sales_account: '707',
        default_donation_account: '756',
        prior_year_refund_account: '512',
        updated_at: '2026-04-16T10:00:00.000Z',
      },
    });

    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    const popSpy = vi.spyOn(window, 'dispatchEvent');

    render(
      <RootProviders authAdapter={getDefaultDemoAuthAdapter()}>
        <AdminAccountingExpertShellWidget widgetProps={{}} />
      </RootProviders>,
    );

    expect(await screen.findByTestId('admin-accounting-expert-shell')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Moyens de paiement/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Comptes globaux/i }));
    await waitFor(() => {
      expect(replaceState).toHaveBeenCalled();
    });
    expect(popSpy).toHaveBeenCalled();
    replaceState.mockRestore();
    popSpy.mockRestore();
  });

  it('sans proxy super-admin : message réservé', () => {
    const base = createDefaultDemoEnvelope();
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-no-sale-correct' },
      envelope: createDefaultDemoEnvelope({
        permissions: {
          permissionKeys: base.permissions.permissionKeys.filter((k) => k !== PERMISSION_CASHFLOW_SALE_CORRECT),
        },
      }),
      accessToken: 'tok',
    });

    render(
      <RootProviders authAdapter={auth}>
        <AdminAccountingExpertShellWidget widgetProps={{}} />
      </RootProviders>,
    );

    expect(screen.getByTestId('admin-accounting-expert-shell-denied')).toBeTruthy();
  });
});
