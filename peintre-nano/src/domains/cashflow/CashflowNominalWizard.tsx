import { Alert, Badge, Button, Group, Loader, NumberInput, SimpleGrid, Text, TextInput } from '@mantine/core';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { type RecycliqueClientFailure, recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import {
  fetchCategoriesList,
  type CategoryListItem,
} from '../../api/dashboard-legacy-stats-client';
import type { CashSessionCurrentV1 } from '../../api/cash-session-client';
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
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { CONTEXT_ACTIVE_SITE_DISPLAY_NAME_KEY } from '../../runtime/context-presentation-keys';
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
  type CashflowOperatingMode,
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

function kioskOperatingLabel(mode: CashflowOperatingMode | null): string {
  if (mode === 'virtual') return 'Mode simulation';
  if (mode === 'deferred') return 'Saisie différée';
  if (mode === 'real') return 'Caisse réelle';
  return 'Mode automatique';
}

type KioskLineMicroPhase = 'browse' | 'weight' | 'price';

function KioskLineMicroRail({
  microPhase,
  browseParentId,
  usedSubcategoryDrill,
  ticketLineCount,
  onGoBrowse,
  onGoWeight,
  onGoPrice,
}: {
  readonly microPhase: KioskLineMicroPhase;
  readonly browseParentId: string | null;
  readonly usedSubcategoryDrill: boolean;
  /** >0 : depuis la grille on peut rouvrir l’étape prix (ticket, mise en attente) sans repasser par le poids. */
  readonly ticketLineCount: number;
  readonly onGoBrowse: () => void;
  readonly onGoWeight: () => void;
  readonly onGoPrice: () => void;
}): ReactNode {
  const inBrowseRoots = microPhase === 'browse' && browseParentId == null;
  const inBrowseSubs = microPhase === 'browse' && browseParentId != null;
  const pastBrowse = microPhase === 'weight' || microPhase === 'price';
  const subSkipped = pastBrowse && !usedSubcategoryDrill;

  const catActive = inBrowseRoots;
  const catDone = inBrowseSubs || pastBrowse;

  const subActive = inBrowseSubs;
  const subDone = pastBrowse;

  const weightActive = microPhase === 'weight';
  const weightDone = microPhase === 'price';

  const priceActive = microPhase === 'price';
  const canOpenPriceFromBrowse = microPhase === 'browse' && ticketLineCount > 0;

  const cls = (base: string, active: boolean, done: boolean, clickable: boolean, optional?: boolean) =>
    [
      base,
      active ? classes.kioskLineMicroStepActive : '',
      done && !active ? classes.kioskLineMicroStepDone : '',
      clickable ? classes.kioskLineMicroStepDoneClickable : '',
      optional ? classes.kioskLineMicroStepOptional : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <nav
      className={classes.kioskLineMicroRail}
      aria-label="Étapes article : catégorie, sous-catégorie, poids, prix"
      data-testid="cashflow-kiosk-line-micro-rail"
    >
      <div className={classes.kioskLineMicroRailTrack}>
        <button
          type="button"
          className={cls(classes.kioskLineMicroStep, catActive, catDone, pastBrowse || inBrowseSubs)}
          onClick={() => {
            if (pastBrowse || inBrowseSubs) onGoBrowse();
          }}
          aria-current={catActive ? 'step' : undefined}
          data-testid="cashflow-kiosk-micro-cat"
        >
          <span>Catégorie</span>
        </button>
        <span className={classes.kioskLineMicroChev} aria-hidden>
          ›
        </span>
        <div
          className={cls(classes.kioskLineMicroStep, subActive, subDone, false, subSkipped)}
          aria-current={subActive ? 'step' : undefined}
          data-testid="cashflow-kiosk-micro-sub"
        >
          <span>Sous-catégorie{subSkipped ? ' (non requis)' : ''}</span>
        </div>
        <span className={classes.kioskLineMicroChev} aria-hidden>
          ›
        </span>
        <button
          type="button"
          className={cls(classes.kioskLineMicroStep, weightActive, weightDone, microPhase === 'price')}
          onClick={() => {
            if (microPhase === 'price') onGoWeight();
          }}
          aria-current={weightActive ? 'step' : undefined}
          data-testid="cashflow-kiosk-micro-weight"
        >
          <span>Poids</span>
        </button>
        <span className={classes.kioskLineMicroChev} aria-hidden>
          ›
        </span>
        <button
          type="button"
          className={cls(classes.kioskLineMicroStep, priceActive, false, microPhase === 'weight' || canOpenPriceFromBrowse)}
          onClick={() => {
            if (microPhase === 'weight' || canOpenPriceFromBrowse) onGoPrice();
          }}
          aria-current={priceActive ? 'step' : undefined}
          data-testid="cashflow-kiosk-micro-price"
        >
          <span>Prix</span>
        </button>
      </div>
      <p className={classes.kioskLineMicroRailHint}>
        {microPhase === 'browse'
          ? inBrowseSubs
            ? 'Choisissez une sous-catégorie ou revenez aux catégories racines.'
            : 'Choisissez une catégorie (les pastilles indiquent le nombre de sous-catégories renvoyé par le serveur).'
          : microPhase === 'weight'
            ? 'Quantité et poids pour la ligne sélectionnée.'
            : 'Prix unitaire puis ajout au ticket.'}
      </p>
    </nav>
  );
}

function pathnameNoTrailingSlash(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function saleKioskCloseSessionPath(): string {
  if (typeof window === 'undefined') return '/cash-register/session/close';
  const p = pathnameNoTrailingSlash(window.location.pathname);
  let base = '/cash-register';
  if (p.startsWith('/cash-register/deferred')) base = '/cash-register/deferred';
  else if (p.startsWith('/cash-register/virtual')) base = '/cash-register/virtual';
  return `${base}/session/close`;
}

function kioskOperatingModeBadgeColor(mode: CashflowOperatingMode | null): string {
  if (mode === 'virtual') return 'teal';
  if (mode === 'deferred') return 'orange';
  if (mode === 'real') return 'green';
  return 'gray';
}

/**
 * En-tête session (intention legacy `CashSessionHeader`) : site, poste, session, mode — sans dupliquer le strip dashboard.
 */
function SaleKioskSessionHeader({
  siteLabel,
  posteLabel,
  sessionLabel,
  operatingMode,
  onRefreshSession,
  onCloseSession,
}: {
  readonly siteLabel: string;
  readonly posteLabel: string;
  readonly sessionLabel: string;
  readonly operatingMode: CashflowOperatingMode | null;
  readonly onRefreshSession: () => void;
  readonly onCloseSession: () => void;
}): ReactNode {
  const modeLabel = kioskOperatingLabel(operatingMode);
  return (
    <header className={classes.saleKioskSessionHeader} data-testid="cashflow-kiosk-session-header">
      <div className={classes.saleKioskSessionHeaderTop}>
        <Text className={classes.saleKioskSessionTitle} fw={700} size="sm" c="#fff">
          Vente au comptoir
        </Text>
        <Group gap="xs" wrap="wrap" justify="flex-end">
          <Button type="button" size="xs" variant="filled" color="gray" onClick={onRefreshSession} data-testid="cashflow-kiosk-refresh-session">
            Actualiser
          </Button>
          <Button type="button" size="xs" variant="outline" onClick={onCloseSession} data-testid="cashflow-kiosk-goto-close" className={classes.saleKioskHeaderOutlineBtn}>
            Fermer la caisse
          </Button>
        </Group>
      </div>
      <div className={classes.saleKioskSessionMeta} role="status" data-testid="cashflow-kiosk-context-strip">
        <div className={classes.saleKioskSessionMetaItem}>
          <span className={classes.saleKioskSessionMetaLabel}>Site</span>
          <span className={classes.saleKioskSessionMetaValue}>{siteLabel}</span>
        </div>
        <div className={classes.saleKioskSessionMetaItem}>
          <span className={classes.saleKioskSessionMetaLabel}>Poste</span>
          <span className={classes.saleKioskSessionMetaValue}>{posteLabel}</span>
        </div>
        <div className={classes.saleKioskSessionMetaItem}>
          <span className={classes.saleKioskSessionMetaLabel}>Session</span>
          <span className={classes.saleKioskSessionMetaValue}>{sessionLabel}</span>
        </div>
        <Badge
          size="sm"
          variant="filled"
          color={kioskOperatingModeBadgeColor(operatingMode)}
          data-testid={
            operatingMode === 'virtual'
              ? 'cashflow-operating-mode-virtual-banner'
              : operatingMode === 'deferred'
                ? 'cashflow-operating-mode-deferred-banner'
                : 'cashflow-kiosk-mode-badge'
          }
        >
          {modeLabel}
        </Badge>
      </div>
    </header>
  );
}

function formatEuro(amount: number): string {
  return `${Number(amount).toFixed(2)} €`;
}

function readFiniteNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Bandeau KPI (intention `CashKPIBanner`) : montant ticket lisible + repères session serveur quand disponibles.
 */
function SaleKioskKpiBanner({
  lineCount,
  linesSubtotalAmount,
  totalAmount,
  activeHeld,
  dataStale,
  serverSession,
  sessionKpiLoading,
}: {
  readonly lineCount: number;
  readonly linesSubtotalAmount: number;
  readonly totalAmount: number;
  readonly activeHeld: boolean;
  readonly dataStale: boolean;
  readonly serverSession: CashSessionCurrentV1 | null;
  readonly sessionKpiLoading: boolean;
}): ReactNode {
  const displayTicketTotal = totalAmount > 0 ? totalAmount : linesSubtotalAmount;
  const ticketState = activeHeld
    ? 'Reprise (ticket en attente)'
    : lineCount > 0
      ? 'Brouillon'
      : 'Ticket vide';
  const venduSession = serverSession ? readFiniteNumber(serverSession.total_sales) : null;
  const enCaisseIndicatif = serverSession ? readFiniteNumber(serverSession.current_amount) : null;
  const dash = '—';

  return (
    <div
      className={classes.saleKioskKpiWrap}
      data-testid="cashflow-kiosk-kpi-banner"
      role="region"
      aria-label="Synthèse ticket et session"
    >
      <div className={classes.saleKioskKpiRowMain}>
        <div className={classes.saleKioskKpiPrimary}>
          <span className={classes.saleKioskKpiPrimaryLabel}>Montant du ticket</span>
          <span className={classes.saleKioskKpiPrimaryValue} data-testid="cashflow-kiosk-kpi-ticket-total">
            {formatEuro(displayTicketTotal)}
          </span>
          {totalAmount > 0 && Math.abs(totalAmount - linesSubtotalAmount) > 0.009 ? (
            <span className={classes.saleKioskKpiPrimaryHint}>dont articles {formatEuro(linesSubtotalAmount)}</span>
          ) : lineCount > 0 && totalAmount <= 0 ? (
            <span className={classes.saleKioskKpiPrimaryHint}>à confirmer à l’étape Montant</span>
          ) : null}
        </div>
        <div className={classes.saleKioskKpiSideGrid}>
          <div className={classes.saleKioskKpiCell}>
            <span className={classes.saleKioskKpiLabel}>Articles (lignes)</span>
            <span className={classes.saleKioskKpiValue} data-testid="cashflow-kiosk-kpi-line-count">
              {lineCount}
            </span>
          </div>
          <div className={classes.saleKioskKpiCell}>
            <span className={classes.saleKioskKpiLabel}>État du ticket</span>
            <span className={classes.saleKioskKpiValue} data-testid="cashflow-kiosk-kpi-ticket-state">
              {dataStale ? 'À actualiser' : ticketState}
            </span>
          </div>
        </div>
      </div>
      <div className={classes.saleKioskKpiRowSession} data-testid="cashflow-kiosk-kpi-session-strip">
        <div className={classes.saleKioskKpiSessionItem}>
          <span className={classes.saleKioskKpiSessionLabel}>Vendu sur cette session</span>
          <span className={classes.saleKioskKpiSessionValue}>
            {sessionKpiLoading && !serverSession ? '…' : venduSession != null ? formatEuro(venduSession) : dash}
          </span>
        </div>
        <div className={classes.saleKioskKpiSessionItem}>
          <span className={classes.saleKioskKpiSessionLabel}>En caisse (indicatif)</span>
          <span className={classes.saleKioskKpiSessionValue}>
            {sessionKpiLoading && !serverSession ? '…' : enCaisseIndicatif != null ? formatEuro(enCaisseIndicatif) : dash}
          </span>
        </div>
      </div>
    </div>
  );
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
    <div
      className={`${classes.heldPanel}${kioskSurface ? ` ${classes.heldPanelKiosk}` : ''}`}
      data-testid="cashflow-held-tickets-panel"
    >
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
            <li key={h.id} className={`${classes.heldRow}${kioskSurface ? ` ${classes.heldRowKiosk}` : ''}`}>
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
  browseResetEpoch,
  onDrillIntoChildren,
  onBrowseDepthChange,
  onContinueWithoutGrid,
}: {
  readonly onPickCategoryCode: (categoryCode: string, categoryDisplayName: string) => void;
  /** Incrémenté par le parent pour ramener la navigation racine (retour depuis poids/prix). */
  readonly browseResetEpoch: number;
  readonly onDrillIntoChildren?: () => void;
  readonly onBrowseDepthChange?: (parentId: string | null) => void;
  /** Grille vide ou indisponible : même API, saisie manuelle du code (démo / secours). */
  readonly onContinueWithoutGrid?: () => void;
}): ReactNode {
  const auth = useAuthPort();
  const authRef = useRef(auth);
  authRef.current = auth;
  const [rows, setRows] = useState<CategoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => {
    setParentId(null);
  }, [browseResetEpoch]);

  useEffect(() => {
    onBrowseDepthChange?.(parentId);
  }, [parentId, onBrowseDepthChange]);

  /**
   * Chargement catégories : ne pas dépendre de l’identité `auth` (référence instable possible) —
   * évite annulations en rafale où `finally` ne repasse jamais `loading` à false. `authRef` garde le port courant ;
   * `AbortController` annule le fetch au démontage / remount strict.
   */
  useEffect(() => {
    const ac = new AbortController();
    let disposed = false;

    setLoading(true);
    setFetchErr(null);

    void (async () => {
      try {
        const list = await fetchCategoriesList(authRef.current, ac.signal);
        if (disposed) return;
        setRows(list.filter((c) => c.is_active));
      } catch (e) {
        if (disposed || ac.signal.aborted) return;
        setFetchErr(e instanceof Error ? e.message : 'Chargement des catégories impossible.');
      } finally {
        if (!disposed) setLoading(false);
      }
    })();

    return () => {
      disposed = true;
      ac.abort();
    };
  }, []);

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

  const childCountFor = useCallback((id: string) => rows.filter((r) => r.parent_id === id).length, [rows]);

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
        {onContinueWithoutGrid ? (
          <Button mt="sm" size="xs" variant="light" onClick={onContinueWithoutGrid} data-testid="cashflow-kiosk-category-manual-fallback">
            Continuer sans grille (saisie manuelle du code)
          </Button>
        ) : null}
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
          onClick={() => {
            const cur = rows.find((r) => r.id === parentId);
            const up = cur?.parent_id;
            if (up == null || String(up).trim() === '') setParentId(null);
            else setParentId(String(up));
          }}
          data-testid="cashflow-kiosk-category-back"
        >
          ← Niveau parent
        </Button>
      ) : null}
      <Text size="sm" fw={600} mb="xs">
        {parentId ? 'Sous-catégories' : 'Catégories'}
      </Text>
      {showList.length === 0 ? (
        <div data-testid="cashflow-kiosk-category-empty">
          <Text size="sm" c="dimmed" mb="sm">
            Aucune catégorie renvoyée par le serveur pour cette session.
          </Text>
          {onContinueWithoutGrid ? (
            <Button size="sm" variant="light" onClick={onContinueWithoutGrid} data-testid="cashflow-kiosk-category-manual-fallback">
              Continuer sans grille (saisie manuelle du code)
            </Button>
          ) : null}
        </div>
      ) : (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="md" className={classes.kioskCategoryGrid} mb="md">
          {showList.map((c) => {
            const nChild = childCountFor(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={classes.kioskCategoryButton}
                data-testid={`cashflow-kiosk-category-${c.id}`}
                onClick={() => {
                  if (rowHasChildren(c.id)) {
                    setParentId(c.id);
                    if (!parentId) onDrillIntoChildren?.();
                    return;
                  }
                  onPickCategoryCode(c.id, c.name);
                }}
              >
                <span className={classes.kioskCategoryButtonMain}>{c.name}</span>
                <span className={classes.kioskCategoryMetaRow}>
                  {nChild > 0 ? <span className={classes.kioskCategoryCountBadge}>{nChild} sous-cat.</span> : null}
                </span>
                {c.shortcut_key != null && String(c.shortcut_key).trim() !== '' ? (
                  <span className={classes.kioskCategoryShortcutBadge}>Touche {String(c.shortcut_key).trim()}</span>
                ) : null}
              </button>
            );
          })}
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
  /** Libellé métier issu de la grille (GET /v1/categories/) — évite d’afficher l’identifiant technique comme libellé principal. */
  const [categoryArticleLabel, setCategoryArticleLabel] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState(1);
  const [unitPrice, setUnitPrice] = useState(5);
  const [holdBusy, setHoldBusy] = useState(false);

  const [kioskMicroPhase, setKioskMicroPhase] = useState<KioskLineMicroPhase>('browse');
  const [kioskBrowseResetEpoch, setKioskBrowseResetEpoch] = useState(0);
  const [kioskBrowseParentId, setKioskBrowseParentId] = useState<string | null>(null);
  const [kioskUsedSubcategoryDrill, setKioskUsedSubcategoryDrill] = useState(false);

  const goKioskBrowse = useCallback(() => {
    setKioskMicroPhase('browse');
    setKioskBrowseResetEpoch((e) => e + 1);
  }, []);

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
    if (kioskCategoryWorkspace) {
      setKioskMicroPhase('browse');
      setKioskBrowseResetEpoch((e) => e + 1);
      setKioskUsedSubcategoryDrill(false);
      setCategoryArticleLabel('');
    }
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
        <>
          <KioskLineMicroRail
            microPhase={kioskMicroPhase}
            browseParentId={kioskBrowseParentId}
            usedSubcategoryDrill={kioskUsedSubcategoryDrill}
            ticketLineCount={draft.lines.length}
            onGoBrowse={goKioskBrowse}
            onGoWeight={() => setKioskMicroPhase('weight')}
            onGoPrice={() => setKioskMicroPhase('price')}
          />
          {kioskMicroPhase === 'browse' ? (
            <KioskCategoryWorkspace
              browseResetEpoch={kioskBrowseResetEpoch}
              onDrillIntoChildren={() => setKioskUsedSubcategoryDrill(true)}
              onBrowseDepthChange={setKioskBrowseParentId}
              onContinueWithoutGrid={() => {
                setCategoryArticleLabel('');
                setKioskMicroPhase('weight');
              }}
              onPickCategoryCode={(code, displayName) => {
                setCategory(code);
                setCategoryArticleLabel(displayName.trim());
                setKioskMicroPhase('weight');
              }}
            />
          ) : null}
        </>
      ) : null}
      {!kioskCategoryWorkspace ? <HeldTicketsPanel kioskSurface={kioskSurface} /> : null}
      {kioskCategoryWorkspace ? (
        <>
          {kioskMicroPhase === 'weight' ? (
            <div className={classes.kioskLineEditor}>
              <div className={classes.kioskLineEditorTitle}>Poids et quantité</div>
              <div className={classes.kioskLineReadonlyCode} data-testid="cashflow-kiosk-readonly-category">
                <strong>Article</strong> : {categoryArticleLabel.trim() || '—'}
                {!categoryArticleLabel.trim() ? (
                  <span className={classes.kioskLineReadonlyCodeMuted}> — grille non utilisée ou code ajusté manuellement.</span>
                ) : null}
              </div>
              <Text size="sm" mb="md" c="dimmed">
                Contrôlez la quantité et le poids ; le prix unitaire vient à l’étape suivante.
              </Text>
              <NumberInput label="Quantité" min={1} value={quantity} onChange={(v) => setQuantity(Number(v) || 1)} />
              <NumberInput
                label="Poids (kg)"
                min={0.01}
                step={0.1}
                value={weight}
                onChange={(v) => setWeight(Number(v) || 0)}
                mt="sm"
                data-testid="cashflow-input-weight"
              />
              <div className={classes.kioskLinePhaseActions}>
                <Button type="button" variant="default" onClick={goKioskBrowse}>
                  Retour à la grille
                </Button>
                <Button type="button" onClick={() => setKioskMicroPhase('price')}>
                  Continuer vers le prix
                </Button>
              </div>
            </div>
          ) : null}
          {kioskMicroPhase === 'price' ? (
            <div className={classes.kioskLineEditor}>
              <div className={classes.kioskLineEditorTitle}>Prix et validation</div>
              <div className={classes.kioskLineReadonlyCode}>
                <strong>Article</strong> : {categoryArticleLabel.trim() || '—'}
                {!categoryArticleLabel.trim() ? (
                  <span className={classes.kioskLineReadonlyCodeMuted}> — saisie directe du code catalogue.</span>
                ) : null}
              </div>
              <TextInput
                label="Ajuster le code catalogue (optionnel)"
                description="La grille reste le chemin principal ; la saisie manuelle reste possible."
                value={category}
                onChange={(e) => {
                  setCategory(e.currentTarget.value);
                  setCategoryArticleLabel('');
                }}
                data-testid="cashflow-input-category"
              />
              <NumberInput
                label="Prix unitaire / ligne (€)"
                min={0}
                value={unitPrice}
                onChange={(v) => setUnitPrice(Number(v) || 0)}
                mt="sm"
              />
              <div className={classes.kioskLinePhaseActions}>
                <Button type="button" variant="default" onClick={() => setKioskMicroPhase('weight')}>
                  Retour poids / quantité
                </Button>
              </div>
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
                Mettre en attente
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <Text size="sm" mb="md">
            Saisie ou scan (code catégorie) : les montants effectifs suivent la réponse API au moment du POST.
          </Text>
          <TextInput
            label="Catégorie / code"
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
          <NumberInput
            label="Prix unitaire / ligne (€)"
            min={0}
            value={unitPrice}
            onChange={(v) => setUnitPrice(Number(v) || 0)}
            mt="sm"
          />
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
            Mettre en attente (POST recyclique_sales_createHeldSale)
          </Button>
        </>
      )}
      {kioskCategoryWorkspace ? <HeldTicketsPanel kioskSurface={kioskSurface} /> : null}
    </div>
  );
}

