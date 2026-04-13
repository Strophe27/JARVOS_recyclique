import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { ChevronDown, ChevronRight, Lock, Pencil, Plus, RefreshCw, Trash2, UserMinus, Users, X } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  deleteAdminGroup,
  deleteAdminGroupPermission,
  deleteAdminGroupUser,
  getAdminGroupById,
  getAdminGroupsList,
  postAdminGroupAddPermissions,
  postAdminGroupAddUsers,
  postAdminGroupCreate,
  putAdminGroupUpdate,
  type AdminGroupDetailDto,
  type AdminGroupListItemDto,
} from '../../api/admin-groups-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from '../cashflow/CashflowClientErrorAlert';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';

const PAGE_LIMIT = 25;

/** Libellés courts alignés sur l’ancien écran groupes (carte statique connue, pas un catalogue serveur). */
function permissionShortLabel(permissionName: string): string {
  const map: Record<string, string> = {
    'caisse.access': 'Caisse',
    'caisse.virtual.access': 'Caisse virtuelle',
    'caisse.deferred.access': 'Caisse différée',
    'reception.access': 'Réception',
    'admin.users.manage': 'Gestion des comptes',
    'admin.groups.manage': 'Gestion des groupes',
    'reports.view': 'Consultation des rapports',
    'reports.export': 'Export des rapports',
  };
  return map[permissionName] ?? permissionName;
}

function parseIdLines(raw: string): string[] {
  const parts = raw.split(/\r?\n|,|;/).map((s) => s.trim()).filter(Boolean);
  return [...new Set(parts)];
}

/**
 * Groupes admin — API liste / détail / CRUD + rattachements permissions et membres.
 * Par rapport à l’écran historique : pas de liste globale permissions / utilisateurs dans le contrat actuel,
 * donc pas de sélection guidée équivalente aux anciens menus déroulants.
 */
