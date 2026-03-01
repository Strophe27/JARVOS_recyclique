/**
 * Page admin Santé — Story 8.4, 11.5, 17.7.
 * Route : /admin/health. GET /v1/admin/health, /health/database, /health/scheduler, /health/anomalies. Rendu Mantine 1.4.4.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Loader, Card, Text, Group, Badge, Button, SimpleGrid } from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  getAdminHealth,
  getAdminHealthDatabase,
  getAdminHealthScheduler,
  getAdminHealthAnomalies,
  postAdminHealthTestNotifications,
  type AdminHealthResponse,
  type AdminHealthSchedulerResponse,
  type AdminHealthAnomalyItem,
} from '../api/adminHealthAudit';
import { PageContainer, PageSection } from '../shared/layout';

export function AdminHealthPage() {
  const { accessToken, permissions, user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin' || permissions.includes('super_admin');
  const [health, setHealth] = useState<AdminHealthResponse | null>(null);
  const [dbStatus, setDbStatus] = useState<string | null>(null);
  const [scheduler, setScheduler] = useState<AdminHealthSchedulerResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AdminHealthAnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testNotifLoading, setTestNotifLoading] = useState(false);
  const [testNotifMessage, setTestNotifMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [h, db, s, a] = await Promise.all([
        getAdminHealth(accessToken),
        getAdminHealthDatabase(accessToken),
        getAdminHealthScheduler(accessToken),
        getAdminHealthAnomalies(accessToken),
      ]);
      setHealth(h);
      setDbStatus(db.status);
      setScheduler(s);
      setAnomalies(a.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, isSuperAdmin]);

  const handleTestNotifications = useCallback(async () => {
    if (!accessToken) return;
    setTestNotifLoading(true);
    setTestNotifMessage(null);
    setError(null);
    try {
      const data = await postAdminHealthTestNotifications(accessToken);
      const msg = data.configured === false
        ? `${data.message ?? 'Configuration email incomplete'}`
        : (data.message ?? 'OK');
      setTestNotifMessage(msg);
    } catch (e) {
      setTestNotifMessage(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setTestNotifLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isSuperAdmin) {
    return (
      <div data-testid="admin-health-forbidden">
        <p>Acces reserve aux super-administrateurs.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <PageContainer title="Santé" maxWidth={1200} testId="admin-health-page">
        <Loader size="sm" data-testid="admin-health-loading" />
      </PageContainer>
    );
  }
  if (error) {
    return (
      <PageContainer title="Santé" maxWidth={1200} testId="admin-health-page">
        <Alert color="red">{error}</Alert>
      </PageContainer>
    );
  }

  const statusColor = (s: string) => (s === 'ok' ? 'green' : s === 'unconfigured' ? 'gray' : 'red');
  return (
    <PageContainer title="Santé" maxWidth={1200} testId="admin-health-page">
      <PageSection>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <Card withBorder padding="md" radius="md" shadow="sm">
            <Text size="sm" c="dimmed">Global</Text>
            <Badge color={statusColor(health?.status ?? '')} size="lg" data-testid="health-status">
              {health?.status ?? '—'}
            </Badge>
          </Card>
          <Card withBorder padding="md" radius="md" shadow="sm">
            <Text size="sm" c="dimmed">Base de données</Text>
            <Badge color={statusColor(health?.database ?? dbStatus ?? '')} data-testid="health-database">
              {health?.database ?? dbStatus ?? '—'}
            </Badge>
          </Card>
          <Card withBorder padding="md" radius="md" shadow="sm">
            <Text size="sm" c="dimmed">Redis</Text>
            <Badge color={statusColor(health?.redis ?? '')} data-testid="health-redis">
              {health?.redis ?? '—'}
            </Badge>
          </Card>
          <Card withBorder padding="md" radius="md" shadow="sm">
            <Text size="sm" c="dimmed">Scheduler (push worker)</Text>
            <Badge color={statusColor(scheduler?.status ?? '')} data-testid="health-scheduler">
              {scheduler?.status ?? '—'}
            </Badge>
            {scheduler && (
              <Text size="xs" mt="xs" c="dimmed">
                Configuré: {scheduler.configured ? 'oui' : 'non'} — Running: {scheduler.running ? 'oui' : 'non'}
              </Text>
            )}
          </Card>
        </SimpleGrid>
      </PageSection>
      {anomalies.length > 0 && (
        <PageSection>
          <Text size="sm" fw={500} c="dimmed" mb="xs">Anomalies</Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {anomalies.map((a, i) => (
              <Card key={`${a.code}-${i}`} withBorder padding="sm" radius="md" data-testid="anomaly-card">
                <Badge color={a.severity === 'error' ? 'red' : 'yellow'} size="sm" mb="xs">
                  {a.component}
                </Badge>
                <Text size="sm">{a.message}</Text>
              </Card>
            ))}
          </SimpleGrid>
        </PageSection>
      )}
      <PageSection>
        <Group>
          <Button
            loading={testNotifLoading}
            onClick={handleTestNotifications}
            variant="light"
            data-testid="btn-test-notifications"
          >
            Test notifications
          </Button>
          {testNotifMessage && (
            <Text size="sm" c="dimmed" data-testid="test-notifications-message">
              {testNotifMessage}
            </Text>
          )}
        </Group>
      </PageSection>
    </PageContainer>
  );
}
