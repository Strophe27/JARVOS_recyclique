import type { ContextEnvelopeStub } from '../../types/context-envelope';
import { createMockAuthAdapter } from './mock-auth-adapter';

/** Permissions factices cohérentes avec les fixtures démo (pas de sémantique métier parallèle). */
export const DEMO_PERMISSION_VIEW_HOME = 'demo.permission.view-home';

/** Permission slice bandeau live (manifests CREOS Epic 4) — fournie en démo locale pour la page servie. */
export const RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND = 'recyclique.exploitation.view-live-band';

/** Placeholders navigation transverse (stories 5.2 / 5.4) — clés déclarées côté contrat, émises par l’enveloppe démo. */
export const TRANSVERSE_PERMISSION_DASHBOARD_VIEW = 'transverse.dashboard.view';
export const TRANSVERSE_PERMISSION_ADMIN_VIEW = 'transverse.admin.view';

/** Hubs listings / consultation (story 5.3) — clés sur les PageManifest + visibility nav CREOS. */
export const TRANSVERSE_PERMISSION_LISTINGS_HUB_VIEW = 'transverse.listings.hub.view';
export const TRANSVERSE_PERMISSION_CONSULTATION_HUB_VIEW = 'transverse.consultation.hub.view';

/** `label_key` CREOS pour le dashboard transverse (story 5.5 — préfixe `nav.transverse.*`). */
export const NAV_LABEL_KEY_TRANSVERSE_DASHBOARD = 'nav.transverse.dashboard';

/** Libellé présentation servi par l’enveloppe démo pour prouver la résolution `label_key` → texte (story 5.5). */
export const DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD = 'Tableau de bord (libellé ressourcerie démo)';

export function createDefaultDemoEnvelope(overrides?: Partial<ContextEnvelopeStub>): ContextEnvelopeStub {
  const base: ContextEnvelopeStub = {
    schemaVersion: 'piste-a-stub',
    siteId: 'demo-site',
    activeRegisterId: null,
    permissions: {
      permissionKeys: [
        DEMO_PERMISSION_VIEW_HOME,
        RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND,
        TRANSVERSE_PERMISSION_DASHBOARD_VIEW,
        TRANSVERSE_PERMISSION_ADMIN_VIEW,
        TRANSVERSE_PERMISSION_LISTINGS_HUB_VIEW,
        TRANSVERSE_PERMISSION_CONSULTATION_HUB_VIEW,
      ],
    },
    issuedAt: Date.now(),
    runtimeStatus: 'ok',
    presentationLabels: {
      [NAV_LABEL_KEY_TRANSVERSE_DASHBOARD]: DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD,
    },
  };
  return {
    ...base,
    ...overrides,
    permissions: overrides?.permissions ?? base.permissions,
    presentationLabels:
      overrides?.presentationLabels !== undefined
        ? { ...(base.presentationLabels ?? {}), ...overrides.presentationLabels }
        : base.presentationLabels,
  };
}

export function getDefaultDemoAuthAdapter() {
  return createMockAuthAdapter({
    session: { authenticated: true, userId: 'demo-user' },
    envelope: createDefaultDemoEnvelope(),
  });
}
