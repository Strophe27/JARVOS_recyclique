import {
  Accordion,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  PasswordInput,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { Bell, Database, Link2, Mail, Settings, Timer } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAdminSettingsActivityThreshold,
  fetchAdminSettingsAlertThresholds,
  fetchAdminSettingsEmail,
  fetchAdminSettingsSession,
  postAdminSettingsEmailTest,
  putAdminSettingsActivityThreshold,
  putAdminSettingsAlertThresholds,
  putAdminSettingsEmail,
  putAdminSettingsSession,
} from '../../api/admin-advanced-settings-client';
import {
  postAdminDbExportBlob,
  postAdminDbImportDump,
  postAdminDbPurgeTransactions,
} from '../../api/admin-db-operations-client';
import { getAdminAuditLogList, type AdminAuditLogEntryDto } from '../../api/admin-audit-log-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { ADMIN_SUPER_PAGE_MANIFEST_GUARDS } from './admin-super-page-guards';
import { AdminPahekoDiagnosticsSection } from './AdminPahekoDiagnosticsSection';
import { AdminPahekoCashSessionCloseMappingsSection } from './AdminPahekoCashSessionCloseMappingsSection';

const MIN_MINUTES = 1;
const MAX_MINUTES = 10080;
const MIN_ACTIVITY = 1;
const MAX_ACTIVITY = 1440;

export function AdminAdvancedSettingsWidget(_props: RegisteredWidgetProps) {
  const auth = useAuthPort();
  const envelope = auth.getContextEnvelope();
  const isSuperAdminUi = ADMIN_SUPER_PAGE_MANIFEST_GUARDS.requiredPermissionKeys.every((key) =>
    envelope.permissions.permissionKeys.includes(key),
  );
  const [openAccordionPanels, setOpenAccordionPanels] = useState<string[]>(['session']);

  return (
    <Stack gap="md" data-testid="admin-advanced-settings-widget">
      <div>
        <Title
          order={1}
          size="h2"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          data-testid="admin-advanced-settings-page-title"
        >
          <Settings size={22} aria-hidden />
          Paramètres de la plateforme
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Réglages transverses : durée de connexion, messages automatiques, présence « en ligne » et alertes du
          tableau de bord — alignés sur l’administration Recyclique.
        </Text>
      </div>

      <Alert color="blue" title="Répartition Paheko">
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Text size="sm">
            Le cockpit comptable sert au suivi quotidien. Les réglages Paheko avancés et le support technique restent
            ici, dans les paramètres avancés.
          </Text>
          <Button
            variant="light"
            onClick={() => spaNavigateTo('/admin/compta')}
            data-testid="admin-advanced-settings-nav-accounting-hub"
          >
            Ouvrir le cockpit comptable
          </Button>
        </Group>
      </Alert>

      <Accordion
        variant="separated"
        multiple
        value={openAccordionPanels}
        onChange={setOpenAccordionPanels}
      >
        <Accordion.Item value="session">
          <Accordion.Control data-testid="admin-advanced-settings-accordion-session">
            Connexion et déconnexion automatique
          </Accordion.Control>
          <Accordion.Panel>
            <SessionJwtSection />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="email">
          <Accordion.Control icon={<Mail size={18} />} data-testid="admin-advanced-settings-accordion-email">
            Courriel transactionnel (Brevo)
          </Accordion.Control>
          <Accordion.Panel>
            <EmailSettingsSection />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="activity">
          <Accordion.Control icon={<Timer size={18} />} data-testid="admin-advanced-settings-accordion-activity">
            Activité « en ligne »
          </Accordion.Control>
          <Accordion.Panel>
            <ActivityThresholdSection />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="alerts">
          <Accordion.Control icon={<Bell size={18} />} data-testid="admin-advanced-settings-accordion-alerts">
            Seuils d’alerte tableau de bord
          </Accordion.Control>
          <Accordion.Panel>
            <AlertThresholdsSection />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="database">
          <Accordion.Control
            icon={<Database size={18} />}
            data-testid="admin-advanced-settings-accordion-database"
          >
            Base de données (super-admin)
          </Accordion.Control>
          <Accordion.Panel>
            <DatabaseOperationsSection panelActive={openAccordionPanels.includes('database')} />
          </Accordion.Panel>
        </Accordion.Item>

        {isSuperAdminUi ? (
          <Accordion.Item value="paheko-mappings">
            <Accordion.Control
              icon={<Link2 size={18} />}
              data-testid="admin-advanced-settings-accordion-paheko-mappings"
            >
              Paheko : réglages de clôture
            </Accordion.Control>
            <Accordion.Panel>
              <AdminPahekoCashSessionCloseMappingsSection />
            </Accordion.Panel>
          </Accordion.Item>
        ) : null}

        {isSuperAdminUi ? (
          <Accordion.Item value="paheko-diagnostics">
            <Accordion.Control
              icon={<Link2 size={18} />}
              data-testid="admin-advanced-settings-accordion-paheko-diagnostics"
            >
              Paheko : support technique
            </Accordion.Control>
            <Accordion.Panel>
              <AdminPahekoDiagnosticsSection />
            </Accordion.Panel>
          </Accordion.Item>
        ) : null}
      </Accordion>
    </Stack>
  );
}

