/**
 * Page liste utilisateurs admin — Story 8.1.
 * Route : /admin/users. Table Mantine, filtres rôle/statut, pagination, onglet En attente.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Table, Select, Button, Tabs, Alert, Loader, Group, Card } from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  getAdminUsers,
  getAdminUsersPending,
  getAdminUsersStatuses,
  approveRegistration,
  rejectRegistration,
  type AdminUser,
  type AdminPendingUser,
} from '../api/adminUsers';
import { PageContainer } from '../shared/layout';

const PAGE_SIZE = 20;

export function AdminUsersListPage() {
  const { accessToken, permissions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'list';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pending, setPending] = useState<AdminPendingUser[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadUsers = useCallback(async () => {
    if (!accessToken || !permissions.includes('admin')) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getAdminUsers(accessToken, {
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setUsers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, permissions, roleFilter, statusFilter, page]);

  const loadPending = useCallback(async () => {
    if (!accessToken || !permissions.includes('admin')) return;
    setPendingLoading(true);
    setError(null);
    try {
      const list = await getAdminUsersPending(accessToken);
      setPending(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement pending');
    } finally {
      setPendingLoading(false);
    }
  }, [accessToken, permissions]);

  const loadStatuses = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await getAdminUsersStatuses(accessToken);
      setOnlineIds(new Set(res.online_user_ids));
    } catch {
      setOnlineIds(new Set());
    }
  }, [accessToken]);

  useEffect(() => {
    if (tab === 'list') loadUsers();
    else if (tab === 'pending') loadPending();
  }, [tab, loadUsers, loadPending]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const handleApprove = async (requestId: string) => {
    if (!accessToken) return;
    try {
      await approveRegistration(accessToken, requestId);
      loadPending();
      loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur approbation');
    }
  };

  const handleReject = async (requestId: string) => {
    if (!accessToken) return;
    try {
      await rejectRegistration(accessToken, requestId);
      loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur rejet');
    }
  };

  if (!permissions.includes('admin')) {
    return (
      <div data-testid="admin-users-forbidden">
        <p>Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <PageContainer title="Utilisateurs" maxWidth={1200} testId="admin-users-list-page">
      <Group justify="flex-end">
        <Button
          component={Link}
          to="/admin/users/new"
          data-testid="admin-users-new"
          variant="filled"
        >
          Nouveau
        </Button>
      </Group>

      <Card withBorder padding="md" radius="md">
      <Tabs
        value={tab}
        onChange={(v) => setSearchParams(v ? { tab: v } : {})}
      >
        <Tabs.List>
          <Tabs.Tab value="list" data-testid="tab-list">
            Liste
          </Tabs.Tab>
          <Tabs.Tab value="pending" data-testid="tab-pending">
            En attente
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="list">
          <Group mb="sm">
            <Select
              placeholder="Rôle"
              clearable
              data={[
                { value: 'operator', label: 'Opérateur' },
                { value: 'admin', label: 'Admin' },
              ]}
              value={roleFilter}
              onChange={setRoleFilter}
              data-testid="filter-role"
            />
            <Select
              placeholder="Statut"
              clearable
              data={[
                { value: 'active', label: 'Actif' },
                { value: 'pending', label: 'En attente' },
                { value: 'inactive', label: 'Inactif' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              data-testid="filter-status"
            />
            <Button variant="subtle" onClick={() => { setRoleFilter(null); setStatusFilter(null); }}>
              Réinitialiser
            </Button>
          </Group>
          {error && <Alert color="red">{error}</Alert>}
          {loading ? (
            <Loader size="sm" data-testid="admin-users-loading" />
          ) : (
            <Table striped highlightOnHover data-testid="admin-users-table">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nom</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Rôle</Table.Th>
                  <Table.Th>Statut</Table.Th>
                  <Table.Th>En ligne</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td>
                      {u.first_name || u.last_name
                        ? [u.first_name, u.last_name].filter(Boolean).join(' ')
                        : u.username}
                    </Table.Td>
                    <Table.Td>{u.email}</Table.Td>
                    <Table.Td>{u.role}</Table.Td>
                    <Table.Td>{u.status}</Table.Td>
                    <Table.Td>{onlineIds.has(u.id) ? 'Oui' : 'Non'}</Table.Td>
                    <Table.Td>
                      <Button
                        component={Link}
                        to={`/admin/users/${u.id}`}
                        variant="light"
                        size="xs"
                      >
                        Détail
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          {!loading && users.length === 0 && (
            <p data-testid="admin-users-empty">Aucun utilisateur.</p>
          )}
          {!loading && (users.length > 0 || page > 1) && (
            <Group gap="sm" mt="md" data-testid="admin-users-pagination">
              <Button
                variant="subtle"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                data-testid="pagination-prev"
              >
                Précédent
              </Button>
              <span data-testid="pagination-page">Page {page}</span>
              <Button
                variant="subtle"
                size="sm"
                disabled={users.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}
                data-testid="pagination-next"
              >
                Suivant
              </Button>
            </Group>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="pending">
          {error && <Alert color="red">{error}</Alert>}
          {pendingLoading ? (
            <Loader size="sm" data-testid="admin-pending-loading" />
          ) : (
            <Table striped data-testid="admin-pending-table">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nom</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Demandé le</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pending.map((p) => (
                  <Table.Tr key={p.id}>
                    <Table.Td>
                      {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.username}
                    </Table.Td>
                    <Table.Td>{p.email}</Table.Td>
                    <Table.Td>{new Date(p.requested_at).toLocaleString()}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          color="green"
                          data-testid={`approve-${p.id}`}
                          onClick={() => handleApprove(p.id)}
                        >
                          Approuver
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          data-testid={`reject-${p.id}`}
                          onClick={() => handleReject(p.id)}
                        >
                          Rejeter
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          {!pendingLoading && pending.length === 0 && (
            <p data-testid="admin-pending-empty">Aucune inscription en attente.</p>
          )}
        </Tabs.Panel>
      </Tabs>
      </Card>
    </PageContainer>
  );
}
