import {
  Alert,
  Button,
  Group,
  Loader,
  NativeSelect,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import {
  getSale,
  patchSaleSensitiveCorrection,
  splitSalePaymentsByNature,
  type SaleCorrectionItemPatchBody,
  type SaleCorrectionRequestBody,
  type SalePaymentMethodOption,
  type SaleResponseV1,
} from '../../api/sales-client';
import { PERMISSION_CASHFLOW_SALE_CORRECT } from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { DEFAULT_FREE_PAYMENT_LABEL } from './payment-method-display';
import { useCaissePaymentMethodOptions } from './use-caisse-payment-method-options';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import { CashflowOperationalSyncNotice } from './cashflow-operational-sync-notice';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';
import { useCashflowDraft } from './cashflow-draft-store';
import classes from './CashflowSaleCorrectionWizard.module.css';

type EntryBlock =
  | { readonly blocked: false }
  | { readonly blocked: true; readonly title: string; readonly body: string };

type PaymentDraftRow = {
  readonly localId: string;
  payment_method: string;
  amountStr: string;
};

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

const PAY_ARBITRAGE_EPS = 1e-3;

type ItemEditRow = {
  id: string;
  category: string;
  quantityStr: string;
  weightStr: string;
  unitPriceStr: string;
  totalPriceStr: string;
  notes: string;
  tagKindStr: string;
  tagCustomStr: string;
};

function saleItemsToEditRows(items: SaleResponseV1['items']): ItemEditRow[] {
  return items
    .map((it) => ({
      id: String(it.id ?? ''),
      category: String(it.category ?? ''),
      quantityStr: String(it.quantity ?? ''),
      weightStr:
        it.weight !== undefined && it.weight !== null && Number.isFinite(it.weight) ? String(it.weight) : '',
      unitPriceStr: String(it.unit_price ?? ''),
      totalPriceStr: String(it.total_price ?? ''),
      notes: String(it.notes ?? ''),
      tagKindStr: it.business_tag_kind != null ? String(it.business_tag_kind) : '',
      tagCustomStr: String(it.business_tag_custom ?? ''),
    }))
    .filter((r) => r.id.length > 0);
}

function buildItemLinePatches(
  baseline: ItemEditRow[],
  current: ItemEditRow[],
): { ok: true; patches: SaleCorrectionItemPatchBody[] } | { ok: false; message: string } {
  const bMap = new Map(baseline.map((r) => [r.id, r]));
  const patches: SaleCorrectionItemPatchBody[] = [];
  for (const row of current) {
    const b = bMap.get(row.id);
    if (!b) continue;
    const patch: SaleCorrectionItemPatchBody = { sale_item_id: row.id };
    if (row.category.trim() !== b.category.trim()) {
      patch.category = row.category.trim();
    }
    if (row.quantityStr.trim() !== b.quantityStr.trim()) {
      const n = parseInt(row.quantityStr.trim(), 10);
      if (Number.isNaN(n) || n <= 0) {
        return { ok: false, message: 'Quantité invalide sur une ligne (entier > 0).' };
      }
      patch.quantity = n;
    }
    if (row.weightStr.trim() !== b.weightStr.trim()) {
      const w = parseFloat(row.weightStr.replace(',', '.'));
      if (Number.isNaN(w) || w <= 0) {
        return { ok: false, message: 'Poids invalide sur une ligne (nombre > 0).' };
      }
      patch.weight = w;
    }
    if (row.unitPriceStr.trim() !== b.unitPriceStr.trim()) {
      const up = parseFloat(row.unitPriceStr.replace(',', '.'));
      if (Number.isNaN(up) || up < 0) {
        return { ok: false, message: 'Prix unitaire invalide sur une ligne.' };
      }
      patch.unit_price = up;
    }
    if (row.totalPriceStr.trim() !== b.totalPriceStr.trim()) {
      const tp = parseFloat(row.totalPriceStr.replace(',', '.'));
      if (Number.isNaN(tp) || tp < 0) {
        return { ok: false, message: 'Montant ligne invalide.' };
      }
      patch.total_price = tp;
    }
    if (row.notes !== b.notes) {
      patch.notes = row.notes;
    }
    if (row.tagKindStr.trim() !== b.tagKindStr.trim() && row.tagKindStr.trim()) {
      patch.business_tag_kind = row.tagKindStr.trim() as SaleCorrectionItemPatchBody['business_tag_kind'];
    }
    if (row.tagCustomStr.trim() !== b.tagCustomStr.trim()) {
      patch.business_tag_custom = row.tagCustomStr.trim() ? row.tagCustomStr.trim() : undefined;
    }
    const keys = Object.keys(patch).filter((k) => k !== 'sale_item_id');
    if (keys.length > 0) {
      patches.push(patch);
    }
  }
  return { ok: true, patches };
}

function newLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function snapshotPaymentDraftRows(rows: readonly PaymentDraftRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({ pm: r.payment_method.trim(), a: r.amountStr.trim() })),
  );
}

