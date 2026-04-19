// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_EXCHANGE,
  PERMISSION_CASHFLOW_REFUND,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCoalescedGetCurrentOpenCashSessionForTests } from '../../src/domains/cashflow/caisse-current-session-coalesce';
import { resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
import { resetCashflowOperationalSyncNoticeCacheForTests } from '../../src/domains/cashflow/cashflow-operational-sync-notice';
import { CashflowExchangeWizard } from '../../src/domains/cashflow/CashflowExchangeWizard';
import '../../src/registry';
import '../../src/styles/tokens.css';

const SESSION_ID = '00000000-0000-4000-8000-00000000c0de';
const EXCHANGE_ID = '11111111-1111-4111-8111-111111111111';

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

function fetchForExchangeE2e(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    if (url.includes('/v1/sales/payment-method-options')) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([{ code: 'cash', label: 'Espèces', kind: 'cash' }]),
      } as Response;
    }
    if (url.includes('/material-exchanges') && init?.method === 'POST') {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            id: EXCHANGE_ID,
            paheko_accounting_sync_hint: 'Sync terrain (batch).',
          }),
      } as Response;
    }
    return { ok: true, status: 200, text: async () => '{}' } as Response;
  });
}

describe('E2E — échange matière Story 24.6 (delta 0 / complément / garde-fous)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    resetCashflowDraft();
    resetCoalescedGetCurrentOpenCashSessionForTests();
    resetCashflowOperationalSyncNoticeCacheForTests();
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
    resetCashflowDraft();
    resetCoalescedGetCurrentOpenCashSessionForTests();
    resetCashflowOperationalSyncNoticeCacheForTests();
  });

  function renderExchangePage(
    envelopeOverrides?: Parameters<typeof createDefaultDemoEnvelope>[0],
  ): void {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-6' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: SESSION_ID,
        ...envelopeOverrides,
      }),
    });
    window.history.pushState({}, '', '/caisse/echange');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );
  }

  it('delta 0 € : POST material-exchanges (métier seul) → succès avec identifiant', async () => {
    vi.stubGlobal('fetch', fetchForExchangeE2e());
    renderExchangePage();

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('cashflow-exchange-wizard-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard-success')).toBeTruthy();
    });
    expect(screen.getByText(new RegExp(EXCHANGE_ID))).toBeTruthy();
    expect(screen.getByTestId('cashflow-exchange-success-paheko-hint')).toBeTruthy();
  });

  it('complément (delta > 0) : corps POST contient complement_sale (sous-flux vente)', async () => {
    const fetchMock = fetchForExchangeE2e();
    vi.stubGlobal('fetch', fetchMock);
    renderExchangePage();

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard')).toBeTruthy();
    });

    const deltaInput = screen.getByTestId('cashflow-exchange-wizard-delta');
    fireEvent.change(deltaInput, { target: { value: '3.50' } });

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard-pm')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('cashflow-exchange-wizard-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard-success')).toBeTruthy();
    });

    const posted = fetchMock.mock.calls.find(
      ([u, i]) => requestUrl(u).includes('/material-exchanges') && (i as RequestInit | undefined)?.method === 'POST',
    );
    expect(posted).toBeTruthy();
    const body = JSON.parse((posted![1] as RequestInit).body as string) as Record<string, unknown>;
    expect(body.delta_amount_cents).toBe(350);
    expect(body.complement_sale).toBeTruthy();
    expect(typeof (body.complement_sale as Record<string, unknown>).total_amount).toBe('number');
  });

  it('trace matière JSON invalide : erreur locale (pas d’appel POST)', async () => {
    const fetchMock = fetchForExchangeE2e();
    vi.stubGlobal('fetch', fetchMock);
    renderExchangePage();

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard-trace')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('cashflow-exchange-wizard-trace'), {
      target: { value: '{pas du json' },
    });
    fireEvent.click(screen.getByTestId('cashflow-exchange-wizard-submit'));

    await waitFor(() => {
      expect(screen.getByText(/JSON trace matière invalide/i)).toBeTruthy();
    });
    expect(
      fetchMock.mock.calls.some(
        ([u, i]) => requestUrl(u).includes('/material-exchanges') && (i as RequestInit | undefined)?.method === 'POST',
      ),
    ).toBe(false);
  });

  it('sans caisse.exchange : wizard bloqué (permission PRD)', async () => {
    vi.stubGlobal('fetch', fetchForExchangeE2e());
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_EXCHANGE,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-6-noex' },
      envelope: createDefaultDemoEnvelope({
        cashSessionId: SESSION_ID,
        permissions: { permissionKeys: keys },
      }),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowExchangeWizard widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard-blocked')).toBeTruthy();
    });
    expect(screen.getByText(/Échange non autorisé/i)).toBeTruthy();
  });

  it('delta négatif sans caisse.refund : erreur locale (branche remboursement)', async () => {
    vi.stubGlobal('fetch', fetchForExchangeE2e());
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_REFUND,
    );
    renderExchangePage({ permissions: { permissionKeys: keys } });

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard')).toBeTruthy();
    });

    const deltaInput = screen.getByTestId('cashflow-exchange-wizard-delta');
    fireEvent.change(deltaInput, { target: { value: '-2.00' } });

    await waitFor(() => {
      expect(screen.getByText(/Permission remboursement/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('cashflow-exchange-wizard-submit'));

    await waitFor(() => {
      const alert = screen.getByTestId('cashflow-submit-error');
      expect(alert.textContent).toContain(PERMISSION_CASHFLOW_REFUND);
    });
  });
});
