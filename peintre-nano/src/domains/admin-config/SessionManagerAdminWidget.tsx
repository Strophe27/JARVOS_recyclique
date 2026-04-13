import {
  Accordion,
  Alert,
  Button,
  Checkbox,
  Group,
  Loader,
  NativeSelect,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { ChevronDown, ChevronUp, ChevronsUpDown, Download, Euro, Scale, ShoppingCart, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import {
  fetchCashSessionReportBlobBySession,
  fetchCashSessionsBulkExportBlob,
  fetchCashSessionsList,
  fetchSitesList,
  type CashSessionListFiltersV1,
  type CashSessionListItemV1,
  type CashSessionsBulkExportFiltersV1,
  type CashSessionsBulkExportFormat,
} from '../../api/admin-cash-sessions-client';
import { fetchUsersListForAdminDashboard, type AdminLegacyUserListRow } from '../../api/admin-legacy-dashboard-client';
import { fetchCashSessionStatsSummary, type CashSessionStatsSummary } from '../../api/dashboard-legacy-stats-client';
import { isUuidLikeString } from '../../api/cash-session-client';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';

type SortField =
  | 'opened_at'
  | 'operator_id'
  | 'status'
  | 'total_sales'
  | 'number_of_sales'
  | 'total_donations'
  | 'variance';
type SortDirection = 'asc' | 'desc';

type UiFilters = {
  date_from: string;
  date_to: string;
  status: '' | 'open' | 'closed';
  operator_id: string;
  site_id: string;
  search: string;
  skip: number;
  limit: number;
  amount_min: string;
  amount_max: string;
  variance_threshold: string;
  variance_has_variance: boolean;
  duration_min_hours: string;
  duration_max_hours: string;
  payment_methods: string[];
  has_donation: boolean;
};

/** Critères du panneau « Filtres avancés » : affinent le tableau mais ne sont pas repris dans l'export groupé. */
function advancedSessionFiltersActive(ui: UiFilters): boolean {
  return (
    ui.amount_min.trim() !== '' ||
    ui.amount_max.trim() !== '' ||
    ui.variance_threshold.trim() !== '' ||
    ui.variance_has_variance ||
    ui.duration_min_hours.trim() !== '' ||
    ui.duration_max_hours.trim() !== '' ||
    ui.payment_methods.length > 0 ||
    ui.has_donation
  );
}

const DEFAULT_LIMIT = 20;
const FETCH_BATCH = 100;
const MAX_SESSIONS = 1000;

function formatCurrency(value: number): string {
  return (value ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toIsoDayStart(yyyyMmDd: string): string | undefined {
  const t = yyyyMmDd.trim();
  if (!t) return undefined;
  return `${t}T00:00:00.000Z`;
}

function toIsoDayEnd(yyyyMmDd: string): string | undefined {
  const t = yyyyMmDd.trim();
  if (!t) return undefined;
  return `${t}T23:59:59.999Z`;
}

function userLabel(u: AdminLegacyUserListRow): string {
  const parts = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  if (parts) return parts;
  if (u.username?.trim()) return u.username.trim();
  return u.id;
}

export function SessionManagerAdminWidget(_: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  const envelope = useContextEnvelope();

  const defaultSite = useMemo(() => {
    const s = envelope.siteId?.trim() ?? '';
    return isUuidLikeString(s) ? s : '';
  }, [envelope.siteId]);

  const [ui, setUi] = useState<UiFilters>(() => ({
    date_from: '',
    date_to: '',
    status: '',
    operator_id: '',
    site_id: defaultSite,
    search: '',
    skip: 0,
    limit: DEFAULT_LIMIT,
    amount_min: '',
    amount_max: '',
    variance_threshold: '',
    variance_has_variance: false,
    duration_min_hours: '',
    duration_max_hours: '',
    payment_methods: [],
    has_donation: false,
  }));

  useEffect(() => {
    if (defaultSite && !ui.site_id) {
      setUi((prev) => ({ ...prev, site_id: defaultSite }));
    }
  }, [defaultSite, ui.site_id]);

  const [users, setUsers] = useState<readonly AdminLegacyUserListRow[]>([]);
  const usersRef = useRef(users);
  usersRef.current = users;
  const [sites, setSites] = useState<readonly { id: string; name: string }[]>([]);
  const [kpis, setKpis] = useState<CashSessionStatsSummary | null>(null);
  const [allSessions, setAllSessions] = useState<CashSessionListItemV1[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('opened_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [csvBusyId, setCsvBusyId] = useState<string | null>(null);
  const [bulkPin, setBulkPin] = useState('');
  const [bulkBusy, setBulkBusy] = useState<CashSessionsBulkExportFormat | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  /** Libellés opérateur figés au dernier chargement réussi (évite un flash UUID si `users` n’est pas encore commité). */
  const [operatorLabelsById, setOperatorLabelsById] = useState<Record<string, string>>({});

  const getUserName = useCallback(
    (userId: string): string => {
      const u = users.find((x) => x.id === userId);
      return u ? userLabel(u) : userId || '—';
    },
    [users],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [uList, sList] = await Promise.all([
        fetchUsersListForAdminDashboard(auth),
        fetchSitesList(auth),
      ]);
      if (!cancelled) {
        setUsers(uList);
        setSites(sList);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const toListFiltersBase = useCallback((): CashSessionListFiltersV1 => {
    const dateFromIso = toIsoDayStart(ui.date_from);
    const dateToIso = toIsoDayEnd(ui.date_to);
    const amin = parseFloat(String(ui.amount_min).replace(',', '.'));
    const amax = parseFloat(String(ui.amount_max).replace(',', '.'));
    const vth = parseFloat(String(ui.variance_threshold).replace(',', '.'));
    const dmin = parseFloat(String(ui.duration_min_hours).replace(',', '.'));
    const dmax = parseFloat(String(ui.duration_max_hours).replace(',', '.'));
    return {
      status: ui.status || undefined,
      operator_id: ui.operator_id || undefined,
      site_id: ui.site_id || undefined,
      date_from: dateFromIso,
      date_to: dateToIso,
      search: ui.search.trim() || undefined,
      ...(Number.isFinite(amin) ? { amount_min: amin } : {}),
      ...(Number.isFinite(amax) ? { amount_max: amax } : {}),
      ...(Number.isFinite(vth) ? { variance_threshold: vth } : {}),
      ...(ui.variance_has_variance ? { variance_has_variance: true } : {}),
      ...(Number.isFinite(dmin) ? { duration_min_hours: dmin } : {}),
      ...(Number.isFinite(dmax) ? { duration_max_hours: dmax } : {}),
      ...(ui.payment_methods.length ? { payment_methods: ui.payment_methods } : {}),
      ...(ui.has_donation ? { has_donation: true } : {}),
    } as CashSessionListFiltersV1;
  }, [ui]);

  /** Sous-ensemble aligné sur le corps d’export regroupé côté serveur (dates, statut, opérateur, site, recherche). */
  const toBulkExportFilters = useCallback((): CashSessionsBulkExportFiltersV1 => {
    const base = toListFiltersBase();
    return {
      date_from: base.date_from,
      date_to: base.date_to,
      status: base.status,
      operator_id: base.operator_id,
      site_id: base.site_id,
      search: base.search,
      include_empty: false,
    };
  }, [toListFiltersBase]);

  const bulkExportBlocked = useMemo(() => advancedSessionFiltersActive(ui), [ui]);

  useEffect(() => {
    if (bulkExportBlocked) {
      setBulkError(null);
    }
  }, [bulkExportBlocked]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    let userListForLabels = usersRef.current;
    if (userListForLabels.length === 0) {
      userListForLabels = await fetchUsersListForAdminDashboard(auth);
      setUsers(userListForLabels);
    }
    const resolveOperatorLabel = (userId: string): string => {
      const u = userListForLabels.find((x) => x.id === userId);
      return u ? userLabel(u) : userId || '—';
    };
    const baseList = toListFiltersBase();
    const date_from_iso = toIsoDayStart(ui.date_from);
    const date_to_iso = toIsoDayEnd(ui.date_to);
    try {
      const kpiPromise = fetchCashSessionStatsSummary(
        auth,
        {
          start: date_from_iso,
          end: date_to_iso,
          site_id: ui.site_id || undefined,
        },
        undefined,
      ).catch(() => null);

      let collected: CashSessionListItemV1[] = [];
      let skip = 0;
      let more = true;
      while (more && collected.length < MAX_SESSIONS) {
        const batch = await fetchCashSessionsList(auth, {
          ...baseList,
          limit: FETCH_BATCH,
          skip,
        });
        const chunk = batch.data;
        if (chunk.length === 0) {
          more = false;
        } else {
          collected = [...collected, ...chunk];
          skip += FETCH_BATCH;
          if (chunk.length < FETCH_BATCH) more = false;
        }
      }

      const kpiRes = await kpiPromise;
      setKpis(kpiRes);

      const sorted = [...collected].sort((a, b) => {
        let aVal: string | number = 0;
        let bVal: string | number = 0;
        if (sortField === 'opened_at') {
          aVal = new Date(a.opened_at).getTime();
          bVal = new Date(b.opened_at).getTime();
        } else if (sortField === 'operator_id') {
            const cmp = resolveOperatorLabel(a.operator_id).localeCompare(resolveOperatorLabel(b.operator_id), 'fr', {
              sensitivity: 'base',
            });
            return sortDirection === 'asc' ? cmp : -cmp;
        } else if (sortField === 'status') {
          aVal = a.status;
          bVal = b.status;
        } else {
          const ak = a[sortField];
          const bk = b[sortField];
          aVal = typeof ak === 'number' ? ak : Number(ak) || 0;
          bVal = typeof bk === 'number' ? bk : Number(bk) || 0;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const as = String(aVal);
        const bs = String(bVal);
        return sortDirection === 'asc' ? as.localeCompare(bs, 'fr') : bs.localeCompare(as, 'fr');
      });

      const labelMap: Record<string, string> = {};
      for (const row of sorted) {
        if (row.operator_id) {
          labelMap[row.operator_id] = resolveOperatorLabel(row.operator_id);
        }
      }
      setOperatorLabelsById(labelMap);

      setAllSessions(sorted);
      setTotal(sorted.length);
    } catch (e) {
      void e;
      setLoadError('Les données de sessions ne sont pas accessibles pour le moment.');
      setAllSessions([]);
      setTotal(0);
      setKpis(null);
      setOperatorLabelsById({});
    } finally {
      setLoading(false);
    }
  }, [auth, getUserName, sortDirection, sortField, toListFiltersBase, ui]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 120);
    return () => window.clearTimeout(t);
  }, [
    load,
    ui.date_from,
    ui.date_to,
    ui.status,
    ui.operator_id,
    ui.site_id,
    ui.search,
    ui.amount_min,
    ui.amount_max,
    ui.variance_threshold,
    ui.variance_has_variance,
    ui.duration_min_hours,
    ui.duration_max_hours,
    ui.payment_methods.join(','),
    ui.has_donation,
    sortField,
    sortDirection,
  ]);

  const rows = useMemo(() => {
    const start = ui.skip;
    const lim = ui.limit;
    return allSessions.slice(start, start + lim);
  }, [allSessions, ui.skip, ui.limit]);

  const currentPage = Math.floor(ui.skip / ui.limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / ui.limit));

  const patchUi = (patch: Partial<UiFilters>) => {
    setUi((prev) => ({ ...prev, ...patch }));
  };

  const onFilterPatch = (patch: Partial<UiFilters>) => {
    setUi((prev) => ({ ...prev, ...patch, skip: 0 }));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setUi((p) => ({ ...p, skip: 0 }));
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown size={14} style={{ opacity: 0.35 }} />;
    if (sortDirection === 'asc') return <ChevronUp size={14} />;
    if (sortDirection === 'desc') return <ChevronDown size={14} />;
    return <ChevronsUpDown size={14} style={{ opacity: 0.35 }} />;
  };

  const thSort = (field: SortField, label: string) => (
    <Table.Th
      style={{ cursor: 'pointer', userSelect: 'none', textTransform: 'uppercase', fontSize: '0.85rem' }}
      onClick={() => handleSort(field)}
    >
      <Group gap={6} wrap="nowrap">
        {label}
        {sortIcon(field)}
      </Group>
    </Table.Th>
  );

  const downloadCsv = async (sessionId: string, e: MouseEvent) => {
    e.stopPropagation();
    setCsvBusyId(sessionId);
    try {
      const r = await fetchCashSessionReportBlobBySession(auth, sessionId);
      if (!r.ok) {
        return;
      }
      triggerBrowserDownload(r.blob, r.filename);
    } finally {
      setCsvBusyId(null);
    }
  };

  const runBulkExport = async (format: CashSessionsBulkExportFormat) => {
    if (bulkExportBlocked) {
      setBulkError('Réinitialisez « Filtres avancés » avant un export groupé.');
      return;
    }
    setBulkError(null);
    setBulkBusy(format);
    try {
      const r = await fetchCashSessionsBulkExportBlob(auth, {
        filters: toBulkExportFilters(),
        format,
        stepUpPin: bulkPin,
      });
      if (!r.ok) {
        setBulkError(r.message);
        return;
      }
      triggerBrowserDownload(r.blob, r.filename);
    } finally {
      setBulkBusy(null);
    }
  };

  return (
    <Stack gap="md" data-testid="widget-admin-session-manager-demo">
      <Title order={1} size="h2">
        Gestionnaire de sessions de caisse
      </Title>

      <Paper withBorder p="md">
        <Stack gap="sm">
          <Group grow align="flex-end">
            <TextInput label="Date début" type="date" value={ui.date_from} onChange={(e) => onFilterPatch({ date_from: e.currentTarget.value })} />
            <TextInput label="Date fin" type="date" value={ui.date_to} onChange={(e) => onFilterPatch({ date_to: e.currentTarget.value })} />
            <NativeSelect
              label="Statut"
              value={ui.status}
              onChange={(e) => onFilterPatch({ status: (e.currentTarget.value || '') as UiFilters['status'] })}
              data={[
                { value: '', label: 'Tous statuts' },
                { value: 'open', label: 'Ouvertes' },
                { value: 'closed', label: 'Fermées' },
              ]}
            />
            <NativeSelect
              label="Opérateur"
              value={ui.operator_id}
              onChange={(e) => onFilterPatch({ operator_id: e.currentTarget.value })}
              data={[{ value: '', label: 'Tous opérateurs' }, ...users.map((u) => ({ value: u.id, label: userLabel(u) }))]}
            />
          </Group>
          <Group grow align="flex-end">
            <NativeSelect
              label="Site"
              value={ui.site_id}
              onChange={(e) => onFilterPatch({ site_id: e.currentTarget.value })}
              data={[{ value: '', label: 'Tous sites' }, ...sites.map((s) => ({ value: s.id, label: s.name }))]}
            />
            <TextInput
              label="Recherche"
              description="Opérateur ou identifiant de session"
              value={ui.search}
              onChange={(e) => onFilterPatch({ search: e.currentTarget.value })}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
            <Button onClick={() => void load()} loading={loading}>
              Actualiser
            </Button>
          </Group>

          <Accordion variant="separated">
            <Accordion.Item value="adv">
              <Accordion.Control>Filtres avancés</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Group grow>
                    <TextInput
                      label="Montant minimum (€)"
                      type="number"
                      min={0}
                      step={0.01}
                      value={ui.amount_min}
                      onChange={(e) => onFilterPatch({ amount_min: e.currentTarget.value })}
                    />
                    <TextInput
                      label="Montant maximum (€)"
                      type="number"
                      min={0}
                      step={0.01}
                      value={ui.amount_max}
                      onChange={(e) => onFilterPatch({ amount_max: e.currentTarget.value })}
                    />
                    <TextInput
                      label="Seuil de variance (€)"
                      type="number"
                      min={0}
                      step={0.01}
                      value={ui.variance_threshold}
                      onChange={(e) => onFilterPatch({ variance_threshold: e.currentTarget.value })}
                    />
                  </Group>
                  <Group grow>
                    <TextInput
                      label="Durée min. (h)"
                      type="number"
                      min={0}
                      step={0.1}
                      value={ui.duration_min_hours}
                      onChange={(e) => onFilterPatch({ duration_min_hours: e.currentTarget.value })}
                    />
                    <TextInput
                      label="Durée max. (h)"
                      type="number"
                      min={0}
                      step={0.1}
                      value={ui.duration_max_hours}
                      onChange={(e) => onFilterPatch({ duration_max_hours: e.currentTarget.value })}
                    />
                    <div>
                      <Text size="sm" fw={500} mb={6}>
                        Moyens de paiement
                      </Text>
                      <Group gap="md">
                        {(
                          [
                            ['cash', 'Espèces'],
                            ['card', 'Carte'],
                            ['check', 'Chèque'],
                          ] as const
                        ).map(([value, label]) => (
                          <Checkbox
                            key={value}
                            label={label}
                            checked={ui.payment_methods.includes(value)}
                            onChange={(e) => {
                              const on = e.currentTarget.checked;
                              setUi((prev) => ({
                                ...prev,
                                skip: 0,
                                payment_methods: on
                                  ? [...prev.payment_methods, value]
                                  : prev.payment_methods.filter((x) => x !== value),
                              }));
                            }}
                          />
                        ))}
                      </Group>
                    </div>
                  </Group>
                  <Group>
                    <Switch
                      label="Avec écart de caisse"
                      checked={ui.variance_has_variance}
                      onChange={(e) => onFilterPatch({ variance_has_variance: e.currentTarget.checked })}
                    />
                    <Switch
                      label="Avec don"
                      checked={ui.has_donation}
                      onChange={(e) => onFilterPatch({ has_donation: e.currentTarget.checked })}
                    />
                  </Group>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Paper>

      <Paper withBorder p="md" data-testid="admin-session-manager-bulk-export">
        <Stack gap="sm">
          <Text fw={600} size="sm">
            Export fichier regroupé
          </Text>
          {bulkExportBlocked ? (
            <Alert color="yellow" variant="light" data-testid="admin-session-manager-bulk-export-blocked">
              Le fichier groupé ne suit que les critères du haut de page (dates, statut, opérateur, site, recherche).
              Réinitialisez « Filtres avancés » pour activer le téléchargement.
            </Alert>
          ) : (
            <Text size="xs" c="dimmed">
              Un seul fichier pour les sessions correspondant aux dates, au statut, à l&apos;opérateur, au site et à la
              recherche du haut de page. Le panneau « Filtres avancés » n&apos;est pas repris dans ce fichier.
            </Text>
          )}
          <PasswordInput
            label="Code de confirmation"
            description="Requis pour cet export."
            type="password"
            autoComplete="off"
            value={bulkPin}
            onChange={(e) => {
              setBulkPin(e.currentTarget.value);
              setBulkError(null);
            }}
            data-testid="admin-session-manager-bulk-pin"
          />
          <Group gap="sm" wrap="wrap">
            <Button
              variant="default"
              leftSection={<Download size={16} />}
              loading={bulkBusy === 'csv'}
              disabled={bulkExportBlocked || (Boolean(bulkBusy) && bulkBusy !== 'csv')}
              onClick={() => void runBulkExport('csv')}
              data-testid="admin-session-manager-bulk-csv"
            >
              Télécharger CSV
            </Button>
            <Button
              variant="default"
              leftSection={<Download size={16} />}
              loading={bulkBusy === 'excel'}
              disabled={bulkExportBlocked || (Boolean(bulkBusy) && bulkBusy !== 'excel')}
              onClick={() => void runBulkExport('excel')}
              data-testid="admin-session-manager-bulk-xlsx"
            >
              Télécharger Excel
            </Button>
          </Group>
          {bulkError ? (
            <Alert color="red" variant="light" title="Export impossible">
              {bulkError}
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      {loadError ? (
        <Alert color="red" title="Chargement impossible">
          {loadError}
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="sm">
        <Paper withBorder p="md">
          <Group gap="sm" wrap="nowrap">
            <Euro size={20} />
            <div>
              <Text size="xs" c="dimmed">
                Chiffre d'affaires total
              </Text>
              <Text fw={700}>{formatCurrency(kpis?.total_sales ?? 0)}</Text>
            </div>
          </Group>
        </Paper>
        <Paper withBorder p="md">
          <Group gap="sm" wrap="nowrap">
            <ShoppingCart size={20} />
            <div>
              <Text size="xs" c="dimmed">
                Nombre de ventes
              </Text>
              <Text fw={700}>{kpis?.number_of_sales ?? 0}</Text>
            </div>
          </Group>
        </Paper>
        <Paper withBorder p="md">
          <Group gap="sm" wrap="nowrap">
            <Scale size={20} />
            <div>
              <Text size="xs" c="dimmed">
                Poids total vendu
              </Text>
              <Text fw={700}>{(kpis?.total_weight_sold ?? 0).toLocaleString('fr-FR')} kg</Text>
            </div>
          </Group>
        </Paper>
        <Paper withBorder p="md">
          <Group gap="sm" wrap="nowrap">
            <Euro size={20} />
            <div>
              <Text size="xs" c="dimmed">
                Total des dons
              </Text>
              <Text fw={700}>{formatCurrency(kpis?.total_donations ?? 0)}</Text>
            </div>
          </Group>
        </Paper>
        <Paper withBorder p="md">
          <Group gap="sm" wrap="nowrap">
            <Users size={20} />
            <div>
              <Text size="xs" c="dimmed">
                Nombre de sessions
              </Text>
              <Text fw={700}>{kpis?.total_sessions ?? 0}</Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {loading && !loadError ? (
        <Group justify="center" py="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Chargement…
          </Text>
        </Group>
      ) : null}

      <Table withTableBorder striped highlightOnHover data-testid="admin-session-manager-sessions-table">
        <Table.Thead bg="gray.0">
          <Table.Tr>
            {thSort('status', 'Statut')}
            {thSort('opened_at', 'Ouverture')}
            {thSort('operator_id', 'Opérateur')}
            {thSort('number_of_sales', 'Nb ventes')}
            {thSort('total_sales', 'Total ventes')}
            {thSort('total_donations', 'Total dons')}
            {thSort('variance', 'Écart')}
            <Table.Th style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {!loading && rows.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={8} ta="center" py="xl" c="dimmed">
                Aucune session ne correspond aux filtres.
              </Table.Td>
            </Table.Tr>
          ) : (
            rows.map((row) => (
              <Table.Tr
                key={row.id}
                style={{ cursor: 'pointer' }}
                onClick={() => spaNavigateTo(`/admin/cash-sessions/${encodeURIComponent(row.id)}`)}
              >
                <Table.Td>
                  <Group gap={8} wrap="nowrap">
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 9999,
                        background: row.status === 'open' ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-red-6)',
                        flexShrink: 0,
                      }}
                    />
                    {row.status === 'open' ? 'Ouverte' : 'Fermée'}
                  </Group>
                </Table.Td>
                <Table.Td>{row.opened_at ? new Date(row.opened_at).toLocaleString('fr-FR') : '—'}</Table.Td>
                <Table.Td>
                  {row.operator_id
                    ? operatorLabelsById[row.operator_id] ?? getUserName(row.operator_id)
                    : '—'}
                </Table.Td>
                <Table.Td>{row.number_of_sales ?? 0}</Table.Td>
                <Table.Td>{formatCurrency(Number(row.total_sales) || 0)}</Table.Td>
                <Table.Td>{formatCurrency(Number(row.total_donations) || 0)}</Table.Td>
                <Table.Td>{row.variance != null ? formatCurrency(Number(row.variance)) : '—'}</Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                    <Button size="xs" variant="light" onClick={() => spaNavigateTo(`/admin/cash-sessions/${encodeURIComponent(row.id)}`)}>
                      Détail
                    </Button>
                    <Button
                      size="xs"
                      variant="default"
                      leftSection={<Download size={14} />}
                      loading={csvBusyId === row.id}
                      onClick={(e) => void downloadCsv(row.id, e)}
                    >
                      Fichier
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {total > 0 ? (
        <Paper withBorder p="md">
          <Group justify="space-between" align="center" wrap="wrap">
            <Text size="sm" c="dimmed">
              {Math.min(ui.skip + 1, total)} – {Math.min(ui.skip + ui.limit, total)} sur {total} sessions
            </Text>
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Par page
              </Text>
              <NativeSelect
                value={String(ui.limit)}
                onChange={(e) => setUi((prev) => ({ ...prev, limit: Number(e.currentTarget.value), skip: 0 }))}
                data={[
                  { value: '20', label: '20' },
                  { value: '50', label: '50' },
                  { value: '100', label: '100' },
                ]}
              />
            </Group>
            <Group gap="xs">
              <Button size="xs" variant="default" disabled={currentPage <= 1} onClick={() => patchUi({ skip: 0 })}>
                Première
              </Button>
              <Button
                size="xs"
                variant="default"
                disabled={currentPage <= 1}
                onClick={() => patchUi({ skip: Math.max(0, ui.skip - ui.limit) })}
              >
                Précédent
              </Button>
              <Text size="sm">
                Page {currentPage} / {totalPages}
              </Text>
              <Button
                size="xs"
                variant="default"
                disabled={currentPage >= totalPages}
                onClick={() => patchUi({ skip: ui.skip + ui.limit })}
              >
                Suivant
              </Button>
              <Button
                size="xs"
                variant="default"
                disabled={currentPage >= totalPages}
                onClick={() => patchUi({ skip: (totalPages - 1) * ui.limit })}
              >
                Dernière
              </Button>
            </Group>
          </Group>
        </Paper>
      ) : null}
    </Stack>
  );
}
