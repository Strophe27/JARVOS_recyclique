# Story 25.10 : Supervision — causes racines mapping versus builder versus outbox

Status: done

**Story key :** `25-10-supervision-causes-racines-mapping-versus-builder-versus-outbox`  
**Epic :** 25 — Supervision / taxonomie causes racines Paheko (phase 2)  
**Implementation artifact :** `_bmad-output/implementation-artifacts/25-10-supervision-causes-racines-mapping-versus-builder-versus-outbox.md`

## Dépendances (prérequis)

- La story **25.9** est un prérequis : elle introduit `payload.preparation_trace_v1` (avec `failure_domain`, `code`, `message`) et des transitions de quarantaine stables. Cette story **25.10** s’appuie sur ces signaux pour dériver et exposer une taxonomie canonique côté API admin outbox.

## Contexte produit (obligatoire)

La spec **25.4** (§4 « Projection Recyclique → Paheko — fermeture sans silence ») impose :

- **mapping obligatoire** (site/caisse/emplacement/axes requis) **avant** toute écriture ou tout « succès » perçu côté outbox ;
- **échec visible** si mapping absent/ambigu (pas de substitution silencieuse) ;
- **quarantaine / blocage sélectif / supervision** comme mécanismes opérables (lien Epic 8).

La story **25.9** est livrée et a déjà introduit des éléments minimaux de corrélation « mapping vs builder vs transport HTTP » :

- `payload.preparation_trace_v1` avec `failure_domain` (`mapping|builder`), `code`, `message` (dans `paheko_outbox_processor.py`) ;
- transitions stables de quarantaine (dans `paheko_outbox_transition_audit.py`) :
  - `auto_quarantine_mapping_resolution`
  - `auto_quarantine_builder_preparation`
  - `auto_quarantine_http_non_retryable` (HTTP non retryable)
  - `auto_quarantine_max_attempts_exceeded` (retries épuisés)

Cette story **25.10** ne vise **pas** une refonte UI des consoles de supervision. Le scope attendu est de **stabiliser une taxonomie canonique** (écrite et consommable) pour que :

- les surfaces opérateur/support existantes (API admin outbox + piste d’audit + logs) exposent des libellés **déterministes** ;
- les futures consoles/dashboards n’inventent pas des labels ad hoc ;
- on réduise la mauvaise attribution (ex. « lenteur Redis » interprétée comme « mapping »), conformément à l’ADR async Paheko (**25-3**).

## Story (BDD)

As a supervision operator,  
I want deterministic root-cause labels between mapping, builder, and outbox for Paheko sync failures,  
So that on-call time-to-diagnose drops and mis-attribution (for example Redis latency treated as mapping) is reduced.

## Acceptance criteria

Source normative (texte aligné sur epics) : `_bmad-output/planning-artifacts/epics.md` — **Story 25.10**.

**Given** la story **25.9** est livrée (ou incluse dans la même release) et ses signaux (`preparation_trace_v1`, transitions de quarantaine) sont disponibles  
**When** this story is delivered  
**Then** at least one operator or supervision path shows a documented taxonomy of causes with links to spec **25.4** section 4 and Epic **8** supervision stories  
**And** the taxonomy is written down so new dashboards do not invent ad hoc labels  
**And** full UI redesign of supervision consoles stays out of scope

### Interprétation exécutable (ce que « au moins un chemin opérateur » signifie ici)

Le chemin supervision/opérateur retenu par défaut pour la preuve est l’API admin outbox (Epic 8.1) :

- `GET /v1/admin/paheko-outbox/items` (liste)
- `GET /v1/admin/paheko-outbox/items/{item_id}` (détail)
- `GET /v1/admin/paheko-outbox/by-correlation/{correlation_id}` (timeline corrélée, Epic 8.5)
- `GET /v1/admin/paheko-outbox/items/{item_id}/sync-transitions` (audit transitions, Epic 8.4)

Le livrable doit rendre la taxonomie **visible** et **documentée** au moins sur la liste et le détail d’item (et idéalement en cohérence dans l’audit via `context_json`).

## Taxonomie canonique (normative pour cette story)

### Domaines racines (root-cause domain)

Le système doit exposer **un domaine racine unique** (valeur stable) parmi :

- `mapping` : échec de résolution de mapping / préconditions (Epic 8.3, spec 25.4 §4.1–§4.3)
- `builder` : échec de construction payload/batch à partir du snapshot (spec 25.4 §4.1–§4.4 ; stories 22.7/23.1/25.9)
- `outbox_http` : échec de transport HTTP Paheko (non-retryable ou retries épuisés) (Epic 8.2, 8.4)

