// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LiveAuthLoginControllerProvider } from '../../src/app/auth/LiveAuthLoginControllerContext';
import type { LiveAuthLoginController } from '../../src/app/auth/LiveAuthLoginControllerContext';
import { PublicLoginWidget } from '../../src/widgets/auth/PublicLoginWidget';

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

function makeController(over: Partial<LiveAuthLoginController> = {}): LiveAuthLoginController {
  return {
    username: '',
    password: '',
    setUsername: vi.fn(),
    setPassword: vi.fn(),
    onSubmit: (e: FormEvent) => {
      e.preventDefault();
    },
    formError: null,
    busy: false,
    hasStoredToken: false,
    onRetryStoredToken: vi.fn(),
    onClearStoredSession: vi.fn(),
    ...over,
  };
}

describe('PublicLoginWidget (Story 11.1)', () => {
  it('affiche les libellés issus du manifeste (parité legacy)', () => {
    render(
      <MantineProvider>
        <LiveAuthLoginControllerProvider
          value={makeController()}
        >
          <PublicLoginWidget
            widgetProps={{
              brandTitle: 'RecyClique',
              heading: 'Connexion',
              usernameLabel: "Nom d'utilisateur",
              passwordLabel: 'Mot de passe',
              submitLabel: 'Se connecter',
              forgotPasswordLabel: 'Mot de passe oublié ?',
              forgotPasswordHref: '/forgot-password',
            }}
          />
        </LiveAuthLoginControllerProvider>
      </MantineProvider>,
    );
    expect(screen.getByTestId('public-login-banner')).toBeTruthy();
    expect(screen.getByText('RecyClique')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Connexion' })).toBeTruthy();
    expect(screen.queryByText(/VITE_RECYCLIQUE_API_PREFIX/)).toBeNull();
    expect(screen.queryByText(/recyclique_auth_login/)).toBeNull();
    expect(screen.getByRole('textbox', { name: /Nom d'utilisateur/ })).toBeTruthy();
    expect(screen.getByLabelText(/Mot de passe/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeTruthy();
    const forgot = screen.getByRole('link', { name: 'Mot de passe oublié ?' });
    expect(forgot.getAttribute('href')).toBe('/forgot-password');
  });
});
