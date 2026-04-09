import { Alert, Button, Loader, NativeSelect, PasswordInput, Text, TextInput } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import {
  getSale,
  patchSaleSensitiveCorrection,
  type SaleCorrectionRequestBody,
  type SaleResponseV1,
} from '../../api/sales-client';
import { PERMISSION_CASHFLOW_SALE_CORRECT } from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import { CashflowOperationalSyncNotice } from './cashflow-operational-sync-notice';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';
import { useCashflowDraft } from './cashflow-draft-store';
import classes from './CashflowSaleCorrectionWizard.module.css';

type EntryBlock =
  | { readonly blocked: false }
  | { readonly blocked: true; readonly title: string; readonly body: string };

function useSaleCorrectionEntryBlock(): EntryBlock {
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
          'Contexte dégradé — rafraîchir le contexte avant une correction.',
      };
    }
    if (!envelope.siteId?.trim()) {
      return {
        blocked: true,
        title: 'Site actif non résolu',
        body: 'L’enveloppe ne fournit pas de site.',
      };
    }
    const keys = envelope.permissions.permissionKeys;
    if (!keys.includes(PERMISSION_CASHFLOW_SALE_CORRECT)) {
      return {
        blocked: true,
        title: 'Correction non exposée',
        body: `La clé effective « ${PERMISSION_CASHFLOW_SALE_CORRECT} » est absente — réservée super-admin côté serveur (Story 6.8).`,
      };
    }
    return { blocked: false };
  }, [envelope]);
}

const KIND_OPTIONS = [
  { value: 'sale_date', label: 'Date réelle du ticket (sale_date)' },
  { value: 'finalize_fields', label: 'Champs de finalisation (liste fermée)' },
] as const;

const PAYMENT_OPTIONS = [
  { value: '', label: '(inchangé)' },
  { value: 'cash', label: 'Espèces' },
  { value: 'card', label: 'Carte' },
  { value: 'check', label: 'Chèque' },
  { value: 'free', label: 'Gratuit / don' },
] as const;

/**
 * Story 6.8 — correction bornée : chargement ticket, saisie whitelist + motif + PIN step-up.
 * Permissions : enveloppe uniquement (`caisse.sale_correct`) ; pas de seconde vérité métier locale.
 *
 * `widget_props` optionnels : `initial_sale_id` + `lock_sale_id` — parcours admin / journal (pas d’étape saisie UUID).
 */
