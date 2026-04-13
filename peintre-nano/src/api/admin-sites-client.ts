import type { components } from '../../../contracts/openapi/generated/recyclique-api';
import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

export type SiteAdminRowDto = components['schemas']['SiteV1Response'];
export type SiteAdminCreateBody = components['schemas']['SiteV1Create'];
export type SiteAdminUpdateBody = components['schemas']['SiteV1Update'];

export type SitesListQuery = {
  readonly skip?: number;
  readonly limit?: number;
  readonly only_active?: boolean;
};

type SitesHttpError = {
  ok: false;
  status: number;
  detail: string;
  code?: string;
  retryable?: boolean;
  state?: string | null;
  correlation_id?: string;
  networkError?: boolean;
};

function sitesHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): SitesHttpError {
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

function parseSiteRow(row: unknown): SiteAdminRowDto | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  const name = row.name;
  const is_active = row.is_active;
  const created_at = row.created_at;
  const updated_at = row.updated_at;
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  if (typeof is_active !== 'boolean') return null;
  if (typeof created_at !== 'string' || typeof updated_at !== 'string') return null;
  return row as SiteAdminRowDto;
}

export type SitesListResult = { ok: true; data: readonly SiteAdminRowDto[] } | SitesHttpError;

/** GET /v1/sites/ */
export async function listSitesForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  query: SitesListQuery = {},
  signal?: AbortSignal,
): Promise<SitesListResult> {
  const base = getLiveSnapshotBasePrefix();
  const sp = new URLSearchParams();
  if (typeof query.skip === 'number') sp.set('skip', String(query.skip));
  if (typeof query.limit === 'number') sp.set('limit', String(query.limit));
  if (query.only_active === true || query.only_active === false) sp.set('only_active', String(query.only_active));
  const qs = sp.toString();
  const url = `${base}/v1/sites/${qs ? `?${qs}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth), signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return sitesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return sitesHttpError(res.status, json, text || res.statusText);
  }
  if (!Array.isArray(json)) {
    return sitesHttpError(res.status, json, 'Réponse sites invalide (tableau attendu)');
  }
  const data: SiteAdminRowDto[] = [];
  for (const row of json) {
    const item = parseSiteRow(row);
    if (item) data.push(item);
  }
  return { ok: true, data };
}

export type SiteMutationResult = { ok: true; site: SiteAdminRowDto } | SitesHttpError;
export type SiteDeleteResult = { ok: true } | SitesHttpError;

/** POST /v1/sites/ */
export async function createSiteForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: SiteAdminCreateBody,
  signal?: AbortSignal,
): Promise<SiteMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sites/`;
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
    return sitesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return sitesHttpError(res.status, json, text || res.statusText);
  }
  const site = parseSiteRow(json);
  if (!site) return sitesHttpError(res.status, json, 'Réponse site invalide');
  return { ok: true, site };
}

/** PATCH /v1/sites/{site_id} */
export async function updateSiteForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  siteId: string,
  body: SiteAdminUpdateBody,
  signal?: AbortSignal,
): Promise<SiteMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sites/${encodeURIComponent(siteId)}`;
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
    return sitesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return sitesHttpError(res.status, json, text || res.statusText);
  }
  const site = parseSiteRow(json);
  if (!site) return sitesHttpError(res.status, json, 'Réponse site invalide');
  return { ok: true, site };
}

/** DELETE /v1/sites/{site_id} */
export async function deleteSiteForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  siteId: string,
  signal?: AbortSignal,
): Promise<SiteDeleteResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sites/${encodeURIComponent(siteId)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'DELETE', credentials: 'include', headers: authHeaders(auth), signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return sitesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = text ? parseJsonText(text) : null;
  if (!res.ok) {
    return sitesHttpError(res.status, json, text || res.statusText);
  }
  return { ok: true };
}
