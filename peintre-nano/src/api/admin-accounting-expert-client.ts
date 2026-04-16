import type { AuthContextPort } from '../app/auth/auth-context-port';
import { parseRecycliqueApiErrorBody } from './recyclique-api-error';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';

/** Aligné backend `STEP_UP_PIN_HEADER` / OpenAPI `X-Step-Up-Pin`. */
export const ACCOUNTING_EXPERT_STEP_UP_HEADER = 'X-Step-Up-Pin';

export type AccountingExpertLatestRevision = {
  readonly id: string;
  readonly revision_seq: number;
  readonly published_at: string;
};

export type AccountingExpertPaymentMethodKind = 'cash' | 'bank' | 'third_party' | 'other';

export type AccountingExpertPaymentMethod = {
  readonly id: string;
  readonly code: string;
  readonly label: string;
  readonly kind: AccountingExpertPaymentMethodKind;
  readonly paheko_debit_account: string;
  readonly paheko_refund_credit_account: string;
  readonly min_amount: number | null;
  readonly max_amount: number | null;
  readonly display_order: number;
  readonly notes: string | null;
  readonly active: boolean;
  readonly archived_at: string | null;
};

export type AccountingExpertPaymentMethodCreate = {
  readonly code: string;
  readonly label: string;
  readonly kind: AccountingExpertPaymentMethodKind;
  readonly paheko_debit_account: string;
  readonly paheko_refund_credit_account: string;
  readonly min_amount?: number | null;
  readonly max_amount?: number | null;
  readonly display_order: number;
  readonly notes?: string | null;
  readonly active: boolean;
};

export type AccountingExpertPaymentMethodPatch = {
  readonly label?: string;
  readonly kind?: AccountingExpertPaymentMethodKind;
  readonly paheko_debit_account?: string;
  readonly paheko_refund_credit_account?: string;
  readonly min_amount?: number | null;
  readonly max_amount?: number | null;
  readonly display_order?: number;
  readonly notes?: string | null;
};

export type AccountingExpertRevisionDetail = {
  readonly id: string;
  readonly revision_seq: number;
  readonly published_at: string;
  readonly actor_user_id?: string | null;
  readonly note?: string | null;
  readonly snapshot: Record<string, unknown>;
};

/** OpenAPI `AccountingExpertGlobalAccounts` — champs PRD absents tant que le backend ne les expose pas (story 23-3). */
export type GlobalAccountsResponse = {
  readonly default_sales_account: string;
  readonly default_donation_account: string;
  readonly prior_year_refund_account: string;
  readonly updated_at: string;
};

/** OpenAPI `AccountingExpertGlobalAccountsPatch`. */
export type GlobalAccountsPatchPayload = {
  readonly default_sales_account: string;
  readonly default_donation_account: string;
  readonly prior_year_refund_account: string;
};

function isGlobalAccountsResponse(x: unknown): x is GlobalAccountsResponse {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.default_sales_account === 'string' &&
    typeof o.default_donation_account === 'string' &&
    typeof o.prior_year_refund_account === 'string' &&
    typeof o.updated_at === 'string'
  );
}

function humanizeNonJsonErrorBody(text: string, status: number): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('<') || trimmed.length > 800) {
    return `Réponse serveur illisible (HTTP ${status}). Réessayez ou contactez le support si le problème persiste.`;
  }
  return trimmed || `Erreur HTTP ${status}`;
}

async function readFailureDetail(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json: unknown = JSON.parse(text);
    return parseRecycliqueApiErrorBody(json, res.status, res.statusText).detail;
  } catch {
    return humanizeNonJsonErrorBody(text, res.status);
  }
}

