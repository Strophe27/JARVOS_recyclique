import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

export type ReceptionDestinationV1 = 'MAGASIN' | 'RECYCLAGE' | 'DECHETERIE';

export type ReceptionCategoryRow = {
  readonly id: string;
  readonly name: string;
  readonly parent_id?: string | null;
};

export type ReceptionLigneResponse = {
  readonly id: string;
  readonly ticket_id: string;
  readonly category_id: string;
  readonly category_label: string;
  readonly poids_kg: number;
  readonly destination: ReceptionDestinationV1;
  readonly notes: string | null;
  readonly is_exit: boolean;
};

export type ReceptionTicketDetail = {
  readonly id: string;
  readonly poste_id: string;
  readonly benevole_username: string;
  readonly created_at: string;
  readonly closed_at: string | null;
  readonly status: string;
  readonly lignes: ReceptionLigneResponse[];
};

export type ReceptionTicketSummary = {
  readonly id: string;
  readonly poste_id: string;
  readonly benevole_username: string;
  readonly created_at: string;
  readonly closed_at: string | null;
  readonly status: string;
  readonly total_lignes: number;
  readonly total_poids: number;
  readonly poids_entree: number;
  readonly poids_direct: number;
  readonly poids_sortie: number;
};

export type ReceptionTicketListPayload = {
  readonly tickets: ReceptionTicketSummary[];
  readonly total: number;
  readonly page: number;
  readonly per_page: number;
  readonly total_pages: number;
};

type ReceptionHttpError = {
  ok: false;
  status: number;
  detail: string;
  code?: string;
  retryable?: boolean;
  state?: string | null;
  correlation_id?: string;
  networkError?: boolean;
};

function receptionHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): ReceptionHttpError {
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

function authHeaders(auth: Pick<AuthContextPort, 'getAccessToken'>, json = false): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (json) headers['Content-Type'] = 'application/json';
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

/** POST /v1/reception/postes/open — `recyclique_reception_openPoste`. */
export type OpenPosteResult =
  | { ok: true; posteId: string; status: string; raw: unknown }
  | ReceptionHttpError;

export async function postOpenPoste(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body?: { opened_at?: string | null },
): Promise<OpenPosteResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/reception/postes/open`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(auth, true),
      body: JSON.stringify(body && Object.keys(body).length ? body : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  if (typeof json !== 'object' || json === null || !('id' in json)) {
    return receptionHttpError(res.status, json, 'Réponse poste sans id');
  }
  const id = String((json as { id: unknown }).id);
  const st = 'status' in json ? String((json as { status: unknown }).status) : '';
  return { ok: true, posteId: id, status: st, raw: json };
}

/** POST /v1/reception/postes/{poste_id}/close — `recyclique_reception_closePoste`. */
export type ClosePosteResult = { ok: true; raw: unknown } | ReceptionHttpError;

export async function postClosePoste(
  posteId: string,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<ClosePosteResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/reception/postes/${encodeURIComponent(posteId)}/close`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(auth, true),
      body: '{}',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  return { ok: true, raw: json };
}

/** POST /v1/reception/tickets — `recyclique_reception_createTicket`. */
export type CreateTicketResult = { ok: true; ticketId: string; raw: unknown } | ReceptionHttpError;

export async function postCreateReceptionTicket(
  posteId: string,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<CreateTicketResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/reception/tickets`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(auth, true),
      body: JSON.stringify({ poste_id: posteId }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  if (typeof json !== 'object' || json === null || !('id' in json)) {
    return receptionHttpError(res.status, json, 'Réponse ticket sans id');
  }
  return { ok: true, ticketId: String((json as { id: unknown }).id), raw: json };
}

/** POST /v1/reception/tickets/{ticket_id}/close — `recyclique_reception_closeTicket`. */
export type CloseTicketResult = { ok: true; raw: unknown } | ReceptionHttpError;

export async function postCloseReceptionTicket(
  ticketId: string,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<CloseTicketResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/reception/tickets/${encodeURIComponent(ticketId)}/close`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(auth, true),
      body: '{}',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  return { ok: true, raw: json };
}

export type CreateLigneBody = {
  ticket_id: string;
  category_id: string;
  poids_kg: number;
  destination: ReceptionDestinationV1;
  notes?: string | null;
  is_exit?: boolean;
};

/** POST /v1/reception/lignes — `recyclique_reception_createLigne`. */
export type CreateLigneResult = { ok: true; ligne: ReceptionLigneResponse; raw: unknown } | ReceptionHttpError;

