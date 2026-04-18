import {

  Alert,

  Button,

  Group,

  Loader,

  LoadingOverlay,

  Menu,

  Modal,

  Paper,

  SegmentedControl,

  Select,

  Stack,

  Switch,

  Table,

  Text,

  TextInput,

  Title,

} from '@mantine/core';

import { ArrowDownAZ, ChevronDown, Download, FileSpreadsheet, FileText, Plus, RefreshCw, Search, Upload } from 'lucide-react';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {

  analyzeCategoriesImportForAdmin,

  createCategoryForAdmin,

  executeCategoriesImportForAdmin,

  fetchCategoriesExportBlob,

  fetchCategoriesImportTemplateBlob,

  getCategoriesListForAdmin,

  restoreCategoryForAdmin,

  softDeleteCategoryForAdmin,

  patchCategoryDisplayOrderEntryForAdmin,

  patchCategoryDisplayOrderForAdmin,

  patchCategoryVisibilityForAdmin,

  updateCategoryForAdmin,

  type CategoriesDataSource,

  type CategoryAdminListRowDto,

  type CategoryExportServerFormat,

  type CategoryV1ImportAnalyzeResponseDto,

  type CategoryV1UpdateRequestBody,

} from '../../api/admin-categories-client';

import { CategoryAdminFormModal, type CategoryFormSavePayload } from './categories/CategoryAdminFormModal';

import { AdminCategoriesDndShell, AdminCategoriesSortableTableRows } from './categories/admin-categories-dnd-table';

import { CategoryReparentDraftPanel } from './categories/CategoryReparentDraftPanel';

import { buildCategoriesCsvLines, triggerBlobDownload, triggerCsvDownload } from './categories/category-admin-csv-export';

import {

  filterCatsForReceptionVisibility,

  filterCatsForSearch,

  filterFlatRowsHideCollapsedChildren,

  orderedRowsWithDepth,

  parentIdsHavingChildren,

  type CategoriesSortBy,

} from './categories/category-admin-display-model';

import {

  computeOrdersAfterDragWithinSiblings,

  swapCaisseOrderWithNeighbor,

  swapReceptionOrderWithNeighbor,

  type CategoryDisplayOrderPatchItem,

} from './categories/category-admin-reorder';

import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';

import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';

import type { RegisteredWidgetProps } from '../../registry/widget-registry';

import { CashflowClientErrorAlert } from '../cashflow/CashflowClientErrorAlert';

import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';



type ActivationFilter = 'all' | 'active' | 'inactive';

/** Filtre client sur `is_visible` (admin réception : liste complète depuis `/v1/categories/`, comme l’écran legacy). */
type ReceptionVisibilityFilter = 'all' | 'visible' | 'hidden';

const SORT_OPTIONS: { value: CategoriesSortBy; label: string }[] = [

  { value: 'order', label: "Ordre d'affichage" },

  { value: 'name', label: 'Nom (A à Z)' },

  { value: 'created', label: 'Date de création' },

];



const IMPORT_SUMMARY_LABELS: Record<string, string> = {

  total: 'Lignes de données (après en-tête)',

  to_create: 'Nouvelles sous-catégories (décompte analyse ; racines nouvelles non incluses)',

  to_update: 'Sous-catégories à mettre à jour (décompte analyse ; critère prix à l’analyse)',

  roots: 'Racines nouvelles distinctes (décompte analyse)',

  subs: 'Lignes avec sous-catégorie renseignée',

  root: 'Racines',

  sub: 'Sous-niveaux',

};

/** Ordre d’affichage des clés d’agrégats (le reste suit par ordre alphabétique). */

const IMPORT_SUMMARY_KEY_ORDER: readonly string[] = [

  'total',

  'roots',

  'root',

  'subs',

  'sub',

  'to_create',

  'to_update',

];

const IMPORT_ENUM_TOKEN_FR: Record<string, string> = {

  root: 'Racine',

  sub: 'Sous-niveau',

  subs: 'Sous-niveaux',

  roots: 'Racines',

  create: 'Création',

  update: 'Mise à jour',

};

function formatImportEnumTokenFr(raw: string): string {

  const t = raw.trim().toLowerCase();

  return IMPORT_ENUM_TOKEN_FR[t] ?? raw;

}

function formatImportSummaryScalarFr(v: unknown): string {

  if (v === null || v === undefined) return '—';

  if (typeof v === 'object') return '…';

  if (typeof v === 'string') return formatImportEnumTokenFr(v);

  return String(v);

}

const IMPORT_SAMPLE_FIELD_LABELS: Record<string, string> = {

  kind: 'Type de ligne',

  type: 'Type',

  role: 'Rôle',

  row_kind: 'Type de ligne',

  depth: 'Profondeur',

  line: 'Ligne (fichier)',

  row: 'Ligne',

  path: 'Chemin',

  chemin: 'Chemin',

  name: 'Nom',

  parent_id: 'Identifiant parent',

  id: 'Identifiant',

  /** Aligné sur les clés JSON du service d'import (`CategoryImportService.analyze`). */
  root: 'Catégorie racine',

  sub: 'Sous-catégorie',

  min_price: 'Prix minimum (€)',

  max_price: 'Prix maximum (€)',

};

