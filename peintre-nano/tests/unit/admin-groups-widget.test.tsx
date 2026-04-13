// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { AdminGroupsWidget } from '../../src/domains/admin-config/AdminGroupsWidget';
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

const groupId = '11111111-1111-1111-1111-111111111111';

const listSample = [
  {
    id: groupId,
    key: 'test-group',
    name: 'Groupe test',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    user_ids: [],
    permission_ids: [],
  },
];

const detailSample = {
  id: groupId,
  key: 'test-group',
  name: 'Groupe test',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  users: [{ id: 'u-1', username: 'alice', role: 'user', email: 'alice@example.org' }],
  permissions: [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      name: 'caisse.access',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
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

describe('AdminGroupsWidget', () => {
  it('affiche le tableau après GET /v1/admin/groups/ 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v1/admin/groups/') && !url.match(/\/v1\/admin\/groups\/[0-9a-f-]{36}/i)) {
          return { ok: true, status: 200, text: async () => JSON.stringify(listSample) };
        }
        return { ok: false, status: 404, text: async () => '{}' };
      }),
    );
    render(wrap(<AdminGroupsWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(screen.getByTestId('admin-groups-table')).toBeTruthy();
    });
    const table = screen.getByTestId('admin-groups-table');
    expect(within(table).getByTestId(`admin-groups-row-${groupId}`)).toBeTruthy();
    expect(screen.getByText('Groupe test')).toBeTruthy();
  });

  it('ouvre le détail avec onglets et libellé lisible pour un droit connu', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes(`/v1/admin/groups/${groupId}`) && !url.includes('/permissions') && !url.includes('/users')) {
          return { ok: true, status: 200, text: async () => JSON.stringify(detailSample) };
        }
        if (url.includes('/v1/admin/groups/') && !url.match(/\/v1\/admin\/groups\/[0-9a-f-]{36}/i)) {
          return { ok: true, status: 200, text: async () => JSON.stringify(listSample) };
        }
        return { ok: false, status: 404, text: async () => '{}' };
      }),
    );
    render(wrap(<AdminGroupsWidget widgetProps={{}} />));
    await waitFor(() => expect(screen.getByTestId(`admin-groups-row-${groupId}`)).toBeTruthy());
    const row = screen.getByTestId(`admin-groups-row-${groupId}`);
    fireEvent.click(within(row).getByRole('button', { name: /^Modifier /i }));
    await waitFor(() => expect(screen.getByTestId('admin-groups-detail-tabs')).toBeTruthy());
    fireEvent.click(screen.getByRole('tab', { name: /Droits/i }));
    await waitFor(() => {
      expect(screen.getByTestId('admin-groups-detail-permissions')).toBeTruthy();
      expect(screen.getByText('Caisse')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('tab', { name: /Membres/i }));
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeTruthy();
      expect(screen.getByText('alice@example.org')).toBeTruthy();
    });
  });

  it('affiche une erreur défensive sur 403 sans contournement', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ detail: 'Accès refusé' }),
      })),
    );
    render(wrap(<AdminGroupsWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-error-http-status').textContent).toContain('403');
    });
  });
});
