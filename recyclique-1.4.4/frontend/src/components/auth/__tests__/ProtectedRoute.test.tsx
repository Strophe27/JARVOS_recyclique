import type { ComponentProps } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

/** État minimal consommé par ProtectedRoute (pas de duplication de la logique du store). */
const authSlice = vi.hoisted(() => ({
  isAuthenticated: false,
  currentUser: null as { role: string } | null,
  hasPermission: vi.fn((_perm: string) => false),
}));

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector: (s: typeof authSlice) => unknown) => selector(authSlice),
}));

function renderProtectedRoute(
  props: ComponentProps<typeof ProtectedRoute>,
  initialPath = '/target'
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/" element={<div data-testid="home-fallback">Home</div>} />
        <Route
          path="/custom-fallback"
          element={<div data-testid="custom-fallback">Custom</div>}
        />
        <Route
          path="/target"
          element={<ProtectedRoute {...props} />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    authSlice.isAuthenticated = false;
    authSlice.currentUser = null;
    authSlice.hasPermission.mockReset();
    authSlice.hasPermission.mockImplementation(() => false);
  });

  it('redirige vers /login quand non authentifié', () => {
    renderProtectedRoute({
      children: <div data-testid="secret">Secret</div>,
    });
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('secret')).not.toBeInTheDocument();
  });

  it('avec adminOnly, refuse un utilisateur non admin et redirige vers adminPathFallback', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'user' };
    renderProtectedRoute({
      adminOnly: true,
      adminPathFallback: '/custom-fallback',
      children: <div data-testid="secret">Secret</div>,
    });
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('secret')).not.toBeInTheDocument();
  });

  it('avec adminOnly, autorise le rôle admin', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'admin' };
    renderProtectedRoute({
      adminOnly: true,
      children: <div data-testid="secret">Secret</div>,
    });
    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });

  it('avec adminOnly, autorise le rôle super-admin', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'super-admin' };
    renderProtectedRoute({
      adminOnly: true,
      children: <div data-testid="secret">Secret</div>,
    });
    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });

  it('avec requiredPermission, redirige si hasPermission est faux', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'user' };
    authSlice.hasPermission.mockReturnValue(false);
    renderProtectedRoute({
      requiredPermission: 'caisse.access',
      adminPathFallback: '/custom-fallback',
      children: <div data-testid="secret">Secret</div>,
    });
    expect(authSlice.hasPermission).toHaveBeenCalledWith('caisse.access');
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('secret')).not.toBeInTheDocument();
  });

  it('avec requiredPermission, affiche les enfants si hasPermission est vrai', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'user' };
    authSlice.hasPermission.mockImplementation((p) => p === 'caisse.access');
    renderProtectedRoute({
      requiredPermission: 'caisse.access',
      children: <div data-testid="secret">Secret</div>,
    });
    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });

  it('avec requiredPermissions (OU), redirige si aucune permission', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'user' };
    authSlice.hasPermission.mockReturnValue(false);
    renderProtectedRoute({
      requiredPermissions: ['a.perm', 'b.perm'],
      adminPathFallback: '/custom-fallback',
      children: <div data-testid="secret">Secret</div>,
    });
    expect(authSlice.hasPermission).toHaveBeenCalledWith('a.perm');
    expect(authSlice.hasPermission).toHaveBeenCalledWith('b.perm');
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('avec requiredPermissions (OU), suffit qu’une permission soit accordée', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'user' };
    authSlice.hasPermission.mockImplementation((p) => p === 'b.perm');
    renderProtectedRoute({
      requiredPermissions: ['a.perm', 'b.perm'],
      children: <div data-testid="secret">Secret</div>,
    });
    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });

  it('avec requiredRoles, redirige si le rôle utilisateur n’est pas dans la liste', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'user' };
    renderProtectedRoute({
      requiredRoles: ['admin', 'manager'],
      adminPathFallback: '/custom-fallback',
      children: <div data-testid="secret">Secret</div>,
    });
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('avec requiredRoles, autorise si le rôle est l’un des rôles requis', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'manager' };
    renderProtectedRoute({
      requiredRoles: ['admin', 'manager'],
      children: <div data-testid="secret">Secret</div>,
    });
    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });

  it('avec requiredRole, redirige si le rôle utilisateur ne correspond pas', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'user' };
    renderProtectedRoute({
      requiredRole: 'admin',
      adminPathFallback: '/custom-fallback',
      children: <div data-testid="secret">Secret</div>,
    });
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('secret')).not.toBeInTheDocument();
  });

  it('avec requiredRole, affiche les enfants si le rôle correspond', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'admin' };
    renderProtectedRoute({
      requiredRole: 'admin',
      children: <div data-testid="secret">Secret</div>,
    });
    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });

  it('ne bloque pas si requiredRoles est un tableau vide', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'user' };
    renderProtectedRoute({
      requiredRoles: [],
      children: <div data-testid="secret">Secret</div>,
    });
    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });

  it('ne bloque pas si requiredPermissions est un tableau vide', () => {
    authSlice.isAuthenticated = true;
    authSlice.currentUser = { role: 'user' };
    renderProtectedRoute({
      requiredPermissions: [],
      children: <div data-testid="secret">Secret</div>,
    });
    expect(authSlice.hasPermission).not.toHaveBeenCalled();
    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });
});
