/**
 * Client API admin BDD — Story 18.3.
 * POST /v1/admin/db/export, purge-transactions, import.
 * Interfaces et timeouts alignés sur la 1.4.4.
 */

const getBase = (): string =>
  (import.meta.env?.VITE_API_BASE_URL as string) ?? '';

function getAuthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function getAuthHeadersJson(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export interface DbPurgeResponse {
  message: string;
  deleted_records: {
    sale_items: number;
    sales: number;
    ligne_depot: number;
    ticket_depot: number;
    cash_sessions: number;
  };
  timestamp: string;
}

export interface DbImportResponse {
  message: string;
  imported_file: string;
  backup_created: string;
  backup_path: string;
  timestamp: string;
}

export async function postAdminDbExport(accessToken: string): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1_200_000);
  try {
    const res = await fetch(`${getBase()}/v1/admin/db/export`, {
      method: 'POST',
      headers: getAuthHeaders(accessToken),
      signal: controller.signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
      throw new Error(msg);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition');
    const match = disposition?.match(/filename="?([^";]+)"?/);
    const name = match?.[1] ?? 'recyclic_db_export.dump';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error("L'opération a dépassé le délai autorisé.");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function postAdminDbPurgeTransactions(
  accessToken: string
): Promise<DbPurgeResponse> {
  const res = await fetch(`${getBase()}/v1/admin/db/purge-transactions`, {
    method: 'POST',
    headers: getAuthHeadersJson(accessToken),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<DbPurgeResponse>;
}

export async function postAdminDbImport(
  accessToken: string,
  file: File
): Promise<DbImportResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 600_000);
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${getBase()}/v1/admin/db/import`, {
      method: 'POST',
      headers: getAuthHeaders(accessToken),
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
      throw new Error(msg);
    }
    return res.json() as Promise<DbImportResponse>;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error("L'opération a dépassé le délai autorisé.");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}
