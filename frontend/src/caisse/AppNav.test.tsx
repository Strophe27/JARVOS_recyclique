/**
 * Tests AppNav — wrapper autour de AppShellNav (Story 15.1).
 * La nav horizontale affiche Tableau de bord, Caisse, Réception, Administration selon permissions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AppNav } from './AppNav';

const mockUseAuth = vi.fn();
const mockUseCashRegisterLock = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('./useCashRegisterLock', () => ({ useCashRegisterLock: () => mockUseCashRegisterLock() }));

function renderNav() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <AppNav />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('AppNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCashRegisterLock.mockReturnValue({ isRestricted: false });
  });

  it('affiche Administration quand l utilisateur a admin', () => {
    mockUseAuth.mockReturnValue({ permissions: ['admin'] });
    renderNav();
    expect(screen.getByRole('link', { name: /Administration/i })).toBeInTheDocument();
  });

  it('affiche Reception quand l utilisateur a reception.access', () => {
    mockUseAuth.mockReturnValue({ permissions: ['reception.access'] });
    renderNav();
    expect(screen.getByRole('link', { name: /Réception/i })).toBeInTheDocument();
  });

  it('masque Administration et Reception quand pas les permissions', () => {
    mockUseAuth.mockReturnValue({ permissions: [] });
    renderNav();
    expect(screen.getByRole('link', { name: /Tableau de bord/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Caisse/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Réception/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Administration/i })).not.toBeInTheDocument();
  });
});
