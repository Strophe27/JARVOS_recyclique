/**
 * Client API rapports caisse admin — Story 8.2.
 * GET /v1/admin/reports/cash-sessions, by-session/{id}, POST export-bulk.
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

export interface CashSessionReportItem {
  session_id: string;
  closed_at: string | null;
  opened_at: string;
  site_id: string;
  register_id: string;
  operator_id: string;
  status: string;
}

export async function getCashSessionReportsList(
  accessToken: string,
  params?: { limit?: number; offset?: number }
): Promise<CashSessionReportItem[]> {
  const url = buildUrl('/v1/admin/reports/cash-sessions');
  if (params?.limit != null) url.searchParams.set('limit', String(params.limit));
  if (params?.offset != null) url.searchParams.set('offset', String(params.offset));
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CashSessionReportItem[]>;
}

export async function getReportBySession(
  accessToken: string,
  sessionId: string
): Promise<Blob> {
  const url = `${getBase()}/v1/admin/reports/cash-sessions/by-session/${sessionId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.blob();
}

export interface ExportBulkBody {
  date_from?: string;
  date_to?: string;
  site_id?: string;
}

export interface ExportBulkResponse {
  message: string;
  session_ids: string[];
  count: number;
}

export async function postExportBulk(
  accessToken: string,
  body: ExportBulkBody
): Promise<ExportBulkResponse> {
  const res = await fetch(`${getBase()}/v1/admin/reports/cash-sessions/export-bulk`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<ExportBulkResponse>;
}
