// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminSystemHealthWidget } from '../../src/domains/admin-config/AdminSystemHealthWidget';
import { getDefaultDemoAuthAdapter } from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { fetchAdminHealthSystem, postAdminHealthTestNotifications } from '../../src/api/admin-system-health-client';
import { fetchLiveSnapshot } from '../../src/api/live-snapshot-client';
import '../../src/registry';

vi.mock('../../src/api/live-snapshot-client', () => ({
  fetchLiveSnapshot: vi.fn().mockResolvedValue({
    ok: true,
    snapshot: { observed_at: '2026-04-13T12:00:00Z', effective_open_state: 'open' },
    correlationId: 'test-corr',
    degradedEmpty: false,
  }),
}));

const { defaultFetchAdminHealthSystemPayload } = vi.hoisted(() => ({
  defaultFetchAdminHealthSystemPayload: {
    status: 'success' as const,
    system_health: {
      overall_status: 'healthy' as const,
      anomalies_detected: 0,
      critical_anomalies: 0,
      scheduler_running: false,
      active_tasks: 1,
      timestamp: '2026-04-13T12:00:00Z',
    },
    anomalies: {
      cash_anomalies: [],
      sync_anomalies: [],
      auth_anomalies: [],
      classification_anomalies: [],
      timestamp: '2026-04-13T12:00:00Z',
    },
    recommendations: [] as { type: string; priority: string; title: string; description: string; actions: unknown[] }[],
    scheduler_status: { running: false, tasks: [] as { name: string; enabled: boolean; last_run?: string }[], total_tasks: 0 },
  },
}));

vi.mock('../../src/api/admin-system-health-client', () => ({
  AdminSystemHealthApiError: class extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
      this.name = 'AdminSystemHealthApiError';
    }
  },
  fetchAdminHealthSystem: vi.fn().mockResolvedValue(defaultFetchAdminHealthSystemPayload),
  postAdminHealthTestNotifications: vi.fn().mockResolvedValue({
    status: 'unavailable',
    message: 'Fonction documentée comme désactivée sur le serveur.',
  }),
  fetchAdminSessionMetrics: vi.fn().mockResolvedValue({
    success: true,
    metrics: {
      total_operations: 0,
      refresh_success_count: 0,
      refresh_failure_count: 0,
      refresh_success_rate_percent: 0,
      logout_forced_count: 0,
      logout_manual_count: 0,
      active_sessions_estimate: 0,
      latency_metrics: {},
      error_breakdown: {},
      ip_breakdown: {},
      site_breakdown: {},
      time_period_hours: 24,
      timestamp: 1713000000,
    },
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
  fetchUnifiedLiveStats: vi.fn().mockResolvedValue({ tickets_open: 2, ca: 10.5 }),
}));

const { mockPostContextRefresh } = vi.hoisted(() => ({
  mockPostContextRefresh: vi.fn().mockResolvedValue({
    ok: true as const,
    envelope: {
      schemaVersion: '1',
      siteId: 'site-demo',
      activeRegisterId: null,
      cashSessionId: null,
      permissions: { permissionKeys: ['transverse.admin.view', 'caisse.sale_correct'] },
      issuedAt: Date.now(),
      runtimeStatus: 'ok' as const,
    },
  }),
}));

vi.mock('../../src/api/recyclique-auth-client', () => ({
  postRecycliqueContextEnvelopeRefresh: mockPostContextRefresh,
}));

const defaultLiveSnapshotResult = {
  ok: true as const,
  snapshot: { observed_at: '2026-04-13T12:00:00Z', effective_open_state: 'open' },
  correlationId: 'test-corr',
  degradedEmpty: false,
};

afterEach(() => {
  cleanup();
  vi.mocked(fetchLiveSnapshot).mockReset();
  vi.mocked(fetchLiveSnapshot).mockResolvedValue(defaultLiveSnapshotResult);
});

