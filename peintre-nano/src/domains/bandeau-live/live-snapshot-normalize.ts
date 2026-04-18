import type { components } from '../../../../contracts/openapi/generated/recyclique-api';

export type ExploitationLiveSnapshot = components['schemas']['ExploitationLiveSnapshot'];

/** Vérité backend / manifeste : false uniquement si le booléen est explicitement `false`. */
export function isBandeauLiveSliceEnabled(snapshot: ExploitationLiveSnapshot): boolean {
  if (snapshot.bandeau_live_slice_enabled === false) {
    return false;
  }
  return true;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function strField(raw: Record<string, unknown>, snake: string, camel: string): string | undefined {
  const v = raw[snake] ?? raw[camel];
  return typeof v === 'string' ? v : undefined;
}

/** Normalise un bloc sync après ingest manifest (snake_case JSON → camelCase imbriqué). */
function dailyKpisAggregateFromRaw(
  v: unknown,
): ExploitationLiveSnapshot['daily_kpis_aggregate'] {
  if (v === undefined) {
    return undefined;
  }
  if (v === null) {
    return null;
  }
  if (!isRecord(v)) {
    return null;
  }
  return { ...v };
}

function syncOperationalSummaryFromRaw(
  v: unknown,
): ExploitationLiveSnapshot['sync_operational_summary'] {
  if (v === undefined) {
    return undefined;
  }
  if (v === null) {
    return null;
  }
  if (!isRecord(v)) {
    return null;
  }
  const worst_state = v.worst_state ?? v.worstState;
  const source_reachable = v.source_reachable ?? v.sourceReachable;
  const deferred_remote_retry = v.deferred_remote_retry ?? v.deferredRemoteRetry;
  const partial_success = v.partial_success ?? v.partialSuccess;
  const out: NonNullable<ExploitationLiveSnapshot['sync_operational_summary']> = {};
  if (typeof worst_state === 'string') {
    out.worst_state = worst_state as NonNullable<
      ExploitationLiveSnapshot['sync_operational_summary']
    >['worst_state'];
  }
  if (typeof source_reachable === 'boolean') {
    out.source_reachable = source_reachable;
  }
  if (typeof deferred_remote_retry === 'boolean') {
    out.deferred_remote_retry = deferred_remote_retry;
  }
  if (partial_success === null) {
    out.partial_success = null;
  } else if (typeof partial_success === 'boolean') {
    out.partial_success = partial_success;
  }
  return Object.keys(out).length ? out : null;
}

function snapshotFromRawRecord(raw: Record<string, unknown>): ExploitationLiveSnapshot | null {
  const effective_open_state = strField(raw, 'effective_open_state', 'effectiveOpenState');
  const cashRaw = raw.cash_session_effectiveness ?? raw.cashSessionEffectiveness;
  const cash_session_effectiveness =
    typeof cashRaw === 'string'
      ? (cashRaw as NonNullable<ExploitationLiveSnapshot['cash_session_effectiveness']>)
      : undefined;
  const observed_at = strField(raw, 'observed_at', 'observedAt');
  const sync_operational_summary = syncOperationalSummaryFromRaw(
    raw.sync_operational_summary ?? raw.syncOperationalSummary,
  );
  const aggRaw = raw.sync_aggregate_unavailable ?? raw.syncAggregateUnavailable;
  const sync_aggregate_unavailable = typeof aggRaw === 'boolean' ? aggRaw : undefined;
  const bleRaw = raw.bandeau_live_slice_enabled ?? raw.bandeauLiveSliceEnabled;
  const bandeau_live_slice_enabled = typeof bleRaw === 'boolean' ? bleRaw : undefined;
  const daily_kpis_aggregate = dailyKpisAggregateFromRaw(
    raw.daily_kpis_aggregate ?? raw.dailyKpisAggregate,
  );
  const hasDailyKpis =
    daily_kpis_aggregate != null &&
    typeof daily_kpis_aggregate === 'object' &&
    Object.keys(daily_kpis_aggregate).length > 0;
  const hasSignal =
    bandeau_live_slice_enabled !== undefined ||
    effective_open_state !== undefined ||
    cash_session_effectiveness !== undefined ||
    observed_at !== undefined ||
    hasDailyKpis ||
    sync_aggregate_unavailable !== undefined ||
    (sync_operational_summary != null &&
      (sync_operational_summary.worst_state !== undefined ||
        sync_operational_summary.source_reachable !== undefined ||
        sync_operational_summary.deferred_remote_retry !== undefined ||
        sync_operational_summary.partial_success !== undefined));
  if (!hasSignal) {
    return null;
  }
  return {
    ...(bandeau_live_slice_enabled !== undefined ? { bandeau_live_slice_enabled } : {}),
    ...(effective_open_state !== undefined ? { effective_open_state } : {}),
    ...(cash_session_effectiveness !== undefined ? { cash_session_effectiveness } : {}),
    ...(observed_at !== undefined ? { observed_at } : {}),
    ...(sync_operational_summary !== undefined ? { sync_operational_summary } : {}),
    ...(daily_kpis_aggregate !== undefined ? { daily_kpis_aggregate } : {}),
    ...(sync_aggregate_unavailable !== undefined ? { sync_aggregate_unavailable } : {}),
  };
}

/** Extrait un snapshot JSON-sérialisable depuis `widget_props.snapshot` (Story 4.2 — pas de fetch HTTP). */
export function snapshotFromWidgetProps(
  widgetProps: Readonly<Record<string, unknown>> | undefined,
): ExploitationLiveSnapshot | null {
  const raw = widgetProps?.snapshot;
  if (!isRecord(raw)) {
    return null;
  }
  return snapshotFromRawRecord(raw);
}

/** Corps JSON `GET /v2/exploitation/live-snapshot` — même normalisation snake/camel que le manifest. */
export function liveSnapshotFromJsonBody(body: unknown): ExploitationLiveSnapshot | null {
  if (!isRecord(body)) {
    return null;
  }
  return snapshotFromRawRecord(body);
}
