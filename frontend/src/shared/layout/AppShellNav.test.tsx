import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AppShellNav } from './AppShellNav';

const mockUseAuth = vi.fn();
const mockUseCashRegisterLock = vi.fn();

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('../../caisse/useCashRegisterLock', () => ({
  useCashRegisterLock: () => mockUseCashRegisterLock(),
}));

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
    mockUseAuth.mockReturnValue({ permissions: ['admin', 'reception.access'] });
    mockUseCashRegisterLock.mockReturnValue({ isRestricted: false });
  });

  it('affiche les 4 onglets principaux hors mode restreint (admin + reception)', () => {
    renderNav('/caisse');
    expect(screen.getByRole('link', { name: /Tableau de bord/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Caisse/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Réception/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Administration/i })).toBeInTheDocument();
  });

  it('masque Reception et Administration quand permissions manquantes', () => {
    mockUseAuth.mockReturnValue({ permissions: [] });
    renderNav('/caisse');
    expect(screen.getByRole('link', { name: /Tableau de bord/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Caisse/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Réception/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Administration/i })).not.toBeInTheDocument();
  });

  it('affiche uniquement Caisse et Deverrouiller par PIN en mode restreint', () => {
    mockUseCashRegisterLock.mockReturnValue({ isRestricted: true });
    renderNav('/cash-register/sale');

    expect(screen.getByRole('link', { name: /Caisse/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Déverrouiller par PIN/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Administration/i })).not.toBeInTheDocument();
  });

  it('applique un etat actif sur Administration pour /admin/reports', () => {
    renderNav('/admin/reports');
    const link = screen.getByRole('link', { name: /Administration/i });
    expect(link.className).toContain('app-shell-nav__link--active');
  });

  it('applique un etat actif sur Caisse pour /cash-register/sale', () => {
    renderNav('/cash-register/sale');
    const caisseLink = screen.getByRole('link', { name: /^Caisse$/i });
    expect(caisseLink.className).toContain('app-shell-nav__link--active');
  });
});
