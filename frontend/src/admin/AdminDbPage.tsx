/**
 * Page admin BDD — Story 18.3.
 * Route : /admin/db. Export, Purge transactions, Import.
 * UX alignée sur la 1.4.4 : modal export, import 2 zones, purge 3 étapes.
 */
import { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  postAdminDbExport,
  postAdminDbPurgeTransactions,
  postAdminDbImport,
} from '../api/adminDb';
import { PageContainer, PageSection } from '../shared/layout';

const MAX_IMPORT_BYTES = 500 * 1024 * 1024;

export function AdminDbPage() {
  const { accessToken, permissions } = useAuth();

  // Export
  const [exportLoading, setExportLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Import
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFileError, setImportFileError] = useState<string | null>(null);
  const [importConfirmText, setImportConfirmText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Purge
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeStep, setPurgeStep] = useState<0 | 1 | 2 | 3>(0);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const canAccess = permissions.includes('super_admin');

  // --- Export ---

  const handleExportConfirm = useCallback(async () => {
    if (!accessToken) return;
    setExportModalOpen(false);
    setExportLoading(true);
    setExportError(null);
    setExportMessage(null);
    try {
      await postAdminDbExport(accessToken);
      setExportMessage('Export de la base de données réussi. Le fichier a été téléchargé.');
    } catch (e) {
      setExportError(
        `Erreur lors de l'export de la base de données : ${e instanceof Error ? e.message : 'Erreur inconnue'}`
      );
    } finally {
      setExportLoading(false);
    }
  }, [accessToken]);

  // --- Import ---

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImportFile(null);
    setImportFileError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.dump')) {
      setImportFileError('Veuillez sélectionner un fichier .dump (format binaire PostgreSQL)');
      return;
    }
    const sizeMB = Math.round(file.size / (1024 * 1024));
    if (file.size > MAX_IMPORT_BYTES) {
      setImportFileError(`Le fichier est trop volumineux (${sizeMB} MB). La limite est de 500 MB.`);
      return;
    }
    setImportFile(file);
  };

  const handleImportSubmit = useCallback(async () => {
    if (!accessToken || !importFile) return;
    if (importConfirmText !== 'RESTAURER') {
      setImportError(
        'Le texte de confirmation ne correspond pas. Veuillez recopier exactement "RESTAURER".'
      );
      return;
    }
    setImportLoading(true);
    setImportError(null);
    try {
      const res = await postAdminDbImport(accessToken, importFile);
      setImportModalOpen(false);
      setImportFile(null);
      setImportConfirmText('');
      setImportMessage(
        `Import réussi ! Fichier importé : ${res.imported_file}. Sauvegarde créée : ${res.backup_created}.`
      );
    } catch (e) {
      setImportError(
        `Erreur lors de l'import de la base de données : ${e instanceof Error ? e.message : 'Erreur inconnue'}`
      );
    } finally {
      setImportLoading(false);
    }
  }, [accessToken, importFile, importConfirmText]);

  const handleImportModalClose = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportFileError(null);
    setImportConfirmText('');
    setImportError(null);
  };

  // --- Purge ---

  const handlePurgeModalClose = useCallback(() => {
    setPurgeModalOpen(false);
    setPurgeStep(0);
    setPurgeConfirmText('');
  }, []);

  const handlePurgeFinal = useCallback(async () => {
    if (!accessToken || purgeConfirmText !== 'Adieu la base') return;
    setPurgeLoading(true);
    setPurgeError(null);
    setPurgeMessage(null);
    try {
      const res = await postAdminDbPurgeTransactions(accessToken);
      handlePurgeModalClose();
      const r = res.deleted_records;
      setPurgeMessage(
        `Purge réussie ! Enregistrements supprimés : sale_items: ${r.sale_items}, sales: ${r.sales}, ligne_depot: ${r.ligne_depot}, ticket_depot: ${r.ticket_depot}, cash_sessions: ${r.cash_sessions}.`
      );
    } catch (e) {
      handlePurgeModalClose();
      setPurgeError(
        `Erreur lors de la purge des données : ${e instanceof Error ? e.message : 'Erreur inconnue'}`
      );
    } finally {
      setPurgeLoading(false);
    }
  }, [accessToken, purgeConfirmText, handlePurgeModalClose]);

  if (!canAccess) {
    return (
      <div data-testid="admin-db-forbidden">
        <p>Accès réservé aux super-administrateurs.</p>
      </div>
    );
  }

  return (
    <PageContainer title="Base de données" maxWidth={1200} testId="admin-db-page">
      <Text size="sm" c="dimmed" mb="xs">
        Export, purge des transactions et import BDD.
      </Text>

      {/* === EXPORT === */}
      <PageSection>
        <Card withBorder padding="md" radius="md" shadow="sm">
          <Stack gap="sm">
            <Text fw={500}>Export de la base de données</Text>
            <Text size="sm" c="dimmed">
              Génère un fichier .dump (format binaire PostgreSQL) complet de sauvegarde de la base
              de données.
            </Text>
            <Alert color="yellow">
              L&apos;export peut prendre plusieurs minutes selon la taille de la base de données.
            </Alert>
            {exportMessage && <Alert color="green">{exportMessage}</Alert>}
            {exportError && <Alert color="red">{exportError}</Alert>}
            <Button
              loading={exportLoading}
              disabled={exportLoading}
              onClick={() => setExportModalOpen(true)}
              data-testid="btn-db-export-open"
            >
              {exportLoading ? '⏳ Export en cours...' : '💾 Exporter'}
            </Button>
          </Stack>
        </Card>
      </PageSection>

      <Modal
        opened={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Confirmer l'export"
        data-testid="modal-export-confirm"
      >
        <Stack gap="md">
          <Text size="sm">
            Voulez-vous vraiment exporter la base de données ? Cette opération peut prendre
            plusieurs minutes.
          </Text>
          <Group>
            <Button onClick={handleExportConfirm} data-testid="btn-db-export-confirm">
              Confirmer l&apos;export
            </Button>
            <Button variant="subtle" onClick={() => setExportModalOpen(false)}>
              Annuler
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* === IMPORT === */}
      <PageSection>
        <Card withBorder padding="md" radius="md" shadow="sm">
          <Stack gap="sm">
            <Text fw={500}>Import de sauvegarde</Text>
            <Text size="sm" c="dimmed">
              Importe un fichier .dump (format binaire PostgreSQL) de sauvegarde et remplace la
              base de données existante. Une sauvegarde automatique est créée avant l&apos;import
              dans /backups.
            </Text>
            {importMessage && <Alert color="green">{importMessage}</Alert>}
            <Button onClick={() => setImportModalOpen(true)} data-testid="btn-db-import-open">
              📥 Importer
            </Button>
          </Stack>
        </Card>
      </PageSection>

      <Modal
        opened={importModalOpen}
        onClose={handleImportModalClose}
        title="Import de sauvegarde"
        data-testid="modal-import"
      >
        <Stack gap="md">
          <Text size="sm" fw={500}>
            Zone 1 — Sélection du fichier
          </Text>
          <input
            type="file"
            accept=".dump"
            onChange={handleImportFileChange}
            data-testid="input-db-import-file"
          />
          {importFileError && <Alert color="red">{importFileError}</Alert>}
          {importFile && (
            <Text size="sm" c="dimmed">
              Fichier sélectionné : {importFile.name} ({Math.round(importFile.size / 1024)} Ko)
            </Text>
          )}
          <Text size="sm" fw={500}>
            Zone 2 — Confirmation
          </Text>
          <Text size="sm">
            Pour confirmer, veuillez recopier exactement : <strong>&ldquo;RESTAURER&rdquo;</strong>
          </Text>
          <TextInput
            placeholder="RESTAURER"
            value={importConfirmText}
            onChange={(e) => setImportConfirmText(e.target.value)}
            data-testid="input-import-confirm-text"
          />
          {importError && <Alert color="red">{importError}</Alert>}
          <Button
            color="red"
            loading={importLoading}
            disabled={!importFile || importConfirmText !== 'RESTAURER' || !!importFileError}
            onClick={handleImportSubmit}
            data-testid="btn-db-import-confirm"
          >
            {importLoading ? '⏳ Import en cours...' : '🗄️ Remplacer la base de données'}
          </Button>
        </Stack>
      </Modal>

      {/* === PURGE === */}
      <PageSection>
        <Card withBorder padding="md" radius="md" shadow="sm">
          <Stack gap="sm">
            <Text fw={500}>Purge des données transactionnelles</Text>
            <Text size="sm" c="dimmed">
              Supprime TOUTES les données de ventes, réceptions et sessions de caisse. Cette
              opération est irréversible.
            </Text>
            <Alert color="red">
              DANGER : Cette action supprimera définitivement toutes les données transactionnelles.
            </Alert>
            {purgeMessage && <Alert color="green">{purgeMessage}</Alert>}
            {purgeError && <Alert color="red">{purgeError}</Alert>}
            <Button
              color="red"
              onClick={() => {
                setPurgeModalOpen(true);
                setPurgeStep(1);
              }}
              data-testid="btn-db-purge-open"
            >
              🗑️ Purger les données
            </Button>
          </Stack>
        </Card>
      </PageSection>

      <Modal
        opened={purgeModalOpen}
        onClose={handlePurgeModalClose}
        title={
          purgeStep === 1
            ? '⚠️ Confirmation de purge'
            : purgeStep === 2
              ? '🚨 Dernière chance'
              : '🔐 Confirmation finale'
        }
        data-testid="modal-purge"
      >
        {purgeStep === 1 && (
          <Stack gap="md">
            <Text size="sm">
              Êtes-vous sûr de vouloir supprimer toutes les données de ventes et de réceptions ?
              Cette action est irréversible.
            </Text>
            <Group>
              <Button
                color="red"
                onClick={() => setPurgeStep(2)}
                data-testid="btn-purge-step1-confirm"
              >
                Oui, je suis sûr
              </Button>
              <Button variant="subtle" onClick={handlePurgeModalClose}>
                Annuler
              </Button>
            </Group>
          </Stack>
        )}

        {purgeStep === 2 && (
          <Stack gap="md">
            <Text size="sm">
              Vraiment sûr(e) ? Toutes les transactions seront définitivement perdues.
            </Text>
            <Group>
              <Button
                color="red"
                onClick={() => setPurgeStep(3)}
                data-testid="btn-purge-step2-confirm"
              >
                Oui, je confirme
              </Button>
              <Button variant="subtle" onClick={handlePurgeModalClose}>
                Annuler
              </Button>
            </Group>
          </Stack>
        )}

        {purgeStep === 3 && (
          <Stack gap="md">
            <Text size="sm">
              Pour confirmer, veuillez recopier exactement :{' '}
              <strong>&ldquo;Adieu la base&rdquo;</strong>
            </Text>
            <TextInput
              placeholder="Adieu la base"
              value={purgeConfirmText}
              onChange={(e) => setPurgeConfirmText(e.target.value)}
              data-testid="input-purge-confirm-text"
            />
            <Stack gap="xs">
              <Button
                color="red"
                loading={purgeLoading}
                disabled={purgeConfirmText !== 'Adieu la base'}
                onClick={handlePurgeFinal}
                data-testid="btn-purge-final-confirm"
              >
                {purgeLoading ? '⏳ Suppression...' : '🗑️ Supprimer définitivement'}
              </Button>
              <Button variant="subtle" onClick={handlePurgeModalClose}>
                Annuler
              </Button>
            </Stack>
          </Stack>
        )}
      </Modal>
    </PageContainer>
  );
}
