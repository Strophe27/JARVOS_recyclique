import { describe, expect, it } from 'vitest';
import { filterNavigation } from '../../src/runtime/filter-navigation-for-context';
import type { NavigationManifest } from '../../src/types/navigation-manifest';
import type { ContextEnvelopeStub } from '../../src/types/context-envelope';

const baseEnvelope = (keys: string[]): ContextEnvelopeStub => ({
  schemaVersion: 'test',
  siteId: 's1',
  activeRegisterId: null,
  permissions: { permissionKeys: keys },
  issuedAt: Date.now(),
  runtimeStatus: 'ok',
});

const manifest: NavigationManifest = {
  version: '1',
  entries: [
    { id: 'a', routeKey: 'a', requiredPermissionKeys: ['p1'] },
    { id: 'b', routeKey: 'b', requiredPermissionKeys: ['p2'] },
    { id: 'c', routeKey: 'c' },
    {
      id: 'parent',
      routeKey: 'parent',
      children: [
        { id: 'child-ok', routeKey: 'c1', requiredPermissionKeys: ['p1'] },
        { id: 'child-bad', routeKey: 'c2', requiredPermissionKeys: ['missing'] },
      ],
    },
  ],
};

describe('filterNavigation', () => {
  it('masque les entrées dont les clés requises manquent dans l’enveloppe', () => {
    const out = filterNavigation(manifest, baseEnvelope(['p1']));
    const ids = out.entries.map((e) => e.id);
    expect(ids).toContain('a');
    expect(ids).toContain('c');
    expect(ids).not.toContain('b');
  });

  it('filtre récursivement les enfants et ne garde que les branches autorisées', () => {
    const out = filterNavigation(manifest, baseEnvelope(['p1']));
    const parent = out.entries.find((e) => e.id === 'parent');
    expect(parent).toBeDefined();
    expect(parent?.children?.map((c) => c.id)).toEqual(['child-ok']);
  });

  it('préserve la version du manifest', () => {
    const out = filterNavigation(manifest, baseEnvelope(['p1', 'p2']));
    expect(out.version).toBe('1');
    expect(out.entries.map((e) => e.id)).toEqual(['a', 'b', 'c', 'parent']);
  });

  it('ne retourne aucune entrée si le contexte est dégradé', () => {
    const out = filterNavigation(manifest, { ...baseEnvelope(['p1', 'p2']), runtimeStatus: 'degraded' });
    expect(out.entries).toEqual([]);
    expect(out.version).toBe('1');
  });

  it('ne retourne aucune entrée si le contexte est interdit', () => {
    const out = filterNavigation(manifest, { ...baseEnvelope(['p1', 'p2']), runtimeStatus: 'forbidden' });
    expect(out.entries).toEqual([]);
  });

  it('ne retourne aucune entrée si l’enveloppe est périmée', () => {
    const issuedAt = 1_000;
    const env = { ...baseEnvelope(['p1', 'p2']), issuedAt, maxAgeMs: 60_000 };
    const out = filterNavigation(manifest, env, { nowMs: issuedAt + 120_000 });
    expect(out.entries).toEqual([]);
  });
});
