# Story 26.5 : P2 — Outillage et documentation : ruff, stratégie repository, traçabilité tests

Status: done

**Story key :** `26-5-outillage-et-doc-p2-ruff-repository-guide-tests`  
**Epic :** `epic-26` — dette qualité API (`recyclique/api/`, audit brownfield 2026-04-19)  
**Implementation artifact :** `_bmad-output/implementation-artifacts/26-5-outillage-et-doc-p2-ruff-repository-guide-tests.md`

## Dépendances (prérequis)

- **Stories 26.1–26.4** — **`done`** : pytest maître unique, extraction admin users/groups, convention `def` + ORM sync (categories), vague PEP 604 schémas.
- **Audit §6.6, §7 F1, §8.7, §9 P2** : `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` — ruff ; double norme **repository** (réception vs reste) ; `TESTS_STABILIZATION_GUIDE.md` manquant.
- **Epic 26 (pilotage)** : `_bmad-output/planning-artifacts/epics.md` — **Story 26.5** ; parallélisme possible si périmètre disjoint des PR **26.4** ; sinon segmenter / séquencer pour limiter les rebases.
- **Note F7–F11 (hors lignes P\*)** : `epic-26-cloture-f7-f11-trace.md` — les livrables **obligatoires** de **26.5** restent ruff / repository / guide tests ; **si** une PR touche `exceptions.py`, `conftest.py`, `Dockerfile`, schémas, etc., les **garde-fous** de revue s’appliquent au **DoD de cette PR** (cf. encadré *Note* epics §26.5).

## Story (BDD)

As a **tech lead**,  
I want **automated lint/format alignment and documented decisions on repository pattern beyond reception and on test guide lineage**,  
So that **P2 items from the audit do not stall as tribal knowledge** (**F1**, §6.6, §9 P2 ; checklist §8.7).

## Acceptance Criteria (source epics / audit)

**Given** black/isort/flake8 baseline exists in dev dependencies  
**When** this story is delivered  
**Then** **ruff** is introduced or rejected with a recorded rationale ; if introduced, configuration matches team conventions and CI/doc points contributors to install paths  
**And** the double norme reception-vs-rest is either generalized minimally or documented with boundaries (no silent obligation to rewrite all services)  
**And** the legacy missing `TESTS_STABILIZATION_GUIDE.md` situation is closed by restoring content, archiving, or an explicit ADR « no separate guide » plus README alignment

### Interprétation exécutable (DS)

1. **Ruff (ou rejet documenté)**  
   - Soit : ajouter **ruff** (lint + format) **aligné** sur **black** / **isort** (lignes de style compatibles) dans `recyclique/api/pyproject.toml` (ou emplacement explicite sous `recyclique/api/`) ; documenter **install** : `pip install -e ".[dev]"` et, si l’équipe ajoute ruff aux extras, le **nom du groupe** ; pointer **README** API et/ou fragment CI si existant.  
   - Soit : **décision écrite** (court **ADR** ou section « Décision » dans ce fichier story + lien architecture `index.md` § Epic 26) **pourquoi** ruff n’est **pas** adopté (contrainte équipe, coût, doublon outillage) — **sans** laisser l’audit P2 en suspens.

2. **Double norme repository (F1)**  
   - **Option A** : généralisation **minimale** (p. ex. un module ou un pattern documenté pour **un** domaine en plus de la réception) **seulement** si le coût reste borné.  
   - **Option B (souvent suffisante pour P2)** : documenter les **frontières** : quand le pattern `repositories/reception.py` s’applique, quand les services directs ORM restent **acceptables**, et qu’il n’y a **pas** d’obligation silencieuse de tout migrer. Emplacement cible : fragment dans `_bmad-output/planning-artifacts/architecture/index.md` § Epic 26 **ou** note courte sous `recyclique/api/` README — avec **lien** vers l’audit §5.x / F1. **Interdit** : refactor massif « parce que l’audit » sans borne explicite.

3. **Guide stabilisation tests (`TESTS_STABILIZATION_GUIDE.md`)**  
   - **Fermer** le constat « fichier référencé absent » par **une** des voies :  
     - **Restaurer** un guide utile (contenu recréé ou réimporté depuis archive interne si disponible) à un chemin cohérent ; **ou**  
     - **Archiver** explicitement (référence figée, p. ex. `_bmad-output/` ou `references/artefacts/`) si le contenu existe ailleurs ; **ou**  
     - **ADR** « pas de guide séparé » + **mise à jour** de `recyclique/api/tests/README.md` (section actuelle ~l. 209) pour **cesser** l’attente d’un fichier `api/TESTS_STABILIZATION_GUIDE.md` et pointer la **stratégie** canonicalisée (audit §6, `conftest.py`, liens).  
   - Le README ne doit **plus** se contenter d’un « en attendant » indéfini sans décision tracée.

## Definition of Done

- [x] **Ruff** : adopté (config + doc install/chemins) **ou** rejet **documenté** avec référence signée (story + index architecture § Epic 26 ou ADR court).
- [x] **F1** : double norme **adressée** par doc aux frontières claires **ou** généralisation **minimale** — preuve textuelle dans le dépôt (lien épingle dans la story + `File List`).
- [x] **Guide tests** : voie choisie (restaurer / archiver / ADR « pas de guide ») ; `recyclique/api/tests/README.md` **aligné** (plus de dette orpheline sur le seul manque de fichier).
- [x] **Gates Story Runner (parent)** : `python -m compileall` sur le package API **exit 0** ; `pytest` **`tests/test_infrastructure.py`** (ou chemin canonique actuel) **exit 0** — consigner commandes exactes dans **Dev Agent Record**.
- [x] Si fichiers **F7–F11** modifiés : mettre à jour `epic-26-cloture-f7-f11-trace.md` si applicable ; idéalement limiter le périmètre pour rester P2 / outillage.

