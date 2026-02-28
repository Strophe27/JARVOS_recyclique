/**
 * Page admin Gestionnaire de sessions caisse — Story 8.2.
 * Route : /admin/session-manager. Liste sessions avec filtres et pagination (GET /v1/cash-sessions).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  Button,
  Group,
  Alert,
  Loader,
  Select,
  TextInput,
  Card,
} from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import { getCashSessionsList, type CashSessionItem } from '../api/caisse';
import { getSites, getCashRegisters, getUsers, type Site, type CashRegister, type User } from '../api/admin';
import { PageContainer } from '../shared/layout';

const PAGE_SIZE = 20;

export function AdminSessionManagerPage() {
  const { accessToken, permissions } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<CashSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [siteFilter, setSiteFilter] = useState<string | null>(null);
  const [registerFilter, setRegisterFilter] = useState<string | null>(null);
  const [operatorFilter, setOperatorFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadSitesAndRegisters = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [s, r, u] = await Promise.all([
        getSites(accessToken),
        getCashRegisters(accessToken),
        getUsers(accessToken),
      ]);
      setSites(s);
      setRegisters(r);
      setUsers(u);
    } catch {
      setSites([]);
      setRegisters([]);
      setUsers([]);
    }
  }, [accessToken]);

  const loadSessions = useCallback(async () => {
    if (!accessToken || !permissions.includes('admin')) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getCashSessionsList(accessToken, {
        site_id: siteFilter || undefined,
        register_id: registerFilter || undefined,
        operator_id: operatorFilter || undefined,
        status: statusFilter || undefined,
        opened_at_from: dateFrom || undefined,
        opened_at_to: dateTo || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setSessions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, permissions, page, siteFilter, registerFilter, operatorFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadSitesAndRegisters();
  }, [loadSitesAndRegisters]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  if (!permissions.includes('admin')) {
    return (
      <div data-testid="admin-session-manager-forbidden">
        <p>Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <PageContainer title="Gestionnaire de sessions caisse" maxWidth={1200} testId="admin-session-manager-page">

      <Group gap="sm">
        <TextInput
          placeholder="Ouverture du"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          data-testid="filter-date-from"
        />
        <TextInput
          placeholder="au"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          data-testid="filter-date-to"
        />
        <Select
          placeholder="Site"
          clearable
          data={sites.map((s) => ({ value: s.id, label: s.name }))}
          value={siteFilter}
          onChange={setSiteFilter}
          data-testid="filter-site"
        />
        <Select
          placeholder="Poste"
          clearable
          data={registers.map((r) => ({ value: r.id, label: r.name }))}
          value={registerFilter}
          onChange={setRegisterFilter}
          data-testid="filter-register"
        />
        <Select
          placeholder="Opérateur"
          clearable
          data={users.map((u) => ({
            value: u.id,
            label: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email || u.id,
          }))}
          value={operatorFilter}
          onChange={setOperatorFilter}
          data-testid="filter-operator"
        />
        <Select
          placeholder="Statut"
          clearable
          data={[
            { value: 'open', label: 'Ouverte' },
            { value: 'closed', label: 'Clôturée' },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          data-testid="filter-status"
        />
        <Button variant="subtle" onClick={() => { setStatusFilter(null); setSiteFilter(null); setRegisterFilter(null); setOperatorFilter(null); setDateFrom(''); setDateTo(''); }}>
          Réinitialiser
        </Button>
      </Group>

      {error && <Alert color="red">{error}</Alert>}
      {loading ? (
        <Loader size="sm" data-testid="admin-sessions-loading" />
      ) : (
        <Card withBorder padding="md" radius="md">
        <Table striped highlightOnHover data-testid="admin-sessions-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Ouverture</Table.Th>
              <Table.Th>Clôture</Table.Th>
              <Table.Th>Statut</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sessions.map((s) => (
              <Table.Tr key={s.id}>
                <Table.Td>{s.id.slice(0, 8)}</Table.Td>
                <Table.Td>{new Date(s.opened_at).toLocaleString()}</Table.Td>
                <Table.Td>{s.closed_at ? new Date(s.closed_at).toLocaleString() : '—'}</Table.Td>
                <Table.Td>{s.status}</Table.Td>
                <Table.Td>{s.session_type}</Table.Td>
                <Table.Td>
                  <Button component={Link} to={`/admin/cash-sessions/${s.id}`} variant="light" size="xs" data-testid={`link-session-${s.id}`}>
                    Détail
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        </Card>
      )}
      {!loading && sessions.length === 0 && (
        <p data-testid="admin-sessions-empty">Aucune session.</p>
      )}
      {!loading && (sessions.length > 0 || page > 0) && (
        <Group gap="sm" data-testid="admin-sessions-pagination">
          <Button
            variant="subtle"
            size="sm"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            data-testid="pagination-prev"
          >
            Précédent
          </Button>
          <span data-testid="pagination-page">Page {page + 1}</span>
          <Button
            variant="subtle"
            size="sm"
            disabled={sessions.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
            data-testid="pagination-next"
          >
            Suivant
          </Button>
        </Group>
      )}
    </PageContainer>
  );
}
