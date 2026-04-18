// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthRuntimeProvider } from '../../src/app/auth/AuthRuntimeProvider';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import { LegacyDashboardWorkspaceWidget } from '../../src/widgets/demo/LegacyDashboardWorkspaceWidget';
import '../../src/styles/tokens.css';

const authStub: AuthContextPort = {
  getSession: () => ({ authenticated: true, userId: 'test-user', userDisplayLabel: 'Marie Curie' }),
  getContextEnvelope: () => ({
    schemaVersion: '1',
    siteId: '550e8400-e29b-41d4-a716-446655440000',
    activeRegisterId: null,
    permissions: { permissionKeys: ['transverse.dashboard.view'] },
    issuedAt: Date.now(),
    runtimeStatus: 'ok',
  }),
  getAccessToken: () => 'test-token',
};

const emptyCash = {
  total_sessions: 0,
  open_sessions: 0,
  closed_sessions: 0,
  total_sales: 0,
  total_items: 0,
  number_of_sales: 0,
  total_donations: 0,
  total_weight_sold: 0,
};

function mockDashboardFetch(payload: {
  cash?: Record<string, unknown>;
  reception?: Record<string, unknown>;
  receptionByCat?: unknown[];
  salesByCat?: unknown[];
  categories?: unknown[];
  cashStatus?: number;
  receptionStatus?: number;
}) {
  const {
    cash = emptyCash,
    reception = { total_weight: 0, total_items: 0 },
    receptionByCat = [],
    salesByCat = [],
    categories = [{ name: 'Livres', parent_id: null }],
    cashStatus = 200,
    receptionStatus = 200,
  } = payload;

  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/v1/categories/')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(categories),
      };
    }
    if (url.includes('/v1/cash-sessions/stats/summary')) {
      return {
        ok: cashStatus < 400,
        status: cashStatus,
        text: async () =>
          cashStatus >= 400 ? JSON.stringify({ detail: 'Forbidden' }) : JSON.stringify(cash),
      };
    }
    if (url.includes('/v1/stats/reception/summary')) {
      return {
        ok: receptionStatus < 400,
        status: receptionStatus,
        text: async () =>
          receptionStatus >= 400 ? JSON.stringify({ detail: 'err' }) : JSON.stringify(reception),
      };
    }
    if (url.includes('/v1/stats/reception/by-category')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(receptionByCat),
      };
    }
    if (url.includes('/v1/stats/sales/by-category')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(salesByCat),
      };
    }
    return {
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ detail: 'unexpected ' + url }),
    };
  });
}

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
  return <AuthRuntimeProvider adapter={authStub}>{ui}</AuthRuntimeProvider>;
}

