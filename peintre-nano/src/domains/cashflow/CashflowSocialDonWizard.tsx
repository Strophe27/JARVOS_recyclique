import { Alert, Button, NativeSelect, NumberInput, Text, TextInput } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { postCreateSale } from '../../api/sales-client';
import {
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT,
} from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import {
  SOCIAL_ACTION_KIND_LOT1,
  type SocialActionKindV1,
} from './social-action-kind-lot1';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import { CashflowOperationalSyncNotice } from './cashflow-operational-sync-notice';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';
import { useCashflowDraft } from './cashflow-draft-store';
import classes from './CashflowSocialDonWizard.module.css';

type EntryBlock =
  | { readonly blocked: false }
  | { readonly blocked: true; readonly title: string; readonly body: string };

function useSocialDonEntryBlock(): EntryBlock {
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
          'Contexte dégradé — rafraîchir avant d’enregistrer un encaissement social.',
      };
    }
    if (!envelope.siteId?.trim()) {
      return {
        blocked: true,
        title: 'Site actif non résolu',
        body: 'L’enveloppe ne fournit pas de site : impossible de poursuivre.',
      };
    }
    const keys = envelope.permissions.permissionKeys;
    if (!keys.includes(PERMISSION_CASHFLOW_NOMINAL)) {
      return {
        blocked: true,
        title: 'Permission caisse absente',
        body: `Les permissions effectives ne contiennent pas « ${PERMISSION_CASHFLOW_NOMINAL} ».`,
      };
    }
    if (!keys.includes(PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT)) {
      return {
        blocked: true,
        title: 'Encaissement social non autorisé',
        body: `Permission « ${PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT} » absente — le serveur doit l’accorder (Story 6.6).`,
      };
    }
    return { blocked: false };
  }, [envelope]);
}

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Espèces' },
  { value: 'card', label: 'Carte' },
  { value: 'check', label: 'Chèque' },
  { value: 'free', label: 'Gratuit / don (free)' },
] as const;

const KIND_SELECT_DATA = SOCIAL_ACTION_KIND_LOT1.map((e) => ({
  value: e.kind,
  label: e.label,
}));

/**
 * Parcours unique « Don » : choix du type d’action parmi le lot 1 figé (`SOCIAL_ACTION_KIND_LOT1`),
 * puis saisie montant / note — widget enregistré (`cashflow-social-don-wizard`), embarqué dans le poste nominal (Story 6.6 brownfield).
 */
export function CashflowSocialDonWizard(_props: RegisteredWidgetProps): ReactNode {
  const entry = useSocialDonEntryBlock();
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const draft = useCashflowDraft();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const [sessionInput, setSessionInput] = useState('');
  const [socialKind, setSocialKind] = useState<SocialActionKindV1>(SOCIAL_ACTION_KIND_LOT1[0].kind);
  const [total, setTotal] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [busy, setBusy] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    const fromEnv = envelope.cashSessionId?.trim();
    if (fromEnv && !sessionInput) {
      setSessionInput(fromEnv);
    }
  }, [envelope.cashSessionId, sessionInput]);

  const testIdRoot = 'cashflow-social-don-wizard';

  const onSubmit = useCallback(async () => {
    setError(null);
    const sid = sessionInput.trim();
    if (!sid) {
      setError({ kind: 'local', message: 'Indiquez l’identifiant de session de caisse.' });
      return;
    }
    if (total <= 0) {
      setError({
        kind: 'local',
        message: 'Le montant doit être strictement positif (validé aussi par l’API).',
      });
      return;
    }
    setBusy(true);
    try {
      const body = {
        cash_session_id: sid,
        items: [] as [],
        total_amount: total,
        social_action_kind: socialKind,
        payment_method: paymentMethod as 'cash' | 'card' | 'check' | 'free',
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      const res = await postCreateSale(body, auth);
      if (!res.ok) {
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        setSuccessId(null);
        return;
      }
      setSuccessId(res.saleId);
    } finally {
      setBusy(false);
    }
  }, [auth, note, paymentMethod, sessionInput, socialKind, total]);

  if (entry.blocked) {
    return (
      <Alert color="orange" title={entry.title} data-testid={`${testIdRoot}-blocked`}>
        <Text size="sm">{entry.body}</Text>
      </Alert>
    );
  }

  if (successId) {
    return (
      <div className={classes.step} data-testid={`${testIdRoot}-success`}>
        <Text fw={600}>Encaissement enregistré dans Recyclique</Text>
        <Text size="sm" c="dimmed">
          La synchronisation comptable n’est pas prétendue finalisée sur cet écran.
        </Text>
        <Text size="sm">Identifiant vente : {successId}</Text>
        <Button variant="light" onClick={() => setSuccessId(null)} data-testid={`${testIdRoot}-reset`}>
          Nouvel enregistrement
        </Button>
      </div>
    );
  }

  return (
    <div className={classes.step} data-testid={testIdRoot}>
      <CashflowOperationalSyncNotice auth={auth} />
      {stale ? (
        <Alert color="orange" title="Données périmées" mb="sm" data-testid={`${testIdRoot}-stale`}>
          <Text size="sm">DATA_STALE — enregistrement bloqué jusqu’à retour NOMINAL.</Text>
        </Alert>
      ) : null}
      <Text size="sm" c="dimmed">
        Actions sociales (lot 1) : mutation <code>recyclique_sales_createSale</code> avec{' '}
        <code>social_action_kind</code> — pas de lignes article ; distinct de l’encaissement spécial Story 6.5.
      </Text>
      <NativeSelect
        label="Type d’action"
        data={[...KIND_SELECT_DATA]}
        value={socialKind}
        onChange={(e) => setSocialKind(e.currentTarget.value as SocialActionKindV1)}
        data-testid={`${testIdRoot}-kind`}
      />
      <TextInput
        label="Session de caisse (UUID)"
        value={sessionInput}
        onChange={(e) => setSessionInput(e.currentTarget.value)}
        data-testid={`${testIdRoot}-session`}
      />
      <NumberInput
        label="Montant total (€)"
        min={0.01}
        step={0.5}
        value={total}
        onChange={(v) => setTotal(Number(v) || 0)}
        data-testid={`${testIdRoot}-total`}
      />
      <NativeSelect
        label="Moyen de paiement"
        data={[...PAYMENT_OPTIONS]}
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.currentTarget.value)}
        data-testid={`${testIdRoot}-payment`}
      />
      <TextInput
        label="Note (optionnelle)"
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
        data-testid={`${testIdRoot}-note`}
      />
      <CashflowClientErrorAlert error={error} testId={`${testIdRoot}-error`} />
      <Button loading={busy} onClick={() => void onSubmit()} data-testid={`${testIdRoot}-submit`} disabled={stale}>
        Enregistrer (POST /v1/sales/)
      </Button>
    </div>
  );
}
