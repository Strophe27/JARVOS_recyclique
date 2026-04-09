import { Alert, Badge, Button, Group, NumberInput, Paper, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { postOpenCashSession, resolveCashSessionOpeningIds } from '../../api/cash-session-client';
import { recycliqueClientFailureFromSalesHttp, type RecycliqueClientFailure } from '../../api/recyclique-api-error';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { setCashflowOperatingMode, setCashSessionIdInput, useCashflowDraft } from './cashflow-draft-store';
import { useCaisseServerCurrentSession } from './use-caisse-server-current-session';
import classes from './CaisseBrownfieldDashboardWidget.module.css';

/** Permissions brownfield modes caisse (legacy — alignement `recyclique-1.4.4` / groupes). */
const PERM_CASH_REAL = 'caisse.access';
const PERM_CASH_VIRTUAL = 'caisse.virtual.access';
const PERM_CASH_DEFERRED = 'caisse.deferred.access';

type OpeningMode = 'real' | 'virtual' | 'deferred';

/**
 * Story 6.1 — entrée `/caisse` brownfield : tableau de poste (pas un alias wizard seul).
 * Poste : `ContextEnvelope` (`activeRegisterId` / `workstationId`), puis `register_id` de GET session courante.
 */
export function CaisseBrownfieldDashboardWidget(_props: RegisteredWidgetProps): ReactNode {
  const draft = useCashflowDraft();
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const { session: serverSession, loading: serverSessionLoading, failure: serverSessionFailure, refresh } =
    useCaisseServerCurrentSession(auth);
  const authSession = auth.getSession();
  const keys = envelope.permissions.permissionKeys;
  const [openingMode, setOpeningMode] = useState<OpeningMode>('real');
  const [registerIdInput, setRegisterIdInput] = useState('');
  const [initialAmountInput, setInitialAmountInput] = useState<number | ''>(20);
  const [openedAtInput, setOpenedAtInput] = useState('');
  const [openingBusy, setOpeningBusy] = useState(false);
  const [openingFailure, setOpeningFailure] = useState<RecycliqueClientFailure | null>(null);
  const [openedSessionId, setOpenedSessionId] = useState('');
  const [openedRegisterId, setOpenedRegisterId] = useState('');

  const hasReal = keys.includes(PERM_CASH_REAL);
  const hasVirtual = keys.includes(PERM_CASH_VIRTUAL);
  const hasDeferred = keys.includes(PERM_CASH_DEFERRED);

  const scrollToSessionHint = useCallback(() => {
    document.getElementById('caisse-session-open-hint')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scrollToSale = useCallback(() => {
    document.getElementById('caisse-sale-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const goToClose = useCallback(() => {
    spaNavigateTo('/caisse/cloture');
  }, []);

  const envPoste = envelope.activeRegisterId?.trim() || envelope.workstationId?.trim() || '';
  const serverPoste = (serverSession?.register_id ?? '').trim();
  const resolvedPosteId = envPoste || serverPoste || openedRegisterId.trim();
  const posteLabel =
    resolvedPosteId ||
    (serverSessionLoading ? 'Résolution poste serveur…' : '— (non résolu par le serveur)');

  const envSessionId = envelope.cashSessionId?.trim() ?? '';
  const serverSessionId = serverSession?.id?.trim() ?? '';
  const resolvedSessionId = envSessionId || serverSessionId || openedSessionId.trim();
  const sessionLabel =
    serverSessionLoading && !resolvedSessionId
      ? 'Résolution session serveur…'
      : resolvedSessionId || 'Session non ouverte côté serveur';
  const registerIdValue = registerIdInput.trim() || resolvedPosteId;
  const canGoToSale = resolvedSessionId.length > 0;
  const openingBlockedReason = useMemo(() => {
    if (resolvedSessionId) {
      return 'Une session est déjà ouverte pour cette opératrice.';
    }
    if (!authSession.authenticated) {
      return 'Authentification requise avant ouverture de session.';
    }
    if (!envelope.siteId?.trim()) {
      return 'Site actif non résolu.';
    }
    if (!registerIdValue.trim()) {
      return 'Sélectionnez un poste de caisse avant l’ouverture.';
    }
    if (typeof initialAmountInput !== 'number' || !Number.isFinite(initialAmountInput) || initialAmountInput < 0) {
      return 'Le fond de caisse doit être un montant positif ou nul.';
    }
    if (openingMode === 'deferred' && openedAtInput.trim().length === 0) {
      return 'Renseignez une date/heure réelle pour la saisie différée.';
    }
    return null;
  }, [
    authSession.authenticated,
    envelope.siteId,
    initialAmountInput,
    openedAtInput,
    openingMode,
    registerIdValue,
    resolvedSessionId,
  ]);

  const submitOpening = useCallback(async () => {
    if (openingBlockedReason) return;
    setOpeningBusy(true);
    setOpeningFailure(null);
    try {
      const resolvedIds = await resolveCashSessionOpeningIds(auth, envelope.siteId);
      if (!resolvedIds.ok) {
        setOpeningFailure({
          httpStatus: 422,
          message: resolvedIds.message,
          retryable: false,
        });
        return;
      }
      const result = await postOpenCashSession(
        {
          operator_id: resolvedIds.operatorId,
          site_id: resolvedIds.siteId,
          register_id: registerIdValue.trim(),
          initial_amount: Number(initialAmountInput),
          opened_at: openingMode === 'deferred' ? new Date(openedAtInput).toISOString() : undefined,
        },
        auth,
      );
      if (!result.ok) {
        setOpeningFailure(recycliqueClientFailureFromSalesHttp(result));
        return;
      }
      setOpenedSessionId(result.session.id);
      setOpenedRegisterId((result.session.register_id ?? registerIdValue).trim());
      setCashSessionIdInput(result.session.id);
      setCashflowOperatingMode(
        openingMode === 'deferred' ? 'deferred' : openingMode === 'virtual' ? 'virtual' : 'real',
      );
      refresh();
    } finally {
      setOpeningBusy(false);
    }
  }, [
    auth,
    envelope.siteId,
    initialAmountInput,
    openedAtInput,
    openingBlockedReason,
    openingMode,
    refresh,
    registerIdValue,
  ]);

  return (
    <Stack
      gap="md"
      className={classes.root}
      data-testid="caisse-brownfield-dashboard"
      data-runtime-status={envelope.runtimeStatus}
    >
      <div>
        <Title order={3}>Caisse — poste opératoire</Title>
        <Text size="sm" c="dimmed">
          Entrée brownfield : repérez poste, session et mode, puis accédez explicitement à l’ouverture / session et au
          poste de vente (même page, workspace continu).
        </Text>
      </div>

      <div data-testid="caisse-mode-badges">
        <Text size="xs" fw={600} mb={4}>
          Modes visibles (permissions effectives)
        </Text>
        <Group gap="xs">
          <Badge
            color={hasReal ? 'green' : 'gray'}
            variant={hasReal ? 'filled' : 'light'}
            data-testid="caisse-mode-real"
          >
            Réel {hasReal ? '' : '(permission absente)'}
          </Badge>
          <Badge
            color={hasVirtual ? 'teal' : 'gray'}
            variant={hasVirtual ? 'filled' : 'light'}
            data-testid="caisse-mode-virtual"
          >
            Virtuel {hasVirtual ? '' : '(permission absente)'}
          </Badge>
          <Badge
            color={hasDeferred ? 'blue' : 'gray'}
            variant={hasDeferred ? 'filled' : 'light'}
            data-testid="caisse-mode-deferred"
          >
            Différé {hasDeferred ? '' : '(permission absente)'}
          </Badge>
        </Group>
      </div>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm" data-testid="caisse-variant-entrypoints">
        <Paper withBorder p="sm" radius="md" data-testid="caisse-entry-real">
          <Text size="sm" fw={600}>
            Réel
          </Text>
          <Text size="sm" c="dimmed">
            Poste physique standard. Même cadre brownfield, mêmes blocages contexte / site / session avant mutation.
          </Text>
        </Paper>
        <Paper withBorder p="sm" radius="md" data-testid="caisse-entry-virtual">
          <Text size="sm" fw={600}>
            Virtuel
          </Text>
          <Text size="sm" c="dimmed">
            Mode simulation visible dès l’entrée. Il réemploie le même workspace et les mêmes garde-fous serveur.
          </Text>
        </Paper>
        <Paper withBorder p="sm" radius="md" data-testid="caisse-entry-deferred">
          <Text size="sm" fw={600}>
            Différé
          </Text>
          <Text size="sm" c="dimmed">
            Saisie a posteriori : la date réelle d’ouverture / vente reste portée par la session côté serveur.
          </Text>
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="sm" radius="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <div
            data-testid="caisse-dash-poste"
            data-resolved-poste-id={resolvedPosteId || ''}
            data-server-poste-loading={serverSessionLoading && !resolvedPosteId ? 'true' : 'false'}
          >
            <Text size="xs" c="dimmed">
              Poste
            </Text>
            <Text size="sm" fw={500}>
              {posteLabel}
            </Text>
          </div>
          <div
            data-testid="caisse-dash-session"
            data-server-session-loading={serverSessionLoading ? 'true' : 'false'}
            data-resolved-session-id={resolvedSessionId || ''}
          >
            <Text size="xs" c="dimmed">
              Session
            </Text>
            <Text size="sm" fw={500}>
              {sessionLabel}
            </Text>
            {serverSessionFailure && !resolvedSessionId ? (
              <Text size="xs" c="orange" mt={4} data-testid="caisse-dash-session-server-error">
                Lecture GET /v1/cash-sessions/current indisponible — vérifiez le réseau ou réessayez.
              </Text>
            ) : null}
          </div>
          <div data-testid="caisse-dash-site">
            <Text size="xs" c="dimmed">
              Site
            </Text>
            <Text size="sm" fw={500}>
              {envelope.siteId ?? '—'}
            </Text>
          </div>
        </SimpleGrid>
      </Paper>

      <Paper id="caisse-session-open-hint" withBorder p="sm" radius="md" data-testid="caisse-session-open-hint">
        <Stack gap="sm">
          <div>
            <Text size="sm" fw={600} mb={4}>
              Ouverture / session
            </Text>
            <Text size="sm" c="dimmed">
              Étape brownfield explicite : sélection du poste, saisie du fond de caisse, puis ouverture côté serveur
              avant d’entrer en vente.
            </Text>
          </div>

          <Group gap="xs">
            {hasReal ? (
              <Button
                type="button"
                size="xs"
                variant={openingMode === 'real' ? 'filled' : 'light'}
                onClick={() => setOpeningMode('real')}
                data-testid="cashflow-open-mode-real"
              >
                Ouverture réelle
              </Button>
            ) : null}
            {hasVirtual ? (
              <Button
                type="button"
                size="xs"
                variant={openingMode === 'virtual' ? 'filled' : 'light'}
                color="teal"
                onClick={() => setOpeningMode('virtual')}
                data-testid="cashflow-open-mode-virtual"
              >
                Mode virtuel
              </Button>
            ) : null}
            {hasDeferred ? (
              <Button
                type="button"
                size="xs"
                variant={openingMode === 'deferred' ? 'filled' : 'light'}
                color="blue"
                onClick={() => setOpeningMode('deferred')}
                data-testid="cashflow-open-mode-deferred"
              >
                Saisie différée
              </Button>
            ) : null}
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              label="Poste de caisse"
              placeholder="UUID du poste"
              value={registerIdInput}
              onChange={(event) => setRegisterIdInput(event.currentTarget.value)}
              description={resolvedPosteId ? `Valeur détectée: ${resolvedPosteId}` : 'Aucune valeur détectée côté contexte.'}
              data-testid="cashflow-opening-register-id"
            />
            <NumberInput
              label="Fond de caisse (€)"
              min={0}
              decimalScale={2}
              fixedDecimalScale={false}
              value={initialAmountInput}
              onChange={(value) => setInitialAmountInput(typeof value === 'number' ? value : '')}
              data-testid="cashflow-opening-amount"
            />
          </SimpleGrid>

          {openingMode === 'deferred' ? (
            <TextInput
              label="Date / heure réelle d’ouverture"
              type="datetime-local"
              value={openedAtInput}
              onChange={(event) => setOpenedAtInput(event.currentTarget.value)}
              description="Réservé à la saisie différée, avec permission `caisse.deferred.access`."
              data-testid="cashflow-opening-opened-at"
            />
          ) : null}

          {openingMode === 'virtual' ? (
            <Alert color="teal" title="Mode virtuel (simulation)" data-testid="cashflow-opening-virtual-notice">
              L’ouverture utilise le même <code>POST /v1/cash-sessions/</code> que le poste réel ; l’interface marque la
              séance comme simulation pour l’opératrice (formation, tests). Le serveur n’expose pas encore de drapeau
              « virtuel » distinct dans ce contrat — pas de contournement des garde-fous.
            </Alert>
          ) : null}

          {resolvedSessionId && draft.operatingMode === 'virtual' ? (
            <Alert color="teal" variant="light" data-testid="caisse-dash-active-mode-virtual">
              Mode actif côté poste : <strong>virtuel (simulation)</strong>.
            </Alert>
          ) : null}
          {resolvedSessionId && draft.operatingMode === 'deferred' ? (
            <Alert color="blue" variant="light" data-testid="caisse-dash-active-mode-deferred">
              Mode actif côté poste : <strong>saisie différée</strong> (date d’ouverture portée par la session serveur).
            </Alert>
          ) : null}

          {openingFailure ? (
            <Alert color="red" title="Ouverture refusée" data-testid="cashflow-opening-error">
              {openingFailure.message}
            </Alert>
          ) : null}

          {resolvedSessionId ? (
            <Alert color="green" title="Session ouverte" data-testid="cashflow-opening-success">
              Session active: <code>{resolvedSessionId}</code>
            </Alert>
          ) : (
            <Alert color="orange" title="Vente bloquée tant que la session n’est pas ouverte" data-testid="cashflow-opening-required">
              Tant qu’aucune session serveur n’est résolue, l’entrée en vente n’est pas considérée valide brownfield-first.
            </Alert>
          )}

          <Group gap="sm">
            <Button
              type="button"
              size="sm"
              onClick={() => void submitOpening()}
              loading={openingBusy}
              disabled={openingBlockedReason !== null}
              data-testid="cashflow-submit-opening"
            >
              Ouvrir la session
            </Button>
            {openingBlockedReason ? (
              <Text size="sm" c="dimmed" data-testid="cashflow-opening-blocked-reason">
                {openingBlockedReason}
              </Text>
            ) : null}
          </Group>
        </Stack>
      </Paper>

      <Group gap="sm">
        <Button type="button" variant="default" size="sm" onClick={() => refresh()} data-testid="caisse-refresh-current-session">
          Rafraîchir session (serveur)
        </Button>
        <Button type="button" variant="light" size="sm" onClick={scrollToSessionHint}>
          Aller à l’aide « ouverture / session »
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={scrollToSale}
          disabled={!canGoToSale}
          data-testid="caisse-goto-sale-workspace"
        >
          Aller au poste de vente
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goToClose}
          data-testid="caisse-goto-close"
        >
          Clôturer la session
        </Button>
      </Group>

      <div className={classes.kpiStrip} data-testid="caisse-kpi-strip">
        <Text size="xs" c="dimmed">
          Indicateurs de séance — pilotés par le backend ; la ligne détaillée suit le poste de vente (Epic 6).
        </Text>
      </div>
    </Stack>
  );
}
