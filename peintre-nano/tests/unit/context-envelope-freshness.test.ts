import { describe, expect, it } from 'vitest';
import type { ContextEnvelopeStub } from '../../src/types/context-envelope';
import {
  CONTEXT_STALE_API_CODE,
  MAX_CONTEXT_AGE_MS,
  isEnvelopeStale,
} from '../../src/runtime/context-envelope-freshness';

function stub(issuedAt: number, maxAgeMs?: number): ContextEnvelopeStub {
  return {
    schemaVersion: 't',
    siteId: null,
    activeRegisterId: null,
    permissions: { permissionKeys: [] },
    issuedAt,
    runtimeStatus: 'ok',
    ...(maxAgeMs !== undefined ? { maxAgeMs } : {}),
  };
}

describe('CONTEXT_STALE_API_CODE', () => {
  it('reste stable pour corrélation OpenAPI / AR21', () => {
    expect(CONTEXT_STALE_API_CODE).toBe('CONTEXT_STALE');
  });
});

describe('isEnvelopeStale', () => {
  it('retourne false dans la fenêtre de fraîcheur', () => {
    const t = 10_000;
    expect(isEnvelopeStale(stub(t), t + MAX_CONTEXT_AGE_MS - 1)).toBe(false);
  });

  it('retourne true au-delà du seuil (ou maxAgeMs custom)', () => {
    const t = 10_000;
    expect(isEnvelopeStale(stub(t), t + MAX_CONTEXT_AGE_MS + 1)).toBe(true);
    expect(isEnvelopeStale(stub(t, 100), t + 150)).toBe(true);
  });

  it('traite issuedAt invalide ou non fini comme périmé (pas de comparaison silencieuse)', () => {
    expect(isEnvelopeStale(stub(Number.NaN))).toBe(true);
    expect(isEnvelopeStale(stub(Number.POSITIVE_INFINITY))).toBe(true);
    const corrupted: ContextEnvelopeStub = { ...stub(0), issuedAt: 'bad' as unknown as number };
    expect(isEnvelopeStale(corrupted)).toBe(true);
  });
});
