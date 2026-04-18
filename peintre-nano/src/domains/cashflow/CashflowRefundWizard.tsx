import { Alert, Button, Checkbox, NativeSelect, ScrollArea, Stack, Table, Text, TextInput } from '@mantine/core';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getCashSessionDetail } from '../../api/cash-session-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import {
  getSale,
  isPlausibleCashSessionUuid,
  parseSaleReversalResponseJson,
  postCreateSaleReversal,
  type SaleReversalRefundPaymentMethod,
  type SaleReversalResponseV1,
} from '../../api/sales-client';
import {
  PERMISSION_ACCOUNTING_PRIOR_YEAR_REFUND,
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_REFUND,
} from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import { buildRefundWizardPaymentMethodSelectData } from './cashflow-refund-payment-method-options';
import {
  filterRefundSaleCandidates,
  parseRefundSaleCandidatesFromSessionDetail,
  type RefundSaleCandidateRow,
} from './cashflow-refund-session-candidates';
import { CashflowOperationalSyncNotice } from './cashflow-operational-sync-notice';
import type { CashflowSubmitSurfaceError } from './cashflow-submit-error';
import { useCashflowDraft } from './cashflow-draft-store';
import { useCaissePaymentMethodOptions } from './use-caisse-payment-method-options';
import classes from './CashflowRefundWizard.module.css';

const PRIOR_YEAR_REFUND_REQUIRES_EXPERT = '[PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH]';

const SESSION_FILTER_DEBOUNCE_MS = 320;

type LoadedSaleSummary = {
  readonly id: string;
  readonly total_amount: number;
  readonly lifecycle_status?: string;
  readonly sale_date?: string | null;
  readonly note?: string | null;
  readonly adherent_reference?: string | null;
  readonly payment_method?: string | null;
};

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
        body: `Permission « ${PERMISSION_CASHFLOW_REFUND} » absente — demandez l’habilitation à votre administrateur.`,
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
 * Remboursement caisse : sélection du ticket puis confirmation (mutation serveur).
 * Les erreurs API sont affichées telles quelles.
 */
