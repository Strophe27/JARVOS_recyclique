import type { components } from '../../../contracts/openapi/generated/recyclique-api';
import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

/** Réponse `GET /v1/categories/` — `recyclique_categories_listCategories`. */
export type CategoryAdminListRowDto = components['schemas']['CategoryV1Read'];

export type CategoryV1CreateRequestBody = components['schemas']['CategoryV1CreateRequest'];
export type CategoryV1UpdateRequestBody = components['schemas']['CategoryV1UpdateRequest'];
export type CategoryV1VisibilityPatchBody = components['schemas']['CategoryV1VisibilityPatchRequest'];

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

export type CategoryMutationResult = { ok: true; data: CategoryAdminListRowDto } | CategoriesHttpError;

function singleCategoryResponse(
  res: Response,
  json: unknown,
  fallbackDetail: string,
): CategoryMutationResult {
  if (!res.ok) {
    return categoriesHttpError(res.status, json, fallbackDetail);
  }
  const row = parseCategoryRow(json);
  if (!row) {
    return categoriesHttpError(res.status, json, 'Réponse catégorie invalide');
  }
  return { ok: true, data: row };
}

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

/**
 * `POST /v1/categories/` — `recyclique_categories_createCategory`.
 */
export async function createCategoryForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: CategoryV1CreateRequestBody,
  signal?: AbortSignal,
): Promise<CategoryMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/categories/`;
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
    return categoriesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  return singleCategoryResponse(res, json, text || res.statusText);
}

/**
 * `PUT /v1/categories/{category_id}` — `recyclique_categories_updateCategory`.
 */
export async function updateCategoryForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  categoryId: string,
  body: CategoryV1UpdateRequestBody,
  signal?: AbortSignal,
): Promise<CategoryMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/categories/${encodeURIComponent(categoryId)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: authHeaders(auth, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return categoriesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  return singleCategoryResponse(res, json, text || res.statusText);
}

/**
 * `PUT /v1/categories/{category_id}/display-order` — `recyclique_categories_updateCategoryDisplayOrder`.
 */
export async function patchCategoryDisplayOrderForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  categoryId: string,
  display_order: number,
  signal?: AbortSignal,
): Promise<CategoryMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/categories/${encodeURIComponent(categoryId)}/display-order`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: authHeaders(auth, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ display_order }),
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return categoriesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  return singleCategoryResponse(res, json, text || res.statusText);
}

/**
 * `PUT /v1/categories/{category_id}/display-order-entry` — `recyclique_categories_updateCategoryDisplayOrderEntry`.
 */
export async function patchCategoryDisplayOrderEntryForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  categoryId: string,
  display_order_entry: number,
  signal?: AbortSignal,
): Promise<CategoryMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/categories/${encodeURIComponent(categoryId)}/display-order-entry`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: authHeaders(auth, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ display_order_entry }),
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return categoriesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  return singleCategoryResponse(res, json, text || res.statusText);
}

/**
 * `PUT /v1/categories/{category_id}/visibility` — `recyclique_categories_updateCategoryVisibility`.
 */
export async function patchCategoryVisibilityForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  categoryId: string,
  body: CategoryV1VisibilityPatchBody,
  signal?: AbortSignal,
): Promise<CategoryMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/categories/${encodeURIComponent(categoryId)}/visibility`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: authHeaders(auth, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return categoriesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  return singleCategoryResponse(res, json, text || res.statusText);
}

/**
 * `DELETE /v1/categories/{category_id}` — `recyclique_categories_softDeleteCategory`.
 */
export async function softDeleteCategoryForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  categoryId: string,
  signal?: AbortSignal,
): Promise<CategoryMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/categories/${encodeURIComponent(categoryId)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'DELETE',
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
  return singleCategoryResponse(res, json, text || res.statusText);
}

/**
 * `POST /v1/categories/{category_id}/restore` — `recyclique_categories_restoreCategory`.
 */
