# Story 26.3 : P1 — Clarifier async vs ORM synchrone (pilote categories + convention)

Status: done

**Story key :** `26-3-normaliser-async-orm-sync-pilote-categories`  
**Epic :** `epic-26` — dette qualité API (`recyclique/api/`, audit brownfield 2026-04-19)  
**Implementation artifact :** `_bmad-output/implementation-artifacts/26-3-normaliser-async-orm-sync-pilote-categories.md`

## Dépendances (prérequis)

- **Story 26.1** — **`done`** : pytest canonique ; **`AdminService`** supprimé.
- **Story 26.2** — **`done`** : `admin_users_groups` en **`def`** + `Session` synchrone + service dédié — **ne pas** réintroduire `AsyncSession` sur l’admin sans ADR ; la story 26.3 est **indépendante** du domaine users/groups mais doit **réutiliser le même esprit** (clarité sync vs async).
- **Audit** : `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` — **F2** (§7), **§5.5** (sync vs async API v1/v2), **§8** checklist PR (point sur `async def` + code bloquant), **§9 P1**.
- **Recherche dépôt** : `_bmad-output/planning-artifacts/research/technical-dette-qualite-api-audit-brownfield-research-2026-04-22.md` — table **P1-b** (async vs ORM sync), focus `category_service.py` / routes associées.
- **Epic 26 (pilotage)** : `_bmad-output/planning-artifacts/epics.md` — section **Story 26.3**, tableau P1, notes de parallélisme avec **26.4** / **26.5**.
- **Distinction** : l’**ADR Paheko async / outbox** (`_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md`, Epic 25) concerne **I/O et sync Paheko** — **ne pas** le confondre avec cette story (convention **ORM `Session` synchrone** sous FastAPI).

### Intelligence story 26.2 (patterns à répliquer)

- **Patron validé** : routes et services **ORM sync** en **`def`** + `Session` injectée — voir **`admin_users_groups`** post-26.2 et services voisins **`site_service.py`**, **`admin_settings_service.py`** (même esprit que la story 26.3).
- **§8.2 audit** : cohérence **sync** ; pas d’**`AsyncSession`** sans ADR.
- **Gates vs AC** : les commandes pytest sont une **preuve reproductible** ; la liste de fichiers de test peut évoluer tant que l’**intention** (non-régression categories + gate `test_infrastructure.py`) est tenue — cf. formulation équivalente dans **`26-2-extraire-admin-users-groups-vers-service.md`**.

## Story (BDD)

As a **backend developer**,  
I want **a clear convention for `async def` endpoints and services that only use synchronous SQLAlchemy**,  
So that **we do not imply false async benefits** (**F2**, audit §5.5, §9 P1).

## Acceptance Criteria

**Given** the categories path is the documented pilot in the audit  
**When** this story is delivered  
**Then** categories-related routes/services follow the retained convention (`def` vs real async vs documented exception)  
**And** a short in-repo note (README fragment, ADR stub, or comment policy in `architecture` index) states the rule for future PRs  
**And** tests still pass for the touched modules

### Interprétation exécutable (DS)

1. **Périmètre pilote « categories »** — aligner la convention sur au minimum :
   - `recyclique/api/src/recyclic_api/api/api_v1/endpoints/categories.py` (tous les handlers qui aujourd’hui sont en `async def` avec `Session` / appels services **synchrones** côté ORM) ;
   - `recyclique/api/src/recyclic_api/services/category_service.py` (méthodes `async def` avec `self.db.query(...)` / `commit` / `refresh` — **ORM synchrone**) ;
   - `recyclique/api/src/recyclic_api/services/category_management.py` (même motif : `async def` + ORM sync).
2. **Convention retenue** (la note in-repo **matérialise** le choix ; une option = règle par défaut API v1 sync) :
   - **Option A (défaut Epic 26 / pilote categories)** : handlers en **`def`** lorsque le corps est **uniquement** du travail **bloquant** sur `Session` synchrone ; méthodes de service en **`def`** lorsqu’elles ne font que de l’ORM synchrone — supprime l’**async décoratif** ; FastAPI exécute la route dans un **pool de threads** (comportement à mentionner brièvement dans la note : pas de « faux » parallélisme async).
   - **Option B** : conserver des signatures `async` **uniquement** pour un endpoint qui impose `async` (ex. **`StreamingResponse`**, **vrai `await`** sur I/O non bloquant) — **documenter** l’exception dans la note ou un commentaire **bref** sur la route.
   - **Option C** : migration **`AsyncSession`** / requêtes **vraiment async** — **hors scope** sauf **ADR** ou extension d’epic explicite.
