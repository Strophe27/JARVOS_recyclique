// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import {
  createDefaultDemoEnvelope,
  PERMISSION_CASHFLOW_REFUND,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/registry';
import '../../src/styles/tokens.css';

const SESSION = '00000000-0000-4000-8000-00000000c0de';

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

function stubFetchExchangeWizard(opts?: {
  readonly onMaterialExchangeBody?: (body: unknown) => void;
}): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.includes('/v1/sales/payment-method-options')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { code: 'cash', label: 'Espèces', kind: 'cash' },
              { code: 'card', label: 'Carte', kind: 'card' },
            ]),
        });
      }
      if (url.includes('/material-exchanges') && init?.method === 'POST') {
        let parsed: unknown = {};
        if (init.body && typeof init.body === 'string') {
          try {
            parsed = JSON.parse(init.body) as unknown;
          } catch {
            parsed = {};
          }
        }
        opts?.onMaterialExchangeBody?.(parsed);
        return Promise.resolve({
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              id: '11111111-1111-4111-8111-111111111111',
              paheko_accounting_sync_hint: 'sync-hint-story-246',
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    }),
  );
}

describe('E2E — échange matière / wizard (Story 24.6)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
  });

  function renderExchangePage(keys?: string[]) {
    const envelope =
      keys !== undefined
        ? createDefaultDemoEnvelope({ permissions: { permissionKeys: keys }, cashSessionId: SESSION })
        : createDefaultDemoEnvelope({ cashSessionId: SESSION });
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-24-6-e2e' },
      envelope,
    });
    window.history.pushState({}, '', '/caisse/echange');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );
    return auth;
  }

  it('URL /caisse/echange : wizard manifesté (delta / trace / submit)', async () => {
    stubFetchExchangeWizard();
    renderExchangePage();

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-exchange-wizard-delta')).toBeTruthy();
    expect(screen.getByTestId('cashflow-exchange-wizard-trace')).toBeTruthy();
    expect(screen.getByTestId('cashflow-exchange-wizard-submit')).toBeTruthy();
  });

  it('delta 0 € : POST trace seule — succès UI', async () => {
    stubFetchExchangeWizard();
    renderExchangePage();

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('cashflow-exchange-wizard-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard-success')).toBeTruthy();
    });
    expect(screen.getByText(/Conteneur créé/i)).toBeTruthy();
    expect(screen.getByTestId('cashflow-exchange-success-paheko-hint')).toBeTruthy();
  });

  it('trace JSON invalide : erreur locale, pas d’appel POST échange', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.includes('/v1/sales/payment-method-options')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ code: 'cash', label: 'Espèces', kind: 'cash' }]),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderExchangePage();

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('cashflow-exchange-wizard-trace'), {
      target: { value: '{ pas du json' },
    });
    fireEvent.click(screen.getByTestId('cashflow-exchange-wizard-submit'));

    await waitFor(() => {
      expect(screen.getByText(/JSON trace matière invalide/i)).toBeTruthy();
    });
    expect(fetchMock.mock.calls.some((c) => String(requestUrl(c[0])).includes('material-exchanges'))).toBe(false);
  });

  it('complément (delta > 0) : corps API avec complement_sale aligné delta', async () => {
    let posted: unknown;
    stubFetchExchangeWizard({
      onMaterialExchangeBody: (body) => {
        posted = body;
      },
    });
    renderExchangePage();

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('cashflow-exchange-wizard-delta'), {
      target: { value: '2.50' },
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard-pm')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('cashflow-exchange-wizard-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard-success')).toBeTruthy();
    });

    const body = posted as {
      delta_amount_cents?: number;
      complement_sale?: { total_amount?: number; items?: { unit_price?: number }[] };
    };
    expect(body.delta_amount_cents).toBe(250);
    expect(body.complement_sale?.total_amount).toBe(2.5);
    expect(body.complement_sale?.items?.[0]?.unit_price).toBe(2.5);
  });

  it('branche remboursement (delta < 0) sans caisse.refund : erreur locale, pas d’appel POST', async () => {
    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_REFUND,
    );
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.includes('/v1/sales/payment-method-options')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ code: 'cash', label: 'Espèces', kind: 'cash' }]),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => '{}',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderExchangePage(keys);

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-exchange-wizard')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('cashflow-exchange-wizard-delta'), {
      target: { value: '-12.00' },
    });

    fireEvent.click(screen.getByTestId('cashflow-exchange-wizard-submit'));

    await waitFor(() => {
      expect(screen.getByText(/Pour un échange avec remboursement/i)).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-submit-error')).toBeTruthy();
    expect(
      fetchMock.mock.calls.some((c) => String(requestUrl(c[0])).includes('material-exchanges')),
    ).toBe(false);
  });
});
