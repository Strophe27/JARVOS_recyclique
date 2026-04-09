import { Alert, Button, NativeSelect, Text, TextInput } from '@mantine/core';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { getSale, postCreateSaleReversal } from '../../api/sales-client';
import {
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_REFUND,
} from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import { CashflowOperationalSyncNotice } from './cashflow-operational-sync-notice';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';
import { useCashflowDraft } from './cashflow-draft-store';
import classes from './CashflowRefundWizard.module.css';

type EntryBlock =
  | { readonly blocked: false }
  | { readonly blocked: true; readonly title: string; readonly body: string };

function useRefundEntryBlock(): EntryBlock {
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
          'Contexte dégradé — rafraîchir avant un remboursement.',
      };
    }
    if (!envelope.siteId?.trim()) {
      return {
        blocked: true,
        title: 'Site actif non résolu',
        body: 'L’enveloppe ne fournit pas de site : le remboursement ne peut pas continuer.',
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
    if (!keys.includes(PERMISSION_CASHFLOW_REFUND)) {
      return {
        blocked: true,
        title: 'Remboursement non autorisé',
        body: `Permission « ${PERMISSION_CASHFLOW_REFUND} » absente — le serveur doit l’accorder explicitement (Story 6.4).`,
      };
    }
    return { blocked: false };
  }, [envelope]);
}

const REASON_OPTIONS = [
  { value: 'ERREUR_SAISIE', label: 'Erreur de saisie' },
  { value: 'RETOUR_ARTICLE', label: 'Retour article' },
  { value: 'ANNULATION_CLIENT', label: 'Annulation client' },
  { value: 'AUTRE', label: 'Autre (détail obligatoire)' },
] as const;

/**
 * Parcours Remboursement (Story 6.4) : deux temps (saisie id → confirmation + POST serveur).
 * Aucune règle d’éligibilité métier côté store — erreurs API affichées telles quelles.
 */
