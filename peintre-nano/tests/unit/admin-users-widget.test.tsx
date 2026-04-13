// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { AdminUsersWidget } from '../../src/domains/admin-config/AdminUsersWidget';
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

const userRow = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  username: 'volunteer1',
  first_name: 'Jean',
  last_name: 'Dupont',
  full_name: 'Jean Dupont',
  role: 'user',
  status: 'approved',
  is_active: true,
  site_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
};

const statusesBundle = {
  user_statuses: [
    {
      user_id: userRow.id,
      is_online: true,
      last_login: '2026-01-02T08:00:00.000Z',
      minutes_since_login: 5,
    },
  ],
  total_count: 1,
  online_count: 1,
  offline_count: 0,
  timestamp: '2026-01-02T09:00:00.000Z',
};

const userDetail = {
  id: userRow.id,
  username: 'volunteer1',
  first_name: 'Jean',
  last_name: 'Dupont',
  email: 'jean@example.com',
  phone_number: '0612345678',
  address: '1 rue Test',
  notes: 'Note test',
  skills: 'Tri',
  availability: 'Mercredi',
  role: 'user',
  status: 'approved',
  is_active: true,
  site_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
};

const groupRow = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  key: 'vol',
  name: 'Bénévoles',
  display_name: 'Volontaires',
  site_id: null,
  description: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  user_ids: [userRow.id],
  permission_ids: [],
};

const historyPage = {
  user_id: userRow.id,
  events: [
    {
      id: 'ev1',
      event_type: 'LOGIN',
      description: 'Connexion enregistrée',
      date: '2026-01-02T10:00:00.000Z',
      metadata: null,
    },
  ],
  total_count: 1,
  page: 1,
  limit: 20,
  has_next: false,
  has_prev: false,
};

function okJson(body: unknown, status = 200) {
  const bodyStr = JSON.stringify(body);
  return {
    ok: true,
    status,
    text: async () => bodyStr,
    json: async () => JSON.parse(bodyStr) as unknown,
  };
}

function fetchCallUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
}

function fetchCallMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return (
    init?.method ?? (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')
  ).toUpperCase();
}

function postUrlsContaining(fetchMock: ReturnType<typeof adminUsersFetchMock>, needle: string): boolean {
  return fetchMock.mock.calls.some(([inp, init]) => {
    const m = fetchCallMethod(inp as RequestInfo, init as RequestInit | undefined);
    return m === 'POST' && fetchCallUrl(inp as RequestInfo).includes(needle);
  });
}

function adminUsersFetchMock(opts?: { readonly meRole?: string }): typeof fetch {
  const meRole = opts?.meRole ?? 'admin';
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (
      init?.method ??
      (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')
    ).toUpperCase();
    if (url.includes('/v1/users/me')) return okJson({ role: meRole });
    if (url.includes('/v1/admin/users/statuses')) return okJson(statusesBundle);
    if (url.includes('/v1/admin/groups')) return okJson([groupRow]);
    if (url.includes('/history')) return okJson(historyPage);
    if (method === 'POST' && url.includes('/reset-password')) {
      return okJson({ message: 'E-mail de réinitialisation envoyé', success: true });
    }
    if (method === 'POST' && url.includes('/reset-pin')) {
      return okJson({ message: 'PIN réinitialisé', user_id: userRow.id, username: 'volunteer1' });
    }
    if (method === 'POST' && url.includes('/force-password')) {
      return okJson({ message: 'Mot de passe mis à jour', success: true });
    }
    if (url.includes(`/v1/users/${userRow.id}`)) return okJson(userDetail);
    if (url.includes('/v1/admin/users') && !url.includes('/statuses') && !url.includes('/history')) {
      return okJson([userRow]);
    }
    return { ok: false, status: 404, text: async () => '{}' };
  }) as unknown as typeof fetch;
}

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
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

