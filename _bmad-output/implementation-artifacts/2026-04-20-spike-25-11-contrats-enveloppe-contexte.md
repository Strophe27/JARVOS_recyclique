# Spike 25.11 — Contrats API et types pour l’enveloppe de contexte (sans PWA)

**Date :** 2026-04-20  
**Story :** `25-11-spike-contrats-api-et-types-enveloppe-contexte-sans-pwa`  
**Statut livrable :** proposition de contrat + exemples ; le schéma **canonique** reste `contracts/openapi/recyclique-api.yaml`.

## Périmètre explicite (hors PWA)

Ce spike ne livre **aucun** Service Worker, **aucune** persistance IndexedDB en production, **aucune** livraison offline-first produit. Il se limite à la **traçabilité** contrat / types / exemples pour l’enveloppe de contexte et aux erreurs déjà câblées côté API (ex. **25.8**).

## Références normatives (chemins dépôt)

| Document | Chemin |
|----------|--------|
| **ADR 25-2** (PIN kiosque, secret de poste, step-up, lockout, offline) | `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` |
| **ADR 25-3** (async Paheko, outbox, Redis auxiliaire / hybride) | `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` |
| **Spec 25.4** (§2 modèle de contexte, §3 changement de contexte) | `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` |
| **Checklist 25.7** (CTX-* normatifs §2.1–§3.2) | `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md` |

L’**ADR 25-3** n’impose pas de champs supplémentaires dans l’enveloppe §2–3 ; elle reste la norme pour la projection Paheko / outbox au-delà du périmètre « forme de l’enveloppe ».

## Cartographie checklist 25.7 → contrat `ContextEnvelope`

Les IDs `CTX-*` ci-dessous renvoient aux lignes du tableau de la checklist **25.7**. Le contrat HTTP actuel expose principalement `ContextEnvelope` + `GET/POST .../users/me/context` (voir OpenAPI).

| ID checklist | Synthèse | Réalisation dans le contrat / code (spike) |
|--------------|----------|--------------------------------------------|
| `CTX-INV-2-1-SITE-EXPLICIT` | Site explicite côté décisions sensibles | `context.site_id` lorsque résolu ; sinon `runtime_state` ≠ `ok` et pas d’inférence silencieuse |
| `CTX-INV-2-2-CAISSE-SITE-COHERENCE` | Caisse cohérente avec site / mappings | `context.cash_register_id`, `context.site_id` ; cohérence métier = serveur |
| `CTX-INV-2-3-SESSION-ENVELOPE-AUDIT` | Session ouverte = site + caisse + opérateur + audit | `context.cash_session_id` ; traces audit hors payload enveloppe (autres couches) |
| `CTX-INV-2-4-*` / `CTX-SWITCH-3-2-*` | Poste / kiosque, PIN, step-up | **ADR 25-2** ; pas de duplication normative dans le seul JSON `ContextEnvelope` |
| `CTX-SWITCH-3-1-NO-STALE-CLIENT-EXPLICIT-ERRORS` | Pas d’état stale sans erreur explicite | En-têtes optionnels + **409** `CONTEXT_STALE` (**25.8**) si désalignement |

**Vision-later** (ex. typologie FIXE / NOMADE / EXTERNE en §2.1 checklist) : **non** exigée comme champ obligatoire du schéma enveloppe dans ce spike.

## Cohérence avec l’existant (revue rapide)

