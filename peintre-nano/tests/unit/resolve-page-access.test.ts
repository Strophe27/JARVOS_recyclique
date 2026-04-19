import { describe, expect, it } from 'vitest';
import { resolvePageAccess } from '../../src/runtime/resolve-page-access';
import type { PageManifest } from '../../src/types/page-manifest';
import type { ContextEnvelopeStub } from '../../src/types/context-envelope';

const page: PageManifest = {
  version: '1',
  pageKey: 'demo-home',
  slots: [],
  requiredPermissionKeys: ['demo.permission.view-home'],
  requiresSite: true,
};

function env(overrides: Partial<ContextEnvelopeStub> = {}): ContextEnvelopeStub {
  const base: ContextEnvelopeStub = {
    schemaVersion: 't',
    siteId: 'site-1',
    activeRegisterId: null,
    permissions: { permissionKeys: ['demo.permission.view-home'] },
    issuedAt: 1_700_000_000_000,
    runtimeStatus: 'ok',
  };
  return { ...base, ...overrides, permissions: overrides.permissions ?? base.permissions };
}

describe('resolvePageAccess', () => {
  it('autorise lorsque statut ok, enveloppe fraîche, site et permissions', () => {
    const r = resolvePageAccess(page, env(), { nowMs: 1_700_000_000_000 + 1000 });
    expect(r).toEqual({ allowed: true });
  });

  it('refuse si runtimeStatus forbidden', () => {
    const r = resolvePageAccess(page, env({ runtimeStatus: 'forbidden' }), { nowMs: 1_700_000_000_000 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('FORBIDDEN');
  });

  it('refuse si contexte dégradé', () => {
    const r = resolvePageAccess(page, env({ runtimeStatus: 'degraded' }), { nowMs: 1_700_000_000_000 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('DEGRADED_CONTEXT');
  });

  it('refuse si enveloppe périmée (MAX_CONTEXT_AGE_MS / maxAgeMs)', () => {
    const r = resolvePageAccess(page, env({ issuedAt: 0, maxAgeMs: 60_000 }), { nowMs: 120_000 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('STALE_CONTEXT');
  });

  it('refuse si site requis mais siteId absent', () => {
    const r = resolvePageAccess(page, env({ siteId: null }), { nowMs: 1_700_000_000_000 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('MISSING_SITE');
  });

  it('refuse si permission page manquante', () => {
    const r = resolvePageAccess(page, env({ permissions: { permissionKeys: [] } }), { nowMs: 1_700_000_000_000 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('MISSING_PERMISSIONS');
  });

  it('autorise le hub opérations spéciales (24.2) avec accès caisse virtuel seul', () => {
    const hubPage: PageManifest = {
      version: '1',
      pageKey: 'cashflow-special-ops-hub',
      slots: [],
      requiredPermissionAnyKeys: ['caisse.access', 'caisse.virtual.access', 'caisse.deferred.access'],
      requiresSite: true,
    };
    const r = resolvePageAccess(hubPage, env({ permissions: { permissionKeys: ['caisse.virtual.access'] } }), {
      nowMs: 1_700_000_000_000,
    });
    expect(r).toEqual({ allowed: true });
  });

  it('autorise si une permission alternative satisfaite requiredPermissionAnyKeys', () => {
    const altPage: PageManifest = {
      version: '1',
      pageKey: 'cashflow-nominal',
      slots: [],
      requiredPermissionAnyKeys: ['caisse.access', 'caisse.virtual.access', 'caisse.deferred.access'],
      requiresSite: true,
    };
    const r = resolvePageAccess(altPage, env({ permissions: { permissionKeys: ['caisse.virtual.access'] } }), {
      nowMs: 1_700_000_000_000,
    });
    expect(r).toEqual({ allowed: true });
  });
});