beforeEach(() => {
  vi.mocked(fetchAdminHealthSystem).mockReset();
  vi.mocked(fetchAdminHealthSystem).mockResolvedValue(defaultFetchAdminHealthSystemPayload);
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

describe('AdminSystemHealthWidget', () => {
  it('affiche le périmètre et les actions principales', async () => {
    const adapter = {
      ...getDefaultDemoAuthAdapter(),
      getAccessToken: () => 'test-token',
    };
    render(
      <RootProviders authAdapter={adapter}>
        <AdminSystemHealthWidget />
      </RootProviders>,
    );
    expect(await screen.findByTestId('admin-system-health-widget')).toBeTruthy();
    expect(screen.getByTestId('admin-system-health-page-title').textContent).toMatch(/Santé et signaux/i);
    expect(screen.getByTestId('admin-system-health-refresh-context')).toBeTruthy();
    expect(screen.getByTestId('admin-system-health-reload-signals')).toBeTruthy();
    expect(await screen.findByTestId('admin-system-health-legacy-panel')).toBeTruthy();
    expect(screen.getByText(/Synthèse santé \(super-admin\)/i)).toBeTruthy();
  });

  it('humanise les noms de tâches planifiées et formate les dates de diagnostic', async () => {
    const healthPayload = {
      status: 'success' as const,
      system_health: {
        overall_status: 'healthy' as const,
        anomalies_detected: 0,
        critical_anomalies: 0,
        scheduler_running: true,
        active_tasks: 1,
        timestamp: '2026-04-13T15:30:00.000Z',
      },
      anomalies: {
        cash_anomalies: [],
        sync_anomalies: [],
        auth_anomalies: [],
        classification_anomalies: [],
        timestamp: '2026-04-13T12:00:00Z',
      },
      recommendations: [],
      scheduler_status: {
        running: true,
        tasks: [{ name: 'anomaly_detection', enabled: true, last_run: '2026-04-13T14:00:00.000Z' }],
        total_tasks: 1,
      },
    };
    vi.mocked(fetchAdminHealthSystem).mockResolvedValue(healthPayload);
    const adapter = {
      ...getDefaultDemoAuthAdapter(),
      getAccessToken: () => 'test-token',
    };
    render(
      <RootProviders authAdapter={adapter}>
        <AdminSystemHealthWidget />
      </RootProviders>,
    );
    await screen.findByTestId('admin-system-health-legacy-panel');
    expect(screen.getByText(/Détection d'anomalies/)).toBeTruthy();
    expect(screen.queryByText(/anomaly_detection/)).toBeNull();
    expect(screen.queryByText('2026-04-13T15:30:00.000Z')).toBeNull();
    expect(screen.queryByText('2026-04-13T14:00:00.000Z')).toBeNull();
  });

  it('affiche les priorités de recommandation en français (contrat OpenAPI)', async () => {
    vi.mocked(fetchAdminHealthSystem).mockResolvedValue({
      status: 'success',
      system_health: {
        overall_status: 'healthy',
        anomalies_detected: 0,
        critical_anomalies: 0,
        scheduler_running: false,
        active_tasks: 0,
        timestamp: '2026-04-13T12:00:00Z',
      },
      anomalies: {
        cash_anomalies: [],
        sync_anomalies: [],
        auth_anomalies: [],
        classification_anomalies: [],
        timestamp: '2026-04-13T12:00:00Z',
      },
      recommendations: [
        {
          type: 'ops',
          priority: 'low',
          title: 'Vérifier les sauvegardes',
          description: 'Planifier une restauration test.',
          actions: [],
        },
        {
          type: 'ops',
          priority: 'high',
          title: 'Action urgente',
          description: 'À traiter.',
          actions: [],
        },
      ],
      scheduler_status: { running: false, tasks: [], total_tasks: 0 },
    });
    const adapter = {
      ...getDefaultDemoAuthAdapter(),
      getAccessToken: () => 'test-token',
    };
    render(
      <RootProviders authAdapter={adapter}>
        <AdminSystemHealthWidget />
      </RootProviders>,
    );
    await screen.findByTestId('admin-system-health-legacy-panel');
    expect(screen.getByText(/priorité faible/i)).toBeTruthy();
    expect(screen.getByText(/priorité haute/i)).toBeTruthy();
    expect(screen.queryByText(/\blow\b/i)).toBeNull();
    expect(screen.queryByText(/\bhigh\b/i)).toBeNull();
  });

  it('affiche les anomalies détaillées et les actions de recommandation', async () => {
    vi.mocked(fetchAdminHealthSystem).mockResolvedValue({
      status: 'success',
      system_health: {
        overall_status: 'degraded',
        anomalies_detected: 1,
        critical_anomalies: 0,
        scheduler_running: true,
        active_tasks: 2,
        timestamp: '2026-04-13T12:00:00Z',
      },
      anomalies: {
        cash_anomalies: [
          {
            type: 'latency',
            severity: 'high',
            description: 'Délai anormal sur une opération caisse',
            details: { hint: 'vérifier charge' },
          },
        ],
        sync_anomalies: [],
        timestamp: '2026-04-13T12:00:00Z',
      },
      recommendations: [
        {
          type: 'ops',
          priority: 'medium',
          title: 'Surveiller la file',
          description: 'Augmenter la vigilance.',
          actions: ['Ouvrir le journal des tickets', 'Contacter le site concerné'],
        },
      ],
      scheduler_status: {
        running: true,
        total_tasks: 1,
        tasks: [
          {
            name: 'cleanup',
            enabled: true,
            last_run: null,
            next_run: '2026-04-14T06:00:00Z',
            running: false,
            interval_minutes: 60,
          },
        ],
      },
    });
    const adapter = {
      ...getDefaultDemoAuthAdapter(),
      getAccessToken: () => 'test-token',
    };
    render(
      <RootProviders authAdapter={adapter}>
        <AdminSystemHealthWidget />
      </RootProviders>,
    );
    await screen.findByTestId('admin-system-health-anomalies');
    expect(screen.getByText(/Délai anormal sur une opération caisse/)).toBeTruthy();
    expect(screen.getByText(/Gravité élevée/)).toBeTruthy();
    expect(screen.getByText(/Ouvrir le journal des tickets/)).toBeTruthy();
    expect(screen.getByText(/prochaine fenêtre/)).toBeTruthy();
  });

  it('affiche la réponse serveur après le contrôle test-notifications', async () => {
    const adapter = {
      ...getDefaultDemoAuthAdapter(),
      getAccessToken: () => 'test-token',
    };
    render(
      <RootProviders authAdapter={adapter}>
        <AdminSystemHealthWidget />
      </RootProviders>,
    );
    await screen.findByTestId('admin-system-health-test-notifications');
    fireEvent.click(screen.getByTestId('admin-system-health-test-notifications'));
    expect(await screen.findByText(/Fonction documentée comme désactivée sur le serveur/)).toBeTruthy();
    expect(vi.mocked(postAdminHealthTestNotifications)).toHaveBeenCalled();
  });

  it('abrège les UUID de corrélation tout en gardant la valeur complète au survol', async () => {
    const fullCorr = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    /** StrictMode : deux montages — `mockResolvedValueOnce` laissait le 2e appel sur le défaut `test-corr`. */
    vi.mocked(fetchLiveSnapshot).mockResolvedValue({
      ok: true,
      snapshot: { observed_at: '2026-04-13T12:00:00Z', effective_open_state: 'open' },
      correlationId: fullCorr,
      degradedEmpty: false,
    });
    const adapter = {
      ...getDefaultDemoAuthAdapter(),
      getAccessToken: () => 'test-token',
    };
    render(
      <RootProviders authAdapter={adapter}>
        <AdminSystemHealthWidget />
      </RootProviders>,
    );
    await screen.findByTestId('admin-system-health-widget');
    const refLine = screen.getByTitle(new RegExp(fullCorr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    expect(refLine).toBeTruthy();
    expect(refLine.textContent).toMatch(/aaaaaaaa…eeee/);
  });
});
