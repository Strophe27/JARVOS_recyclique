import type { components } from '../../../contracts/openapi/generated/recyclique-api';
import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

/** Réponse `GET /v1/categories/` — `recyclique_categories_listCategories`. */
export type CategoryAdminListRowDto = components['schemas']['CategoryV1Read'];

/** Source de liste alignée sur les routes `GET /v1/categories/*` du backend. */
export type CategoriesDataSource = 'config' | 'sale' | 'entry';

export type CategoriesListQuery = {
  readonly source?: CategoriesDataSource;
  readonly include_archived?: boolean;
  readonly is_active?: boolean;
};

type CategoriesHttpError = {
  ok: false;
  status: number;
  detail: string;
  code?: string;
  retryable?: boolean;
  state?: string | null;
  correlation_id?: string;
  networkError?: boolean;
};

function categoriesHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): CategoriesHttpError {
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

function asNum(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  if (typeof x === 'number' && !Number.isNaN(x)) return x;
  if (typeof x === 'string' && x.trim() !== '') {
    const n = Number(x);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function parseCategoryRow(row: unknown): CategoryAdminListRowDto | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  const name = row.name;
  const is_active = row.is_active;
  const display_order = row.display_order;
  const display_order_entry = row.display_order_entry;
  const is_visible = row.is_visible;
  const created_at = row.created_at;
  const updated_at = row.updated_at;
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  if (typeof is_active !== 'boolean') return null;
  if (typeof display_order !== 'number' || typeof display_order_entry !== 'number') return null;
  if (typeof is_visible !== 'boolean') return null;
  if (typeof created_at !== 'string' || typeof updated_at !== 'string') return null;
  const official_name =
    row.official_name === null || row.official_name === undefined
      ? null
      : typeof row.official_name === 'string'
        ? row.official_name
        : null;
  const parent_id =
    row.parent_id === null || row.parent_id === undefined
      ? null
      : typeof row.parent_id === 'string'
        ? row.parent_id
        : String(row.parent_id);
  const shortcut_key =
    row.shortcut_key === null || row.shortcut_key === undefined
      ? null
      : typeof row.shortcut_key === 'string'
        ? row.shortcut_key
        : null;
  const deleted_at =
    row.deleted_at === null || row.deleted_at === undefined
      ? null
      : typeof row.deleted_at === 'string'
        ? row.deleted_at
        : null;
  return {
    id,
    name,
    official_name,
    is_active,
    parent_id,
    price: asNum(row.price),
    max_price: asNum(row.max_price),
    display_order,
    display_order_entry,
    is_visible,
    shortcut_key,
    created_at,
    updated_at,
    deleted_at,
  };
}

export type CategoriesListResult = { ok: true; data: readonly CategoryAdminListRowDto[] } | CategoriesHttpError;

function buildCategoriesListUrl(base: string, query: CategoriesListQuery): string {
  const source = query.source ?? 'config';
  if (source === 'sale') {
    const sp = new URLSearchParams();
    if (query.is_active === true || query.is_active === false) sp.set('is_active', String(query.is_active));
    const qs = sp.toString();
    return `${base}/v1/categories/sale-tickets${qs ? `?${qs}` : ''}`;
  }
  if (source === 'entry') {
    const sp = new URLSearchParams();
    if (query.is_active === true || query.is_active === false) sp.set('is_active', String(query.is_active));
    const qs = sp.toString();
    return `${base}/v1/categories/entry-tickets${qs ? `?${qs}` : ''}`;
  }
  const sp = new URLSearchParams();
  if (query.include_archived === true) sp.set('include_archived', 'true');
  if (query.is_active === true || query.is_active === false) sp.set('is_active', String(query.is_active));
  const qs = sp.toString();
  return `${base}/v1/categories/${qs ? `?${qs}` : ''}`;
}

/**
 * Liste catégories admin : configuration complète (`/v1/categories/`), vue caisse (`sale-tickets`)
 * ou vue dépôt (`entry-tickets`) — mêmes champs `CategoryV1Read` côté réponse.
 */
export async function getCategoriesListForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  query: CategoriesListQuery,
  signal?: AbortSignal,
): Promise<CategoriesListResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = buildCategoriesListUrl(base, query);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: authHeaders(auth),
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return categoriesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return categoriesHttpError(res.status, json, text || res.statusText);
  }
  if (!Array.isArray(json)) {
    return categoriesHttpError(res.status, json, 'Réponse catégories invalide (tableau attendu)');
  }
  const data: CategoryAdminListRowDto[] = [];
  for (const row of json) {
    const item = parseCategoryRow(row);
    if (item) data.push(item);
  }
  return { ok: true, data };
}
