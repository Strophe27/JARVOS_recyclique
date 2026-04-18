// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RootProviders } from '../../src/app/providers/RootProviders';
import {
  USER_RUNTIME_PREFS_STORAGE_KEY,
  useUserRuntimePrefs,
} from '../../src/app/providers/UserRuntimePrefsProvider';
import '../../src/styles/tokens.css';

function PrefsReader() {
  const { prefs } = useUserRuntimePrefs();
  return <span data-testid="prefs-read-density">{prefs.uiDensity}</span>;
}

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
  localStorage.removeItem(USER_RUNTIME_PREFS_STORAGE_KEY);
});

describe('UserRuntimePrefs — persistance locale', () => {
  it('hydrate depuis localStorage (clé namespacée peintre-nano:)', () => {
    localStorage.setItem(
      USER_RUNTIME_PREFS_STORAGE_KEY,
      JSON.stringify({ uiDensity: 'compact', sidebarPanelOpen: true, onboardingCompleted: false }),
    );

    render(
      <RootProviders>
        <PrefsReader />
      </RootProviders>,
    );

    expect(screen.getByTestId('prefs-read-density').textContent).toBe('compact');
  });

  it('persiste une mise à jour après interaction', () => {
    function ToggleDensity() {
      const { prefs, updatePrefs } = useUserRuntimePrefs();
      return (
        <button
          type="button"
          data-testid="unit-density-flip"
          onClick={() =>
            updatePrefs({ uiDensity: prefs.uiDensity === 'comfortable' ? 'compact' : 'comfortable' })
          }
        >
          flip
        </button>
      );
    }

    render(
      <RootProviders>
        <ToggleDensity />
        <PrefsReader />
      </RootProviders>,
    );

    expect(screen.getByTestId('prefs-read-density').textContent).toBe('comfortable');
    fireEvent.click(screen.getByTestId('unit-density-flip'));
    expect(screen.getByTestId('prefs-read-density').textContent).toBe('compact');

    const stored = JSON.parse(localStorage.getItem(USER_RUNTIME_PREFS_STORAGE_KEY) ?? '{}') as {
      uiDensity?: string;
    };
    expect(stored.uiDensity).toBe('compact');
  });
});
