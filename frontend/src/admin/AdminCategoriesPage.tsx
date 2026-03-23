/**
 * Page admin Catégories — Story 19.2 (parité 1.4.4).
 * CRUD, arborescence hiérarchique, drag-and-drop, toggle Caisse/Réception,
 * prix fixe/max, archivage/restauration, recherche.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Stack,
  Group,
  Button,
  Alert,
  Loader,
  Modal,
  Text,
  Title,
  Checkbox,
  Box,
  TextInput,
  Select,
  NumberInput,
  ActionIcon,
  Badge,
  Paper,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconChevronDown,
  IconChevronRight,
  IconSearch,
  IconArchive,
  IconArchiveOff,
  IconGripVertical,
  IconChevronsDown,
  IconChevronsUp,
  IconTrash,
  IconUpload,
  IconDownload,
  IconRefresh,
  IconArrowsSort,
} from '@tabler/icons-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../auth/AuthContext';
import {
  getCategoriesHierarchy,
  getExportCsv,
  getImportTemplate,
  postImportAnalyze,
  postImportExecute,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  hardDeleteCategory,
  getCategoryHasUsage,
  type CategoryHierarchyNode,
  type CategoryImportAnalyzeResponse,
} from '../api/categories';

/* ── Types ────────────────────────────────────────────────────────────── */

type SortMode = 'order' | 'name' | 'created';

/* ── Helpers (pure functions) ─────────────────────────────────────────── */

function sortTree(
  nodes: CategoryHierarchyNode[],
  sortBy: SortMode,
  orderField: 'display_order' | 'display_order_entry',
): CategoryHierarchyNode[] {
  const sorted = [...nodes].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name, 'fr');
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return (a[orderField] ?? 0) - (b[orderField] ?? 0);
    }
  });
  return sorted.map((n) => ({
    ...n,
    children: n.children?.length ? sortTree(n.children, sortBy, orderField) : n.children,
  }));
}

function filterTreeByQuery(
  nodes: CategoryHierarchyNode[],
  query: string,
): CategoryHierarchyNode[] {
  const lower = query.toLowerCase();
  return nodes.reduce<CategoryHierarchyNode[]>((acc, node) => {
    const filteredChildren = filterTreeByQuery(node.children || [], query);
    const nameMatch = node.name.toLowerCase().includes(lower);
    const officialMatch = node.official_name?.toLowerCase().includes(lower) ?? false;
    if (nameMatch || officialMatch || filteredChildren.length > 0) {
      acc.push({ ...node, children: filteredChildren });
    }
    return acc;
  }, []);
}

function flattenTree(
  nodes: CategoryHierarchyNode[],
  depth: number,
  expandedIds: Set<string>,
  forceExpand: boolean,
): Array<{ node: CategoryHierarchyNode; depth: number }> {
  const out: Array<{ node: CategoryHierarchyNode; depth: number }> = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.children?.length && (forceExpand || expandedIds.has(n.id))) {
      out.push(...flattenTree(n.children, depth + 1, expandedIds, forceExpand));
    }
  }
  return out;
}

function getRootCategoriesForSelect(
  nodes: CategoryHierarchyNode[],
  excludeId: string | null,
  orderField: 'display_order' | 'display_order_entry',
): Array<{ value: string; label: string }> {
  return [...nodes]
    .filter((n) => !n.parent_id && n.id !== excludeId)
    .sort((a, b) => (a[orderField] ?? 0) - (b[orderField] ?? 0))
    .map((n) => ({ value: n.id, label: n.name }));
}

function collectParentIds(nodes: CategoryHierarchyNode[]): string[] {
  const ids: string[] = [];
  for (const n of nodes) {
    if (n.children?.length) {
      ids.push(n.id);
      ids.push(...collectParentIds(n.children));
    }
  }
  return ids;
}

function updateNodeInTree(
  nodes: CategoryHierarchyNode[],
  nodeId: string,
  patch: Partial<CategoryHierarchyNode>,
): CategoryHierarchyNode[] {
  return nodes.map((n) => {
    if (n.id === nodeId) return { ...n, ...patch };
    if (n.children?.length) return { ...n, children: updateNodeInTree(n.children, nodeId, patch) };
    return n;
  });
}

