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

/** Story 7.1 — entrée navigation réception (`reception.access`). */
export const PERMISSION_RECEPTION_ACCESS = 'reception.access';

/** Story 6.1 — entrée navigation caisse nominale (alignement clés permissions brownfield `caisse.access`). */
export const PERMISSION_CASHFLOW_NOMINAL = 'caisse.access';
export const PERMISSION_CASHFLOW_VIRTUAL = 'caisse.virtual.access';
export const PERMISSION_CASHFLOW_DEFERRED = 'caisse.deferred.access';

/** Story 6.4 — remboursement : permission dédiée (ne pas inférer depuis le seul accès caisse). */
export const PERMISSION_CASHFLOW_REFUND = 'caisse.refund';

/** Story 24.5 — remboursement exceptionnel sans ticket. */
export const PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND = 'refund.exceptional';

/** Story 22.5 — remboursement sur exercice antérieur clos (parcours expert, POST `expert_prior_year_refund`). */
export const PERMISSION_ACCOUNTING_PRIOR_YEAR_REFUND = 'accounting.prior_year_refund';

/** Story 6.5 — don sans article / adhésion : permission dédiée (`POST recyclique_sales_createSale` avec discriminant). */
export const PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT = 'caisse.special_encaissement';

/** Story 6.6 — actions sociales lot 1 : permission dédiée (`social_action_kind` sur POST vente). */
export const PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT = 'caisse.social_encaissement';

/** Story 6.8 — correction vente : émise par le ContextEnvelope **uniquement** pour super-admin (backend autoritaire). */
export const PERMISSION_CASHFLOW_SALE_CORRECT = 'caisse.sale_correct';

/** `label_key` CREOS pour le dashboard transverse (story 5.5 — préfixe `nav.transverse.*`). */
export const NAV_LABEL_KEY_TRANSVERSE_DASHBOARD = 'nav.transverse.dashboard';

/** Libellé présentation servi par l’enveloppe démo pour prouver la résolution `label_key` → texte (story 5.5). */
export const DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD = 'Tableau de bord';

/** UUID factice de site pour démo / Vitest — aligné sur l’attendu backend (`site_id` UUID). */
export const DEMO_AUTH_STUB_SITE_ID = '00000000-0000-4000-8000-00000000d157';

export function createDefaultDemoEnvelope(overrides?: Partial<ContextEnvelopeStub>): ContextEnvelopeStub {
  const base: ContextEnvelopeStub = {
    schemaVersion: 'piste-a-stub',
    siteId: DEMO_AUTH_STUB_SITE_ID,
    activeRegisterId: null,
    permissions: {
      permissionKeys: [
        DEMO_PERMISSION_VIEW_HOME,
        RECYCLIQUE_PERMISSION_VIEW_LIVE_BAND,
        TRANSVERSE_PERMISSION_DASHBOARD_VIEW,
        TRANSVERSE_PERMISSION_ADMIN_VIEW,
        TRANSVERSE_PERMISSION_LISTINGS_HUB_VIEW,
        TRANSVERSE_PERMISSION_CONSULTATION_HUB_VIEW,
        PERMISSION_RECEPTION_ACCESS,
        PERMISSION_CASHFLOW_NOMINAL,
        PERMISSION_CASHFLOW_VIRTUAL,
        PERMISSION_CASHFLOW_DEFERRED,
        PERMISSION_CASHFLOW_REFUND,
        PERMISSION_CASHFLOW_EXCEPTIONAL_REFUND,
        PERMISSION_CASHFLOW_SPECIAL_ENCAISSEMENT,
        PERMISSION_CASHFLOW_SOCIAL_ENCAISSEMENT,
        /** Story 6.8 — présent en démo locale pour preuve UI servie (super-admin simulé ; backend reste autoritaire en prod). */
        PERMISSION_CASHFLOW_SALE_CORRECT,
      ],
    },
    issuedAt: Date.now(),
    runtimeStatus: 'ok',
    presentationLabels: {
      [NAV_LABEL_KEY_TRANSVERSE_DASHBOARD]: DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD,
      'nav.reception.nominal': 'Réception',
      'nav.cashflow.nominal': 'Caisse',
      'nav.cashflow.refund': 'Remboursement',
      'nav.cashflow.exceptionalRefund': 'Remboursement exceptionnel',
      'nav.cashflow.specialDon': 'Don (sans article)',
      'nav.cashflow.specialAdhesion': 'Adhésion / cotisation',
      'nav.cashflow.socialDon': 'Don',
      'nav.cashflow.close': 'Clôture de caisse',
      'nav.cashflow.specialOpsHub': 'Opérations spéciales',
      'nav.cashflow.saleCorrection': 'Correction ticket (super-admin)',
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

/**
 * UUID factice stable pour la démo Piste A — aligné sur l’attendu backend (`POST /cash-sessions/`, opérateur UUID).
 * En navigateur avec session réelle (cookies), `resolveCashSessionOperatorId` utilise plutôt `GET /v1/users/me`.
 */
export const DEMO_AUTH_STUB_USER_ID = '00000000-0000-4000-8000-00000000d3ab';

export function getDefaultDemoAuthAdapter() {
  return createMockAuthAdapter({
    session: { authenticated: true, userId: DEMO_AUTH_STUB_USER_ID },
    envelope: createDefaultDemoEnvelope(),
  });
}