### Règles de dérivation (déterministes, sans heuristique floue)

Pour une ligne outbox :

1. **Si** `payload.preparation_trace_v1.failure_domain == "mapping"` **OU** transition `auto_quarantine_mapping_resolution` présente dans l’audit récent **OU** `mapping_resolution_error` non nul  
   **Alors** `root_cause_domain = "mapping"` et `root_cause_code = mapping_resolution_error || preparation_trace_v1.code`.
2. **Sinon si** `payload.preparation_trace_v1.failure_domain == "builder"` **OU** transition `auto_quarantine_builder_preparation` présente  
   **Alors** `root_cause_domain = "builder"` et `root_cause_code = preparation_trace_v1.code`.
3. **Sinon si** `last_remote_http_status` non nul **OU** transition `auto_quarantine_http_non_retryable` **OU** `auto_quarantine_max_attempts_exceeded` présente  
   **Alors** `root_cause_domain = "outbox_http"` et `root_cause_code = "http_<status>"` si status connu, sinon `transition_name`.
4. **Sinon** (cas résiduels : unsupported op, etc.)  
   **Alors** `root_cause_domain = "builder"` et `root_cause_code = transition_name || "unknown"`.  
   (Objectif : forcer l’on-call à distinguer « pré-HTTP » vs « HTTP », et éviter de classer du non-HTTP en `outbox_http`.)

### Texte de référence (written down)

Cette taxonomie doit être écrite **dans le code** (constantes + docstring) et **dans les descriptions de schéma** côté API admin (Pydantic/OpenAPI), afin d’être consommable par des dashboards sans réinterprétation.

## Definition of Done

- [x] La taxonomie ci-dessus est exposée via l’API admin outbox **au minimum** sur `GET /items` et `GET /items/{id}` (champs stables : `root_cause_domain`, `root_cause_code`, et éventuellement `root_cause_message` si utile).
- [x] La taxonomie est **documentée** au bon endroit :
  - [x] docstring / constantes (backend) ;
  - [x] description de champs dans `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py` (source de vérité pour OpenAPI).
- [x] La taxonomie **référence explicitement** la spec **25.4 §4** et les stories Epic **8** concernées (8.3–8.6) dans la documentation (champ description, ou section doc dédiée).
- [x] Tests **pytest** ajoutés/étendus pour couvrir au moins :
  - [x] un cas `mapping` (ex. mapping supprimé après enqueue, déjà couvert par `test_story_25_9_*` → étendre en vérifiant le champ exposé) ;
  - [x] un cas `builder` (échec construction body/batch) ;
  - [x] un cas `outbox_http` (HTTP non retryable ou retries épuisés).
- [x] Aucun changement n’introduit une « vérité Redis » concurrente ni ne masque les états outbox (ADR **25-3**, AR11/AR12).
- [x] Hors scope respecté : pas de refonte UI complète des consoles.

## Tasks / Subtasks

- [x] Implémenter les champs `root_cause_domain` / `root_cause_code` côté schémas admin outbox (AC: Acceptance criteria)
  - [x] Ajouter les champs à `PahekoOutboxItemPublic` (et donc à la liste) dans `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`.
  - [x] Ajouter un helper pur (dans `schemas/paheko_outbox.py` ou un module `services/paheko_outbox_root_cause.py`) qui applique **exactement** les règles de dérivation ci-dessus.
  - [x] Éviter toute heuristique basée sur parsing de `last_error` (instable).

- [x] Rendre la taxonomie visible via les endpoints admin existants (AC: Acceptance criteria)
  - [x] Vérifier que `admin_paheko_outbox.py` renvoie bien les nouveaux champs (via `outbox_item_to_public` / `outbox_item_to_detail`).
  - [x] Optionnel mais recommandé : inclure `root_cause_domain` / `root_cause_code` dans `context_json` des transitions append-only si ce n’est pas déjà stable via `failure_domain` (sinon documenter la correspondance).

- [x] Tests (AC: Definition of Done)
  - [x] Ajouter un test unitaire sur `outbox_item_to_public` (ou sur le helper) pour les trois domaines.
  - [x] Si un test d’intégration FastAPI est déjà en place : ajouter un test sur `GET /v1/admin/paheko-outbox/items/{id}` (sinon rester au niveau schema/service pour limiter la friction).

