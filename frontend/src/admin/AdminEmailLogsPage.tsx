/**
 * Page admin Logs email — Story 8.4, 11.5, 17.8.
 * Route : /admin/email-logs. GET /v1/admin/email-logs. Rendu Mantine 1.4.4.
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
  getAdminEmailLogs,
  type EmailLogItem,
  type EmailLogsListResponse,
} from '../api/adminHealthAudit';
import { PageContainer, PageSection } from '../shared/layout';

const PAGE_SIZE = 20;

export function AdminEmailLogsPage() {
  const { accessToken, permissions } = useAuth();
  const [data, setData] = useState<EmailLogsListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [recipient, setRecipient] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !permissions.includes('admin')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminEmailLogs(accessToken, {
        page,
        page_size: PAGE_SIZE,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        recipient: recipient.trim() || undefined,
        status: status.trim() || undefined,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, permissions, page, dateFrom, dateTo, recipient, status]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterChange = () => {
    setPage(1);
  };

  if (!permissions.includes('admin')) {
    return (
      <div data-testid="admin-email-logs-forbidden">
        <p>Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <PageContainer title="Logs email" maxWidth={1200} testId="admin-email-logs-page">
      <Text size="sm" c="dimmed" mb="xs">
        Consultation des envois email.
      </Text>
      <PageSection>
        <Group gap="sm" mb="md">
          <TextInput
            placeholder="Date début"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              handleFilterChange();
            }}
            data-testid="filter-date-from"
          />
          <TextInput
            placeholder="Date fin"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              handleFilterChange();
            }}
            data-testid="filter-date-to"
          />
          <TextInput
            placeholder="Destinataire"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              handleFilterChange();
            }}
            data-testid="filter-recipient"
          />
          <TextInput
            placeholder="Statut"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              handleFilterChange();
            }}
            data-testid="filter-status"
          />
          <Button
            variant="subtle"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setRecipient('');
              setStatus('');
              setPage(1);
            }}
          >
            Réinitialiser
          </Button>
          <Button variant="light" onClick={() => load()}>
            Rafraîchir
          </Button>
        </Group>
        {error && <Alert color="red">{error}</Alert>}
        {loading ? (
          <Loader size="sm" data-testid="admin-email-logs-loading" />
        ) : (
          <>
            <Table striped highlightOnHover data-testid="admin-email-logs-table">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Destinataire</Table.Th>
                  <Table.Th>Sujet</Table.Th>
                  <Table.Th>Statut</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(data?.items ?? []).map((log: EmailLogItem) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>{new Date(log.sent_at).toLocaleString()}</Table.Td>
                    <Table.Td>{log.recipient}</Table.Td>
                    <Table.Td>{log.subject}</Table.Td>
                    <Table.Td>{log.status}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {data && data.total === 0 && (
              <Text size="sm" c="dimmed" data-testid="admin-email-logs-empty">
                Aucun log email.
              </Text>
            )}
            {data && data.total > PAGE_SIZE && (
              <Group gap="sm" data-testid="admin-email-logs-pagination" mt="md">
                <Button
                  variant="subtle"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <Text size="sm">
                  Page {page} / {Math.ceil(data.total / PAGE_SIZE) || 1} ({data.total} au total)
                </Text>
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
