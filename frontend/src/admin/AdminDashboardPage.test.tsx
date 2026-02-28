/**
 * Tests AdminDashboardPage — Story 8.1, 11.4.
 * Vitest + RTL + MantineProvider. Smoke : rendu, liens, stats optionnels.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AdminDashboardPage } from './AdminDashboardPage';

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockGetPahekoAccessDecision = vi.fn();
const mockGetPaheko = vi.fn();
const mockGetDashboardStats = vi.fn();
vi.mock('../api/adminPahekoCompta', () => ({
  getPahekoAccessDecision: (...args: unknown[]) => mockGetPahekoAccessDecision(...args),
  getPahekoComptaUrl: (...args: unknown[]) => mockGetPaheko(...args),
}));
vi.mock('../api/adminDashboard', () => ({ getDashboardStats: (...args: unknown[]) => mockGetDashboardStats(...args) }));

function renderWithProviders() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      accessToken: 'token',
      permissions: ['admin'],
      user: { id: 'u-admin', username: 'admin', role: 'admin' },
    });
    mockGetPahekoAccessDecision.mockResolvedValue({ allowed: true, reason: 'role_allowed:admin' });
    mockGetPaheko.mockResolvedValue({ url: null });
    mockGetDashboardStats.mockResolvedValue(null);
  });

  it('renders page with Admin title', async () => {
    renderWithProviders();
    expect(screen.getByTestId('page-admin')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Admin/ })).toBeInTheDocument();
    await waitFor(() => expect(mockGetDashboardStats).toHaveBeenCalled());
  });

  it('shows navigation links when admin', async () => {
    renderWithProviders();
    expect(screen.getByRole('link', { name: /Utilisateurs/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sites/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Rapports caisse/ })).toBeInTheDocument();
    await waitFor(() => expect(mockGetDashboardStats).toHaveBeenCalled());
  });

  it('shows stats cards when API returns stats', async () => {
    mockGetDashboardStats.mockResolvedValue({
      users_count: 5,
      sites_count: 2,
      cash_registers_count: 3,
    });
    renderWithProviders();
    await screen.findByTestId('dashboard-stat-users');
    expect(screen.getByTestId('dashboard-stat-users')).toHaveTextContent('5');
    expect(screen.getByTestId('dashboard-stat-sites')).toHaveTextContent('2');
    expect(screen.getByTestId('dashboard-stat-registers')).toHaveTextContent('3');
  });

  it('does not show stats when getDashboardStats returns null', async () => {
    mockGetDashboardStats.mockResolvedValue(null);
    renderWithProviders();
    await waitFor(() => {
      expect(mockGetDashboardStats).toHaveBeenCalled();
      expect(screen.queryByTestId('dashboard-stat-users')).not.toBeInTheDocument();
    });
  });

  it('shows restricted message for benevole without exception', async () => {
    mockUseAuth.mockReturnValue({
      accessToken: 'token',
      permissions: ['admin'],
      user: { id: 'u-benevole', username: 'benevole', role: 'benevole' },
    });
    mockGetPahekoAccessDecision.mockResolvedValue({
      allowed: false,
      reason: 'deny_by_default_benevole',
    });
    renderWithProviders();
    expect(await screen.findByTestId('paheko-access-restricted')).toBeInTheDocument();
  });

  it('loads paheko link when backend authorizes benevole exception', async () => {
    mockUseAuth.mockReturnValue({
      accessToken: 'token',
      permissions: ['admin'],
      user: { id: 'u-benevole', username: 'benevole', role: 'benevole' },
    });
    mockGetPahekoAccessDecision.mockResolvedValue({
      allowed: true,
      reason: 'benevole_exception_active',
    });
    mockGetPaheko.mockResolvedValue({ url: 'https://paheko.example/admin/' });
    renderWithProviders();
    expect(await screen.findByRole('link', { name: /Paheko/ })).toHaveAttribute(
      'href',
      'https://paheko.example/admin/'
    );
  });

  it('shows dashboard for super_admin even without admin permission flag', async () => {
    mockUseAuth.mockReturnValue({
      accessToken: 'token',
      permissions: [],
      user: { id: 'u-super-admin', username: 'superadmin', role: 'super_admin' },
    });
    mockGetPahekoAccessDecision.mockResolvedValue({ allowed: true, reason: 'role_allowed:super_admin' });
    renderWithProviders();
    expect(screen.getByRole('heading', { name: /Admin/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Utilisateurs/ })).toBeInTheDocument();
    await waitFor(() => expect(mockGetDashboardStats).toHaveBeenCalled());
  });
});
