import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

/** Aligné OpenAPI `AdminUser` — `adminUsersList`. */
export type AdminUserListRowDto = {
  readonly id: string;
  readonly username?: string | null;
  readonly first_name?: string | null;
  readonly last_name?: string | null;
  readonly full_name?: string | null;
  readonly email?: string | null;
  readonly phone_number?: string | null;
  readonly address?: string | null;
  readonly notes?: string | null;
  readonly skills?: string | null;
  readonly availability?: string | null;
  readonly role: string;
  readonly status: string;
  readonly is_active: boolean;
  readonly site_id?: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

export type AdminUsersListQuery = {
  readonly skip?: number;
  readonly limit?: number;
  readonly role?: string;
  readonly user_status?: string;
};

type AdminUsersHttpError = {
  ok: false;
  status: number;
  detail: string;
  code?: string;
  retryable?: boolean;
  state?: string | null;
  correlation_id?: string;
  networkError?: boolean;
};

function adminUsersHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): AdminUsersHttpError {
  const p = parseRecycliqueApiErrorBody(json, status, fallbackDetail);
  const f = toRecycliqueClientFailure(status, p, networkError);
  return {
    ok: false,
    status,
    detail: f.message,
    code: f.code,
    retryable: f.retryable,
    state: f.state,
    correlation_id: f.correlationId,
    networkError: f.networkError,
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

function parseAdminUserRow(row: unknown): AdminUserListRowDto | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  const role = row.role;
  const status = row.status;
  const is_active = row.is_active;
  const created_at = row.created_at;
  const updated_at = row.updated_at;
  if (typeof id !== 'string' || typeof role !== 'string' || typeof status !== 'string') return null;
  if (typeof is_active !== 'boolean') return null;
  if (typeof created_at !== 'string' || typeof updated_at !== 'string') return null;
  return {
    id,
    username: typeof row.username === 'string' || row.username === null ? row.username : undefined,
    first_name: typeof row.first_name === 'string' || row.first_name === null ? row.first_name : undefined,
    last_name: typeof row.last_name === 'string' || row.last_name === null ? row.last_name : undefined,
    full_name: typeof row.full_name === 'string' || row.full_name === null ? row.full_name : undefined,
    email: typeof row.email === 'string' || row.email === null ? row.email : undefined,
    phone_number: typeof row.phone_number === 'string' || row.phone_number === null ? row.phone_number : undefined,
    address: typeof row.address === 'string' || row.address === null ? row.address : undefined,
    notes: typeof row.notes === 'string' || row.notes === null ? row.notes : undefined,
    skills: typeof row.skills === 'string' || row.skills === null ? row.skills : undefined,
    availability: typeof row.availability === 'string' || row.availability === null ? row.availability : undefined,
    role,
    status,
    is_active,
    site_id: typeof row.site_id === 'string' || row.site_id === null ? row.site_id : undefined,
    created_at,
    updated_at,
  };
}

export type AdminUsersListResult = { ok: true; data: readonly AdminUserListRowDto[] } | AdminUsersHttpError;

/** `GET /v1/users/{user_id}` — `recyclique_users_getUserById` (corps `UserV1Response`). */
export type AdminUserDetailV1Dto = {
  readonly id: string;
  readonly username: string;
  readonly first_name?: string | null;
  readonly last_name?: string | null;
  readonly email?: string | null;
  readonly phone_number?: string | null;
  readonly address?: string | null;
  readonly notes?: string | null;
  readonly skills?: string | null;
  readonly availability?: string | null;
  readonly role: string;
  readonly status: string;
  readonly is_active: boolean;
  readonly site_id?: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

export type AdminUserStatusOnlineRowDto = {
  readonly user_id: string;
  readonly is_online: boolean;
  readonly last_login?: string | null;
  readonly minutes_since_login?: number | null;
};

export type AdminUserStatusesBundleDto = {
  readonly user_statuses: readonly AdminUserStatusOnlineRowDto[];
  readonly total_count: number;
  readonly online_count: number;
  readonly offline_count: number;
  readonly timestamp: string;
};

export type AdminUserActivityEventDto = {
  readonly id: string;
  readonly event_type: string;
  readonly description: string;
  readonly date: string;
  readonly metadata?: Record<string, unknown> | null;
};

export type AdminUserHistoryPageDto = {
  readonly user_id: string;
  readonly events: readonly AdminUserActivityEventDto[];
  readonly total_count: number;
  readonly page: number;
  readonly limit: number;
  readonly has_next: boolean;
  readonly has_prev: boolean;
};

export type AdminUserDetailResult = { ok: true; data: AdminUserDetailV1Dto } | AdminUsersHttpError;
export type AdminUserStatusesResult = { ok: true; data: AdminUserStatusesBundleDto } | AdminUsersHttpError;
export type AdminUserHistoryResult = { ok: true; data: AdminUserHistoryPageDto } | AdminUsersHttpError;

function parseAdminUserDetailV1(row: unknown): AdminUserDetailV1Dto | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  const username = row.username;
  const role = row.role;
  const status = row.status;
  const is_active = row.is_active;
  const created_at = row.created_at;
  const updated_at = row.updated_at;
  if (typeof id !== 'string' || typeof role !== 'string' || typeof status !== 'string') return null;
  if (typeof is_active !== 'boolean') return null;
  if (typeof created_at !== 'string' || typeof updated_at !== 'string') return null;
  const u =
    typeof username === 'string'
      ? username
      : username === null || username === undefined
        ? ''
        : null;
  if (u === null) return null;
  return {
    id,
    username: u,
    first_name: typeof row.first_name === 'string' || row.first_name === null ? row.first_name : undefined,
    last_name: typeof row.last_name === 'string' || row.last_name === null ? row.last_name : undefined,
    email: typeof row.email === 'string' || row.email === null ? row.email : undefined,
    phone_number: typeof row.phone_number === 'string' || row.phone_number === null ? row.phone_number : undefined,
    address: typeof row.address === 'string' || row.address === null ? row.address : undefined,
    notes: typeof row.notes === 'string' || row.notes === null ? row.notes : undefined,
    skills: typeof row.skills === 'string' || row.skills === null ? row.skills : undefined,
    availability: typeof row.availability === 'string' || row.availability === null ? row.availability : undefined,
    role,
    status,
    is_active,
    site_id: typeof row.site_id === 'string' || row.site_id === null ? row.site_id : undefined,
    created_at,
    updated_at,
  };
}

function parseMinutesSinceLogin(v: unknown): number | null | undefined {
  if (v === null) return null;
  if (v === undefined) return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function parseStatusRow(row: unknown): AdminUserStatusOnlineRowDto | null {
  if (!isRecord(row)) return null;
  const rawId = row.user_id;
  const is_online = row.is_online;
  const user_id =
    typeof rawId === 'string' ? rawId.trim() : rawId != null && String(rawId).trim() ? String(rawId).trim() : '';
  if (!user_id || typeof is_online !== 'boolean') return null;
  return {
    user_id,
    is_online,
    last_login: typeof row.last_login === 'string' || row.last_login === null ? row.last_login : undefined,
    minutes_since_login: parseMinutesSinceLogin(row.minutes_since_login),
  };
}

function parseStatusesBundle(json: unknown): AdminUserStatusesBundleDto | null {
  if (!isRecord(json)) return null;
  const raw = json.user_statuses;
  if (!Array.isArray(raw)) return null;
  const user_statuses: AdminUserStatusOnlineRowDto[] = [];
  for (const r of raw) {
    const row = parseStatusRow(r);
    if (row) user_statuses.push(row);
  }
  const onlineFromRows = user_statuses.filter((s) => s.is_online).length;
  const total_count =
    typeof json.total_count === 'number' && Number.isFinite(json.total_count)
      ? json.total_count
      : user_statuses.length;
  const online_count =
    typeof json.online_count === 'number' && Number.isFinite(json.online_count) ? json.online_count : onlineFromRows;
  const offline_count =
    typeof json.offline_count === 'number' && Number.isFinite(json.offline_count)
      ? json.offline_count
      : Math.max(0, total_count - online_count);
  const timestamp = typeof json.timestamp === 'string' ? json.timestamp : new Date().toISOString();
  return { user_statuses, total_count, online_count, offline_count, timestamp };
}

function parseActivityEvent(row: unknown): AdminUserActivityEventDto | null {
  if (!isRecord(row)) return null;
  const id = row.id != null ? String(row.id) : '';
  const event_type = row.event_type;
  const description = row.description;
  const date = row.date;
  if (!id || typeof event_type !== 'string' || typeof description !== 'string' || typeof date !== 'string')
    return null;
  const metadata = row.metadata;
  let meta: Record<string, unknown> | null | undefined;
  if (metadata === undefined) meta = undefined;
  else if (metadata === null) meta = null;
  else if (typeof metadata === 'object' && !Array.isArray(metadata)) meta = metadata as Record<string, unknown>;
  else return null;
  return { id, event_type, description, date, metadata: meta };
}

function parseHistoryPage(json: unknown): AdminUserHistoryPageDto | null {
  if (!isRecord(json)) return null;
  const user_id = json.user_id != null ? String(json.user_id) : '';
  const eventsRaw = json.events;
  const total_count = json.total_count;
  const page = json.page;
  const limit = json.limit;
  const has_next = json.has_next;
  const has_prev = json.has_prev;
  if (!user_id || !Array.isArray(eventsRaw)) return null;
  if (
    typeof total_count !== 'number' ||
    typeof page !== 'number' ||
    typeof limit !== 'number' ||
    typeof has_next !== 'boolean' ||
    typeof has_prev !== 'boolean'
  )
    return null;
  const events: AdminUserActivityEventDto[] = [];
  for (const e of eventsRaw) {
    const ev = parseActivityEvent(e);
    if (ev) events.push(ev);
  }
  return { user_id, events, total_count, page, limit, has_next, has_prev };
}

/** `GET /v1/admin/users` — `adminUsersList`. */
export async function getAdminUsersList(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  query: AdminUsersListQuery,
): Promise<AdminUsersListResult> {
  const base = getLiveSnapshotBasePrefix();
  const sp = new URLSearchParams();
  sp.set('skip', String(query.skip ?? 0));
  sp.set('limit', String(query.limit ?? 20));
  if (query.role) sp.set('role', query.role);
  if (query.user_status) sp.set('user_status', query.user_status);
  const url = `${base}/v1/admin/users?${sp.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminUsersHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminUsersHttpError(res.status, json, text || res.statusText);
  }
  if (!Array.isArray(json)) {
    return adminUsersHttpError(res.status, json, 'Réponse liste utilisateurs invalide (tableau attendu)');
  }
  const data: AdminUserListRowDto[] = [];
  for (const row of json) {
    const item = parseAdminUserRow(row);
    if (item) data.push(item);
  }
  return { ok: true, data };
}

/** `GET /v1/users/{user_id}` — `recyclique_users_getUserById`. */
export async function getAdminUserDetailById(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  userId: string,
): Promise<AdminUserDetailResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/users/${encodeURIComponent(userId)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminUsersHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminUsersHttpError(res.status, json, text || res.statusText);
  }
  const data = parseAdminUserDetailV1(json);
  if (!data) {
    return adminUsersHttpError(res.status, json, 'Réponse détail utilisateur invalide');
  }
  return { ok: true, data };
}

/** `GET /v1/admin/users/statuses` — `adminUsersStatusesList`. */
export async function getAdminUsersStatuses(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<AdminUserStatusesResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/users/statuses`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminUsersHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminUsersHttpError(res.status, json, text || res.statusText);
  }
  const data = parseStatusesBundle(json);
  if (!data) {
    return adminUsersHttpError(res.status, json, 'Réponse statuts utilisateurs invalide');
  }
  return { ok: true, data };
}

export type AdminUserHistoryQuery = {
  readonly date_from?: string;
  readonly date_to?: string;
  readonly event_type?: string;
  readonly skip?: number;
  readonly limit?: number;
};

/** `GET /v1/admin/users/{user_id}/history` — `adminUsersHistoryList`. */
export async function getAdminUserHistory(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  userId: string,
  query: AdminUserHistoryQuery,
): Promise<AdminUserHistoryResult> {
  const base = getLiveSnapshotBasePrefix();
  const sp = new URLSearchParams();
  if (query.date_from) sp.set('date_from', query.date_from);
  if (query.date_to) sp.set('date_to', query.date_to);
  if (query.event_type) sp.set('event_type', query.event_type);
  sp.set('skip', String(query.skip ?? 0));
  sp.set('limit', String(query.limit ?? 20));
  const url = `${base}/v1/admin/users/${encodeURIComponent(userId)}/history?${sp.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminUsersHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminUsersHttpError(res.status, json, text || res.statusText);
  }
  const data = parseHistoryPage(json);
  if (!data) {
    return adminUsersHttpError(res.status, json, 'Réponse historique utilisateur invalide');
  }
  return { ok: true, data };
}

/** Identifiant normalisé pour corréler liste / présence (casse, espaces). */
export function canonicalUserIdForPresence(id: string): string {
  return id.trim().toLowerCase();
}

export type UserCreateV1Payload = {
  readonly username: string;
  readonly password: string;
  readonly first_name?: string | null;
  readonly last_name?: string | null;
  readonly email?: string | null;
  readonly phone_number?: string | null;
  readonly address?: string | null;
  readonly notes?: string | null;
  readonly skills?: string | null;
  readonly availability?: string | null;
  readonly role?: string;
  readonly status?: string;
  readonly is_active?: boolean;
  readonly site_id?: string | null;
};

export type UserUpdateV1Payload = {
  readonly username?: string | null;
  readonly first_name?: string | null;
  readonly last_name?: string | null;
  readonly email?: string | null;
  readonly phone_number?: string | null;
  readonly address?: string | null;
  readonly notes?: string | null;
  readonly skills?: string | null;
  readonly availability?: string | null;
  readonly role?: string | null;
  readonly status?: string | null;
  readonly is_active?: boolean | null;
  readonly site_id?: string | null;
};

export type AdminMutationResult =
  | { ok: true; message: string; success: boolean }
  | AdminUsersHttpError;

function parseAdminMutation(json: unknown): { message: string; success: boolean } | null {
  if (!isRecord(json)) return null;
  const message = json.message;
  const success = json.success;
  if (typeof message !== 'string' || typeof success !== 'boolean') return null;
  return { message, success };
}

/** `POST /v1/users/` — `recyclique_users_createUser`. */
export async function createUserV1(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: UserCreateV1Payload,
): Promise<AdminUserDetailResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/users/`;
  const headers = authHeaders(auth, { 'Content-Type': 'application/json' });
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', credentials: 'include', headers, body: JSON.stringify(body) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminUsersHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminUsersHttpError(res.status, json, text || res.statusText);
  }
  const data = parseAdminUserDetailV1(json);
  if (!data) {
    return adminUsersHttpError(res.status, json, 'Réponse création utilisateur invalide');
  }
  return { ok: true, data };
}