describe('AdminUsersWidget', () => {
  it('affiche le tableau apres GET /v1/admin/users 200', async () => {
    vi.stubGlobal('fetch', adminUsersFetchMock());
    render(wrap(<AdminUsersWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(screen.getByTestId('admin-users-table')).toBeTruthy();
    });
    expect(screen.getByRole('heading', { name: /Gestion des Utilisateurs/i })).toBeTruthy();
    const table = screen.getByTestId('admin-users-table');
    await waitFor(() => {
      expect(within(table).getByTestId(`admin-users-row-${userRow.id}`)).toBeTruthy();
    });
    expect(screen.getByText('Jean Dupont')).toBeTruthy();
    expect(within(table).getByText("Statut d'activité")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId('admin-users-presence-summary')).toBeTruthy();
    });
    expect(screen.getByText('Statuts en ligne')).toBeTruthy();
  });

  it('affiche le panneau fiche au clic sur une ligne', async () => {
    vi.stubGlobal('fetch', adminUsersFetchMock());
    render(wrap(<AdminUsersWidget widgetProps={{}} />));
    await waitFor(() => screen.getByTestId(`admin-users-row-${userRow.id}`));
    fireEvent.click(screen.getByTestId(`admin-users-row-${userRow.id}`));
    await waitFor(() => {
      expect(screen.getByTestId('admin-users-detail-name').textContent).toContain('Jean Dupont');
    });
    await waitFor(() => {
      expect(screen.getByText('jean@example.com')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByTestId('admin-users-detail-groups')).toBeTruthy();
    });
    expect(screen.getByText('Volontaires')).toBeTruthy();
  });

  it('affiche une erreur defensive sur 403', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ detail: 'Accès refusé' }),
      })),
    );
    render(wrap(<AdminUsersWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(screen.getByTestId('cashflow-error-http-status').textContent).toContain('403');
    });
  });

  it("charge l'historique depuis l'onglet Historique", async () => {
    vi.stubGlobal('fetch', adminUsersFetchMock());
    render(wrap(<AdminUsersWidget widgetProps={{}} />));
    await waitFor(() => screen.getByTestId(`admin-users-row-${userRow.id}`));
    fireEvent.click(screen.getByTestId(`admin-users-row-${userRow.id}`));
    await waitFor(() => screen.getByRole('tab', { name: /Historique/i }));
    fireEvent.click(screen.getByRole('tab', { name: /Historique/i }));
    await waitFor(() => {
      expect(screen.getByTestId('admin-users-history-list')).toBeTruthy();
    });
    expect(screen.getByText('Connexion enregistrée')).toBeTruthy();
  });

  it('affiche le forçage mot de passe pour super-admin (GET /v1/users/me)', async () => {
    vi.stubGlobal('fetch', adminUsersFetchMock({ meRole: 'super-admin' }));
    render(wrap(<AdminUsersWidget widgetProps={{}} />));
    await waitFor(() => screen.getByTestId(`admin-users-row-${userRow.id}`));
    fireEvent.click(screen.getByTestId(`admin-users-row-${userRow.id}`));
    await waitFor(() => {
      expect(screen.getByTestId('admin-users-force-password-open')).toBeTruthy();
    });
  });

  it('déclenche POST reset-password depuis la fiche', async () => {
    const fetchMock = adminUsersFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    render(wrap(<AdminUsersWidget widgetProps={{}} />));
    await waitFor(() => screen.getByTestId(`admin-users-row-${userRow.id}`));
    fireEvent.click(screen.getByTestId(`admin-users-row-${userRow.id}`));
    await waitFor(() => screen.getByTestId('admin-users-reset-password'));
    fireEvent.click(screen.getByTestId('admin-users-reset-password'));
    await waitFor(() => {
      expect(screen.getByTestId('admin-users-feedback').textContent).toContain('E-mail');
    });
    expect(postUrlsContaining(fetchMock, 'reset-password')).toBe(true);
  });

  it('affiche la grille locale et bloque la création si le mot de passe est incomplet', async () => {
    vi.stubGlobal('fetch', adminUsersFetchMock());
    render(wrap(<AdminUsersWidget widgetProps={{}} />));
    fireEvent.click(screen.getByTestId('admin-users-create-open'));
    const dlg = await screen.findByRole('dialog', { name: /Créer un utilisateur/i });
    fireEvent.change(within(dlg).getByRole('textbox', { name: /Identifiant/i }), { target: { value: 'nouveau_user' } });
    const pwdField = within(dlg).getByTestId('admin-users-create-password');
    const pwdInput = pwdField instanceof HTMLInputElement ? pwdField : pwdField.querySelector('input');
    expect(pwdInput).toBeTruthy();
    fireEvent.change(pwdInput!, { target: { value: 'password' } });
    await waitFor(() => {
      expect(within(dlg).getByTestId('admin-users-create-password-policy')).toBeTruthy();
    });
    const submit = within(dlg).getByTestId('admin-users-create-submit') as HTMLButtonElement;
    expect(submit.disabled || submit.getAttribute('data-disabled') === 'true').toBe(true);
  });

  it('déclenche POST reset-pin après confirmation', async () => {
    const fetchMock = adminUsersFetchMock();
    vi.stubGlobal('fetch', fetchMock);
    render(wrap(<AdminUsersWidget widgetProps={{}} />));
    await waitFor(() => screen.getByTestId(`admin-users-row-${userRow.id}`));
    fireEvent.click(screen.getByTestId(`admin-users-row-${userRow.id}`));
    await waitFor(() => screen.getByTestId('admin-users-reset-pin-open'));
    fireEvent.click(screen.getByTestId('admin-users-reset-pin-open'));
    await waitFor(() => screen.getByTestId('admin-users-reset-pin-confirm'));
    fireEvent.click(screen.getByTestId('admin-users-reset-pin-confirm'));
    await waitFor(() => {
      expect(screen.getByTestId('admin-users-feedback').textContent).toContain('PIN');
    });
    expect(postUrlsContaining(fetchMock, 'reset-pin')).toBe(true);
  });

  it('déclenche POST force-password depuis la modale super-admin', async () => {
    const fetchMock = adminUsersFetchMock({ meRole: 'super-admin' });
    vi.stubGlobal('fetch', fetchMock);
    render(wrap(<AdminUsersWidget widgetProps={{}} />));
    await waitFor(() => screen.getByTestId(`admin-users-row-${userRow.id}`));
    fireEvent.click(screen.getByTestId(`admin-users-row-${userRow.id}`));
    await waitFor(() => screen.getByTestId('admin-users-force-password-open'));
    fireEvent.click(screen.getByTestId('admin-users-force-password-open'));
    await waitFor(() => screen.getByTestId('admin-users-force-password-field'));
    fireEvent.change(screen.getByTestId('admin-users-force-password-field'), { target: { value: 'Valid1!x' } });
    fireEvent.change(screen.getByTestId('admin-users-force-password-confirm'), { target: { value: 'Valid1!x' } });
    fireEvent.click(screen.getByTestId('admin-users-force-password-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('admin-users-feedback').textContent).toMatch(/mot de passe|mis à jour|succès/i);
    });
    expect(postUrlsContaining(fetchMock, 'force-password')).toBe(true);
  });
});
