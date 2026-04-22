---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md
  - references/idees-kanban/a-faire/2026-04-19_chantier-refactor-api-recyclique-audit-brownfield-handoff.md
  - recyclique/api/pyproject.toml
  - recyclique/api/pytest.ini
workflowType: research
lastStep: 6
research_type: technical
research_topic: Dette qualité API Recyclic — état des lieux vs audit brownfield 2026-04-19 (F1–F11, P0–P2)
research_goals: Cartographier la demande d’audit, vérifier le dépôt actuel, comparer P0/bloquants, lister écarts vérifiables, proposer options de clôture sans préscrire epic/sprint BMAD.
user_name: Strophe
date: 2026-04-22
web_research_enabled: false
source_verification: true
scope_confirmed_by_user_request: true
methodology_note: >-
  Recherche pilotée par le workspace (lecture artefact §7–§10, grep limité à recyclique/api
  pour les symboles backend, lecture fichiers, exécution locale pytest). Pas de veille web :
  le périmètre est la conformité dépôt ↔ audit déjà rédigé. Instantané matériel : workspace au
  2026-04-22 sans hash de commit figé ; invalider les comptages après refactor massif des schémas.
qa2_review:
  pass_1_date: 2026-04-22
  pass_1_score_reported: 83
  pass_2_date: 2026-04-22
  pass_2_score_reported: 92
  status: fermé_publication_interne
---

# Recherche technique : dette qualité API « audit brownfield » (état du dépôt au 2026-04-22)

**Date :** 2026-04-22  
**Auteur :** Strophe (assisté agent)  
**Type :** Recherche technique (workflow BMAD `bmad-technical-research`, adapté au terrain dépôt)  
**Artefact de référence :** `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md`  
**Fiche Kanban :** `references/idees-kanban/a-faire/2026-04-19_chantier-refactor-api-recyclique-audit-brownfield-handoff.md`

---

## Résumé exécutif

La demande de l’audit du **2026-04-19** reste **globalement pertinente** dans le dépôt actuel : même stack, mêmes tensions (couches, async décoratif, typage schémas). Pour les tests, l’audit décrit une **majorité de scénarios proches de l’intégration** plutôt que des unitaires purs ; ce livrable ne reprécise pas de ratio mesuré. Les **P0** du backlog §9 ne sont **pas** clos au sens « risque supprimé » :

1. **Configuration pytest** — Le fichier `recyclique/api/pyproject.toml` affirme une **source de vérité unique** pour pytest (`[tool.pytest.ini_options]`, commentaire L60–61), mais **`recyclique/api/pytest.ini` existe toujours** avec des **`addopts` contradictoires** (`-q` vs `-v`). Des exécutions locales depuis `recyclique/api` montrent **`configfile: pytest.ini`** (ex. `pytest --collect-only -v`) et une erreur sur option invalide cite explicitement **`inifile: ... pytest.ini`**. Compatible avec l’audit **§6.2**, qui décrit le risque que pytest **combine** ou **priorise** des options issues de **plusieurs emplacements** ; dans ce dépôt on observe en outre un **`inifile` résolu vers `pytest.ini`** (voir §3.1). Tant que ce fichier reste présent et rivalise avec `pyproject.toml`, le finding **F6** et l’action **P0** « une seule config maîtresse » restent **ouverts**. **`tests/README.md`** (L73–74) attribue `-v` / `--tb=short` au **`pyproject.toml`** : cette phrase peut **ne pas refléter** le runtime si l’**inifile** effectif reste **`pytest.ini`** — à aligner après décision de source canon.

2. **`AdminService`** — Toujours **une seule occurrence** du nom `AdminService` sous **`recyclique/api/`** : la définition dans `services/admin_service.py` (recherche par motif dans ce dossier uniquement ; pas d’autre fichier). **Aucun** autre module sous `recyclique/api/` ne l’importe ou ne l’instancie — en particulier **aucun** fichier sous `recyclique/api/src/recyclic_api/api/` (routes). Le **P0** « décider du sort » est **non résolu**.

Les **P1** (route admin groups → service, normalisation async/ORM, PEP 604 progressive) et **P2** (repository généralisé, ruff, guide tests) sont **majoritairement inchangés** ou **partiellement documentés** sans outillage nouveau (ex. **pas de `ruff`** dans `pyproject.toml`).