/** `PUT /v1/users/{user_id}` — `recyclique_users_updateUser`. */
export async function updateUserV1(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  userId: string,
  body: UserUpdateV1Payload,
): Promise<AdminUserDetailResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/users/${encodeURIComponent(userId)}`;
  const headers = authHeaders(auth, { 'Content-Type': 'application/json' });
  let res: Response;
  try {
    res = await fetch(url, { method: 'PUT', credentials: 'include', headers, body: JSON.stringify(body) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminUsersHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminUsersHttpError(res.status, json, text || res.statusText);
  }
  const data = parseAdminUserDetailV1(json);
  if (!data) {
    return adminUsersHttpError(res.status, json, 'Réponse mise à jour utilisateur invalide');
  }
  return { ok: true, data };
}

/** `PUT /v1/admin/users/{user_id}/role` — `adminUsersRolePut`. */
export async function putAdminUserRole(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  userId: string,
  role: string,
): Promise<AdminMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/users/${encodeURIComponent(userId)}/role`;
  const headers = authHeaders(auth, { 'Content-Type': 'application/json' });
  let res: Response;
  try {
    res = await fetch(url, { method: 'PUT', credentials: 'include', headers, body: JSON.stringify({ role }) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminUsersHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminUsersHttpError(res.status, json, text || res.statusText);
  }
  const parsed = parseAdminMutation(json);
  if (!parsed) {
    return adminUsersHttpError(res.status, json, 'Réponse serveur invalide');
  }
  return { ok: true, message: parsed.message, success: parsed.success };
}

/** `PUT /v1/admin/users/{user_id}/status` — `adminUsersActiveStatusPut`. */
export async function putAdminUserActivation(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  userId: string,
  body: { readonly status: string; readonly is_active: boolean; readonly reason?: string | null },
): Promise<AdminMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/users/${encodeURIComponent(userId)}/status`;
  const headers = authHeaders(auth, { 'Content-Type': 'application/json' });
  let res: Response;
  try {
    res = await fetch(url, { method: 'PUT', credentials: 'include', headers, body: JSON.stringify(body) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminUsersHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminUsersHttpError(res.status, json, text || res.statusText);
  }
  const parsed = parseAdminMutation(json);
  if (!parsed) {
    return adminUsersHttpError(res.status, json, 'Réponse serveur invalide');
  }
  return { ok: true, message: parsed.message, success: parsed.success };
}

/** `POST /v1/admin/users/{user_id}/reset-password` — envoi e-mail réinit. (admin). */
export async function postAdminUserResetPassword(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  userId: string,
): Promise<AdminMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/users/${encodeURIComponent(userId)}/reset-password`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminUsersHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminUsersHttpError(res.status, json, text || res.statusText);
  }
  const parsed = parseAdminMutation(json);
  if (!parsed) {
    return adminUsersHttpError(res.status, json, 'Réponse serveur invalide');
  }
  return { ok: true, message: parsed.message, success: parsed.success };
}