describe('LegacyDashboardWorkspaceWidget — API legacy (UnifiedDashboard)', () => {
  it('affiche les KPI ventes / réception issus des endpoints v1', async () => {
    vi.stubGlobal(
      'fetch',
      mockDashboardFetch({
        cash: { ...emptyCash, total_sales: 100.5, total_donations: 2.25, total_weight_sold: 4.2 },
        reception: { total_weight: 10.2, total_items: 7 },
        receptionByCat: [{ category_name: 'Livres', total_weight: 5, total_items: 3 }],
        salesByCat: [{ category_name: 'Livres', total_weight: 1, total_items: 2 }],
      }),
    );

    render(wrap(<LegacyDashboardWorkspaceWidget widgetProps={{}} />));

    await waitFor(() => {
      expect(screen.getByTestId('stat-sales-revenue').textContent).toContain('100.50');
    });
    expect(screen.getByTestId('stat-sales-donations').textContent).toContain('2.25');
    expect(screen.getByTestId('stat-sales-weight').textContent).toContain('4.2');
    expect(screen.getByTestId('stat-reception-weight').textContent).toContain('10.2');
    expect(screen.getByTestId('stat-reception-items').textContent).toContain('7');
    expect(screen.getByTestId('widget-legacy-dashboard-workspace').getAttribute('data-dashboard-kpi-source')).toBe(
      'legacy-api',
    );
    expect(screen.getByTestId('legacy-dashboard-chart-reception-bar')).toBeTruthy();
    expect(screen.getByTestId('legacy-dashboard-chart-sales-bar')).toBeTruthy();
  });

  it('affiche le libellé utilisateur dans le titre lorsque la session le fournit', async () => {
    vi.stubGlobal('fetch', mockDashboardFetch({}));
    render(wrap(<LegacyDashboardWorkspaceWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Bienvenue sur RecyClique, Marie Curie/ })).toBeTruthy();
    });
  });

  it('403 : message orienté dashboard personnel', async () => {
    vi.stubGlobal(
      'fetch',
      mockDashboardFetch({
        cashStatus: 403,
        receptionStatus: 403,
      }),
    );
    render(wrap(<LegacyDashboardWorkspaceWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(screen.getByText(/permissions nécessaires/i)).toBeTruthy();
      expect(screen.getByTestId('widget-legacy-dashboard-workspace').getAttribute('data-dashboard-kpi-source')).toBe(
        'legacy-api-error',
      );
    });
  });

  it('filtre « Cette semaine » met à jour le preset et rappelle les stats', async () => {
    const fn = mockDashboardFetch({});
    vi.stubGlobal('fetch', fn);
    render(wrap(<LegacyDashboardWorkspaceWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(fn.mock.calls.length).toBeGreaterThan(4);
    });
    const before = fn.mock.calls.length;
    fireEvent.click(screen.getByTestId('filter-week'));
    await waitFor(() => {
      expect(screen.getByTestId('widget-legacy-dashboard-workspace').getAttribute('data-period-preset')).toBe('week');
    });
    expect(fn.mock.calls.length).toBeGreaterThan(before);
    const lastCashCall = [...fn.mock.calls].reverse().find((c) => String(c[0]).includes('cash-sessions/stats/summary'));
    expect(lastCashCall).toBeTruthy();
    const url = String(lastCashCall![0]);
    expect(url).toMatch(/date_from=/);
    expect(url).toMatch(/date_to=/);
  });

  it('lien dashboard personnel : href depuis le manifeste', async () => {
    vi.stubGlobal('fetch', mockDashboardFetch({}));
    render(
      wrap(
        <LegacyDashboardWorkspaceWidget
          widgetProps={{ personalDashboardPath: '/dashboard/benevole' }}
        />,
      ),
    );
    await waitFor(() => {
      expect(screen.getByTestId('legacy-dashboard-personal-btn').getAttribute('href')).toBe('/dashboard/benevole');
    });
  });

  it('plage vide réception : message d’état vide', async () => {
    vi.stubGlobal(
      'fetch',
      mockDashboardFetch({
        receptionByCat: [],
        salesByCat: [],
      }),
    );
    render(wrap(<LegacyDashboardWorkspaceWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(screen.getByTestId('legacy-dashboard-empty-reception-categories')).toBeTruthy();
    });
    expect(
      within(screen.getByTestId('legacy-dashboard-empty-reception-categories')).getByText(
        /Aucune donnée de catégorie/,
      ),
    ).toBeTruthy();
  });

  it('réception avec données mais ventes par catégorie vides : message sorties + pas de graphiques ventes', async () => {
    vi.stubGlobal(
      'fetch',
      mockDashboardFetch({
        receptionByCat: [{ category_name: 'Livres', total_weight: 3, total_items: 2 }],
        salesByCat: [],
      }),
    );
    render(wrap(<LegacyDashboardWorkspaceWidget widgetProps={{}} />));
    await waitFor(() => {
      expect(screen.getByTestId('legacy-dashboard-chart-reception-bar')).toBeTruthy();
    });
    expect(screen.queryByTestId('legacy-dashboard-chart-sales-bar')).toBeNull();
    await waitFor(() => {
      expect(screen.getByTestId('legacy-dashboard-empty-sales-categories')).toBeTruthy();
    });
    expect(
      within(screen.getByTestId('legacy-dashboard-empty-sales-categories')).getByText(
        /Aucune donnée de vente par catégorie/,
      ),
    ).toBeTruthy();
  });
});
