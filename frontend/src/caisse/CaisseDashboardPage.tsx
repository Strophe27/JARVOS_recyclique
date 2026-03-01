/**
 * Page dashboard caisses — Story 3.4, 3.5, 5.1, 11.2.
 * Charge GET /v1/cash-registers, GET /v1/cash-registers/status, et pour chaque poste
 * GET /v1/cash-sessions/status/{register_id}. Affiche liste des postes avec occupé/libre (session)
 * et lien vers ouverture de session. Rendu Mantine aligné 1.4.4.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCashRegisters,
  getCashRegistersStatus,
  getCashSessionStatus,
  getCurrentCashSession,
} from '../api/caisse';
import type {
  CashRegisterItem,
  CashRegisterStatusItem,
  CashSessionStatusItem,
} from '../api/caisse';
import { useAuth } from '../auth/AuthContext';
import { useCaisse } from './CaisseContext';
import {
  Stack,
  Alert,
  Loader,
  Button,
  Card,
  Group,
  Text,
  Anchor,
  Badge,
} from '@mantine/core';
import { PageContainer } from '../shared/layout';
import styles from './CaisseDashboardPage.module.css';

type RegisterWithStatus = CashRegisterItem & {
  registerStatus: CashRegisterStatusItem;
  sessionStatus?: CashSessionStatusItem;
};

export function CaisseDashboardPage() {
  const { accessToken } = useAuth();
  const { setCurrentRegister, currentRegisterId } = useCaisse();
  const [registers, setRegisters] = useState<RegisterWithStatus[]>([]);
  const [currentSession, setCurrentSession] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatusWarning, setSessionStatusWarning] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    setSessionStatusWarning(false);
    try {
      const [list, statusList] = await Promise.all([
        getCashRegisters(accessToken),
        getCashRegistersStatus(accessToken),
      ]);
      const statusByRegisterId: Record<string, CashRegisterStatusItem> = {};
      statusList.forEach((s) => {
        statusByRegisterId[s.register_id] = s;
      });
      const withStatus: RegisterWithStatus[] = list.map((r) => ({
        ...r,
        registerStatus: statusByRegisterId[r.id] ?? {
          register_id: r.id,
          status: 'free',
          started_at: null,
          started_by_user_id: null,
        },
      }));
      let sessionStatusFailed = false;
      const withSessionStatus = await Promise.all(
        withStatus.map(async (r) => {
          try {
            const sessionStatus = await getCashSessionStatus(accessToken, r.id);
            return { ...r, sessionStatus };
          } catch {
            sessionStatusFailed = true;
            return { ...r, sessionStatus: undefined };
          }
        })
      );
      setSessionStatusWarning(sessionStatusFailed);
      setRegisters(withSessionStatus);
      const startedWithSession = withSessionStatus.filter(
        (r) => r.registerStatus.status === 'started' && r.sessionStatus?.has_open_session
      );
      if (startedWithSession.length === 1 && !currentRegisterId) {
        setCurrentRegister(startedWithSession[0].id, true);
      }
      const current = await getCurrentCashSession(accessToken);
      setCurrentSession(current ? { id: current.id } : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, currentRegisterId, setCurrentRegister]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectPoste = useCallback(
    (item: RegisterWithStatus) => {
      if (item.registerStatus.status === 'started') {
        setCurrentRegister(item.id, true);
      } else {
        setCurrentRegister(item.id, false);
      }
    },
    [setCurrentRegister]
  );

  const renderRegisterAction = (item: RegisterWithStatus) => {
    const isStarted = item.registerStatus.status === 'started';
    const hasOpenSession = item.sessionStatus?.has_open_session ?? false;
    const isOpen = isStarted && hasOpenSession;
    const label = isOpen ? 'Accéder' : 'Ouvrir';

    if (!isOpen) {
      return (
        <Button
          component={Link}
          to={`/cash-register/session/open?register_id=${item.id}`}
          onClick={() => handleSelectPoste(item)}
          data-testid={`caisse-open-session-${item.id}`}
        >
          {label}
        </Button>
      );
    }

    return (
      <Button
        component={Link}
        to="/cash-register/sale"
        variant="filled"
        onClick={() => handleSelectPoste(item)}
        data-testid={`caisse-poste-${item.id}`}
        aria-pressed={currentRegisterId === item.id && isOpen}
      >
        {label}
      </Button>
    );
  };

  const renderRegisterCard = (item: RegisterWithStatus) => {
    const isStarted = item.registerStatus.status === 'started';
    const statusLabel = isStarted ? 'OUVERTE' : 'FERMÉE';
    const statusColor = isStarted ? 'green' : 'red';
    const siteLabel = item.location ?? item.site_id;

    return (
      <Card key={item.id} padding="md" radius="md" shadow="sm" className={styles.cardBase}>
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text fw={600}>{item.name}</Text>
              <Text size="sm" c="dimmed">
                {siteLabel}
              </Text>
            </div>
            <Badge color={statusColor} size="sm" variant="filled">
              {statusLabel}
            </Badge>
          </Group>
          <Group>
            {renderRegisterAction(item)}
          </Group>
        </Stack>
      </Card>
    );
  };

  return (
    <PageContainer title="Sélection du Poste de Caisse" maxWidth={1100} testId="caisse-dashboard-page">
      {currentSession && (
        <Text size="sm" data-testid="caisse-current-session">
          <Anchor component={Link} to="/cash-register/session/close">
            Fermer la session en cours
          </Anchor>
        </Text>
      )}
      {loading && (
        <Loader size="sm" data-testid="caisse-dashboard-loading" />
      )}
      {error && (
        <Alert color="red" data-testid="caisse-dashboard-error">
          {error}
        </Alert>
      )}
      {!loading && !error && (
        <div className={styles.cardsRow} data-testid="caisse-dashboard-list">
          {registers.map((item) => renderRegisterCard(item))}
          <Card
            padding="md"
            radius="md"
            shadow="sm"
            withBorder
            className={`${styles.cardBase} ${styles.virtualCard}`}
          >
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start">
                <Text fw={600}>Caisse Virtuelle</Text>
                <Badge color="blue" size="sm" variant="light">
                  SIMULATION
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                Mode d&apos;entraînement sans impact sur les données réelles
              </Text>
              <Text size="xs" c="dimmed" fs="italic">
                Hérite des options de workflow de la caisse source sélectionnée
              </Text>
              <Button variant="outline" component={Link} to="/cash-register/virtual">
                Simuler
              </Button>
            </Stack>
          </Card>
          <Card
            padding="md"
            radius="md"
            shadow="sm"
            withBorder
            className={`${styles.cardBase} ${styles.deferredCard}`}
          >
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start">
                <Text fw={600}>Saisie différée</Text>
                <Badge color="orange" size="sm" variant="light">
                  ADMIN
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                Saisir des ventes d&apos;anciens cahiers avec leur date réelle de vente
              </Text>
              <Text size="xs" c="dimmed" fs="italic">
                Hérite des options de workflow de la caisse source sélectionnée
              </Text>
              <Button variant="outline" color="orange" component={Link} to="/cash-register/deferred">
                Accéder
              </Button>
            </Stack>
          </Card>
        </div>
      )}
      {!loading && !error && sessionStatusWarning && (
        <Alert color="yellow" data-testid="caisse-session-status-warning">
          Statut de session indisponible pour certains postes.
        </Alert>
      )}
    </PageContainer>
  );
}
