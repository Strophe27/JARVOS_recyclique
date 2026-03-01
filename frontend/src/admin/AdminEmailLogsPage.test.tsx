/**
 * Tests AdminEmailLogsPage — Story 8.4, 11.5.
 * Vitest + RTL + MantineProvider. Smoke : rendu, tableau logs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AdminEmailLogsPage } from './AdminEmailLogsPage';

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockGetAdminEmailLogs = vi.fn();
vi.mock('../api/adminHealthAudit', () => ({
  getAdminEmailLogs: (...args: unknown[]) => mockGetAdminEmailLogs(...args),
}));

function renderWithProviders() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <AdminEmailLogsPage />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('AdminEmailLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      permissions: ['admin'],
      accessToken: 'token',
    });
    mockGetAdminEmailLogs.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    });
  });

  it('affiche forbidden quand pas admin', () => {
    mockUseAuth.mockReturnValue({ permissions: [], accessToken: 'token' });
    renderWithProviders();
    expect(screen.getByTestId('admin-email-logs-forbidden')).toBeInTheDocument();
  });

  it('affiche la page et le tableau après chargement', async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(mockGetAdminEmailLogs).toHaveBeenCalledWith('token', expect.any(Object));
    });
    expect(screen.getByTestId('admin-email-logs-page')).toBeInTheDocument();
    expect(screen.getByTestId('admin-email-logs-table')).toBeInTheDocument();
    expect(screen.getByTestId('admin-email-logs-empty')).toBeInTheDocument();
  });

  it('affiche les items quand le mock retourne des données', async () => {
    mockGetAdminEmailLogs.mockResolvedValue({
      items: [
        {
          id: '1',
          sent_at: '2026-03-01T10:00:00Z',
          recipient: 'admin@test.local',
          subject: 'Test notifications',
          status: 'sent',
        },
        {
          id: '2',
          sent_at: '2026-03-01T11:00:00Z',
          recipient: 'user@test.local',
          subject: 'Alerte',
          status: 'failed',
        },
      ],
      total: 2,
      page: 1,
      page_size: 20,
    });
    renderWithProviders();
    await waitFor(() => {
      expect(screen.queryByTestId('admin-email-logs-loading')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('admin-email-logs-page')).toBeInTheDocument();
    expect(screen.getByTestId('admin-email-logs-table')).toBeInTheDocument();
    expect(screen.getByText('admin@test.local')).toBeInTheDocument();
    expect(screen.getByText('Test notifications')).toBeInTheDocument();
    expect(screen.getByText('sent')).toBeInTheDocument();
    expect(screen.getByText('user@test.local')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-email-logs-empty')).not.toBeInTheDocument();
  });
});