export async function postCreateReceptionLigne(
  body: CreateLigneBody,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<CreateLigneResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/reception/lignes`;
  const payload = {
    ticket_id: body.ticket_id,
    category_id: body.category_id,
    poids_kg: body.poids_kg,
    destination: body.destination,
    notes: body.notes ?? null,
    is_exit: body.is_exit ?? false,
  };
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(auth, true),
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  if (typeof json !== 'object' || json === null || !('id' in json)) {
    return receptionHttpError(res.status, json, 'Réponse ligne invalide');
  }
  const o = json as Record<string, unknown>;
  const ligne = parseReceptionLigneJson(o);
  return { ok: true, ligne, raw: json };
}

function parseReceptionLigneJson(o: Record<string, unknown>): ReceptionLigneResponse {
  return {
    id: String(o.id),
    ticket_id: String(o.ticket_id),
    category_id: String(o.category_id),
    category_label: String(o.category_label ?? ''),
    poids_kg: Number(o.poids_kg),
    destination: o.destination as ReceptionDestinationV1,
    notes: o.notes == null ? null : String(o.notes),
    is_exit: Boolean(o.is_exit),
  };
}

export type UpdateLigneBody = {
  category_id?: string;
  poids_kg?: number;
  destination?: ReceptionDestinationV1;
  notes?: string | null;
  is_exit?: boolean;
};

/** PUT /v1/reception/lignes/{ligne_id} — `recyclique_reception_updateLigne`. */
export type UpdateLigneResult = { ok: true; ligne: ReceptionLigneResponse; raw: unknown } | ReceptionHttpError;

export async function putUpdateReceptionLigne(
  ligneId: string,
  body: UpdateLigneBody,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<UpdateLigneResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/reception/lignes/${encodeURIComponent(ligneId)}`;
  const payload: Record<string, unknown> = {};
  if (body.category_id !== undefined) payload.category_id = body.category_id;
  if (body.poids_kg !== undefined) payload.poids_kg = body.poids_kg;
  if (body.destination !== undefined) payload.destination = body.destination;
  if (body.notes !== undefined) payload.notes = body.notes;
  if (body.is_exit !== undefined) payload.is_exit = body.is_exit;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: authHeaders(auth, true),
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  if (typeof json !== 'object' || json === null || !('id' in json)) {
    return receptionHttpError(res.status, json, 'Réponse ligne invalide');
  }
  const ligne = parseReceptionLigneJson(json as Record<string, unknown>);
  return { ok: true, ligne, raw: json };
}

/** DELETE /v1/reception/lignes/{ligne_id} — `recyclique_reception_deleteLigne`. */
export type DeleteLigneResult = { ok: true; raw: unknown } | ReceptionHttpError;

export async function deleteReceptionLigne(
  ligneId: string,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<DeleteLigneResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/reception/lignes/${encodeURIComponent(ligneId)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'DELETE', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  return { ok: true, raw: json };
}

/** PATCH /v1/reception/tickets/{ticket_id}/lignes/{ligne_id}/weight — `recyclique_reception_patchLigneWeight`. */
export type PatchLigneWeightResult = { ok: true; ligne: ReceptionLigneResponse; raw: unknown } | ReceptionHttpError;

export async function patchReceptionLigneWeight(
  ticketId: string,
  ligneId: string,
  poidsKg: number,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<PatchLigneWeightResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/reception/tickets/${encodeURIComponent(ticketId)}/lignes/${encodeURIComponent(ligneId)}/weight`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PATCH',
      credentials: 'include',
      headers: authHeaders(auth, true),
      body: JSON.stringify({ poids_kg: poidsKg }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  if (typeof json !== 'object' || json === null || !('id' in json)) {
    return receptionHttpError(res.status, json, 'Réponse ligne invalide');
  }
  const ligne = parseReceptionLigneJson(json as Record<string, unknown>);
  return { ok: true, ligne, raw: json };
}

/** GET /v1/reception/categories — `recyclique_reception_listCategories`. */
export type ListCategoriesResult = { ok: true; categories: ReceptionCategoryRow[] } | ReceptionHttpError;

export async function getReceptionCategories(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<ListCategoriesResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/reception/categories`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  if (!Array.isArray(json)) {
    return receptionHttpError(res.status, json, 'Réponse catégories invalide');
  }
  const categories = (json as unknown[]).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      name: String(r.name ?? ''),
      parent_id: r.parent_id == null || String(r.parent_id).trim() === '' ? null : String(r.parent_id),
    };
  });
  return { ok: true, categories };
}

function parseTicketSummary(o: Record<string, unknown>): ReceptionTicketSummary {
  return {
    id: String(o.id),
    poste_id: String(o.poste_id),
    benevole_username: String(o.benevole_username ?? ''),
    created_at: String(o.created_at ?? ''),
    closed_at: o.closed_at == null ? null : String(o.closed_at),
    status: String(o.status ?? ''),
    total_lignes: Number(o.total_lignes ?? 0),
    total_poids: Number(o.total_poids ?? 0),
    poids_entree: Number(o.poids_entree ?? 0),
    poids_direct: Number(o.poids_direct ?? 0),
    poids_sortie: Number(o.poids_sortie ?? 0),
  };
}

