# Story 2.7 : Fournir les signaux backend minimaux pour `bandeau live`

**Clé fichier (obligatoire) :** `2-7-fournir-les-signaux-backend-minimaux-pour-bandeau-live`  
**Epic :** epic-2 — **Piste B** (exposition signaux exploitation ; prérequis **Convergence 2** / Epic 4)  
**Statut :** review

<!-- Validation optionnelle : exécuter validate-create-story (VS) avant dev-story. -->

## Story

En tant qu’**équipe du premier slice vertical** (`bandeau live`),  
je veux que **`Recyclique`** expose les **signaux d’exploitation** portés par le backend (horaires effectifs, ouvertures décalées, cas particuliers, validité de contexte, synthèse sync opérationnelle, KPIs jour agrégés minimal),  
afin qu’**Epic 4** puisse prouver la chaîne sur une **vérité terrain backend** plutôt que sur des suppositions UI — **sans** élargir le périmètre admin / dashboard aux exigences des epics ultérieurs.

## Acceptance Criteria

### AC 1 — Surface HTTP réelle alignée sur le contrat reviewable

**Étant donné** que l’`operationId` **`recyclique_exploitation_getLiveSnapshot`** et le schéma **`ExploitationLiveSnapshot`** sont définis dans le writer canonique ([Source : `contracts/openapi/recyclique-api.yaml` — `/v2/exploitation/live-snapshot` ; Story **2.6** gel partiel])  
**Quand** l’endpoint est implémenté côté FastAPI  
**Alors** le chemin exposé correspond au contrat reviewable : **`GET /v2/exploitation/live-snapshot`** (préfixe d’application : même convention que le reste du mono-repo — aujourd’hui `api_router` est sous `settings.API_V1_STR` = `/v1` ; **ajouter** un routeur dédié préfixe **`/v2`** dans `main.py` ou équivalent documenté, sans casser les routes `/v1/*`).  
**Et** l’opération accepte l’en-tête optionnel **`X-Correlation-ID`** (cohérence **Epic 4** / traçabilité ; alignement possible avec **`X-Request-Id`** / `request.state.request_id` côté logs).  
**Et** la réponse **200** est un JSON validable contre le schéma **`ExploitationLiveSnapshot`** (champs nommés, `additionalProperties: false` au niveau racine, enums **`cash_session_effectiveness`** et cohérence de **`sync_operational_summary`** lorsque cet objet est non null).

### AC 2 — Indicateurs minimaux bandeau (F1–F6 / Story 1.7) dans le payload

**Étant donné** la formalisation des signaux ([Source : `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md` — familles F1–F6, §1 bis KPIs jour])  
**Quand** un client authentifié **exploitation** appelle le snapshot  
**Alors** le payload couvre au minimum la **distinction d’autorité** attendue :

- **Autoritaire (backend)** : `observed_at` ; projection **`context`** via **`ExploitationContextIds`** alignée sur le **contexte effectif** résolu (Story **2.2** / **2.3** — pas de reconstruction de périmètre sécurité côté UI) ; **`effective_open_state`** (vérité métier fenêtre d’ouverture / F1+F3 — valeur stable documentée dans OpenAPI ou description explicite des codes) ; **`cash_session_effectiveness`** (**F6**, **UX-DR15** — jamais inféré depuis la seule présence d’une caisse ou d’une sélection UI) ; **`sync_operational_summary`** (**F4** — `worst_state` **`SyncStateCore`**, `source_reachable`, sans redéfinir la sémantique **FR24** / Story **1.5**).
- **KPIs jour (§1 bis)** : bloc **`daily_kpis_aggregate`** — figer **clés et types** des agrégats (esprit bandeau **1.4.4** : CA jour, volumes matières, comptages ventes, etc.) en s’appuyant sur l’existant brownfield ([Source : `recyclique/api/src/recyclic_api/services/reception_stats_service.py` — `get_unified_live_stats` ; `schemas/stats.py` — `UnifiedLiveStatsResponse` ; snapshot lecture seule **JSON 08** dans `references/artefacts/2026-04-02_08_openapi-recyclique-live-recyclic-local.json`]) et documenter dans **`recyclique-api.yaml`** les clés retenues (semver draft / minor si ajout optionnel).

**Et** les **ouvertures décalées** (**F2**) : soit champs dédiés dans le snapshot (minimal), soit **`effective_open_state`** / sous-structure documentée permettant à **Epic 4.3** de brancher l’affichage sans réinventer la règle métier — **décision à trancher en implémentation** mais **aucune** ambiguïté sur le fait que le **backend** porte la règle.

