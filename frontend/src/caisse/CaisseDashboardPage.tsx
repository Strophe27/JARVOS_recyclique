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
import { Stack, Alert, Loader, Button, Card, Group, Text, Anchor } from '@mantine/core';
import { PageContainer } from '../shared/layout';

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

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
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
      const withSessionStatus = await Promise.all(
        withStatus.map(async (r) => {
          try {
            const sessionStatus = await getCashSessionStatus(accessToken, r.id);
            return { ...r, sessionStatus };
          } catch {
            return { ...r, sessionStatus: undefined };
          }
        })
      );
      setRegisters(withSessionStatus);
      const started = withSessionStatus.filter((r) => r.registerStatus.status === 'started');
      if (started.length === 1 && !currentRegisterId) {
        setCurrentRegister(started[0].id, true);
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

  return (
    <PageContainer title="Dashboard caisses" maxWidth={920} testId="caisse-dashboard-page">
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
        <Stack gap="sm" data-testid="caisse-dashboard-list">
          {registers.map((item) => (
            <Card key={item.id} withBorder padding="md" radius="md">
              <Group justify="space-between">
                <div>
                  <Text fw={500}>{item.name}</Text>
                  <Text size="sm" c="dimmed">
                    {item.registerStatus.status === 'started' ? 'Occupé' : 'Libre'}
                    {item.sessionStatus?.has_open_session ? ' (session ouverte)' : ''}
                  </Text>
                </div>
                <Group gap="xs">
                  <Button
                    variant={currentRegisterId === item.id && item.registerStatus.status === 'started' ? 'filled' : 'light'}
                    onClick={() => handleSelectPoste(item)}
                    data-testid={`caisse-poste-${item.id}`}
                    aria-pressed={currentRegisterId === item.id && item.registerStatus.status === 'started'}
                  >
                    {item.name}
                  </Button>
                  {item.registerStatus.status === 'started' && !item.sessionStatus?.has_open_session && (
                    <Button
                      component={Link}
                      to={`/cash-register/session/open?register_id=${item.id}`}
                      data-testid={`caisse-open-session-${item.id}`}
                    >
                      Ouvrir une session
                    </Button>
                  )}
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </PageContainer>
  );
}
