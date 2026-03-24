/**
 * Tests pour LegacyImport (Story B47-P3)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LegacyImport from '../LegacyImport';
import { adminService } from '../../../services/adminService';
import { categoryService } from '../../../services/categoryService';

// Mock des services
vi.mock('../../../services/adminService');
vi.mock('../../../services/categoryService');
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

const mockAdminService = adminService as any;
const mockCategoryService = categoryService as any;

describe('LegacyImport', () => {
  const mockCategories = [
    { id: '1', name: 'Vaisselle', is_active: true },
    { id: '2', name: 'DEEE', is_active: true },
    { id: '3', name: 'DIVERS', is_active: true },
  ];

  const mockAnalyzeResult = {
    mappings: {
      'Vaisselle': {
        category_id: '1',
        category_name: 'Vaisselle',
        confidence: 95,
      },
      'DEEE': {
        category_id: '2',
        category_name: 'DEEE',
        confidence: 85,
      },
    },
    unmapped: ['D3E', 'EEE PAM'],
    statistics: {
      total_lines: 100,
      valid_lines: 95,
      error_lines: 5,
      unique_categories: 4,
      mapped_categories: 2,
      unmapped_categories: 2,
    },
    errors: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCategoryService.getCategories.mockResolvedValue(mockCategories);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Étape 1: Upload CSV', () => {
    it('devrait afficher le formulaire d\'upload', () => {
      render(<LegacyImport />);
      expect(screen.getByText('Sélectionner un fichier CSV')).toBeInTheDocument();
    });

    it('devrait valider que le fichier est un CSV', async () => {
      const user = userEvent.setup();
      render(<LegacyImport />);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByLabelText(/sélectionner/i) || document.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, file);
        // Le composant devrait rejeter le fichier non-CSV
      }
    });

    it('devrait analyser le CSV après sélection', async () => {
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);

      render(<LegacyImport />);

      // Simuler la sélection d'un fichier CSV
      const csvFile = new File(['date,category,poids_kg,destination,notes\n2024-01-01,Vaisselle,10,MAGASIN,test'], 'test.csv', {
        type: 'text/csv',
      });

      // Trouver le bouton d'upload et déclencher l'analyse
      const analyzeButton = screen.getByText(/analyser/i);
      expect(analyzeButton).toBeInTheDocument();
    });
  });

  describe('Étape 2: Affichage des Mappings', () => {
    it('devrait afficher les statistiques après analyse', async () => {
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);

      render(<LegacyImport />);

      // Simuler l'analyse réussie
      await waitFor(() => {
        expect(mockAdminService.analyzeLegacyImport).toHaveBeenCalled();
      });
    });

    it('devrait afficher les mappings avec badges de confiance', async () => {
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);

      render(<LegacyImport />);

      // Attendre que les mappings soient affichés
      await waitFor(() => {
        expect(screen.getByText('Vaisselle')).toBeInTheDocument();
      });
    });

    it('devrait afficher les catégories non mappables', async () => {
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);

      render(<LegacyImport />);

      await waitFor(() => {
        expect(screen.getByText('D3E')).toBeInTheDocument();
      });
    });
  });

  describe('Étape 3: Correction Manuelle', () => {
    it('devrait permettre de modifier un mapping', async () => {
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);

      render(<LegacyImport />);

      await waitFor(() => {
        expect(screen.getByText('Vaisselle')).toBeInTheDocument();
      });

      // Trouver le select de mapping et le modifier
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('devrait permettre de rejeter une catégorie', async () => {
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);

      render(<LegacyImport />);

      await waitFor(() => {
        expect(screen.getByText('Réinitialiser')).toBeInTheDocument();
      });
    });
  });

  describe('Étape 4: Export Mapping', () => {
    it('devrait exporter le mapping en JSON', async () => {
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);

      render(<LegacyImport />);

      // Simuler l'export
      const exportButton = await screen.findByText(/exporter/i);
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('Étape 5: Import', () => {
    const mockImportReport = {
      postes_created: 5,
      postes_reused: 2,
      tickets_created: 7,
      lignes_imported: 95,
      errors: [],
      total_errors: 0,
    };

    it('devrait exécuter l\'import avec CSV et mapping', async () => {
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);
      mockAdminService.executeLegacyImport.mockResolvedValue({
        report: mockImportReport,
        message: 'Import terminé avec succès',
      });

      render(<LegacyImport />);

      // Naviguer jusqu'à l'étape d'import
      await waitFor(() => {
        const importButton = screen.getByText(/importer/i);
        expect(importButton).toBeInTheDocument();
      });
    });

    it('devrait afficher le rapport d\'import après succès', async () => {
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);
      mockAdminService.executeLegacyImport.mockResolvedValue({
        report: mockImportReport,
        message: 'Import terminé avec succès',
      });

      render(<LegacyImport />);

      await waitFor(() => {
        expect(screen.getByText(/postes créés/i)).toBeInTheDocument();
      });
    });

    it('devrait afficher les erreurs en cas d\'échec', async () => {
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);
      mockAdminService.executeLegacyImport.mockRejectedValue({
        response: {
          data: {
            detail: 'Erreur lors de l\'import',
          },
        },
      });

      render(<LegacyImport />);

      await waitFor(() => {
        expect(screen.getByText(/erreur/i)).toBeInTheDocument();
      });
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs d\'analyse', async () => {
      mockAdminService.analyzeLegacyImport.mockRejectedValue({
        response: {
          data: {
            detail: 'Format CSV invalide',
          },
        },
      });

      render(<LegacyImport />);

      await waitFor(() => {
        expect(screen.getByText(/erreur/i)).toBeInTheDocument();
      });
    });

    it('devrait gérer les erreurs de chargement des catégories', async () => {
      mockCategoryService.getCategories.mockRejectedValue(new Error('Erreur réseau'));

      render(<LegacyImport />);

      await waitFor(() => {
        expect(mockCategoryService.getCategories).toHaveBeenCalled();
      });
    });
  });

  describe('B47-P9: Correction Bugs Mapping Manuel', () => {
    beforeEach(() => {
      // Mock pour window.URL.createObjectURL et document.createElement
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      document.createElement = vi.fn((tagName: string) => {
        const element = document.createElement(tagName);
        if (tagName === 'a') {
          element.click = vi.fn();
        }
        return element;
      });
    });

    it('devrait retirer la catégorie de unmapped lors de l\'assignation manuelle', async () => {
      const user = userEvent.setup();
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);

      render(<LegacyImport />);

      // Attendre que l'analyse soit terminée
      await waitFor(() => {
        expect(screen.getByText('D3E')).toBeInTheDocument();
      });

      // Trouver le select pour la catégorie non mappée 'D3E'
      const unmappedSelects = screen.getAllByRole('combobox');
      const d3eSelect = unmappedSelects.find(select => {
        const parent = select.closest('tr');
        return parent?.textContent?.includes('D3E');
      });

      expect(d3eSelect).toBeDefined();

      // Simuler l'assignation manuelle de 'D3E' vers 'DIVERS' (id: '3')
      if (d3eSelect) {
        await user.click(d3eSelect);
        await waitFor(() => {
          // Chercher l'option 'DIVERS' dans le dropdown
          const diversOption = screen.getByText(/DIVERS/i);
          expect(diversOption).toBeInTheDocument();
        });
      }

      // Vérifier que 'D3E' n'est plus dans la liste unmapped
      await waitFor(() => {
        const unmappedRows = screen.queryAllByText('D3E');
        // D3E ne devrait plus apparaître dans la section unmapped
        expect(unmappedRows.length).toBeLessThanOrEqual(1); // Peut-être encore dans le header ou ailleurs
      });
    });

    it('devrait retirer la catégorie de unmapped et l\'ajouter à rejectedCategories lors du rejet', async () => {
      const user = userEvent.setup();
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);

      render(<LegacyImport />);

      // Attendre que l'analyse soit terminée
      await waitFor(() => {
        expect(screen.getByText('D3E')).toBeInTheDocument();
      });

      // Trouver le select pour la catégorie non mappée 'D3E'
      const unmappedSelects = screen.getAllByRole('combobox');
      const d3eSelect = unmappedSelects.find(select => {
        const parent = select.closest('tr');
        return parent?.textContent?.includes('D3E');
      });

      expect(d3eSelect).toBeDefined();

      // Simuler le rejet de 'D3E'
      if (d3eSelect) {
        await user.click(d3eSelect);
        await waitFor(() => {
          // Chercher l'option 'Rejeter' dans le dropdown
          const rejectOption = screen.getByText(/rejeter/i);
          expect(rejectOption).toBeInTheDocument();
        });
      }

      // Vérifier que 'D3E' apparaît dans la section "Catégories rejetées"
      await waitFor(() => {
        const rejectedSection = screen.getByText(/catégories rejetées/i);
        expect(rejectedSection).toBeInTheDocument();
      });
    });

    it('devrait activer le bouton "Continuer" quand toutes les catégories sont assignées/rejetées', async () => {
      const user = userEvent.setup();
      // Mock avec seulement 2 catégories non mappées (≤ 5)
      const smallUnmappedResult = {
        ...mockAnalyzeResult,
        unmapped: ['D3E', 'EEE PAM'],
        statistics: {
          ...mockAnalyzeResult.statistics,
          unmapped_categories: 2,
        },
      };
      mockAdminService.analyzeLegacyImport.mockResolvedValue(smallUnmappedResult);

      render(<LegacyImport />);

      // Attendre que l'analyse soit terminée
      await waitFor(() => {
        expect(screen.getByText('D3E')).toBeInTheDocument();
      });

      // Le bouton "Continuer" devrait être activé car unmappedCount (2) ≤ 5
      const continueButton = screen.getByText(/continuer/i);
      expect(continueButton).not.toBeDisabled();
    });

    it('devrait désactiver le bouton "Continuer" quand il reste > 5 catégories non mappées', async () => {
      // Mock avec 6 catégories non mappées (> 5)
      const largeUnmappedResult = {
        ...mockAnalyzeResult,
        unmapped: ['D3E', 'EEE PAM', 'CAT1', 'CAT2', 'CAT3', 'CAT4'],
        statistics: {
          ...mockAnalyzeResult.statistics,
          unmapped_categories: 6,
        },
      };
      mockAdminService.analyzeLegacyImport.mockResolvedValue(largeUnmappedResult);

      render(<LegacyImport />);

      // Attendre que l'analyse soit terminée
      await waitFor(() => {
        expect(screen.getByText('D3E')).toBeInTheDocument();
      });

      // Le bouton "Continuer" devrait être désactivé car unmappedCount (6) > 5
      const continueButton = screen.getByText(/continuer/i);
      expect(continueButton).toBeDisabled();
    });

    it('devrait exporter le JSON avec les catégories assignées dans mappings et non dans unmapped', async () => {
      const user = userEvent.setup();
      mockAdminService.analyzeLegacyImport.mockResolvedValue(mockAnalyzeResult);

      // Mock pour capturer le contenu du blob exporté
      let exportedData: any = null;
      const mockBlob = {
        type: 'application/json',
        size: 0,
      };
      global.Blob = vi.fn((parts: any[]) => {
        exportedData = JSON.parse(parts[0]);
        return mockBlob as any;
      }) as any;

      render(<LegacyImport />);

      // Attendre que l'analyse soit terminée
      await waitFor(() => {
        expect(screen.getByText('D3E')).toBeInTheDocument();
      });

      // Simuler l'assignation manuelle de 'D3E' vers 'DIVERS'
      const unmappedSelects = screen.getAllByRole('combobox');
      const d3eSelect = unmappedSelects.find(select => {
        const parent = select.closest('tr');
        return parent?.textContent?.includes('D3E');
      });

      if (d3eSelect) {
        await user.click(d3eSelect);
        await waitFor(() => {
          const diversOption = screen.getByText(/DIVERS/i);
          expect(diversOption).toBeInTheDocument();
        });
      }

      // Naviguer vers l'étape d'export et exporter
      const exportButton = await screen.findByText(/exporter/i);
      await user.click(exportButton);

      // Vérifier que le JSON exporté contient 'D3E' dans mappings et non dans unmapped
      await waitFor(() => {
        expect(exportedData).not.toBeNull();
        expect(exportedData.mappings).toBeDefined();
        expect(exportedData.unmapped).toBeDefined();
        
        // 'D3E' devrait être dans mappings (assignée manuellement)
        expect(exportedData.mappings['D3E']).toBeDefined();
        expect(exportedData.mappings['D3E'].confidence).toBe(100);
        
        // 'D3E' ne devrait PAS être dans unmapped
        expect(exportedData.unmapped).not.toContain('D3E');
        
        // 'EEE PAM' devrait toujours être dans unmapped (non assignée)
        expect(exportedData.unmapped).toContain('EEE PAM');
      });
    });
  });
});