export type ForcePasswordBody = {
  readonly new_password: string;
  readonly reason?: string | null;
};

/** `POST /v1/admin/users/{user_id}/force-password` — super-admin uniquement côté API. */
export async function postAdminUserForcePassword(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  userId: string,
  body: ForcePasswordBody,
): Promise<AdminMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/users/${encodeURIComponent(userId)}/force-password`;
  const headers = authHeaders(auth, { 'Content-Type': 'application/json' });
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        new_password: body.new_password,
        reason: body.reason ?? null,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminUsersHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminUsersHttpError(res.status, json, text || res.statusText);
  }
  const parsed = parseAdminMutation(json);
  if (!parsed) {
    return adminUsersHttpError(res.status, json, 'Réponse serveur invalide');
  }
  return { ok: true, message: parsed.message, success: parsed.success };
}

function parseResetPinResponse(json: unknown): { message: string } | null {
  if (!isRecord(json)) return null;
  const message = json.message;
  if (typeof message !== 'string') return null;
  return { message };
}

export type AdminUserGroupsPutBody = {
  readonly group_ids: readonly string[];
};

/** `PUT /v1/admin/users/{user_id}/groups` — `adminUsersGroupsPut` (remplace l'ensemble des groupes). */
export async function putAdminUserGroups(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  userId: string,
  body: AdminUserGroupsPutBody,
): Promise<AdminMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/users/${encodeURIComponent(userId)}/groups`;
  const headers = authHeaders(auth, { 'Content-Type': 'application/json' });
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({ group_ids: [...body.group_ids] }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminUsersHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminUsersHttpError(res.status, json, text || res.statusText);
  }
  const parsed = parseAdminMutation(json);
  if (!parsed) {
    return adminUsersHttpError(res.status, json, 'Réponse serveur invalide');
  }
  return { ok: true, message: parsed.message, success: parsed.success };
}

/** `POST /v1/admin/users/{user_id}/reset-pin` — réponse `{ message, … }`. */
export async function postAdminUserResetPin(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  userId: string,
): Promise<AdminMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/users/${encodeURIComponent(userId)}/reset-pin`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminUsersHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminUsersHttpError(res.status, json, text || res.statusText);
  }
  const parsed = parseResetPinResponse(json);
  if (!parsed) {
    return adminUsersHttpError(res.status, json, 'Réponse serveur invalide');
  }
  return { ok: true, message: parsed.message, success: true };
}
