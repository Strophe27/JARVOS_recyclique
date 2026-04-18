import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  LoadingOverlay,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { Calendar, PlayCircle, Wallet } from 'lucide-react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { postOpenCashSession, resolveCashSessionOpeningIds } from '../../api/cash-session-client';
import { recycliqueClientFailureFromSalesHttp, type RecycliqueClientFailure } from '../../api/recyclique-api-error';
import { PERMISSION_CASHFLOW_REFUND } from '../../app/auth/default-demo-auth-adapter';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import {
  setCashflowOperatingMode,
  setCashSessionIdInput,
  useCashflowDraft,
} from './cashflow-draft-store';
import { CaisseSessionCloseSurface } from './CaisseSessionCloseSurface';
import { useCashRegistersStatus } from './use-cash-registers-status';
import { useCaisseServerCurrentSession } from './use-caisse-server-current-session';
import classes from './CaisseBrownfieldDashboardWidget.module.css';

function pathnameNoTrailingSlash(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

/**
 * Story 13.2 — préfixes URL `session/open` alignés sur `OpenCashSession.tsx` legacy (`basePath` virtuel / différé / réel).
 */
function legacyCashRegisterSessionOpenBase(): string {
  if (typeof window === 'undefined') return '/cash-register/session/open';
  const p = pathnameNoTrailingSlash(window.location.pathname);
  if (p.startsWith('/cash-register/deferred')) return '/cash-register/deferred/session/open';
  if (p.startsWith('/cash-register/virtual')) return '/cash-register/virtual/session/open';
  return '/cash-register/session/open';
}

/** Story 13.6 — après POST d’ouverture, même cible que le legacy (`OpenCashSession` → `…/sale`). */
function legacyCashRegisterSalePathFromPathname(pathname: string): string {
  const p = pathnameNoTrailingSlash(pathname);
  if (p.startsWith('/cash-register/deferred')) return '/cash-register/deferred/sale';
  if (p.startsWith('/cash-register/virtual')) return '/cash-register/virtual/sale';
  return '/cash-register/sale';
}

/** Aligné `OpenCashSession.tsx` (`basePath` / route) — source de vérité pour le périmètre formulaire. */
function sessionOpenBranchFromPath(pathname: string): 'real' | 'virtual' | 'deferred' {
  const p = pathnameNoTrailingSlash(pathname);
  if (p.startsWith('/cash-register/deferred')) return 'deferred';
  if (p.startsWith('/cash-register/virtual')) return 'virtual';
  return 'real';
}

/** `register_id` dans la query — même source que `syncFromLocation` (évite premier rendu vide avant effet). */
function registerIdFromWindowSearch(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('register_id')?.trim() ?? '';
}

/** Permissions brownfield modes caisse (legacy — alignement `recyclique-1.4.4` / groupes). */
const PERM_CASH_REAL = 'caisse.access';
const PERM_CASH_VIRTUAL = 'caisse.virtual.access';
const PERM_CASH_DEFERRED = 'caisse.deferred.access';

function widgetString(
  props: Readonly<Record<string, unknown>> | undefined,
  key: string,
  fallback: string,
): string {
  const v = props?.[key];
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : fallback;
}

function widgetBool(props: Readonly<Record<string, unknown>> | undefined, key: string): boolean {
  return props?.[key] === true;
}

type OpeningMode = 'real' | 'virtual' | 'deferred';

/** Lignes optionnelles du manifeste CREOS (`register_cards`) — pas de vérité métier inventée côté widget. */
type RegisterCardSpec = {
  readonly id: string;
  readonly name: string;
  readonly location?: string | null;
};

function parseRegisterCardsFromProps(
  props: Readonly<Record<string, unknown>> | undefined,
): RegisterCardSpec[] | null {
  /** Ingest CREOS : `register_cards` JSON → `registerCards` (camelCase). */
  const raw = props?.registerCards ?? props?.register_cards;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: RegisterCardSpec[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object' && 'id' in item && 'name' in item) {
      const id = String((item as { id: unknown }).id).trim();
      const name = String((item as { name: unknown }).name).trim();
      if (id && name) {
        out.push({
          id,
          name,
          location:
            typeof (item as { location?: unknown }).location === 'string'
              ? (item as { location: string }).location
              : null,
        });
      }
    }
  }
  return out.length > 0 ? out : null;
}

function HubRegisterCard({
  reg,
  isOpen,
  onOpen,
  onResume,
}: {
  readonly reg: RegisterCardSpec;
  readonly isOpen: boolean;
  readonly onOpen: (id: string) => void;
  readonly onResume: (id: string) => void;
}) {
  const hasLocation = reg.location != null && String(reg.location).trim() !== '';
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder data-testid="caisse-hub-register-card">
      <Group justify="space-between" align="flex-start" mb="xs" wrap="nowrap">
        <div>
          <Title order={4}>{reg.name}</Title>
          {hasLocation ? (
            <Text size="md" c="dimmed" mt={4} style={{ fontWeight: 'normal', fontSize: '0.95rem', color: '#666' }}>
              {reg.location}
            </Text>
          ) : null}
        </div>
        <Badge color={isOpen ? 'green' : 'gray'}>{isOpen ? 'Ouverte' : 'Fermée'}</Badge>
      </Group>
      <Group justify="flex-end">
        {isOpen ? (
          <Button color="green" onClick={() => onResume(reg.id)} disabled={!reg.id}>
            Reprendre
          </Button>
        ) : (
          <Button onClick={() => onOpen(reg.id)} disabled={!reg.id}>
            Ouvrir
          </Button>
        )}
      </Group>
    </Card>
  );
}

