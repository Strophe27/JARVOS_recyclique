# Story 26.1 : P0 dette qualité API — config pytest canonique et sort de `AdminService`

Status: done

**Story key :** `26-1-p0-pytest-maitre-et-sort-admin-service`  
**Epic :** 26 — dette qualité API (suite audit brownfield 2026-04-19)  
**Implementation artifact :** `_bmad-output/implementation-artifacts/26-1-p0-pytest-maitre-et-sort-admin-service.md`

## Dépendances (prérequis)

- **Recherche BMAD** (état des lieux dépôt + QA2) : `_bmad-output/planning-artifacts/research/technical-dette-qualite-api-audit-brownfield-research-2026-04-22.md` — vérités à implémenter : **`pytest.ini`** encore résolu comme **`inifile`** / **`configfile`** en présence de **`pyproject.toml`** ; **`AdminService`** sans consommateur sous `recyclique/api/`.
- **Audit source** : `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` — backlog §9 **P0** (pytest maître unique ; sort `AdminService`), findings **F3**, **F6**, checklist §8 (pytest / async).
- **Kanban** : `references/idees-kanban/archive/2026-04-19_chantier-refactor-api-recyclique-audit-brownfield-handoff.md` — intention « dette qualité API » (**archivée**, clos Epic 26).

## Décision produit / tech à figer avant ou au début du DS (NEEDS_HITL acceptable)

Deux arbitrages **documentés dans le livrable ou dans un commentaire d’issue** :

1. **Pytest — une source canon** parmi les stratégies déjà décrites dans la recherche §5 (résumé) :
   - **Option A** — Migrer `markers` + `filterwarnings` de `pytest.ini` vers `[tool.pytest.ini_options]` dans `pyproject.toml`, puis **supprimer** ou vider `pytest.ini` des clés dupliquées pour qu’il n’y ait plus qu’**une** vérité pour `addopts` / découverte.
   - **Option B** — Garder **`pytest.ini`** comme seul fichier actif et **retirer ou neutraliser** la section `[tool.pytest.ini_options]` contradictoire dans `pyproject.toml` (commentaires alignés).
   - **Option C** est **palliatif** : interdit comme état final ; si utilisé temporairement, critère de sortie = convergence vers A ou B.

2. **`AdminService`** — une option parmi :
   - **Supprimer** le module et tout import mort si aucune roadmap async admin ;
   - **Brancher** (endpoint + `AsyncSession` + tests) si produit le veut ;
   - **Marquer expérimental** (module docstring + note `references/artefacts/` ou issue) et **retirer de la surface « production »** jusqu’à branchement.

L’agent **DS** ne doit pas inventer la stratégie métier : si le brief utilisateur ou une note dans le ticket spécifie A+B, l’implémenter ; sinon **bloquer avec NEEDS_HITL** et liste des options.

## Story (BDD)

As a **mainteneur backend**,  
I want **une configuration pytest sans double vérité** et **un sort clair pour `AdminService`**,  
So that **la CI et les postes dev ne divergent pas** et **le code orphelin async** ne crée plus de confusion avec le reste (sessions sync).

## Acceptance criteria

**Given** l’audit **§9 P0** et la recherche **2026-04-22** décrivent le risque **F6** (double config) et **F3** (`AdminService` orphelin)  
**When** cette story est livrée  
**Then** une **seule** source porte les options pytest effectives (`addopts`, `markers`, `filterwarnings` pertinents) **ou** l’équivalent est explicitement documenté avec **preuve** (`pytest` affiche une résolution cohérente depuis `recyclique/api`, et `tests/README.md` ne contredit pas le runtime)  
**And** le sort de `AdminService` est **exécuté** selon la décision (suppression, branchement minimal, ou labellisation expérimentale **avec** trace écrite)  
**And** `python -m pytest` sur un sous-ensemble minimal existant (ex. `tests/test_infrastructure.py`) **exit 0** depuis `recyclique/api`  
**And** aucune régression silencieuse : pas de suppression de `filterwarnings` / `markers` utiles sans les reproduire dans la cible canon

### Interprétation exécutable

- **Pytest** : après changement, une capture ou copie de sortie montrant **`configfile:`** / absence de conflit avec le README — ou **`pytest --help`** / essai option invalide montrant **`inifile:`** cohérent avec la doc mise à jour.
- **`AdminService`** : si suppression, **`grep AdminService` sous `recyclique/api/`** = zéro ou uniquement références de migration/changelog ; si branchement, au moins un test qui couvre le chemin ; si expérimental, fichier **note** ou **docstring** + lien dans story **Dev Agent Record**.

