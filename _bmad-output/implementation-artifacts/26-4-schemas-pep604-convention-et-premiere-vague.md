# Story 26.4 : P1 — Schémas : convention PEP 604 et première vague ciblée

Status: done

**Story key :** `26-4-schemas-pep604-convention-et-premiere-vague`  
**Epic :** `epic-26` — dette qualité API (`recyclique/api/`, audit brownfield 2026-04-19)  
**Implementation artifact :** `_bmad-output/implementation-artifacts/26-4-schemas-pep604-convention-et-premiere-vague.md`

## Dépendances (prérequis)

- **Stories 26.1–26.3** — **`done`** : pytest, extraction admin users/groups, convention `def` + ORM sync (pilote **categories**).
- **Audit §5.8 / F5 / §9 P1 :** `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` — convergence **`Optional[T]` → `T | None`** (PEP 604) **par fichiers touchés**, pas en one-shot.
- **Epic 26 (pilotage + AC)** : `_bmad-output/planning-artifacts/epics.md` — **Story 26.4** ; parallélisme possible avec **26.5** si périmètres disjoints.
- **Trace garde-fous hors P\*** : `_bmad-output/implementation-artifacts/epic-26-cloture-f7-f11-trace.md` — si une PR de cette story touche `exceptions.py`, `conftest.py`, `Dockerfile`, etc., **mettre à jour** la trace **F7–F11** selon le finding concerné (ne pas ignorer les garde-fous parce que le sujet principal est F5).

## Story (BDD)

As a **maintainer**,  
I want **optional fields in touched schema files to migrate toward `T | None` consistently**,  
So that **the codebase converges without a one-shot mass edit** (**F5**, audit §5.8, §9 P1).

## Acceptance Criteria

**Given** the large volume of `Optional[` in `schemas/` (audit)  
**When** this story is delivered  
**Then** a written scope lists which files or domains are in the first wave and the rule for files not yet touched  
**And** modified schemas do not mix styles in the same file without justification  
**And** no unrelated product schema change is bundled

### Interprétation exécutable (DS)

1. **Périmètre strictement typage** : remplacer les annotations **`Optional[X]`** par **`X | None`** (et retirer les imports `Optional` devenus inutiles) **sans** changer sémantique produit (noms de champs, défauts `Field`, validateurs, alias JSON/OpenAPI).
2. **Cohérence par fichier** : dans chaque fichier **inclus dans la vague**, **toutes** les occurrences de `Optional[...]` pertinentes passent en `... | None` — **pas** de fichier à moitié `Optional` / moitié PEP 604 sans commentaire de justification (ex. bloc tiers copié-coller — à éviter ; si exception, la **nommer** en commentaire bref).
3. **Hors vague** : les autres `schemas/*.py` **restent** tels quels jusqu’à une vague ou PR ultérieure ; toute PR future qui **édite** un schéma pour une autre raison et **casse** la cohérence locale doit **finaliser** la forme PEP 604 **dans ce fichier** (alignement audit §5.8).
4. **Note de pilotage (recommandée si pas déjà couverte)** : si l’équipe formalise une règle projet, **un** emplacement court suffit — par ex. fragment dans `_bmad-output/planning-artifacts/architecture/index.md` (section Epic 26) **ou** `recyclique/api/tests/README.md` **pointant** vers cette story ou un ADR stub ; **sinon**, la présente story + la liste « vague 1 » ci-dessous font foi pour le sprint.

## Première vague (liste explicite — fait foi pour le DS)

Migrer **entièrement** (toutes les `Optional[...]` → `... | None` dans le fichier) les modules suivants, racine package **`recyclique/api/src/recyclic_api/schemas/`** :

| # | Fichier | Rationale |
|---|---------|-----------|
| 1 | `category.py` | Continuité directe avec le pilote **categories** (story **26.3**) ; schéma métier déjà dans le périmètre Epic 26. |
| 2 | `context_envelope.py` | Module transversal, taille modérée ; aligné socle **ContextEnvelope** (Epic 25 / contrats). |
| 3 | `email_log.py` | Module admin / logs email, taille modérée ; proche des surfaces déjà stabilisées (Epic 16). |

**Hors vague 1 (exemples non exhaustifs)** : `cash_session.py`, `sale.py`, `reception.py`, `user.py`, `deposit.py`, `accounting_expert.py`, etc. — **ne pas** les modifier dans cette story sauf **correctif de compilation** induit par un import partagé (improbable si le DS reste dans les trois fichiers ci-dessus).

## Definition of Done

- [x] Les **trois** fichiers de la vague 1 sont en **PEP 604** cohérent (`X | None`), sans mélange `Optional[` résiduel **sans** justification.
- [x] **Aucun** changement de comportement observable (mêmes payloads, mêmes optionnels requis/facultatifs) — revue par diff ciblé + tests.
- [x] Gates : `python -m compileall` sur le package API (ou équivalent projet) **exit 0** ; pytest : au minimum le peloton **categories** si touché indirectement (`pytest -k categor` ou liste stable du README API tests) + `test_infrastructure` si c’est le gate canonique du runner — **ajuster** la formulation finale dans **Dev Agent Record** selon l’état du dépôt au moment du DS.
- [x] Si un fichier **F7–F11** est modifié par erreur : mettre à jour `_bmad-output/implementation-artifacts/epic-26-cloture-f7-f11-trace.md` en conséquence ; idéalement **éviter** d’élargir le périmètre pour ne pas déclencher cette obligation. *(N/A — aucun fichier F7–F11 touché.)*

