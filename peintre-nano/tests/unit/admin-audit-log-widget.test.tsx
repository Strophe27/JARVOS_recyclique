// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { AdminAuditLogWidget } from '../../src/domains/admin-config/AdminAuditLogWidget';
import '../../src/styles/tokens.css';

const authStub: AuthContextPort = {
  getSession: () => ({ authenticated: true, userId: 'u1', userDisplayLabel: 'Test' }),
  getContextEnvelope: () => ({
    schemaVersion: '1',
    siteId: '550e8400-e29b-41d4-a716-446655440000',
    activeRegisterId: null,
    permissions: { permissionKeys: ['transverse.admin.view'] },
    issuedAt: Date.now(),
    runtimeStatus: 'ok',
  }),
  getAccessToken: () => 'tok',
};

const samplePage = {
  entries: [
    {
      id: 'e1',
      timestamp: '2026-04-01T12:00:00.000Z',
      actor_username: 'alice',
      action_type: 'login_success',
      target_type: 'user',
      description: 'Connexion',
      ip_address: '127.0.0.1',
      details: { x: 1 },
    },
  ],
  pagination: {
    page: 1,
    page_size: 20,
    total_count: 1,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  },
  filters_applied: {},
};

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function wrap(ui: ReactElement) {
  return (
    <RootProviders authAdapter={authStub} disableUserPrefsPersistence>
      {ui}
    </RootProviders>
  );
}

describe('AdminAuditLogWidget', () => {
  it('affiche le tableau après GET /v1/admin/audit-log 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v1/admin/audit-log')) {
          return { ok: true, status: 200, text: async () => JSON.stringify(samplePage) };
        }
        return { ok: false, status: 404, text: async () => '{}' };
      }),
    );
    render(wrap(<AdminAuditLogWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(screen.getByTestId('admin-audit-log-table')).toBeTruthy();
    });
    expect(screen.getByRole('heading', { level: 1, name: /journal d'audit/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /actualiser/i })).toBeNull();
    const table = screen.getByTestId('admin-audit-log-table');
    expect(within(table).getByTestId('admin-audit-log-row-e1')).toBeTruthy();
    expect(screen.getByTestId('admin-audit-log-total').textContent).toContain('1 entrée');
    fireEvent.click(within(table).getByRole('button', { name: 'Voir les détails' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Navigateur')).toBeTruthy();
    expect(within(dialog).getByText('Détails', { exact: true })).toBeTruthy();
  });

  it('affiche une erreur défensive sur 403 sans contournement', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v1/admin/audit-log')) {
          return { ok: false, status: 403, text: async () => JSON.stringify({ detail: 'Interdit' }) };
        }
        return { ok: false, status: 404, text: async () => '{}' };
      }),
    );
    render(wrap(<AdminAuditLogWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(screen.getByTestId('admin-audit-log-error')).toBeTruthy();
    });
  });

  it('charge le journal des transactions après sélection de l\'onglet', async () => {
    const txPage = {
      entries: [
        {
          timestamp: '2026-04-01T12:00:00.000Z',
          event: 'TICKET_OPENED',
          user_id: 'u99',
          session_id: 'sess1',
        },
      ],
      pagination: {
        page: 1,
        page_size: 50,
        total_count: 1,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v1/admin/audit-log')) {
          return { ok: true, status: 200, text: async () => JSON.stringify(samplePage) };
        }
        if (url.includes('/v1/admin/transaction-logs')) {
          return { ok: true, status: 200, text: async () => JSON.stringify(txPage) };
        }
        return { ok: false, status: 404, text: async () => '{}' };
      }),
    );
    render(wrap(<AdminAuditLogWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(screen.getByTestId('admin-audit-log-table')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('admin-audit-log-tab-transactions'));
    await waitFor(() => {
      expect(screen.getByTestId('admin-transaction-logs-table')).toBeTruthy();
    });
    expect(screen.getByTestId('admin-transaction-logs-total').textContent).toContain('1 entrée');
  });

  it('affiche une erreur sur l\'onglet transactions si GET transaction-logs retourne 403', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v1/admin/audit-log')) {
          return { ok: true, status: 200, text: async () => JSON.stringify(samplePage) };
        }
        if (url.includes('/v1/admin/transaction-logs')) {
          return { ok: false, status: 403, text: async () => JSON.stringify({ detail: 'Interdit' }) };
        }
        return { ok: false, status: 404, text: async () => '{}' };
      }),
    );
    render(wrap(<AdminAuditLogWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(screen.getByTestId('admin-audit-log-table')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('admin-audit-log-tab-transactions'));
    await waitFor(() => {
      expect(screen.getByTestId('admin-transaction-logs-error')).toBeTruthy();
    });
  });
});
