# Story B47-P7: Validation de Conformité CSV et Nettoyage Automatique

**Statut:** In Progress
**Épopée:** [EPIC-B47 – Import Legacy CSV & Template Offline](../epics/epic-b47-import-legacy-csv-template-offline.md)
**Module:** Backend API + Frontend Admin
**Priorité:** Moyenne

---

## 1. Contexte

Actuellement, l'interface d'import legacy (`LegacyImport.tsx`) accepte n'importe quel fichier CSV sans validation de conformité. L'utilisateur doit manuellement s'assurer que le CSV est conforme au template (colonnes `date`, `category`, `poids_kg`, `destination`, `notes` avec dates en ISO 8601, poids numériques, etc.).

Si le CSV n'est pas conforme, l'utilisateur doit :
1. Télécharger le script `scripts/clean_legacy_import.py`
2. L'exécuter manuellement en local
3. Re-uploader le CSV nettoyé

Cette story améliore l'expérience utilisateur en :
- Validant automatiquement la conformité du CSV avant l'analyse
- Proposant automatiquement de nettoyer le CSV si non conforme
- Exécutant le nettoyage côté serveur via un nouvel endpoint API

---

## 2. User Story

En tant que **Administrateur**,
je veux **que le système valide automatiquement la conformité de mon CSV et me propose de le nettoyer si nécessaire**,
afin que **je puisse importer mes données sans avoir à exécuter manuellement le script de nettoyage.**

---

## 3. Critères d'acceptation

1. **Validation de conformité du CSV (côté frontend ou backend)** :
   - Vérification des colonnes requises : `date`, `category`, `poids_kg`, `destination`, `notes`
   - Vérification du format des dates (ISO 8601 : `YYYY-MM-DD`)
   - Vérification que les poids sont numériques et > 0
   - Détection des problèmes typiques :
     - Dates manquantes ou au format incorrect
     - Poids invalides (non numériques, ≤ 0)
     - Colonnes manquantes ou mal nommées
     - Structure hétérogène (colonnes supplémentaires, lignes de totaux)
   - Rapport de validation détaillé avec liste des problèmes détectés

2. **Endpoint API de nettoyage** :
   - Nouvel endpoint `POST /api/v1/admin/import/legacy/clean` :
     - Accepte un fichier CSV brut (legacy ou non conforme)
     - Exécute la logique de nettoyage du script `clean_legacy_import.py` en mémoire
     - Retourne le CSV nettoyé prêt à être analysé (format multipart ou JSON avec base64)
     - Gestion des erreurs avec messages clairs
   - Réutilisation de la classe `LegacyCSVCleaner` du script existant
   - Support des encodages multiples (UTF-8, latin-1, cp1252)

3. **Intégration dans l'interface frontend** :
   - Après sélection du fichier CSV, validation automatique de conformité
   - Si conforme → affichage d'un badge "CSV conforme" et possibilité de continuer
   - Si non conforme → affichage d'une alerte avec :
     - Liste des problèmes détectés
     - Bouton "Nettoyer automatiquement" qui appelle l'endpoint `/clean`
     - Indicateur de chargement pendant le nettoyage
     - Remplacement automatique du fichier par le CSV nettoyé
   - Message de confirmation après nettoyage avec statistiques (lignes nettoyées, dates normalisées, etc.)

4. **Gestion des erreurs** :
   - Messages d'erreur clairs pour chaque type de problème détecté
   - Gestion des cas où le nettoyage échoue (CSV trop corrompu)
   - Proposition d'alternatives (télécharger le script manuel, corriger manuellement)

5. **Tests** :
   - Tests unitaires pour la validation de conformité
   - Tests d'intégration pour l'endpoint de nettoyage
   - Tests frontend pour le flux complet (upload → validation → nettoyage → analyse)
   - Tests avec différents types de CSV (conforme, non conforme, legacy)

---

## 4. Tâches

