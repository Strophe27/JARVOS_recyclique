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
  payment_method?: string;
  payments?: Array<{ payment_method: string; amount: number }>;
  /** Story 22.4 — journal serveur `donation_surplus`, distinct du règlement */
  donation_surplus?: Array<{ payment_method: string; amount: number }>;
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
  operator_name?: string | null;
  lifecycle_status?: 'completed' | 'held' | 'abandoned';
  total_amount: number;
  donation?: number | null;
  payment_method?: string | null;
  note?: string | null;
  sale_date?: string | null;
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
  payment_method?: string;
  payments?: Array<{ payment_method: string; amount: number }>;
  donation_surplus?: Array<{ payment_method: string; amount: number }>;
  note?: string | null;
};

export type GetSaleResult = { ok: true; sale: SaleResponseV1 } | SalesHttpError;

export type SaleCreateResult = { ok: true; saleId: string; raw: unknown } | SalesHttpError;

/** GET /v1/sales/payment-method-options — référentiel expert actif (UI caisse). */
export type SalePaymentMethodOption = {
  readonly code: string;
  readonly label: string;
  readonly kind: 'cash' | 'bank' | 'third_party' | 'other';
};

const PAYMENT_METHOD_KINDS: ReadonlySet<SalePaymentMethodOption['kind']> = new Set([
  'cash',
  'bank',
  'third_party',
  'other',
]);

/** Aligné sur `PaymentMethodDefinition.code` côté API (VARCHAR 64). */
export const SALE_PAYMENT_METHOD_OPTION_MAX_CODE_LEN = 64;
/** Aligné sur `PaymentMethodDefinition.label` côté API (VARCHAR 120). */
export const SALE_PAYMENT_METHOD_OPTION_MAX_LABEL_LEN = 120;

/**
 * Filtre la réponse API (pas de cast aveugle — évite données malformées / XSS en libellés UI).
 * Mode **lenient** : lignes invalides ignorées ; **codes dupliqués** : toute la réponse est rejetée côté
 * {@link getSalePaymentMethodOptions} si au moins un doublon apparaît après filtrage des lignes valides.
 */
export function parseSalePaymentMethodOptionsJson(json: unknown): SalePaymentMethodOption[] {
  if (!Array.isArray(json)) return [];
  const out: SalePaymentMethodOption[] = [];
  const seenCodes = new Set<string>();
  for (const row of json) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const code = typeof o.code === 'string' ? o.code.trim() : '';
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    const kindRaw = typeof o.kind === 'string' ? o.kind.trim() : '';
    if (
      !code ||
      !label ||
      code.length > SALE_PAYMENT_METHOD_OPTION_MAX_CODE_LEN ||
      label.length > SALE_PAYMENT_METHOD_OPTION_MAX_LABEL_LEN ||
      !PAYMENT_METHOD_KINDS.has(kindRaw as SalePaymentMethodOption['kind'])
    ) {
      continue;
    }
    if (seenCodes.has(code)) {
      return [];
    }
    seenCodes.add(code);
    out.push({ code, label, kind: kindRaw as SalePaymentMethodOption['kind'] });
  }
  return out;
}