## Tasks / Subtasks

- [x] Relire **§5.8** audit + **F5** + AC **epics** §26.4 ; figer la liste « vague 1 » (identique au tableau ci-dessus sauf arbitrage HITL documenté).
- [x] Pour chaque fichier de la vague : `rg "Optional\[" <fichier>` → convertir ; nettoyer imports (`typing.Optional` si plus utilisé).
- [x] Vérifier **Pydantic v2** : pas de régression sur `Field`, validateurs, `model_config`.
- [x] Exécuter les **gates** (compileall + pytest) ; consigner commandes exactes dans **Dev Agent Record**.
- [x] **Optionnel** : si une **note projet** PEP 604 est ajoutée (architecture index ou README tests), lier depuis `_bmad-output/planning-artifacts/architecture/index.md` § Epic 26.
- [x] Remplir **File List** et statut story → **`review`** côté DS (Story Runner).

## Dev Notes

### Stack et contrainte technique

- **Python 3.10+** (PEP 604) — le dépôt utilise déjà des artefacts **3.11 / 3.13** (pycache) ; `X | None` est le style cible audit.
- **Pydantic 2** : `Optional[X]` et `X | None` sont équivalents pour les champs optionnels ; l’enjeu est **homogénéité** et lisibilité (**F5**).

### Références de style existantes

- Fichiers déjà partiellement en **` | None`** ou style récent : voir audit §5.8 (`recyclique_api_error.py`, `pin.py`, `setting.py`, etc.) — s’en inspirer pour **imports** et **forme** des annotations, sans copier des patterns hors périmètre.

### Intelligence story 26.3 (continuité)

- Le pilote **categories** a couvert routes/services ; **26.4** porte les **schémas** du même domaine via `schemas/category.py` — garder la même discipline : **pas d’élargissement métier** (pas de nouveau champ, pas de renommage d’API).

### Anti-patterns à éviter

- **One-shot** sur tout `schemas/` : hors scope ; respecter la **vague 1** listée.
- **Mélange** dans un fichier : `Optional[str]` et `str | None` côte à côte sans raison documentée.
- **Changement produit** « en passant » (default, validation, alias) : interdit par AC.

### Project Structure Notes

- Racine schémas : `recyclique/api/src/recyclic_api/schemas/`
- OpenAPI généré / contrats : si le pipeline régénère des artefacts, vérifier qu’il n’y a pas de **diff sémantique** (normalement non pour simple changement d’annotation).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 26.4]
- [Source: `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` — §5.8 Typage Pydantic / Python, §7 F5, §9 P1]
- [Source: `_bmad-output/implementation-artifacts/26-3-normaliser-async-orm-sync-pilote-categories.md` — continuité categories]
- [Source: `_bmad-output/planning-artifacts/architecture/index.md` — Epic 26, convention sync ORM]
- [Source: `_bmad-output/implementation-artifacts/epic-26-cloture-f7-f11-trace.md` — F7–F11 si PR élargie]

## Dev Agent Record

### Agent Model Used

Composer (agent DS Task Story Runner BMAD).

### Debug Log References

_(Aucun.)_

### Completion Notes List

- Vague 1 : `Optional[T]` → `T | None` dans `schemas/category.py`, `schemas/context_envelope.py`, `schemas/email_log.py` ; imports `Optional` retirés si inutilisés.
- Note pilotage PEP 604 ajoutée dans `_bmad-output/planning-artifacts/architecture/index.md` § Epic 26 (lien vers cette story).
- Aucun fichier garde-fou F7–F11 modifié ; trace `epic-26-cloture-f7-f11-trace.md` inchangée.
- QA : `tests/test_schemas_pep604_wave1_story_26_4.py` ; test-summary `_bmad-output/implementation-artifacts/tests/test-summary.md` § 26.4.
- CR Story Runner (bmad-code-review Task) : **APPROVE** (2026-04-22).

### Gates exécutés (2026-04-22)

```text
# depuis recyclique/api
python -m compileall -q src/recyclic_api
python -m pytest tests/test_infrastructure.py -q --tb=short
python -m pytest -k categor -q --tb=short
```

Résultat : **exit 0** — `test_infrastructure` : 6 passed ; peloton `-k categor` : 175 passed, 1 skipped.

### File List

- `recyclique/api/src/recyclic_api/schemas/category.py`
- `recyclique/api/src/recyclic_api/schemas/context_envelope.py`
- `recyclique/api/src/recyclic_api/schemas/email_log.py`
- `recyclique/api/tests/test_schemas_pep604_wave1_story_26_4.py`
- `_bmad-output/planning-artifacts/architecture/index.md`
- `_bmad-output/implementation-artifacts/26-4-schemas-pep604-convention-et-premiere-vague.md`
- `_bmad-output/implementation-artifacts/tests/test-summary.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

---

**Note create-story (CS) :** contexte développeur préparé — analyse exhaustive des AC epics, audit F5/§5.8, continuité 26.3, vague 1 explicite à trois fichiers, règle hors-vague, garde-fous F7–F11.
