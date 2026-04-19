# Audit brownfield — Recyclic API (architecture, style, technologies)

**Date :** 2026-04-19  
**Périmètre :** `recyclique/api/` — paquet Python `recyclic_api` sous `src/`  
**Objectif :** documenter ce qui est homogène vs hétérogène après plusieurs phases de développement et plusieurs contributeurs ; fournir préconisations, checklist de revue de changements et backlog refactor priorisé.

## Sommaire

1. [Méthode et sources](#1-méthode-et-sources)  
2. [Lexique : PR, checklist, backlog refactor](#2-lexique--pr-checklist-backlog-refactor)  
3. [Synthèse exécutive](#3-synthèse-exécutive)  
4. [Inventaire technique (socle commun)](#4-inventaire-technique-socle-commun)  
5. [Patrons d’architecture observés](#5-patrons-darchitecture-observés)  
6. [Tests et qualité](#6-tests-et-qualité)  
7. [Findings consolidés](#7-findings-consolidés-liste-vérifiable)  
8. [Checklist — revue de PR](#8-checklist--revue-de-pr-recyclic-api)  
9. [Backlog refactor priorisé](#9-backlog-refactor-priorisé-artefacts-dette)  
10. [Préconisations](#10-préconisations--cadre-pour-futurs-développements)  
11. [Conclusion](#11-conclusion)  
12. [Annexes](#12-annexes--rappels-des-explorations-détaillées-contenu-synthétisé)

---

## 1. Méthode et sources

### 1.1 Démarche

- Exploration **en lecture seule** déléguée à des sous-agents Cursor « explore » sur trois axes :
  - structure, dépendances, Docker, migrations, configuration ;
  - patrons applicatifs (routes, services, repositories, sync/async, erreurs, typage) ;
  - suite de tests pytest (`tests/`, `conftest.py`, fixtures, mocks).
- Synthèse orchestrateur complétée par des **vérifications ponctuelles** dans le dépôt (chemins de fichiers, recherche de références croisées).

### 1.2 Reproductibilité (sessions agents)

Pour approfondir un axe, utiliser une **nouvelle exploration ciblée** avec brief (dossiers, questions). Les identifiants internes de jobs Cursor ne sont pas une garantie de reprise mécanique d’une session ultérieure.

### 1.3 Limite déclarée

Cet audit **ne couvre pas** ligne par ligne chaque endpoint ni chaque service — il décrit les **motifs dominants** et les **exceptions** avec des exemples vérifiables. Une passe métier (Paheko, caisse, réception, admin) peut être ajoutée en sous-mission.

---

## 2. Lexique : PR, checklist, backlog refactor

- **PR (Pull Request)** : proposition de **fusion** d’une branche Git vers une branche cible (souvent `main`). Avant fusion, l’équipe fait une **revue de code** : style, risques, tests, alignement avec les conventions du dépôt.
- **Checklist de revue PR** : liste de contrôle **réutilisable** pour le relecteur ou l’auteur avant ouverture / avant merge. Elle ne remplace pas les tests automatisés ; elle **réduit les oublis** de cohérence.
- **Backlog refactor** : inventaire **priorisé** de travaux de **restructuration** (sans changer le comportement métier idéalement), pour réduire la dette là où les écarts de style nuisent à la maintenance.

---

## 3. Synthèse exécutive

| Question | Réponse courte |
|----------|----------------|
| La stack est-elle unifiée ? | **Oui** — FastAPI, SQLAlchemy 2, Pydantic v2, Alembic, PostgreSQL, Redis, `pydantic-settings`. |
| L’architecture est-elle appliquée partout pareil ? | **Non** — couches **fines** ou **absentes** selon les domaines ; un seul **repository** généralisé (réception) ; un service **async** SQLAlchemy **non référencé** ailleurs. |
| Problème « plusieurs mondes » ? | Plutôt **plusieurs habits de code** (sync/async décoratif, logique dans la route vs service, `Optional` vs `T \| None`). |
| Faut-il tout réécrire ? | **Non** en général ; viser **garde-fous** (conventions, lint, PR checklist) et **refactors localisés** sur les zones les plus hétérogènes. |

---

## 4. Inventaire technique (socle commun)

### 4.1 Emplacements clés

| Rôle | Chemin typique |
|------|----------------|
| Application ASGI | `recyclique/api/src/recyclic_api/main.py` (`FastAPI`, instance `app`) |
| Configuration | `recyclique/api/src/recyclic_api/core/config.py` (`Settings`, `pydantic_settings`, `settings` singleton) |
| Session DB | `recyclique/api/src/recyclic_api/core/database.py` (`SessionLocal`, `get_db`) |
| API v1 | `recyclique/api/src/recyclic_api/api/api_v1/` (`api.py`, `endpoints/`) |
| API v2 | `recyclique/api/src/recyclic_api/api/api_v2/` (surface plus réduite ; ex. `endpoints/exploitation.py`) |
| Schémas Pydantic | `recyclique/api/src/recyclic_api/schemas/` |
| Modèles ORM | `recyclique/api/src/recyclic_api/models/` |
| Services | `recyclique/api/src/recyclic_api/services/` (**~56** fichiers `.py` hors `__init__.py`) |
| Repositories | `recyclique/api/src/recyclic_api/repositories/` — **un fichier** utile au moment de l’audit : `reception.py` |
| Cas d’usage / présentation | `recyclique/api/src/recyclic_api/application/` — quelques modules ciblés (réception, caisse) |
| Migrations | `recyclique/api/migrations/`, `alembic.ini` à la racine `recyclique/api/` |
| Tests | `recyclique/api/tests/` (ordre de **~centaines** de fichiers de test recensés lors de l’exploration) |
| Dépendances | `recyclique/api/requirements.txt` (commentaires : aligné avec `pyproject.toml`), `requirements-dev.txt`, `requirements-migrations.txt` |

### 4.2 Versions et exécution

- **Python :** `>=3.11` (`pyproject.toml`), images Docker `python:3.11-slim`.
- **Lancement typique :** `uvicorn recyclic_api.main:app` (voir `recyclique/api/Dockerfile`).

### 4.3 Dépendances majeures (extrait indicatif)

- Web : FastAPI, Uvicorn  
- Persistance : SQLAlchemy, Alembic, `psycopg2-binary`  
- Cache / bus : Redis  
- Config / validation : Pydantic, pydantic-settings  
- Auth / sécurité : python-jose, passlib/bcrypt  
- Observabilité / limites : slowapi, prometheus-client  
- Intégrations : httpx, jsonschema, SDK email, WebDAV, génération PDF / tableur, etc.

### 4.4 Taille indicative des surfaces

- **Endpoints v1 :** ~42 modules dans `api_v1/endpoints/` (hors `__init__.py`).
- **Endpoints v2 :** surface minime (ex. un module métier `exploitation.py` + `__init__.py`).
- **Services :** ~56 modules.

---

## 5. Patrons d’architecture observés

### 5.1 Couche « nominale »

Pattern récurrent :

`endpoint FastAPI` → `Depends(get_db)` → instanciation `SomeService(db: Session)` → ORM → schémas Pydantic en réponse.

Les **dépendances FastAPI** (`get_current_user`, `require_role_strict`, etc.) restent le mécanisme d’injection principal — **pas** de conteneur IoC externe.

### 5.2 Réception : pattern plus structuré

- `repositories/reception.py` : dépôts avec session injectée.
- `services/reception_service.py` : orchestre les dépôts.
- C’est la zone qui se rapproche le plus d’un **modèle en couches classique**.

### 5.3 Hors réception : ORM souvent dans le service

- Beaucoup de services exécutent des requêtes ORM (`Session.query()` / équivalent SQLAlchemy) directement sans couche repository dédiée — acceptable si assumé globalement ; sinon cela crée une **double norme** avec la réception.

### 5.4 Routes « grasses » (exception)

Exemple documenté pendant l’audit : `admin_users_groups.py` — logique et requêtes **dans le fichier d’endpoints** plutôt que dans un service dédié ; handlers parfois `def` là où d’autres modules utilisent systématiquement `async def`.

Fichier : `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_users_groups.py`.

### 5.5 Sync vs async

- **Moteur / session SQLAlchemy : synchrones.**
- Nombreux endpoints `async def` avec code ORM **bloquant** : comportement courant mais **pas** de parallélisme I/O sur la base ; les méthodes `async` sur des services qui font uniquement du sync ORM **n’ajoutent pas** de vrai async (risque de confusion pour les mainteneurs).

### 5.6 `AdminService` (SQLAlchemy async)

- Fichier : `recyclique/api/src/recyclic_api/services/admin_service.py` (`AsyncSession`, `select`, `await execute`).
- **Aucune autre occurrence** de `AdminService` dans `recyclique/api` au moment de la vérification — **code orphelin ou branche jamais câblée**, en fort contraste avec le reste (sessions synchrones).

### 5.7 Exceptions et erreurs HTTP

- Exceptions métiers : `recyclique/api/src/recyclic_api/core/exceptions.py`.
- Conversion fréquente vers `HTTPException` dans les routes ; enveloppe globale dans `main.py` (dont `HTTPException`, `RequestValidationError` avec schéma d’erreur projet).

### 5.8 Typage Pydantic / Python

- **Coexistence** de `Optional[T]` (héritage) et de `T | None` (style récent PEP 604) dans `schemas/` — les gros fichiers métier (`sale.py`, `cash_session.py`, `user.py`, etc.) utilisent encore massivement `Optional`.
- Fichiers plus récents ou transverses : tendance `str | None`, `UUID | str | None`, etc. (ex. `pin.py`, `recyclique_api_error.py`, `exceptional_refund.py`).

### 5.9 Dossier `application/`

Modules de **présentation / cas d’usage** partiels : exports, listes réception, ouverture / clôture caisse — **pas** une couche DDD complète ; utile comme **ilot** pour certains flux.

---

## 6. Tests et qualité

### 6.1 Outils

- **pytest** ; configuration dans `pyproject.toml` (`[tool.pytest.ini_options]`) **et** `pytest.ini` à la racine `recyclique/api/`.

### 6.2 Hiérarchie de configuration pytest

- **`pyproject.toml`** : section **`[tool.pytest.ini_options]`** — dans ce dépôt, elle est présentée comme **référence principale** pour pytest (`addopts` avec `-v`, `--tb=short`, marqueurs documentés).
- **`pytest.ini`** : fichier **légué / compatibilité** — marqueurs (`integration_db`, `performance`, `no_db`), **`filterwarnings`**, et **`addopts = -q`** (verbeux réduit).

**Synthèse :** une **seule vérité documentaire** devrait suffire ; tant que les deux fichiers coexistent, **pytest fusionne** les options : le risque est un mélange **quiet + verbose** ou des surprises selon l’ordre de chargement. Action recommandée : **désigner explicitement** la source maître (souvent `pyproject.toml`) et **aligner ou retirer** les options contradictoires dans `pytest.ini`, ou inversement selon décision d’équipe.

### 6.3 `conftest.py`

- Fixtures lourdes : SQLite partiel (`create_all` restreint, `ALTER` de rattrapage), rollback transaction, Redis en mémoire (`MemoryRedisForTests`), clients `TestClient` / httpx async.
- **Isolation** : documentée comme **non parfaite** ; certains tests peuvent **commit** — effets de bord possibles entre tests dans des scénarios limites.

### 6.4 Nature des tests

- Majorité : **tests d’API** avec `TestClient` + **vraie pile ORM** (SQLite fichier temporaire ou Postgres si configuré) — **intégration légère** plutôt qu’unitaires purs.
- Marqueurs : `integration_db`, `performance`, `no_db` — **couverture inégale** des fichiers de test.
- Naming : `test_story_*`, `*_integration`, `*_arch03` — traçabilité métier forte, **non miroir** strict de `src/`.

### 6.5 Outils déclarés vs usage

- **pytest-mock** présent dans les deps dev ; usage dominant des tests : **unittest.mock** (`patch`, `MagicMock`) — pas un problème fonctionnel, mais **l’outil installé est sous-utilisé**.

### 6.6 Documentation tests

- `recyclique/api/tests/README.md` référence un guide nommé **`TESTS_STABILIZATION_GUIDE.md`** : ce fichier **n’est pas présent** dans le dépôt au **2026-04-19** (recherche sous `recyclique/api/`). **Action :** mettre à jour le README (lien corrigé, section archive, ou création du guide si toujours d’actualité).

---

## 7. Findings consolidés (liste vérifiable)

| # | Finding | Gravité maintenance | Indices / chemins |
|---|---------|---------------------|-------------------|
| F1 | Double norme **repository** : réception oui, reste souvent non | Moyenne | `repositories/reception.py` vs services divers |
| F2 | `async def` + **ORM sync** sans `run_in_executor` | Faible à moyenne | Ex. `category_service.py`, endpoints associés |
| F3 | **AdminService** async non utilisé | Moyenne (bruit, dette) | `services/admin_service.py` ; grep `AdminService` |
| F4 | **Routes avec logique inline** | Moyenne | `endpoints/admin_users_groups.py` (exemple cité) |
| F5 | **`Optional` vs `T \| None`** mélangés | Faible (style) | `schemas/*.py` |
| F6 | **Deux configs pytest** potentiellement contradictoires | Moyenne CI locale | `pytest.ini` vs `pyproject.toml` |
| F7 | Tests intégration-majority, isolation imparfaite | Moyenne fiabilité | `tests/conftest.py` |
| F8 | **Langue** docstrings FR/EN mélangée (prod + tests) | Faible gouvernance | Fichiers `tests/` et `recyclic_api/` |

---

## 8. Checklist — revue de PR (Recyclic API)

À cocher par l’**auteur** avant demande de relecture, et par le **relecteur** avant merge.

### 8.1 Alignement architectural

- [ ] La logique métier nouvelle ou modifiée vit dans un **service** (ou un use case `application/`) plutôt que dans l’endpoint, **sauf** exception justifiée (wrapper mince).
- [ ] Pas de **requête ORM** volumineuse directement dans l’endpoint — déplacer vers service / fonction dédiée.
- [ ] Si le domaine est **réception** ou un domaine qui introduit persistance complexe : **réutiliser** le pattern repository existant ou **documenter** pourquoi non.

### 8.2 Async et base de données

- [ ] Si l’endpoint est `async def` : le code bloquant long (ORM, CPU) est-il **acceptable** ici ou délégué (`asyncio.to_thread`, etc.) ? (Sinon préférer `def` pour clarité.)
- [ ] Pas de mélange **AsyncSession** / **Session** dans le même flux sans **documentation** explicite.

### 8.3 Typage et schémas

- [ ] Nouveaux champs : convention `T | None` pour les optionnels **ou** alignement avec le fichier existant (ne pas mélanger dans un même schéma sans raison).
- [ ] Schémas Pydantic : `model_config`, `Field`, validateurs — cohérents avec les modules voisins.

### 8.4 Erreurs et contrats

- [ ] Exceptions métiers : sous-classes de `RecyclicException` où pertinent ; réponse HTTP cohérente (`HTTPException` / schéma erreur projet).
- [ ] **OpenAPI** : réponses d’erreur documentées si nouveau endpoint public.

### 8.5 Tests

- [ ] Au moins un test **régressif** (API `TestClient` ou test unitaire ciblé) pour le correctif ou la feature.
- [ ] Si Postgres / comportement spécifique : marqueur `integration_db` ou stratégie documentée.
- [ ] Pas de **commit** inutile dans les tests qui cassent l’isolation globale ; respecter les patterns du `conftest`.

### 8.6 Configuration et dépendances

- [ ] Pas de **secret** dans le code ; variables via `settings`.
- [ ] Si nouvelle dépendance : `requirements.txt` + `pyproject.toml` synchronisés (commentaire projet).

### 8.7 Style outillé

- [ ] **black** / **isort** (ou équivalent futur **ruff format**) passent sur les fichiers touchés.
- [ ] Pas de warnings **flake8** nouveaux sur les lignes modifiées (si flake8 utilisé localement).

---

## 9. Backlog refactor priorisé (artefacts de dette)

**Légende :** **P0** = vite utile ; **P1** = planifiable sprint ; **P2** = quand possible.

| Priorité | Action | Fichiers / zone | Justification |
|----------|--------|-----------------|---------------|
| **P0** | Trancher **une seule config pytest** maîtresse ; retirer ou synchroniser l’autre | `recyclique/api/pytest.ini`, `recyclique/api/pyproject.toml` | Évite écarts CI vs poste dev |
| **P0** | Décider du sort de **AdminService** : supprimer, brancher, ou documenter « expérimental » | `recyclique/api/src/recyclic_api/services/admin_service.py` | Élimine couche morte / confusion async |
| **P1** | Extraire logique des **admin groups** vers un **service** | `.../endpoints/admin_users_groups.py` + nouveau `*_service.py` | Uniformise « route mince » |
| **P1** | Normaliser **async** sur endpoints : soit **vrais async** (I/O non bloquants), soit `def` pour ORM sync explicite | Modules type `categories.py`, `category_service.py` et similaires | Lisibilité + moins de faux positifs perf |
| **P1** | Convention **`Optional` → `T \| None`** sur fichiers touchés progressivement | `recyclique/api/src/recyclic_api/schemas/` | Convergence PEP 604 |
| **P2** | Documenter ou généraliser **repository** au-delà de la réception | `repositories/` | Réduit double norme si besoin métier |
| **P2** | Introduire **ruff** (lint + format) aligné sur black/isort | Racine `recyclique/api/` | Garde-fou automatique |
| **P2** | Corriger la doc tests : lien vers **`TESTS_STABILIZATION_GUIDE.md`** (absent au 2026-04-19) | `recyclique/api/tests/README.md` | Évite lien mort ; restaure traçabilité |

---

## 10. Préconisations — cadre pour futurs développements

1. **ADR court interne** (1–2 pages) : règles sur **où** vit la logique, **quand** utiliser `async def`, comment nommer services/schemas, et politique d’erreurs.
2. **« Definition of Done »** API : PR + tests + conformité checklist §8 + pas de duplication de config.
3. **Refactors** : petits mouvements fréquents lors des **tickets** qui touchent déjà une zone — plutôt que refonte massive.
4. **Observabilité** : conserver une approche homogène sur les logs structurés / corrélations quand on touche `middleware` ou `exceptions`.

---

## 11. Conclusion

Le dépôt **n’est pas** un empilement de technologies incompatibles : **une seule famille** de stack moderne Python / FastAPI / SQLAlchemy 2 / Pydantic 2. Les écarts relevés sont surtout des **habitudes de structuration** (couches, async, typage) et des **artefacts de durée de vie** (service orphelin, double config pytest). Une **couche d’unification documentaire + garde-fous CI** suffit pour la plupart des chantiers ; des **refactors localisés** amélioreront la lisibilité sans « rewrite » globale.

---

## 12. Annexes — rappels des explorations détaillées (contenu synthétisé)

### A. Structure & stack (exploration dédiée)

- Arborescence `src/recyclic_api` avec `api_v1` / `api_v2`, `application`, `core`, `models`, `schemas`, `services`, `middleware`, `utils`, `data`.
- `main.py` crée l’app FastAPI ; routers agrégés depuis `api_v1/api.py` et `api_v2`.
- Docker : plusieurs Dockerfile (`Dockerfile`, `Dockerfile.migrations`, `Dockerfile.tests`) ; Python 3.11 ; `PYTHONPATH=/app/src` dans l’image API.
- Alembic : `migrations/env.py` avec `Base.metadata` ; `DATABASE_URL` via settings.
- `requirements.txt` aligné avec `pyproject.toml` (commentaire explicite dans `pyproject.toml`).

### B. Patrons applicatifs (exploration dédiée)

- Comparaison représentative : `sites.py` + `site_service.py` (route relativement mince) vs `categories.py` + `category_service.py` (async + ORM sync) vs `admin_users_groups.py` (logique dans route) vs `reception_service.py` + repositories vs `admin_service.py` (async isolé).

### C. Tests (exploration dédiée)

- ~249 fichiers `.py` sous `tests/` (nombre indicatif à la date d’audit).
- `collect_ignore` pour certains fichiers legacy ; style mock **unittest.mock** dominant.

---

### Revue QA (2026-04-19)

Rapport fusionné QA2 sur ce handoff : priorité aux correctifs éditoriaux (tableaux, lien guide tests, hiérarchie pytest, sommaire, checklist, cohérence du typage markdown). Revue technique : aucune erreur bloquante recoupée sur les faits vérifiables au moment du passage.

---

*Fin du document — handoff audit Recyclic API 2026-04-19.*
