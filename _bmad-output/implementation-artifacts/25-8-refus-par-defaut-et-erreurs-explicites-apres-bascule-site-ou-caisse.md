# Story 25.8 : Refus par défaut et erreurs explicites après bascule site ou caisse

Status: done

**Story key :** `25-8-refus-par-defaut-et-erreurs-explicites-apres-bascule-site-ou-caisse`  
**Epic :** 25 — Socle d'alignement PRD vision kiosque / multisite / permissions, brownfield et ADR  
**Implementation artifact :** `_bmad-output/implementation-artifacts/25-8-refus-par-defaut-et-erreurs-explicites-apres-bascule-site-ou-caisse.md`

## Contexte produit

Après une **bascule de site ou de caisse**, le **contexte serveur** (enveloppe / session) peut ne plus correspondre à ce que le client affiche ou à ce qu'une requête en cours suppose. La spec **25.4** §3.1–3.2 impose : **invalider ou recalculer** le contexte backend avant toute action métier ou comptable sensible, **erreurs explicites** côté client (pas de continuation sur état **stale**), et **refus par défaut** jusqu'à revalidation conforme à l'**ADR 25-2** pour les périmètres PIN / step-up (la **matrice détaillée** step-up est la story **25.14** — ne pas la livrer ici).

**Prérequis documentaire :** la checklist **25.7** est **livrée** : `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md` (items `CTX-SWITCH-3-1-*`, `CTX-SWITCH-3-2-*`).

## Story (BDD)

As a caisse reliability owner,  
I want backend and client contracts to refuse business actions on stale context after site or register switch, with explicit correlated errors,  
So that operators never silently continue on the wrong site or register.

## Acceptance criteria

Source normative (texte aligné mot à mot) : `_bmad-output/planning-artifacts/epics.md` — **Story 25.8**.

**Given** checklist **25.7** exists for invariants in spec sections 2 and 3  
**When** this story is delivered  
**Then** at least one automated integration or e2e path proves a refuse outcome after context switch with a stable error code or message id (not a generic server error)  
**And** no sensitive business action proceeds on stale server context without revalidation  
**And** full kiosk PIN PWA model and offline queue implementation stay explicitly out of scope

**Lecture côté spec 25.4 (§3.1–3.2)** : la **revalidation** et le **refus par défaut** après bascule s’appuient sur l’**ADR 25-2** (`_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`) pour tout ce qui est PIN opérateur / kiosque / secret de poste ; la **matrice exhaustive** des scénarios step-up est **25.14** (hors périmètre fonctionnel de 25.8). Le verdict **NOT READY** PWA et la story **13.8** ne sont pas levés par 25.8.

### Checklist développeur (VS) — exécution et preuves

| # | Action | Critère de refus / erreur corrélée | Où prouver (cible repo) |
|---|--------|-----------------------------------|-------------------------|
| 1 | **AC Then** : refus après bascule de contexte | Réponse API avec **code / `message_id` stable** (pas 500 générique, pas chaîne libre non documentée) | Nouveau ou étendre `recyclique/api/tests/test_context_envelope.py` **ou** e2e Peintre (ex. hub caisse) avec assertion sur le corps d’erreur |
| 2 | **AC And (stale)** : garde serveur avant mutation sensible | **409 / 428 / 422** (selon convention projet une fois choisie) + même code stable si enveloppe / session ≠ couple site+caisse attendu | Même fichier pytest **ou** test d’intégration route métier choisie ; corrélation **OpenAPI** `contracts/openapi/recyclique-api.yaml` |
| 3 | **AC And (stale)** : client sans continuation silencieuse | UI ou couche HTTP affiche le **code stable** ; pas de retry aveugle sans refresh d’enveloppe | `peintre-nano/src/runtime/context-envelope-freshness.ts` + tests `peintre-nano/tests/unit/context-envelope-freshness.test.ts` (et/ou e2e) |
| 4 | **AC And (scope)** | Pas d’implémentation **file offline**, **SW**, **PIN PWA kiosque complet** | Revue de PR + commentaire renvoyant **25.14** / **13.8** si zone limite |

### Cartographie checklist 25.7 (§3 — à tracer dans test-summary / PR)

