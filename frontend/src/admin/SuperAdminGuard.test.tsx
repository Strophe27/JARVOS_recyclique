/**
 * Tests SuperAdminGuard — Story 17.1.
 * Verifie /admin/health, /admin/settings, /admin/sites : super_admin autorise, admin bloque, anon redirige.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { SuperAdminGuard } from './SuperAdminGuard';

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

function renderAt(path: '/admin/health' | '/admin/settings' | '/admin/sites') {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route
            path="/admin/health"
            element={
              <SuperAdminGuard>
                <div data-testid="health-protected">health</div>
              </SuperAdminGuard>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <SuperAdminGuard>
                <div data-testid="settings-protected">settings</div>
              </SuperAdminGuard>
            }
          />
          <Route
            path="/admin/sites"
            element={
              <SuperAdminGuard>
                <div data-testid="sites-protected">sites</div>
              </SuperAdminGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('SuperAdminGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['/admin/health', '/admin/settings', '/admin/sites'] as const)(
    'autorise super_admin sur %s',
    (path) => {
      mockUseAuth.mockReturnValue({
        user: { id: 'sa-1', username: 'superadmin', role: 'super_admin' },
        permissions: ['admin'],
      });
      renderAt(path);
      expect(screen.queryByTestId('super-admin-forbidden')).not.toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    },
  );

  it.each(['/admin/health', '/admin/settings', '/admin/sites'] as const)(
    'bloque admin non super_admin sur %s',
    (path) => {
      mockUseAuth.mockReturnValue({
        user: { id: 'a-1', username: 'admin', role: 'admin' },
        permissions: ['admin'],
      });
      renderAt(path);
      expect(screen.getByTestId('super-admin-forbidden')).toBeInTheDocument();
      expect(screen.getByText(/super-administrateurs/i)).toBeInTheDocument();
    },
  );

  it.each(['/admin/health', '/admin/settings', '/admin/sites'] as const)(
    'redirige vers login si non authentifie sur %s',
    (path) => {
      mockUseAuth.mockReturnValue({
        user: null,
        permissions: [],
      });
      renderAt(path);
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('super-admin-forbidden')).not.toBeInTheDocument();
    },
  );
});
