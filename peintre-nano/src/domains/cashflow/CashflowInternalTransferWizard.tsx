import {
  Alert,
  Button,
  NativeSelect,
  NumberInput,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  postCashInternalTransfer,
  type CashInternalTransferPayload,
  internalTransferNeedsStepUpPin,
} from '../../api/cash-session-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import {
  PERMISSION_CASHFLOW_INTERNAL_TRANSFER,
  PERMISSION_CASHFLOW_NOMINAL,
} from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import { buildRefundWizardPaymentMethodSelectData } from './cashflow-refund-payment-method-options';
import { useCashflowDraft } from './cashflow-draft-store';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';
import { CashflowOperationalSyncNotice } from './cashflow-operational-sync-notice';
import { useCaissePaymentMethodOptions } from './use-caisse-payment-method-options';

type EntryBlock =
  | { readonly blocked: false; readonly sessionId: string }
  | { readonly blocked: true; readonly title: string; readonly body: string };

const TRANSFER_TYPES = [
  { value: 'cash_float_topup', label: 'Appoint de caisse' },
  { value: 'cash_float_seed', label: 'Apport fond de caisse' },
  { value: 'bank_deposit', label: 'Dépôt banque (sortie caisse)' },
  { value: 'bank_withdrawal', label: 'Retrait banque (entrée caisse)' },
  { value: 'inter_register_transfer', label: 'Transfert entre caisses' },
  { value: 'variance_regularization', label: "Régularisation d'écart" },
] as const;

const FLOW_OPTIONS = [
  { value: 'inflow', label: 'Entrée de fonds en caisse (session)' },
  { value: 'outflow', label: 'Sortie de fonds depuis la caisse (session)' },
] as const;

function deriveSessionFlow(transferType: string): 'inflow' | 'outflow' | null {
  if (transferType === 'bank_deposit') return 'outflow';
  if (transferType === 'bank_withdrawal') return 'inflow';
  if (transferType === 'cash_float_topup' || transferType === 'cash_float_seed') return 'inflow';
  return null;
}

function useInternalTransferEntryBlock(): EntryBlock {
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
    if (!keys.includes(PERMISSION_CASHFLOW_INTERNAL_TRANSFER)) {
      return {
        blocked: true,
        title: 'Mouvement interne non autorisé',
        body: `Permission « ${PERMISSION_CASHFLOW_INTERNAL_TRANSFER} » absente — distinct remboursement / décaissement charge.`,
      };
    }
    return { blocked: false, sessionId: envelope.cashSessionId.trim() };
  }, [envelope]);
}

/**
 * Story 24.8 — mouvement interne de caisse typé (distinct remboursement client et décaissement §10.5).
 */
