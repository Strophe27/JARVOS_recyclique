import { describe, expect, it } from 'vitest';
import { resolveContextMarkersFromEnvelope } from '../../src/runtime/resolve-context-markers';
import type { ContextEnvelopeStub } from '../../src/types/context-envelope';

const base = (overrides: Partial<ContextEnvelopeStub> = {}): ContextEnvelopeStub => ({
  schemaVersion: 'test',
  siteId: 's1',
  activeRegisterId: null,
  permissions: { permissionKeys: [] },
  issuedAt: Date.now(),
  runtimeStatus: 'ok',
  ...overrides,
});

describe('resolveContextMarkersFromEnvelope', () => {
  it('priorise contextMarkers backend lorsqu’ils sont fournis', () => {
    const markers = resolveContextMarkersFromEnvelope(
      base({ contextMarkers: ['foo', 'bar'], siteId: null }),
    );
    expect([...markers].sort()).toEqual(['bar', 'foo']);
  });

  it('dérive site / poste / register depuis les ids', () => {
    expect(resolveContextMarkersFromEnvelope(base({ siteId: 'x' }))).toEqual(new Set(['site']));
    expect(
      resolveContextMarkersFromEnvelope(
        base({ siteId: null, workstationId: 'w1', activeRegisterId: 'r1' }),
      ),
    ).toEqual(new Set(['poste', 'register']));
  });
});
