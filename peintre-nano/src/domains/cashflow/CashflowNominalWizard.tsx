import { Alert, Button, Group, Loader, NumberInput, SimpleGrid, Text, TextInput } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type RecycliqueClientFailure, recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import {
  fetchCategoriesList,
  type CategoryListItem,
} from '../../api/dashboard-legacy-stats-client';
import {
  getHeldSalesForSession,
  getSale,
  isPlausibleCashSessionUuid,
  postAbandonHeldSale,
  postCreateSale,
  postFinalizeHeldSale,
  postHoldSale,
} from '../../api/sales-client';
import {
  PERMISSION_CASHFLOW_DEFERRED,
  PERMISSION_CASHFLOW_NOMINAL,
  PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT,
  PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT,
  PERMISSION_CASHFLOW_VIRTUAL,
} from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { FlowRenderer } from '../../flows/FlowRenderer';
import {
  addTicketLine,
  applyServerHeldSaleToDraft,
  bumpHeldTicketsListRefresh,
  clearCashflowDraftSubmitError,
  getCashflowDraftSnapshot,
  linesSubtotal,
  setAfterSuccessfulHold,
  setAfterSuccessfulSale,
  setCashflowDraftApiSubmitError,
  setCashflowDraftLocalSubmitError,
  setCashflowWidgetDataState,
  setCashSessionIdInput,
  setPaymentMethod,
  setTotalAmount,
  useCashflowDraft,
} from './cashflow-draft-store';
import { useCaisseServerCurrentSession } from './use-caisse-server-current-session';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import { CashflowSocialDonWizard } from './CashflowSocialDonWizard';
import { makeCashflowSpecialEncaissementWizard } from './CashflowSpecialEncaissementWizard';
import { CashflowOperationalSyncNotice } from './cashflow-operational-sync-notice';
import classes from './CashflowNominalWizard.module.css';

const CashflowSpecialDonWizard = makeCashflowSpecialEncaissementWizard('DON_SANS_ARTICLE');
const CashflowSpecialAdhesionWizard = makeCashflowSpecialEncaissementWizard('ADHESION_ASSOCIATION');

type SpecialEncaissementVariant = 'DON_SANS_ARTICLE' | 'ADHESION_ASSOCIATION';