export function CashflowInternalTransferWizard(_props: RegisteredWidgetProps): ReactNode {
  const entry = useInternalTransferEntryBlock();
  const auth = useAuthPort();
  const draft = useCashflowDraft();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const { options: paymentMethodOptions } = useCaissePaymentMethodOptions(auth);
  const pmSelect = useMemo(
    () => buildRefundWizardPaymentMethodSelectData(paymentMethodOptions),
    [paymentMethodOptions],
  );

  const [transferType, setTransferType] = useState<string>('bank_withdrawal');
  const [sessionFlow, setSessionFlow] = useState<'inflow' | 'outflow'>('inflow');
  const [originLabel, setOriginLabel] = useState('');
  const [destLabel, setDestLabel] = useState('');
  const [motif, setMotif] = useState('');
  const [amount, setAmount] = useState<number | ''>(0);
  const [paymentCode, setPaymentCode] = useState('cash');
  const [justificationRef, setJustificationRef] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [success, setSuccess] = useState<Record<string, unknown> | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const onChangeTransferType = (v: string): void => {
    setTransferType(v);
    const d = deriveSessionFlow(v);
    if (d) setSessionFlow(d);
  };

  if (entry.blocked) {
    return (
      <Stack gap="md" data-testid="cashflow-internal-transfer-wizard-blocked">
        <Title order={3}>Mouvement interne de caisse</Title>
        <Alert color="yellow" title={entry.title}>
          {entry.body}
        </Alert>
      </Stack>
    );
  }

  const sessionId = entry.sessionId;
  const needsFlowSelect = deriveSessionFlow(transferType) === null;

  const onSubmit = async (): Promise<void> => {
    const amountValue = typeof amount === 'number' ? amount : Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError({ kind: 'local', message: 'Saisissez un montant positif.' });
      return;
    }
    const o = originLabel.trim();
    const d = destLabel.trim();
    const m = motif.trim();
    const jref = justificationRef.trim();
    if (!o || !d || !m || !jref) {
      setError({ kind: 'local', message: 'Origine, destination, motif et référence sont obligatoires.' });
      return;
    }
    const flow = deriveSessionFlow(transferType) ?? sessionFlow;

    const payload: CashInternalTransferPayload = {
      transfer_type: transferType,
      session_flow: flow,
      origin_endpoint_label: o,
      destination_endpoint_label: d,
      motif: m,
      amount: Number(amountValue),
      payment_method: paymentCode.trim() || 'cash',
      justification_reference: jref,
    };

    if (
      internalTransferNeedsStepUpPin({
        transfer_type: transferType,
        amount: Number(amountValue),
      }) &&
      pin.trim().length < 4
    ) {
      setError({ kind: 'local', message: 'PIN step-up obligatoire (4 caractères minimum) pour cette opération.' });
      return;
    }

    setBusy(true);
    setError(null);
    const idem = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idem;

    const res = await postCashInternalTransfer(sessionId, payload, auth, {
      idempotencyKey: idem,
      stepUpPin:
        internalTransferNeedsStepUpPin({ transfer_type: transferType, amount: Number(amountValue) })
          ? pin.trim()
          : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setSuccess(res.transfer);
  };

  return (
    <Stack gap="md" data-testid="cashflow-internal-transfer-wizard">
      <div>
        <Title order={3}>Mouvement interne de caisse</Title>
        <Text size="sm" c="dimmed" mt="xs">
          Transfert interne ou régularisation — <strong>pas</strong> un remboursement client ni un décaissement
          charge (PRD §10.6). Chaîne comptable Paheko via clôture (ADR D1).
        </Text>
      </div>
      {stale ? (
        <Alert color="yellow" title="Brouillon potentiellement périmé">
          Rafraîchir le contexte caisse si vous avez changé de session.
        </Alert>
      ) : null}
      <NativeSelect
        label="Type de mouvement (référentiel fermé)"
        data={TRANSFER_TYPES as unknown as { value: string; label: string }[]}
        value={transferType}
        onChange={(e) => onChangeTransferType(e.currentTarget.value)}
      />
      {needsFlowSelect ? (
        <NativeSelect
          label="Sens pour la caisse en session"
          data={FLOW_OPTIONS as unknown as { value: string; label: string }[]}
          value={sessionFlow}
          onChange={(e) => setSessionFlow(e.currentTarget.value as 'inflow' | 'outflow')}
        />
      ) : null}
      <TextInput label="Origine (caisse, banque, site…)" value={originLabel} onChange={(e) => setOriginLabel(e.currentTarget.value)} />
      <TextInput label="Destination" value={destLabel} onChange={(e) => setDestLabel(e.currentTarget.value)} />
      <Textarea label="Motif" value={motif} onChange={(e) => setMotif(e.currentTarget.value)} minRows={2} />
      <NumberInput
        label="Montant (€)"
        min={0.01}
        step={0.5}
        value={amount}
        onChange={(v) => {
          if (v === '' || v === undefined) setAmount('');
          else setAmount(typeof v === 'number' ? v : Number(v));
        }}
        decimalScale={2}
      />
      <NativeSelect
        label="Canal de trésorerie"
        data={pmSelect}
        value={paymentCode}
        onChange={(e) => setPaymentCode(e.currentTarget.value)}
      />
      <TextInput
        label="Référence / justificatif"
        value={justificationRef}
        onChange={(e) => setJustificationRef(e.currentTarget.value)}
      />
      {internalTransferNeedsStepUpPin({
        transfer_type: transferType,
        amount: typeof amount === 'number' ? amount : Number(amount) || 0,
      }) ? (
        <PasswordInput
          label="PIN step-up"
          description="Requis pour transfert entre caisses, régularisation d’écart, ou montants ≥ 500 €."
          value={pin}
          onChange={(e) => setPin(e.currentTarget.value)}
        />
      ) : null}
      <Button loading={busy} onClick={() => void onSubmit()}>
        Enregistrer le mouvement interne
      </Button>
      <CashflowOperationalSyncNotice auth={auth} />
      {error ? <CashflowClientErrorAlert error={error} /> : null}
      {success ? (
        <Alert color="green" title="Mouvement interne enregistré">
          <Text size="sm">Identifiant : {String(success.id ?? '')}</Text>
        </Alert>
      ) : null}
    </Stack>
  );
}
