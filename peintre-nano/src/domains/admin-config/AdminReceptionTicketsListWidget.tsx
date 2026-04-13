import {
  Accordion,
  Badge,
  Box,
  Button,
  Grid,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getReceptionCategories,
  getReceptionTicketsList,
  postReceptionTicketDownloadToken,
  postReceptionTicketsExportBulk,
  type ReceptionBulkExportFilters,
  type ReceptionTicketSummary,
  type ReceptionTicketsListQuery,
} from '../../api/reception-client';
import { fetchUsersListForAdminDashboard } from '../../api/admin-legacy-dashboard-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from '../cashflow/CashflowClientErrorAlert';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';
import {
  formatReceptionDateTimeFr,
  formatReceptionWeightKg,
  formatReceptionWeightKgOrDash,
  receptionStatusPresentation,
} from './reception-admin-display';

function resolveSameOriginDownloadUrl(downloadUrl: string): string {
  if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
    return downloadUrl;
  }
  if (typeof window !== 'undefined' && downloadUrl.startsWith('/')) {
    return `${window.location.origin}${downloadUrl}`;
  }
  return downloadUrl;
}

type BenevoleOpt = { value: string; label: string };

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'opened', label: 'Ouverts' },
  { value: 'closed', label: 'Fermés' },
] as const;

const PER_PAGE_OPTIONS = ['20', '50', '100'] as const;

const DEST_OPTIONS = [
  { value: 'MAGASIN', label: 'Magasin' },
  { value: 'RECYCLAGE', label: 'Recyclage' },
  { value: 'DECHETERIE', label: 'Déchetterie' },
];

/**
 * Liste admin des tickets réception (`/admin/reception-sessions`) — lecture, filtres serveur, drill-down.
 */
