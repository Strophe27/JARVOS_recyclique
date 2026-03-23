# Story 19.1: Import catégories — correction parent_id / sous-catégories

Status: done

## Story

En tant qu'administrateur,  
je veux importer le CSV 1.4.4 complet (catégories racines + sous-catégories) sans erreur,  
afin que la caisse affiche les catégories et que la réception puisse saisir des lignes.

## Contexte

L'import CSV actuel n'insère que les 20 catégories racines ; les 57 sous-catégories échouent
avec l'erreur **« parent_id invalide »** (audit terrain 2026-03-16).

Conséquences :
- Caisse affiche « Aucune catégorie disponible, contactez un administrateur » — flux vente bloqué.
- Liste déroulante des catégories vide dans la saisie de lignes de réception — flux réception bloqué.
- Page `/reception` devient une page blanche après import partiel (probable crash JS sur état incohérent).

**Source :** `references/artefacts/2026-03-16_audit-fonctionnel-terrain.md` §5 (Admin > Catégories).  
**Epic :** 19 — Correction de cap post-audit terrain 2026-03-16.  
**Priorité :** P0 (toutes les stories P1 bloquées par celle-ci).

## Acceptance Criteria

1. **Given** un CSV 1.4.4 contenant des catégories racines et des sous-catégories référençant un `parent_id`  
   **When** l'admin lance l'import depuis Admin > Catégories > Importer CSV  
   **Then** toutes les lignes valides (racines + sous-catégories) sont importées sans erreur « parent_id invalide »

2. **And** l'ordre d'insertion ou la résolution des références garantit que les parents existent avant les enfants au moment du `db.commit()`

3. **And** les catégories racines ET les sous-catégories apparaissent dans la grille caisse après import

4. **And** les catégories racines ET les sous-catégories apparaissent dans la liste déroulante de saisie des lignes de réception après import

5. **And** la réponse de `/import/execute` liste les lignes réellement créées vs les erreurs résiduelles (format actuel `{created, errors}` conservé)

6. **And** un import d'un CSV ne contenant que des catégories racines (sans sous-catégories) continue de fonctionner sans régression

**Critère de validation terrain :**  
« Strophe importe le CSV 1.4.4 complet (77 lignes) ; aucune erreur ; les catégories et sous-catégories apparaissent en caisse et dans la liste de saisie de la réception. »

## Tasks / Subtasks

- [x] **T1 — Diagnostic du format parent_id dans le CSV 1.4.4** (AC: 1, 2)
  - [x] T1.1 — Format confirmé : **H2** (non-UUID). L'erreur "parent_id invalide" correspond à l'échec de `UUID(row[1].strip())` dans `parse_csv_row`. Le CSV 1.4.4 utilise des noms textuels dans la colonne `parent_id`.
  - [x] T1.2 — Documenté dans les commentaires de code (`csv_categories.py` et `categories.py`)

- [x] **T2 — Corriger `parse_csv_row` dans `api/services/csv_categories.py`** (AC: 1)
  - [x] T2.1 — Si UUID parse échoue : stocker la valeur brute dans `parent_ref: str` au lieu de retourner `valid=False`
  - [x] T2.2 — Si UUID valide : comportement actuel conservé (`parent_id` UUID)

- [x] **T3 — Corriger `post_import_execute` dans `api/routers/categories.py`** (AC: 1, 2)
  - [x] T3.1 — Import en deux passes implémenté (racines passe 1, enfants passe 2 avec mapping nom→uuid)
  - [x] T3.2 — Parent introuvable → erreur dans `errors`, autres lignes non bloquées
  - [x] T3.3 — Format de réponse `{created: int, errors: list[str]}` conservé
  - [x] T3.4 — `db.flush()` après passe 1 ; mapping construit **après** flush (cat.id None avant flush avec SQLAlchemy column default)

- [x] **T4 — Schema `CategoryImportAnalyzeRow`** (AC: 1, 2)
  - [x] T4.1 — `parent_ref: str | None = None` ajouté à `CategoryImportAnalyzeRow`
  - [x] T4.2 — `parent_id: UUID | None` conservé pour le cas H1

