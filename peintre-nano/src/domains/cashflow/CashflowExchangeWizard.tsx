import { Alert, Button, NativeSelect, NumberInput, Stack, Text, TextInput, Textarea, Title } from '@mantine/core';
import { useMemo, useState, type ReactNode } from 'react';
import { postMaterialExchange } from '../../api/cash-session-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import {
  PERMISSION_CASHFLOW_EXCHANGE,
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_REFUND,
} from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import { buildRefundWizardPaymentMethodSelectData } from './cashflow-refund-payment-method-options';
import { CashflowOperationalSyncNotice } from './cashflow-operational-sync-notice';
import { useCashflowDraft } from './cashflow-draft-store';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';
import { useCaissePaymentMethodOptions } from './use-caisse-payment-method-options';

type EntryBlock =
  | { readonly blocked: false; readonly sessionId: string }
  | { readonly blocked: true; readonly title: string; readonly body: string };

const REASON_OPTIONS = [
  { value: 'RETOUR_ARTICLE', label: 'Retour article' },
  { value: 'ERREUR_SAISIE', label: 'Erreur de saisie' },
  { value: 'ANNULATION_CLIENT', label: 'Annulation client' },
  { value: 'AUTRE', label: 'Autre (détail obligatoire)' },
] as const;

function useExchangeEntryBlock(): EntryBlock {
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
        body: envelope.restrictionMessage?.trim() || 'Contexte dégradé — rafraîchir avant de continuer.',
      };
    }
    if (!envelope.siteId?.trim()) {
      return { blocked: true, title: 'Site actif non résolu', body: 'Site manquant dans l’enveloppe.' };
    }
    if (!envelope.cashSessionId?.trim()) {
      return {
        blocked: true,
        title: 'Session caisse introuvable',
        body: 'Aucune session ouverte n’est associée à cette caisse.',
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
    if (!keys.includes(PERMISSION_CASHFLOW_EXCHANGE)) {
      return {
        blocked: true,
        title: 'Échange non autorisé',
        body: `Permission « ${PERMISSION_CASHFLOW_EXCHANGE} » absente.`,
      };
    }
    return { blocked: false, sessionId: envelope.cashSessionId.trim() };
  }, [envelope]);
}

/**
 * Story 24.6 — échange matière : delta nul (métier seul), positif (vente complément), négatif (reversal total source).
 */
