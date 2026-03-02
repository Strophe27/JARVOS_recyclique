/**
 * Tests d'intégration App / routeur global — Story 17.4, 17-HF-1.
 * Parcours /admin : non authentifié → login, sans admin → forbidden, avec admin → page-admin.
 * Parcours /dashboard, /caisse, /reception : non authentifié → login (AuthGuard).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AuthGuard } from './auth/AuthGuard';
import { AdminGuard } from './admin/AdminGuard';
import { AdminDashboardPage } from './admin/AdminDashboardPage';

const mockUseAuth = vi.fn();
vi.mock('./auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockGetPahekoAccessDecision = vi.fn();
const mockGetPahekoComptaUrl = vi.fn();
const mockGetDashboardStats = vi.fn();
vi.mock('./api/adminPahekoCompta', () => ({
  getPahekoAccessDecision: (...args: unknown[]) => mockGetPahekoAccessDecision(...args),
  getPahekoComptaUrl: (...args: unknown[]) => mockGetPahekoComptaUrl(...args),
}));
vi.mock('./api/adminDashboard', () => ({
  getDashboardStats: (...args: unknown[]) => mockGetDashboardStats(...args),
}));

function renderAdmin(path: string) {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminDashboardPage />
              </AdminGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

function renderAuthGuarded(path: string) {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/dashboard" element={<AuthGuard><div data-testid="dashboard-page">Dashboard</div></AuthGuard>} />
          <Route path="/caisse" element={<AuthGuard><div data-testid="caisse-page">Caisse</div></AuthGuard>} />
          <Route path="/reception" element={<AuthGuard><div data-testid="reception-page">Reception</div></AuthGuard>} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('App — intégration routeur /admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPahekoAccessDecision.mockResolvedValue({ allowed: false, reason: 'deny_by_default' });
    mockGetPahekoComptaUrl.mockResolvedValue({ url: null });
    mockGetDashboardStats.mockResolvedValue(null);
  });

  it('redirige vers /login si non authentifié', () => {
    mockUseAuth.mockReturnValue({ user: null, permissions: [], isHydrated: true });
    renderAdmin('/admin');
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('affiche admin-forbidden si utilisateur sans permission admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'operator' },
      permissions: ['operator'],
      isHydrated: true,
    });
    renderAdmin('/admin');
    expect(screen.getByTestId('admin-forbidden')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('affiche page-admin si utilisateur avec permission admin', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'admin', role: 'admin' },
      permissions: ['admin'],
      accessToken: 'token',
      isHydrated: true,
    });
    renderAdmin('/admin');
    await waitFor(() => expect(screen.getByTestId('page-admin')).toBeInTheDocument());
    expect(screen.queryByTestId('admin-forbidden')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });
});

describe('App — AuthGuard routes /dashboard, /caisse, /reception', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('/dashboard non-auth → redirection /login', () => {
    mockUseAuth.mockReturnValue({ user: null, isHydrated: true });
    renderAuthGuarded('/dashboard');
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
  });

  it('/caisse non-auth → redirection /login', () => {
    mockUseAuth.mockReturnValue({ user: null, isHydrated: true });
    renderAuthGuarded('/caisse');
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('caisse-page')).not.toBeInTheDocument();
  });

  it('/reception non-auth → redirection /login', () => {
    mockUseAuth.mockReturnValue({ user: null, isHydrated: true });
    renderAuthGuarded('/reception');
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('reception-page')).not.toBeInTheDocument();
  });

  it('/dashboard auth → affiche page', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1', username: 'u1' }, isHydrated: true });
    renderAuthGuarded('/dashboard');
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('/caisse auth → affiche page', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1', username: 'u1' }, isHydrated: true });
    renderAuthGuarded('/caisse');
    expect(screen.getByTestId('caisse-page')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });
});
