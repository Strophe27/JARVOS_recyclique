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

  it('applique visibility.permission_any (au moins une clé)', () => {
    const m: NavigationManifest = {
      version: '1',
      entries: [
        {
          id: 'x',
          routeKey: 'x',
          visibility: { permissionAny: ['a', 'b'] },
        },
      ],
    };
    expect(filterNavigation(m, baseEnvelope([])).entries).toEqual([]);
    expect(filterNavigation(m, baseEnvelope(['a'])).entries.map((e) => e.id)).toEqual(['x']);
    expect(filterNavigation(m, baseEnvelope(['b'])).entries.map((e) => e.id)).toEqual(['x']);
  });

  it('combine permission_any et required_permission_keys (AND)', () => {
    const m: NavigationManifest = {
      version: '1',
      entries: [
        {
          id: 'x',
          routeKey: 'x',
          visibility: { permissionAny: ['a', 'b'] },
          requiredPermissionKeys: ['c'],
        },
      ],
    };
    expect(filterNavigation(m, baseEnvelope(['a'])).entries).toEqual([]);
    expect(filterNavigation(m, baseEnvelope(['a', 'c'])).entries.map((e) => e.id)).toEqual(['x']);
  });

  it('masque une entrée si contexts_any non satisfait (marqueurs dérivés du site)', () => {
    const m: NavigationManifest = {
      version: '1',
      entries: [
        {
          id: 'need-site',
          routeKey: 'need-site',
          visibility: { contextsAny: ['site'] },
        },
      ],
    };
    const noSite = { ...baseEnvelope([]), siteId: null };
    expect(filterNavigation(m, noSite).entries).toEqual([]);
    expect(filterNavigation(m, baseEnvelope([])).entries.map((e) => e.id)).toEqual(['need-site']);
  });

  it('respecte contextMarkers explicites du backend', () => {
    const m: NavigationManifest = {
      version: '1',
      entries: [
        {
          id: 'custom',
          routeKey: 'custom',
          visibility: { contextsAny: ['session-caissier'] },
        },
      ],
    };
    const env = { ...baseEnvelope([]), contextMarkers: ['session-caissier'] as const };
    expect(filterNavigation(m, env).entries.map((e) => e.id)).toEqual(['custom']);
  });
});
