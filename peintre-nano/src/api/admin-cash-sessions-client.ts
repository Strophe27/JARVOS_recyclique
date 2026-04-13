import type { AuthContextPort } from '../app/auth/auth-context-port';
import type { components } from '../../../contracts/openapi/generated/recyclique-api';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { DashboardLegacyApiError } from './dashboard-legacy-stats-client';

/** Ligne `GET /v1/cash-sessions/` — `recyclique_cashSessions_listSessions` (`CashSessionResponse`). */
export type CashSessionListItemV1 = components['schemas']['CashSessionResponse'];

export type CashSessionListFiltersV1 = {
  readonly skip?: number;
  readonly limit?: number;
  readonly status?: CashSessionListItemV1['status'];
  readonly operator_id?: string;
  readonly site_id?: string;
  readonly date_from?: string;
  readonly date_to?: string;
  readonly search?: string;
  readonly include_empty?: boolean;
  readonly amount_min?: number;
  readonly amount_max?: number;
  readonly variance_threshold?: number;
  readonly variance_has_variance?: boolean;
  readonly duration_min_hours?: number;
  readonly duration_max_hours?: number;
  readonly payment_methods?: readonly string[];
  readonly has_donation?: boolean;
};

export type CashSessionListResponseV1 = components['schemas']['CashSessionListResponseV1'];

/** Sous-ensemble utilisé par les filtres UI (liste sites contractuelle). */
export type AdminSitesListRow = Pick<components['schemas']['SiteV1Response'], 'id' | 'name'>;

function authHeaders(auth: Pick<AuthContextPort, 'getAccessToken'>): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Sérialise les filtres comme le legacy `cashSessionsService.list` (tableaux → clés répétées, bool en string).
 */
export function serializeCashSessionListParams(params: CashSessionListFiltersV1): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, unknown][]) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        sp.append(key, String(v));
      }
    } else if (typeof value === 'boolean') {
      sp.append(key, value ? 'true' : 'false');
    } else {
      sp.append(key, String(value));
    }
  }
  return sp;
}

function parseListItem(raw: Record<string, unknown>): CashSessionListItemV1 | null {
  const id = typeof raw.id === 'string' ? raw.id : String(raw.id ?? '');
  if (!id) return null;
  const st = raw.status;
  const status: CashSessionListItemV1['status'] = st === 'open' || st === 'closed' ? st : 'closed';
  const op = raw.operator_id;
  const operator_id = typeof op === 'string' ? op : String(op ?? '');
  const siteRaw = raw.site_id;
  const site_id = siteRaw === null || siteRaw === undefined ? '' : String(siteRaw);
  return {
    id,
    operator_id,
    site_id,
    register_id: raw.register_id == null ? null : String(raw.register_id),
    initial_amount: typeof raw.initial_amount === 'number' ? raw.initial_amount : 0,
    current_amount: typeof raw.current_amount === 'number' ? raw.current_amount : 0,
    status,
    opened_at: typeof raw.opened_at === 'string' ? raw.opened_at : String(raw.opened_at ?? ''),
    closed_at: raw.closed_at == null ? null : String(raw.closed_at),
    total_sales: typeof raw.total_sales === 'number' ? raw.total_sales : null,
    total_items: typeof raw.total_items === 'number' ? raw.total_items : null,
    number_of_sales: typeof raw.number_of_sales === 'number' ? raw.number_of_sales : null,
    total_donations: typeof raw.total_donations === 'number' ? raw.total_donations : null,
    closing_amount: typeof raw.closing_amount === 'number' ? raw.closing_amount : null,
    actual_amount: typeof raw.actual_amount === 'number' ? raw.actual_amount : null,
    variance: typeof raw.variance === 'number' ? raw.variance : null,
    variance_comment: raw.variance_comment == null ? null : String(raw.variance_comment),
  } as CashSessionListItemV1;
}

async function parseJsonOk<T>(res: Response): Promise<T> {
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
 * `GET /v1/cash-sessions/` — `recyclique_cashSessions_listSessions` (liste paginée + filtres).
 */
export async function fetchCashSessionsList(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  filters: CashSessionListFiltersV1,
  signal?: AbortSignal,
): Promise<CashSessionListResponseV1> {
  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const q = serializeCashSessionListParams(filters).toString();
  const url = `${base}/v1/cash-sessions/${q ? `?${q}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth), signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    throw new DashboardLegacyApiError(0, msg);
  }
  const payload = await parseJsonOk<unknown>(res);
  if (typeof payload !== 'object' || payload === null) {
    return {
      data: [],
      total: 0,
      skip: 0,
      limit: filters.limit ?? 20,
    };
  }
  const o = payload as Record<string, unknown>;
  const rawList = o.data;
  const rows: CashSessionListItemV1[] = [];
  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (typeof item !== 'object' || item === null) continue;
      const parsed = parseListItem(item as Record<string, unknown>);
      if (parsed) rows.push(parsed);
    }
  }
  return {
    data: rows,
    total: typeof o.total === 'number' ? o.total : rows.length,
    skip: typeof o.skip === 'number' ? o.skip : 0,
    limit: typeof o.limit === 'number' ? o.limit : filters.limit ?? 20,
  };
}

/**
 * `GET /v1/sites/` — `recyclique_sites_listSites` ; tolère échec réseau (liste vide).
 */
