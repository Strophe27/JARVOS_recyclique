import React, { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Alert,
  ActionIcon,
  Paper,
  Modal,
  LoadingOverlay,
  Menu,
  FileInput,
  Divider,
  Checkbox,
  SegmentedControl,
  Select,
  TextInput
} from '@mantine/core';
import {
  IconPlus,
  IconRefresh,
  IconAlertCircle,
  IconEdit,
  IconTrash,
  IconCheck,
  IconDownload,
  IconFileTypePdf,
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconArchive,
  IconRestore,
  IconArrowsSort,
  IconSearch
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Category, categoryService } from '../../services/categoryService';
import { CategoryForm } from '../../components/business/CategoryForm';
import { EnhancedCategorySelector } from '../../components/categories/EnhancedCategorySelector';
import { useCategoryStore } from '../../stores/categoryStore';

const AdminCategories: React.FC = () => {
  // Story B48-P4: Accès au store pour forcer le rechargement après archivage/suppression
  const { fetchCategories: refreshCategoryStore } = useCategoryStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<{ session_id: string | null; summary: any; sample: any[]; errors: string[] } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteExisting, setDeleteExisting] = useState(false);
  const [executeErrors, setExecuteErrors] = useState<string[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false); // Story B48-P1: Toggle pour afficher les éléments archivés
  const [ticketType, setTicketType] = useState<'sale' | 'entry'>('sale'); // Story B48-P4: Toggle SALE/CASH vs ENTRY/DEPOT
  const [sortBy, setSortBy] = useState<'order' | 'name' | 'created'>('order'); // Story B48-P4: Option de tri
  const [searchQuery, setSearchQuery] = useState(''); // Story B48-P4: Recherche

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoryService.getCategories(undefined, includeArchived);
      setCategories(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement des catégories');
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les catégories',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [includeArchived]); // Story B48-P1: Recharger quand le toggle change

  const handleCreate = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const handleDownloadTemplate = async () => {
    await categoryService.downloadImportTemplate();
  };

  const handleAnalyzeImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    try {
      const res = await categoryService.importAnalyze(selectedFile);
      setAnalyzeResult(res);
    } catch (e) {
      notifications.show({ title: 'Erreur', message: 'Analyse du CSV échouée', color: 'red' });
    } finally {
      setImporting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!analyzeResult?.session_id) return;
    setImporting(true);
    setExecuteErrors([]);
    try {
      const res = await categoryService.importExecute(analyzeResult.session_id, deleteExisting);
      if (res.errors?.length) {
        setExecuteErrors(res.errors);
        notifications.show({ 
          title: 'Import terminé avec erreurs', 
          message: `L'import s'est terminé avec ${res.errors.length} erreur(s). Voir les détails ci-dessous.`, 
          color: 'yellow' 
        });
      } else {
        const message = deleteExisting 
          ? 'Import réussi - Toutes les catégories et lignes de dépôt existantes ont été supprimées et remplacées'
          : 'Import réussi - Catégories mises à jour';
        notifications.show({ title: 'Import réussi', message, color: 'green' });
        setImportModalOpen(false);
        setAnalyzeResult(null);
        setSelectedFile(null);
        setDeleteExisting(false);
        setExecuteErrors([]);
        fetchCategories();
      }
    } catch (e: any) {
      const errorMessage = e.response?.data?.detail || e.message || 'Exécution de l\'import échouée';
      setExecuteErrors([errorMessage]);
      notifications.show({ 
        title: 'Erreur', 
        message: 'L\'import a échoué. Voir les détails ci-dessous.', 
        color: 'red' 
      });
    } finally {
      setImporting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setModalOpen(true);
  };

  const handleDelete = async (_category: Category) => {};

  const handleReactivate = async (category: Category) => {
    try {
      await categoryService.reactivateCategory(category.id);
      notifications.show({
        title: 'Succès',
        message: 'Catégorie réactivée avec succès',
        color: 'green',
      });
      fetchCategories();
    } catch (err: any) {
      notifications.show({
        title: 'Erreur',
        message: err.response?.data?.detail || 'Impossible de réactiver la catégorie',
        color: 'red',
      });
    }
  };

  // Story B48-P1: Restaurer une catégorie archivée
  const handleRestore = async (category: Category) => {
    try {
      await categoryService.restoreCategory(category.id);
      notifications.show({
        title: 'Succès',
        message: 'Catégorie restaurée avec succès',
        color: 'green',
      });
      fetchCategories();
      await refreshCategoryStore(true); // Story B48-P4: Forcer le rechargement du store
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail;
      let errorMessage = 'Impossible de restaurer la catégorie';
      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (errorDetail?.detail) {
        errorMessage = errorDetail.detail;
      }
      notifications.show({
        title: 'Erreur',
        message: errorMessage,
        color: 'red',
      });
    }
  };

  const handleSubmit = async (data: { name: string; official_name?: string | null; parent_id?: string | null; price?: number | null; max_price?: number | null }) => {
    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, data);
        notifications.show({
          title: 'Succès',
          message: 'Catégorie mise à jour avec succès',
          color: 'green',
        });
      } else {
        await categoryService.createCategory(data);
        notifications.show({
          title: 'Succès',
          message: 'Catégorie créée avec succès',
          color: 'green',
        });
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      notifications.show({
        title: 'Erreur',
        message: err.response?.data?.detail || 'Erreur lors de l\'enregistrement',
        color: 'red',
      });
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await categoryService.exportToPdf();
      notifications.show({
        title: 'Succès',
        message: 'Export PDF téléchargé avec succès',
        color: 'green',
      });
    } catch (err: any) {
      notifications.show({
        title: 'Erreur',
        message: err.response?.data?.detail || 'Erreur lors de l\'export PDF',
        color: 'red',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await categoryService.exportToExcel();
      notifications.show({
        title: 'Succès',
        message: 'Export Excel téléchargé avec succès',
        color: 'green',
      });
    } catch (err: any) {
      notifications.show({
        title: 'Erreur',
        message: err.response?.data?.detail || 'Erreur lors de l\'export Excel',
        color: 'red',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={2}>Gestion des Catégories</Title>
            <Text c="dimmed" size="sm">
              Gérer les catégories de produits utilisées dans l'application
            </Text>
          </div>
          <Group>
            <Button
              variant="light"
              onClick={() => setImportModalOpen(true)}
              data-testid="import-button"
            >
              Importer
            </Button>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button
                  leftSection={<IconDownload size={16} />}
                  variant="light"
                  loading={exporting}
                  data-testid="export-button"
                >
                  Exporter
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconFileTypePdf size={16} />}
                  onClick={handleExportPdf}
                  data-testid="export-pdf"
                >
                  Exporter en PDF
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFileSpreadsheet size={16} />}
                  onClick={handleExportExcel}
                  data-testid="export-excel"
                >
                  Exporter en Excel
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFileTypeCsv size={16} />}
                  onClick={async () => {
                    try {
                      await categoryService.exportToCsv();
                      notifications.show({ title: 'Succès', message: 'Export CSV téléchargé', color: 'green' });
                    } catch (e: any) {
                      notifications.show({ title: 'Erreur', message: e?.response?.data?.detail || 'Export CSV échoué', color: 'red' });
                    }
                  }}
                  data-testid="export-csv"
                >
                  Exporter CSV (ré-importable)
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              onClick={fetchCategories}
              loading={loading}
            >
              Actualiser
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleCreate}
            >
              Nouvelle catégorie
            </Button>
          </Group>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Erreur" color="red">
            {error}
          </Alert>
        )}

        {/* Story B48-P4: Unified view with SegmentedControl toggle */}
        <Paper shadow="sm" p="md" withBorder pos="relative">
          <LoadingOverlay visible={loading} />

          <Stack gap="md">
            {/* Header controls */}
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <Checkbox
                label="Afficher les éléments archivés"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.currentTarget.checked)}
                data-testid="include-archived-toggle"
                style={{ alignSelf: 'center' }}
              />

              <Group gap="md" align="flex-end">
                <TextInput
                  placeholder="Rechercher une catégorie..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.currentTarget.value)}
                  leftSection={<IconSearch size={16} />}
                  size="sm"
                  style={{ width: 250 }}
                  data-testid="search-input"
                />

                <Select
                  label="Trier par"
                  value={sortBy}
                  onChange={(value) => setSortBy(value as 'order' | 'name' | 'created')}
                  data={[
                    { value: 'order', label: 'Ordre d\'affichage' },
                    { value: 'name', label: 'Nom (alphabétique)' },
                    { value: 'created', label: 'Date de création' }
                  ]}
                  leftSection={<IconArrowsSort size={16} />}
                  size="sm"
                  style={{ width: 180 }}
                  data-testid="sort-select"
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Text size="xs" c="dimmed" style={{ marginBottom: 0, lineHeight: 1 }}>
                    Type de ticket
                  </Text>
                  <SegmentedControl
                    value={ticketType}
                    onChange={(value) => setTicketType(value as 'sale' | 'entry')}
                    data={[
                      { label: 'Caisse', value: 'sale' },
                      { label: 'Réception', value: 'entry' }
                    ]}
                    data-testid="ticket-type-toggle"
                  />
                </div>
              </Group>
            </Group>

            {/* Info alert for Réception mode */}
            {ticketType === 'entry' && (
              <Alert color="blue" title="Mode Réception">
                <Text size="sm">
                  Dans ce mode, vous pouvez gérer la visibilité et l'ordre d'affichage des catégories pour les tickets de réception.
                  Utilisez les cases à cocher pour afficher/masquer les catégories dans les tickets de réception.
                </Text>
              </Alert>
            )}

            {/* Unified category management view */}
            <EnhancedCategorySelector
              showVisibilityControls={ticketType === 'entry'}
              showDisplayOrder={true}
              useDisplayOrderEntry={ticketType === 'entry'}
              showActions={true}
              enableDragDrop={true}
              sortBy={sortBy}
              searchQuery={searchQuery}
              overrideCategories={categories}
              onEdit={handleEdit}
              onVisibilityChange={(categoryId: string, isVisible: boolean) => {
                // Mettre à jour localement la visibilité sans recharger la page
                setCategories(prevCategories => {
                  return prevCategories.map(cat => {
                    if (cat.id === categoryId) {
                      return { ...cat, is_visible: isVisible }
                    }
                    return cat
                  })
                })
              }}
              onDisplayOrderChange={(categoryId: string, newOrder: number) => {
                // Mettre à jour localement l'ordre sans recharger la page
                // Cette fonction est appelée pour chaque catégorie mise à jour
                setCategories(prevCategories => {
                  return prevCategories.map(cat => {
                    if (cat.id === categoryId) {
                      // Mettre à jour l'ordre selon le type de ticket
                      if (ticketType === 'entry') {
                        return { ...cat, display_order_entry: newOrder }
                      } else {
                        return { ...cat, display_order: newOrder }
                      }
                    }
                    return cat
                  })
                })
              }}
              onDelete={async (category) => {
                if (!category) return;
                let hasUsage = true;
                try {
                  const usage = await categoryService.checkCategoryUsage(category.id);
                  hasUsage = usage.has_usage;

                  if (!usage.has_usage) {
                    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${category.name}" ? Cette action est irréversible.`)) {
                      await categoryService.hardDeleteCategory(category.id);
                      notifications.show({
                        title: 'Catégorie supprimée',
                        message: 'La catégorie a été supprimée définitivement.',
                        color: 'green'
                      });
                      fetchCategories();
                      await refreshCategoryStore(true); // Story B48-P4: Forcer le rechargement du store
                    }
                  } else {
                    if (window.confirm(`La catégorie "${category.name}" est utilisée dans l'historique. Voulez-vous l'archiver ? Elle sera masquée mais restera disponible dans l'historique.`)) {
                      await categoryService.deleteCategory(category.id);
                      notifications.show({
                        title: 'Catégorie archivée',
                        message: 'La catégorie a été archivée.',
                        color: 'green'
                      });
                      fetchCategories();
                      await refreshCategoryStore(true); // Story B48-P4: Forcer le rechargement du store
                    }
                  }
                } catch (e: any) {
                  const errorDetail = e?.response?.data?.detail;
                  let errorMessage = hasUsage ? 'Archivage échoué' : 'Suppression échouée';
                  if (typeof errorDetail === 'string') {
                    errorMessage = errorDetail;
                  } else if (errorDetail?.detail) {
                    errorMessage = errorDetail.detail;
                  }
                  notifications.show({
                    title: 'Erreur',
                    message: errorMessage,
                    color: 'red'
                  });
                }
              }}
            />
          </Stack>
        </Paper>
      </Stack>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
      >
        <Stack>
          {/* Story B48-P1: Bouton Restaurer pour catégories archivées */}
          {editingCategory?.deleted_at && (
            <Alert color="blue" icon={<IconArchive size={16} />}>
              <Group justify="space-between">
                <div>
                  <Text size="sm" fw={500}>Cette catégorie est archivée</Text>
                  <Text size="xs" c="dimmed">
                    Archivée le {new Date(editingCategory.deleted_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </div>
                <Button
                  leftSection={<IconRestore size={16} />}
                  variant="light"
                  color="blue"
                  onClick={async () => {
                    if (!editingCategory) return;
                    if (window.confirm('Êtes-vous sûr de vouloir restaurer cette catégorie ?')) {
                      await handleRestore(editingCategory);
                      setModalOpen(false);
                    }
                  }}
                  data-testid="restore-category-button"
                >
                  Restaurer
                </Button>
              </Group>
            </Alert>
          )}
          <CategoryForm
            category={editingCategory}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
            onDelete={async () => {
              if (!editingCategory) return;
              let hasUsage = true; // Default to true to be safe
              try {
                // Check if category has usage to decide between hard delete and soft delete
                const usage = await categoryService.checkCategoryUsage(editingCategory.id);
                hasUsage = usage.has_usage;
                
                if (!usage.has_usage) {
                  // No usage: hard delete (permanent deletion)
                  await categoryService.hardDeleteCategory(editingCategory.id);
                  notifications.show({
                    title: 'Catégorie supprimée',
                    message: 'La catégorie a été supprimée définitivement car elle n\'était utilisée nulle part.',
                    color: 'green'
                  });
                } else {
                  // Has usage: soft delete (archive)
                  await categoryService.deleteCategory(editingCategory.id);
                  notifications.show({
                    title: 'Catégorie archivée',
                    message: 'La catégorie a été archivée. Elle est masquée des sélecteurs mais reste disponible dans l\'historique.',
                    color: 'green'
                  });
                }
                setModalOpen(false);
                fetchCategories(); // Recharger l'état local
                await refreshCategoryStore(true); // Story B48-P4: Forcer le rechargement du store Zustand
              } catch (e: any) {
                const errorDetail = e?.response?.data?.detail;
                let errorMessage = hasUsage ? 'Archivage échoué' : 'Suppression échouée';
                if (typeof errorDetail === 'string') {
                  errorMessage = errorDetail;
                } else if (errorDetail?.detail) {
                  errorMessage = errorDetail.detail;
                }
                notifications.show({ 
                  title: 'Erreur', 
                  message: errorMessage, 
                  color: 'red' 
                });
              }
            }}
          />
        </Stack>
      </Modal>

      <Modal
        opened={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setExecuteErrors([]);
          setAnalyzeResult(null);
          setSelectedFile(null);
        }}
        title="Importer des Catégories"
        size="lg"
      >
        <Stack>
          <Group>
            <Button variant="subtle" onClick={handleDownloadTemplate}>Télécharger le modèle CSV</Button>
          </Group>
          <FileInput
            label="Fichier CSV"
            placeholder="Sélectionner un fichier .csv"
            value={selectedFile}
            onChange={setSelectedFile}
            accept=".csv"
          />
          <Checkbox
            label="Supprimer toutes les catégories existantes avant l'import"
            description="⚠️ Cette action est irréversible et supprimera aussi toutes les lignes de dépôt associées"
            checked={deleteExisting}
            onChange={(event) => {
              const isChecked = event.currentTarget.checked;
              if (isChecked) {
                notifications.show({
                  title: '⚠️ Attention - Suppression complète',
                  message: 'Vous êtes sur le point de supprimer TOUTES les catégories existantes ET toutes les lignes de dépôt associées. Cette action est irréversible et effacera toutes les données de dépôt historiques.',
                  color: 'red',
                  autoClose: 10000,
                });
              }
              setDeleteExisting(isChecked);
            }}
            color="red"
            data-testid="delete-existing-checkbox"
          />
          <Group>
            <Button onClick={handleAnalyzeImport} loading={importing} disabled={!selectedFile}>Analyser</Button>
            <Button onClick={handleExecuteImport} loading={importing} disabled={!analyzeResult?.session_id}>Exécuter</Button>
          </Group>
          {analyzeResult && (
            <>
              <Divider my="sm" />
              <Text size="sm">Résumé: total={analyzeResult.summary?.total} • à créer={analyzeResult.summary?.to_create} • à mettre à jour={analyzeResult.summary?.to_update}</Text>
              {analyzeResult.errors?.length ? (
                <Alert color="yellow" title="Erreurs d'analyse (aperçu)">
                  <div style={{ maxHeight: 200, overflow: 'auto' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{analyzeResult.errors.join('\n')}</pre>
                  </div>
                </Alert>
              ) : (
                <Alert color="green" title="Analyse valide">Vous pouvez exécuter l'import.</Alert>
              )}
            </>
          )}
          {executeErrors.length > 0 && (
            <Alert color="red" title="Erreurs d'exécution" mt="md">
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.875rem' }}>
                  {executeErrors.join('\n\n')}
                </pre>
              </div>
            </Alert>
          )}
        </Stack>
      </Modal>
    </Container>
  );
};

export default AdminCategories;
