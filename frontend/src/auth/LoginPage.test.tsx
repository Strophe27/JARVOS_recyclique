/**
 * Tests LoginPage — Story 11.1, 17-HF-3.
 * Smoke : rendu formulaire connexion. Redirection post-login vers /dashboard ou from.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { LoginPage } from './LoginPage';

const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();
vi.mock('./AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

function renderLoginPage(opts?: { initialEntries?: { pathname: string; state?: { from: { pathname: string } } }[] }) {
  const initialEntries = opts?.initialEntries ?? [{ pathname: '/login' }];
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <LoginPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le titre Connexion et le formulaire', async () => {
    mockUseAuth.mockReturnValue({ user: null, login: vi.fn() });
    renderLoginPage();
    expect(await screen.findByRole('heading', { name: /connexion/i })).toBeInTheDocument();
    expect(await screen.findByTestId('login-form')).toBeInTheDocument();
  });

  it('redirige vers /dashboard par défaut quand user est connecté', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1', username: 't' }, login: vi.fn() });
    renderLoginPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('redirige vers from si présent quand user est connecté', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1', username: 't' }, login: vi.fn() });
    renderLoginPage({
      initialEntries: [{ pathname: '/login', state: { from: { pathname: '/admin/users' } } }],
    });
    expect(mockNavigate).toHaveBeenCalledWith('/admin/users', { replace: true });
  });
});
