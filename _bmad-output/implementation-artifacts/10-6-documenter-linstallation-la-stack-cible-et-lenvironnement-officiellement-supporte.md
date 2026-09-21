# Story 10.6 : Documenter l'installation, la stack cible et l'environnement officiellement supporté

Status: review

**Story ID :** 10.6  
**Story key :** `10-6-documenter-linstallation-la-stack-cible-et-lenvironnement-officiellement-supporte`  
**Epic :** epic-10 — Industrialiser, valider et rendre la v2 deployable  

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-09-21. PRD §11.5 / §13.2 ; FR installabilité ; synthèse parente des sous-stories 10.6b–10.6e déjà done. -->

## Story

En tant que **déployeur futur ou ressourcerie adoptante**,  
je veux que **l'installation**, la **stack cible** et l'**environnement officiellement supporté** soient **documentés et reproductibles**,  
afin que la v2 puisse être **installée et évaluée** hors de la tête de l'auteur, avec des **frontières de support explicites**.

## Story Preparation Gate (énumération obligatoire — figée au CS)

Les **six piliers** du lot d'installabilité (alignés `epics.md` Story 10.6 + PRD §11.5) :

| # | Pilier | Intention | Ancres existantes (ne pas réinventer) |
|---|--------|-----------|----------------------------------------|
| **1** | **`stack_services`** | Décrire les **cinq services** de la stack cible v2 : **Recyclique API**, **Peintre_nano**, **Paheko**, **PostgreSQL**, **Redis** — rôles, ports locaux documentés, dépendances | `docker-compose.yml` racine ; `recyclique/api/` ; `peintre-nano/` ; service `paheko` (image pinée) ; `README.md` racine |
| **2** | **`debian_reference`** | **Debian** = environnement **officiel** unique v2 (OS hôte de référence pour install documentée) | PRD §11.5 ; `_bmad-output/planning-artifacts/architecture/archive/architecture.md` (installabilité Debian) |
| **3** | **`docker_entrypoint`** | **Un** point d'entrée Compose local documenté (déjà livré **10.6b**) | Story **10.6b** `done` ; `README.md` § Stack Docker ; `tests/infra/test_docker_compose_entrypoint.py` |
| **4** | **`postgresql_17`** | Stack canonique sur **PostgreSQL 17** + migration données documentée (sous-stories **10.6c–10.6e** `done`) | Runbook `_bmad-output/planning-artifacts/operations/runbook-spike-postgresql-15-vers-17.md` ; ADR `adr-postgresql-17-migration.md` ; smokes `test_story_10_6c_pg17_doc_smoke.py`, `test_story_10_6e_pg17_backend_smoke.py` |
| **5** | **`browser_matrix`** | Matrice **navigateurs officiels** publiée **avec** la doc d'installation du cœur web | PRD §web_app (~l.543) : Chromium stable + Firefox ESR ; Edge récent best-effort |
| **6** | **`nominal_install_complete`** | Critère « install nominale complète » : **shell authentifié** + **premier contexte exploitable** sans édition manuelle de base (PRD §11.5) | `docker-compose.yml` (`FIRST_SUPER_ADMIN_*`) ; migrations `api-migrations` ; observabilité post-install → `doc/observability-support-runbook.md` (**10.5**) |

**Hors périmètre des piliers ci-dessus en 10.6 :** gates **beta / v2 vendable** (**10.7**) ; readiness globale (**10.8**) ; réécriture des runbooks **10.6c–10.6e** ; automatisation déploiement **staging/prod** legacy (`recyclique-1.4.4/docker-compose.*.yml`) ; **HelloAsso** comme prérequis install minimale (connecteur métier — PRD) ; nouvelle stack observabilité (**10.5** déjà `done`).

## Décisions Ombre / pilotage (2026-09-21)