function TotalStep({ wide, kioskSurface }: { readonly wide?: boolean; readonly kioskSurface?: boolean }): ReactNode {
  const draft = useCashflowDraft();
  const sub = useMemo(() => linesSubtotal(draft.lines), [draft.lines]);

  useEffect(() => {
    if (draft.totalAmount === 0 && sub > 0) {
      setTotalAmount(sub);
    }
  }, [draft.totalAmount, sub]);

  return (
    <div className={`${classes.step}${wide ? ` ${classes.stepKiosk}` : ''}`}>
      <Text size="sm" mb="md">
        {kioskSurface
          ? 'Montant total à facturer (contrôlé par le serveur à l’enregistrement).'
          : 'Total de la vente (doit couvrir le sous-total des lignes — validé serveur).'}
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

function PaymentStep({
  kioskSurface,
  wide,
}: {
  readonly kioskSurface: boolean;
  readonly wide?: boolean;
}): ReactNode {
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

  if (kioskSurface) {
    return (
      <div className={`${classes.step}${wide ? ` ${classes.stepKiosk}` : ''}`}>
        <div className={classes.saleKioskFinalizeCard}>
          <div className={classes.saleKioskFinalizeTitle}>Session caisse</div>
          <Text size="sm" mb="md">
            {draft.activeHeldSaleId
              ? 'Contrôlez le total dans le ticket à droite. Le moyen de paiement et la validation restent visibles sous le ticket.'
              : 'Le moyen de paiement et le bouton d’enregistrement sont affichés en permanence sous le ticket à droite. Ici : contrôle ou correction de la session si besoin.'}
          </Text>
          <TextInput
            label="Session active"
            description="Renseignée automatiquement quand le poste est relié au serveur."
            value={draft.cashSessionIdInput}
            onChange={(e) => setCashSessionIdInput(e.currentTarget.value)}
            data-testid="cashflow-input-session-id"
          />
        </div>
      </div>
    );
  }

  const paymentBody = (
    <>
      <Text size="sm" mb="md">
        Choix du paiement — bloqué si le widget ticket critique est en DATA_STALE.
        {draft.activeHeldSaleId
          ? ' Reprise : finalisation via recyclique_sales_finalizeHeldSale (même garde-fou stale).'
          : ''}
      </Text>
      <TextInput
        label="UUID session caisse (ContextEnvelope ou collage terrain)"
        value={draft.cashSessionIdInput}
        onChange={(e) => setCashSessionIdInput(e.currentTarget.value)}
        data-testid="cashflow-input-session-id"
      />
      <Text component="label" size="sm" fw={600} mt="sm" display="block">
        Moyen de paiement
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
      <CashflowClientErrorAlert error={draft.submitError} />
      <Button
        mt="lg"
        size="sm"
        onClick={() => void onSubmit()}
        disabled={!canSubmit || busy}
        loading={busy}
        data-testid="cashflow-submit-sale"
      >
        {draft.activeHeldSaleId
          ? 'Finaliser le ticket en attente (POST …/finalize-held)'
          : 'Enregistrer la vente (POST /v1/sales/)'}
      </Button>
    </>
  );

  return <div className={`${classes.step}${wide ? ` ${classes.stepKiosk}` : ''}`}>{paymentBody}</div>;
}

function TicketStep({
  kioskSurface,
  wide,
}: {
  readonly kioskSurface: boolean;
  readonly wide?: boolean;
}): ReactNode {
  const draft = useCashflowDraft();
  return (
    <div className={`${classes.step}${wide ? ` ${classes.stepKiosk}` : ''}`}>
      <Text size="sm">
        {kioskSurface
          ? 'Le ticket et la référence s’affichent à droite. Revenez aux articles pour une nouvelle vente.'
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
  const {
    session: serverSession,
    loading: serverSessionLoading,
    refresh: refreshServerSession,
  } = useCaisseServerCurrentSession(auth);
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
        title: kioskSaleSurface ? 'Catégorie → prix' : 'Lignes',
        content: (
          <LinesStep kioskCategoryWorkspace={saleKioskCategoryWorkspace} kioskSurface={kioskSaleSurface} />
        ),
      },
      {
        id: 'total',
        title: kioskSaleSurface ? 'Montant' : 'Total',
        content: <TotalStep wide={saleKioskCategoryWorkspace} kioskSurface={kioskSaleSurface} />,
      },
      {
        id: 'pay',
        title: kioskSaleSurface ? 'Encaissement' : 'Paiement',
        content: <PaymentStep kioskSurface={kioskSaleSurface} wide={saleKioskCategoryWorkspace} />,
      },
      {
        id: 'ticket',
        title: kioskSaleSurface ? 'Reçu' : 'Ticket',
        content: <TicketStep kioskSurface={kioskSaleSurface} wide={saleKioskCategoryWorkspace} />,
      },
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
      {draft.operatingMode === 'virtual' && !kioskSaleSurface ? (
        <Alert color="teal" title="Mode simulation (virtuel)" mb="sm" data-testid="cashflow-operating-mode-virtual-banner">
          Session ouverte depuis « Mode virtuel » sur le tableau de poste : même cadre API et permissions qu’une caisse
          réelle ; distinguez bien l’usage terrain (formation, tests).
        </Alert>
      ) : null}
      {draft.operatingMode === 'deferred' && !kioskSaleSurface ? (
        <Alert color="blue" title="Saisie différée" mb="sm" data-testid="cashflow-operating-mode-deferred-banner">
          Session ouverte avec une date / heure réelle d’ouverture (permission <code>caisse.deferred.access</code>).
        </Alert>
      ) : null}
      {!kioskSaleSurface ? <SocialEncaissementPanel /> : null}
      {!kioskSaleSurface ? <SpecialEncaissementsPanel /> : null}
      {kioskSaleSurface ? (
        <div className={classes.saleKioskChrome}>
          <SaleKioskSessionHeader
            siteLabel={(() => {
              const named = envelope.presentationLabels?.[CONTEXT_ACTIVE_SITE_DISPLAY_NAME_KEY]?.trim();
              if (named) return named;
              const sid = envelope.siteId?.trim();
              return sid ? shortRef(sid) : '—';
            })()}
            posteLabel={(() => {
              const reg = envelope.activeRegisterId?.trim() || envelope.workstationId?.trim() || serverSession?.register_id?.trim() || '';
              return reg ? shortRef(reg) : '—';
            })()}
            sessionLabel={(() => {
              const sid =
                envelope.cashSessionId?.trim() || draft.cashSessionIdInput.trim() || serverSession?.id?.trim() || '';
              return sid ? shortRef(sid) : 'Non résolue';
            })()}
            operatingMode={draft.operatingMode}
            onRefreshSession={() => refreshServerSession()}
            onCloseSession={() => spaNavigateTo(saleKioskCloseSessionPath())}
          />
          <SaleKioskKpiBanner
            lineCount={draft.lines.length}
            linesSubtotalAmount={linesSubtotal(draft.lines)}
            totalAmount={draft.totalAmount}
            activeHeld={Boolean(draft.activeHeldSaleId)}
            dataStale={draft.widgetDataState === 'DATA_STALE'}
            serverSession={serverSession}
            sessionKpiLoading={serverSessionLoading}
          />
        </div>
      ) : null}
      <div className={kioskSaleSurface ? classes.kioskFlowWrap : undefined}>
        <FlowRenderer
          flowId="cashflow-nominal"
          panels={panels}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          keepMounted
          presentation={kioskSaleSurface ? 'kiosk_steps' : 'default'}
        />
      </div>
      <div className={`${classes.navRow}${kioskSaleSurface ? ` ${classes.navRowKiosk}` : ''}`}>
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
