// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function liveSnapshotBody(overrides: Record<string, unknown>): string {
  return JSON.stringify({
    sync_operational_summary: { worst_state: 'resolu', source_reachable: true },
    context: { site_id: 's' },
    effective_open_state: 'open',
    cash_session_effectiveness: 'open_effective',
    observed_at: new Date().toISOString(),
    ...overrides,
  });
}

describe('Story 6.9 — bandeau sync (live-snapshot / FR24)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('affiche le bandeau sync différée quand worst_state = a_reessayer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v2/exploitation/live-snapshot')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () =>
              liveSnapshotBody({
                sync_operational_summary: { worst_state: 'a_reessayer', source_reachable: true },
              }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
      }),
    );

    const { CashflowOperationalSyncNotice } = await import(
      '../../src/domains/cashflow/cashflow-operational-sync-notice'
    );

    render(
      <MantineProvider>
        <CashflowOperationalSyncNotice auth={{ getAccessToken: () => undefined }} />
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sync-notice-deferred')).toBeTruthy();
    });
  });

  it('affiche le bandeau bloquant quand worst_state = en_quarantaine', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v2/exploitation/live-snapshot')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () =>
              liveSnapshotBody({
                sync_operational_summary: { worst_state: 'en_quarantaine', source_reachable: false },
              }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
      }),
    );

    const { CashflowOperationalSyncNotice } = await import(
      '../../src/domains/cashflow/cashflow-operational-sync-notice'
    );

    render(
      <MantineProvider>
        <CashflowOperationalSyncNotice auth={{ getAccessToken: () => undefined }} />
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sync-notice-blocking')).toBeTruthy();
    });
  });

  it('affiche le bandeau dégradé si le GET live-snapshot échoue (HTTP)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('/v2/exploitation/live-snapshot')) {
          return Promise.resolve({
            ok: false,
            status: 503,
            text: async () => JSON.stringify({ detail: 'Busy', retryable: true }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, text: async () => '{}' });
      }),
    );

    const { CashflowOperationalSyncNotice } = await import(
      '../../src/domains/cashflow/cashflow-operational-sync-notice'
    );

    render(
      <MantineProvider>
        <CashflowOperationalSyncNotice auth={{ getAccessToken: () => undefined }} />
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('cashflow-sync-notice-degraded')).toBeTruthy();
    });
    expect(screen.getByTestId('cashflow-sync-notice-degraded').textContent).toMatch(/503/);
  });
});
