/**
 * ContextEnvelope — contexte actif autoritatif (site, caisse, permissions effectives, etc.).
 * Schéma canonique : OpenAPI `recyclique` (backend). Piste A : mocks / stubs **structurellement alignés** jusqu'à Convergence 1.
 *
 * Champs marqués « stub » : à aligner sur le schéma OpenAPI canonique (`contracts/openapi/recyclique-api.yaml`) lorsque disponible.
 *
 * Story 25.11 (spike) — traçabilité checklist 25.7 / spec 25.4 §2–3 (IDs `CTX-*`) :
 * - `CTX-INV-2-1-*` / site explicite → `siteId` (ne pas inférer le site seul depuis l’UI pour du sensible).
 * - `CTX-INV-2-2-*` → `activeRegisterId` + cohérence avec `siteId` (vérité serveur).
 * - `CTX-INV-2-3-*` → `cashSessionId` + audit hors enveloppe UI.
 * - `CTX-SWITCH-3-1-*` (pas de stale client) → `context-envelope-freshness` + erreurs API explicites (`CONTEXT_STALE`, etc.).
 * ADR 25-2 / 25-3 : PIN kiosque, step-up, outbox — pas de champs supplémentaires imposés dans ce stub ; voir doc spike `_bmad-output/implementation-artifacts/2026-04-20-spike-25-11-contrats-enveloppe-contexte.md`.
 */

export interface EffectivePermissions {
  readonly permissionKeys: readonly string[];
}

/** État runtime côté UI (à rapprocher des codes erreur / statuts API backend). */
export type ContextEnvelopeRuntimeStatus = 'ok' | 'degraded' | 'forbidden';

export interface ContextEnvelopeStub {
  readonly schemaVersion: string;
  readonly siteId: string | null;
  readonly activeRegisterId: string | null;
  /**
   * Session caisse active lorsque le backend l'expose (`ContextEnvelope.context.cash_session_id` / exploitation).
   * Stub démo : peut rester null ; le parcours caisse 6.1 peut demander une saisie locale de secours (terrain).
   */
  readonly cashSessionId?: string | null;
  /**
   * Poste / workstation actif si le backend l’expose — sert au filtrage déclaratif `contexts_*` sur le marqueur `poste`.
   */
  readonly workstationId?: string | null;
  /**
   * Marqueurs de contexte actifs fournis par le backend (prioritaires sur la dérivation locale).
   * Ne pas inférer de permissions à partir de cette liste : consommation déclarative uniquement.
   */
  readonly contextMarkers?: readonly string[];
  readonly permissions: EffectivePermissions;
  /** Horodatage d'émission (ms depuis epoch) — alignement OpenAPI à confirmer. */
  readonly issuedAt: number;
  /**
   * Seuil de fraîcheur (ms) pour l'UI ; si absent, voir {@link MAX_CONTEXT_AGE_MS} dans `runtime/context-envelope-freshness.ts`.
   * Surcharge utile pour les tests.
   */
  readonly maxAgeMs?: number;
  /** Signaux explicites : ne pas inférer un contexte métier valide si `degraded` ou `forbidden`. */
  readonly runtimeStatus: ContextEnvelopeRuntimeStatus;
  /**
   * Aligné OpenAPI `presentation_labels` : résolution des `label_key` manifestes (navigation, etc.).
   * Présentation uniquement — ne participe pas aux décisions d’accès.
   */
  readonly presentationLabels?: Readonly<Record<string, string>>;
  /** Aligné OpenAPI `restriction_message` : message diagnostic UI (non autoritatif). */
  readonly restrictionMessage?: string | null;
}
