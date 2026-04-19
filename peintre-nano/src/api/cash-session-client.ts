import type { AuthContextPort } from '../app/auth/auth-context-port';
import { DEMO_AUTH_STUB_USER_ID } from '../app/auth/default-demo-auth-adapter';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidLikeString(s: string): boolean {
  return UUID_LIKE.test(s.trim());
}

function operatorIdFromAccessTokenJwt(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const json =
      typeof atob !== 'undefined'
        ? atob(b64 + pad)
        : Buffer.from(b64, 'base64').toString('utf8');
    const payload = JSON.parse(json) as { sub?: unknown };
    const sub = typeof payload.sub === 'string' ? payload.sub.trim() : '';
    return isUuidLikeString(sub) ? sub : null;
  } catch {
    return null;
  }
}

export type ResolveCashSessionOpeningIdsResult =
  | { ok: true; operatorId: string; siteId: string }
  | { ok: false; message: string };

async function fetchUsersMeJson(
  auth: Pick<AuthContextPort, 'getAccessToken' | 'getSession'>,
): Promise<
  | { ok: true; json: Record<string, unknown> }
  | { ok: false; status: number; message: string }
> {
  const token = auth.getAccessToken?.();
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/users/me`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, status: 0, message: `${msg} (GET /v1/users/me)` };
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (!res.ok) {
    const detail =
      typeof json === 'object' && json !== null && 'detail' in json
        ? normalizeDetailForOperatorResolve((json as { detail: unknown }).detail)
        : text || res.statusText;
    return {
      ok: false,
      status: res.status,
      message:
        res.status === 401
          ? `Identité introuvable (401) : reconnectez-vous. ${detail}`
          : `GET /v1/users/me a échoué (${res.status}) : ${detail}`,
    };
  }

  if (typeof json !== 'object' || json === null) {
    return { ok: false, status: res.status, message: 'Réponse /v1/users/me invalide.' };
  }
  return { ok: true, json: json as Record<string, unknown> };
}

/**
 * Résout `operator_id` et `site_id` pour `POST /v1/cash-sessions/` :
 * — opérateur : UUID session auth, sinon `sub` JWT, sinon `GET /v1/users/me` ;
 * — site : UUID `ContextEnvelope.siteId` si déjà un UUID, sinon `site_id` de `/v1/users/me` si présent.
 */
export async function resolveCashSessionOpeningIds(
  auth: Pick<AuthContextPort, 'getAccessToken' | 'getSession'>,
  envelopeSiteId: string | null | undefined,
): Promise<ResolveCashSessionOpeningIdsResult> {
  const session = auth.getSession();
  if (!session.authenticated) {
    return { ok: false, message: 'Authentification requise pour ouvrir une session caisse.' };
  }

  const envSiteTrim = envelopeSiteId?.trim() ?? '';
  const siteFromEnvelope = isUuidLikeString(envSiteTrim) ? envSiteTrim : null;

  const fromSession = session.userId?.trim() ?? '';
  const sessionLooksUuid = isUuidLikeString(fromSession);
  /** Placeholder démo : avec cookies réels, l’opérateur effectif vient du backend (`/users/me`). */
  const sessionIsDemoStub = fromSession === DEMO_AUTH_STUB_USER_ID || fromSession === 'demo-user';

  let operatorId: string | null =
    sessionLooksUuid && !sessionIsDemoStub ? fromSession : null;

  let me: Record<string, unknown> | null = null;
  const token = auth.getAccessToken?.();

  if (!operatorId) {
    if (token) {
      operatorId = operatorIdFromAccessTokenJwt(token);
    }
  }

  if (!operatorId) {
    const meRes = await fetchUsersMeJson(auth);
    if (!meRes.ok) {
      return { ok: false, message: meRes.message };
    }
    me = meRes.json;
    const id = String(me.id ?? '').trim();
    if (!isUuidLikeString(id)) {
      return { ok: false, message: "Identifiant utilisateur /me inattendu — UUID requis pour l'ouverture caisse." };
    }
    operatorId = id;
  }

  let siteId: string | null = null;
  const siteFromMe =
    me && me.site_id != null && isUuidLikeString(String(me.site_id).trim())
      ? String(me.site_id).trim()
      : null;

  if (siteFromMe) {
    siteId = siteFromMe;
  } else if (siteFromEnvelope) {
    siteId = siteFromEnvelope;
  } else {
    if (!me) {
      const meRes = await fetchUsersMeJson(auth);
      if (!meRes.ok) {
        return {
          ok: false,
          message: `${meRes.message} (site caisse : l'enveloppe n'a pas d'UUID de site.)`,
        };
      }
      me = meRes.json;
    }
    const sid = me.site_id != null ? String(me.site_id).trim() : '';
    if (isUuidLikeString(sid)) {
      siteId = sid;
    }
  }

  if (!siteId) {
    return {
      ok: false,
      message:
        'Site caisse introuvable : renseignez un UUID de site dans l’enveloppe de contexte ou associez un site au compte (profil / admin).',
    };
  }

  return { ok: true, operatorId, siteId };
}