export function AdminReceptionTicketsListWidget(_: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  const [query, setQuery] = useState<ReceptionTicketsListQuery>({ page: 1, per_page: 20 });
  const [rows, setRows] = useState<readonly ReceptionTicketSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [benevoles, setBenevoles] = useState<BenevoleOpt[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [bulkExportBusy, setBulkExportBusy] = useState<'csv' | 'excel' | null>(null);
  const [bulkAdminPin, setBulkAdminPin] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [benevoleId, setBenevoleId] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [poidsMin, setPoidsMin] = useState<number | ''>('');
  const [poidsMax, setPoidsMax] = useState<number | ''>('');
  const [lignesMin, setLignesMin] = useState<number | ''>('');
  const [lignesMax, setLignesMax] = useState<number | ''>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [users, catRes] = await Promise.all([
        fetchUsersListForAdminDashboard(auth),
        getReceptionCategories(auth),
      ]);
      if (cancelled) return;
      setBenevoles(
        users.map((u) => {
          const parts = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
          const label = parts || u.username || u.id;
          return { value: u.id, label };
        }),
      );
      if (catRes.ok) {
        setCategoryOptions(catRes.categories.map((c) => ({ value: c.id, label: c.name || c.id })));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await getReceptionTicketsList(auth, query);
      if (!res.ok) {
        setRows([]);
        setTotal(0);
        setTotalPages(0);
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        return;
      }
      setRows(res.data.tickets);
      setTotal(Number.isFinite(res.data.total) ? res.data.total : 0);
      setTotalPages(Number.isFinite(res.data.total_pages) ? res.data.total_pages : 0);
    } finally {
      setBusy(false);
    }
  }, [auth, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageMetrics = useMemo(() => {
    let poidsTotal = 0;
    let entree = 0;
    let direct = 0;
    let sortie = 0;
    for (const t of rows) {
      poidsTotal += t.total_poids || 0;
      entree += t.poids_entree || 0;
      direct += t.poids_direct || 0;
      sortie += t.poids_sortie || 0;
    }
    return { poidsTotal, entree, direct, sortie };
  }, [rows]);

  const applyFilters = () => {
    const next: ReceptionTicketsListQuery = {
      page: 1,
      per_page: query.per_page ?? 20,
      status: status.trim() || undefined,
      date_from: dateFrom.trim() || undefined,
      date_to: dateTo.trim() || undefined,
      benevole_id: benevoleId.trim() || undefined,
      search: searchDraft.trim() || undefined,
      include_empty: includeEmpty || undefined,
      poids_min: poidsMin === '' ? undefined : Number(poidsMin),
      poids_max: poidsMax === '' ? undefined : Number(poidsMax),
      lignes_min: lignesMin === '' ? undefined : Number(lignesMin),
      lignes_max: lignesMax === '' ? undefined : Number(lignesMax),
      categories: categories.length ? categories : undefined,
      destinations: destinations.length ? destinations : undefined,
    };
    setQuery(next);
  };

  const currentPage = query.page ?? 1;
  const perPage = query.per_page ?? 20;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(currentPage * perPage, total);

  const onExportRow = async (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportingId(ticketId);
    try {
      const res = await postReceptionTicketDownloadToken(ticketId, auth);
      if (!res.ok) {
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        return;
      }
      const href = resolveSameOriginDownloadUrl(res.downloadUrl);
      window.open(href, '_blank', 'noopener,noreferrer');
    } finally {
      setExportingId(null);
    }
  };

  const bulkFiltersForExport = useMemo((): ReceptionBulkExportFilters => {
    return {
      date_from: dateFrom.trim() || undefined,
      date_to: dateTo.trim() || undefined,
      status: status.trim() || undefined,
      benevole_id: benevoleId.trim() || undefined,
      search: searchDraft.trim() || undefined,
      include_empty: includeEmpty || undefined,
    };
  }, [dateFrom, dateTo, status, benevoleId, searchDraft, includeEmpty]);

  const triggerBulkDownload = async (format: 'csv' | 'excel') => {
    setBulkExportBusy(format);
    setError(null);
    try {
      const res = await postReceptionTicketsExportBulk(auth, {
        stepUpPin: bulkAdminPin,
        format,
        filters: bulkFiltersForExport,
      });
      if (!res.ok) {
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        return;
      }
      const href = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = res.filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } finally {
      setBulkExportBusy(null);
    }
  };

  return (
    <div data-testid="widget-admin-reception-tickets-list">
      <Stack gap="md">
        <div>
          <Title order={3}>Sessions de réception</Title>
          <Text size="sm" c="dimmed" mt={4} data-testid="admin-reception-tickets-operation-anchors">
            Comme les rapports historiques : export en tête, filtres, puis tableau et pagination.
          </Text>
        </div>

        <Paper withBorder p="sm" data-testid="admin-reception-tickets-bulk-export">
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              Export groupé
            </Text>
            <Text size="xs" c="dimmed">
              Porte sur tous les tickets qui correspondent aux filtres ci-dessous (dans la limite fixée par le serveur).
              Un code administrateur est demandé pour confirmer.
            </Text>
            <PasswordInput
              label="Code administrateur"
              description="Requis pour lancer un export groupé"
              size="xs"
              value={bulkAdminPin}
              onChange={(e) => setBulkAdminPin(e.currentTarget.value)}
              style={{ maxWidth: 280 }}
            />
            <Group gap="xs" wrap="wrap">
              <Button
                type="button"
                size="sm"
                variant="filled"
                loading={bulkExportBusy === 'csv'}
                disabled={!!bulkExportBusy && bulkExportBusy !== 'csv'}
                onClick={() => void triggerBulkDownload('csv')}
              >
                Exporter en CSV
              </Button>
              <Button
                type="button"
                size="sm"
                variant="default"
                loading={bulkExportBusy === 'excel'}
                disabled={!!bulkExportBusy && bulkExportBusy !== 'excel'}
                onClick={() => void triggerBulkDownload('excel')}
              >
                Exporter en Excel
              </Button>
            </Group>
          </Stack>
        </Paper>

        <Paper withBorder p="md">
          <Stack gap="sm">
            <Grid gutter="sm">
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <TextInput label="Date début" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.currentTarget.value)} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <TextInput label="Date fin" type="date" value={dateTo} onChange={(e) => setDateTo(e.currentTarget.value)} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Select label="Statut" data={[...STATUS_OPTIONS]} value={status} onChange={(v) => setStatus(v ?? '')} clearable />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Select
                  label="Bénévole"
                  placeholder="Tous"
                  searchable
                  clearable
                  data={benevoles}
                  value={benevoleId || null}
                  onChange={(v) => setBenevoleId(v ?? '')}
                />
              </Grid.Col>
            </Grid>
            <Group align="flex-end" wrap="wrap" gap="sm">
              <TextInput
                label="Recherche"
                description="Identifiant du ticket ou nom du bénévole"
                style={{ flex: '1 1 220px' }}
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters();
                }}
              />
              <Switch label="Inclure les tickets sans ligne" checked={includeEmpty} onChange={(e) => setIncludeEmpty(e.currentTarget.checked)} />
              <Button type="button" loading={busy} onClick={applyFilters}>
                Appliquer les filtres
              </Button>
            </Group>
            <Accordion variant="contained">
              <Accordion.Item value="adv">
                <Accordion.Control>Filtres avancés</Accordion.Control>
                <Accordion.Panel>
                  <Grid gutter="sm">
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                      <NumberInput
                        label="Poids min. (kg)"
                        min={0}
                        decimalScale={2}
                        value={poidsMin}
                        onChange={(v) => setPoidsMin(v === '' ? '' : typeof v === 'number' ? v : Number(v))}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                      <NumberInput
                        label="Poids max. (kg)"
                        min={0}
                        decimalScale={2}
                        value={poidsMax}
                        onChange={(v) => setPoidsMax(v === '' ? '' : typeof v === 'number' ? v : Number(v))}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                      <NumberInput
                        label="Lignes min."
                        min={0}
                        value={lignesMin}
                        onChange={(v) => setLignesMin(v === '' ? '' : typeof v === 'number' ? v : Number(v))}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                      <NumberInput
                        label="Lignes max."
                        min={0}
                        value={lignesMax}
                        onChange={(v) => setLignesMax(v === '' ? '' : typeof v === 'number' ? v : Number(v))}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <MultiSelect
                        label="Catégories"
                        data={categoryOptions}
                        value={categories}
                        onChange={setCategories}
                        searchable
                        clearable
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <MultiSelect
                        label="Destinations"
                        data={DEST_OPTIONS}
                        value={destinations}
                        onChange={setDestinations}
                        searchable
                        clearable
                      />
                    </Grid.Col>
                  </Grid>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        </Paper>

        <Grid gutter="xs">
          {(
            [
              { k: 'total', label: 'Poids total (page)', value: pageMetrics.poidsTotal, c: undefined },
              { k: 'ent', label: 'Entrée boutique (page)', value: pageMetrics.entree, c: 'green' as const },
              { k: 'dir', label: 'Recyclage direct (page)', value: pageMetrics.direct, c: 'orange' as const },
              { k: 'sor', label: 'Sortie boutique (page)', value: pageMetrics.sortie, c: 'red' as const },
            ] as const
          ).map((card) => (
            <Grid.Col key={card.k} span={{ base: 6, md: 3 }}>
              <Paper withBorder p="sm" radius="md">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {card.label}
                </Text>
                <Text fw={700} size="lg" c={card.c}>
                  {formatReceptionWeightKgOrDash(card.value)}
                </Text>
              </Paper>
            </Grid.Col>
          ))}
        </Grid>

        <Group gap="sm" wrap="wrap" align="flex-end">
          <Button type="button" size="xs" variant="light" loading={busy} onClick={() => void load()}>
            Rafraîchir
          </Button>
          <Select
            size="xs"
            label="Par page"
            data={[...PER_PAGE_OPTIONS]}
            value={String(perPage)}
            onChange={(v) => {
              const n = Number(v ?? 20);
              setQuery((q) => ({ ...q, per_page: n, page: 1 }));
            }}
            w={100}
          />
        </Group>

        <CashflowClientErrorAlert error={error} testId="admin-reception-tickets-list-error" />

        {!busy && !error && rows.length === 0 ? (
          <Text size="sm" c="dimmed" data-testid="admin-reception-tickets-list-empty">
            Aucun ticket sur cette page.
          </Text>
        ) : null}

        {rows.length > 0 ? (
          <Table striped highlightOnHover data-testid="admin-reception-tickets-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Date de création</Table.Th>
                <Table.Th>Bénévole</Table.Th>
                <Table.Th>Poste</Table.Th>
                <Table.Th>Lignes</Table.Th>
                <Table.Th>Poids total</Table.Th>
                <Table.Th>Entrée</Table.Th>
                <Table.Th>Direct</Table.Th>
                <Table.Th>Sortie</Table.Th>
                <Table.Th> </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((t) => {
                const st = receptionStatusPresentation(t.status);
                const dotColor =
                  st.color === 'green'
                    ? 'var(--mantine-color-green-filled)'
                    : st.color === 'red'
                      ? 'var(--mantine-color-red-filled)'
                      : 'var(--mantine-color-gray-filled)';
                return (
                  <Table.Tr
                    key={t.id}
                    data-testid={`admin-reception-ticket-row-${t.id}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => spaNavigateTo(`/admin/reception-tickets/${encodeURIComponent(t.id)}`)}
                  >
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <Box
                          aria-hidden
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: dotColor,
                            flexShrink: 0,
                          }}
                        />
                        <Badge variant="light" color={st.color} size="sm">
                          {st.label}
                        </Badge>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatReceptionDateTimeFr(t.created_at)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{t.benevole_username?.trim() || '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace">
                        {t.poste_id}
                      </Text>
                    </Table.Td>
                    <Table.Td>{t.total_lignes}</Table.Td>
                    <Table.Td>{formatReceptionWeightKg(t.total_poids)}</Table.Td>
                    <Table.Td>
                      <Text size="sm" c="green.7" fw={500}>
                        {formatReceptionWeightKgOrDash(t.poids_entree)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="orange.7" fw={500}>
                        {formatReceptionWeightKgOrDash(t.poids_direct)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="red.7" fw={500}>
                        {formatReceptionWeightKgOrDash(t.poids_sortie)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          size="xs"
                          variant="light"
                          onClick={() => spaNavigateTo(`/admin/reception-tickets/${encodeURIComponent(t.id)}`)}
                          data-testid={`admin-reception-ticket-open-${t.id}`}
                        >
                          Détail
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="default"
                          loading={exportingId === t.id}
                          onClick={(e) => void onExportRow(t.id, e)}
                        >
                          Exporter
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        ) : null}

        {total > 0 ? (
          <Paper withBorder p="sm">
            <Group justify="space-between" wrap="wrap" gap="sm">
              <Text size="sm" c="dimmed">
                Affichage de {rangeStart} à {rangeEnd} sur {total} ticket{total > 1 ? 's' : ''}
              </Text>
              <Group gap="xs">
                <Button
                  type="button"
                  size="xs"
                  variant="default"
                  disabled={currentPage <= 1 || busy}
                  onClick={() => setQuery((q) => ({ ...q, page: 1 }))}
                >
                  Première
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="default"
                  disabled={currentPage <= 1 || busy}
                  onClick={() => setQuery((q) => ({ ...q, page: Math.max(1, (q.page ?? 1) - 1) }))}
                >
                  Précédente
                </Button>
                <Text size="sm" c="dimmed">
                  Page {currentPage}
                  {totalPages > 0 ? ` / ${totalPages}` : ''}
                </Text>
                <Button
                  type="button"
                  size="xs"
                  variant="default"
                  disabled={busy || totalPages === 0 || currentPage >= totalPages}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
                >
                  Suivante
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="default"
                  disabled={busy || totalPages === 0 || currentPage >= totalPages}
                  onClick={() => setQuery((q) => ({ ...q, page: totalPages }))}
                >
                  Dernière
                </Button>
              </Group>
            </Group>
          </Paper>
        ) : null}

        <Text size="xs" c="dimmed" data-testid="admin-reception-tickets-sensitive-note">
          La fermeture d&apos;un ticket et la modification d&apos;une ligne restent réservées à l&apos;administration
          complète.
        </Text>
      </Stack>
    </div>
  );
}
