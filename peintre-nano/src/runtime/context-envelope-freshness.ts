import type { ContextEnvelopeStub } from '../types/context-envelope';

/**
 * Convention Piste A : au-delà de ce délai, l'enveloppe est traitée comme périmée côté UI
 * (pas de supposition silencieuse d'un contexte métier valide). Configurable dans les tests via `envelope.maxAgeMs`.
 */
export const MAX_CONTEXT_AGE_MS = 5 * 60 * 1000;

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
