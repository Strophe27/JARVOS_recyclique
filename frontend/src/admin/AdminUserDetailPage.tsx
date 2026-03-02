/**
 * Page détail utilisateur admin — Story 8.1.
 * Route : /admin/users/:id. Profil, rôle, statut, groupes, historique, actions.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Stack,
  Group,
  Title,
  Text,
  Button,
  Loader,
  Alert,
  Tabs,
  Table,
  Select,
  MultiSelect,
  Modal,
  TextInput,
  Card,
} from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  getAdminUser,
  getAdminUserHistory,
  getAdminGroups,
  updateAdminUserRole,
  updateAdminUserStatus,
  updateAdminUserProfile,
  updateAdminUserGroups,
  resetAdminUserPassword,
  resetAdminUserPin,
  type AdminUserDetail,
  type AdminGroup,
  type AuditEventItem,
} from '../api/adminUsers';
import { PageContainer } from '../shared/layout';

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, permissions } = useAuth();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [history, setHistory] = useState<AuditEventItem[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetPwModal, setResetPwModal] = useState(false);
  const [resetPinModal, setResetPinModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');

  const loadUser = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoading(true);
    setError(null);
    try {
      const u = await getAdminUser(accessToken, id);
      setUser(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  const loadHistory = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const h = await getAdminUserHistory(accessToken, id);
      setHistory(h);
    } catch {
      setHistory([]);
    }
  }, [accessToken, id]);

  const loadGroups = useCallback(async () => {
    if (!accessToken) return;
    try {
      const g = await getAdminGroups(accessToken);
      setGroups(g);
    } catch {
      setGroups([]);
    }
  }, [accessToken]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (id) loadHistory();
  }, [id, loadHistory]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleRoleChange = async (role: string) => {
    if (!accessToken || !id) return;
    try {
      await updateAdminUserRole(accessToken, id, role);
      loadUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!accessToken || !id) return;
    try {
      await updateAdminUserStatus(accessToken, id, status);
      loadUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleGroupsChange = async (groupIds: string[]) => {
    if (!accessToken || !id) return;
    try {
      await updateAdminUserGroups(accessToken, id, groupIds);
      loadUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleResetPassword = async () => {
    if (!accessToken || !id || newPassword.length < 8) return;
    try {
      await resetAdminUserPassword(accessToken, id, newPassword);
      setResetPwModal(false);
      setNewPassword('');
      loadUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const handleResetPin = async () => {
    if (!accessToken || !id || newPin.length < 4 || newPin.length > 8) return;
    try {
      await resetAdminUserPin(accessToken, id, newPin);
      setResetPinModal(false);
      setNewPin('');
      loadUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  if (!permissions.includes('admin')) {
    return (
      <div data-testid="admin-user-detail-forbidden">
        <p>Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div data-testid="admin-user-detail-loading">
        <Loader size="sm" />
      </div>
    );
  }

  return (
    <PageContainer title="Detail utilisateur" maxWidth={1200} testId="admin-user-detail-page">
      <Group justify="space-between">
        <Group>
          <Button component={Link} to="/admin/users" variant="subtle" size="sm">
            ← Utilisateurs
          </Button>
          <Title order={2}>
            {user.first_name || user.last_name
              ? [user.first_name, user.last_name].filter(Boolean).join(' ')
              : user.username}
          </Title>
        </Group>
      </Group>

      {error && <Alert color="red">{error}</Alert>}

      <Card withBorder padding="md" radius="md">
        <Stack gap="sm">
          <Text size="sm" fw={500}>Profil</Text>
          <Group>
            <TextInput label="Username" value={user.username} readOnly size="sm" />
            <TextInput
              label="Email"
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              size="sm"
            />
            <TextInput
              label="Prénom"
              value={user.first_name ?? ''}
              onChange={(e) => setUser({ ...user, first_name: e.target.value || null })}
              size="sm"
            />
            <TextInput
              label="Nom"
              value={user.last_name ?? ''}
              onChange={(e) => setUser({ ...user, last_name: e.target.value || null })}
              size="sm"
            />
          </Group>
          <Button
            size="xs"
            onClick={async () => {
              if (!accessToken || !id) return;
              try {
                await updateAdminUserProfile(accessToken, id, {
                  first_name: user.first_name,
                  last_name: user.last_name,
                  email: user.email,
                });
                loadUser();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Erreur');
              }
            }}
          >
            Sauvegarder le profil
          </Button>
          <Group>
            <Select
              label="Rôle"
              value={user.role}
              data={[
                { value: 'operator', label: 'Opérateur' },
                { value: 'admin', label: 'Admin' },
                { value: 'super_admin', label: 'Super Admin' },
              ]}
              onChange={(v) => v && handleRoleChange(v)}
              size="sm"
            />
            <Select
              label="Statut"
              value={user.status}
              data={[
                { value: 'active', label: 'Actif' },
                { value: 'pending', label: 'En attente' },
                { value: 'inactive', label: 'Inactif' },
              ]}
              onChange={(v) => v && handleStatusChange(v)}
              size="sm"
            />
          </Group>
          <MultiSelect
            label="Groupes"
            placeholder="Choisir des groupes"
            data={groups.map((g) => ({ value: g.id, label: g.name }))}
            value={user.group_ids}
            onChange={handleGroupsChange}
            size="sm"
          />
          <Group>
            <Button size="xs" variant="light" onClick={() => setResetPwModal(true)}>
              Réinitialiser mot de passe
            </Button>
            <Button size="xs" variant="light" onClick={() => setResetPinModal(true)}>
              Réinitialiser PIN
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card withBorder padding="md" radius="md">
        <Tabs defaultValue="history">
        <Tabs.List>
          <Tabs.Tab value="history">Historique / Audit</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="history">
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Détails</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {history.map((evt) => (
                <Table.Tr key={evt.id}>
                  <Table.Td>{new Date(evt.timestamp).toLocaleString()}</Table.Td>
                  <Table.Td>{evt.action}</Table.Td>
                  <Table.Td>{evt.details ?? '-'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          {history.length === 0 && <Text size="sm">Aucun événement.</Text>}
        </Tabs.Panel>
      </Tabs>
      </Card>

      <Modal opened={resetPwModal} onClose={() => setResetPwModal(false)} title="Nouveau mot de passe">
        <TextInput
          label="Nouveau mot de passe"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
        />
        <Button mt="md" onClick={handleResetPassword} disabled={newPassword.length < 8}>
          Enregistrer
        </Button>
      </Modal>

      <Modal opened={resetPinModal} onClose={() => setResetPinModal(false)} title="Nouveau PIN">
        <TextInput
          label="Nouveau PIN (4-8 chiffres)"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          maxLength={8}
        />
        <Button
          mt="md"
          onClick={handleResetPin}
          disabled={newPin.length < 4 || newPin.length > 8}
        >
          Enregistrer
        </Button>
      </Modal>
    </PageContainer>
  );
}
