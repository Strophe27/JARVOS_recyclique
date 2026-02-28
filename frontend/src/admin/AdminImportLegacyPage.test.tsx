/**
 * Tests AdminImportLegacyPage — Story 11.6.
 * Vitest + RTL + MantineProvider. Pas d'import React inutile.
 */
import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AdminImportLegacyPage } from './AdminImportLegacyPage';

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockGetLlmModels = vi.fn();
const mockAnalyze = vi.fn();
vi.mock('../api/adminImportLegacy', () => ({
  getAdminImportLegacyLlmModels: (...args: unknown[]) => mockGetLlmModels(...args),
  postAdminImportLegacyAnalyze: (...args: unknown[]) => mockAnalyze(...args),
  postAdminImportLegacyPreview: vi.fn(),
  postAdminImportLegacyValidate: vi.fn(),
  postAdminImportLegacyExecute: vi.fn(),
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
});
