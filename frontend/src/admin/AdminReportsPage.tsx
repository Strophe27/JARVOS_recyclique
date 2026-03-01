/**
 * Page admin Rapports caisse — Story 8.2.
 * Routes : /admin/reports, /admin/reports/cash-sessions. Liste rapports par session, téléchargement, export bulk.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  Button,
  Stack,
  Group,
  Alert,
  Loader,
  Modal,
  TextInput,
  Select,
  Card,
} from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  getCashSessionReportsList,
  getReportBySession,
  postExportBulk,
  type CashSessionReportItem,
} from '../api/adminReports';
import { getSites } from '../api/admin';
import { PageContainer } from '../shared/layout';

export function AdminReportsPage() {
  const { accessToken, permissions } = useAuth();
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [reports, setReports] = useState<CashSessionReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDateFrom, setBulkDateFrom] = useState('');
  const [bulkDateTo, setBulkDateTo] = useState('');
  const [bulkSiteId, setBulkSiteId] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadSites = useCallback(async () => {
    if (!accessToken) return;
    try {
      const list = await getSites(accessToken);
      setSites(list.map((s) => ({ id: s.id, name: s.name })));
    } catch {
      setSites([]);
    }
  }, [accessToken]);

  const loadReports = useCallback(async () => {
    if (!accessToken || !permissions.includes('admin')) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getCashSessionReportsList(accessToken, { limit: 100, offset: 0 });
      setReports(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, permissions]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDownload = async (sessionId: string) => {
    if (!accessToken) return;
    setError(null);
    try {
      const { blob, filename } = await getReportBySession(accessToken, sessionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur téléchargement');
    }
  };

  const handleExportBulk = async () => {
    if (!accessToken) return;
    setBulkLoading(true);
    setBulkResult(null);
    setError(null);
    try {
      const { blob, filename } = await postExportBulk(accessToken, {
        date_from: bulkDateFrom || undefined,
        date_to: bulkDateTo || undefined,
        site_id: bulkSiteId || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setBulkResult('Export téléchargé.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur export bulk');
    } finally {
      setBulkLoading(false);
    }
  };

  if (!permissions.includes('admin')) {
    return (
      <div data-testid="admin-reports-forbidden">
        <p>Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <PageContainer title="Rapports caisse" maxWidth={1200} testId="admin-reports-page">
      <Group justify="flex-end">
        <Button data-testid="admin-reports-bulk" variant="filled" onClick={() => { setBulkModalOpen(true); setBulkResult(null); }}>
          Export bulk
        </Button>
      </Group>

      {error && <Alert color="red">{error}</Alert>}
      {loading ? (
        <Loader size="sm" data-testid="admin-reports-loading" />
      ) : (
        <Card withBorder padding="md" radius="md">
        <Table striped highlightOnHover data-testid="admin-reports-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Session</Table.Th>
              <Table.Th>Ouverture</Table.Th>
              <Table.Th>Clôture</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {reports.map((r) => (
              <Table.Tr key={r.session_id}>
                <Table.Td>{r.session_id.slice(0, 8)}</Table.Td>
                <Table.Td>{new Date(r.opened_at).toLocaleString()}</Table.Td>
                <Table.Td>{r.closed_at ? new Date(r.closed_at).toLocaleString() : '—'}</Table.Td>
                <Table.Td>
                  <Button
                    variant="light"
                    size="xs"
                    onClick={() => handleDownload(r.session_id)}
                    data-testid={`download-${r.session_id}`}
                  >
                    Télécharger
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        </Card>
      )}
      {!loading && reports.length === 0 && (
        <p data-testid="admin-reports-empty">Aucun rapport (sessions clôturées).</p>
      )}

      <Modal opened={bulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Export bulk">
        <Stack gap="sm">
          <TextInput
            label="Du (YYYY-MM-DD)"
            type="date"
            value={bulkDateFrom}
            onChange={(e) => setBulkDateFrom(e.target.value)}
            data-testid="bulk-date-from"
          />
          <TextInput
            label="Au (YYYY-MM-DD)"
            type="date"
            value={bulkDateTo}
            onChange={(e) => setBulkDateTo(e.target.value)}
            data-testid="bulk-date-to"
          />
          <Select
            label="Site"
            placeholder="Tous"
            clearable
            data={sites.map((s) => ({ value: s.id, label: s.name }))}
            value={bulkSiteId}
            onChange={setBulkSiteId}
            data-testid="bulk-site"
          />
          {bulkResult && <Alert color="green">{bulkResult}</Alert>}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setBulkModalOpen(false)}>Fermer</Button>
            <Button loading={bulkLoading} onClick={handleExportBulk} data-testid="bulk-submit">
              Lancer l'export
            </Button>
          </Group>
        </Stack>
      </Modal>
    </PageContainer>
  );
}
