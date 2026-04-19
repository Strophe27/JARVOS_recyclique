// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const mockFetchUnifiedLiveStats = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    tickets_count: 0,
    last_ticket_amount: 0,
    ca: 0,
    donations: 0,
    weight_out: 0,
    weight_in: 0,
    period_end: '2026-04-07T10:00:00.000Z',
  }),
);

vi.mock('../../src/api/dashboard-legacy-stats-client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/api/dashboard-legacy-stats-client')>();
  return {
    ...mod,
    fetchUnifiedLiveStats: mockFetchUnifiedLiveStats,
  };
});
import { DEFAULT_LIVE_SNAPSHOT_POLLING_INTERVAL_S } from '../../src/api/live-snapshot-client';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/registry';
import { resolveWidget } from '../../src/registry/widget-registry';
import * as runtimeReporting from '../../src/runtime/report-runtime-fallback';

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderBandeauLiveLive(
  widgetProps: Record<string, unknown>,
  accessToken?: string,
) {
  const r = resolveWidget('bandeau-live');
  expect(r.ok).toBe(true);
  if (!r.ok) {
    return;
  }
  const C = r.Component;
  const adapter = createMockAuthAdapter({
    session: { authenticated: true, userId: 't' },
    envelope: createDefaultDemoEnvelope(),
    ...(accessToken !== undefined ? { accessToken } : {}),
  });
  return render(
    <RootProviders authAdapter={adapter}>
      <C widgetProps={widgetProps} />
    </RootProviders>,
  );
}