function parseDraftPaymentLines(
  rows: readonly PaymentDraftRow[],
  pmOpts: readonly SalePaymentMethodOption[],
): { ok: true; lines: Array<{ payment_method: string; amount: number }> } | { ok: false; message: string } {
  const validCodes = new Set(pmOpts.map((o) => o.code));
  const lines: Array<{ payment_method: string; amount: number }> = [];
  for (const r of rows) {
    const pm = r.payment_method.trim();
    const n = parseFloat(r.amountStr.replace(',', '.'));
    if (!pm) {
      return {
        ok: false,
        message: 'Chaque ligne doit avoir un moyen de paiement (référentiel actif).',
      };
    }
    if (pm === 'free') {
      return {
        ok: false,
        message:
          'Le mode gratuit ne peut pas figurer dans une ligne de paiement explicite — utilisez le ticket sans lignes financières.',
      };
    }
    if (!validCodes.has(pm)) {
      return { ok: false, message: 'Moyen de paiement invalide sur une ligne par rapport au référentiel actif.' };
    }
    if (Number.isNaN(n) || n <= 0) {
      return { ok: false, message: 'Montant invalide sur une ligne (nombre > 0 attendu).' };
    }
    lines.push({ payment_method: pm, amount: n });
  }
  return { ok: true, lines };
}

function validatePartitionVsTotal22_4(
  totalNum: number,
  saleLines: ReadonlyArray<{ amount: number }>,
  surplusLines: ReadonlyArray<{ amount: number }>,
): string | null {
  const sumSale = saleLines.reduce((s, x) => s + x.amount, 0);
  const sumSurplus = surplusLines.reduce((s, x) => s + x.amount, 0);
  if (totalNum <= PAY_ARBITRAGE_EPS) {
    if (sumSale > PAY_ARBITRAGE_EPS || sumSurplus > PAY_ARBITRAGE_EPS) {
      return 'Pour un total nul, aucune ligne financière ne doit rester.';
    }
    return null;
  }
  if (sumSale > totalNum + PAY_ARBITRAGE_EPS) {
    return 'La somme des lignes de règlement dépasse le total encaissé — utilisez aussi des lignes « don (surplus) » si besoin.';
  }
  if (sumSale + sumSurplus < totalNum - PAY_ARBITRAGE_EPS) {
    return 'Encaissement insuffisant : les lignes de règlement + don (surplus) doivent couvrir le total.';
  }
  return null;
}

function rowsFromSplit(
  rows: ReadonlyArray<{ payment_method: string; amount: number }>,
): PaymentDraftRow[] {
  return rows.map((r) => ({
    localId: newLocalId(),
    payment_method: r.payment_method,
    amountStr: String(r.amount),
  }));
}

/**
 * Story 6.8 — correction bornée : chargement ticket, saisie whitelist + motif + PIN step-up.
 * Permissions : enveloppe uniquement (`caisse.sale_correct`) ; pas de seconde vérité métier locale.
 *
 * `widget_props` optionnels : `initial_sale_id` + `lock_sale_id` — parcours admin / journal (pas d’étape saisie UUID).
 */
