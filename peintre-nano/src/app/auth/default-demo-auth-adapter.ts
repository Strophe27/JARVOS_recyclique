import type { ContextEnvelopeStub } from '../../types/context-envelope';
import { createMockAuthAdapter } from './mock-auth-adapter';

/** Permissions factices cohérentes avec les fixtures démo (pas de sémantique métier parallèle). */
export const DEMO_PERMISSION_VIEW_HOME = 'demo.permission.view-home';

/** Permission slice bandeau live (manifests CREOS Epic 4) — fournie en démo locale pour la page servie. */
export const RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND = 'recyclique.exploitation.view-live-band';

export function createDefaultDemoEnvelope(overrides?: Partial<ContextEnvelopeStub>): ContextEnvelopeStub {
  const base: ContextEnvelopeStub = {
    schemaVersion: 'piste-a-stub',
    siteId: 'demo-site',
    activeRegisterId: null,
    permissions: {
      permissionKeys: [DEMO_PERMISSION_VIEW_HOME, RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND],
    },
    issuedAt: Date.now(),
    runtimeStatus: 'ok',
  };
  return { ...base, ...overrides, permissions: overrides?.permissions ?? base.permissions };
}

export function getDefaultDemoAuthAdapter() {
  return createMockAuthAdapter({
    session: { authenticated: true, userId: 'demo-user' },
    envelope: createDefaultDemoEnvelope(),
  });
}