| ID checklist | Exigence (rappel) | Rôle dans 25.8 |
|--------------|-------------------|----------------|
| `CTX-SWITCH-3-1-INVALIDATE-OR-RECALC-BEFORE-BIZ` | Invalider ou recalculer le contexte backend avant action métier ou comptable. | Garde serveur + ordre requête après bascule |
| `CTX-SWITCH-3-1-NO-STALE-CLIENT-EXPLICIT-ERRORS` | Pas d’état métier client stale vs serveur après bascule ; erreurs explicites. | Client + messages corrélés |
| `CTX-SWITCH-3-2-OPERATOR-PIN-CANON-PRD-11-2` | PIN opérateur (vérif serveur) reste canon — `prd.md` §11.2. | Ne pas affaiblir le refus : pas de contournement « meilleur effort » sur actions sensibles déjà couvertes par le canon |
| `CTX-SWITCH-3-2-KIOSQUE-POSTE-STEPUP-ADR-25-2` | PIN kiosque, secret de poste, lockout, step-up, offline : **ADR 25-2** (*accepted*). | 25.8 pose refus + erreurs ; pas de redécision ADR — renvoi **25.14** pour la matrice |
| `CTX-SWITCH-3-2-REVALIDATION-DEFAULT-DENY` | Refus par défaut jusqu’à preuve conforme à l’ADR. | Comportement par défaut sur les routes sensibles retenues ; matrice détaillée **25.14** |

## Hors scope (explicite)

- **Modèle PIN PWA kiosque complet**, **file offline** de production, **Service Worker** / IndexedDB persistant : hors story (cf. readiness **NOT READY** PWA, ADR **25-2** § offline comme trajectoire future).
- **Matrice exhaustive** step-up / PIN kiosque / secret de poste pour tous les scénarios : story **25.14** ; 25.8 pose le **socle** refus + erreurs corrélées + au moins un chemin de preuve automatisé.
- **Nouvelle ADR** : **non requise** si l'implémentation **respecte** les ADR **25-2** et **25-3** existantes ; toute évolution substantielle des invariants → **correct course** ou ADR dédiée (comme pour les autres stories Epic 25).

## Definition of Done

- [x] **Contrat d'erreur stable** : code API **`CONTEXT_STALE`** (corps `RecycliqueApiError` / HTTP **409**) documenté dans **OpenAPI** (`contracts/openapi/recyclique-api.yaml`) + en-têtes optionnels `X-Recyclique-Context-Site-Id` / `X-Recyclique-Context-Cash-Session-Id`.
- [x] **Backend** : mutations ventes sensibles (`POST /v1/sales/hold`, `POST /v1/sales/`, `POST /v1/sales/reversals`, `finalize-held`, `abandon-held`) — garde **`enforce_optional_client_context_binding`** avant `SaleService` lorsque le client envoie les en-têtes (alignement `build_context_envelope`).
- [x] **Client (Peintre_nano)** : en-têtes de liaison sur les POST ventes ; blocage local si `isEnvelopeStale` ; alerte titre dédié pour **`CONTEXT_STALE`** (`RecycliqueClientErrorAlert`).
- [x] **Preuve automatisée** : pytest `recyclique/api/tests/test_context_stale_story25_8.py` (bascule `user.site_id` + refus 409) ; Vitest unitaires `context-envelope-freshness` / `context-binding-headers`.
- [x] **Trace checklist** : `_bmad-output/implementation-artifacts/tests/test-summary-story-25-8-context-stale.md` (IDs `CTX-SWITCH-3-1-*`, `CTX-SWITCH-3-2-*`).

## Tasks / Subtasks

- [x] **Cartographier le périmètre « action sensible »** (AC **Then** + **And** stale)  
  - [x] Mutations caisse : hold / création vente / finalisation held / abandon / reversal (routes `sales.py`).  
  - [x] Vérité serveur : `build_context_envelope` via `enforce_optional_client_context_binding`.

- [x] **Contrat erreur corrélé** (AC **Then**)  
  - [x] Code stable **`CONTEXT_STALE`**, HTTP **409**, détail dict → enveloppe AR21.  
  - [x] OpenAPI : paramètres + réponses 409 sur opérations ventes concernées.

- [x] **Garde serveur** (AC **And** : stale server context)  
  - [x] Comparaison en-têtes optionnels vs `ContextEnvelope` courant (`context_binding_guard.py`).

- [x] **Client : pas de stale silencieux** (AC **And** : stale server context)  
  - [x] `applyRecycliqueContextBindingHeaders` + `isEnvelopeStale` avant mutations dans les parcours caisse Peintre.  
  - [x] Affichage **code** + message (alerte caisse).

- [x] **Tests** (AC **Then**)  
  - [x] pytest : `tests/test_context_stale_story25_8.py`.  
  - [x] Vitest : `context-envelope-freshness`, `context-binding-headers`.

- [x] **Hors scope** (AC **And** : kiosk PWA / offline queue) : rappel dans `context_binding_guard.py` + test-summary (25.14 / 13.8) — pas d’impl offline / PIN PWA complet.

## Dev Notes

### Architecture et garde-fous

