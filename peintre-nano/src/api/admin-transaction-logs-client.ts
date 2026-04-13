import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

/** Entrée log transactionnel : objet JSON libre (OpenAPI `AdminTransactionLogsPage.entries[]`). */
export type AdminTransactionLogEntryDto = Readonly<Record<string, unknown>>;

export type AdminTransactionLogsPaginationDto = {
  readonly page: number;
  readonly page_size: number;
  readonly total_count: number;
  readonly total_pages: number;
  readonly has_next: boolean;
  readonly has_prev: boolean;
};

export type AdminTransactionLogsPageDto = {
  readonly entries: readonly AdminTransactionLogEntryDto[];
  readonly pagination: AdminTransactionLogsPaginationDto;
};

export type AdminTransactionLogsListQuery = {
  readonly page?: number;
  readonly page_size?: number;
  readonly event_type?: string;
  readonly user_id?: string;
  readonly session_id?: string;
  readonly start_date?: string;
  readonly end_date?: string;
};

type AdminTransactionLogsHttpError = {
  ok: false;
  status: number;
  detail: string;
  code?: string;
  retryable?: boolean;
  state?: string | null;
  correlation_id?: string;
  networkError?: boolean;
};

function httpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): AdminTransactionLogsHttpError {
  const p = parseRecycliqueApiErrorBody(json, status, fallbackDetail);
  const f = toRecycliqueClientFailure(status, p, networkError);
  return {
    ok: false,
    status,
    detail: f.message,
    code: f.code,
    retryable: f.retryable,
    state: f.state,
    correlation_id: f.correlationId,
    networkError: f.networkError,
  };
}

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

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function asTransactionLogsPage(json: unknown): AdminTransactionLogsPageDto | null {
  if (!isRecord(json)) return null;
  const entriesRaw = json.entries;
  const pagRaw = json.pagination;
  if (!Array.isArray(entriesRaw) || !isRecord(pagRaw)) return null;
  const entries: AdminTransactionLogEntryDto[] = [];
  for (const row of entriesRaw) {
    if (isRecord(row)) entries.push(row);
  }
  const page = pagRaw.page;
  const page_size = pagRaw.page_size;
  const total_count = pagRaw.total_count;
  const total_pages = pagRaw.total_pages;
  const has_next = pagRaw.has_next;
  const has_prev = pagRaw.has_prev;
  if (
    typeof page !== 'number' ||
    typeof page_size !== 'number' ||
    typeof total_count !== 'number' ||
    typeof total_pages !== 'number' ||
    typeof has_next !== 'boolean' ||
    typeof has_prev !== 'boolean'
  ) {
    return null;
  }
  return {
    entries,
    pagination: { page, page_size, total_count, total_pages, has_next, has_prev },
  };
}

/** `GET /v1/admin/transaction-logs` — `operationId` **adminTransactionLogsList**. */
export type AdminTransactionLogsListResult = { ok: true; data: AdminTransactionLogsPageDto } | AdminTransactionLogsHttpError;

export async function getAdminTransactionLogsList(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  query: AdminTransactionLogsListQuery,
): Promise<AdminTransactionLogsListResult> {
  const base = getLiveSnapshotBasePrefix();
  const sp = new URLSearchParams();
  if (query.page != null) sp.set('page', String(query.page));
  if (query.page_size != null) sp.set('page_size', String(query.page_size));
  if (query.event_type) sp.set('event_type', query.event_type);
  if (query.user_id) sp.set('user_id', query.user_id);
  if (query.session_id) sp.set('session_id', query.session_id);
  if (query.start_date) sp.set('start_date', query.start_date);
  if (query.end_date) sp.set('end_date', query.end_date);
  const q = sp.toString();
  const url = `${base}/v1/admin/transaction-logs${q ? `?${q}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return httpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return httpError(res.status, json, text || res.statusText);
  }
  const data = asTransactionLogsPage(json);
  if (!data) {
    return httpError(res.status, json, 'Réponse invalide');
  }
  return { ok: true, data };
}
