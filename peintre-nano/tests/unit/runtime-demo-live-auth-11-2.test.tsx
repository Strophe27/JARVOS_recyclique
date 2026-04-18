// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RuntimeDemoApp } from '../../src/app/demo/RuntimeDemoApp';
import { RootProviders } from '../../src/app/providers/RootProviders';
import '../../src/registry';
import '../../src/styles/tokens.css';

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
  vi.unstubAllEnvs();
  window.history.pushState({}, '', '/');
});

describe('RuntimeDemoApp — présentation auth live (Story 11.2)', () => {
  it('masque le bandeau « bac à sable » quand VITE_LIVE_AUTH est actif', () => {
    vi.stubEnv('VITE_LIVE_AUTH', 'true');
    window.history.pushState({}, '', '/dashboard');
    render(
      <RootProviders disableUserPrefsPersistence>
        <RuntimeDemoApp />
      </RootProviders>,
    );
    expect(screen.queryByText('Démonstration runtime (bac à sable)')).toBeNull();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Bienvenue sur RecyClique/i,
      }),
    ).toBeTruthy();
  });
});
