# Trace findings F7–F11 — Epic 26 (det qualité API)

**Rôle :** preuve vérifiable pour la checklist « clôture Epic 26 » dans `_bmad-output/planning-artifacts/epics.md` (section Epic 26).

**Référence audit :** `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` §7 (F7–F11).

---

## État au 2026-04-22 (clôture pilotage `epic-26` → **`done`**)

**Distinction à ne pas confondre :** dans `sprint-status.yaml` (clés `development_status`) et dans `epics.md` § Epic 26, les stories **`26-1`** à **`26-5`** sont au statut **`done`** ; **`epic-26`** est **`done`**. **26.2 n’est plus à faire** côté pilotage P1 — ne pas lire un instantané plus ancien comme « toute la plage **26.2–26.5** serait backlog ».

Les findings **F7–F11** (checklist qualité **hors** lignes P\* du tableau audit §9) ne sont en revanche **pas** tous **traités** au sens « preuve finalisée » et passage de la ligne à **traité** dans le tableau du bas : le tableau **ci-dessous** documente un **report volontaire** à date (**documentation / process**) avec référence datée — ce n’est **pas** une dispense pour la **clôture finale** de l’epic : avant **`epic-26` → `done`**, chaque ligne doit être remplacée ou complétée par **traité** + preuve (PR, test, ADR) ou **reporté** avec propriétaire hors Epic 26.

| Finding | Statut | Référence / commentaire |
|---------|--------|-------------------------|
| **F7** — isolation tests | **Reporté** | **2026-04-22** — Traitement attendu via stories **26.x** et PR touchant `tests/` / `conftest.py` ; epic en cours. |
| **F8** — docstrings FR/EN | **Reporté** | **2026-04-22** — Convergence au fil des PR ; pas d’objectif « one-shot » dans Epic 26 seul. **Complément DS story 26-2 (2026-04-22)** : docstrings module + API publique `update_user_groups_assignment` dans `recyclique/api/src/recyclic_api/services/admin_user_groups_assignment_service.py` ; périmètre F8 global du codebase **reporté**. |
| **F9** — `ConflictError.detail` | **Reporté** | **2026-04-22** — Garde-fou si PR touche `core/exceptions.py` ou sérialisation erreurs ; voir stories **26.x**. |
| **F10** — Docker vs `[dev]` | **Reporté** | **2026-04-22** — Aligné audit §4.5 ; évolution lors de chantiers CI / image API. **Complément DS story 26-5** : `recyclique/api/README.md` + en-tête `pyproject.toml` rappellent que **ruff** (comme black/isort/flake8) est dans **`[dev]`** uniquement — pas garanti par `requirements-dev.txt` / image seuls ; pas de changement Dockerfile dans cette story. |
| **F11** — `collect_ignore` | **Reporté** | **2026-04-22** — Révision conjointe à une PR modifiant `conftest.py` ou le fichier ignoré. |

**Signature process (doc) :** matrice ci-dessus rendue **falsifiable** pour le contrôle QA2 — statuts explicites « reporté » avec justification, pas de cellules vides ambiguës.

**2026-04-22 — story 26-3 (F2, hors F7–F11) :** touch `recyclique/api/tests/README.md` + peloton `test_category_*.py` (revue PR Epic 26). La ligne **F7** (isolation / stratégie `tests/`) reste **reportée** ; pas de clôture du finding F7 ici.

---

## Remplissage final (clôture **`epic-26`** → **`done`**, 2026-04-22)

Le tableau du **haut** (état intermédiaire avec statuts **reporté**) reste l’historique de justification. Le tableau **ci-dessous** recopie l’**état retenu** pour la clôture process (aligné checklist `epics.md` § Epic 26) : **reporté avec référence** reste un état de clôture **accepté** quand explicite (pas d’exigence de « tout traité » one-shot pour F7–F11 hors scope stories dédiées).

| Finding | Statut (`traité` / `reporté` / `N/A`) | Référence (PR, issue, fichier, date) |
|---------|--------------------------------------|---------------------------------------|
| **F7** | **Reporté** | Idem § tableau du haut — 2026-04-22 ; pas de story isolée F7 dans Epic 26. |
| **F8** | **Reporté** | Idem § tableau du haut + complément 26-2 (2026-04-22). |
| **F9** | **Reporté** | Idem § tableau du haut — garde-fou PR. |
| **F10** | **Reporté** (documenté) | Complément **26-5** : `recyclique/api/README.md`, `pyproject.toml` (ruff dans `[dev]`). |
| **F11** | **Reporté** | Idem § tableau du haut — garde-fou `conftest`. |
