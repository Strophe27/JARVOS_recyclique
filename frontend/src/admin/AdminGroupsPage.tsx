/**
 * Page admin Groupes — Story 11.6.
 * Route : /admin/groups. GET /v1/admin/groups, GET /v1/admin/groups/{id}, CRUD, liaison groupe–permissions, groupe–utilisateurs.
 * Rendu Mantine 1.4.4 (Card, Stack, Title).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Stack,
  Text,
  Card,
  Alert,
  Loader,
  Table,
  Group,
  Button,
  Modal,
  TextInput,
  ActionIcon,
} from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  getAdminGroups,
  getAdminGroup,
  createAdminGroup,
  updateAdminGroup,
  deleteAdminGroup,
  type AdminGroup,
  type AdminGroupDetail,
} from '../api/adminGroups';
import { PageContainer, PageSection } from '../shared/layout';

export function AdminGroupsPage() {
  const { accessToken, permissions } = useAuth();
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [detail, setDetail] = useState<AdminGroupDetail | null>(null);

  const canAccess = permissions.includes('admin') || permissions.includes('super_admin');

  const load = useCallback(async () => {
    if (!accessToken || !canAccess) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminGroups(accessToken);
      setGroups(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, canAccess]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setModalOpen(true);
  };

  const openEdit = (g: AdminGroup) => {
    setEditingId(g.id);
    setName(g.name);
    setDescription(g.description ?? '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!accessToken || !name.trim()) return;
    setSaveLoading(true);
    setError(null);
    try {
      if (editingId) {
        await updateAdminGroup(accessToken, editingId, { name: name.trim(), description: description.trim() || null });
      } else {
        await createAdminGroup(accessToken, { name: name.trim(), description: description.trim() || null });
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (g: AdminGroup) => {
    if (!accessToken || !window.confirm(`Supprimer le groupe « ${g.name} » ?`)) return;
    setError(null);
    try {
      await deleteAdminGroup(accessToken, g.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur suppression');
    }
  };

  const loadDetail = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      try {
        const d = await getAdminGroup(accessToken, id);
        setDetail(d);
      } catch {
        setDetail(null);
      }
    },
    [accessToken]
  );

  if (!canAccess) {
    return (
      <div data-testid="admin-groups-forbidden">
        <Text>Accès réservé aux administrateurs.</Text>
      </div>
    );
  }

  return (
    <PageContainer title="Groupes" maxWidth={1200} testId="admin-groups-page">
      <Text size="sm" c="dimmed" mb="xs">
        Gestion des groupes et liaisons avec les permissions et utilisateurs (§7.11).
      </Text>
      {error && <Alert color="red">{error}</Alert>}

      <PageSection>
        <Card withBorder padding="md" radius="md">
        <Group justify="space-between" mb="md">
          <Text fw={500}>Liste des groupes</Text>
          <Button size="sm" onClick={openCreate} data-testid="admin-groups-create">
            Créer un groupe
          </Button>
        </Group>
        {loading ? (
          <Loader size="sm" data-testid="admin-groups-loading" />
        ) : (
          <Table striped highlightOnHover data-testid="admin-groups-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {groups.map((g) => (
                <Table.Tr key={g.id} data-testid={`group-row-${g.id}`}>
                  <Table.Td>{g.name}</Table.Td>
                  <Table.Td>{g.description ?? '—'}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        variant="light"
                        size="xs"
                        onClick={() => loadDetail(g.id)}
                        data-testid={`group-detail-${g.id}`}
                      >
                        Détail
                      </Button>
                      <Button
                        variant="light"
                        size="xs"
                        onClick={() => openEdit(g)}
                        data-testid={`group-edit-${g.id}`}
                      >
                        Modifier
                      </Button>
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="sm"
                        onClick={() => handleDelete(g)}
                        data-testid={`group-delete-${g.id}`}
                        aria-label="Supprimer"
                      >
                        —
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
        {groups.length === 0 && !loading && (
          <Text size="sm" c="dimmed" data-testid="admin-groups-empty">
            Aucun groupe.
          </Text>
        )}
        </Card>
      </PageSection>

      {detail && (
        <PageSection>
          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" mb="xs">
              <Text fw={500}>Détail : {detail.name}</Text>
              <Button variant="subtle" size="xs" onClick={() => setDetail(null)}>
                Fermer
              </Button>
            </Group>
            <Text size="sm" c="dimmed">
              Permissions : {detail.permission_ids.length}. Utilisateurs : {detail.user_ids.length}.
            </Text>
          </Card>
        </PageSection>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Modifier le groupe' : 'Nouveau groupe'}
        data-testid="modal-group-form"
      >
        <Stack gap="sm">
          <TextInput
            label="Nom"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            data-testid="input-group-name"
            required
          />
          <TextInput
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            data-testid="input-group-description"
          />
          <Group>
            <Button loading={saveLoading} onClick={handleSave} disabled={!name.trim()} data-testid="btn-group-save">
              Enregistrer
            </Button>
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
          </Group>
        </Stack>
      </Modal>
    </PageContainer>
  );
}