export function CashflowSaleCorrectionWizard({ widgetProps }: RegisteredWidgetProps): ReactNode {
  const entry = useSaleCorrectionEntryBlock();
  const auth = useAuthPort();
  const draft = useCashflowDraft();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const initialSaleId =
    typeof widgetProps?.initial_sale_id === 'string' ? widgetProps.initial_sale_id.trim() : '';
  const lockSaleId = widgetProps?.lock_sale_id === true;

  const [step, setStep] = useState<1 | 2>(1);
  const [saleIdInput, setSaleIdInput] = useState(initialSaleId);
  const [loadedSaleId, setLoadedSaleId] = useState<string | null>(null);
  const [kind, setKind] = useState<'sale_date' | 'finalize_fields'>('sale_date');
  const [saleDateLocal, setSaleDateLocal] = useState('');
  const [donationStr, setDonationStr] = useState('');
  const [totalStr, setTotalStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [note, setNote] = useState('');
  const [initialNote, setInitialNote] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const applyLoadedSale = useCallback((sale: SaleResponseV1) => {
      setLoadedSaleId(sale.id);
      setTotalStr(String(sale.total_amount ?? ''));
      setDonationStr(
        sale.donation !== undefined && sale.donation !== null ? String(sale.donation) : '',
      );
      const n0 = sale.note ?? '';
      setInitialNote(n0);
      setNote(n0);
      setStep(2);
  }, []);

  const loadSaleById = useCallback(
    async (id: string) => {
      const trimmed = id.trim();
      if (!trimmed) {
        setError({ kind: 'local', message: 'Identifiant vente manquant.' });
        return;
      }
      setError(null);
      setBusy(true);
      try {
        const res = await getSale(trimmed, auth);
        if (!res.ok) {
          setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
          setLoadedSaleId(null);
          return;
        }
        if (res.sale.lifecycle_status !== 'completed') {
          setError({
            kind: 'local',
            message: 'Le serveur n’expose que les tickets finalisés (completed) pour ce parcours.',
          });
          setLoadedSaleId(null);
          return;
        }
        applyLoadedSale(res.sale);
      } finally {
        setBusy(false);
      }
    },
    [auth, applyLoadedSale],
  );

  useEffect(() => {
    if (!lockSaleId || !initialSaleId || stale) return;
    void loadSaleById(initialSaleId);
  }, [lockSaleId, initialSaleId, stale, loadSaleById]);

  const resetFlow = useCallback(() => {
    setStep(1);
    setSaleIdInput(lockSaleId && initialSaleId ? initialSaleId : '');
    setLoadedSaleId(null);
    setKind('sale_date');
    setSaleDateLocal('');
    setDonationStr('');
    setTotalStr('');
    setPaymentMethod('');
    setNote('');
    setInitialNote(null);
    setReason('');
    setPin('');
    setError(null);
    setDone(false);
    if (lockSaleId && initialSaleId) {
      void loadSaleById(initialSaleId);
    }
  }, [lockSaleId, initialSaleId, loadSaleById]);

  if (entry.blocked) {
    return (
      <Alert color="orange" title={entry.title} data-testid="cashflow-sale-correction-context-blocked">
        <Text size="sm">{entry.body}</Text>
      </Alert>
    );
  }

  const onLoadSale = async () => {
    await loadSaleById(saleIdInput);
  };

  const buildBody = (): SaleCorrectionRequestBody | null => {
    const r = reason.trim();
    if (!r) {
      setError({ kind: 'local', message: 'Le motif (raison) est obligatoire pour l’audit.' });
      return null;
    }
    if (kind === 'sale_date') {
      if (!saleDateLocal.trim()) {
        setError({ kind: 'local', message: 'Indiquez la nouvelle date/heure.' });
        return null;
      }
      const iso = new Date(saleDateLocal).toISOString();
      return { kind: 'sale_date', sale_date: iso, reason: r };
    }
    const payload: SaleCorrectionRequestBody = { kind: 'finalize_fields', reason: r };
    let any = false;
    if (donationStr.trim() !== '') {
      const n = parseFloat(donationStr.replace(',', '.'));
      if (Number.isNaN(n)) {
        setError({ kind: 'local', message: 'Don : nombre invalide.' });
        return null;
      }
      payload.donation = n;
      any = true;
    }
    if (totalStr.trim() !== '') {
      const n = parseFloat(totalStr.replace(',', '.'));
      if (Number.isNaN(n)) {
        setError({ kind: 'local', message: 'Total : nombre invalide.' });
        return null;
      }
      payload.total_amount = n;
      any = true;
    }
    if (paymentMethod.trim() !== '') {
      payload.payment_method = paymentMethod;
      any = true;
    }
    if (initialNote !== null && note !== initialNote) {
      payload.note = note;
      any = true;
    }
    if (!any) {
      setError({
        kind: 'local',
        message: 'Au moins un champ de finalisation doit être renseigné (serveur).',
      });
      return null;
    }
    return payload;
  };

  const onSubmit = async () => {
    if (!loadedSaleId) return;
    const body = buildBody();
    if (!body) return;
    const p = pin.trim();
    if (!p) {
      setError({ kind: 'local', message: 'PIN step-up obligatoire (X-Step-Up-Pin).' });
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await patchSaleSensitiveCorrection(loadedSaleId, body, auth, { stepUpPin: p });
      if (!res.ok) {
        setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={classes.step} data-testid="cashflow-sale-correction-wizard">
      <CashflowOperationalSyncNotice auth={auth} />
      {stale ? (
        <Alert color="orange" title="Données périmées" mb="sm" data-testid="cashflow-sale-correction-stale">
          <Text size="sm">DATA_STALE — correction bloquée jusqu’à retour NOMINAL.</Text>
        </Alert>
      ) : null}
      <Text size="sm" c="dimmed">
        Story 6.8 — périmètre liste fermée ; refus si session clôturée (serveur). Aucune édition des lignes
        article ici.
      </Text>
      {done ? (
        <Alert color="green" title="Correction envoyée" data-testid="cashflow-sale-correction-success">
          <Text size="sm">La réponse serveur a été acceptée. Vérifiez le journal d’audit côté admin.</Text>
          {!lockSaleId ? (
            <Button mt="sm" size="xs" variant="light" onClick={() => resetFlow()}>
              Nouvelle correction
            </Button>
          ) : (
            <Text mt="sm" size="sm">
              Fermez la fenêtre pour revenir au journal des ventes.
            </Text>
          )}
        </Alert>
      ) : null}
      {!done && step === 1 && !lockSaleId ? (
        <>
          <TextInput
            label="Identifiant vente (UUID)"
            value={saleIdInput}
            onChange={(e) => setSaleIdInput(e.currentTarget.value)}
            data-testid="cashflow-sale-correction-sale-id"
          />
          <Button
            size="sm"
            loading={busy}
            onClick={() => void onLoadSale()}
            data-testid="cashflow-sale-correction-load"
            disabled={stale}
          >
            Charger le ticket
          </Button>
          <CashflowClientErrorAlert error={error} testId="cashflow-sale-correction-error" />
        </>
      ) : null}
      {!done && lockSaleId && initialSaleId && !loadedSaleId ? (
        <div data-testid="cashflow-sale-correction-locked-loading">
          {busy ? <Loader size="sm" /> : null}
          <Text size="sm" mt="xs">
            {busy ? 'Chargement du ticket…' : 'Ticket non chargé.'}
          </Text>
          <CashflowClientErrorAlert error={error} testId="cashflow-sale-correction-error" />
        </div>
      ) : null}
      {!done && step === 2 && loadedSaleId ? (
        <>
          <Text size="sm">Ticket : {loadedSaleId}</Text>
          <NativeSelect
            label="Type de correction"
            data={[...KIND_OPTIONS]}
            value={kind}
            onChange={(e) => setKind(e.currentTarget.value as 'sale_date' | 'finalize_fields')}
            data-testid="cashflow-sale-correction-kind"
          />
          {kind === 'sale_date' ? (
            <TextInput
              type="datetime-local"
              label="Nouvelle date / heure"
              value={saleDateLocal}
              onChange={(e) => setSaleDateLocal(e.currentTarget.value)}
              data-testid="cashflow-sale-correction-datetime"
            />
          ) : (
            <>
              <TextInput
                label="Don (optionnel)"
                value={donationStr}
                onChange={(e) => setDonationStr(e.currentTarget.value)}
                data-testid="cashflow-sale-correction-donation"
              />
              <TextInput
                label="Total encaissé (optionnel)"
                value={totalStr}
                onChange={(e) => setTotalStr(e.currentTarget.value)}
                data-testid="cashflow-sale-correction-total"
              />
              <NativeSelect
                label="Mode de paiement"
                data={[...PAYMENT_OPTIONS]}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.currentTarget.value)}
                data-testid="cashflow-sale-correction-payment"
              />
              <TextInput
                label="Note ticket (modifier pour envoyer une correction ; laisser inchangé sinon)"
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                data-testid="cashflow-sale-correction-note"
              />
            </>
          )}
          <TextInput
            label="Motif / raison (audit)"
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            required
            data-testid="cashflow-sale-correction-reason"
          />
          <PasswordInput
            label="PIN step-up"
            value={pin}
            onChange={(e) => setPin(e.currentTarget.value)}
            data-testid="cashflow-sale-correction-pin"
          />
          <CashflowClientErrorAlert error={error} testId="cashflow-sale-correction-error" />
          <Button
            size="sm"
            loading={busy}
            onClick={() => void onSubmit()}
            data-testid="cashflow-sale-correction-submit"
            disabled={stale}
          >
            Confirmer la correction
          </Button>
          {!lockSaleId ? (
            <Button size="xs" variant="subtle" onClick={() => resetFlow()}>
              Recommencer
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