function SessionJwtSection() {
  const auth = useAuthPort();
  const [minutes, setMinutes] = useState<number | string>(480);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const authRef = useRef(auth);
  authRef.current = auth;

  useEffect(() => {
    const ac = new AbortController();
    let stale = false;

    const run = async () => {
      setLoading(true);
      setLoadError(null);
      setSaveOk(false);
      try {
        const res = await fetchAdminSettingsSession(auth, ac.signal);
        if (stale) return;
        if (!res.ok) {
          setLoadError(res.detail);
          setMinutes(480);
        } else {
          const v = res.data.token_expiration_minutes;
          setMinutes(typeof v === 'number' && Number.isFinite(v) ? v : 480);
        }
      } finally {
        if (!stale) setLoading(false);
      }
    };

    void run();
    return () => {
      stale = true;
      ac.abort();
    };
  }, [auth]);

  const onSave = useCallback(async () => {
    setSaveError(null);
    setSaveOk(false);
    const n = typeof minutes === 'number' ? minutes : Number(minutes);
    if (!Number.isFinite(n) || n < MIN_MINUTES || n > MAX_MINUTES) {
      setSaveError(`Indiquez une durée entre ${MIN_MINUTES} et ${MAX_MINUTES} minutes.`);
      return;
    }
    setSaving(true);
    const res = await putAdminSettingsSession(authRef.current, { token_expiration_minutes: Math.floor(n) });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.detail);
      return;
    }
    setSaveOk(true);
    const v = res.data.token_expiration_minutes;
    if (typeof v === 'number' && Number.isFinite(v)) setMinutes(v);
  }, [minutes]);

  return (
    <Paper p="md" withBorder radius="md">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Durée maximale de validité d’une session après connexion : au-delà, une nouvelle authentification est
          demandée. Réservé aux comptes super-admin ; les autres profils ne voient pas cet écran.
        </Text>
        {loadError ? (
          <Alert color="red" title="Chargement impossible">
            {loadError}
          </Alert>
        ) : null}
        {saveError ? (
          <Alert color="red" title="Enregistrement refusé">
            {saveError}
          </Alert>
        ) : null}
        {saveOk ? (
          <Alert color="green" title="Enregistré">
            Les paramètres de session ont été mis à jour.
          </Alert>
        ) : null}
        <NumberInput
          label="Durée de session avant expiration (minutes)"
          description={`Entre ${MIN_MINUTES} et ${MAX_MINUTES} minutes.`}
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          value={minutes}
          onChange={setMinutes}
          disabled={loading || !!loadError}
          data-testid="admin-advanced-settings-token-minutes"
        />
        <Button
          leftSection={<Settings size={18} />}
          onClick={() => void onSave()}
          loading={saving}
          disabled={loading || !!loadError}
          data-testid="admin-advanced-settings-save"
        >
          Enregistrer la durée
        </Button>
      </Stack>
    </Paper>
  );
}