### AC 3 — Authentification et périmètre (pas de simple copie admin-only v1)

**Étant donné** que **`GET /v1/stats/live`** est **réservé admin** ([Source : `recyclique/api/src/recyclic_api/api/api_v1/endpoints/stats.py` — `require_role_strict([ADMIN, SUPER_ADMIN])`])  
**Quand** le snapshot **v2** est livré  
**Alors** l’accès est cohérent avec un **utilisateur d’exploitation** authentifié (session web **v2** et/ou Bearer, comme **`GET /v1/users/me/context`**) — **pas** réservé au seul rôle admin sauf décision produit explicite contradictoire (dans ce cas : documenter dans la story de revue et dans OpenAPI).  
**Et** les agrégats **KPIs** respectent le **périmètre autorisé** pour l’utilisateur (sites / visibilité métier) : pas d’exposition de données hors contexte **1.3**.

### AC 4 — États dégradés explicites (pas de silence trompeur)

**Étant donné** les règles **absence / `null` / erreur HTTP** ([Source : artefact **07** — §5, §6])  
**Quand** des données sont **manquantes**, **stales**, **ambiguës**, ou qu’une **source externe** est indisponible  
**Alors** le backend renvoie soit :

- un **200** avec champs **optionnels** absents ou **`null`** selon convention documentée **et** des champs d’état explicites (**`cash_session_effectiveness: unknown`**, `sync_operational_summary` avec `source_reachable: false`, etc.), **ou**
- une **503** (ou **502** si pertinent) avec enveloppe **`RecycliqueApiError`** ([Source : AR21 / Story **2.6**]) quand l’agrégation **ne peut pas** être servie honnêtement,

**Et** il n’y a **pas** d’interprétation silencieuse « caisse active » ou « tout ouvert » lorsque **F6** ou **F2** ne sont pas calculables (**UX-DR15**).

### AC 5 — Scope minimal (hors admin / monitoring étendu)

**Étant donné** qu’**Epic 4** n’est qu’une **preuve de slice** et non une suite monitoring complète ([Source : `epics.md` — Story **2.7**, dernier bloc AC])  
**Quand** la story est livrée  
**Alors** la surface REST **ne** prend **pas** en charge les besoins **dashboard admin**, **supervision étendue**, ou **config admin simple** (**Epic 9**) : pas de nouveaux endpoints « fourre-tout » ; extensions futures = nouvelles stories / version contrat.

### AC 6 — OpenAPI writer canonique et codegen

**Étant donné** la gouvernance **B4** ([Source : `contracts/README.md`])  
**Quand** la sémantique ou les clés de **`daily_kpis_aggregate`** / **`effective_open_state`** sont figées ou enrichies  
**Alors** **`contracts/openapi/recyclique-api.yaml`** est mis à jour en parallèle du code (descriptions, enums éventuels, `required` si nécessaire) **et** la distinction « gelé Story **2.6** » vs « complété **2.7** » dans la description de **`ExploitationLiveSnapshot`** est **actualisée** pour éviter une ambiguïté codegen (**Peintre_nano**).  
**Et** toute évolution d’**`operationId`** suit le **journal B4** et les références **`data_contract.operation_id`** (anticipation **Epic 4.1**).

### AC 7 — Tests et gate Epic 2

**Étant donné** les gates du Story Runner ([Source : `_bmad-output/implementation-artifacts/_runner-brief-story-2-7.md`])  
**Quand** la story est terminée  
**Alors** des tests ciblés couvrent : réponse **200** conforme (schéma ou équivalent robuste), cas **403/401** avec **`RecycliqueApiError`**, cas dégradé **503** si implémenté, et corrélation (**header** / logs si pertinent).  
**Et** le **gate pytest** Epic 2 reste **vert** (étendre la liste si nouveaux fichiers de tests — reprendre le pattern **`tests/test_openapi_validation.py`** pour validation contre OpenAPI dynamique **ou** assertions sur modèle Pydantic aligné YAML).

## Tasks / Subtasks