export function CashflowRefundWizard(_props: RegisteredWidgetProps): ReactNode {
  const entry = useRefundEntryBlock();
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const draft = useCashflowDraft();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const { options: paymentMethodOptions } = useCaissePaymentMethodOptions(auth);
  const refundMethodSelectData = useMemo(
    () => buildRefundWizardPaymentMethodSelectData(paymentMethodOptions),
    [paymentMethodOptions],
  );
  const hasPriorYearRefundPermission = envelope.permissions.permissionKeys.includes(
    PERMISSION_ACCOUNTING_PRIOR_YEAR_REFUND,
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [saleIdInput, setSaleIdInput] = useState('');
  const [loadedSale, setLoadedSale] = useState<LoadedSaleSummary | null>(null);
  const [reason, setReason] = useState<string>('RETOUR_ARTICLE');
  const [detail, setDetail] = useState('');
  const [refundPaymentMethod, setRefundPaymentMethod] = useState<SaleReversalRefundPaymentMethod>('cash');
  const [priorYearExpertGateOpen, setPriorYearExpertGateOpen] = useState(false);
  const [expertPriorYearRefundConfirmed, setExpertPriorYearRefundConfirmed] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [busy, setBusy] = useState(false);
  const [successReversal, setSuccessReversal] = useState<SaleReversalResponseV1 | null>(null);

  const [sessionBrowseId, setSessionBrowseId] = useState('');
  const sessionBrowseSeededRef = useRef(false);
  const [sessionCandidates, setSessionCandidates] = useState<readonly RefundSaleCandidateRow[]>([]);
  const [sessionFilterInput, setSessionFilterInput] = useState('');
  const [debouncedSessionFilter, setDebouncedSessionFilter] = useState('');
  const [sessionListLoading, setSessionListLoading] = useState(false);
  const [sessionListError, setSessionListError] = useState<CashflowSubmitSurfaceError | null>(null);
  /** Une clé par chargement de ticket (étape 2) — évite doubles remboursements si le serveur rejoue la même clé corps. */
  const saleReversalIdempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (sessionBrowseSeededRef.current) return;
    const sid = envelope.cashSessionId?.trim();
    if (sid) {
      setSessionBrowseId(sid);
      sessionBrowseSeededRef.current = true;
    }
  }, [envelope.cashSessionId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSessionFilter(sessionFilterInput.trim());
    }, SESSION_FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [sessionFilterInput]);

  const filteredSessionCandidates = useMemo(
    () => filterRefundSaleCandidates(sessionCandidates, debouncedSessionFilter),
    [sessionCandidates, debouncedSessionFilter],
  );

  const refundMethodLabel = useMemo(() => {
    const row = refundMethodSelectData.find((o) => o.value === refundPaymentMethod);
    return row?.label ?? refundPaymentMethod;
  }, [refundMethodSelectData, refundPaymentMethod]);

  const reasonLabel = useMemo(
    () => REASON_OPTIONS.find((o) => o.value === reason)?.label ?? reason,
    [reason],
  );

  const resetFlow = useCallback(() => {
    setStep(1);
    setSaleIdInput('');
    setLoadedSale(null);
    setReason('RETOUR_ARTICLE');
    setDetail('');
    setRefundPaymentMethod('cash');
    setPriorYearExpertGateOpen(false);
    setExpertPriorYearRefundConfirmed(false);
    setError(null);
    setSuccessReversal(null);
    setSessionCandidates([]);
    setSessionFilterInput('');
    setDebouncedSessionFilter('');
    setSessionListError(null);
    saleReversalIdempotencyKeyRef.current = null;
  }, []);

  if (entry.blocked) {
    return (
      <Alert color="orange" title={entry.title} data-testid="cashflow-refund-context-blocked">
        <Text size="sm">{entry.body}</Text>
      </Alert>
    );
  }

  const loadSaleByIdAndAdvance = async (rawId: string) => {
    const id = rawId.trim();
    if (!id) {
      setError({ kind: 'local', message: 'Saisissez ou choisissez l’identifiant du ticket source.' });
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await getSale(id, auth);
      if (!res.ok) {
        setError({
          kind: 'api',
          failure: recycliqueClientFailureFromSalesHttp(res),
        });
        setLoadedSale(null);
        return;
      }
      if (res.sale.lifecycle_status !== 'completed') {
        setError({
          kind: 'local',
          message:
            'Ce ticket n’est pas finalisé (statut « completed » attendu) — remboursement impossible depuis cet écran.',
        });
        setLoadedSale(null);
        return;
      }
      setPriorYearExpertGateOpen(false);
      setExpertPriorYearRefundConfirmed(false);
      setSaleIdInput(res.sale.id);
      setLoadedSale({
        id: res.sale.id,
        total_amount: res.sale.total_amount,
        lifecycle_status: res.sale.lifecycle_status,
        sale_date: res.sale.sale_date,
        note: res.sale.note ?? null,
        adherent_reference: res.sale.adherent_reference ?? null,
        payment_method: res.sale.payment_method ?? null,
      });
      saleReversalIdempotencyKeyRef.current = crypto.randomUUID();
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const onLoadSale = () => void loadSaleByIdAndAdvance(saleIdInput);

  const onLoadSessionSales = async () => {
    const sid = sessionBrowseId.trim();
    if (!isPlausibleCashSessionUuid(sid)) {
      setSessionListError({
        kind: 'local',
        message: 'Indiquez un UUID de session caisse complet (format 8-4-4-4-12).',
      });
      return;
    }
    setSessionListError(null);
    setSessionListLoading(true);
    setSessionCandidates([]);
    try {
      const res = await getCashSessionDetail(sid, auth);
      if (!res.ok) {
        setSessionListError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
        return;
      }
      const rows = parseRefundSaleCandidatesFromSessionDetail(res.session.sales);
      setSessionCandidates(rows);
      if (rows.length === 0) {
        setSessionListError({
          kind: 'local',
          message:
            'Aucune ligne « sales » exploitable dans la réponse (session vide ou agrégat sans détail). Saisissez l’UUID complet du ticket ou vérifiez les droits admin sur le détail session.',
        });
      } else {
        setSessionListError(null);
      }
    } finally {
      setSessionListLoading(false);
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
      const idem = saleReversalIdempotencyKeyRef.current?.trim() || crypto.randomUUID();
      saleReversalIdempotencyKeyRef.current = idem;
      const body = {
        source_sale_id: loadedSale.id,
        reason_code: reason as 'ERREUR_SAISIE' | 'RETOUR_ARTICLE' | 'ANNULATION_CLIENT' | 'AUTRE',
        detail: detail.trim() || undefined,
        refund_payment_method: refundPaymentMethod,
        idempotency_key: idem,
        ...(priorYearExpertGateOpen && expertPriorYearRefundConfirmed
          ? { expert_prior_year_refund: true as const }
          : {}),
      };
      const res = await postCreateSaleReversal(body, auth);
      if (!res.ok) {
        const failure = recycliqueClientFailureFromSalesHttp(res);
        if (failure.message.includes(PRIOR_YEAR_REFUND_REQUIRES_EXPERT)) {
          setPriorYearExpertGateOpen(true);
        }
        setError({ kind: 'api', failure });
        return;
      }
      const parsed = parseSaleReversalResponseJson(res.raw);
      setSuccessReversal(
        parsed ?? {
          id: res.reversalId,
          refund_payment_method: refundPaymentMethod,
        },
      );
    } finally {
      setBusy(false);
    }
  };

  if (successReversal) {
    const effectiveCode = (successReversal.refund_payment_method ?? refundPaymentMethod).trim();
    const effectiveRow = refundMethodSelectData.find((o) => o.value === effectiveCode);
    const effectiveLabel = effectiveRow?.label ?? effectiveCode;
    const srcPmRaw = successReversal.source_sale_payment_method ?? null;
    const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
    const showDistinctSourcePm =
      !!srcPmRaw && !!effectiveCode && norm(srcPmRaw) !== norm(effectiveCode);
    const amountAbs =
      successReversal.amount_signed !== undefined
        ? Math.abs(successReversal.amount_signed)
        : loadedSale
          ? Math.abs(loadedSale.total_amount)
          : null;
    const fiscalBranch = successReversal.fiscal_branch ?? null;
    const fiscalLine =
      fiscalBranch === 'current'
        ? `Branche fiscale : exercice courant${
            successReversal.sale_fiscal_year != null && successReversal.current_open_fiscal_year != null
              ? ` (vente ${successReversal.sale_fiscal_year} / ouvert ${successReversal.current_open_fiscal_year})`
              : ''
          }`
        : fiscalBranch === 'prior_closed'
          ? `Branche fiscale : exercice antérieur clos (N-1)${
              successReversal.sale_fiscal_year != null && successReversal.current_open_fiscal_year != null
                ? ` — vente ${successReversal.sale_fiscal_year}, ouvert ${successReversal.current_open_fiscal_year}`
                : ''
            }`
          : null;

    const pahekoHintFallback =
      'Le remboursement est enregistré en caisse ; l’écriture comptable Paheko correspondante est intégrée au snapshot de clôture de session, puis exportée via l’outbox — pas d’écriture Paheko immédiate au moment de l’enregistrement terrain.';
    const pahekoHintText = (successReversal.paheko_accounting_sync_hint ?? '').trim() || pahekoHintFallback;

    return (
      <div className={classes.step} data-testid="cashflow-refund-success">
        <CashflowOperationalSyncNotice auth={auth} />
        <Text fw={700} c="teal" data-testid="cashflow-refund-success-title">
          Remboursement enregistré
        </Text>
        <Text size="sm">
          L’avoir (reversal) a été accepté par le serveur Recyclique. Conservez la référence ci-dessous pour le suivi
          caisse ou comptable.
        </Text>
        {amountAbs !== null ? (
          <Text size="sm" data-testid="cashflow-refund-success-amount">
            <strong>Montant remboursé</strong> : {amountAbs.toFixed(2)} €
          </Text>
        ) : null}
        <Text size="sm" data-testid="cashflow-refund-success-effective-pm">
          <strong>Moyen effectif de remboursement</strong> (journal) : {effectiveLabel}
        </Text>
        {showDistinctSourcePm ? (
          <Text size="sm" c="dimmed">
            Moyen de paiement d’origine sur le ticket (information vente source) : <code>{srcPmRaw}</code>
          </Text>
        ) : null}
        {fiscalLine ? (
          <Text size="sm" data-testid="cashflow-refund-success-fiscal">
            {fiscalLine}
          </Text>
        ) : null}
        {successReversal.cash_session_id ? (
          <Text size="xs" c="dimmed">
            Session caisse (rapprochement) : <code>{successReversal.cash_session_id}</code>
          </Text>
        ) : null}
        <Alert color="gray" title="Comptabilité Paheko" mb="sm" data-testid="cashflow-refund-success-paheko-hint">
          <Text size="sm">{pahekoHintText}</Text>
        </Alert>
        <Text size="sm">
          Référence reversal : <code>{successReversal.id}</code>
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
            <Text size="sm">Les données du ticket ne sont plus à jour : rechargez le ticket avant de rembourser.</Text>
          </Alert>
        ) : null}
        <Text fw={700}>Quel ticket rembourser ?</Text>
        <Text size="sm" c="dimmed">
          Le montant remboursé est toujours le total du ticket encaissé (vous choisissez ensuite le moyen utilisé pour
          payer le client).
        </Text>
        <TextInput
          label="Identifiant du ticket"
          description="Identifiant complet figurant sur le reçu ou copié depuis un autre écran."
          value={saleIdInput}
          onChange={(e) => setSaleIdInput(e.currentTarget.value)}
          data-testid="cashflow-refund-sale-id-input"
        />
        <CashflowClientErrorAlert error={error} testId="cashflow-refund-error" />
        <Button loading={busy} onClick={onLoadSale} data-testid="cashflow-refund-load-sale" disabled={stale}>
          Charger le ticket
        </Button>

        <Alert color="gray" title="Ou parcourir les ventes de la session" data-testid="cashflow-refund-session-panel">
          <Stack gap="sm">
            <Text size="sm">
              Indiquez la session caisse en cours : la liste des ventes s’affiche si votre profil y a accès. Sinon,
              utilisez l’identifiant du ticket ci-dessus. Vous pouvez filtrer la liste (quelques secondes après la
              saisie).
            </Text>
            <TextInput
              label="Session caisse"
              value={sessionBrowseId}
              onChange={(e) => setSessionBrowseId(e.currentTarget.value)}
              data-testid="cashflow-refund-session-id-input"
            />
            <Button
              variant="light"
              loading={sessionListLoading}
              onClick={() => void onLoadSessionSales()}
              disabled={stale}
              data-testid="cashflow-refund-session-load"
            >
              Charger les ventes de la session
            </Button>
            <CashflowClientErrorAlert error={sessionListError} testId="cashflow-refund-session-error" />
            {sessionCandidates.length > 0 ? (
              <>
                <TextInput
                  label="Filtrer la liste"
                  placeholder="Préfixe UUID, note, adhérent, montant…"
                  value={sessionFilterInput}
                  onChange={(e) => setSessionFilterInput(e.currentTarget.value)}
                  data-testid="cashflow-refund-session-filter"
                />
                <Text size="xs" c="dimmed">
                  Le filtre s’applique automatiquement après une courte pause lors de la saisie.
                </Text>
                <ScrollArea h={220} type="auto" offsetScrollbars>
                  <Table striped highlightOnHover withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Ticket</Table.Th>
                        <Table.Th>Montant</Table.Th>
                        <Table.Th>Statut</Table.Th>
                        <Table.Th />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredSessionCandidates.map((row) => (
                        <Table.Tr key={row.id} data-testid={`cashflow-refund-session-row-${row.id}`}>
                          <Table.Td>
                            <Text size="xs" ff="monospace">
                              {row.id}
                            </Text>
                          </Table.Td>
                          <Table.Td>{Number(row.total_amount).toFixed(2)} €</Table.Td>
                          <Table.Td>
                            <Text size="xs">{row.lifecycle_status}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Button
                              size="xs"
                              variant="filled"
                              loading={busy}
                              disabled={stale}
                              onClick={() => void loadSaleByIdAndAdvance(row.id)}
                              data-testid={`cashflow-refund-session-pick-${row.id}`}
                            >
                              Choisir
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
                {filteredSessionCandidates.length === 0 ? (
                  <Text size="sm" c="dimmed" data-testid="cashflow-refund-session-filter-empty">
                    Aucun ticket ne correspond au filtre.
                  </Text>
                ) : null}
              </>
            ) : null}
          </Stack>
        </Alert>
      </div>
    );
  }

  return (
    <div className={classes.step} data-testid="cashflow-refund-step-confirm">
      <CashflowOperationalSyncNotice auth={auth} />
      {stale ? (
        <Alert color="orange" title="Données périmées" mb="sm" data-testid="cashflow-refund-stale">
          <Text size="sm">Données périmées : rechargez le ticket avant de confirmer le remboursement.</Text>
        </Alert>
      ) : null}
      <Text fw={700}>Confirmer le remboursement</Text>
      <Alert color="gray" title="Récapitulatif avant envoi" data-testid="cashflow-refund-recap">
        <Stack gap="xs">
          <Text size="sm">
            <strong>Vente source</strong> : <code>{loadedSale?.id}</code>
            {loadedSale?.lifecycle_status ? (
              <>
                {' '}
                (statut <code>{loadedSale.lifecycle_status}</code>)
              </>
            ) : null}
          </Text>
          <Text size="sm">
            <strong>Montant remboursé</strong> (imposé par le serveur sur le ticket) :{' '}
            <strong>{loadedSale ? Number(loadedSale.total_amount).toFixed(2) : '—'} €</strong>
          </Text>
          {loadedSale?.payment_method ? (
            <Text size="sm">
              <strong>Moyen de paiement d’origine</strong> (information ticket) :{' '}
              <code>{loadedSale.payment_method}</code>
            </Text>
          ) : null}
          {loadedSale?.adherent_reference ? (
            <Text size="sm">
              <strong>Réf. adhérent</strong> : {loadedSale.adherent_reference}
            </Text>
          ) : null}
          {loadedSale?.note ? (
            <Text size="sm">
              <strong>Note ticket</strong> : {loadedSale.note}
            </Text>
          ) : null}
          <Text size="sm">
            <strong>Moyen pour payer le client</strong> : {refundMethodLabel}
          </Text>
          <Text size="sm">
            <strong>Motif prévu</strong> : {reasonLabel}
            {detail.trim() ? (
              <>
                {' '}
                — <em>{detail.trim()}</em>
              </>
            ) : null}
          </Text>
        </Stack>
      </Alert>
      <NativeSelect
        label="Moyen pour payer le client"
        description="Espèces, carte ou chèque selon ce que vous versez au client."
        data={refundMethodSelectData}
        value={refundPaymentMethod}
        onChange={(e) => setRefundPaymentMethod(e.currentTarget.value as SaleReversalRefundPaymentMethod)}
        data-testid="cashflow-refund-payment-method"
      />
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
      {priorYearExpertGateOpen ? (
        <Alert
          color="yellow"
          title="Remboursement sur exercice antérieur clos"
          mb="sm"
          data-testid="cashflow-refund-prior-year-panel"
        >
          <Text size="sm" mb="xs">
            Ce ticket concerne un exercice antérieur déjà clos : un habillage « expert » est requis côté serveur.
            Cochez la case ci-dessous si vous avez l’habilitation comptable, puis confirmez à nouveau.
          </Text>
          {!hasPriorYearRefundPermission ? (
            <Text size="sm" c="orange" mb="xs">
              Votre enveloppe ne contient pas « accounting.prior_year_refund » : sans droit supplémentaire le
              serveur répondra en 403.
            </Text>
          ) : null}
          <Checkbox
            checked={expertPriorYearRefundConfirmed}
            onChange={(e) => setExpertPriorYearRefundConfirmed(e.currentTarget.checked)}
            label="Je confirme le parcours expert (remboursement N-1 / exercice clos)"
            data-testid="cashflow-refund-expert-prior-year"
          />
        </Alert>
      ) : null}
      <CashflowClientErrorAlert error={error} testId="cashflow-refund-error" />
      <Button
        variant="default"
        onClick={() => {
          setStep(1);
          setPriorYearExpertGateOpen(false);
          setExpertPriorYearRefundConfirmed(false);
        }}
        disabled={busy}
        data-testid="cashflow-refund-back"
      >
        Retour
      </Button>
      <Button
        color="orange"
        loading={busy}
        onClick={() => void onConfirmReversal()}
        data-testid="cashflow-refund-confirm-submit"
        disabled={stale}
      >
        Valider le remboursement
      </Button>
    </div>
  );
}
