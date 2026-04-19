// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND,
  PERMISSION_CASHFLOW_NOMINAL,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCashflowOperationalSyncNoticeCacheForTests } from '../../src/domains/cashflow/cashflow-operational-sync-notice';
import '../../src/registry';
import '../../src/styles/tokens.css';

const DEMO_SESSION = '00000000-0000-4000-8000-00000000c0de';

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

function fetchForExceptionalRefundWizard(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url.includes('/v1/sales/payment-method-options')) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([{ code: 'cash', label: 'Espèces', kind: 'cash' }]),
      } as Response;
    }
    if (url.includes('live-snapshot')) {
      return { ok: true, status: 200, text: async () => '{}' } as Response;
    }
    return { ok: true, status: 200, text: async () => '{}' } as Response;
  });
}

describe('E2E — hub opérations spéciales Story 24.10 P3 (préuves / contraintes opérationnelles)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    resetCashflowOperationalSyncNoticeCacheForTests();
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
    resetCashflowOperationalSyncNoticeCacheForTests();
  });

  it('hub : carte remboursement exceptionnel documente flag P3, approval_evidence_ref et traçabilité supervision (audit opérations sensibles)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{}',
      }),
    );

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-10-p3-hub' },
      envelope: createDefaultDemoEnvelope(),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-hub')).toBeTruthy();
    });

    const card = screen.getByTestId('cashflow-special-ops-card-remboursement-exceptionnel');
    const copy = card.textContent ?? '';
    expect(copy).toContain('operations_specials_p3');
    expect(copy).toContain('approval_evidence_ref');
    expect(copy).toMatch(/journal d'audit/i);
    expect(copy).toMatch(/opérations caisse sensibles/i);
  });

  it('hub → remboursement exceptionnel : /caisse/remboursement-exceptionnel + wizard (session résolue)', async () => {
    vi.stubGlobal('fetch', fetchForExceptionalRefundWizard());

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-10-p3-nav' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: DEMO_SESSION }),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-remboursement-exceptionnel-cta')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cashflow-special-ops-remboursement-exceptionnel-cta'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/caisse/remboursement-exceptionnel');
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exceptional-refund-wizard')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exceptional-refund-amount')).toBeTruthy();
    });
  });

  it('sans refund.exceptional : carte remboursement exceptionnel bloquée (message permissions)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{}',
      }),
    );

    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-10-p3-block' },
      envelope: createDefaultDemoEnvelope({ permissions: { permissionKeys: keys } }),
    });
    window.history.pushState({}, '', '/caisse/operations-speciales');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-ops-remboursement-exceptionnel-blocked')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-special-ops-remboursement-exceptionnel-cta')).toBeNull();

    const blocked = screen.getByTestId('cashflow-special-ops-remboursement-exceptionnel-blocked');
    expect(within(blocked).getByText(new RegExp(PERMISSION_CASHFLOW_NOMINAL))).toBeTruthy();
    expect(within(blocked).getByText(new RegExp(PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND))).toBeTruthy();
  });
});
