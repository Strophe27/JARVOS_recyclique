/**
 * Tests AdminUsersListPage — Story 8.1.
 * Vitest + RTL + MantineProvider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AdminUsersListPage } from './AdminUsersListPage';

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

vi.mock('../api/adminUsers', () => ({
  getAdminUsers: vi.fn().mockResolvedValue([]),
  getAdminUsersPending: vi.fn().mockResolvedValue([]),
  getAdminUsersStatuses: vi.fn().mockResolvedValue({ online_user_ids: [] }),
  approveRegistration: vi.fn(),
  rejectRegistration: vi.fn(),
}));

function renderWithProviders() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <AdminUsersListPage />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('AdminUsersListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      accessToken: 'token',
      permissions: ['admin'],
    });
  });

  it('renders list page with title and Nouveau button', async () => {
    renderWithProviders();
    expect(screen.getByTestId('admin-users-list-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Utilisateurs/ })).toBeInTheDocument();
    expect(screen.getByTestId('admin-users-new')).toBeInTheDocument();
    await screen.findByTestId('admin-users-empty');
  });

  it('shows forbidden when user lacks admin permission', () => {
    mockUseAuth.mockReturnValue({ accessToken: null, permissions: ['operator'] });
    renderWithProviders();
    expect(screen.getByTestId('admin-users-forbidden')).toBeInTheDocument();
  });

  it('shows Liste and En attente tabs', async () => {
    renderWithProviders();
    expect(screen.getByTestId('tab-list')).toBeInTheDocument();
    expect(screen.getByTestId('tab-pending')).toBeInTheDocument();
    await screen.findByTestId('admin-users-empty');
  });

  it('shows pagination controls when on list tab', async () => {
    const api = await import('../api/adminUsers');
    (api.getAdminUsers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: '1', username: 'u', email: 'u@t.com', first_name: null, last_name: null, role: 'operator', status: 'active', site_id: null, created_at: '', updated_at: '' },
    ]);
    renderWithProviders();
    await screen.findByTestId('admin-users-pagination');
    expect(screen.getByTestId('pagination-page')).toHaveTextContent('Page 1');
    expect(screen.getByTestId('pagination-prev')).toBeDisabled();
  });
});
