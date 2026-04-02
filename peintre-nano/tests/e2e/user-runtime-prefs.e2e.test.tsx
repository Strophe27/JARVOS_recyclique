// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { RootProviders } from '../../src/app/providers/RootProviders';
import { USER_RUNTIME_PREFS_STORAGE_KEY } from '../../src/app/providers/UserRuntimePrefsProvider';
import '../../src/styles/tokens.css';

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
  vi.useRealTimers();
  cleanup();
  localStorage.removeItem(USER_RUNTIME_PREFS_STORAGE_KEY);
});

describe('E2E — UserRuntimePrefs ne révèlent pas la nav masquée (story 3.5)', () => {
  it('basculer la densité UI ne fait pas réapparaître une entrée admin sans permission', () => {
    render(
      <RootProviders disableUserPrefsPersistence>
        <App />
      </RootProviders>,
    );

    const shell = screen.getByTestId('peintre-nano-shell');
    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });

    expect(within(nav).getByTestId('nav-entry-root-home')).toBeTruthy();
    expect(within(nav).queryByTestId('nav-entry-admin-area')).toBeNull();
    expect(shell.getAttribute('data-pn-ui-density')).toBe('comfortable');

    const toggle = screen.getByTestId('prefs-ui-density-toggle');
    fireEvent.click(toggle);
    expect(shell.getAttribute('data-pn-ui-density')).toBe('compact');
    expect(within(nav).queryByTestId('nav-entry-admin-area')).toBeNull();

    fireEvent.click(toggle);
    expect(shell.getAttribute('data-pn-ui-density')).toBe('comfortable');
    expect(within(nav).queryByTestId('nav-entry-admin-area')).toBeNull();
  });

  it('hydratation depuis localStorage : densité appliquée, entrée admin toujours absente', () => {
    localStorage.setItem(
      USER_RUNTIME_PREFS_STORAGE_KEY,
      JSON.stringify({
        uiDensity: 'compact',
        sidebarPanelOpen: false,
        onboardingCompleted: true,
      }),
    );

    render(
      <RootProviders>
        <App />
      </RootProviders>,
    );

    const shell = screen.getByTestId('peintre-nano-shell');
    const nav = screen.getByRole('navigation', { name: 'Zone navigation' });

    expect(shell.getAttribute('data-pn-ui-density')).toBe('compact');
    expect(within(nav).getByTestId('nav-entry-root-home')).toBeTruthy();
    expect(within(nav).queryByTestId('nav-entry-admin-area')).toBeNull();
  });
});
