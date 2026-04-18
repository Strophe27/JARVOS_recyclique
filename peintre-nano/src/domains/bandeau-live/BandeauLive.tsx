import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_LIVE_SNAPSHOT_POLLING_INTERVAL_S,
  fetchLiveSnapshot,
} from '../../api/live-snapshot-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import {
  reportRuntimeFallback,
  type RuntimeRejectionSeverity,
} from '../../runtime/report-runtime-fallback';
import classes from './BandeauLive.module.css';
import {
  type ExploitationLiveSnapshot,
  isBandeauLiveSliceEnabled,
  liveSnapshotFromJsonBody,
  snapshotFromWidgetProps,
} from './live-snapshot-normalize';

/** Codes stables DOM / `reportRuntimeFallback` — alignés story 4.4 (préfixe `BANDEAU_LIVE_*`). */
export const BANDEAU_LIVE_RUNTIME_CODES = {
  LOADING: 'BANDEAU_LIVE_LOADING',
  NOMINAL: 'BANDEAU_LIVE_NOMINAL',
  DEGRADED_EMPTY: 'BANDEAU_LIVE_DEGRADED_EMPTY',
  UNAVAILABLE_STATIC: 'BANDEAU_LIVE_UNAVAILABLE_STATIC',
  /** Story 4.5 — désactivation admin / config site (pas une erreur réseau). */
  MODULE_DISABLED: 'BANDEAU_LIVE_MODULE_DISABLED',
  HTTP_ERROR: 'BANDEAU_LIVE_HTTP_ERROR',
  PARSE_ERROR: 'BANDEAU_LIVE_PARSE_ERROR',
  NETWORK_ERROR: 'BANDEAU_LIVE_NETWORK_ERROR',
  UNEXPECTED_ERROR: 'BANDEAU_LIVE_UNEXPECTED_ERROR',
} as const;

export type { ExploitationLiveSnapshot };
export { isBandeauLiveSliceEnabled, liveSnapshotFromJsonBody, snapshotFromWidgetProps };

/** Ingest manifeste CREOS : `deepMapKeysToCamelCase` produit `useLiveSource` ; les tests peuvent passer `use_live_source`. */
function useLiveSourceEnabled(widgetProps: Readonly<Record<string, unknown>> | undefined): boolean {
  const v = widgetProps?.use_live_source ?? widgetProps?.useLiveSource;
  return v === true;
}

function pollingIntervalFromWidgetProps(
  widgetProps: Readonly<Record<string, unknown>> | undefined,
): number {
  const p = widgetProps?.polling_interval_s ?? widgetProps?.pollingIntervalS;
  const r = widgetProps?.refresh_interval_s ?? widgetProps?.refreshIntervalS;
  if (typeof p === 'number' && p > 0) {
    return p;
  }
  if (typeof r === 'number' && r > 0) {
    return r;
  }
  return DEFAULT_LIVE_SNAPSHOT_POLLING_INTERVAL_S;
}

const OPEN_STATE_LABELS: Record<string, string> = {
  open: 'Ouvert (effectif)',
  closed: 'Fermé (effectif)',
  unknown: 'Inconnu',
  not_applicable: 'Sans objet',
  delayed_open: 'Ouverture décalée',
  delayed_close: 'Fermeture décalée',
};

function isDelayedOpenState(code: string | undefined): boolean {
  return code === 'delayed_open' || code === 'delayed_close';
}

function formatEffectiveOpenState(code: string | undefined): { text: string; delayed: boolean } {
  if (code === undefined) {
    return { text: '', delayed: false };
  }
  const text = OPEN_STATE_LABELS[code] ?? `État : ${code}`;
  return { text, delayed: isDelayedOpenState(code) };
}

