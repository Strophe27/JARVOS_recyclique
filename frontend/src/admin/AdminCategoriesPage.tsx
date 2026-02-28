/**
 * Page admin Catégories — Story 8.3.
 * Route : /admin/categories. Liste/hiérarchie, breadcrumb, Import/Export, hard delete, restauration.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Stack,
  Group,
  Button,
  Breadcrumbs,
  Anchor,
  Table,
  Alert,
  Loader,
  Modal,
  Text,
  Checkbox,
  Card,
  Box,
} from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  getCategoriesHierarchy,
  getExportCsv,
  getImportTemplate,
  postImportAnalyze,
  postImportExecute,
  deleteCategory,
  restoreCategory,
  hardDeleteCategory,
  getCategoryHasUsage,
  type CategoryHierarchyNode,
  type CategoryImportAnalyzeResponse,
} from '../api/categories';
import { getHierarchyIndentPx } from '../shared/theme';
import { PageContainer, PageSection } from '../shared/layout';

export function AdminCategoriesPage() {
  const { accessToken, permissions } = useAuth();
  const [tree, setTree] = useState<CategoryHierarchyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importAnalyze, setImportAnalyze] = useState<CategoryImportAnalyzeResponse | null>(null);
  const [importExecuting, setImportExecuting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadHierarchy = useCallback(async () => {
    if (!accessToken || !permissions.includes('admin')) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCategoriesHierarchy(accessToken, includeDeleted);
      setTree(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, permissions, includeDeleted]);

  useEffect(() => {
    loadHierarchy();
  }, [loadHierarchy]);

  const handleExport = async () => {
    if (!accessToken) return;
    setActionError(null);
    try {
      const blob = await getExportCsv(accessToken, includeDeleted);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'categories_export.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur export');
    }
  };

  const handleDownloadTemplate = async () => {
    if (!accessToken) return;
    setActionError(null);
    try {
      const blob = await getImportTemplate(accessToken);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'categories_import_template.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur téléchargement modèle');
    }
  };

  const handleImportAnalyze = async () => {
    if (!accessToken || !importFile) return;
    setActionError(null);
    try {
      const result = await postImportAnalyze(accessToken, importFile);
      setImportAnalyze(result);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur analyse');
    }
  };

  const handleImportExecute = async () => {
    if (!accessToken || !importAnalyze) return;
    setImportExecuting(true);
    setActionError(null);
    try {
      const validRows = importAnalyze.rows.filter((r) => r.valid && r.name);
      const result = await postImportExecute(accessToken, validRows);
      setImportModalOpen(false);
      setImportFile(null);
      setImportAnalyze(null);
      if (result.errors.length > 0) {
        setActionError(`${result.created} créées. Erreurs : ${result.errors.join(' ; ')}`);
      }
      loadHierarchy();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur exécution import');
    } finally {
      setImportExecuting(false);
    }
  };

  const handleSoftDelete = async (id: string) => {
    if (!accessToken || !window.confirm('Supprimer cette catégorie (soft) ?')) return;
    setActionError(null);
    try {
      await deleteCategory(accessToken, id);
      loadHierarchy();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur suppression');
    }
  };

  const handleRestore = async (id: string) => {
    if (!accessToken) return;
    setActionError(null);
    try {
      await restoreCategory(accessToken, id);
      loadHierarchy();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur restauration');
    }
  };

  const handleHardDelete = async (id: string) => {
    if (!accessToken) return;
    try {
      const { has_usage } = await getCategoryHasUsage(accessToken, id);
      if (has_usage && !window.confirm('Cette catégorie est utilisée (ventes ou réception). Supprimer quand même ?')) return;
    } catch {
      // ignore has_usage error, proceed with confirm
    }
    if (!window.confirm('Suppression définitive. Confirmer ?')) return;
    setActionError(null);
    try {
      await hardDeleteCategory(accessToken, id);
      loadHierarchy();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur suppression définitive');
    }
  };

  const flattenWithDepth = (nodes: CategoryHierarchyNode[], depth: number): Array<{ node: CategoryHierarchyNode; depth: number }> => {
    const out: Array<{ node: CategoryHierarchyNode; depth: number }> = [];
    for (const n of nodes) {
      out.push({ node: n, depth });
      if (n.children?.length) {
        out.push(...flattenWithDepth(n.children, depth + 1));
      }
    }
    return out;
  };

  const flatList = flattenWithDepth(tree, 0);

  if (!permissions.includes('admin')) {
    return (
      <div data-testid="admin-categories-forbidden">
        <Text>Accès réservé aux administrateurs.</Text>
      </div>
    );
  }

  return (
    <PageContainer title="Catégories" maxWidth={1200} testId="admin-categories-page">
      <Breadcrumbs data-testid="admin-categories-breadcrumb">
        <Anchor href="/admin">Admin</Anchor>
        <span>Catégories</span>
      </Breadcrumbs>

      <Group justify="space-between">
        <Group>
          <Checkbox
            label="Inclure supprimées"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.currentTarget.checked)}
            data-testid="admin-categories-include-deleted"
          />
          <Button variant="light" size="sm" onClick={handleDownloadTemplate} data-testid="admin-categories-download-template">
            Télécharger modèle CSV
          </Button>
          <Button variant="light" size="sm" onClick={() => { setImportModalOpen(true); setImportAnalyze(null); setImportFile(null); setActionError(null); }} data-testid="admin-categories-import">
            Importer CSV
          </Button>
          <Button variant="filled" size="sm" onClick={handleExport} data-testid="admin-categories-export">
            Exporter CSV
          </Button>
        </Group>
      </Group>

      {error && <Alert color="red">{error}</Alert>}
      {actionError && <Alert color="orange">{actionError}</Alert>}

      <PageSection>
        <Card withBorder padding="md" radius="md">
      {loading ? (
        <Loader size="sm" data-testid="admin-categories-loading" />
      ) : (
        <Table striped highlightOnHover data-testid="admin-categories-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Nom officiel</Table.Th>
              <Table.Th>Visible caisse</Table.Th>
              <Table.Th>Visible réception</Table.Th>
              <Table.Th>Ordre</Table.Th>
              <Table.Th>Statut</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {flatList.map(({ node, depth }) => (
              <Table.Tr key={node.id} data-testid={`category-row-${node.id}`}>
                <Table.Td>
                  <Box pl={getHierarchyIndentPx(depth)}>{node.name}</Box>
                </Table.Td>
                <Table.Td>{node.official_name ?? '—'}</Table.Td>
                <Table.Td>{node.is_visible_sale ? 'Oui' : 'Non'}</Table.Td>
                <Table.Td>{node.is_visible_reception ? 'Oui' : 'Non'}</Table.Td>
                <Table.Td>{node.display_order} / {node.display_order_entry}</Table.Td>
                <Table.Td>{node.deleted_at ? 'Supprimée' : 'Active'}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {node.deleted_at ? (
                      <Button variant="light" size="xs" onClick={() => handleRestore(node.id)} data-testid={`restore-${node.id}`}>
                        Restaurer
                      </Button>
                    ) : (
                      <Button variant="light" size="xs" color="red" onClick={() => handleSoftDelete(node.id)} data-testid={`soft-delete-${node.id}`}>
                        Supprimer
                      </Button>
                    )}
                    <Button variant="light" size="xs" color="red" onClick={() => handleHardDelete(node.id)} data-testid={`hard-delete-${node.id}`}>
                      Suppression définitive
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {flatList.length === 0 && !loading && (
        <Text data-testid="admin-categories-empty">Aucune catégorie.</Text>
      )}
        </Card>
      </PageSection>

      <Modal
        opened={importModalOpen}
        onClose={() => { setImportModalOpen(false); setImportFile(null); setImportAnalyze(null); }}
        title="Importer des catégories (CSV)"
      >
        <Stack gap="sm">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportAnalyze(null); }}
            data-testid="import-file-input"
          />
          {importAnalyze && (
            <>
              <Text size="sm">
                {importAnalyze.valid_rows} ligne(s) valide(s), {importAnalyze.error_rows} erreur(s).
              </Text>
              {importAnalyze.error_rows > 0 && (
                <Text size="sm" c="red">
                  {importAnalyze.rows.filter((r) => !r.valid).map((r) => `Ligne ${r.row_index}: ${r.error}`).join(' ; ')}
                </Text>
              )}
            </>
          )}
          <Group>
            <Button variant="subtle" onClick={() => setImportModalOpen(false)}>Annuler</Button>
            {!importAnalyze ? (
              <Button onClick={handleImportAnalyze} disabled={!importFile} data-testid="import-analyze-btn">
                Analyser
              </Button>
            ) : (
              <Button loading={importExecuting} onClick={handleImportExecute} disabled={importAnalyze.valid_rows === 0} data-testid="import-execute-btn">
                Exécuter l'import
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </PageContainer>
  );
}
