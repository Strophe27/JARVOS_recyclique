/**
 * Client API admin santé, audit-log, settings, email-logs — Story 8.4.
 * GET /v1/admin/health, /health/database, /health/scheduler, /health/anomalies.
 * GET /v1/admin/audit-log, GET/PUT /v1/admin/settings, GET /v1/admin/email-logs.
 */

import { buildUrl } from './_buildUrl';

const getBase = (): string =>
  (import.meta.env?.VITE_API_BASE_URL as string) ?? '';

function getAuthHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export interface AdminHealthResponse {
  status: string;
  database: string;
  redis: string;
  push_worker: string;
}

export async function getAdminHealth(accessToken: string): Promise<AdminHealthResponse> {
  const res = await fetch(`${getBase()}/v1/admin/health`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminHealthResponse>;
}

export interface AdminHealthDatabaseResponse {
  status: string;
}

export async function getAdminHealthDatabase(
  accessToken: string
): Promise<AdminHealthDatabaseResponse> {
  const res = await fetch(`${getBase()}/v1/admin/health/database`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminHealthDatabaseResponse>;
}

export interface AdminHealthSchedulerResponse {
  status: string;
  configured: boolean;
  running: boolean;
  last_error: string | null;
  last_success_at: string | null;
}

export async function getAdminHealthScheduler(
  accessToken: string
): Promise<AdminHealthSchedulerResponse> {
  const res = await fetch(`${getBase()}/v1/admin/health/scheduler`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminHealthSchedulerResponse>;
}

export interface AdminHealthAnomalyItem {
  code: string;
  component: string;
  message: string;
  severity: string;
}

export interface AdminHealthAnomaliesResponse {
  items: AdminHealthAnomalyItem[];
  count: number;
}

export async function getAdminHealthAnomalies(
  accessToken: string
): Promise<AdminHealthAnomaliesResponse> {
  const res = await fetch(`${getBase()}/v1/admin/health/anomalies`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminHealthAnomaliesResponse>;
}

export interface TestNotificationsResponse {
  message: string;
  configured?: boolean;
}

export async function postAdminHealthTestNotifications(
  accessToken: string
): Promise<TestNotificationsResponse> {
  const res = await fetch(`${getBase()}/v1/admin/health/test-notifications`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<TestNotificationsResponse>;
}

export interface AuditEventItem {
  id: string;
  timestamp: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: string | null;
}

export interface AuditLogListResponse {
  items: AuditEventItem[];
  total: number;
  page: number;
  page_size: number;
}

export async function getAdminAuditLog(
  accessToken: string,
  params?: {
    page?: number;
    page_size?: number;
    date_from?: string;
    date_to?: string;
    event_type?: string;
    user_id?: string;
  }
): Promise<AuditLogListResponse> {
  const url = buildUrl('/v1/admin/audit-log');
  if (params?.page != null) url.searchParams.set('page', String(params.page));
  if (params?.page_size != null) url.searchParams.set('page_size', String(params.page_size));
  if (params?.date_from) url.searchParams.set('date_from', params.date_from);
  if (params?.date_to) url.searchParams.set('date_to', params.date_to);
  if (params?.event_type) url.searchParams.set('event_type', params.event_type);
  if (params?.user_id) url.searchParams.set('user_id', params.user_id);
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AuditLogListResponse>;
}

export interface SettingsResponse {
  alert_thresholds: Record<string, unknown> | null;
  session: Record<string, unknown> | null;
  email: Record<string, unknown> | null;
  activity_threshold: number | null;
}

export async function getAdminSettings(accessToken: string): Promise<SettingsResponse> {
  const res = await fetch(`${getBase()}/v1/admin/settings`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<SettingsResponse>;
}

export interface SettingsUpdateBody {
  alert_thresholds?: Record<string, unknown>;
  session?: Record<string, unknown>;
  email?: Record<string, unknown>;
  activity_threshold?: number;
}

export async function putAdminSettings(
  accessToken: string,
  body: SettingsUpdateBody
): Promise<SettingsResponse> {
  const res = await fetch(`${getBase()}/v1/admin/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<SettingsResponse>;
}

export interface SettingsEmailTestResponse {
  message: string;
  configured?: boolean;
}

export async function postAdminSettingsEmailTest(
  accessToken: string
): Promise<SettingsEmailTestResponse> {
  const res = await fetch(`${getBase()}/v1/admin/settings/email/test`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<SettingsEmailTestResponse>;
}

export interface EmailLogItem {
  id: string;
  sent_at: string;
  recipient: string;
  subject: string;
  status: string;
}

export interface EmailLogsListResponse {
  items: EmailLogItem[];
  total: number;
  page: number;
  page_size: number;
}

export async function getAdminEmailLogs(
  accessToken: string,
  params?: { page?: number; page_size?: number }
): Promise<EmailLogsListResponse> {
  const url = buildUrl('/v1/admin/email-logs');
  if (params?.page != null) url.searchParams.set('page', String(params.page));
  if (params?.page_size != null) url.searchParams.set('page_size', String(params.page_size));
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<EmailLogsListResponse>;
}

export interface ReceptionExportBulkBody {
  date_from?: string;
  date_to?: string;
  poste_id?: string;
  status?: string;
}

/**
 * POST /v1/admin/reports/reception-tickets/export-bulk — export CSV des tickets réception (filtres).
 * Télécharge le fichier côté client.
 */
export async function postAdminReceptionTicketsExportBulk(
  accessToken: string,
  body: ReceptionExportBulkBody = {}
): Promise<void> {
  const res = await fetch(`${getBase()}/v1/admin/reports/reception-tickets/export-bulk`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="?([^";]+)"?/);
  const name = match?.[1] ?? 'reception-tickets-export.csv';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
