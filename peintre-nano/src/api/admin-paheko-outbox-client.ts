import type { components } from '../../../contracts/openapi/generated/recyclique-api';
import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

export type PahekoOutboxItemPublic = components['schemas']['PahekoOutboxItemPublic'];
export type PahekoOutboxItemDetail = components['schemas']['PahekoOutboxItemDetail'];
export type PahekoOutboxListResponse = components['schemas']['PahekoOutboxListResponse'];
export type PahekoOutboxCorrelationTimelineResponse = components['schemas']['PahekoOutboxCorrelationTimelineResponse'];
export type PahekoOutboxRejectBody = components['schemas']['PahekoOutboxRejectBody'];

export type PahekoOutboxListQuery = {
  readonly skip?: number;
  readonly limit?: number;
  readonly operation_type?: string;
  readonly cash_session_id?: string | null;
  readonly outbox_status?: string | null;
  readonly correlation_id?: string | null;
};

type PahekoOutboxHttpError = {
  ok: false;
  status: number;
  detail: string;
  code?: string;
  retryable?: boolean;
  state?: string | null;
  correlation_id?: string;
  networkError?: boolean;
};

function authHeaders(auth: Pick<AuthContextPort, 'getAccessToken'>): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function parseJsonText(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function outboxHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): PahekoOutboxHttpError {
  const parsed = parseRecycliqueApiErrorBody(json, status, fallbackDetail);
  const failure = toRecycliqueClientFailure(status, parsed, networkError);
  return {
    ok: false,
    status,
    detail: failure.message,
    code: failure.code,
    retryable: failure.retryable,
    state: failure.state,
    correlation_id: failure.correlationId,
    networkError: failure.networkError,
  };
}

export type ListPahekoOutboxItemsResult =
  | ({ ok: true } & PahekoOutboxListResponse)
  | PahekoOutboxHttpError;

export async function listPahekoOutboxItems(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  query: PahekoOutboxListQuery = {},
  signal?: AbortSignal,
): Promise<ListPahekoOutboxItemsResult> {
  const base = getLiveSnapshotBasePrefix();
  const sp = new URLSearchParams();
  if (typeof query.skip === 'number') sp.set('skip', String(query.skip));
  if (typeof query.limit === 'number') sp.set('limit', String(query.limit));
  if (query.operation_type?.trim()) sp.set('operation_type', query.operation_type.trim());
  if (query.cash_session_id?.trim()) sp.set('cash_session_id', query.cash_session_id.trim());
  if (query.outbox_status?.trim()) sp.set('outbox_status', query.outbox_status.trim());
  if (query.correlation_id?.trim()) sp.set('correlation_id', query.correlation_id.trim());
  const qs = sp.toString();
  const url = `${base}/v1/admin/paheko-outbox/items${qs ? `?${qs}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth), signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return outboxHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return outboxHttpError(res.status, json, text || res.statusText);
  }
  if (
    !json ||
    typeof json !== 'object' ||
    !Array.isArray((json as { data?: unknown }).data) ||
    typeof (json as { total?: unknown }).total !== 'number'
  ) {
    return outboxHttpError(res.status, json, 'Réponse outbox Paheko invalide');
  }
  return { ok: true, ...(json as PahekoOutboxListResponse) };
}

export type GetPahekoOutboxItemResult = { ok: true; item: PahekoOutboxItemDetail } | PahekoOutboxHttpError;

export async function getPahekoOutboxItem(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  itemId: string,
  signal?: AbortSignal,
): Promise<GetPahekoOutboxItemResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/paheko-outbox/items/${encodeURIComponent(itemId)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth), signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return outboxHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return outboxHttpError(res.status, json, text || res.statusText);
  }
  if (!json || typeof json !== 'object' || !('id' in json)) {
    return outboxHttpError(res.status, json, 'Détail outbox Paheko invalide');
  }
  return { ok: true, item: json as PahekoOutboxItemDetail };
}

export type GetPahekoOutboxCorrelationTimelineResult =
  | { ok: true; timeline: PahekoOutboxCorrelationTimelineResponse }
  | PahekoOutboxHttpError;

export async function getPahekoOutboxCorrelationTimeline(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  correlationId: string,
  signal?: AbortSignal,
): Promise<GetPahekoOutboxCorrelationTimelineResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/paheko-outbox/by-correlation/${encodeURIComponent(correlationId)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth), signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return outboxHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return outboxHttpError(res.status, json, text || res.statusText);
  }
  if (!json || typeof json !== 'object' || !('correlation_id' in json) || !Array.isArray((json as { items?: unknown }).items)) {
    return outboxHttpError(res.status, json, 'Timeline outbox Paheko invalide');
  }
  return { ok: true, timeline: json as PahekoOutboxCorrelationTimelineResponse };
}

export type LiftPahekoOutboxQuarantineResult = { ok: true; item: PahekoOutboxItemDetail } | PahekoOutboxHttpError;

export async function postPahekoOutboxLiftQuarantine(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  itemId: string,
  body: PahekoOutboxRejectBody,
  signal?: AbortSignal,
): Promise<LiftPahekoOutboxQuarantineResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/paheko-outbox/items/${encodeURIComponent(itemId)}/lift-quarantine`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return outboxHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return outboxHttpError(res.status, json, text || res.statusText);
  }
  if (!json || typeof json !== 'object' || !('id' in json)) {
    return outboxHttpError(res.status, json, 'Réponse lift-quarantine invalide');
  }
  return { ok: true, item: json as PahekoOutboxItemDetail };
}
