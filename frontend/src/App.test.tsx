/**
 * Tests d'intégration App / routeur global — Story 17.4.
 * Parcours /admin : non authentifié → login, sans admin → forbidden, avec admin → page-admin.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
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

function renderAt(path: string) {
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

describe('App — intégration routeur /admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPahekoAccessDecision.mockResolvedValue({ allowed: false, reason: 'deny_by_default' });
    mockGetPahekoComptaUrl.mockResolvedValue({ url: null });
    mockGetDashboardStats.mockResolvedValue(null);
  });

  it('redirige vers /login si non authentifié', () => {
    mockUseAuth.mockReturnValue({ user: null, permissions: [] });
    renderAt('/admin');
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('affiche admin-forbidden si utilisateur sans permission admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'operator' },
      permissions: ['operator'],
    });
    renderAt('/admin');
    expect(screen.getByTestId('admin-forbidden')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('affiche page-admin si utilisateur avec permission admin', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'admin', role: 'admin' },
      permissions: ['admin'],
      accessToken: 'token',
    });
    renderAt('/admin');
    await waitFor(() => expect(screen.getByTestId('page-admin')).toBeInTheDocument());
    expect(screen.queryByTestId('admin-forbidden')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });
});
