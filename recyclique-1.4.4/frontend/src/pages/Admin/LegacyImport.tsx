/**
 * Page d'Import Legacy CSV (Story B47-P3)
 * Interface web pour valider et corriger les mappings de catégories proposés par le système
 * Accessible uniquement aux Administrateurs et Super-Administrateurs
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Title,
  Text,
  Stepper,
  Button,
  Group,
  Paper,
  Alert,
  Table,
  Badge,
  Select,
  TextInput,
  Stack,
  LoadingOverlay,
  FileButton,
  Progress,
  Divider,
  Box,
  Checkbox
} from '@mantine/core';
import {
  IconUpload,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconFileTypeCsv,
  IconDownload,
  IconDatabaseImport,
  IconCalendar
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { adminService } from '../../services/adminService';
import { categoryService, Category } from '../../services/categoryService';
import { LLMModelSelector } from '../../components/LegacyImport/LLMModelSelector';

// Types pour les données d'import
interface CategoryMapping {
  category_id: string;
  category_name: string;
  confidence: number;
}

interface LegacyImportAnalyzeResponse {
  mappings: Record<string, CategoryMapping>;
  unmapped: string[];
  statistics: {
    total_lines: number;
    valid_lines: number;
    error_lines: number;
    unique_categories: number;
    mapped_categories: number;
    unmapped_categories: number;
    llm_attempted: boolean;
    llm_model_used: string | null;
    llm_batches_total: number;
    llm_batches_succeeded: number;
    llm_batches_failed: number;
    llm_mapped_categories: number;
    llm_unmapped_after_llm: number;
    llm_last_error: string | null;
    llm_avg_confidence: number | null;
    llm_provider_used: string | null;
  };
  errors: string[];
}

interface LLMModel {
  id: string;
  name: string;
  provider: string | null;
  is_free: boolean;
  context_length: number | null;
  pricing: { prompt: string; completion: string } | null;
}

interface ImportReport {
  postes_created: number;
  postes_reused: number;
  tickets_created: number;
  lignes_imported: number;
  errors: string[];
  total_errors: number;
}

interface LegacyImportExecuteResponse {
  report: ImportReport;
  message: string;
}

const LegacyImport: React.FC = () => {
  // État du stepper
  const [activeStep, setActiveStep] = useState(0);

  // Étape 1: Upload CSV
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<LegacyImportAnalyzeResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  
  // Validation et nettoyage (B47-P7)
  const [validationResult, setValidationResult] = useState<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
    statistics: {
      total_lines: number;
      valid_lines: number;
      invalid_lines: number;
      missing_columns: string[];
      extra_columns: string[];
      date_errors: number;
      weight_errors: number;
      structure_issues: number;
    };
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  
  // Sélecteur de modèles LLM (T5)
  const [llmModels, setLlmModels] = useState<LLMModel[]>([]);
  const [loadingLlmModels, setLoadingLlmModels] = useState(false);
  const [selectedLlmModelId, setSelectedLlmModelId] = useState<string | null>(null);
  const [llmModelsError, setLlmModelsError] = useState<string | null>(null);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  
  // Sélecteur de modèles LLM pour l'étape 2 (B47-P8)
  const [selectedLlmModelIdStep2, setSelectedLlmModelIdStep2] = useState<string | null>(null);
  const [showFreeOnlyStep2, setShowFreeOnlyStep2] = useState(false);
  
  // Relance LLM ciblée (T7)
  const [relaunchingLlm, setRelaunchingLlm] = useState(false);

  // Étape 2: Mappings
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [mappings, setMappings] = useState<Record<string, CategoryMapping>>({});
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [rejectedCategories, setRejectedCategories] = useState<Set<string>>(new Set());

  // Étape 3: Récapitulatif
  const [previewSummary, setPreviewSummary] = useState<{
    total_lines: number;
    total_kilos: number;
    unique_dates: number;
    unique_categories: number;
    by_category: Array<{
      category_name: string;
      category_id: string;
      line_count: number;
      total_kilos: number;
    }>;
    by_date: Array<{
      date: string;
      line_count: number;
      total_kilos: number;
    }>;
    unmapped_categories: string[];
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Étape 3: Import
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  
  // Étape 3: Date d'import manuelle (B47-P11)
  const [importDate, setImportDate] = useState<string | null>(null);
  
  // Export optionnel (dans l'étape 2)
  const [exporting, setExporting] = useState(false);
  
  // Export CSV remappé (B47-P11)
  const [exportingRemapped, setExportingRemapped] = useState(false);

  // Tri du tableau des mappings
  const [sortBy, setSortBy] = useState<'csv' | 'proposed' | 'confidence'>('csv');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination locale sur les mappings (pour alléger le rendu)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Recherche contrôlée dans les Select (pour éviter la réinitialisation au moindre re-render)
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});

  // Charger les catégories au montage
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const cats = await categoryService.getCategories(true); // Seulement actives
        setCategories(cats);
      } catch (error: any) {
        console.error('Erreur lors du chargement des catégories:', error);
        notifications.show({
          title: 'Erreur',
          message: 'Impossible de charger les catégories',
          color: 'red',
        });
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  // Charger les modèles LLM au montage (T5)
  useEffect(() => {
    const loadLlmModels = async () => {
      setLoadingLlmModels(true);
      setLlmModelsError(null);
      try {
        const result = await adminService.getLegacyImportLLMModels();
        if (result.error) {
          setLlmModelsError(result.error);
          setLlmModels([]);
        } else {
          setLlmModels(result.models);
          setLlmModelsError(null); // Réinitialiser l'erreur si les modèles sont chargés avec succès
          // Valeur par défaut: modèle depuis ENV, sinon premier modèle gratuit, sinon premier modèle disponible
          if (result.models.length > 0 && !selectedLlmModelId) {
            const defaultModel = result.default_model_id
              ? result.models.find(m => m.id === result.default_model_id)
              : null;
            if (defaultModel) {
              setSelectedLlmModelId(defaultModel.id);
            } else {
              const freeModel = result.models.find(m => m.is_free);
              setSelectedLlmModelId(freeModel ? freeModel.id : result.models[0].id);
            }
          }
        }
      } catch (error: any) {
        console.error('Erreur lors du chargement des modèles LLM:', error);
        setLlmModelsError('Impossible de charger les modèles LLM');
        setLlmModels([]);
      } finally {
        setLoadingLlmModels(false);
      }
    };
    loadLlmModels();
  }, []);

  // Initialiser le modèle de l'étape 2 avec celui de l'étape 1 quand analyzeResult est disponible (B47-P8)
  useEffect(() => {
    if (analyzeResult && selectedLlmModelId && !selectedLlmModelIdStep2) {
      setSelectedLlmModelIdStep2(selectedLlmModelId);
    }
  }, [analyzeResult, selectedLlmModelId, selectedLlmModelIdStep2]);

  // Calculer automatiquement le récapitulatif quand on arrive à l'étape 3 (B47-P10)
  useEffect(() => {
    if (activeStep === 2 && csvFile && Object.keys(mappings).length > 0 && !previewSummary && !loadingPreview && !previewError) {
      handleCalculatePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  // Étape 1: Analyser le CSV
  const handleAnalyze = async () => {
    if (!csvFile) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez sélectionner un fichier CSV',
        color: 'red',
      });
      return;
    }

    // Alert de confirmation si des corrections manuelles existent (T8)
    if (Object.keys(mappings).length > 0 && analyzeResult) {
      const hasManualChanges = Object.keys(mappings).some(
        key => !analyzeResult.mappings[key] || mappings[key].confidence === 100
      );
      if (hasManualChanges) {
        const confirmed = window.confirm(
          'Attention : relancer l\'analyse effacera vos corrections manuelles. ' +
          'Utilisez "Relancer LLM" pour préserver vos modifications. Continuer ?'
        );
        if (!confirmed) {
          return;
        }
      }
    }

    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await adminService.analyzeLegacyImport(
        csvFile,
        undefined,
        selectedLlmModelId || undefined
      );
      setAnalyzeResult(result);
      setMappings(result.mappings);
      setUnmapped(result.unmapped);
      setRejectedCategories(new Set());
      setActiveStep(1); // Passer à l'étape 2
      notifications.show({
        title: 'Analyse terminée',
        message: `${result.statistics.mapped_categories} catégories mappées, ${result.statistics.unmapped_categories} non mappées`,
        color: 'green',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Erreur lors de l\'analyse';
      setAnalyzeError(errorMessage);
      notifications.show({
        title: 'Erreur',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Relancer LLM uniquement sur les catégories restantes (T7, B47-P8)
  const handleRelaunchLLM = async () => {
    // Utiliser le modèle de l'étape 2 ou celui de l'étape 1 en fallback
    const modelToUse = selectedLlmModelIdStep2 || selectedLlmModelId;
    if (!analyzeResult || unmapped.length === 0 || !modelToUse) {
      return;
    }

    setRelaunchingLlm(true);
    try {
      const result = await adminService.analyzeLegacyImportLLMOnly(
        unmapped,
        modelToUse
      );

      // Fusionner les nouveaux mappings (sans écraser les corrections manuelles) (T7)
      const newMappings = { ...mappings };
      Object.keys(result.mappings).forEach(key => {
        // Ne pas écraser si c'est une correction manuelle (confidence = 100)
        if (!newMappings[key] || newMappings[key].confidence !== 100) {
          newMappings[key] = result.mappings[key];
        }
      });

      setMappings(newMappings);
      
      // Mettre à jour unmapped avec les nouvelles catégories restantes
      const newlyMapped = Object.keys(result.mappings);
      setUnmapped(prev => prev.filter(cat => !newlyMapped.includes(cat)));

      // Mettre à jour analyzeResult avec les nouvelles stats
      if (analyzeResult) {
        setAnalyzeResult({
          ...analyzeResult,
          mappings: newMappings,
          unmapped: unmapped.filter(cat => !newlyMapped.includes(cat)),
          statistics: {
            ...analyzeResult.statistics,
            llm_mapped_categories: analyzeResult.statistics.llm_mapped_categories + result.statistics.llm_mapped_categories,
            llm_batches_total: analyzeResult.statistics.llm_batches_total + result.statistics.llm_batches_total,
            llm_batches_succeeded: analyzeResult.statistics.llm_batches_succeeded + result.statistics.llm_batches_succeeded,
            llm_batches_failed: analyzeResult.statistics.llm_batches_failed + result.statistics.llm_batches_failed,
            llm_unmapped_after_llm: unmapped.length - newlyMapped.length,
            llm_last_error: result.statistics.llm_last_error || analyzeResult.statistics.llm_last_error,
            llm_avg_confidence: result.statistics.llm_avg_confidence || analyzeResult.statistics.llm_avg_confidence,
          },
        });
      }

      notifications.show({
        title: 'Relance LLM terminée',
        message: `${result.statistics.llm_mapped_categories} nouvelles catégories mappées par le LLM`,
        color: 'green',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Erreur lors de la relance LLM';
      notifications.show({
        title: 'Erreur',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setRelaunchingLlm(false);
    }
  };

  // Relancer LLM sur toutes les catégories (B47-P8)
  const handleRelaunchLLMAllCategories = async () => {
    // Utiliser le modèle de l'étape 2 ou celui de l'étape 1 en fallback
    const modelToUse = selectedLlmModelIdStep2 || selectedLlmModelId;
    if (!analyzeResult || !modelToUse) {
      return;
    }

    // Demander confirmation avant de relancer sur toutes les catégories
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir relancer le LLM sur toutes les catégories ? ' +
      'Cela va remplacer les mappings existants, sauf les corrections manuelles (confiance = 100%).'
    );
    if (!confirmed) {
      return;
    }

    // Extraire toutes les catégories uniques depuis mappings et unmapped
    const allUniqueCategories = [
      ...Object.keys(mappings),
      ...unmapped,
    ];

    if (allUniqueCategories.length === 0) {
      notifications.show({
        title: 'Avertissement',
        message: 'Aucune catégorie à mapper',
        color: 'yellow',
      });
      return;
    }

    setRelaunchingLlm(true);
    try {
      const result = await adminService.analyzeLegacyImportLLMOnly(
        allUniqueCategories,
        modelToUse
      );

      // Fusionner les nouveaux mappings en préservant les corrections manuelles (confidence = 100)
      const newMappings = { ...mappings };
      Object.keys(result.mappings).forEach(key => {
        // Ne pas écraser si c'est une correction manuelle (confidence = 100)
        if (!newMappings[key] || newMappings[key].confidence !== 100) {
          newMappings[key] = result.mappings[key];
        }
      });

      setMappings(newMappings);
      
      // Mettre à jour unmapped : toutes les catégories qui ne sont pas dans les nouveaux mappings
      const newlyMapped = Object.keys(result.mappings);
      const updatedUnmapped = allUniqueCategories.filter(cat => !newlyMapped.includes(cat));
      setUnmapped(updatedUnmapped);

      // Mettre à jour analyzeResult avec les nouvelles stats
      if (analyzeResult) {
        setAnalyzeResult({
          ...analyzeResult,
          mappings: newMappings,
          unmapped: updatedUnmapped,
          statistics: {
            ...analyzeResult.statistics,
            llm_mapped_categories: result.statistics.llm_mapped_categories,
            llm_batches_total: result.statistics.llm_batches_total,
            llm_batches_succeeded: result.statistics.llm_batches_succeeded,
            llm_batches_failed: result.statistics.llm_batches_failed,
            llm_unmapped_after_llm: result.statistics.llm_unmapped_after_llm,
            llm_last_error: result.statistics.llm_last_error,
            llm_avg_confidence: result.statistics.llm_avg_confidence,
            llm_model_used: result.statistics.llm_model_used,
            llm_provider_used: result.statistics.llm_provider_used,
            mapped_categories: Object.keys(newMappings).length,
            unmapped_categories: updatedUnmapped.length,
          },
        });
      }

      notifications.show({
        title: 'Relance LLM terminée',
        message: `${result.statistics.llm_mapped_categories} catégories remappées par le LLM sur ${allUniqueCategories.length} catégories totales`,
        color: 'green',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Erreur lors de la relance LLM';
      notifications.show({
        title: 'Erreur',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setRelaunchingLlm(false);
    }
  };

  // Étape 3: Modifier un mapping
  const handleMappingChange = (csvCategory: string, categoryId: string | null) => {
    if (categoryId === null) {
      // Rejeter la catégorie
      setRejectedCategories(prev => new Set([...prev, csvCategory]));
      const newMappings = { ...mappings };
      delete newMappings[csvCategory];
      setMappings(newMappings);
      // RETIRER de unmapped
      setUnmapped(prev => prev.filter(cat => cat !== csvCategory));
    } else {
      // Mapper vers une catégorie
      setRejectedCategories(prev => {
        const newSet = new Set(prev);
        newSet.delete(csvCategory);
        return newSet;
      });
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        setMappings(prev => ({
          ...prev,
          [csvCategory]: {
            category_id: categoryId,
            category_name: category.name,
            confidence: 100 // Mapping manuel = 100%
          }
        }));
        // RETIRER de unmapped
        setUnmapped(prev => prev.filter(cat => cat !== csvCategory));
      }
    }
  };

  // Réinitialiser les mappings
  const handleResetMappings = () => {
    if (analyzeResult) {
      setMappings(analyzeResult.mappings);
      setUnmapped(analyzeResult.unmapped);
      setRejectedCategories(new Set());
    }
  };

  // Calculer le récapitulatif (appelé automatiquement quand on passe à l'étape 3)
  const handleCalculatePreview = async () => {
    if (!csvFile) {
      notifications.show({
        title: 'Erreur',
        message: 'Aucun fichier CSV sélectionné',
        color: 'red',
      });
      return;
    }

    // Créer le fichier de mapping en mémoire
    const filteredUnmapped = unmapped.filter(cat => !rejectedCategories.has(cat));
    const inconsistencies = filteredUnmapped.filter(cat => mappings[cat]);
    if (inconsistencies.length > 0) {
      filteredUnmapped.splice(0, filteredUnmapped.length, ...filteredUnmapped.filter(cat => !mappings[cat]));
    }

    const mappingData = {
      mappings: mappings,
      unmapped: filteredUnmapped
    };

    const mappingBlob = new Blob([JSON.stringify(mappingData)], { type: 'application/json' });
    const mappingFile = new File([mappingBlob], 'category_mapping.json', { type: 'application/json' });

    setLoadingPreview(true);
    setPreviewError(null);
    setPreviewSummary(null);

    try {
      const summary = await adminService.previewLegacyImport(csvFile, mappingFile);
      setPreviewSummary(summary);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Erreur lors du calcul du récapitulatif';
      setPreviewError(errorMessage);
      notifications.show({
        title: 'Erreur',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Export optionnel du mapping (dans l'étape 2)
  const handleExportMapping = () => {
    setExporting(true);
    try {
      // Filtrer les catégories rejetées de unmapped
      const filteredUnmapped = unmapped.filter(cat => !rejectedCategories.has(cat));
      
      // Validation : détecter les incohérences (catégorie dans mappings ET unmapped)
      const inconsistencies = filteredUnmapped.filter(cat => mappings[cat]);
      if (inconsistencies.length > 0) {
        console.warn(
          `Incohérences détectées lors de l'export : ${inconsistencies.length} catégorie(s) présentes à la fois dans mappings et unmapped:`,
          inconsistencies
        );
        // Retirer les incohérences de unmapped (elles sont déjà dans mappings)
        const correctedUnmapped = filteredUnmapped.filter(cat => !mappings[cat]);
        filteredUnmapped.splice(0, filteredUnmapped.length, ...correctedUnmapped);
      }

      const mappingData = {
        mappings: mappings,
        unmapped: filteredUnmapped
      };

      const jsonStr = JSON.stringify(mappingData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'category_mapping.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      notifications.show({
        title: 'Export réussi',
        message: 'Le fichier de mapping a été téléchargé',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible d\'exporter le mapping',
        color: 'red',
      });
    } finally {
      setExporting(false);
    }
  };

  // Export CSV remappé (B47-P11)
  const handleExportRemappedCSV = async () => {
    if (!csvFile) {
      notifications.show({
        title: 'Erreur',
        message: 'Aucun fichier CSV sélectionné',
        color: 'red',
      });
      return;
    }

    // Créer le fichier de mapping en mémoire
    const filteredUnmapped = unmapped.filter(cat => !rejectedCategories.has(cat));
    const inconsistencies = filteredUnmapped.filter(cat => mappings[cat]);
    if (inconsistencies.length > 0) {
      filteredUnmapped.splice(0, filteredUnmapped.length, ...filteredUnmapped.filter(cat => !mappings[cat]));
    }

    const mappingData = {
      mappings: mappings,
      unmapped: filteredUnmapped
    };

    const mappingBlob = new Blob([JSON.stringify(mappingData)], { type: 'application/json' });
    const mappingFile = new File([mappingBlob], 'category_mapping.json', { type: 'application/json' });

    setExportingRemapped(true);
    try {
      await adminService.exportRemappedLegacyImportCSV(csvFile, mappingFile);
      notifications.show({
        title: 'Export réussi',
        message: 'Le CSV remappé a été téléchargé',
        color: 'green',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Erreur lors de l\'export';
      notifications.show({
        title: 'Erreur',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setExportingRemapped(false);
    }
  };

  // Étape 5: Importer
  const handleImport = async () => {
    if (!csvFile) {
      notifications.show({
        title: 'Erreur',
        message: 'Aucun fichier CSV sélectionné',
        color: 'red',
      });
      return;
    }

    // Créer le fichier de mapping
    // Filtrer les catégories rejetées de unmapped
    const filteredUnmapped = unmapped.filter(cat => !rejectedCategories.has(cat));
    
    // Validation : détecter les incohérences (catégorie dans mappings ET unmapped)
    const inconsistencies = filteredUnmapped.filter(cat => mappings[cat]);
    if (inconsistencies.length > 0) {
      console.warn(
        `Incohérences détectées lors de l'import : ${inconsistencies.length} catégorie(s) présentes à la fois dans mappings et unmapped:`,
        inconsistencies
      );
      // Retirer les incohérences de unmapped (elles sont déjà dans mappings)
      filteredUnmapped.splice(0, filteredUnmapped.length, ...filteredUnmapped.filter(cat => !mappings[cat]));
    }

    const mappingData = {
      mappings: mappings,
      unmapped: filteredUnmapped
    };

    const mappingBlob = new Blob([JSON.stringify(mappingData)], { type: 'application/json' });
    const mappingFile = new File([mappingBlob], 'category_mapping.json', { type: 'application/json' });

    setImporting(true);
    setImportProgress(0);
    setImportError(null);
    setImportReport(null);

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Simuler la progression (l'API ne supporte pas encore le streaming)
      progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await adminService.executeLegacyImport(csvFile, mappingFile, importDate || undefined);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setImportProgress(100);
      setImportReport(result.report);

      notifications.show({
        title: 'Import réussi',
        message: result.message,
        color: 'green',
      });
    } catch (error: any) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      const errorMessage = error.response?.data?.detail || error.message || 'Erreur lors de l\'import';
      setImportError(errorMessage);
      notifications.show({
        title: 'Erreur',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setImporting(false);
    }
  };

  // Obtenir la couleur du badge de confiance
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return 'green';
    if (confidence >= 80) return 'yellow';
    return 'red';
  };

  // Construire une hiérarchie catégories / sous-catégories pour reproduire l'affichage de /admin/categories
  const categoryOptions = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    const activeCategories = categories.filter(cat => cat.is_active);

    type TreeNode = Category & { children: TreeNode[] };

    const categoryMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Créer des noeuds avec enfants vides en préservant l'ordre initial (qui reflète déjà display_order)
    activeCategories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Construire la hiérarchie parent/enfant
    activeCategories.forEach(cat => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        categoryMap.get(cat.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const options: { value: string; label: string }[] = [];

    const walk = (nodes: TreeNode[], level: number) => {
      nodes.forEach(node => {
        const indent = '  '.repeat(level);
        const prefix = level > 0 ? '• ' : '';
        options.push({
          value: node.id,
          label: `${indent}${prefix}${node.name}`,
        });
        if (node.children.length > 0) {
          walk(node.children, level + 1);
        }
      });
    };

    walk(roots, 0);
    return options;
  }, [categories]);

  const getCategoryOptions = () => categoryOptions;

  // Entrées triées pour le tableau des mappings
  const sortedMappingsEntries = useMemo(() => {
    const entries = Object.entries(mappings);
    entries.sort(([csvA, mapA], [csvB, mapB]) => {
      let cmp = 0;
      if (sortBy === 'csv') {
        cmp = csvA.localeCompare(csvB, 'fr', { sensitivity: 'base' });
      } else if (sortBy === 'proposed') {
        cmp = mapA.category_name.localeCompare(mapB.category_name, 'fr', { sensitivity: 'base' });
      } else if (sortBy === 'confidence') {
        cmp = mapA.confidence - mapB.confidence;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return entries;
  }, [mappings, sortBy, sortDirection]);

  // Remettre la pagination à 1 quand le jeu de données change
  useEffect(() => {
    setCurrentPage(1);
  }, [Object.keys(mappings).length, analyzeResult?.statistics.unique_categories]);

  const totalPages = Math.max(1, Math.ceil(sortedMappingsEntries.length / pageSize));
  const paginatedMappingsEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedMappingsEntries.slice(start, end);
  }, [sortedMappingsEntries, currentPage, pageSize]);

  const toggleSort = (key: 'csv' | 'proposed' | 'confidence') => {
    setSortBy(prevKey => {
      if (prevKey === key) {
        setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setSortDirection('asc');
      return key;
    });
  };

  const renderSortIndicator = (key: 'csv' | 'proposed' | 'confidence') => {
    if (sortBy !== key) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  // Calculer le nombre de catégories vraiment non mappées (non assignées et non rejetées)
  const unmappedCount = useMemo(() => {
    return unmapped.filter(cat => !rejectedCategories.has(cat)).length;
  }, [unmapped, rejectedCategories]);

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="md">Import Legacy CSV</Title>
      <Text c="dimmed" mb="xl">
        Importez vos données historiques depuis un CSV nettoyé. Validez et corrigez les mappings de catégories proposés par le système.
      </Text>

      <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm" mb="xl">
        <Stepper.Step label="Upload CSV" description="Sélectionner et analyser le fichier">
          <Paper p="md" withBorder>
            <Stack>
              <Text size="sm" c="dimmed" mb="md">
                Sélectionnez le fichier CSV nettoyé contenant les colonnes: date, category, poids_kg, destination, notes
              </Text>
              
              <Group>
                <FileButton
                  onChange={async (file) => {
                    if (file) {
                      if (!file.name.toLowerCase().endsWith('.csv')) {
                        notifications.show({
                          title: 'Erreur',
                          message: 'Le fichier doit être un CSV',
                          color: 'red',
                        });
                        return;
                      }
                      setCsvFile(file);
                      setAnalyzeResult(null);
                      setAnalyzeError(null);
                      setValidationResult(null);
                      
                      // Validation automatique (B47-P7)
                      setIsValidating(true);
                      try {
                        const validation = await adminService.validateLegacyImportCSV(file);
                        setValidationResult(validation);
                        if (!validation.is_valid) {
                          notifications.show({
                            title: 'CSV non conforme',
                            message: `Le CSV contient ${validation.errors.length} erreur(s). Utilisez "Nettoyer automatiquement" pour corriger.`,
                            color: 'orange',
                          });
                        } else {
                          notifications.show({
                            title: 'CSV conforme',
                            message: 'Le CSV est conforme au template offline',
                            color: 'green',
                          });
                        }
                      } catch (error: any) {
                        console.error('Erreur lors de la validation:', error);
                        // En cas d'erreur, on continue quand même
                        setValidationResult({
                          is_valid: false,
                          errors: ['Erreur lors de la validation'],
                          warnings: [],
                          statistics: {
                            total_lines: 0,
                            valid_lines: 0,
                            invalid_lines: 0,
                            missing_columns: [],
                            extra_columns: [],
                            date_errors: 0,
                            weight_errors: 0,
                            structure_issues: 0,
                          },
                        });
                      } finally {
                        setIsValidating(false);
                      }
                    }
                  }}
                  accept=".csv"
                >
                  {(props) => (
                    <Button leftSection={<IconUpload size={16} />} {...props}>
                      Sélectionner un fichier CSV
                    </Button>
                  )}
                </FileButton>
                
                <Button
                  variant="outline"
                  leftSection={<IconDownload size={16} />}
                  onClick={async () => {
                    try {
                      await adminService.downloadReceptionOfflineTemplate();
                      notifications.show({
                        title: 'Téléchargement réussi',
                        message: 'Le template CSV offline a été téléchargé',
                        color: 'green',
                      });
                    } catch (error: any) {
                      notifications.show({
                        title: 'Erreur',
                        message: error.response?.data?.detail || error.message || 'Impossible de télécharger le template',
                        color: 'red',
                      });
                    }
                  }}
                >
                  Télécharger le template
                </Button>
                
                {csvFile && (
                  <Group>
                    <IconFileTypeCsv size={20} />
                    <Text size="sm">{csvFile.name}</Text>
                    <Text size="xs" c="dimmed">
                      ({(csvFile.size / 1024).toFixed(2)} KB)
                    </Text>
                    {isValidating && (
                      <Badge color="blue" variant="light">Validation en cours...</Badge>
                    )}
                    {validationResult && !isValidating && (
                      <Badge
                        color={validationResult.is_valid ? 'green' : 'red'}
                        variant="light"
                      >
                        {validationResult.is_valid ? 'CSV conforme' : 'CSV non conforme'}
                      </Badge>
                    )}
                  </Group>
                )}
              </Group>

              {/* Affichage du statut de validation et nettoyage (B47-P7) */}
              {validationResult && !isValidating && (
                <Stack gap="sm" mt="md">
                  {validationResult.is_valid ? (
                    <Alert color="green" title="CSV conforme" icon={<IconCheck size={16} />}>
                      <Text size="sm">
                        Le CSV est conforme au template offline. Vous pouvez continuer directement à l'analyse.
                      </Text>
                    </Alert>
                  ) : (
                    <>
                      <Alert color="orange" title="CSV non conforme" icon={<IconAlertCircle size={16} />}>
                        <Text size="sm" mb="xs">
                          Le CSV contient {validationResult.errors.length} erreur(s) et {validationResult.warnings.length} avertissement(s).
                        </Text>
                        {validationResult.errors.length > 0 && (
                          <Stack gap="xs" mt="xs">
                            <Text size="xs" fw={500}>Erreurs détectées :</Text>
                            <Text size="xs" component="ul" style={{ margin: 0, paddingLeft: 20 }}>
                              {validationResult.errors.slice(0, 5).map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                              {validationResult.errors.length > 5 && (
                                <li>... et {validationResult.errors.length - 5} autre(s) erreur(s)</li>
                              )}
                            </Text>
                          </Stack>
                        )}
                      </Alert>
                      <Button
                        onClick={async () => {
                          if (!csvFile) return;
                          setCleaning(true);
                          try {
                            const result = await adminService.cleanLegacyImportCSV(csvFile);
                            
                            // Convertir le CSV nettoyé (base64) en File
                            const cleanedCsvBytes = Uint8Array.from(atob(result.cleaned_csv_base64), c => c.charCodeAt(0));
                            const cleanedBlob = new Blob([cleanedCsvBytes], { type: 'text/csv' });
                            const cleanedFile = new File([cleanedBlob], result.filename, { type: 'text/csv' });
                            
                            // Remplacer le fichier original
                            setCsvFile(cleanedFile);
                            setValidationResult(null);
                            
                            // Re-valider le fichier nettoyé
                            setIsValidating(true);
                            try {
                              const newValidation = await adminService.validateLegacyImportCSV(cleanedFile);
                              setValidationResult(newValidation);
                            } catch (error) {
                              console.error('Erreur lors de la re-validation:', error);
                            } finally {
                              setIsValidating(false);
                            }
                            
                            notifications.show({
                              title: 'Nettoyage terminé',
                              message: `${result.statistics.cleaned_lines} lignes nettoyées, ${result.statistics.dates_normalized} dates normalisées`,
                              color: 'green',
                            });
                          } catch (error: any) {
                            notifications.show({
                              title: 'Erreur',
                              message: error.response?.data?.detail || error.message || 'Impossible de nettoyer le CSV',
                              color: 'red',
                            });
                          } finally {
                            setCleaning(false);
                          }
                        }}
                        disabled={cleaning || !csvFile}
                        loading={cleaning}
                        leftSection={<IconCheck size={16} />}
                        color="orange"
                      >
                        Nettoyer automatiquement
                      </Button>
                    </>
                  )}
                </Stack>
              )}

              {/* Sélecteur de modèles LLM (T5, B47-P8) */}
              <LLMModelSelector
                selectedModelId={selectedLlmModelId}
                onModelChange={setSelectedLlmModelId}
                showFreeOnly={showFreeOnly}
                onShowFreeOnlyChange={setShowFreeOnly}
                disabled={analyzing}
                loading={loadingLlmModels}
                error={llmModelsError}
                models={llmModels}
                autoLoad={false}
                onReload={async () => {
                  setLoadingLlmModels(true);
                  setLlmModelsError(null);
                  try {
                    const result = await adminService.getLegacyImportLLMModels();
                    if (result.error) {
                      setLlmModelsError(result.error);
                      setLlmModels([]);
                    } else {
                      setLlmModels(result.models);
                      setLlmModelsError(null);
                      if (result.models.length > 0 && !selectedLlmModelId) {
                        const defaultModel = result.default_model_id
                          ? result.models.find(m => m.id === result.default_model_id)
                          : null;
                        if (defaultModel) {
                          setSelectedLlmModelId(defaultModel.id);
                        } else {
                          const freeModel = result.models.find(m => m.is_free);
                          setSelectedLlmModelId(freeModel ? freeModel.id : result.models[0].id);
                        }
                      }
                    }
                  } catch (error: any) {
                    console.error('Erreur lors du chargement des modèles LLM:', error);
                    setLlmModelsError('Impossible de charger les modèles LLM');
                    setLlmModels([]);
                  } finally {
                    setLoadingLlmModels(false);
                  }
                }}
              />

              {analyzeError && (
                <Alert icon={<IconAlertCircle size={16} />} title="Erreur" color="red" mt="md">
                  {analyzeError}
                </Alert>
              )}

              <Group mt="md">
                <Button
                  onClick={handleAnalyze}
                  disabled={!csvFile || analyzing}
                  loading={analyzing}
                  leftSection={<IconCheck size={16} />}
                >
                  Analyser le CSV
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stepper.Step>

        <Stepper.Step label="Mappings" description="Vérifier les propositions">
          {analyzeResult && (
            <Paper p="md" withBorder>
              <Stack>
                {/* Statistiques principales */}
                <Alert color="blue" title="Statistiques">
                  <Text size="sm">
                    <strong>{analyzeResult.statistics.total_lines}</strong> lignes analysées •{' '}
                    <strong>{analyzeResult.statistics.valid_lines}</strong> valides •{' '}
                    <strong>{analyzeResult.statistics.unique_categories}</strong> catégories uniques •{' '}
                    <strong>{analyzeResult.statistics.mapped_categories}</strong> mappées •{' '}
                    <strong>{analyzeResult.statistics.unmapped_categories}</strong> non mappées
                  </Text>
                </Alert>

                {/* Barre de progression du mapping (T8) */}
                {analyzeResult.statistics.unique_categories > 0 && (
                  <Box>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>
                        Progression du mapping
                      </Text>
                      <Badge
                        color={
                          analyzeResult.statistics.unmapped_categories <= 5
                            ? 'green'
                            : analyzeResult.statistics.unmapped_categories <= 20
                            ? 'yellow'
                            : 'red'
                        }
                      >
                        {analyzeResult.statistics.mapped_categories} / {analyzeResult.statistics.unique_categories}
                      </Badge>
                    </Group>
                    <Progress
                      value={
                        (analyzeResult.statistics.mapped_categories /
                          analyzeResult.statistics.unique_categories) *
                        100
                      }
                      color={
                        analyzeResult.statistics.unmapped_categories <= 5
                          ? 'green'
                          : analyzeResult.statistics.unmapped_categories <= 20
                          ? 'yellow'
                          : 'red'
                      }
                      size="lg"
                      radius="xl"
                    />
                  </Box>
                )}

                {/* Statistiques LLM enrichies (T6) */}
                {analyzeResult.statistics.llm_provider_used === null &&
                  !analyzeResult.statistics.llm_attempted && (
                    <Text size="sm" c="dimmed">
                      LLM : Non utilisé (non configuré)
                    </Text>
                  )}

                {analyzeResult.statistics.llm_attempted && (
                  <Stack gap="xs">
                    {analyzeResult.statistics.llm_batches_failed === 0 &&
                      analyzeResult.statistics.llm_mapped_categories > 0 && (
                        <>
                          <Badge color="green" size="lg">
                            LLM `{analyzeResult.statistics.llm_model_used || 'non spécifié'}` :{' '}
                            <strong>{analyzeResult.statistics.llm_mapped_categories} catégories résolues</strong>
                          </Badge>
                          {analyzeResult.statistics.llm_avg_confidence !== null && (
                            <Text size="sm" c="dimmed">
                              Confiance moyenne : {analyzeResult.statistics.llm_avg_confidence.toFixed(1)}%
                            </Text>
                          )}
                        </>
                      )}

                    {analyzeResult.statistics.llm_batches_failed > 0 &&
                      analyzeResult.statistics.llm_batches_succeeded > 0 && (
                        <>
                          <Badge color="orange" size="lg">
                            LLM `{analyzeResult.statistics.llm_model_used || 'non spécifié'}` :{' '}
                            {analyzeResult.statistics.llm_mapped_categories} résolues,{' '}
                            <strong>{analyzeResult.statistics.llm_batches_failed} erreurs</strong>
                          </Badge>
                          <Alert color="yellow" title="Erreurs partielles">
                            Certains appels LLM ont échoué. Essayez un autre modèle ou relancez uniquement les
                            catégories restantes.
                            {analyzeResult.statistics.llm_last_error && (
                              <Text size="xs" mt="xs" c="red">
                                Détail : {analyzeResult.statistics.llm_last_error}
                              </Text>
                            )}
                          </Alert>
                        </>
                      )}

                    {(analyzeResult.statistics.llm_batches_failed ===
                      analyzeResult.statistics.llm_batches_total ||
                      analyzeResult.statistics.llm_mapped_categories === 0) &&
                      analyzeResult.statistics.llm_batches_total > 0 && (
                        <>
                          <Badge color="red" size="lg">
                            LLM `{analyzeResult.statistics.llm_model_used || 'non spécifié'}` :{' '}
                            <strong>Aucune catégorie résolue</strong> ({analyzeResult.statistics.llm_batches_failed}{' '}
                            erreurs)
                          </Badge>
                          <Alert color="red" title="Échec LLM">
                            Tous les appels LLM ont échoué. Vérifiez la configuration ou essayez un autre modèle.
                            {analyzeResult.statistics.llm_last_error && (
                              <Text size="xs" mt="xs">
                                Détail : {analyzeResult.statistics.llm_last_error}
                              </Text>
                            )}
                          </Alert>
                        </>
                      )}
                  </Stack>
                )}

                {/* Sélecteur de modèles LLM pour l'étape 2 (B47-P8) */}
                {analyzeResult && (
                  <Stack gap="sm" mt="md">
                    <LLMModelSelector
                      selectedModelId={selectedLlmModelIdStep2}
                      onModelChange={setSelectedLlmModelIdStep2}
                      showFreeOnly={showFreeOnlyStep2}
                      onShowFreeOnlyChange={setShowFreeOnlyStep2}
                      disabled={relaunchingLlm}
                      loading={loadingLlmModels}
                      error={llmModelsError}
                      models={llmModels}
                      defaultModelId={selectedLlmModelId}
                      autoLoad={false}
                    />
                  </Stack>
                )}

                {/* Boutons Relancer LLM (T7, B47-P8) */}
                {analyzeResult &&
                  (selectedLlmModelIdStep2 || selectedLlmModelId) && (
                    <Group mt="md">
                      {unmapped.length > 0 && (
                        <Button
                          variant="light"
                          color="blue"
                          onClick={handleRelaunchLLM}
                          disabled={relaunchingLlm}
                          loading={relaunchingLlm}
                          leftSection={<IconCheck size={16} />}
                        >
                          Relancer LLM pour les {unmapped.length} catégories restantes
                        </Button>
                      )}
                      <Button
                        variant="light"
                        color="cyan"
                        onClick={handleRelaunchLLMAllCategories}
                        disabled={relaunchingLlm}
                        loading={relaunchingLlm}
                        leftSection={<IconCheck size={16} />}
                      >
                        Relancer LLM pour toutes les catégories
                      </Button>
                    </Group>
                  )}

                {/* Tableau des mappings */}
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th
                        onClick={() => toggleSort('csv')}
                        style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Catégorie CSV{renderSortIndicator('csv')}
                      </Table.Th>
                      <Table.Th
                        onClick={() => toggleSort('proposed')}
                        style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Catégorie proposée{renderSortIndicator('proposed')}
                      </Table.Th>
                      <Table.Th
                        onClick={() => toggleSort('confidence')}
                        style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Confiance{renderSortIndicator('confidence')}
                      </Table.Th>
                      <Table.Th>Action</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {paginatedMappingsEntries.map(([csvCategory, mapping]) => (
                      <Table.Tr key={csvCategory}>
                        <Table.Td>{csvCategory}</Table.Td>
                        <Table.Td>{mapping.category_name}</Table.Td>
                        <Table.Td>
                          <Badge color={getConfidenceColor(mapping.confidence)}>
                            {mapping.confidence.toFixed(0)}%
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Select
                            data={[
                              { value: mapping.category_id, label: mapping.category_name },
                              ...getCategoryOptions().filter(opt => opt.value !== mapping.category_id),
                              { value: '__reject__', label: 'Rejeter' }
                            ]}
                            value={mapping.category_id}
                            onChange={(value) => {
                              if (value === '__reject__') {
                                handleMappingChange(csvCategory, null);
                              } else if (value) {
                                handleMappingChange(csvCategory, value);
                              }
                              // Réinitialiser la recherche après sélection
                              setSearchValues(prev => {
                                const copy = { ...prev };
                                delete copy[`mapped:${csvCategory}`];
                                return copy;
                              });
                            }}
                            searchable
                            maxDropdownHeight={320}
                            nothingFoundMessage="Aucune catégorie trouvée"
                            searchValue={searchValues[`mapped:${csvCategory}`] || ''}
                            onSearchChange={(value) => {
                              setSearchValues(prev => ({
                                ...prev,
                                [`mapped:${csvCategory}`]: value,
                              }));
                            }}
                            placeholder="Choisir une catégorie"
                            style={{ minWidth: 200 }}
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>

                {/* Pagination simple pour limiter le nombre de lignes à l'écran */}
                {sortedMappingsEntries.length > pageSize && (
                  <Group justify="space-between" mt="sm">
                    <Text size="sm" c="dimmed">
                      Page {currentPage} / {totalPages} • {sortedMappingsEntries.length} catégories CSV
                    </Text>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        Précédent
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Suivant
                      </Button>
                    </Group>
                  </Group>
                )}

                {/* Catégories non mappables */}
                {unmapped.length > 0 && (
                  <>
                    <Divider label="Catégories non mappables" labelPosition="center" />
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Catégorie CSV</Table.Th>
                          <Table.Th>Action</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {unmapped
                          .filter(cat => !rejectedCategories.has(cat))
                          .map((csvCategory) => (
                            <Table.Tr key={csvCategory}>
                              <Table.Td>{csvCategory}</Table.Td>
                              <Table.Td>
                                <Select
                                  data={[
                                    ...getCategoryOptions(),
                                    { value: '__reject__', label: 'Rejeter' }
                                  ]}
                                  searchable
                                  maxDropdownHeight={320}
                                  nothingFoundMessage="Aucune catégorie trouvée"
                                  placeholder="Mapper vers..."
                                  onChange={(value) => {
                                    if (value === '__reject__') {
                                      handleMappingChange(csvCategory, null);
                                    } else if (value) {
                                      handleMappingChange(csvCategory, value);
                                    }
                                    // Réinitialiser la recherche après sélection
                                    setSearchValues(prev => {
                                      const copy = { ...prev };
                                      delete copy[`unmapped:${csvCategory}`];
                                      return copy;
                                    });
                                  }}
                                  searchValue={searchValues[`unmapped:${csvCategory}`] || ''}
                                  onSearchChange={(value) => {
                                    setSearchValues(prev => ({
                                      ...prev,
                                      [`unmapped:${csvCategory}`]: value,
                                    }));
                                  }}
                                  searchable
                                  style={{ minWidth: 200 }}
                                />
                              </Table.Td>
                            </Table.Tr>
                          ))}
                      </Table.Tbody>
                    </Table>
                  </>
                )}

                {/* Catégories rejetées */}
                {rejectedCategories.size > 0 && (
                  <>
                    <Divider label="Catégories rejetées" labelPosition="center" />
                    <Alert color="orange" title="Catégories exclues de l'import">
                      {Array.from(rejectedCategories).join(', ')}
                    </Alert>
                  </>
                )}

                <Group mt="md">
                  <Button
                    variant="outline"
                    onClick={handleResetMappings}
                    leftSection={<IconX size={16} />}
                  >
                    Réinitialiser
                  </Button>
                  <Group>
                    <Button
                      variant="outline"
                      onClick={handleExportMapping}
                      disabled={exporting || Object.keys(mappings).length === 0}
                      loading={exporting}
                      leftSection={<IconDownload size={16} />}
                    >
                      Télécharger le mapping
                    </Button>
                    <Button
                      onClick={async () => {
                        await handleCalculatePreview();
                        setActiveStep(2);
                      }}
                      leftSection={<IconCheck size={16} />}
                      disabled={unmappedCount > 5 || loadingPreview}
                      loading={loadingPreview}
                      title={
                        unmappedCount > 5
                          ? `Il reste ${unmappedCount} catégories non mappées. Vous pouvez continuer ou relancer le LLM.`
                          : undefined
                      }
                    >
                      Continuer
                      {unmappedCount > 0 && unmappedCount <= 5 && ` (${unmappedCount} non mappées)`}
                    </Button>
                  </Group>
                </Group>
              </Stack>
            </Paper>
          )}
        </Stepper.Step>

        <Stepper.Step label="Récapitulatif & Import" description="Vérifier et importer">
          <Paper p="md" withBorder>
            <Stack>
              {loadingPreview && !previewSummary && (
                <Alert color="blue" title="Calcul du récapitulatif en cours...">
                  Analyse du CSV et calcul des statistiques...
                </Alert>
              )}

              {previewError && (
                <Alert icon={<IconAlertCircle size={16} />} title="Erreur" color="red">
                  {previewError}
                </Alert>
              )}

              {/* Sélecteur de date d'import (B47-P11) */}
              <TextInput
                type="date"
                label="Date d'import (optionnel)"
                placeholder="Sélectionnez une date d'import"
                value={importDate || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setImportDate(value || null);
                }}
                max={new Date().toISOString().split('T')[0]}
                icon={<IconCalendar size={16} />}
                mb="md"
                description="Si une date est sélectionnée, toutes les données seront importées avec cette date unique. Sinon, les dates du CSV seront utilisées."
              />

              {/* Avertissement si date sélectionnée */}
              {importDate && (
                <Alert icon={<IconAlertCircle size={16} />} title="Date d'import sélectionnée" color="yellow" mb="md">
                  ⚠️ Toutes les données seront importées avec la date <strong>{importDate}</strong> au lieu des dates du CSV.
                </Alert>
              )}

              {previewSummary && !importing && !importReport && (
                <>
                  {/* Section Total général */}
                  <Alert color="blue" title="Total général">
                    <Group gap="xl" mt="xs">
                      <Box>
                        <Text size="xs" c="dimmed">Lignes à importer</Text>
                        <Text size="lg" fw={700}>{previewSummary.total_lines}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed">Total kilos</Text>
                        <Text size="lg" fw={700}>{previewSummary.total_kilos.toFixed(2)} kg</Text>
                      </Box>
                      {importDate ? (
                        <Box>
                          <Text size="xs" c="dimmed">Date d'import</Text>
                          <Text size="lg" fw={700}>{importDate}</Text>
                        </Box>
                      ) : (
                        <Box>
                          <Text size="xs" c="dimmed">Dates uniques</Text>
                          <Text size="lg" fw={700}>{previewSummary.unique_dates}</Text>
                        </Box>
                      )}
                      <Box>
                        <Text size="xs" c="dimmed">Catégories</Text>
                        <Text size="lg" fw={700}>{previewSummary.unique_categories}</Text>
                      </Box>
                    </Group>
                  </Alert>

                  {/* Section Répartition par catégorie */}
                  <Box>
                    <Text size="sm" fw={500} mb="xs">Répartition par catégorie</Text>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Catégorie</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>Lignes</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>Total kilos</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {previewSummary.by_category.map((cat) => (
                          <Table.Tr key={cat.category_id}>
                            <Table.Td>{cat.category_name}</Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>{cat.line_count}</Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>{cat.total_kilos.toFixed(2)} kg</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Box>

                  {/* Section Répartition par date */}
                  {previewSummary.by_date.length > 0 && (
                    <Box>
                      <Text size="sm" fw={500} mb="xs">Répartition par date</Text>
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Date</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>Lignes</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>Total kilos</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {previewSummary.by_date.map((dateItem) => (
                            <Table.Tr key={dateItem.date}>
                              <Table.Td>{dateItem.date}</Table.Td>
                              <Table.Td style={{ textAlign: 'right' }}>{dateItem.line_count}</Table.Td>
                              <Table.Td style={{ textAlign: 'right' }}>{dateItem.total_kilos.toFixed(2)} kg</Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Box>
                  )}

                  {/* Section Catégories non mappées */}
                  {previewSummary.unmapped_categories.length > 0 && (
                    <Alert color="orange" title="Catégories non mappées" icon={<IconAlertCircle size={16} />}>
                      <Text size="sm" mb="xs">
                        {previewSummary.unmapped_categories.length} catégorie(s) non mappée(s). 
                        Les lignes correspondantes ne seront pas importées.
                      </Text>
                      <Text size="xs" c="dimmed">
                        {previewSummary.unmapped_categories.join(', ')}
                      </Text>
                    </Alert>
                  )}

                  <Group position="right" mt="md">
                    <Button
                      variant="outline"
                      leftSection={<IconDownload size={16} />}
                      onClick={handleExportRemappedCSV}
                      disabled={!previewSummary || !csvFile || exportingRemapped}
                      loading={exportingRemapped}
                    >
                      Exporter CSV remappé
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={importing || !csvFile || Object.keys(mappings).length === 0}
                      loading={importing}
                      leftSection={<IconDatabaseImport size={16} />}
                      size="lg"
                    >
                      Valider et importer
                    </Button>
                  </Group>
                </>
              )}

              {importing && (
                <Box>
                  <Text size="sm" mb="xs">Import en cours...</Text>
                  <Progress value={importProgress} animated />
                </Box>
              )}

              {importError && (
                <Alert icon={<IconAlertCircle size={16} />} title="Erreur" color="red">
                  {importError}
                </Alert>
              )}

              {importReport && (
                <Alert color="green" title="Import terminé">
                  <Stack gap="xs">
                    <Text size="sm">
                      <strong>{importReport.postes_created}</strong> postes créés •{' '}
                      <strong>{importReport.postes_reused}</strong> réutilisés
                    </Text>
                    <Text size="sm">
                      <strong>{importReport.tickets_created}</strong> tickets créés •{' '}
                      <strong>{importReport.lignes_imported}</strong> lignes importées
                    </Text>
                    {importReport.total_errors > 0 && (
                      <Text size="sm" c="red">
                        <strong>{importReport.total_errors}</strong> erreur(s)
                      </Text>
                    )}
                    {importReport.errors.length > 0 && (
                      <Box mt="md">
                        <Text size="sm" fw={700} mb="xs">Erreurs:</Text>
                        {importReport.errors.map((error, idx) => (
                          <Text key={idx} size="xs" c="red">{error}</Text>
                        ))}
                      </Box>
                    )}
                  </Stack>
                </Alert>
              )}
            </Stack>
          </Paper>
        </Stepper.Step>

        <Stepper.Completed>
          <Paper p="md" withBorder>
            <Alert color="green" title="Import terminé" icon={<IconCheck size={16} />}>
              L'import a été effectué avec succès. Vous pouvez consulter les données dans les sections appropriées.
            </Alert>
          </Paper>
        </Stepper.Completed>
      </Stepper>

      <Group justify="flex-end" mt="xl">
        {activeStep > 0 && (
          <Button variant="default" onClick={() => setActiveStep(activeStep - 1)}>
            Précédent
          </Button>
        )}
        {activeStep < 2 && activeStep > 0 && (
          <Button onClick={() => setActiveStep(activeStep + 1)}>
            Suivant
          </Button>
        )}
      </Group>
    </Container>
  );
};

export default LegacyImport;

