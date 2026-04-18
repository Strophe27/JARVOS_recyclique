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
import { postCashDisbursement, type CashDisbursementPayload } from '../../api/cash-session-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import {
  PERMISSION_CASHFLOW_DISBURSEMENT,
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

const SUBTYPE_OPTIONS = [
  { value: 'volunteer_expense_reimbursement', label: 'Remboursement frais bénévole' },
  { value: 'small_operating_expense', label: 'Petite dépense de fonctionnement' },
  { value: 'validated_exceptional_outflow', label: 'Sortie exceptionnelle validée (PIN requis)' },
  { value: 'other_admin_coded', label: 'Autre — codifié administrativement (PIN + clé)' },
] as const;

const MOTIF_OPTIONS = [
  { value: 'office_supplies', label: 'Fournitures / bureau' },
  { value: 'postage', label: 'Affranchissement / poste' },
  { value: 'volunteer_travel', label: 'Déplacement bénévole' },
  { value: 'short_external_fee', label: 'Honoraires / frais externes (court)' },
  { value: 'board_approved_other', label: 'Autre motif (hiérarchie)' },
] as const;

const ADMIN_CODED_KEYS = [
  { value: 'bank_fees', label: 'Frais bancaires (codifié)' },
  { value: 'membership_reimbursement', label: 'Remboursement adhésion (codifié)' },
  { value: 'venue_deposit', label: 'Caution lieu (codifié)' },
] as const;

function needsStepUpPin(subtype: string): boolean {
  return subtype === 'validated_exceptional_outflow' || subtype === 'other_admin_coded';
}

function useDisbursementEntryBlock(): EntryBlock {
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
    if (!keys.includes(PERMISSION_CASHFLOW_DISBURSEMENT)) {
      return {
        blocked: true,
        title: 'Décaissement non autorisé',
        body: `Permission « ${PERMISSION_CASHFLOW_DISBURSEMENT} » absente.`,
      };
    }
    return { blocked: false, sessionId: envelope.cashSessionId.trim() };
  }, [envelope]);
}

/**
 * Story 24.7 — décaissement hors ticket : sous-types fermés (pas de catégorie poubelle).
 * Distinct du mouvement interne (24.8) et du remboursement client.
 */