- [x] Documentation courte (AC: Acceptance criteria)
  - [x] Ajouter une section « Root cause taxonomy » dans les descriptions des champs API (Pydantic) et une note de lien vers spec 25.4 §4 + Epic 8.

## Dev Notes

### Fichiers et points d’ancrage (réutiliser l’existant, ne pas réinventer)

- Source des signaux « mapping vs builder » (déjà livré en 25.9) :
  - `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py` (`preparation_trace_v1`, logs `outcome=preparation_failed`, `failure_domain`)
  - `recyclique/api/src/recyclic_api/services/paheko_outbox_transition_audit.py` (noms transitions stables)
- Surface opérateur/support (Epic 8.1) :
  - `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`
  - `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`
- Tests existants à étendre/réutiliser :
  - `recyclique/api/tests/test_story_25_9_paheko_mapping_before_outbox_success.py` (cas mapping + trace)
  - `recyclique/api/tests/test_story_8_4_paheko_quarantine_resolution.py`
  - `recyclique/api/tests/test_story_8_2_paheko_outbox_retry_idempotence.py`

### Anti-patterns (à éviter explicitement)

- Utiliser `last_error` (texte libre) comme source principale de classification.
- Introduire des labels non stables (« mapping-ish », « paheko_error », etc.) au lieu des 3 domaines ci-dessus.
- Classer un échec **pré-HTTP** (mapping/builder) comme `outbox_http` sous prétexte de retry/backoff.
- Glisser une refonte de console UI sous couvert de « supervision » (hors scope).

### References

- `_bmad-output/planning-artifacts/epics.md` — Epic 25, Story 25.10 ; rappel Epic 8 (8.3–8.6).
- `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` — **§4** (projection, mapping obligatoire, échec visible, supervision).
- `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` — ADR 25-3 (outbox PostgreSQL, Redis auxiliaire).
- `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` — chaîne canonique (référentiel → journal → snapshot → builder → outbox).
- `_bmad-output/implementation-artifacts/25-9-projection-paheko-mapping-obligatoire-avant-succes-outbox-delta-epic-8.md` — story 25.9 (signaux minimaux déjà posés).
- `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py` ; `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`.

## Gates

- Gate (Story Runner / CI locale) :
  - `cd "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api"; pytest tests/ -q --tb=line`

## Trace Epic 25 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante requise par cette story ? | **ADR N/A** — cette story stabilise une taxonomie de supervision en s’appuyant sur spec **25.4 §4**, Epic **8**, et l’ADR **25-3** acceptée, sans rouvrir de décision async. |

## Alignement sprint / YAML

- `_bmad-output/implementation-artifacts/sprint-status.yaml` : clé **`25-10-supervision-causes-racines-mapping-versus-builder-versus-outbox`** → **`done`** (trace `# last_updated` fichier).

## Dev Agent Record

### Agent Model Used

GPT-5.2 (sous-agent Task `bmad-create-story`, 2026-04-20) ; reprise DS / gates 2026-04-20 (Story Runner).

### Debug Log References

- Gate pytest : `test_story_25_10_paheko_outbox_root_cause_taxonomy.py` + **`25-9`** + **`8-4`** ; `yaml.safe_load` OpenAPI ; `pnpm run generate` (`contracts/openapi`).

### Completion Notes List

- Taxonomie canonique stabilisée (3 domaines) + règles de dérivation **déterministes** (`derive_root_cause_for_outbox_item`).
- Liste / timeline corrélation : même entrée d’audit récente par item que le détail (Story **25.10**).
- `test-summary` : `_bmad-output/implementation-artifacts/tests/test-summary-story-25-10-root-cause-taxonomy.md`.
- Hors scope respecté : pas de refonte UI complète des consoles.

### File List

- `_bmad-output/implementation-artifacts/25-10-supervision-causes-racines-mapping-versus-builder-versus-outbox.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-25-10-root-cause-taxonomy.md`
- `_bmad-output/planning-artifacts/epics.md` (§25 pilotage — story **25.10**)
- `recyclique/api/src/recyclic_api/schemas/paheko_outbox.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`
- `recyclique/api/tests/test_story_25_10_paheko_outbox_root_cause_taxonomy.py`
- `contracts/openapi/recyclique-api.yaml` (si aligné contrat)
- `contracts/openapi/generated/recyclique-api.ts` (post-`pnpm run generate`)