- **Séquence L0** : **10.1** (`review` — ne pas promouvoir `done`) → **10.2** / **10.3** / **10.4** / **10.5** **`done`** → **10.6** (cette story) avant **10.7** (gates beta) et **10.8**.
- **Sous-stories infra** : **10.6b**, **10.6c**, **10.6d**, **10.6e** sont **`done`** — **10.6** = **synthèse produit** (doc officielle + matrice support), **pas** reprise des chantiers PG17 / point d'entrée.
- **Frontière** : documenter l'**officiel**, ne pas cumuler les variantes historiques (`recyclique-1.4.4/` = compat / staging-prod transitoire, clairement **hors stack supportée v2** pour une install neuve).
- **Dev local vs Debian** : le chemin **Docker Compose racine** reste le **parcours minimal documenté** pour développement et preuve d'installabilité ; la doc **10.6** ajoute la **couche Debian hôte** (prérequis Docker Engine/Compose, réseau, sauvegardes) sans imposer un playbook Ansible complet.
- **C2b / `v2.0.0`** : hors scope.

## Acceptance Criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 10.6** (traduction exécutable ci-dessous). Traçabilité : **PRD §11.5**, **§13.2** (matrice environnements avant RC v2).

1. **Manifeste machine-readable de la stack officielle** — Étant donné que v2 cible une stack de déploiement de référence, quand la documentation d'installation est préparée, alors le dépôt contient **`doc/supported-stack-official.yaml`** avec : `version`, `story: "10.6"` ; section **`official_os`** (`debian`, version minimale **documentée** — ex. Debian 12 bookworm ou équivalent explicite dans le YAML) ; section **`installability_pillars`** reprenant **exactement** les six clés du Story Preparation Gate (`stack_services`, `debian_reference`, `docker_entrypoint`, `postgresql_17`, `browser_matrix`, `nominal_install_complete`) avec pour chacune un `summary` (1 ligne) et les `ac_refs` associés ; section **`services`** listant **exactement** les clés `recyclique_api`, `peintre_nano`, `paheko`, `postgresql`, `redis` avec pour chacune : `role`, `canonical_path` (si applicable), `compose_service` (nom du service dans `docker-compose.yml` racine — ex. `api`, `frontend`, `paheko`, `postgres`, `redis` — ou `null` si externe), `default_local_port` (si exposé), `required_for_minimal_install` (bool) ; section **`compose_auxiliary_services`** listant les services **hors** install minimale v2 documentée (ex. `api-migrations`, `frontend-legacy`) avec `role` et `excluded_from_minimal_up` (bool) ; section **`sub_stories_index`** pointant vers les fichiers story **10.6b–10.6e** `done` et leurs livrables (chemins, **sans** dupliquer le corps des runbooks) ; section **`doc_anchors`** listant les chemins Markdown que la doc humaine **doit** maintenir synchronisés.

