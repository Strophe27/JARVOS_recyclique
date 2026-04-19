// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { ReceptionNominalWizard } from '../../src/domains/reception/ReceptionNominalWizard';
import '../../src/registry';

const mockFetchUnifiedLiveStats = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    tickets_count: 1,
    last_ticket_amount: 0,
    ca: 10,
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

describe('Réception — bandeau KPI live unifié (GET /v1/stats/live)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
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

  it('monte KpiLiveStrip dans le chrome session et déclenche fetchUnifiedLiveStats', async () => {
    const auth = createMockAuthAdapter({
      session: { authenticated: true, userId: 'u1' },
      envelope: createDefaultDemoEnvelope(),
    });
    render(
      <RootProviders authAdapter={auth} disableUserPrefsPersistence>
        <ReceptionNominalWizard widgetProps={{}} />
      </RootProviders>,
    );

    const sessionChrome = await waitFor(() => screen.getByTestId('reception-step-session'));
    const kpi = await waitFor(() => screen.getByTestId('reception-unified-live-kpi'));
    expect(sessionChrome.contains(kpi)).toBe(true);
    expect(mockFetchUnifiedLiveStats).toHaveBeenCalled();
  });
});
