/**
 * Tests AdminDbPage — Story 18.3.
 * Vitest + RTL + MantineProvider. Mock API et AuthContext.
 * Couvre AC6 : export, import, purge (flux nominaux + erreurs), accès super_admin.
 */
import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { AdminDbPage } from './AdminDbPage';

const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockPostAdminDbExport = vi.fn();
const mockPostAdminDbPurgeTransactions = vi.fn();
const mockPostAdminDbImport = vi.fn();
vi.mock('../api/adminDb', () => ({
  postAdminDbExport: (...args: unknown[]) => mockPostAdminDbExport(...args),
  postAdminDbPurgeTransactions: (...args: unknown[]) => mockPostAdminDbPurgeTransactions(...args),
  postAdminDbImport: (...args: unknown[]) => mockPostAdminDbImport(...args),
}));

function renderWithProviders(ui: ReactElement) {
  return render(
    <MantineProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </MantineProvider>
  );
}

const defaultPurgeResult = {
  message: 'Purge OK',
  deleted_records: {
    sale_items: 10,
    sales: 5,
    ligne_depot: 3,
    ticket_depot: 2,
    cash_sessions: 1,
  },
  timestamp: '2026-03-02T12:00:00Z',
};

const defaultImportResult = {
  message: 'Import OK',
  imported_file: 'backup.dump',
  backup_created: 'pre_restore_20260302.dump',
  backup_path: '/backups/pre_restore_20260302.dump',
  timestamp: '2026-03-02T12:00:00Z',
};

