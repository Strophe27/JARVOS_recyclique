# Story 19.2: Admin catégories — refonte complète page 1.4.4 (CRUD + UX)

Status: done

## Story

En tant qu'**administrateur**,
je veux **retrouver l'interface complète de gestion des catégories identique à la 1.4.4**,
afin de **créer, modifier, archiver, réorganiser et configurer les catégories sans passer par un import CSV**.

## Contexte

La page actuelle `/admin/categories` ne propose que l'import/export CSV et la suppression. La 1.4.4 avait une interface riche (story B48-P4) : CRUD complet, arborescence hiérarchique, toggle Vue Caisse / Vue Réception, visibilité par contexte, ordre d'affichage éditable, soft delete / restauration, recherche.

**Objectif :** parité fonctionnelle avec la 1.4.4, pas de dépassement. S'appuyer obligatoirement sur les sources 1.4.4 listées (Copy/Consolidate/Security).

**Sources :**
- Audit terrain : `references/artefacts/2026-03-16_audit-fonctionnel-terrain.md` §5 (Admin > Catégories)
- Sprint Change Proposal : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-16.md`
- Epic 19 : `_bmad-output/planning-artifacts/epics.md` § Epic 19, Story 19.2

**Dépendances :** 19.1 validé par Strophe (import parent_id corrigé — catégories et sous-catégories en base pour tester CRUD/archivage).

## Acceptance Criteria

1. **Given** l'admin est sur `/admin/categories`
   **When** l'admin clique le bouton « Nouvelle catégorie »
   **Then** un formulaire s'ouvre (nom court, parent optionnel, nom officiel optionnel)
   **And** la catégorie créée apparaît dans l'arborescence sans rechargement complet

2. **Given** une catégorie active dans la liste
   **When** l'admin clique « Modifier » sur cette ligne
   **Then** le formulaire s'ouvre pré-rempli et permet d'éditer nom, parent, nom officiel
   **And** les modifications sont reflétées immédiatement dans la liste

3. **Given** une catégorie active
   **When** l'admin choisit « Archiver »
   **Then** la catégorie passe en état archivé (soft delete), elle est grisée / marquée « Archivée »
   **And** l'action « Restaurer » remplace « Archiver »

4. **Given** le toggle « Vue Caisse » / « Vue Réception » est visible
   **When** l'admin bascule entre les deux vues
   **Then** la liste affiche l'ordre d'affichage correspondant (`display_order` ou `display_order_entry`)
   **And** en Vue Réception, les checkboxes de visibilité (`is_visible_reception`) sont proéminentes sur chaque ligne

5. **Given** l'admin est en Vue Réception (ou Vue Caisse)
   **When** l'admin coche/décoche une checkbox de visibilité sur une catégorie
   **Then** le champ `is_visible_reception` (ou `is_visible_sale`) est sauvegardé immédiatement via l'API
   **And** le changement est reflété dans la liste sans rechargement

6. **Given** l'admin modifie un champ d'ordre d'affichage inline (`display_order` ou `display_order_entry`)
   **When** l'admin quitte le champ (blur) ou appuie sur Entrée
   **Then** la valeur est sauvegardée automatiquement (mise à jour optimiste via PUT)

7. **Given** la page `/admin/categories` est chargée
   **When** l'arborescence s'affiche
   **Then** les catégories sont affichées en arborescence hiérarchique avec indentation (racines + sous-catégories)
   **And** les catégories parentes sont expand/collapse
   **And** un toggle « Afficher les éléments archivés » permet d'inclure ou masquer les catégories archivées

**Critère de validation terrain :**
« Strophe : (1) crée une sous-catégorie dans une catégorie existante, (2) la modifie, (3) l'archive puis la restaure, (4) bascule entre Vue Caisse et Vue Réception et vérifie que l'ordre d'affichage change, (5) la retrouve dans la caisse et dans la liste de réception. La page reste stable tout au long. »

**Preuves obligatoires de fermeture :**
- Formulaire création + modification fonctionnel (capture écran).
- Soft delete + restauration démontrés.
- Arborescence hiérarchique visible et cohérente.
- Toggle Caisse / Réception opérationnel.
- Visibilité par catégorie toggleable (checkbox inline sauvegardée).
- Trace Copy/Consolidate/Security dans les Completion Notes.

## Tasks / Subtasks

- [x] **T1 — Analyse des sources 1.4.4 et écran actuel** (AC: tous)
  - [x] T1.1 — Lire les docs de synthèse dans `references/ancien-repo/` (component-inventory-frontend.md, source-tree-analysis.md, fonctionnalites-actuelles.md, api-contracts-api.md) pour comprendre les composants et patterns 1.4.4
  - [x] T1.2 — Comparer `frontend/src/admin/AdminCategoriesPage.tsx` (page actuelle) avec la description des composants 1.4.4 dans les docs de synthèse
  - [x] T1.3 — Vérifier les endpoints API existants (`api/routers/categories.py`, `frontend/src/api/categories.ts`) — les endpoints CRUD, soft delete, restore existent déjà

- [x] **T2 — Bouton « Nouvelle catégorie » + formulaire création** (AC: 1)
  - [x] T2.1 — Ajouter le bouton et ouvrir un formulaire (nom, parent optionnel, nom officiel optionnel)
  - [x] T2.2 — Appel API création (POST) et mise à jour de l'arborescence sans rechargement complet

- [x] **T3 — Action « Modifier » par ligne** (AC: 2)
  - [x] T3.1 — Lien/bouton « Modifier » sur chaque ligne, formulaire pré-rempli
  - [x] T3.2 — Sauvegarde (PUT) et mise à jour immédiate de la liste

- [x] **T4 — Soft delete (Archiver) + Restaurer** (AC: 3, 7)
  - [x] T4.1 — Renommer le bouton « Supprimer » en « Archiver » (vocabulaire parité 1.4.4)
  - [x] T4.2 — Catégorie archivée : grisée visuellement (opacity 0.5), marquée « Archivée » au lieu de « Supprimée »
  - [x] T4.3 — Action « Restaurer » à la place d'« Archiver » pour les archivées
  - [x] T4.4 — Renommer le toggle « Inclure supprimées » en « Afficher les éléments archivés »

- [x] **T5 — Arborescence hiérarchique** (AC: 7)
  - [x] T5.1 — Affichage racines + sous-catégories avec indentation (existant), expand/collapse sur les catégories parentes (chevron ▶/▼, expandedIds state, toutes ouvertes par défaut)

- [x] **T6 — Toggle Vue Caisse / Vue Réception** (AC: 4, 5)
  - [x] T6.1 — SegmentedControl Mantine « Vue Caisse » / « Vue Réception »
  - [x] T6.2 — Vue Caisse : tri par `display_order`, colonnes Nom/Nom officiel/Visible caisse/Ordre caisse/Statut/Actions
  - [x] T6.3 — Vue Réception : tri par `display_order_entry`, colonnes Nom/Nom officiel/Visible réception/Ordre réception/Statut/Actions
  - [x] T6.4 — Clic checkbox visibilité : PUT immédiat (optimiste) via `updateCategory()` pour `is_visible_sale` / `is_visible_reception`

- [x] **T7 — Ordre d'affichage inline** (AC: 6)
  - [x] T7.1 — NumberInput Mantine inline (InlineOrderInput component) pour `display_order` (Vue Caisse) / `display_order_entry` (Vue Réception)
  - [x] T7.2 — Sauvegarde automatique (blur ou Entrée) via PUT, mise à jour optimiste

- [x] **T8 — Barre de recherche** (Recommandé, hors AC bloquants)
  - [x] T8.1 — TextInput avec IconSearch, filtrage récursif temps réel (parents visibles si enfant matche), force-expand pendant recherche

- [x] **T9 — Tests et preuves** (AC: tous)
  - [x] T9.1 — 14 tests co-locés (Vitest + RTL) : page/breadcrumb, import/export, forbidden, empty, hierarchy, restaurer, nouvelle catégorie, modifier, archiver (label), archivée (statut), expand/collapse, vue toggle, vue switch colonnes, search filter
  - [x] T9.2 — Completion Notes avec trace Copy/Consolidate/Security (ci-dessous)

### Review Follow-ups (AI)

- [x] [AI-Review][MEDIUM] Utiliser `loadHierarchy(true)` (silent) après create/edit/archive/restore au lieu de `loadHierarchy()` pour éviter le flash spinner — FIXED
- [x] [AI-Review][MEDIUM] Désactiver checkbox visibilité et InlineOrderInput sur les catégories archivées (`disabled={!!node.deleted_at}`) — FIXED
- [x] [AI-Review][MEDIUM] Remplacer le catch vide dans handleHardDelete par un commentaire explicatif documentant le choix de design — FIXED
- [x] [AI-Review][MEDIUM] Ajouter des tests de vérification d'appels API (create, archive, visibility toggle) — FIXED (3 tests ajoutés, 17/17 passent)
- [ ] [AI-Review][MEDIUM] Extraire sous-composants CategoryFormModal, ImportModal, CategoryRow pour réduire le composant monolithique — DEFERRED: refactoring recommandé pour une future story de dette technique. Le composant reste maintenable à ~740 lignes.

## Dev Notes

### Fichiers source 1.4.4 — ATTENTION

Les chemins `references/ancien-repo/repo/...` listés dans l'epic **n'existent pas** dans le workspace. Le repo 1.4.4 n'a pas été copié — seuls des **documents de synthèse** sont disponibles dans `references/ancien-repo/` :

- `references/ancien-repo/component-inventory-frontend.md` — inventaire composants frontend 1.4.4
- `references/ancien-repo/source-tree-analysis.md` — analyse arborescence source
- `references/ancien-repo/fonctionnalites-actuelles.md` — fonctionnalités implémentées
- `references/ancien-repo/api-contracts-api.md` — contrats API
- `references/ancien-repo/checklist-import-1.4.4.md` — checklist Copy/Consolidate/Security

Utiliser ces synthèses comme référence au lieu des fichiers source. L'implémentation actuelle dans `AdminCategoriesPage.tsx` est déjà un bon point de départ (CRUD de base déjà fonctionnel).

### Périmètre fonctionnel (parité 1.4.4)

| Fonctionnalité | Priorité | Task |
|----------------|----------|------|
| Bouton « Nouvelle catégorie » + formulaire (nom, parent, nom officiel) | Indispensable | T2 (done) |
| Action « Modifier » sur chaque ligne | Indispensable | T3 (done) |
| Soft delete (archiver) + restauration | Indispensable | T4 (done) |
| Arborescence hiérarchique avec indentation | Indispensable | T5 (done) |
| Toggle Vue Caisse / Vue Réception | Indispensable | T6 (done) |
| Visibilité par catégorie (checkbox inline — sauvegarde immédiate) | Indispensable | T6 (done) |
| Ordre d'affichage `display_order` / `display_order_entry` — input inline | Indispensable | T7 (done) |
| Expand/Collapse des catégories parentes | Indispensable | T5 (done) |
| Toggle « Afficher les éléments archivés » | Indispensable | T4 (done) |
| Barre de recherche temps réel (filtrage récursif) | Recommandé | T8 (done) |
| Drag-and-drop réorganisation (ou boutons ↑↓ en fallback) | Optionnel | hors scope |

### Vocabulaire — renommages requis

Le code actuel utilise « Supprimer » / « Supprimée » / « Inclure supprimées ». La 1.4.4 et l'epic utilisent « Archiver » / « Archivée » / « Afficher les éléments archivés ». **T4 doit renommer** ces libellés pour la parité.

### API existante — pas de nouveau endpoint requis

L'API actuelle (`frontend/src/api/categories.ts`, `api/routers/categories.py`) fournit déjà :
- `createCategory` (POST), `updateCategory` (PUT) — utilisés par T2/T3
- `deleteCategory` (DELETE = soft delete), `restoreCategory` (POST /restore) — pour T4
- `getCategoriesHierarchy` (GET /hierarchy) — pour T5
- `CategoryUpdateBody` accepte déjà `is_visible_sale`, `is_visible_reception`, `display_order`, `display_order_entry` — pour T6/T7

Pas de nouveau endpoint backend nécessaire. Tout le travail restant est frontend.

### Formulaire parent — bug connu

Le Select du parent dans le formulaire ne montre que les catégories racines (`tree.filter(...)`) au lieu de toutes les catégories aplaties. Corriger pour permettre l'assignation à n'importe quelle catégorie (pas seulement racine).

### Project Structure Notes

- Page admin catégories : `frontend/src/admin/AdminCategoriesPage.tsx` (route `/admin/categories`).
- API catégories : `api/routers/categories.py`, `api/schemas/category.py`, `api/models/category.py`, `frontend/src/api/categories.ts`.
- Conventions : Mantine, tests co-locés `*.test.tsx`, Vitest + RTL (voir `references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 19, Story 19.2]
- [Source: references/artefacts/2026-03-16_audit-fonctionnel-terrain.md — §5 Admin]
- [Source: references/ancien-repo/checklist-import-1.4.4.md — Copy/Consolidate/Security]

