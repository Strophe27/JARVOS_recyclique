import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';

function authHeaders(auth: Pick<AuthContextPort, 'getAccessToken'>): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export type AdminLegacyUserStatusRow = {
  readonly user_id: string;
  readonly is_online: boolean;
  readonly last_login?: string | null;
  readonly minutes_since_login?: number | null;
};

export type AdminLegacyUserListRow = {
  readonly id: string;
  readonly username?: string;
  readonly first_name?: string | null;
  readonly last_name?: string | null;
  readonly role?: string | null;
};

/** `GET /v1/users/me` — champs utilisés par le bandeau admin legacy. */
export async function fetchUsersMeForAdminDashboard(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  signal?: AbortSignal,
): Promise<{ role?: string } | null> {
  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/users/me`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth), signal });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return null;
  }
  if (typeof json !== 'object' || json === null) return null;
  const role = (json as { role?: unknown }).role;
  return { role: typeof role === 'string' ? role : undefined };
}

/** `GET /v1/admin/users/statuses` */
export async function fetchAdminUserStatuses(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  signal?: AbortSignal,
): Promise<readonly AdminLegacyUserStatusRow[]> {
  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/admin/users/statuses`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth), signal });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return [];
  }
  if (typeof json !== 'object' || json === null) return [];
  const raw = (json as { user_statuses?: unknown }).user_statuses;
  if (!Array.isArray(raw)) return [];
  const out: AdminLegacyUserStatusRow[] = [];
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) continue;
    const o = row as Record<string, unknown>;
    const userId = typeof o.user_id === 'string' ? o.user_id : String(o.user_id ?? '');
    if (!userId) continue;
    out.push({
      user_id: userId,
      is_online: o.is_online === true,
      last_login: o.last_login == null ? null : String(o.last_login),
      minutes_since_login:
        typeof o.minutes_since_login === 'number' && Number.isFinite(o.minutes_since_login)
          ? o.minutes_since_login
          : null,
    });
  }
  return out;
}

/** `GET /v1/users/` (liste — alignement bandeau legacy). */
export async function fetchUsersListForAdminDashboard(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  signal?: AbortSignal,
): Promise<readonly AdminLegacyUserListRow[]> {
  const base = getLiveSnapshotBasePrefix().replace(/\/$/, '');
  const url = `${base}/v1/users/`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth), signal });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return [];
  }
  if (!Array.isArray(json)) return [];
  return json.map((raw) => {
    const o = raw as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : String(o.id ?? '');
    return {
      id,
      username: typeof o.username === 'string' ? o.username : undefined,
      first_name: o.first_name == null ? null : String(o.first_name),
      last_name: o.last_name == null ? null : String(o.last_name),
      role: o.role == null ? null : String(o.role),
    };
  });
}
