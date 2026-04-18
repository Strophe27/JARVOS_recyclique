import {
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createCashRegisterForAdmin,
  deleteCashRegisterForAdmin,
  listCashRegistersForAdmin,
  updateCashRegisterForAdmin,
  type CashRegisterAdminRowDto,
} from '../../api/admin-cash-registers-client';
import { getCashRegistersStatus } from '../../api/cash-session-client';
import { listSitesForAdmin, type SiteAdminRowDto } from '../../api/admin-sites-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from '../cashflow/CashflowClientErrorAlert';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';

type OpenByRegisterId = Map<string, boolean>;

/**
 * Postes de caisse : lecture serveur, état de session ouverte, options courantes et création/suppression.
 */
export function AdminCashRegistersWidget(_: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  const [rows, setRows] = useState<readonly CashRegisterAdminRowDto[]>([]);
  const [sites, setSites] = useState<readonly SiteAdminRowDto[]>([]);
  const [openByRegister, setOpenByRegister] = useState<OpenByRegisterId>(new Map());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSiteId, setCreateSiteId] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CashRegisterAdminRowDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const siteNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sites) m.set(s.id, s.name);
    return m;
  }, [sites]);

  const siteSelectData = useMemo(
    () => [{ value: '', label: 'Sans site rattaché' }, ...sites.map((s) => ({ value: s.id, label: s.name }))],
    [sites],
  );

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    const [regRes, siteRes, stRes] = await Promise.all([
      listCashRegistersForAdmin(auth, { limit: 200 }),
      listSitesForAdmin(auth, { limit: 200 }),
      getCashRegistersStatus(auth),
    ]);
    if (!regRes.ok) {
      setRows([]);
      setSites([]);
      setOpenByRegister(new Map());
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(regRes) });
      setBusy(false);
      return;
    }
    setRows(regRes.data);
    setSites(siteRes.ok ? siteRes.data : []);
    const openMap: OpenByRegisterId = new Map();
    if (stRes.ok) {
      for (const r of stRes.rows) openMap.set(r.id, r.is_open);
    }
    setOpenByRegister(openMap);
    const firstErr = !siteRes.ok ? siteRes : !stRes.ok ? stRes : null;
    if (firstErr) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(firstErr) });
    }
    setBusy(false);
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchField = async (
    row: CashRegisterAdminRowDto,
    patch: Partial<{
      is_active: boolean;
      enable_virtual: boolean;
      enable_deferred: boolean;
    }>,
  ) => {
    setPatchingId(row.id);
    setError(null);
    const res = await updateCashRegisterForAdmin(auth, row.id, patch);
    setPatchingId(null);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? res.register : r)));
  };

  const onCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    setCreateBusy(true);
    setError(null);
    const res = await createCashRegisterForAdmin(auth, {
      name,
      is_active: true,
      site_id: createSiteId && createSiteId !== '' ? createSiteId : null,
      workflow_options: {},
      enable_virtual: false,
      enable_deferred: false,
    });
    setCreateBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setCreateOpen(false);
    setCreateName('');
    setCreateSiteId(null);
    await load();
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setError(null);
    const res = await deleteCashRegisterForAdmin(auth, deleteTarget.id);
    setDeleteBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setDeleteTarget(null);
    await load();
  };

  return (
    <Stack gap="md" data-testid="widget-admin-cash-registers">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={1}>Postes de caisse</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Paramètres des postes pour la vente : rattachement au site, modes particuliers, session ouverte ou fermée.
          </Text>
        </div>
        <Group gap="sm">
          <Button variant="default" leftSection={<RefreshCw size={16} />} onClick={() => void load()} loading={busy}>
            Actualiser
          </Button>
          <Button onClick={() => setCreateOpen(true)} disabled={busy}>
            Nouveau poste
          </Button>
        </Group>
      </Group>

      {error ? <CashflowClientErrorAlert error={error} /> : null}

      <Paper withBorder p={0}>
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Emplacement</Table.Th>
              <Table.Th>Site</Table.Th>
              <Table.Th>Actif</Table.Th>
              <Table.Th>Virtuelle</Table.Th>
              <Table.Th>Différée</Table.Th>
              <Table.Th>Session</Table.Th>
              <Table.Th> </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 && !busy ? (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Text size="sm" c="dimmed" py="md" ta="center">
                    Aucun poste renvoyé par le serveur pour le moment.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
            {rows.map((r) => {
              const sid = r.site_id ?? null;
              const siteLabel = sid ? siteNameById.get(sid) ?? sid.slice(0, 8) : '—';
              const isOpen = openByRegister.get(r.id) ?? false;
              const patching = patchingId === r.id;
              return (
                <Table.Tr key={r.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {r.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{r.location ?? '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{siteLabel}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Switch
                      checked={r.is_active}
                      onChange={(e) => void patchField(r, { is_active: e.currentTarget.checked })}
                      disabled={patching || busy}
                      aria-label={`Poste ${r.name} actif`}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Switch
                      checked={r.enable_virtual}
                      onChange={(e) => void patchField(r, { enable_virtual: e.currentTarget.checked })}
                      disabled={patching || busy}
                      aria-label={`Poste ${r.name} virtuel`}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Switch
                      checked={r.enable_deferred}
                      onChange={(e) => void patchField(r, { enable_deferred: e.currentTarget.checked })}
                      disabled={patching || busy}
                      aria-label={`Poste ${r.name} différé`}
                    />
                  </Table.Td>
                  <Table.Td>
                    {isOpen ? (
                      <Badge color="green" variant="light">
                        Ouverte
                      </Badge>
                    ) : (
                      <Badge color="gray" variant="light">
                        Fermée
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Button size="xs" variant="light" color="red" onClick={() => setDeleteTarget(r)}>
                      Supprimer
                    </Button>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau poste de caisse">
        <Stack gap="sm">
          <TextInput label="Nom" required value={createName} onChange={(e) => setCreateName(e.currentTarget.value)} />
          <Select
            label="Site rattaché"
            data={siteSelectData}
            value={createSiteId ?? ''}
            onChange={(v) => setCreateSiteId(v === '' || v === null ? null : v)}
            clearable={false}
          />
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
        title="Supprimer le poste ?"
      >
        {deleteTarget ? (
          <Stack gap="sm">
            <Text size="sm">
              Le poste « {deleteTarget.name} » sera supprimé si aucune session ou autre donnée ne bloque
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
