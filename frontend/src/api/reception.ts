/**
 * Client API réception — Story 6.1, 6.2.
 * GET/POST /v1/reception/postes/*, tickets/*, lignes. GET /v1/categories/entry-tickets.
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

export interface PosteReceptionItem {
  id: string;
  opened_by_user_id: string | null;
  opened_at: string;
  closed_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LigneDepotItem {
  id: string;
  ticket_id: string;
  poids_kg: number;
  category_id: string | null;
  destination: string;
  notes: string | null;
  is_exit: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketDepotItem {
  id: string;
  poste_id: string;
  benevole_user_id: string | null;
  created_at: string;
  closed_at: string | null;
  status: string;
  updated_at: string;
  lignes?: LigneDepotItem[];
}

export interface TicketDepotListResponse {
  items: TicketDepotItem[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * GET /v1/reception/postes/current — poste ouvert pour l'utilisateur connecté. 404 si aucun.
 */
export async function getCurrentPoste(
  accessToken: string
): Promise<PosteReceptionItem | null> {
  const url = `${getBase()}/v1/reception/postes/current`;
  const res = await fetch(url, { headers: getAuthHeaders(accessToken) });
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<PosteReceptionItem>;
}

/**
 * POST /v1/reception/postes/open — ouvrir un poste. Body optionnel : { opened_at? }.
 */
export async function openPoste(
  accessToken: string,
  body?: { opened_at?: string }
): Promise<PosteReceptionItem> {
  const url = `${getBase()}/v1/reception/postes/open`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<PosteReceptionItem>;
}

/**
 * POST /v1/reception/postes/{poste_id}/close — fermer le poste.
 */
export async function closePoste(
  accessToken: string,
  posteId: string
): Promise<PosteReceptionItem> {
  const url = `${getBase()}/v1/reception/postes/${posteId}/close`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<PosteReceptionItem>;
}

/**
 * GET /v1/reception/tickets — liste avec pagination et filtres.
 */
export async function getTickets(
  accessToken: string,
  params?: { poste_id?: string; status?: string; page?: number; page_size?: number }
): Promise<TicketDepotListResponse> {
  const url = buildUrl('/v1/reception/tickets');
  if (params?.poste_id) url.searchParams.set('poste_id', params.poste_id);
  if (params?.status) url.searchParams.set('status', params.status);
  if (params?.page != null) url.searchParams.set('page', String(params.page));
  if (params?.page_size != null) url.searchParams.set('page_size', String(params.page_size));
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<TicketDepotListResponse>;
}

/**
 * POST /v1/reception/tickets — créer un ticket (poste déduit du poste courant si body vide).
 */
export async function createTicket(
  accessToken: string,
  body?: { poste_id?: string }
): Promise<TicketDepotItem> {
  const url = `${getBase()}/v1/reception/tickets`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<TicketDepotItem>;
}

/**
 * GET /v1/reception/tickets/{ticket_id} — détail d'un ticket (avec lignes en 6.2).
 */
