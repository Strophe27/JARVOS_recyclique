import type { components } from '../../../contracts/openapi/generated/recyclique-api';
import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

export type PahekoCashSessionCloseMappingDto = components['schemas']['PahekoCashSessionCloseMappingPublic'];
export type PahekoCashSessionCloseMappingCreateBody =
  components['schemas']['PahekoCashSessionCloseMappingCreateBody'];
export type PahekoCashSessionCloseMappingUpdateBody =
  components['schemas']['PahekoCashSessionCloseMappingUpdateBody'];

export type PahekoCashSessionCloseMappingsQuery = {
  readonly skip?: number;
  readonly limit?: number;
  readonly site_id?: string | null;
};

type PahekoMappingsHttpError = {
  ok: false;
  status: number;
  detail: string;
  code?: string;
  retryable?: boolean;
  state?: string | null;
  correlation_id?: string;
  networkError?: boolean;
};

function mappingsHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): PahekoMappingsHttpError {
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

function authHeaders(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json', ...extra };
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

function parseMapping(row: unknown): PahekoCashSessionCloseMappingDto | null {
  if (!isRecord(row)) return null;
  if (typeof row.id !== 'string') return null;
  if (typeof row.site_id !== 'string') return null;
  if ('register_id' in row && row.register_id != null && typeof row.register_id !== 'string') return null;
  if (typeof row.enabled !== 'boolean') return null;
  if (!isRecord(row.destination_params)) return null;
  if ('label' in row && row.label != null && typeof row.label !== 'string') return null;
  if (typeof row.created_at !== 'string' || typeof row.updated_at !== 'string') return null;
  return row as PahekoCashSessionCloseMappingDto;
}

export type ListPahekoCashSessionCloseMappingsResult =
  | {
      ok: true;
      data: readonly PahekoCashSessionCloseMappingDto[];
      total: number;
      skip: number;
      limit: number;
    }
  | PahekoMappingsHttpError;

export async function listPahekoCashSessionCloseMappings(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  query: PahekoCashSessionCloseMappingsQuery = {},
  signal?: AbortSignal,
): Promise<ListPahekoCashSessionCloseMappingsResult> {
  const base = getLiveSnapshotBasePrefix();
  const sp = new URLSearchParams();
  if (typeof query.skip === 'number') sp.set('skip', String(query.skip));
  if (typeof query.limit === 'number') sp.set('limit', String(query.limit));
  if (query.site_id && query.site_id.trim() !== '') sp.set('site_id', query.site_id.trim());
  const qs = sp.toString();
  const url = `${base}/v1/admin/paheko-mappings/cash-session-close${qs ? `?${qs}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth), signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return mappingsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return mappingsHttpError(res.status, json, text || res.statusText);
  }
  if (!isRecord(json) || !Array.isArray(json.data)) {
    return mappingsHttpError(res.status, json, 'Réponse mappings Paheko invalide');
  }
  const data: PahekoCashSessionCloseMappingDto[] = [];
  for (const row of json.data) {
    const item = parseMapping(row);
    if (item) data.push(item);
  }
  return {
    ok: true,
    data,
    total: typeof json.total === 'number' ? json.total : data.length,
    skip: typeof json.skip === 'number' ? json.skip : 0,
    limit: typeof json.limit === 'number' ? json.limit : data.length,
  };
}

export type PahekoCashSessionCloseMappingMutationResult =
  | { ok: true; mapping: PahekoCashSessionCloseMappingDto }
  | PahekoMappingsHttpError;

export async function createPahekoCashSessionCloseMapping(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: PahekoCashSessionCloseMappingCreateBody,
  signal?: AbortSignal,
): Promise<PahekoCashSessionCloseMappingMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/paheko-mappings/cash-session-close`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(auth, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return mappingsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return mappingsHttpError(res.status, json, text || res.statusText);
  }
  const mapping = parseMapping(json);
  if (!mapping) return mappingsHttpError(res.status, json, 'Réponse création mapping invalide');
  return { ok: true, mapping };
}

export async function updatePahekoCashSessionCloseMapping(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  mappingId: string,
  body: PahekoCashSessionCloseMappingUpdateBody,
  signal?: AbortSignal,
): Promise<PahekoCashSessionCloseMappingMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/paheko-mappings/cash-session-close/${encodeURIComponent(mappingId)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PATCH',
      credentials: 'include',
      headers: authHeaders(auth, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return mappingsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return mappingsHttpError(res.status, json, text || res.statusText);
  }
  const mapping = parseMapping(json);
  if (!mapping) return mappingsHttpError(res.status, json, 'Réponse mise à jour mapping invalide');
  return { ok: true, mapping };
}

export function resolvePahekoCashSessionCloseMapping(
  mappings: readonly PahekoCashSessionCloseMappingDto[],
  siteId: string | null | undefined,
  registerId: string | null | undefined,
): PahekoCashSessionCloseMappingDto | null {
  const site = siteId?.trim() ?? '';
  if (!site) return null;
  const register = registerId?.trim() ?? '';
  if (register) {
    const exact = mappings.find((m) => m.enabled && m.site_id === site && (m.register_id ?? '') === register);
    if (exact) return exact;
  }
  return mappings.find((m) => m.enabled && m.site_id === site && (m.register_id ?? '') === '') ?? null;
}
