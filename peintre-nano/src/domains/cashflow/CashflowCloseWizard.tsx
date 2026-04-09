import { Alert, Button, Group, NumberInput, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import {
  CLOSE_VARIANCE_TOLERANCE_EUR,
  getCurrentOpenCashSession,
  needsVarianceComment,
  postCloseCashSession,
  theoreticalCloseAmount,
  type CashSessionCurrentV1,
} from '../../api/cash-session-client';
import { PERMISSION_CASHFLOW_NOMINAL } from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import { FlowRenderer } from '../../flows/FlowRenderer';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import { CashflowOperationalSyncNotice } from './cashflow-operational-sync-notice';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';
import { useCashflowDraft } from './cashflow-draft-store';
import classes from './CashflowCloseWizard.module.css';

const RELAY_EPIC8_COPY =
  'Session fermée dans Recyclique. La mise en cohérence comptable avec Paheko est prise en charge par d’autres flux (synchronisation, hors périmètre de cet écran). Aucun état de synchronisation n’est affiché ici.';

type EntryBlock =
  | { readonly blocked: false }
  | { readonly blocked: true; readonly title: string; readonly body: string };

function useCloseEntryBlock(): EntryBlock {
  const envelope = useContextEnvelope();
  return useMemo((): EntryBlock => {
    if (envelope.runtimeStatus === 'forbidden') {
      return {
        blocked: true,
        title: 'Contexte bloqué',
        body:
          envelope.restrictionMessage?.trim() ||
          'Accès refusé par le serveur (enveloppe « forbidden »).',
      };
    }
    if (envelope.runtimeStatus === 'degraded') {
      return {
        blocked: true,
        title: 'Contexte restreint',
        body:
          envelope.restrictionMessage?.trim() ||
          'Contexte dégradé — rafraîchir le contexte avant la clôture.',
      };
    }
    if (!envelope.siteId?.trim()) {
      return {
        blocked: true,
        title: 'Site actif non résolu',
        body: 'L’enveloppe ne fournit pas de site : la clôture ne peut pas continuer.',
      };
    }
    if (!envelope.permissions.permissionKeys.includes(PERMISSION_CASHFLOW_NOMINAL)) {
      return {
        blocked: true,
        title: 'Permission caisse absente',
        body: `Les permissions effectives ne contiennent pas « ${PERMISSION_CASHFLOW_NOMINAL} ».`,
      };
    }
    return { blocked: false };
  }, [envelope]);
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

/**
 * Story 6.7 — clôture locale : lecture session courante, récap serveur, comptage physique,
 * commentaire d’écart si besoin, step-up PIN, POST close — message relais Epic 8 sans état sync inventé.
 */
export function CashflowCloseWizard(_props: RegisteredWidgetProps): ReactNode {
  const entry = useCloseEntryBlock();
  const auth = useAuthPort();
  const draft = useCashflowDraft();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const [tab, setTab] = useState(0);
  const [session, setSession] = useState<CashSessionCurrentV1 | null>(null);
  const [loadErr, setLoadErr] = useState<CashflowSubmitSurfaceError | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualAmount, setActualAmount] = useState<number | string>('');
  const [varianceComment, setVarianceComment] = useState('');
  const [pin, setPin] = useState('');
  const [submitErr, setSubmitErr] = useState<CashflowSubmitSurfaceError | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<
    | null
    | { kind: 'closed'; sessionId: string }
    | { kind: 'deleted'; message?: string }
  >(null);

  const refreshSession = useCallback(async () => {
    setLoadErr(null);
    setLoading(true);
    try {
      const r = await getCurrentOpenCashSession(auth);
      if (!r.ok) {
        setSession(null);
        setLoadErr({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(r) });
        return;
      }
      setSession(r.session);
      if (r.session) {
        const th = theoreticalCloseAmount(r.session);
        setActualAmount(th);
      } else {
        setActualAmount('');
      }
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (entry.blocked) return;
    void refreshSession();
  }, [entry.blocked, refreshSession]);

  const theoretical = session ? theoreticalCloseAmount(session) : 0;
  const actualNum = typeof actualAmount === 'number' ? actualAmount : parseFloat(String(actualAmount));
  const commentRequired = session && !Number.isNaN(actualNum) && needsVarianceComment(actualNum, theoretical);

  const onSubmitClose = async () => {
    if (!session) return;
    const pinTrim = pin.trim();
    if (pinTrim.length < 4) {
      setSubmitErr({
        kind: 'local',
        message: 'Saisissez le PIN métier (step-up) pour confirmer la clôture.',
      });
      return;
    }
    if (commentRequired && !varianceComment.trim()) {
      setSubmitErr({
        kind: 'local',
        message: `Un commentaire est obligatoire si l’écart dépasse ${CLOSE_VARIANCE_TOLERANCE_EUR.toFixed(2)} € par rapport au montant théorique.`,
      });
      return;
    }
    setSubmitErr(null);
    setBusy(true);
    try {
      const res = await postCloseCashSession(
        session.id,
        {
          actual_amount: actualNum,
          variance_comment: varianceComment.trim() || null,
        },
        auth,
        { stepUpPin: pinTrim },
      );
      if (!res.ok) {
        const base = recycliqueClientFailureFromSalesHttp(res);
        const message =
          res.code === 'CASH_SESSION_CLOSE_HELD_PENDING'
            ? `${base.message} (finalisez ou abandonnez les tickets en attente.)`
            : base.message;
        setSubmitErr({
          kind: 'api',
          failure: { ...base, message, code: res.code ?? base.code },
        });
        return;
      }
      if (res.data.kind === 'deleted') {
        setDone({
          kind: 'deleted',
          message: res.data.message,
        });
        setSession(null);
        return;
      }
      setDone({ kind: 'closed', sessionId: session.id });
      setSession(null);
    } finally {
      setBusy(false);
    }
  };

  if (entry.blocked) {
    return (
      <Alert color="orange" title={entry.title} data-testid="cashflow-close-context-blocked">
        <Text size="sm">{entry.body}</Text>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Stack gap="xs" data-testid="cashflow-close-loading-wrap">
        <Button variant="subtle" size="xs" data-testid="cashflow-close-back-to-caisse" onClick={() => spaNavigateTo('/caisse')}>
          ← Retour au poste caisse
        </Button>
        <Text size="sm" data-testid="cashflow-close-loading">
          Chargement de la session courante…
        </Text>
      </Stack>
    );
  }

  if (loadErr) {
    return (
      <div data-testid="cashflow-close-load-error-wrap">
        <Button variant="subtle" size="xs" mb="sm" data-testid="cashflow-close-back-to-caisse" onClick={() => spaNavigateTo('/caisse')}>
          ← Retour au poste caisse
        </Button>
        <CashflowClientErrorAlert error={loadErr} testId="cashflow-close-load-error" />
        <Button mt="sm" size="xs" variant="light" onClick={() => void refreshSession()}>
          Réessayer
        </Button>
      </div>
    );
  }

  /** Après clôture on met `session` à null : évaluer `done` avant `!session` (batch React 18). */
  if (done) {
    return (
      <div className={classes.step} data-testid="cashflow-close-success">
        <Button variant="subtle" size="xs" mb="sm" data-testid="cashflow-close-back-to-caisse" onClick={() => spaNavigateTo('/caisse')}>
          ← Retour au poste caisse
        </Button>
        <Alert color="green" title={done.kind === 'deleted' ? 'Session vide non enregistrée' : 'Session fermée'}>
          <Text size="sm">
            {done.kind === 'deleted'
              ? done.message ??
                'La session ne contenait aucune transaction : elle a été supprimée côté serveur (pas de session fantôme fermée).'
              : 'La session est close dans Recyclique.'}
          </Text>
        </Alert>
        <div className={classes.relay} data-testid="cashflow-close-relay-epic8">
          {RELAY_EPIC8_COPY}
        </div>
        {done.kind === 'closed' ? (
          <Stack gap="xs" mt="md" data-testid="cashflow-close-admin-relay">
            <Text size="sm" fw={600}>
              Supervision admin (prolongement exploitable)
            </Text>
            <Text size="xs" c="dimmed">
              Cible brownfield : gestionnaire de sessions (`/admin/session-manager`) puis détail (`/admin/cash-sessions/:id`). La
              navigation démo expose encore des placeholders transverses — aucun état Paheko ni sync inventée ; parité complète
              visée en 6.10.
            </Text>
            <Group gap="sm">
              <Button size="xs" variant="light" onClick={() => spaNavigateTo('/admin')} data-testid="cashflow-close-admin-zone">
                Zone admin (démo)
              </Button>
              <Button
                size="xs"
                variant="default"
                data-testid="cashflow-close-admin-session-detail"
                onClick={() => {
                  const path = `/admin/cash-sessions/${done.sessionId}`;
                  const full =
                    typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
                  void navigator.clipboard?.writeText(full);
                }}
              >
                Copier le lien détail session (brownfield)
              </Button>
            </Group>
            <Text size="xs" c="dimmed" data-testid="cashflow-close-admin-detail-hint">
              Chemin cible équivalent legacy : `/admin/cash-sessions/:id` — non résolu dans la nav démo ; évite une
              `pushState` SPA sans entrée manifeste (cohérence RuntimeDemoApp).
            </Text>
          </Stack>
        ) : (
          <Stack gap="xs" mt="md" data-testid="cashflow-close-admin-relay-deleted">
            <Text size="xs" c="dimmed">
              Pour la supervision des sessions côté admin, utilisez le gestionnaire de sessions lorsqu’il est servi (6.10).
            </Text>
            <Button size="xs" variant="light" onClick={() => spaNavigateTo('/admin')} data-testid="cashflow-close-admin-zone">
              Zone admin (démo)
            </Button>
          </Stack>
        )}
        <Button
          size="sm"
          variant="light"
          mt="sm"
          onClick={() => {
            setDone(null);
            setPin('');
            setVarianceComment('');
            setTab(0);
            void refreshSession();
          }}
        >
          Fermer
        </Button>
      </div>
    );
  }

  if (!session) {
    return (
      <Stack gap="xs" data-testid="cashflow-close-no-session-wrap">
        <Button variant="subtle" size="xs" data-testid="cashflow-close-back-to-caisse" onClick={() => spaNavigateTo('/caisse')}>
          ← Retour au poste caisse
        </Button>
        <Alert color="blue" title="Aucune session ouverte" data-testid="cashflow-close-no-session">
          <Text size="sm">
            Le serveur ne signale aucune session de caisse ouverte pour votre compte. Ouvrez une session depuis le flux
            caisse habituel avant de clôturer.
          </Text>
        </Alert>
      </Stack>
    );
  }

  const totals = session.totals;

  const panels = [
    {
      id: 'recap',
      title: '1. Récap',
      content: (
        <div className={classes.step}>
          <Text size="sm" fw={600}>
            Contrôles avant clôture (données serveur)
          </Text>
          <div className={classes.recapGrid} data-testid="cashflow-close-recap">
            <span className={classes.recapLabel}>Montant initial</span>
            <span>{fmtEur(session.initial_amount)}</span>
            <span className={classes.recapLabel}>Total ventes (session)</span>
            <span>{fmtEur(session.total_sales ?? 0)}</span>
            <span className={classes.recapLabel}>Total dons</span>
            <span>{fmtEur(session.total_donations ?? 0)}</span>
            <span className={classes.recapLabel}>Poids sortant (kg)</span>
            <span>{session.total_weight_out != null ? String(session.total_weight_out) : '—'}</span>
            {totals ? (
              <>
                <span className={classes.recapLabel}>Ventes complétées</span>
                <span>{fmtEur(totals.sales_completed)}</span>
                <span className={classes.recapLabel}>Remboursements (algébrique)</span>
                <span>{fmtEur(totals.refunds)}</span>
                <span className={classes.recapLabel}>Net (6.4)</span>
                <span>{fmtEur(totals.net)}</span>
              </>
            ) : null}
            <span className={classes.recapLabel}>Montant théorique caisse</span>
            <span data-testid="cashflow-close-theoretical">{fmtEur(theoretical)}</span>
          </div>
          <Button size="sm" onClick={() => setTab(1)}>
            Continuer vers le comptage
          </Button>
        </div>
      ),
    },
    {
      id: 'amounts',
      title: '2. Comptage',
      content: (
        <div className={classes.step}>
          <Text size="sm">Saisissez le montant physique compté en caisse.</Text>
          <NumberInput
            label="Montant compté (€)"
            min={0}
            decimalScale={2}
            fixedDecimalScale
            value={actualAmount}
            onChange={setActualAmount}
            data-testid="cashflow-close-actual-amount"
          />
          {commentRequired ? (
            <TextInput
              label="Commentaire d’écart (obligatoire)"
              description={`Écart supérieur à ${CLOSE_VARIANCE_TOLERANCE_EUR.toFixed(2)} € par rapport au théorique (${fmtEur(theoretical)}).`}
              value={varianceComment}
              onChange={(e) => setVarianceComment(e.currentTarget.value)}
              data-testid="cashflow-close-variance-comment"
            />
          ) : null}
          <Button size="sm" variant="default" onClick={() => setTab(0)}>
            Retour
          </Button>
          <Button size="sm" onClick={() => setTab(2)}>
            Continuer vers le PIN
          </Button>
        </div>
      ),
    },
    {
      id: 'pin',
      title: '3. Confirmer',
      content: (
        <div className={classes.step}>
          <Text size="sm">
            La clôture exige le PIN métier (preuve step-up). Il n’est pas journalisé côté client.
          </Text>
          <PasswordInput
            label="PIN step-up"
            type="password"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.currentTarget.value)}
            data-testid="cashflow-close-pin"
          />
          <CashflowClientErrorAlert error={submitErr} testId="cashflow-close-submit-error" />
          <Button size="sm" variant="default" onClick={() => setTab(1)} disabled={busy}>
            Retour
          </Button>
          <Button
            size="sm"
            loading={busy}
            onClick={() => void onSubmitClose()}
            data-testid="cashflow-close-submit"
            disabled={stale}
          >
            Clôturer la session
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div data-testid="cashflow-close-wizard">
      <Button variant="subtle" size="xs" mb="sm" data-testid="cashflow-close-back-to-caisse" onClick={() => spaNavigateTo('/caisse')}>
        ← Retour au poste caisse
      </Button>
      <CashflowOperationalSyncNotice auth={auth} />
      {stale ? (
        <Alert color="orange" title="Données ticket / contexte périmées" mb="sm" data-testid="cashflow-close-stale-block">
          <Text size="sm">
            Le widget ticket critique est en DATA_STALE — la clôture est bloquée jusqu’à retour NOMINAL (GET ticket ou
            rafraîchissement).
          </Text>
        </Alert>
      ) : null}
      <FlowRenderer flowId="cashflow-close" panels={panels} activeIndex={tab} onActiveIndexChange={setTab} keepMounted />
    </div>
  );
}
