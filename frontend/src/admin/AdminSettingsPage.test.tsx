/**
 * Tests AdminSettingsPage — Story 8.4, 11.5.
 * Vitest + RTL + MantineProvider. Smoke : rendu, onglets, seuil activité, test email.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AdminSettingsPage } from './AdminSettingsPage';

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockGetAdminSettings = vi.fn();
const mockPutAdminSettings = vi.fn();
const mockPostEmailTest = vi.fn();
vi.mock('../api/adminHealthAudit', () => ({
  getAdminSettings: (...args: unknown[]) => mockGetAdminSettings(...args),
  putAdminSettings: (...args: unknown[]) => mockPutAdminSettings(...args),
  postAdminSettingsEmailTest: (...args: unknown[]) => mockPostEmailTest(...args),
}));

function renderWithProviders() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <AdminSettingsPage />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'superadmin', role: 'super_admin' },
      permissions: ['admin'],
      accessToken: 'token',
    });
    mockGetAdminSettings.mockResolvedValue({
      alert_thresholds: null,
      session: null,
      email: null,
      activity_threshold: 30,
    });
  });

  it('affiche forbidden pour admin non super_admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '2', username: 'admin', role: 'admin' },
      permissions: ['admin'],
      accessToken: 'token',
    });
    renderWithProviders();
    expect(screen.getByTestId('admin-settings-forbidden')).toBeInTheDocument();
  });

  it('affiche la page avec onglets après chargement', async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(mockGetAdminSettings).toHaveBeenCalledWith('token');
    });
    expect(screen.getByTestId('admin-settings-page')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Seuil d'activité/ })).toBeInTheDocument();
    expect(screen.getByTestId('input-activity-threshold')).toBeInTheDocument();
    expect(screen.getByTestId('save-activity')).toBeInTheDocument();
    expect(screen.getByTestId('btn-test-email')).toBeInTheDocument();
  });
});
