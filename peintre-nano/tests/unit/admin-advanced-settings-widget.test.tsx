// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { AdminAdvancedSettingsWidget } from '../../src/domains/admin-config/AdminAdvancedSettingsWidget';
import '../../src/styles/tokens.css';

const authStub: AuthContextPort = {
  getSession: () => ({ authenticated: true, userId: 'u1', userDisplayLabel: 'Test' }),
  getContextEnvelope: () => ({
    schemaVersion: '1',
    siteId: '550e8400-e29b-41d4-a716-446655440000',
    activeRegisterId: null,
    permissions: { permissionKeys: ['transverse.admin.view', 'caisse.sale_correct'] },
    issuedAt: Date.now(),
    runtimeStatus: 'ok',
  }),
  getAccessToken: () => 'tok',
};

function okJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const siteId = '550e8400-e29b-41d4-a716-446655440000';
const registerId = '660e8400-e29b-41d4-a716-446655440000';

function okSettingsSupportJson(url: string): Response | null {
  if (url.includes('/v1/sites/')) {
    return okJson([
      {
        id: siteId,
        name: 'Site principal',
        city: 'Lyon',
        address: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      },
    ]);
  }
  if (url.includes('/v1/cash-registers/')) {
    return okJson([
      {
        id: registerId,
        name: 'Caisse 1',
        location: 'Entrée',
        site_id: siteId,
        is_active: true,
        workflow_options: {},
        enable_virtual: false,
        enable_deferred: false,
      },
    ]);
  }
  if (url.includes('/v1/admin/paheko-mappings/cash-session-close')) {
    return okJson({ data: [], total: 0, skip: 0, limit: 200 });
  }
  return null;
}

function wrap(ui: ReactElement) {
  return <RootProviders authAdapter={authStub}>{ui}</RootProviders>;
}