export async function getSalePaymentMethodOptions(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<
  | { ok: true; data: readonly SalePaymentMethodOption[] }
  | { ok: false; detail: string; status: number }
> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sales/payment-method-options`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = auth.getAccessToken?.();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    // `include` : cookies httpOnly (OpenAPI bearerOrCookie) ; garder tant que l’auth peut reposer sur les cookies seuls.
    res = await fetch(url, { method: 'GET', credentials: 'include', headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, detail: msg, status: 0 };
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const p = parseRecycliqueApiErrorBody(json, res.status, text || res.statusText);
    return {
      ok: false,
      detail: toRecycliqueClientFailure(res.status, p, false).message,
      status: res.status,
    };
  }
  if (!Array.isArray(json)) {
    return { ok: false, detail: 'Réponse moyens de paiement invalide', status: res.status };
  }
  const parsed = parseSalePaymentMethodOptionsJson(json);
  if (parsed.length === 0 && json.length > 0) {
    return {
      ok: false,
      detail: 'Réponse moyens de paiement invalide (schéma inattendu ou codes dupliqués)',
      status: res.status,
    };
  }
  return { ok: true, data: parsed };
}

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

export type PutSaleNoteResult = { ok: true; sale: SaleResponseV1 } | SalesHttpError;

/**
 * PUT /v1/sales/{sale_id} — même contrat que le legacy `updateSaleNote` (note seule, rôles admin / super-admin côté serveur).
 */
export async function putSaleNote(
  saleId: string,
  note: string,
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<PutSaleNoteResult> {
  const base = getLiveSnapshotBasePrefix();
  const url = `${base}/v1/sales/${encodeURIComponent(saleId)}`;
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
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({ note }),
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

/** Aligné sur OpenAPI `PaymentMethod` pour `SaleReversalCreate.refund_payment_method` (hors `free`, rejeté serveur). */
export type SaleReversalRefundPaymentMethod = 'cash' | 'card' | 'check';

export type SaleReversalCreateBody = {
  source_sale_id: string;
  reason_code: 'ERREUR_SAISIE' | 'RETOUR_ARTICLE' | 'ANNULATION_CLIENT' | 'AUTRE';
  detail?: string | null;
  idempotency_key?: string | null;
  /** Story 22.5 — moyen de sortie réel (`SaleReversalCreate`, défaut serveur `cash` si absent). */
  refund_payment_method?: SaleReversalRefundPaymentMethod;
  /** Parcours expert N-1 clos + permission `accounting.prior_year_refund`. */
  expert_prior_year_refund?: boolean;
};

export type SaleReversalCreateResult = { ok: true; reversalId: string; raw: unknown } | SalesHttpError;

/** Aligné sur OpenAPI `SaleReversalResponseV1` (Story 24.3 — champs optionnels si parse partiel). */
export type SaleReversalResponseV1 = {
  readonly id: string;
  readonly source_sale_id?: string;
  readonly cash_session_id?: string;
  readonly operator_id?: string;
  readonly amount_signed?: number;
  readonly reason_code?: string;
  readonly detail?: string | null;
  readonly idempotency_key?: string | null;
  readonly created_at?: string;
  readonly refund_payment_method?: string;
  readonly source_sale_payment_method?: string | null;
  readonly fiscal_branch?: string | null;
  readonly sale_fiscal_year?: number | null;
  readonly current_open_fiscal_year?: number | null;
  readonly paheko_accounting_sync_hint?: string;
};

/**
 * Parse la réponse GET/POST reversal (garde-fous : refuse les payloads sans `id` UUID plausible).
 */
export function parseSaleReversalResponseJson(json: unknown): SaleReversalResponseV1 | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id.trim() : '';
  if (!id) return null;

  const num = (k: string): number | undefined => {
    const v = o[k];
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  };

  const strOrNull = (k: string): string | null | undefined => {
    const v = o[k];
    if (v === null) return null;
    if (typeof v === 'string') return v;
    return undefined;
  };

  const intOrNull = (k: string): number | null | undefined => {
    const v = o[k];
    if (v === null) return null;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    return undefined;
  };

  return {
    id,
    source_sale_id: typeof o.source_sale_id === 'string' ? o.source_sale_id : undefined,
    cash_session_id: typeof o.cash_session_id === 'string' ? o.cash_session_id : undefined,
    operator_id: typeof o.operator_id === 'string' ? o.operator_id : undefined,
    amount_signed: num('amount_signed'),
    reason_code: typeof o.reason_code === 'string' ? o.reason_code : undefined,
    detail: strOrNull('detail'),
    idempotency_key:
      typeof o.idempotency_key === 'string' || o.idempotency_key === null
        ? (o.idempotency_key as string | null)
        : undefined,
    created_at: typeof o.created_at === 'string' ? o.created_at : undefined,
    refund_payment_method: typeof o.refund_payment_method === 'string' ? o.refund_payment_method : undefined,
    source_sale_payment_method: strOrNull('source_sale_payment_method'),
    fiscal_branch: strOrNull('fiscal_branch'),
    sale_fiscal_year: intOrNull('sale_fiscal_year'),
    current_open_fiscal_year: intOrNull('current_open_fiscal_year'),
    paheko_accounting_sync_hint:
      typeof o.paheko_accounting_sync_hint === 'string' ? o.paheko_accounting_sync_hint : undefined,
  };
}

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
  const ik = (body.idempotency_key ?? '').trim();
  if (ik) headers['Idempotency-Key'] = ik;

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
