# Story 2.2b : Migrer le backend vers `recyclique/` (racine mono-repo)

**Clé fichier (obligatoire) :** `2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo`  
**Epic :** epic-2 — **Piste B**  
**Statut :** backlog  

**Contexte :** Correct Course approuvé — `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-03.md` ; décision transitoire 2.1 — `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md`.

## Story

En tant qu’**équipe plateforme**,  
je veux que le **package API vivant** soit sous le dossier canonique **`recyclique/`** à la racine du mono-repo, avec **CI**, **compose** et **gates** Story Runner mis à jour,  
afin d’**aligner** le dépôt sur `project-structure-boundaries.md` **avant** les stories lourdes en chemins (**2.6** contrats, **2.7** signaux) et d’**éviter** deux racines backend actives sans décision.

## Acceptance Criteria

### AC 1 — Emplacement unique pour le travail neuf

**Étant donné** que l’architecture cible nomme `recyclique/` à la racine  
**Quand** cette story est complétée  
**Alors** le code applicatif, les tests et la configuration d’outillage **principale** pour Epic 2 pointent vers `recyclique/` (structure alignée sur `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`)  
**Et** `recyclique-1.4.4/api/` n’est plus la racine de développement actif pour le nouveau travail (bannière README, archive, ou lien explicite — **une** vérité pour les chemins neufs)

### AC 2 — Docker / dev local

**Étant donné** que compose et variables d’environnement référencent des chemins  
**Quand** la migration est faite  
**Alors** la procédure de démarrage local (ou Docker) est **documentée** pour la nouvelle racine  
**Et** les secrets restent **hors dépôt** (`.env.example` à jour si besoin)

### AC 3 — Gates et Epic Runner

**Étant donné** que les briefs Story Runner utilisent des chemins absolus  
**Quand** la story est acceptée  
**Alors** les commandes de gate par défaut pour le backend Epic 2 ciblent le **nouveau** `pyproject.toml` / package sous `recyclique/`  
**Et** aucune incohérence volontaire entre `epics.md`, ce fichier et `sprint-status.yaml`

## Ordre d’exécution (recommandation produit)

1. Clôturer **2.2** (ContextEnvelope) si ce n’est pas déjà fait.  
2. Exécuter **2.2b** (cette story).  
3. Enchaîner **2.3** → **2.7** ; **2.2b** avant **2.6** est **fortement conseillé**.

## Tasks / Subtasks

- [ ] Cartographier chemins actuels : `recyclique-1.4.4/api/`, CI, compose, scripts.  
- [ ] Déplacer ou recopier vers `recyclique/` en minimisant la duplication ; ajuster imports / packaging.  
- [ ] Mettre à jour les jobs CI et les README concernés.  
- [ ] Mettre à jour `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md` (révision : emplacement final).  
- [ ] Vérifier `pytest` (ou équivalent) depuis la nouvelle racine.

## Dev Notes

- **Pas** de second backend parallèle sans note explicite ; si fenêtre de transition courte, la documenter dans le livrable de clôture.  
- Conserver la traçabilité avec `sprint-change-proposal-2026-04-03.md`.

## References

- `_bmad-output/planning-artifacts/epics.md` — Story 2.2b  
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-03.md`  
- `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`

## Dev Agent Record

*(À compléter par le Story Runner / dev.)*
