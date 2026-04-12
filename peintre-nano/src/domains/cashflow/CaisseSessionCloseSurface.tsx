import {
  Alert,
  Button,
  Group,
  LoadingOverlay,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { ArrowLeft, Calculator } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  needsVarianceComment,
  postCloseCashSession,
  theoreticalCloseAmount,
} from '../../api/cash-session-client';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import { useCaisseServerCurrentSession } from './use-caisse-server-current-session';
import classes from './CaisseBrownfieldDashboardWidget.module.css';

function isSessionEmptyForClose(session: {
  total_sales?: number | null;
  total_items?: number | null;
}): boolean {
  const ts = session.total_sales;
  const ti = session.total_items;
  const emptySales = ts === 0 || ts === null || ts === undefined;
  const emptyItems = ti === 0 || ti === null || ti === undefined;
  return emptySales && emptyItems;
}

export type CaisseSessionCloseSurfaceProps = {
  readonly salePath: string;
};

/**
 * Surface « Fermeture de Caisse » alignée legacy `CloseSession.tsx` — données et mutation via OpenAPI
 * (`getCurrentOpenCashSession` / `postCloseCashSession`), pas de règles métier dupliquées.
 */
export function CaisseSessionCloseSurface({ salePath }: CaisseSessionCloseSurfaceProps): ReactNode {
  const auth = useAuthPort();
  const { session, loading, failure, refresh } = useCaisseServerCurrentSession(auth);
  const [actualAmount, setActualAmount] = useState<number | ''>('');
  const [varianceComment, setVarianceComment] = useState('');
  const [stepUpPin, setStepUpPin] = useState('');
  const [closeBusy, setCloseBusy] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);

  const theoretical = useMemo(
    () => (session && session.status === 'open' ? theoreticalCloseAmount(session) : 0),
    [session],
  );

  useEffect(() => {
    if (!loading && session && session.status === 'open' && isSessionEmptyForClose(session)) {
      setShowEmptyWarning(true);
    }
  }, [loading, session]);

  useEffect(() => {
    if (loading) return;
    if (failure) return;
    if (!session || session.status !== 'open') {
      spaNavigateTo('/caisse');
    }
  }, [loading, failure, session]);

  const handleBackToSale = useCallback(() => {
    spaNavigateTo(salePath);
  }, [salePath]);

  const isEmpty = session && session.status === 'open' ? isSessionEmptyForClose(session) : false;

  const performClose = useCallback(async () => {
    if (!session || session.status !== 'open') return;
    const pin = stepUpPin.trim();
    if (!pin) {
      setCloseError('Saisissez le code step-up (PIN opérateur) pour confirmer la clôture.');
      return;
    }
    setCloseBusy(true);
    setCloseError(null);
    try {
      if (isEmpty) {
        const initial = Number(session.initial_amount) || 0;
        const res = await postCloseCashSession(
          session.id,
          { actual_amount: initial, variance_comment: null },
          auth,
          { stepUpPin: pin },
        );
        if (!res.ok) {
          setCloseError(res.detail);
          return;
        }
        spaNavigateTo('/caisse');
        return;
      }
      const actualNum = typeof actualAmount === 'number' ? actualAmount : Number(actualAmount);
      if (!Number.isFinite(actualNum)) {
        setCloseError('Montant physique invalide.');
        return;
      }
      if (needsVarianceComment(actualNum, theoretical) && !varianceComment.trim()) {
        setCloseError("Un commentaire est obligatoire en cas d'ecart avec le montant theorique.");
        return;
      }
      const res = await postCloseCashSession(
        session.id,
        {
          actual_amount: actualNum,
          variance_comment: varianceComment.trim() || null,
        },
        auth,
        { stepUpPin: pin },
      );
      if (!res.ok) {
        setCloseError(res.detail);
        return;
      }
      spaNavigateTo('/caisse');
    } finally {
      setCloseBusy(false);
      refresh();
    }
  }, [auth, actualAmount, isEmpty, refresh, session, stepUpPin, theoretical, varianceComment]);

  if (failure && !session) {
    return (
      <Stack gap="md" className={classes.root} data-testid="cash-register-session-close-surface">
        <Title order={1}>
          <Group gap="xs">
            <Calculator size={28} aria-hidden />
            Fermeture de Caisse
          </Group>
        </Title>
        <Alert color="red" title="Lecture session impossible">
          {failure.message}
        </Alert>
        <Group>
          <Button type="button" variant="default" onClick={() => spaNavigateTo('/caisse')}>
            Retour hub caisse
          </Button>
          <Button type="button" onClick={() => refresh()}>
            Réessayer
          </Button>
        </Group>
      </Stack>
    );
  }

  if (loading || !session || session.status !== 'open') {
    return (
      <Stack gap="md" className={classes.root} data-testid="cash-register-session-close-surface">
        <Title order={1}>
          <Group gap="xs">
            <Calculator size={28} aria-hidden />
            Fermeture de Caisse
          </Group>
        </Title>
        <Paper withBorder p="xl" pos="relative">
          <LoadingOverlay visible={loading} />
          <Text ta="center" data-testid="cashflow-session-close-loading-text">
            Chargement des données de la session...
          </Text>
        </Paper>
      </Stack>
    );
  }

  const variance =
    typeof actualAmount === 'number' && Number.isFinite(actualAmount)
      ? Math.round((actualAmount - theoretical) * 100) / 100
      : 0;
  const hasVariance =
    typeof actualAmount === 'number' &&
    Number.isFinite(actualAmount) &&
    needsVarianceComment(actualAmount, theoretical);

  return (
    <Stack gap="md" className={classes.root} data-testid="cash-register-session-close-surface">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Button
          type="button"
          variant="default"
          leftSection={<ArrowLeft size={18} />}
          onClick={handleBackToSale}
          data-testid="cashflow-session-close-back-to-sale"
        >
          Retour à la vente
        </Button>
        <Title order={1} data-testid="cashflow-session-close-heading">
          <Group gap="xs">
            <Calculator size={28} aria-hidden />
            Fermeture de Caisse
          </Group>
        </Title>
      </Group>

      {closeError ? (
        <Alert color="red" title="Clôture" onClose={() => setCloseError(null)} withCloseButton>
          {closeError}
        </Alert>
      ) : null}

      {showEmptyWarning && isEmpty ? (
        <Paper withBorder p="lg" style={{ borderColor: '#ff9800', backgroundColor: '#fff3e0' }}>
          <Title order={3} c="orange.9" mb="sm">
            Session sans transaction
          </Title>
          <Text size="sm" c="dark.7" mb="md">
            Cette session n&apos;a eu aucune transaction (aucune vente). Elle ne sera pas enregistrée dans
            l&apos;historique.
          </Text>
          <TextInput
            label="Code step-up (PIN opérateur) *"
            type="password"
            value={stepUpPin}
            onChange={(e) => setStepUpPin(e.currentTarget.value)}
            mb="md"
            data-testid="cashflow-session-close-pin-empty"
          />
          <Group>
            <Button
              type="button"
              color="orange"
              loading={closeBusy}
              onClick={() => void performClose()}
              data-testid="cashflow-session-close-empty-continue"
            >
              Continuer quand même
            </Button>
            <Button type="button" variant="default" disabled={closeBusy} onClick={handleBackToSale}>
              Annuler
            </Button>
          </Group>
        </Paper>
      ) : (
        <>
          <Paper withBorder p="md">
            <Title order={2} mb="md">
              Résumé de la Session
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" data-testid="cashflow-session-close-summary">
              <div>
                <Text size="xs" c="dimmed">
                  Fond de Caisse Initial
                </Text>
                <Text fw={700}>{Number(session.initial_amount ?? 0).toFixed(2)} €</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Total des Ventes
                </Text>
                <Text fw={700}>{Number(session.total_sales ?? 0).toFixed(2)} €</Text>
              </div>
              {Number(session.total_donations ?? 0) > 0 ? (
                <div>
                  <Text size="xs" c="dimmed">
                    Total des Dons
                  </Text>
                  <Text fw={700}>{Number(session.total_donations ?? 0).toFixed(2)} €</Text>
                </div>
              ) : null}
              <div>
                <Text size="xs" c="dimmed">
                  Montant Théorique
                </Text>
                <Text fw={700}>{theoretical.toFixed(2)} €</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Articles Vendus
                </Text>
                <Text fw={700}>{session.total_items ?? 0}</Text>
              </div>
            </SimpleGrid>
          </Paper>

          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={closeBusy} />
            <Title order={2} mb="md">
              Contrôle des Montants
            </Title>
            <Stack gap="sm">
              <NumberInput
                label="Montant Physique Compté *"
                min={0}
                decimalScale={2}
                value={actualAmount === '' ? undefined : actualAmount}
                onChange={(v) => setActualAmount(typeof v === 'number' ? v : '')}
                data-testid="cashflow-session-close-actual-amount"
              />
              {typeof actualAmount === 'number' && Number.isFinite(actualAmount) ? (
                <Text size="sm" c={hasVariance ? 'orange' : 'green'} fw={600}>
                  {hasVariance ? 'Écart détecté' : 'Aucun écart'} : {variance > 0 ? '+' : ''}
                  {variance.toFixed(2)} €
                </Text>
              ) : null}
              {hasVariance ? (
                <Textarea
                  label="Commentaire sur l'ecart *"
                  value={varianceComment}
                  onChange={(e) => setVarianceComment(e.currentTarget.value)}
                  data-testid="cashflow-session-close-variance-comment"
                />
              ) : null}
              <TextInput
                label="Code step-up (PIN opérateur) *"
                type="password"
                autoComplete="one-time-code"
                value={stepUpPin}
                onChange={(e) => setStepUpPin(e.currentTarget.value)}
                description="Requis pour POST /v1/cash-sessions/{id}/close — ne jamais journaliser cette valeur."
                data-testid="cashflow-session-close-pin"
              />
              <Group justify="flex-end" mt="md">
                <Button type="button" variant="default" onClick={handleBackToSale} disabled={closeBusy}>
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={() => void performClose()}
                  loading={closeBusy}
                  disabled={
                    closeBusy ||
                    actualAmount === '' ||
                    !stepUpPin.trim() ||
                    (hasVariance && !varianceComment.trim())
                  }
                  data-testid="cashflow-session-close-submit"
                >
                  {closeBusy ? 'Fermeture en cours...' : 'Fermer la Session'}
                </Button>
              </Group>
            </Stack>
          </Paper>
        </>
      )}
    </Stack>
  );
}
