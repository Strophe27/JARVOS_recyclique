// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import {
  createDefaultDemoEnvelope,
  DEMO_AUTH_STUB_SITE_ID,
  PERMISSION_CASHFLOW_SALE_CORRECT,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/registry';
import '../../src/styles/tokens.css';

const SESSION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SALE_ID = 'eeeeeeee-eeee-4eee-8eee-555555555555';

const ADMIN_SESSION_PATH = `/admin/cash-sessions/${SESSION_ID}`;

function saleJson(overrides: Record<string, unknown> = {}) {
  return {
    id: SALE_ID,
    cash_session_id: SESSION_ID,
    lifecycle_status: 'completed',
    total_amount: 10,
    donation: 0,
    note: 'a',
    items: [],
    payments: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function sessionDetailJson() {
  return {
    id: SESSION_ID,
    operator_id: 'op-1',
    site_id: DEMO_AUTH_STUB_SITE_ID,
    initial_amount: 50,
    current_amount: 60,
    status: 'open',
    opened_at: '2026-01-01T08:00:00Z',
    closed_at: null,
    total_sales: 10,
    total_items: 1,
    sales: [saleJson()],
    operator_name: 'Op Test',
    site_name: 'Site démo',
  };
}

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

describe('E2E — correction sensible Story 6.8 (parcours admin / journal session)', () => {
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

  it('sans caisse.sale_correct : journal admin visible mais pas d’action Corriger (enveloppe)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes(`/v1/cash-sessions/${SESSION_ID}`) && !url.includes('/close')) {
          return Promise.resolve(
            new Response(JSON.stringify(sessionDetailJson()), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
        return Promise.resolve(new Response('not found', { status: 404 }));
      }),
    );
    const keysSansSaleCorrect = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== PERMISSION_CASHFLOW_SALE_CORRECT,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-68' },
      envelope: createDefaultDemoEnvelope({
        siteId: DEMO_AUTH_STUB_SITE_ID,
        permissions: { permissionKeys: keysSansSaleCorrect },
      }),
    });
    window.history.pushState({}, '', ADMIN_SESSION_PATH);
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('admin-cash-session-detail')).toBeTruthy();
    });
    expect(screen.queryByTestId(`admin-cash-session-correct-${SALE_ID}`)).toBeNull();
    expect(screen.getByTestId('admin-cash-session-no-correct-perm')).toBeTruthy();
  });

  it('deep-link /caisse/correction-ticket : plus de page correction caisse dans la nav servie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{}',
      }),
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-68-legacy' },
      envelope: createDefaultDemoEnvelope({ siteId: DEMO_AUTH_STUB_SITE_ID }),
    });
    window.history.pushState({}, '', '/caisse/correction-ticket');
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('four-artifacts-list')).toBeTruthy();
    });
    expect(screen.queryByTestId('cashflow-sale-correction-wizard')).toBeNull();
  });

  it('admin : permission OK → Corriger → PATCH avec PIN → succès', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-68b' },
      envelope: createDefaultDemoEnvelope({ siteId: DEMO_AUTH_STUB_SITE_ID }),
    });

    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes(`/v1/cash-sessions/${SESSION_ID}`) && !url.includes('/close')) {
        return Promise.resolve(
          new Response(JSON.stringify(sessionDetailJson()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      if (url.includes(`/v1/sales/${SALE_ID}`) && (!init || init.method === undefined || init.method === 'GET')) {
        return Promise.resolve(
          new Response(JSON.stringify(saleJson()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      if (url.includes(`/v1/sales/${SALE_ID}/corrections`) && init?.method === 'PATCH') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ...saleJson(),
              updated_at: '2026-01-02T00:00:00Z',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    });

    window.history.pushState({}, '', ADMIN_SESSION_PATH);
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('peintre-nano-shell')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByTestId(`admin-cash-session-correct-${SALE_ID}`)).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId(`admin-cash-session-correct-${SALE_ID}`));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sale-correction-wizard')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sale-correction-kind')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('cashflow-sale-correction-datetime'), {
      target: { value: '2026-06-15T14:30' },
    });
    fireEvent.change(screen.getByTestId('cashflow-sale-correction-reason'), {
      target: { value: 'Test motif audit' },
    });
    fireEvent.change(screen.getByTestId('cashflow-sale-correction-pin'), {
      target: { value: '1234' },
    });
    fireEvent.click(screen.getByTestId('cashflow-sale-correction-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sale-correction-success')).toBeTruthy();
    });
  });

  it('refuse la soumission sans PIN step-up (X-Step-Up-Pin)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-68-pin' },
      envelope: createDefaultDemoEnvelope({ siteId: DEMO_AUTH_STUB_SITE_ID }),
    });

    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes(`/v1/cash-sessions/${SESSION_ID}`) && !url.includes('/close')) {
        return Promise.resolve(
          new Response(JSON.stringify(sessionDetailJson()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      if (url.includes(`/v1/sales/${SALE_ID}`) && (!init || init.method === undefined || init.method === 'GET')) {
        return Promise.resolve(
          new Response(JSON.stringify(saleJson({ donation: null })), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(new Response('unexpected', { status: 500 }));
    });

    window.history.pushState({}, '', ADMIN_SESSION_PATH);
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId(`admin-cash-session-correct-${SALE_ID}`)).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId(`admin-cash-session-correct-${SALE_ID}`));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sale-correction-kind')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('cashflow-sale-correction-datetime'), {
      target: { value: '2026-06-15T14:30' },
    });
    fireEvent.change(screen.getByTestId('cashflow-sale-correction-reason'), {
      target: { value: 'Motif audit' },
    });
    fireEvent.change(screen.getByTestId('cashflow-sale-correction-pin'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('cashflow-sale-correction-submit'));

    await waitFor(() => {
      const err = screen.getByTestId('cashflow-sale-correction-error');
      expect(err.textContent).toMatch(/PIN step-up/i);
    });
  });

  it('vente non completed : pas de bouton Corriger sur la ligne', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-68-held' },
      envelope: createDefaultDemoEnvelope({ siteId: DEMO_AUTH_STUB_SITE_ID }),
    });

    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes(`/v1/cash-sessions/${SESSION_ID}`) && !url.includes('/close')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ...sessionDetailJson(),
              sales: [saleJson({ lifecycle_status: 'held' })],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }
      return Promise.resolve(new Response('unexpected', { status: 500 }));
    });

    window.history.pushState({}, '', ADMIN_SESSION_PATH);
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-cash-session-sales-table')).toBeTruthy();
    });
    expect(screen.queryByTestId(`admin-cash-session-correct-${SALE_ID}`)).toBeNull();
  });

  it('finalize_fields : PATCH whitelist + en-tête X-Step-Up-Pin (modal admin)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-68-fin' },
      envelope: createDefaultDemoEnvelope({ siteId: DEMO_AUTH_STUB_SITE_ID }),
    });

    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes(`/v1/cash-sessions/${SESSION_ID}`) && !url.includes('/close')) {
        return Promise.resolve(
          new Response(JSON.stringify(sessionDetailJson()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      if (url.includes(`/v1/sales/${SALE_ID}`) && (!init || init.method === undefined || init.method === 'GET')) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              saleJson({
                donation: null,
                note: 'inchangée',
              }),
            ),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }
      if (url.includes(`/v1/sales/${SALE_ID}/corrections`) && init?.method === 'PATCH') {
        const headers = init.headers as Record<string, string>;
        expect(headers['X-Step-Up-Pin']).toBe('9999');
        const body = JSON.parse(init.body as string) as { kind: string; reason: string; total_amount?: number };
        expect(body.kind).toBe('finalize_fields');
        expect(body.reason).toBe('Ajustement total');
        expect(body.total_amount).toBe(12.5);
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ...saleJson({ total_amount: 12.5 }),
              updated_at: '2026-01-02T00:00:00Z',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    });

    window.history.pushState({}, '', ADMIN_SESSION_PATH);
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId(`admin-cash-session-correct-${SALE_ID}`)).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId(`admin-cash-session-correct-${SALE_ID}`));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sale-correction-kind')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('cashflow-sale-correction-kind'), {
      target: { value: 'finalize_fields' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sale-correction-total')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('cashflow-sale-correction-total'), {
      target: { value: '12,5' },
    });
    fireEvent.change(screen.getByTestId('cashflow-sale-correction-reason'), {
      target: { value: 'Ajustement total' },
    });
    fireEvent.change(screen.getByTestId('cashflow-sale-correction-pin'), {
      target: { value: '9999' },
    });
    fireEvent.click(screen.getByTestId('cashflow-sale-correction-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sale-correction-success')).toBeTruthy();
    });
  });

  it('finalize_fields : au moins un champ modifié (liste fermée côté client)', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-68-any' },
      envelope: createDefaultDemoEnvelope({ siteId: DEMO_AUTH_STUB_SITE_ID }),
    });

    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes(`/v1/cash-sessions/${SESSION_ID}`) && !url.includes('/close')) {
        return Promise.resolve(
          new Response(JSON.stringify(sessionDetailJson()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      if (url.includes(`/v1/sales/${SALE_ID}`) && (!init || init.method === undefined || init.method === 'GET')) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              saleJson({
                donation: null,
                note: 'same',
              }),
            ),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }
      return Promise.resolve(new Response('unexpected', { status: 500 }));
    });

    window.history.pushState({}, '', ADMIN_SESSION_PATH);
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId(`admin-cash-session-correct-${SALE_ID}`)).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId(`admin-cash-session-correct-${SALE_ID}`));

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sale-correction-kind')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('cashflow-sale-correction-kind'), {
      target: { value: 'finalize_fields' },
    });
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sale-correction-total')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('cashflow-sale-correction-total'), { target: { value: '' } });

    fireEvent.change(screen.getByTestId('cashflow-sale-correction-reason'), {
      target: { value: 'Sans delta' },
    });
    fireEvent.change(screen.getByTestId('cashflow-sale-correction-pin'), {
      target: { value: '1111' },
    });
    fireEvent.click(screen.getByTestId('cashflow-sale-correction-submit'));

    await waitFor(() => {
      const err = screen.getByTestId('cashflow-sale-correction-error');
      expect(err.textContent).toMatch(/Au moins un champ de finalisation/i);
    });
  });
});