export function AdminGroupsWidget(_: RegisteredWidgetProps): ReactNode {
  const auth = useAuthPort();
  useContextEnvelope();

  const [skip, setSkip] = useState(0);
  const [rows, setRows] = useState<readonly AdminGroupListItemDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AdminGroupDetailDto | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createKey, setCreateKey] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [permLines, setPermLines] = useState('');
  const [userLines, setUserLines] = useState('');
  const [detailTab, setDetailTab] = useState<'resume' | 'permissions' | 'membres'>('resume');
  const [showPermissionRefs, setShowPermissionRefs] = useState(false);
  const [advancedAddPermsOpen, setAdvancedAddPermsOpen] = useState(false);
  const [advancedAddUsersOpen, setAdvancedAddUsersOpen] = useState(false);
  const [createOptionsOpen, setCreateOptionsOpen] = useState(false);

  const loadList = useCallback(async () => {
    setBusy(true);
    setError(null);
    const res = await getAdminGroupsList(auth, { skip, limit: PAGE_LIMIT });
    if (!res.ok) {
      setRows([]);
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      setBusy(false);
      return;
    }
    setRows(res.data);
    setBusy(false);
  }, [auth, skip]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openDetail = async (id: string, tab: 'resume' | 'permissions' | 'membres' = 'resume') => {
    setDetailTab(tab);
    setShowPermissionRefs(false);
    setAdvancedAddPermsOpen(false);
    setAdvancedAddUsersOpen(false);
    setDetailOpen(true);
    setDetailBusy(true);
    setDetail(null);
    setPermLines('');
    setUserLines('');
    const res = await getAdminGroupById(auth, id);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      setDetailBusy(false);
      setDetailOpen(false);
      return;
    }
    setDetail(res.data);
    setDetailBusy(false);
  };

  const refreshDetail = async (id: string) => {
    setDetailBusy(true);
    const res = await getAdminGroupById(auth, id);
    setDetailBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setDetail(res.data);
  };

  const onCreate = async () => {
    const name = createName.trim();
    if (name.length < 1) return;
    setBusy(true);
    setError(null);
    const res = await postAdminGroupCreate(auth, {
      name,
      description: createDescription.trim() || null,
      key: createKey.trim() || null,
    });
    setBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setCreateOpen(false);
    setCreateName('');
    setCreateDescription('');
    setCreateKey('');
    await loadList();
    await openDetail(res.data.id);
  };

  const onEdit = async () => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    const res = await putAdminGroupUpdate(auth, detail.id, {
      name: editName.trim() || undefined,
      description: editDescription.trim() || null,
    });
    setBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setEditOpen(false);
    setDetail(res.data);
    await loadList();
  };

  const onDeleteGroup = async () => {
    if (!detail) return;
    if (!window.confirm(`Supprimer le groupe « ${detail.name} » ? Cette action est définitive.`)) return;
    setBusy(true);
    setError(null);
    const res = await deleteAdminGroup(auth, detail.id);
    setBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setDetailOpen(false);
    setDetail(null);
    await loadList();
  };

  const onDeleteGroupById = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Supprimer le groupe « ${groupName} » ? Cette action est définitive.`)) return;
    setBusy(true);
    setError(null);
    const res = await deleteAdminGroup(auth, groupId);
    setBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    if (detail?.id === groupId) {
      setDetailOpen(false);
      setDetail(null);
    }
    await loadList();
  };

  const onRemovePermission = async (permissionId: string) => {
    if (!detail) return;
    if (!window.confirm('Retirer ce droit du groupe ?')) return;
    setDetailBusy(true);
    setError(null);
    const res = await deleteAdminGroupPermission(auth, detail.id, permissionId);
    setDetailBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setDetail(res.data);
    await loadList();
  };

  const onRemoveUser = async (userId: string) => {
    if (!detail) return;
    if (!window.confirm('Retirer cet utilisateur du groupe ?')) return;
    setDetailBusy(true);
    setError(null);
    const res = await deleteAdminGroupUser(auth, detail.id, userId);
    setDetailBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setDetail(res.data);
    await loadList();
  };

  const onAddPermissions = async () => {
    if (!detail) return;
    const ids = parseIdLines(permLines);
    if (ids.length === 0) return;
    setDetailBusy(true);
    setError(null);
    const res = await postAdminGroupAddPermissions(auth, detail.id, ids);
    setDetailBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setDetail(res.data);
    setPermLines('');
    await loadList();
  };

  const onAddUsers = async () => {
    if (!detail) return;
    const ids = parseIdLines(userLines);
    if (ids.length === 0) return;
    setDetailBusy(true);
    setError(null);
    const res = await postAdminGroupAddUsers(auth, detail.id, ids);
    setDetailBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setDetail(res.data);
    setUserLines('');
    await loadList();
  };

  const openEditModal = () => {
    if (!detail) return;
    setEditName(detail.name);
    setEditDescription(detail.description ?? '');
    setEditOpen(true);
  };

  const canPrev = skip > 0;
  const canNext = rows.length === PAGE_LIMIT;

  return (
    <Stack gap="md" data-testid="widget-admin-groups-demo">
      <div data-testid="admin-groups-operation-anchor">
        <Title order={2}>Gestion des Groupes</Title>
      </div>

      {error ? <CashflowClientErrorAlert error={error} /> : null}

      <Paper withBorder p="md">
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <Button
              size="xs"
              variant="default"
              leftSection={<RefreshCw size={14} />}
              loading={busy}
              onClick={() => void loadList()}
            >
              Actualiser
            </Button>
            <Button
              size="xs"
              leftSection={<Plus size={14} />}
              onClick={() => {
                setCreateOpen(true);
              }}
            >
              Créer un groupe
            </Button>
          </Group>
          <Group gap="xs">
            <Button size="xs" variant="default" disabled={!canPrev} onClick={() => setSkip((s) => Math.max(0, s - PAGE_LIMIT))}>
              Précédent
            </Button>
            <Button size="xs" variant="default" disabled={!canNext} onClick={() => setSkip((s) => s + PAGE_LIMIT)}>
              Suivant
            </Button>
          </Group>
        </Group>

        <Table striped highlightOnHover data-testid="admin-groups-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Utilisateurs</Table.Th>
              <Table.Th>Permissions</Table.Th>
              <Table.Th w={200}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((g) => (
              <Table.Tr key={g.id} data-testid={`admin-groups-row-${g.id}`}>
                <Table.Td>{g.name}</Table.Td>
                <Table.Td>{g.description || '—'}</Table.Td>
                <Table.Td>
                  <Badge variant="light">{g.user_ids.length}</Badge>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light">{g.permission_ids.length}</Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      aria-label={`Modifier ${g.name}`}
                      onClick={() => void openDetail(g.id, 'resume')}
                    >
                      <Pencil size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="green"
                      aria-label={`Membres de ${g.name}`}
                      onClick={() => void openDetail(g.id, 'membres')}
                    >
                      <Users size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="violet"
                      aria-label={`Droits de ${g.name}`}
                      onClick={() => void openDetail(g.id, 'permissions')}
                    >
                      <Lock size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Supprimer ${g.name}`}
                      onClick={() => void onDeleteGroupById(g.id, g.name)}
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {rows.length === 0 && !busy ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text size="sm" c="dimmed">
                    Aucun groupe.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal
        opened={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateOptionsOpen(false);
        }}
        title="Créer un groupe"
        size="md"
      >
        <Stack gap="sm">
          <TextInput
            label="Nom du groupe"
            placeholder="Ex. Équipe caisse"
            required
            value={createName}
            onChange={(e) => setCreateName(e.currentTarget.value)}
          />
          <Textarea
            label="Description"
            placeholder="Optionnel"
            value={createDescription}
            onChange={(e) => setCreateDescription(e.currentTarget.value)}
            minRows={2}
          />
          <Box>
            <UnstyledButton type="button" onClick={() => setCreateOptionsOpen((o) => !o)} py={4}>
              <Group gap={6} wrap="nowrap">
                {createOptionsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Text size="sm" fw={500}>
                  Options rarement nécessaires
                </Text>
              </Group>
            </UnstyledButton>
            <Collapse in={createOptionsOpen}>
              <TextInput
                mt="xs"
                label="Code court du groupe"
                description="Réservé aux cas particuliers déjà documentés pour votre association."
                value={createKey}
                onChange={(e) => setCreateKey(e.currentTarget.value)}
              />
            </Collapse>
          </Box>
          <Button loading={busy} onClick={() => void onCreate()}>
            Créer
          </Button>
        </Stack>
      </Modal>

      <Modal opened={editOpen} onClose={() => setEditOpen(false)} title="Modifier le groupe" size="md">
        <Stack gap="sm">
          <TextInput label="Nom du groupe" value={editName} onChange={(e) => setEditName(e.currentTarget.value)} />
          <Textarea label="Description" value={editDescription} onChange={(e) => setEditDescription(e.currentTarget.value)} minRows={2} />
          <Button loading={busy} onClick={() => void onEdit()}>
            Enregistrer
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
          setShowPermissionRefs(false);
          setAdvancedAddPermsOpen(false);
          setAdvancedAddUsersOpen(false);
        }}
        title={detail ? detail.name : 'Groupe'}
        size="xl"
      >
        {detailBusy && !detail ? <Text size="sm">Chargement…</Text> : null}
        {detail ? (
          <Stack gap="sm" data-testid={`admin-groups-detail-${detail.id}`}>
            <Tabs
              value={detailTab}
              onChange={(v) => {
                if (v === 'resume' || v === 'permissions' || v === 'membres') setDetailTab(v);
              }}
              data-testid="admin-groups-detail-tabs"
            >
              <Tabs.List>
                <Tabs.Tab value="resume">Fiche</Tabs.Tab>
                <Tabs.Tab value="permissions" leftSection={<Lock size={14} />}>
                  Droits
                </Tabs.Tab>
                <Tabs.Tab value="membres" leftSection={<Users size={14} />}>
                  Membres
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="resume" pt="md">
                <Stack gap="md">
                  {detail.display_name?.trim() && detail.display_name.trim() !== detail.name ? (
                    <Text size="sm">
                      <Text span fw={600}>
                        Nom affiché :{' '}
                      </Text>
                      {detail.display_name}
                    </Text>
                  ) : null}
                  <Text size="sm" c="dimmed">
                    {detail.description?.trim() ? detail.description : 'Pas de description.'}
                  </Text>
                  <Group gap="md">
                    <Badge variant="light" size="lg">
                      {detail.users.length} membre{detail.users.length === 1 ? '' : 's'}
                    </Badge>
                    <Badge variant="light" size="lg" color="violet">
                      {detail.permissions.length} droit{detail.permissions.length === 1 ? '' : 's'}
                    </Badge>
                  </Group>
                  <Group gap="xs">
                    <Button size="xs" variant="light" leftSection={<Pencil size={14} />} onClick={openEditModal}>
                      Modifier le nom ou la description
                    </Button>
                    <Button size="xs" color="red" variant="light" leftSection={<Trash2 size={14} />} onClick={() => void onDeleteGroup()}>
                      Supprimer ce groupe
                    </Button>
                    <ActionIcon variant="subtle" onClick={() => void refreshDetail(detail.id)} aria-label="Actualiser">
                      <RefreshCw size={16} />
                    </ActionIcon>
                  </Group>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="permissions" pt="md">
                <Stack gap="sm">
                  <Table striped withTableBorder data-testid="admin-groups-detail-permissions">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Droit</Table.Th>
                        <Table.Th w={60} />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {detail.permissions.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={2}>
                            <Text size="sm" c="dimmed">
                              Aucun droit attaché pour l&apos;instant.
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : null}
                      {[...detail.permissions]
                        .sort((a, b) =>
                          permissionShortLabel(a.name).localeCompare(permissionShortLabel(b.name), 'fr', {
                            sensitivity: 'base',
                          }),
                        )
                        .map((p) => (
                          <Table.Tr key={p.id} data-testid={`admin-groups-perm-${p.id}`}>
                            <Table.Td>
                              <Stack gap={4}>
                                <Text size="sm" fw={500}>
                                  {permissionShortLabel(p.name)}
                                </Text>
                                {permissionShortLabel(p.name) !== p.name ? (
                                  <Text size="xs" c="dimmed">
                                    {p.name}
                                  </Text>
                                ) : null}
                                {p.description?.trim() ? (
                                  <Text size="xs" c="dimmed">
                                    {p.description}
                                  </Text>
                                ) : null}
                                {showPermissionRefs ? (
                                  <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                                    {p.id}
                                  </Text>
                                ) : null}
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                size="sm"
                                aria-label={`Retirer le droit ${permissionShortLabel(p.name)}`}
                                onClick={() => void onRemovePermission(p.id)}
                              >
                                <X size={16} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                    </Table.Tbody>
                  </Table>
                  <UnstyledButton type="button" onClick={() => setShowPermissionRefs((o) => !o)} py={4}>
                    <Group gap={6} wrap="nowrap">
                      {showPermissionRefs ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <Text size="sm">
                        {showPermissionRefs ? 'Masquer les informations supplémentaires' : 'Afficher les informations supplémentaires'}
                      </Text>
                    </Group>
                  </UnstyledButton>

                  <Box>
                    <UnstyledButton type="button" onClick={() => setAdvancedAddPermsOpen((o) => !o)} py={4}>
                      <Group gap={6} wrap="nowrap">
                        {advancedAddPermsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <Text size="sm" fw={500}>
                          Ajouter d&apos;autres droits à la main
                        </Text>
                      </Group>
                    </UnstyledButton>
                    <Collapse in={advancedAddPermsOpen}>
                      <Text size="xs" c="dimmed" mb="xs">
                        Une valeur par ligne, ou plusieurs séparées par une virgule. À utiliser seulement si une
                        personne référente vous a transmis la liste exacte attendue.
                      </Text>
                      <Textarea
                        aria-label="Saisie manuelle des droits à ajouter"
                        value={permLines}
                        onChange={(e) => setPermLines(e.currentTarget.value)}
                        minRows={3}
                      />
                      <Button mt="xs" size="xs" loading={detailBusy} onClick={() => void onAddPermissions()}>
                        Ajouter à partir de la saisie
                      </Button>
                    </Collapse>
                  </Box>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="membres" pt="md">
                <Stack gap="sm">
                  <Table striped withTableBorder data-testid="admin-groups-detail-users">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Compte</Table.Th>
                        <Table.Th>Coordonnées</Table.Th>
                        <Table.Th>Rôle</Table.Th>
                        <Table.Th w={60} />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {detail.users.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={4}>
                            <Text size="sm" c="dimmed">
                              Aucun membre pour l&apos;instant.
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : null}
                      {[...detail.users]
                        .sort((a, b) => a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' }))
                        .map((u) => (
                          <Table.Tr key={u.id} data-testid={`admin-groups-user-${u.id}`}>
                            <Table.Td>
                              <Text size="sm" fw={500}>
                                {u.username}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {u.email?.trim() ? (
                                <Text size="sm" c="dimmed">
                                  {u.email}
                                </Text>
                              ) : (
                                <Text size="sm" c="dimmed">
                                  —
                                </Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">
                                {u.role === 'user'
                                  ? 'Bénévole'
                                  : u.role === 'admin'
                                    ? 'Administrateur'
                                    : (u.role ?? '—')}
                              </Text>
                              {u.status?.trim() ? (
                                <Text size="xs" c="dimmed">
                                  {u.status}
                                </Text>
                              ) : null}
                            </Table.Td>
                            <Table.Td>
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                size="sm"
                                aria-label={`Retirer ${u.username} du groupe`}
                                onClick={() => void onRemoveUser(u.id)}
                              >
                                <UserMinus size={16} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                    </Table.Tbody>
                  </Table>

                  <Box>
                    <UnstyledButton type="button" onClick={() => setAdvancedAddUsersOpen((o) => !o)} py={4}>
                      <Group gap={6} wrap="nowrap">
                        {advancedAddUsersOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <Text size="sm" fw={500}>
                          Ajouter des membres à la main
                        </Text>
                      </Group>
                    </UnstyledButton>
                    <Collapse in={advancedAddUsersOpen}>
                      <Text size="xs" c="dimmed" mb="xs">
                        Une valeur par ligne, ou plusieurs séparées par une virgule. Reprenez exactement ce que la
                        personne référente vous a indiqué pour chaque compte.
                      </Text>
                      <Textarea
                        aria-label="Saisie manuelle des membres à ajouter"
                        value={userLines}
                        onChange={(e) => setUserLines(e.currentTarget.value)}
                        minRows={3}
                      />
                      <Button mt="xs" size="xs" loading={detailBusy} onClick={() => void onAddUsers()}>
                        Ajouter à partir de la saisie
                      </Button>
                    </Collapse>
                  </Box>
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Stack>
        ) : null}
      </Modal>
    </Stack>
  );
}