function EmailSettingsSection() {
  const auth = useAuthPort();
  const authRef = useRef(auth);
  authRef.current = auth;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fromName, setFromName] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [defaultRecipient, setDefaultRecipient] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let stale = false;
    const run = async () => {
      setLoading(true);
      setLoadError(null);
      const res = await fetchAdminSettingsEmail(auth, ac.signal);
      if (stale) return;
      if (!res.ok) {
        setLoadError(res.detail);
      } else {
        setFromName(res.data.from_name ?? '');
        setFromAddress(res.data.from_address ?? '');
        setDefaultRecipient(res.data.default_recipient ?? '');
        setHasApiKey(!!res.data.has_api_key);
      }
      setLoading(false);
    };
    void run();
    return () => {
      stale = true;
      ac.abort();
    };
  }, [auth]);

  const onSave = useCallback(async () => {
    setSaveError(null);
    setSaveOk(false);
    setSaving(true);
    const res = await putAdminSettingsEmail(authRef.current, {
      from_name: fromName.trim() || undefined,
      from_address: fromAddress.trim() || undefined,
      default_recipient: defaultRecipient.trim() ? defaultRecipient.trim() : null,
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.detail);
      return;
    }
    setSaveOk(true);
    setHasApiKey(!!res.data.has_api_key);
  }, [fromName, fromAddress, defaultRecipient]);

  const onTest = useCallback(async () => {
    setTestMsg(null);
    const to = testTo.trim();
    if (!to) {
      setTestMsg('Indiquez une adresse destinataire.');
      return;
    }
    setTesting(true);
    const res = await postAdminSettingsEmailTest(authRef.current, { to_email: to });
    setTesting(false);
    if (!res.ok) {
      setTestMsg(res.detail);
      return;
    }
    setTestMsg(res.data.message ?? `Envoi déclenché vers ${res.data.to_email ?? to}.`);
  }, [testTo]);

  return (
    <Paper p="md" withBorder radius="md">
      <Stack gap="md">
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            Configuration expéditeur (sans exposition de clé API).
          </Text>
          {hasApiKey ? (
            <Badge color="teal" variant="light">
              Envoi opérationnel
            </Badge>
          ) : (
            <Badge color="gray" variant="light">
              Envoi non configuré
            </Badge>
          )}
        </Group>
        {loadError ? (
          <Alert color="red" title="Chargement impossible">
            {loadError}
          </Alert>
        ) : null}
        {saveError ? (
          <Alert color="red" title="Enregistrement refusé">
            {saveError}
          </Alert>
        ) : null}
        {saveOk ? (
          <Alert color="green" title="Enregistré">
            Paramètres e-mail mis à jour.
          </Alert>
        ) : null}
        <TextInput
          label="Nom expéditeur"
          value={fromName}
          onChange={(e) => setFromName(e.currentTarget.value)}
          disabled={loading || !!loadError}
          data-testid="admin-advanced-settings-email-from-name"
        />
        <TextInput
          label="Adresse expéditeur"
          value={fromAddress}
          onChange={(e) => setFromAddress(e.currentTarget.value)}
          disabled={loading || !!loadError}
          data-testid="admin-advanced-settings-email-from-address"
        />
        <TextInput
          label="Destinataire par défaut (optionnel)"
          value={defaultRecipient}
          onChange={(e) => setDefaultRecipient(e.currentTarget.value)}
          disabled={loading || !!loadError}
          data-testid="admin-advanced-settings-email-default-recipient"
        />
        <Button onClick={() => void onSave()} loading={saving} disabled={loading || !!loadError}>
          Enregistrer le courriel
        </Button>
        <TextInput
          label="Adresse pour e-mail de test"
          value={testTo}
          onChange={(e) => setTestTo(e.currentTarget.value)}
          disabled={loading || !!loadError}
          data-testid="admin-advanced-settings-email-test-to"
        />
        <Button variant="light" onClick={() => void onTest()} loading={testing} disabled={loading || !!loadError}>
          Envoyer un e-mail de test
        </Button>
        {testMsg ? (
          <Alert color="blue" title="Test">
            {testMsg}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  );
}

function ActivityThresholdSection() {
  const auth = useAuthPort();
  const authRef = useRef(auth);
  authRef.current = auth;
  const [minutes, setMinutes] = useState<number | string>(30);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    let stale = false;
    const run = async () => {
      setLoading(true);
      setLoadError(null);
      const res = await fetchAdminSettingsActivityThreshold(auth, ac.signal);
      if (stale) return;
      if (!res.ok) setLoadError(res.detail);
      else {
        const v = res.data.activity_threshold_minutes;
        setMinutes(typeof v === 'number' && Number.isFinite(v) ? v : 30);
      }
      setLoading(false);
    };
    void run();
    return () => {
      stale = true;
      ac.abort();
    };
  }, [auth]);

  const onSave = useCallback(async () => {
    setSaveError(null);
    setSaveOk(false);
    const n = typeof minutes === 'number' ? minutes : Number(minutes);
    if (!Number.isFinite(n) || n < MIN_ACTIVITY || n > MAX_ACTIVITY) {
      setSaveError(`Valeur entre ${MIN_ACTIVITY} et ${MAX_ACTIVITY} minutes.`);
      return;
    }
    setSaving(true);
    const res = await putAdminSettingsActivityThreshold(authRef.current, {
      activity_threshold_minutes: Math.floor(n),
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.detail);
      return;
    }
    setSaveOk(true);
    const v = res.data.activity_threshold_minutes;
    if (typeof v === 'number' && Number.isFinite(v)) setMinutes(v);
  }, [minutes]);

  return (
    <Paper p="md" withBorder radius="md">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Délai au-delà duquel un utilisateur n’apparaît plus comme « en ligne » dans les vues d’administration.
          Modifiable par un admin ou un super-admin.
        </Text>
        {loadError ? (
          <Alert color="red" title="Chargement impossible">
            {loadError}
          </Alert>
        ) : null}
        {saveError ? (
          <Alert color="red" title="Enregistrement refusé">
            {saveError}
          </Alert>
        ) : null}
        {saveOk ? (
          <Alert color="green" title="Enregistré">
            Seuil mis à jour.
          </Alert>
        ) : null}
        <NumberInput
          label="Seuil (minutes)"
          min={MIN_ACTIVITY}
          max={MAX_ACTIVITY}
          value={minutes}
          onChange={setMinutes}
          disabled={loading || !!loadError}
          data-testid="admin-advanced-settings-activity-minutes"
        />
        <Button onClick={() => void onSave()} loading={saving} disabled={loading || !!loadError}>
          Enregistrer le seuil d’activité
        </Button>
      </Stack>
    </Paper>
  );
}

