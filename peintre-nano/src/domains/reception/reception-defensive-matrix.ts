/**
 * Matrice défensive réception (Story 7.5) — garde-fous UI, autorité backend.
 *
 * | État UI              | Déclencheur typique                                      | Comportement |
 * |---------------------|-----------------------------------------------------------|--------------|
 * | Fallback visible    | Manifeste / contrat partiel, runtime signale la limite   | Message explicite, pas de silence |
 * | Mode dégradé        | `ContextEnvelope` degraded (7.2)                         | Blocage entrée + message « restreint » |
 * | Blocage métier      | 403/401/409 serveur, permission / contexte               | Pas de poursuite nominal simulée ; reset si refus autoritaire |
 * | Partiel sûr         | Lecture OK (ex. historique) alors qu’une autre action a échoué | Actions lecture seule si API OK |
 * | Hard stop           | DATA_STALE sur widget critical, mutation sans confirmation | Mutations désactivées ; pas de message « terminé » sans GET OK |
 *
 * Hiérarchie : OpenAPI > ContextEnvelope > manifests CREOS > prefs locales (AR39).
 */

export {};