- [x] **T1 - Service de Validation de Conformité (Backend)**
  - Créer `api/src/recyclic_api/services/csv_validation_service.py`
  - Implémenter la validation des colonnes requises
  - Implémenter la validation du format des dates (ISO 8601)
  - Implémenter la validation des poids (numériques, > 0)
  - Détection des problèmes structurels (lignes de totaux, colonnes supplémentaires)
  - Génération d'un rapport de validation détaillé
  - Tests unitaires pour chaque type de validation

- [x] **T2 - Endpoint API de Nettoyage**
  - Créer endpoint `POST /api/v1/admin/import/legacy/clean` dans `legacy_import.py`
  - Endpoint `POST /api/v1/admin/import/legacy/clean` :
    - Accepte `UploadFile` (CSV brut)
    - Utilise `LegacyCSVCleanerService` pour nettoyer le CSV
    - Retourne le CSV nettoyé en base64 (JSON)
    - Retourne les statistiques de nettoyage (lignes nettoyées, dates normalisées, etc.)
  - Gestion des erreurs avec messages clairs
  - Protection par rôle (ADMIN, SUPER_ADMIN)
  - Endpoint de validation `POST /api/v1/admin/import/legacy/validate` également créé

- [x] **T3 - Refactorisation du Script de Nettoyage**
  - Extraire la logique de `scripts/clean_legacy_import.py` dans une classe réutilisable
  - Créer `api/src/recyclic_api/services/legacy_csv_cleaner_service.py` :
    - Classe `LegacyCSVCleanerService` basée sur `LegacyCSVCleaner`
    - Méthode `clean_csv(file_content: bytes, encoding: str) -> Tuple[bytes, Dict]` :
      - Retourne le CSV nettoyé (bytes) et les statistiques
    - Support des encodages multiples
  - Le script existant peut être adapté pour utiliser le service (non fait dans cette story)

- [x] **T4 - Service Frontend de Validation**
  - Ajouter méthode `validateLegacyImportCSV(file: File)` dans `adminService.ts`
  - Appel à l'endpoint `POST /api/v1/admin/import/legacy/validate`
  - Retourne un rapport de validation avec liste des problèmes
  - Gestion des erreurs de lecture de fichier

- [x] **T5 - Service Frontend de Nettoyage**
  - Ajouter méthode `cleanLegacyImportCSV(file: File)` dans `adminService.ts`
  - Appel à l'endpoint `POST /api/v1/admin/import/legacy/clean`
  - Gestion du CSV nettoyé en base64
  - Conversion du CSV nettoyé en `File` pour remplacer le fichier original

- [x] **T6 - Intégration dans LegacyImport.tsx**
  - Ajouter validation automatique après sélection du fichier
  - Affichage du statut de conformité (badge ou alerte)
  - Si non conforme :
    - Afficher la liste des problèmes détectés
    - Bouton "Nettoyer automatiquement" avec indicateur de chargement
    - Remplacement automatique du fichier après nettoyage
    - Affichage des statistiques de nettoyage
  - Si conforme :
    - Badge "CSV conforme" vert
    - Possibilité de continuer directement à l'analyse
  - Gestion des erreurs avec messages clairs

- [ ] **T7 - Tests**
  - Tests unitaires backend pour `CSVValidationService` (créés)
  - Tests unitaires backend pour `LegacyCSVCleanerService` (à créer)
  - Tests d'intégration pour l'endpoint `/clean` et `/validate` (à créer)
  - Tests frontend pour la validation et le nettoyage (à créer)
  - Tests E2E pour le flux complet (upload → validation → nettoyage → analyse) (à créer)

---

## 5. Dépendances

