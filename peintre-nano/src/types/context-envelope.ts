/**
 * ContextEnvelope — contexte actif autoritatif (site, caisse, permissions effectives, etc.).
 * Schéma canonique : OpenAPI `recyclique` (backend). Piste A : mocks / stubs **structurellement alignés** acceptables jusqu’à Convergence 1 (story 3.4 branchera l’adaptateur réel).
 */

export interface EffectivePermissions {
  readonly permissionKeys: readonly string[];
}

/** Stub minimal : ne remplace pas le schéma OpenAPI ; sert à typer l’intégration future. */
export interface ContextEnvelopeStub {
  readonly schemaVersion: string;
  readonly siteId: string | null;
  readonly activeRegisterId: string | null;
  readonly permissions: EffectivePermissions;
}
