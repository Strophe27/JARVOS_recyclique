import { Button, Text } from '@mantine/core';
import { useEffect, useState, type ReactNode } from 'react';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import {
  postCreateSale,
  postFinalizeHeldSale,
} from '../../api/sales-client';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import {
  bumpHeldTicketsListRefresh,
  clearCashflowDraftSubmitError,
  setAfterSuccessfulSale,
  setCashflowDraftApiSubmitError,
  setCashSessionIdInput,
  setPaymentMethod,
  useCashflowDraft,
} from './cashflow-draft-store';
import wizardClasses from './CashflowNominalWizard.module.css';
import dockClasses from './KioskFinalizeSaleDock.module.css';

/**
 * Bloc d’encaissement toujours visible (colonne ticket kiosque) — même logique métier que l’étape Paiement du wizard.
 */
export function KioskFinalizeSaleDock(): ReactNode {
  const draft = useCashflowDraft();
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fromEnv = envelope.cashSessionId?.trim();
    if (fromEnv && !draft.cashSessionIdInput) {
      setCashSessionIdInput(fromEnv);
    }
  }, [envelope.cashSessionId, draft.cashSessionIdInput]);

  const canSubmit =
    !stale &&
    draft.cashSessionIdInput.trim().length > 0 &&
    draft.lines.length > 0 &&
    draft.totalAmount > 0;

  const onSubmit = async () => {
    clearCashflowDraftSubmitError();
    setBusy(true);
    try {
      if (draft.activeHeldSaleId) {
        const res = await postFinalizeHeldSale(
          draft.activeHeldSaleId,
          { payment_method: draft.paymentMethod },
          auth,
        );
        if (!res.ok) {
          setCashflowDraftApiSubmitError(recycliqueClientFailureFromSalesHttp(res));
          return;
        }
        setAfterSuccessfulSale(res.saleId);
        bumpHeldTicketsListRefresh();
        return;
      }
      const body = {
        cash_session_id: draft.cashSessionIdInput.trim(),
        items: draft.lines.map((l) => ({
          category: l.category,
          quantity: l.quantity,
          weight: l.weight,
          unit_price: l.unitPrice,
          total_price: l.totalPrice,
        })),
        total_amount: draft.totalAmount,
        donation: 0,
        payment_method: draft.paymentMethod,
      };
      const res = await postCreateSale(body, auth);
      if (!res.ok) {
        setCashflowDraftApiSubmitError(recycliqueClientFailureFromSalesHttp(res));
        return;
      }
      setAfterSuccessfulSale(res.saleId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={dockClasses.root} data-testid="cashflow-kiosk-finalize-dock">
      <div className={dockClasses.title}>Finaliser la vente</div>
      <Text size="sm" mb="sm" c="dimmed">
        {draft.activeHeldSaleId
          ? 'Reprise : contrôlez le total dans le ticket, puis encaissez.'
          : 'Moyen de paiement puis enregistrement (même action que l’étape Encaissement).'}
      </Text>
      <Text component="label" size="sm" fw={600} display="block" mb={4}>
        Moyen de paiement
        <select
          className={wizardClasses.nativeSelect}
          data-testid="cashflow-select-payment-dock"
          value={draft.paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value === 'card' ? 'card' : 'cash')}
        >
          <option value="cash">Espèces</option>
          <option value="card">Carte</option>
        </select>
      </Text>
      <CashflowClientErrorAlert error={draft.submitError} />
      <Button
        mt="md"
        size="md"
        color="green"
        onClick={() => void onSubmit()}
        disabled={!canSubmit || busy}
        loading={busy}
        data-testid="cashflow-submit-sale"
      >
        {draft.activeHeldSaleId
          ? 'Encaisser le ticket'
          : 'Enregistrer la vente'}
      </Button>
    </div>
  );
}
