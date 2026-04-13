import {
  Avatar,
  Badge,
  Button,
  Collapse,
  Grid,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  Banknote,
  Bell,
  Building2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Euro,
  LayoutList,
  Package,
  Scale,
  ScrollText,
  Settings,
  Shield,
  Tag,
  TrendingUp,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchAdminUserStatuses,
  fetchUsersListForAdminDashboard,
  fetchUsersMeForAdminDashboard,
} from '../../api/admin-legacy-dashboard-client';
import { canonicalUserIdForPresence } from '../../api/admin-users-client';
import { getCurrentOpenCashSession } from '../../api/cash-session-client';
import { fetchCashSessionStatsSummary, fetchReceptionStatsSummary } from '../../api/dashboard-legacy-stats-client';
import { getReceptionTicketsList } from '../../api/reception-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import classes from './AdminLegacyDashboardHomeWidget.module.css';

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function utcDayRangeIso(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function monthStartIsoLocal(): string {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return first.toISOString();
}

type AlertItem = {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly color: string;
  readonly icon: ReactNode;
};

export function AdminLegacyDashboardHomeWidget(_props: RegisteredWidgetProps) {
  const auth = useAuthPort();
  const [stats, setStats] = useState({ ca: 0, donations: 0, weightReceived: 0, weightSold: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [caMois, setCaMois] = useState(0);
  const [caMoisLoading, setCaMoisLoading] = useState(true);
  const [alerts, setAlerts] = useState<readonly AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<
    Array<{
      user_id: string;
      username?: string;
      first_name?: string | null;
      last_name?: string | null;
      role?: string | null;
      last_login?: string | null;
    }>
  >([]);
  const [usersOpen, setUsersOpen] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchDailyStats = useCallback(async () => {
    setStatsLoading(true);
    const range = utcDayRangeIso();
    try {
      const [financial, reception] = await Promise.all([
        fetchCashSessionStatsSummary(auth, range),
        fetchReceptionStatsSummary(auth, range),
      ]);
      setStats({
        ca: num(financial.total_sales),
        donations: num(financial.total_donations),
        weightSold: num(financial.total_weight_sold),
        weightReceived: num(reception.total_weight),
      });
    } catch {
      setStats({ ca: 0, donations: 0, weightReceived: 0, weightSold: 0 });
    } finally {
      setStatsLoading(false);
    }
  }, [auth]);

  const fetchCaMois = useCallback(async () => {
    setCaMoisLoading(true);
    try {
      const financial = await fetchCashSessionStatsSummary(auth, { start: monthStartIsoLocal() });
      setCaMois(num(financial.total_sales) + num(financial.total_donations));
    } catch {
      setCaMois(0);
    } finally {
      setCaMoisLoading(false);
    }
  }, [auth]);

  const fetchHeaderBlocks = useCallback(async () => {
    setAlertsLoading(true);
    setUsersLoading(true);
    try {
      const me = await fetchUsersMeForAdminDashboard(auth);
      const r = me?.role?.trim().toLowerCase().replace(/_/g, '-');
      setIsSuperAdmin(r === 'super-admin');

      const [sessionRes, ticketsRes] = await Promise.all([
        getCurrentOpenCashSession(auth),
        getReceptionTicketsList(auth, { page: 1, per_page: 100, status: 'opened' }),
      ]);

      const nextAlerts: AlertItem[] = [];
      if (sessionRes.ok && sessionRes.session && sessionRes.session.status === 'open') {
        const openedAt = sessionRes.session.opened_at ? new Date(sessionRes.session.opened_at) : new Date();
        const minutesOpen = Math.floor((Date.now() - openedAt.getTime()) / (1000 * 60));
        const hoursOpen = Math.floor(minutesOpen / 60);
        nextAlerts.push({
          id: `session-${sessionRes.session.id}`,
          title: 'Session caisse ouverte',
          message: hoursOpen > 0 ? `Depuis ${hoursOpen}h` : `Depuis ${minutesOpen}min`,
          color: '#10b981',
          icon: <Wallet size={16} />,
        });
      }

      if (ticketsRes.ok && ticketsRes.data.tickets.length > 1) {
        const n = ticketsRes.data.tickets.length;
        nextAlerts.push({
          id: `tickets-${n}`,
          title: 'Tickets de réception ouverts',
          message: `${n} tickets en cours`,
          color: '#06b6d4',
          icon: <Package size={16} />,
        });
      }
      setAlerts(nextAlerts);
    } catch {
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }

    try {
      const [statusRes, allUsers] = await Promise.all([
        fetchAdminUserStatuses(auth),
        fetchUsersListForAdminDashboard(auth),
      ]);
      const online = statusRes.filter((s) => s.is_online);
      const merged = online.map((st) => {
        const stCanon = canonicalUserIdForPresence(st.user_id);
        const info = allUsers.find((u) => canonicalUserIdForPresence(u.id) === stCanon);
        return {
          user_id: st.user_id,
          username: info?.username,
          first_name: info?.first_name ?? null,
          last_name: info?.last_name ?? null,
          role: info?.role ?? null,
          last_login: st.last_login ?? null,
        };
      });
      setConnectedUsers(merged);
    } catch {
      setConnectedUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void fetchDailyStats();
  }, [fetchDailyStats]);

  useEffect(() => {
    void fetchCaMois();
    const id = window.setInterval(() => void fetchCaMois(), 30_000);
    return () => window.clearInterval(id);
  }, [fetchCaMois]);

  useEffect(() => {
    void fetchHeaderBlocks();
    const id = window.setInterval(() => void fetchHeaderBlocks(), 30_000);
    return () => window.clearInterval(id);
  }, [fetchHeaderBlocks]);

  const formatCA = useMemo(
    () => (amount: number) =>
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount),
    [],
  );

  const handleNavigation = (path: string) => {
    spaNavigateTo(path);
  };

  const roleColor = (role: string | null | undefined) => {
    switch (role) {
      case 'super-admin':
        return 'red';
      case 'admin':
        return 'blue';
      case 'operator':
        return 'green';
      default:
        return 'green';
    }
  };

  const roleLabel = (role: string | null | undefined) => {
    switch (role) {
      case 'super-admin':
        return 'Super-Admin';
      case 'admin':
        return 'Admin';
      case 'operator':
        return 'Opérateur';
      default:
        return 'Bénévole';
    }
  };

  return (
    <Stack data-testid="admin-legacy-dashboard-home" className={classes.root} style={{ gap: 8 }}>
      <Paper p="md" withBorder bg="gray.0">
        <Grid align="center">
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Paper p="sm" withBorder bg="gray.0" style={{ borderRadius: 8 }}>
              <Group gap="xs" align="center" justify="space-between">
                <Group gap="xs" align="center">
                  <Bell size={16} color="#64748b" />
                  <Text size="sm" c="dimmed" fw={500}>
                    Notifications
                  </Text>
                  {alerts.length > 0 ? (
                    <Badge size="sm" color="blue" variant="light">
                      {alerts.length}
                    </Badge>
                  ) : null}
                </Group>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => setAlertsOpen((o) => !o)}
                  rightSection={alertsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                >
                  {alertsOpen ? 'Masquer' : 'Voir'}
                </Button>
              </Group>
              <Collapse in={alertsOpen}>
                <Stack gap="xs" mt="sm">
                  {alertsLoading ? (
                    <Group justify="center" p="sm">
                      <Loader size="sm" />
                      <Text size="sm" c="dimmed">
                        Chargement des notifications...
                      </Text>
                    </Group>
                  ) : alerts.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" p="sm">
                      Aucune notification
                    </Text>
                  ) : (
                    alerts.map((alert) => (
                      <Paper
                        key={alert.id}
                        p="xs"
                        withBorder
                        style={{
                          borderLeft: `3px solid ${alert.color}`,
                          backgroundColor: `${alert.color}10`,
                        }}
                      >
                        <Group gap="xs" align="flex-start">
                          <div style={{ color: alert.color }}>{alert.icon}</div>
                          <Stack gap={2} style={{ flex: 1 }}>
                            <Text size="sm" fw={500} c="dark">
                              {alert.title}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {alert.message}
                            </Text>
                          </Stack>
                        </Group>
                      </Paper>
                    ))
                  )}
                </Stack>
              </Collapse>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Paper p="sm" withBorder bg="gray.0" style={{ borderRadius: 8 }}>
              <Group gap="xs" align="center" justify="center">
                <Euro size={16} color="#64748b" />
                <Text size="sm" c="dimmed" fw={500}>
                  CA Mois:
                </Text>
                {caMoisLoading ? (
                  <Group gap="xs" align="center">
                    <Loader size="sm" />
                    <Text size="sm" c="dimmed">
                      Calcul...
                    </Text>
                  </Group>
                ) : (
                  <Group gap="xs" align="center">
                    <Text size="sm" fw={600} c="dark">
                      {formatCA(caMois)}
                    </Text>
                    {caMois > 0 ? (
                      <Badge size="sm" color="green" variant="light">
                        <TrendingUp size={12} />
                      </Badge>
                    ) : null}
                  </Group>
                )}
              </Group>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Paper p="sm" withBorder bg="gray.0" style={{ borderRadius: 8 }}>
              <Group gap="xs" align="center" justify="space-between">
                <Group gap="xs" align="center">
                  <User size={16} color="#64748b" />
                  <Text size="sm" fw={600} c="dark">
                    Utilisateurs connectés
                  </Text>
                  {connectedUsers.length > 0 ? (
                    <Badge size="sm" color="blue" variant="light">
                      {connectedUsers.length}
                    </Badge>
                  ) : null}
                </Group>
                {connectedUsers.length > 0 ? (
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => setUsersOpen((o) => !o)}
                    rightSection={usersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  >
                    {usersOpen ? 'Masquer' : 'Voir'}
                  </Button>
                ) : null}
              </Group>
              <Collapse in={usersOpen}>
                <Stack gap="xs" mt="sm">
                  {usersLoading ? (
                    <Group justify="center" p="sm">
                      <Text size="sm" c="dimmed">
                        Chargement...
                      </Text>
                    </Group>
                  ) : connectedUsers.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" p="sm">
                      Aucun utilisateur connecté
                    </Text>
                  ) : (
                    connectedUsers.map((user) => (
                      <Paper key={user.user_id} p="xs" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                        <Group gap="xs" align="center">
                          <Avatar size="sm" color={roleColor(user.role)}>
                            {(user.first_name?.charAt(0) ?? user.username?.charAt(0) ?? 'B').toUpperCase()}
                          </Avatar>
                          <Stack gap={2} style={{ flex: 1 }}>
                            <Text size="sm" fw={500} c="dark">
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.username ?? `Bénévole ${user.user_id}`}
                            </Text>
                            <Badge size="xs" color={roleColor(user.role)} variant="light">
                              {roleLabel(user.role)}
                            </Badge>
                          </Stack>
                          {user.last_login ? (
                            <Text size="xs" c="dimmed">
                              {new Date(user.last_login).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          ) : null}
                        </Group>
                      </Paper>
                    ))
                  )}
                </Stack>
              </Collapse>
            </Paper>
          </Grid.Col>
        </Grid>
      </Paper>

      <Paper p="sm" withBorder>
        <Stack gap="sm" style={{ gap: 12 }}>
          <Title order={2} size="h3" mb="xs">
            Statistiques quotidiennes
          </Title>
          {statsLoading ? (
            <Group justify="center" p="md">
              <Loader />
            </Group>
          ) : (
            <div className={classes.statRow}>
              <Paper
                p="md"
                withBorder
                className={classes.statCard}
                style={{ borderLeft: '4px solid #059669' }}
              >
                <Stack gap="xs" align="center">
                  <Group gap="xs" align="center">
                    <Banknote size={20} color="#059669" />
                    <Text size="md" fw={600} c="dark">
                      Financier
                    </Text>
                  </Group>
                  <Text size="xl" fw={700} style={{ fontSize: 24, color: '#2c3e50' }}>
                    {(stats.ca + stats.donations).toFixed(2)}€
                  </Text>
                  <Text size="sm" c="dimmed" ta="center" style={{ fontSize: 14, color: '#666' }}>
                    CA: {stats.ca.toFixed(2)}€ • Dons: {stats.donations.toFixed(2)}€
                  </Text>
                </Stack>
              </Paper>
              <Paper
                p="md"
                withBorder
                className={classes.statCard}
                style={{ borderLeft: '4px solid #d97706' }}
              >
                <Stack gap="xs" align="center">
                  <Group gap="xs" align="center">
                    <Package size={20} color="#d97706" />
                    <Text size="md" fw={600} c="dark">
                      Poids sorti
                    </Text>
                  </Group>
                  <Text size="xl" fw={700} style={{ fontSize: 24, color: '#2c3e50' }}>
                    {stats.weightSold.toFixed(1)} kg
                  </Text>
                  <Text size="sm" c="dimmed" ta="center" style={{ fontSize: 14, color: '#666' }}>
                    Sorti aujourd&apos;hui
                  </Text>
                </Stack>
              </Paper>
              <Paper
                p="md"
                withBorder
                className={classes.statCard}
                style={{ borderLeft: '4px solid #2563eb' }}
              >
                <Stack gap="xs" align="center">
                  <Group gap="xs" align="center">
                    <Scale size={20} color="#2563eb" />
                    <Text size="md" fw={600} c="dark">
                      Poids reçu
                    </Text>
                  </Group>
                  <Text size="xl" fw={700} style={{ fontSize: 24, color: '#2c3e50' }}>
                    {stats.weightReceived.toFixed(1)} kg
                  </Text>
                  <Text size="sm" c="dimmed" ta="center" style={{ fontSize: 14, color: '#666' }}>
                    Reçu aujourd&apos;hui
                  </Text>
                </Stack>
              </Paper>
            </div>
          )}
        </Stack>
      </Paper>

      <Paper p="sm" withBorder>
        <Stack gap="sm" style={{ gap: 12 }}>
          <Title order={2} size="h3" mb="xs">
            Navigation principale
          </Title>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Button
                variant="light"
                color="blue"
                className={classes.operationalButton}
                leftSection={<Users size={20} />}
                onClick={() => handleNavigation('/admin/users')}
              >
                Utilisateurs & Profils
              </Button>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Button
                variant="light"
                color="green"
                className={classes.operationalButton}
                leftSection={<Shield size={20} />}
                onClick={() => handleNavigation('/admin/groups')}
              >
                Groupes & Permissions
              </Button>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Button
                variant="light"
                color="orange"
                className={classes.operationalButton}
                leftSection={<Tag size={20} />}
                onClick={() => handleNavigation('/admin/categories')}
              >
                Catégories & Tarifs
              </Button>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Button
                variant="light"
                color="purple"
                className={classes.operationalButton}
                leftSection={<LayoutList size={20} />}
                onClick={() => handleNavigation('/admin/session-manager')}
                data-testid="admin-legacy-nav-session-manager"
              >
                Sessions de Caisse
              </Button>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Button
                variant="light"
                color="cyan"
                className={classes.operationalButton}
                leftSection={<ClipboardList size={20} />}
                onClick={() => handleNavigation('/admin/reception-sessions')}
                data-testid="admin-legacy-nav-reception-sessions"
              >
                Sessions de Réception
              </Button>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Button
                variant="light"
                color="red"
                className={classes.operationalButton}
                leftSection={<ScrollText size={20} />}
                onClick={() => handleNavigation('/admin/audit-log')}
              >
                Activité & Logs
              </Button>
            </Grid.Col>
          </Grid>
        </Stack>
      </Paper>

      {isSuperAdmin ? (
        <Paper p="sm" withBorder bg="#f8f9fa">
          <Stack gap="sm" style={{ gap: 12 }}>
            <Title order={2} size="h3" mb="xs" c="dimmed">
              Administration Super-Admin
            </Title>
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Button
                  variant="default"
                  className={classes.superAdminButton}
                  leftSection={<Building2 size={20} />}
                  onClick={() => handleNavigation('/admin/sites')}
                  data-testid="admin-legacy-nav-sites"
                >
                  Sites enregistrés
                </Button>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Button
                  variant="default"
                  className={classes.superAdminButton}
                  leftSection={<Banknote size={20} />}
                  onClick={() => handleNavigation('/admin/cash-registers')}
                  data-testid="admin-legacy-nav-cash-registers"
                >
                  Caisses enregistrées
                </Button>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Button
                  variant="default"
                  className={classes.superAdminButton}
                  leftSection={<Settings size={20} />}
                  onClick={() => handleNavigation('/admin/settings')}
                  data-testid="admin-legacy-nav-advanced-settings"
                >
                  Paramètres avancés
                </Button>
              </Grid.Col>
            </Grid>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
