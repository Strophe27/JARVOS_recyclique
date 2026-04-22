import { Alert, Badge, Button, Group, NumberInput, Text, TextInput, Tooltip } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type RecycliqueClientFailure, recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { type CategoryListItem } from '../../api/dashboard-legacy-stats-client';
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
  PERMISSION_CASHFLOW_REFUND,
  PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT,
  PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT,
  PERMISSION_CASHFLOW_VIRTUAL,
} from '../../app/auth/default-demo-auth-adapter';
import { useAuthPort, useAuthSession, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import { useLiveEnvelopeRefresh } from '../../app/auth/LiveAuthEnvelopeRefreshContext';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import type { ContextEnvelopeStub } from '../../types/context-envelope';
import { CategoryHierarchyPicker } from '../../widgets/category-hierarchy-picker/CategoryHierarchyPicker';
import { CONTEXT_ACTIVE_SITE_DISPLAY_NAME_KEY } from '../../runtime/context-presentation-keys';
import {
  CONTEXT_ENVELOPE_ACTION_BLOCKED_MESSAGE,
  isEnvelopeStale,
} from '../../runtime/context-envelope-freshness';
import { FlowRenderer } from '../../flows/FlowRenderer';
import {
  addTicketLine,
  applyServerHeldSaleToDraft,
  bumpHeldTicketsListRefresh,
  attachCashflowDraftSessionPersistence,
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
  setTicketBusinessTags,
  setTotalAmount,
  useCashflowDraft,
  type CashflowOperatingMode,
} from './cashflow-draft-store';
import { buildBusinessTagPayload } from './cashflow-business-tag-payload';
import { useCaisseServerCurrentSession } from './use-caisse-server-current-session';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import { CashflowSocialDonWizard } from './CashflowSocialDonWizard';
import { makeCashflowSpecialEncaissementWizard } from './CashflowSpecialEncaissementWizard';
import { CashflowOperationalSyncNotice } from './cashflow-operational-sync-notice';
import { useCaissePaymentMethodOptions } from './use-caisse-payment-method-options';
import { KpiLiveStrip } from '../bandeau-live/KpiLiveStrip';
import { useKpiLiveBannerSettings } from '../bandeau-live/kpi-live-banner-settings-provider';
import { useUnifiedLiveKpiPoll } from '../bandeau-live/use-unified-live-kpi-poll';
import classes from './CashflowNominalWizard.module.css';

const CashflowSpecialDonWizard = makeCashflowSpecialEncaissementWizard('DON_SANS_ARTICLE');
const CashflowSpecialAdhesionWizard = makeCashflowSpecialEncaissementWizard('ADHESION_ASSOCIATION');

/** Story 24.9 — tags métier (ticket / lignes via API ; saisie ticket dans le nominal). */
const CASHFLOW_BUSINESS_TAG_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '(aucun)' },
  { value: 'GRATIFERIA', label: 'Gratiféria' },
  { value: 'CAMPAGNE_SOCIALE', label: 'Campagne sociale' },
  { value: 'SPECIAL_DON_SANS_ARTICLE', label: 'Enc. spécial — don sans article' },
  { value: 'AUTRE', label: 'Autre (libellé libre)' },
];

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

const KIOSK_FINALIZE_FOCUS_EVENT = 'cashflow:kiosk-finalize-focus';