export function CashflowDisbursementWizard(_props: RegisteredWidgetProps): ReactNode {
  const entry = useDisbursementEntryBlock();
  const auth = useAuthPort();
  const draft = useCashflowDraft();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const { options: paymentMethodOptions } = useCaissePaymentMethodOptions(auth);
  const pmSelect = useMemo(
    () => buildRefundWizardPaymentMethodSelectData(paymentMethodOptions),
    [paymentMethodOptions],
  );

  const [subtype, setSubtype] = useState<string>('small_operating_expense');
  const [motif, setMotif] = useState<string>('office_supplies');
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState<number | ''>(0);
  const [paymentCode, setPaymentCode] = useState('cash');
  const [justificationRef, setJustificationRef] = useState('');
  const [freeComment, setFreeComment] = useState('');
  const [adminKey, setAdminKey] = useState<string>(ADMIN_CODED_KEYS[0]?.value ?? 'bank_fees');
  const [settlementIso, setSettlementIso] = useState(() => new Date().toISOString().slice(0, 16));
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [success, setSuccess] = useState<Record<string, unknown> | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  if (entry.blocked) {
    return (
      <Stack gap="md" data-testid="cashflow-disbursement-wizard-blocked">
        <Title order={3}>Décaissement</Title>
        <Alert color="yellow" title={entry.title}>
          {entry.body}
        </Alert>
      </Stack>
    );
  }

  const sessionId = entry.sessionId;

  const onSubmit = async (): Promise<void> => {
    const amountValue = typeof amount === 'number' ? amount : Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError({ kind: 'local', message: 'Saisissez un montant positif.' });
      return;
    }
    const cp = counterparty.trim();
    if (!cp) {
      setError({ kind: 'local', message: 'Le bénéficiaire ou fournisseur est obligatoire.' });
      return;
    }
    const jref = justificationRef.trim();
    if (!jref) {
      setError({ kind: 'local', message: 'La référence justificative est obligatoire.' });
      return;
    }
    let actualAt: string;
    try {
      actualAt = new Date(settlementIso).toISOString();
    } catch {
      setError({ kind: 'local', message: 'Date / heure de règlement invalides.' });
      return;
    }

    if (needsStepUpPin(subtype)) {
      const pinTrim = pin.trim();
      if (pinTrim.length < 4) {
        setError({ kind: 'local', message: 'PIN step-up obligatoire (4 chiffres minimum) pour ce sous-type.' });
        return;
      }
    }

    const payload: CashDisbursementPayload = {
      subtype,
      motif_code: motif,
      counterparty_label: cp,
      amount: Number(amountValue),
      payment_method: paymentCode.trim() || 'cash',
      justification_reference: jref,
      free_comment: freeComment.trim() || null,
      actual_settlement_at: actualAt,
    };
    if (subtype === 'other_admin_coded') {
      payload.admin_coded_reason_key = adminKey;
    }

    setBusy(true);
    setError(null);
    const idem = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idem;

    const res = await postCashDisbursement(sessionId, payload, auth, {
      idempotencyKey: idem,
      stepUpPin: needsStepUpPin(subtype) ? pin.trim() : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setSuccess(res.disbursement);
  };

  return (
    <Stack gap="md" data-testid="cashflow-disbursement-wizard">
      <div>
        <Title order={3}>Décaissement (hors ticket)</Title>
        <Text size="sm" c="dimmed" mt="xs">
          Sous-types obligatoires — distinct du remboursement client et du mouvement interne de caisse (24.8).
        </Text>
      </div>
      {stale ? (
        <Alert color="yellow" title="Brouillon potentiellement périmé">
          Rafraîchir le contexte caisse si vous avez changé de session.
        </Alert>
      ) : null}
      <NativeSelect
        label="Sous-type (fermé)"
        data={SUBTYPE_OPTIONS as unknown as { value: string; label: string }[]}
        value={subtype}
        onChange={(e) => setSubtype(e.currentTarget.value)}
      />
      <NativeSelect
        label="Motif codifié"
        data={MOTIF_OPTIONS as unknown as { value: string; label: string }[]}
        value={motif}
        onChange={(e) => setMotif(e.currentTarget.value)}
      />
      {subtype === 'other_admin_coded' ? (
        <NativeSelect
          label="Clé administrative (autre codifié)"
          data={ADMIN_CODED_KEYS as unknown as { value: string; label: string }[]}
          value={adminKey}
          onChange={(e) => setAdminKey(e.currentTarget.value)}
        />
      ) : null}
      <TextInput
        label="Bénéficiaire ou fournisseur"
        value={counterparty}
        onChange={(e) => setCounterparty(e.currentTarget.value)}
      />
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
        label="Moyen de sortie"
        data={pmSelect}
        value={paymentCode}
        onChange={(e) => setPaymentCode(e.currentTarget.value)}
      />
      <TextInput
        label="Référence justificative"
        value={justificationRef}
        onChange={(e) => setJustificationRef(e.currentTarget.value)}
      />
      <Textarea
        label="Commentaire libre (optionnel)"
        value={freeComment}
        onChange={(e) => setFreeComment(e.currentTarget.value)}
        minRows={2}
      />
      <TextInput
        label="Date / heure réelle de règlement (locale)"
        type="datetime-local"
        value={settlementIso}
        onChange={(e) => setSettlementIso(e.currentTarget.value)}
      />
      {needsStepUpPin(subtype) ? (
        <PasswordInput
          label="PIN step-up"
          description="Requis pour les sous-types à preuve renforcée."
          value={pin}
          onChange={(e) => setPin(e.currentTarget.value)}
        />
      ) : null}
      <Button loading={busy} onClick={() => void onSubmit()}>
        Enregistrer le décaissement
      </Button>
      <CashflowOperationalSyncNotice auth={auth} />
      {error ? <CashflowClientErrorAlert error={error} /> : null}
      {success ? (
        <Alert color="green" title="Décaissement enregistré">
          <Text size="sm">Identifiant : {String(success.id ?? '')}</Text>
        </Alert>
      ) : null}
    </Stack>
  );
}
