/**
 * Tests AdminImportLegacyPage — Story 11.6 / 17.5.
 * Vitest + RTL + MantineProvider. Mocks retournent objets valides (rows/total, valid/errors, imported_count).
 */
import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AdminImportLegacyPage } from './AdminImportLegacyPage';

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockGetLlmModels = vi.fn();
const mockAnalyze = vi.fn();
const mockPreview = vi.fn();
const mockValidate = vi.fn();
const mockExecute = vi.fn();
vi.mock('../api/adminImportLegacy', () => ({
  getAdminImportLegacyLlmModels: (...args: unknown[]) => mockGetLlmModels(...args),
  postAdminImportLegacyAnalyze: (...args: unknown[]) => mockAnalyze(...args),
  postAdminImportLegacyPreview: (...args: unknown[]) => mockPreview(...args),
  postAdminImportLegacyValidate: (...args: unknown[]) => mockValidate(...args),
  postAdminImportLegacyExecute: (...args: unknown[]) => mockExecute(...args),
}));

function renderWithProviders(ui: ReactElement) {
  return render(
    <MantineProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </MantineProvider>
  );
}

describe('AdminImportLegacyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      permissions: ['admin'],
      accessToken: 'token',
    });
    mockGetLlmModels.mockResolvedValue({ models: [] });
    mockAnalyze.mockResolvedValue({
      columns: ['name', 'parent_id', 'official_name', 'is_visible_sale', 'is_visible_reception', 'display_order', 'display_order_entry'],
      row_count: 1,
      errors: [],
      warnings: [],
    });
    mockPreview.mockResolvedValue({ rows: [{ row_index: 2, name: 'TestCat', valid: true }], total: 1 });
    mockValidate.mockResolvedValue({ valid: true, errors: [], warnings: [] });
    mockExecute.mockResolvedValue({ imported_count: 1, errors: [], message: '1 categorie(s) importee(s)' });
  });

  it('affiche forbidden quand pas admin', () => {
    mockUseAuth.mockReturnValue({ permissions: [], accessToken: 'token' });
    renderWithProviders(<AdminImportLegacyPage />);
    expect(screen.getByTestId('admin-import-legacy-forbidden')).toBeInTheDocument();
  });

  it('affiche la page avec titre et boutons analyze, preview, validate, execute', async () => {
    renderWithProviders(<AdminImportLegacyPage />);
    await waitFor(() => {
      expect(screen.getByTestId('admin-import-legacy-page')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /Import legacy/ })).toBeInTheDocument();
    expect(screen.getByTestId('btn-legacy-analyze')).toBeInTheDocument();
    expect(screen.getByTestId('btn-legacy-preview')).toBeInTheDocument();
    expect(screen.getByTestId('btn-legacy-validate')).toBeInTheDocument();
    expect(screen.getByTestId('btn-legacy-execute')).toBeInTheDocument();
  });

  it('affiche input fichier CSV', async () => {
    renderWithProviders(<AdminImportLegacyPage />);
    expect(await screen.findByTestId('input-legacy-csv')).toBeInTheDocument();
  });

  it('exige csvFile avant preview et affiche erreur si absent', async () => {
    renderWithProviders(<AdminImportLegacyPage />);
    await waitFor(() => expect(screen.getByTestId('admin-import-legacy-page')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('btn-legacy-preview'));
    await waitFor(() => expect(screen.getByText(/Veuillez sélectionner un fichier CSV/i)).toBeInTheDocument());
    expect(mockPreview).not.toHaveBeenCalled();
  });

  it('exige csvFile avant validate et execute', async () => {
    renderWithProviders(<AdminImportLegacyPage />);
    await waitFor(() => expect(screen.getByTestId('admin-import-legacy-page')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('btn-legacy-validate'));
    await waitFor(() => expect(screen.getByText(/Veuillez sélectionner un fichier CSV/i)).toBeInTheDocument());
    expect(mockValidate).not.toHaveBeenCalled();

    vi.clearAllMocks();
    await userEvent.click(screen.getByTestId('btn-legacy-execute'));
    await waitFor(() => expect(screen.getByText(/Veuillez sélectionner un fichier CSV/i)).toBeInTheDocument());
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('passe csvFile aux appels analyze, preview, validate, execute', async () => {
    renderWithProviders(<AdminImportLegacyPage />);
    const input = await screen.findByTestId('input-legacy-csv');
    const file = new File(['name,parent_id\nCat1,'], 'test.csv', { type: 'text/csv' });
    await userEvent.upload(input, file);

    await userEvent.click(screen.getByTestId('btn-legacy-analyze'));
    await waitFor(() => expect(mockAnalyze).toHaveBeenCalledWith('token', file));

    await userEvent.click(screen.getByTestId('btn-legacy-preview'));
    await waitFor(() => expect(mockPreview).toHaveBeenCalledWith('token', file));

    await userEvent.click(screen.getByTestId('btn-legacy-validate'));
    await waitFor(() => expect(mockValidate).toHaveBeenCalledWith('token', file));

    await userEvent.click(screen.getByTestId('btn-legacy-execute'));
    await waitFor(() => expect(mockExecute).toHaveBeenCalledWith('token', file));
  });

  it('affiche resultats analyze (columns, row_count, errors)', async () => {
    renderWithProviders(<AdminImportLegacyPage />);
    const input = await screen.findByTestId('input-legacy-csv');
    const file = new File(['name,parent_id\nCat1,'], 'test.csv', { type: 'text/csv' });
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByTestId('btn-legacy-analyze'));
    await waitFor(() => expect(screen.getByTestId('result-analyze')).toBeInTheDocument());
    expect(screen.getByTestId('result-analyze')).toHaveTextContent(/Lignes : 1/);
  });
});