describe('AdminAdvancedSettingsWidget', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as typeof ResizeObserver;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('charge GET session et enregistre via PUT', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const supportRes = okSettingsSupportJson(url);
      if (supportRes) return supportRes;
      expect(url).toContain('/v1/admin/settings/session');
      const method = init?.method ?? 'GET';
      if (method === 'PUT') {
        expect(JSON.parse(String(init?.body))).toEqual({ token_expiration_minutes: 120 });
        return okJson({ token_expiration_minutes: 120 });
      }
      return okJson({ token_expiration_minutes: 360 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(wrap(<AdminAdvancedSettingsWidget widgetProps={{}} />));

    await waitFor(() => {
      expect(screen.getByTestId('admin-advanced-settings-token-minutes')).toBeTruthy();
    });

    const input = screen.getByTestId('admin-advanced-settings-token-minutes');
    fireEvent.change(input, { target: { value: '120' } });

    fireEvent.click(screen.getByTestId('admin-advanced-settings-save'));

    await waitFor(() => {
      expect(screen.getByText('Les paramètres de session ont été mis à jour.')).toBeTruthy();
    });

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('affiche l’erreur API en chargement', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const supportRes = okSettingsSupportJson(url);
        if (supportRes) return supportRes;
        if (url.includes('/v1/admin/settings/session')) {
          return okJson({ detail: 'Accès refusé', code: 'FORBIDDEN' }, 403);
        }
        if (url.includes('/v1/admin/settings/email')) {
          return okJson({ from_name: '', from_address: '', has_api_key: false });
        }
        if (url.includes('/v1/admin/settings/activity-threshold')) {
          return okJson({ activity_threshold_minutes: 15 });
        }
        if (url.includes('/v1/admin/settings/alert-thresholds')) {
          return okJson({ thresholds: { cashDiscrepancy: 1, lowInventory: 2 } });
        }
        return okJson({}, 404);
      }),
    );

    render(wrap(<AdminAdvancedSettingsWidget widgetProps={{}} />));

    await waitFor(() => {
      expect(screen.getByTestId('admin-advanced-settings-token-minutes')).toBeTruthy();
    });
    expect(screen.getByText('Accès refusé')).toBeTruthy();
  });

  it('section base de données : export POST avec X-Step-Up-Pin', async () => {
    const blob = new Blob([Uint8Array.from([1, 2, 3])], { type: 'application/octet-stream' });
    const auditPage = {
      entries: [],
      pagination: {
        page: 1,
        page_size: 10,
        total_count: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
      },
      filters_applied: { action_type: 'db_import' },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const supportRes = okSettingsSupportJson(url);
      if (supportRes) return supportRes;
      if (url.includes('/v1/admin/audit-log')) {
        expect(url).toContain('action_type=db_import');
        return okJson(auditPage);
      }
      if (url.includes('/v1/admin/db/export')) {
        expect(init?.method).toBe('POST');
        const h = new Headers(init?.headers as HeadersInit);
        expect(h.get('X-Step-Up-Pin')).toBe('9999');
        return new Response(blob, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': 'attachment; filename="snap.dump"',
          },
        });
      }
      if (url.includes('/v1/admin/settings/session')) {
        return okJson({ token_expiration_minutes: 360 });
      }
      if (url.includes('/v1/admin/settings/email')) {
        return okJson({ from_name: '', from_address: '', has_api_key: false });
      }
      if (url.includes('/v1/admin/settings/activity-threshold')) {
        return okJson({ activity_threshold_minutes: 30 });
      }
      if (url.includes('/v1/admin/settings/alert-thresholds')) {
        return okJson({ thresholds: { cashDiscrepancy: 1, lowInventory: 2 } });
      }
      return okJson({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(wrap(<AdminAdvancedSettingsWidget widgetProps={{}} />));

    await waitFor(() => {
      expect(screen.getByTestId('admin-advanced-settings-token-minutes')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('admin-advanced-settings-accordion-database'));

    await waitFor(() => {
      expect(screen.getByTestId('admin-advanced-settings-db-export')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/Code de confirmation/i), { target: { value: '9999' } });
    fireEvent.click(screen.getByTestId('admin-advanced-settings-db-export'));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/v1/admin/db/export'))).toBe(true);
    });
  });

  it('garde le cockpit pour le suivi quotidien mais remet les réglages et le support Paheko dans les paramètres avancés', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/v1/admin/settings/session')) return okJson({ token_expiration_minutes: 360 });
      if (url.includes('/v1/admin/settings/email')) return okJson({ from_name: '', from_address: '', has_api_key: false });
      if (url.includes('/v1/admin/settings/activity-threshold')) return okJson({ activity_threshold_minutes: 30 });
      if (url.includes('/v1/admin/settings/alert-thresholds')) {
        return okJson({ thresholds: { cashDiscrepancy: 1, lowInventory: 2 } });
      }
      if (url.includes('/v1/sites/')) {
        return okJson([
          {
            id: siteId,
            name: 'Site principal',
            city: 'Lyon',
            address: null,
            is_active: true,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-02T00:00:00.000Z',
          },
        ]);
      }
      if (url.includes('/v1/cash-registers/')) {
        return okJson([
          {
            id: registerId,
            name: 'Caisse 1',
            location: 'Entrée',
            site_id: siteId,
            is_active: true,
            workflow_options: {},
            enable_virtual: false,
            enable_deferred: false,
          },
        ]);
      }
      if (url.includes('/v1/admin/paheko-mappings/cash-session-close')) {
        return okJson({ data: [], total: 0, skip: 0, limit: 200 });
      }
      if (url.includes('/v1/admin/health')) {
        return okJson({
          system_health: {
            overall_status: 'healthy',
            anomalies_detected: 0,
            critical_anomalies: 0,
            active_tasks: 5,
            scheduler_running: true,
            timestamp: '2026-04-14T18:20:00.000Z',
          },
          anomalies: {},
          recommendations: [],
          scheduler_status: {
            running: true,
            total_tasks: 5,
            tasks: [
              {
                name: 'paheko_outbox',
                enabled: true,
                running: false,
                last_run: '2026-04-14T18:20:00.000Z',
                next_run: '2026-04-14T18:21:00.000Z',
                interval_minutes: 1,
              },
            ],
          },
        });
      }
      if (url.includes('/v1/admin/paheko-outbox/items?')) {
        return okJson({
          data: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              operation_type: 'cash_session_close',
              idempotency_key: 'cash_session_close:test',
              cash_session_id: siteId,
              site_id: siteId,
              outbox_status: 'failed',
              sync_state_core: 'en_quarantaine',
              local_session_persisted: true,
              remote_attempt_count: 1,
              last_remote_http_status: 422,
              last_error: 'mapping invalid',
              next_retry_at: null,
              rejection_reason: null,
              mapping_resolution_error: null,
              correlation_id: 'corr-test-1',
              created_at: '2026-04-14T18:19:00.000Z',
              updated_at: '2026-04-14T18:20:00.000Z',
            },
          ],
          total: 1,
          skip: 0,
          limit: 10,
        });
      }
      if (url.includes('/v1/admin/paheko-outbox/items/11111111-1111-4111-8111-111111111111')) {
        return okJson({
          id: '11111111-1111-4111-8111-111111111111',
          operation_type: 'cash_session_close',
          idempotency_key: 'cash_session_close:test',
          cash_session_id: siteId,
          site_id: siteId,
          outbox_status: 'failed',
          sync_state_core: 'en_quarantaine',
          local_session_persisted: true,
          remote_attempt_count: 1,
          last_remote_http_status: 422,
          last_error: 'mapping invalid',
          next_retry_at: null,
          rejection_reason: null,
          mapping_resolution_error: null,
          correlation_id: 'corr-test-1',
          created_at: '2026-04-14T18:19:00.000Z',
          updated_at: '2026-04-14T18:20:00.000Z',
          payload: { total_amount: 15 },
          last_response_snippet: '{"id":134}',
          recent_sync_transitions: [],
        });
      }
      if (url.includes('/v1/admin/paheko-outbox/by-correlation/corr-test-1')) {
        return okJson({
          correlation_id: 'corr-test-1',
          items: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              operation_type: 'cash_session_close',
              idempotency_key: 'cash_session_close:test',
              cash_session_id: siteId,
              site_id: siteId,
              outbox_status: 'failed',
              sync_state_core: 'en_quarantaine',
              local_session_persisted: true,
              remote_attempt_count: 1,
              last_remote_http_status: 422,
              last_error: 'mapping invalid',
              next_retry_at: null,
              rejection_reason: null,
              mapping_resolution_error: null,
              correlation_id: 'corr-test-1',
              created_at: '2026-04-14T18:19:00.000Z',
              updated_at: '2026-04-14T18:20:00.000Z',
            },
          ],
          sync_transitions: [
            {
              id: 'tr-1',
              transition_name: 'auto_quarantine_http_non_retryable',
              from_sync_state: 'a_reessayer',
              to_sync_state: 'en_quarantaine',
              from_outbox_status: 'processing',
              to_outbox_status: 'failed',
              actor_user_id: null,
              occurred_at: '2026-04-14T18:20:00.000Z',
              reason: 'mapping invalid',
              correlation_id: 'corr-test-1',
              context_json: {},
            },
          ],
          sync_transitions_total: 1,
          sync_transitions_skip: 0,
          sync_transitions_limit: 200,
        });
      }
      if (url.includes('/lift-quarantine')) {
        expect(JSON.parse(String(init?.body))).toEqual({
          reason: 'Relance contrôlée depuis le panel super-admin Paheko',
        });
        return okJson({
          id: '11111111-1111-4111-8111-111111111111',
          operation_type: 'cash_session_close',
          idempotency_key: 'cash_session_close:test',
          cash_session_id: siteId,
          site_id: siteId,
          outbox_status: 'pending',
          sync_state_core: 'a_reessayer',
          local_session_persisted: true,
          remote_attempt_count: 1,
          last_remote_http_status: 422,
          last_error: null,
          next_retry_at: '2026-04-14T18:22:00.000Z',
          rejection_reason: null,
          mapping_resolution_error: null,
          correlation_id: 'corr-test-1',
          created_at: '2026-04-14T18:19:00.000Z',
          updated_at: '2026-04-14T18:21:30.000Z',
          payload: { total_amount: 15 },
          last_response_snippet: '{"id":134}',
          recent_sync_transitions: [],
        });
      }
      return okJson({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(wrap(<AdminAdvancedSettingsWidget widgetProps={{}} />));

    await waitFor(() => {
      expect(screen.getByTestId('admin-advanced-settings-nav-accounting-hub')).toBeTruthy();
    });
    expect(screen.getByText('Le cockpit comptable sert au suivi quotidien. Les réglages Paheko avancés et le support technique restent ici, dans les paramètres avancés.')).toBeTruthy();
    expect(screen.getByTestId('admin-advanced-settings-accordion-paheko-mappings')).toBeTruthy();
    expect(screen.getByTestId('admin-advanced-settings-accordion-paheko-diagnostics')).toBeTruthy();

    fireEvent.click(screen.getByTestId('admin-advanced-settings-accordion-paheko-mappings'));

    await waitFor(() => {
      expect(screen.getByTestId('admin-paheko-close-mappings-create-open')).toBeTruthy();
    });
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/v1/admin/paheko-mappings/cash-session-close'))).toBe(true);

    fireEvent.click(screen.getByTestId('admin-advanced-settings-accordion-paheko-diagnostics'));

    await waitFor(() => {
      expect(screen.getByTestId('admin-paheko-diagnostics-refresh')).toBeTruthy();
    });
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/v1/admin/paheko-outbox/items'))).toBe(true);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/v1/admin/health'))).toBe(true);
  });
});
