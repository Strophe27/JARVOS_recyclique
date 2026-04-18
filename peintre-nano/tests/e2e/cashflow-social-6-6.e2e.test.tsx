// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { resetCoalescedGetCurrentOpenCashSessionForTests } from '../../src/domains/cashflow/caisse-current-session-coalesce';
import { resetCashflowDraft } from '../../src/domains/cashflow/cashflow-draft-store';
import { resetCashflowOperationalSyncNoticeCacheForTests } from '../../src/domains/cashflow/cashflow-operational-sync-notice';
import { CashflowNominalWizard } from '../../src/domains/cashflow/CashflowNominalWizard';
import '../../src/registry';
import '../../src/styles/tokens.css';

const SESSION = '00000000-0000-4000-8000-000000000088';
const NEW_SALE_ID = 'dddddddd-dddd-4ddd-8ddd-444444444444';

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

describe('E2E — actions sociales Story 6.6', () => {
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

  it('workspace vente (wizard nominal hors kiosque) : bouton Don → wizard social (Story 6.6 brownfield)', async () => {
    vi.stubGlobal('fetch', fetchWizardShell());

    window.history.pushState({}, '', '/');

    render(
      <RootProviders disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-open-social-don')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cashflow-open-social-don'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-social-don-wizard')).toBeTruthy();
    });
  });

  it('sans caisse.social_encaissement : pas de bouton Don (social) dans le workspace', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{}',
      }),
    );

    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-66-no-social' },
      envelope: createDefaultDemoEnvelope({
        permissions: { permissionKeys: keys },
      }),
    });

    window.history.pushState({}, '', '/');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-social-encaissements-panel-no-perm')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-open-social-don')).toBeNull();
  });

  it('POST createSale social : items vides + social_action_kind (mocks)', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/cash-sessions/current')) {
        return Promise.resolve({ ok: true, status: 200, text: async () => 'null' } as Response);
      }
      if (url.includes('live-snapshot')) {
        return Promise.resolve({ ok: true, status: 200, text: async () => '{}' } as Response);
      }
      if (method === 'POST' && url.includes('/v1/sales/') && !url.includes('reversals')) {
        const raw = init?.body != null ? String(init.body) : '{}';
        const body = JSON.parse(raw) as Record<string, unknown>;
        expect(body.items).toEqual([]);
        expect(body.social_action_kind).toBe('MARAUDE');
        expect(body.special_encaissement_kind).toBeUndefined();
        expect(body.cash_session_id).toBe(SESSION);
        expect(typeof body.total_amount).toBe('number');
        expect((body.total_amount as number) > 0).toBe(true);
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: NEW_SALE_ID,
              cash_session_id: SESSION,
              total_amount: 7,
              items: [],
              payments: [],
              social_action_kind: 'MARAUDE',
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
      session: { authenticated: true, userId: 'u-66-e2e' },
      envelope: createDefaultDemoEnvelope({ cashSessionId: SESSION }),
    });

    window.history.pushState({}, '', '/');

    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <CashflowNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-open-social-don')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cashflow-open-social-don'));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-social-don-wizard')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('cashflow-social-don-wizard-kind'), {
      target: { value: 'MARAUDE' },
    });
    fireEvent.change(screen.getByTestId('cashflow-social-don-wizard-total'), {
      target: { value: '7' },
    });

    fireEvent.click(screen.getByTestId('cashflow-social-don-wizard-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-social-don-wizard-success')).toBeTruthy();
    });
    expect(screen.getByText(new RegExp(NEW_SALE_ID))).toBeTruthy();
  });
});
