/**
 * Tests AdminSitesPage — Story 8.2.
 * Vitest + RTL + MantineProvider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AdminSitesPage } from './AdminSitesPage';

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockGetSites = vi.fn();
const mockCreateSite = vi.fn();
const mockUpdateSite = vi.fn();
const mockDeleteSite = vi.fn();
vi.mock('../api/admin', () => ({
  getSites: (...args: unknown[]) => mockGetSites(...args),
  createSite: (...args: unknown[]) => mockCreateSite(...args),
  updateSite: (...args: unknown[]) => mockUpdateSite(...args),
  deleteSite: (...args: unknown[]) => mockDeleteSite(...args),
}));

function renderWithProviders() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <AdminSitesPage />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('AdminSitesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'superadmin', role: 'super_admin' },
      accessToken: 'token',
      permissions: ['admin'],
    });
    mockGetSites.mockResolvedValue([]);
  });

  it('renders page with title and Nouveau site button', async () => {
    renderWithProviders();
    await screen.findByTestId('admin-sites-loading');
    expect(screen.getByTestId('admin-sites-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sites/ })).toBeInTheDocument();
    expect(screen.getByTestId('admin-sites-new')).toBeInTheDocument();
  });

  it('shows forbidden for admin non super_admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '2', username: 'admin', role: 'admin' },
      accessToken: 'token',
      permissions: ['admin'],
    });
    renderWithProviders();
    expect(screen.getByTestId('admin-sites-forbidden')).toBeInTheDocument();
  });

  it('shows empty state when no sites', async () => {
    renderWithProviders();
    await screen.findByTestId('admin-sites-empty');
    expect(screen.getByTestId('admin-sites-table')).toBeInTheDocument();
  });

  it('shows sites table when data loaded', async () => {
    mockGetSites.mockResolvedValue([
      { id: 's1', name: 'Site A', is_active: true, created_at: '', updated_at: '' },
    ]);
    renderWithProviders();
    await screen.findByTestId('admin-sites-table');
    expect(screen.getByText('Site A')).toBeInTheDocument();
  });
});
