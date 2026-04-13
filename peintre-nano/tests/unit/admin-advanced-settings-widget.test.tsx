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
});