**En une phrase :** le chantier « dette qualité API » au sens audit est **avancé sur le papier** (commentaires `pyproject`, `Dockerfile`, `tests/README.md`) mais **les deux leviers P0 décisifs** (pytest réellement unifié ; sort de `AdminService`) **ne sont pas terminés**.

---

## 1. Cartographie de la demande d’audit (par priorité backlog §9)

Synthèse **non exhaustive du document d’audit** (fichier `.md`) : uniquement les lignes **actionnables P0 / P1 / P2** du tableau §9, reliées aux findings **F*** §7.

| Priorité | Action audit (résumé) | Findings liés |
|----------|----------------------|---------------|
| **P0** | Une seule config pytest maîtresse ; aligner ou retirer l’autre | **F6** |
| **P0** | Décider du sort de `AdminService` (supprimer / brancher / labelliser expérimental) | **F3** |
| **P1** | Extraire la logique de `admin_users_groups` vers un service | **F4** |
| **P1** | Normaliser async vs ORM synchrone (categories & similaires) | **F2** |
| **P1** | `Optional` → `T \| None` sur fichiers touchés progressivement | **F5** |
| **P2** | Documenter ou généraliser le pattern repository hors réception | **F1** |
| **P2** | Introduire **ruff** aligné black/isort | (outillage, complète §8.7) |
| **P2** | Guide stabilisation tests / ADR « pas de guide séparé » | **§6.6** audit |

Les findings **F7 à F11** ne sont pas tous repris comme lignes **P*** dans §9 : **F9** (`ConflictError`), **F10** (Docker / `[dev]`) et **F11** (`collect_ignore`) sont traités dans ce tableau ci-dessous ou en §3.3 ; **F7** (isolation tests) et **F8** (FR/EN docstrings) restent surtout dans la **checklist §8** et la « definition of done » §10 — pas omis par erreur, mais hors backlog tabulaire §9.

---

## 2. Tableau demande audit → état repo (2026-04-22) → écart

**Lecture canon (anti-redondance)** — Les deux sujets **P0** déterminants sont : **(a)** coexistence **`pytest.ini`** / **`pyproject.toml`** ; **(b)** **`AdminService`** sans consommateur. Les §3 et §4 développent les mêmes faits avec citations ; les décisions optionsnelles sont en §5.

Légende état : **Fait** / **Partiel** / **Pas fait** / **Incertain** (non vérifié dans cette passe).

