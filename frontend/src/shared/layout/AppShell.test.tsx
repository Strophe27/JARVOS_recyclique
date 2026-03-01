import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AppShell } from './AppShell';

const mockUseAuth = vi.fn();
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('./AppShellNav', () => ({
  AppShellNav: () => <nav data-testid="app-shell-nav">Nav</nav>,
}));

describe('AppShell', () => {
  it('affiche le shell global avec header brand vert et zones structurelles', () => {
    mockUseAuth.mockReturnValue({
      user: { first_name: 'Alex', last_name: 'Dupont', username: 'adupont' },
      logout: vi.fn(),
    });

    render(
      <MantineProvider>
        <MemoryRouter>
          <AppShell>
            <div data-testid="test-content" />
          </AppShell>
        </MemoryRouter>
      </MantineProvider>
    );

    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell-header')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell-header')).toHaveClass('app-shell__header--brand');
    expect(screen.getByTestId('app-shell-body')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell-main')).toContainElement(screen.getByTestId('test-content'));
    expect(screen.getByTestId('app-shell-user')).toHaveTextContent('Alex Dupont');
    expect(screen.getByTestId('app-shell-logo')).toHaveAttribute('href', '/caisse');
  });

  it('affiche un libelle anonyme si aucun utilisateur', () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(
      <MantineProvider>
        <MemoryRouter>
          <AppShell>
            <div />
          </AppShell>
        </MemoryRouter>
      </MantineProvider>
    );

    expect(screen.getByTestId('app-shell-user')).toHaveTextContent('Session non connectée');
  });

  it('affiche le logo RecyClique avec icone et texte', () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(
      <MantineProvider>
        <MemoryRouter>
          <AppShell>
            <div />
          </AppShell>
        </MemoryRouter>
      </MantineProvider>
    );

    expect(screen.getByText('RecyClique')).toBeInTheDocument();
    const logo = screen.getByTestId('app-shell-logo');
    expect(logo.querySelector('svg')).toBeInTheDocument();
  });

  it('pas de sidebar', () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(
      <MantineProvider>
        <MemoryRouter>
          <AppShell>
            <div />
          </AppShell>
        </MemoryRouter>
      </MantineProvider>
    );

    expect(screen.queryByTestId('app-shell-sidebar')).not.toBeInTheDocument();
  });

  it('masque la nav sur /login', () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(
      <MantineProvider>
        <MemoryRouter initialEntries={['/login']}>
          <AppShell>
            <div />
          </AppShell>
        </MemoryRouter>
      </MantineProvider>
    );

    expect(screen.queryByTestId('app-shell-nav')).not.toBeInTheDocument();
  });

  it('masque la nav sur /cash-register/pin', () => {
    mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(
      <MantineProvider>
        <MemoryRouter initialEntries={['/cash-register/pin']}>
          <AppShell>
            <div />
          </AppShell>
        </MemoryRouter>
      </MantineProvider>
    );

    expect(screen.queryByTestId('app-shell-nav')).not.toBeInTheDocument();
  });

  it('masque header et body wrapper sur /cash-register/sale (plein ecran)', () => {
    mockUseAuth.mockReturnValue({
      user: { first_name: 'Alex', last_name: 'Dupont', username: 'adupont' },
      logout: vi.fn(),
    });

    render(
      <MantineProvider>
        <MemoryRouter initialEntries={['/cash-register/sale']}>
          <AppShell>
            <div data-testid="sale-content" />
          </AppShell>
        </MemoryRouter>
      </MantineProvider>
    );

    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('app-shell-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('app-shell-body')).not.toBeInTheDocument();
    expect(screen.getByTestId('sale-content')).toBeInTheDocument();
  });
});