2. **Guide d'installation humain (chemin minimal)** — Étant donné qu'un adoptant part d'un hôte **Debian** vierge ou d'une VM de référence, quand il suit la doc **10.6**, alors **`doc/installation-stack-officielle.md`** décrit un **chemin minimal ordonné** (numéroté) : prérequis hôte (Docker Engine + Compose plugin, utilisateur, ports locaux documentés **8000** (API), **4444** (Peintre_nano), **8080** (Paheko), **5432** (PostgreSQL), **6379** (Redis) — **4445** (`frontend-legacy`) **hors** install v2 documentée) ; création `.env` à la racine (copie depuis `recyclique-1.4.4/env.example` — **assumption** : template legacy jusqu'à relocation future ; variables **minimales** `POSTGRES_PASSWORD`, `SECRET_KEY`, `FIRST_SUPER_ADMIN_*` si première install, `PAHEKO_*` si intégration comptable active) ; **`docker compose up --build postgres redis api-migrations api paheko frontend`** **depuis la racine** (**sans** `frontend-legacy` — aligné AC3 / frontière legacy) : le service **`api-migrations`** s'exécute **avant** `api` via `depends_on` (`service_completed_successfully`) au premier démarrage — **ne pas** présenter un second `docker compose run --rm api-migrations` comme étape obligatoire du happy path (réservé **reprise** si migrations en échec) ; vérification **`GET /health`** sur `:8000` (liveness — aligné **10.5** / compose) ; accès UI **`http://localhost:4444`** ; checklist **install nominale complète** PRD §11.5 : connexion shell authentifié + premier contexte exploitable (étapes explicites ou renvoi procédure admin / `FIRST_SUPER_ADMIN_*`) ; section **Paheko** (**posture unique figée**) : service **`paheko` inclus** dans la commande `up` ci-dessus (5ᵉ service officiel) ; rôle comptable, URL **`http://localhost:8080`**, variables `PAHEKO_*` documentées — l'API peut démarrer sans comptabilité configurée mais la stack **officielle** documentée inclut Paheko démarré.

3. **Matrice support officiel vs best-effort** — Étant donné que le projet cible **Debian** comme seul environnement **officiellement supporté** v2, quand les frontières sont documentées, alors **`doc/installation-stack-officielle.md`** contient un tableau **Support** avec au minimum les lignes : **Debian** (officiel) ; **Dérivés type Ubuntu** (best-effort communauté, hors matrice support) ; **Windows / macOS** (dev via Docker Desktop — **hors support officiel**, renvoi `README.md` existant) ; **Navigateurs** : matrice PRD (Chromium stable, Firefox ESR = support nominal ; Edge récent = best-effort) ; **HelloAsso** : présent au catalogue connecteurs, **pas** prérequis install cœur ; **staging/prod legacy** sous `recyclique-1.4.4/` : transitoire, **non** chemin d'install v2 documenté.

4. **Index et cohérence avec 10.6b–10.6e (sans duplication)** — Étant donné que les sous-stories infra sont **`done`**, quand **10.6** est livrée, alors le guide cite **une fois** les livrables canoniques : point d'entrée (**10.6b** → `README.md`) ; spike PG17 (**10.6c** → runbook operations) ; image compose **postgres:17** (**10.6d**) ; smoke Alembic PG17 (**10.6e**) ; **`doc/installation-stack-officielle.md`** ne recopie pas le runbook migration — **liens relatifs** uniquement ; **`references/artefacts/2026-04-07_01_validation-stack-locale-peintre-nano.md`** est **annoté** (note en tête ou renvoi depuis le guide) pour refléter **PostgreSQL 17** (l'artefact mentionne encore PG15 historiquement — **10.6** ajoute une note de bascule, ne réécrit pas tout l'artefact sauf si une ligne d'avertissement suffit).

5. **Lien observabilité post-install (10.5)** — Étant donné qu'une install réussie doit rester **diagnostiquable**, quand la doc **10.6** est complète, alors une section **« Après installation — support »** renvoie vers **`doc/observability-support-runbook.md`** (santé canonique, corrélation, fil sync) — **sans** dupliquer le runbook.

6. **Industrialisation doc / CI** — Étant donné le même workflow **`ci-minimal.yml`**, quand **10.6** est livrée, alors **`doc/ci-minimal.md`** contient une section **§10.6** listant les commandes de **smoke doc install** ; **`tests/infra/test_story_10_6_installation_doc_smoke.py`** vérifie : existence `doc/supported-stack-official.yaml` et `doc/installation-stack-officielle.md` ; les **5** clés `services` ; section **`installability_pillars`** (six clés) ; présence mot-clé **Debian** + tableau support ; mention **ports** 8000/4444/8080/5432/6379 et exclusion explicite **4445** legacy ; liens vers runbook PG17 et `README.md` ; assertions alignées AC2 (`GET /health`, UI `:4444`, checklist install nominale) **et AC5** (section post-install + lien **`doc/observability-support-runbook.md`**) ; **`README.md` racine** contient un lien vers **`doc/installation-stack-officielle.md`** (section « Voir aussi » ou équivalent) ; smoke **`tests/infra/test_story_10_6_installation_ci_minimal_smoke.py`** (**obligatoire** pour DoD / gates Story Runner) vérifie §10.6 dans `doc/ci-minimal.md` ; **interdit** (FM3) : modifier les smokes **10.6c/10.6e** existants sauf correction de lien cassé ; **pas** d'ajout des smokes **10.6** dans le peloton **10.4**.

