import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

/** Aligné OpenAPI `AdminGroupListItem` — `adminGroupsList`. */
export type AdminGroupListItemDto = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly display_name?: string | null;
  readonly site_id?: string | null;
  readonly description?: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly user_ids: readonly string[];
  readonly permission_ids: readonly string[];
};

/** Permission embarquée dans `AdminGroupDetail` (`AdminPermissionV1`). */
export type AdminPermissionV1Dto = {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly created_at: string;
  readonly updated_at: string;
};

/** Utilisateur embarqué dans `AdminGroupDetail` (`UserV1Response` / `UserResponse` serveur). */
export type AdminGroupUserRowDto = {
  readonly id: string;
  readonly username: string;
  readonly role?: string;
  readonly status?: string;
  readonly email?: string | null;
};

/** Aligné OpenAPI `AdminGroupDetail` — `adminGroupsGetById` et corps de mutation retournés. */
export type AdminGroupDetailDto = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly display_name?: string | null;
  readonly site_id?: string | null;
  readonly description?: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly users: readonly AdminGroupUserRowDto[];
  readonly permissions: readonly AdminPermissionV1Dto[];
};

export type AdminGroupsListQuery = {
  readonly skip?: number;
  readonly limit?: number;
};

export type AdminGroupCreateBody = {
  readonly name: string;
  readonly description?: string | null;
  readonly key?: string | null;
  readonly display_name?: string | null;
  readonly site_id?: string | null;
};

export type AdminGroupUpdateBody = {
  readonly name?: string;
  readonly description?: string | null;
  readonly display_name?: string | null;
  readonly site_id?: string | null;
};

type AdminGroupsHttpError = {
  ok: false;
  status: number;
  detail: string;
  code?: string;
  retryable?: boolean;
  state?: string | null;
  correlation_id?: string;
  networkError?: boolean;
};

function adminGroupsHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): AdminGroupsHttpError {
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

function asStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.filter((v): v is string => typeof v === 'string');
}

function parseListItem(row: unknown): AdminGroupListItemDto | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  const key = row.key;
  const name = row.name;
  const created_at = row.created_at;
  const updated_at = row.updated_at;
  if (typeof id !== 'string' || typeof key !== 'string' || typeof name !== 'string') return null;
  if (typeof created_at !== 'string' || typeof updated_at !== 'string') return null;
  return {
    id,
    key,
    name,
    display_name: typeof row.display_name === 'string' || row.display_name === null ? row.display_name : undefined,
    site_id: typeof row.site_id === 'string' || row.site_id === null ? row.site_id : undefined,
    description: typeof row.description === 'string' || row.description === null ? row.description : undefined,
    created_at,
    updated_at,
    user_ids: asStringArray(row.user_ids),
    permission_ids: asStringArray(row.permission_ids),
  };
}

function parsePermission(row: unknown): AdminPermissionV1Dto | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  const name = row.name;
  const created_at = row.created_at;
  const updated_at = row.updated_at;
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  if (typeof created_at !== 'string' || typeof updated_at !== 'string') return null;
  return {
    id,
    name,
    description: typeof row.description === 'string' || row.description === null ? row.description : undefined,
    created_at,
    updated_at,
  };
}

function parseUser(row: unknown): AdminGroupUserRowDto | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  const username = row.username;
  if (typeof id !== 'string' || typeof username !== 'string') return null;
  return {
    id,
    username,
    role: typeof row.role === 'string' ? row.role : undefined,
    status: typeof row.status === 'string' ? row.status : undefined,
    email: typeof row.email === 'string' || row.email === null ? row.email : undefined,
  };
}

function parseGroupDetail(json: unknown): AdminGroupDetailDto | null {
  if (!isRecord(json)) return null;
  const id = json.id;
  const key = json.key;
  const name = json.name;
  const created_at = json.created_at;
  const updated_at = json.updated_at;
  if (typeof id !== 'string' || typeof key !== 'string' || typeof name !== 'string') return null;
  if (typeof created_at !== 'string' || typeof updated_at !== 'string') return null;
  const usersRaw = json.users;
  const permsRaw = json.permissions;
  const users: AdminGroupUserRowDto[] = [];
  const permissions: AdminPermissionV1Dto[] = [];
  if (Array.isArray(usersRaw)) {
    for (const u of usersRaw) {
      const p = parseUser(u);
      if (p) users.push(p);
    }
  }
  if (Array.isArray(permsRaw)) {
    for (const p of permsRaw) {
      const pr = parsePermission(p);
      if (pr) permissions.push(pr);
    }
  }
  return {
    id,
    key,
    name,
    display_name:
      typeof json.display_name === 'string' || json.display_name === null ? json.display_name : undefined,
    site_id: typeof json.site_id === 'string' || json.site_id === null ? json.site_id : undefined,
    description: typeof json.description === 'string' || json.description === null ? json.description : undefined,
    created_at,
    updated_at,
    users,
    permissions,
  };
}