3. **Cohérence d’appel** : si les routes et services passent en `def`, retirer les **`await`** vers `CategoryService` / `CategoryManagementService` ; ajuster les tests qui mockent des coroutines si nécessaire.
4. **Note in-repo** (livrable obligatoire, **au moins un** des emplacements suivants, référencé depuis `architecture/index.md` si ADR ou fragment architecture) :
   - fragment dans `recyclique/api/tests/README.md` **ou**
   - ADR court / stub sous `_bmad-output/planning-artifacts/architecture/` (titre explicite : async vs ORM sync, scope API Recyclique) **ou**
   - entrée courte dans `_bmad-output/planning-artifacts/architecture/index.md` (section dédiée **Dette qualité API / Epic 26** ou équivalent) pointant vers le document de règle.
5. La note doit être **actionnable en revue PR** : 1–2 pages max, règle par défaut + exceptions (ex. v2, I/O réseau, `StreamingResponse` si concerné).

## Definition of Done

- [x] `categories.py`, `category_service.py`, `category_management.py` appliquent la **même** convention documentée (pas de mélange incohérent sans justification en commentaire ou dans la note).
- [x] **Aucune** régression fonctionnelle : mêmes codes HTTP et réponses sur les scénarios couverts par les tests listés ci-dessous.
- [x] Note in-repo livrée + lien depuis l’index architecture (si applicable).
- [x] `grep` ou revue : le pilote **categories** ne porte plus le motif purement décoratif décrit en F2 pour ces fichiers (ou l’exception est **nommée** dans la note).

## Tasks / Subtasks

- [x] Lire **§5.5** et **F2** de l’audit + **P1-b** de la recherche 2026-04-22 ; lister les endpoints `async` du routeur categories.
- [x] Valider la **cartographie appelants** (section ci-dessus + `rg`) ; mettre à jour la table si de nouveaux `await` apparaissent sur `CategoryService`.
- [x] Appliquer **Option A** par défaut ; n’utiliser **Option B** que pour une exception **nommée** dans la note ; rédiger la note (Option C exclue sauf arbitrage hors story).
- [x] Refactor **endpoints** `categories.py` : `def` vs `async` selon la règle ; ajuster imports / `Depends` inchangés (`get_db` → `Session` sync reste l’intention).
- [x] Refactor **services** `category_service.py` et `category_management.py` : méthodes sync si ORM sync uniquement ; mettre à jour tous les appels (`await` retirés là où pertinent).
- [x] Vérifier **services** voisins appelés depuis `categories.py` (`CategoryImportService`, `CategoryExportService`, etc.) : s’ils sont déjà **100 % sync**, ne pas les « asyncifier » ; si la route les await, aligner sur la convention (appel sync ou garde-fou documenté).
- [x] **Tests** : exécuter les gates pytest (section Testing) ; corriger tests unitaires/integ qui supposaient des coroutines pour `CategoryService` / routes.
- [x] **Doc** : finaliser la note + entrée index ; remplir **Dev Agent Record** (commandes, File List).

## Dev Notes

### Problème à résoudre (ancrage F2)

Le code actuel combine typiquement :

- `async def` sur les routes et services **alors que** l’accès base utilise `sqlalchemy.orm.Session` et `query` / `commit` **synchrones** — cela **ne libère pas** l’event loop pour de l’I/O DB parallèle et peut **bloquer** le worker async si l’on croit à tort à du vrai async.

Extraits de référence (à valider après édition ; numéros de ligne indicatifs) :

- `category_service.py` : `async def create_category` avec `self.db.query(...)` synchrone (voir blocs autour des `self.db.query`, `commit`, `refresh`).
- `categories.py` : `async def create_category` / `get_categories` / … avec `CategoryService(db)` puis `await service.*` alors que le service est ORM sync.
- `category_management.py` : méthodes `async def` avec `self.db` synchrone.

### Garde-fous techniques (FastAPI / Starlette)

- Pour une route **`def`**, FastAPI exécute la fonction dans un **threadpool** — adapté au code **bloquant** (ORM sync), selon la doc FastAPI et l’intention de l’audit (clarifier plutôt que micro-optimiser).
- Pour une route **`async def`**, tout le code **bloquant** long devrait être évité ou délégué (`asyncio.to_thread`, etc.) — c’est précisément ce que l’audit met en cause quand ce n’est pas le cas.