function AlertThresholdsSection() {
  const auth = useAuthPort();
  const authRef = useRef(auth);
  authRef.current = auth;
  const [cash, setCash] = useState<number | string>(0);
  const [lowInv, setLowInv] = useState<number | string>(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    let stale = false;
    const run = async () => {
      setLoading(true);
      setLoadError(null);
      const res = await fetchAdminSettingsAlertThresholds(auth, undefined, ac.signal);
      if (stale) return;
      if (!res.ok) setLoadError(res.detail);
      else {
        setCash(res.data.thresholds.cashDiscrepancy);
        setLowInv(res.data.thresholds.lowInventory);
      }
      setLoading(false);
    };
    void run();
    return () => {
      stale = true;
      ac.abort();
    };
  }, [auth]);

  const onSave = useCallback(async () => {
    setSaveError(null);
    setSaveOk(false);
    const c = typeof cash === 'number' ? cash : Number(cash);
    const l = typeof lowInv === 'number' ? lowInv : Number(lowInv);
    if (!Number.isFinite(c) || !Number.isFinite(l)) {
      setSaveError('Seuils numériques invalides.');
      return;
    }
    setSaving(true);
    const res = await putAdminSettingsAlertThresholds(authRef.current, {
      thresholds: { cashDiscrepancy: c, lowInventory: l },
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.detail);
      return;
    }
    setSaveOk(true);
    setCash(res.data.thresholds.cashDiscrepancy);
    setLowInv(res.data.thresholds.lowInventory);
  }, [cash, lowInv]);

  return (
    <Paper p="md" withBorder radius="md">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Seuils pour le tableau de bord admin (écart caisse, stock bas), en vue globale pour tous les sites.
        </Text>
        {loadError ? (
          <Alert color="red" title="Chargement impossible">
            {loadError}
          </Alert>
        ) : null}
        {saveError ? (
          <Alert color="red" title="Enregistrement refusé">
            {saveError}
          </Alert>
        ) : null}
        {saveOk ? (
          <Alert color="green" title="Enregistré">
            Seuils mis à jour.
          </Alert>
        ) : null}
        <NumberInput
          label="Seuil écart caisse"
          value={cash}
          onChange={setCash}
          disabled={loading || !!loadError}
          data-testid="admin-advanced-settings-alert-cash"
        />
        <NumberInput
          label="Seuil stock bas"
          value={lowInv}
          onChange={setLowInv}
          disabled={loading || !!loadError}
          data-testid="admin-advanced-settings-alert-inventory"
        />
        <Button onClick={() => void onSave()} loading={saving} disabled={loading || !!loadError}>
          Enregistrer les seuils
        </Button>
      </Stack>
    </Paper>
  );
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function formatAuditWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('fr-FR');
  } catch {
    return '—';
  }
}

