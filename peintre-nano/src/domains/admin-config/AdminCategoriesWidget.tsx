import {

  ActionIcon,

  Alert,

  Badge,

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

  Stepper,

  Switch,

  Table,

  Text,

  TextInput,

  Title,

} from '@mantine/core';

import {
  ArrowDown,
  ArrowDownAZ,
  ArrowUp,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';

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

  updateCategoryForAdmin,

  type CategoriesDataSource,

  type CategoryAdminListRowDto,

  type CategoryExportServerFormat,

  type CategoryV1ImportAnalyzeResponseDto,

  type CategoryV1UpdateRequestBody,

} from '../../api/admin-categories-client';

import { CategoryAdminFormModal, type CategoryFormSavePayload } from './categories/CategoryAdminFormModal';

import { CategoryReparentDraftPanel } from './categories/CategoryReparentDraftPanel';

import { buildCategoriesCsvLines, triggerBlobDownload, triggerCsvDownload } from './categories/category-admin-csv-export';

import {

  categoryBreadcrumbLabel,

  filterCatsForSearch,

  orderedRowsWithDepth,

  type CategoriesSortBy,

} from './categories/category-admin-display-model';

import { swapCaisseOrderWithNeighbor, swapReceptionOrderWithNeighbor } from './categories/category-admin-reorder';

import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';

import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';

import type { RegisteredWidgetProps } from '../../registry/widget-registry';

import { CashflowClientErrorAlert } from '../cashflow/CashflowClientErrorAlert';

import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';



const moneyFr = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

const dateTimeFr = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });



function formatMoney(v: number | null | undefined): string {

  if (v === null || v === undefined || Number.isNaN(v)) return '—';

  return moneyFr.format(v);

}



function formatCreated(iso: string): string {

  const t = Date.parse(iso);

  if (Number.isNaN(t)) return '—';

  return dateTimeFr.format(t);

}



type ActivationFilter = 'all' | 'active' | 'inactive';



function statusBadge(c: CategoryAdminListRowDto): ReactNode {

  if (c.deleted_at) {

    return (

      <Badge color="gray" variant="light">

        Archivée

      </Badge>

    );

  }

  if (!c.is_active) {

    return (

      <Badge color="orange" variant="light">

        Inactivée

      </Badge>

    );

  }

  return (

    <Badge color="green" variant="light">

      Activée

    </Badge>

  );

}



const SORT_OPTIONS: { value: CategoriesSortBy; label: string }[] = [

  { value: 'order', label: "Ordre d'affichage" },

  { value: 'name', label: 'Nom (A à Z)' },

  { value: 'created', label: 'Date de création' },

];



const IMPORT_SUMMARY_LABELS: Record<string, string> = {

  total: 'Lignes de données (après en-tête)',

  to_create: 'Nouvelles sous-catégories (décompte contrôle ; racines nouvelles non incluses)',

  to_update: 'Sous-catégories à mettre à jour (décompte contrôle ; critère prix à l’analyse)',

  roots: 'Racines nouvelles distinctes (décompte contrôle)',

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

      ? 'Le serveur ne signale aucune création ni mise à jour pour ce lot.'

      : `Compteur renvoyé par le serveur : ${imported} création(s), ${updated} mise(s) à jour (ce décompte peut différer du nombre de fiches visibles dans la liste).`;

  return `${counts} Liste actualisée.${errTail}`;

}



type CategoriesServerImportDialog = {

  readonly fileName: string;

  readonly analyze: CategoryV1ImportAnalyzeResponseDto;

};



/**

 * Administration des catégories et tarifs : listes (configuration, caisse, réception) et écriture en vue configuration.

 */

