/**
 * Page admin Analyse rapide — Story 11.6.
 * Route : /admin/quick-analysis. Comparaison de périodes, stats (GET /v1/admin/dashboard/stats, etc.). Rendu Mantine 1.4.4.
 */
import { useCallback, useEffect, useState } from 'react';
import { Text, Card, Alert, Loader, SimpleGrid } from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import { getDashboardStats } from '../api/adminDashboard';
import { PageContainer, PageSection } from '../shared/layout';

export function AdminQuickAnalysisPage() {
  const { accessToken, permissions } = useAuth();
  const [stats, setStats] = useState<{
    users_count?: number;
    sites_count?: number;
    cash_registers_count?: number;
    open_sessions_count?: number;
    pending_users_count?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccess = permissions.includes('admin') || permissions.includes('super_admin');

  const load = useCallback(async () => {
    if (!accessToken || !canAccess) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardStats(accessToken);
      setStats(data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, canAccess]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canAccess) {
    return (
      <div data-testid="admin-quick-analysis-forbidden">
        <Text>Accès réservé aux administrateurs.</Text>
      </div>
    );
  }

  return (
    <PageContainer title="Analyse rapide" maxWidth={1200} testId="admin-quick-analysis-page">
      <Text size="sm" c="dimmed" mb="xs">
        Indicateurs agrégés et comparaison de périodes (§7.12). Rechargement manuel.
      </Text>
      {error && <Alert color="red">{error}</Alert>}

      <PageSection>
        <Card withBorder padding="md" radius="md">
          <Text fw={500} mb="md">Indicateurs</Text>
          {loading ? (
            <Loader size="sm" data-testid="admin-quick-analysis-loading" />
          ) : stats ? (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {stats.users_count != null && (
                <Card withBorder padding="sm" radius="md" data-testid="quick-stat-users">
                  <Text size="sm" c="dimmed">Utilisateurs</Text>
                  <Text fw={600} size="xl">{stats.users_count}</Text>
                </Card>
              )}
              {stats.sites_count != null && (
                <Card withBorder padding="sm" radius="md" data-testid="quick-stat-sites">
                  <Text size="sm" c="dimmed">Sites</Text>
                  <Text fw={600} size="xl">{stats.sites_count}</Text>
                </Card>
              )}
              {stats.cash_registers_count != null && (
                <Card withBorder padding="sm" radius="md" data-testid="quick-stat-registers">
                  <Text size="sm" c="dimmed">Postes de caisse</Text>
                  <Text fw={600} size="xl">{stats.cash_registers_count}</Text>
                </Card>
              )}
              {stats.open_sessions_count != null && (
                <Card withBorder padding="sm" radius="md" data-testid="quick-stat-sessions">
                  <Text size="sm" c="dimmed">Sessions ouvertes</Text>
                  <Text fw={600} size="xl">{stats.open_sessions_count}</Text>
                </Card>
              )}
              {stats.pending_users_count != null && (
                <Card withBorder padding="sm" radius="md" data-testid="quick-stat-pending">
                  <Text size="sm" c="dimmed">Inscriptions en attente</Text>
                  <Text fw={600} size="xl">{stats.pending_users_count}</Text>
                </Card>
              )}
            </SimpleGrid>
          ) : (
            <Text size="sm" c="dimmed" data-testid="admin-quick-analysis-no-stats">
              Aucune statistique disponible (endpoint optionnel).
            </Text>
          )}
        </Card>
      </PageSection>
    </PageContainer>
  );
}
