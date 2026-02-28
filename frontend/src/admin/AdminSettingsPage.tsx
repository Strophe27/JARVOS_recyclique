/**
 * Page admin Paramètres — Story 8.4, 11.5.
 * Route : /admin/settings. GET/PUT /v1/admin/settings. Rendu Mantine 1.4.4.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Loader,
  Card,
  Text,
  NumberInput,
  Button,
  Tabs,
} from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  getAdminSettings,
  putAdminSettings,
  postAdminSettingsEmailTest,
  type SettingsResponse,
} from '../api/adminHealthAudit';
import { PageContainer, PageSection } from '../shared/layout';

export function AdminSettingsPage() {
  const { accessToken, permissions } = useAuth();
  const [_settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activityThreshold, setActivityThreshold] = useState<string>('');
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailTestMessage, setEmailTestMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !permissions.includes('admin')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminSettings(accessToken);
      setSettings(res);
      setActivityThreshold(res.activity_threshold != null ? String(res.activity_threshold) : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, permissions]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveActivity = async () => {
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    try {
      const value = activityThreshold === '' ? undefined : Number(activityThreshold);
      const res = await putAdminSettings(accessToken, { activity_threshold: value });
      setSettings(res);
      setActivityThreshold(res.activity_threshold != null ? String(res.activity_threshold) : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!accessToken) return;
    setEmailTestLoading(true);
    setEmailTestMessage(null);
    setError(null);
    try {
      const data = await postAdminSettingsEmailTest(accessToken);
      setEmailTestMessage(data.message ?? 'OK');
    } catch (e) {
      setEmailTestMessage(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setEmailTestLoading(false);
    }
  };

  if (!permissions.includes('admin')) {
    return (
      <div data-testid="admin-settings-forbidden">
        <p>Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <PageContainer title="Paramètres" maxWidth={1200} testId="admin-settings-page">
        <Loader size="sm" data-testid="admin-settings-loading" />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Paramètres" maxWidth={1200} testId="admin-settings-page">
      <Text size="sm" c="dimmed" mb="xs">
        Seuils d&apos;alertes, session, email, activité (stub v1 : lecture/écriture minimale).
      </Text>
      {error && <Alert color="red">{error}</Alert>}
      <PageSection>
        <Tabs defaultValue="activity">
          <Tabs.List>
            <Tabs.Tab value="activity">Seuil d&apos;activité</Tabs.Tab>
            <Tabs.Tab value="alerts">Alertes</Tabs.Tab>
            <Tabs.Tab value="session">Session</Tabs.Tab>
            <Tabs.Tab value="email">Email</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="activity">
            <Card withBorder padding="md" radius="md" mt="md">
              <NumberInput
                label="Seuil d'activité"
                placeholder="Optionnel"
                value={activityThreshold}
                onChange={(v) => setActivityThreshold(String(v ?? ''))}
                data-testid="input-activity-threshold"
              />
              <Button mt="md" loading={saving} onClick={handleSaveActivity} data-testid="save-activity">
                Enregistrer
              </Button>
            </Card>
          </Tabs.Panel>
          <Tabs.Panel value="alerts">
            <Card withBorder padding="md" radius="md" mt="md">
              <Text size="sm" c="dimmed">Seuils d&apos;alertes — à configurer (stub).</Text>
            </Card>
          </Tabs.Panel>
          <Tabs.Panel value="session">
            <Card withBorder padding="md" radius="md" mt="md">
              <Text size="sm" c="dimmed">Paramètres de session — à configurer (stub).</Text>
            </Card>
          </Tabs.Panel>
          <Tabs.Panel value="email">
            <Card withBorder padding="md" radius="md" mt="md">
              <Text size="sm" c="dimmed">Paramètres email et test — à configurer (stub).</Text>
              <Button
                mt="md"
                variant="light"
                loading={emailTestLoading}
                onClick={handleTestEmail}
                data-testid="btn-test-email"
              >
                Test email
              </Button>
              {emailTestMessage && (
                <Text size="sm" c="dimmed" mt="xs" data-testid="email-test-message">
                  {emailTestMessage}
                </Text>
              )}
            </Card>
          </Tabs.Panel>
        </Tabs>
      </PageSection>
    </PageContainer>
  );
}
