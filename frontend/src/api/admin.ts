/**
 * Client API admin / start post — Story 3.4.
 * GET /v1/sites, GET /v1/cash-registers, POST /v1/admin/cash-registers/start,
 * POST /v1/reception/postes/open.
 */

import { buildUrl } from './_buildUrl';

const getBase = (): string =>
  (import.meta.env?.VITE_API_BASE_URL as string) ?? '';

function getAuthHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export interface Site {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashRegister {
  id: string;
  site_id: string;
  name: string;
  location: string | null;
  is_active: boolean;
  enable_virtual?: boolean;
  enable_deferred?: boolean;
  started_at: string | null;
  started_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PosteReceptionResponse {
  id: string;
  opened_by_user_id: string | null;
  opened_at: string;
  status: string;
}

/**
 * Utilisateur (liste admin) — GET /v1/users (Story 8.2 filtre opérateur).
 */
export interface User {
  id: string;
  username?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

/**
 * GET /v1/users — liste des utilisateurs (admin). Utilisé pour le filtre opérateur du gestionnaire de sessions.
 */
export async function getUsers(accessToken: string): Promise<User[]> {
  const res = await fetch(`${getBase()}/v1/users`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<User[]>;
}

/**
 * GET /v1/sites — liste des sites (admin).
 */
export async function getSites(accessToken: string): Promise<Site[]> {
  const res = await fetch(`${getBase()}/v1/sites`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<Site[]>;
}

export interface SiteCreateBody {
  name: string;
  is_active?: boolean;
}

export interface SiteUpdateBody {
  name?: string;
  is_active?: boolean;
}

export async function createSite(
  accessToken: string,
  body: SiteCreateBody
): Promise<Site> {
  const res = await fetch(`${getBase()}/v1/sites`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<Site>;
}

export async function updateSite(
  accessToken: string,
  siteId: string,
  body: SiteUpdateBody
): Promise<Site> {
  const res = await fetch(`${getBase()}/v1/sites/${siteId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<Site>;
}

export async function deleteSite(
  accessToken: string,
  siteId: string
): Promise<void> {
  const res = await fetch(`${getBase()}/v1/sites/${siteId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
}

/**
 * GET /v1/cash-registers — liste des postes (optionnel site_id).
 */
export async function getCashRegisters(
  accessToken: string,
  siteId?: string
): Promise<CashRegister[]> {
  const url = buildUrl('/v1/cash-registers');
  if (siteId) url.searchParams.set('site_id', siteId);
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CashRegister[]>;
}

/**
 * POST /v1/admin/cash-registers/start — demarrer un poste caisse (admin).
 */
export async function startCashRegister(
  accessToken: string,
  siteId: string,
  registerId: string
): Promise<CashRegister> {
  const res = await fetch(`${getBase()}/v1/admin/cash-registers/start`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ site_id: siteId, register_id: registerId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CashRegister>;
}

/**
 * POST /v1/reception/postes/open — ouvrir un poste réception (admin ou reception.access).
 */
export async function openPosteReception(accessToken: string): Promise<PosteReceptionResponse> {
  const res = await fetch(`${getBase()}/v1/reception/postes/open`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<PosteReceptionResponse>;
}

export interface CashRegisterCreateBody {
  site_id: string;
  name: string;
  location?: string | null;
  is_active?: boolean;
  enable_virtual?: boolean;
  enable_deferred?: boolean;
}

export interface CashRegisterUpdateBody {
  name?: string;
  location?: string | null;
  is_active?: boolean;
  enable_virtual?: boolean;
  enable_deferred?: boolean;
}

export async function createCashRegister(
  accessToken: string,
  body: CashRegisterCreateBody
): Promise<CashRegister> {
  const res = await fetch(`${getBase()}/v1/cash-registers`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CashRegister>;
}

export async function updateCashRegister(
  accessToken: string,
  registerId: string,
  body: CashRegisterUpdateBody
): Promise<CashRegister> {
  const res = await fetch(`${getBase()}/v1/cash-registers/${registerId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CashRegister>;
}

export async function deleteCashRegister(
  accessToken: string,
  registerId: string
): Promise<void> {
  const res = await fetch(`${getBase()}/v1/cash-registers/${registerId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
}
