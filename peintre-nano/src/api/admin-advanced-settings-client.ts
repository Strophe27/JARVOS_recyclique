import type { components } from '../../../contracts/openapi/generated/recyclique-api';
import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

export type AdminSettingsSessionEnvelope = components['schemas']['AdminSettingsSessionEnvelope'];
export type AdminSettingsSessionUpdateBody = components['schemas']['AdminSettingsSessionUpdateBody'];
export type AdminSettingsEmailEnvelope = components['schemas']['AdminSettingsEmailEnvelope'];
export type AdminSettingsEmailUpdateBody = components['schemas']['AdminSettingsEmailUpdateBody'];
export type AdminSettingsEmailTestRequest = components['schemas']['AdminSettingsEmailTestRequest'];
export type AdminSettingsEmailTestResponse = components['schemas']['AdminSettingsEmailTestResponse'];
export type AdminSettingsAlertThresholdsEnvelope = components['schemas']['AdminSettingsAlertThresholdsEnvelope'];
export type AdminSettingsAlertThresholdsUpdateBody = components['schemas']['AdminSettingsAlertThresholdsUpdateBody'];
export type AdminActivityThresholdResponse = components['schemas']['AdminActivityThresholdResponse'];
export type AdminActivityThresholdUpdateBody = components['schemas']['AdminActivityThresholdUpdateBody'];
export type AdminActivityThresholdPutResponse = components['schemas']['AdminActivityThresholdPutResponse'];

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

function parseJsonRecord(json: unknown): Record<string, unknown> | null {
  if (!isRecord(json)) return null;
  return json;
}

export type AdminSettingsEmailGetResult =
  | { ok: true; data: AdminSettingsEmailEnvelope }
  | SettingsHttpError;

/** GET `/v1/admin/settings/email` — SUPER_ADMIN côté API. */
export async function fetchAdminSettingsEmail(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  signal?: AbortSignal,
): Promise<AdminSettingsEmailGetResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/settings/email`;
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
  const rec = parseJsonRecord(json);
  if (!rec) return settingsHttpError(res.status, json, 'Réponse paramètres e-mail invalide');
  return { ok: true, data: rec as AdminSettingsEmailEnvelope };
}

export type AdminSettingsEmailPutResult =
  | { ok: true; data: AdminSettingsEmailEnvelope }
  | SettingsHttpError;

/** PUT `/v1/admin/settings/email`. */
export async function putAdminSettingsEmail(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: AdminSettingsEmailUpdateBody,
  signal?: AbortSignal,
): Promise<AdminSettingsEmailPutResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/settings/email`;
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
  const rec = parseJsonRecord(json);
  if (!rec) return settingsHttpError(res.status, json, 'Réponse paramètres e-mail invalide');
  return { ok: true, data: rec as AdminSettingsEmailEnvelope };
}

export type AdminSettingsEmailTestPostResult =
  | { ok: true; data: AdminSettingsEmailTestResponse }
  | SettingsHttpError;

/** POST `/v1/admin/settings/email/test`. */
export async function postAdminSettingsEmailTest(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: AdminSettingsEmailTestRequest,
  signal?: AbortSignal,
): Promise<AdminSettingsEmailTestPostResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/settings/email/test`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
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
  const rec = parseJsonRecord(json);
  if (!rec) return settingsHttpError(res.status, json, 'Réponse test e-mail invalide');
  return { ok: true, data: rec as AdminSettingsEmailTestResponse };
}

export type AdminSettingsActivityThresholdGetResult =
  | { ok: true; data: AdminActivityThresholdResponse }
  | SettingsHttpError;

/** GET `/v1/admin/settings/activity-threshold` — admin ou super-admin côté API. */
export async function fetchAdminSettingsActivityThreshold(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  signal?: AbortSignal,
): Promise<AdminSettingsActivityThresholdGetResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/settings/activity-threshold`;
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
  const rec = parseJsonRecord(json);
  if (!rec) return settingsHttpError(res.status, json, 'Réponse seuil activité invalide');
  return { ok: true, data: rec as AdminActivityThresholdResponse };
}

export type AdminSettingsActivityThresholdPutResult =
  | { ok: true; data: AdminActivityThresholdPutResponse }
  | SettingsHttpError;

/** PUT `/v1/admin/settings/activity-threshold`. */
export async function putAdminSettingsActivityThreshold(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: AdminActivityThresholdUpdateBody,
  signal?: AbortSignal,
): Promise<AdminSettingsActivityThresholdPutResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/settings/activity-threshold`;
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
  const rec = parseJsonRecord(json);
  if (!rec) return settingsHttpError(res.status, json, 'Réponse seuil activité invalide');
  return { ok: true, data: rec as AdminActivityThresholdPutResponse };
}

export type AdminSettingsAlertThresholdsGetResult =
  | { ok: true; data: AdminSettingsAlertThresholdsEnvelope }
  | SettingsHttpError;

/** GET `/v1/admin/settings/alert-thresholds` — `site_id` optionnel. */
export async function fetchAdminSettingsAlertThresholds(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  siteId?: string | null,
  signal?: AbortSignal,
): Promise<AdminSettingsAlertThresholdsGetResult> {
  const base = getLiveSnapshotBasePrefix();
  const q = siteId ? `?site_id=${encodeURIComponent(siteId)}` : '';
  const url = `${base}/v1/admin/settings/alert-thresholds${q}`;
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
  const rec = parseJsonRecord(json);
  if (!rec?.thresholds || typeof rec.thresholds !== 'object') {
    return settingsHttpError(res.status, json, 'Réponse seuils d’alerte invalide');
  }
  return { ok: true, data: rec as AdminSettingsAlertThresholdsEnvelope };
}

export type AdminSettingsAlertThresholdsPutResult =
  | { ok: true; data: AdminSettingsAlertThresholdsEnvelope }
  | SettingsHttpError;

/** PUT `/v1/admin/settings/alert-thresholds`. */
export async function putAdminSettingsAlertThresholds(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: AdminSettingsAlertThresholdsUpdateBody,
  signal?: AbortSignal,
): Promise<AdminSettingsAlertThresholdsPutResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/settings/alert-thresholds`;
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
  const rec = parseJsonRecord(json);
  if (!rec?.thresholds || typeof rec.thresholds !== 'object') {
    return settingsHttpError(res.status, json, 'Réponse seuils d’alerte invalide');
  }
  return { ok: true, data: rec as AdminSettingsAlertThresholdsEnvelope };
}
