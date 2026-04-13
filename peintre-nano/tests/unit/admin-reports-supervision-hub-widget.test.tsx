// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { AdminReportsSupervisionHubWidget } from '../../src/domains/admin-config/AdminReportsSupervisionHubWidget';
import '../../src/styles/tokens.css';

const { spaNavigateMock } = vi.hoisted(() => ({ spaNavigateMock: vi.fn() }));

vi.mock('../../src/app/demo/spa-navigate', () => ({
  spaNavigateTo: (path: string) => {
    spaNavigateMock(path);
  },
}));

afterEach(() => {
  cleanup();
  spaNavigateMock.mockClear();
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

describe('AdminReportsSupervisionHubWidget', () => {
  it('n’expose pas de raccourci utilisateurs ; quatre liens cohérents avec la nav transverse', () => {
    render(
      <RootProviders>
        <AdminReportsSupervisionHubWidget widgetProps={{ presentation: 'compact' }} />
      </RootProviders>,
    );
    expect(screen.queryByTestId('admin-hub-link-users')).toBeNull();
    expect(screen.getByTestId('admin-hub-link-cash-registers')).toBeTruthy();
    expect(screen.getByTestId('admin-hub-link-sites')).toBeTruthy();
    expect(screen.getByTestId('admin-hub-link-reception-stats')).toBeTruthy();
    expect(screen.getByTestId('admin-hub-link-reception-sessions')).toBeTruthy();
    fireEvent.click(screen.getByTestId('admin-hub-link-reception-stats'));
    expect(spaNavigateMock).toHaveBeenCalledWith('/admin/reception-stats');
    fireEvent.click(screen.getByTestId('admin-hub-link-reception-sessions'));
    expect(spaNavigateMock).toHaveBeenCalledWith('/admin/reception-sessions');
  });

  it('présentation strip par défaut : mêmes testids', () => {
    render(
      <RootProviders>
        <AdminReportsSupervisionHubWidget />
      </RootProviders>,
    );
    expect(screen.getByTestId('admin-reports-supervision-hub')).toBeTruthy();
    expect(screen.queryByTestId('admin-hub-link-users')).toBeNull();
  });
});