## Tasks / Subtasks

- [x] Relire **epics** §26.5 + **audit** §6.6, F1, §8 checklist (lint/format), §9 P2, §8.7 ; noter conflit éventuel avec PR **26.4** (rebase). (AC: tous)
- [x] **Ruff** : PoC config dans `pyproject.toml` (règles alignées black/isort) **ou** rédiger **décision de non-adoption** + lien architecture. (AC: ruff)
- [x] **Repository** : choisir option doc vs mini-généralisation ; rédiger texte + lien audit F1 ; éviter big-bang. (AC: double norme)
- [x] **Guide stabilisation** : trancher restaurer / archiver / ADR + corriger `tests/README.md` § guide. (AC: guide)
- [x] Exécuter **compileall** + **test_infrastructure** ; noter sortie dans **Dev Agent Record** ; remplir **File List** ; Story Runner : **`review`** → **`done`** après gates + QA + CR.

## Dev Notes

### Périmètre package

- Racine cible : **`recyclique/api/`** (pyproject, tests, éventuels `repositories/`, docs).

### Outils actuels (baseline audit)

- `[project.optional-dependencies].dev` : **black**, **isort**, **flake8** — ruff peut **remplacer** ou **compléter** selon décision ; si migration, documenter le **double run** interdit en CI (éviter black **et** ruff format sans règles claires).

### Architecture Epic 26 (déjà en place)

- **Convention ORM sync** : `_bmad-output/planning-artifacts/architecture/2026-04-22-convention-routes-services-sync-orm-api-v1-epic-26.md` ; **PEP 604** : `architecture/index.md` § Epic 26 + story **26.4** — **26.5** n’a pas à rouvrir ces sujets sauf conflit de fichiers.

### Anti-patterns

- **Refactor repository** sur tout le backend « pour cohérence » : **hors** borne P2 / AC.
- **Introduire ruff** sans mettre à jour la doc d’install Docker vs `[dev]` (audit **F10**) : si le README ou un ADR est touché, **consigner** l’écart ou l’alignement.
- **Laisser** le README sur « fichier attendu un jour » sans ADR ni archive : **incomplet** vis-à-vis des AC.

### Project Structure Notes

- Éventuels nouveaux fichiers : ADR sous `_bmad-output/planning-artifacts/architecture/` ; archive `references/artefacts/` si l’équipe fige un guide historique.
- Conserver **une** source de vérité **pytest** dans `pyproject.toml` (story **26.1** — ne pas réintroduire `pytest.ini`).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 26.5, tableau §9 P2, dependencies, Note F7–F11]
- [Source: `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` — §5–§6, F1, §6.6, §8–§9 P2]
- [Source: `_bmad-output/planning-artifacts/architecture/index.md` — section Epic 26]
- [Source: `recyclique/api/pyproject.toml` — `[dev]`, `tool.pytest`]
- [Source: `recyclique/api/tests/README.md` — guide stabilisation, `conftest`]
- [Source: `_bmad-output/implementation-artifacts/epic-26-cloture-f7-f11-trace.md` — si PR élargie]
- [Source: `_bmad-output/implementation-artifacts/26-4-schemas-pep604-convention-et-premiere-vague.md` — gates / pattern Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Composer (sous-agent Task Story Runner BMAD) — exécution **bmad-dev-story** story **26.5**.

### Debug Log References

_(N/A — pas de debug bloquant.)_

### Completion Notes List

- **Ruff** : ajout `ruff==0.9.10` dans `[project.optional-dependencies].dev` ; `[tool.ruff]` (88 cols, `target-version` py311, format type Black) ; `[tool.ruff.lint.isort].known-first-party = ["recyclic_api"]` ; `ruff check` avec `select = ["E9"]` pour rester **vert** sur la legacy (chantier élargir F/I séparé). `ruff format` documenté dans README API.
- **F1** : paragraphe « double norme repository » dans `_bmad-output/planning-artifacts/architecture/index.md` § Epic 26 + lien audit.
- **Guide tests** : ADR « pas de guide séparé » + `recyclique/api/tests/README.md` sans référence « en attendant » au fichier fantôme.
- **F10** : complément trace `epic-26-cloture-f7-f11-trace.md` (ruff dans `[dev]` uniquement ; pas de changement Dockerfile).
- **Sprint** : `26-5-outillage-et-doc-p2-ruff-repository-guide-tests` → **`done`** (Story Runner : après CR **APPROVE**).

### Gates exécutés

```text
# depuis recyclique/api (PowerShell)
Set-Location "d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api"
python -m compileall src/recyclic_api -q
# exit 0

python -m pytest tests/test_infrastructure.py --tb=short
# 6 passed, 5 warnings (Pydantic deprecations) — exit 0

python -m ruff check src/recyclic_api
# exit 0 (jeu E9)
```

### File List

- `recyclique/api/pyproject.toml`
- `recyclique/api/README.md`
- `recyclique/api/tests/README.md`
- `_bmad-output/planning-artifacts/architecture/index.md`
- `_bmad-output/planning-artifacts/architecture/2026-04-22-adr-tests-stabilization-no-separate-guide-epic-26.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/epic-26-cloture-f7-f11-trace.md`
- `_bmad-output/implementation-artifacts/26-5-outillage-et-doc-p2-ruff-repository-guide-tests.md`

---

**Note create-story (CS) :** contexte dev pour P2 outillage (ruff ou rejet documenté), clôture F1 / guide tests, gates **compileall** + **test_infrastructure** alignés Story Runner parent ; epic **26** : **`done`** au pilotage (2026-04-22) — rétrospective **`epic-26-retrospective`** selon process équipe.
