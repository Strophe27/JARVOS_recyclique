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
import { postExceptionalRefund, type ExceptionalRefundPayload } from '../../api/cash-session-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import {
  PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND,
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

const REASON_OPTIONS = [
  { value: 'ERREUR_SAISIE', label: 'Erreur de saisie' },
  { value: 'RETOUR_ARTICLE', label: 'Retour article' },
  { value: 'ANNULATION_CLIENT', label: 'Annulation client' },
  { value: 'AUTRE', label: 'Autre (détail obligatoire)' },
] as const;

function useExceptionalRefundEntryBlock(): EntryBlock {
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
          'Contexte dégradé — rafraîchir avant un remboursement exceptionnel.',
      };
    }
    if (!envelope.siteId?.trim()) {
      return {
        blocked: true,
        title: 'Site actif non résolu',
        body: 'L’enveloppe ne fournit pas de site : le remboursement ne peut pas continuer.',
      };
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
    if (!keys.includes(PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND)) {
      return {
        blocked: true,
        title: 'Remboursement exceptionnel non autorisé',
        body: `Permission « ${PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND} » absente — demandez l’habilitation à votre administrateur.`,
      };
    }
    return { blocked: false, sessionId: envelope.cashSessionId.trim() };
  }, [envelope]);
}

export function CashflowExceptionalRefundWizard(_props: RegisteredWidgetProps): ReactNode {
  const entry = useExceptionalRefundEntryBlock();
  const auth = useAuthPort();
  const draft = useCashflowDraft();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const { options: paymentMethodOptions } = useCaissePaymentMethodOptions(auth);
  const refundMethodSelectData = useMemo(
    () => buildRefundWizardPaymentMethodSelectData(paymentMethodOptions),
    [paymentMethodOptions],
  );

  const [amount, setAmount] = useState<number | ''>(0);
  const [refundPaymentMethod, setRefundPaymentMethod] = useState('cash');
  const [reason, setReason] = useState('ERREUR_SAISIE');
  const [detail, setDetail] = useState('');
  const [justification, setJustification] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [success, setSuccess] = useState<ExceptionalRefundPayload | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const onSubmit = async (): Promise<void> => {
    if (entry.blocked) return;
    const amountValue = typeof amount === 'number' ? amount : Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError({ kind: 'local', message: 'Saisissez un montant de remboursement positif.' });
      return;
    }
    const justificationTrim = justification.trim();
    if (!justificationTrim) {
      setError({ kind: 'local', message: 'La justification est obligatoire.' });
      return;
    }
    const detailTrim = detail.trim();
    if (reason === 'AUTRE' && !detailTrim) {
      setError({ kind: 'local', message: 'Le détail est obligatoire quand le motif est « Autre ».' });
      return;
    }
    const pinTrim = pin.trim();
    if (pinTrim.length < 4) {
      setError({ kind: 'local', message: 'Saisissez le PIN step-up (4 chiffres minimum).' });
      return;
    }

    const payload: ExceptionalRefundPayload = {
      amount: Number(amountValue),
      refund_payment_method: refundPaymentMethod,
      reason_code: reason,
      justification: justificationTrim,
      detail: detailTrim || null,
    };

    setBusy(true);
    setError(null);
    const idem = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idem;
    const result = await postExceptionalRefund(entry.sessionId, payload, auth, {
      stepUpPin: pinTrim,
      idempotencyKey: idem,
      requestId: crypto.randomUUID(),
    });
    setBusy(false);

    if (!result.ok) {
      setSuccess(null);
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(result) });
      return;
    }

    setSuccess(payload);
    setError(null);
    idempotencyKeyRef.current = null;
  };

  return (
    <Stack gap="md" data-testid="cashflow-exceptional-refund-wizard">
      <div>
        <Title order={3}>Remboursement exceptionnel sans ticket</Title>
        <Text size="sm" c="dimmed" mt="xs">
          Ce remboursement n&apos;est pas rattaché à un ticket source ; il exige un PIN step-up et une justification
          explicite.
        </Text>
      </div>

      <CashflowOperationalSyncNotice auth={auth} />

      {stale ? (
        <Alert color="orange" title="Contexte caisse périmé" data-testid="cashflow-exceptional-refund-stale-block">
          <Text size="sm">Les données de session sont périmées — rafraîchir avant d&apos;envoyer le remboursement.</Text>
        </Alert>
      ) : null}

      {entry.blocked ? (
        <Alert color="red" title={entry.title} data-testid="cashflow-exceptional-refund-entry-block">
          <Text size="sm">{entry.body}</Text>
        </Alert>
      ) : (
        <Stack gap="sm">
          <NumberInput
            label="Montant remboursé (€)"
            min={0}
            decimalScale={2}
            fixedDecimalScale
            value={amount}
            onChange={(value) => {
              if (value === '' || value === undefined) {
                setAmount('');
              } else {
                setAmount(typeof value === 'number' ? value : Number(value));
              }
            }}
            data-testid="cashflow-exceptional-refund-amount"
          />
          <NativeSelect
            label="Moyen de remboursement"
            data={refundMethodSelectData}
            value={refundPaymentMethod}
            onChange={(event) => setRefundPaymentMethod(event.currentTarget.value)}
            data-testid="cashflow-exceptional-refund-payment-method"
          />
          <NativeSelect
            label="Motif"
            data={REASON_OPTIONS}
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            data-testid="cashflow-exceptional-refund-reason"
          />
          {reason === 'AUTRE' ? (
            <TextInput
              label="Détail motif (obligatoire)"
              value={detail}
              onChange={(event) => setDetail(event.currentTarget.value)}
              data-testid="cashflow-exceptional-refund-detail"
            />
          ) : null}
          <Textarea
            label="Justification"
            minRows={3}
            autosize
            value={justification}
            onChange={(event) => setJustification(event.currentTarget.value)}
            data-testid="cashflow-exceptional-refund-justification"
          />
          <PasswordInput
            label="PIN step-up"
            type="password"
            autoComplete="off"
            value={pin}
            onChange={(event) => setPin(event.currentTarget.value)}
            data-testid="cashflow-exceptional-refund-pin"
          />

          <CashflowClientErrorAlert error={error} testId="cashflow-exceptional-refund-error" />

          {success ? (
            <Alert color="green" title="Remboursement enregistré" data-testid="cashflow-exceptional-refund-success">
              <Text size="sm">
                Montant {success.amount.toFixed(2)}€ — motif {success.reason_code}.
              </Text>
            </Alert>
          ) : null}

          <Button
            loading={busy}
            onClick={() => void onSubmit()}
            data-testid="cashflow-exceptional-refund-submit"
            disabled={stale}
          >
            Enregistrer le remboursement exceptionnel
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