export function CashflowRefundWizard(_props: RegisteredWidgetProps): ReactNode {
  const entry = useRefundEntryBlock();
  const auth = useAuthPort();
  const draft = useCashflowDraft();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const [step, setStep] = useState<1 | 2>(1);
  const [saleIdInput, setSaleIdInput] = useState('');
  const [loadedSale, setLoadedSale] = useState<{ id: string; total_amount: number } | null>(null);
  const [reason, setReason] = useState<string>('RETOUR_ARTICLE');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [busy, setBusy] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const resetFlow = useCallback(() => {
    setStep(1);
    setSaleIdInput('');
    setLoadedSale(null);
    setReason('RETOUR_ARTICLE');
    setDetail('');
    setError(null);
    setSuccessId(null);
  }, []);

  if (entry.blocked) {
    return (
      <Alert color="orange" title={entry.title} data-testid="cashflow-refund-context-blocked">
        <Text size="sm">{entry.body}</Text>
      </Alert>
    );
  }

  const onLoadSale = async () => {
    const id = saleIdInput.trim();
    if (!id) {
      setError({ kind: 'local', message: 'Saisissez l’identifiant du ticket source.' });
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await getSale(id, auth);
      if (!res.ok) {
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        setLoadedSale(null);
        return;
      }
      if (res.sale.lifecycle_status !== 'completed') {
        setError({
          kind: 'local',
          message:
            'Ce ticket n’est pas finalisé (completed) côté serveur — remboursement refusé par politique métier.',
        });
        setLoadedSale(null);
        return;
      }
      setLoadedSale({ id: res.sale.id, total_amount: res.sale.total_amount });
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const onConfirmReversal = async () => {
    if (!loadedSale) return;
    if (reason === 'AUTRE' && !detail.trim()) {
      setError({ kind: 'local', message: 'Précisez le motif (obligatoire pour « Autre »).' });
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await postCreateSaleReversal(
        {
          source_sale_id: loadedSale.id,
          reason_code: reason as 'ERREUR_SAISIE' | 'RETOUR_ARTICLE' | 'ANNULATION_CLIENT' | 'AUTRE',
          detail: detail.trim() || undefined,
        },
        auth,
      );
      if (!res.ok) {
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        return;
      }
      setSuccessId(res.reversalId);
    } finally {
      setBusy(false);
    }
  };

  if (successId) {
    return (
      <div className={classes.step} data-testid="cashflow-refund-success">
        <Text fw={700} c="teal">
          Reversal enregistré dans Recyclique (avoir)
        </Text>
        <Text size="sm" c="dimmed">
          Ne présumez pas que l’écriture comptable aval est finalisée sans confirmation serveur.
        </Text>
        <Text size="sm">
          Identifiant reversal : <code>{successId}</code>
        </Text>
        <Button variant="light" onClick={resetFlow} data-testid="cashflow-refund-reset">
          Nouveau remboursement
        </Button>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className={classes.step} data-testid="cashflow-refund-step-select">
        <CashflowOperationalSyncNotice auth={auth} />
        {stale ? (
          <Alert color="orange" title="Données périmées" mb="sm" data-testid="cashflow-refund-stale">
            <Text size="sm">DATA_STALE sur le ticket critique — rechargez le ticket avant un remboursement.</Text>
          </Alert>
        ) : null}
        <Text fw={700}>Remboursement — sélection du ticket source</Text>
        <Text size="sm" c="dimmed">
          Opération sensible : le montant remboursé est celui du ticket (total), imposé par le serveur (
          <code>recyclique_sales_createSaleReversal</code>). Ceci est un reversal, pas une vente nominale.
        </Text>
        <TextInput
          label="ID vente source (UUID)"
          value={saleIdInput}
          onChange={(e) => setSaleIdInput(e.currentTarget.value)}
          data-testid="cashflow-refund-sale-id-input"
        />
        <CashflowClientErrorAlert error={error} testId="cashflow-refund-error" />
        <Button loading={busy} onClick={() => void onLoadSale()} data-testid="cashflow-refund-load-sale" disabled={stale}>
          Charger le ticket (GET recyclique_sales_getSale)
        </Button>
      </div>
    );
  }

  return (
    <div className={classes.step} data-testid="cashflow-refund-step-confirm">
      <CashflowOperationalSyncNotice auth={auth} />
      {stale ? (
        <Alert color="orange" title="Données périmées" mb="sm" data-testid="cashflow-refund-stale">
          <Text size="sm">DATA_STALE — confirmation remboursement bloquée.</Text>
        </Alert>
      ) : null}
      <Text fw={700}>Confirmation — reversal</Text>
      <Alert color="gray" title="Récapitulatif">
        <Text size="sm">
          Ticket <code>{loadedSale?.id}</code> — montant total remboursé (serveur) :{' '}
          <strong>{loadedSale ? Number(loadedSale.total_amount).toFixed(2) : '—'} €</strong>
        </Text>
      </Alert>
      <NativeSelect
        label="Motif"
        data={[...REASON_OPTIONS]}
        value={reason}
        onChange={(e) => setReason(e.currentTarget.value)}
        data-testid="cashflow-refund-reason"
      />
      <TextInput
        label="Détail (obligatoire si motif Autre)"
        value={detail}
        onChange={(e) => setDetail(e.currentTarget.value)}
        data-testid="cashflow-refund-detail"
      />
      <CashflowClientErrorAlert error={error} testId="cashflow-refund-error" />
      <Button variant="default" onClick={() => setStep(1)} disabled={busy} data-testid="cashflow-refund-back">
        Retour
      </Button>
      <Button
        color="orange"
        loading={busy}
        onClick={() => void onConfirmReversal()}
        data-testid="cashflow-refund-confirm-submit"
        disabled={stale}
      >
        Confirmer le remboursement (POST recyclique_sales_createSaleReversal)
      </Button>
    </div>
  );
}
