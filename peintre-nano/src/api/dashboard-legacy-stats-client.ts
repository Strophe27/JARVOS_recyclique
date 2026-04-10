import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';

/** Plage ISO renvoyée par la même logique que `UnifiedDashboard` (legacy 1.4.4). */
export type DashboardDateRangeIso = { readonly start?: string; readonly end?: string };

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

/** Réponse `GET /v1/stats/reception/summary` (champs utilisés par le dashboard legacy). */
export type ReceptionStatsSummary = {
  readonly total_weight?: number;
  readonly total_items?: number;
};

/** Ligne `by-category` (réception / ventes) — même forme que le legacy. */
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

/** `GET /v1/stats/reception/summary` */
export async function fetchReceptionStatsSummary(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  range: DashboardDateRangeIso,
  signal?: AbortSignal,
): Promise<ReceptionStatsSummary> {
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
  return parseJsonResponse<ReceptionStatsSummary>(res);
}

/** `GET /v1/stats/reception/by-category` */
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
  return Array.isArray(data) ? (data as CategoryStatRow[]) : [];
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

/** Entrée `GET /v1/categories/` — champs utilisés pour filtrer les stats réception (catégories principales). */
export type CategoryListItem = {
  readonly name: string;
  readonly parent_id?: string | null;
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
    return {
      name: typeof o.name === 'string' ? o.name : '',
      parent_id,
    };
  });
}