/** Paramètres GET `/v1/reception/tickets` (alignés FastAPI `reception.get_tickets`). */
export type ReceptionTicketsListQuery = {
  readonly page?: number;
  readonly per_page?: number;
  readonly status?: string;
  /** ISO 8601 ou date `YYYY-MM-DD` (normalisée en début de journée UTC côté client). */
  readonly date_from?: string;
  readonly date_to?: string;
  readonly benevole_id?: string;
  readonly search?: string;
  readonly include_empty?: boolean;
  readonly poids_min?: number;
  readonly poids_max?: number;
  readonly categories?: readonly string[];
  readonly destinations?: readonly string[];
  readonly lignes_min?: number;
  readonly lignes_max?: number;
};

function appendIsoDateRange(q: URLSearchParams, dateFrom?: string, dateTo?: string): void {
  const trimFrom = dateFrom?.trim();
  const trimTo = dateTo?.trim();
  if (trimFrom) {
    const iso = /T/.test(trimFrom) ? trimFrom : `${trimFrom}T00:00:00.000Z`;
    q.set('date_from', iso);
  }
  if (trimTo) {
    const iso = /T/.test(trimTo) ? trimTo : `${trimTo}T23:59:59.999Z`;
    q.set('date_to', iso);
  }
}

/** GET /v1/reception/tickets — `recyclique_reception_listTickets`. */
export type ListTicketsResult = { ok: true; data: ReceptionTicketListPayload } | ReceptionHttpError;

export async function getReceptionTicketsList(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  params?: ReceptionTicketsListQuery,
): Promise<ListTicketsResult> {
  const base = getLiveSnapshotBasePrefix();
  const page = params?.page ?? 1;
  const perPage = params?.per_page ?? 20;
  const q = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (params?.status?.trim()) {
    q.set('status', params.status.trim());
  }
  appendIsoDateRange(q, params?.date_from, params?.date_to);
  if (params?.benevole_id?.trim()) q.set('benevole_id', params.benevole_id.trim());
  if (params?.search?.trim()) q.set('search', params.search.trim());
  if (params?.include_empty === true) q.set('include_empty', 'true');
  if (params?.poids_min != null && Number.isFinite(params.poids_min)) q.set('poids_min', String(params.poids_min));
  if (params?.poids_max != null && Number.isFinite(params.poids_max)) q.set('poids_max', String(params.poids_max));
  if (params?.categories?.length) {
    for (const c of params.categories) {
      const id = c.trim();
      if (id) q.append('categories', id);
    }
  }
  if (params?.destinations?.length) {
    for (const d of params.destinations) {
      const v = d.trim();
      if (v) q.append('destinations', v);
    }
  }
  if (params?.lignes_min != null && Number.isFinite(params.lignes_min)) q.set('lignes_min', String(params.lignes_min));
  if (params?.lignes_max != null && Number.isFinite(params.lignes_max)) q.set('lignes_max', String(params.lignes_max));
  const url = `${base}/v1/reception/tickets?${q.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  if (typeof json !== 'object' || json === null) {
    return receptionHttpError(res.status, json, 'Réponse liste tickets invalide');
  }
  const o = json as Record<string, unknown>;
  const ticketsRaw = o.tickets;
  if (!Array.isArray(ticketsRaw)) {
    return receptionHttpError(res.status, json, 'Réponse liste tickets sans tableau tickets');
  }
  const tickets = ticketsRaw.map((row) => parseTicketSummary(row as Record<string, unknown>));
  const data: ReceptionTicketListPayload = {
    tickets,
    total: Number(o.total ?? 0),
    page: Number(o.page ?? page),
    per_page: Number(o.per_page ?? perPage),
    total_pages: Number(o.total_pages ?? 0),
  };
  return { ok: true, data };
}

/** POST /v1/reception/tickets/{ticket_id}/download-token — `recyclique_reception_createTicketDownloadToken`. */
export type DownloadTokenResult =
  | { ok: true; downloadUrl: string; filename: string; expiresInSeconds: number }
  | ReceptionHttpError;

export async function postReceptionTicketDownloadToken(
  ticketId: string,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<DownloadTokenResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/reception/tickets/${encodeURIComponent(ticketId)}/download-token`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(auth, true),
      body: '{}',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  if (typeof json !== 'object' || json === null) {
    return receptionHttpError(res.status, json, 'Réponse jeton export invalide');
  }
  const o = json as Record<string, unknown>;
  const downloadUrl = String(o.download_url ?? '').trim();
  if (!downloadUrl) {
    return receptionHttpError(res.status, json, 'Réponse export sans URL de téléchargement exploitable');
  }
  return {
    ok: true,
    downloadUrl,
    filename: String(o.filename ?? ''),
    expiresInSeconds: Number(o.expires_in_seconds ?? 0),
  };
}

