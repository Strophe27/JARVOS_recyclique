/**
 * Tests AdminUserDetailPage — Story 8.1.
 * Vitest + RTL + MantineProvider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AdminUserDetailPage } from './AdminUserDetailPage';

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

vi.mock('../api/adminUsers', () => ({
  getAdminUser: vi.fn().mockResolvedValue({
    id: 'user-1',
    username: 'jdoe',
    email: 'jdoe@test.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'operator',
    status: 'active',
    site_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    group_ids: [],
  }),
  getAdminUserHistory: vi.fn().mockResolvedValue([]),
  getAdminGroups: vi.fn().mockResolvedValue([]),
  updateAdminUserRole: vi.fn(),
  updateAdminUserStatus: vi.fn(),
  updateAdminUserProfile: vi.fn(),
  updateAdminUserGroups: vi.fn(),
  resetAdminUserPassword: vi.fn(),
  resetAdminUserPin: vi.fn(),
}));

function renderWithProviders(userId = 'user-1') {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[`/admin/users/${userId}`]}>
        <Routes>
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      accessToken: 'token',
      permissions: ['admin'],
    });
  });

  it('renders detail page after loading user', async () => {
    renderWithProviders();
    expect(screen.getByTestId('admin-user-detail-loading')).toBeInTheDocument();
    expect(await screen.findByTestId('admin-user-detail-page')).toBeInTheDocument();
  });

  it('shows forbidden when user lacks admin permission', () => {
    mockUseAuth.mockReturnValue({ accessToken: null, permissions: ['operator'] });
    renderWithProviders();
    expect(screen.getByTestId('admin-user-detail-forbidden')).toBeInTheDocument();
  });
});