## Definition of Done

- [x] Décision **pytest** et **`AdminService`** reflétée dans le dépôt (code + doc ou suppression).
- [x] `recyclique/api/pyproject.toml` **cohérent** (Option A : `pytest.ini` retiré après migration) ; `recyclique/api/tests/README.md` aligné sur le comportement réel (origine de `-v` / `--tb=short`, `configfile: pyproject.toml`).
- [x] Commande documentée en story ou README pour valider localement : `cd recyclique/api && python -m pytest tests/test_infrastructure.py` (voir aussi `tests/README.md` ; équivalent Compose : `api/run_tests.sh`).
- [x] Gate pytest : **exit 0** sur la cible minimale ; suite complète **1783 passed** notée en **Completion Notes** (temps ~15 min — hors gate minimal AC).
- [x] Livraison sans secrets ni désynchronisation `requirements` introdite par cette story ; état repo à contrôler au moment du merge (`git status`).

## Tasks / Subtasks

- [x] **Arbitrage** : confirmer option pytest (A/B) et sort `AdminService` (note ticket / commentaire en tête de branche / NEEDS_HITL). — **Réalisé :** Option A (`pyproject.toml` canonique, suppression `pytest.ini`) ; **AdminService** supprimé (orphelin, aucun import sous `recyclique/api/`). Trace : `_bmad-output/implementation-artifacts/2026-04-22-cloture-p0-pytest-story-26-1.md`.
- [x] **Pytest** : implémenter la source canon ; migrer `markers` / `filterwarnings` si Option A ; mettre à jour commentaires « source de vérité unique » pour refléter la réalité.
- [x] **`AdminService`** : appliquer la décision (delete / wire / experimental doc).
- [x] **Documentation** : `tests/README.md` + phrase dans la recherche ou note `_bmad-output/` si tu documentes la clôture P0.
- [x] **Vérification** : lancer pytest ciblé ; optionnel : noter version pytest / Python dans **Dev Agent Record**.

## Dev Notes

### Ancres code (obligatoires à lire avant modification)

| Sujet | Chemins |
|--------|---------|
| Config pytest | `recyclique/api/pyproject.toml` (`[tool.pytest.ini_options]`), `recyclique/api/pytest.ini` |
| Doc exécution tests | `recyclique/api/tests/README.md` — section qui attribue les options pytest à `pyproject.toml` / commandes Compose (les numéros de ligne peuvent dériver) |
| Service orphelin | `recyclique/api/src/recyclic_api/services/admin_service.py` |
| Schémas admin utilisés par le service | `recyclique/api/src/recyclic_api/schemas/admin.py` (imports croisés si suppression) |

### Risques

- Retirer `pytest.ini` sans migrer **`filterwarnings`** → bruit ou échecs nouveaux en CI.
- Supprimer `AdminService` alors qu’un **consommateur externe** (non grep dans `recyclique/api`) existe : périmètre **limité au monorepo** ; si doute, **grep** racine ou NEEDS_HITL.

### Testing / gates

- **Minimum** : `python -m pytest tests/test_infrastructure.py` depuis `recyclique/api`.
- **Étendu** (recommandé si temps) : sous-ensemble auth déjà cité dans README Compose.

### Project Structure Notes

- Outillage formatage **`[project.optional-dependencies].dev`** (`black`, `isort`, `flake8`) reste distinct du **Dockerfile** API — pas obligatoire à cette story sauf si tu touches la doc Docker volontairement.

### References

- `_bmad-output/planning-artifacts/research/technical-dette-qualite-api-audit-brownfield-research-2026-04-22.md`
- `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` (§6.2, §7 F3/F6, §9 P0)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Trace Epic 26 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante requise ? | **ADR N/A** — refactor config / hygiène code ; pas de décision d’architecture produit nouvelle au sens ADR Paheko/multisite. |

## Alignement sprint / YAML

- Clé **`26-1-p0-pytest-maitre-et-sort-admin-service`** : **`ready-for-dev`** après création (CS) ; **inchangée après VS** (2026-04-22).
- **`epic-26`** : **`in-progress`** (première story de l’epic).

## Validation Story (VS)

**Date :** 2026-04-22  
**Verdict :** **PASS** — story prête pour **`bmad-dev-story`** (DS).