- [x] **T5 — Tests backend** (AC: 1–6)
  - [x] T5.1 — `test_import_execute_racines_et_sous_categories` : 3 racines + 5 sous-cats → 8 créées, 0 erreur ✓
  - [x] T5.2 — `test_import_execute_non_regression_racines_seules` : sans sous-cats → comportement inchangé ✓
  - [x] T5.3 — `test_import_execute_parent_orphelin_dans_errors` : orphelin → dans errors, autres lignes OK ✓

- [x] **T6 — Vérification frontend** (AC: 3, 4) — validation terrain par Strophe
  - [x] T6.1 — Vérifier que `GET /v1/categories` et `GET /v1/categories/hierarchy` retournent bien les sous-catégories après import
  - [x] T6.2 — Vérifier que `GET /v1/categories/sale-tickets` retourne racines + sous-catégories (si `is_visible_sale = true`)
  - [x] T6.3 — Vérifier que `GET /v1/categories/entry-tickets` retourne les catégories pour la saisie de réception
  - [x] T6.4 — Vérifier manuellement que la grille caisse (`CategoryGrid.tsx`) affiche les catégories importées
  - [x] T6.5 — Vérifier que la liste déroulante catégories dans la page réception (`/reception/ticket/{id}`) n'est plus vide

## Dev Notes

### Cause racine du bug — à confirmer en T1

Le code actuel dans `post_import_execute` (`api/routers/categories.py`, lignes 230–259) traite les lignes **dans l'ordre du CSV**. Pour chaque sous-catégorie, il appelle `_get_category_or_404(db, r.parent_id)` **avant** que les catégories parentes de la même session d'import aient été commitées.

Deux hypothèses (à trancher en T1) :

| Hypothèse | parent_id dans le CSV 1.4.4 | Erreur observée | Fix |
|---|---|---|---|
| **H1** | UUID valide mais de l'ANCIENNE BDD (pas dans la nouvelle) | "parent_id introuvable" en execute | Two-pass avec remapping UUID→UUID |
| **H2** | Entier ou nom textuel (format non-UUID) | "parent_id invalide" en analyze (parse échoue) | Accepter format non-UUID + two-pass avec remapping nom/entier→UUID |

L'erreur terrain est **"parent_id invalide"** — ce qui correspond à un échec de `UUID(row[1].strip())` dans `parse_csv_row` (ligne 29 de `csv_categories.py`). Cela pointe vers **H2** (format non-UUID), mais vérifier physiquement le CSV.

### Approche recommandée : import deux passes

```python
# Passe 1 : insérer les racines, construire le mapping ref_source → new_uuid
mapping = {}
for r in root_rows:           # rows où parent_id vide ET parent_ref vide
    cat = Category(name=r.name, ...)   # cat.id est assigné côté Python (uuid.uuid4()) — disponible immédiatement
    db.add(cat)
    mapping[ref_source_key(r)] = cat.id  # clé : UUID string (H1) ou nom/entier (H2)
    created += 1

db.flush()  # ← OBLIGATOIRE : INSERTs parents envoyés à PostgreSQL avant les enfants
            # La FK categories.parent_id est NOT DEFERRABLE ; sans flush, les INSERTs enfants
            # lèveraient une IntegrityError avant le commit.

# Passe 2 : insérer les sous-catégories en résolvant parent via mapping
for r in child_rows:          # rows où parent_id non vide OU parent_ref non vide
    parent_uuid = mapping.get(ref_source_key(r))
    if parent_uuid is None:
        errors.append(f"Ligne {r.row_index}: parent introuvable")
        continue
    child = Category(name=r.name, parent_id=parent_uuid, ...)
    db.add(child)
    created += 1

db.commit()  # une fois à la fin
```

**`ref_source_key(r)` selon le format détecté en T1 :**
- H2 (nom textuel ou entier) : `r.parent_ref` (string brute stockée dans le champ intermédiaire)
- H1 (UUID ancien) : str(r.parent_id) — mais nécessite que le CSV inclue la propre UUID de chaque catégorie (colonne `id`) pour construire le mapping ; si le CSV n'a pas de colonne `id`, basculer sur mapping par nom (hypothèse noms uniques) — vérifier à T1.1

**`Category.id` est généré Python-side** (`default=uuid.uuid4` dans le modèle) : `cat.id` est disponible sans flush. C'est pour les INSERTs eux-mêmes que le flush est nécessaire (satisfaire la FK en DB).

Ce design est robuste quel que soit le format du CSV (UUID, entier, nom) — seule la clé de lookup du mapping change.

### Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `api/services/csv_categories.py` | `parse_csv_row` — accepter parent_id non-UUID → `parent_ref` ; ajout `detect_csv_format`, `parse_csv_row_legacy` pour format export 1.4.4 (col 0 = parent, col 1 = enfant) |
| `api/schemas/category.py` | `parent_ref: str \| None = None` dans `CategoryImportAnalyzeRow` |
| `api/routers/categories.py` | `post_import_analyze` — détection format + choix du parser ; `post_import_execute` — stratégie deux phases (INSERT sans parent → flush → UPDATE parent_id) |
| `api/tests/routers/test_categories.py` | Nouveaux tests AC1–AC6 |

### Fichiers NE PAS modifier

- `api/models/category.py` — le modèle est correct (parent_id FK nullable, UUID)
- `api/routers/categories.py` endpoints GET — ils sont corrects, aucune modification nécessaire
- Frontend `categories.ts`, `AdminCategoriesPage.tsx` — pas de changement côté frontend pour cette story (sauf si T6 révèle un bug d'affichage)

### Contraintes et garde-fous

- **FK PostgreSQL** : la table `categories` a `parent_id ForeignKey("categories.id", ondelete="SET NULL")`, contrainte `NOT DEFERRABLE`. L'insertion d'une sous-catégorie avec un `parent_id` inexistant en BDD lèverait une IntegrityError. La deux-passes + `db.flush()` après passe 1 garantit que les parents existent en DB avant les INSERTs enfants. Ne pas compter sur l'ordre d'insertion dans la session SQLAlchemy seul — sans flush, PostgreSQL vérifie la FK au flush/commit et lève une IntegrityError si le parent n'existe pas encore.
- **Pas de rollback total sur erreur partielle** : si une sous-catégorie est orpheline (parent introuvable), elle est sautée et ajoutée aux erreurs — les autres lignes sont insérées normalement. C'est le comportement actuel à conserver.
- **Idempotence** : l'import peut créer des doublons si appelé plusieurs fois. Ce n'est pas dans scope de cette story — s'assurer de documenter dans les notes de complétion si nécessaire.
- **Encodage CSV** : le code gère déjà UTF-8-sig et latin-1. Ne pas modifier ce comportement.

### Conventions projet

- Tests backend : dans `api/tests/routers/` (co-localisés avec les routers testés).
- Stack tests : pytest + SQLAlchemy in-memory (voir les tests existants dans `test_categories.py`).
- Pas de migration BDD requise (schéma inchangé).
- Pas de modification Docker/Compose.

### Trace Copy/Consolidate/Security (si code 1.4.4 adapté)

Si le code de l'ancien repo (`references/ancien-repo/`) est consulté pour la logique d'import :
- **Copy** : noter le fichier source 1.4.4 en commentaire
- **Consolidate** : vérifier cohérence avec `api/services/csv_categories.py` existant
- **Security** : aucun secret attendu dans la logique d'import CSV

### Références

- Code actuel import execute : `api/routers/categories.py` lignes 230–259
- Code actuel parse CSV : `api/services/csv_categories.py` lignes 19–54
- Modèle Category : `api/models/category.py`
- Schema import : `api/schemas/category.py` (`CategoryImportAnalyzeRow`, `CategoryImportExecuteBody`)
- Audit terrain : `references/artefacts/2026-03-16_audit-fonctionnel-terrain.md` §5
- Epic 19 story 19.1 : `_bmad-output/planning-artifacts/epics.md` lignes ~2519–2542
- Sprint Change Proposal : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-16.md` §4.2

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (bmad-dev, 2026-03-16)

### Debug Log References

- Format H2 confirmé : `parse_csv_row` échouait sur `UUID(row[1].strip())` car le CSV 1.4.4 utilise des noms textuels comme référence parent.
- Bug découvert : `cat.id` est `None` avant `db.flush()` avec `Column(default=uuid.uuid4)` — le mapping nom→uuid doit être construit **après** le flush, pas avant.

### Completion Notes List

- [x] Format parent_id confirmé : H2 (nom textuel, non-UUID)
- [x] Validation terrain par Strophe : import CSV 1.4.4 (80 lignes) réussi, 0 erreur ; catégories visibles en caisse et réception
- [x] Découverte post-CR : le CSV exporté par la prod 1.4.4 a un **format colonnes inversé** (col 0 = catégorie parente, col 1 = sous-catégorie). Correction : détection automatique du format + parser legacy (`parse_csv_row_legacy`) ; stratégie execute en deux phases (INSERT toutes lignes sans parent → flush → UPDATE parent_id via mapping nom→uuid)
- [ ] 3 tests pré-existants en échec par isolation (test_get_categories_hierarchy_empty, etc.) — problème antérieur à cette story, non introduit ici

### Review Follow-ups (AI)

- [ ] [AI-Review][MEDIUM] Test T5.1 : ajouter assertion que les sous-catégories ont `parent_id is not None` [test_categories.py:366-369]
- [ ] [AI-Review][MEDIUM] Ajouter test cas H1 : import sous-catégorie avec parent_id UUID existant en BDD [categories.py:284-290]
- [ ] [AI-Review][MEDIUM] Test T5.1 : vérifier AC3/AC4 via GET /sale-tickets et GET /entry-tickets (pas seulement GET /categories) [test_categories.py:366]
- [ ] [AI-Review][MEDIUM] Gérer collision noms racines dans le mapping (warning ou déduplication) [categories.py:272]
- [ ] [AI-Review][LOW] Déplacer `import csv, io` au niveau du module dans test_categories.py [test_categories.py:319]
- [ ] [AI-Review][LOW] Corriger contradiction dans dev notes §"Approche recommandée" : cat.id n'est PAS disponible avant flush (évalué par SQLAlchemy au flush)

### Senior Developer Review (AI)

**Date :** 2026-03-16  
**Reviewer :** bmad-qa (claude-4.6-sonnet-medium-thinking)  
**Résultat :** APPROVED

**Synthèse :** Implémentation correcte du bug P0. Two-pass avec `db.flush()` intermédiaire résout la contrainte FK NOT DEFERRABLE. Mapping nom→uuid construit après flush (cat.id None avant flush avec Column(default=uuid.uuid4)). Tous les ACs backend implémentés. Tests T5.1–T5.3 couvrent les cas principaux. 4 MEDIUM sur qualité tests (non bloquants P0), 3 LOW documentation/style. Aucune issue HIGH/CRITICAL.

### Implémentation finale (post-validation terrain, 2026-03-16)

**Problème identifié en terrain :** Le CSV exporté par la prod 1.4.4 n’a pas le même ordre de colonnes que notre template. Format **legacy** : colonne 0 = catégorie parente, colonne 1 = sous-catégorie (vide si racine). Notre code lisait col 0 = name, col 1 = parent → toutes les sous-catégories avaient le nom du parent et `parent_ref` contenait le vrai nom de l’enfant → « parent introuvable ».

**Corrections apportées :**

1. **`api/services/csv_categories.py`**
   - `detect_csv_format(header, first_rows)` : détecte `"legacy"` (export 1.4.4) vs `"recyclique"` (notre export name, parent_id).
   - `parse_csv_row_legacy(row, row_index)` : col 0 = parent, col 1 = enfant ; si col 1 vide → racine (name = col 0), sinon name = col 1, parent_ref = col 0.
   - `parse_csv_row` inchangé pour le format recyclique.

2. **`api/routers/categories.py` — `post_import_analyze`**
   - Lecture de toutes les lignes, appel à `detect_csv_format`, puis utilisation de `parse_csv_row_legacy` ou `parse_csv_row` selon le format.

3. **`api/routers/categories.py` — `post_import_execute`**
   - Stratégie **deux phases** (au lieu de deux passes) : (1) INSERT de toutes les lignes valides avec `parent_id = NULL` → `db.flush()` → mapping `name → uuid` ; (2) pour chaque ligne avec `parent_ref` ou `parent_id`, résolution du parent et `cat.parent_id = parent_uuid`. Gère hiérarchie à profondeur arbitraire sans ordre de lignes.

**Critère de validation terrain :** « Strophe importe le CSV 1.4.4 complet ; aucune erreur ; les catégories et sous-catégories apparaissent en caisse et dans la réception. » → **Validé.**

### File List

- `api/services/csv_categories.py` — `CSV_HEADERS`, `detect_csv_format`, `parse_csv_row`, `parse_csv_row_legacy`
- `api/schemas/category.py`
- `api/routers/categories.py` — `post_import_analyze` (détection format), `post_import_execute` (deux phases)
- `api/tests/routers/test_categories.py`
