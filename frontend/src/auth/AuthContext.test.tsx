import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../api/auth', () => ({
  getSession: vi.fn(),
  postLogin: vi.fn(),
  postLogout: vi.fn(),
}));

function Probe() {
  const { user, isHydrated, refreshSession } = useAuth();
  return (
    <div>
      <span data-testid="hydrated">{String(isHydrated)}</span>
      <span data-testid="username">{user?.username ?? 'none'}</span>
      <button data-testid="refresh-session" onClick={() => void refreshSession()}>
        refresh
      </button>
    </div>
  );
}

describe('AuthContext session hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrate une session valide', async () => {
    const { getSession } = await import('../api/auth');
    vi.mocked(getSession).mockResolvedValue({
      authenticated: true,
      user: {
        id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        role: 'admin',
        status: 'active',
        first_name: 'Alice',
        last_name: 'Doe',
      },
      permissions: ['admin'],
    });

    render(
      <MantineProvider>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MantineProvider>
    );

    await waitFor(() => expect(screen.getByTestId('hydrated')).toHaveTextContent('true'));
    expect(screen.getByTestId('username')).toHaveTextContent('alice');
  });

  it('retombe sur etat anon si session expiree/refusee', async () => {
    const { getSession } = await import('../api/auth');
    vi.mocked(getSession).mockResolvedValue({
      authenticated: false,
      user: null,
      permissions: [],
    });

    render(
      <MantineProvider>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MantineProvider>
    );

    await waitFor(() => expect(screen.getByTestId('hydrated')).toHaveTextContent('true'));
    expect(screen.getByTestId('username')).toHaveTextContent('none');
  });

  it('purge la session locale apres expiration lors d un refresh explicite', async () => {
    const { getSession } = await import('../api/auth');
    vi.mocked(getSession)
      .mockResolvedValueOnce({
        authenticated: true,
        user: {
          id: 'u1',
          username: 'alice',
          email: 'alice@example.com',
          role: 'admin',
          status: 'active',
          first_name: 'Alice',
          last_name: 'Doe',
        },
        permissions: ['admin'],
      })
      .mockResolvedValueOnce({
        authenticated: false,
        user: null,
        permissions: [],
      });

    render(
      <MantineProvider>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MantineProvider>
    );

    await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('alice'));
    screen.getByTestId('refresh-session').click();
    await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('none'));
  });
});