function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function requestKioskFinalizeFocus(): void {
  window.dispatchEvent(new CustomEvent(KIOSK_FINALIZE_FOCUS_EVENT));
}

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
  onOpenRefund,
}: {
  readonly siteLabel: string;
  readonly posteLabel: string;
  readonly sessionLabel: string;
  readonly operatingMode: CashflowOperatingMode | null;
  readonly onRefreshSession: () => void;
  readonly onCloseSession: () => void;
  readonly onOpenRefund?: () => void;
}): ReactNode {
  const modeLabel = kioskOperatingLabel(operatingMode);
  return (
    <header className={classes.saleKioskSessionHeader} data-testid="cashflow-kiosk-session-header">
      <div className={classes.saleKioskSessionHeaderTop}>
        <Text className={classes.saleKioskSessionTitle} fw={700} size="sm" c="#fff">
          Vente au comptoir
        </Text>
        <Group gap="xs" wrap="wrap" justify="flex-end">
          {onOpenRefund ? (
            <Button
              type="button"
              size="xs"
              variant="light"
              onClick={onOpenRefund}
              data-testid="caisse-open-refund"
            >
              Remboursement
            </Button>
          ) : null}
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

function formatCatalogPrice(amount: number): string {
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

/** Bandeau KPI jour — `GET /v1/stats/live` (même sémantique que le bandeau legacy caisse) ; réutilisable plus tard en réception. */
function SaleKioskUnifiedLiveKpiStrip({
  operatingMode,
  lastTicketAmountOverride,
}: {
  readonly operatingMode: CashflowOperatingMode;
  readonly lastTicketAmountOverride: number;
}): ReactNode {
  const envelope = useContextEnvelope();
  const { settings } = useKpiLiveBannerSettings();
  const kpi = useUnifiedLiveKpiPoll({
    siteId: envelope.siteId,
    enabled: operatingMode !== 'virtual' && settings.showOnCaisse,
    intervalMs: settings.refreshIntervalMs,
  });
  if (!settings.showOnCaisse) {
    return null;
  }
  return (
    <KpiLiveStrip
      stats={kpi.data}
      isLoading={kpi.isLoading}
      isRefreshing={kpi.isRefreshing}
      error={kpi.error}
      isOnline={kpi.isOnline}
      lastUpdate={kpi.lastUpdate}
      lastTicketAmountOverride={lastTicketAmountOverride}
      variant="compact"
      showTitle={false}
      virtualMode={operatingMode === 'virtual'}
      data-testid="cashflow-kiosk-unified-live-kpi"
    />
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
      const r = await postAbandonHeldSale(id, auth, {
        contextBinding: { siteId: envelope.siteId, cashSessionId: envelope.cashSessionId },
      });
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

function normalizeKioskDecimalInput(raw: string): string {
  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replaceAll('.', '')}`;
}

const KIOSK_AZERTY_TOP_ROW_DIGIT_BY_KEY: Record<string, string> = {
  '&': '1',
  'é': '2',
  '"': '3',
  "'": '4',
  '(': '5',
  '-': '6',
  'è': '7',
  '_': '8',
  'ç': '9',
  'à': '0',
};

function decodeKioskNumericKeyboardKey(key: string, code: string): string | null {
  if (key >= '0' && key <= '9') return key;
  if (code.startsWith('Digit')) {
    const digitFromCode = code.slice('Digit'.length);
    if (digitFromCode >= '0' && digitFromCode <= '9') return digitFromCode;
  }
  if (code.startsWith('Numpad')) {
    const digitFromCode = code.slice('Numpad'.length);
    if (digitFromCode >= '0' && digitFromCode <= '9') return digitFromCode;
    if (digitFromCode === 'Decimal') return '.';
  }
  return KIOSK_AZERTY_TOP_ROW_DIGIT_BY_KEY[key] ?? null;
}

function isKioskDecimalSeparatorKey(key: string, code: string): boolean {
  if (key === '.' || key === ',') return true;
  // Claviers FR/AZERTY: selon l'OS/navigateur, la touche décimale dédiée peut remonter
  // avec un `code` physique différent du simple `key` ".".
  return code === 'NumpadDecimal' || code === 'Period' || code === 'Comma' || code === 'Semicolon';
}

function formatKioskNumericDisplay(raw: string, suffix: string): string {
  const normalized = normalizeKioskDecimalInput(raw);
  return `${normalized.length > 0 ? normalized : '0'} ${suffix}`;
}

function parseKioskPositiveNumber(raw: string, fallback: number): number {
  const normalized = normalizeKioskDecimalInput(raw);
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hasKioskPositiveNumber(raw: string): boolean {
  const normalized = normalizeKioskDecimalInput(raw);
  if (normalized.length === 0) return false;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0;
}

function KioskNumericPad({
  value,
  suffix,
  onChange,
  onValidate,
  onStepBack,
  onStepForward,
  validateLabel,
  testIdPrefix,
}: {
  readonly value: string;
  readonly suffix: string;
  readonly onChange: (next: string) => void;
  readonly onValidate: () => void;
  readonly onStepBack?: () => void;
  readonly onStepForward?: () => void;
  readonly validateLabel: string;
  readonly testIdPrefix: string;
}): ReactNode {
  const append = useCallback(
    (chunk: string) => {
      onChange(normalizeKioskDecimalInput(`${value}${chunk}`));
    },
    [onChange, value],
  );

  const onBackspace = useCallback(() => {
    onChange(value.slice(0, -1));
  }, [onChange, value]);

  const onClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const numericKey = decodeKioskNumericKeyboardKey(e.key, e.code);
      if (numericKey && numericKey !== '.') {
        e.preventDefault();
        append(numericKey);
        return;
      }
      if (isKioskDecimalSeparatorKey(e.key, e.code) || numericKey === '.') {
        e.preventDefault();
        append('.');
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (value.length === 0) {
          onStepBack?.();
          return;
        }
        onBackspace();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) onStepBack?.();
        else onStepForward?.();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onStepBack) {
          onStepBack?.();
          return;
        }
        onClear();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        onValidate();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [append, onBackspace, onClear, onStepBack, onStepForward, onValidate, value.length]);

  return (
    <div className={classes.kioskNumpad} data-testid={`${testIdPrefix}-pad`}>
      <div className={classes.kioskNumpadDisplay} data-testid={`${testIdPrefix}-display`}>
        {formatKioskNumericDisplay(value, suffix)}
      </div>
      <div className={classes.kioskNumpadGrid}>
        <Button variant="default" onClick={onBackspace} data-testid={`${testIdPrefix}-backspace`}>
          Effacer un caractère
        </Button>
        <Button variant="default" onClick={onClear} data-testid={`${testIdPrefix}-clear`}>
          Effacer tout
        </Button>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'].map((digit) => (
          <Button key={digit} variant="light" onClick={() => append(digit)} data-testid={`${testIdPrefix}-digit-${digit === '.' ? 'dot' : digit}`}>
            {digit}
          </Button>
        ))}
      </div>
      <Button mt="md" onClick={onValidate} data-testid={`${testIdPrefix}-validate`}>
        {validateLabel}
      </Button>
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
  const envelope = useContextEnvelope();
  const saleContextBinding = useMemo(
    () => ({ siteId: envelope.siteId, cashSessionId: envelope.cashSessionId }),
    [envelope.siteId, envelope.cashSessionId],
  );
  const [category, setCategory] = useState('EEE-1');
  /** Libellé métier issu de la grille (GET /v1/categories/) — évite d’afficher l’identifiant technique comme libellé principal. */
  const [categoryArticleLabel, setCategoryArticleLabel] = useState('');
  const [selectedCategoryMeta, setSelectedCategoryMeta] = useState<CategoryListItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState(1);
  const [unitPrice, setUnitPrice] = useState(5);
  const [holdBusy, setHoldBusy] = useState(false);

  const [kioskMicroPhase, setKioskMicroPhase] = useState<KioskLineMicroPhase>('browse');
  const [kioskBrowseResetEpoch, setKioskBrowseResetEpoch] = useState(0);
  const [kioskBrowseParentId, setKioskBrowseParentId] = useState<string | null>(null);
  const [kioskUsedSubcategoryDrill, setKioskUsedSubcategoryDrill] = useState(false);
  const [kioskWeightInput, setKioskWeightInput] = useState('');
  const [kioskPriceInput, setKioskPriceInput] = useState('5');
  const [kioskShowManualCategoryEdit, setKioskShowManualCategoryEdit] = useState(false);
  const liveRefresh = useLiveEnvelopeRefresh();

  const goKioskBrowse = useCallback(() => {
    setKioskMicroPhase('browse');
    setKioskBrowseResetEpoch((e) => e + 1);
  }, []);

  const goKioskWeight = useCallback(() => {
    setKioskMicroPhase('weight');
  }, []);

  const commitKioskWeight = useCallback(() => {
    if (!hasKioskPositiveNumber(kioskWeightInput)) return;
    const nextWeight = parseKioskPositiveNumber(kioskWeightInput, weight || 1);
    setWeight(nextWeight);
    const categoryFixedPrice =
      selectedCategoryMeta?.price != null && Number(selectedCategoryMeta.price) > 0
        ? Number(selectedCategoryMeta.price)
        : null;
    setKioskPriceInput(String(categoryFixedPrice ?? unitPrice));
    setKioskMicroPhase('price');
  }, [kioskWeightInput, selectedCategoryMeta, unitPrice, weight]);

  useEffect(() => {
    if (kioskMicroPhase !== 'price') return;
    if (!categoryArticleLabel.trim()) {
      setKioskShowManualCategoryEdit(true);
      return;
    }
    setKioskShowManualCategoryEdit(false);
  }, [kioskMicroPhase, categoryArticleLabel]);

  const categoryPricingHint = useMemo(() => {
    if (!selectedCategoryMeta) return null;
    const min = selectedCategoryMeta.price;
    const max = selectedCategoryMeta.max_price;
    const hasMin = typeof min === 'number' && Number.isFinite(min) && min > 0;
    const hasMax = typeof max === 'number' && Number.isFinite(max) && max > 0;
    if (hasMin && hasMax) {
      return {
        title: 'Fourchette de prix autorisée',
        value: `${formatCatalogPrice(min)} - ${formatCatalogPrice(max)}`,
      };
    }
    if (hasMin) {
      return {
        title: 'Prix fixe catalogue',
        value: formatCatalogPrice(min),
      };
    }
    return null;
  }, [selectedCategoryMeta]);

  const onAdd = (overrides?: { readonly weight?: number; readonly unitPrice?: number }) => {
    const nextWeight = overrides?.weight ?? weight;
    const nextUnitPrice = overrides?.unitPrice ?? unitPrice;
    const totalPrice = nextUnitPrice * quantity;
    const displayName = categoryArticleLabel.trim();
    addTicketLine({
      category: category.trim() || 'EEE-1',
      ...(displayName ? { displayLabel: displayName } : {}),
      quantity,
      weight: nextWeight,
      unitPrice: nextUnitPrice,
      totalPrice,
    });
    setTotalAmount(linesSubtotal(getCashflowDraftSnapshot().lines));
    if (kioskCategoryWorkspace) {
      setKioskMicroPhase('browse');
      setKioskBrowseResetEpoch((e) => e + 1);
      setKioskUsedSubcategoryDrill(false);
      setCategoryArticleLabel('');
      setSelectedCategoryMeta(null);
      setKioskWeightInput('');
      setKioskPriceInput(String(unitPrice));
    }
  };

  const commitKioskPrice = useCallback(() => {
    const nextUnitPrice = parseKioskPositiveNumber(kioskPriceInput, unitPrice || 0);
    setUnitPrice(nextUnitPrice);
    onAdd({ unitPrice: nextUnitPrice });
  }, [kioskPriceInput, onAdd, unitPrice]);

  const onHold = async () => {
    const sid = draft.cashSessionIdInput.trim();
    if (!sid || draft.lines.length === 0) return;
    clearCashflowDraftSubmitError();
    let env: ContextEnvelopeStub = envelope;
    if (isEnvelopeStale(env) && liveRefresh) {
      const fresh = await liveRefresh.refreshEnvelope();
      if (fresh) {
        env = fresh;
      }
    }
    if (isEnvelopeStale(env)) {
      setCashflowDraftLocalSubmitError(CONTEXT_ENVELOPE_ACTION_BLOCKED_MESSAGE);
      return;
    }
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
            ...buildBusinessTagPayload(l.businessTagKind ?? '', l.businessTagCustom ?? ''),
          })),
          total_amount: total,
          ...buildBusinessTagPayload(draft.ticketBusinessTagKind, draft.ticketBusinessTagCustom),
        },
        auth,
        { contextBinding: saleContextBinding },
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

  useEffect(() => {
    if (!kioskCategoryWorkspace) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (kioskMicroPhase === 'browse' && kioskBrowseParentId) {
          e.preventDefault();
          goKioskBrowse();
        }
        return;
      }
      if (e.key !== 'Tab' || e.shiftKey) return;
      if (kioskMicroPhase === 'browse' && draft.lines.length > 0 && draft.totalAmount > 0) {
        e.preventDefault();
        requestKioskFinalizeFocus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    draft.lines.length,
    draft.totalAmount,
    goKioskBrowse,
    kioskBrowseParentId,
    kioskCategoryWorkspace,
    kioskMicroPhase,
  ]);

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
            <CategoryHierarchyPicker
              presentation="kiosk_drill"
              categorySource="legacy_categories"
              browseResetEpoch={kioskBrowseResetEpoch}
              onDrillIntoChildren={() => setKioskUsedSubcategoryDrill(true)}
              onBrowseDepthChange={setKioskBrowseParentId}
              onContinueWithoutGrid={() => {
                setCategoryArticleLabel('');
                setSelectedCategoryMeta(null);
                setKioskWeightInput('');
                setKioskMicroPhase('weight');
              }}
              onPickCategoryCode={(code, displayName, categoryMeta) => {
                setCategory(code);
                setCategoryArticleLabel(displayName.trim());
                setSelectedCategoryMeta(categoryMeta);
                setKioskWeightInput('');
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
              <Text size="sm" mb="xs" c="dimmed">
                Qté : {quantity}
              </Text>
              <KioskNumericPad
                value={kioskWeightInput}
                suffix="kg"
                onChange={setKioskWeightInput}
                onValidate={commitKioskWeight}
                onStepBack={goKioskBrowse}
                onStepForward={commitKioskWeight}
                validateLabel="Valider le poids total"
                testIdPrefix="cashflow-kiosk-weight"
              />
              <div className={classes.kioskLinePhaseActions}>
                <Button type="button" variant="default" onClick={goKioskBrowse}>
                  Retour à la grille
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    commitKioskWeight();
                  }}
                >
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
              <div className={classes.kioskPricePrimaryActions}>
                <Button
                  type="button"
                  variant="subtle"
                  size="xs"
                  onClick={() => setKioskShowManualCategoryEdit((v) => !v)}
                  data-testid="cashflow-kiosk-toggle-manual-category"
                >
                  {kioskShowManualCategoryEdit ? 'Masquer le code catalogue' : 'Ajuster le code catalogue'}
                </Button>
              </div>
              {kioskShowManualCategoryEdit ? (
                <TextInput
                  label="Code catalogue"
                  size="sm"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.currentTarget.value);
                    setCategoryArticleLabel('');
                    setSelectedCategoryMeta(null);
                  }}
                  data-testid="cashflow-input-category"
                />
              ) : null}
              {categoryPricingHint ? (
                <div className={classes.kioskPriceHintCard} data-testid="cashflow-kiosk-price-catalog-hint">
                  <span className={classes.kioskPriceHintLabel}>{categoryPricingHint.title}</span>
                  <strong className={classes.kioskPriceHintValue}>{categoryPricingHint.value}</strong>
                </div>
              ) : null}
              <KioskNumericPad
                value={kioskPriceInput}
                suffix="€"
                onChange={setKioskPriceInput}
                onValidate={commitKioskPrice}
                onStepBack={goKioskWeight}
                onStepForward={commitKioskPrice}
                validateLabel="Valider et ajouter la ligne"
                testIdPrefix="cashflow-kiosk-price"
              />
              <div className={classes.kioskLinePhaseActions}>
                <Button type="button" variant="default" onClick={() => setKioskMicroPhase('weight')}>
                  Retour poids / quantité
                </Button>
              </div>
              <Button
                mt="md"
                onClick={commitKioskPrice}
                data-testid="cashflow-add-line"
              >
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
          <Button mt="md" onClick={() => onAdd()} data-testid="cashflow-add-line">
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
  const { options: methodOptions, loading: pmLoading, error: pmError } = useCaissePaymentMethodOptions(auth);
  const paymentMethodsReady = !pmLoading && pmError === null && methodOptions.length > 0;
  const envelope = useContextEnvelope();
  const liveRefresh = useLiveEnvelopeRefresh();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const [busy, setBusy] = useState(false);

  const financialCodes = useMemo(() => methodOptions.map((o) => o.code), [methodOptions]);

  useEffect(() => {
    const fromEnv = envelope.cashSessionId?.trim();
    if (fromEnv && !draft.cashSessionIdInput) {
      setCashSessionIdInput(fromEnv);
    }
  }, [envelope.cashSessionId, draft.cashSessionIdInput]);

  useEffect(() => {
    if (financialCodes.length === 0) return;
    if (draft.paymentMethod === 'free') return;
    if (!financialCodes.includes(draft.paymentMethod)) {
      setPaymentMethod(financialCodes[0]!);
    }
  }, [draft.paymentMethod, financialCodes]);

  const canSubmit =
    !stale &&
    draft.cashSessionIdInput.trim().length > 0 &&
    draft.lines.length > 0 &&
    draft.totalAmount > 0;
  const canSubmitSale = canSubmit && paymentMethodsReady;

  const saleContextBinding = useMemo(
    () => ({ siteId: envelope.siteId, cashSessionId: envelope.cashSessionId }),
    [envelope.siteId, envelope.cashSessionId],
  );

  const onSubmit = async () => {
    clearCashflowDraftSubmitError();
    let env: ContextEnvelopeStub = envelope;
    if (isEnvelopeStale(env) && liveRefresh) {
      const fresh = await liveRefresh.refreshEnvelope();
      if (fresh) {
        env = fresh;
      }
    }
    if (isEnvelopeStale(env)) {
      setCashflowDraftLocalSubmitError(CONTEXT_ENVELOPE_ACTION_BLOCKED_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      if (draft.activeHeldSaleId) {
        const res = await postFinalizeHeldSale(
          draft.activeHeldSaleId,
          {
            payment_method: draft.paymentMethod,
            ...buildBusinessTagPayload(draft.ticketBusinessTagKind, draft.ticketBusinessTagCustom),
          },
          auth,
          { contextBinding: saleContextBinding },
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
          ...buildBusinessTagPayload(l.businessTagKind ?? '', l.businessTagCustom ?? ''),
        })),
        total_amount: draft.totalAmount,
        donation: 0,
        payment_method: draft.paymentMethod,
        ...buildBusinessTagPayload(draft.ticketBusinessTagKind, draft.ticketBusinessTagCustom),
      };
      const res = await postCreateSale(body, auth, { contextBinding: saleContextBinding });
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
          <Text component="label" size="sm" fw={600} mt="md" display="block">
            Tag métier ticket (optionnel — Story 24.9)
            <select
              className={classes.nativeSelect}
              data-testid="cashflow-select-business-tag-ticket"
              value={draft.ticketBusinessTagKind}
              onChange={(e) => setTicketBusinessTags(e.currentTarget.value, draft.ticketBusinessTagCustom)}
            >
              {CASHFLOW_BUSINESS_TAG_OPTIONS.map((o) => (
                <option key={o.value || 'none'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Text>
          {draft.ticketBusinessTagKind === 'AUTRE' ? (
            <TextInput
              label="Précision du tag « Autre »"
              value={draft.ticketBusinessTagCustom}
              onChange={(e) => setTicketBusinessTags('AUTRE', e.currentTarget.value)}
              mt="xs"
              data-testid="cashflow-input-business-tag-custom"
            />
          ) : null}
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
          onChange={(e) => setPaymentMethod(e.target.value)}
          disabled={pmLoading || !paymentMethodsReady}
        >
          {methodOptions.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
          <option value="free">Gratuit / don</option>
        </select>
      </Text>
      {pmLoading ? (
        <Text size="sm" c="dimmed" mt="xs" data-testid="cashflow-nominal-pm-options-loading">
          Chargement des moyens de paiement…
        </Text>
      ) : null}
      {pmError ? (
        <Text size="sm" c="red" mt="xs" data-testid="cashflow-nominal-pm-options-error">
          {pmError}
        </Text>
      ) : null}
      <Text component="label" size="sm" fw={600} mt="md" display="block">
        Tag métier ticket (optionnel — Story 24.9)
        <select
          className={classes.nativeSelect}
          data-testid="cashflow-select-business-tag-ticket"
          value={draft.ticketBusinessTagKind}
          onChange={(e) => setTicketBusinessTags(e.currentTarget.value, draft.ticketBusinessTagCustom)}
        >
          {CASHFLOW_BUSINESS_TAG_OPTIONS.map((o) => (
            <option key={o.value || 'none'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Text>
      {draft.ticketBusinessTagKind === 'AUTRE' ? (
        <TextInput
          label="Précision du tag « Autre »"
          value={draft.ticketBusinessTagCustom}
          onChange={(e) => setTicketBusinessTags('AUTRE', e.currentTarget.value)}
          mt="xs"
          data-testid="cashflow-input-business-tag-custom"
        />
      ) : null}
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
        disabled={!canSubmitSale || busy}
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

function KioskUnifiedSaleLayout(): ReactNode {
  return (
    <div className={classes.kioskUnifiedLayout} data-testid="cashflow-kiosk-unified-layout">
      <LinesStep kioskCategoryWorkspace kioskSurface />
      <PaymentStep kioskSurface wide />
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
  const session = useAuthSession();
  const envelope = useContextEnvelope();
  const draft = useCashflowDraft();
  const entry = useCashflowEntryBlock();

  useEffect(() => {
    const uid = session.userId?.trim() || 'anonymous';
    return attachCashflowDraftSessionPersistence(uid);
  }, [session.userId]);
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

  /** Epic 24 — entrée hub opérations spéciales depuis la caisse : session résolue + ticket vide uniquement. */
  const sessionIdResolvedForSpecialOps = useMemo(() => {
    const a = draft.cashSessionIdInput.trim();
    const b = envelope.cashSessionId?.trim() ?? '';
    const c = serverSession?.id?.trim() ?? '';
    return a || b || c;
  }, [draft.cashSessionIdInput, envelope.cashSessionId, serverSession?.id]);

  const canUseSpecialOpsHubNav = useMemo(
    () =>
      envelope.permissions.permissionKeys.some((k) =>
        [
          PERMISSION_CASHFLOW_NOMINAL,
          PERMISSION_CASHFLOW_VIRTUAL,
          PERMISSION_CASHFLOW_DEFERRED,
        ].includes(k),
      ),
    [envelope.permissions.permissionKeys],
  );

  const ticketViergePourOpsSpeciales =
    draft.lines.length === 0 && !draft.activeHeldSaleId && draft.totalAmount <= 0;

  const specialOpsNavDepuisCaisseActif =
    Boolean(sessionIdResolvedForSpecialOps) &&
    ticketViergePourOpsSpeciales &&
    draft.widgetDataState !== 'DATA_STALE';

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
      {!kioskSaleSurface &&
      (canUseSpecialOpsHubNav ||
        envelope.permissions.permissionKeys.includes(PERMISSION_CASHFLOW_REFUND)) ? (
        <Group justify="flex-end" mb="sm" wrap="wrap">
          {canUseSpecialOpsHubNav ? (
            <Tooltip
              label={
                !sessionIdResolvedForSpecialOps
                  ? 'Ouvrez ou résolvez une session caisse pour accéder aux opérations spéciales.'
                  : draft.widgetDataState === 'DATA_STALE'
                    ? 'Actualisez les données du ticket (DATA_STALE) avant de poursuivre.'
                    : !ticketViergePourOpsSpeciales
                      ? 'Disponible uniquement avec un ticket vide : aucune ligne, pas de reprise « en attente ».'
                      : ''
              }
              disabled={specialOpsNavDepuisCaisseActif}
            >
              <span>
                <Button
                  variant="light"
                  size="sm"
                  data-testid="cashflow-nominal-open-special-ops-hub"
                  disabled={!specialOpsNavDepuisCaisseActif}
                  onClick={() => spaNavigateTo('/caisse/operations-speciales')}
                >
                  Opérations spéciales
                </Button>
              </span>
            </Tooltip>
          ) : null}
          {envelope.permissions.permissionKeys.includes(PERMISSION_CASHFLOW_REFUND) ? (
            <Button
              variant="light"
              size="sm"
              data-testid="caisse-open-refund"
              onClick={() => spaNavigateTo('/caisse/remboursement')}
            >
              Remboursement
            </Button>
          ) : null}
        </Group>
      ) : null}
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
            onOpenRefund={
              envelope.permissions.permissionKeys.includes(PERMISSION_CASHFLOW_REFUND)
                ? () => spaNavigateTo('/caisse/remboursement')
                : undefined
            }
          />
          <SaleKioskUnifiedLiveKpiStrip
            operatingMode={draft.operatingMode ?? 'real'}
            lastTicketAmountOverride={draft.totalAmount > 0 ? draft.totalAmount : 0}
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
          {canUseSpecialOpsHubNav ? (
            <Group justify="flex-end" mt="xs" wrap="wrap">
              <Tooltip
                label={
                  !sessionIdResolvedForSpecialOps
                    ? 'Ouvrez ou résolvez une session caisse pour accéder aux opérations spéciales.'
                    : draft.widgetDataState === 'DATA_STALE'
                      ? 'Actualisez les données du ticket (DATA_STALE) avant de poursuivre.'
                      : !ticketViergePourOpsSpeciales
                        ? 'Disponible uniquement avec un ticket vide : aucune ligne, pas de reprise « en attente ».'
                        : ''
                }
                disabled={specialOpsNavDepuisCaisseActif}
              >
                <span>
                  <Button
                    variant="light"
                    size="sm"
                    data-testid="cashflow-kiosk-open-special-ops-hub"
                    disabled={!specialOpsNavDepuisCaisseActif}
                    onClick={() => spaNavigateTo('/caisse/operations-speciales')}
                  >
                    Opérations spéciales
                  </Button>
                </span>
              </Tooltip>
            </Group>
          ) : null}
        </div>
      ) : null}
      {kioskSaleSurface ? (
        <div className={classes.kioskFlowWrap}>
          <KioskUnifiedSaleLayout />
        </div>
      ) : (
        <>
          <div>
            <FlowRenderer
              flowId="cashflow-nominal"
              panels={panels}
              activeIndex={activeIndex}
              onActiveIndexChange={setActiveIndex}
              keepMounted
              presentation="default"
            />
          </div>
          <div className={classes.navRow}>
            <Button variant="default" onClick={onPrev} disabled={activeIndex === 0} data-testid="cashflow-step-prev">
              Précédent
            </Button>
            <Button onClick={onNext} disabled={activeIndex >= panels.length - 1} data-testid="cashflow-step-next">
              Suivant
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