export type AdminGroupsListResult = { ok: true; data: readonly AdminGroupListItemDto[] } | AdminGroupsHttpError;
export type AdminGroupDetailResult = { ok: true; data: AdminGroupDetailDto } | AdminGroupsHttpError;
export type AdminGroupMutationResult = { ok: true; data: AdminGroupDetailDto } | AdminGroupsHttpError;
export type AdminGroupDeleteResult = { ok: true } | AdminGroupsHttpError;

/** `GET /v1/admin/groups/` — `adminGroupsList`. */
export async function getAdminGroupsList(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  query: AdminGroupsListQuery,
): Promise<AdminGroupsListResult> {
  const base = getLiveSnapshotBasePrefix();
  const sp = new URLSearchParams();
  sp.set('skip', String(query.skip ?? 0));
  sp.set('limit', String(query.limit ?? 100));
  const url = `${base}/v1/admin/groups/?${sp.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminGroupsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminGroupsHttpError(res.status, json, text || res.statusText);
  }
  if (!Array.isArray(json)) {
    return adminGroupsHttpError(res.status, json, 'Réponse groupes liste invalide (tableau attendu)');
  }
  const data: AdminGroupListItemDto[] = [];
  for (const row of json) {
    const item = parseListItem(row);
    if (item) data.push(item);
  }
  return { ok: true, data };
}

function userIdEquals(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

const GROUPS_MEMBERSHIP_PAGE = 500;
const GROUPS_MEMBERSHIP_MAX = 8000;

export type AdminGroupMembershipRowDto = {
  readonly id: string;
  readonly label: string;
};

export type AdminGroupMembershipsForUserResult =
  | { ok: true; memberships: readonly AdminGroupMembershipRowDto[]; partial: boolean }
  | AdminGroupsHttpError;

export type AdminGroupNamesForUserResult =
  | { ok: true; names: readonly string[]; partial: boolean }
  | AdminGroupsHttpError;

function groupLabelForListItem(g: AdminGroupListItemDto): string {
  const d = g.display_name?.trim();
  const n = g.name?.trim();
  const k = g.key?.trim();
  return d || n || k || g.id;
}

async function collectAllGroupsForMembershipScan(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<{ ok: true; groups: readonly AdminGroupListItemDto[]; partial: boolean } | AdminGroupsHttpError> {
  const collected: AdminGroupListItemDto[] = [];
  let skip = 0;
  let partial = false;
  while (skip < GROUPS_MEMBERSHIP_MAX) {
    const res = await getAdminGroupsList(auth, { skip, limit: GROUPS_MEMBERSHIP_PAGE });
    if (!res.ok) return res;
    collected.push(...res.data);
    if (res.data.length < GROUPS_MEMBERSHIP_PAGE) break;
    skip += GROUPS_MEMBERSHIP_PAGE;
    if (skip >= GROUPS_MEMBERSHIP_MAX) {
      partial = true;
      break;
    }
  }
  return { ok: true, groups: collected, partial };
}

/**
 * Parcourt `GET /v1/admin/groups/` (pagination) et retourne les groupes
 * dont `user_ids` contient l'utilisateur (lecture seule, même principe que l'ancien front).
 */
export async function getAdminGroupMembershipsForUser(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  userId: string,
): Promise<AdminGroupMembershipsForUserResult> {
  const bag = await collectAllGroupsForMembershipScan(auth);
  if (!bag.ok) return bag;
  const needle = userId.trim().toLowerCase();
  const memberships = bag.groups
    .filter((g) => g.user_ids.some((uid) => userIdEquals(uid, needle)))
    .map((g) => ({ id: g.id, label: groupLabelForListItem(g) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  return { ok: true, memberships, partial: bag.partial };
}

/**
 * Parcourt `GET /v1/admin/groups/` (pagination) et retourne les noms affichables des groupes
 * dont `user_ids` contient l'utilisateur (lecture seule, même principe que l'ancien front).
 */
export async function getAdminGroupDisplayNamesForUser(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  userId: string,
): Promise<AdminGroupNamesForUserResult> {
  const res = await getAdminGroupMembershipsForUser(auth, userId);
  if (!res.ok) return res;
  return { ok: true, names: res.memberships.map((m) => m.label), partial: res.partial };
}

/** `GET /v1/admin/groups/{group_id}` — `adminGroupsGetById`. */
export async function getAdminGroupById(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  groupId: string,
): Promise<AdminGroupDetailResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/groups/${encodeURIComponent(groupId)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminGroupsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminGroupsHttpError(res.status, json, text || res.statusText);
  }
  const data = parseGroupDetail(json);
  if (!data) {
    return adminGroupsHttpError(res.status, json, 'Réponse détail groupe invalide (schéma)');
  }
  return { ok: true, data };
}

/** `POST /v1/admin/groups/` — `adminGroupsCreate`. */
export async function postAdminGroupCreate(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: AdminGroupCreateBody,
): Promise<AdminGroupMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/groups/`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(auth, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminGroupsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminGroupsHttpError(res.status, json, text || res.statusText);
  }
  const data = parseGroupDetail(json);
  if (!data) {
    return adminGroupsHttpError(res.status, json, 'Réponse création groupe invalide (schéma)');
  }
  return { ok: true, data };
}

