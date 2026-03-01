/**
 * Tests AdminDashboardPage — Story 15.5.
 * Vitest + RTL + MantineProvider.
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
vi.mock('../api/adminDashboard', () => ({
  getDashboardStats: (...args: unknown[]) => mockGetDashboardStats(...args),
}));

function renderWithProviders() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

function adminAuth(role: 'admin' | 'super_admin' = 'admin') {
  return {
    accessToken: 'token',
    permissions: ['admin'],
    user: { id: `u-${role}`, username: role, role },
  };
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(adminAuth());
    mockGetPahekoAccessDecision.mockResolvedValue({ allowed: true, reason: 'role_allowed:admin' });
    mockGetPaheko.mockResolvedValue({ url: null });
    mockGetDashboardStats.mockResolvedValue(null);
  });

  // --- Title ---
  it('renders dashboard title', async () => {
    renderWithProviders();
    expect(screen.getByTestId('page-admin')).toBeInTheDocument();
    expect(screen.getByTestId('admin-dashboard-title')).toHaveTextContent(
      "Tableau de Bord d'Administration",
    );
    await waitFor(() => expect(mockGetDashboardStats).toHaveBeenCalled());
  });

  // --- Summary bar ---
  it('renders summary bar with 3 cells', async () => {
    renderWithProviders();
    expect(screen.getByTestId('admin-summary-bar')).toBeInTheDocument();
    expect(screen.getByTestId('admin-summary-notifications')).toBeInTheDocument();
    expect(screen.getByTestId('admin-summary-ca-mois')).toBeInTheDocument();
    expect(screen.getByTestId('admin-summary-connected-users')).toBeInTheDocument();
    await waitFor(() => expect(mockGetDashboardStats).toHaveBeenCalled());
  });

  // --- Stats cards ---
  it('renders 3 stat cards with default values (0)', async () => {
    renderWithProviders();
    await waitFor(() => expect(mockGetDashboardStats).toHaveBeenCalled());
    const financier = screen.getByTestId('admin-stat-financier');
    expect(financier).toHaveTextContent('Financier');
    expect(financier).toHaveTextContent('0.00');

    const poidsSorti = screen.getByTestId('admin-stat-poids-sorti');
    expect(poidsSorti).toHaveTextContent('Poids sorti');
    expect(poidsSorti).toHaveTextContent('0.0');

    const poidsRecu = screen.getByTestId('admin-stat-poids-recu');
    expect(poidsRecu).toHaveTextContent('Poids re');
    expect(poidsRecu).toHaveTextContent('0.0');
  });

  it('renders stat values from API', async () => {
    mockGetDashboardStats.mockResolvedValue({
      ca_jour: 15000,
      dons_jour: 500,
      poids_sorti_kg: 12.5,
      poids_recu_kg: 8.3,
      ca_mois: 120000,
      notifications_count: 3,
      connected_users_count: 5,
    });
    renderWithProviders();
    await waitFor(() => expect(mockGetDashboardStats).toHaveBeenCalled());

    expect(screen.getByTestId('admin-stat-financier')).toHaveTextContent('150.00');
    expect(screen.getByTestId('admin-stat-poids-sorti')).toHaveTextContent('12.5');
    expect(screen.getByTestId('admin-stat-poids-recu')).toHaveTextContent('8.3');
    expect(screen.getByTestId('admin-summary-ca-mois')).toHaveTextContent('1200.00');
    expect(screen.getByTestId('admin-summary-notifications')).toHaveTextContent('3');
    expect(screen.getByTestId('admin-summary-connected-users')).toHaveTextContent('5');
  });

  // --- Navigation blocks ---
  it('renders 6 navigation blocks with correct links', async () => {
    renderWithProviders();
    const users = screen.getByTestId('admin-nav-users');
    expect(users).toHaveTextContent('Utilisateurs');
    expect(users).toHaveAttribute('href', '/admin/users');

    const groups = screen.getByTestId('admin-nav-groups');
    expect(groups).toHaveTextContent('Groupes');
    expect(groups).toHaveAttribute('href', '/admin/groups');

    const cats = screen.getByTestId('admin-nav-categories');
    expect(cats).toHaveTextContent('Cat');
    expect(cats).toHaveAttribute('href', '/admin/categories');

    const sessions = screen.getByTestId('admin-nav-sessions-caisse');
    expect(sessions).toHaveTextContent('Sessions de Caisse');
    expect(sessions).toHaveAttribute('href', '/admin/session-manager');

    const reception = screen.getByTestId('admin-nav-sessions-reception');
    expect(reception).toHaveTextContent('ception');
    expect(reception).toHaveAttribute('href', '/admin/reception');

    const activity = screen.getByTestId('admin-nav-activity');
    expect(activity).toHaveTextContent('Activit');
    expect(activity).toHaveAttribute('href', '/admin/audit-log');

    await waitFor(() => expect(mockGetDashboardStats).toHaveBeenCalled());
  });

  // --- Super-admin section ---
  it('shows super-admin section for super_admin role', async () => {
    mockUseAuth.mockReturnValue(adminAuth('super_admin'));
    mockGetPahekoAccessDecision.mockResolvedValue({
      allowed: true,
      reason: 'role_allowed:super_admin',
    });
    renderWithProviders();

    expect(screen.getByTestId('admin-superadmin-section')).toBeInTheDocument();
    expect(screen.getByTestId('admin-superadmin-health')).toHaveAttribute('href', '/admin/health');
    expect(screen.getByTestId('admin-superadmin-settings')).toHaveAttribute(
      'href',
      '/admin/settings',
    );
    expect(screen.getByTestId('admin-superadmin-sites')).toHaveAttribute('href', '/admin/sites');
    await waitFor(() => expect(mockGetDashboardStats).toHaveBeenCalled());
  });

  it('hides super-admin section for regular admin', async () => {
    renderWithProviders();
    expect(screen.queryByTestId('admin-superadmin-section')).not.toBeInTheDocument();
    await waitFor(() => expect(mockGetDashboardStats).toHaveBeenCalled());
  });

  // --- Paheko ---
  it('shows Paheko link when authorized and URL available', async () => {
    mockGetPaheko.mockResolvedValue({ url: 'https://paheko.example/admin/' });
    renderWithProviders();
    const link = await screen.findByRole('link', { name: /Paheko/ });
    expect(link).toHaveAttribute('href', 'https://paheko.example/admin/');
  });

  it('shows restricted message when Paheko access denied', async () => {
    mockGetPahekoAccessDecision.mockResolvedValue({
      allowed: false,
      reason: 'deny_by_default',
    });
    renderWithProviders();
    expect(await screen.findByTestId('paheko-access-restricted')).toBeInTheDocument();
  });
});