export function AdminCategoriesWidget(_: RegisteredWidgetProps): ReactNode {

  const auth = useAuthPort();

  useContextEnvelope();



  const [dataSource, setDataSource] = useState<CategoriesDataSource>('config');

  const [includeArchived, setIncludeArchived] = useState(false);

  const [activationFilter, setActivationFilter] = useState<ActivationFilter>('all');

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

  const importJourneyRef = useRef<HTMLDivElement>(null);

  const [importWorkingFileLabel, setImportWorkingFileLabel] = useState<string | null>(null);

  const [importPreview, setImportPreview] = useState<CategoriesServerImportDialog | null>(null);

  const [importBusy, setImportBusy] = useState(false);

  const [importAnalyzeBusy, setImportAnalyzeBusy] = useState(false);

  const [importDeleteExisting, setImportDeleteExisting] = useState(false);

  const [exportBusy, setExportBusy] = useState(false);

  const [templateBusy, setTemplateBusy] = useState(false);

  const [okFlash, setOkFlash] = useState<{ title: string; message: string } | null>(null);



  const [confirmArchive, setConfirmArchive] = useState<CategoryAdminListRowDto | null>(null);

  const [archiveBusy, setArchiveBusy] = useState(false);



  const mutationsEnabled = dataSource === 'config';



  const load = useCallback(async () => {

    setBusy(true);

    setError(null);

    const res = await getCategoriesListForAdmin(auth, {

      source: dataSource,

      include_archived: dataSource === 'config' ? includeArchived : undefined,

      is_active:

        activationFilter === 'active' ? true : activationFilter === 'inactive' ? false : undefined,

    });

    if (!res.ok) {

      setRows([]);

      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

      setBusy(false);

      return;

    }

    setRows(res.data);

    setBusy(false);

  }, [auth, dataSource, includeArchived, activationFilter]);



  useEffect(() => {

    void load();

  }, [load]);



  useEffect(() => {

    if (!okFlash) return;

    const t = window.setTimeout(() => setOkFlash(null), 4800);

    return () => window.clearTimeout(t);

  }, [okFlash]);



  const filtered = useMemo(() => filterCatsForSearch(rows, search), [rows, search]);

  const displayRows = useMemo(

    () => orderedRowsWithDepth(filtered, sortBy, dataSource),

    [filtered, sortBy, dataSource],

  );



  const importJourneyActive = useMemo(() => {

    if (importAnalyzeBusy) return 1;

    if (importPreview) {

      if (importPreview.analyze.session_id) return 2;

      return 1;

    }

    return 0;

  }, [importAnalyzeBusy, importPreview]);



  const subtitle =

    dataSource === 'config'

      ? 'Hiérarchie, tarifs, visibilité et ordres : modifiez chaque fiche ou réordonnez les lignes sœurs depuis le menu.'

      : dataSource === 'sale'

        ? "Lecture seule — même liste qu'à l'encaissement. Modifiez les fiches en vue Configuration."

        : "Lecture seule — même liste qu'à la réception dépôt. Modifiez les fiches en vue Configuration.";



  const reparentTarget = useMemo(

    () => (reparentCategoryId ? rows.find((r) => r.id === reparentCategoryId) : undefined),

    [rows, reparentCategoryId],

  );



  const handleExportCsvFilteredView = useCallback(() => {

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

    const name = `categories-${dataSource}-${stamp}.csv`;

    const lines = buildCategoriesCsvLines(displayRows, rows);

    triggerCsvDownload(name, lines);

    setOkFlash({

      title: 'Export CSV (vue)',

      message: `Fichier « ${name} » (${Math.max(0, lines.length - 1)} ligne(s) affichées).`,

    });

  }, [dataSource, displayRows, rows]);



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



  const onImportFileSelected = useCallback(

    async (file: File | null) => {

      if (!file) return;

      setError(null);

      setImportWorkingFileLabel(file.name);

      setImportAnalyzeBusy(true);

      const res = await analyzeCategoriesImportForAdmin(auth, file);

      setImportAnalyzeBusy(false);

      if (!res.ok) {

        setImportWorkingFileLabel(null);

        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });

        return;

      }

      setImportDeleteExisting(false);

      setImportPreview({ fileName: file.name, analyze: res.data });

    },

    [auth],

  );



  const resetImportJourney = useCallback(() => {

    if (importBusy || importAnalyzeBusy) return;

    setImportPreview(null);

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

    setImportWorkingFileLabel(null);

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

        const res = await updateCategoryForAdmin(auth, op.categoryId, op.body);

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



  const colCount = 10;



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

          void onImportFileSelected(f);

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

            onClick={() => {

              importJourneyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

            }}

            disabled={busy || !mutationsEnabled}

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



      <SegmentedControl

        value={dataSource}

        onChange={(v) => setDataSource(v as CategoriesDataSource)}

        data={[

          { label: 'Configuration', value: 'config' },

          { label: 'Caisse', value: 'sale' },

          { label: 'Réception', value: 'entry' },

        ]}

        aria-label="Source de la liste"

        data-testid="categories-data-source"

      />



      {dataSource === 'config' ? (

        <Paper ref={importJourneyRef} withBorder p="md" radius="md" data-testid="categories-import-journey">

          <Stack gap="md">

            <Group justify="space-between" align="flex-start" wrap="wrap">

              <div>

                <Title order={4}>Importer</Title>

                <Text size="sm" c="dimmed" mt={6} maw={640}>

                  Modèle CSV, fichier, contrôle automatique, puis enregistrement si tout est bon.

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

            <Stepper active={importJourneyActive} size="sm" allowNextStepsSelect={false}>

              <Stepper.Step label="Préparation" description="Modèle et fichier" />

              <Stepper.Step label="Contrôle" description="Vérification automatique" />

              <Stepper.Step label="Enregistrement" description="Appliquer les changements" />

            </Stepper>

            <Stack gap="md" mt="md" data-testid="categories-import-journey-body">

              <div>

                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={6}>

                  1. Préparation

                </Text>

                <Text size="sm" mb="sm">

                  Téléchargez le modèle pour voir les colonnes attendues, puis sélectionnez votre fichier CSV.

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

                    loading={importAnalyzeBusy}

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

                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={6}>

                  2. Vérification du fichier

                </Text>

                {!importPreview && !importAnalyzeBusy ? (

                  <Stack gap="sm">
                    <Badge color="gray" variant="light" w="fit-content">
                      En attente du fichier
                    </Badge>

                    <Text size="sm" c="dimmed" maw={560}>
                      Dès le choix du fichier, la vérification démarre et le résultat s&apos;affiche ici.
                    </Text>
                  </Stack>

                ) : null}

                {importAnalyzeBusy ? (

                  <Group gap="sm">

                    <Loader size="sm" />

                    <Text size="sm">Contrôle en cours…</Text>

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

                        Résumé du contrôle

                      </Text>

                      <Text size="xs" c="dimmed" mb={6} maw={640}>

                        Chaque ligne du fichier peut concerner une racine et/ou une sous-catégorie : les totaux « à créer » et « à mettre à jour » sont ceux renvoyés par le contrôle serveur et portent sur les sous-catégories ; les racines nouvelles sont indiquées séparément ci-dessous lorsque le contrôle les expose.

                      </Text>

                      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>

                        {formatCategoryImportSummaryFr(importPreview.analyze.summary)}

                      </Text>

                    </div>

                    {importPreview.analyze.sample.length > 0 ? (

                      <Stack gap={6}>

                        <Text size="xs" fw={600}>

                          Extrait compris dans le contrôle

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

                        L’enregistrement n’est pas proposé tant que le contrôle signale un blocage.

                      </Text>

                    ) : (

                      <Text size="sm" c="dimmed">

                        Le fichier est accepté : vous pouvez passer à l’enregistrement.

                      </Text>

                    )}

                  </Stack>

                ) : null}

              </Paper>

              <Paper withBorder p="sm" radius="md" variant="light" data-testid="categories-import-execute-zone">

                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb={6}>

                  3. Enregistrement

                </Text>

                {importPreview?.analyze.session_id ? (

                  <Stack gap="sm">

                    <Switch

                      label="Remplacer toutes les catégories existantes avant d’importer"

                      description="Option rare et risquée : à n’utiliser qu’en connaissance de cause."

                      checked={importDeleteExisting}

                      onChange={(e) => setImportDeleteExisting(e.currentTarget.checked)}

                      disabled={importBusy}

                      data-testid="categories-import-delete-existing"

                    />

                    <Group>

                      <Button

                        loading={importBusy}

                        onClick={() => void handleImportConfirm()}

                        disabled={importAnalyzeBusy}

                        data-testid="categories-import-confirm"

                      >

                        Appliquer les changements

                      </Button>

                    </Group>

                  </Stack>

                ) : (

                  <Stack gap="sm">
                    <Badge color="gray" variant="light" w="fit-content">
                      En attente du résultat du contrôle
                    </Badge>

                    <Text size="sm" c="dimmed">
                      Cette étape s&apos;active lorsque le fichier est validé sans blocage.
                    </Text>
                  </Stack>

                )}

              </Paper>

            </Stack>

          </Stack>

        </Paper>

      ) : null}



      {dataSource === 'entry' ? (

        <Alert color="blue" title="Vue réception">

          <Text size="sm">

            Même liste et ordre qu&apos;à la saisie d&apos;un dépôt. Édition des fiches : vue <strong>Configuration</strong>.

          </Text>

        </Alert>

      ) : null}



      {dataSource === 'sale' ? (

        <Alert color="blue" title="Vue caisse">

          <Text size="sm">

            Même liste qu&apos;à l&apos;encaissement. Édition des fiches : vue <strong>Configuration</strong>.

          </Text>

        </Alert>

      ) : null}



      {error ? <CashflowClientErrorAlert error={error} /> : null}

      {dataSource === 'config' && !includeArchived ? (

        <Alert color="gray" variant="light" title="Archives masquées" data-testid="categories-restore-hint">

          <Text size="sm">

            Activez <strong>Afficher les éléments archivés</strong>, puis menu <strong>⋯</strong> sur une ligne archivée

            → <strong>Restaurer</strong>.

          </Text>

        </Alert>

      ) : null}

      {dataSource === 'config' && includeArchived && rows.some((r) => r.deleted_at) ? (

        <Alert color="teal" variant="light" title="Fiches archivées visibles" data-testid="categories-restore-active-hint">

          <Text size="sm">

            Menu <strong>⋯</strong> → <strong>Restaurer</strong> pour remettre une fiche en circulation.

          </Text>

        </Alert>

      ) : null}

      <Group align="flex-end" wrap="wrap" gap="md">

        <SegmentedControl

          value={activationFilter}

          onChange={(v) => setActivationFilter(v as ActivationFilter)}

          data={[

            { label: 'Toutes', value: 'all' },

            { label: 'Actives', value: 'active' },

            { label: 'Inactives', value: 'inactive' },

          ]}

          aria-label="Filtrer par activation"

          data-testid="categories-activation-filter"

        />

        <Switch

          label="Afficher les éléments archivés"

          description="Nécessaire pour voir les fiches archivées et l'action Restaurer."

          checked={includeArchived}

          onChange={(e) => setIncludeArchived(e.currentTarget.checked)}

          disabled={busy || dataSource !== 'config'}

        />

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



      {dataSource !== 'config' ? (

        <Text size="xs" c="dimmed">

          L&apos;option archives ne s&apos;applique qu&apos;en vue Configuration.

        </Text>

      ) : null}



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

        <Table.ScrollContainer minWidth={920} type="native">

          <Table striped highlightOnHover verticalSpacing="sm">

            <Table.Thead>

              <Table.Tr>

                <Table.Th>Libellé</Table.Th>

                <Table.Th>Tarif</Table.Th>

                <Table.Th>Plafond</Table.Th>

                <Table.Th>Visible dépôt</Table.Th>

                <Table.Th>Ordre caisse</Table.Th>

                <Table.Th>Ordre réception</Table.Th>

                <Table.Th>Raccourci</Table.Th>

                <Table.Th>Création</Table.Th>

                <Table.Th>État</Table.Th>

                <Table.Th w={56} ta="center" aria-label="Actions pour chaque ligne">

                  <Text size="xs" c="dimmed" ff="monospace">

                    ···

                  </Text>

                </Table.Th>

              </Table.Tr>

            </Table.Thead>

            <Table.Tbody>

              {displayRows.length === 0 && !busy ? (

                <Table.Tr>

                  <Table.Td colSpan={colCount}>

                    <Text size="sm" c="dimmed" py="md" ta="center">

                      Aucune catégorie à afficher pour le moment.

                    </Text>

                  </Table.Td>

                </Table.Tr>

              ) : null}

              {displayRows.map(({ row: c, depth }) => {

                const breadcrumb = categoryBreadcrumbLabel(rows, c.id);

                const archived = Boolean(c.deleted_at);

                const caisseUp = !archived ? swapCaisseOrderWithNeighbor(rows, c.id, 'up') : null;

                const caisseDown = !archived ? swapCaisseOrderWithNeighbor(rows, c.id, 'down') : null;

                const recvUp = !archived ? swapReceptionOrderWithNeighbor(rows, c.id, 'up') : null;

                const recvDown = !archived ? swapReceptionOrderWithNeighbor(rows, c.id, 'down') : null;

                return (

                  <Table.Tr key={c.id}>

                    <Table.Td>

                      <div style={{ paddingLeft: depth * 18 }}>

                        <Text size="sm" fw={500}>

                          {c.name}

                        </Text>

                        {c.official_name ? (

                          <Text size="xs" c="dimmed">

                            {c.official_name}

                          </Text>

                        ) : null}

                        {breadcrumb !== c.name ? (

                          <Text size="xs" c="dimmed" lineClamp={2} title={breadcrumb}>

                            {breadcrumb}

                          </Text>

                        ) : null}

                      </div>

                    </Table.Td>

                    <Table.Td>

                      <Text size="sm">{formatMoney(c.price ?? null)}</Text>

                    </Table.Td>

                    <Table.Td>

                      <Text size="sm">{formatMoney(c.max_price ?? null)}</Text>

                    </Table.Td>

                    <Table.Td>

                      <Text size="sm">{c.is_visible ? 'Oui' : 'Non'}</Text>

                    </Table.Td>

                    <Table.Td>

                      <Text size="sm">{c.display_order}</Text>

                    </Table.Td>

                    <Table.Td>

                      <Text size="sm">{c.display_order_entry}</Text>

                    </Table.Td>

                    <Table.Td>

                      <Text size="sm" ff="monospace">

                        {c.shortcut_key?.trim() ? c.shortcut_key : '—'}

                      </Text>

                    </Table.Td>

                    <Table.Td>

                      <Text size="sm">{formatCreated(c.created_at)}</Text>

                    </Table.Td>

                    <Table.Td>{statusBadge(c)}</Table.Td>

                    <Table.Td>

                      <Menu shadow="md" width={240} withinPortal={false}>

                        <Menu.Target>

                          <ActionIcon

                            variant="subtle"

                            color="gray"

                            aria-label={`Actions pour ${c.name}`}

                            data-testid={`category-row-actions-${c.id}`}

                            onClick={(e) => e.stopPropagation()}

                          >

                            <MoreHorizontal size={18} />

                          </ActionIcon>

                        </Menu.Target>

                        <Menu.Dropdown>

                          {c.deleted_at ? (

                            <Menu.Item

                              onClick={() => void handleRestore(c.id)}

                              disabled={!mutationsEnabled || busy}

                              data-testid={`category-restore-${c.id}`}

                            >

                              Restaurer

                            </Menu.Item>

                          ) : (

                            <>

                              <Menu.Item

                                onClick={() => openEdit(c)}

                                disabled={!mutationsEnabled || busy}

                                data-testid={`category-edit-open-${c.id}`}

                              >

                                Modifier

                              </Menu.Item>

                              <Menu.Item

                                leftSection={<ArrowUp size={14} />}

                                disabled={!mutationsEnabled || busy || caisseUp === null}

                                onClick={() => {

                                  const ops = caisseUp;

                                  if (ops) void applyReorderPair(ops);

                                }}

                                data-testid={`category-order-caisse-up-${c.id}`}

                              >

                                Monter (caisse)

                              </Menu.Item>

                              <Menu.Item

                                leftSection={<ArrowDown size={14} />}

                                disabled={!mutationsEnabled || busy || caisseDown === null}

                                onClick={() => {

                                  const ops = caisseDown;

                                  if (ops) void applyReorderPair(ops);

                                }}

                                data-testid={`category-order-caisse-down-${c.id}`}

                              >

                                Descendre (caisse)

                              </Menu.Item>

                              <Menu.Item

                                leftSection={<ArrowUp size={14} />}

                                disabled={!mutationsEnabled || busy || recvUp === null}

                                onClick={() => {

                                  const ops = recvUp;

                                  if (ops) void applyReorderPair(ops);

                                }}

                                data-testid={`category-order-reception-up-${c.id}`}

                              >

                                Monter (réception)

                              </Menu.Item>

                              <Menu.Item

                                leftSection={<ArrowDown size={14} />}

                                disabled={!mutationsEnabled || busy || recvDown === null}

                                onClick={() => {

                                  const ops = recvDown;

                                  if (ops) void applyReorderPair(ops);

                                }}

                                data-testid={`category-order-reception-down-${c.id}`}

                              >

                                Descendre (réception)

                              </Menu.Item>

                              <Menu.Item

                                onClick={() => {

                                  setReparentCategoryId(c.id);

                                  setReparentOpen(true);

                                }}

                                disabled={!mutationsEnabled || busy}

                                data-testid={`category-reparent-open-${c.id}`}

                              >

                                Reclasser

                              </Menu.Item>

                              <Menu.Item

                                color="orange"

                                onClick={() => setConfirmArchive(c)}

                                disabled={!mutationsEnabled || busy}

                                data-testid={`category-archive-open-${c.id}`}

                              >

                                Archiver

                              </Menu.Item>

                            </>

                          )}

                        </Menu.Dropdown>

                      </Menu>

                    </Table.Td>

                  </Table.Tr>

                );

              })}

            </Table.Tbody>

          </Table>

        </Table.ScrollContainer>

      </Paper>



      <Text size="sm" c="dimmed">

        Export : menu PDF, Excel ou CSV (liste complète), ou CSV des lignes affichées. Import : uniquement avec

        l&apos;onglet Configuration (carte du haut).

      </Text>

    </Stack>

  );

}