- **Pré-requis** : B47-P1 (script de nettoyage existant), B47-P2 (service d'import), B47-P3 (interface web)
- **Bloque** : Aucune (amélioration UX, non bloquant pour l'import)

---

## 6. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture

2. **Script de Nettoyage Existant** :
   - Fichier : `scripts/clean_legacy_import.py`
   - Classe principale : `LegacyCSVCleaner`
   - Méthodes clés :
     - `read_csv()` : Lecture avec gestion d'encodage
     - `normalize_dates()` : Normalisation des dates (fill-down, répartition orphelins)
     - `round_weight()` : Arrondi des poids à 2 décimales
     - `clean_data()` : Nettoyage et restructuration
   - [Source: scripts/clean_legacy_import.py]

3. **Service d'Import Legacy Existant** :
   - Fichier : `api/src/recyclic_api/services/legacy_import_service.py`
   - Classe : `LegacyImportService`
   - Constante : `REQUIRED_HEADERS = ["date", "category", "poids_kg", "destination", "notes"]`
   - [Source: api/src/recyclic_api/services/legacy_import_service.py]

4. **Interface Frontend Existante** :
   - Fichier : `frontend/src/pages/Admin/LegacyImport.tsx`
   - Validation actuelle : uniquement extension `.csv` (ligne 578-585)
   - Service : `adminService.analyzeLegacyImport()`
   - [Source: frontend/src/pages/Admin/LegacyImport.tsx]

5. **Patterns Backend à Suivre** :
   - Endpoints dans `api/src/recyclic_api/api/api_v1/endpoints/legacy_import.py`
   - Protection par rôle : `require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])`
   - Upload de fichiers : `UploadFile = File(...)`
   - Gestion d'erreurs : `HTTPException` avec codes appropriés
   - [Source: api/src/recyclic_api/api/api_v1/endpoints/legacy_import.py]

6. **Patterns Frontend à Suivre** :
   - Upload de fichiers : `FileButton` de Mantine (ligne 575-598)
   - Notifications : `notifications.show()` de Mantine
   - Gestion d'état : `useState` pour le fichier et les erreurs
   - Services : méthodes dans `adminService.ts` avec `axiosClient`
   - [Source: frontend/src/pages/Admin/LegacyImport.tsx, frontend/src/services/adminService.ts]

7. **Format CSV Attendu (Template Offline)** :
   - Colonnes : `date` (ISO 8601), `category` (string), `poids_kg` (decimal 2 décimales), `destination` (enum), `notes` (string optionnel)
   - Encodage : UTF-8
   - Séparateur : virgule (`,`) ou point-virgule (`;`)
   - [Source: docs/epics/epic-b47-import-legacy-csv-template-offline.md, story-b47-p1-script-nettoyage-csv-legacy.md]

8. **Problèmes Typiques à Détecter** :
   - Dates : formats variés (`25/09/2025`, `27/sept`, `09/oct`), dates manquantes, dates non parsables
   - Poids : arrondis Excel (`0.569999...`), poids ≤ 0, poids non numériques
   - Structure : lignes de totaux (`;;TOTAUX;3886.72`), colonnes supplémentaires, colonnes manquantes
   - Encodage : fichiers en latin-1 ou cp1252
   - [Source: docs/epics/epic-b47-import-legacy-csv-template-offline.md, story-b47-p1-script-nettoyage-csv-legacy.md]

### Architecture Technique

**Option de Retour pour l'Endpoint `/clean`** :
- **Option A (Recommandée)** : Retourner le CSV nettoyé en base64 dans un JSON avec les statistiques
  ```json
  {
    "cleaned_csv_base64": "...",
    "filename": "cleaned_import.csv",
    "statistics": {
      "total_lines": 630,
      "cleaned_lines": 625,
      "excluded_lines": 5,
      "dates_normalized": 120,
      "weights_rounded": 45
    }
  }
  ```
  - Avantage : Simple à gérer côté frontend, pas de gestion de multipart complexe
  - Frontend : Décoder base64, créer un `Blob`, puis un `File` pour remplacer le fichier original

- **Option B** : Retourner le CSV en multipart (comme upload)
  - Avantage : Format natif pour fichiers
  - Inconvénient : Plus complexe à gérer, nécessite `StreamingResponse`

**Recommandation** : Option A (JSON avec base64) pour simplicité et cohérence avec les autres endpoints.

### Réutilisation du Code Existant

**Refactorisation du Script** :
- Extraire `LegacyCSVCleaner` dans un service réutilisable
- Le script `clean_legacy_import.py` devient un wrapper CLI qui utilise le service
- Le service peut être utilisé à la fois par le script et par l'endpoint API

**Structure Proposée** :
```
api/src/recyclic_api/services/
  ├── legacy_csv_cleaner_service.py  # Service réutilisable
  └── csv_validation_service.py     # Service de validation

scripts/
  └── clean_legacy_import.py         # Wrapper CLI utilisant le service
```

### Testing

**Standards de Test** :
- Tests unitaires dans `api/tests/test_csv_validation_service.py` et `api/tests/test_legacy_csv_cleaner_service.py`
- Tests d'intégration dans `api/tests/test_legacy_import_clean_endpoint.py`
- Tests frontend dans `frontend/src/pages/Admin/__tests__/LegacyImport.test.tsx`
- Utiliser pytest pour backend, React Testing Library pour frontend
- [Source: api/testing-guide.md, frontend/testing-guide.md]

**Cas de Test Requis** :
- CSV conforme → validation OK, pas de nettoyage nécessaire
- CSV non conforme (dates incorrectes) → validation échoue, nettoyage proposé, CSV nettoyé correctement
- CSV legacy (structure hétérogène) → validation échoue, nettoyage proposé, CSV nettoyé avec statistiques
- CSV trop corrompu → nettoyage échoue, message d'erreur clair
- CSV avec encodage latin-1 → nettoyage détecte et convertit en UTF-8
- Tests avec différents formats de dates, poids, structures

---

## 7. Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-XX | 1.0 | Création de la story | Sarah (Product Owner) |

---

## 8. Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5 (via Cursor)

### Debug Log References
Aucun problème rencontré lors de l'implémentation.

### Completion Notes List

**Implémentation complète :**
- ✅ Service de validation CSV créé avec validation complète (colonnes, dates ISO 8601, poids)
- ✅ Service de nettoyage CSV créé en extrayant la logique du script existant
- ✅ Endpoints API créés : `/validate` et `/clean` avec protection par rôle
- ✅ Services frontend créés pour validation et nettoyage
- ✅ Intégration complète dans LegacyImport.tsx avec validation automatique et nettoyage
- ✅ Tests unitaires créés pour le service de validation

**Décisions techniques :**
- Format de retour pour `/clean` : JSON avec base64 (Option A recommandée dans la story)
- Validation automatique déclenchée à la sélection du fichier
- Le CSV nettoyé remplace automatiquement le fichier original après nettoyage
- Badge de statut affiché pour indiquer la conformité

**Tests restants :**
- Tests unitaires pour `LegacyCSVCleanerService` (à créer)
- Tests d'intégration pour les endpoints `/clean` et `/validate` (à créer)
- Tests frontend pour la validation et le nettoyage (à créer)
- Tests E2E pour le flux complet (à créer)

### File List

**Fichiers créés :**
- `api/src/recyclic_api/services/csv_validation_service.py` - Service de validation de conformité CSV
- `api/src/recyclic_api/services/legacy_csv_cleaner_service.py` - Service de nettoyage CSV réutilisable
- `api/tests/test_csv_validation_service.py` - Tests unitaires pour le service de validation

**Fichiers modifiés :**
- `api/src/recyclic_api/api/api_v1/endpoints/legacy_import.py` - Ajout des endpoints `/validate` et `/clean`
- `api/src/recyclic_api/schemas/legacy_import.py` - Ajout des schémas `LegacyImportValidationResponse`, `LegacyImportValidationStatistics`, `LegacyImportCleanResponse`, `LegacyImportCleanStatistics`
- `frontend/src/services/adminService.ts` - Ajout des méthodes `validateLegacyImportCSV` et `cleanLegacyImportCSV`
- `frontend/src/pages/Admin/LegacyImport.tsx` - Intégration de la validation automatique et du nettoyage

---

## 9. QA Results

### Review Date: 2026-01-07

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

**Implémentation de qualité élevée** avec architecture solide et séparation claire des responsabilités. Les services sont bien structurés (`CSVValidationService`, `LegacyCSVCleanerService`), la gestion d'erreurs est appropriée, et l'intégration frontend est complète avec validation automatique et nettoyage. Le code respecte les patterns du projet et la réutilisation du code existant est bien réalisée.

**Points forts:**
- Services backend bien isolés et testables
- Validation automatique déclenchée à la sélection du fichier
- Gestion d'erreurs robuste avec messages clairs
- Support de multiples encodages (UTF-8, latin-1, cp1252)
- Protection par rôle sur tous les endpoints
- Intégration frontend fluide avec feedback utilisateur approprié

### Refactoring Performed

Aucun refactoring nécessaire. Le code est propre et bien structuré.

### Compliance Check

- **Coding Standards**: ✓ Conforme aux standards Python (snake_case, docstrings, type hints)
- **Project Structure**: ✓ Services dans `api/src/recyclic_api/services/`, endpoints dans `api/src/recyclic_api/api/api_v1/endpoints/`
- **Testing Strategy**: ✗ Tests partiels - seulement `CSVValidationService` a des tests unitaires complets
- **All ACs Met**: ✓ Tous les critères d'acceptation sont implémentés

### Improvements Checklist

- [x] Service de validation CSV créé avec validation complète
- [x] Service de nettoyage CSV créé en extrayant la logique du script existant
- [x] Endpoints API créés avec protection par rôle
- [x] Services frontend créés pour validation et nettoyage
- [x] Intégration complète dans LegacyImport.tsx
- [x] Tests unitaires créés pour CSVValidationService
- [ ] Tests unitaires pour LegacyCSVCleanerService (à créer)
- [ ] Tests d'intégration pour les endpoints /clean et /validate (à créer)
- [ ] Tests frontend pour la validation et le nettoyage (à créer)
- [ ] Tests E2E pour le flux complet (à créer)

### Security Review

**Statut: PASS**

- Endpoints protégés par rôle (`require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])`)
- Validation des entrées via schémas Pydantic
- Gestion d'erreurs appropriée sans exposition d'informations sensibles
- Support de multiples encodages avec gestion d'erreurs sécurisée

### Performance Considerations

**Statut: PASS**

- Validation et nettoyage effectués en mémoire (pas de fichiers temporaires)
- Pas de problèmes de performance identifiés
- Timeouts appropriés côté frontend (1 minute pour validation, 5 minutes pour nettoyage)

### Files Modified During Review

Aucun fichier modifié lors de cette revue.

### Gate Status

**Gate: CONCERNS** → `docs/qa/gates/b47.p7-validation-conformite-nettoyage-automatique.yml`

**Raison:** Implémentation complète et fonctionnelle, mais tests manquants pour `LegacyCSVCleanerService`, endpoints d'intégration, frontend et E2E. Code de qualité, architecture solide.

**Issues identifiées:**
- Tests unitaires manquants pour `LegacyCSVCleanerService` (medium)
- Tests d'intégration manquants pour les endpoints `/clean` et `/validate` (medium)
- Tests frontend manquants pour la validation et le nettoyage (low)
- Tests E2E manquants pour le flux complet (low)

### Recommended Status

**✗ Changes Required** - Compléter les tests manquants avant de passer en "Done"

Les tests manquants sont documentés dans la story (T7) mais n'ont pas été créés. Il est recommandé de créer au minimum:
1. Tests unitaires pour `LegacyCSVCleanerService` (priorité moyenne)
2. Tests d'intégration pour les endpoints (priorité moyenne)

Les tests frontend et E2E peuvent être ajoutés dans une story ultérieure si nécessaire.

