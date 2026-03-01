/**
 * Client API caisse — Story 3.4, 3.5, 5.1.
 * GET /v1/cash-registers, GET /v1/cash-registers/status, GET /v1/cash-sessions/*.
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

export interface CashRegisterStatusItem {
  register_id: string;
  status: 'free' | 'started';
  started_at: string | null;
  started_by_user_id: string | null;
}

export interface CashRegisterItem {
  id: string;
  site_id: string;
  name: string;
  location: string | null;
  is_active: boolean;
  enable_virtual: boolean;
  enable_deferred: boolean;
  started_at: string | null;
  started_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /v1/cash-registers — liste des postes (optionnel site_id, is_active).
 */
export async function getCashRegisters(
  accessToken: string,
  params?: { site_id?: string; is_active?: boolean }
): Promise<CashRegisterItem[]> {
  const url = buildUrl('/v1/cash-registers');
  if (params?.site_id) url.searchParams.set('site_id', params.site_id);
  if (params?.is_active !== undefined) url.searchParams.set('is_active', String(params.is_active));
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CashRegisterItem[]>;
}

/**
 * GET /v1/cash-registers/status — statut global (libre/démarré) par poste.
 * Story 3.4 ; utilisé en 3.5 pour savoir si un poste est « démarré ».
 */
export async function getCashRegistersStatus(
  accessToken: string,
  siteId?: string
): Promise<CashRegisterStatusItem[]> {
  const url = buildUrl('/v1/cash-registers/status');
  if (siteId) url.searchParams.set('site_id', siteId);
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CashRegisterStatusItem[]>;
}

// ——— Cash sessions (Story 5.1) ———

export interface CashSessionStatusItem {
  register_id: string;
  has_open_session: boolean;
  session_id: string | null;
  opened_at: string | null;
}

export interface CashSessionItem {
  id: string;
  operator_id: string;
  register_id: string;
  site_id: string;
  initial_amount: number;
  current_amount: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
  current_step: string;
  closing_amount: number | null;
  actual_amount: number | null;
  variance: number | null;
  variance_comment: string | null;
  session_type: string;
  total_sales: number | null;  // centimes, somme ventes (Story 5.3)
  total_items: number | null;  // nombre de lignes (Story 5.3)
  created_at: string;
  updated_at: string;
}

export interface CashSessionDeferredCheck {
  date: string;
  has_session: boolean;
  session_id: string | null;
}

export async function getCashSessionStatus(
  accessToken: string,
  registerId: string
): Promise<CashSessionStatusItem> {
  const url = `${getBase()}/v1/cash-sessions/status/${registerId}`;
  const res = await fetch(url, { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CashSessionStatusItem>;
}

export async function getCurrentCashSession(
  accessToken: string
): Promise<CashSessionItem | null> {
  const url = `${getBase()}/v1/cash-sessions/current`;
  const res = await fetch(url, { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  const data = await res.json();
  return data as CashSessionItem | null;
}

export interface CashSessionsListParams {
  site_id?: string;
  register_id?: string;
  operator_id?: string;
  status?: string;
  opened_at_from?: string;
  opened_at_to?: string;
  limit?: number;
  offset?: number;
}

export async function getCashSessionsList(
  accessToken: string,
  params?: CashSessionsListParams
): Promise<CashSessionItem[]> {
  const url = buildUrl('/v1/cash-sessions');
  if (params?.site_id) url.searchParams.set('site_id', params.site_id);
  if (params?.register_id) url.searchParams.set('register_id', params.register_id);
  if (params?.operator_id) url.searchParams.set('operator_id', params.operator_id);
  if (params?.status) url.searchParams.set('status', params.status);
  if (params?.opened_at_from) url.searchParams.set('opened_at_from', params.opened_at_from);
  if (params?.opened_at_to) url.searchParams.set('opened_at_to', params.opened_at_to);
  if (params?.limit != null) url.searchParams.set('limit', String(params.limit));
  if (params?.offset != null) url.searchParams.set('offset', String(params.offset));
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CashSessionItem[]>;
}

export async function getCashSession(
  accessToken: string,
  sessionId: string
): Promise<CashSessionItem> {
  const url = `${getBase()}/v1/cash-sessions/${sessionId}`;
  const res = await fetch(url, { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CashSessionItem>;
}

export async function getCashSessionDeferredCheck(
  accessToken: string,
  date: string
): Promise<CashSessionDeferredCheck> {
  const url = buildUrl('/v1/cash-sessions/deferred/check');
  url.searchParams.set('date', date);
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CashSessionDeferredCheck>;
}

export async function openCashSession(
  accessToken: string,
  body: {
    initial_amount: number;
    register_id: string;
    opened_at?: string;
    session_type?: string;
  }
): Promise<CashSessionItem> {
  const url = `${getBase()}/v1/cash-sessions`;
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
  return res.json() as Promise<CashSessionItem>;
}

export async function closeCashSession(
  accessToken: string,
  sessionId: string,
  body: {
    closing_amount?: number;
    actual_amount?: number;
    variance_comment?: string;
  }
): Promise<CashSessionItem> {
  const url = `${getBase()}/v1/cash-sessions/${sessionId}/close`;
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
  return res.json() as Promise<CashSessionItem>;
}

export async function updateCashSessionStep(
  accessToken: string,
  sessionId: string,
  step: 'entry' | 'sale' | 'exit'
): Promise<CashSessionItem> {
  const url = `${getBase()}/v1/cash-sessions/${sessionId}/step`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ step }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CashSessionItem>;
}

// ——— Presets (Story 5.2 — écran saisie vente) ———

export interface PresetItem {
  id: string;
  name: string;
  category_id: string | null;
  preset_price: number;
  button_type: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getPresetsActive(accessToken: string): Promise<PresetItem[]> {
  const url = `${getBase()}/v1/presets/active`;
  const res = await fetch(url, { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<PresetItem[]>;
}

// ——— Categories sale-tickets (Story 5.2) ———

export interface CategoryItem {
  id: string;
  name: string;
  parent_id: string | null;
  official_name: string | null;
  is_visible_sale: boolean;
  is_visible_reception: boolean;
  display_order: number;
  display_order_entry: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCategoriesSaleTickets(
  accessToken: string
): Promise<CategoryItem[]> {
  const url = `${getBase()}/v1/categories/sale-tickets`;
  const res = await fetch(url, { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CategoryItem[]>;
}

// ——— Sales (Story 5.2) ———

export interface SaleItemPayload {
  category_id?: string | null;
  preset_id?: string | null;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  weight?: number | null;
}

export interface PaymentPayload {
  payment_method: string;
  amount: number;
}

export interface SaleCreatePayload {
  cash_session_id: string;
  items: SaleItemPayload[];
  payments: PaymentPayload[];
  note?: string | null;
  sale_date?: string | null;
  /** Story 5.4 : idempotence (tickets crees hors ligne). */
  offline_id?: string | null;
}

export interface SaleResponseItem {
  id: string;
  cash_session_id: string;
  operator_id: string;
  total_amount: number;
  note: string | null;
  sale_date: string | null;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: string;
    sale_id: string;
    category_id: string | null;
    preset_id: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    weight: number | null;
    created_at: string;
    updated_at: string;
  }>;
  payment_transactions: Array<{
    id: string;
    sale_id: string;
    payment_method: string;
    amount: number;
    created_at: string;
  }>;
}

export async function postSale(
  accessToken: string,
  body: SaleCreatePayload
): Promise<SaleResponseItem> {
  const url = `${getBase()}/v1/sales`;
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
  return res.json() as Promise<SaleResponseItem>;
}
