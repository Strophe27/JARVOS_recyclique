# Story B47-P2: Service d'Import avec Fuzzy Matching

**Statut:** Done
**Épopée:** [EPIC-B47 – Import Legacy CSV & Template Offline](../epics/epic-b47-import-legacy-csv-template-offline.md)
**Module:** Backend API
**Priorité:** Moyenne

---

## 1. Contexte

Le CSV nettoyé (B47-P1) contient des catégories non normalisées (`Vaisselle`, `VAISELLE`, `vaiselle`, `DEEE`, `D3E`, `deee`, `EEE`, `EEE PAM`). Cette story crée le service backend d'import avec mapping intelligent des catégories via fuzzy matching (Levenshtein) pour proposer automatiquement les mappings vers les catégories existantes en base.

Le service fonctionne en deux étapes :
1. **Analyse** : Upload du CSV nettoyé → analyse et proposition de mappings → retour des catégories non mappables
2. **Exécution** : Upload du CSV + fichier de mapping validé → création des sessions/tickets/lignes en base

---

## 2. User Story

En tant que **Administrateur**,
je veux **importer le CSV legacy avec mapping intelligent des catégories**,
afin que **les données historiques soient correctement associées aux catégories existantes en base avec validation manuelle possible.**

---

## 3. Critères d'acceptation

1. **Service `LegacyImportService`** créé dans `api/src/recyclic_api/services/legacy_import_service.py` :
   - Chargement des catégories depuis la base via `CategoryService.get_categories()`
   - Fuzzy matching (Levenshtein) pour proposer des mappings avec score de confiance
   - Seuil de confiance configurable (par défaut : 80%)
   - Génération d'un fichier JSON de mapping (`category_mapping.json`) avec structure :
     ```json
     {
       "mappings": {
         "Vaisselle": {"category_id": "uuid", "category_name": "Vaisselle", "confidence": 100},
         "DEEE": {"category_id": "uuid", "category_name": "DEEE", "confidence": 85}
       },
       "unmapped": ["D3E", "EEE PAM"]
     }
     ```
   - Validation des mappings (vérifier que les `category_id` existent en base)

2. **Endpoint API `POST /api/v1/admin/import/legacy/analyze`** :
   - Upload du CSV nettoyé (format multipart/form-data)
   - Validation du format CSV (en-têtes : `date`, `category`, `poids_kg`, `destination`, `notes`)
   - Analyse et proposition de mappings pour toutes les catégories uniques du CSV
   - Retourne :
     - Liste des mappings proposés avec scores de confiance
     - Liste des catégories non mappables (score < seuil ou aucune correspondance)
     - Statistiques (nombre total de lignes, catégories uniques, etc.)
   - Rôle requis : `ADMIN` ou `SUPER_ADMIN`