function formatImportSampleScalarFr(v: unknown): string {

  if (v === null || v === undefined) return '—';

  if (typeof v === 'number' || typeof v === 'boolean') return String(v);

  if (typeof v === 'string') return formatImportEnumTokenFr(v);

  return String(v);

}

function formatCategoryImportSummaryFr(summary: CategoryV1ImportAnalyzeResponseDto['summary']): string {

  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return '—';

  const o = summary as Record<string, unknown>;

  const keys = Object.keys(o);

  const alphaOrder = [...keys].sort((a, b) => a.localeCompare(b));

  const rank = (k: string): number => {

    const i = IMPORT_SUMMARY_KEY_ORDER.indexOf(k);

    if (i !== -1) return i;

    return IMPORT_SUMMARY_KEY_ORDER.length + alphaOrder.indexOf(k);

  };

  keys.sort((a, b) => {

    const ra = rank(a);

    const rb = rank(b);

    if (ra !== rb) return ra - rb;

    return a.localeCompare(b);

  });

  const lines: string[] = [];

  for (const k of keys) {

    const v = o[k];

    const label = IMPORT_SUMMARY_LABELS[k] ?? k.replace(/_/g, ' ');

    const shown = formatImportSummaryScalarFr(v);

    lines.push(`${label} : ${shown}`);

  }

  return lines.length > 0 ? lines.join('\n') : '—';

}

function formatImportSampleRowFr(row: unknown): string {

  if (row === null || row === undefined) return '—';

  if (typeof row !== 'object' || Array.isArray(row)) return String(row);

  const o = row as Record<string, unknown>;

  return Object.entries(o)

    .map(([k, v]) => {

      const key = IMPORT_SAMPLE_FIELD_LABELS[k] ?? k.replace(/_/g, ' ');

      if (v !== null && typeof v === 'object' && !Array.isArray(v)) return `${key} : …`;

      if (Array.isArray(v)) return `${key} : ${v.length} valeur(s)`;

      return `${key} : ${formatImportSampleScalarFr(v)}`;

    })

    .join('\n');

}

function formatCategoryImportExecuteOkMessage(imported: number, updated: number, errTail: string): string {

  const counts =

    imported === 0 && updated === 0

      ? 'Aucune ligne créée ni mise à jour pour ce lot.'

      : `${imported} création(s), ${updated} mise(s) à jour.`;

  return `${counts} Liste actualisée.${errTail}`;

}



type CategoriesServerImportDialog = {

  readonly fileName: string;

  readonly analyze: CategoryV1ImportAnalyzeResponseDto;

};



/**

 * Administration des catégories et tarifs : vues caisse / réception (legacy), import secondaire.

 */

type MainCategoriesView = 'sale' | 'entry';

function applyOrderPatchesToRows(

  rows: readonly CategoryAdminListRowDto[],

  patches: readonly CategoryDisplayOrderPatchItem[],

  mainView: MainCategoriesView,

): CategoryAdminListRowDto[] {

  const byId = new Map(patches.map((p) => [p.categoryId, p]));

  return rows.map((r) => {

    const p = byId.get(r.id);

    if (!p) return r;

    if (mainView === 'entry' && p.display_order_entry !== undefined) {

      return { ...r, display_order_entry: p.display_order_entry };

    }

    if (mainView === 'sale' && p.display_order !== undefined) {

      return { ...r, display_order: p.display_order };

    }

    return r;

  });

}

