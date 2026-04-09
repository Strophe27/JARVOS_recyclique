import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import type { ContextEnvelopeStub } from '../types/context-envelope';
import { contextEnvelopeStubFromApi } from './context-envelope-from-api';

/** Stockage session navigateur — tests terrain uniquement ; en prod viser cookies httpOnly (`use_web_session_cookies`). */
export const LIVE_AUTH_ACCESS_TOKEN_STORAGE_KEY = 'peintre-nano.recyclique.access_token';

export type RecycliqueLoginOk = {
  ok: true;
  accessToken: string;
  refreshToken: string | null;
  userId: string | undefined;
};

export type RecycliqueLoginFail = { ok: false; status: number; message: string };

export type RecycliqueLoginResult = RecycliqueLoginOk | RecycliqueLoginFail;

/**
 * `POST /v1/auth/login` — `operationId` `recyclique_auth_login`.
 */
export async function postRecycliqueLogin(
  username: string,
  password: string,
  options?: { readonly useWebSessionCookies?: boolean },
): Promise<RecycliqueLoginResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/auth/login`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username: username.trim(),
        password,
        use_web_session_cookies: options?.useWebSessionCookies ?? false,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, status: 0, message: `${msg} (POST /v1/auth/login)` };
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const detail =
      typeof json === 'object' && json !== null && 'detail' in json
        ? String((json as { detail: unknown }).detail)
        : text || res.statusText;
    return {
      ok: false,
      status: res.status,
      message: res.status === 401 ? `Identifiants invalides ou compte inactif. ${detail}` : detail,
    };
  }

  if (typeof json !== 'object' || json === null) {
    return { ok: false, status: res.status, message: 'Réponse login JSON invalide.' };
  }
  const j = json as Record<string, unknown>;
  const accessToken = typeof j.access_token === 'string' ? j.access_token : '';
  if (!accessToken) {
    return { ok: false, status: res.status, message: 'Réponse login sans access_token.' };
  }
  const refreshToken =
    j.refresh_token === null || j.refresh_token === undefined
      ? null
      : typeof j.refresh_token === 'string'
        ? j.refresh_token
        : null;
  const user = j.user;
  let userId: string | undefined;
  if (typeof user === 'object' && user !== null && typeof (user as { id?: unknown }).id === 'string') {
    userId = (user as { id: string }).id;
  }

  return { ok: true, accessToken, refreshToken, userId };
}

export type FetchContextEnvelopeResult =
  | { ok: true; envelope: ContextEnvelopeStub }
  | { ok: false; status: number; message: string };

/**
 * `GET /v1/users/me/context` — `operationId` `recyclique_users_getContextEnvelope`.
 */
export async function fetchRecycliqueContextEnvelope(accessToken: string): Promise<FetchContextEnvelopeResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/users/me/context`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, status: 0, message: `${msg} (GET /v1/users/me/context)` };
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const detail =
      typeof json === 'object' && json !== null && 'detail' in json
        ? String((json as { detail: unknown }).detail)
        : text || res.statusText;
    return {
      ok: false,
      status: res.status,
      message:
        res.status === 401
          ? `Session expirée ou non authentifié (401). ${detail}`
          : `GET /v1/users/me/context a échoué (${res.status}) : ${detail}`,
    };
  }

  const envelope = contextEnvelopeStubFromApi(json);
  if (!envelope) {
    return { ok: false, status: res.status, message: 'Réponse contexte invalide (schéma inattendu).' };
  }
  return { ok: true, envelope };
}

/**
 * `POST /v1/auth/logout` — best-effort (ignore erreurs réseau).
 */
export async function postRecycliqueLogout(accessToken: string): Promise<void> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/auth/logout`;
  try {
    await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    /* noop */
  }
}