## Dev Agent Record

### Agent Model Used

claude-4.6-opus (bmad-dev subagent)

### Debug Log References

- Analyse T1 : écran actuel sans toggle Vue Caisse/Réception ni ordre inline. API existante (createCategory, updateCategory, getCategoriesHierarchy, deleteCategory, restoreCategory) suffisante pour tous les AC.
- Tests : modal Mantine en portail ; assertions simplifiées (findByTestId, getByRole button Créer/Enregistrer).
- T4-T9 : implémentation complète en une passe. 14/14 tests Vitest passent. Aucun lint error.
- Bug fix parent Select : `getAllCategoriesForSelect()` aplatit l'arbre entier, exclut la catégorie en édition et ses descendants (empêche les cycles parent).
- Code review fixes : `loadHierarchy(true)` silent dans tous les handlers mutation (create/edit/archive/restore/hardDelete/import). `disabled` sur checkbox visibilité et InlineOrderInput pour catégories archivées. Commentaire explicatif dans catch handleHardDelete. 3 tests API ajoutés (create, archive, visibility toggle). 17/17 tests passent.

### Completion Notes List

- AC1 (Nouvelle catégorie) : bouton « Nouvelle catégorie », modal formulaire (nom, parent optionnel, nom officiel), POST puis loadHierarchy(true) (silent, sans flash spinner).
- AC2 (Modifier) : bouton « Modifier » par ligne (actives), même modal pré-remplie, PUT puis loadHierarchy(true) (silent).
- AC3 (Archiver/Restaurer) : bouton « Archiver » (orange, IconArchive) remplace « Supprimer ». Catégorie archivée affichée avec opacity 0.5 et statut « Archivée ». Bouton « Restaurer » (IconArchiveOff) visible uniquement pour archivées. Confirm dialog « Archiver cette catégorie ? ». Toggle « Afficher les éléments archivés ».
- AC4+AC5 (Vue Caisse/Réception) : SegmentedControl Mantine. Vue Caisse trie par `display_order`, affiche checkbox `is_visible_sale`. Vue Réception trie par `display_order_entry`, affiche checkbox `is_visible_reception`. Checkbox toggle = PUT immédiat avec mise à jour optimiste du state local.
- AC6 (Ordre inline) : composant `InlineOrderInput` (NumberInput Mantine w=70). Sauvegarde sur blur ou Entrée via `updateCategory()`. Mise à jour optimiste (state local avant réponse API), puis refresh silencieux.
- AC7 (Arborescence) : `expandedIds` state avec chevrons cliquables (IconChevronDown/Right). Toutes les catégories parentes ouvertes par défaut au premier chargement. `flattenTree()` respecte l'état expand/collapse.
- Recherche (recommandé) : TextInput avec IconSearch. Filtrage récursif case-insensitive (`filterTreeByQuery`). Parents visibles si un enfant matche. Force-expand de toute l'arborescence pendant la recherche.
- Bug fix : Parent Select dans modal formulaire liste désormais TOUTES les catégories (via `getAllCategoriesForSelect` qui aplatit l'arbre), pas seulement les racines. Exclut la catégorie en cours d'édition et ses descendants pour éviter les cycles.
- Copy/Consolidate/Security : réutilisation API existante (frontend/src/api/categories.ts, api/routers/categories.py) ; permissions admin déjà appliquées côté backend ; aucun nouveau endpoint créé. Helpers purs extraits hors composant (sortTreeByField, filterTreeByQuery, flattenTree, collectParentIds, updateNodeInTree, getAllCategoriesForSelect).
- Code review fixes : (1) loadHierarchy(true) silent dans handleFormSubmit/handleArchive/handleRestore/handleHardDelete/handleImportExecute — supprime le flash spinner. (2) disabled sur checkbox visibilité et InlineOrderInput pour catégories archivées — empêche les PUT accidentels. (3) Commentaire explicatif dans catch handleHardDelete. (4) 3 tests API ajoutés (create, archive, visibility toggle) — 17/17 tests passent. (5) Extraction sous-composants reportée en dette technique.

### File List

- frontend/src/admin/AdminCategoriesPage.tsx (MODIFIED — T4-T8 + bug fix parent select)
- frontend/src/admin/AdminCategoriesPage.test.tsx (MODIFIED — 14 tests, couvrant T4-T8)

## Senior Developer Review (AI)

### Round 1 — 2026-03-16

**Reviewer:** QA Agent (claude-4.6-opus) — 2026-03-16
**Outcome:** CHANGES REQUESTED
**Git vs Story Discrepancies:** 0

5 issues MEDIUM identifiées. Voir Review Follow-ups ci-dessus pour le détail des corrections demandées.

### Round 2 — 2026-03-16

**Reviewer:** QA Agent (claude-4.6-opus) — 2026-03-16
**Outcome:** APPROVED
**Git vs Story Discrepancies:** 0 (File List matches git changes for this story scope)

#### Vérification des corrections Round 1

| # | Issue | Statut | Preuve |
|---|-------|--------|--------|
| 1 | `loadHierarchy(true)` silent sur mutations | FIXED | Tous les handlers (create/edit/archive/restore/hardDelete/import/visibility/order) appellent `loadHierarchy(true)` — plus de flash spinner |
| 2 | Contrôles désactivés sur archivées | FIXED | `disabled={!!node.deleted_at}` sur Checkbox (L574) et InlineOrderInput (L588) |
| 3 | Commentaire catch vide handleHardDelete | FIXED | Commentaire explicatif L333 documentant le choix de design (fail-open avec confirmation) |
| 4 | Tests API (create, archive, visibility) | FIXED | 3 tests ajoutés (L238-L295) avec `toHaveBeenCalledWith` vérifiant les bons arguments. 17/17 tests |
| 5 | Composant monolithique | DEFERRED | Correctement reporté en dette technique dans la story. Composant maintenable à ~740 lignes |

#### AC Validation Summary (Round 2)

| AC | Status | Evidence |
|----|--------|----------|
| AC1 — Créer | IMPLEMENTED | Bouton, modal formulaire, POST + `loadHierarchy(true)` (silent) |
| AC2 — Modifier | IMPLEMENTED | Bouton par ligne, formulaire pré-rempli, PUT + `loadHierarchy(true)` (silent) |
| AC3 — Archiver/Restaurer | IMPLEMENTED | Archiver orange, Restaurer, opacity 0.5, label Archivée, toggle éléments archivés |
| AC4 — Toggle Vue Caisse/Réception | IMPLEMENTED | SegmentedControl, tri dynamique, en-têtes colonnes adaptés |
| AC5 — Visibilité checkbox | IMPLEMENTED | Checkbox par ligne, PUT optimiste, disabled sur archivées |
| AC6 — Ordre inline | IMPLEMENTED | InlineOrderInput, save blur/Entrée, optimiste + PUT, disabled sur archivées |
| AC7 — Arborescence | IMPLEMENTED | expandedIds + chevrons, toutes ouvertes par défaut, toggle archivées |

#### Issues restantes (LOW, non bloquantes)

- Recherche filtre uniquement `name` (pas `official_name`) — hors AC
- `window.confirm` au lieu de Mantine Modal pour archivage — pattern existant
- Breadcrumb `href` au lieu de React Router `Link` — pattern pré-existant

#### Review Decision

**APPROVED** — Les 4 corrections MEDIUM sont vérifiées comme effectives. Aucun nouveau problème introduit. 17/17 tests passent. Tous les AC sont implémentés. Les 3 issues LOW restantes sont mineures et hors périmètre bloquant.