/** `PUT /v1/admin/groups/{group_id}` — `adminGroupsUpdate`. */
export async function putAdminGroupUpdate(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  groupId: string,
  body: AdminGroupUpdateBody,
): Promise<AdminGroupMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/groups/${encodeURIComponent(groupId)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: authHeaders(auth, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminGroupsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminGroupsHttpError(res.status, json, text || res.statusText);
  }
  const data = parseGroupDetail(json);
  if (!data) {
    return adminGroupsHttpError(res.status, json, 'Réponse mise à jour groupe invalide (schéma)');
  }
  return { ok: true, data };
}

/** `DELETE /v1/admin/groups/{group_id}` — `adminGroupsDelete`. */
export async function deleteAdminGroup(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  groupId: string,
): Promise<AdminGroupDeleteResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/groups/${encodeURIComponent(groupId)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'DELETE', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminGroupsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = text ? parseJsonText(text) : null;
  if (!res.ok) {
    return adminGroupsHttpError(res.status, json, text || res.statusText);
  }
  if (res.status === 204) {
    return { ok: true };
  }
  return { ok: true };
}

/** `POST /v1/admin/groups/{group_id}/permissions` — `adminGroupsAddPermissions`. */
export async function postAdminGroupAddPermissions(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  groupId: string,
  permissionIds: readonly string[],
): Promise<AdminGroupMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/groups/${encodeURIComponent(groupId)}/permissions`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(auth, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ permission_ids: [...permissionIds] }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminGroupsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminGroupsHttpError(res.status, json, text || res.statusText);
  }
  const data = parseGroupDetail(json);
  if (!data) {
    return adminGroupsHttpError(res.status, json, 'Réponse ajout permissions invalide (schéma)');
  }
  return { ok: true, data };
}

/** `DELETE /v1/admin/groups/{group_id}/permissions/{permission_id}` — `adminGroupsRemovePermission`. */
export async function deleteAdminGroupPermission(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  groupId: string,
  permissionId: string,
): Promise<AdminGroupMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/groups/${encodeURIComponent(groupId)}/permissions/${encodeURIComponent(permissionId)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'DELETE', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminGroupsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminGroupsHttpError(res.status, json, text || res.statusText);
  }
  const data = parseGroupDetail(json);
  if (!data) {
    return adminGroupsHttpError(res.status, json, 'Réponse retrait permission invalide (schéma)');
  }
  return { ok: true, data };
}

/** `POST /v1/admin/groups/{group_id}/users` — `adminGroupsAddUsers`. */
export async function postAdminGroupAddUsers(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  groupId: string,
  userIds: readonly string[],
): Promise<AdminGroupMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/groups/${encodeURIComponent(groupId)}/users`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(auth, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ user_ids: [...userIds] }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminGroupsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminGroupsHttpError(res.status, json, text || res.statusText);
  }
  const data = parseGroupDetail(json);
  if (!data) {
    return adminGroupsHttpError(res.status, json, 'Réponse ajout utilisateurs invalide (schéma)');
  }
  return { ok: true, data };
}

/** `DELETE /v1/admin/groups/{group_id}/users/{user_id}` — `adminGroupsRemoveUser`. */
export async function deleteAdminGroupUser(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  groupId: string,
  userId: string,
): Promise<AdminGroupMutationResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/groups/${encodeURIComponent(groupId)}/users/${encodeURIComponent(userId)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'DELETE', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return adminGroupsHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return adminGroupsHttpError(res.status, json, text || res.statusText);
  }
  const data = parseGroupDetail(json);
  if (!data) {
    return adminGroupsHttpError(res.status, json, 'Réponse retrait utilisateur invalide (schéma)');
  }
  return { ok: true, data };
}