function SpecialEncaissementsPanel(): ReactNode {
  const envelope = useContextEnvelope();
  const [variant, setVariant] = useState<SpecialEncaissementVariant | null>(null);
  const allowed = envelope.permissions.permissionKeys.includes(PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT);

  if (!allowed) {
    return (
      <div className={classes.specialPanel} data-testid="cashflow-special-encaissements-panel-no-perm">
        <Text size="sm" c="dimmed">
          Les encaissements « Don (sans article) » et « Adhésion / cotisation » nécessitent la permission{' '}
          <code>caisse.special_encaissement</code> (émise par le serveur).
        </Text>
      </div>
    );
  }

  return (
    <div className={classes.specialPanel} data-testid="cashflow-special-encaissements-panel">
      <Text size="sm" fw={600} mb="xs">
        Encaissements spécifiques
      </Text>
      {variant === null ? (
        <div className={classes.specialActions}>
          <Button
            size="sm"
            variant="light"
            onClick={() => setVariant('DON_SANS_ARTICLE')}
            data-testid="cashflow-open-special-don"
          >
            Don (sans article)
          </Button>
          <Button
            size="sm"
            variant="light"
            onClick={() => setVariant('ADHESION_ASSOCIATION')}
            data-testid="cashflow-open-special-adhesion"
          >
            Adhésion / cotisation
          </Button>
        </div>
      ) : (
        <>
          <Button
            size="xs"
            variant="subtle"
            mb="sm"
            onClick={() => setVariant(null)}
            data-testid="cashflow-close-special-variant"
          >
            Fermer — retour au parcours nominal
          </Button>
          {variant === 'DON_SANS_ARTICLE' ? (
            <CashflowSpecialDonWizard widgetProps={{}} />
          ) : (
            <CashflowSpecialAdhesionWizard widgetProps={{}} />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Story 6.6 — actions sociales (lot 1) dans le même workspace que le nominal brownfield (`/caisse`),
 * distinct des encaissements spéciaux 6.5 (`special_encaissement_kind`).
 */
function SocialEncaissementPanel(): ReactNode {
  const envelope = useContextEnvelope();
  const [open, setOpen] = useState(false);
  const allowed = envelope.permissions.permissionKeys.includes(PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT);

  if (!allowed) {
    return (
      <div className={classes.socialPanel} data-testid="cashflow-social-encaissements-panel-no-perm">
        <Text size="sm" c="dimmed">
          L’entrée « Don » (actions sociales) nécessite la permission{' '}
          <code>caisse.social_encaissement</code> (émise par le serveur).
        </Text>
      </div>
    );
  }

  return (
    <div className={classes.socialPanel} data-testid="cashflow-social-encaissements-panel">
      <Text size="sm" fw={600} mb="xs">
        Actions sociales
      </Text>
      {!open ? (
        <Button
          size="sm"
          variant="light"
          color="teal"
          onClick={() => setOpen(true)}
          data-testid="cashflow-open-social-don"
        >
          Don
        </Button>
      ) : (
        <>
          <Button
            size="xs"
            variant="subtle"
            mb="sm"
            onClick={() => setOpen(false)}
            data-testid="cashflow-close-social-don-panel"
          >
            Fermer — retour au parcours nominal
          </Button>
          <CashflowSocialDonWizard widgetProps={{}} />
        </>
      )}
    </div>
  );
}

type EntryBlock =
  | { readonly blocked: false }
  | { readonly blocked: true; readonly title: string; readonly body: string };

function hasAnyCashModePermission(permissionKeys: readonly string[]): boolean {
  return [PERMISSION_CASHFLOW_NOMINAL, PERMISSION_CASHFLOW_VIRTUAL, PERMISSION_CASHFLOW_DEFERRED].some((key) =>
    permissionKeys.includes(key),
  );
}

/**
 * Garde d’entrée Story 6.2 : uniquement à partir de l’enveloppe / permissions serveur (pas d’heuristique locale).
 */
function useCashflowEntryBlock(): EntryBlock {
  const envelope = useContextEnvelope();
  return useMemo((): EntryBlock => {
    if (envelope.runtimeStatus === 'forbidden') {
      return {
        blocked: true,
        title: 'Contexte bloqué',
        body:
          envelope.restrictionMessage?.trim() ||
          'Accès caisse refusé par le serveur (enveloppe runtime « forbidden »).',
      };
    }
    if (envelope.runtimeStatus === 'degraded') {
      return {
        blocked: true,
        title: 'Contexte restreint',
        body:
          envelope.restrictionMessage?.trim() ||
          'Contexte dégradé — rafraîchir le contexte ou corriger l’affectation avant de caisser.',
      };
    }
    if (!envelope.siteId?.trim()) {
      return {
        blocked: true,
        title: 'Site actif non résolu',
        body:
          'L’enveloppe de contexte ne fournit pas de site : le parcours nominal ne peut pas continuer tant que le serveur n’expose pas un site.',
      };
    }
    if (!hasAnyCashModePermission(envelope.permissions.permissionKeys)) {
      return {
        blocked: true,
        title: 'Permission caisse absente',
        body:
          `Les permissions effectives du serveur ne contiennent aucune clé d’entrée caisse parmi ` +
          `« ${PERMISSION_CASHFLOW_NOMINAL} », « ${PERMISSION_CASHFLOW_VIRTUAL} », ` +
          `« ${PERMISSION_CASHFLOW_DEFERRED} ».`,
      };
    }
    return { blocked: false };
  }, [envelope]);
}

/**
 * Session utilisée pour lister les tickets « held » : priorité à l’enveloppe (vérité serveur),
 * sinon saisie brouillon **uniquement** si UUID complet — évite une rafale de GET /held en 400 pendant la frappe.
 */
function resolveCashSessionIdForHeldList(envelopeCashSessionId: string | null | undefined, draftInput: string): string {
  const fromEnv = (envelopeCashSessionId ?? '').trim();
  if (fromEnv.length > 0) {
    return fromEnv;
  }
  const fromDraft = draftInput.trim();
  return isPlausibleCashSessionUuid(fromDraft) ? fromDraft : '';
}

function shortRef(id: string): string {
  const t = id.trim();
  if (t.length <= 10) return t;
  return `${t.slice(0, 8)}…`;
}

function HeldTicketsPanel({ kioskSurface }: { readonly kioskSurface: boolean }): ReactNode {
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const draft = useCashflowDraft();
  const [held, setHeld] = useState<Array<{ id: string; total_amount: number }>>([]);
  const [heldFailure, setHeldFailure] = useState<RecycliqueClientFailure | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sessionId = resolveCashSessionIdForHeldList(envelope.cashSessionId, draft.cashSessionIdInput);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setHeld([]);
      setHeldFailure(null);
      return;
    }
    const r = await getHeldSalesForSession(sessionId, auth, 20);
    if (!r.ok) {
      setHeldFailure(recycliqueClientFailureFromSalesHttp(r));
      setHeld([]);
      return;
    }
    setHeldFailure(null);
    setHeld(r.sales.map((s) => ({ id: s.id, total_amount: s.total_amount })));
  }, [sessionId, auth]);

  useEffect(() => {
    void refresh();
  }, [refresh, draft.heldTicketsRefreshToken]);

  const onResume = async (id: string) => {
    setBusyId(id);
    clearCashflowDraftSubmitError();
    try {
      const res = await getSale(id, auth);
      if (!res.ok) {
        setCashflowDraftApiSubmitError(recycliqueClientFailureFromSalesHttp(res));
        return;
      }
      if (res.sale.lifecycle_status !== 'held') {
        setCashflowDraftLocalSubmitError('Ce ticket n’est plus en attente côté serveur.');
        return;
      }
      applyServerHeldSaleToDraft({
        id: res.sale.id,
        total_amount: res.sale.total_amount,
        items: res.sale.items.map((it) => ({
          id: it.id,
          category: it.category,
          quantity: it.quantity,
          weight: it.weight,
          unit_price: it.unit_price,
          total_price: it.total_price,
        })),
      });
    } finally {
      setBusyId(null);
    }
  };

  const onAbandon = async (id: string) => {
    setBusyId(id);
    clearCashflowDraftSubmitError();
    try {
      const r = await postAbandonHeldSale(id, auth);
      if (!r.ok) {
        setCashflowDraftApiSubmitError(recycliqueClientFailureFromSalesHttp(r));
        return;
      }
      bumpHeldTicketsListRefresh();
    } finally {
      setBusyId(null);
    }
  };

  if (!sessionId) {
    return (
      <Text size="sm" c="dimmed" mb="sm" data-testid="cashflow-held-panel-no-session">
        {kioskSurface ? 'Session caisse requise pour les tickets en attente.' : 'Indiquez une session caisse (enveloppe ou champ) pour lister les tickets en attente.'}
      </Text>
    );
  }

  return (
    <div className={classes.heldPanel} data-testid="cashflow-held-tickets-panel">
      <Text size="sm" fw={600} mb="xs">
        {kioskSurface ? (
          'Tickets en attente'
        ) : (
          <>
            Tickets en attente (GET <code>recyclique_sales_listHeldSalesForSession</code>)
          </>
        )}
      </Text>
      <CashflowClientErrorAlert
        error={heldFailure ? { kind: 'api', failure: heldFailure } : null}
        testId="cashflow-held-list-error"
      />
      {held.length === 0 && !heldFailure ? (
        <Text size="sm" c="dimmed" mb="sm">
          Aucun ticket en attente pour cette session.
        </Text>
      ) : (
        <ul className={classes.heldList}>
          {held.map((h) => (
            <li key={h.id} className={classes.heldRow}>
              <Text size="sm" span data-held-sale-id={h.id}>
                {kioskSurface ? (
                  <>
                    {Number(h.total_amount).toFixed(2)} € · réf. {shortRef(h.id)}
                  </>
                ) : (
                  <>
                    {h.id.slice(0, 8)}… — {Number(h.total_amount).toFixed(2)} €
                  </>
                )}
              </Text>
              <Button
                size="xs"
                variant="light"
                ml="sm"
                loading={busyId === h.id}
                onClick={() => void onResume(h.id)}
                data-testid={`cashflow-resume-held-${h.id}`}
              >
                Reprendre
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                ml={4}
                loading={busyId === h.id}
                onClick={() => void onAbandon(h.id)}
                data-testid={`cashflow-abandon-held-${h.id}`}
              >
                Abandonner
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button size="xs" variant="default" onClick={() => void refresh()} data-testid="cashflow-refresh-held">
        {kioskSurface ? 'Actualiser' : 'Rafraîchir la liste'}
      </Button>
    </div>
  );
}

/**
 * Story 13.8 — intention parcours catégorie → ligne (GET `/v1/categories/` reviewable, même client que stats legacy).
 */
function KioskCategoryWorkspace({
  onPickCategoryCode,
}: {
  readonly onPickCategoryCode: (categoryCode: string) => void;
}): ReactNode {
  const auth = useAuthPort();
  const [rows, setRows] = useState<CategoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFetchErr(null);
      try {
        const list = await fetchCategoriesList(auth);
        if (!cancelled) setRows(list.filter((c) => c.is_active));
      } catch (e) {
        if (!cancelled) setFetchErr(e instanceof Error ? e.message : 'Chargement des catégories impossible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const sortByDisplayOrder = useCallback((list: CategoryListItem[]) => [...list].sort((a, b) => a.display_order - b.display_order), []);

  const roots = useMemo(
    () => sortByDisplayOrder(rows.filter((c) => c.parent_id == null || c.parent_id === '')),
    [rows, sortByDisplayOrder],
  );

  const children = useMemo(
    () => (parentId ? sortByDisplayOrder(rows.filter((c) => c.parent_id === parentId)) : []),
    [rows, parentId, sortByDisplayOrder],
  );

  const rowHasChildren = useCallback((id: string) => rows.some((r) => r.parent_id === id), [rows]);

  if (loading) {
    return (
      <Group gap="sm" mb="md" data-testid="cashflow-kiosk-category-loading">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Chargement des catégories…
        </Text>
      </Group>
    );
  }

  if (fetchErr) {
    return (
      <Alert color="orange" mb="md" title="Catégories" data-testid="cashflow-kiosk-category-error">
        {fetchErr}
      </Alert>
    );
  }

  const showList = parentId ? children : roots;

  return (
    <div className={classes.kioskCategorySection} data-testid="cashflow-kiosk-category-grid">
      {parentId ? (
        <Button
          variant="subtle"
          size="xs"
          mb="sm"
          onClick={() => setParentId(null)}
          data-testid="cashflow-kiosk-category-back"
        >
          ← Catégories
        </Button>
      ) : null}
      <Text size="sm" fw={600} mb="xs">
        {parentId ? 'Sous-catégories' : 'Catégories'}
      </Text>
      {showList.length === 0 ? (
        <Text size="sm" c="dimmed" mb="md" data-testid="cashflow-kiosk-category-empty">
          Aucune catégorie renvoyée par le serveur pour cette session.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm" className={classes.kioskCategoryGrid} mb="md">
          {showList.map((c) => (
            <button
              key={c.id}
              type="button"
              className={classes.kioskCategoryButton}
              data-testid={`cashflow-kiosk-category-${c.id}`}
              onClick={() => {
                if (!parentId && rowHasChildren(c.id)) {
                  setParentId(c.id);
                  return;
                }
                onPickCategoryCode(c.id);
              }}
            >
              <span>{c.name}</span>
              {/*
               * Raccourcis clavier (blueprint T4 / P1) : n'afficher l'indice que lorsque le handler
               * AZERTY sera branché — évite une équivalence utilisateur trompeuse (revue 13.8).
               */}
            </button>
          ))}
        </SimpleGrid>
      )}
    </div>
  );
}

function LinesStep({
  kioskCategoryWorkspace,
  kioskSurface,
}: {
  readonly kioskCategoryWorkspace: boolean;
  readonly kioskSurface: boolean;
}): ReactNode {
  const draft = useCashflowDraft();
  const auth = useAuthPort();
  const [category, setCategory] = useState('EEE-1');
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState(1);
  const [unitPrice, setUnitPrice] = useState(5);
  const [holdBusy, setHoldBusy] = useState(false);

  const onAdd = () => {
    const totalPrice = unitPrice * quantity;
    addTicketLine({
      category: category.trim() || 'EEE-1',
      quantity,
      weight,
      unitPrice,
      totalPrice,
    });
    setTotalAmount(linesSubtotal(getCashflowDraftSnapshot().lines));
  };

  const onHold = async () => {
    const sid = draft.cashSessionIdInput.trim();
    if (!sid || draft.lines.length === 0) return;
    clearCashflowDraftSubmitError();
    setHoldBusy(true);
    try {
      const sub = linesSubtotal(draft.lines);
      const total = draft.totalAmount > 0 ? draft.totalAmount : sub;
      const res = await postHoldSale(
        {
          cash_session_id: sid,
          items: draft.lines.map((l) => ({
            category: l.category,
            quantity: l.quantity,
            weight: l.weight,
            unit_price: l.unitPrice,
            total_price: l.totalPrice,
          })),
          total_amount: total,
        },
        auth,
      );
      if (!res.ok) {
        setCashflowDraftApiSubmitError(recycliqueClientFailureFromSalesHttp(res));
        return;
      }
      setAfterSuccessfulHold();
    } finally {
      setHoldBusy(false);
    }
  };

  return (
    <div className={`${classes.step}${kioskCategoryWorkspace ? ` ${classes.stepKiosk}` : ''}`}>
      {kioskCategoryWorkspace ? (
        <KioskCategoryWorkspace
          onPickCategoryCode={(code) => {
            setCategory(code);
          }}
        />
      ) : null}
      <HeldTicketsPanel kioskSurface={kioskSurface} />
      <Text size="sm" mb="md">
        {kioskCategoryWorkspace
          ? 'Sélectionnez une catégorie ci-dessus, ajustez quantité / poids / prix puis ajoutez la ligne.'
          : 'Saisie ou scan (code catégorie) : les montants effectifs suivent la réponse API au moment du POST.'}
      </Text>
      <TextInput
        label={kioskCategoryWorkspace ? 'Code catégorie (grille ou saisie)' : 'Catégorie / code'}
        value={category}
        onChange={(e) => setCategory(e.currentTarget.value)}
        data-testid="cashflow-input-category"
      />
      <NumberInput label="Quantité" min={1} value={quantity} onChange={(v) => setQuantity(Number(v) || 1)} mt="sm" />
      <NumberInput
        label="Poids (kg)"
        min={0.01}
        step={0.1}
        value={weight}
        onChange={(v) => setWeight(Number(v) || 0)}
        mt="sm"
        data-testid="cashflow-input-weight"
      />
      <NumberInput label="Prix unitaire / ligne (€)" min={0} value={unitPrice} onChange={(v) => setUnitPrice(Number(v) || 0)} mt="sm" />
      <Button mt="md" onClick={onAdd} data-testid="cashflow-add-line">
        Ajouter la ligne
      </Button>
      <Text size="sm" mt="md" data-testid="cashflow-lines-count">
        Lignes : {draft.lines.length}
      </Text>
      <Button
        mt="md"
        variant="light"
        color="violet"
        onClick={() => void onHold()}
        disabled={draft.lines.length === 0 || !draft.cashSessionIdInput.trim() || holdBusy}
        loading={holdBusy}
        data-testid="cashflow-put-on-hold"
      >
        {kioskSurface ? 'Mettre en attente' : 'Mettre en attente (POST recyclique_sales_createHeldSale)'}
      </Button>
    </div>
  );
}

function TotalStep(): ReactNode {
  const draft = useCashflowDraft();
  const sub = useMemo(() => linesSubtotal(draft.lines), [draft.lines]);

  useEffect(() => {
    if (draft.totalAmount === 0 && sub > 0) {
      setTotalAmount(sub);
    }
  }, [draft.totalAmount, sub]);

  return (
    <div className={classes.step}>
      <Text size="sm" mb="md">
        Total de la vente (doit couvrir le sous-total des lignes — validé serveur).
      </Text>
      <NumberInput
        label="Total (€)"
        min={0}
        value={draft.totalAmount}
        onChange={(v) => setTotalAmount(Number(v) || 0)}
        data-testid="cashflow-input-total"
      />
      <Text size="sm" mt="sm" c="dimmed">
        Sous-total lignes : {sub.toFixed(2)} €
      </Text>
    </div>
  );
}

function PaymentStep({ kioskSurface }: { readonly kioskSurface: boolean }): ReactNode {
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
    <div className={classes.step}>
      {!kioskSurface ? (
        <Text size="sm" mb="md">
          Choix du paiement — bloqué si le widget ticket critique est en DATA_STALE.
          {draft.activeHeldSaleId
            ? ' Reprise : finalisation via recyclique_sales_finalizeHeldSale (même garde-fou stale).'
            : ''}
        </Text>
      ) : (
        <Text size="sm" mb="md">
          {draft.activeHeldSaleId
            ? 'Finalisez le ticket repris après vérification du montant à droite.'
            : 'Choisissez le mode de paiement puis validez la vente.'}
        </Text>
      )}
      <TextInput
        label={kioskSurface ? 'Session caisse' : 'UUID session caisse (ContextEnvelope ou collage terrain)'}
        value={draft.cashSessionIdInput}
        onChange={(e) => setCashSessionIdInput(e.currentTarget.value)}
        data-testid="cashflow-input-session-id"
      />
      <Text component="label" size="sm" fw={500} mt="sm" display="block">
        Paiement
        <select
          className={classes.nativeSelect}
          data-testid="cashflow-select-payment"
          value={draft.paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value === 'card' ? 'card' : 'cash')}
        >
          <option value="cash">Espèces</option>
          <option value="card">Carte</option>
        </select>
      </Text>
      {!kioskSurface ? (
        <>
          <Button
            mt="md"
            variant="light"
            color="orange"
            onClick={() => setCashflowWidgetDataState('DATA_STALE')}
            data-testid="cashflow-trigger-stale"
          >
            Marquer données périmées (DATA_STALE) — test / démo
          </Button>
          <Button mt="xs" variant="subtle" onClick={() => setCashflowWidgetDataState('NOMINAL')}>
            Repasser en NOMINAL
          </Button>
        </>
      ) : null}
      <CashflowClientErrorAlert error={draft.submitError} />
      <Button
        mt="lg"
        onClick={() => void onSubmit()}
        disabled={!canSubmit || busy}
        loading={busy}
        data-testid="cashflow-submit-sale"
      >
        {draft.activeHeldSaleId
          ? kioskSurface
            ? 'Valider le ticket'
            : 'Finaliser le ticket en attente (POST …/finalize-held)'
          : kioskSurface
            ? 'Enregistrer la vente'
            : 'Enregistrer la vente (POST /v1/sales/)'}
      </Button>
    </div>
  );
}

function TicketStep({ kioskSurface }: { readonly kioskSurface: boolean }): ReactNode {
  const draft = useCashflowDraft();
  return (
    <div className={classes.step}>
      <Text size="sm">
        {kioskSurface
          ? 'Le récapitulatif et la référence de vente figurent dans le panneau de droite. Revenez aux lignes pour un nouveau ticket.'
          : 'Après enregistrement, le message de statut apparaît dans le panneau ticket (aside). Vous pouvez revenir aux lignes pour un nouveau ticket.'}
      </Text>
      <Text
        mt="md"
        fw={draft.lastSaleId ? 600 : undefined}
        c={draft.lastSaleId ? undefined : 'dimmed'}
        data-testid="cashflow-ticket-sale-id"
        data-sale-id={draft.lastSaleId ?? ''}
      >
        {draft.lastSaleId
          ? kioskSurface
            ? `Réf. vente : ${shortRef(draft.lastSaleId)}`
            : `Réf. vente : ${draft.lastSaleId}`
          : 'Aucune vente finalisée sur cette session d’écran.'}
      </Text>
    </div>
  );
}

/**
 * Parcours nominal caisse v2 — FlowRenderer + appels API (`recyclique_sales_createSale`).
 */
export function CashflowNominalWizard(props: RegisteredWidgetProps): ReactNode {
  const saleKioskCategoryWorkspace = props.widgetProps?.sale_kiosk_category_workspace === true;
  /** Surface vente kiosque unifiée (alias `/cash-register/sale` + grille catégories) : chrome métier, sans panneaux techniques. */
  const kioskSaleSurface = saleKioskCategoryWorkspace;
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const draft = useCashflowDraft();
  const entry = useCashflowEntryBlock();
  const { session: serverSession } = useCaisseServerCurrentSession(auth);
  const [activeIndex, setActiveIndex] = useState(0);

  /** Recolle le brouillon au GET courant (comme /caisse/cloture) si l’enveloppe n’expose pas encore `cashSessionId`. */
  useEffect(() => {
    if (entry.blocked) return;
    const envId = envelope.cashSessionId?.trim();
    if (envId) return;
    if (draft.cashSessionIdInput.trim()) return;
    const sid = serverSession?.id?.trim();
    if (!sid) return;
    setCashSessionIdInput(sid);
  }, [entry.blocked, envelope.cashSessionId, draft.cashSessionIdInput, serverSession?.id]);

  const panels = useMemo(
    () => [
      {
        id: 'lines',
        title: 'Lignes',
        content: (
          <LinesStep kioskCategoryWorkspace={saleKioskCategoryWorkspace} kioskSurface={kioskSaleSurface} />
        ),
      },
      { id: 'total', title: 'Total', content: <TotalStep /> },
      { id: 'pay', title: 'Paiement', content: <PaymentStep kioskSurface={kioskSaleSurface} /> },
      { id: 'ticket', title: 'Ticket', content: <TicketStep kioskSurface={kioskSaleSurface} /> },
    ],
    [saleKioskCategoryWorkspace, kioskSaleSurface],
  );

  const onNext = useCallback(() => {
    setActiveIndex((i) => Math.min(i + 1, panels.length - 1));
  }, [panels.length]);

  const onPrev = useCallback(() => {
    setActiveIndex((i) => Math.max(i - 1, 0));
  }, []);

  if (entry.blocked) {
    return (
      <div
        id="caisse-sale-workspace"
        className={`${classes.root}${saleKioskCategoryWorkspace ? ` ${classes.rootKiosk}` : ''}`}
        data-testid="cashflow-nominal-wizard"
      >
        <Alert color="red" title={entry.title} data-testid="cashflow-context-blocked">
          {entry.body}
        </Alert>
      </div>
    );
  }

  return (
    <div
      id="caisse-sale-workspace"
      className={`${classes.root}${saleKioskCategoryWorkspace ? ` ${classes.rootKiosk}` : ''}`}
      data-testid="cashflow-nominal-wizard"
    >
      {!kioskSaleSurface ? <CashflowOperationalSyncNotice auth={auth} /> : null}
      {draft.operatingMode === 'virtual' ? (
        kioskSaleSurface ? (
          <Text size="sm" c="dimmed" mb="sm" data-testid="cashflow-operating-mode-virtual-banner">
            Mode simulation (formation / tests).
          </Text>
        ) : (
          <Alert color="teal" title="Mode simulation (virtuel)" mb="sm" data-testid="cashflow-operating-mode-virtual-banner">
            Session ouverte depuis « Mode virtuel » sur le tableau de poste : même cadre API et permissions qu’une caisse
            réelle ; distinguez bien l’usage terrain (formation, tests).
          </Alert>
        )
      ) : null}
      {draft.operatingMode === 'deferred' ? (
        kioskSaleSurface ? (
          <Text size="sm" c="dimmed" mb="sm" data-testid="cashflow-operating-mode-deferred-banner">
            Saisie différée (date d’ouverture réelle).
          </Text>
        ) : (
          <Alert color="blue" title="Saisie différée" mb="sm" data-testid="cashflow-operating-mode-deferred-banner">
            Session ouverte avec une date / heure réelle d’ouverture (permission <code>caisse.deferred.access</code>).
          </Alert>
        )
      ) : null}
      {!kioskSaleSurface ? <SocialEncaissementPanel /> : null}
      {!kioskSaleSurface ? <SpecialEncaissementsPanel /> : null}
      <FlowRenderer
        flowId="cashflow-nominal"
        panels={panels}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        keepMounted
      />
      <div className={classes.navRow}>
        <Button variant="default" onClick={onPrev} disabled={activeIndex === 0} data-testid="cashflow-step-prev">
          Précédent
        </Button>
        <Button onClick={onNext} disabled={activeIndex >= panels.length - 1} data-testid="cashflow-step-next">
          Suivant
        </Button>
      </div>
    </div>
  );
}