7. **Hors scope explicite** — Étant donné les frontières Epic 10, quand cette story est revue, alors **ne pas** livrer : **10.7** / **10.8** ; playbook déploiement production automatisé ; migration données prod réelle ; extension support OS au-delà de la matrice ; refonte **10.5** ; correction **10.1** bandeau-live ; portage fonctionnel **`recyclique-1.4.4/`** ; matériel minimal performance (PRD §11.4) — **mention** autorisée comme renvoi futur « guide performance » si absent, **sans** bloquer 10.6.

## Matrice de traçabilité (C12)

| Pilier (gate) | AC principaux |
|---------------|---------------|
| `stack_services` | **1**, **2** |
| `debian_reference` | **3** |
| `docker_entrypoint` | **2**, **4** |
| `postgresql_17` | **1**, **4** |
| `browser_matrix` | **3** |
| `nominal_install_complete` | **2**, **5** |

| AC | Tâches (Tasks / Subtasks) | Fichiers / artefacts | Gate Story Runner |
|----|---------------------------|----------------------|-------------------|
| **1** Manifeste YAML | Créer `supported-stack-official.yaml` | `doc/supported-stack-official.yaml` | 5 services + `official_os` + **`installability_pillars`** + auxiliaires compose |
| **2** Guide install | Rédiger chemin minimal Debian/Docker | `doc/installation-stack-officielle.md` | Étapes ordonnées + critère shell auth |
| **3** Matrice support | Tableau officiel / best-effort | `doc/installation-stack-officielle.md` | Debian + navigateurs PRD |
| **4** Index 10.6b–e | Liens, note PG15→17 artefact | guide + YAML `sub_stories_index` | Pas de copie runbook PG |
| **5** Lien 10.5 | Section post-install | `doc/installation-stack-officielle.md` | Renvoi runbook observabilité |
| **6** CI doc | §10.6 + smokes infra | `doc/ci-minimal.md`, `tests/infra/test_story_10_6_*.py`, `README.md` | smokes **verts** |
| **7** Hors scope | Revue périmètre | Dev Notes § Frontières | Pas 10.7/10.8/prod auto |

## Tasks / Subtasks

- [x] **`doc/supported-stack-official.yaml`** — Structure gate §1 : `official_os`, **`installability_pillars`** (6 clés gate), `services` (5 clés + `compose_service` / ports), `compose_auxiliary_services`, `sub_stories_index`, `doc_anchors`. (AC : 1, 4)

- [x] **`doc/installation-stack-officielle.md`** — Chemin minimal ; matrice support ; index 10.6b–e ; navigateurs PRD ; section post-install → observabilité **10.5**. (AC : 2, 3, 4, 5)

