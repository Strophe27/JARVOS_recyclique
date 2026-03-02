# Story 18.1 : Audit page BDD admin — delta 1.4.4 vs implémentation actuelle

Status: done

## Story

As a équipe dev,  
I want un inventaire précis des écarts entre la page admin BDD 1.4.4 et l'implémentation actuelle,  
So that les stories de refactor suivantes (18.2 et 18.3) aient une cible claire et exhaustive.

## Contexte

- Epic cible : `epic-18` (parité BDD admin et caisse avec la 1.4.4).
- Story source : `18.1` dans `_bmad-output/planning-artifacts/epics.md`.
- Dépendances : aucune.

La version 1.4.4 utilise `pg_dump` (format binaire `.dump`, Custom `-F c`) pour l'export et `pg_restore` pour l'import — pas d'exécution SQL textuelle. Le backend actuel (`api/services/db_admin.py`) exécute du SQL texte, ce qui est incompatible avec les dumps binaires de production. La purge 1.4.4 a un périmètre de tables différent du périmètre actuel. Cette story est un **audit documentaire** : le dev lit les fichiers source et produit un document de comparaison. Aucun code n'est modifié dans cette story.

## Fichiers à auditer

### Source 1.4.4 — backend
- `references/ancien-repo/repo/api/src/recyclic_api/api/api_v1/endpoints/db_export.py`
- `references/ancien-repo/repo/api/src/recyclic_api/api/api_v1/endpoints/db_import.py`
- `references/ancien-repo/repo/api/src/recyclic_api/api/api_v1/endpoints/db_purge.py`

### Source 1.4.4 — frontend
- `references/ancien-repo/repo/frontend/src/services/adminService.ts` (méthodes `exportDatabase`, `importDatabase`, `purgeTransactions`)
- Page ou composant admin qui expose les 3 actions BDD : il n'existe pas de page dédiée `DatabasePage` dans `references/ancien-repo/repo/frontend/src/pages/Admin/` — le candidat le plus probable est `references/ancien-repo/repo/frontend/src/pages/Admin/Settings.tsx` (55 KB). Chercher les sections export/import/purge dans ce fichier. Si absent, inspecter `references/ancien-repo/repo/frontend/src/components/` avec le même motif.

