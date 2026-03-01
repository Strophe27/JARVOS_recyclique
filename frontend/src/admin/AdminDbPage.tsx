/**
 * Page admin BDD — Story 8.5 / 17.3.
 * Route : /admin/db. Export, Purge transactions, Import (POST /v1/admin/db/*).
 */
import { useCallback, useState } from 'react';
import { Card, Text, Button, Alert, Modal, Group } from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  postAdminDbExport,
  postAdminDbPurgeTransactions,
  postAdminDbImport,
} from '../api/adminDb';
import { PageContainer, PageSection } from '../shared/layout';

export function AdminDbPage() {
  const { accessToken, permissions } = useAuth();
  const [exportLoading, setExportLoading] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAccess = permissions.includes('admin') || permissions.includes('super_admin');

  const handleExport = useCallback(async () => {
    if (!accessToken || !canAccess) return;
    setExportLoading(true);
    setError(null);
    setMessage(null);
    try {
      await postAdminDbExport(accessToken);
      setMessage('Export téléchargé.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur export');
    } finally {
      setExportLoading(false);
    }
  }, [accessToken, canAccess]);

  const handlePurgeConfirm = useCallback(async () => {
    if (!accessToken || !canAccess) return;
    setPurgeLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await postAdminDbPurgeTransactions(accessToken);
      setMessage(res.message ?? 'Purge effectuée.');
      setPurgeModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur purge');
    } finally {
      setPurgeLoading(false);
    }
  }, [accessToken, canAccess]);

  const handleImport = useCallback(async () => {
    if (!accessToken || !canAccess || !importFile) return;
    setImportLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await postAdminDbImport(accessToken, importFile);
      if (res.ok) {
        setMessage(res.message ?? `Fichier ${res.filename} importé.`);
        setImportFile(null);
      } else {
        setError(res.detail ?? 'Import refusé');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur import');
    } finally {
      setImportLoading(false);
    }
  }, [accessToken, canAccess, importFile]);

  if (!canAccess) {
    return (
      <div data-testid="admin-db-forbidden">
        <p>Accès réservé aux administrateurs (super-admin ou admin).</p>
      </div>
    );
  }

  return (
    <PageContainer title="Base de données" maxWidth={1200} testId="admin-db-page">
      <Text size="sm" c="dimmed" mb="xs">
        Export, purge des transactions et import BDD.
      </Text>
      {error && <Alert color="red">{error}</Alert>}
      {message && <Alert color="green">{message}</Alert>}

      <PageSection>
        <Card withBorder padding="md" radius="md" shadow="sm">
        <Text fw={500} mb="xs">Export BDD</Text>
        <Text size="sm" c="dimmed" mb="md">
          Télécharge une sauvegarde (dump SQL) de la base.
        </Text>
        <Button
          loading={exportLoading}
          onClick={handleExport}
          data-testid="btn-db-export"
        >
          Export BDD
        </Button>
        </Card>
      </PageSection>

      <PageSection>
        <Card withBorder padding="md" radius="md" shadow="sm">
        <Text fw={500} mb="xs">Purge transactions</Text>
        <Text size="sm" c="dimmed" mb="md">
          Supprime les données de transactions (sessions caisse, ventes, paiements).
        </Text>
        <Button
          color="orange"
          variant="light"
          onClick={() => setPurgeModalOpen(true)}
          data-testid="btn-db-purge-open"
        >
          Purge transactions
        </Button>
        </Card>
      </PageSection>

      <Modal
        opened={purgeModalOpen}
        onClose={() => setPurgeModalOpen(false)}
        title="Confirmer la purge"
        data-testid="modal-purge-confirm"
      >
        <Text size="sm" mb="md">
          Êtes-vous sûr de vouloir lancer la purge des transactions ? Les sessions caisse, ventes et paiements seront définitivement supprimés.
        </Text>
        <Group>
          <Button loading={purgeLoading} color="red" onClick={handlePurgeConfirm} data-testid="btn-db-purge-confirm">
            Confirmer
          </Button>
          <Button variant="subtle" onClick={() => setPurgeModalOpen(false)}>Annuler</Button>
        </Group>
      </Modal>

      <PageSection>
        <Card withBorder padding="md" radius="md" shadow="sm">
        <Text fw={500} mb="xs">Import BDD</Text>
        <Text size="sm" c="dimmed" mb="md">
          Envoie un fichier de sauvegarde SQL pour restauration.
        </Text>
        <input
          type="file"
          accept=".sql,.dump"
          onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          data-testid="input-db-import-file"
        />
        <Button
          mt="md"
          loading={importLoading}
          disabled={!importFile}
          onClick={handleImport}
          data-testid="btn-db-import"
        >
          Importer
        </Button>
        </Card>
      </PageSection>
    </PageContainer>
  );
}