/** GET /v1/reception/tickets/{ticket_id} — `recyclique_reception_getTicketDetail`. */
export type GetTicketDetailResult = { ok: true; ticket: ReceptionTicketDetail } | ReceptionHttpError;

export async function getReceptionTicketDetail(
  ticketId: string,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<GetTicketDetailResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/reception/tickets/${encodeURIComponent(ticketId)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders(auth) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const text = await res.text();
  const json = parseJsonText(text);
  if (!res.ok) {
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  if (typeof json !== 'object' || json === null || !('id' in json) || !('lignes' in json)) {
    return receptionHttpError(res.status, json, 'Réponse ticket invalide');
  }
  const o = json as Record<string, unknown>;
  const lignesRaw = o.lignes;
  const lignes: ReceptionLigneResponse[] = Array.isArray(lignesRaw)
    ? lignesRaw.map((row) => parseReceptionLigneJson(row as Record<string, unknown>))
    : [];
  const ticket: ReceptionTicketDetail = {
    id: String(o.id),
    poste_id: String(o.poste_id),
    benevole_username: String(o.benevole_username ?? ''),
    created_at: String(o.created_at ?? ''),
    closed_at: o.closed_at == null ? null : String(o.closed_at),
    status: String(o.status ?? ''),
    lignes,
  };
  return { ok: true, ticket };
}

/** Filtres supportés par `POST /v1/admin/reports/reception-tickets/export-bulk` (aligné backend `BulkReceptionExportFilters`). */
export type ReceptionBulkExportFilters = {
  readonly date_from?: string;
  readonly date_to?: string;
  readonly status?: string;
  readonly benevole_id?: string;
  readonly search?: string;
  readonly include_empty?: boolean;
};

function receptionBulkFiltersPayload(filters: ReceptionBulkExportFilters): Record<string, unknown> {
  const out: Record<string, unknown> = { include_empty: filters.include_empty === true };
  const trimFrom = filters.date_from?.trim();
  const trimTo = filters.date_to?.trim();
  if (trimFrom) {
    out.date_from = /T/.test(trimFrom) ? trimFrom : `${trimFrom}T00:00:00.000Z`;
  }
  if (trimTo) {
    out.date_to = /T/.test(trimTo) ? trimTo : `${trimTo}T23:59:59.999Z`;
  }
  if (filters.status?.trim()) out.status = filters.status.trim();
  if (filters.benevole_id?.trim()) out.benevole_id = filters.benevole_id.trim();
  if (filters.search?.trim()) out.search = filters.search.trim();
  return out;
}

export type PostReceptionTicketsExportBulkResult =
  | { ok: true; blob: Blob; filename: string }
  | ReceptionHttpError;

/**
 * POST `/v1/admin/reports/reception-tickets/export-bulk` — export consolidé CSV ou Excel (rôles admin serveur).
 * En-têtes requis par le contrat : confirmation à usage unique du compte administrateur + clé d'idempotence.
 */
export async function postReceptionTicketsExportBulk(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  opts: {
    readonly stepUpPin: string;
    readonly format: 'csv' | 'excel';
    readonly filters: ReceptionBulkExportFilters;
    readonly idempotencyKey?: string;
  },
): Promise<PostReceptionTicketsExportBulkResult> {
  const pin = opts.stepUpPin.trim();
  if (!pin) {
    return receptionHttpError(400, null, 'Code de confirmation obligatoire pour cet export.');
  }
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/admin/reports/reception-tickets/export-bulk`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json',
    'X-Step-Up-Pin': pin,
    'Idempotency-Key': opts.idempotencyKey?.trim() || crypto.randomUUID(),
  };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  const body = JSON.stringify({
    filters: receptionBulkFiltersPayload(opts.filters),
    format: opts.format,
  });
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', credentials: 'include', headers, body });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return receptionHttpError(0, null, msg, true);
  }
  const contentType = res.headers.get('Content-Type') ?? '';
  if (!res.ok) {
    const text = await res.text();
    const json = parseJsonText(text);
    return receptionHttpError(res.status, json, text || res.statusText);
  }
  const looksJson = contentType.includes('application/json') || contentType.includes('problem+json');
  if (looksJson) {
    const text = await res.text();
    const json = parseJsonText(text);
    return receptionHttpError(res.status, json, 'Réponse export inattendue');
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') ?? '';
  let filename =
    opts.format === 'csv'
      ? `export_tickets_reception_${new Date().toISOString().slice(0, 10)}.csv`
      : `export_tickets_reception_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(cd);
  if (m?.[1]) {
    try {
      filename = decodeURIComponent(m[1].replace(/"/g, '').trim());
    } catch {
      filename = m[1].replace(/"/g, '').trim();
    }
  }
  return { ok: true, blob, filename };
}
