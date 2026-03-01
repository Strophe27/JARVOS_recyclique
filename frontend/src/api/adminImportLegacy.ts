/**
 * Client API admin import legacy — Story 8.5.
 * GET /v1/admin/import/legacy/llm-models, POST analyze, preview, validate, execute.
 */

const getBase = (): string =>
  (import.meta.env?.VITE_API_BASE_URL as string) ?? '';

function getAuthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export interface LegacyLlmModelsResponse {
  models: string[];
}

export async function getAdminImportLegacyLlmModels(
  accessToken: string
): Promise<LegacyLlmModelsResponse> {
  const res = await fetch(`${getBase()}/v1/admin/import/legacy/llm-models`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<LegacyLlmModelsResponse>;
}

export interface LegacyAnalyzeResponse {
  columns: string[];
  row_count?: number;
  errors: string[];
  warnings: string[];
}

export async function postAdminImportLegacyAnalyze(
  accessToken: string,
  file: File
): Promise<LegacyAnalyzeResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getBase()}/v1/admin/import/legacy/analyze`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<LegacyAnalyzeResponse>;
}

export interface LegacyPreviewResponse {
  rows: unknown[];
  total: number;
}

export async function postAdminImportLegacyPreview(
  accessToken: string,
  file: File
): Promise<LegacyPreviewResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getBase()}/v1/admin/import/legacy/preview`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<LegacyPreviewResponse>;
}

export interface LegacyValidateResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function postAdminImportLegacyValidate(
  accessToken: string,
  file: File
): Promise<LegacyValidateResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getBase()}/v1/admin/import/legacy/validate`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<LegacyValidateResponse>;
}

export interface LegacyExecuteResponse {
  imported_count: number;
  errors: string[];
  message?: string;
}

export async function postAdminImportLegacyExecute(
  accessToken: string,
  file: File
): Promise<LegacyExecuteResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getBase()}/v1/admin/import/legacy/execute`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<LegacyExecuteResponse>;
}