describe('AdminDbPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'superadmin' },
      permissions: ['super_admin'],
      accessToken: 'token',
    });
    mockPostAdminDbExport.mockResolvedValue(undefined);
    mockPostAdminDbPurgeTransactions.mockResolvedValue(defaultPurgeResult);
    mockPostAdminDbImport.mockResolvedValue(defaultImportResult);
  });

  // --- Accès ---

  it('affiche forbidden quand user sans super_admin (AC4)', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      permissions: ['admin'],
      accessToken: 'token',
    });
    renderWithProviders(<AdminDbPage />);
    expect(screen.getByTestId('admin-db-forbidden')).toBeInTheDocument();
    expect(screen.getByText(/Accès réservé aux super-administrateurs/)).toBeInTheDocument();
  });

  it('affiche la page avec les 3 boutons pour super_admin', () => {
    renderWithProviders(<AdminDbPage />);
    expect(screen.getByTestId('admin-db-page')).toBeInTheDocument();
    expect(screen.getByTestId('btn-db-export-open')).toBeInTheDocument();
    expect(screen.getByTestId('btn-db-import-open')).toBeInTheDocument();
    expect(screen.getByTestId('btn-db-purge-open')).toBeInTheDocument();
  });

  // --- Export ---

  it('Export : clic bouton → modale de confirmation ouverte', async () => {
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-export-open'));
    expect(await screen.findByTestId('modal-export-confirm')).toBeInTheDocument();
    expect(mockPostAdminDbExport).not.toHaveBeenCalled();
  });

  it('Export : clic confirmer → fetch appelé → succès affiché', async () => {
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-export-open'));
    await screen.findByTestId('modal-export-confirm');
    fireEvent.click(screen.getByTestId('btn-db-export-confirm'));
    await waitFor(() => {
      expect(mockPostAdminDbExport).toHaveBeenCalledWith('token');
    });
    expect(
      await screen.findByText(/Export de la base de données réussi/)
    ).toBeInTheDocument();
  });

  it('Export : clic annuler dans la modale → fetch non appelé', async () => {
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-export-open'));
    await screen.findByTestId('modal-export-confirm');
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => {
      expect(mockPostAdminDbExport).not.toHaveBeenCalled();
    });
  });

  it('Export : erreur serveur → Alert rouge affiché avec le message', async () => {
    mockPostAdminDbExport.mockRejectedValue(new Error('Serveur indisponible'));
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-export-open'));
    await screen.findByTestId('modal-export-confirm');
    fireEvent.click(await screen.findByTestId('btn-db-export-confirm'));
    expect(await screen.findByText(/Serveur indisponible/)).toBeInTheDocument();
  });

  // --- Import ---

  it('Import : sélection fichier .sql → erreur validation affichée, bouton final désactivé', async () => {
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-import-open'));
    await screen.findByTestId('input-db-import-file');
    const file = new File(['content'], 'backup.sql', { type: 'application/sql' });
    fireEvent.change(screen.getByTestId('input-db-import-file'), {
      target: { files: [file] },
    });
    expect(
      screen.getByText(/Veuillez sélectionner un fichier .dump/)
    ).toBeInTheDocument();
    expect(screen.getByTestId('btn-db-import-confirm')).toBeDisabled();
  });

  it('Import : fichier > 500 MB → erreur taille affichée, bouton désactivé', async () => {
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-import-open'));
    await screen.findByTestId('input-db-import-file');
    const bigFile = new File(['x'], 'backup.dump', { type: 'application/octet-stream' });
    Object.defineProperty(bigFile, 'size', { value: 501 * 1024 * 1024 });
    fireEvent.change(screen.getByTestId('input-db-import-file'), {
      target: { files: [bigFile] },
    });
    expect(screen.getByText(/trop volumineux/)).toBeInTheDocument();
    expect(screen.getByTestId('btn-db-import-confirm')).toBeDisabled();
  });

  it('Import : saisie incorrecte → bouton final désactivé', async () => {
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-import-open'));
    await screen.findByTestId('input-db-import-file');
    const file = new File(['content'], 'backup.dump', { type: 'application/octet-stream' });
    fireEvent.change(screen.getByTestId('input-db-import-file'), {
      target: { files: [file] },
    });
    fireEvent.change(screen.getByTestId('input-import-confirm-text'), {
      target: { value: 'WRONG' },
    });
    expect(screen.getByTestId('btn-db-import-confirm')).toBeDisabled();
  });

  it('Import : fichier .dump valide + saisie RESTAURER → fetch appelé → succès', async () => {
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-import-open'));
    await screen.findByTestId('input-db-import-file');
    const file = new File(['content'], 'backup.dump', { type: 'application/octet-stream' });
    fireEvent.change(screen.getByTestId('input-db-import-file'), {
      target: { files: [file] },
    });
    fireEvent.change(screen.getByTestId('input-import-confirm-text'), {
      target: { value: 'RESTAURER' },
    });
    expect(screen.getByTestId('btn-db-import-confirm')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('btn-db-import-confirm'));
    await waitFor(() => {
      expect(mockPostAdminDbImport).toHaveBeenCalledWith('token', file);
    });
    expect(await screen.findByText(/Import réussi/)).toBeInTheDocument();
    expect(screen.getByText(/backup.dump/)).toBeInTheDocument();
  });

  it('Import : erreur serveur → Alert rouge affiché dans la modale', async () => {
    mockPostAdminDbImport.mockRejectedValue(new Error('Erreur import serveur'));
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-import-open'));
    await screen.findByTestId('input-db-import-file');
    const file = new File(['content'], 'backup.dump', { type: 'application/octet-stream' });
    fireEvent.change(screen.getByTestId('input-db-import-file'), {
      target: { files: [file] },
    });
    fireEvent.change(screen.getByTestId('input-import-confirm-text'), {
      target: { value: 'RESTAURER' },
    });
    fireEvent.click(screen.getByTestId('btn-db-import-confirm'));
    expect(await screen.findByText(/Erreur import serveur/)).toBeInTheDocument();
  });

  // --- Purge ---

  it('Purge : flux 3 étapes → saisie "Adieu la base" → fetch → succès avec deleted_records', async () => {
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-purge-open'));
    // Étape 1
    expect(await screen.findByTestId('btn-purge-step1-confirm')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-purge-step1-confirm'));
    // Étape 2
    expect(await screen.findByTestId('btn-purge-step2-confirm')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-purge-step2-confirm'));
    // Étape 3
    expect(await screen.findByTestId('input-purge-confirm-text')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('input-purge-confirm-text'), {
      target: { value: 'Adieu la base' },
    });
    expect(screen.getByTestId('btn-purge-final-confirm')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('btn-purge-final-confirm'));
    await waitFor(() => {
      expect(mockPostAdminDbPurgeTransactions).toHaveBeenCalledWith('token');
    });
    expect(await screen.findByText(/Purge réussie/)).toBeInTheDocument();
    expect(screen.getByText(/sale_items: 10/)).toBeInTheDocument();
  });

  it('Purge : annuler à l\'étape 2 → modale fermée, purgeStep remis à 0', async () => {
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-purge-open'));
    await screen.findByTestId('btn-purge-step1-confirm');
    fireEvent.click(screen.getByTestId('btn-purge-step1-confirm'));
    await screen.findByTestId('btn-purge-step2-confirm');
    // Clic Annuler à l'étape 2
    const annulerButtons = screen.getAllByRole('button', { name: 'Annuler' });
    fireEvent.click(annulerButtons[annulerButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByTestId('btn-purge-step2-confirm')).not.toBeInTheDocument();
    });
    expect(mockPostAdminDbPurgeTransactions).not.toHaveBeenCalled();
  });

  it('Purge : mauvaise saisie étape 3 → bouton final désactivé', async () => {
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-purge-open'));
    await screen.findByTestId('btn-purge-step1-confirm');
    fireEvent.click(screen.getByTestId('btn-purge-step1-confirm'));
    await screen.findByTestId('btn-purge-step2-confirm');
    fireEvent.click(screen.getByTestId('btn-purge-step2-confirm'));
    await screen.findByTestId('input-purge-confirm-text');
    fireEvent.change(screen.getByTestId('input-purge-confirm-text'), {
      target: { value: 'mauvais texte' },
    });
    expect(screen.getByTestId('btn-purge-final-confirm')).toBeDisabled();
  });

  it('Purge : erreur serveur → Alert rouge affiché dans la page', async () => {
    mockPostAdminDbPurgeTransactions.mockRejectedValue(new Error('Erreur purge serveur'));
    renderWithProviders(<AdminDbPage />);
    fireEvent.click(screen.getByTestId('btn-db-purge-open'));
    await screen.findByTestId('btn-purge-step1-confirm');
    fireEvent.click(screen.getByTestId('btn-purge-step1-confirm'));
    await screen.findByTestId('btn-purge-step2-confirm');
    fireEvent.click(screen.getByTestId('btn-purge-step2-confirm'));
    await screen.findByTestId('input-purge-confirm-text');
    fireEvent.change(screen.getByTestId('input-purge-confirm-text'), {
      target: { value: 'Adieu la base' },
    });
    fireEvent.click(screen.getByTestId('btn-purge-final-confirm'));
    expect(await screen.findByText(/Erreur purge serveur/)).toBeInTheDocument();
  });
});