3. **Endpoint API `POST /api/v1/admin/import/legacy/execute`** :
   - Upload du CSV nettoyé + fichier de mapping validé (JSON)
   - Validation du fichier de mapping (structure, `category_id` existants)
   - Création des `PosteReception` par jour (ou réutilisation si existe déjà)
   - Création des `TicketDepot` par jour avec `benevole_user_id` = utilisateur admin qui importe
   - Création des `LigneDepot` avec catégories mappées depuis le fichier JSON
   - Destination par défaut : `MAGASIN` (ou depuis le CSV si présente)
   - Rapport d'import avec statistiques :
     - Nombre de sessions créées/réutilisées
     - Nombre de tickets créés
     - Nombre de lignes importées
     - Nombre d'erreurs (lignes non importées)
   - Rôle requis : `ADMIN` ou `SUPER_ADMIN`
   - Transaction : tout ou rien (rollback en cas d'erreur)

4. **Gestion des erreurs** :
   - Catégories non mappées dans le JSON → erreur avec liste des catégories manquantes
   - `category_id` invalide → erreur avec détails
   - Dates invalides → erreur avec numéro de ligne
   - Poids invalides (≤ 0) → ligne ignorée avec log

5. **Tests** :
   - Tests unitaires pour le fuzzy matching (Levenshtein)
   - Tests unitaires pour la génération du mapping JSON
   - Tests d'intégration pour l'endpoint `analyze` (CSV avec catégories variées)
   - Tests d'intégration pour l'endpoint `execute` (création sessions/tickets/lignes)
   - Tests de cas d'erreur (mapping invalide, catégories manquantes)

---

## 4. Tâches

- [x] **T1 - Service LegacyImportService**
  - Créer `api/src/recyclic_api/services/legacy_import_service.py`
  - Implémenter `_load_categories()` : charger toutes les catégories actives via requête directe DB
  - Implémenter `_fuzzy_match_category()` : fuzzy matching avec Levenshtein (utiliser `python-Levenshtein` ou fallback `difflib`)
  - Implémenter `_generate_mapping()` : analyser les catégories uniques du CSV et proposer des mappings
  - Implémenter `analyze()` : analyser le CSV et retourner les propositions de mapping
  - Implémenter `execute()` : importer le CSV avec le mapping validé

- [x] **T2 - Endpoint Analyze**
  - Créer `api/src/recyclic_api/api/api_v1/endpoints/legacy_import.py`
  - Implémenter `POST /api/v1/admin/import/legacy/analyze` :
    - Validation du fichier CSV (format, en-têtes)
    - Appel à `LegacyImportService.analyze()`
    - Retourner les mappings proposés et les catégories non mappables
  - Ajouter la route dans `api/src/recyclic_api/api/api_v1/api.py`

- [x] **T3 - Endpoint Execute**
  - Implémenter `POST /api/v1/admin/import/legacy/execute` :
    - Validation du CSV et du fichier JSON de mapping
    - Appel à `LegacyImportService.execute()`
    - Retourner le rapport d'import avec statistiques
  - Gestion des erreurs avec messages détaillés

- [x] **T4 - Intégration avec ReceptionService**
  - Utiliser `ReceptionService` pour créer les `PosteReception` par jour
  - Utiliser `ReceptionService.create_ticket()` pour créer les `TicketDepot` par jour
  - Utiliser `ReceptionService.create_ligne()` pour créer les `LigneDepot`
  - Gérer la réutilisation des postes existants (vérifier si un `PosteReception` existe déjà pour la date)

- [x] **T5 - Schémas Pydantic**
  - Créer `api/src/recyclic_api/schemas/legacy_import.py` :
    - `CategoryMappingRequest` : structure du mapping JSON
    - `LegacyImportAnalyzeResponse` : réponse de l'endpoint analyze
    - `LegacyImportExecuteResponse` : réponse de l'endpoint execute
    - `ImportReport` : rapport d'import avec statistiques

- [x] **T6 - Tests**
  - Tests unitaires pour `_fuzzy_match_category()` (différents cas : exact match, typo, variations)
  - Tests unitaires pour `_generate_mapping()` (CSV avec catégories variées)
  - Tests d'intégration pour `analyze` (CSV réel avec catégories non normalisées)
  - Tests d'intégration pour `execute` (création complète : postes, tickets, lignes)
  - Tests de cas d'erreur (mapping invalide, catégories manquantes, dates invalides)
  - Créer `api/tests/test_legacy_import_service.py` et `api/tests/test_legacy_import_endpoint.py`

---

## 5. Dépendances

- **Pré-requis** : B47-P1 (le CSV nettoyé doit être disponible)
- **Bloque** : B47-P3 (l'interface web nécessite les endpoints)

---

## 6. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture (19 fichiers total, index fournit la navigation)

2. **Services Existants** :
   - `CategoryService.get_categories()` : charger toutes les catégories actives
   - `ReceptionService` : créer postes, tickets, lignes
     - `open_poste()` : créer ou réutiliser un `PosteReception`
     - `create_ticket()` : créer un `TicketDepot` pour un poste
     - `create_ligne()` : créer une `LigneDepot` pour un ticket
   - [Source: api/src/recyclic_api/services/reception_service.py]

3. **Modèles de Données** :
   - `PosteReception` : un poste par jour (ou réutilisation si existe)
   - `TicketDepot` : un ticket par jour avec `benevole_user_id` = utilisateur admin
   - `LigneDepot` : une ligne par ligne du CSV avec `category_id` mappé
   - `Category` : catégories existantes en base (via `CategoryService`)
   - [Source: epic-b47-import-legacy-csv-template-offline.md#structure-dimport]

4. **Patterns d'Endpoints Admin** :
   - Utiliser `UploadFile` de FastAPI pour l'upload de fichiers
   - Utiliser `require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])` pour l'autorisation
   - Pattern similaire à `db_import.py` et `categories.py` (import/analyze/execute)
   - [Source: api/src/recyclic_api/api/api_v1/endpoints/db_import.py, categories.py]

5. **Fuzzy Matching** :
   - Bibliothèque recommandée : `python-Levenshtein` (plus rapide) ou `fuzzywuzzy` (plus simple)
   - Seuil de confiance par défaut : 80% (configurable)
   - Normaliser les chaînes avant matching (lowercase, strip)
   - [Source: epic-b47-import-legacy-csv-template-offline.md#mapping-des-catégories]

6. **Gestion des Transactions** :
   - Utiliser `db.commit()` après création de toutes les lignes
   - En cas d'erreur, `db.rollback()` pour annuler toute la transaction
   - Logs détaillés pour chaque étape (création poste, ticket, lignes)

### Testing

**Standards de Test** :
- Tests unitaires dans `api/tests/test_legacy_import_service.py`
- Tests d'intégration dans `api/tests/test_legacy_import_endpoint.py`
- Utiliser `pytest` comme framework de test
- Structure AAA (Arrange, Act, Assert)
- Utiliser des fixtures pour les CSV de test et les catégories en base
- [Source: docs/testing-strategy.md]

**Cas de Test Requis** :
- Fuzzy matching : exact match (100%), typo (85%), variation (70%), aucune correspondance (< 80%)
- Génération de mapping : CSV avec catégories variées → propositions avec scores
- Endpoint analyze : CSV valide → retourne mappings et catégories non mappables
- Endpoint execute : CSV + mapping valide → création postes/tickets/lignes
- Cas d'erreur : mapping invalide, `category_id` inexistant, dates invalides
- Réutilisation de poste : si un `PosteReception` existe déjà pour la date, le réutiliser

---

## 7. Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-27 | 1.0 | Création de la story | Bob (Scrum Master) |
| 2025-01-27 | 1.1 | Validation PM : Story approuvée, passage en Ready | John (Product Manager) |

---

## 8. Dev Agent Record

### Agent Model Used
James (Dev Agent) - Claude Sonnet 4.5

### Debug Log References
Aucun problème majeur rencontré. Le service utilise directement la DB pour charger les catégories (synchrone) au lieu de CategoryService (async).

### Completion Notes List
- Service LegacyImportService créé avec fuzzy matching via python-Levenshtein (fallback difflib)
- Endpoints analyze et execute créés avec validation complète
- Schémas Pydantic créés pour toutes les requêtes/réponses
- Tests unitaires et d'intégration créés
- Intégration complète avec ReceptionService pour créer postes/tickets/lignes
- Gestion de la réutilisation des postes existants par date
- Transaction tout ou rien pour l'import
- Ajout de python-Levenshtein dans requirements.txt

### File List
**Nouveaux fichiers:**
- `api/src/recyclic_api/services/legacy_import_service.py` - Service principal avec fuzzy matching
- `api/src/recyclic_api/schemas/legacy_import.py` - Schémas Pydantic
- `api/src/recyclic_api/api/api_v1/endpoints/legacy_import.py` - Endpoints API
- `api/tests/test_legacy_import_service.py` - Tests unitaires du service
- `api/tests/test_legacy_import_endpoint.py` - Tests d'intégration des endpoints

**Fichiers modifiés:**
- `api/requirements.txt` - Ajout de python-Levenshtein==0.23.0
- `api/src/recyclic_api/api/api_v1/endpoints/__init__.py` - Ajout import legacy_import_router
- `api/src/recyclic_api/api/api_v1/api.py` - Ajout router legacy_import

---

## 9. QA Results

### Review Date: 2025-01-27

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

**Excellent** - L'implémentation est de haute qualité avec une architecture claire et bien structurée. Le service utilise le pattern service layer approprié, les endpoints suivent les conventions FastAPI, et les schémas Pydantic assurent une validation robuste. La gestion transactionnelle est correctement implémentée avec rollback en cas d'erreur.

**Points forts:**
- Architecture modulaire : service/endpoints/schémas bien séparés
- Fuzzy matching robuste avec fallback (python-Levenshtein → difflib)
- Gestion transactionnelle tout ou rien avec rollback approprié
- Validation complète des inputs (CSV, JSON, category_id)
- Intégration appropriée avec ReceptionService
- Cache des catégories pour performance

**Points d'amélioration:**
- Duplication de logique de vérification de poste existant (lignes 451-465 dans execute() et _get_or_create_poste_for_date)
- Chargement synchrone des catégories (mentionné dans notes dev comme choix délibéré)

### Refactoring Performed

Aucun refactoring effectué. Le code est de qualité production-ready. Une petite duplication de logique existe mais n'est pas bloquante.

### Compliance Check

- **Coding Standards**: ✓ Conforme PEP 8, type hints présents, docstrings complètes
- **Project Structure**: ✓ Service dans `services/`, endpoints dans `endpoints/`, schémas dans `schemas/`
- **Testing Strategy**: ✓ 19 tests couvrant unitaires et intégration, structure AAA respectée
- **All ACs Met**: ✓ Tous les 5 critères d'acceptation sont complètement implémentés et testés

### Requirements Traceability

**AC1 - Service LegacyImportService**: ✓
- `_load_categories()` → Chargement direct depuis DB avec cache
- `_fuzzy_match_category()` → Fuzzy matching Levenshtein avec seuil configurable
- `_generate_mapping()` → Génération mapping avec catégories uniques
- `analyze()` → Analyse CSV et proposition de mappings
- `execute()` → Import avec mapping validé
- Validation des category_id dans execute()
- **Tests**: `test_fuzzy_match_exact_match`, `test_fuzzy_match_typo`, `test_generate_mapping`, `test_analyze_valid_csv`, `test_execute_valid_import`

**AC2 - Endpoint Analyze**: ✓
- `POST /api/v1/admin/import/legacy/analyze` → Upload CSV multipart/form-data
- Validation format CSV et en-têtes requis
- Analyse avec proposition de mappings
- Retour mappings, unmapped, statistics, errors
- Rôle ADMIN/SUPER_ADMIN requis
- **Tests**: `test_analyze_requires_admin`, `test_analyze_valid_csv`, `test_analyze_invalid_file_format`, `test_analyze_with_confidence_threshold`

**AC3 - Endpoint Execute**: ✓
- `POST /api/v1/admin/import/legacy/execute` → Upload CSV + JSON mapping
- Validation CSV et mapping JSON
- Création PosteReception par jour (réutilisation si existe)
- Création TicketDepot par jour avec benevole_user_id = admin
- Création LigneDepot avec catégories mappées
- Destination par défaut MAGASIN
- Rapport d'import avec statistiques complètes
- Transaction tout ou rien avec rollback
- **Tests**: `test_execute_requires_admin`, `test_execute_valid_import`, `test_execute_invalid_mapping_json`, `test_execute_unmapped_category`

**AC4 - Gestion des erreurs**: ✓
- Catégories non mappées → erreur avec liste
- category_id invalide → erreur HTTPException 400
- Dates invalides → erreur avec numéro de ligne
- Poids invalides (≤ 0) → ligne ignorée avec log
- **Tests**: `test_execute_unmapped_category`, `test_execute_invalid_mapping_structure`, `test_analyze_invalid_date`, `test_analyze_invalid_weight`

**AC5 - Tests**: ✓
- Tests unitaires fuzzy matching (5 tests)
- Tests unitaires génération mapping (1 test)
- Tests unitaires analyze (4 tests)
- Tests unitaires execute (3 tests)
- Tests intégration endpoints (6 tests)
- Total: 19 tests couvrant tous les cas requis
- **Tests**: Tous les tests listés dans `test_legacy_import_service.py` et `test_legacy_import_endpoint.py`

### Improvements Checklist

- [x] Code conforme aux standards Python (PEP 8, type hints, docstrings)
- [x] Tests exhaustifs couvrant tous les cas de test requis
- [x] Gestion d'erreurs robuste avec messages détaillés
- [x] Architecture modulaire et maintenable
- [x] Gestion transactionnelle appropriée
- [x] Intégration correcte avec ReceptionService
- [x] **Recommandation future**: Refactoriser duplication de vérification poste existant ✅ **CORRIGÉ**
- [ ] **Recommandation future**: Tests de performance avec CSV de grande taille (630+ lignes)

### Security Review

**PASS** - Aucun problème de sécurité identifié. Les endpoints sont protégés par `require_role_strict([ADMIN, SUPER_ADMIN])`. Validation appropriée des inputs (CSV, JSON). Pas d'injection SQL (utilisation ORM SQLAlchemy). Validation des UUID pour category_id.

### Performance Considerations

**CONCERNS** - Performance acceptable pour le cas d'usage actuel mais quelques points à surveiller:
- Chargement synchrone des catégories depuis DB (mentionné dans notes dev comme choix délibéré)
- Cache des catégories implémenté mais pourrait être optimisé pour très grandes bases
- Fuzzy matching O(n*m) pour chaque catégorie unique (acceptable pour ~630 lignes)
- **Recommandation**: Valider le comportement avec CSV réel de grande taille

### Test Architecture Assessment

**Excellent** - Architecture de tests bien conçue avec:
- **Couverture**: 19 tests couvrant tous les critères d'acceptation
- **Niveaux appropriés**: Tests unitaires pour logique métier (service), tests d'intégration pour endpoints
- **Qualité**: Structure AAA respectée, fixtures appropriées, assertions claires
- **Maintenabilité**: Tests bien organisés en classes thématiques, noms descriptifs
- **Edge cases**: Tous les cas limites couverts (mapping invalide, catégories manquantes, dates invalides, poids invalides)

### Technical Debt Identification

**Aucune dette technique critique** - La duplication de code identifiée (DUP-001) a été corrigée. Voir section "QA Fixes Applied" ci-dessous.

### Files Modified During Review

Aucun fichier modifié. Le code est de qualité production-ready.

### Gate Status

**Gate: PASS** → `docs/qa/gates/B47.P2-service-import-fuzzy-matching.yml`

**Quality Score**: 92/100 (amélioré de 88 après correction DUP-001)

**Risques identifiés**: 
- Medium (1): Validation avec CSV legacy réel de grande taille recommandée
- Low (1): Tests de performance optionnels à ajouter

**NFR Validation**:
- Security: PASS
- Performance: CONCERNS (chargement synchrone, acceptable pour cas d'usage)
- Reliability: PASS
- Maintainability: PASS ✅ (duplication corrigée)

### Recommended Status

✓ **Ready for Done** - Tous les critères d'acceptation sont satisfaits, code de qualité, tests exhaustifs. L'amélioration recommandée (DUP-001) a été appliquée. Validation avec CSV legacy réel recommandée avant utilisation en production, mais non bloquant pour le statut "Done".

---

## 10. QA Fixes Applied

### Fix Date: 2025-01-27

### Fixed By: James (Dev Agent)

### Refactoring Applied

**DUP-001 - Duplication de logique de vérification de poste existant** ✅ **CORRIGÉ**

**Problème identifié:**
- Duplication de logique dans `execute()` (lignes 451-465) et `_get_or_create_poste_for_date()` pour vérifier l'existence d'un poste

**Solution appliquée:**
- Modifié `_get_or_create_poste_for_date()` pour retourner un tuple `(PosteReception, bool)` indiquant si le poste est nouveau
- Simplifié `execute()` pour utiliser directement `_get_or_create_poste_for_date()` sans duplication
- Réduction de ~15 lignes de code dupliqué

**Fichiers modifiés:**
- `api/src/recyclic_api/services/legacy_import_service.py` - Refactoring de `_get_or_create_poste_for_date()` et simplification de `execute()`

**Impact:**
- Code plus maintenable (DRY principle)
- Logique centralisée dans une seule méthode
- Aucun changement fonctionnel, tous les tests existants restent valides


