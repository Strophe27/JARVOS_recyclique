/**
 * Tests AdminReportsPage — Story 8.2, 11.4, 17.9.
 * Vitest + RTL + MantineProvider. Smoke : rendu, liste, export bulk, téléchargements.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AdminReportsPage } from './AdminReportsPage';

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockGetSites = vi.fn();
const mockGetCashSessionReportsList = vi.fn();
const mockGetReportBySession = vi.fn();
const mockPostExportBulk = vi.fn();
vi.mock('../api/admin', () => ({ getSites: (...args: unknown[]) => mockGetSites(...args) }));
vi.mock('../api/adminReports', () => ({
  getCashSessionReportsList: (...args: unknown[]) => mockGetCashSessionReportsList(...args),
  getReportBySession: (...args: unknown[]) => mockGetReportBySession(...args),
  postExportBulk: (...args: unknown[]) => mockPostExportBulk(...args),
}));

function renderWithProviders() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <AdminReportsPage />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('AdminReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ accessToken: 'token', permissions: ['admin'] });
    mockGetSites.mockResolvedValue([]);
    mockGetCashSessionReportsList.mockResolvedValue([]);
    mockGetReportBySession.mockResolvedValue({
      blob: new Blob(['csv content'], { type: 'text/csv' }),
      filename: 'rapport-session-abc.csv',
    });
    mockPostExportBulk.mockResolvedValue({
      blob: new Blob([], { type: 'application/zip' }),
      filename: 'export-bulk-2026-03-01.zip',
    });
  });

  it('renders page with title and Export bulk button', async () => {
    renderWithProviders();
    await screen.findByTestId('admin-reports-loading');
    expect(screen.getByTestId('admin-reports-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Rapports caisse/ })).toBeInTheDocument();
    expect(screen.getByTestId('admin-reports-bulk')).toBeInTheDocument();
  });

  it('shows forbidden when user lacks admin permission', () => {
    mockUseAuth.mockReturnValue({ accessToken: null, permissions: ['operator'] });
    renderWithProviders();
    expect(screen.getByTestId('admin-reports-forbidden')).toBeInTheDocument();
  });

  it('shows empty state when no reports', async () => {
    renderWithProviders();
    await screen.findByTestId('admin-reports-empty');
    expect(screen.getByTestId('admin-reports-table')).toBeInTheDocument();
  });

  it('calls getReportBySession and triggers download when clicking Télécharger', async () => {
    mockGetCashSessionReportsList.mockResolvedValue([
      { session_id: 'sid-1', opened_at: '2026-03-01T10:00:00Z', closed_at: '2026-03-01T18:00:00Z', site_id: 's1', register_id: 'r1', operator_id: 'o1', status: 'closed' },
    ]);
    renderWithProviders();
    await screen.findByTestId('admin-reports-table');
    const downloadBtn = screen.getByTestId('download-sid-1');
    await userEvent.click(downloadBtn);
    expect(mockGetReportBySession).toHaveBeenCalledWith('token', 'sid-1');
  });

  it('calls postExportBulk and shows confirmation when export bulk succeeds', async () => {
    renderWithProviders();
    await screen.findByTestId('admin-reports-empty');
    await userEvent.click(screen.getByTestId('admin-reports-bulk'));
    await screen.findByTestId('bulk-date-from');
    await userEvent.click(screen.getByTestId('bulk-submit'));
    expect(mockPostExportBulk).toHaveBeenCalled();
    expect(await screen.findByText('Export téléchargé.')).toBeInTheDocument();
  });
});
