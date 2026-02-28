import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AppShellNav } from './AppShellNav';

const mockUseAuth = vi.fn();
const mockUseCashRegisterLock = vi.fn();

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('../../caisse/useCashRegisterLock', () => ({ useCashRegisterLock: () => mockUseCashRegisterLock() }));

function renderNav(route = '/admin') {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[route]}>
        <AppShellNav />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('AppShellNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ permissions: ['admin'] });
    mockUseCashRegisterLock.mockReturnValue({ isRestricted: false });
  });

  it('affiche les liens admin hors mode restreint', () => {
    renderNav('/admin');
    expect(screen.getByRole('link', { name: /Utilisateurs/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sites/i })).toBeInTheDocument();
  });

  it('masque les liens soumis a permission quand les permissions ne sont pas hydratees', () => {
    mockUseAuth.mockReturnValue({ permissions: [] });
    renderNav('/admin');
    expect(screen.queryByRole('link', { name: /Utilisateurs/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Réception/i })).not.toBeInTheDocument();
  });

  it('affiche uniquement les liens caisse et deverrouillage en mode restreint', () => {
    mockUseCashRegisterLock.mockReturnValue({ isRestricted: true });

    renderNav('/cash-register/sale');

    expect(screen.getByRole('link', { name: /Saisie vente/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Déverrouiller par PIN/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Admin$/i })).not.toBeInTheDocument();
  });

  it('applique un etat actif sur une route exacte', () => {
    renderNav('/admin/reports');

    const link = screen.getByRole('link', { name: /Rapports caisse/i });
    expect(link.className).toContain('app-shell-nav__link--active');
  });

  it('applique un etat actif sur les sous-routes', () => {
    renderNav('/admin/users/123');
    const link = screen.getByRole('link', { name: /Utilisateurs/i });
    expect(link.className).toContain('app-shell-nav__link--active');
  });
});
