// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createDefaultDemoEnvelope,
  DEMO_AUTH_STUB_SITE_ID,
  TRANSVERSE_PERMISSION_ADMIN_VIEW,
} from '../../src/app/auth/default-demo-auth-adapter';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { AdminCashSessionDetailWidget } from '../../src/domains/cashflow/AdminCashSessionDetailWidget';
import '../../src/styles/tokens.css';

const SESSION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SALE_ID = 'eeeeeeee-eeee-4eee-8eee-555555555555';

function saleJson(note: string | null = null) {
  return {
    id: SALE_ID,
    cash_session_id: SESSION_ID,
    lifecycle_status: 'completed',
    total_amount: 10,
    donation: 0,
    note,
    items: [],
    payments: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function sessionDetailJson() {
  return {
    id: SESSION_ID,
    operator_id: 'op-1',
    site_id: DEMO_AUTH_STUB_SITE_ID,
    initial_amount: 50,
    current_amount: 60,
    status: 'closed',
    opened_at: '2026-01-01T08:00:00Z',
    closed_at: '2026-01-01T18:00:00Z',
    total_sales: 10,
    total_items: 1,
    sales: [saleJson(null)],
    operator_name: 'Op Test',
    site_name: 'Site démo',
  };
}

afterEach(() => {
  window.history.pushState({}, '', '/');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  cleanup();
});

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

describe('AdminCashSessionDetailWidget — note ticket', () => {
  it('affiche Ajouter une note et enregistre via PUT', async () => {
    const updated = saleJson('Note terrain');
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes(`/v1/cash-sessions/${SESSION_ID}`) && !url.includes('/close')) {
        return Promise.resolve(
          new Response(JSON.stringify(sessionDetailJson()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      if (url.includes(`/v1/sales/${SALE_ID}`)) {
        const method = init?.method ?? 'GET';
        if (method === 'GET') {
          return Promise.resolve(
            new Response(JSON.stringify(saleJson(null)), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
        if (method === 'PUT') {
          return Promise.resolve(
            new Response(JSON.stringify(updated), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-admin' },
      envelope: createDefaultDemoEnvelope({ siteId: DEMO_AUTH_STUB_SITE_ID }),
    });

    window.history.pushState({}, '', `/admin/cash-sessions/${SESSION_ID}`);
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <AdminCashSessionDetailWidget />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-cash-session-sales-table')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId(`admin-cash-session-view-ticket-${SALE_ID}`));

    await waitFor(() => {
      expect(screen.getByTestId('admin-cash-session-edit-note')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('admin-cash-session-edit-note'));
    const input = await screen.findByTestId('admin-cash-session-note-input');
    fireEvent.change(input, { target: { value: 'Note terrain' } });
    fireEvent.click(screen.getByTestId('admin-cash-session-save-note'));

    await waitFor(() => {
      expect(screen.getByText('Note terrain')).toBeTruthy();
    });
  });

  it('masque le bouton note sans permission vue admin', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes(`/v1/cash-sessions/${SESSION_ID}`)) {
        return Promise.resolve(
          new Response(JSON.stringify(sessionDetailJson()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      if (url.includes(`/v1/sales/${SALE_ID}`)) {
        const method = init?.method ?? 'GET';
        if (method === 'GET') {
          return Promise.resolve(
            new Response(JSON.stringify(saleJson(null)), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const keys = createDefaultDemoEnvelope().permissions.permissionKeys.filter(
      (k) => k !== TRANSVERSE_PERMISSION_ADMIN_VIEW,
    );
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u-op' },
      envelope: createDefaultDemoEnvelope({
        siteId: DEMO_AUTH_STUB_SITE_ID,
        permissions: { permissionKeys: keys },
      }),
    });

    window.history.pushState({}, '', `/admin/cash-sessions/${SESSION_ID}`);
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <AdminCashSessionDetailWidget />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-cash-session-sales-table')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId(`admin-cash-session-view-ticket-${SALE_ID}`));

    await waitFor(() => {
      expect(screen.getByText('Aucune note')).toBeTruthy();
    });
    expect(screen.queryByTestId('admin-cash-session-edit-note')).toBeNull();
  });
});
