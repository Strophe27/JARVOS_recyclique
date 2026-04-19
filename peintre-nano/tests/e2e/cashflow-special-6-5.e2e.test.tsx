// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCoalescedGetCurrentOpenCashSessionForTests } from '../../src/domains/cashflow/caisse-current-session-coalesce';
import { resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
import { resetCashflowOperationalSyncNoticeCacheForTests } from '../../src/domains/cashflow/cashflow-operational-sync-notice';
import { CashflowNominalWizard } from '../../src/domains/cashflow/CashflowNominalWizard';
import { CaisseCurrentTicketWidget } from '../../src/domains/cashflow/CaisseCurrentTicketWidget';
import '../../src/registry';
import '../../src/styles/tokens.css';

const SESSION = '00000000-0000-4000-8000-000000000099';
const NEW_SALE_ID = 'eeeeeeee-eeee-4eee-8eee-555555555555';

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

function fetchWizardShell(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = requestUrl(input);
    if (url.includes('/v1/cash-sessions/current')) {
      return { ok: true, status: 200, text: async () => 'null' } as Response;
    }
    if (url.includes('live-snapshot')) {
      return { ok: true, status: 200, text: async () => '{}' } as Response;
    }
    return { ok: true, status: 200, text: async () => '{}' } as Response;
  });
}