### Chemins et modules (scope pilote)

| Rôle | Chemin |
|------|--------|
| Routeur categories | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/categories.py` |
| Service principal | `recyclique/api/src/recyclic_api/services/category_service.py` |
| Visibilité / ordre / tickets | `recyclique/api/src/recyclic_api/services/category_management.py` |
| Import / export (appelés par le routeur) | `recyclique/api/src/recyclic_api/services/category_import_service.py`, `category_export_service.py` |
| DB | `recyclique/api/src/recyclic_api/core/database.py` — `get_db` → `Session` |
| Modèles | `recyclique/api/src/recyclic_api/models/category.py` |

### Cartographie appelants (obligatoire avant merge)

Éviter toute régression : tout **`await`** vers une méthode de **`CategoryService`** doit être aligné si la méthode devient synchrone.

**Appelants connus au 2026-04-22 (à re-vérifier avec `rg`) :**

| Module | Rôle |
|--------|------|
| `api/api_v1/endpoints/categories.py` | **`await service.*`** sur `CategoryService` et **`await`** sur `CategoryManagementService` — **cœur du refactor**. |
| `services/category_management.py` | **`await self.category_service.get_categories(...)`** — aligner avec le service. |

**Non-appelants utiles à connaître (éviter les fausses pistes) :**

- `services/legacy_import_service.py` : instancie **`CategoryService`** dans `__init__` mais **n’appelle aucune méthode** dans le fichier — pas de `await` à migrer ici ; hors obligation de « nettoyage » mort pour cette story sauf instruction du Story Runner.
- `api/api_v1/endpoints/reception.py` : **import** `CategoryService` présent ; le libellé catégorie utilise la relation ORM (`ligne.category`) — **pas** un appel `await` au service dans les blocs repérés ; ne pas étendre le refactor réception hors périmètre **categories**.

**Contrôle rapide** (depuis `recyclique/api`) :

```text
rg "await.*service\\.|await self\\.category_service" src/recyclic_api/api/api_v1/endpoints/categories.py src/recyclic_api/services/category_management.py src/recyclic_api/services/category_service.py
```

(Sous PowerShell, préférer `rg 'await\..*service\.|await self\.category_service'` ou équivalent si les guillemets posent problème.)

### Interdits / risques

- **Ne pas** étendre le refactor à tout le dépôt dans cette story — **pilote categories** uniquement ; les autres modules suivront la **note** et des stories ultérieures (**26.4** / **26.5** restent séparées).
- **Ne pas** mélanger sans le documenter : si un endpoint doit rester `async` (ex. streaming, sous-appel await réel), le justifier dans la note ou un commentaire **bref** sur la route.
- **F9** : ne pas refactorer `ConflictError` / `exceptions.py` sauf nécessité directe liée aux changements (hors scope nominal).
- **Post-26.1** : ne pas réintroduire **`AdminService`**.

### Testing / gates (Story Runner parent)

Exécuter depuis le répertoire `recyclique/api` :

- `python -m compileall src/recyclic_api -q`
- Peloton **categories** (ajuster si la suite complète est exigée par le parent) :
  - `python -m pytest tests/api/test_categories_endpoint.py tests/test_category_create_arch03.py tests/test_category_update_arch03.py tests/test_category_soft_delete_arch03.py tests/test_category_soft_delete_b48_p1.py tests/test_category_restore_arch03.py tests/test_category_hard_delete_arch03.py tests/test_category_management_arch03.py tests/test_category_export.py tests/test_category_import_price_logic.py tests/test_categories_import.py tests/test_category_display_name_b48_p5.py tests/test_category_price_removal.py tests/test_integration_category_migration.py tests/test_sales_stats_by_category.py --tb=short`

**Gate minimal hérité Epic 26** : `python -m pytest tests/test_infrastructure.py` — rester **vert** après changement.

Si le parent impose le **peloton 34 tests** ou la suite complète API, appliquer la commande du **Story Runner** ; l’**AC** « tests passent pour les modules touchés » est satisfaite par le peloton categories + `test_infrastructure.py` sauf instruction contraire.

### Fichiers probables — trace F7–F11 (`epic-26-cloture-f7-f11-trace.md`)

Mise à jour **du fichier de trace** en fin d’epic ou sur demande du parent. Pour le **DS** de la 26.3 :

| Fichier (probable) | F7 | F8 | F9 | F10 | F11 |
|--------------------|----|----|----|-----|-----|
| `endpoints/categories.py` | — | docstrings si API publique modifiée | — | — | — |
| `services/category_service.py` | — | docstrings | — | — | — |
| `services/category_management.py` | — | docstrings | — | — | — |
| Tests categories | isolation | — | — | — | — |

### Cross-story

- **26.4** (PEP 604) : ne pas en profiter pour une migration masse `Optional` dans `schemas/category.py` sauf **fichiers déjà touchés** pour cause de cette story et règle « pas de mélange de style » de 26.4.
- **26.5** (ruff) : pas de dépendance ; si une PR 26.5 touche les mêmes fichiers, **coordonner** avec l’équipe (cf. `epics.md`).

## Trace Epic 26 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante requise ? | **Non** — convention **sync** + note in-repo (fragment README, entrée `architecture/index.md`, ou stub ADR court) ; pas de nouvelle couche async DB. |

### Project Structure Notes

- Conserver la structure actuelle des paquets ; pas de renommage de module sauf nécessité technique.
- La note in-repo doit être **versionnée** dans le dépôt (pas seulement dans le chat).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 26, Story 26.3]
- [Source: `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` — §5.5, F2, §8, §9]
- [Source: `_bmad-output/planning-artifacts/research/technical-dette-qualite-api-audit-brownfield-research-2026-04-22.md` — §2 P1-b, §4 point 4]
- [Source: `recyclique/api/src/recyclic_api/services/category_service.py` — ORM sync (post-26-3 : `def`)]
- [Source: `recyclique/api/src/recyclic_api/api/api_v1/endpoints/categories.py` — `def` + `Session` (exception `async` : import analyze)]

## Change Log

- **2026-04-22** — DS : pilote **categories** — routes/services en **`def`** + ORM synchrone (Option A) ; **`async`** + commentaire sur **`POST` import analyze** (Option B, `await file.read()`) ; note architecture + `tests/README` + index ; tests ajustés (`MagicMock` vs `AsyncMock`) ; `compileall` + pytest peloton 151 (incl. `test_infrastructure`) verts.

## Dev Agent Record

### Agent Model Used

Cursor agent (sous-agent Task bmad-dev-story) — exécution automatisée du DS.

### Debug Log References

Aucun incident bloquant.

### Completion Notes List

- `CategoryService` / `CategoryManagementService` : méthodes en **`def`** (ORM sync).
- `categories.py` : majorité en **`def`** ; **`async def`** uniquement pour **`analyze_categories_import`** (commentaire Epic 26.3, `await file.read()` sur `UploadFile`).
- Doc : `2026-04-22-convention-routes-services-sync-orm-api-v1-epic-26.md` ; entrée **Dette qualité API (Epic 26)** dans `architecture/index.md` ; rappel PR dans `recyclique/api/tests/README.md`.
- Gates : `python -m compileall src/recyclic_api -q` ; `python -m pytest` peloton + `test_infrastructure` — **151 passed**.

### File List

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/categories.py`
- `recyclique/api/src/recyclic_api/services/category_service.py`
- `recyclique/api/src/recyclic_api/services/category_management.py`
- `recyclique/api/tests/test_category_create_arch03.py`
- `recyclique/api/tests/test_category_update_arch03.py`
- `recyclique/api/tests/test_category_restore_arch03.py`
- `recyclique/api/tests/test_category_hard_delete_arch03.py`
- `recyclique/api/tests/test_category_soft_delete_arch03.py`
- `recyclique/api/tests/test_category_management_arch03.py`
- `recyclique/api/tests/test_category_display_name_b48_p5.py`
- `recyclique/api/tests/test_category_soft_delete_b48_p1.py`
- `recyclique/api/tests/README.md`
- `_bmad-output/planning-artifacts/architecture/2026-04-22-convention-routes-services-sync-orm-api-v1-epic-26.md`
- `_bmad-output/planning-artifacts/architecture/index.md`
- `_bmad-output/implementation-artifacts/26-3-normaliser-async-orm-sync-pilote-categories.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

---

**Note BMAD :** story **done** (Story Runner 2026-04-22 : CS→VS→DS→GATE→QA→CR).