export async function fetchSitesList(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  signal?: AbortSignal,
): Promise<readonly AdminSitesListRow[]> {
  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/sites/`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth), signal });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return [];
  }
  if (!Array.isArray(json)) return [];
  const out: AdminSitesListRow[] = [];
  for (const raw of json) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id : String(r.id ?? '');
    if (!id) continue;
    const name = typeof r.name === 'string' && r.name.trim() ? r.name : id;
    out.push({ id, name });
  }
  return out;
}

export type CashSessionReportBlobResult =
  | { readonly ok: true; readonly blob: Blob; readonly filename: string }
  | { readonly ok: false; readonly message: string };

/** Format fichier — aligné `BulkExportRequest.format` (CSV ou classeur Excel). */
export type CashSessionsBulkExportFormat = 'csv' | 'excel';

/**
 * Filtres réellement lus par `POST /v1/admin/reports/cash-sessions/export-bulk` côté serveur
 * (`BulkExportFilters` — pas les filtres avancés du listing `GET /v1/cash-sessions/`).
 * L’écran session-manager désactive l’export tant que des filtres avancés du listing sont actifs.
 */
export type CashSessionsBulkExportFiltersV1 = {
  readonly date_from?: string;
  readonly date_to?: string;
  readonly status?: string;
  readonly operator_id?: string;
  readonly site_id?: string;
  readonly search?: string;
  readonly include_empty?: boolean;
};

function parseHttpErrorDetailText(text: string): string {
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    return text.trim() || 'Erreur inconnue';
  }
  if (typeof data !== 'object' || data === null) return text.trim() || 'Erreur inconnue';
  const d = (data as { detail?: unknown }).detail;
  if (typeof d === 'string' && d.trim()) return d.trim();
  if (typeof d === 'object' && d !== null) {
    const msg = (d as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
    const code = (d as { code?: unknown }).code;
    if (typeof code === 'string' && code.trim()) return code.trim();
  }
  return text.trim() || 'Erreur inconnue';
}

function userMessageForBulkExportFailure(status: number, detail: string): string {
  if (status === 403) {
    return "Vous n'avez pas les droits nécessaires, ou le code de confirmation est incorrect.";
  }
  if (status === 422) {
    return detail && detail.length < 200 ? detail : 'La demande est invalide ou incomplète.';
  }
  if (status === 429) {
    return 'Trop de demandes en peu de temps. Patientez avant de réessayer.';
  }
  if (status === 400) {
    return detail && detail.length < 200 ? detail : 'La demande est incomplète.';
  }
  if (status === 401) {
    return 'Session expirée. Reconnectez-vous.';
  }
  if (status === 0) {
    return detail || 'Erreur réseau';
  }
  return detail || `Erreur ${status}`;
}

/**
 * `POST /v1/admin/reports/cash-sessions/export-bulk` — `recyclique_admin_reports_cashSessionsExportBulk`.
 * En-têtes : `X-Step-Up-Pin` ; `Idempotency-Key` (contrat — le client en fournit un si absent).
 */
export async function fetchCashSessionsBulkExportBlob(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  args: {
    readonly filters: CashSessionsBulkExportFiltersV1;
    readonly format: CashSessionsBulkExportFormat;
    readonly stepUpPin: string;
    readonly idempotencyKey?: string;
    readonly signal?: AbortSignal;
  },
): Promise<CashSessionReportBlobResult> {
  const pin = args.stepUpPin.trim();
  if (!pin) {
    return { ok: false, message: 'Saisissez le code de confirmation.' };
  }

  const filtersPayload: Record<string, unknown> = {
    include_empty: args.filters.include_empty ?? false,
  };
  if (args.filters.date_from) filtersPayload.date_from = args.filters.date_from;
  if (args.filters.date_to) filtersPayload.date_to = args.filters.date_to;
  if (args.filters.status) filtersPayload.status = args.filters.status;
  if (args.filters.operator_id) filtersPayload.operator_id = args.filters.operator_id;
  if (args.filters.site_id) filtersPayload.site_id = args.filters.site_id;
  if (args.filters.search) filtersPayload.search = args.filters.search;

  const body = JSON.stringify({
    filters: filtersPayload,
    format: args.format,
  });

  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/admin/reports/cash-sessions/export-bulk`;
  const idem = (args.idempotencyKey?.trim() || crypto.randomUUID()).slice(0, 128);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: '*/*',
    'X-Step-Up-Pin': pin,
    'Idempotency-Key': idem,
  };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body,
      signal: args.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, message: userMessageForBulkExportFailure(0, msg) };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const detail = parseHttpErrorDetailText(text);
    return { ok: false, message: userMessageForBulkExportFailure(res.status, detail) };
  }

  const blob = await res.blob();
  let filename = args.format === 'csv' ? 'export_sessions_caisse.csv' : 'export_sessions_caisse.xlsx';
  const cd = res.headers.get('content-disposition') ?? res.headers.get('Content-Disposition');
  if (cd) {
    const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (m?.[1]) {
      filename = m[1].replace(/['"]/g, '').trim() || filename;
    }
  }
  return { ok: true, blob, filename };
}

/**
 * `GET /v1/admin/reports/cash-sessions/by-session/{session_id}` — `recyclique_admin_reports_cashSessionsDownloadBySession`.
 */
export async function fetchCashSessionReportBlobBySession(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  sessionId: string,
  signal?: AbortSignal,
): Promise<CashSessionReportBlobResult> {
  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/admin/reports/cash-sessions/by-session/${encodeURIComponent(sessionId)}`;
  const headers: Record<string, string> = { Accept: '*/*' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers, signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, message: msg };
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    return { ok: false, message: t || res.statusText || 'Téléchargement indisponible' };
  }
  const blob = await res.blob();
  let filename = `session_caisse_${sessionId}.csv`;
  const cd = res.headers.get('content-disposition') ?? res.headers.get('Content-Disposition');
  if (cd) {
    const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (m?.[1]) {
      filename = m[1].replace(/['"]/g, '').trim() || filename;
    }
  }
  return { ok: true, blob, filename };
}
