// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { getDefaultDemoAuthAdapter } from '../../src/app/auth/default-demo-auth-adapter';
import { AdminAccountingHubWidget } from '../../src/domains/admin-config/AdminAccountingHubWidget';

const { listMappingsMock, listOutboxMock, spaNavigateMock } = vi.hoisted(() => ({
  listMappingsMock: vi.fn(),
  listOutboxMock: vi.fn(),
  spaNavigateMock: vi.fn(),
}));

vi.mock('../../src/app/demo/spa-navigate', () => ({
  spaNavigateTo: (path: string) => spaNavigateMock(path),
}));

vi.mock('../../src/api/admin-paheko-mappings-client', () => ({
  listPahekoCashSessionCloseMappings: (...args: unknown[]) => listMappingsMock(...args),
}));

vi.mock('../../src/api/admin-paheko-outbox-client', () => ({
  listPahekoOutboxItems: (...args: unknown[]) => listOutboxMock(...args),
}));

describe('AdminAccountingHubWidget', () => {
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
    listMappingsMock.mockReset();
    listOutboxMock.mockReset();
    spaNavigateMock.mockReset();
  });

  it('recentre le cockpit sur un suivi métier quotidien et renvoie le support vers les paramètres avancés', async () => {
    listMappingsMock.mockResolvedValue({
      ok: true,
      data: [
        { id: '1', site_id: 's', register_id: null, enabled: false, label: 'Actif', destination_params: {}, created_at: '', updated_at: '' },
        { id: '2', site_id: 's', register_id: null, enabled: false, label: 'Off', destination_params: {}, created_at: '', updated_at: '' },
      ],
      total: 2,
      skip: 0,
      limit: 200,
    });
    listOutboxMock.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'o1',
          correlation_id: 'corr-1',
          cash_session_id: 'sess-1',
          site_id: '00000000-0000-4000-8000-00000000d157',
          outbox_status: 'delivered',
          sync_state_core: 'resolu',
          last_remote_http_status: 200,
          updated_at: '2026-04-14T20:00:00.000Z',
        },
        {
          id: 'o2',
          correlation_id: 'corr-2',
          cash_session_id: 'sess-2',
          site_id: '00000000-0000-4000-8000-00000000d157',
          outbox_status: 'failed',
          sync_state_core: 'en_quarantaine',
          last_remote_http_status: 422,
          updated_at: '2026-04-14T20:01:00.000Z',
        },
      ],
      total: 2,
      skip: 0,
      limit: 20,
    });

    const adapter = {
      ...getDefaultDemoAuthAdapter(),
      getAccessToken: () => 'tok',
    };

    render(
      <RootProviders authAdapter={adapter}>
        <AdminAccountingHubWidget widgetProps={{}} />
      </RootProviders>,
    );

    expect(await screen.findByTestId('admin-accounting-hub')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId('admin-accounting-hub-history-table')).toBeTruthy();
    });
    expect(screen.getByText('Suivi comptable Paheko')).toBeTruthy();
    expect(screen.getByText('Cette vue est limitée au site actif de votre contexte.')).toBeTruthy();
    expect(screen.getByText('Configuration à compléter')).toBeTruthy();
    expect(screen.getByText('Clôtures à vérifier')).toBeTruthy();
    expect(screen.getByText('Transmise')).toBeTruthy();
    expect(screen.getAllByText('À vérifier').length).toBeGreaterThan(0);
    expect(screen.queryByText('HTTP')).toBeNull();
    expect(screen.queryByText('corr-1')).toBeNull();
    expect(screen.queryByText('corr-2')).toBeNull();
    expect(screen.queryByText('Support technique Paheko')).toBeNull();

    fireEvent.click(screen.getByTestId('admin-accounting-hub-nav-settings'));
    fireEvent.click(screen.getByTestId('admin-accounting-hub-nav-support'));
    expect(spaNavigateMock.mock.calls).toEqual([['/admin/settings'], ['/admin/settings']]);
  });
});