/**
 * Story 6.1 — entrée `/caisse` brownfield : tableau de poste (pas un alias wizard seul).
 * Poste : `ContextEnvelope` (`activeRegisterId` / `workstationId`), puis `register_id` de GET session courante.
 */
export function CaisseBrownfieldDashboardWidget(_props: RegisteredWidgetProps): ReactNode {
  const wp = _props.widgetProps ?? {};
  const isSessionOpenSurface = wp.presentation_surface === 'session_open';
  const isSessionCloseSurface = wp.presentation_surface === 'session_close';
  /** Story 13.2 — surface `session_open` (alias CREOS). */
  const legacySessionOpenForm = isSessionOpenSurface;
  /** Hub `/caisse` uniquement (Story 13.1) — pas de formulaire d’ouverture ni CTA vente/clôture dans ce bloc. */
  const isCaisseHubCompact = wp.presentation_surface === 'caisse_hub';
  const hideRegisterSelectionRow = widgetBool(wp, 'hide_register_selection_row');
  const hideVariantEntrypointCards = widgetBool(wp, 'hide_variant_entrypoint_cards');
  const showCancelToCaisseHub = widgetBool(wp, 'show_cancel_to_caisse_hub');
  const workspaceHeading = widgetString(wp, 'workspace_heading', 'Sélection du Poste de Caisse');
  const workspaceIntro = widgetString(
    wp,
    'workspace_intro',
    'Choisissez un poste de caisse, vérifiez son statut, puis ouvrez une session pour accéder à la vente.',
  );
  const modesSectionTitle = widgetString(
    wp,
    'modes_section_title',
    'Caisse virtuelle, saisie différée et poste réel (permissions)',
  );
  const fundFieldLabel = widgetString(wp, 'fund_field_label', 'Fond de caisse (€)');
  const submitSessionLabel = widgetString(wp, 'submit_session_label', 'Ouvrir la session');
  const registerRowHeading = widgetString(wp, 'register_row_heading', 'Poste de caisse');
  const openRegisterCtaLabel = widgetString(wp, 'open_register_cta_label', 'Ouvrir');
  /** Story 13.6 — alias kiosque `…/sale` : retirer le chrome hub du même `page_key` (reload / deep link). */
  const saleKioskMinimal = widgetBool(wp, 'sale_kiosk_minimal_dashboard');

  const draft = useCashflowDraft();
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const { session: serverSession, loading: serverSessionLoading, failure: serverSessionFailure, refresh } =
    useCaisseServerCurrentSession(auth);
  const authSession = auth.getSession();
  const keys = envelope.permissions.permissionKeys;
  const [openingMode, setOpeningMode] = useState<OpeningMode>('real');
  const [registerIdInput, setRegisterIdInput] = useState(() =>
    isSessionOpenSurface ? registerIdFromWindowSearch() : '',
  );
  const [initialAmountInput, setInitialAmountInput] = useState<number | ''>(() =>
    (_props.widgetProps ?? {}).presentation_surface === 'session_open' ? '' : 20,
  );
  const [openedAtInput, setOpenedAtInput] = useState('');
  const [openingBusy, setOpeningBusy] = useState(false);
  const [openingFailure, setOpeningFailure] = useState<RecycliqueClientFailure | null>(null);
  const [openedSessionId, setOpenedSessionId] = useState('');
  const [openedRegisterId, setOpenedRegisterId] = useState('');
  const prevSessionOpenRouteKeyRef = useRef<string>('');
  const [urlBranch, setUrlBranch] = useState<'real' | 'virtual' | 'deferred'>(() =>
    typeof window !== 'undefined' ? sessionOpenBranchFromPath(window.location.pathname) : 'real',
  );

  const syncFromLocation = useCallback(() => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname;
    setUrlBranch(sessionOpenBranchFromPath(pathname));
    const rid = registerIdFromWindowSearch();
    if (rid) setRegisterIdInput(rid);
    if (!isSessionOpenSurface) return;
    const branch = sessionOpenBranchFromPath(pathname);
    setOpeningMode(branch === 'deferred' ? 'deferred' : branch === 'virtual' ? 'virtual' : 'real');
    const routeKey = `${pathname}${window.location.search}`;
    if (prevSessionOpenRouteKeyRef.current !== routeKey) {
      prevSessionOpenRouteKeyRef.current = routeKey;
      setInitialAmountInput('');
      setOpenedAtInput('');
    }
  }, [isSessionOpenSurface]);

  useLayoutEffect(() => {
    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [syncFromLocation]);

  const hasReal = keys.includes(PERM_CASH_REAL);
  const hasVirtual = keys.includes(PERM_CASH_VIRTUAL);
  const hasDeferred = keys.includes(PERM_CASH_DEFERRED);

  const registerCardsFromManifest = useMemo(() => parseRegisterCardsFromProps(wp), [wp]);
  /** CREOS explicite : pas d’appel redondant ; sinon même vérité que le legacy (`GET /v1/cash-registers/status`). */
  const fetchRegistersFromApi = isCaisseHubCompact && hasReal && !registerCardsFromManifest?.length;
  const {
    rows: apiRegisterRows,
    loading: apiRegistersLoading,
    failure: apiRegistersFailure,
  } = useCashRegistersStatus(auth, fetchRegistersFromApi);

  const scrollToSessionHint = useCallback(() => {
    document.getElementById('caisse-session-open-hint')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scrollToSale = useCallback(() => {
    document.getElementById('caisse-sale-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const goToClose = useCallback(() => {
    if (typeof window === 'undefined') return;
    const p = pathnameNoTrailingSlash(window.location.pathname);
    let base = '/cash-register';
    if (p.startsWith('/cash-register/deferred')) base = '/cash-register/deferred';
    else if (p.startsWith('/cash-register/virtual')) base = '/cash-register/virtual';
    spaNavigateTo(`${base}/session/close`);
  }, []);

  const envPoste = envelope.activeRegisterId?.trim() || envelope.workstationId?.trim() || '';
  const serverPoste = (serverSession?.register_id ?? '').trim();
  const resolvedPosteId = envPoste || serverPoste || openedRegisterId.trim();
  const posteLabel =
    resolvedPosteId ||
    (serverSessionLoading ? 'Résolution poste serveur…' : '— (non résolu par le serveur)');

  const envSessionId = envelope.cashSessionId?.trim() ?? '';
  const serverSessionId = serverSession?.id?.trim() ?? '';
  const draftSessionId = draft.cashSessionIdInput?.trim() ?? '';
  const resolvedSessionId =
    envSessionId || serverSessionId || openedSessionId.trim() || draftSessionId;
  const sessionLabel =
    serverSessionLoading && !resolvedSessionId
      ? 'Résolution session serveur…'
      : resolvedSessionId || 'Session non ouverte côté serveur';
  const registerIdValue = registerIdInput.trim() || resolvedPosteId;
  const registerStatusBadge = useMemo(() => {
    if (resolvedSessionId) return 'OUVERTE';
    if (serverSessionLoading && !resolvedPosteId && !registerIdInput.trim()) return '…';
    return 'FERMÉE';
  }, [resolvedSessionId, serverSessionLoading, resolvedPosteId, registerIdInput]);

  const navigateToLegacySessionOpen = useCallback(() => {
    const id = registerIdInput.trim() || resolvedPosteId.trim();
    if (!id) return;
    const base = legacyCashRegisterSessionOpenBase();
    spaNavigateTo(`${base}?register_id=${encodeURIComponent(id)}`);
  }, [registerIdInput, resolvedPosteId]);

  const canGoToSale = resolvedSessionId.length > 0;
  const openingBlockedReason = useMemo(() => {
    if (resolvedSessionId) {
      return 'Une session est déjà ouverte pour cette opératrice.';
    }
    if (!authSession.authenticated) {
      return 'Authentification requise avant ouverture de session.';
    }
    if (!envelope.siteId?.trim()) {
      return 'Site actif non résolu.';
    }
    if (!registerIdValue.trim()) {
      return 'Sélectionnez un poste de caisse avant l’ouverture.';
    }
    if (initialAmountInput === '') {
      return 'Saisissez le fond de caisse initial.';
    }
    if (typeof initialAmountInput !== 'number' || !Number.isFinite(initialAmountInput) || initialAmountInput < 0) {
      return 'Le fond de caisse doit être un montant positif ou nul.';
    }
    if (openingMode === 'deferred') {
      const d = openedAtInput.trim();
      if (urlBranch === 'deferred') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          return 'Renseignez la date du cahier.';
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sel = new Date(`${d}T12:00:00`);
        sel.setHours(0, 0, 0, 0);
        if (sel > today) {
          return 'La date du cahier ne peut pas être dans le futur.';
        }
      } else if (d.length === 0) {
        return 'Renseignez une date/heure réelle pour la saisie différée.';
      }
    }
    return null;
  }, [
    authSession.authenticated,
    envelope.siteId,
    initialAmountInput,
    openedAtInput,
    openingMode,
    registerIdValue,
    resolvedSessionId,
    urlBranch,
  ]);

  const submitOpening = useCallback(async () => {
    if (openingBlockedReason) return;
    setOpeningBusy(true);
    setOpeningFailure(null);
    try {
      const resolvedIds = await resolveCashSessionOpeningIds(auth, envelope.siteId);
      if (!resolvedIds.ok) {
        setOpeningFailure({
          httpStatus: 422,
          message: resolvedIds.message,
          retryable: false,
        });
        return;
      }
      const openedAtIso =
        openingMode === 'deferred'
          ? urlBranch === 'deferred'
            ? new Date(`${openedAtInput.trim()}T12:00:00`).toISOString()
            : new Date(openedAtInput).toISOString()
          : undefined;
      const result = await postOpenCashSession(
        {
          operator_id: resolvedIds.operatorId,
          site_id: resolvedIds.siteId,
          register_id: registerIdValue.trim(),
          initial_amount: Number(initialAmountInput),
          opened_at: openedAtIso,
        },
        auth,
      );
      if (!result.ok) {
        setOpeningFailure(recycliqueClientFailureFromSalesHttp(result));
        return;
      }
      setOpenedSessionId(result.session.id);
      setOpenedRegisterId((result.session.register_id ?? registerIdValue).trim());
      setCashSessionIdInput(result.session.id);
      setCashflowOperatingMode(
        openingMode === 'deferred' ? 'deferred' : openingMode === 'virtual' ? 'virtual' : 'real',
      );
      refresh();
      /**
       * Story 13.6 — parité legacy : ne pas laisser l’opératrice sur `…/session/open` avec formulaire + alerte succès
       * (état hybride) alors que la session est ouverte côté API ; atterrissage direct sur le poste de vente nominal.
       */
      if (typeof window !== 'undefined' && isSessionOpenSurface) {
        spaNavigateTo(legacyCashRegisterSalePathFromPathname(window.location.pathname));
      }
    } finally {
      setOpeningBusy(false);
    }
  }, [
    auth,
    envelope.siteId,
    initialAmountInput,
    openedAtInput,
    isSessionOpenSurface,
    openingBlockedReason,
    openingMode,
    refresh,
    registerIdValue,
    urlBranch,
  ]);

  const navigateCancelSessionOpen = useCallback(() => {
    spaNavigateTo('/caisse');
  }, []);

  /**
   * Parité legacy sur `session_open` : chrome debug/hub masqué tant que la session n’est pas ouverte.
   * Après clic hub (`?register_id=`) : idem. Sur poste réel nominal (`/cash-register/session/open`), même sans
   * `register_id` (deep link / reload), aligner le legacy 4445 — pas l’atelier virtuel/différé sans poste.
   */
  const legacySessionOpenBareForm =
    legacySessionOpenForm &&
    !resolvedSessionId &&
    (Boolean(registerIdInput.trim()) || urlBranch === 'real');

  /** Masquer le champ UUID poste seulement quand le poste est déjà fourni (hub / query). */
  const hideRegisterFieldSessionOpen =
    legacySessionOpenForm && Boolean(registerIdInput.trim()) && !resolvedSessionId;

  /** Postes réels : manifeste CREOS (`register_cards`) si présent, sinon lignes OpenAPI `GET /v1/cash-registers/status` (parité legacy `/caisse`). */
  const hubRegisterCards: RegisterCardSpec[] = useMemo(() => {
    if (registerCardsFromManifest?.length) return registerCardsFromManifest;
    return apiRegisterRows.map((r) => ({
      id: r.id,
      name: r.name,
      location: r.location,
    }));
  }, [registerCardsFromManifest, apiRegisterRows]);

  const visibleRealCards = hasReal ? hubRegisterCards : [];

  const wprops = wp as Record<string, unknown>;
  const showVirtualSpecial =
    hasVirtual &&
    wprops.showVirtualSpecialCard !== false &&
    wprops.show_virtual_special_card !== false;
  const showDeferredSpecial =
    hasDeferred &&
    wprops.showDeferredSpecialCard !== false &&
    wprops.show_deferred_special_card !== false;

  const firstRegisterIdForVariants = useMemo(() => {
    const first = hubRegisterCards.find((c) => c.id.trim())?.id?.trim();
    return first ?? resolvedPosteId.trim() ?? registerIdInput.trim();
  }, [hubRegisterCards, resolvedPosteId, registerIdInput]);

  /** Legacy `CashRegisterDashboard` : `basePath` = `/cash-register` (hub `/caisse`) ou `/cash-register/virtual` (hub virtuel). */
  const cashRegisterHubBasePath = widgetString(wp, 'cash_register_hub_base_path', '/cash-register');

  const handleHubOpenRegister = useCallback(
    (id: string) => {
      setRegisterIdInput(id);
      spaNavigateTo(
        `${cashRegisterHubBasePath}/session/open?register_id=${encodeURIComponent(id)}`,
      );
    },
    [cashRegisterHubBasePath],
  );

  const handleHubResumeRegister = useCallback(
    (id: string) => {
      setRegisterIdInput(id);
      spaNavigateTo(`${cashRegisterHubBasePath}/sale`);
    },
    [cashRegisterHubBasePath],
  );

  const handleVirtualSimuler = useCallback(() => {
    setCashflowOperatingMode('virtual');
    if (firstRegisterIdForVariants) {
      setRegisterIdInput(firstRegisterIdForVariants);
      spaNavigateTo(
        `/cash-register/virtual/session/open?register_id=${encodeURIComponent(firstRegisterIdForVariants)}`,
      );
    } else {
      spaNavigateTo('/cash-register/virtual/session/open');
    }
  }, [firstRegisterIdForVariants]);

  const handleDeferredAcceder = useCallback(() => {
    setCashflowOperatingMode('deferred');
    if (firstRegisterIdForVariants) {
      setRegisterIdInput(firstRegisterIdForVariants);
      spaNavigateTo(
        `/cash-register/deferred/session/open?register_id=${encodeURIComponent(firstRegisterIdForVariants)}`,
      );
    } else {
      spaNavigateTo('/cash-register/deferred/session/open');
    }
  }, [firstRegisterIdForVariants]);

  const isRegisterCardOpen = useCallback(
    (regId: string) => {
      if (!regId.trim()) return false;
      const sid = serverSession?.register_id?.trim();
      if (sid && sid === regId.trim()) return true;
      const row = apiRegisterRows.find((r) => r.id.trim() === regId.trim());
      return Boolean(row?.is_open);
    },
    [serverSession?.register_id, apiRegisterRows],
  );

  if (isCaisseHubCompact) {
    return (
      <Stack
        gap="md"
        className={classes.root}
        data-testid="caisse-brownfield-dashboard"
        data-runtime-status={envelope.runtimeStatus}
      >
        <Group justify="space-between" align="center" wrap="wrap">
          <Title order={2} data-testid="caisse-workspace-heading">
            {workspaceHeading}
          </Title>
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
        <Text size="sm" c="dimmed">
          {workspaceIntro}
        </Text>

        {hasReal && apiRegistersFailure ? (
          <Alert color="orange" variant="light" data-testid="caisse-hub-registers-status-error">
            <Text size="sm">
              Impossible de charger la liste des postes (GET /v1/cash-registers/status) : {apiRegistersFailure.message}
            </Text>
          </Alert>
        ) : null}

        {hasReal && visibleRealCards.length === 0 && !fetchRegistersFromApi && !registerCardsFromManifest?.length ? (
          <Alert color="gray" variant="light" data-testid="caisse-hub-no-backend-register-list">
            <Text size="sm">
              Aucune liste de postes n’est fournie par le manifeste CREOS (`register_cards`) : activez une liste
              reviewable dans le PageManifest ou exposez les postes via l’API.
            </Text>
          </Alert>
        ) : null}

        {hasReal &&
        visibleRealCards.length === 0 &&
        fetchRegistersFromApi &&
        !apiRegistersLoading &&
        !apiRegistersFailure ? (
          <Alert color="gray" variant="light" data-testid="caisse-hub-empty-register-list">
            <Text size="sm">
              Aucun poste de caisse actif retourné par le serveur pour votre périmètre. Vérifiez la configuration des
              postes (admin) ou votre rattachement site.
            </Text>
          </Alert>
        ) : null}

        {!hasReal && !hasVirtual && !hasDeferred ? (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text c="dimmed" ta="center">
              Vous n&apos;avez accès à aucune caisse. Contactez un administrateur pour obtenir les permissions
              nécessaires.
            </Text>
          </Card>
        ) : null}

        <Box
          pos="relative"
          data-testid="caisse-legacy-register-row"
          data-resolved-poste-id={resolvedPosteId || ''}
          data-resolved-session-id={resolvedSessionId || ''}
          data-server-poste-loading={
            serverSessionLoading && !resolvedPosteId && !registerIdInput.trim() ? 'true' : 'false'
          }
          data-server-session-loading={serverSessionLoading ? 'true' : 'false'}
          aria-busy={hasReal && fetchRegistersFromApi && apiRegistersLoading ? true : undefined}
        >
          <LoadingOverlay
            visible={Boolean(hasReal && fetchRegistersFromApi && apiRegistersLoading)}
            zIndex={400}
            data-testid="caisse-hub-registers-loading-overlay"
          />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
            {visibleRealCards.map((reg) => (
              <HubRegisterCard
                key={reg.id || reg.name}
                reg={reg}
                isOpen={isRegisterCardOpen(reg.id)}
                onOpen={handleHubOpenRegister}
                onResume={handleHubResumeRegister}
              />
            ))}
            {showVirtualSpecial ? (
              <Card
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                data-testid="caisse-hub-card-virtual"
                style={{
                  borderStyle: 'dashed',
                  borderColor: '#868e96',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <Group justify="space-between" mb="xs" wrap="nowrap">
                  <Group gap="xs">
                    <PlayCircle size={20} color="#868e96" />
                    <Title order={4} c="dimmed">
                      Caisse Virtuelle
                    </Title>
                  </Group>
                  <Badge color="blue" variant="light">
                    Simulation
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed" mb="sm">
                  Mode d&apos;entraînement sans impact sur les données réelles
                </Text>
                <Text size="xs" c="dimmed" mb="md" style={{ fontStyle: 'italic' }}>
                  Hérite des options de workflow de la caisse source sélectionnée
                </Text>
                <Group justify="flex-end">
                  <Button
                    color="blue"
                    variant="light"
                    leftSection={<PlayCircle size={16} />}
                    onClick={handleVirtualSimuler}
                  >
                    Simuler
                  </Button>
                </Group>
              </Card>
            ) : null}
            {showDeferredSpecial ? (
              <Card
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                data-testid="caisse-hub-card-deferred"
                style={{
                  borderStyle: 'solid',
                  borderColor: '#fbbf24',
                  backgroundColor: '#fffbeb',
                }}
              >
                <Group justify="space-between" mb="xs" wrap="nowrap">
                  <Group gap="xs">
                    <Calendar size={20} color="#fbbf24" />
                    <Title order={4} style={{ color: '#92400e' }}>
                      Saisie différée
                    </Title>
                  </Group>
                  <Badge color="orange" variant="light" size="sm">
                    ADMIN
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed" mb="sm">
                  Saisir des ventes d&apos;anciens cahiers avec leur date réelle de vente
                </Text>
                <Text size="xs" c="dimmed" mb="md" style={{ fontStyle: 'italic' }}>
                  Hérite des options de workflow de la caisse source sélectionnée
                </Text>
                <Group justify="flex-end">
                  <Button
                    color="orange"
                    variant="subtle"
                    leftSection={<Calendar size={16} />}
                    onClick={handleDeferredAcceder}
                    style={{ color: '#92400e', borderColor: '#fbbf24' }}
                  >
                    Accéder
                  </Button>
                </Group>
              </Card>
            ) : null}
          </SimpleGrid>
        </Box>
      </Stack>
    );
  }

  if (isSessionCloseSurface) {
    const salePath = widgetString(wp, 'session_close_sale_path', '/cash-register/sale');
    return (
      <Stack
        gap="md"
        className={classes.root}
        data-testid="caisse-brownfield-dashboard"
        data-runtime-status={envelope.runtimeStatus}
      >
        <CaisseSessionCloseSurface salePath={salePath} />
      </Stack>
    );
  }

  /** Sur kiosque vente avec session active, le chrome Poste/Session/Site est porté par `CashflowNominalWizard` — éviter le double bandeau. */
  const showPosteSessionSitePaper = !saleKioskMinimal && !isCaisseHubCompact && !legacySessionOpenBareForm;
  /** Kiosque vente (`…/sale`) : le chrome d’aide / ouverture est désormais porté par le shell kiosque, pas par le dashboard brownfield. */
  const showFullOpeningPaper = !saleKioskMinimal && !isCaisseHubCompact && isSessionOpenSurface;
  const showSaleKioskSessionStrip =
    saleKioskMinimal && resolvedSessionId.length > 0 && !isSessionOpenSurface;
  const showDashboardChromeAfterOpening = !saleKioskMinimal && !isCaisseHubCompact && !legacySessionOpenBareForm;
  const showKpiStrip = !isCaisseHubCompact && !legacySessionOpenBareForm && !saleKioskMinimal;

  return (
    <Stack
      gap="md"
      className={classes.root}
      data-testid="caisse-brownfield-dashboard"
      data-runtime-status={envelope.runtimeStatus}
    >
      {!isSessionOpenSurface && !saleKioskMinimal ? (
        <div data-testid="caisse-workspace-heading-block">
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
            <div>
              <Title order={2} data-testid="caisse-workspace-heading">
                {workspaceHeading}
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                {workspaceIntro}
              </Text>
            </div>
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
        </div>
      ) : null}

      {!hideRegisterSelectionRow && !saleKioskMinimal ? (
        <Paper
          withBorder
          p="sm"
          radius="md"
          data-testid="caisse-legacy-register-row"
          data-resolved-poste-id={resolvedPosteId || ''}
          data-resolved-session-id={resolvedSessionId || ''}
          data-server-poste-loading={serverSessionLoading && !resolvedPosteId && !registerIdInput.trim() ? 'true' : 'false'}
          data-server-session-loading={serverSessionLoading ? 'true' : 'false'}
        >
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Text size="xs" c="dimmed">
                {registerRowHeading}
              </Text>
              <Text size="sm" fw={600}>
                {posteLabel}
              </Text>
            </div>
            <Group gap="xs">
              <Badge
                color={resolvedSessionId ? 'green' : 'gray'}
                variant={resolvedSessionId ? 'filled' : 'light'}
                data-testid="caisse-register-status-badge"
              >
                {registerStatusBadge}
              </Badge>
              <Button
                type="button"
                size="sm"
                onClick={navigateToLegacySessionOpen}
                disabled={!registerIdValue.trim()}
                data-testid="caisse-open-register-session"
              >
                {openRegisterCtaLabel}
              </Button>
            </Group>
          </Group>
        </Paper>
      ) : null}

      {!isSessionOpenSurface && !saleKioskMinimal ? (
        <div data-testid="caisse-mode-badges">
          <Text size="xs" fw={600} mb={4}>
            {modesSectionTitle}
          </Text>
          <Group gap="xs">
            <Badge
              color={hasReal ? 'green' : 'gray'}
              variant={hasReal ? 'filled' : 'light'}
              data-testid="caisse-mode-real"
            >
              Réel {hasReal ? '' : '(permission absente)'}
            </Badge>
            <Badge
              color={hasVirtual ? 'teal' : 'gray'}
              variant={hasVirtual ? 'filled' : 'light'}
              data-testid="caisse-mode-virtual"
            >
              Virtuel {hasVirtual ? '' : '(permission absente)'}
            </Badge>
            <Badge
              color={hasDeferred ? 'blue' : 'gray'}
              variant={hasDeferred ? 'filled' : 'light'}
              data-testid="caisse-mode-deferred"
            >
              Différé {hasDeferred ? '' : '(permission absente)'}
            </Badge>
          </Group>
        </div>
      ) : null}

      {!hideVariantEntrypointCards && !saleKioskMinimal ? (
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm" data-testid="caisse-variant-entrypoints">
          <Paper withBorder p="sm" radius="md" data-testid="caisse-entry-real">
            <Text size="sm" fw={600}>
              Réel
            </Text>
            <Text size="sm" c="dimmed">
              Poste physique standard. Même cadre brownfield, mêmes blocages contexte / site / session avant mutation.
            </Text>
          </Paper>
          <Paper withBorder p="sm" radius="md" data-testid="caisse-entry-virtual">
            <Text size="sm" fw={600}>
              Caisse virtuelle
            </Text>
            <Text size="sm" c="dimmed">
              Mode simulation visible dès l’entrée. Il réemploie le même workspace et les mêmes garde-fous serveur.
            </Text>
          </Paper>
          <Paper withBorder p="sm" radius="md" data-testid="caisse-entry-deferred">
            <Text size="sm" fw={600}>
              Saisie différée
            </Text>
            <Text size="sm" c="dimmed">
              Saisie a posteriori : la date réelle d’ouverture / vente reste portée par la session côté serveur.
            </Text>
          </Paper>
        </SimpleGrid>
      ) : null}

      {showPosteSessionSitePaper ? (
      <Paper withBorder p="sm" radius="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <div
            data-testid="caisse-dash-poste"
            data-resolved-poste-id={resolvedPosteId || ''}
            data-server-poste-loading={serverSessionLoading && !resolvedPosteId ? 'true' : 'false'}
          >
            <Text size="xs" c="dimmed">
              Poste
            </Text>
            <Text size="sm" fw={500}>
              {posteLabel}
            </Text>
          </div>
          <div
            data-testid="caisse-dash-session"
            data-server-session-loading={serverSessionLoading ? 'true' : 'false'}
            data-resolved-session-id={resolvedSessionId || ''}
          >
            <Text size="xs" c="dimmed">
              Session
            </Text>
            <Text size="sm" fw={500}>
              {sessionLabel}
            </Text>
            {serverSessionFailure && !resolvedSessionId ? (
              <Text size="xs" c="orange" mt={4} data-testid="caisse-dash-session-server-error">
                Lecture GET /v1/cash-sessions/current indisponible — vérifiez le réseau ou réessayez.
              </Text>
            ) : null}
          </div>
          <div data-testid="caisse-dash-site">
            <Text size="xs" c="dimmed">
              Site
            </Text>
            <Text size="sm" fw={500}>
              {envelope.siteId ?? '—'}
            </Text>
          </div>
        </SimpleGrid>
      </Paper>
      ) : null}

      {showSaleKioskSessionStrip && openingFailure ? (
        <Alert color="red" title="Ouverture refusée" data-testid="cashflow-opening-error-strip">
          {openingFailure.message}
        </Alert>
      ) : null}
      {showSaleKioskSessionStrip && !openingFailure ? null : showFullOpeningPaper ? (
      <Paper
        id={isSessionOpenSurface ? undefined : 'caisse-session-open-hint'}
        withBorder
        p={isSessionOpenSurface ? 'xl' : 'sm'}
        shadow={isSessionOpenSurface ? 'sm' : undefined}
        radius="md"
        data-testid="caisse-session-open-hint"
        pos="relative"
      >
        <LoadingOverlay visible={isSessionOpenSurface && openingBusy} zIndex={400} />
        <Stack gap="sm">
          {isSessionOpenSurface ? (
            <Group mb="md" wrap="nowrap" align="center">
              <Wallet size={32} color="#228be6" aria-hidden />
              <Title order={2}>Ouverture de Session de Caisse</Title>
            </Group>
          ) : null}
          {!isSessionOpenSurface ? (
            <div>
              <Text size="sm" fw={600} mb={4}>
                Ouverture / session
              </Text>
              <Text size="sm" c="dimmed">
                Étape brownfield explicite : sélection du poste, saisie du fond de caisse, puis ouverture côté serveur
                avant d’entrer en vente.
              </Text>
            </div>
          ) : (
            <Text size="sm" c="dimmed" mb="xs">
              {workspaceIntro}
            </Text>
          )}

          {!legacySessionOpenBareForm ? (
          <Group gap="xs">
            {hasReal ? (
              <Button
                type="button"
                size="xs"
                variant={openingMode === 'real' ? 'filled' : 'light'}
                onClick={() => setOpeningMode('real')}
                data-testid="cashflow-open-mode-real"
              >
                Ouverture réelle
              </Button>
            ) : null}
            {hasVirtual ? (
              <Button
                type="button"
                size="xs"
                variant={openingMode === 'virtual' ? 'filled' : 'light'}
                color="teal"
                onClick={() => setOpeningMode('virtual')}
                data-testid="cashflow-open-mode-virtual"
              >
                Mode virtuel
              </Button>
            ) : null}
            {hasDeferred ? (
              <Button
                type="button"
                size="xs"
                variant={openingMode === 'deferred' ? 'filled' : 'light'}
                color="blue"
                onClick={() => setOpeningMode('deferred')}
                data-testid="cashflow-open-mode-deferred"
              >
                Saisie différée
              </Button>
            ) : null}
          </Group>
          ) : null}

          {openingMode === 'deferred' ? (
            <TextInput
              label={urlBranch === 'deferred' ? 'Date du cahier' : 'Date / heure réelle d’ouverture'}
              type={urlBranch === 'deferred' ? 'date' : 'datetime-local'}
              max={urlBranch === 'deferred' ? new Date().toISOString().split('T')[0] : undefined}
              value={openedAtInput}
              onChange={(event) => setOpenedAtInput(event.currentTarget.value)}
              description={
                urlBranch === 'deferred'
                  ? 'Date réelle de vente (date du cahier papier)'
                  : 'Réservé à la saisie différée, avec permission `caisse.deferred.access`.'
              }
              data-testid="cashflow-opening-opened-at"
            />
          ) : null}

          <SimpleGrid cols={{ base: 1, sm: hideRegisterFieldSessionOpen ? 1 : 2 }} spacing="sm">
            {!hideRegisterFieldSessionOpen ? (
              <TextInput
                label="Poste de caisse"
                placeholder="UUID du poste"
                value={registerIdInput}
                onChange={(event) => setRegisterIdInput(event.currentTarget.value)}
                description={resolvedPosteId ? `Valeur détectée: ${resolvedPosteId}` : 'Aucune valeur détectée côté contexte.'}
                data-testid="cashflow-opening-register-id"
              />
            ) : null}
            <NumberInput
              label={fundFieldLabel}
              min={0}
              decimalScale={2}
              fixedDecimalScale={false}
              placeholder={legacySessionOpenBareForm ? '0,00' : undefined}
              value={initialAmountInput === '' ? undefined : initialAmountInput}
              onChange={(value) => setInitialAmountInput(typeof value === 'number' ? value : '')}
              data-testid="cashflow-opening-amount"
            />
          </SimpleGrid>

          {openingMode === 'virtual' && !legacySessionOpenBareForm ? (
            <Alert color="teal" title="Mode virtuel (simulation)" data-testid="cashflow-opening-virtual-notice">
              L’ouverture utilise le même <code>POST /v1/cash-sessions/</code> que le poste réel ; l’interface marque la
              séance comme simulation pour l’opératrice (formation, tests). Le serveur n’expose pas encore de drapeau
              « virtuel » distinct dans ce contrat — pas de contournement des garde-fous.
            </Alert>
          ) : null}

          {resolvedSessionId && draft.operatingMode === 'virtual' && !legacySessionOpenBareForm ? (
            <Alert color="teal" variant="light" data-testid="caisse-dash-active-mode-virtual">
              Mode actif côté poste : <strong>virtuel (simulation)</strong>.
            </Alert>
          ) : null}
          {resolvedSessionId && draft.operatingMode === 'deferred' && !legacySessionOpenBareForm ? (
            <Alert color="blue" variant="light" data-testid="caisse-dash-active-mode-deferred">
              Mode actif côté poste : <strong>saisie différée</strong> (date d’ouverture portée par la session serveur).
            </Alert>
          ) : null}

          {openingFailure ? (
            <Alert color="red" title="Ouverture refusée" data-testid="cashflow-opening-error">
              {openingFailure.message}
            </Alert>
          ) : null}

          {resolvedSessionId ? (
            <Alert color="green" title="Session ouverte" data-testid="cashflow-opening-success">
              Session active: <code>{resolvedSessionId}</code>
            </Alert>
          ) : !legacySessionOpenBareForm ? (
            <Alert color="orange" title="Vente bloquée tant que la session n’est pas ouverte" data-testid="cashflow-opening-required">
              Tant qu’aucune session serveur n’est résolue, l’entrée en vente n’est pas considérée valide brownfield-first.
            </Alert>
          ) : null}

          <Group gap="sm">
            {showCancelToCaisseHub ? (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => (legacySessionOpenForm ? navigateCancelSessionOpen() : spaNavigateTo('/caisse'))}
                data-testid="cashflow-session-open-cancel"
              >
                Annuler
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={() => void submitOpening()}
              loading={openingBusy}
              disabled={openingBlockedReason !== null}
              data-testid="cashflow-submit-opening"
            >
              {submitSessionLabel}
            </Button>
            {openingBlockedReason ? (
              <Text size="sm" c="dimmed" data-testid="cashflow-opening-blocked-reason">
                {openingBlockedReason}
              </Text>
            ) : null}
          </Group>
        </Stack>
      </Paper>
      ) : null}

      {showDashboardChromeAfterOpening ? (
      <Group gap="sm">
        <Button type="button" variant="default" size="sm" onClick={() => refresh()} data-testid="caisse-refresh-current-session">
          Rafraîchir session (serveur)
        </Button>
        <Button type="button" variant="light" size="sm" onClick={scrollToSessionHint}>
          Aller à l’aide « ouverture / session »
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={scrollToSale}
          disabled={!canGoToSale}
          data-testid="caisse-goto-sale-workspace"
        >
          Aller au poste de vente
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goToClose}
          data-testid="caisse-goto-close"
        >
          Clôturer la session
        </Button>
      </Group>
      ) : null}

      {showKpiStrip ? (
      <div className={classes.kpiStrip} data-testid="caisse-kpi-strip">
        <Text size="xs" c="dimmed">
          Indicateurs de séance — pilotés par le backend ; la ligne détaillée suit le poste de vente (Epic 6).
        </Text>
      </div>
      ) : null}
    </Stack>
  );
}
