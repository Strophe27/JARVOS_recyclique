import type { components } from '../../../contracts/openapi/generated/recyclique-api';
import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

export type AdminSettingsSessionEnvelope = components['schemas']['AdminSettingsSessionEnvelope'];
export type AdminSettingsSessionUpdateBody = components['schemas']['AdminSettingsSessionUpdateBody'];

type SettingsHttpError = {
  ok: false;
  status: number;
  detail: string;
  code?: string;
  retryable?: boolean;
  networkError?: boolean;
};

function settingsHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): SettingsHttpError {
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

function parseSessionEnvelope(json: unknown): AdminSettingsSessionEnvelope | null {
  if (!isRecord(json)) return null;
  const m = json.token_expiration_minutes;
  if (m !== undefined && typeof m !== 'number') return null;
  return json as AdminSettingsSessionEnvelope;
}

export type AdminSettingsSessionGetResult =
  | { ok: true; data: AdminSettingsSessionEnvelope }
  | SettingsHttpError;

/** GET `/v1/admin/settings/session` — autorité SUPER_ADMIN côté API. */
export async function fetchAdminSettingsSession(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  signal?: AbortSignal,
): Promise<AdminSettingsSessionGetResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/settings/session`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth), signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return settingsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return settingsHttpError(res.status, json, text || res.statusText);
  }
  const data = parseSessionEnvelope(json);
  if (!data) return settingsHttpError(res.status, json, 'Réponse paramètres session invalide');
  return { ok: true, data };
}

export type AdminSettingsSessionPutResult =
  | { ok: true; data: AdminSettingsSessionEnvelope }
  | SettingsHttpError;

/** PUT `/v1/admin/settings/session` — corps `AdminSettingsSessionUpdateBody`. */
export async function putAdminSettingsSession(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: AdminSettingsSessionUpdateBody,
  signal?: AbortSignal,
): Promise<AdminSettingsSessionPutResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/settings/session`;
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
    return settingsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return settingsHttpError(res.status, json, text || res.statusText);
  }
  const data = parseSessionEnvelope(json);
  if (!data) return settingsHttpError(res.status, json, 'Réponse paramètres session invalide');
  return { ok: true, data };
}
