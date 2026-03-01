/**
 * Client API admin users — Story 8.1.
 * GET/POST/PUT /v1/admin/users, /v1/admin/users/pending, /v1/admin/groups, etc.
 */

import { buildUrl } from './_buildUrl';

const getBase = (): string => (import.meta.env?.VITE_API_BASE_URL as string) ?? '';

function getAuthHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  site_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUserDetail extends AdminUser {
  group_ids: string[];
}

export interface AdminPendingUser {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  requested_at: string;
}

export interface AdminGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditEventItem {
  id: string;
  timestamp: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: string | null;
}

export interface AdminUsersStatusesResponse {
  online_user_ids: string[];
}

/** GET /v1/admin/users — liste avec filtres (snake_case query). */
export async function getAdminUsers(
  accessToken: string,
  params?: { role?: string; status?: string; page?: number; page_size?: number }
): Promise<AdminUser[]> {
  const url = buildUrl('/v1/admin/users');
  if (params?.role) url.searchParams.set('role', params.role);
  if (params?.status) url.searchParams.set('status', params.status);
  if (params?.page) url.searchParams.set('page', String(params.page));
  if (params?.page_size) url.searchParams.set('page_size', String(params.page_size));
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminUser[]>;
}

/** GET /v1/admin/users/statuses — utilisateurs en ligne. */
export async function getAdminUsersStatuses(accessToken: string): Promise<AdminUsersStatusesResponse> {
  const res = await fetch(`${getBase()}/v1/admin/users/statuses`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminUsersStatusesResponse>;
}

/** GET /v1/admin/users/pending — inscriptions en attente. */
export async function getAdminUsersPending(accessToken: string): Promise<AdminPendingUser[]> {
  const res = await fetch(`${getBase()}/v1/admin/users/pending`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminPendingUser[]>;
}

/** POST /v1/admin/users/approve — approuver une inscription. */
export async function approveRegistration(
  accessToken: string,
  registrationRequestId: string
): Promise<{ message: string; user_id: string }> {
  const res = await fetch(`${getBase()}/v1/admin/users/approve`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ registration_request_id: registrationRequestId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<{ message: string; user_id: string }>;
}

/** POST /v1/admin/users/reject — rejeter une inscription. */
export async function rejectRegistration(
  accessToken: string,
  registrationRequestId: string
): Promise<{ message: string }> {
  const res = await fetch(`${getBase()}/v1/admin/users/reject`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ registration_request_id: registrationRequestId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<{ message: string }>;
}

/** GET /v1/admin/users/{user_id} — détail utilisateur. */
export async function getAdminUser(accessToken: string, userId: string): Promise<AdminUserDetail> {
  const res = await fetch(`${getBase()}/v1/admin/users/${userId}`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminUserDetail>;
}

/** GET /v1/admin/users/{user_id}/history — historique/audit. */
export async function getAdminUserHistory(
  accessToken: string,
  userId: string
): Promise<AuditEventItem[]> {
  const res = await fetch(`${getBase()}/v1/admin/users/${userId}/history`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AuditEventItem[]>;
}

/** GET /v1/admin/groups — liste des groupes. */
export async function getAdminGroups(accessToken: string): Promise<AdminGroup[]> {
  const res = await fetch(`${getBase()}/v1/admin/groups`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminGroup[]>;
}

/** PUT /v1/admin/users/{user_id}/role */
export async function updateAdminUserRole(
  accessToken: string,
  userId: string,
  role: string
): Promise<AdminUser> {
  const res = await fetch(`${getBase()}/v1/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminUser>;
}

/** PUT /v1/admin/users/{user_id}/status */
export async function updateAdminUserStatus(
  accessToken: string,
  userId: string,
  status: string
): Promise<AdminUser> {
  const res = await fetch(`${getBase()}/v1/admin/users/${userId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminUser>;
}

/** PUT /v1/admin/users/{user_id} — profil */
export async function updateAdminUserProfile(
  accessToken: string,
  userId: string,
  body: Partial<Pick<AdminUserDetail, 'first_name' | 'last_name' | 'email' | 'role' | 'status' | 'site_id'>>
): Promise<AdminUserDetail> {
  const res = await fetch(`${getBase()}/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminUserDetail>;
}

/** PUT /v1/admin/users/{user_id}/groups */
export async function updateAdminUserGroups(
  accessToken: string,
  userId: string,
  groupIds: string[]
): Promise<AdminUserDetail> {
  const res = await fetch(`${getBase()}/v1/admin/users/${userId}/groups`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ group_ids: groupIds }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminUserDetail>;
}

/** POST /v1/admin/users/{user_id}/reset-password */
export async function resetAdminUserPassword(
  accessToken: string,
  userId: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${getBase()}/v1/admin/users/${userId}/reset-password`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ new_password: newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
}

/** POST /v1/admin/users/{user_id}/reset-pin */
export async function resetAdminUserPin(
  accessToken: string,
  userId: string,
  newPin: string
): Promise<void> {
  const res = await fetch(`${getBase()}/v1/admin/users/${userId}/reset-pin`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ new_pin: newPin }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
}

/** POST /v1/users — création utilisateur par admin */
export async function createUser(
  accessToken: string,
  body: {
    username: string;
    email: string;
    password: string;
    first_name?: string | null;
    last_name?: string | null;
    role?: string;
    status?: string;
    site_id?: string | null;
  }
): Promise<AdminUser> {
  const res = await fetch(`${getBase()}/v1/users`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AdminUser>;
}