- [x] **Routage `/v2` + handler `getLiveSnapshot`** (AC : #1, #6)  
  - [x] Introduire `APIRouter` préfixe `/v2/exploitation` (ou inclusion équivalente) ; enregistrer dans `main.py`.  
  - [x] Pydantic / schémas miroir **`ExploitationLiveSnapshot`** (réutiliser / étendre `schemas/` existants).  
  - [x] Vérifier cohérence avec **`openapi_url`** (`/v1/openapi.json` aujourd’hui — documenter si le snapshot **v2** n’apparaît dans le OpenAPI dynamique qu’après export vers YAML ou génération croisée).

- [x] **Service d’agrégation signaux** (AC : #2, #3, #4)  
  - [x] S’appuyer sur **`build_context_envelope`** (`recyclique/api/src/recyclic_api/services/context_envelope_service.py`) — même moteur que **`GET /v1/users/me/context`** — pour les ids, `runtime_state` et cohérence de validité de contexte (ne pas introduire une classe **`ContextEnvelopeService`** : elle n’existe pas dans le code).  
  - [x] Réutiliser / factoriser la logique métier de **`ReceptionLiveStatsService.get_unified_live_stats`** pour **`daily_kpis_aggregate`** (adapter périmètre non-admin).  
  - [x] Implémenter **`effective_open_state`**, **`cash_session_effectiveness`**, **`sync_operational_summary`** avec règles **F1–F6** minimal viable (placeholders **interdits** s’ils contredisent **UX-DR15** — utiliser **`unknown`** / **`not_applicable`**).

- [x] **OpenAPI + erreurs** (AC : #4, #6)  
  - [x] Maintenir la cohérence **`recyclique-api.yaml`** ↔ impl pour **`GET /v2/exploitation/live-snapshot`** : le writer canonique déclare déjà **`security: [bearerOrCookie: []]`**, en-tête **`X-Correlation-ID`**, et réponses **200** / **401** / **403** / **503** avec **`RecycliqueApiError`** — toute évolution sémantique (schéma, enums, `required`) reste synchronisée (AC **#3**, **#6**, **#7**).  
  - [x] Handlers FastAPI alignés sur **`RecycliqueApiError`** et les statuts déclarés (Story **2.6**).  

- [x] **Tests** (AC : #7)  
  - [x] Nouveau fichier ou extension **`tests/test_exploitation_live_snapshot.py`** (nom indicatif).  
  - [x] Exécuter le gate listé dans le brief runner **2.7** depuis `recyclique/api`.

## Dev Notes

### Portée story (annexe Story Runner)

Signaux **bandeau live** minimal : horaires, ouvertures décalées, sync, validité contexte ; **états dégradés explicites** ; **payload autoritaire vs présentation** (libellés UI = client ; **décisions métier** = backend) ; **OpenAPI à jour** ; **pas d’élargissement scope admin**.

### Découpage avec stories voisines

| Story / artefact | Rôle |
|------------------|------|
| **1.7** | Spécification signaux **F1–F6** et matrice dégradations — **norme fonctionnelle**. |
| **2.6** | Types gelés **`ExploitationLiveSnapshot`**, erreur AR21, codegen — **2.7** complète la **sémantique** et l’**impl HTTP**. |
| **2.2 / 2.3** | **Contexte** et permissions — **source** des ids et de la validité. |
| **4.1–4.3** | Manifests, widget, branchement **polling** + source réelle — consommateurs du **`operationId`**. |
| **4.5** | Toggle admin **bandeau** — **hors** périmètre **2.7** (ne pas implémenter ici). |

### Fichiers et zones probables

- `recyclique/api/src/recyclic_api/main.py` — inclusion routeur **`/v2`**.  
- `recyclique/api/src/recyclic_api/api/` — nouveau module `api_v2/endpoints/exploitation.py` (structure indicative).  
- `recyclique/api/src/recyclic_api/schemas/` — modèles snapshot live ; référence **`context_envelope.py`** / **`ContextEnvelopeResponse`** pour alignement types avec l’OpenAPI.  
- `recyclique/api/src/recyclic_api/services/context_envelope_service.py` — **`build_context_envelope`** (réutilisation obligatoire pour la partie contexte).  
- `recyclique/api/src/recyclic_api/services/` — orchestration snapshot (composition `build_context_envelope` + KPIs + sync summary).  
- `contracts/openapi/recyclique-api.yaml` — vérité reviewable.  
- `recyclique/api/tests/test_openapi_validation.py` ou tests dédiés exploitation.

### Références normatives

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story **2.7** ; **AR44**, **UX-DR15**, **FR58**]  
- [Source : `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`]  
- [Source : `contracts/openapi/recyclique-api.yaml` — `ExploitationLiveSnapshot`, `SyncStateCore`]  
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Piste B, Convergence 2]  
- [Source : `_bmad-output/implementation-artifacts/2-6-exposer-les-premiers-contrats-backend-versionnes-pour-les-slices-v2.md` — continuité contrats, codegen, gate pytest]

### Intelligence story 2.6 (continuité)

- **`ExploitationLiveSnapshot`** : partie **gelée** (enums, structure) vs **`daily_kpis_aggregate`** / **`effective_open_state`** — **à figer** ici.  
- **Enveloppe d’erreur** : toujours **`correlation_id`** ; ne pas exposer de secrets dans **`detail`**.  
- **`GET /v1/stats/live`** : référence **métier** pour KPIs, **pas** le modèle d’auth du snapshot **v2**.

### Anti-patterns à éviter

- Inférer **F6** depuis la sélection UI ou l’existence d’une entité caisse sans règle serveur.  
- Dupliquer une **seconde** API HTTP parallèle non référencée dans **`recyclique-api.yaml`**.  
- Étendre le slice aux **écrans admin** ou **monitoring** (hors scope).  
- Oublier la mise à jour **YAML** + **B4** lors de renommage d’**`operationId`**.

### Conformité architecture

- **Recyclique** = autorité des **signaux exploitation** exposés au client v2 ; **Peintre_nano** = consommation et **présentation** seulement.  
- **Structure projet (post 2.2b)** : backend vivant sous **`recyclique/api/`** ; Docker **`recyclic-local`** via `recyclique-1.4.4/docker-compose.yml` (contexte `../recyclique/api`).

### Recherche technique (rappel)

- FastAPI **multi-préfixe** : routeurs **`/v1`** et **`/v2`** sur la même app ; conserver **CORS**, **correlation middleware**, **handlers** d’exception existants.

## Dev Agent Record

### Agent Model Used

Composer (agent DS Story Runner BMAD).

### Debug Log References

_(néant)_

### Completion Notes List

- Routeur **`/v2`** + **`GET /v2/exploitation/live-snapshot`** (`operationId` **recyclique_exploitation_getLiveSnapshot**), auth **`get_current_user`** (comme **`/v1/users/me/context`**), pas de rôle admin requis.
- Service **`build_exploitation_live_snapshot`** : **`build_context_envelope`** + **`ReceptionLiveStatsService.get_unified_live_stats`** (période **daily**, `site_id` depuis contexte si présent) ; **503** si agrégation KPIs en échec ; runtime **forbidden** → pas de KPIs / pas de `context` / **F6** = **unknown**.
- **`effective_open_state`** : site actif/inactif + F2 minimal via **`sites.configuration.opening_exception`** (`delayed_open` / `delayed_close`).
- **`sync_operational_summary`** : F4 minimal local (**resolu** / **source_reachable** true) hors forbidden ; extension Paheko dans stories ultérieures.
- OpenAPI writer : **security**, **401/403/503**, description **`ExploitationLiveSnapshot`** et clés **`daily_kpis_aggregate`** figées.
- Tests SQLite : mock **`get_unified_live_stats`** pour les cas 200 (schéma partiel sans **ticket_depot**).
- Note **openapi_url** : l’URL canonique reste **`/v1/openapi.json`** ; le schéma dynamique FastAPI inclut aussi les chemins **`/v2/*`**.

### File List

- `recyclique/api/src/recyclic_api/main.py`
- `recyclique/api/src/recyclic_api/api/api_v2/__init__.py`
- `recyclique/api/src/recyclic_api/api/api_v2/api.py`
- `recyclique/api/src/recyclic_api/api/api_v2/endpoints/__init__.py`
- `recyclique/api/src/recyclic_api/api/api_v2/endpoints/exploitation.py`
- `recyclique/api/src/recyclic_api/schemas/exploitation_live_snapshot.py`
- `recyclique/api/src/recyclic_api/services/exploitation_live_snapshot_service.py`
- `recyclique/api/tests/test_exploitation_live_snapshot.py`
- `contracts/openapi/recyclique-api.yaml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/_runner-brief-story-2-7.md`

### Change Log

- 2026-04-03 — Impl Story 2.7 : endpoint live-snapshot v2, service d’agrégation, OpenAPI, tests, gate pytest étendu.

---

**Note de complétion create-story (CS)** : story dérivée de `epics.md` Story **2.7**, brief `_runner-brief-story-2-7.md`, artefact signaux **1.7**, OpenAPI **2.6**, intelligence **2.6** ; objectif **ready-for-dev** pour enchaînement **VS → DS**.

## Story Completion Status

**review** — Implémentation DS terminée ; gate pytest Epic 2 (liste étendue) vert ; prêt pour étape **GATE pytest** / revue code.
