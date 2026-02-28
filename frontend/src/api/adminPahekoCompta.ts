/**
 * Story 8.6 — GET /v1/admin/paheko-compta-url (URL admin Paheko pour compta).
 */

const getBase = (): string =>
  (import.meta.env?.VITE_API_BASE_URL as string) ?? '';

function getAuthHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export interface PahekoComptaUrlResponse {
  url: string;
}

export interface PahekoAccessDecisionResponse {
  allowed: boolean;
  reason: string;
  exception_id?: string | null;
}

export interface PahekoAccessExceptionGrantPayload {
  user_id: string;
  requested_by_user_id: string;
  reason: string;
  expires_at: string;
}

export interface PahekoAccessExceptionRevokePayload {
  revocation_reason: string;
}

export interface PahekoAccessExceptionResponse {
  id: string;
  user_id: string;
  requested_by_user_id: string | null;
  approved_by_user_id: string | null;
  reason: string;
  expires_at: string;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  revocation_reason: string | null;
  created_at: string;
}

async function parseError(res: Response): Promise<Error> {
  const data = await res.json().catch(() => ({}));
  const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
  return new Error(msg);
}

/** GET /v1/admin/paheko-compta-url — URL pour ouvrir l'admin compta Paheko. 404 si non configuré. */
export async function getPahekoComptaUrl(
  accessToken: string
): Promise<PahekoComptaUrlResponse> {
  const res = await fetch(`${getBase()}/v1/admin/paheko-compta-url`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  return res.json() as Promise<PahekoComptaUrlResponse>;
}

/** GET /v1/admin/paheko-access — décision serveur autoritative d'accès Paheko. */
export async function getPahekoAccessDecision(
  accessToken: string
): Promise<PahekoAccessDecisionResponse> {
  const res = await fetch(`${getBase()}/v1/admin/paheko-access`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  return res.json() as Promise<PahekoAccessDecisionResponse>;
}

/** POST /v1/admin/paheko-access/exceptions — octroie une exception benevole. */
export async function grantPahekoAccessException(
  accessToken: string,
  payload: PahekoAccessExceptionGrantPayload
): Promise<PahekoAccessExceptionResponse> {
  const res = await fetch(`${getBase()}/v1/admin/paheko-access/exceptions`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  return res.json() as Promise<PahekoAccessExceptionResponse>;
}

/** POST /v1/admin/paheko-access/exceptions/{id}/revoke — révocation explicite. */
export async function revokePahekoAccessException(
  accessToken: string,
  exceptionId: string,
  payload: PahekoAccessExceptionRevokePayload
): Promise<PahekoAccessExceptionResponse> {
  const res = await fetch(`${getBase()}/v1/admin/paheko-access/exceptions/${exceptionId}/revoke`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  return res.json() as Promise<PahekoAccessExceptionResponse>;
}
