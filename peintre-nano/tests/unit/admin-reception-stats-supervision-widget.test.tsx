// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuthContextPort } from '../../src/app/auth/auth-context-port';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { AdminReceptionStatsSupervisionWidget } from '../../src/domains/admin-config/AdminReceptionStatsSupervisionWidget';
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

function mockStatsFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/v1/stats/reception/summary')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ total_weight: 12.5, total_items: 4 }),
      };
    }
    if (url.includes('/v1/stats/reception/by-category')) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([{ category_name: 'Metal', total_weight: 3, total_items: 1 }]),
      };
    }
    if (url.includes('/v1/stats/live')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ reception_open_sessions: 2, note: 'demo' }),
      };
    }
    return { ok: false, status: 404, text: async () => '{}' };
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
  return (
    <RootProviders authAdapter={authStub} disableUserPrefsPersistence>
      {ui}
    </RootProviders>
  );
}

describe('AdminReceptionStatsSupervisionWidget (Story 19.1)', () => {
  it('affiche une alerte défensive 403 sur le résumé sans contournement UI (AC 4–5)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v1/stats/reception/summary')) {
          return { ok: false, status: 403, text: async () => JSON.stringify({ detail: 'Forbidden' }) };
        }
        if (url.includes('/v1/stats/reception/by-category')) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify([]),
          };
        }
        if (url.includes('/v1/stats/live')) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({}),
          };
        }
        return { ok: false, status: 404, text: async () => '{}' };
      }),
    );
    render(wrap(<AdminReceptionStatsSupervisionWidget widgetProps={{}} />));

    await waitFor(() => {
      expect(screen.getByText(/403:/i)).toBeTruthy();
    });
    expect(screen.getByText(/Votre rôle ne permet pas/i)).toBeTruthy();
    expect(screen.getByTestId('admin-reception-nominative-gap-k')).toBeTruthy();
  });

  it('affiche le sous-titre opérateur et hydrate depuis les trois lectures stats', async () => {
    const fetchMock = mockStatsFetch();
    vi.stubGlobal('fetch', fetchMock);
    render(wrap(<AdminReceptionStatsSupervisionWidget widgetProps={{}} />));

    expect(screen.getByTestId('admin-reception-stats-operation-anchors').textContent).toContain('Données officielles');
    expect(screen.getByTestId('admin-reception-nominative-gap-k')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/12,50\s*kg/)).toBeTruthy();
    });
    expect(screen.getByText('Metal')).toBeTruthy();
    const livePaper = screen.getByTestId('widget-admin-reception-stats-supervision');
    expect(within(livePaper).getByText('Sessions de réception ouvertes')).toBeTruthy();
    const calledUrls = fetchMock.mock.calls.map(([input]) =>
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    );
    const summaryUrl = calledUrls.find((url) => url.includes('/v1/stats/reception/summary'));
    const byCategoryUrl = calledUrls.find((url) => url.includes('/v1/stats/reception/by-category'));
    expect(summaryUrl).toMatch(/start_date=\d{4}-\d{2}-\d{2}T/);
    expect(summaryUrl).toMatch(/end_date=\d{4}-\d{2}-\d{2}T/);
    expect(byCategoryUrl).toMatch(/start_date=\d{4}-\d{2}-\d{2}T/);
    expect(byCategoryUrl).toMatch(/end_date=\d{4}-\d{2}-\d{2}T/);
  });
});
