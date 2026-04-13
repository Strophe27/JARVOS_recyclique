// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getDefaultDemoAuthAdapter } from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { AdminLegacyDashboardHomeWidget } from '../../src/widgets/admin/AdminLegacyDashboardHomeWidget';

const { spaNavigateMock, fetchMeMock, fetchStatusesMock, fetchUsersListMock } = vi.hoisted(() => ({
  spaNavigateMock: vi.fn(),
  fetchMeMock: vi.fn(),
  fetchStatusesMock: vi.fn(),
  fetchUsersListMock: vi.fn(),
}));

vi.mock('../../src/app/demo/spa-navigate', () => ({
  spaNavigateTo: (path: string) => {
    spaNavigateMock(path);
  },
}));

vi.mock('../../src/api/admin-legacy-dashboard-client', () => ({
  fetchUsersMeForAdminDashboard: (...args: unknown[]) => fetchMeMock(...args),
  fetchAdminUserStatuses: (...args: unknown[]) => fetchStatusesMock(...args),
  fetchUsersListForAdminDashboard: (...args: unknown[]) => fetchUsersListMock(...args),
}));

vi.mock('../../src/api/cash-session-client', () => ({
  getCurrentOpenCashSession: vi.fn().mockResolvedValue({ ok: true as const, session: null }),
}));

vi.mock('../../src/api/reception-client', () => ({
  getReceptionTicketsList: vi.fn().mockResolvedValue({
    ok: true as const,
    data: { tickets: [], total: 0, page: 1, per_page: 100, total_pages: 0 },
  }),
}));

vi.mock('../../src/api/dashboard-legacy-stats-client', () => ({
  DashboardLegacyApiError: class extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
  },
  fetchCashSessionStatsSummary: vi.fn().mockResolvedValue({
    total_sales: 0,
    total_donations: 0,
    total_weight_sold: 0,
  }),
  fetchReceptionStatsSummary: vi.fn().mockResolvedValue({ total_weight: 0 }),
}));

function setupDefaultMeAndUsers() {
  fetchMeMock.mockResolvedValue({ role: 'super-admin' });
  fetchStatusesMock.mockResolvedValue([
    { user_id: 'u1', is_online: true, last_login: '2026-04-13T10:00:00.000Z' },
  ]);
  fetchUsersListMock.mockResolvedValue([
    { id: 'u1', username: 'alice', first_name: 'Alice', last_name: 'Test', role: 'admin' },
  ]);
}

afterEach(() => {
  cleanup();
  spaNavigateMock.mockClear();
  fetchMeMock.mockReset();
  fetchStatusesMock.mockReset();
  fetchUsersListMock.mockReset();
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

describe('AdminLegacyDashboardHomeWidget', () => {
  it('super-admin : tuiles santé, paramètres et sites déclenchent la navigation SPA attendue', async () => {
    setupDefaultMeAndUsers();
    const adapter = {
      ...getDefaultDemoAuthAdapter(),
      getAccessToken: () => 'test-token',
    };
    render(
      <RootProviders authAdapter={adapter}>
        <AdminLegacyDashboardHomeWidget widgetProps={{}} />
      </RootProviders>,
    );
    expect(await screen.findByTestId('admin-legacy-dashboard-home')).toBeTruthy();
    expect(await screen.findByText(/Administration Super-Admin/i)).toBeTruthy();

    fireEvent.click(screen.getByTestId('admin-legacy-nav-system-health'));
    fireEvent.click(screen.getByTestId('admin-legacy-nav-advanced-settings'));
    fireEvent.click(screen.getByTestId('admin-legacy-nav-sites-and-registers'));

    expect(spaNavigateMock.mock.calls).toEqual([
      ['/admin/health'],
      ['/admin/settings'],
      ['/admin/sites-and-registers'],
    ]);
  });

  it('rôle non super-admin : pas de section super-admin ; toggles notifications et utilisateurs avec ARIA cohérents', async () => {
    fetchMeMock.mockResolvedValue({ role: 'admin' });
    fetchStatusesMock.mockResolvedValue([
      { user_id: 'u1', is_online: true, last_login: '2026-04-13T10:00:00.000Z' },
    ]);
    fetchUsersListMock.mockResolvedValue([
      { id: 'u1', username: 'bob', first_name: 'Bob', last_name: 'Op', role: 'operator' },
    ]);
    const adapter = {
      ...getDefaultDemoAuthAdapter(),
      getAccessToken: () => 'test-token',
    };
    render(
      <RootProviders authAdapter={adapter}>
        <AdminLegacyDashboardHomeWidget widgetProps={{}} />
      </RootProviders>,
    );
    await screen.findByTestId('admin-legacy-dashboard-home');

    expect(screen.queryByTestId('admin-legacy-nav-system-health')).toBeNull();
    expect(screen.queryByText(/Administration Super-Admin/i)).toBeNull();

    const notifToggle = screen.getByRole('button', { name: /Voir les notifications/i });
    expect(notifToggle.getAttribute('aria-expanded')).toBe('false');
    expect(notifToggle.getAttribute('aria-controls')).toBe('admin-legacy-dashboard-notifications-panel');
    fireEvent.click(notifToggle);
    expect(notifToggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('admin-legacy-dashboard-notifications-panel')).toBeTruthy();

    const usersToggle = screen.getByRole('button', { name: /Voir les utilisateurs connectés/i });
    expect(usersToggle.getAttribute('aria-expanded')).toBe('false');
    expect(usersToggle.getAttribute('aria-controls')).toBe('admin-legacy-dashboard-connected-users-panel');
    fireEvent.click(usersToggle);
    expect(usersToggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('admin-legacy-dashboard-connected-users-panel')).toBeTruthy();
  });
});
