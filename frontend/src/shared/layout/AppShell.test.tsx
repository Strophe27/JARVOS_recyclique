import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AppShell } from './AppShell';

const mockUseAuth = vi.fn();
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

describe('AppShell', () => {
  it('affiche le shell global et les zones structurelles', () => {
    mockUseAuth.mockReturnValue({
      user: { first_name: 'Alex', last_name: 'Dupont', username: 'adupont' },
    });

    render(
      <MantineProvider>
        <AppShell nav={<nav data-testid="test-nav" />}>
          <div data-testid="test-content" />
        </AppShell>
      </MantineProvider>
    );

    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell-header')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell-sidebar')).toContainElement(screen.getByTestId('test-nav'));
    expect(screen.getByTestId('app-shell-main')).toContainElement(screen.getByTestId('test-content'));
    expect(screen.getByTestId('app-shell-user')).toHaveTextContent('Alex Dupont');
  });

  it('affiche un libelle anonyme si aucun utilisateur hydrate', () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(
      <MantineProvider>
        <AppShell nav={<nav />}>
          <div />
        </AppShell>
      </MantineProvider>
    );

    expect(screen.getByTestId('app-shell-user')).toHaveTextContent('Session non connectee');
  });
});
