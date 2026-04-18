import type { components } from '../../../contracts/openapi/generated/recyclique-api';
import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

export type AdminDbImportSuccessResponse = components['schemas']['AdminDbImportSuccessResponse'];
export type AdminDbPurgeSuccessResponse = components['schemas']['AdminDbPurgeSuccessResponse'];

type DbHttpError = {
  ok: false;
  status: number;
  detail: string;
  code?: string;
  retryable?: boolean;
  networkError?: boolean;
};

function dbHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): DbHttpError {
  const p = parseRecycliqueApiErrorBody(json, status, fallbackDetail);
  const f = toRecycliqueClientFailure(status, p, networkError);
  return {
    ok: false,
    status,
    detail: f.message,
    code: f.code,
    retryable: f.retryable,
    networkError,
  };
}

function authHeaders(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  extra: Record<string, string>,
): Record<string, string> {
  const headers = { ...extra };
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

function nextIdempotencyKey(explicit?: string | null): string {
  const raw = explicit?.trim() || crypto.randomUUID();
  return raw.slice(0, 128);
}

export type AdminDbExportBlobResult =
  | { ok: true; blob: Blob; filename: string }
  | DbHttpError;

/**
 * `POST /v1/admin/db/export` — binaire pg_dump (`.dump`), `X-Step-Up-Pin` obligatoire (contrat reviewable).
 */
export async function postAdminDbExportBlob(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  args: { readonly stepUpPin: string; readonly signal?: AbortSignal },
): Promise<AdminDbExportBlobResult> {
  const pin = args.stepUpPin.trim();
  if (!pin) {
    return dbHttpError(0, null, 'Saisissez le PIN step-up pour l’export.');
  }

  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/admin/db/export`;
  const headers = authHeaders(auth, {
    Accept: 'application/octet-stream',
    'X-Step-Up-Pin': pin,
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      signal: args.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return dbHttpError(0, null, msg, true);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const json = parseJsonText(text);
    return dbHttpError(res.status, json, text || res.statusText);
  }

  const blob = await res.blob();
  let filename = 'recyclique_backup.dump';
  const cd = res.headers.get('content-disposition') ?? res.headers.get('Content-Disposition');
  if (cd) {
    const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (m?.[1]) {
      filename = m[1].replace(/['"]/g, '').trim() || filename;
    }
  }
  return { ok: true, blob, filename };
}

export type AdminDbPurgePostResult = { ok: true; data: AdminDbPurgeSuccessResponse } | DbHttpError;

/**
 * `POST /v1/admin/db/purge-transactions` — `X-Step-Up-Pin` + `Idempotency-Key` obligatoires.
 */
export async function postAdminDbPurgeTransactions(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  args: {
    readonly stepUpPin: string;
    readonly idempotencyKey?: string | null;
    readonly signal?: AbortSignal;
  },
): Promise<AdminDbPurgePostResult> {
  const pin = args.stepUpPin.trim();
  if (!pin) {
    return dbHttpError(0, null, 'Saisissez le PIN step-up pour la purge.');
  }
  const idem = nextIdempotencyKey(args.idempotencyKey);

  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/admin/db/purge-transactions`;
  const headers = authHeaders(auth, {
    Accept: 'application/json',
    'X-Step-Up-Pin': pin,
    'Idempotency-Key': idem,
  });

  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', credentials: 'include', headers, signal: args.signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return dbHttpError(0, null, msg, true);
  }

  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return dbHttpError(res.status, json, text || res.statusText);
  }
  if (!isRecord(json)) {
    return dbHttpError(res.status, json, 'Réponse purge invalide');
  }
  return { ok: true, data: json as AdminDbPurgeSuccessResponse };
}

export type AdminDbImportPostResult = { ok: true; data: AdminDbImportSuccessResponse } | DbHttpError;

/**
 * `POST /v1/admin/db/import` — multipart `file`, `X-Step-Up-Pin` + `Idempotency-Key` obligatoires.
 */
export async function postAdminDbImportDump(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  args: {
    readonly stepUpPin: string;
    readonly file: File;
    readonly idempotencyKey?: string | null;
    readonly signal?: AbortSignal;
  },
): Promise<AdminDbImportPostResult> {
  const pin = args.stepUpPin.trim();
  if (!pin) {
    return dbHttpError(0, null, 'Saisissez le PIN step-up pour l’import.');
  }
  const idem = nextIdempotencyKey(args.idempotencyKey);

  const form = new FormData();
  form.append('file', args.file);

  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/admin/db/import`;
  const headers = authHeaders(auth, {
    Accept: 'application/json',
    'X-Step-Up-Pin': pin,
    'Idempotency-Key': idem,
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: form,
      signal: args.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return dbHttpError(0, null, msg, true);
  }

  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return dbHttpError(res.status, json, text || res.statusText);
  }
  if (!isRecord(json)) {
    return dbHttpError(res.status, json, 'Réponse import invalide');
  }
  return { ok: true, data: json as AdminDbImportSuccessResponse };
}
