import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAdminHealthSystem,
  fetchAdminSessionMetrics,
  postAdminHealthTestNotifications,
} from '../../src/api/admin-system-health-client';

describe('admin-system-health-client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetchAdminHealthSystem parse la réponse 200', async () => {
    const payload = {
      status: 'success',
      system_health: {
        overall_status: 'healthy',
        anomalies_detected: 0,
        critical_anomalies: 0,
        scheduler_running: true,
        active_tasks: 2,
        timestamp: '2026-04-13T12:00:00Z',
      },
      anomalies: {},
      recommendations: [],
      scheduler_status: { running: true, tasks: [], total_tasks: 0 },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        expect(url).toMatch(/\/v1\/admin\/health$/);
        return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }),
    );

    const auth = { getAccessToken: () => 'tok' };
    const r = await fetchAdminHealthSystem(auth);
    expect(r.system_health.active_tasks).toBe(2);
  });

  it('postAdminHealthTestNotifications parse la réponse 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        expect(url).toMatch(/\/v1\/admin\/health\/test-notifications$/);
        expect(init?.method).toBe('POST');
        return new Response(
          JSON.stringify({ status: 'unavailable', message: 'Aucun envoi (documenté).' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );
    const auth = { getAccessToken: () => 'tok' };
    const r = await postAdminHealthTestNotifications(auth);
    expect(r.status).toBe('unavailable');
    expect(r.message).toMatch(/Aucun envoi/);
  });

  it('fetchAdminSessionMetrics lève AdminSystemHealthApiError sur 403', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ detail: 'Interdit' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    await expect(
      fetchAdminSessionMetrics({ getAccessToken: () => 'x' }, { hours: 24 }),
    ).rejects.toMatchObject({ name: 'AdminSystemHealthApiError', status: 403 });
  });
});
