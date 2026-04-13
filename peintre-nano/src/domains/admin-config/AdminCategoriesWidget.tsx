import {
  Alert,
  Badge,
  Button,
  Group,
  LoadingOverlay,
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
import { ArrowDownAZ, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getCategoriesListForAdmin,
  type CategoriesDataSource,
  type CategoryAdminListRowDto,
} from '../../api/admin-categories-client';
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

type CategoriesSortBy = 'order' | 'name' | 'created';

function filterCatsForSearch(cats: readonly CategoryAdminListRowDto[], q: string): CategoryAdminListRowDto[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [...cats];
  const byId = new Map(cats.map((c) => [c.id, c]));
  const keep = new Set<string>();
  for (const c of cats) {
    const hay = `${c.name} ${c.official_name ?? ''}`.toLowerCase();
    if (!hay.includes(needle)) continue;
    keep.add(c.id);
    let pid = c.parent_id;
    while (pid) {
      keep.add(pid);
      pid = byId.get(pid)?.parent_id ?? null;
    }
  }
  return cats.filter((c) => keep.has(c.id));
}

function compareSiblings(
  a: CategoryAdminListRowDto,
  b: CategoryAdminListRowDto,
  sortBy: CategoriesSortBy,
  source: CategoriesDataSource,
): number {
  if (sortBy === 'name') {
    return a.name.localeCompare(b.name, 'fr');
  }
  if (sortBy === 'created') {
    return a.created_at.localeCompare(b.created_at);
  }
  if (source === 'entry') {
    const de = a.display_order_entry - b.display_order_entry;
    if (de !== 0) return de;
    const o = a.display_order - b.display_order;
    if (o !== 0) return o;
  } else if (source === 'sale') {
    const o = a.display_order - b.display_order;
    if (o !== 0) return o;
    const de = a.display_order_entry - b.display_order_entry;
    if (de !== 0) return de;
  } else {
    const o = a.display_order - b.display_order;
    if (o !== 0) return o;
    const de = a.display_order_entry - b.display_order_entry;
    if (de !== 0) return de;
  }
  return a.name.localeCompare(b.name, 'fr');
}

function orderedRowsWithDepth(
  cats: readonly CategoryAdminListRowDto[],
  sortBy: CategoriesSortBy,
  source: CategoriesDataSource,
): { row: CategoryAdminListRowDto; depth: number }[] {
  const children = new Map<string | null, CategoryAdminListRowDto[]>();
  for (const c of cats) {
    const pid = c.parent_id ?? null;
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid)!.push(c);
  }
  for (const arr of children.values()) {
    arr.sort((a, b) => compareSiblings(a, b, sortBy, source));
  }
  const out: { row: CategoryAdminListRowDto; depth: number }[] = [];
  const walk = (pid: string | null, depth: number) => {
    for (const c of children.get(pid) ?? []) {
      out.push({ row: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

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
        Inactive
      </Badge>
    );
  }
  return (
    <Badge color="green" variant="light">
      Active
    </Badge>
  );
}

const SORT_OPTIONS: { value: CategoriesSortBy; label: string }[] = [
  { value: 'order', label: "Ordre d'affichage" },
  { value: 'name', label: 'Nom (A à Z)' },
  { value: 'created', label: 'Date de création' },
];

/**
 * Consultation des catégories et tarifs : aligné lecture sur le legacy (vues caisse / dépôt, tri, colonnes).
 * Les actions d'écriture (formulaire, import, export) restent hors périmètre de cet écran.
 */
export function AdminCategoriesWidget(_: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  useContextEnvelope();

  const [dataSource, setDataSource] = useState<CategoriesDataSource>('config');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortBy, setSortBy] = useState<CategoriesSortBy>('order');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<readonly CategoryAdminListRowDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    const res = await getCategoriesListForAdmin(auth, {
      source: dataSource,
      include_archived: dataSource === 'config' ? includeArchived : undefined,
    });
    if (!res.ok) {
      setRows([]);
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      setBusy(false);
      return;
    }
    setRows(res.data);
    setBusy(false);
  }, [auth, dataSource, includeArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => filterCatsForSearch(rows, search), [rows, search]);
  const displayRows = useMemo(
    () => orderedRowsWithDepth(filtered, sortBy, dataSource),
    [filtered, sortBy, dataSource],
  );

  const subtitle =
    dataSource === 'config'
      ? 'Données complètes du site : hiérarchie, tarifs, visibilité et ordres.'
      : dataSource === 'sale'
        ? "Même ordre et périmètre que pour la saisie d'un ticket de vente à la caisse."
        : 'Fiches visibles pour la saisie des tickets de dépôt (les masquées sont exclues).';

  const colCount = 9;

  return (
    <Stack gap="md" data-testid="widget-admin-categories-demo">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>Gestion des catégories</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {subtitle}
          </Text>
        </div>
        <Group gap="sm">
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

      {dataSource === 'entry' ? (
        <Alert color="blue" title="Vue réception">
          <Text size="sm">
            Ici, l&apos;ordre affiché suit l&apos;ordre des tickets de dépôt. La visibilité reflète ce que les
            bénévoles voient à la saisie ; les changements se font depuis l&apos;interface d&apos;administration
            complète ou l&apos;historique.
          </Text>
        </Alert>
      ) : null}

      {error ? <CashflowClientErrorAlert error={error} /> : null}

      <Group align="flex-end" wrap="wrap" gap="md">
        <Switch
          label="Afficher les éléments archivés"
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
          L&apos;option « éléments archivés » ne s&apos;applique qu&apos;à la vue configuration : les listes
          caisse et réception viennent d&apos;autres filtres côté serveur.
        </Text>
      ) : null}

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
              {displayRows.map(({ row: c, depth }) => (
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
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Text size="sm" c="dimmed">
        L&apos;ajout d&apos;une catégorie, l&apos;import ou l&apos;export depuis cet écran ne sont pas encore
        proposés ici.
      </Text>
    </Stack>
  );
}
