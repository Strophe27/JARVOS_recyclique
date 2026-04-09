import { Alert, Button, NativeSelect, NumberInput, Text, TextInput } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { postCreateSale, type SpecialEncaissementKindV1 } from '../../api/sales-client';
import {
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT,
} from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';
import { setAfterSuccessfulSale, useCashflowDraft } from './cashflow-draft-store';
import classes from './CashflowSpecialEncaissementWizard.module.css';

type EntryBlock =
  | { readonly blocked: false }
  | { readonly blocked: true; readonly title: string; readonly body: string };

function useSpecialEncaissementEntryBlock(): EntryBlock {
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
          'Contexte dégradé — rafraîchir avant d’enregistrer un encaissement spécial.',
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
    if (!keys.includes(PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT)) {
      return {
        blocked: true,
        title: 'Encaissement spécial non autorisé',
        body: `Permission « ${PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT} » absente — le serveur doit l’accorder (Story 6.5).`,
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

function SpecialEncaissementWizardInner(props: { readonly kind: SpecialEncaissementKindV1 }): ReactNode {
  const { kind } = props;
  const entry = useSpecialEncaissementEntryBlock();
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const draft = useCashflowDraft();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const [sessionInput, setSessionInput] = useState('');
  const [total, setTotal] = useState(kind === 'DON_SANS_ARTICLE' ? 0 : 10);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [adherentRef, setAdherentRef] = useState('');
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [busy, setBusy] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    const fromEnv = envelope.cashSessionId?.trim();
    const fromDraft = draft.cashSessionIdInput?.trim();
    if (!sessionInput) {
      if (fromEnv) {
        setSessionInput(fromEnv);
      } else if (fromDraft) {
        setSessionInput(fromDraft);
      }
    }
  }, [envelope.cashSessionId, draft.cashSessionIdInput, sessionInput]);

  const testIdRoot =
    kind === 'DON_SANS_ARTICLE' ? 'cashflow-special-don-wizard' : 'cashflow-special-adhesion-wizard';

  const onSubmit = useCallback(async () => {
    setError(null);
    const sid = sessionInput.trim();
    if (!sid) {
      setError({ kind: 'local', message: 'Indiquez l’identifiant de session de caisse.' });
      return;
    }
    if (kind === 'ADHESION_ASSOCIATION' && total <= 0) {
      setError({
        kind: 'local',
        message: 'Le montant adhésion doit être strictement positif (validé aussi par l’API).',
      });
      return;
    }
    if (kind === 'DON_SANS_ARTICLE' && total < 0) {
      setError({ kind: 'local', message: 'Le don ne peut pas être négatif.' });
      return;
    }
    setBusy(true);
    try {
      const body = {
        cash_session_id: sid,
        items: [] as [],
        total_amount: total,
        special_encaissement_kind: kind,
        payment_method: paymentMethod as 'cash' | 'card' | 'check' | 'free',
        ...(kind === 'ADHESION_ASSOCIATION' && adherentRef.trim()
          ? { adherent_reference: adherentRef.trim() }
          : {}),
      };
      const res = await postCreateSale(body, auth);
      if (!res.ok) {
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        setSuccessId(null);
        return;
      }
      setAfterSuccessfulSale(res.saleId);
      setSuccessId(res.saleId);
    } finally {
      setBusy(false);
    }
  }, [auth, adherentRef, kind, paymentMethod, sessionInput, total]);

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
      {stale ? (
        <Alert color="orange" title="Données périmées" mb="sm" data-testid={`${testIdRoot}-stale`}>
          <Text size="sm">DATA_STALE — enregistrement bloqué jusqu’à retour NOMINAL.</Text>
        </Alert>
      ) : null}
      <Text size="sm" c="dimmed">
        Variante du poste caisse : <code>recyclique_sales_createSale</code> avec{' '}
        <code>special_encaissement_kind</code> — pas de lignes article (Story 6.5).
      </Text>
      <TextInput
        label="Session de caisse (UUID)"
        value={sessionInput}
        onChange={(e) => setSessionInput(e.currentTarget.value)}
        data-testid={`${testIdRoot}-session`}
      />
      <NumberInput
        label="Montant total (€)"
        min={kind === 'DON_SANS_ARTICLE' ? 0 : 0.01}
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
      {kind === 'ADHESION_ASSOCIATION' ? (
        <TextInput
          label="Référence adhérent (optionnel, max 200 car.)"
          value={adherentRef}
          onChange={(e) => setAdherentRef(e.currentTarget.value)}
          maxLength={200}
          data-testid={`${testIdRoot}-adherent`}
        />
      ) : null}
      <CashflowClientErrorAlert error={error} testId={`${testIdRoot}-error`} />
      <Button loading={busy} onClick={() => void onSubmit()} data-testid={`${testIdRoot}-submit`} disabled={stale}>
        Enregistrer (POST /v1/sales/)
      </Button>
    </div>
  );
}

export function makeCashflowSpecialEncaissementWizard(
  kind: SpecialEncaissementKindV1,
): ComponentType<RegisteredWidgetProps> {
  function Wizard(_props: RegisteredWidgetProps): ReactNode {
    return <SpecialEncaissementWizardInner kind={kind} />;
  }
  Wizard.displayName =
    kind === 'DON_SANS_ARTICLE' ? 'CashflowSpecialDonWizard' : 'CashflowSpecialAdhesionWizard';
  return Wizard;
}