export async function getTicket(
  accessToken: string,
  ticketId: string
): Promise<TicketDepotItem> {
  const url = `${getBase()}/v1/reception/tickets/${ticketId}`;
  const res = await fetch(url, { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<TicketDepotItem>;
}

/**
 * POST /v1/reception/tickets/{ticket_id}/close — fermer un ticket (Story 6.1, 6.3).
 */
export async function closeTicket(
  accessToken: string,
  ticketId: string
): Promise<TicketDepotItem> {
  const url = `${getBase()}/v1/reception/tickets/${ticketId}/close`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<TicketDepotItem>;
}

// ----- Lignes (Story 6.2) -----

export async function getLignes(
  accessToken: string,
  ticketId: string,
  params?: { page?: number; page_size?: number }
): Promise<{ items: LigneDepotItem[]; total: number; page: number; page_size: number }> {
  const url = buildUrl('/v1/reception/lignes');
  url.searchParams.set('ticket_id', ticketId);
  if (params?.page != null) url.searchParams.set('page', String(params.page));
  if (params?.page_size != null) url.searchParams.set('page_size', String(params.page_size));
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

export async function createLigne(
  accessToken: string,
  body: {
    ticket_id: string;
    category_id?: string | null;
    poids_kg: number;
    destination: string;
    notes?: string | null;
    is_exit?: boolean;
  }
): Promise<LigneDepotItem> {
  const url = `${getBase()}/v1/reception/lignes`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<LigneDepotItem>;
}

export async function updateLigne(
  accessToken: string,
  ligneId: string,
  body: {
    poids_kg?: number;
    category_id?: string | null;
    destination?: string;
    notes?: string | null;
    is_exit?: boolean;
  }
): Promise<LigneDepotItem> {
  const url = `${getBase()}/v1/reception/lignes/${ligneId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<LigneDepotItem>;
}

export async function updateLigneWeight(
  accessToken: string,
  ticketId: string,
  ligneId: string,
  weight: number
): Promise<LigneDepotItem> {
  const url = `${getBase()}/v1/reception/tickets/${ticketId}/lignes/${ligneId}/weight`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ weight }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<LigneDepotItem>;
}

export async function deleteLigne(
  accessToken: string,
  ligneId: string
): Promise<void> {
  const url = `${getBase()}/v1/reception/lignes/${ligneId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
}

// ----- Catégories réception (Story 6.2) -----

export interface CategoryEntryItem {
  id: string;
  name: string;
  display_order_entry: number;
}

/**
 * GET /v1/categories/entry-tickets — catégories visibles en réception (ordre display_order_entry).
 */
export async function getCategoriesEntryTickets(
  accessToken: string
): Promise<CategoryEntryItem[]> {
  const url = `${getBase()}/v1/categories/entry-tickets`;
  const res = await fetch(url, { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CategoryEntryItem[]>;
}

// ----- Export CSV et stats live (Story 6.3) -----

export interface ReceptionStatsLive {
  tickets_today: number;
  total_weight_kg: number;
  lines_count: number;
}

/**
 * POST /v1/reception/tickets/{ticketId}/download-token — obtient un token pour le téléchargement CSV.
 */
export async function createDownloadToken(
  accessToken: string,
  ticketId: string
): Promise<{ token: string; expires_in_seconds: number }> {
  const url = `${getBase()}/v1/reception/tickets/${ticketId}/download-token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<{ token: string; expires_in_seconds: number }>;
}

/**
 * Télécharge le CSV d'un ticket : obtient un token puis GET export-csv avec token, déclenche le téléchargement.
 */
export async function exportTicketCsv(
  accessToken: string,
  ticketId: string,
  filename?: string
): Promise<void> {
  const { token } = await createDownloadToken(accessToken, ticketId);
  const url = `${getBase()}/v1/reception/tickets/${ticketId}/export-csv?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="?([^";]+)"?/);
  const name = filename ?? match?.[1] ?? `ticket-${ticketId}.csv`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * GET /v1/reception/lignes/export-csv — télécharge le CSV des lignes sur la période.
 */
export async function exportLignesCsv(
  accessToken: string,
  dateFrom: string,
  dateTo: string
): Promise<void> {
  const url = buildUrl('/v1/reception/lignes/export-csv');
  url.searchParams.set('date_from', dateFrom);
  url.searchParams.set('date_to', dateTo);
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'reception-lignes.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * GET /v1/reception/stats/live — KPI réception en temps réel.
 */
export async function getReceptionStatsLive(
  accessToken: string,
  params?: { exclude_deferred?: boolean }
): Promise<ReceptionStatsLive> {
  const url = buildUrl('/v1/reception/stats/live');
  if (params?.exclude_deferred === true) {
    url.searchParams.set('exclude_deferred', 'true');
  }
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<ReceptionStatsLive>;
}