- [x] **`README.md` racine** — Lien visible vers `doc/installation-stack-officielle.md` ; conserver cohérence avec section Docker existante (pas de contradiction de point d'entrée). (AC : 6)

- [x] **Note artefact validation locale** — Ajouter en tête de `references/artefacts/2026-04-07_01_validation-stack-locale-peintre-nano.md` une note « historique PG15 → voir PG17 / runbook 10.6c » **ou** renvoi équivalent depuis le guide uniquement (choix minimal). (AC : 4)

- [x] **`doc/ci-minimal.md` §10.6** — Commandes : `pytest tests/infra/test_story_10_6_installation_doc_smoke.py` **et** `pytest tests/infra/test_story_10_6_installation_ci_minimal_smoke.py`. (AC : 6)

- [x] **Smoke doc install** — `tests/infra/test_story_10_6_installation_doc_smoke.py` : parse YAML (`installability_pillars`, auxiliaires compose) ; assertions Markdown (Debian, 5 services, ports, commande `up` sans legacy, health/UI/install nominale, liens runbook/README). (AC : 1, 2, 6)

- [x] **Smoke CI minimal** *(obligatoire DoD AC6)* — `tests/infra/test_story_10_6_installation_ci_minimal_smoke.py` : §10.6 présent et cohérent avec le smoke doc. (AC : 6)

- [x] **Frontière peloton / infra existante** — Ne pas modifier `doc/critical-core-peloton.yaml` ; ne pas dupliquer assertions `test_story_10_6c_pg17_doc_smoke.py` — seulement **référencer**. (AC : 6, FM3)

- [x] **Revue hors scope (AC7)** — Checklist : pas 10.7/10.8 ; pas playbook prod ; pas réouverture 10.6b–e ; pas HelloAsso obligatoire. (AC : 7)

- [x] **Sprint / story** — Après DS : Dev Agent Record, File List, `sprint-status.yaml` → **review** via Story Runner. (process BMAD)

## Dev Notes

### Frontières avec 10.5, 10.6b–10.6e, 10.7

| Sujet | **10.5 (`done`)** | **10.6b–10.6e (`done`)** | **10.6 (cette story)** | **10.7 / 10.8** |
|--------|-------------------|----------------------------|-------------------------|-------------------|
| Observabilité / support | Runbook + manifeste | — | **Renvoi** post-install | — |
| Point d'entrée Docker | — | **10.6b** README racine | **Synthèse** dans guide officiel | — |
| PostgreSQL 17 | — | Runbook + compose + smoke Alembic | **Index** + note PG15 artefact | — |
| Installabilité produit | Hors scope install | Pièces techniques | **Doc officielle** + matrice Debian | Gates beta / readiness globale |

### Hypothèses explicites (DS — ne pas rouvrir 10.6b–e)

| ID | Hypothèse | Validation DS (sans rouvrir stories `done`) |
|----|-----------|-----------------------------------------------|
| **A1** | Brownfield ci-dessus = état repo au DS | Checklist fichiers listés + `docker compose config` |
| **A2** | Livrables **10.6b–10.6e** / **10.5** stables aux chemins cités | Assertions existence chemins dans smokes **10.6** (pas re-audit contenu stories) |
| **A5** | `api-migrations` / `frontend-legacy` **hors** manifeste 5 services | Refléter dans YAML `compose_auxiliary_services` + guide |
| **A6** | Runbook **10.5** inchangé | Smoke doc : lien relatif valide |
| **A7** | `.env` template sous `recyclique-1.4.4/env.example` jusqu'à relocation | Documenter dans guide + note dans YAML |

### État des lieux (brownfield — ne pas réécrire)

- **Compose racine** : `docker-compose.yml` — `postgres:17`, `redis:7-alpine`, `api`, `frontend` (`peintre-nano`), `paheko`, `api-migrations` ; **`frontend-legacy`** (:4445) présent mais **exclu** du chemin minimal v2 documenté (AC2/AC3).
- **CI** : `ci-minimal.yml` — PG17 ; smokes **10.5** après peloton **10.4**.
- **Docs existantes** : `README.md` (Docker dev) ; runbook PG spike ; stories **10.6b–10.6e** ; **pas** encore de `doc/installation-stack-officielle.md` ni manifeste YAML dédié **10.6**.
- **Staging/prod** : fichiers sous `recyclique-1.4.4/` — documenter comme **transitoire**, pas comme install v2 cible.

### Architecture — patterns à respecter

- `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — orchestration Docker réelle (story **10.6b**).
- PRD §11.5 — une installation officielle, Debian, matrice navigateurs avec doc install.
- **Secrets** : ne pas committer `.env` ; exemples via `env.example` existant.

### Fichiers cibles probables

| Fichier | Action attendue |
|---------|-----------------|
| `doc/supported-stack-official.yaml` | Créer — manifeste |
| `doc/installation-stack-officielle.md` | Créer — guide humain |
| `doc/ci-minimal.md` | §10.6 |
| `README.md` | Lien vers guide officiel |
| `tests/infra/test_story_10_6_installation_doc_smoke.py` | Créer |
| `tests/infra/test_story_10_6_installation_ci_minimal_smoke.py` | Recommandé |
| `references/artefacts/2026-04-07_01_validation-stack-locale-peintre-nano.md` | Note PG17 (option minimale) |

### Modes de défaillance ciblés (FMEA)

| ID | Mode | Effet | Mitigation (10.6) | AC |
|----|------|-------|-------------------|-----|
| FM1 | Doc contradictoire README / guide | Adoptant perdu | Une hiérarchie : README dev → guide **10.6** officiel | **2**, **6** |
| FM2 | Oublier Debian / navigateurs PRD | Non-conformité §11.5 | Matrice AC3 + smoke | **3**, **6** |
| FM3 | Dupliquer runbook PG17 dans guide | Dette doc | Liens seulement ; smokes 10.6c inchangés | **4**, **6** |
| FM4 | Présenter legacy 1.4.4 comme officiel | Mauvaise install | Tableau support AC3 | **3**, **7** |
| FM5 | Scope creep 10.7 gates | Detour roadmap | Hors scope AC7 | **7** |
| FM6 | Casser smokes infra PG17 | Régression | Pas de modif 10.6c/e sauf lien | **6** |
| FM7 | Paheko omis ou posture floue | Stack officielle incomplète | Posture AC2 unique + port **8080** + FM7 dans guide | **1**, **2** |
| FM8 | Volume PG15 vs image **PG17** | Échec démarrage DB | Renvoi runbook **10.6c** + branche install neuve vs upgrade | **2**, **4** |
| FM9 | Ordre migrations mal documenté | Adoptant relance migrations inutilement | Happy path `depends_on` ; `run --rm` = reprise seulement | **2** |
| FM10 | Install nominale sans preuve auth | Non-conformité §11.5 | Checklist explicite + smoke doc mots-clés shell auth | **2**, **6** |
| FM11 | `docker compose up` naïf inclut legacy | Contredit AC3 | Liste services explicite AC2 ; FM11 dans guide | **2**, **3**, **7** |
| FM12 | §10.6 CI absent | Régression doc | Smoke CI minimal **obligatoire** DoD | **6** |

### Definition of Done (Story 10.6)

- [x] Les **7 AC** sont couverts : manifeste, guide, matrice, index sous-stories, lien 10.5, §10.6 CI, hors scope revu.
- [x] Les **six piliers** du Story Preparation Gate sont nommés dans le YAML et le guide.
- [x] Smokes infra **10.6** verts localement (`python3 -m pytest tests/infra/test_story_10_6_installation_doc_smoke.py -q` **et** `test_story_10_6_installation_ci_minimal_smoke.py -q`).
- [x] **Ne pas** forcer **10.1** à `done` ; **ne pas** rouvrir **10.5** ni **10.6b–10.6e**.
- [x] Story Runner : `sprint-status.yaml` → **review** après DS.

### Gates Story Runner (référence DS)

```bash
# Racine dépôt — smoke doc install 10.6
python3 -m pytest tests/infra/test_story_10_6_installation_doc_smoke.py -q
python3 -m pytest tests/infra/test_story_10_6_installation_ci_minimal_smoke.py -q

# Régression infra PG17 (inchangée — ne pas casser)
python3 -m pytest tests/infra/test_story_10_6c_pg17_doc_smoke.py -q
python3 -m pytest tests/infra/test_story_10_6e_pg17_backend_smoke.py -q

# Compose valide
docker compose config --quiet

# Peloton 10.4 + observabilité 10.5 — régression L0
cd recyclique/api && bash scripts/run_critical_core_peloton.sh
cd ../../peintre-nano && npm run test:critical-core

# Racine dépôt — depuis peintre-nano : un niveau vers la racine (cf. story 10.5)
cd .. && python3 -m pytest tests/infra/test_story_10_5_observability_manifest_guard.py -q
```

### Intelligence story précédente (10.5)

- Livrables **`doc/observability-critical-flows.yaml`** et **`doc/observability-support-runbook.md`** — **10.6** les **cite** pour la phase post-install, ne les duplique pas.
- Liveness documentée : **`GET /health`** — réutiliser dans le checklist install **10.6**.

### Project context

- `_bmad-output/project-context.md` — chemins canoniques `recyclique/api`, `peintre-nano`, PG17.
- Tableau opérationnel : `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` (**10.6**).
- Pack lecture Epic 10 : `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`.

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 10, Story 10.6]
- [Source: `_bmad-output/planning-artifacts/prd.md` — §11.5 Installabilité ; matrice navigateurs §web_app]
- [Source: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Docker racine]
- [Source: `_bmad-output/implementation-artifacts/10-6b-clarifier-le-point-dentree-docker-local-du-mono-repo.md` — done]
- [Source: `_bmad-output/implementation-artifacts/10-6c-documenter-et-valider-le-spike-de-migration-postgresql-15-17-hors-legacy.md` — done]
- [Source: `_bmad-output/implementation-artifacts/10-6d-aligner-le-compose-racine-et-la-ci-non-legacy-sur-postgresql-17.md` — done]
- [Source: `_bmad-output/implementation-artifacts/10-6e-verifier-recyclique-api-et-alembic-sur-postgresql-17.md` — done]
- [Source: `_bmad-output/implementation-artifacts/10-5-rendre-lobservabilite-et-le-support-exploitables-en-environnement-reel.md` — runbook post-install]
- [Source: `references/artefacts/2026-04-07_01_validation-stack-locale-peintre-nano.md` — preuve locale historique]
- [Source: `README.md` — point d'entrée Docker dev]

## Story completion status

- **CS :** fichier story **ready-for-dev** (2026-09-21) — analyse contexte exhaustive ; sous-stories **10.6b–10.6e** indexées ; frontières **10.7** / legacy explicites.
- **QA3 :** boucle gate 95+ (2026-09-21, run `20260921_200720_jarvos_recyclique`) — score **97** ; 0 P0/P1 ; correctifs install stack Debian / Paheko / migrations / AC5 observabilité préservés (commits worktree `dbd37cf`, `4b9b4d9` — **pas de push**).
- **VS :** validate-create-story (Bob SM) — **PASS** (2026-09-21) ; checklist `bmad-create-story` ; QA3 **97** préservé ; correctif Gates Story Runner `cd ..` depuis `peintre-nano` ; rapport projet `internal/validate-story-10-6.md`.
- **DS :** bmad-dev-story (Amelia) — 2026-09-21 ; livrables doc + smokes §10.6 ; worktree `cursor/dev-story-10-6-6941` ; **pas de push**.
- **Prochaine étape BMAD :** **CR** / Story Runner gates (peloton 10.4, observabilité 10.5, smokes 10.6).

## Dev Agent Record

### Agent Model Used

Composer (Cloud Agent DS story 10.6)

### Debug Log References

Worktree : `/workspace/.worktrees/dev-story-10-6-6941` — branche `cursor/dev-story-10-6-6941`, base `8be34cc`.

### Completion Notes List

- Manifeste `doc/supported-stack-official.yaml` (6 piliers, 5 services, auxiliaires compose, index 10.6b–e).
- Guide `doc/installation-stack-officielle.md` : chemin minimal Debian/Docker sans `frontend-legacy`, Paheko inclus, matrice support, lien observabilité 10.5.
- §10.6 `doc/ci-minimal.md` + smokes infra ; lien README « Voir aussi » ; note PG15→17 sur artefact validation locale.
- Tests : 11 passed (smokes 10.6) + 7 passed / 2 skipped (10.6c/e) ; `docker compose config` non exécuté (Docker absent sur agent cloud).
- **10.1** reste `review` ; **10.6b–e** / **10.5** non rouverts ; pas de modif `critical-core-peloton.yaml` ni workflow CI.

### File List

- `doc/supported-stack-official.yaml` (créé)
- `doc/installation-stack-officielle.md` (créé)
- `doc/ci-minimal.md` (§10.6)
- `README.md` (lien guide officiel)
- `references/artefacts/2026-04-07_01_validation-stack-locale-peintre-nano.md` (note PG17)
- `tests/infra/test_story_10_6_installation_doc_smoke.py` (créé)
- `tests/infra/test_story_10_6_installation_ci_minimal_smoke.py` (créé)
- `_bmad-output/implementation-artifacts/10-6-documenter-linstallation-la-stack-cible-et-lenvironnement-officiellement-supporte.md` (DS)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (10-6 → review)

### Change Log

- 2026-09-21 — DS story 10.6 : documentation install stack officielle + smokes infra §10.6.