describe('bandeau-live source live HTTP (Story 4.3)', () => {
  it('envoie X-Correlation-ID, credentials include et Bearer quand le port expose un jeton', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          effective_open_state: 'delayed_open',
          cash_session_effectiveness: 'unknown',
          observed_at: '2026-04-07T10:00:00.000Z',
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderBandeauLiveLive(
      {
        use_live_source: true,
        polling_interval_s: 3600,
      },
      'secret-token',
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const call = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string>; credentials: RequestCredentials },
    ];
    const [, init] = call;
    expect(init.credentials).toBe('include');
    expect(init.headers['X-Correlation-ID']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(init.headers.Authorization).toBe('Bearer secret-token');
  });

  it('applique polling_interval_s par défaut aligné catalogue (30 s)', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          effective_open_state: 'open',
          observed_at: '2026-04-07T10:00:00.000Z',
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderBandeauLiveLive({ use_live_source: true });

    await waitFor(() => {
      expect(setIntervalSpy).toHaveBeenCalled();
    });
    const expectedMs = DEFAULT_LIVE_SNAPSHOT_POLLING_INTERVAL_S * 1000;
    const tickCall = setIntervalSpy.mock.calls.find((c) => c[1] === expectedMs);
    expect(tickCall, 'setInterval bandeau live (30 s) attendu').toBeDefined();

    setIntervalSpy.mockRestore();
  });

  it('affiche le libellé distinct pour delayed_open après 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            effective_open_state: 'delayed_open',
            observed_at: '2026-04-07T10:00:00.000Z',
          }),
      }),
    );

    renderBandeauLiveLive({ use_live_source: true, polling_interval_s: 3600 });

    await waitFor(() => {
      expect(screen.getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'live',
      );
    });
    expect(screen.getByText(/Ouverture décalée/i)).toBeTruthy();
    expect(screen.getByTestId('widget-bandeau-live').querySelector('[data-effective-open-state="delayed_open"]')).toBeTruthy();
  });

  it('affiche le libellé distinct pour delayed_close après 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            effective_open_state: 'delayed_close',
            observed_at: '2026-04-07T10:00:00.000Z',
          }),
      }),
    );

    renderBandeauLiveLive({ use_live_source: true, polling_interval_s: 3600 });

    await waitFor(() => {
      expect(screen.getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'live',
      );
    });
    expect(screen.getByText(/Fermeture décalée/i)).toBeTruthy();
    expect(
      screen.getByTestId('widget-bandeau-live').querySelector('[data-effective-open-state="delayed_close"]'),
    ).toBeTruthy();
  });

  it('affiche Live indisponible sur 503', async () => {
    const fixedCorr = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(fixedCorr);
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () =>
          JSON.stringify({
            code: 'x',
            detail: 'down',
            retryable: true,
            correlation_id: 'c',
          }),
      }),
    );

    renderBandeauLiveLive({ use_live_source: true, polling_interval_s: 3600 });

    await waitFor(() => {
      expect(screen.getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'error',
      );
    });
    const panel = screen.getByTestId('widget-bandeau-live');
    expect(panel.getAttribute('data-runtime-code')).toBe('BANDEAU_LIVE_HTTP_ERROR');
    expect(panel.getAttribute('data-runtime-severity')).toBe('degraded');
    expect(panel.getAttribute('data-correlation-id')).toBe(fixedCorr);
    expect(screen.getByText(/Live indisponible/i)).toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BANDEAU_LIVE_HTTP_ERROR',
        correlationId: fixedCorr,
        severity: 'degraded',
      }),
    );

    spy.mockRestore();
  });

  it('affiche Live indisponible sur 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ code: 'x', detail: 'nope', retryable: false, correlation_id: 'c' }),
      }),
    );

    renderBandeauLiveLive({ use_live_source: true, polling_interval_s: 3600 });

    await waitFor(() => {
      expect(screen.getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'error',
      );
    });
    expect(screen.getByText(/Live indisponible/i)).toBeTruthy();
  });

  it('affiche Live indisponible sur 403', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () =>
          JSON.stringify({ code: 'FORBIDDEN', detail: 'no', retryable: false, correlation_id: 'c' }),
      }),
    );

    renderBandeauLiveLive({ use_live_source: true, polling_interval_s: 3600 });

    await waitFor(() => {
      expect(screen.getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'error',
      );
    });
    expect(screen.getByText(/Live indisponible/i)).toBeTruthy();
  });

  it('affiche Live indisponible sur JSON invalide en 200', async () => {
    const fixedCorr = 'cccccccc-bbbb-4ccc-dddd-eeeeeeeeeeee';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(fixedCorr);
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'not-json{',
      }),
    );

    renderBandeauLiveLive({ use_live_source: true, polling_interval_s: 3600 });

    await waitFor(() => {
      expect(screen.getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'error',
      );
    });
    const panel = screen.getByTestId('widget-bandeau-live');
    expect(panel.getAttribute('data-runtime-code')).toBe('BANDEAU_LIVE_PARSE_ERROR');
    expect(panel.getAttribute('data-correlation-id')).toBe(fixedCorr);
    expect(screen.getByText(/Live indisponible/i)).toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BANDEAU_LIVE_PARSE_ERROR',
        correlationId: fixedCorr,
        severity: 'degraded',
      }),
    );

    spy.mockRestore();
  });

  it('affiche Live indisponible quand fetch rejette (réseau / timeout)', async () => {
    const fixedCorr = 'dddddddd-bbbb-4ccc-dddd-eeeeeeeeeeee';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(fixedCorr);
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));

    renderBandeauLiveLive({ use_live_source: true, polling_interval_s: 3600 });

    await waitFor(() => {
      expect(screen.getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'error',
      );
    });
    const panel = screen.getByTestId('widget-bandeau-live');
    expect(panel.getAttribute('data-runtime-code')).toBe('BANDEAU_LIVE_NETWORK_ERROR');
    expect(panel.getAttribute('data-correlation-id')).toBe(fixedCorr);
    expect(screen.getByText(/Live indisponible/i)).toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BANDEAU_LIVE_NETWORK_ERROR',
        correlationId: fixedCorr,
        severity: 'degraded',
      }),
    );

    spy.mockRestore();
  });

  it('état dégradé lisible quand 200 sans signaux exploitables', async () => {
    const fixedCorr = 'bbbbbbbb-bbbb-4ccc-dddd-eeeeeeeeeeee';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(fixedCorr);
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({}),
      }),
    );

    renderBandeauLiveLive({ use_live_source: true, polling_interval_s: 3600 });

    await waitFor(() => {
      expect(screen.getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'degraded',
      );
    });
    const panel = screen.getByTestId('widget-bandeau-live');
    expect(panel.getAttribute('data-runtime-code')).toBe('BANDEAU_LIVE_DEGRADED_EMPTY');
    expect(panel.getAttribute('data-correlation-id')).toBe(fixedCorr);
    expect(screen.getByText(/information affichée est limitée/i)).toBeTruthy();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BANDEAU_LIVE_DEGRADED_EMPTY',
        correlationId: fixedCorr,
      }),
    );

    spy.mockRestore();
  });

  it('slice désactivé (Story 4.5) : un seul fetch, pas de polling ultérieur, UI module_disabled + fallback info', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          bandeau_live_slice_enabled: false,
          observed_at: '2026-04-07T10:00:00.000Z',
          effective_open_state: 'not_applicable',
          cash_session_effectiveness: 'not_applicable',
        }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});

    renderBandeauLiveLive({
      use_live_source: true,
      polling_interval_s: 1,
    });

    await waitFor(() => {
      expect(screen.getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'module_disabled',
      );
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('widget-bandeau-live').getAttribute('data-runtime-code')).toBe(
      'BANDEAU_LIVE_MODULE_DISABLED',
    );
    // reportRuntimeFallback est déclenché dans useEffect (BandeauLiveModuleDisabled) : attendre
    // pour éviter une course avec waitFor sur le seul DOM (suite parallèle / charge CPU).
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'BANDEAU_LIVE_MODULE_DISABLED',
          severity: 'info',
          state: 'bandeau_live_module_disabled',
        }),
      );
    });

    await new Promise((r) => setTimeout(r, 400));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it('signale une erreur inattendue dans le tick live (catch) et expose le code runtime', async () => {
    const spy = vi.spyOn(runtimeReporting, 'reportRuntimeFallback').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn());

    const r = resolveWidget('bandeau-live');
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    const C = r.Component;
    const adapter = createMockAuthAdapter({
      session: { authenticated: true, userId: 't' },
      envelope: createDefaultDemoEnvelope(),
    });
    const adapterThrowing: typeof adapter = {
      ...adapter,
      getAccessToken: () => {
        throw new Error('boom interne port auth');
      },
    };

    render(
      <RootProviders authAdapter={adapterThrowing}>
        <C widgetProps={{ use_live_source: true, polling_interval_s: 3600 }} />
      </RootProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('widget-bandeau-live').getAttribute('data-bandeau-state')).toBe(
        'error',
      );
    });
    expect(screen.getByTestId('widget-bandeau-live').getAttribute('data-runtime-code')).toBe(
      'BANDEAU_LIVE_UNEXPECTED_ERROR',
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BANDEAU_LIVE_UNEXPECTED_ERROR',
        message: 'boom interne port auth',
      }),
    );

    spy.mockRestore();
  });
});
