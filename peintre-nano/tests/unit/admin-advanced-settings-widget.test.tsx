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
    permissions: { permissionKeys: ['transverse.admin.view'] },
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
      vi.fn(async () =>
        okJson({ detail: 'Accès refusé', code: 'FORBIDDEN' }, 403),
      ),
    );

    render(wrap(<AdminAdvancedSettingsWidget widgetProps={{}} />));

    await waitFor(() => {
      expect(screen.getByText(/Accès refusé|FORBIDDEN|refusé/i)).toBeTruthy();
    });
  });
});
