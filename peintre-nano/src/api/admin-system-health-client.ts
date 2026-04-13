import type { operations } from '../../../contracts/openapi/generated/recyclique-api';
import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';

/** `GET /v1/admin/health` — `adminHealthSystemGet`. */
export type AdminHealthSystemPayload =
  operations['adminHealthSystemGet']['responses'][200]['content']['application/json'];

/** `GET /v1/admin/sessions/metrics` — `adminSessionsMetricsGet`. */
export type AdminSessionMetricsEnvelope =
  operations['adminSessionsMetricsGet']['responses'][200]['content']['application/json'];

/** `POST /v1/admin/health/test-notifications` — `adminHealthTestNotificationsPost` (réponse documentée « désactivé »). */
export type AdminHealthTestNotificationsPayload =
  operations['adminHealthTestNotificationsPost']['responses'][200]['content']['application/json'];

export class AdminSystemHealthApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AdminSystemHealthApiError';
  }
}

function buildApiUrl(path: string, query?: Record<string, string | undefined>): string {
  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const u = new URL(`${base}${path}`, 'http://local.invalid');
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') u.searchParams.set(k, v);
    }
  }
  const q = u.searchParams.toString();
  return q ? `${base}${path}?${q}` : `${base}${path}`;
}

function authHeaders(auth: Pick<AuthContextPort, 'getAccessToken'>): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' };
  const token = auth.getAccessToken?.();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function parseJsonOk<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new AdminSystemHealthApiError(res.status, 'Réponse JSON invalide');
  }
  if (!res.ok) {
    const detail =
      typeof data === 'object' && data !== null && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : text || res.statusText;
    throw new AdminSystemHealthApiError(res.status, detail);
  }
  return data as T;
}

/**
 * Synthèse santé système (anomalies, recommandations, scheduler) — aligné legacy `healthService.getSystemHealth`.
 */
export async function fetchAdminHealthSystem(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  signal?: AbortSignal,
): Promise<AdminHealthSystemPayload> {
  const url = buildApiUrl('/v1/admin/health');
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(auth),
    signal,
  });
  return parseJsonOk<AdminHealthSystemPayload>(res);
}

/**
 * Métriques de sessions (rafraîchissements, déconnexions) — aligné legacy `healthService.getSessionMetrics`.
 */
export async function fetchAdminSessionMetrics(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  args: { readonly hours?: number; readonly signal?: AbortSignal },
): Promise<AdminSessionMetricsEnvelope> {
  const hours = args.hours ?? 24;
  const url = buildApiUrl('/v1/admin/sessions/metrics', {
    hours: String(hours),
  });
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(auth),
    signal: args.signal,
  });
  return parseJsonOk<AdminSessionMetricsEnvelope>(res);
}

/**
 * Ancien test de notifications — le serveur renvoie un statut informatif (pas d’envoi réel).
 * **Autorité** : session admin stricte (peut répondre 403 si le transport courant ne suffit pas).
 */
export async function postAdminHealthTestNotifications(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  signal?: AbortSignal,
): Promise<AdminHealthTestNotificationsPayload> {
  const url = buildApiUrl('/v1/admin/health/test-notifications');
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(auth),
    signal,
  });
  return parseJsonOk<AdminHealthTestNotificationsPayload>(res);
}