function authHeaders(auth: Pick<AuthContextPort, 'getAccessToken'>, extra?: Record<string, string>): HeadersInit {
  const token = auth.getAccessToken?.();
  const headers: Record<string, string> = { Accept: 'application/json', ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function getAccountingExpertLatestRevision(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<
  | { ok: true; data: AccountingExpertLatestRevision }
  | { ok: false; detail: string }
> {
  const token = auth.getAccessToken?.();
  const url = `${getLiveSnapshotBasePrefix()}/v1/admin/accounting-expert/revisions/latest`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, credentials: 'include' });
  if (res.status === 404) {
    return { ok: false, detail: 'Aucune révision comptable publiée.' };
  }
  if (!res.ok) {
    const detail = await readFailureDetail(res);
    return { ok: false, detail };
  }
  const data = (await res.json()) as AccountingExpertLatestRevision;
  return { ok: true, data };
}

export async function getAccountingExpertLatestRevisionDetail(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<
  | { ok: true; data: AccountingExpertRevisionDetail }
  | { ok: false; detail: string; notFound?: boolean }
> {
  const url = `${getLiveSnapshotBasePrefix()}/v1/admin/accounting-expert/revisions/latest`;
  const res = await fetch(url, { headers: authHeaders(auth), credentials: 'include' });
  if (res.status === 404) {
    return { ok: false, detail: 'Aucune révision comptable publiée.', notFound: true };
  }
  if (!res.ok) {
    return { ok: false, detail: await readFailureDetail(res) };
  }
  const data = (await res.json()) as AccountingExpertRevisionDetail;
  return { ok: true, data };
}

export async function listAccountingExpertPaymentMethods(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<{ ok: true; data: readonly AccountingExpertPaymentMethod[] } | { ok: false; detail: string }> {
  const url = `${getLiveSnapshotBasePrefix()}/v1/admin/accounting-expert/payment-methods`;
  const res = await fetch(url, { headers: authHeaders(auth), credentials: 'include' });
  if (!res.ok) {
    return { ok: false, detail: await readFailureDetail(res) };
  }
  const data = (await res.json()) as AccountingExpertPaymentMethod[];
  return { ok: true, data };
}

export async function createAccountingExpertPaymentMethod(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  body: AccountingExpertPaymentMethodCreate,
  args: { readonly stepUpPin: string },
): Promise<{ ok: true; data: AccountingExpertPaymentMethod } | { ok: false; detail: string }> {
  const pin = args.stepUpPin.trim();
  if (!pin) {
    return { ok: false, detail: 'Saisissez le PIN step-up pour confirmer la création.' };
  }
  const url = `${getLiveSnapshotBasePrefix()}/v1/admin/accounting-expert/payment-methods`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(auth, {
      'Content-Type': 'application/json',
      [ACCOUNTING_EXPERT_STEP_UP_HEADER]: pin,
    }),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { ok: false, detail: await readFailureDetail(res) };
  }
  const data = (await res.json()) as AccountingExpertPaymentMethod;
  return { ok: true, data };
}

export async function patchAccountingExpertPaymentMethod(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  paymentMethodId: string,
  body: AccountingExpertPaymentMethodPatch,
  args: { readonly stepUpPin: string },
): Promise<{ ok: true; data: AccountingExpertPaymentMethod } | { ok: false; detail: string }> {
  const pin = args.stepUpPin.trim();
  if (!pin) {
    return { ok: false, detail: 'Saisissez le PIN step-up pour enregistrer les modifications.' };
  }
  const url = `${getLiveSnapshotBasePrefix()}/v1/admin/accounting-expert/payment-methods/${encodeURIComponent(
    paymentMethodId,
  )}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(auth, {
      'Content-Type': 'application/json',
      [ACCOUNTING_EXPERT_STEP_UP_HEADER]: pin,
    }),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { ok: false, detail: await readFailureDetail(res) };
  }
  const data = (await res.json()) as AccountingExpertPaymentMethod;
  return { ok: true, data };
}

export async function setAccountingExpertPaymentMethodActive(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  paymentMethodId: string,
  active: boolean,
  args: { readonly stepUpPin: string },
): Promise<{ ok: true; data: AccountingExpertPaymentMethod } | { ok: false; detail: string }> {
  const pin = args.stepUpPin.trim();
  if (!pin) {
    return { ok: false, detail: 'Saisissez le PIN step-up pour confirmer la modification.' };
  }
  const q = new URLSearchParams({ active: String(active) });
  const url = `${getLiveSnapshotBasePrefix()}/v1/admin/accounting-expert/payment-methods/${encodeURIComponent(
    paymentMethodId,
  )}/active?${q.toString()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(auth, { [ACCOUNTING_EXPERT_STEP_UP_HEADER]: pin }),
    credentials: 'include',
  });
  if (!res.ok) {
    return { ok: false, detail: await readFailureDetail(res) };
  }
  const data = (await res.json()) as AccountingExpertPaymentMethod;
  return { ok: true, data };
}

export async function publishAccountingExpertRevision(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  args: { readonly stepUpPin: string; readonly note?: string | null },
): Promise<{ ok: true; data: AccountingExpertRevisionDetail } | { ok: false; detail: string }> {
  const pin = args.stepUpPin.trim();
  if (!pin) {
    return { ok: false, detail: 'Saisissez le PIN step-up pour publier la révision.' };
  }
  const url = `${getLiveSnapshotBasePrefix()}/v1/admin/accounting-expert/revisions/publish`;
  const body: { note?: string | null } = {};
  if (args.note !== undefined) body.note = args.note;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(auth, {
      'Content-Type': 'application/json',
      [ACCOUNTING_EXPERT_STEP_UP_HEADER]: pin,
    }),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { ok: false, detail: await readFailureDetail(res) };
  }
  const data = (await res.json()) as AccountingExpertRevisionDetail;
  return { ok: true, data };
}

