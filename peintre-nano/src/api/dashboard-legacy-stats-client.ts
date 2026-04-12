import type { AuthContextPort } from '../app/auth/auth-context-port';
import type { operations } from '../../../contracts/openapi/generated/recyclique-api';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';

/** Plage ISO renvoyée par la même logique que `UnifiedDashboard` (legacy 1.4.4). */
export type DashboardDateRangeIso = { readonly start?: string; readonly end?: string };

/** Types générés OpenAPI — `recyclique_stats_receptionSummary` (Story 19.1). */
export type ReceptionStatsSummaryResponse =
  operations['recyclique_stats_receptionSummary']['responses'][200]['content']['application/json'];

/** Types générés — `recyclique_stats_receptionByCategory`. */
export type ReceptionByCategoryResponse =
  operations['recyclique_stats_receptionByCategory']['responses'][200]['content']['application/json'];

/** Types générés — `recyclique_stats_unifiedLive` (successeur de `recyclique_reception_statsLiveDeprecated`). */
export type UnifiedLiveStatsResponse =
  operations['recyclique_stats_unifiedLive']['responses'][200]['content']['application/json'];

/** Aligné sur `CashSessionStats` (OpenAPI / schéma backend). */
export type CashSessionStatsSummary = {
  readonly total_sessions: number;
  readonly open_sessions: number;
  readonly closed_sessions: number;
  readonly total_sales: number;
  readonly total_items: number;
  readonly number_of_sales: number;
  readonly total_donations: number;
  readonly total_weight_sold: number;
  readonly average_session_duration?: number | null;
};

/** Ligne `by-category` (réception / ventes) — champs usuels ; corps OpenAPI = objet indexable. */
export type CategoryStatRow = {
  readonly category_name: string;
  readonly total_weight: number;
  readonly total_items: number;
};

export class DashboardLegacyApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DashboardLegacyApiError';
  }
}

function buildUrl(path: string, params: Record<string, string | undefined>): string {
  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const u = new URL(`${base}${path}`, 'http://local.invalid');
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      u.searchParams.set(k, v);
    }
  }
  return `${base}${path}${u.search}`;
}

function authHeaders(auth: Pick<AuthContextPort, 'getAccessToken'>): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/json',
  };
  const token = auth.getAccessToken?.();
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new DashboardLegacyApiError(res.status, 'Réponse JSON invalide');
  }
  if (!res.ok) {
    const detail =
      typeof data === 'object' && data !== null && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : text || res.statusText;
    throw new DashboardLegacyApiError(res.status, detail);
  }
  return data as T;
}

/**
 * `GET /v1/cash-sessions/stats/summary` — paramètres `date_from` / `date_to` (legacy `cashSessionsService.getKPIs`).
 */
export async function fetchCashSessionStatsSummary(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  range: DashboardDateRangeIso,
  signal?: AbortSignal,
): Promise<CashSessionStatsSummary> {
  const url = buildUrl('/v1/cash-sessions/stats/summary', {
    date_from: range.start,
    date_to: range.end,
  });
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(auth),
    signal,
  });
  return parseJsonResponse<CashSessionStatsSummary>(res);
}

/** `GET /v1/stats/reception/summary` — `recyclique_stats_receptionSummary`. */
export async function fetchReceptionStatsSummary(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  range: DashboardDateRangeIso,
  signal?: AbortSignal,
): Promise<ReceptionStatsSummaryResponse> {
  const url = buildUrl('/v1/stats/reception/summary', {
    start_date: range.start,
    end_date: range.end,
  });
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(auth),
    signal,
  });
  return parseJsonResponse<ReceptionStatsSummaryResponse>(res);
}

/** `GET /v1/stats/reception/by-category` — `recyclique_stats_receptionByCategory`. */
export async function fetchReceptionByCategory(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  range: DashboardDateRangeIso,
  signal?: AbortSignal,
): Promise<CategoryStatRow[]> {
  const url = buildUrl('/v1/stats/reception/by-category', {
    start_date: range.start,
    end_date: range.end,
  });
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(auth),
    signal,
  });
  const data = await parseJsonResponse<unknown>(res);
  if (!Array.isArray(data)) {
    return [];
  }
  const rows: CategoryStatRow[] = [];
  for (const raw of data as ReceptionByCategoryResponse) {
    const o = raw as Record<string, unknown>;
    const category_name = typeof o.category_name === 'string' ? o.category_name : '';
    const total_weight = typeof o.total_weight === 'number' ? o.total_weight : Number(o.total_weight) || 0;
    const total_items = typeof o.total_items === 'number' ? o.total_items : Number(o.total_items) || 0;
    rows.push({ category_name, total_weight, total_items });
  }
  return rows;
}

/** `GET /v1/stats/live` — `recyclique_stats_unifiedLive` (préféré à `GET /v1/reception/stats/live` déprécié). */
export async function fetchUnifiedLiveStats(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  params: { period_type: '24h' | 'daily'; site_id?: string | null },
  signal?: AbortSignal,
): Promise<UnifiedLiveStatsResponse> {
  const url = buildUrl('/v1/stats/live', {
    period_type: params.period_type,
    site_id: params.site_id ?? undefined,
  });
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(auth),
    signal,
  });
  return parseJsonResponse<UnifiedLiveStatsResponse>(res);
}

/** `GET /v1/stats/sales/by-category` */
export async function fetchSalesByCategory(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  range: DashboardDateRangeIso,
  signal?: AbortSignal,
): Promise<CategoryStatRow[]> {
  const url = buildUrl('/v1/stats/sales/by-category', {
    start_date: range.start,
    end_date: range.end,
  });
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(auth),
    signal,
  });
  const data = await parseJsonResponse<unknown>(res);
  return Array.isArray(data) ? (data as CategoryStatRow[]) : [];
}

/** Entrée `GET /v1/categories/` — aligné legacy `Category` (caisse / stats). */
export type CategoryListItem = {
  /** Identifiant serveur ; absent sur anciennes réponses → chaîne vide (fallback `name` côté UI). */
  readonly id: string;
  readonly name: string;
  readonly parent_id?: string | null;
  /** Défaut `true` si le champ est absent du JSON. */
  readonly is_active: boolean;
  readonly display_order: number;
  readonly shortcut_key?: string | null;
};

/** `GET /v1/categories/` */
export async function fetchCategoriesList(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  signal?: AbortSignal,
): Promise<CategoryListItem[]> {
  const url = buildUrl('/v1/categories/', {});
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(auth),
    signal,
  });
  const data = await parseJsonResponse<unknown>(res);
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((raw) => {
    const o = raw as Record<string, unknown>;
    const pid = o.parent_id;
    const parent_id =
      pid === null || pid === undefined ? null : typeof pid === 'string' ? pid : String(pid);
    const idRaw = o.id;
    const id = idRaw === null || idRaw === undefined ? '' : typeof idRaw === 'string' ? idRaw : String(idRaw);
    const name = typeof o.name === 'string' ? o.name : '';
    const is_active = o.is_active === undefined ? true : Boolean(o.is_active);
    const display_order = typeof o.display_order === 'number' ? o.display_order : 0;
    const sk = o.shortcut_key;
    const shortcut_key =
      sk === null || sk === undefined ? null : typeof sk === 'string' ? sk : String(sk);
    return {
      id: id || name,
      name,
      parent_id,
      is_active,
      display_order,
      shortcut_key,
    };
  });
}