export function CashflowExchangeWizard(_props: RegisteredWidgetProps): ReactNode {
  const entry = useExchangeEntryBlock();
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const draft = useCashflowDraft();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const { options: paymentMethodOptions } = useCaissePaymentMethodOptions(auth);
  const pmSelect = useMemo(
    () => buildRefundWizardPaymentMethodSelectData(paymentMethodOptions),
    [paymentMethodOptions],
  );

  const [deltaEuros, setDeltaEuros] = useState<number | string>(0);
  const [traceJson, setTraceJson] = useState('{"returned":[],"outgoing":[]}');
  const [paymentCode, setPaymentCode] = useState('');
  const [sourceSaleId, setSourceSaleId] = useState('');
  const [reasonCode, setReasonCode] = useState<string>('RETOUR_ARTICLE');
  const [detail, setDetail] = useState('');
  const [submitError, setSubmitError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<Record<string, unknown> | null>(null);

  const keys = envelope.permissions.permissionKeys;
  const canRefundLeg = keys.includes(PERMISSION_CASHFLOW_REFUND);

  const cents = useMemo(() => {
    const n = typeof deltaEuros === 'number' ? deltaEuros : Number(deltaEuros);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100);
  }, [deltaEuros]);

  if (entry.blocked) {
    return (
      <Stack gap="md" data-testid="cashflow-exchange-wizard-blocked">
        <Title order={3}>Échange matière</Title>
        <Alert color="yellow" title={entry.title}>
          {entry.body}
        </Alert>
      </Stack>
    );
  }

  const sessionId = entry.sessionId;

  async function onSubmit(): Promise<void> {
    setSubmitError(null);
    setSuccess(null);
    let trace: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(traceJson) as unknown;
      trace = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
      setSubmitError({ kind: 'local', message: 'JSON trace matière invalide.' });
      return;
    }

    if (cents < 0 && !canRefundLeg) {
      setSubmitError({
        kind: 'local',
        message: `Pour un échange avec remboursement, la permission « ${PERMISSION_CASHFLOW_REFUND} » est requise.`,
      });
      return;
    }

    const pm = paymentCode.trim() || pmSelect[0]?.value;
    if ((cents > 0 || cents < 0) && !pm) {
      setSubmitError({ kind: 'local', message: 'Sélectionnez un moyen de paiement / sortie.' });
      return;
    }

    let body: Record<string, unknown>;

    if (cents === 0) {
      body = { delta_amount_cents: 0, material_trace: trace };
    } else if (cents > 0) {
      const eur = cents / 100;
      body = {
        delta_amount_cents: cents,
        material_trace: trace,
        complement_sale: {
          cash_session_id: sessionId,
          items: [
            {
              category: 'ECHANGE_COMPLEMENT',
              quantity: 1,
              weight: 0,
              unit_price: eur,
              total_price: eur,
            },
          ],
          total_amount: eur,
          donation: 0,
          payment_method: pm,
          note: 'Complément échange (Story 24.6)',
        },
      };
    } else {
      const rc = reasonCode;
      if (rc === 'AUTRE' && !detail.trim()) {
        setSubmitError({ kind: 'local', message: 'Détail obligatoire pour le motif « Autre ».' });
        return;
      }
      body = {
        delta_amount_cents: cents,
        material_trace: trace,
        reversal: {
          source_sale_id: sourceSaleId.trim(),
          reason_code: rc,
          refund_payment_method: pm,
          ...(rc === 'AUTRE' ? { detail: detail.trim() } : {}),
        },
      };
    }

    setBusy(true);
    const res = await postMaterialExchange(sessionId, body, auth);
    setBusy(false);
    if (!res.ok) {
      setSubmitError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setSuccess(res.exchange);
  }

  return (
    <Stack gap="md" data-testid="cashflow-exchange-wizard">
      <div>
        <Title order={3}>Échange matière</Title>
        <Text size="sm" c="dimmed" mt="xs">
          Différence 0 € : matière seule. Différence positive : complément (vente). Différence négative : remboursement
          total sur le ticket source (même mécanisme que le remboursement standard).
        </Text>
      </div>
      {stale ? (
        <Alert color="orange" title="Données de contexte obsolètes">
          Rechargez ou rouvrez la caisse avant d’enregistrer un échange.
        </Alert>
      ) : null}
      <NumberInput
        label="Différence (€, positif = complément, négatif = remboursement, 0 = sans flux monétaire)"
        value={deltaEuros}
        onChange={(v) => setDeltaEuros(v)}
        decimalScale={2}
        fixedDecimalScale
        data-testid="cashflow-exchange-wizard-delta"
      />
      <Textarea
        label="Trace matière (JSON)"
        value={traceJson}
        onChange={(e) => setTraceJson(e.currentTarget.value)}
        minRows={3}
        data-testid="cashflow-exchange-wizard-trace"
      />
      {cents > 0 || cents < 0 ? (
        <NativeSelect
          label="Moyen (encaissement ou sortie caisse)"
          data={pmSelect}
          value={paymentCode || pmSelect[0]?.value || ''}
          onChange={(e) => setPaymentCode(e.currentTarget.value)}
          data-testid="cashflow-exchange-wizard-pm"
        />
      ) : null}
      {cents < 0 ? (
        <Stack gap="xs">
          {!canRefundLeg ? (
            <Alert color="red" title="Permission remboursement">
              La branche remboursement nécessite « {PERMISSION_CASHFLOW_REFUND} ».
            </Alert>
          ) : null}
          <TextInput
            label="ID vente source (UUID)"
            value={sourceSaleId}
            onChange={(e) => setSourceSaleId(e.currentTarget.value)}
            data-testid="cashflow-exchange-wizard-source-sale"
          />
          <NativeSelect
            label="Motif reversal"
            data={[...REASON_OPTIONS]}
            value={reasonCode}
            onChange={(e) => setReasonCode(e.currentTarget.value)}
          />
          {reasonCode === 'AUTRE' ? (
            <Textarea label="Détail" value={detail} onChange={(e) => setDetail(e.currentTarget.value)} minRows={2} />
          ) : null}
        </Stack>
      ) : null}

      {submitError ? <CashflowClientErrorAlert error={submitError} /> : null}

      {success ? (
        <Stack gap="sm" data-testid="cashflow-exchange-wizard-success">
          <Alert color="green" title="Échange enregistré">
            Conteneur créé (identifiant {String(success.id)}).
          </Alert>
          {typeof success.paheko_accounting_sync_hint === 'string' && (success.paheko_accounting_sync_hint as string).trim() ? (
            <Alert color="gray" title="Comptabilité Paheko" mb="sm" data-testid="cashflow-exchange-success-paheko-hint">
              <Text size="sm">{String(success.paheko_accounting_sync_hint)}</Text>
            </Alert>
          ) : null}
          <CashflowOperationalSyncNotice auth={auth} />
        </Stack>
      ) : null}

      <Button
        type="button"
        loading={busy}
        onClick={() => void onSubmit()}
        data-testid="cashflow-exchange-wizard-submit"
      >
        Enregistrer l’échange
      </Button>
    </Stack>
  );
}