### Source 1.4.4 — documentation de référence
- `references/ancien-repo/checklist-import-1.4.4.md` (requis par la règle Epic 11 — contient les contraintes connues sur le format d'import)

### Implémentation actuelle — backend
- `api/routers/v1/admin/db.py`
- `api/services/db_admin.py`

### Implémentation actuelle — frontend
- `frontend/src/admin/AdminDbPage.tsx`
- `frontend/src/api/adminDb.ts` (fonctions `postAdminDbExport`, `postAdminDbPurgeTransactions`, `postAdminDbImport`)

## Acceptance Criteria

1. **Given** la lecture complète des fichiers source 1.4.4 listés ci-dessus  
   **When** l'agent produit l'artefact d'audit  
   **Then** l'artefact liste pour chaque action (export / import / purge) :
   - format de fichier attendu par la 1.4.4 (extension, format binaire vs texte, taille max si présente)
   - logique backend 1.4.4 : commande système utilisée (`pg_dump`/`pg_restore`), options passées, gestion des erreurs, audit trail
   - logique backend actuelle : différences critiques par rapport à la 1.4.4
   - UI 1.4.4 : labels, messages affichés, comportements UX (confirmation, progress, feedback erreur)
   - UI actuelle : différences par rapport à la 1.4.4

2. **Given** l'artefact produit  
   **When** les écarts sont listés  
   **Then** l'artefact conclut par une liste ordonnée des écarts à corriger, précisant pour chaque écart :
   - sa criticité (bloquant / important / mineur)
   - la story concernée (18.2 backend ou 18.3 frontend)

3. **Given** l'artefact produit  
   **When** on inspecte la section export  
   **Then** la différence entre dump binaire Custom (`pg_dump -F c`) et SQL texte est documentée, avec les implications pratiques (compatibilité fichiers de sauvegarde existants, options `pg_restore`)

4. **Given** l'artefact produit  
   **When** on inspecte la section purge  
   **Then** les deux périmètres de tables sont listés côte à côte (tables purgées en 1.4.4 vs tables purgées actuellement), avec les tables manquantes ou en surplus

## Livrable

`_bmad-output/implementation-artifacts/18-1-audit-bdd-admin-delta.md`

Ce fichier contiendra les sections suivantes :
- Introduction et rappel du contexte
- Section Export : analyse comparée 1.4.4 vs actuel
- Section Import : analyse comparée 1.4.4 vs actuel
- Section Purge : analyse comparée 1.4.4 vs actuel (périmètre tables inclus)
- Conclusion : liste ordonnée des écarts à corriger (avec criticité et story cible)

## Tasks / Subtasks

- [ ] Task 1 — Lire et analyser les fichiers backend 1.4.4 (AC : 1, 3, 4)
  - [ ] Lire `db_export.py` 1.4.4 : commande `pg_dump`, options (`-F c`, `-f`, host/port/dbname), gestion erreurs, réponse HTTP, audit trail
  - [ ] Lire `db_import.py` 1.4.4 : commande `pg_restore`, options, validation fichier, gestion erreurs, réponse HTTP
  - [ ] Lire `db_purge.py` 1.4.4 : périmètre de tables purgées, ordre de suppression (FK), retour `deleted_count`, audit trail
  - [ ] Noter le format de fichier attendu pour l'export (extension `.dump`, MIME type renvoyé) et l'import (extension acceptée, taille max si présente)

- [ ] Task 2 — Lire et analyser les fichiers frontend 1.4.4 (AC : 1)
  - [ ] Lire `adminService.ts` 1.4.4 : signatures et corps de `exportDatabase`, `importDatabase`, `purgeTransactions` (headers, params, parsing réponse)
  - [ ] Lire `references/ancien-repo/checklist-import-1.4.4.md` : contraintes connues sur le format d'import (extensions, taille max, format binaire vs texte)
  - [ ] Lire `references/ancien-repo/repo/frontend/src/pages/Admin/Settings.tsx` : localiser les sections export/import/purge BDD (premier candidat). Si absent, inspecter `src/components/` avec le même motif.
  - [ ] Relever : labels des boutons/cartes, messages de confirmation avant action, messages de succès/erreur affichés, comportements UX (spinner, désactivation bouton, etc.)

- [ ] Task 3 — Lire et analyser l'implémentation actuelle (AC : 1, 3, 4)
  - [ ] Lire `api/routers/v1/admin/db.py` et `api/services/db_admin.py` : logique export (SQL texte vs dump binaire), logique import, logique purge (tables et ordre)
  - [ ] Lire `frontend/src/admin/AdminDbPage.tsx` : UI actuelle (labels, messages, comportements)
  - [ ] Lire `frontend/src/api/adminDb.ts` : implémentation actuelle des appels API (`postAdminDbExport`, `postAdminDbPurgeTransactions`, `postAdminDbImport`)

- [ ] Task 4 — Produire l'artefact d'audit (AC : 1, 2, 3, 4)
  - [ ] Rédiger `_bmad-output/implementation-artifacts/18-1-audit-bdd-admin-delta.md` avec les sections définies dans le livrable
  - [ ] Pour chaque action (export / import / purge) : tableau ou liste structurée comparant 1.4.4 vs actuel
  - [ ] Conclure avec la liste ordonnée des écarts (criticité + story cible 18.2 ou 18.3)

## Dev Notes

_(vide — à remplir pendant l'implémentation)_

## Completion Notes

Artefact produit : `_bmad-output/implementation-artifacts/18-1-audit-bdd-admin-delta.md`

L'audit couvre les 3 actions (Export / Import / Purge) avec comparaison complète backend et frontend 1.4.4 vs actuel. 20 écarts identifiés dont 4 critiques (format binaire vs SQL texte, pg_restore absent, pas de backup préalable, périmètre purge incomplet). Liste ordonnée prête à alimenter les stories 18.2 (backend) et 18.3 (frontend).
