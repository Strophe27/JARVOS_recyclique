/**
 * Dashboard admin — Story 15.5.
 * Stats agregees, barre de resume, navigation coloree, section super-admin.
 * Rendu Mantine aligne 1.4.4.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Group, SimpleGrid, Text, Title, Anchor } from '@mantine/core';
import {
  IconBell,
  IconCurrencyEuro,
  IconUsers,
  IconShieldCheck,
  IconTags,
  IconCash,
  IconClipboardList,
  IconActivity,
  IconActivityHeartbeat,
  IconSettings,
  IconBuilding,
  IconDeviceDesktop,
  IconScale,
  IconDatabase,
  IconFileImport,
  IconChartBar,
} from '@tabler/icons-react';
import { useAuth } from '../auth/AuthContext';
import { getPahekoAccessDecision, getPahekoComptaUrl } from '../api/adminPahekoCompta';
import { getDashboardStats } from '../api/adminDashboard';
import type { DashboardStats } from '../api/adminDashboard';
import styles from './AdminDashboardPage.module.css';

function centsToEuros(cents: number): string {
  return (Number(cents) / 100).toFixed(2);
}

export function AdminDashboardPage() {
  const { permissions, accessToken, user } = useAuth();
  const isAdmin =
    user?.role === 'admin' || user?.role === 'super_admin' || permissions.includes('admin');
  const isSuperAdmin = user?.role === 'super_admin';

  const [pahekoAccessDecision, setPahekoAccessDecision] = useState<{
    allowed: boolean;
    reason: string;
  } | null>(null);
  const canAccessPaheko = pahekoAccessDecision?.allowed === true;
  const [pahekoComptaUrl, setPahekoComptaUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const loadPahekoAccessDecision = useCallback(async () => {
    if (!accessToken) {
      setPahekoAccessDecision(null);
      return;
    }
    try {
      const data = await getPahekoAccessDecision(accessToken);
      setPahekoAccessDecision({ allowed: data.allowed, reason: data.reason });
    } catch {
      setPahekoAccessDecision({ allowed: false, reason: 'decision_unavailable' });
    }
  }, [accessToken]);

  const loadPahekoUrl = useCallback(async () => {
    if (!accessToken || !canAccessPaheko) {
      setPahekoComptaUrl(null);
      return;
    }
    try {
      const data = await getPahekoComptaUrl(accessToken);
      setPahekoComptaUrl(data.url ?? null);
    } catch {
      setPahekoComptaUrl(null);
    }
  }, [accessToken, canAccessPaheko]);

  const loadStats = useCallback(async () => {
    if (!isAdmin || !accessToken) return;
    try {
      const data = await getDashboardStats(accessToken);
      setStats(data ?? null);
    } catch {
      setStats(null);
    }
  }, [isAdmin, accessToken]);

  useEffect(() => {
    loadPahekoAccessDecision();
  }, [loadPahekoAccessDecision]);

  useEffect(() => {
    loadPahekoUrl();
  }, [loadPahekoUrl]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const notifications = stats?.notifications_count ?? stats?.pending_users_count ?? 0;
  const caMois = stats?.ca_mois ?? 0;
  const connectedUsers = stats?.connected_users_count ?? stats?.open_sessions_count ?? 0;
  const caJour = stats?.ca_jour ?? 0;
  const donsJour = stats?.dons_jour ?? 0;
  const poidsSorti = stats?.poids_sorti_kg ?? 0;
  const poidsRecu = stats?.poids_recu_kg ?? 0;

  return (
    <div className={styles.page} data-testid="page-admin">
      {isAdmin && (
        <>
          {/* Title */}
          <Title order={2} className={styles.title} data-testid="admin-dashboard-title">
            Tableau de Bord d&apos;Administration
          </Title>

          {/* Summary bar */}
          <div className={styles.summaryBar} data-testid="admin-summary-bar">
            <div className={styles.summaryCell} data-testid="admin-summary-notifications">
              <IconBell size={20} stroke={1.5} />
              <Text size="sm">Notifications</Text>
              <Badge size="sm" color="red" variant="filled">{notifications}</Badge>
              <Anchor component={Link} to="/admin/users" size="sm">Voir</Anchor>
            </div>
            <div className={styles.summaryCell} data-testid="admin-summary-ca-mois">
              <IconCurrencyEuro size={20} stroke={1.5} />
              <Text size="sm">CA Mois</Text>
              <Text fw={600} size="sm">{centsToEuros(caMois)}&nbsp;&euro;</Text>
            </div>
            <div className={styles.summaryCell} data-testid="admin-summary-connected-users">
              <IconUsers size={20} stroke={1.5} />
              <Text size="sm">Utilisateurs connect&eacute;s</Text>
              <Badge size="sm" color="blue" variant="filled">{connectedUsers}</Badge>
              <Anchor component={Link} to="/admin/users" size="sm">Voir</Anchor>
            </div>
          </div>

          {/* Daily stats */}
          <div className={styles.statsSection} data-testid="admin-stats-section">
            <Text fw={700} size="lg" mb="md">Statistiques quotidiennes</Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <div
                className={`${styles.statCard} ${styles.statCardGreen}`}
                data-testid="admin-stat-financier"
              >
                <Group justify="center" gap="xs" mb="xs" className={styles.statCardHeader}>
                  <IconCurrencyEuro size={18} stroke={1.5} />
                  <Text fw={600} c="inherit">Financier</Text>
                </Group>
                <Text fw={700} size="xl">{centsToEuros(caJour)}&nbsp;&euro;</Text>
                <Text size="sm" c="dimmed">
                  CA: {centsToEuros(caJour)}&euro; &middot; Dons: {centsToEuros(donsJour)}&euro;
                </Text>
              </div>
              <div
                className={`${styles.statCard} ${styles.statCardOrange}`}
                data-testid="admin-stat-poids-sorti"
              >
                <Group justify="center" gap="xs" mb="xs" className={styles.statCardHeader}>
                  <IconScale size={18} stroke={1.5} />
                  <Text fw={600} c="inherit">Poids sorti</Text>
                </Group>
                <Text fw={700} size="xl">{Number(poidsSorti || 0).toFixed(1)}&nbsp;kg</Text>
                <Text size="sm" c="dimmed">Sorti aujourd&apos;hui</Text>
              </div>
              <div
                className={`${styles.statCard} ${styles.statCardBlue}`}
                data-testid="admin-stat-poids-recu"
              >
                <Group justify="center" gap="xs" mb="xs" className={styles.statCardHeader}>
                  <IconScale size={18} stroke={1.5} />
                  <Text fw={600} c="inherit">Poids re&ccedil;u</Text>
                </Group>
                <Text fw={700} size="xl">{Number(poidsRecu || 0).toFixed(1)}&nbsp;kg</Text>
                <Text size="sm" c="dimmed">Re&ccedil;u aujourd&apos;hui</Text>
              </div>
            </SimpleGrid>
          </div>

          {/* Main navigation */}
          <div className={styles.navSection} data-testid="admin-nav-section">
            <Text fw={700} size="lg" mb="md">Navigation principale</Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Link
                to="/admin/users"
                className={`${styles.navBlock} ${styles.navBlockBlue}`}
                data-testid="admin-nav-users"
                aria-label="Utilisateurs & Profils"
              >
                <IconUsers size={22} stroke={1.5} />
                <span>Utilisateurs &amp; Profils</span>
              </Link>
              <Link
                to="/admin/groups"
                className={`${styles.navBlock} ${styles.navBlockGreen}`}
                data-testid="admin-nav-groups"
                aria-label="Groupes & Permissions"
              >
                <IconShieldCheck size={22} stroke={1.5} />
                <span>Groupes &amp; Permissions</span>
              </Link>
              <Link
                to="/admin/categories"
                className={`${styles.navBlock} ${styles.navBlockOrange}`}
                data-testid="admin-nav-categories"
                aria-label="Categories & Tarifs"
              >
                <IconTags size={22} stroke={1.5} />
                <span>Cat&eacute;gories &amp; Tarifs</span>
              </Link>
              <Link
                to="/admin/session-manager"
                className={`${styles.navBlock} ${styles.navBlockGray}`}
                data-testid="admin-nav-sessions-caisse"
                aria-label="Sessions de Caisse"
              >
                <IconCash size={22} stroke={1.5} />
                <span>Sessions de Caisse</span>
              </Link>
              <Link
                to="/admin/reception"
                className={`${styles.navBlock} ${styles.navBlockGreen}`}
                data-testid="admin-nav-sessions-reception"
                aria-label="Sessions de Reception"
              >
                <IconClipboardList size={22} stroke={1.5} />
                <span>Sessions de R&eacute;ception</span>
              </Link>
              <Link
                to="/admin/audit-log"
                className={`${styles.navBlock} ${styles.navBlockRed}`}
                data-testid="admin-nav-activity"
                aria-label="Activite & Logs"
              >
                <IconActivity size={22} stroke={1.5} />
                <span>Activit&eacute; &amp; Logs</span>
              </Link>
            </SimpleGrid>
            {canAccessPaheko && pahekoComptaUrl && (
              <Anchor href={pahekoComptaUrl} target="_blank" rel="noopener noreferrer" mt="md" size="sm">
                Comptabilit&eacute; (Paheko)
              </Anchor>
            )}
            {pahekoAccessDecision != null && !pahekoAccessDecision.allowed && (
              <Text size="sm" c="dimmed" mt="md" data-testid="paheko-access-restricted">
                Acces reserve roles autorises (admin/super_admin) ou exception explicite.
              </Text>
            )}
          </div>

          {/* Super-admin section */}
          {isSuperAdmin && (
            <div className={styles.superAdminSection} data-testid="admin-superadmin-section">
              <Text fw={700} size="lg" mb="md">Administration Super-Admin</Text>
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <Link
                  to="/admin/health"
                  className={styles.superAdminBlock}
                  data-testid="admin-superadmin-health"
                  aria-label="Sante Systeme"
                >
                  <IconActivityHeartbeat size={22} stroke={1.5} />
                  <span>Sant&eacute; Syst&egrave;me</span>
                </Link>
                <Link
                  to="/admin/settings"
                  className={styles.superAdminBlock}
                  data-testid="admin-superadmin-settings"
                  aria-label="Parametres Avances"
                >
                  <IconSettings size={22} stroke={1.5} />
                  <span>Param&egrave;tres Avanc&eacute;s</span>
                </Link>
                <Link
                  to="/admin/sites"
                  className={styles.superAdminBlock}
                  data-testid="admin-superadmin-sites"
                  aria-label="Sites"
                >
                  <IconBuilding size={22} stroke={1.5} />
                  <span>Sites</span>
                </Link>
                <Link
                  to="/admin/cash-registers"
                  className={styles.superAdminBlock}
                  data-testid="admin-superadmin-cash-registers"
                  aria-label="Postes de caisse"
                >
                  <IconDeviceDesktop size={22} stroke={1.5} />
                  <span>Postes de caisse</span>
                </Link>
                <Link
                  to="/admin/db"
                  className={styles.superAdminBlock}
                  data-testid="admin-superadmin-db"
                  aria-label="BDD (export, purge, import)"
                >
                  <IconDatabase size={22} stroke={1.5} />
                  <span>BDD (export, purge, import)</span>
                </Link>
                <Link
                  to="/admin/import/legacy"
                  className={styles.superAdminBlock}
                  data-testid="admin-superadmin-import-legacy"
                  aria-label="Import legacy"
                >
                  <IconFileImport size={22} stroke={1.5} />
                  <span>Import legacy</span>
                </Link>
                <Link
                  to="/admin/quick-analysis"
                  className={styles.superAdminBlock}
                  data-testid="admin-superadmin-quick-analysis"
                  aria-label="Analyse rapide"
                >
                  <IconChartBar size={22} stroke={1.5} />
                  <span>Analyse rapide</span>
                </Link>
              </SimpleGrid>
            </div>
          )}
        </>
      )}
    </div>
  );
}
