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

/** Extrait le filename du header Content-Disposition (Story 17.9). */
function parseContentDispositionFilename(cd: string | null): string | null {
  if (!cd) return null;
  const m = cd.match(/filename="?([^";\n]+)"?/i);
  return m ? m[1].replace(/^"|"$/g, '').trim() : null;
}

export async function getReportBySession(
  accessToken: string,
  sessionId: string
): Promise<{ blob: Blob; filename: string }> {
  const url = `${getBase()}/v1/admin/reports/cash-sessions/by-session/${sessionId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  const blob = await res.blob();
  const filename =
    parseContentDispositionFilename(res.headers.get('Content-Disposition'))
    ?? `rapport-session-${sessionId}.csv`;
  return { blob, filename };
}

export interface ExportBulkBody {
  date_from?: string;
  date_to?: string;
  site_id?: string;
}

/** Retourne le Blob ZIP de l'export bulk + filename (Story 17.9). */
export async function postExportBulk(
  accessToken: string,
  body: ExportBulkBody
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${getBase()}/v1/admin/reports/cash-sessions/export-bulk`, {
    method: 'POST',
    headers: { ...getAuthHeaders(accessToken), Accept: 'application/zip' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  const blob = await res.blob();
  const filename =
    parseContentDispositionFilename(res.headers.get('Content-Disposition'))
    ?? `export-bulk-${new Date().toISOString().slice(0, 10)}.zip`;
  return { blob, filename };
}
