import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';
import { parseRecycliqueApiErrorBody, toRecycliqueClientFailure } from './recyclique-api-error';

/** Champs AR21 (OpenAPI RecycliqueApiError) sur les erreurs HTTP du client ventes. */
export type SalesClientHttpErrorFields = {
  readonly code?: string;
  readonly retryable?: boolean;
  readonly state?: string | null;
  readonly correlation_id?: string;
  readonly networkError?: boolean;
};

type SalesHttpError = { ok: false; status: number; detail: string } & SalesClientHttpErrorFields;

function salesHttpError(
  status: number,
  json: unknown,
  fallbackDetail: string,
  networkError?: boolean,
): SalesHttpError {
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

export type SaleItemCreateBody = {
  category: string;
  quantity: number;
  weight: number;
  unit_price: number;
  total_price: number;
};

export type SpecialEncaissementKindV1 = 'DON_SANS_ARTICLE' | 'ADHESION_ASSOCIATION';

/** Aligné sur OpenAPI `SocialActionKindV1` (Story 6.6). */
export type SocialActionKindV1 =
  | 'DON_LIBRE'
  | 'DON_MOINS_18'
  | 'MARAUDE'
  | 'KIT_INSTALLATION_ETUDIANT'
  | 'DON_AUX_ANIMAUX'
  | 'FRIPERIE_AUTO_GEREE';

export type SaleCreateBody = {
  cash_session_id: string;
  items: SaleItemCreateBody[];
  total_amount: number;
  donation?: number;
  payment_method?: 'cash' | 'card' | 'check' | 'free';
  payments?: Array<{ payment_method: string; amount: number }>;
  note?: string | null;
  special_encaissement_kind?: SpecialEncaissementKindV1;
  social_action_kind?: SocialActionKindV1;
  adherent_reference?: string | null;
};

/** Aligné sur OpenAPI `SaleItemResponseV1` / `SaleItemCreateV1` (champs utiles UI). */
export type SaleItemResponseV1 = SaleItemCreateBody & {
  id?: string;
  sale_id?: string;
};

/** Aligné sur OpenAPI `SaleResponseV1` (sous-ensemble consommé par le widget ticket). */
export type SaleResponseV1 = {
  id: string;
  cash_session_id: string;
  operator_id?: string | null;
  lifecycle_status?: 'completed' | 'held' | 'abandoned';
  total_amount: number;
  donation?: number | null;
  note?: string | null;
  items: SaleItemResponseV1[];
  payments?: unknown[];
  special_encaissement_kind?: SpecialEncaissementKindV1 | null;
  social_action_kind?: SocialActionKindV1 | null;
  adherent_reference?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SaleHoldCreateBody = {
  cash_session_id: string;
  items: SaleItemCreateBody[];
  total_amount: number;
  donation?: number;
  note?: string | null;
};

export type SaleFinalizeHeldBody = {
  donation?: number | null;
  payment_method?: 'cash' | 'card' | 'check' | 'free';
  payments?: Array<{ payment_method: string; amount: number }>;
  note?: string | null;
};

export type GetSaleResult = { ok: true; sale: SaleResponseV1 } | SalesHttpError;

export type SaleCreateResult = { ok: true; saleId: string; raw: unknown } | SalesHttpError;

/**
 * POST /v1/sales/ — `operationId` contractuel `recyclique_sales_createSale`.
 * Préfixe : même logique que bandeau live (`/api` en dev Docker).
 */
export async function postCreateSale(
  body: SaleCreateBody,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<SaleCreateResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sales/`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const token = auth.getAccessToken?.();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
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
    return salesHttpError(0, null, msg, true);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    return salesHttpError(res.status, json, text || res.statusText);
  }

  const id =
    typeof json === 'object' && json !== null && 'id' in json ? String((json as { id: unknown }).id) : '';
  if (!id) {
    return salesHttpError(res.status, json, 'Réponse vente sans id');
  }
  return { ok: true, saleId: id, raw: json };
}

/**
 * GET /v1/sales/{sale_id} — `operationId` `recyclique_sales_getSale`.
 */
export async function getSale(
  saleId: string,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<GetSaleResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sales/${encodeURIComponent(saleId)}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const token = auth.getAccessToken?.();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return salesHttpError(0, null, msg, true);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    return salesHttpError(res.status, json, text || res.statusText);
  }

  if (typeof json !== 'object' || json === null || !('id' in json) || !('items' in json)) {
    return salesHttpError(res.status, json, 'Réponse vente invalide');
  }

  return { ok: true, sale: json as SaleResponseV1 };
}

export type HeldSalesListResult = { ok: true; sales: SaleResponseV1[] } | SalesHttpError;

/**
 * UUID texte complet (8-4-4-4-12 hex) — utilisé pour éviter des GET `/sales/held` pendant la saisie progressive.
 * Aligné sur les identifiants session caisse exposés par l’API Recyclique.
 */
export function isPlausibleCashSessionUuid(s: string): boolean {
  const t = s.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
}

/**
 * GET /v1/sales/held — `operationId` `recyclique_sales_listHeldSalesForSession`.
 */
export async function getHeldSalesForSession(
  cashSessionId: string,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  limit = 50,
): Promise<HeldSalesListResult> {
  const base = getLiveSnapshotBasePrefix();
  const q = new URLSearchParams({ cash_session_id: cashSessionId, limit: String(limit) });
  const url = `${base}/v1/sales/held?${q.toString()}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return salesHttpError(0, null, msg, true);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    return salesHttpError(res.status, json, text || res.statusText);
  }
  if (!Array.isArray(json)) {
    return salesHttpError(res.status, json, 'Réponse liste tenue invalide');
  }
  return { ok: true, sales: json as SaleResponseV1[] };
}

export type SaleHoldResult = { ok: true; saleId: string; raw: unknown } | SalesHttpError;

/**
 * POST /v1/sales/hold — `operationId` `recyclique_sales_createHeldSale`.
 */
export async function postHoldSale(
  body: SaleHoldCreateBody,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<SaleHoldResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sales/hold`;
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
    return salesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    return salesHttpError(res.status, json, text || res.statusText);
  }
  const id =
    typeof json === 'object' && json !== null && 'id' in json ? String((json as { id: unknown }).id) : '';
  if (!id) return salesHttpError(res.status, json, 'Réponse tenue sans id');
  return { ok: true, saleId: id, raw: json };
}

export type FinalizeHeldResult = SaleCreateResult;

/**
 * POST /v1/sales/{sale_id}/finalize-held — `operationId` `recyclique_sales_finalizeHeldSale`.
 */
export async function postFinalizeHeldSale(
  saleId: string,
  body: SaleFinalizeHeldBody,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<FinalizeHeldResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sales/${encodeURIComponent(saleId)}/finalize-held`;
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
    return salesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    return salesHttpError(res.status, json, text || res.statusText);
  }
  const id =
    typeof json === 'object' && json !== null && 'id' in json ? String((json as { id: unknown }).id) : '';
  if (!id) return salesHttpError(res.status, json, 'Réponse finalisation sans id');
  return { ok: true, saleId: id, raw: json };
}