/** @deprecated Utiliser `resolveCashSessionOpeningIds` (résout aussi le site). */
export async function resolveCashSessionOperatorId(
  auth: Pick<AuthContextPort, 'getAccessToken' | 'getSession'>,
): Promise<
  | { ok: true; operatorId: string }
  | { ok: false; message: string }
> {
  const r = await resolveCashSessionOpeningIds(auth, undefined);
  if (!r.ok) return r;
  return { ok: true, operatorId: r.operatorId };
}

function normalizeDetailForOperatorResolve(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'msg' in item) {
          const m = (item as { msg?: unknown }).msg;
          return typeof m === 'string' ? m : JSON.stringify(item);
        }
        return typeof item === 'string' ? item : JSON.stringify(item);
      })
      .join(' · ');
  }
  return detail != null ? JSON.stringify(detail) : '';
}

/** Tolérance alignée backend `CLOSE_VARIANCE_TOLERANCE` (Story 6.7). */
export const CLOSE_VARIANCE_TOLERANCE_EUR = 0.05;

export type CashSessionTotalsV1 = {
  sales_completed: number;
  refunds: number;
  net: number;
};

/** Sous-ensemble consommé par l’UI clôture — aligné enrichissement backend / OpenAPI `CashSessionResponse`. */
export type CashSessionCurrentV1 = {
  id: string;
  operator_id?: string;
  site_id?: string;
  /** Poste caisse (OpenAPI `register_id`) — exploitable quand l’enveloppe n’expose pas encore `activeRegisterId`. */
  register_id?: string | null;
  initial_amount: number;
  current_amount: number;
  status: 'open' | 'closed';
  opened_at?: string;
  closed_at?: string | null;
  total_sales?: number | null;
  total_items?: number | null;
  total_donations?: number | null;
  total_weight_out?: number | null;
  closing_amount?: number | null;
  actual_amount?: number | null;
  variance?: number | null;
  variance_comment?: string | null;
  totals?: CashSessionTotalsV1 | null;
  /** Aligné ``get_closing_preview`` / POST close (fond + ventes + dons) — prioritaire pour ``theoreticalCloseAmount``. */
  closing_preview_theoretical_amount?: number | null;
};

export type CashSessionClientHttpErrorFields = {
  readonly code?: string;
  readonly retryable?: boolean;
  readonly state?: string | null;
  readonly correlation_id?: string;
  readonly networkError?: boolean;
};

export type CashSessionHttpError = { ok: false; status: number; detail: string } & CashSessionClientHttpErrorFields;

export type GetCurrentCashSessionResult =
  | { ok: true; session: CashSessionCurrentV1 | null }
  | CashSessionHttpError;

export type OpenCashSessionBody = {
  operator_id: string;
  site_id: string;
  register_id?: string | null;
  initial_amount: number;
  opened_at?: string;
};

export type OpenCashSessionResult = { ok: true; session: CashSessionCurrentV1 } | CashSessionHttpError;

function sessionHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): CashSessionHttpError {
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

/**
 * GET /v1/cash-sessions/current — `operationId` `recyclique_cashSessions_getCurrentOpenSession`.
 */
export async function getCurrentOpenCashSession(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<GetCurrentCashSessionResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/cash-sessions/current`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return sessionHttpError(0, null, msg, true);
  }

  const text = await res.text();
  const trimmed = text.trim();
  if (res.status === 200 && (trimmed === '' || trimmed === 'null')) {
    return { ok: true, session: null };
  }

  let json: unknown;
  let parseFailed = false;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    parseFailed = true;
    json = undefined;
  }

  if (!res.ok) {
    return sessionHttpError(res.status, json, text || res.statusText);
  }

  if (parseFailed) {
    return sessionHttpError(res.status, json, 'Réponse JSON invalide (session courante)');
  }

  if (json === null) {
    return { ok: true, session: null };
  }

  if (typeof json !== 'object' || json === null || !('id' in json)) {
    return sessionHttpError(res.status, json, 'Réponse session courante invalide');
  }

  return { ok: true, session: json as CashSessionCurrentV1 };
}

/** Ligne `GET /v1/cash-registers/status` — aligné legacy `cashRegisterDashboardService.getRegistersStatus` / backend `list_cash_registers_status`. */
export type CashRegisterStatusRowV1 = {
  id: string;
  name: string;
  is_open: boolean;
  enable_virtual?: boolean;
  enable_deferred?: boolean;
  location?: string | null;
};

export type GetCashRegistersStatusResult =
  | { ok: true; rows: CashRegisterStatusRowV1[] }
  | CashSessionHttpError;

/**
 * GET /v1/cash-registers/status — liste des postes actifs + `is_open` (session en cours sur le poste).
 */
export async function getCashRegistersStatus(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<GetCashRegistersStatusResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/cash-registers/status`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return sessionHttpError(0, null, msg, true);
  }

  const text = await res.text();
  let json: unknown;
  let parseFailed = false;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    parseFailed = true;
    json = undefined;
  }

  if (!res.ok) {
    return sessionHttpError(res.status, json, text || res.statusText);
  }

  if (parseFailed) {
    return sessionHttpError(res.status, json, 'Réponse JSON invalide (statut postes caisse)');
  }

  if (typeof json !== 'object' || json === null) {
    return { ok: true, rows: [] };
  }

  const data = (json as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    return { ok: true, rows: [] };
  }

  const rows: CashRegisterStatusRowV1[] = [];
  for (const item of data) {
    if (typeof item !== 'object' || item === null || !('id' in item) || !('name' in item)) continue;
    const o = item as Record<string, unknown>;
    rows.push({
      id: String(o.id).trim(),
      name: String(o.name).trim(),
      is_open: Boolean(o.is_open),
      enable_virtual: typeof o.enable_virtual === 'boolean' ? o.enable_virtual : undefined,
      enable_deferred: typeof o.enable_deferred === 'boolean' ? o.enable_deferred : undefined,
      location: o.location == null || o.location === '' ? null : String(o.location),
    });
  }
  return { ok: true, rows };
}

/**
 * POST /v1/cash-sessions/ — ouverture explicite brownfield (Story 6.x / checklist §2).
 */
export async function postOpenCashSession(
  body: OpenCashSessionBody,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<OpenCashSessionResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/cash-sessions/`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        operator_id: body.operator_id,
        site_id: body.site_id,
        register_id: body.register_id ?? null,
        initial_amount: body.initial_amount,
        opened_at: body.opened_at ?? undefined,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return sessionHttpError(0, null, msg, true);
  }

  const text = await res.text();
  let json: unknown;
  let parseFailed = false;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
    parseFailed = true;
  }

  if (!res.ok) {
    return sessionHttpError(res.status, json, text || res.statusText);
  }

  if (parseFailed || typeof json !== 'object' || json === null || !('id' in json)) {
    return sessionHttpError(res.status, json, 'Réponse ouverture session invalide');
  }

  return { ok: true, session: json as CashSessionCurrentV1 };
}

export type CloseCashSessionBody = {
  actual_amount: number;
  variance_comment?: string | null;
};

export type CloseCashSessionSuccess =
  | { kind: 'closed'; session: Record<string, unknown> }
  | { kind: 'deleted'; sessionId: string; message?: string };

export type CloseCashSessionResult = { ok: true; data: CloseCashSessionSuccess } | CashSessionHttpError;

export type CloseCashSessionOptions = {
  stepUpPin: string;
  idempotencyKey?: string;
  requestId?: string;
};

/**
 * POST /v1/cash-sessions/{session_id}/close — `recyclique_cashSessions_closeSession`.
 * En-têtes : `X-Step-Up-Pin`, `Idempotency-Key`, `X-Request-Id` (Story 2.4 / 6.7).
 */
export async function postCloseCashSession(
  sessionId: string,
  body: CloseCashSessionBody,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  opts: CloseCashSessionOptions,
): Promise<CloseCashSessionResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/cash-sessions/${encodeURIComponent(sessionId)}/close`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Step-Up-Pin': opts.stepUpPin,
  };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  const idem = opts.idempotencyKey?.trim() || crypto.randomUUID();
  headers['Idempotency-Key'] = idem;
  headers['X-Request-Id'] = opts.requestId?.trim() || crypto.randomUUID();

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        actual_amount: body.actual_amount,
        variance_comment: body.variance_comment ?? null,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return sessionHttpError(0, null, msg, true);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    return sessionHttpError(res.status, json, text || res.statusText);
  }

  if (typeof json === 'object' && json !== null && (json as { deleted?: boolean }).deleted === true) {
    return {
      ok: true,
      data: {
        kind: 'deleted',
        sessionId: String((json as { session_id?: unknown }).session_id ?? sessionId),
        message: typeof (json as { message?: unknown }).message === 'string' ? (json as { message: string }).message : undefined,
      },
    };
  }

  if (typeof json === 'object' && json !== null && 'id' in json) {
    return { ok: true, data: { kind: 'closed', session: json as Record<string, unknown> } };
  }

  return sessionHttpError(res.status, json, 'Réponse clôture invalide');
}