export function CashflowSaleCorrectionWizard({ widgetProps }: RegisteredWidgetProps): ReactNode {
  const entry = useSaleCorrectionEntryBlock();
  const auth = useAuthPort();
  const { options: pmOpts, loading: pmLoading, error: pmError } = useCaissePaymentMethodOptions(auth);
  const paymentMethodsReady = !pmLoading && pmError === null && pmOpts.length > 0;
  const paymentRowSelectData = useMemo(
    () => pmOpts.map((o) => ({ value: o.code, label: o.label })),
    [pmOpts],
  );
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
  const [draftSalePayments, setDraftSalePayments] = useState<PaymentDraftRow[]>([]);
  const [draftDonationSurplus, setDraftDonationSurplus] = useState<PaymentDraftRow[]>([]);
  const [baselineItems, setBaselineItems] = useState<ItemEditRow[]>([]);
  const [itemRows, setItemRows] = useState<ItemEditRow[]>([]);
  const initialSaleSnapRef = useRef('');
  const initialSurplusSnapRef = useRef('');
  const initialTotalNumRef = useRef<number | null>(null);
  const initialSalePaymentLineCountRef = useRef(0);
  const [legacyPaymentMethodDisplay, setLegacyPaymentMethodDisplay] = useState('');

  const [note, setNote] = useState('');
  const [initialNote, setInitialNote] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const partitionDirty =
    snapshotPaymentDraftRows(draftSalePayments) !== initialSaleSnapRef.current ||
    snapshotPaymentDraftRows(draftDonationSurplus) !== initialSurplusSnapRef.current;

  const itemLinesDirty = useMemo(
    () => JSON.stringify(itemRows) !== JSON.stringify(baselineItems),
    [itemRows, baselineItems],
  );

  const applyLoadedSale = useCallback((sale: SaleResponseV1) => {
    setLoadedSaleId(sale.id);
    setTotalStr(String(sale.total_amount ?? ''));
    initialTotalNumRef.current =
      typeof sale.total_amount === 'number' && Number.isFinite(sale.total_amount)
        ? sale.total_amount
        : null;
    setDonationStr(
      sale.donation !== undefined && sale.donation !== null ? String(sale.donation) : '',
    );
    const n0 = sale.note ?? '';
    setInitialNote(n0);
    setNote(n0);
    const split = splitSalePaymentsByNature(sale.payments);
    initialSalePaymentLineCountRef.current = split.sale_payment.length;
    const pmAgg = typeof sale.payment_method === 'string' ? sale.payment_method.trim() : '';
    setLegacyPaymentMethodDisplay(pmAgg || '—');
    const saleRows = rowsFromSplit(split.sale_payment);
    const surplusRows = rowsFromSplit(split.donation_surplus);
    setDraftSalePayments(saleRows);
    setDraftDonationSurplus(surplusRows);
    initialSaleSnapRef.current = snapshotPaymentDraftRows(saleRows);
    initialSurplusSnapRef.current = snapshotPaymentDraftRows(surplusRows);
    const ir = saleItemsToEditRows(sale.items ?? []);
    setBaselineItems(ir.map((r) => ({ ...r })));
    setItemRows(ir.map((r) => ({ ...r })));
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
    setDraftSalePayments([]);
    setDraftDonationSurplus([]);
    initialSaleSnapRef.current = '';
    initialSurplusSnapRef.current = '';
    initialTotalNumRef.current = null;
    initialSalePaymentLineCountRef.current = 0;
    setBaselineItems([]);
    setItemRows([]);
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

  const addSalePaymentRow = () => {
    setDraftSalePayments((prev) => [...prev, { localId: newLocalId(), payment_method: '', amountStr: '' }]);
  };

  const addSurplusRow = () => {
    setDraftDonationSurplus((prev) => [...prev, { localId: newLocalId(), payment_method: '', amountStr: '' }]);
  };

  const removeSalePaymentRow = (localId: string) => {
    setDraftSalePayments((prev) => prev.filter((r) => r.localId !== localId));
  };

  const removeSurplusRow = (localId: string) => {
    setDraftDonationSurplus((prev) => prev.filter((r) => r.localId !== localId));
  };

  const updateSalePaymentRow = (localId: string, patch: Partial<PaymentDraftRow>) => {
    setDraftSalePayments((prev) =>
      prev.map((r) => (r.localId === localId ? { ...r, ...patch } : r)),
    );
  };

  const updateSurplusRow = (localId: string, patch: Partial<PaymentDraftRow>) => {
    setDraftDonationSurplus((prev) =>
      prev.map((r) => (r.localId === localId ? { ...r, ...patch } : r)),
    );
  };

  const updateItemRow = (id: string, patch: Partial<ItemEditRow>) => {
    setItemRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
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
    if (itemLinesDirty) {
      const lp = buildItemLinePatches(baselineItems, itemRows);
      if (!lp.ok) {
        setError({ kind: 'local', message: lp.message });
        return null;
      }
      if (lp.patches.length > 0) {
        payload.items = lp.patches;
        any = true;
      }
    }
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

    if (partitionDirty) {
      if (!paymentMethodsReady) {
        setError({
          kind: 'local',
          message: 'Moyens de paiement indisponibles — impossible de soumettre une répartition pour l’instant.',
        });
        return null;
      }
      const saleParsed = parseDraftPaymentLines(draftSalePayments, pmOpts);
      if (!saleParsed.ok) {
        setError({ kind: 'local', message: saleParsed.message });
        return null;
      }
      const surplusParsed = parseDraftPaymentLines(draftDonationSurplus, pmOpts);
      if (!surplusParsed.ok) {
        setError({ kind: 'local', message: surplusParsed.message });
        return null;
      }
      payload.payments = saleParsed.lines;
      payload.donation_surplus = surplusParsed.lines;
      const totalNum = parseFloat(totalStr.replace(',', '.'));
      if (!Number.isNaN(totalNum)) {
        const arb = validatePartitionVsTotal22_4(totalNum, saleParsed.lines, surplusParsed.lines);
        if (arb) {
          setError({ kind: 'local', message: arb });
          return null;
        }
      }
      any = true;
    } else if (totalStr.trim() !== '' && initialSalePaymentLineCountRef.current > 1) {
      const totalNum = parseFloat(totalStr.replace(',', '.'));
      if (!Number.isNaN(totalNum) && initialTotalNumRef.current !== null) {
        if (Math.abs(totalNum - initialTotalNumRef.current) > PAY_ARBITRAGE_EPS) {
          setError({
            kind: 'local',
            message:
              'Ce ticket a plusieurs lignes de règlement : modifiez les montants dans la grille ou envoyez une répartition explicite.',
          });
          return null;
        }
      }
    }

    if (initialNote !== null && note !== initialNote) {
      payload.note = note;
      any = true;
    }
    if (!any) {
      setError({
        kind: 'local',
        message:
          'Au moins une modification utile est requise : lignes article, don, total, note, répartition paiements, etc.',
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

  const saleLinesSumPreview = useMemo(() => {
    let s = 0;
    for (const r of draftSalePayments) {
      const n = parseFloat(r.amountStr.replace(',', '.'));
      if (Number.isFinite(n)) s += n;
    }
    return s;
  }, [draftSalePayments]);

  const surplusLinesSumPreview = useMemo(() => {
    let s = 0;
    for (const r of draftDonationSurplus) {
      const n = parseFloat(r.amountStr.replace(',', '.'));
      if (Number.isFinite(n)) s += n;
    }
    return s;
  }, [draftDonationSurplus]);

  const totalPreviewNum = useMemo(() => {
    const n = parseFloat(totalStr.replace(',', '.'));
    return Number.isFinite(n) ? n : Number.NaN;
  }, [totalStr]);

  const linesSubtotalPreview = useMemo(() => {
    let s = 0;
    for (const r of itemRows) {
      const n = parseFloat(r.totalPriceStr.replace(',', '.'));
      if (Number.isFinite(n) && n > 0) s += n;
    }
    return s;
  }, [itemRows]);

  return (
    <div className={classes.step} data-testid="cashflow-sale-correction-wizard">
      <CashflowOperationalSyncNotice auth={auth} />
      {stale ? (
        <Alert color="orange" title="Données périmées" mb="sm" data-testid="cashflow-sale-correction-stale">
          <Text size="sm">DATA_STALE — correction bloquée jusqu’à retour NOMINAL.</Text>
        </Alert>
      ) : null}
      <Text size="sm" c="dimmed">
        Story 6.8 — périmètre liste fermée ; refus si session clôturée (serveur). Les lignes article sont éditables
        ci-dessous (correction détail). Pour une annulation monétaire complète d’un ticket finalisé, utiliser le flux
        remboursement / reversal (permission <code>caisse.refund</code>), distinct de cette correction.
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
              <Alert color="gray" variant="light" title="Annulation complète du ticket">
                <Text size="sm">
                  Ce wizard ne supprime pas la vente : pour « annuler » au sens caisse (sortie de fonds), créer un
                  remboursement total (<code>POST /v1/sales/reversals</code>) avec le motif métier — les agrégats et KPI
                  excluent alors la vente source là où le reporting est branché sur les reversals.
                </Text>
              </Alert>
              {itemRows.length > 0 ? (
                <Stack gap="xs" mb="sm" data-testid="cashflow-sale-correction-item-lines">
                  <Text size="sm" fw={600}>
                    Lignes article (détail)
                  </Text>
                  {itemRows.map((row, idx) => (
                    <Stack
                      key={row.id}
                      gap={4}
                      p="xs"
                      style={{ border: '1px solid var(--mantine-color-dark-4)' }}
                    >
                      <Text size="xs" c="dimmed">
                        Ligne {idx + 1} · <code>{row.id}</code>
                      </Text>
                      <Group grow gap="xs" wrap="wrap">
                        <TextInput
                          label="Catégorie"
                          value={row.category}
                          onChange={(e) => updateItemRow(row.id, { category: e.currentTarget.value })}
                          data-testid={`cashflow-sale-correction-item-cat-${idx}`}
                        />
                        <TextInput
                          label="Poids (kg)"
                          value={row.weightStr}
                          onChange={(e) => updateItemRow(row.id, { weightStr: e.currentTarget.value })}
                          data-testid={`cashflow-sale-correction-item-weight-${idx}`}
                        />
                        <TextInput
                          label="Qté"
                          value={row.quantityStr}
                          onChange={(e) => updateItemRow(row.id, { quantityStr: e.currentTarget.value })}
                          data-testid={`cashflow-sale-correction-item-qty-${idx}`}
                        />
                      </Group>
                      <Group grow gap="xs" wrap="wrap">
                        <TextInput
                          label="PU"
                          value={row.unitPriceStr}
                          onChange={(e) => updateItemRow(row.id, { unitPriceStr: e.currentTarget.value })}
                          data-testid={`cashflow-sale-correction-item-pu-${idx}`}
                        />
                        <TextInput
                          label="Montant ligne"
                          value={row.totalPriceStr}
                          onChange={(e) => updateItemRow(row.id, { totalPriceStr: e.currentTarget.value })}
                          data-testid={`cashflow-sale-correction-item-total-${idx}`}
                        />
                      </Group>
                      <TextInput
                        label="Notes ligne"
                        value={row.notes}
                        onChange={(e) => updateItemRow(row.id, { notes: e.currentTarget.value })}
                        data-testid={`cashflow-sale-correction-item-notes-${idx}`}
                      />
                      <Group grow gap="xs" wrap="wrap">
                        <TextInput
                          label="Tag métier (kind)"
                          value={row.tagKindStr}
                          onChange={(e) => updateItemRow(row.id, { tagKindStr: e.currentTarget.value })}
                          data-testid={`cashflow-sale-correction-item-tag-kind-${idx}`}
                        />
                        <TextInput
                          label="Tag métier (libellé AUTRE)"
                          value={row.tagCustomStr}
                          onChange={(e) => updateItemRow(row.id, { tagCustomStr: e.currentTarget.value })}
                          data-testid={`cashflow-sale-correction-item-tag-custom-${idx}`}
                        />
                      </Group>
                    </Stack>
                  ))}
                  <Text size="xs" c="dimmed">
                    Sous-total lignes (somme montants ligne &gt; 0, prévisualisation) :{' '}
                    {linesSubtotalPreview.toFixed(2)} — doit rester cohérent avec le total encaissé (serveur).
                  </Text>
                </Stack>
              ) : (
                <Text size="xs" c="dimmed" mb="xs">
                  Ticket sans lignes article (encaissement sans article ou données minimales).
                </Text>
              )}
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
              <Stack gap="xs" data-testid="cashflow-sale-correction-payment-grids">
                <Text size="sm" fw={600}>
                  Règlement (lignes encaissement)
                </Text>
                {draftSalePayments.length === 0 ? (
                  <Alert color="gray" variant="light">
                    <Text size="sm">
                      Aucune ligne de règlement enregistrée sur ce ticket — la correction du total encaissé reste
                      impossible côté serveur tant qu’aucune ligne journal n’existe (comportement Story 6.8). Vous
                      pouvez ajouter des lignes ci-dessous pour envoyer une répartition explicite.
                    </Text>
                  </Alert>
                ) : null}
                {draftSalePayments.map((row, idx) => (
                  <Group key={row.localId} gap="xs" wrap="wrap" align="flex-end">
                    <NativeSelect
                      label={idx === 0 ? 'Moyen' : undefined}
                      data={paymentRowSelectData}
                      value={row.payment_method}
                      onChange={(e) =>
                        updateSalePaymentRow(row.localId, { payment_method: e.currentTarget.value })
                      }
                      disabled={pmLoading || stale}
                      data-testid={`cashflow-sale-correction-payment-row-${idx}`}
                    />
                    <TextInput
                      label={idx === 0 ? 'Montant' : undefined}
                      value={row.amountStr}
                      onChange={(e) => updateSalePaymentRow(row.localId, { amountStr: e.currentTarget.value })}
                      data-testid={`cashflow-sale-correction-payment-amount-${idx}`}
                    />
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => removeSalePaymentRow(row.localId)}
                      data-testid={`cashflow-sale-correction-payment-remove-${idx}`}
                    >
                      Retirer
                    </Button>
                  </Group>
                ))}
                <Group>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => addSalePaymentRow()}
                    disabled={stale || !paymentMethodsReady}
                    data-testid="cashflow-sale-correction-payment-add"
                  >
                    Ajouter une ligne de règlement
                  </Button>
                </Group>
                <Text size="sm" c="dimmed">
                  Somme règlement saisie : {Number.isFinite(saleLinesSumPreview) ? saleLinesSumPreview.toFixed(2) : '—'}
                </Text>

                <Text size="sm" fw={600} mt="md">
                  Don en surplus (hors règlement), le cas échéant
                </Text>
                {draftDonationSurplus.map((row, idx) => (
                  <Group key={row.localId} gap="xs" wrap="wrap" align="flex-end">
                    <NativeSelect
                      label={idx === 0 ? 'Moyen' : undefined}
                      data={paymentRowSelectData}
                      value={row.payment_method}
                      onChange={(e) =>
                        updateSurplusRow(row.localId, { payment_method: e.currentTarget.value })
                      }
                      disabled={pmLoading || stale}
                      data-testid={`cashflow-sale-correction-surplus-row-${idx}`}
                    />
                    <TextInput
                      label={idx === 0 ? 'Montant' : undefined}
                      value={row.amountStr}
                      onChange={(e) => updateSurplusRow(row.localId, { amountStr: e.currentTarget.value })}
                      data-testid={`cashflow-sale-correction-surplus-amount-${idx}`}
                    />
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => removeSurplusRow(row.localId)}
                      data-testid={`cashflow-sale-correction-surplus-remove-${idx}`}
                    >
                      Retirer
                    </Button>
                  </Group>
                ))}
                <Group>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => addSurplusRow()}
                    disabled={stale || !paymentMethodsReady}
                    data-testid="cashflow-sale-correction-surplus-add"
                  >
                    Ajouter une ligne de don (surplus)
                  </Button>
                </Group>
                <Text size="sm" c="dimmed">
                  Somme don surplus :{' '}
                  {Number.isFinite(surplusLinesSumPreview) ? surplusLinesSumPreview.toFixed(2) : '—'} — couverture vs
                  total :{' '}
                  {!Number.isNaN(totalPreviewNum)
                    ? (saleLinesSumPreview + surplusLinesSumPreview).toFixed(2)
                    : '—'}{' '}
                  / {Number.isNaN(totalPreviewNum) ? '—' : totalPreviewNum.toFixed(2)}
                </Text>
              </Stack>
              {pmLoading ? (
                <Text size="sm" c="dimmed" data-testid="cashflow-sale-correction-pm-loading">
                  Chargement des moyens de paiement…
                </Text>
              ) : null}
              {pmError ? (
                <Text size="sm" c="red" data-testid="cashflow-sale-correction-pm-error">
                  {pmError}
                </Text>
              ) : null}
              <Text size="xs" c="dimmed">
                Champ legacy « payment_method » sur le ticket :{' '}
                <code style={{ whiteSpace: 'nowrap' }}>{legacyPaymentMethodDisplay}</code> — les lignes ci-dessus
                matérialisent le journal réel ; le mode {DEFAULT_FREE_PAYMENT_LABEL} ne doit pas apparaître dans des
                lignes explicites.
              </Text>
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