export type AbandonHeldResult = { ok: true; raw: unknown } | SalesHttpError;

export type SaleReversalCreateBody = {
  source_sale_id: string;
  reason_code: 'ERREUR_SAISIE' | 'RETOUR_ARTICLE' | 'ANNULATION_CLIENT' | 'AUTRE';
  detail?: string | null;
  idempotency_key?: string | null;
};

export type SaleReversalCreateResult = { ok: true; reversalId: string; raw: unknown } | SalesHttpError;

/**
 * POST /v1/sales/reversals — `operationId` `recyclique_sales_createSaleReversal` (Story 6.4).
 */
export async function postCreateSaleReversal(
  body: SaleReversalCreateBody,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<SaleReversalCreateResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sales/reversals`;
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
    return salesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    return salesHttpError(res.status, json, text || res.statusText);
  }
  const id =
    typeof json === 'object' && json !== null && 'id' in json ? String((json as { id: unknown }).id) : '';
  if (!id) return salesHttpError(res.status, json, 'Réponse reversal sans id');
  return { ok: true, reversalId: id, raw: json };
}

export type GetSaleReversalResult = { ok: true; raw: unknown } | SalesHttpError;

/**
 * GET /v1/sales/reversals/{reversal_id} — `operationId` `recyclique_sales_getSaleReversal`.
 */
export async function getSaleReversal(
  reversalId: string,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<GetSaleReversalResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sales/reversals/${encodeURIComponent(reversalId)}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include', headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return salesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    return salesHttpError(res.status, json, text || res.statusText);
  }
  return { ok: true, raw: json };
}

/**
 * POST /v1/sales/{sale_id}/abandon-held — `operationId` `recyclique_sales_abandonHeldSale`.
 */
export async function postAbandonHeldSale(
  saleId: string,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<AbandonHeldResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sales/${encodeURIComponent(saleId)}/abandon-held`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', credentials: 'include', headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return salesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    return salesHttpError(res.status, json, text || res.statusText);
  }
  return { ok: true, raw: json };
}

export type SaleCorrectionRequestBody =
  | { kind: 'sale_date'; sale_date: string; reason: string }
  | {
      kind: 'finalize_fields';
      reason: string;
      donation?: number | null;
      total_amount?: number | null;
      payment_method?: string | null;
      note?: string | null;
    };

export type PatchSaleSensitiveCorrectionResult = { ok: true; raw: unknown } | SalesHttpError;

/**
 * PATCH /v1/sales/{sale_id}/corrections — `operationId` `recyclique_sales_correctSaleSensitive` (Story 6.8).
 */
export async function patchSaleSensitiveCorrection(
  saleId: string,
  body: SaleCorrectionRequestBody,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  opts?: { stepUpPin?: string; idempotencyKey?: string },
): Promise<PatchSaleSensitiveCorrectionResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sales/${encodeURIComponent(saleId)}/corrections`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const token = auth.getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;
  const pin = opts?.stepUpPin?.trim();
  if (pin) headers['X-Step-Up-Pin'] = pin;
  const ik = opts?.idempotencyKey?.trim();
  if (ik) headers['Idempotency-Key'] = ik;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PATCH',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return salesHttpError(0, null, msg, true);
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    return salesHttpError(res.status, json, text || res.statusText);
  }
  return { ok: true, raw: json };
}
