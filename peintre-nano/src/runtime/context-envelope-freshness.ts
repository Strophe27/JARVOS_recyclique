import type { ContextEnvelopeStub } from '../types/context-envelope';

/** Code API stable — refus après bascule site/session (Story 25.8). */
export const CONTEXT_STALE_API_CODE = 'CONTEXT_STALE' as const;

/**
 * Filet de sécurité si aucun rafraîchissement réseau n’a réussi (hors ligne, erreur prolongée).
 * En session live, l’enveloppe est réactualisée en arrière-plan (voir `LiveAuthShell`) avant d’atteindre ce seuil.
 * Configurable dans les tests via `envelope.maxAgeMs`.
 */
export const MAX_CONTEXT_AGE_MS = 2 * 60 * 60 * 1000;

/** Intervalle de rafraîchissement silencieux GET `/v1/users/me/context` en session live (sous le seuil de stale). */
export const CONTEXT_ENVELOPE_SILENT_REFRESH_INTERVAL_MS = 4 * 60 * 1000;

/** Après rafraîchissement automatique ou manuel, si l’action reste bloquée (hors ligne, 401, horloge). */
export const CONTEXT_ENVELOPE_ACTION_BLOCKED_MESSAGE =
  'Le contexte caisse n’a pas pu être actualisé. Vérifiez la connexion ou reconnectez-vous.';

export function envelopeMaxAgeMs(envelope: ContextEnvelopeStub): number {
  return envelope.maxAgeMs ?? MAX_CONTEXT_AGE_MS;
}

export function isEnvelopeStale(envelope: ContextEnvelopeStub, nowMs = Date.now()): boolean {
  const issued = envelope.issuedAt;
  if (typeof issued !== 'number' || !Number.isFinite(issued)) {
    return true;
  }
  const age = nowMs - issued;
  if (!Number.isFinite(age)) {
    return true;
  }
  return age > envelopeMaxAgeMs(envelope);
}