export type ExceptionalRefundPayload = {
  amount: number;
  refund_payment_method: string;
  reason_code: string;
  justification: string;
  detail?: string | null;
};

export type ExceptionalRefundResult =
  | { ok: true; refund: Record<string, unknown> }
  | CashSessionHttpError;

export type ExceptionalRefundOptions = {
  stepUpPin: string;
  idempotencyKey?: string;
  requestId?: string;
};

/**
 * POST /v1/cash-sessions/{session_id}/exceptional-refunds — remboursement exceptionnel.
 * En-têtes : `X-Step-Up-Pin`, `Idempotency-Key`, `X-Request-Id`.
 */
export async function postExceptionalRefund(
  sessionId: string,
  body: ExceptionalRefundPayload,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  opts: ExceptionalRefundOptions,
): Promise<ExceptionalRefundResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/cash-sessions/${encodeURIComponent(sessionId)}/exceptional-refunds`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Step-Up-Pin': opts.stepUpPin,
  };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  const idem = opts.idempotencyKey?.trim() || crypto.randomUUID();
  headers['Idempotency-Key'] = idem;
  headers['X-Request-Id'] = opts.requestId?.trim() || crypto.randomUUID();

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return sessionHttpError(0, null, msg, true);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    return sessionHttpError(res.status, json, text || res.statusText);
  }

  if (typeof json === 'object' && json !== null && 'id' in json) {
    return { ok: true, refund: json as Record<string, unknown> };
  }

  return sessionHttpError(res.status, json, 'Réponse remboursement exceptionnel invalide');
}

export type MaterialExchangePayload = Record<string, unknown>;

export type MaterialExchangeResult =
  | { ok: true; exchange: Record<string, unknown> }
  | CashSessionHttpError;

/**
 * POST /v1/cash-sessions/{session_id}/material-exchanges — échange matière (Story 24.6).
 */
export async function postMaterialExchange(
  sessionId: string,
  body: MaterialExchangePayload,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<MaterialExchangeResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/cash-sessions/${encodeURIComponent(sessionId)}/material-exchanges`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return sessionHttpError(0, null, msg, true);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    return sessionHttpError(res.status, json, text || res.statusText);
  }

  if (typeof json === 'object' && json !== null && 'id' in json) {
    return { ok: true, exchange: json as Record<string, unknown> };
  }

  return sessionHttpError(res.status, json, 'Réponse échange matière invalide');
}

export type CashDisbursementPayload = {
  subtype: string;
  motif_code: string;
  counterparty_label: string;
  amount: number;
  payment_method: string;
  justification_reference: string;
  free_comment?: string | null;
  actual_settlement_at: string;
  admin_coded_reason_key?: string | null;
};

export type CashDisbursementResult =
  | { ok: true; disbursement: Record<string, unknown> }
  | CashSessionHttpError;

export type CashDisbursementOptions = {
  idempotencyKey?: string;
  requestId?: string;
  /** Obligatoire pour les sous-types à preuve N3 (step-up). */
  stepUpPin?: string;
};

/**
 * POST /v1/cash-sessions/{session_id}/disbursements — décaissement typé (Story 24.7).
 */