function formatObservedAt(iso: string | undefined): string | null {
  if (!iso || typeof iso !== 'string') {
    return null;
  }
  const d = Date.parse(iso);
  if (Number.isNaN(d)) {
    return iso;
  }
  try {
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

type BandeauLiveBodyProps = {
  readonly snapshot: ExploitationLiveSnapshot;
  readonly bandeauState: 'live' | 'degraded';
  readonly degradedBanner?: string | null;
  readonly correlationId?: string;
};

function BandeauLiveBody({
  snapshot,
  bandeauState,
  degradedBanner,
  correlationId,
}: BandeauLiveBodyProps) {
  const observedLabel = formatObservedAt(snapshot.observed_at);
  const sync = snapshot.sync_operational_summary;
  const open = formatEffectiveOpenState(snapshot.effective_open_state);
  const runtimeSeverity: RuntimeRejectionSeverity =
    bandeauState === 'degraded' ? 'degraded' : 'info';
  const runtimeCode =
    bandeauState === 'degraded'
      ? BANDEAU_LIVE_RUNTIME_CODES.DEGRADED_EMPTY
      : BANDEAU_LIVE_RUNTIME_CODES.NOMINAL;

  return (
    <aside
      className={classes.root}
      data-testid="widget-bandeau-live"
      data-bandeau-state={bandeauState}
      data-runtime-severity={runtimeSeverity}
      data-runtime-code={runtimeCode}
      {...(bandeauState === 'degraded' && correlationId
        ? { 'data-correlation-id': correlationId }
        : {})}
      role="status"
    >
      <h2 className={classes.title}>Exploitation live</h2>
      {degradedBanner ? <p className={classes.degradedBanner}>{degradedBanner}</p> : null}
      <dl className={classes.grid}>
        {snapshot.effective_open_state !== undefined ? (
          <>
            <dt className={classes.dt}>État d&apos;ouverture effective</dt>
            <dd
              className={open.delayed ? `${classes.dd} ${classes.stateDelayed}` : classes.dd}
              data-field="effective_open_state"
              data-effective-open-state={snapshot.effective_open_state}
            >
              <span className={open.delayed ? classes.badgeDelayed : undefined}>{open.text}</span>
              {open.delayed ? (
                <span className={classes.srOnly}>
                  {' '}
                  (code serveur {snapshot.effective_open_state})
                </span>
              ) : null}
            </dd>
          </>
        ) : null}
        {snapshot.cash_session_effectiveness !== undefined ? (
          <>
            <dt className={classes.dt}>Séance caisse</dt>
            <dd className={classes.dd} data-field="cash_session_effectiveness">
              {snapshot.cash_session_effectiveness}
            </dd>
          </>
        ) : null}
        {observedLabel ? (
          <>
            <dt className={classes.dt}>Observé à</dt>
            <dd className={classes.dd} data-field="observed_at">
              {observedLabel}
            </dd>
          </>
        ) : null}
        {snapshot.sync_aggregate_unavailable === true ? (
          <>
            <dt className={classes.dt}>Sync (agrégat)</dt>
            <dd className={classes.dd} data-field="sync_aggregate_unavailable">
              <span className={classes.muted}>agrégat outbox indisponible — pas d’inférence locale</span>
            </dd>
          </>
        ) : null}
        {sync != null && isRecord(sync as unknown) ? (
          <>
            <dt className={classes.dt}>Sync (résumé)</dt>
            <dd className={classes.dd} data-field="sync_operational_summary">
              {sync.worst_state !== undefined ? (
                <span className={classes.pill} data-sync-worst={String(sync.worst_state)}>
                  état : {String(sync.worst_state)}
                </span>
              ) : null}
              {sync.source_reachable !== undefined ? (
                <span className={classes.pill} data-sync-reachable={String(sync.source_reachable)}>
                  source joignable : {sync.source_reachable ? 'oui' : 'non'}
                </span>
              ) : null}
              {sync.deferred_remote_retry === true ? (
                <span className={classes.pill} data-sync-deferred="true">
                  retry différé
                </span>
              ) : null}
              {sync.partial_success === true ? (
                <span className={classes.pill} data-sync-partial="true">
                  livraison partielle Paheko
                </span>
              ) : null}
              {sync.worst_state === undefined && sync.source_reachable === undefined ? (
                <span className={classes.muted}>—</span>
              ) : null}
            </dd>
          </>
        ) : null}
      </dl>
    </aside>
  );
}

type BandeauLiveLiveProps = {
  readonly widgetProps: Readonly<Record<string, unknown>> | undefined;
};

type LiveErrorInfo = {
  readonly message: string;
  readonly httpStatus?: number;
  readonly correlationId?: string;
  readonly runtimeCode: string;
};

/** Slice désactivé (config site / réponse live) — distinct de « live indisponible » (Story 4.5). */
function BandeauLiveModuleDisabled() {
  const reportedRef = useRef(false);
  useEffect(() => {
    if (reportedRef.current) {
      return;
    }
    reportedRef.current = true;
    reportRuntimeFallback({
      code: BANDEAU_LIVE_RUNTIME_CODES.MODULE_DISABLED,
      message: 'Module bandeau live désactivé par configuration (site).',
      severity: 'info',
      state: 'bandeau_live_module_disabled',
    });
  }, []);

  return (
    <aside
      className={classes.root}
      data-testid="widget-bandeau-live"
      data-bandeau-state="module_disabled"
      data-runtime-severity="info"
      data-runtime-code={BANDEAU_LIVE_RUNTIME_CODES.MODULE_DISABLED}
      role="status"
    >
      <p className={classes.muted}>
        Le bandeau live est désactivé pour ce site (configuration administrateur). Remplacement prévu : config
        admin simple (Epic 9.6).
      </p>
    </aside>
  );
}

function BandeauLiveLive({ widgetProps }: BandeauLiveLiveProps) {
  const auth = useAuthPort();
  const intervalS = useMemo(() => pollingIntervalFromWidgetProps(widgetProps), [widgetProps]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error' | 'module_disabled'>('loading');
  const [snapshot, setSnapshot] = useState<ExploitationLiveSnapshot | null>(null);
  const [degradedEmpty, setDegradedEmpty] = useState(false);
  const [liveCorrelationId, setLiveCorrelationId] = useState<string | undefined>(undefined);
  const [errorInfo, setErrorInfo] = useState<LiveErrorInfo | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const reportedDegradedEmptyRef = useRef(false);
  const stopPollingRef = useRef(false);

  useEffect(() => {
    if (phase !== 'ready' || !degradedEmpty) {
      reportedDegradedEmptyRef.current = false;
      return;
    }
    if (reportedDegradedEmptyRef.current) {
      return;
    }
    reportedDegradedEmptyRef.current = true;
    reportRuntimeFallback({
      code: BANDEAU_LIVE_RUNTIME_CODES.DEGRADED_EMPTY,
      message: 'Réponse live sans signaux exploitables (surface dégradée).',
      severity: 'degraded',
      correlationId: liveCorrelationId,
      state: 'bandeau_live_degraded_empty',
    });
  }, [phase, degradedEmpty, liveCorrelationId]);

  useEffect(() => {
    stopPollingRef.current = false;

    const onFailure = (result: Exclude<Awaited<ReturnType<typeof fetchLiveSnapshot>>, { ok: true }>) => {
      const correlationId = result.correlationId;
      if (result.kind === 'http') {
        setPhase('error');
        setErrorInfo({
          message: 'Live indisponible',
          httpStatus: result.status,
          correlationId,
          runtimeCode: BANDEAU_LIVE_RUNTIME_CODES.HTTP_ERROR,
        });
        reportRuntimeFallback({
          code: BANDEAU_LIVE_RUNTIME_CODES.HTTP_ERROR,
          message: `Live snapshot HTTP ${result.status}`,
          severity: 'degraded',
          correlationId,
          retryable: result.retryable,
          detail: { status: result.status },
        });
        return;
      }
      if (result.kind === 'parse') {
        setPhase('error');
        setErrorInfo({
          message: 'Live indisponible',
          correlationId,
          runtimeCode: BANDEAU_LIVE_RUNTIME_CODES.PARSE_ERROR,
        });
        reportRuntimeFallback({
          code: BANDEAU_LIVE_RUNTIME_CODES.PARSE_ERROR,
          message: result.message,
          severity: 'degraded',
          correlationId,
        });
        return;
      }
      setPhase('error');
      setErrorInfo({
        message: 'Live indisponible',
        correlationId,
        runtimeCode: BANDEAU_LIVE_RUNTIME_CODES.NETWORK_ERROR,
      });
      reportRuntimeFallback({
        code: BANDEAU_LIVE_RUNTIME_CODES.NETWORK_ERROR,
        message: result.message,
        severity: 'degraded',
        correlationId,
      });
    };

    let intervalId: number | undefined;
    let cancelled = false;

    const tick = async () => {
      acRef.current?.abort();
      const ac = new AbortController();
      acRef.current = ac;
      try {
        const result = await fetchLiveSnapshot(ac.signal, auth);
        if (cancelled) {
          return;
        }
        if (!result.ok) {
          onFailure(result);
          return;
        }
        if (!isBandeauLiveSliceEnabled(result.snapshot)) {
          stopPollingRef.current = true;
          if (intervalId !== undefined) {
            window.clearInterval(intervalId);
            intervalId = undefined;
          }
          setPhase('module_disabled');
          setSnapshot(null);
          setErrorInfo(null);
          setDegradedEmpty(false);
          setLiveCorrelationId(result.correlationId);
          return;
        }
        setPhase('ready');
        setErrorInfo(null);
        setSnapshot(result.snapshot);
        setDegradedEmpty(result.degradedEmpty);
        setLiveCorrelationId(result.correlationId);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return;
        }
        if (e instanceof Error && e.name === 'AbortError') {
          return;
        }
        const msg = e instanceof Error ? e.message : String(e);
        setPhase('error');
        setErrorInfo({
          message: 'Live indisponible',
          runtimeCode: BANDEAU_LIVE_RUNTIME_CODES.UNEXPECTED_ERROR,
        });
        reportRuntimeFallback({
          code: BANDEAU_LIVE_RUNTIME_CODES.UNEXPECTED_ERROR,
          message: msg,
          severity: 'degraded',
          state: 'bandeau_live_live_tick_failed',
        });
      }
    };

    void (async () => {
      await tick();
      if (cancelled || stopPollingRef.current) {
        return;
      }
      intervalId = window.setInterval(() => void tick(), intervalS * 1000);
    })();

    return () => {
      cancelled = true;
      stopPollingRef.current = true;
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
      acRef.current?.abort();
      acRef.current = null;
    };
  }, [auth, intervalS]);

  if (phase === 'module_disabled') {
    return <BandeauLiveModuleDisabled />;
  }

  if (phase === 'loading') {
    return (
      <aside
        className={classes.root}
        data-testid="widget-bandeau-live"
        data-bandeau-state="loading"
        data-runtime-severity="info"
        data-runtime-code={BANDEAU_LIVE_RUNTIME_CODES.LOADING}
        role="status"
      >
        <p className={classes.muted}>Chargement du live…</p>
      </aside>
    );
  }

  if (phase === 'error' && errorInfo) {
    return (
      <aside
        className={classes.root}
        data-testid="widget-bandeau-live"
        data-bandeau-state="error"
        data-runtime-severity="degraded"
        data-runtime-code={errorInfo.runtimeCode}
        {...(errorInfo.correlationId ? { 'data-correlation-id': errorInfo.correlationId } : {})}
        role="alert"
      >
        <p className={classes.errorTitle}>{errorInfo.message}</p>
        {import.meta.env.DEV && errorInfo.correlationId ? (
          <p className={classes.muted} data-testid="bandeau-live-ref-technique">
            Réf. technique : {errorInfo.correlationId}
          </p>
        ) : null}
        {import.meta.env.DEV && errorInfo.httpStatus !== undefined ? (
          <p className={classes.muted} data-http-status={errorInfo.httpStatus}>
            HTTP {errorInfo.httpStatus}
          </p>
        ) : null}
      </aside>
    );
  }

  if (!snapshot) {
    return null;
  }

  const banner = degradedEmpty
    ? "Signaux d'exploitation absents ou partiels — l'information affichée est limitée (réponse serveur)."
    : null;

  return (
    <BandeauLiveBody
      snapshot={snapshot}
      bandeauState={degradedEmpty ? 'degraded' : 'live'}
      degradedBanner={banner}
      correlationId={degradedEmpty ? liveCorrelationId : undefined}
    />
  );
}

function BandeauLiveUnavailableStatic() {
  useEffect(() => {
    reportRuntimeFallback({
      code: BANDEAU_LIVE_RUNTIME_CODES.UNAVAILABLE_STATIC,
      message: 'Bandeau live : snapshot statique absent et source live désactivée.',
      severity: 'degraded',
      state: 'bandeau_live_unavailable',
    });
  }, []);

  return (
    <aside
      className={classes.root}
      data-testid="widget-bandeau-live"
      data-bandeau-state="unavailable"
      data-runtime-severity="degraded"
      data-runtime-code={BANDEAU_LIVE_RUNTIME_CODES.UNAVAILABLE_STATIC}
      role="status"
    >
      <p className={classes.degraded}>Données live non disponibles</p>
    </aside>
  );
}

export function BandeauLive({ widgetProps }: RegisteredWidgetProps) {
  const liveOn = useLiveSourceEnabled(widgetProps);
  const staticSnapshot = useMemo(() => snapshotFromWidgetProps(widgetProps), [widgetProps]);

  if (liveOn) {
    return <BandeauLiveLive widgetProps={widgetProps} />;
  }

  if (staticSnapshot && !isBandeauLiveSliceEnabled(staticSnapshot)) {
    return <BandeauLiveModuleDisabled />;
  }

  if (!staticSnapshot) {
    return <BandeauLiveUnavailableStatic />;
  }

  return <BandeauLiveBody snapshot={staticSnapshot} bandeauState="live" />;
}