type DatabaseOperationsSectionProps = {
  readonly panelActive: boolean;
};

function DatabaseOperationsSection({ panelActive }: DatabaseOperationsSectionProps) {
  const auth = useAuthPort();
  const authRef = useRef(auth);
  authRef.current = auth;

  const [stepUpPin, setStepUpPin] = useState('');

  const [importHistory, setImportHistory] = useState<readonly AdminAuditLogEntryDto[]>([]);
  const [importHistoryLoading, setImportHistoryLoading] = useState(false);
  const [importHistoryError, setImportHistoryError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeErr, setPurgeErr] = useState<string | null>(null);
  const [purgeOk, setPurgeOk] = useState<string | null>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openPurgeModal = useCallback(() => {
    setPurgeErr(null);
    setPurgeOpen(true);
  }, []);

  const loadImportHistory = useCallback(async () => {
    setImportHistoryError(null);
    setImportHistoryLoading(true);
    const res = await getAdminAuditLogList(authRef.current, {
      action_type: 'db_import',
      page: 1,
      page_size: 10,
    });
    setImportHistoryLoading(false);
    if (!res.ok) {
      setImportHistory([]);
      setImportHistoryError(res.detail);
      return;
    }
    setImportHistory(res.data.entries);
  }, []);

  useEffect(() => {
    if (!panelActive) return;
    void loadImportHistory();
  }, [panelActive, loadImportHistory]);

  const onExport = useCallback(async () => {
    setExportErr(null);
    setExporting(true);
    const res = await postAdminDbExportBlob(authRef.current, { stepUpPin });
    setExporting(false);
    if (!res.ok) {
      setExportErr(res.detail);
      return;
    }
    triggerBlobDownload(res.blob, res.filename);
  }, [stepUpPin]);

  const onPurgeConfirm = useCallback(async () => {
    setPurgeErr(null);
    setPurgeOk(null);
    setPurging(true);
    const res = await postAdminDbPurgeTransactions(authRef.current, {
      stepUpPin,
      idempotencyKey: crypto.randomUUID(),
    });
    setPurging(false);
    if (!res.ok) {
      setPurgeErr(res.detail);
      return;
    }
    setPurgeOpen(false);
    const msg = res.data.message ?? 'Purge terminée.';
    const counts = res.data.deleted_records;
    const hasCounts = counts && typeof counts === 'object' && Object.keys(counts).length > 0;
    setPurgeOk(hasCounts ? `${msg} Le détail des volumes supprimés est disponible dans le journal d’audit.` : msg);
  }, [stepUpPin]);

  const onImport = useCallback(async () => {
    setImportErr(null);
    setImportOk(null);
    if (!importFile) {
      setImportErr('Sélectionnez un fichier de sauvegarde (.dump).');
      return;
    }
    const name = importFile.name.toLowerCase();
    if (!name.endsWith('.dump')) {
      setImportErr('Le fichier doit être une sauvegarde au format .dump demandé par le serveur.');
      return;
    }
    setImporting(true);
    const res = await postAdminDbImportDump(authRef.current, {
      stepUpPin,
      file: importFile,
      idempotencyKey: crypto.randomUUID(),
    });
    setImporting(false);
    if (!res.ok) {
      setImportErr(res.detail);
      return;
    }
    const okMsg =
      res.data.message ??
      `Restauration terminée${res.data.imported_file ? ` (${res.data.imported_file})` : ''}.`;
    setImportOk(okMsg);
    void loadImportHistory();
  }, [stepUpPin, importFile, loadImportHistory]);

  return (
    <Paper p="md" withBorder radius="md">
      <Stack gap="md">
        <Alert color="yellow" title="Opérations sensibles">
          Ces outils agissent sur toute la base active du service. Chaque action exige votre code de confirmation
          métier. La restauration remplace l’état courant : ne l’utilisez qu’en connaissance de cause.
        </Alert>
        <PasswordInput
          label="Code de confirmation (PIN) *"
          description="Le même code que pour les autres actions sensibles. Il n’est pas mémorisé sur cet écran."
          value={stepUpPin}
          onChange={(e) => setStepUpPin(e.currentTarget.value)}
          data-testid="admin-advanced-settings-db-stepup-pin"
        />

        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          <Text fw={600} size="sm" m={0}>
            Dernières restaurations enregistrées
          </Text>
          <Button
            variant="subtle"
            size="xs"
            loading={importHistoryLoading}
            onClick={() => void loadImportHistory()}
            data-testid="admin-advanced-settings-db-import-history-refresh"
          >
            Actualiser
          </Button>
        </Group>
        <Text size="sm" c="dimmed">
          Aperçu des dix dernières restaurations connues du serveur (journal d’audit). Pour filtrer ou exporter
          l’historique complet, ouvrez le journal depuis le bouton ci-dessous.
        </Text>
        {importHistoryError ? (
          <Alert color="red" title="Historique indisponible">
            {importHistoryError}
          </Alert>
        ) : null}
        {importHistoryLoading && importHistory.length === 0 && !importHistoryError ? (
          <Text size="sm" c="dimmed">
            Chargement…
          </Text>
        ) : null}
        {!importHistoryLoading && importHistory.length === 0 && !importHistoryError ? (
          <Text size="sm" c="dimmed" data-testid="admin-advanced-settings-db-import-history-empty">
            Aucune restauration enregistrée pour le moment.
          </Text>
        ) : null}
        {importHistory.length > 0 ? (
          <Table striped highlightOnHover data-testid="admin-advanced-settings-db-import-history">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Compte</Table.Th>
                <Table.Th>Résumé</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {importHistory.map((row) => (
                <Table.Tr key={row.id}>
                  <Table.Td>{formatAuditWhen(row.timestamp)}</Table.Td>
                  <Table.Td>{row.actor_username ?? '—'}</Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>
                      {row.description ?? '—'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : null}
        <Button
          variant="light"
          onClick={() => spaNavigateTo('/admin/audit-log')}
          data-testid="admin-advanced-settings-db-audit-nav"
        >
          Ouvrir le journal d’audit…
        </Button>

        <Text fw={600} size="sm">
          Sauvegarde complète
        </Text>
        <Text size="sm" c="dimmed">
          Télécharge une copie de secours (fichier .dump). L’opération peut prendre plusieurs minutes.
        </Text>
        {exportErr ? (
          <Alert color="red" title="Export refusé">
            {exportErr}
          </Alert>
        ) : null}
        <Button
          leftSection={<Database size={18} />}
          loading={exporting}
          onClick={() => void onExport()}
          data-testid="admin-advanced-settings-db-export"
        >
          Télécharger une sauvegarde
        </Button>

        <Text fw={600} size="sm" mt="md">
          Purge des données transactionnelles
        </Text>
        <Text size="sm" c="dimmed">
          Efface les données d’exploitation (ventes, caisse, réception, etc.) selon les règles du serveur. Sans copie
          de secours récente, il n’y a pas de retour en arrière.
        </Text>
        {purgeErr && !purgeOpen ? (
          <Alert color="red" title="Purge refusée">
            {purgeErr}
          </Alert>
        ) : null}
        {purgeOk ? (
          <Alert color="green" title="Purge">
            {purgeOk}
          </Alert>
        ) : null}
        <Button
          color="orange"
          variant="light"
          onClick={() => openPurgeModal()}
          data-testid="admin-advanced-settings-db-purge-open"
        >
          Purger les transactions…
        </Button>

        <Modal
          opened={purgeOpen}
          onClose={() => setPurgeOpen(false)}
          title="Confirmer la purge"
          data-testid="admin-advanced-settings-db-purge-modal"
        >
          <Stack gap="md">
            <Text size="sm">
              Cette action supprime définitivement les données concernées côté serveur. Continuer ?
            </Text>
            {purgeErr ? (
              <Alert color="red" title="Purge refusée">
                {purgeErr}
              </Alert>
            ) : null}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setPurgeOpen(false)}>
                Annuler
              </Button>
              <Button
                color="red"
                loading={purging}
                onClick={() => void onPurgeConfirm()}
                data-testid="admin-advanced-settings-db-purge-confirm"
              >
                Confirmer la purge
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Text fw={600} size="sm" mt="md">
          Restauration depuis une sauvegarde
        </Text>
        <Text size="sm" c="dimmed">
          Utilisez uniquement un fichier .dump fourni par ce même outil de sauvegarde ou compatible avec le serveur.
        </Text>
        {importErr ? (
          <Alert color="red" title="Import refusé">
            {importErr}
          </Alert>
        ) : null}
        {importOk ? (
          <Alert color="green" title="Import">
            {importOk}
          </Alert>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept=".dump,application/octet-stream"
          style={{ display: 'none' }}
          data-testid="admin-advanced-settings-db-import-input"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setImportFile(f);
          }}
        />
        <Group>
          <Button
            variant="default"
            onClick={() => fileInputRef.current?.click()}
            data-testid="admin-advanced-settings-db-import-pick"
          >
            Choisir un fichier…
          </Button>
          {importFile ? (
            <Text size="sm" c="dimmed">
              {importFile.name}
            </Text>
          ) : null}
        </Group>
        <Button
          color="red"
          variant="light"
          loading={importing}
          onClick={() => void onImport()}
          data-testid="admin-advanced-settings-db-import-submit"
        >
          Lancer la restauration
        </Button>
      </Stack>
    </Paper>
  );
}
