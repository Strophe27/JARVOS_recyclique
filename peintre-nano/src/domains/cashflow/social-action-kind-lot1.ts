/**
 * Lot 1 Story 6.6 — valeurs alignées sur OpenAPI `SocialActionKindV1`.
 * Source figée (pas de liste chargée côté client seul) ; l’API reste autoritaire sur la validité.
 */
export const SOCIAL_ACTION_KIND_LOT1 = [
  { kind: 'DON_LIBRE', label: 'Don libre' },
  { kind: 'DON_MOINS_18', label: 'Don -18' },
  { kind: 'MARAUDE', label: 'Maraude' },
  { kind: 'KIT_INSTALLATION_ETUDIANT', label: "Kit d'installation étudiant" },
  { kind: 'DON_AUX_ANIMAUX', label: 'Don aux animaux' },
  { kind: 'FRIPERIE_AUTO_GEREE', label: 'Friperie auto gérée' },
] as const;

export type SocialActionKindV1 = (typeof SOCIAL_ACTION_KIND_LOT1)[number]['kind'];
