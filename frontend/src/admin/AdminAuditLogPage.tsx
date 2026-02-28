/**
 * Page admin Audit log — Story 8.4, 11.5.
 * Route : /admin/audit-log. GET /v1/admin/audit-log avec pagination et filtres. Rendu Mantine 1.4.4.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Loader,
  Table,
  Group,
  Button,
  TextInput,
  Text,
} from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  getAdminAuditLog,
  type AuditEventItem,
  type AuditLogListResponse,
} from '../api/adminHealthAudit';
import { PageContainer, PageSection } from '../shared/layout';

const PAGE_SIZE = 20;

export function AdminAuditLogPage() {
  const { accessToken, permissions } = useAuth();
  const [data, setData] = useState<AuditLogListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [eventType, setEventType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !permissions.includes('admin')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminAuditLog(accessToken, {
        page,
        page_size: PAGE_SIZE,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        event_type: eventType || undefined,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, permissions, page, dateFrom, dateTo, eventType]);

  useEffect(() => {
    load();
  }, [load]);

  if (!permissions.includes('admin')) {
    return (
      <div data-testid="admin-audit-log-forbidden">
        <p>Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <PageContainer title="Audit log" maxWidth={1200} testId="admin-audit-log-page">
      <PageSection>
        <Group gap="sm" mb="md">
          <TextInput
            placeholder="Date début"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            data-testid="filter-date-from"
          />
          <TextInput
            placeholder="Date fin"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            data-testid="filter-date-to"
          />
          <TextInput
            placeholder="Type (action)"
            value={eventType ?? ''}
            onChange={(e) => setEventType(e.target.value || null)}
            data-testid="filter-event-type"
          />
          <Button variant="subtle" onClick={() => { setDateFrom(''); setDateTo(''); setEventType(null); setPage(1); }}>
            Réinitialiser
          </Button>
          <Button variant="light" onClick={() => load()}>Rafraîchir</Button>
        </Group>
        {error && <Alert color="red">{error}</Alert>}
        {loading ? (
          <Loader size="sm" data-testid="admin-audit-log-loading" />
        ) : (
          <>
            <Table striped highlightOnHover data-testid="admin-audit-log-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Ressource</Table.Th>
                <Table.Th>User</Table.Th>
                <Table.Th>Détail</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data?.items ?? []).map((evt: AuditEventItem) => (
                <Table.Tr key={evt.id}>
                  <Table.Td>{new Date(evt.timestamp).toLocaleString()}</Table.Td>
                  <Table.Td>{evt.action}</Table.Td>
                  <Table.Td>{evt.resource_type ?? '—'} {evt.resource_id ? `#${evt.resource_id.slice(0, 8)}` : ''}</Table.Td>
                  <Table.Td>{evt.user_id ? evt.user_id.slice(0, 8) : '—'}</Table.Td>
                  <Table.Td>{evt.details ?? '—'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          {data && data.items.length === 0 && (
            <Text size="sm" c="dimmed" data-testid="admin-audit-log-empty">Aucun événement.</Text>
          )}
          {data && data.total > PAGE_SIZE && (
            <Group gap="sm" data-testid="admin-audit-log-pagination" mt="md">
              <Button
                variant="subtle"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </Button>
              <Text size="sm">Page {page} / {Math.ceil(data.total / PAGE_SIZE) || 1} ({data.total} au total)</Text>
              <Button
                variant="subtle"
                size="sm"
                disabled={page * PAGE_SIZE >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </Group>
          )}
        </>
      )}
      </PageSection>
    </PageContainer>
  );
}
