// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultDemoEnvelope } from '../../src/app/auth/default-demo-auth-adapter';
import { LiveAuthShell } from '../../src/app/auth/LiveAuthShell';

const { postRecycliqueLogin, fetchRecycliqueContextEnvelope, postRecycliqueLogout } = vi.hoisted(() => ({
  postRecycliqueLogin: vi.fn(),
  fetchRecycliqueContextEnvelope: vi.fn(),
  postRecycliqueLogout: vi.fn(),
}));

vi.mock('../../src/api/recyclique-auth-client', () => ({
  postRecycliqueLogin,
  fetchRecycliqueContextEnvelope,
  postRecycliqueLogout,
  LIVE_AUTH_ACCESS_TOKEN_STORAGE_KEY: 'peintre-nano.recyclique.access_token',
  LIVE_AUTH_USER_DISPLAY_KEY: 'peintre-nano.recyclique.user_display',
  persistUserDisplay: vi.fn(),
  readStoredUserDisplay: vi.fn(() => undefined),
}));

import '../../src/registry';

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
  sessionStorage.clear();
  vi.clearAllMocks();
  window.history.pushState({}, '', '/');
});

describe('LiveAuthShell (Story 11.2)', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/login');
    postRecycliqueLogin.mockResolvedValue({
      ok: true,
      accessToken: 'test-token',
      refreshToken: null,
      userId: 'u1',
      userDisplayLabel: undefined,
    });
    fetchRecycliqueContextEnvelope.mockResolvedValue({
      ok: true,
      envelope: createDefaultDemoEnvelope(),
    });
  });

  it('après login réussi, l’URL est /dashboard (canon CREOS transverse-dashboard)', async () => {
    render(
      <MantineProvider>
        <LiveAuthShell>
          <span data-testid="post-login-child">in</span>
        </LiveAuthShell>
      </MantineProvider>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /Nom d'utilisateur/ }), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText(/Mot de passe/), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => {
      expect(screen.getByTestId('post-login-child')).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/dashboard');
    expect(screen.queryByTestId('live-auth-toolbar')).toBeNull();
    expect(screen.queryByText(/GET \/v1\/users\/me\/context/)).toBeNull();
    expect(screen.queryByText(/Auth live/)).toBeNull();
  });
});