export function AdminCategoriesWidget(_: RegisteredWidgetProps): ReactNode {

  const auth = useAuthPort();

  useContextEnvelope();



  const [mainView, setMainView] = useState<MainCategoriesView>('sale');

  const [includeArchived, setIncludeArchived] = useState(false);

  const [activationFilter, setActivationFilter] = useState<ActivationFilter>('all');

  const [receptionVisibilityFilter, setReceptionVisibilityFilter] = useState<ReceptionVisibilityFilter>('all');

  const [sortBy, setSortBy] = useState<CategoriesSortBy>('order');

  const [search, setSearch] = useState('');

  const [rows, setRows] = useState<readonly CategoryAdminListRowDto[]>([]);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);

  const [reparentOpen, setReparentOpen] = useState(false);

  const [reparentCategoryId, setReparentCategoryId] = useState<string | null>(null);

  const [reparentBusy, setReparentBusy] = useState(false);



  const [formOpened, setFormOpened] = useState(false);

  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const [formCategory, setFormCategory] = useState<CategoryAdminListRowDto | null>(null);

  const [formSaving, setFormSaving] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);

  const [importWorkingFileLabel, setImportWorkingFileLabel] = useState<string | null>(null);

  const [importPreview, setImportPreview] = useState<CategoriesServerImportDialog | null>(null);

  const [importStagedFile, setImportStagedFile] = useState<File | null>(null);

  const [importBusy, setImportBusy] = useState(false);

  const [importAnalyzeBusy, setImportAnalyzeBusy] = useState(false);

  const [importDeleteExisting, setImportDeleteExisting] = useState(false);

  const [exportBusy, setExportBusy] = useState(false);

  const [templateBusy, setTemplateBusy] = useState(false);

  const [okFlash, setOkFlash] = useState<{ title: string; message: string } | null>(null);



  const [confirmArchive, setConfirmArchive] = useState<CategoryAdminListRowDto | null>(null);

  const [archiveBusy, setArchiveBusy] = useState(false);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());



  const mutationsEnabled = true;

  const listSortSource: CategoriesDataSource = mainView === 'entry' ? 'entry' : 'sale';



  const load = useCallback(async () => {

    setBusy(true);

    setError(null);

    /** Admin réception : liste complète `GET /v1/categories/` (toutes visibilités), pas `entry-tickets` qui masque les fiches invisibles. */
    const listSource: CategoriesDataSource =

      includeArchived ? 'config' : mainView === 'entry' ? 'config' : 'sale';

    const res = await getCategoriesListForAdmin(auth, {

      source: listSource,

      include_archived: includeArchived ? true : undefined,

      is_active:

        mainView === 'entry'

          ? undefined

          : activationFilter === 'active'

            ? true

            : activationFilter === 'inactive'

              ? false

              : undefined,

    });

    if (!res.ok) {

      setRows([]);

      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

      setBusy(false);

      return;

    }

    setRows(res.data);

    setCollapsedIds(parentIdsHavingChildren(res.data));

    setBusy(false);

  }, [auth, mainView, includeArchived, activationFilter]);



  useEffect(() => {

    setReceptionVisibilityFilter('all');

  }, [mainView]);



  useEffect(() => {

    void load();

  }, [load]);



  useEffect(() => {

    if (!okFlash) return;

    const t = window.setTimeout(() => setOkFlash(null), 4800);

    return () => window.clearTimeout(t);

  }, [okFlash]);



  const searchFiltered = useMemo(() => filterCatsForSearch(rows, search), [rows, search]);

  const listFiltered = useMemo(() => {

    if (mainView !== 'entry') return searchFiltered;

    return filterCatsForReceptionVisibility(searchFiltered, receptionVisibilityFilter);

  }, [mainView, searchFiltered, receptionVisibilityFilter]);

  const orderedFlat = useMemo(

    () => orderedRowsWithDepth(listFiltered, sortBy, listSortSource),

    [listFiltered, sortBy, listSortSource],

  );

  const displayRows = useMemo(

    () => filterFlatRowsHideCollapsedChildren(orderedFlat, collapsedIds),

    [orderedFlat, collapsedIds],

  );

  const branchIds = useMemo(() => parentIdsHavingChildren(rows), [rows]);



  const subtitle =

    mainView === 'sale'

      ? 'Même arborescence et ordre qu’à l’encaissement.'

      : 'Même arborescence et ordre qu’à la réception dépôt.';



  const reparentTarget = useMemo(

    () => (reparentCategoryId ? rows.find((r) => r.id === reparentCategoryId) : undefined),

    [rows, reparentCategoryId],

  );



  const handleExportCsvFilteredView = useCallback(() => {

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

    const name = `categories-${mainView}-${stamp}.csv`;

    const lines = buildCategoriesCsvLines(displayRows, rows);

    triggerCsvDownload(name, lines);

    setOkFlash({

      title: 'Export CSV (vue)',

      message: `Fichier « ${name} » (${Math.max(0, lines.length - 1)} ligne(s) affichées).`,

    });

  }, [mainView, displayRows, rows]);



  const handleServerExport = useCallback(

    async (format: CategoryExportServerFormat) => {

      setExportBusy(true);

      setError(null);

      const res = await fetchCategoriesExportBlob(auth, { format });

      setExportBusy(false);

      if (!res.ok) {

        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

        return;

      }

      triggerBlobDownload(res.filename, res.blob);

      setOkFlash({ title: 'Export serveur', message: `Fichier « ${res.filename} » téléchargé.` });

    },

    [auth],

  );



  const handleTemplateDownload = useCallback(async () => {

    setTemplateBusy(true);

    setError(null);

    const res = await fetchCategoriesImportTemplateBlob(auth);

    setTemplateBusy(false);

    if (!res.ok) {

      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

      return;

    }

    triggerBlobDownload(res.filename, res.blob);

    setOkFlash({ title: 'Modèle CSV', message: `Fichier « ${res.filename} » téléchargé.` });

  }, [auth]);



  const onImportFileSelected = useCallback((file: File | null) => {

    if (!file) return;

    setError(null);

    setImportPreview(null);

    setImportWorkingFileLabel(file.name);

    setImportStagedFile(file);

  }, []);



  const runImportAnalyze = useCallback(async () => {

    if (!importStagedFile) return;

    setError(null);

    setImportAnalyzeBusy(true);

    const res = await analyzeCategoriesImportForAdmin(auth, importStagedFile);

    setImportAnalyzeBusy(false);

    if (!res.ok) {

      setImportPreview(null);

      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

      return;

    }

    setImportDeleteExisting(false);

    setImportPreview({ fileName: importStagedFile.name, analyze: res.data });

  }, [auth, importStagedFile]);



  const resetImportJourney = useCallback(() => {

    if (importBusy || importAnalyzeBusy) return;

    setImportPreview(null);

    setImportStagedFile(null);

    setImportWorkingFileLabel(null);

    setImportDeleteExisting(false);

  }, [importBusy, importAnalyzeBusy]);



  const handleImportConfirm = useCallback(async () => {

    if (!importPreview) return;

    const sid = importPreview.analyze.session_id;

    if (!sid) return;

    setImportBusy(true);

    setError(null);

    const res = await executeCategoriesImportForAdmin(auth, {

      session_id: sid,

      delete_existing: importDeleteExisting,

    });

    setImportBusy(false);

    if (!res.ok) {

      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

      return;

    }

    setImportPreview(null);

    setImportStagedFile(null);

    setImportWorkingFileLabel(null);

    setImportModalOpen(false);

    await load();

    const errTail =

      res.data.errors.length > 0 ? ` — ${res.data.errors.length} message(s) métier en fin de traitement.` : '';

    setOkFlash({

      title: 'Import exécuté',

      message: formatCategoryImportExecuteOkMessage(res.data.imported, res.data.updated, errTail),

    });

  }, [importPreview, importDeleteExisting, auth, load]);



  const applyReorderPair = useCallback(

    async (ops: readonly { categoryId: string; body: CategoryV1UpdateRequestBody }[]) => {

      setBusy(true);

      setError(null);

      for (const op of ops) {

        const b = op.body;

        const keys = (Object.keys(b) as (keyof CategoryV1UpdateRequestBody)[]).filter(

          (k) => b[k] !== undefined,

        );

        let res;

        if (

          keys.length === 1 &&

          keys[0] === 'display_order' &&

          typeof b.display_order === 'number'

        ) {

          res = await patchCategoryDisplayOrderForAdmin(auth, op.categoryId, b.display_order);

        } else if (

          keys.length === 1 &&

          keys[0] === 'display_order_entry' &&

          typeof b.display_order_entry === 'number'

        ) {

          res = await patchCategoryDisplayOrderEntryForAdmin(auth, op.categoryId, b.display_order_entry);

        } else {

          res = await updateCategoryForAdmin(auth, op.categoryId, b);

        }

        if (!res.ok) {

          setBusy(false);

          setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

          return;

        }

      }

      setBusy(false);

      setOkFlash({ title: 'Ordre mis à jour', message: 'Les changements sont enregistrés.' });

      await load();

    },

    [auth, load],

  );



  const applySiblingDragOrders = useCallback(

    async (activeId: string, overId: string) => {

      const patches = computeOrdersAfterDragWithinSiblings(rows, mainView, activeId, overId);

      if (!patches?.length) {

        return;

      }

      const toSend = patches.filter((p) => {

        const r = rows.find((x) => x.id === p.categoryId);

        if (!r) return false;

        if (mainView === 'entry') return r.display_order_entry !== p.display_order_entry;

        return r.display_order !== p.display_order;

      });

      if (toSend.length === 0) {

        return;

      }

      setRows((prev) => applyOrderPatchesToRows(prev, patches, mainView));

      setBusy(true);

      setError(null);

      for (const p of toSend) {

        const res =

          mainView === 'entry'

            ? await patchCategoryDisplayOrderEntryForAdmin(

                auth,

                p.categoryId,

                p.display_order_entry as number,

              )

            : await patchCategoryDisplayOrderForAdmin(auth, p.categoryId, p.display_order as number);

        if (!res.ok) {

          setBusy(false);

          setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

          return;

        }

      }

      setBusy(false);

      setOkFlash({ title: 'Ordre mis à jour', message: 'Réorganisation enregistrée.' });

      await load();

    },

    [rows, mainView, auth, load],

  );



  const openCreate = useCallback(() => {

    setFormMode('create');

    setFormCategory(null);

    setFormOpened(true);

    setError(null);

  }, []);



  const openEdit = useCallback((c: CategoryAdminListRowDto) => {

    setFormMode('edit');

    setFormCategory(c);

    setFormOpened(true);

    setError(null);

  }, []);



  const handleFormSave = useCallback(

    async (payload: CategoryFormSavePayload) => {

      setFormSaving(true);

      setError(null);

      const res =

        payload.mode === 'create'

          ? await createCategoryForAdmin(auth, payload.body)

          : await updateCategoryForAdmin(auth, payload.categoryId, payload.body);

      setFormSaving(false);

      if (!res.ok) {

        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

        return;

      }

      setOkFlash({

        title: payload.mode === 'create' ? 'Catégorie créée' : 'Modifications enregistrées',

        message: res.data.name,

      });

      setFormOpened(false);

      setFormCategory(null);

      await load();

    },

    [auth, load],

  );



  const handleReparentApply = useCallback(

    async (categoryId: string, newParentId: string | null) => {

      setReparentBusy(true);

      setError(null);

      const res = await updateCategoryForAdmin(auth, categoryId, { parent_id: newParentId });

      setReparentBusy(false);

      if (!res.ok) {

        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

        return;

      }

      setOkFlash({ title: 'Reclassement enregistré', message: res.data.name });

      setReparentOpen(false);

      setReparentCategoryId(null);

      await load();

    },

    [auth, load],

  );



  const handleRestore = useCallback(

    async (categoryId: string) => {

      setBusy(true);

      setError(null);

      const res = await restoreCategoryForAdmin(auth, categoryId);

      setBusy(false);

      if (!res.ok) {

        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

        return;

      }

      setOkFlash({ title: 'Fiche restaurée', message: res.data.name });

      await load();

    },

    [auth, load],

  );



  const handleConfirmArchive = useCallback(async () => {

    if (!confirmArchive) return;

    setArchiveBusy(true);

    setError(null);

    const res = await softDeleteCategoryForAdmin(auth, confirmArchive.id);

    setArchiveBusy(false);

    setConfirmArchive(null);

    if (!res.ok) {

      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

      return;

    }

    setOkFlash({ title: 'Fiche archivée', message: res.data.name });

    await load();

  }, [auth, confirmArchive, load]);



  const [visibilityBusyId, setVisibilityBusyId] = useState<string | null>(null);

  const [caisseBusyId, setCaisseBusyId] = useState<string | null>(null);



  const handleReceptionVisibilityToggle = useCallback(

    async (c: CategoryAdminListRowDto, nextVisible: boolean) => {

      if (c.deleted_at || !mutationsEnabled) return;

      setVisibilityBusyId(c.id);

      setError(null);

      const res = await patchCategoryVisibilityForAdmin(auth, c.id, { is_visible: nextVisible });

      setVisibilityBusyId(null);

      if (!res.ok) {

        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

        return;

      }

      setOkFlash({

        title: 'Visibilité réception',

        message: nextVisible ? `${res.data.name} : visible à la réception.` : `${res.data.name} : masquée à la réception.`,

      });

      await load();

    },

    [auth, load, mutationsEnabled],

  );



  const handleCaisseActiveToggle = useCallback(

    async (c: CategoryAdminListRowDto, nextActive: boolean) => {

      if (c.deleted_at || !mutationsEnabled) return;

      setCaisseBusyId(c.id);

      setError(null);

      const res = await updateCategoryForAdmin(auth, c.id, { is_active: nextActive });

      setCaisseBusyId(null);

      if (!res.ok) {

        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

        return;

      }

      setOkFlash({

        title: 'Visibilité caisse',

        message: nextActive ? `${res.data.name} : visible à la caisse.` : `${res.data.name} : masquée à la caisse.`,

      });

      await load();

    },

    [auth, load, mutationsEnabled],

  );



  const tableColCount = 7;



  return (

    <Stack gap="md" data-testid="widget-admin-categories-demo">

      <input

        ref={importFileRef}

        type="file"

        accept=".csv,text/csv"

        style={{ display: 'none' }}

        data-testid="categories-import-csv-input"

        onChange={(e) => {

          const f = e.currentTarget.files?.[0] ?? null;

          e.currentTarget.value = '';

          onImportFileSelected(f);

        }}

      />



      {okFlash ? (

        <Alert color="green" variant="light" withCloseButton onClose={() => setOkFlash(null)} title={okFlash.title}>

          {okFlash.message}

        </Alert>

      ) : null}



      <CategoryAdminFormModal

        opened={formOpened}

        mode={formMode}

        category={formCategory}

        rows={rows}

        saving={formSaving}

        onClose={() => {

          setFormOpened(false);

          setFormCategory(null);

        }}

        onSave={handleFormSave}

      />



      <Modal

        opened={confirmArchive !== null}

        onClose={() => setConfirmArchive(null)}

        title="Archiver la catégorie ?"

      >

        {confirmArchive ? (

          <Stack gap="md">

            <Text size="sm">

              La fiche <strong>{confirmArchive.name}</strong> sera archivée (masquée des usages courants).

              Vous pourrez la restaurer plus tard si besoin.

            </Text>

            <Group justify="flex-end">

              <Button variant="default" onClick={() => setConfirmArchive(null)} disabled={archiveBusy}>

                Annuler

              </Button>

              <Button color="orange" loading={archiveBusy} onClick={() => void handleConfirmArchive()}>

                Archiver

              </Button>

            </Group>

          </Stack>

        ) : null}

      </Modal>



      <Group justify="space-between" align="flex-start" wrap="wrap">

        <div>

          <Title order={1}>Catégories et tarifs</Title>

          <Text size="sm" c="dimmed" mt={4}>

            {subtitle}

          </Text>

        </div>

        <Group gap="sm">

          <Button

            variant="filled"

            leftSection={<Plus size={16} />}

            onClick={openCreate}

            disabled={busy || !mutationsEnabled}

            data-testid="categories-new-button"

          >

            Nouvelle catégorie

          </Button>

          <Menu shadow="md" width={280} withinPortal={false} data-testid="categories-export-menu">

            <Menu.Target>

              <Button

                variant="default"

                rightSection={<ChevronDown size={16} />}

                leftSection={<Download size={16} />}

                loading={exportBusy}

                disabled={busy}

                data-testid="categories-export-trigger"

              >

                Exporter

              </Button>

            </Menu.Target>

            <Menu.Dropdown>

              <Menu.Label>Liste complète (fichier serveur)</Menu.Label>

              <Menu.Item

                leftSection={<FileText size={14} />}

                onClick={() => void handleServerExport('pdf')}

                disabled={exportBusy}

                data-testid="categories-export-pdf"

              >

                PDF

              </Menu.Item>

              <Menu.Item

                leftSection={<FileSpreadsheet size={14} />}

                onClick={() => void handleServerExport('xls')}

                disabled={exportBusy}

                data-testid="categories-export-xls"

              >

                Excel

              </Menu.Item>

              <Menu.Item

                leftSection={<Download size={14} />}

                onClick={() => void handleServerExport('csv')}

                disabled={exportBusy}

                data-testid="categories-export-csv-server"

              >

                Fichier CSV (ré-importable)

              </Menu.Item>

              <Menu.Divider />

              <Menu.Label>Depuis cet écran</Menu.Label>

              <Menu.Item

                onClick={handleExportCsvFilteredView}

                disabled={busy || displayRows.length === 0}

                data-testid="categories-export-csv"

              >

                CSV des lignes affichées

              </Menu.Item>

            </Menu.Dropdown>

          </Menu>

          <Button

            variant="default"

            leftSection={<Upload size={16} />}

            onClick={() => setImportModalOpen(true)}

            disabled={busy}

            data-testid="categories-import-csv-button"

          >

            Importer

          </Button>

          <Button

            variant="default"

            leftSection={<RefreshCw size={16} />}

            onClick={() => void load()}

            loading={busy}

          >

            Actualiser

          </Button>

        </Group>

      </Group>



      <Group align="center" gap="sm" wrap="wrap">

        <SegmentedControl

          value={mainView}

          onChange={(v) => setMainView(v as MainCategoriesView)}

          data={[

            { label: 'Caisse', value: 'sale' },

            { label: 'Réception', value: 'entry' },

          ]}

          aria-label="Vue caisse ou réception"

          data-testid="categories-data-source"

        />

        <Button

          type="button"

          variant="default"

          size="xs"

          onClick={() => setCollapsedIds(new Set())}

          disabled={busy || branchIds.size === 0}

          data-testid="categories-tree-expand-all"

        >

          Tout déplier

        </Button>

        <Button

          type="button"

          variant="default"

          size="xs"

          onClick={() => setCollapsedIds(new Set(branchIds))}

          disabled={busy || branchIds.size === 0}

          data-testid="categories-tree-collapse-all"

        >

          Tout replier

        </Button>

      </Group>



      <Modal

        opened={importModalOpen}

        onClose={() => {

          if (importBusy || importAnalyzeBusy) return;

          setImportModalOpen(false);

          resetImportJourney();

        }}

        title="Importer des catégories"

        size="xl"

      >

        <Paper withBorder p="md" radius="md" data-testid="categories-import-journey" pos="relative">

          <LoadingOverlay visible={importBusy || importAnalyzeBusy} zIndex={5} />

          <Stack gap="md">

            <Group justify="space-between" align="flex-start" wrap="wrap">

              <div>

                <Title order={4}>Importer</Title>

                <Text size="sm" c="dimmed" mt={6} maw={520}>

                  Modèle, fichier CSV, analyse puis import.

                </Text>

              </div>

              {importPreview || importWorkingFileLabel ? (

                <Button

                  variant="subtle"

                  size="xs"

                  onClick={resetImportJourney}

                  disabled={importBusy || importAnalyzeBusy}

                  data-testid="categories-import-reset"

                >

                  Recommencer

                </Button>

              ) : null}

            </Group>

            <Stack gap="md" mt={0} data-testid="categories-import-journey-body">

              <div>

                <Text size="sm" fw={600} mb="xs">

                  Fichier

                </Text>

                <Text size="sm" c="dimmed" mb="sm" maw={480}>

                  Modèle = colonnes attendues. Puis choisissez le CSV à traiter.

                </Text>

                <Group gap="sm" wrap="wrap">

                  <Button

                    variant="light"

                    leftSection={<Download size={16} />}

                    onClick={() => void handleTemplateDownload()}

                    disabled={busy || templateBusy}

                    loading={templateBusy}

                    data-testid="categories-import-template-download"

                  >

                    Télécharger le modèle

                  </Button>

                  <Button

                    variant="default"

                    leftSection={<Upload size={16} />}

                    onClick={() => importFileRef.current?.click()}

                    disabled={busy || importAnalyzeBusy}

                    data-testid="categories-import-choose-file"

                  >

                    Choisir un fichier CSV

                  </Button>

                </Group>

                {importPreview?.fileName || importWorkingFileLabel ? (

                  <Text size="sm" c="dimmed" mt="xs">

                    Fichier sélectionné :{' '}

                    <strong>{importPreview?.fileName ?? importWorkingFileLabel}</strong>

                  </Text>

                ) : null}

              </div>

              <Paper withBorder p="sm" radius="md" data-testid="categories-import-analyze-zone">

                <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm" mb="xs">

                  <Text size="sm" fw={600}>

                    Analyser

                  </Text>

                  <Button

                    variant="filled"

                    size="sm"

                    loading={importAnalyzeBusy}

                    disabled={!importStagedFile || importAnalyzeBusy}

                    onClick={() => void runImportAnalyze()}

                    data-testid="categories-import-analyze"

                  >

                    Analyser

                  </Button>

                </Group>

                {!importPreview && !importAnalyzeBusy ? (

                  <Text size="sm" c="dimmed" maw={520}>

                    Après le fichier, lancez <strong>Analyser</strong> pour valider le lot.

                  </Text>

                ) : null}

                {importAnalyzeBusy ? (

                  <Group gap="sm">

                    <Loader size="sm" />

                    <Text size="sm">Analyse en cours…</Text>

                  </Group>

                ) : null}

                {importPreview ? (

                  <Stack gap="sm">

                    {importPreview.analyze.errors.length > 0 ? (

                      <Alert color="red" title="À corriger avant d’aller plus loin">

                        <Stack gap={4}>

                          {importPreview.analyze.errors.map((e, i) => (

                            <Text key={`ij-err-${i}`} size="sm">

                              {e}

                            </Text>

                          ))}

                        </Stack>

                      </Alert>

                    ) : null}

                    {importPreview.analyze.warnings.length > 0 ? (

                      <Alert color="yellow" title="Points d’attention">

                        <Stack gap={4}>

                          {importPreview.analyze.warnings.map((w, i) => (

                            <Text key={`ij-warn-${i}`} size="sm">

                              {w}

                            </Text>

                          ))}

                        </Stack>

                      </Alert>

                    ) : null}

                    <div>

                      <Text size="sm" fw={600} mb={4}>

                        Résumé de l&apos;analyse

                      </Text>

                      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>

                        {formatCategoryImportSummaryFr(importPreview.analyze.summary)}

                      </Text>

                    </div>

                    {importPreview.analyze.sample.length > 0 ? (

                      <Stack gap={6}>

                        <Text size="xs" fw={600}>

                          Extrait compris dans l&apos;analyse

                        </Text>

                        {importPreview.analyze.sample.slice(0, 3).map((row, idx) => (

                          <Text

                            key={`ij-sample-${idx}`}

                            size="xs"

                            c="dimmed"

                            style={{ whiteSpace: 'pre-wrap' }}

                          >

                            {formatImportSampleRowFr(row)}

                          </Text>

                        ))}

                      </Stack>

                    ) : null}

                    {!importPreview.analyze.session_id ? (

                      <Text size="sm" c="dimmed">

                        Tant qu&apos;un blocage est signalé, <strong>Exécuter l&apos;import</strong> reste

                        indisponible.

                      </Text>

                    ) : (

                      <Text size="sm" c="dimmed">

                        Passez à <strong>Exécuter l&apos;import</strong> ci-dessous.

                      </Text>

                    )}

                  </Stack>

                ) : null}

              </Paper>

              <Paper withBorder p="sm" radius="md" variant="light" data-testid="categories-import-execute-zone">

                <Text size="sm" fw={600} mb="xs">

                  Exécuter l&apos;import

                </Text>

                <Stack gap="sm">

                  {importPreview?.analyze.session_id ? (

                    <Switch

                      label="Remplacer toutes les catégories existantes avant d’importer"

                      description="À n’utiliser qu’en connaissance de cause."

                      checked={importDeleteExisting}

                      onChange={(e) => setImportDeleteExisting(e.currentTarget.checked)}

                      disabled={importBusy}

                      data-testid="categories-import-delete-existing"

                    />

                  ) : null}

                  <Group>

                    <Button

                      variant="filled"

                      size="sm"

                      loading={importBusy}

                      onClick={() => void handleImportConfirm()}

                      disabled={importBusy || importAnalyzeBusy || !importPreview?.analyze.session_id}

                      data-testid="categories-import-confirm"

                    >

                      Exécuter l&apos;import

                    </Button>

                  </Group>

                  {!importPreview?.analyze.session_id && !importAnalyzeBusy ? (

                    <Text size="sm" c="dimmed" maw={520}>

                      S&apos;active après une analyse sans erreur bloquante.

                    </Text>

                  ) : null}

                </Stack>

              </Paper>

            </Stack>

          </Stack>

        </Paper>

      </Modal>



      {error ? <CashflowClientErrorAlert error={error} /> : null}

      {includeArchived && rows.some((r) => r.deleted_at) ? (

        <Alert color="teal" variant="light" title="Fiches archivées visibles" data-testid="categories-restore-active-hint">

          <Text size="sm">

            Utilisez le bouton <strong>Restaurer</strong> sur la ligne pour remettre une fiche en circulation.

          </Text>

        </Alert>

      ) : null}

      <Group align="flex-end" wrap="wrap" gap="md">

        {mainView === 'sale' ? (

          <SegmentedControl

            value={activationFilter}

            onChange={(v) => setActivationFilter(v as ActivationFilter)}

            data={[

              { label: 'Toutes', value: 'all' },

              { label: 'Proposées caisse', value: 'active' },

              { label: 'Non proposées caisse', value: 'inactive' },

            ]}

            aria-label="Filtrer les fiches proposées ou non à la caisse"

            data-testid="categories-activation-filter"

          />

        ) : (

          <SegmentedControl

            value={receptionVisibilityFilter}

            onChange={(v) => setReceptionVisibilityFilter(v as ReceptionVisibilityFilter)}

            data={[

              { label: 'Toutes', value: 'all' },

              { label: 'Visibles réception', value: 'visible' },

              { label: 'Masquées réception', value: 'hidden' },

            ]}

            aria-label="Filtrer par visibilité à la réception (tickets dépôt)"

            data-testid="categories-reception-visibility-filter"

          />

        )}

        <Stack gap={6} align="flex-start" maw={420}>

          <Switch

            label="Afficher les fiches archivées"

            checked={includeArchived}

            onChange={(e) => setIncludeArchived(e.currentTarget.checked)}

            disabled={busy}

          />

          <Text size="xs" c="dimmed" data-testid="categories-archived-switch-hint">

            Activer « Afficher les fiches archivées », puis utiliser le bouton Restaurer sur la ligne concernée.

          </Text>

        </Stack>

        <TextInput

          placeholder="Rechercher une catégorie..."

          leftSection={<Search size={16} />}

          value={search}

          onChange={(e) => setSearch(e.currentTarget.value)}

          aria-label="Recherche catégories"

          style={{ flex: '1 1 220px', minWidth: 200, maxWidth: 320 }}

        />

        <Select

          label="Trier par"

          leftSection={<ArrowDownAZ size={16} />}

          data={SORT_OPTIONS}

          value={sortBy}

          onChange={(v) => setSortBy((v as CategoriesSortBy) ?? 'order')}

          allowDeselect={false}

          style={{ width: 220 }}

          aria-label="Tri des catégories"

        />

      </Group>



      <Modal

        opened={reparentOpen && reparentCategoryId !== null}

        onClose={() => {

          setReparentOpen(false);

          setReparentCategoryId(null);

        }}

        title="Reclasser une catégorie"

        size="lg"

      >

        {reparentCategoryId && reparentTarget ? (

          <Stack gap="md">

            <Text size="sm" c="dimmed">

              Choisissez un nouveau parent pour cette fiche. Les sous-catégories de la fiche déplacée ne peuvent

              pas servir de parent.

            </Text>

            <CategoryReparentDraftPanel

              rows={rows}

              categoryId={reparentCategoryId}

              initialParentId={reparentTarget.parent_id ?? null}

              onApply={mutationsEnabled ? handleReparentApply : undefined}

              applyBusy={reparentBusy}

            />

          </Stack>

        ) : null}

      </Modal>



      <Paper withBorder p={0} pos="relative" mih={120}>

        <LoadingOverlay visible={busy} zIndex={1} />

        <AdminCategoriesDndShell

          dndActive={displayRows.length > 0}

          rows={rows}

          onApplySiblingDrag={applySiblingDragOrders}

        >

          <Table.ScrollContainer minWidth={560} type="native">

            <Table

              striped

              highlightOnHover

              withTableBorder

              withRowBorders

              verticalSpacing="md"

              style={{ fontSize: '13px', borderCollapse: 'separate', borderSpacing: 0 }}

            >

              <Table.Thead>

                <Table.Tr style={{ background: 'var(--mantine-color-gray-0)' }}>

                  <Table.Th

                    w={44}

                    aria-label={

                      mainView === 'sale'

                        ? 'Ordre à la caisse : glisser-déposer la poignée sur une ligne du même niveau'

                        : 'Ordre à la réception : glisser-déposer la poignée sur une ligne du même niveau'

                    }

                  />

                  <Table.Th>Libellé</Table.Th>

                  <Table.Th>Tarif</Table.Th>

                  <Table.Th>Plafond</Table.Th>

                  <Table.Th w={132} title="Proposée ou non à l’encaissement">

                    Caisse

                  </Table.Th>

                  <Table.Th w={132} title="Visible ou masquée aux tickets dépôt">

                    Réception

                  </Table.Th>

                  <Table.Th miw={200} aria-label="Actions pour chaque ligne">

                    Actions

                  </Table.Th>

                </Table.Tr>

              </Table.Thead>

              <Table.Tbody>

                {displayRows.length === 0 && !busy ? (

                  <Table.Tr>

                    <Table.Td colSpan={tableColCount}>

                      <Text size="sm" c="dimmed" py="md" ta="center">

                        Aucune catégorie à afficher pour le moment.

                      </Text>

                    </Table.Td>

                  </Table.Tr>

                ) : null}

                {displayRows.length > 0 ? (

                  <AdminCategoriesSortableTableRows

                    rows={rows}

                    listFiltered={listFiltered}

                    sortBy={sortBy}

                    listSortSource={listSortSource}

                    mainView={mainView}

                    collapsedIds={collapsedIds}

                    setCollapsedIds={setCollapsedIds}

                    branchIds={branchIds}

                    busy={busy}

                    mutationsEnabled={mutationsEnabled}

                    openEdit={openEdit}

                    setConfirmArchive={setConfirmArchive}

                    setReparentCategoryId={setReparentCategoryId}

                    setReparentOpen={setReparentOpen}

                    handleRestore={handleRestore}

                    handleCaisseActiveToggle={handleCaisseActiveToggle}

                    handleReceptionVisibilityToggle={handleReceptionVisibilityToggle}

                    applyReorderPair={applyReorderPair}

                    swapCaisseOrderWithNeighbor={swapCaisseOrderWithNeighbor}

                    swapReceptionOrderWithNeighbor={swapReceptionOrderWithNeighbor}

                    caisseBusyId={caisseBusyId}

                    visibilityBusyId={visibilityBusyId}

                  />

                ) : null}

              </Table.Tbody>

            </Table>

          </Table.ScrollContainer>

        </AdminCategoriesDndShell>

      </Paper>

    </Stack>

  );

}