export async function postCashDisbursement(
  sessionId: string,
  body: CashDisbursementPayload,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  opts?: CashDisbursementOptions,
): Promise<CashDisbursementResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/cash-sessions/${encodeURIComponent(sessionId)}/disbursements`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  const idem = opts?.idempotencyKey?.trim() || crypto.randomUUID();
  headers['Idempotency-Key'] = idem;
  headers['X-Request-Id'] = opts?.requestId?.trim() || crypto.randomUUID();
  const pin = opts?.stepUpPin?.trim();
  if (pin) {
    headers['X-Step-Up-Pin'] = pin;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return sessionHttpError(0, null, msg, true);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    return sessionHttpError(res.status, json, text || res.statusText);
  }

  if (typeof json === 'object' && json !== null && 'id' in json) {
    return { ok: true, disbursement: json as Record<string, unknown> };
  }

  return sessionHttpError(res.status, json, 'Réponse décaissement invalide');
}

export type CashInternalTransferPayload = {
  transfer_type: string;
  session_flow: string;
  origin_endpoint_label: string;
  destination_endpoint_label: string;
  motif: string;
  amount: number;
  payment_method: string;
  justification_reference: string;
};

export type CashInternalTransferResult =
  | { ok: true; transfer: Record<string, unknown> }
  | CashSessionHttpError;

export type CashInternalTransferOptions = {
  idempotencyKey?: string;
  requestId?: string;
  stepUpPin?: string;
};

/** Aligné backend `internal_transfer_requires_step_up` (N3). */
export function internalTransferNeedsStepUpPin(input: {
  transfer_type: string;
  amount: number;
}): boolean {
  const t = input.transfer_type;
  if (t === 'inter_register_transfer' || t === 'variance_regularization') return true;
  return Number(input.amount) >= 500;
}

/**
 * POST /v1/cash-sessions/{session_id}/internal-transfers — mouvement interne (Story 24.8).
 */
export async function postCashInternalTransfer(
  sessionId: string,
  body: CashInternalTransferPayload,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  opts?: CashInternalTransferOptions,
): Promise<CashInternalTransferResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/cash-sessions/${encodeURIComponent(sessionId)}/internal-transfers`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  const idem = opts?.idempotencyKey?.trim() || crypto.randomUUID();
  headers['Idempotency-Key'] = idem;
  headers['X-Request-Id'] = opts?.requestId?.trim() || crypto.randomUUID();
  const pin = opts?.stepUpPin?.trim();
  if (pin) {
    headers['X-Step-Up-Pin'] = pin;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return sessionHttpError(0, null, msg, true);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    return sessionHttpError(res.status, json, text || res.statusText);
  }

  if (typeof json === 'object' && json !== null && 'id' in json) {
    return { ok: true, transfer: json as Record<string, unknown> };
  }

  return sessionHttpError(res.status, json, 'Réponse mouvement interne invalide');
}

/** Détail session + ventes (GET admin) — aligné OpenAPI `CashSessionDetailResponseV1` / Story 6.8. */
export type CashSessionDetailV1 = CashSessionCurrentV1 & {
  readonly sales?: ReadonlyArray<Record<string, unknown>>;
  readonly operator_name?: string | null;
  readonly site_name?: string | null;
};

export type GetCashSessionDetailResult =
  | { ok: true; session: CashSessionDetailV1 }
  | CashSessionHttpError;

/**
 * GET /v1/cash-sessions/{session_id} — `operationId` `recyclique_cashSessions_getSessionDetail`.
 */
export async function getCashSessionDetail(
  sessionId: string,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<GetCashSessionDetailResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/cash-sessions/${encodeURIComponent(sessionId)}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return sessionHttpError(0, null, msg, true);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (!res.ok) {
    return sessionHttpError(res.status, json, text || res.statusText);
  }

  if (typeof json !== 'object' || json === null || !('id' in json)) {
    return sessionHttpError(res.status, json, 'Réponse détail session invalide');
  }

  return { ok: true, session: json as CashSessionDetailV1 };
}

/** Montant théorique caisse — même règle que ``CashSessionService.get_closing_preview`` / POST ``/close``. */
export function theoreticalCloseAmount(session: CashSessionCurrentV1): number {
  const fromApi = session.closing_preview_theoretical_amount;
  if (fromApi != null && Number.isFinite(Number(fromApi))) {
    return Number(fromApi);
  }
  const initial = session.initial_amount ?? 0;
  const sales = session.total_sales ?? 0;
  const donations = session.total_donations ?? 0;
  return initial + sales + donations;
}

export function needsVarianceComment(actual: number, theoretical: number): boolean {
  return Math.abs(actual - theoretical) > CLOSE_VARIANCE_TOLERANCE_EUR;
}
