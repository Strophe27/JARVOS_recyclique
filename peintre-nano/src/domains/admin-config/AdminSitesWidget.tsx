import {
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  createSiteForAdmin,
  deleteSiteForAdmin,
  listSitesForAdmin,
  updateSiteForAdmin,
  type SiteAdminRowDto,
} from '../../api/admin-sites-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from '../cashflow/CashflowClientErrorAlert';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'short' });
  } catch {
    return iso;
  }
}

/**
 * Liste et opérations courantes sur les sites (création, activation, suppression).
 */
export function AdminSitesWidget(_: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  const [rows, setRows] = useState<readonly SiteAdminRowDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCity, setCreateCity] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SiteAdminRowDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    const res = await listSitesForAdmin(auth, { limit: 200 });
    if (!res.ok) {
      setRows([]);
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      setBusy(false);
      return;
    }
    setRows(res.data);
    setBusy(false);
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggleActive = async (site: SiteAdminRowDto, next: boolean) => {
    setToggleBusyId(site.id);
    setError(null);
    const res = await updateSiteForAdmin(auth, site.id, { is_active: next });
    setToggleBusyId(null);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === site.id ? res.site : r)));
  };

  const onCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    setCreateBusy(true);
    setError(null);
    const res = await createSiteForAdmin(auth, {
      name,
      is_active: true,
      city: createCity.trim() || null,
    });
    setCreateBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setCreateOpen(false);
    setCreateName('');
    setCreateCity('');
    await load();
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setError(null);
    const res = await deleteSiteForAdmin(auth, deleteTarget.id);
    setDeleteBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setDeleteTarget(null);
    await load();
  };

  return (
    <Stack gap="md" data-testid="widget-admin-sites">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={1}>Sites</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Lieux d’activité : nom, ville et état actif/inactif.
          </Text>
        </div>
        <Group gap="sm">
          <Button variant="default" leftSection={<RefreshCw size={16} />} onClick={() => void load()} loading={busy}>
            Actualiser
          </Button>
          <Button onClick={() => setCreateOpen(true)} disabled={busy}>
            Nouveau site
          </Button>
        </Group>
      </Group>

      {error ? <CashflowClientErrorAlert error={error} /> : null}

      <Paper withBorder p={0}>
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Ville</Table.Th>
              <Table.Th>Actif</Table.Th>
              <Table.Th>Créé le</Table.Th>
              <Table.Th> </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 && !busy ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text size="sm" c="dimmed" py="md" ta="center">
                    Aucun site renvoyé par le serveur pour le moment.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
            {rows.map((s) => (
              <Table.Tr key={s.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {s.name}
                  </Text>
                  {s.address ? (
                    <Text size="xs" c="dimmed">
                      {s.address}
                    </Text>
                  ) : null}
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{s.city ?? '—'}</Text>
                </Table.Td>
                <Table.Td>
                  <Switch
                    checked={s.is_active}
                    onChange={(e) => void onToggleActive(s, e.currentTarget.checked)}
                    disabled={toggleBusyId === s.id || busy}
                    aria-label={`Site ${s.name} actif`}
                  />
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDate(s.created_at)}</Text>
                </Table.Td>
                <Table.Td>
                  <Button size="xs" variant="light" color="red" onClick={() => setDeleteTarget(s)}>
                    Supprimer
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau site">
        <Stack gap="sm">
          <TextInput label="Nom" required value={createName} onChange={(e) => setCreateName(e.currentTarget.value)} />
          <TextInput label="Ville (optionnel)" value={createCity} onChange={(e) => setCreateCity(e.currentTarget.value)} />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void onCreate()} loading={createBusy} disabled={!createName.trim()}>
              Créer
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le site ?"
      >
        {deleteTarget ? (
          <Stack gap="sm">
            <Text size="sm">
              Le site « {deleteTarget.name} » sera supprimé définitivement si aucune donnée liée ne bloque
              l’opération.
            </Text>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setDeleteTarget(null)}>
                Annuler
              </Button>
              <Button color="red" onClick={() => void onConfirmDelete()} loading={deleteBusy}>
                Supprimer
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </Stack>
  );
}