| ID | Demande (audit / backlog) | État | Indices vérifiables |
|----|---------------------------|------|---------------------|
| **P0-a** | Config pytest unique | **Partiel / risque ouvert** | `pyproject.toml` L60–72 déclare la maîtrise ; `pytest.ini` L9 `addopts = -q` toujours présent ; session pytest locale : ligne **`configfile: pytest.ini`**. |
| **P0-b** | Sort de `AdminService` | **Pas fait** | Recherche `AdminService` sous `recyclique/api/` → uniquement `recyclique/api/src/recyclic_api/services/admin_service.py` ; service avec **`db: AsyncSession`** au constructeur et méthodes **`async`** (pas une « classe async » au sens Python). |
| **P1-a** | `admin_users_groups` → service | **Pas fait** | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_users_groups.py` : requêtes `db.query(User)`, `db.query(Group)`, `commit`/`refresh` dans **`update_user_groups`** environ **L33–147**. |
| **P1-b** | Async vs ORM sync clarifiés | **Pas fait** (pattern inchangé) | `category_service.py` : méthodes `async def` avec `self.db.query(...)` synchrone L44–58 ; `categories.py` endpoints `async def` (ex. L51+). |
| **P1-c** | PEP 604 progressive | **Partiel** | Comptage sur `recyclique/api/src/recyclic_api/schemas/*.py` : **`Optional[`** **457** occurrences ; **`| None`** **16** (PowerShell `Select-String`, instantané 2026-04-22). |
| **P2-a** | Repository au-delà réception | **Pas fait** | `recyclique/api/src/recyclic_api/repositories/` : fichier utile **`reception.py`** uniquement (listing répertoire). |
| **P2-b** | Ruff | **Pas fait** | `grep` `ruff` sous `recyclique/api/` : aucune occurrence. |
| **P2-c** | Guide tests / traçabilité | **Partiel** | `recyclique/api/tests/README.md` décrit l’exécution via scripts Compose et cite **`pyproject.toml`** pour `-v` / `--tb=short` (L73–74) ; aucun fichier **`TESTS_STABILIZATION_GUIDE.md`** dans le dépôt (recherche globale `**/TESTS_STABILIZATION_GUIDE.md`, zéro résultat au 2026-04-22). |
| **F6** | Double config pytest | **Toujours pertinent** | Deux fichiers avec `addopts` incompatibles ; voir P0-a. |
| **F9** | `ConflictError.detail` hétérogène | **Inchangé** | `recyclique/api/src/recyclic_api/core/exceptions.py` L31–39 : `detail: str \| dict`. |
| **F11** | `collect_ignore` | **Inchangé** | `recyclique/api/tests/conftest.py` L236 : `collect_ignore = ["test_clean_legacy_import.py"]` ; fichier présent `tests/test_clean_legacy_import.py`. |
| **F10** | Docker ≠ `pip install -e ".[dev]"` | **Documenté** | `recyclique/api/Dockerfile` L11–14 ; `[project.optional-dependencies].dev` dans `pyproject.toml` L43–52 (black, isort, flake8). |

---

## 3. Focus P0 et points bloquants (comparaison explicite)

### 3.1 P0 — pytest : « une seule vérité »

- **Ce que demandait l’audit :** désigner une source maître et **retirer ou synchroniser** l’autre (`pytest.ini` vs `pyproject.toml`).
- **État observé :**
  - **`recyclique/api/pyproject.toml`** : commentaire explicite « Configuration pytest : source de vérité unique (remplace un éventuel pytest.ini) » et `addopts = ["-v", "--tb=short"]`.
  - **`recyclique/api/pytest.ini`** : toujours présent ; `addopts = -q` ; marqueurs et `filterwarnings` étendus.
  - **Exécution :** `python -m pytest tests/test_infrastructure.py --collect-only -v` annonce **`configfile: pytest.ini`** (sortie session, Python 3.13 / pytest 7.4.3 sur Windows).
- **Pont avec l’audit §6.2 :** le handoff décrit déjà la **superposition** de configurations et le risque **quiet + verbose** ; ce dépôt ajoute la hiérarchie observée **`configfile` / `inifile` → `pytest.ini`** en présence des deux fichiers (comportement à revalider après upgrade pytest).
- **Conclusion :** tant que **`pytest.ini`** n’est pas supprimé, vidé des clés dupliquées, ou réduit à un shim non contradictoire, le **P0 n’est pas clôturé** ; le commentaire dans `pyproject.toml` peut **surestimer** l’alignement réel selon machine et version pytest.

### 3.2 P0 — `AdminService` orphelin

- **Audit :** aucune occurrence hors `admin_service.py` ; service async isolé du reste (sessions sync).
- **Vérification 2026-04-22 :** recherche **`AdminService`** limitée à **`recyclique/api/`** → **un seul fichier** (`admin_service.py`). Pas d’import dans **`recyclique/api/src/recyclic_api/api/`** (ni ailleurs sous ce préfixe API hors le fichier du service).
- **Conclusion :** **pas fait** — même diagnostic qu’à l’audit.

### 3.3 Bloquants « hygiene » cités dans l’audit (hors P0 tableau mais critiques pour la checklist)

| Sujet | Référence audit | État |
|--------|-----------------|------|
| `ConflictError` str \| dict | §5.7, F9 | Inchangé — `exceptions.py`. |
| Fichier de test ignoré à la collecte | F11, §12 annexes | Inchangé — `conftest.py` + fichier présent. |
| Dockerfile vs outils `[dev]` | F10 | Documenté dans `Dockerfile` ; pas d’écart nouveau identifié. |

---

## 4. Liste priorisée des écarts résiduels (phrase vérifiable)

1. **`pytest.ini` vs `pyproject.toml` (P0)** — Tant que `recyclique/api/pytest.ini` contient `addopts` et est choisi comme **`configfile`** par pytest, l’objectif « source unique » n’est pas atteint malgré le commentaire dans `pyproject.toml` L60–61.

2. **`AdminService` (P0)** — `recyclique/api/src/recyclic_api/services/admin_service.py` reste **sans consommateur** ailleurs sous `recyclique/api/` (recherche par nom de symbole).

3. **Endpoint chargé `admin_users_groups` (P1)** — `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_users_groups.py` : logique ORM, validation et `commit` dans **`update_user_groups`** (corps principal **~L33–147**) plutôt que dans un `*_service.py` dédié.

4. **Async décoratif categories (P1)** — `recyclique/api/src/recyclic_api/services/category_service.py` et `api/api_v1/endpoints/categories.py` : combinaison `async def` + accès ORM synchrone inchangée par rapport au diagnostic F2.

5. **Masque `Optional[` (P1)** — **457** occurrences `Optional[` sous `schemas/` vs **16** pour `| None` (méthode et date comme tableau §2) : convergence PEP 604 reste **à la marge**.

6. **Repository unique réception (P2)** — `recyclique/api/src/recyclic_api/repositories/reception.py` : toujours le seul dépôt métier dans ce dossier.

7. **Pas de ruff (P2)** — Aucune entrée `ruff` dans `recyclique/api/pyproject.toml` ou requirements (recherche textuelle `ruff`).

8. **`collect_ignore` (F11)** — `recyclique/api/tests/conftest.py` L236 exclut toujours `test_clean_legacy_import.py` : même arbitrage qu’à l’audit ; non réévalué ici sur la pertinence métier.

---

## 5. Options techniques et jalons de clôture *(sans epic BMAD ni sprint)*

Formulations **optionnelles** pour la suite — à trancher par l’équipe :

**P0 — pytest**

- **Option A** — Supprimer `pytest.ini` après migration de ses `markers` et `filterwarnings` vers `pyproject.toml` `[tool.pytest.ini_options]`, puis une passe CI locale.
- **Option B** — Garder `pytest.ini` comme **unique** fichier de config : retirer alors la section `[tool.pytest.ini_options]` du `pyproject.toml` ou la réduire à un renvoi explicite pour éviter double lecture et commentaires contradictoires.
- **Option C** (**palliatif, à déprécier**) — Documenter dans `tests/README.md` quel fichier pytest lit **réellement** sur les runners (capture session : ligne `configfile:` / message d’erreur `inifile:`), **tant que** deux fichiers coexistent — critère de sortie : **convergence** vers **Option A ou B**.

**Jalon de clôture suggéré :** une commande documentée (`pytest …`) produit une session où **une seule source** porte `addopts`, `markers` et `filterwarnings`, et les contributeurs ne voient plus de mélange quiet/verbose implicite.

**P0 — `AdminService`**

- **Option A** — Supprimer le module s’il n’y a pas de roadmap async admin.
- **Option B** — Brancher sur un endpoint admin avec `AsyncSession` et tests (chantier plus large).
- **Option C** — Marquer comme expérimental (docstring + issue) et exclure du périmètre « production ready » jusqu’à branchement.

**Jalon :** décision écrite (même courte ADR ou commentaire dans `references/artefacts/`) + disparition du statut « orphelin sans traitement ».

**P1–P2**

- Extraire **admin groups** lors du prochain toucher sécurité/permissions du fichier (réduit le risque de régression isolée).
- Normaliser **async** : préférer `def` sur routes purement ORM sync *ou* `asyncio.to_thread` pour CPU/ORM long — **décision par module**, pas one-shot repo-wide.
- **Ruff** : ajout ultérieur dans `[project.optional-dependencies].dev` + étape CI — **non commencé** dans ce dépôt.

---

## Annexes

### A. Commandes et contrôles utilisés

- Lecture : artefact audit, Kanban, `pyproject.toml`, `pytest.ini`, `Dockerfile`, extraits `admin_users_groups.py`, `category_service.py`, `exceptions.py`, `conftest.py`, `tests/README.md`.
- Recherche de symboles : **ripgrep** (`rg`) ou recherche équivalente dans l’IDE (`grep` outil Cursor), périmètre **`recyclique/api/`**, motifs `AdminService` et `ruff`.
- Comptages typage schémas (reproductible PowerShell 5+, depuis le dossier `schemas`) :

```powershell
Set-Location "…/recyclique/api/src/recyclic_api/schemas"
$opt = 0; $pipe = 0
Get-ChildItem -Filter *.py | ForEach-Object {
  $opt += (Select-String -Path $_.FullName -Pattern 'Optional\[' -AllMatches).Matches.Count
  $pipe += (Select-String -Path $_.FullName -Pattern '\| None' -AllMatches).Matches.Count
}
Write-Output "Optional[: $opt"
Write-Output "| None: $pipe"
```

*(Remplacer `…` par la racine du clone ; résultat obtenu au 2026-04-22 : **457** et **16** sur ce workspace.)*

- Exécution : `python -m pytest tests/test_infrastructure.py --collect-only` et `--collect-only -v` depuis `recyclique/api` (ligne de session **`configfile: pytest.ini`**). Sur pytest **7.4.3**, `python -m pytest --showconfig` (option non reconnue) produit une erreur qui cite **`inifile: ... pytest.ini`** — utile pour confirmer quel fichier `.ini` pytest résout depuis ce répertoire de travail.

### B. Extraits de référence (chemins)

```60:72:recyclique/api/pyproject.toml
# Configuration pytest : source de vérité unique (remplace un éventuel pytest.ini).
# Le sous-ensemble minimal (auth + infra) est listé explicitement dans run_tests.sh et tests/README.md.
[tool.pytest.ini_options]
minversion = "7.0"
testpaths = ["tests"]
pythonpath = ["src"]
addopts = [
    "-v",
    "--tb=short",
]
markers = [
    "no_db: pas de session DB ni d'autouse liée à la base (voir tests/conftest.py).",
]
```

```1:16:recyclique/api/pytest.ini
[pytest]
testpaths = tests
pythonpath = src
markers =
    integration_db: tests nécessitant Postgres/Redis
    performance: tests de performance (longs, peuvent être exclus de la CI rapide)
    no_db: tests unitaires qui n'ont pas besoin de base de données
# Pas d'exclusion globale de motifs sur les noms de tests (pytest collecte tout le dossier tests/).
addopts = -q
filterwarnings =
    ignore:Type google\._upb\._message.*:DeprecationWarning
    ignore:'crypt' is deprecated.*:DeprecationWarning
    ignore:datetime\.datetime\.utcnow\(\) is deprecated.*:DeprecationWarning
    ignore:Use 'content=<...>' to upload raw bytes/text content\.:DeprecationWarning
    ignore:transaction already deassociated from connection:sqlalchemy.exc.SAWarning
```

*(Les `markers` additionnels et `filterwarnings` devront être repris dans `pyproject.toml` si **Option A** — suppression de ce fichier.)*

```10:14:recyclique/api/src/recyclic_api/services/admin_service.py
class AdminService:
    """Service pour les opérations d'administration des utilisateurs"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
```

---

## Traçabilité QA2 (BMAD / skill `qa2-agent`)

| Passe | Mécanisme | Résultat |
|-------|-----------|----------|
| **1** | Sous-agent **Task** `generalPurpose` en rôle **parent qa2** : planificateur + **3 workers** (doc adversarial, vérits repo/pytest, cohérence audit) ; fusion parent ; **livrable non modifié** par le sous-agent. | Rapport fusionné **83/100** ; issues **Major** (pytest/README, périmètre AdminService) et **Minor** (PDF, typo « grass », Option C, annexes, etc.). |
| **Correctifs** | Agent principal : intégration des recommandations + preuve **`inifile`** (`pytest --showconfig`), annexes **`pytest.ini`** complètes, lectures canon, pont §6.2, typos, script PowerShell reproductible. | — |
| **2** | Un worker **Task** adversarial **high** sur le livrable **révisé**. | **Décision : FERMÉ** (publication interne) ; **92/100** ; must-fix cosmétiques / précision appliqués ci-dessus (`pass_2_date`, formulations « fusion », `rg`, script comptages, « leviers », « décision »). |

**Note :** les workers QA2 chargent `heavy_refs_root` du skill **qa-agent** (`…/.cursor/skills/qa-agent`) selon `worker-qa.md` ; le chat principal n’a pas préchargé ces grilles pour respecter la discipline « parent léger ».

---

*Fin du document — recherche technique BMAD adaptée au workspace, 2026-04-22.*