function findNodeById(nodes: CategoryHierarchyNode[], id: string): CategoryHierarchyNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const found = findNodeById(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function formatCategoryDisplayName(
  node: CategoryHierarchyNode,
  depth: number,
): string {
  if (depth === 0 && node.official_name) {
    return `(${node.name}) ${node.official_name}`;
  }
  if (depth > 0) {
    return `* ${node.name}`;
  }
  return node.name;
}

/* ── InlineOrderInput ─────────────────────────────────────────────────── */

function InlineOrderInput({
  value,
  onSave,
  testId,
  disabled,
}: {
  value: number;
  onSave: (v: number) => void;
  testId: string;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState<number | string>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = () => {
    const num = typeof localValue === 'string' ? parseInt(localValue, 10) : localValue;
    if (!isNaN(num) && num !== value) onSave(num);
  };

  return (
    <NumberInput
      size="xs"
      w={60}
      min={0}
      value={localValue}
      onChange={setLocalValue}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLElement).blur();
      }}
      disabled={disabled}
      data-testid={testId}
    />
  );
}

/* ── SortableRow ──────────────────────────────────────────────────────── */

function SortableRow({
  id,
  disabled,
  dimmed,
  testId,
  children,
  depth,
}: {
  id: string;
  disabled?: boolean;
  dimmed?: boolean;
  testId?: string;
  children: (listeners: Record<string, unknown> | undefined) => React.ReactNode;
  depth: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, scaleX: 1, scaleY: 1 } : null,
    ),
    transition: transition ?? undefined,
    opacity: isDragging || dimmed ? 0.5 : 1,
    paddingLeft: depth * 32 + 8,
    borderBottom: '1px solid #f1f3f5',
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      data-testid={testId}
      py="sm"
      px="md"
      bg="white"
    >
      {children(disabled ? undefined : listeners)}
    </Box>
  );
}

