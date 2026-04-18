import type { ContextEnvelopeRuntimeStatus, ContextEnvelopeStub } from '../types/context-envelope';

function mapRuntimeState(raw: unknown): ContextEnvelopeRuntimeStatus | null {
  if (raw === 'ok' || raw === 'degraded' || raw === 'forbidden') return raw;
  return null;
}

/**
 * Mappe la réponse OpenAPI `ContextEnvelope` (`GET /v1/users/me/context`) vers {@link ContextEnvelopeStub}.
 * Retourne `null` si la charge est invalide (client défensif).
 */
export function contextEnvelopeStubFromApi(body: unknown): ContextEnvelopeStub | null {
  if (body === null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;

  const runtimeStatus = mapRuntimeState(o.runtime_state);
  if (!runtimeStatus) return null;

  const permissionKeysRaw = o.permission_keys;
  if (!Array.isArray(permissionKeysRaw) || !permissionKeysRaw.every((k) => typeof k === 'string')) {
    return null;
  }
  const permissionKeys = permissionKeysRaw as string[];

  const computedAt = o.computed_at;
  if (typeof computedAt !== 'string') return null;
  const issuedAt = Date.parse(computedAt);
  if (!Number.isFinite(issuedAt)) return null;

  let siteId: string | null = null;
  let activeRegisterId: string | null = null;
  let cashSessionId: string | null | undefined;
  let workstationId: string | null | undefined;

  const ctx = o.context;
  if (ctx !== null && ctx !== undefined) {
    if (typeof ctx !== 'object') return null;
    const c = ctx as Record<string, unknown>;
    if (typeof c.site_id === 'string') siteId = c.site_id;
    if (typeof c.cash_register_id === 'string') activeRegisterId = c.cash_register_id;
    if (c.cash_session_id === null || typeof c.cash_session_id === 'string') {
      cashSessionId = c.cash_session_id as string | null;
    }
    if (c.reception_post_id === null || typeof c.reception_post_id === 'string') {
      workstationId = c.reception_post_id as string | null;
    }
  }

  let presentationLabels: Readonly<Record<string, string>> | undefined;
  const pl = o.presentation_labels;
  if (pl !== null && pl !== undefined) {
    if (typeof pl !== 'object') return null;
    const entries: Record<string, string> = {};
    for (const [k, v] of Object.entries(pl as Record<string, unknown>)) {
      if (typeof v === 'string') entries[k] = v;
    }
    presentationLabels = entries;
  }

  let restrictionMessage: string | null | undefined;
  const rm = o.restriction_message;
  if (rm === null) restrictionMessage = null;
  else if (typeof rm === 'string') restrictionMessage = rm;

  return {
    schemaVersion: 'recyclique-context-envelope-v2',
    siteId,
    activeRegisterId,
    cashSessionId,
    workstationId,
    permissions: { permissionKeys },
    issuedAt,
    runtimeStatus,
    presentationLabels,
    restrictionMessage,
  };
}