| Contrôle | Résultat |
|----------|----------|
| Cohérence **story key** / **`sprint-status.yaml`** | OK |
| Références sources (recherche, audit §9 P0, Kanban) avec chemins réels | OK |
| AC **Given/When/Then** + interprétation exécutable (pytest **exit 0**, preuve **configfile** / **inifile**, **grep** `AdminService`) | OK |
| DoD et **Tasks** non vides ; ancres code et risques | OK |
| Périmètre **`recyclique/api/`** ; **NEEDS_HITL** si absence de décision A/B et sort `AdminService` | OK |
| **ADR N/A** pour refactor config / hygiène | OK |

**Remarque non bloquante :** une entrée **Epic 26** dans `epics.md` reste **optionnelle** (chantier transverse qualité API).

## Dev Agent Record

### Agent Model Used

Composer (agent Cursor / session DS story 26-1).

### Debug Log References

*(aucun blocage ; session pytest affiche `configfile: pyproject.toml`.)*

### Completion Notes List

- **Pytest P0 :** migration Option A — `markers` (`integration_db`, `performance`, `no_db`), `filterwarnings` (hérités de l'ancien `pytest.ini`) et `addopts` (`-v`, `--tb=short`) uniquement dans `recyclique/api/pyproject.toml` ; suppression de `recyclique/api/pytest.ini` ; `Dockerfile.tests` copie `pyproject.toml` au lieu de `pytest.ini`.
- **AdminService :** suppression de `services/admin_service.py` ; retrait du schéma mort `AdminUserList` dans `schemas/admin.py` ; `grep AdminService` sous `recyclique/api/` → aucune occurrence.
- **Preuve :** `python -m pytest tests/test_infrastructure.py` depuis `recyclique/api` → **6 passed**, exit 0 ; en-tête session : **`configfile: pyproject.toml`** (Windows, Python **3.13.5**, pytest **7.4.3**).
- **Régression :** `python -m pytest tests/` — **1783 passed**, 70 skipped (≈15 min ; Python 3.13.5). Gate minimal AC : `tests/test_infrastructure.py` inchangé (6 passed).
- **Code review (bmad-code-review) + correctifs :** doc `test-summary-story-25-12-doc-qa.md` — référence pytest corrigée (`pyproject.toml`) ; `Dockerfile.tests` — CMD sans duplication `-v`/`--tb=short` (aligné source unique) ; `tests/README.md` — vérité opérationnelle = `run_tests.sh`.
- **QA2 :** passe 1 (score ~88) → correctifs ci-dessus ; passe 2 **RAS** dans le périmètre (score ~96). **Hors scope / différé :** homonymie `UserStatusUpdate` / validation `UserProfileUpdate.email` (existant avant 26-1).

### File List

- `recyclique/api/pyproject.toml` — config pytest consolidée (Option A).
- `recyclique/api/pytest.ini` — **supprimé** (fusion dans `pyproject.toml`).
- `recyclique/api/Dockerfile.tests` — `COPY pyproject.toml` pour la config pytest.
- `recyclique/api/src/recyclic_api/services/admin_service.py` — **supprimé** (code orphelin).
- `recyclique/api/src/recyclic_api/schemas/admin.py` — retrait `AdminUserList`.
- `recyclique/api/tests/README.md` — alignement doc (source unique, commande de validation).
- `_bmad-output/implementation-artifacts/2026-04-22-cloture-p0-pytest-story-26-1.md` — trace clôture P0.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — statut story **26-1** synchronisé (`review` → **`done`**).
- `_bmad-output/implementation-artifacts/tests/test-summary-story-25-12-doc-qa.md` — framework pytest : `pyproject.toml` (post–revue doc).

### Change Log

- 2026-04-22 — Story 26-1 DS : pytest maître unique (`pyproject.toml`), suppression `AdminService` + schéma mort, doc + note clôture P0 ; pytest `tests/test_infrastructure.py` OK.
- 2026-04-22 — Code review + QA2 (2 passes) : alignement `Dockerfile.tests` / README / test-summary 25-12 ; statut **`done`**.
- 2026-04-22 — Alignement **Definition of Done** : cases cochées conformément au statut **`done`** et aux preuves (DS + gate + régression).


## Pour l’agent **vierge** qui exécute `bmad-dev-story`

1. Lire **entièrement** ce fichier puis les chemins « Ancres code ».
2. Si **aucune** décision pytest / AdminService n’est fournie par l’humain : produire un **NEEDS_HITL** avec les 5 options (A/B × delete/wire/experimental) en tableau.
3. Scope **strict** `recyclique/api/` pour le code ; pas de refactor Peintre ni epic résiduel sauf collision avérée.
4. Après implémentation : mettre **Status** à `review`, remplir **File List** et commandes pytest exactes.