/* ── Main component ───────────────────────────────────────────────────── */

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
  const [formError, setFormError] = useState<string | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<CategoryHierarchyNode | null>(null);
  const [formName, setFormName] = useState('');
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formOfficialName, setFormOfficialName] = useState('');
  const [formPrice, setFormPrice] = useState<number | string>('');
  const [formMaxPrice, setFormMaxPrice] = useState<number | string>('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formHasUsage, setFormHasUsage] = useState(false);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const hasInitialExpand = useRef(false);
  const [viewMode, setViewMode] = useState<string>('sale');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('order');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const orderField: 'display_order' | 'display_order_entry' =
    viewMode === 'sale' ? 'display_order' : 'display_order_entry';
  const visField: 'is_visible_sale' | 'is_visible_reception' =
    viewMode === 'sale' ? 'is_visible_sale' : 'is_visible_reception';

  const loadHierarchy = useCallback(
    async (silent = false) => {
      if (!accessToken || !permissions.includes('admin')) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await getCategoriesHierarchy(accessToken, includeDeleted);
        setTree(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur chargement');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [accessToken, permissions, includeDeleted],
  );

  useEffect(() => {
    loadHierarchy();
  }, [loadHierarchy]);

  useEffect(() => {
    if (!hasInitialExpand.current && tree.length > 0) {
      hasInitialExpand.current = true;
      setExpandedIds(new Set(collectParentIds(tree)));
    }
  }, [tree]);

  /* ── Handlers ─────────────────────────────────────────────────────── */

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => setExpandedIds(new Set(collectParentIds(tree)));
  const handleCollapseAll = () => setExpandedIds(new Set());

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
      loadHierarchy(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur exécution import');
    } finally {
      setImportExecuting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!accessToken || !window.confirm('Archiver cette catégorie ?')) return;
    setActionError(null);
    try {
      await deleteCategory(accessToken, id);
      loadHierarchy(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur archivage');
    }
  };

  const handleRestore = async (id: string) => {
    if (!accessToken) return;
    setActionError(null);
    try {
      await restoreCategory(accessToken, id);
      loadHierarchy(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur restauration');
    }
  };

  const handleHardDelete = async (id: string) => {
    if (!accessToken) return;
    try {
      const { has_usage } = await getCategoryHasUsage(accessToken, id);
      if (
        has_usage &&
        !window.confirm('Cette catégorie est utilisée. Supprimer quand même ?')
      )
        return;
    } catch {
      // Si le check d'usage échoue, on continue avec la confirmation
    }
    if (!window.confirm('Suppression définitive. Confirmer ?')) return;
    setActionError(null);
    try {
      await hardDeleteCategory(accessToken, id);
      loadHierarchy(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur suppression définitive');
    }
  };

  const handleVisibilityToggle = async (
    nodeId: string,
    field: 'is_visible_sale' | 'is_visible_reception',
    newValue: boolean,
  ) => {
    if (!accessToken) return;
    setTree((prev) =>
      updateNodeInTree(prev, nodeId, { [field]: newValue } as Partial<CategoryHierarchyNode>),
    );
    try {
      await updateCategory(accessToken, nodeId, { [field]: newValue });
      loadHierarchy(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur mise à jour visibilité');
      loadHierarchy(true);
    }
  };

  const handleOrderUpdate = async (
    nodeId: string,
    field: 'display_order' | 'display_order_entry',
    value: number,
  ) => {
    if (!accessToken) return;
    setTree((prev) =>
      updateNodeInTree(prev, nodeId, { [field]: value } as Partial<CategoryHierarchyNode>),
    );
    try {
      await updateCategory(accessToken, nodeId, { [field]: value });
      loadHierarchy(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur mise à jour ordre');
      loadHierarchy(true);
    }
  };

  const handleCreateClick = () => {
    setEditingNode(null);
    setFormName('');
    setFormParentId(null);
    setFormOfficialName('');
    setFormPrice('');
    setFormMaxPrice('');
    setFormHasUsage(false);
    setFormError(null);
    setFormModalOpen(true);
  };

  const handleEditClick = async (node: CategoryHierarchyNode) => {
    setEditingNode(node);
    setFormName(node.name);
    setFormParentId(node.parent_id ?? null);
    setFormOfficialName(node.official_name ?? '');
    setFormPrice(node.price ?? '');
    setFormMaxPrice(node.max_price ?? '');
    setFormError(null);
    setFormHasUsage(false);

    if (!node.deleted_at && accessToken) {
      try {
        const { has_usage } = await getCategoryHasUsage(accessToken, node.id);
        setFormHasUsage(has_usage);
      } catch {
        setFormHasUsage(true);
      }
    }

    setFormModalOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!accessToken || !formName.trim()) return;
    setFormSubmitting(true);
    setFormError(null);
    const priceVal = formPrice === '' || formPrice === undefined ? null : Number(formPrice);
    const maxPriceVal =
      formMaxPrice === '' || formMaxPrice === undefined ? null : Number(formMaxPrice);
    try {
      if (editingNode) {
        await updateCategory(accessToken, editingNode.id, {
          name: formName.trim(),
          parent_id: formParentId || null,
          official_name: formOfficialName.trim() || null,
          price: priceVal,
          max_price: maxPriceVal,
        });
      } else {
        await createCategory(accessToken, {
          name: formName.trim(),
          parent_id: formParentId || null,
          official_name: formOfficialName.trim() || null,
          price: priceVal,
          max_price: maxPriceVal,
        });
      }
      setFormModalOpen(false);
      loadHierarchy(true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleFormArchive = async () => {
    if (!accessToken || !editingNode || !window.confirm('Archiver cette catégorie ?')) return;
    setActionError(null);
    try {
      await deleteCategory(accessToken, editingNode.id);
      setFormModalOpen(false);
      loadHierarchy(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur archivage');
    }
  };

  const handleFormDelete = async () => {
    if (!accessToken || !editingNode) return;
    if (!window.confirm('Suppression définitive. Confirmer ?')) return;
    setActionError(null);
    try {
      await hardDeleteCategory(accessToken, editingNode.id);
      setFormModalOpen(false);
      loadHierarchy(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur suppression');
    }
  };

  const handleFormRestore = async () => {
    if (!accessToken || !editingNode) return;
    setActionError(null);
    try {
      await restoreCategory(accessToken, editingNode.id);
      setFormModalOpen(false);
      loadHierarchy(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erreur restauration');
    }
  };

  /* ── DnD handler ─────────────────────────────────────────────────── */

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !accessToken) return;

    const activeNode = findNodeById(tree, active.id as string);
    const overNode = findNodeById(tree, over.id as string);
    if (!activeNode || !overNode) return;

    if (activeNode.parent_id !== overNode.parent_id) {
      setActionError('Vous ne pouvez réorganiser que les catégories du même niveau');
      return;
    }

    const siblings = activeNode.parent_id
      ? findNodeById(processedTree, activeNode.parent_id)?.children ?? []
      : processedTree;

    const oldIndex = siblings.findIndex((s) => s.id === active.id);
    const newIndex = siblings.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(siblings, oldIndex, newIndex);
    const promises = reordered.map((node, i) => {
      const newOrder = i * 10;
      if (node[orderField] !== newOrder) {
        return updateCategory(accessToken, node.id, { [orderField]: newOrder });
      }
      return Promise.resolve(undefined);
    });

    await Promise.all(promises);
    loadHierarchy(true);
  };

  /* ── Processed data ───────────────────────────────────────────────── */

  const isSearching = searchQuery.trim().length > 0;

  const processedTree = useMemo(() => {
    let result = sortTree(tree, sortBy, orderField);
    if (isSearching) {
      result = filterTreeByQuery(result, searchQuery.trim());
    }
    return result;
  }, [tree, sortBy, orderField, searchQuery, isSearching]);

  const flatList = useMemo(
    () => flattenTree(processedTree, 0, expandedIds, isSearching),
    [processedTree, expandedIds, isSearching],
  );

  const flatIds = useMemo(() => flatList.map(({ node }) => node.id), [flatList]);

  const parentSelectOptions = useMemo(
    () => [
      { value: '', label: 'Aucune (catégorie racine)' },
      ...getRootCategoriesForSelect(tree, editingNode?.id ?? null, orderField),
    ],
    [tree, editingNode, orderField],
  );

  const editingHasChildren =
    editingNode?.children?.length ? editingNode.children.length > 0 : false;
  const editingPriceConflict =
    editingHasChildren &&
    ((typeof formPrice === 'number' && formPrice > 0) ||
      (typeof formMaxPrice === 'number' && formMaxPrice > 0));

  const priceDescriptionForParent =
    'Catégorie avec sous-catégories : seuls les champs vides ou 0 sont acceptés (supprime le prix).';
  const priceDescriptionForLeaf = 'Prix suggéré (optionnel)';

  /* ── Render ────────────────────────────────────────────────────────── */

  if (!permissions.includes('admin')) {
    return (
      <div data-testid="admin-categories-forbidden">
        <Text>Accès réservé aux administrateurs.</Text>
      </div>
    );
  }

  return (
    <Stack gap="md" maw={1200} mx="auto" p="md" data-testid="admin-categories-page">
      {/* ── Header : titre + sous-titre à gauche, boutons à droite ── */}
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Title order={1}>Gestion des Catégories</Title>
          <Text size="sm" c="dimmed">
            Gérer les catégories de produits utilisées dans l&apos;application
          </Text>
        </Stack>
        <Group gap="sm" wrap="nowrap">
          <Button
            variant="outline"
            size="sm"
            leftSection={<IconUpload size={16} />}
            onClick={() => {
              setImportModalOpen(true);
              setImportAnalyze(null);
              setImportFile(null);
              setActionError(null);
            }}
            data-testid="admin-categories-import"
          >
            Importer
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftSection={<IconDownload size={16} />}
            onClick={handleExport}
            data-testid="admin-categories-export"
          >
            Exporter
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftSection={<IconRefresh size={16} />}
            onClick={() => loadHierarchy()}
            data-testid="admin-categories-refresh"
          >
            Actualiser
          </Button>
          <Button
            variant="filled"
            size="sm"
            leftSection={<IconPlus size={16} />}
            onClick={handleCreateClick}
            data-testid="admin-categories-new-category"
          >
            Nouvelle catégorie
          </Button>
        </Group>
      </Group>

      {error && <Alert color="red">{error}</Alert>}
      {actionError && <Alert color="orange">{actionError}</Alert>}

      {/* ── Barre de contrôles (hors du card) ────────────────────────── */}
      <Group justify="space-between" align="flex-end">
        <Checkbox
          label="Afficher les éléments archivés"
          checked={includeDeleted}
          onChange={(e) => setIncludeDeleted(e.currentTarget.checked)}
          data-testid="admin-categories-include-deleted"
        />
        <TextInput
          placeholder="Rechercher une catégorie..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          w={280}
          data-testid="search-categories"
        />
        <Group gap="md" align="flex-end">
          <Stack gap={4}>
            <Text size="xs" c="dimmed">Trier par</Text>
            <Select
              size="sm"
              w={200}
              value={sortBy}
              onChange={(v) => setSortBy((v as SortMode) ?? 'order')}
              leftSection={<IconArrowsSort size={16} />}
              data={[
                { value: 'order', label: "Ordre d'affichage" },
                { value: 'name', label: 'Nom (alphabétique)' },
                { value: 'created', label: 'Date de création' },
              ]}
              data-testid="sort-select"
            />
          </Stack>
          <Stack gap={4}>
            <Text size="xs" c="dimmed">Type de ticket</Text>
            <Button.Group data-testid="view-mode-toggle">
              <Button
                variant={viewMode === 'sale' ? 'filled' : 'default'}
                color={viewMode === 'sale' ? 'dark' : 'gray'}
                size="sm"
                onClick={() => setViewMode('sale')}
              >
                Caisse
              </Button>
              <Button
                variant={viewMode === 'reception' ? 'filled' : 'default'}
                color={viewMode === 'reception' ? 'dark' : 'gray'}
                size="sm"
                onClick={() => setViewMode('reception')}
              >
                Réception
              </Button>
            </Button.Group>
          </Stack>
        </Group>
      </Group>

      {/* ── Card principal ────────────────────────────────────────────── */}
      <Paper withBorder shadow="sm" radius="md" p="md">
        <Stack gap="md">
          {viewMode === 'reception' && (
            <Stack gap="xs">
              <Text fw={700} c="orange" size="md">Mode Réception</Text>
              <Alert color="gray" data-testid="reception-mode-alert">
                Dans ce mode, vous pouvez gérer la visibilité et l&apos;ordre d&apos;affichage des
                catégories pour les tickets de réception. Utilisez les cases à cocher pour
                afficher/masquer les catégories dans les tickets de réception.
              </Alert>
            </Stack>
          )}

          <Group gap="md">
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconChevronsDown size={16} />}
              onClick={handleExpandAll}
              data-testid="expand-all"
            >
              Tout déplier
            </Button>
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconChevronsUp size={16} />}
              onClick={handleCollapseAll}
              data-testid="collapse-all"
            >
              Tout replier
            </Button>
          </Group>

          {loading ? (
            <Loader size="sm" data-testid="admin-categories-loading" />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
                <Stack gap={4} data-testid="categories-tree">
                  {flatList.map(({ node, depth }) => {
                    const isArchived = !!node.deleted_at;
                    const allChildrenHidden =
                      (node.children?.length ?? 0) > 0 &&
                      node.children!.every((c) => !c[visField]);

                    return (
                      <SortableRow
                        key={node.id}
                        id={node.id}
                        disabled={isArchived}
                        dimmed={isArchived}
                        testId={`category-row-${node.id}`}
                        depth={depth}
                      >
                        {(listeners) => (
                          <Group justify="space-between" wrap="nowrap">
                            <Group gap={8} wrap="nowrap">
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                style={{
                                  cursor: isArchived ? 'not-allowed' : 'grab',
                                }}
                                {...(listeners ?? {})}
                                data-testid={`grip-${node.id}`}
                              >
                                <IconGripVertical size={16} />
                              </ActionIcon>
                              {node.children?.length ? (
                                <Box
                                  component="span"
                                  style={{
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                  }}
                                  onClick={() => toggleExpand(node.id)}
                                  data-testid={`toggle-expand-${node.id}`}
                                >
                                  {isSearching || expandedIds.has(node.id) ? (
                                    <IconChevronDown size={16} />
                                  ) : (
                                    <IconChevronRight size={16} />
                                  )}
                                </Box>
                              ) : null}
                              <Checkbox
                                checked={node[visField]}
                                onChange={(e) =>
                                  handleVisibilityToggle(
                                    node.id,
                                    visField,
                                    e.currentTarget.checked,
                                  )
                                }
                                disabled={isArchived}
                                data-testid={`visibility-${node.id}`}
                              />
                              <Text
                                component="span"
                                fw={depth === 0 ? 700 : undefined}
                              >
                                {formatCategoryDisplayName(node, depth)}
                              </Text>
                              {allChildrenHidden && (
                                <Text component="span" size="xs" c="dimmed">
                                  (sous-catégories masquées)
                                </Text>
                              )}
                            </Group>
                            <Group gap={8} wrap="nowrap">
                              <InlineOrderInput
                                value={node[orderField]}
                                onSave={(v) => handleOrderUpdate(node.id, orderField, v)}
                                disabled={isArchived}
                                testId={`order-input-${node.id}`}
                              />
                              <ActionIcon
                                variant="light"
                                color="blue"
                                onClick={() => handleEditClick(node)}
                                data-testid={`edit-category-${node.id}`}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                              {isArchived ? (
                                <>
                                  <ActionIcon
                                    variant="light"
                                    color="blue"
                                    onClick={() => handleRestore(node.id)}
                                    data-testid={`restore-${node.id}`}
                                  >
                                    <IconArchiveOff size={16} />
                                  </ActionIcon>
                                  <ActionIcon
                                    variant="light"
                                    color="red"
                                    onClick={() => handleHardDelete(node.id)}
                                    data-testid={`hard-delete-${node.id}`}
                                  >
                                    <IconTrash size={16} />
                                  </ActionIcon>
                                </>
                              ) : (
                                <ActionIcon
                                  variant="light"
                                  color="red"
                                  onClick={() => handleArchive(node.id)}
                                  data-testid={`archive-${node.id}`}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              )}
                            </Group>
                          </Group>
                        )}
                      </SortableRow>
                    );
                  })}
                </Stack>
              </SortableContext>
            </DndContext>
          )}

          {flatList.length === 0 && !loading && (
            <Text data-testid="admin-categories-empty">Aucune catégorie.</Text>
          )}
        </Stack>
      </Paper>

      {/* ── Form modal ──────────────────────────────────────────────── */}
      <Modal
        opened={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingNode ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        data-testid="admin-categories-form-modal"
      >
        <Stack gap="sm">
          {formError && (
            <Alert color="red" data-testid="form-category-error">
              {formError}
            </Alert>
          )}

          {editingNode?.deleted_at && (
            <Group>
              <Badge color="orange">
                Archivée le {new Date(editingNode.deleted_at).toLocaleDateString('fr-FR')}
              </Badge>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconArchiveOff size={14} />}
                onClick={handleFormRestore}
                data-testid="form-restore"
              >
                Restaurer
              </Button>
            </Group>
          )}

          <TextInput
            label="Nom court/rapide"
            description="Nom court utilisé pour l'affichage dans les boutons de la caisse et de la réception"
            placeholder="Ex: Bricot"
            value={formName}
            onChange={(e) => setFormName(e.currentTarget.value)}
            required
            data-testid="form-category-name"
          />

          <TextInput
            label="Nom complet officiel (optionnel)"
            description="Dénomination complète officielle utilisée pour la comptabilité et les exports. Affichée dans les tooltips."
            placeholder="Ex: Articles de bricolage et jardinage thermique"
            value={formOfficialName}
            onChange={(e) => setFormOfficialName(e.currentTarget.value)}
            data-testid="form-category-official-name"
          />

          <Select
            label="Catégorie parente"
            description="Seules les catégories racines peuvent être sélectionnées comme parent"
            placeholder="Sélectionner une catégorie parente (optionnel)"
            value={formParentId ?? ''}
            onChange={(v) => setFormParentId(v === '' || v === null ? null : v)}
            data={parentSelectOptions}
            clearable
            searchable
            data-testid="form-category-parent"
          />

          <NumberInput
            label="Prix fixe"
            description={editingHasChildren ? priceDescriptionForParent : priceDescriptionForLeaf}
            min={0}
            decimalScale={2}
            fixedDecimalScale
            prefix="€ "
            value={formPrice}
            onChange={setFormPrice}
            data-testid="form-category-price"
          />

          <NumberInput
            label="Prix maximum"
            description={editingHasChildren ? priceDescriptionForParent : priceDescriptionForLeaf}
            min={0}
            decimalScale={2}
            fixedDecimalScale
            prefix="€ "
            value={formMaxPrice}
            onChange={setFormMaxPrice}
            data-testid="form-category-max-price"
          />

          {editingPriceConflict && (
            <Alert color="yellow" data-testid="form-price-conflict-alert">
              Cette catégorie a des sous-catégories. Pour pouvoir créer des sous-catégories,
              videz les champs de prix (laisser vide ou 0).
            </Alert>
          )}

          <Group justify="space-between">
            <Group>
              {editingNode && !editingNode.deleted_at && (
                <Button
                  color="red"
                  variant="light"
                  size="sm"
                  leftSection={
                    formHasUsage ? <IconArchive size={14} /> : <IconTrash size={14} />
                  }
                  onClick={formHasUsage ? handleFormArchive : handleFormDelete}
                  data-testid={formHasUsage ? 'form-archive' : 'form-delete'}
                >
                  {formHasUsage ? 'Archiver' : 'Supprimer'}
                </Button>
              )}
            </Group>
            <Group>
              <Button variant="subtle" onClick={() => setFormModalOpen(false)}>
                Annuler
              </Button>
              <Button
                loading={formSubmitting}
                onClick={handleFormSubmit}
                disabled={!formName.trim()}
                data-testid="form-category-submit"
              >
                {editingNode ? 'Mettre à jour' : 'Créer'}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      {/* ── Import modal ────────────────────────────────────────────── */}
      <Modal
        opened={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportFile(null);
          setImportAnalyze(null);
        }}
        title="Importer des catégories (CSV)"
      >
        <Stack gap="sm">
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconDownload size={14} />}
            onClick={handleDownloadTemplate}
            data-testid="admin-categories-download-template"
          >
            Télécharger modèle CSV
          </Button>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              setImportFile(e.target.files?.[0] ?? null);
              setImportAnalyze(null);
            }}
            data-testid="import-file-input"
          />
          {importAnalyze && (
            <>
              <Text size="sm">
                {importAnalyze.valid_rows} ligne(s) valide(s), {importAnalyze.error_rows}{' '}
                erreur(s).
              </Text>
              {importAnalyze.error_rows > 0 && (
                <Text size="sm" c="red">
                  {importAnalyze.rows
                    .filter((r) => !r.valid)
                    .map((r) => `Ligne ${r.row_index}: ${r.error}`)
                    .join(' ; ')}
                </Text>
              )}
            </>
          )}
          <Group>
            <Button variant="subtle" onClick={() => setImportModalOpen(false)}>
              Annuler
            </Button>
            {!importAnalyze ? (
              <Button
                onClick={handleImportAnalyze}
                disabled={!importFile}
                data-testid="import-analyze-btn"
              >
                Analyser
              </Button>
            ) : (
              <Button
                loading={importExecuting}
                onClick={handleImportExecute}
                disabled={importAnalyze.valid_rows === 0}
                data-testid="import-execute-btn"
              >
                Exécuter l&apos;import
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