export async function restoreCategoryForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  categoryId: string,
  signal?: AbortSignal,
): Promise<CategoryMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/categories/${encodeURIComponent(categoryId)}/restore`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
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
  return singleCategoryResponse(res, json, text || res.statusText);
}

/** Formats d'export serveur — `GET /v1/categories/actions/export` (query `format`). */
export type CategoryExportServerFormat = 'pdf' | 'xls' | 'csv';

export type CategoriesBlobDownloadResult =
  | { ok: true; blob: Blob; filename: string }
  | CategoriesHttpError;

export type CategoryV1ImportAnalyzeResponseDto = components['schemas']['CategoryV1ImportAnalyzeResponse'];
export type CategoryV1ImportExecuteRequestBody = components['schemas']['CategoryV1ImportExecuteRequest'];
export type CategoryV1ImportExecuteResultDto = components['schemas']['CategoryV1ImportExecuteResult'];

export type CategoriesImportAnalyzeResult =
  | { ok: true; data: CategoryV1ImportAnalyzeResponseDto }
  | CategoriesHttpError;

export type CategoriesImportExecuteResult =
  | { ok: true; data: CategoryV1ImportExecuteResultDto }
  | CategoriesHttpError;

function defaultFilenameForCategoryExport(format: CategoryExportServerFormat): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  if (format === 'pdf') return `categories-${stamp}.pdf`;
  if (format === 'xls') return `categories-${stamp}.xlsx`;
  return `categories-${stamp}.csv`;
}

function filenameFromContentDispositionHeader(cd: string | null, fallback: string): string {
  if (!cd) return fallback;
  const m = cd.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1].replace(/"/g, '').trim()) || fallback;
    } catch {
      return m[1].replace(/"/g, '').trim() || fallback;
    }
  }
  const m2 = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (m2?.[1]) {
    return m2[1].replace(/['"]/g, '').trim() || fallback;
  }
  return fallback;
}

function parseImportAnalyzeResponse(json: unknown): CategoryV1ImportAnalyzeResponseDto | null {
  if (!isRecord(json)) return null;
  if (!('session_id' in json) || !('summary' in json) || !('sample' in json) || !('errors' in json) || !('warnings' in json)) {
    return null;
  }
  const sid = json.session_id;
  if (sid !== null && sid !== undefined && typeof sid !== 'string') return null;
  const summary = json.summary;
  if (typeof summary !== 'object' || summary === null || Array.isArray(summary)) return null;
  if (!Array.isArray(json.sample)) return null;
  if (!Array.isArray(json.errors) || !json.errors.every((e) => typeof e === 'string')) return null;
  if (!Array.isArray(json.warnings) || !json.warnings.every((w) => typeof w === 'string')) return null;
  return {
    session_id: sid === undefined ? null : (sid as string | null),
    summary: summary as CategoryV1ImportAnalyzeResponseDto['summary'],
    sample: json.sample as CategoryV1ImportAnalyzeResponseDto['sample'],
    errors: json.errors,
    warnings: json.warnings,
  };
}

function parseImportExecuteResult(json: unknown): CategoryV1ImportExecuteResultDto | null {
  if (!isRecord(json)) return null;
  if (typeof json.imported !== 'number' || typeof json.updated !== 'number') return null;
  if (!Array.isArray(json.errors) || !json.errors.every((e) => typeof e === 'string')) return null;
  return {
    imported: json.imported,
    updated: json.updated,
    errors: json.errors,
  };
}

/**
 * `GET /v1/categories/actions/export` — `recyclique_categories_exportCategories`.
 */
export async function fetchCategoriesExportBlob(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  args: { readonly format: CategoryExportServerFormat; readonly signal?: AbortSignal },
): Promise<CategoriesBlobDownloadResult> {
  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/categories/actions/export?format=${encodeURIComponent(args.format)}`;
  const headers: Record<string, string> = { Accept: '*/*' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers,
      signal: args.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return categoriesHttpError(0, null, msg, true);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const json = parseJsonText(text);
    return categoriesHttpError(res.status, json, text || res.statusText);
  }
  const blob = await res.blob();
  const filename = filenameFromContentDispositionHeader(
    res.headers.get('content-disposition') ?? res.headers.get('Content-Disposition'),
    defaultFilenameForCategoryExport(args.format),
  );
  return { ok: true, blob, filename };
}

/**
 * `GET /v1/categories/import/template` — `recyclique_categories_downloadCategoriesImportTemplate`.
 */
export async function fetchCategoriesImportTemplateBlob(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  signal?: AbortSignal,
): Promise<CategoriesBlobDownloadResult> {
  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/categories/import/template`;
  const headers: Record<string, string> = { Accept: 'text/csv,*/*' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers,
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return categoriesHttpError(0, null, msg, true);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const json = parseJsonText(text);
    return categoriesHttpError(res.status, json, text || res.statusText);
  }
  const blob = await res.blob();
  const filename = filenameFromContentDispositionHeader(
    res.headers.get('content-disposition') ?? res.headers.get('Content-Disposition'),
    'categories-import-template.csv',
  );
  return { ok: true, blob, filename };
}

/**
 * `POST /v1/categories/import/analyze` — `recyclique_categories_analyzeCategoriesImport` (multipart, champ `file`).
 */
export async function analyzeCategoriesImportForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  file: File,
  signal?: AbortSignal,
): Promise<CategoriesImportAnalyzeResult> {
  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/categories/import/analyze`;
  const fd = new FormData();
  fd.append('file', file);
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: fd,
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
  const data = parseImportAnalyzeResponse(json);
  if (!data) {
    return categoriesHttpError(res.status, json, 'Réponse analyse import invalide');
  }
  return { ok: true, data };
}

/**
 * `POST /v1/categories/import/execute` — `recyclique_categories_executeCategoriesImport`.
 */
export async function executeCategoriesImportForAdmin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: CategoryV1ImportExecuteRequestBody,
  signal?: AbortSignal,
): Promise<CategoriesImportExecuteResult> {
  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/categories/import/execute`;
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
    return categoriesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return categoriesHttpError(res.status, json, text || res.statusText);
  }
  const data = parseImportExecuteResult(json);
  if (!data) {
    return categoriesHttpError(res.status, json, 'Réponse exécution import invalide');
  }
  return { ok: true, data };
}