- **Spec 25.4** §3.1–3.2 : `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md`  
- **ADR 25-2** (PIN opérateur canon serveur, kiosque hybride, pas de contournement §11.2) : `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`  
- **ADR 25-3** : vérité durable outbox PostgreSQL ; Redis auxiliaire — ne pas introduire une seconde vérité pour le périmètre async ; utile surtout pour **ne pas** mélanger causes d'erreur mapping/outbox avec erreurs de contexte session (story **25.9** / **25.10**).  
- **ContextEnvelope** backend : `recyclic_api/services/context_envelope_service.py`, endpoints `GET/POST .../me/context` dans `recyclic_api/api/api_v1/endpoints/users.py`.  
- **Peintre_nano** : types `peintre-nano/src/types/context-envelope.ts`, fraîcheur `peintre-nano/src/runtime/context-envelope-freshness.ts`, tests unitaires `peintre-nano/tests/unit/context-envelope-freshness.test.ts`.

### Dépendances Epic 25 (DAG)

- Amont : **25.7** (checklist) **done**.  
- Aval : **25.9** (projection Paheko), **25.14** (matrice step-up complète) — ne pas bloquer 25.8 sur 25.9.

### Anti-patterns à éviter

- Retour **500** ou message « Une erreur est survenue » sans code stable pour un refus de contexte.  
- **Retry aveugle** côté client sur 409 sans refresh d'enveloppe.  
- Décisions **PIN kiosque / offline** non couvertes par ADR dans cette story.

### Project Structure Notes

- Backend : `recyclique/api/src/recyclic_api/` (services, endpoints, schémas).  
- Contrats : `contracts/openapi/recyclique-api.yaml`.  
- Frontend : `peintre-nano/src/app/auth/`, domaines caisse sous `peintre-nano/src/domains/cashflow/`.

### References

- `_bmad-output/planning-artifacts/epics.md` (Story **25.8**, pilotage YAML **epic-25**)  
- `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md`  
- `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` (§**3.1**, §**3.2**)  
- `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` (**ADR 25-2**)  
- `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` (**ADR 25-3**)  
- `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml` (dépendances)  
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Trace Epic 25 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante requise par cette story ? | **ADR N/A** — implémentation sous specs **25.4** et ADR **25-2** / **25-3** déjà **acceptées**. |
| ADR **25-2** | Chemin : `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` |
| ADR **25-3** | Chemin : `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` |
| Justification **N/A** | La story opérationnalise refus + erreurs explicites ; pas de nouveau choix d'architecture concurrent des ADR existantes. |

## Alignement sprint / YAML

- **Post–Story Runner :** `sprint-status.yaml` : clé `25-8-refus-par-defaut-et-erreurs-explicites-apres-bascule-site-ou-caisse` → **`done`** (trace `# last_updated` fin de run CS→CR).  
- **Epic 25** reste **`in-progress`** (phase 2).

## Dev Agent Record

### Agent Model Used

Composer (sous-agent Task DS Story Runner).

### Debug Log References

_(néant)_

### Completion Notes List

- Garde serveur **25.8** : `enforce_optional_client_context_binding` — en-têtes optionnels pour rétrocompat ; si présents, refus **409** + **`CONTEXT_STALE`**.
- Client : liaison `X-Recyclique-Context-*` sur POST ventes ; `isEnvelopeStale` pour éviter mutation sur enveloppe locale périmée sans refresh.
- `npm run build` Peintre : échecs TS préexistants (`CashflowSaleCorrectionWizard` / `category-hierarchy-display`) — hors diff 25-8.

### File List

- `recyclique/api/src/recyclic_api/core/context_binding_guard.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/sales.py`
- `recyclique/api/tests/test_context_stale_story25_8.py`
- `contracts/openapi/recyclique-api.yaml`
- `peintre-nano/src/api/context-binding-headers.ts`
- `peintre-nano/src/api/sales-client.ts`
- `peintre-nano/src/api/recyclique-client-error-alert.tsx`
- `peintre-nano/src/runtime/context-envelope-freshness.ts`
- `peintre-nano/tests/unit/context-envelope-freshness.test.ts`
- `peintre-nano/tests/unit/context-binding-headers.test.ts`
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`
- `peintre-nano/src/domains/cashflow/KioskFinalizeSaleDock.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSpecialEncaissementWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowSocialDonWizard.tsx`
- `peintre-nano/src/domains/cashflow/CashflowRefundWizard.tsx`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-25-8-context-stale.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-04-20 — Implémentation **25.8** : `CONTEXT_STALE`, OpenAPI, tests pytest/Vitest, client Peintre ; sprint **25-8** → `review`.

---

**Note create-story / VS :** analyse exhaustive des artefacts epics §25.8, checklist 25.7 (tous les IDs §3.2), spec 25.4 §3, ADR 25-2/25-3, et ancres code `ContextEnvelope` / fraîcheur UI — AC BDD alignés `epics.md` ; checklist développeur actionnable avec chemins de tests repo.