/**
 * `GET /v1/admin/accounting-expert/global-accounts` — super-admin (pas de step-up sur la route).
 */
export async function getGlobalAccounts(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  opts?: { readonly signal?: AbortSignal },
): Promise<{ ok: true; data: GlobalAccountsResponse } | { ok: false; detail: string }> {
  const url = `${getLiveSnapshotBasePrefix()}/v1/admin/accounting-expert/global-accounts`;
  const res = await fetch(url, { headers: authHeaders(auth), credentials: 'include', signal: opts?.signal });
  if (!res.ok) {
    return { ok: false, detail: await readFailureDetail(res) };
  }
  const raw = (await res.json()) as unknown;
  if (!isGlobalAccountsResponse(raw)) {
    return { ok: false, detail: 'Réponse serveur inattendue pour les comptes globaux.' };
  }
  return { ok: true, data: raw };
}

/**
 * `PATCH /v1/admin/accounting-expert/global-accounts` — `X-Step-Up-Pin` obligatoire.
 */
export async function patchGlobalAccounts(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
  payload: GlobalAccountsPatchPayload,
  args: { readonly stepUpPin: string; readonly signal?: AbortSignal },
): Promise<{ ok: true; data: GlobalAccountsResponse } | { ok: false; detail: string }> {
  const pin = args.stepUpPin.trim();
  if (!pin) {
    return { ok: false, detail: 'Saisissez le PIN step-up pour enregistrer les comptes globaux.' };
  }
  const url = `${getLiveSnapshotBasePrefix()}/v1/admin/accounting-expert/global-accounts`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(auth, {
      'Content-Type': 'application/json',
      [ACCOUNTING_EXPERT_STEP_UP_HEADER]: pin,
    }),
    credentials: 'include',
    body: JSON.stringify(payload),
    signal: args.signal,
  });
  if (!res.ok) {
    return { ok: false, detail: await readFailureDetail(res) };
  }
  const raw = (await res.json()) as unknown;
  if (!isGlobalAccountsResponse(raw)) {
    return { ok: false, detail: 'Réponse serveur inattendue après enregistrement des comptes globaux.' };
  }
  return { ok: true, data: raw };
}
