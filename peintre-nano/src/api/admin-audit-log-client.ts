import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

/** Aligné OpenAPI `AdminAuditLogEntry` + `AdminAuditLogPage` (`adminAuditLogList`). */
export type AdminAuditLogEntryDto = {
  readonly id: string;
  readonly timestamp: string;
  readonly actor_id?: string | null;
  readonly actor_username?: string | null;
  readonly action_type: string;
  readonly target_id?: string | null;
  readonly target_username?: string | null;
  readonly target_type?: string | null;
  readonly details?: unknown;
  readonly description: string | null;
  readonly ip_address?: string | null;
  readonly user_agent?: string | null;
};

export type AdminAuditLogPaginationDto = {
  readonly page: number;
  readonly page_size: number;
  readonly total_count: number;
  readonly total_pages: number;
  readonly has_next: boolean;
  readonly has_prev: boolean;
};

export type AdminAuditLogPageDto = {
  readonly entries: readonly AdminAuditLogEntryDto[];
  readonly pagination: AdminAuditLogPaginationDto;
  readonly filters_applied: Record<string, unknown>;
};

export type AdminAuditLogListQuery = {
  readonly page?: number;
  readonly page_size?: number;
  readonly action_type?: string;
  readonly actor_username?: string;
  readonly target_type?: string;
  readonly start_date?: string;
  readonly end_date?: string;
  readonly search?: string;
};

type AdminAuditLogHttpError = {
  ok: false;
  status: number;
  detail: string;
  code?: string;
  retryable?: boolean;
  state?: string | null;
  correlation_id?: string;
  networkError?: boolean;
};

function adminAuditLogHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): AdminAuditLogHttpError {
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

function strOrNull(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (v === null) return null;
  return null;
}

function asAuditLogPage(json: unknown): AdminAuditLogPageDto | null {
  if (!isRecord(json)) return null;
  const entriesRaw = json.entries;
  const pagRaw = json.pagination;
  if (!Array.isArray(entriesRaw) || !isRecord(pagRaw)) return null;
  const entries: AdminAuditLogEntryDto[] = [];
  for (const row of entriesRaw) {
    if (!isRecord(row)) continue;
    const id = row.id;
    const timestamp = row.timestamp;
    const action_type = row.action_type;
    if (typeof id !== 'string' || typeof timestamp !== 'string' || typeof action_type !== 'string') continue;
    entries.push({
      id,
      timestamp,
      actor_id: strOrNull(row.actor_id),
      actor_username: strOrNull(row.actor_username),
      action_type,
      target_id: strOrNull(row.target_id),
      target_username: strOrNull(row.target_username),
      target_type: strOrNull(row.target_type),
      details: row.details,
      description: strOrNull(row.description),
      ip_address: strOrNull(row.ip_address),
      user_agent: strOrNull(row.user_agent),
    });
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
  const filters_applied = isRecord(json.filters_applied) ? json.filters_applied : {};
  return {
    entries,
    pagination: { page, page_size, total_count, total_pages, has_next, has_prev },
    filters_applied,
  };
}

/** `GET /v1/admin/audit-log` — `operationId` **adminAuditLogList** (sécurité `adminSessionStrict` OpenAPI). */
export type AdminAuditLogListResult = { ok: true; data: AdminAuditLogPageDto } | AdminAuditLogHttpError;

export async function getAdminAuditLogList(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  query: AdminAuditLogListQuery,
): Promise<AdminAuditLogListResult> {
  const base = getLiveSnapshotBasePrefix();
  const sp = new URLSearchParams();
  if (query.page != null) sp.set('page', String(query.page));
  if (query.page_size != null) sp.set('page_size', String(query.page_size));
  if (query.action_type) sp.set('action_type', query.action_type);
  if (query.actor_username) sp.set('actor_username', query.actor_username);
  if (query.target_type) sp.set('target_type', query.target_type);
  if (query.start_date) sp.set('start_date', query.start_date);
  if (query.end_date) sp.set('end_date', query.end_date);
  if (query.search) sp.set('search', query.search);
  const q = sp.toString();
  const url = `${base}/v1/admin/audit-log${q ? `?${q}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminAuditLogHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminAuditLogHttpError(res.status, json, text || res.statusText);
  }
  const data = asAuditLogPage(json);
  if (!data) {
    return adminAuditLogHttpError(res.status, json, 'Réponse audit-log invalide (schéma)');
  }
  return { ok: true, data };
}