| Couche | Fichier / zone | Commentaire |
|--------|----------------|-------------|
| Backend Pydantic | `recyclique/api/src/recyclic_api/schemas/context_envelope.py` | `ContextEnvelopeResponse` : `runtime_state`, `context` (`ExploitationContextIdsOut`), `permission_keys`, `computed_at`, `restriction_message`, `presentation_labels` — aligné OpenAPI |
| Service | `recyclique/api/src/recyclic_api/services/context_envelope_service.py` | Construction autoritaire `build_context_envelope` |
| Endpoints | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/users.py` | `GET/POST .../me/context` |
| OpenAPI canonique | `contracts/openapi/recyclique-api.yaml` | `components/schemas/ContextEnvelope`, `ExploitationContextIds`, `ContextRuntimeState` |
| Peintre (stub) | `peintre-nano/src/types/context-envelope.ts` | `ContextEnvelopeStub` : même sémantique en camelCase côté UI ; `issuedAt` / `maxAgeMs` sont des conventions client (fraîcheur), pas des champs du schéma backend |
| Liaison client ↔ serveur (**25.8**) | `recyclique/api/src/recyclic_api/core/context_binding_guard.py` | En-têtes `X-Recyclique-Context-Site-Id`, `X-Recyclique-Context-Cash-Session-Id` ; **409** `CONTEXT_STALE`, **400** si UUID mal formé |

**Pas de divergence signalée** entre Pydantic et `ContextEnvelope` OpenAPI pour les champs nommés ; le client Peintre complète avec des champs **présentation / fraîcheur** documentés comme hors schéma serveur.

## Exemple happy-path (JSON)

Réponse typique **200** `GET /v1/users/me/context` — enveloppe cohérente avec site + caisse + session + permissions effectives (union additive **2.3**) :

```json
{
  "runtime_state": "ok",
  "context": {
    "site_id": "a1b2c3d4-e5f6-4a5b-8c9d-111111111111",
    "cash_register_id": "b2c3d4e5-f6a7-5b6c-9d0e-222222222222",
    "cash_session_id": "c3d4e5f6-a7b8-6c7d-0e1f-333333333333",
    "reception_post_id": null
  },
  "permission_keys": [
    "caisse.access",
    "reception.access"
  ],
  "computed_at": "2026-04-20T14:30:00.000000Z",
  "restriction_message": null,
  "presentation_labels": {
    "context.active_site_display_name": "Déchetterie Centre"
  }
}
```

## Exemple négatif (état refusé / validation)

### 1) Enveloppe **forbidden** (pas d’IDs exposés)

Comportement déjà décrit côté OpenAPI pour `runtime_state` `forbidden` (voir description `ContextRuntimeState`) :

```json
{
  "runtime_state": "forbidden",
  "context": null,
  "permission_keys": [],
  "computed_at": "2026-04-20T14:30:00.000000Z",
  "restriction_message": "Exploitation non autorisée pour ce compte.",
  "presentation_labels": null
}
```

### 2) Désalignement en-têtes ↔ enveloppe (**409** `CONTEXT_STALE`, story **25.8**)

Corps d’erreur type (structure `RecycliqueApiError` / tests `test_context_stale_story25_8.py`) :

```json
{
  "code": "CONTEXT_STALE",
  "detail": "…",
  "retryable": false,
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

*(Le détail exact du champ `detail`/`message` peut suivre l’enveloppeur d’erreurs FastAPI ; les tests fixent `code`, `retryable`, `correlation_id`.)*

## Fragment OpenAPI (exemples réutilisables)

Fichier non autonome (pas de `paths` complet) : exemples nommés pour revue Peintre / codegen — **schémas** à prendre dans `recyclique-api.yaml`.

- `contracts/openapi/fragments/context-envelope-examples-25-11.yaml`

## Alignement TypeScript Peintre

Les types **`ContextEnvelopeStub`** et **`ContextEnvelopeRuntimeStatus`** dans `peintre-nano/src/types/context-envelope.ts` restent la base ; un commentaire de cartographie **checklist → champs** a été ajouté dans ce fichier pour la traçabilité **25.7** (sans changer le comportement runtime).

---

## Non-fermeture du gate brownfield API quality P0

**Ce spike ne clôt pas le gate brownfield API quality P0.**

Supports de rappel (au moins un exigé par la story) :

- Note readiness : `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md` (§2, gate qualité API — **Ouvert**).
- Rapport de readiness : `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` (synthèse gate qualité API / arbitrage P0).
- Backlog audit §7 : `references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md` (items **B1–B7** P0–P2 — **pistes restantes**, non résolues par la seule story **25.11**).

---

## Prochaine étape recommandée

Intégration éventuelle du fragment d’exemples dans la doc codegen / régénération client OpenAPI si le pipeline le prévoit ; stories ultérieures pour champs additionnels normatifs hors train actuel.
