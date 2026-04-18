import type { components } from '../../../contracts/openapi/generated/recyclique-api';
import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

export type CashRegisterAdminRowDto = components['schemas']['CashRegisterV1Response'];
export type CashRegisterAdminCreateBody = components['schemas']['CashRegisterV1Create'];
export type CashRegisterAdminUpdateBody = components['schemas']['CashRegisterV1Update'];

export type CashRegistersListQuery = {
  readonly skip?: number;
  readonly limit?: number;
  readonly site_id?: string | null;
  readonly only_active?: boolean;
};

type CashRegistersHttpError = {
  ok: false;
  status: number;
  detail: string;
  code?: string;
  retryable?: boolean;
  state?: string | null;
  correlation_id?: string;
  networkError?: boolean;
};

function crHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): CashRegistersHttpError {
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

function parseRegisterRow(row: unknown): CashRegisterAdminRowDto | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  const name = row.name;
  const is_active = row.is_active;
  const workflow_options = row.workflow_options;
  const enable_virtual = row.enable_virtual;
  const enable_deferred = row.enable_deferred;
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  if (typeof is_active !== 'boolean') return null;
  if (typeof workflow_options !== 'object' || workflow_options === null) return null;
  if (typeof enable_virtual !== 'boolean' || typeof enable_deferred !== 'boolean') return null;
  return row as CashRegisterAdminRowDto;
}

export type CashRegistersListResult =
  | { ok: true; data: readonly CashRegisterAdminRowDto[] }
  | CashRegistersHttpError;

/** GET /v1/cash-registers/ */
export async function listCashRegistersForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  query: CashRegistersListQuery = {},
  signal?: AbortSignal,
): Promise<CashRegistersListResult> {
  const base = getLiveSnapshotBasePrefix();
  const sp = new URLSearchParams();
  if (typeof query.skip === 'number') sp.set('skip', String(query.skip));
  if (typeof query.limit === 'number') sp.set('limit', String(query.limit));
  if (query.site_id && query.site_id.trim() !== '') sp.set('site_id', query.site_id.trim());
  if (query.only_active === true || query.only_active === false) sp.set('only_active', String(query.only_active));
  const qs = sp.toString();
  /** Slash final aligné OpenAPI `GET /v1/cash-registers/` et `admin-sites-client` — évite 404 proxy / routage strict. */
  const url = `${base}/v1/cash-registers/${qs ? `?${qs}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth), signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return crHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return crHttpError(res.status, json, text || res.statusText);
  }
  if (!Array.isArray(json)) {
    return crHttpError(res.status, json, 'Réponse postes caisse invalide (tableau attendu)');
  }
  const data: CashRegisterAdminRowDto[] = [];
  for (const row of json) {
    const item = parseRegisterRow(row);
    if (item) data.push(item);
  }
  return { ok: true, data };
}

export type CashRegisterMutationResult = { ok: true; register: CashRegisterAdminRowDto } | CashRegistersHttpError;
export type CashRegisterDeleteResult = { ok: true } | CashRegistersHttpError;

/** POST /v1/cash-registers/ */
export async function createCashRegisterForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: CashRegisterAdminCreateBody,
  signal?: AbortSignal,
): Promise<CashRegisterMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/cash-registers/`;
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
    return crHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return crHttpError(res.status, json, text || res.statusText);
  }
  const register = parseRegisterRow(json);
  if (!register) return crHttpError(res.status, json, 'Réponse poste invalide');
  return { ok: true, register };
}

/** PATCH /v1/cash-registers/{register_id} */
export async function updateCashRegisterForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  registerId: string,
  body: CashRegisterAdminUpdateBody,
  signal?: AbortSignal,
): Promise<CashRegisterMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/cash-registers/${encodeURIComponent(registerId)}`;
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
    return crHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return crHttpError(res.status, json, text || res.statusText);
  }
  const register = parseRegisterRow(json);
  if (!register) return crHttpError(res.status, json, 'Réponse poste invalide');
  return { ok: true, register };
}

/** DELETE /v1/cash-registers/{register_id} */
export async function deleteCashRegisterForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  registerId: string,
  signal?: AbortSignal,
): Promise<CashRegisterDeleteResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/cash-registers/${encodeURIComponent(registerId)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'DELETE', credentials: 'include', headers: authHeaders(auth), signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return crHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = text ? parseJsonText(text) : null;
  if (!res.ok) {
    return crHttpError(res.status, json, text || res.statusText);
  }
  return { ok: true };
}