describe('E2E — encaissements spéciaux Story 6.5', () => {
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

  it('workspace vente (wizard nominal hors kiosque) : bouton Don (sans article) ouvre le wizard', async () => {
    vi.stubGlobal('fetch', fetchWizardShell());

    window.history.pushState({}, '', '/');

    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-nominal-wizard')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cashflow-open-special-don'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-don-wizard')).toBeTruthy();
    });
  });

  it('sans caisse.special_encaissement : entrées nav don / adhésion absentes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.includes('/v1/cash-sessions/current')) {
          return { ok: true, status: 200, text: async () => 'null' } as Response;
        }
        if (url.includes('live-snapshot')) {
          return { ok: true, status: 200, text: async () => '{}' } as Response;
        }
        if (url.includes('/v1/categories/')) {
          return { ok: true, status: 200, text: async () => '[]' } as Response;
        }
        if (url.includes('/v1/cash-registers/status')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                data: [
                  {
                    id: '31d56e8f-08ec-4907-9163-2a5c49c5f2fe',
                    name: 'Caisse test',
                    is_open: true,
                    location: 'Entrée',
                    enable_virtual: true,
                    enable_deferred: true,
                  },
                ],
              }),
          } as Response;
        }
        return { ok: true, status: 200, text: async () => '{}' } as Response;
      }),
    );

    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-65-no-special' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: keys },
      }),
    });

    window.history.pushState({}, '', '/');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });
    expect(within(nav).queryByTestId('nav-entry-cashflow-special-don')).toBeNull();
    expect(within(nav).queryByTestId('nav-entry-cashflow-special-adhesion')).toBeNull();

    window.history.pushState({}, '', '/cash-register/sale');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-nominal-wizard')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-special-encaissements-panel-no-perm')).toBeNull();
    expect(screen.queryByTestId('cashflow-open-special-don')).toBeNull();
  });

  it('POST createSale spécial don : corps items vides + kind (mocks)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes('/v1/sales/payment-method-options')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([{ code: 'cash', label: 'Espèces', kind: 'cash' }]),
        } as Response);
      }
      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({ ok: true, status: 200, text: async () => 'null' } as Response);
      }
      if (url.includes('live-snapshot')) {
        return Promise.resolve({ ok: true, status: 200, text: async () => '{}' } as Response);
      }
      if (
        method === 'GET' &&
        url.includes(`/v1/sales/${encodeURIComponent(NEW_SALE_ID)}`) &&
        !url.includes('/reversals')
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: NEW_SALE_ID,
              cash_session_id: SESSION,
              total_amount: 0,
              items: [],
              payments: [],
              special_encaissement_kind: 'DON_SANS_ARTICLE',
            }),
        });
      }
      if (method === 'POST' && url.includes('/v1/sales/') && !url.includes('reversals')) {
        const raw = init?.body != null ? String(init.body) : '{}';
        const body = JSON.parse(raw) as Record<string, unknown>;
        expect(body.items).toEqual([]);
        expect(body.special_encaissement_kind).toBe('DON_SANS_ARTICLE');
        expect(body.cash_session_id).toBe(SESSION);
        expect(body.total_amount).toBe(0);
        expect(body.payment_method).toBe('cash');
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: NEW_SALE_ID,
              cash_session_id: SESSION,
              total_amount: 0,
              items: [],
              payments: [],
              special_encaissement_kind: 'DON_SANS_ARTICLE',
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

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-65-e2e' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });

    window.history.pushState({}, '', '/');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <>
          <CashflowNominalWizard widgetProps={{}} />
          <CaisseCurrentTicketWidget widgetProps={{}} />
        </>
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-open-special-don')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cashflow-open-special-don'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-don-wizard')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('cashflow-special-don-wizard-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-don-wizard-success')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByTestId('caisse-last-sale-id').getAttribute('data-sale-id')).toBe(NEW_SALE_ID);
    });
  });

  it('workspace vente (wizard nominal hors kiosque) : bouton Adhésion / cotisation ouvre le wizard', async () => {
    vi.stubGlobal('fetch', fetchWizardShell());

    window.history.pushState({}, '', '/');

    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-open-special-adhesion')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cashflow-open-special-adhesion'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-adhesion-wizard')).toBeTruthy();
    });
  });

  it('POST createSale spécial adhésion : kind ADHESION_ASSOCIATION + montant > 0 (mocks)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET' && url.includes('/v1/sales/payment-method-options')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([{ code: 'cash', label: 'Espèces', kind: 'cash' }]),
        } as Response);
      }
      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({ ok: true, status: 200, text: async () => 'null' } as Response);
      }
      if (url.includes('live-snapshot')) {
        return Promise.resolve({ ok: true, status: 200, text: async () => '{}' } as Response);
      }
      if (
        method === 'GET' &&
        url.includes(`/v1/sales/${encodeURIComponent(NEW_SALE_ID)}`) &&
        !url.includes('/reversals')
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: NEW_SALE_ID,
              cash_session_id: SESSION,
              total_amount: 10,
              items: [],
              payments: [],
              special_encaissement_kind: 'ADHESION_ASSOCIATION',
            }),
        });
      }
      if (method === 'POST' && url.includes('/v1/sales/') && !url.includes('reversals')) {
        const raw = init?.body != null ? String(init.body) : '{}';
        const body = JSON.parse(raw) as Record<string, unknown>;
        expect(body.items).toEqual([]);
        expect(body.special_encaissement_kind).toBe('ADHESION_ASSOCIATION');
        expect(body.cash_session_id).toBe(SESSION);
        expect(typeof body.total_amount).toBe('number');
        expect((body.total_amount as number) > 0).toBe(true);
        expect(body.adherent_reference).toBe('Membre 42');
        expect(body.payment_method).toBe('cash');
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: NEW_SALE_ID,
              cash_session_id: SESSION,
              total_amount: 10,
              items: [],
              payments: [],
              special_encaissement_kind: 'ADHESION_ASSOCIATION',
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

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-65-e2e-adh' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });

    window.history.pushState({}, '', '/');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <>
          <CashflowNominalWizard widgetProps={{}} />
          <CaisseCurrentTicketWidget widgetProps={{}} />
        </>
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-open-special-adhesion')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cashflow-open-special-adhesion'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-adhesion-wizard')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('cashflow-special-adhesion-wizard-adherent'), {
      target: { value: 'Membre 42' },
    });
    fireEvent.click(screen.getByTestId('cashflow-special-adhesion-wizard-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-special-adhesion-wizard-success')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByTestId('caisse-last-sale-id').getAttribute('data-sale-id')).toBe(NEW_SALE_ID);
    });
  });
});
