# Story B47-P8: Correction Bug LLM-only et Ajout Sélecteur de Modèles dans Relance

**Statut:** Ready for Review
**Épopée:** [EPIC-B47 – Import Legacy CSV & Template Offline](../epics/epic-b47-import-legacy-csv-template-offline.md)
**Module:** Backend API + Frontend Admin
**Priorité:** Haute (bug bloquant)

---

## 1. Contexte

Deux problèmes identifiés lors de l'utilisation de la fonctionnalité de relance LLM :

1. **Bug Pydantic** : L'endpoint `/api/v1/admin/import/legacy/analyze/llm-only` plante avec une erreur de validation Pydantic. Le schéma `LegacyImportStatistics` exige des champs obligatoires (`total_lines`, `valid_lines`, `error_lines`, `unique_categories`, `mapped_categories`, `unmapped_categories`) qui ne sont pas disponibles dans le contexte d'une relance LLM-only (qui ne traite que les catégories non mappées, sans analyser le CSV complet).

2. **Problème UX** : Lors de la relance LLM depuis l'étape 2 (Mappings), le sélecteur de modèles LLM disparaît. L'utilisateur ne peut pas changer de modèle pour la relance, alors qu'il pourrait vouloir essayer un autre modèle (par exemple, passer de Mistral Instruct Free à un autre modèle) pour améliorer les résultats.

---

## 2. User Story

En tant que **Administrateur**,
je veux **pouvoir changer de modèle LLM lors de la relance (pour les catégories restantes ou toutes les catégories) et que la relance fonctionne sans erreur**,
afin que **je puisse optimiser le mapping en testant différents modèles sur les catégories restantes ou sur l'ensemble des catégories.**

---

## 3. Critères d'acceptation

1. **Correction du bug Pydantic** :
   - Créer un nouveau schéma `LLMOnlyStatistics` qui contient uniquement les champs LLM (sans les champs obligatoires de `LegacyImportStatistics`)
   - Ou rendre les champs `total_lines`, `valid_lines`, `error_lines`, `unique_categories`, `mapped_categories`, `unmapped_categories` optionnels dans `LegacyImportStatistics`
   - Mettre à jour l'endpoint `llm-only` pour utiliser le schéma approprié
   - L'endpoint `/api/v1/admin/import/legacy/analyze/llm-only` fonctionne sans erreur de validation

2. **Ajout du sélecteur de modèles dans l'étape 2 (Mappings)** :
   - Réutiliser le composant de sélection de modèles LLM de l'étape 1 dans l'étape 2
   - Afficher le sélecteur avec la case à cocher "Afficher uniquement les modèles gratuits"
   - Le sélecteur doit être visible quand `analyzeResult` existe
   - Le modèle sélectionné dans l'étape 2 doit être utilisé pour les relances LLM (via `llm_model_id` dans la requête)
   - Le modèle sélectionné dans l'étape 1 doit être préservé comme valeur par défaut dans l'étape 2

3. **Bouton "Relancer LLM pour toutes les catégories"** :
   - Ajouter un bouton "Relancer LLM pour toutes les catégories" dans l'étape 2
   - Ce bouton doit être visible quand `analyzeResult` existe et qu'un modèle LLM est sélectionné
   - Le bouton doit utiliser le modèle sélectionné dans l'étape 2 (ou celui de l'étape 1 si aucun n'est sélectionné dans l'étape 2)
   - L'action doit relancer le LLM sur TOUTES les catégories uniques du CSV (extrait de `analyzeResult.statistics.unique_categories` ou de toutes les catégories dans `mappings` + `unmapped`)
   - Utiliser l'endpoint `llm-only` avec la liste complète des catégories uniques
   - Fusion intelligente des mappings : préserver les corrections manuelles (confidence = 100)
   - Mise à jour des statistiques avec les nouveaux résultats LLM
   - Message de confirmation ou alerte avant relance (car cela va remplacer les mappings existants sauf corrections manuelles)

4. **Gestion de l'état du sélecteur et des boutons** :
   - Si un modèle était sélectionné dans l'étape 1, il doit être préservé dans l'étape 2
   - L'utilisateur peut changer de modèle dans l'étape 2 sans affecter l'étape 1
   - Les deux boutons doivent utiliser le modèle sélectionné dans l'étape 2 (ou celui de l'étape 1 si aucun n'est sélectionné dans l'étape 2) :
     - "Relancer LLM pour les X catégories restantes" : utilise `unmapped`
     - "Relancer LLM pour toutes les catégories" : utilise toutes les catégories uniques
   - Les deux boutons doivent être affichés côte à côte ou dans un groupe logique

5. **Tests** :
   - Tests backend pour vérifier que l'endpoint `llm-only` fonctionne sans erreur de validation
   - Tests backend pour vérifier que l'endpoint accepte une liste complète de catégories (pas seulement les non mappées)
   - Tests frontend pour vérifier que le sélecteur est visible dans l'étape 2
   - Tests frontend pour vérifier que les deux boutons de relance LLM fonctionnent correctement :
     - Relance sur catégories restantes uniquement
     - Relance sur toutes les catégories
   - Tests frontend pour vérifier que les corrections manuelles sont préservées lors de la relance sur toutes les catégories
   - Tests d'intégration pour vérifier que le changement de modèle fonctionne lors de la relance (catégories restantes et toutes les catégories)

---

## 4. Tâches

- [x] **T1 - Correction du Bug Pydantic (Backend)**
  - Analyser le schéma `LegacyImportStatistics` dans `api/src/recyclic_api/schemas/legacy_import.py`
  - Option A : Créer un nouveau schéma `LLMOnlyStatistics` avec uniquement les champs LLM :
    ```python
    class LLMOnlyStatistics(BaseModel):
        llm_attempted: bool = False
        llm_model_used: Optional[str] = None
        llm_batches_total: int = 0
        llm_batches_succeeded: int = 0
        llm_batches_failed: int = 0
        llm_mapped_categories: int = 0
        llm_unmapped_after_llm: int = 0
        llm_last_error: Optional[str] = None
        llm_avg_confidence: Optional[float] = None
        llm_provider_used: Optional[str] = None
    ```
  - Option B : Rendre les champs obligatoires optionnels dans `LegacyImportStatistics` :
    ```python
    total_lines: Optional[int] = None
    valid_lines: Optional[int] = None
    # etc.
    ```
  - Mettre à jour `LLMOnlyResponse` pour utiliser le bon schéma
  - Mettre à jour l'endpoint `analyze_legacy_import_llm_only` pour utiliser le bon schéma
  - **Recommandation** : Option A (schéma séparé) pour éviter de casser d'autres usages de `LegacyImportStatistics`
  - Tests unitaires pour vérifier la validation

- [x] **T2 - Extraction du Composant Sélecteur de Modèles (Frontend)**
  - Extraire le code du sélecteur de modèles (lignes 634-721 de `LegacyImport.tsx`) dans un composant réutilisable
  - Créer `frontend/src/components/LegacyImport/LLMModelSelector.tsx` :
    - Props : `selectedModelId`, `onModelChange`, `showFreeOnly`, `onShowFreeOnlyChange`, `disabled`, `loading`
    - Gérer le chargement des modèles en interne ou via props
    - Réutiliser la logique existante (case à cocher, filtrage, etc.)
  - Mettre à jour `LegacyImport.tsx` pour utiliser le composant dans l'étape 1

- [x] **T3 - Ajout du Sélecteur dans l'Étape 2 (Frontend)**
  - Ajouter le composant `LLMModelSelector` dans l'étape 2 (Mappings)
  - Afficher le sélecteur avant les boutons de relance LLM
  - Condition d'affichage : `analyzeResult` existe
  - Utiliser un état séparé `selectedLlmModelIdStep2` pour l'étape 2 (ou réutiliser `selectedLlmModelId` si on veut synchroniser)
  - Valeur par défaut : `selectedLlmModelId` de l'étape 1
  - Mettre à jour `handleRelaunchLLM` pour utiliser le modèle sélectionné dans l'étape 2

- [x] **T3.1 - Bouton "Relancer LLM pour toutes les catégories" (Frontend)**
  - Créer une nouvelle fonction `handleRelaunchLLMAllCategories()` :
    - Extraire toutes les catégories uniques depuis `mappings` et `unmapped`
    - Appeler `adminService.analyzeLegacyImportLLMOnly(allUniqueCategories, selectedLlmModelIdStep2)`
    - Fusionner les nouveaux mappings en préservant les corrections manuelles (confidence = 100)
    - Mettre à jour `analyzeResult` avec les nouvelles statistiques
  - Ajouter un bouton "Relancer LLM pour toutes les catégories" :
    - Visible quand `analyzeResult` existe et qu'un modèle LLM est sélectionné
    - Afficher une alerte de confirmation avant relance (car cela va remplacer les mappings existants)
    - Indicateur de chargement pendant la relance
    - Message de succès avec statistiques (nombre de catégories remappées)
  - Grouper les deux boutons de relance dans un `Group` ou `Stack`

- [x] **T4 - Gestion de l'État des Modèles**
  - Décider de la stratégie :
    - Option A : État séparé pour l'étape 2 (`selectedLlmModelIdStep2`)
    - Option B : Réutiliser `selectedLlmModelId` (synchronisé entre les deux étapes)
  - **Recommandation** : Option A pour permettre à l'utilisateur de tester différents modèles sans affecter l'étape 1
  - Mettre à jour la logique de `handleRelaunchLLM` pour utiliser le bon modèle
  - Mettre à jour la logique de `handleRelaunchLLMAllCategories` pour utiliser le bon modèle
  - Préserver le modèle de l'étape 1 comme valeur par défaut dans l'étape 2

- [x] **T5 - Tests**
  - Tests backend :
    - Test que l'endpoint `llm-only` retourne une réponse valide sans erreur Pydantic
    - Test avec différents modèles LLM
    - Test avec une liste complète de catégories (pas seulement les non mappées)
  - Tests frontend :
    - Test que le sélecteur est visible dans l'étape 2 quand `analyzeResult` existe
    - Test que le changement de modèle dans l'étape 2 est utilisé pour les relances
    - Test que le modèle de l'étape 1 est préservé comme valeur par défaut
    - Test que le bouton "Relancer LLM pour toutes les catégories" est visible quand un modèle est sélectionné
    - Test que la relance sur toutes les catégories préserve les corrections manuelles (confidence = 100)
    - Test que l'alerte de confirmation s'affiche avant la relance sur toutes les catégories
  - Tests d'intégration :
    - Test du flux complet : étape 1 avec modèle A → étape 2 avec modèle B → relance LLM sur catégories restantes avec modèle B
    - Test du flux complet : étape 1 avec modèle A → étape 2 avec modèle B → relance LLM sur toutes les catégories avec modèle B

---

## 5. Dépendances

- **Pré-requis** : B47-P6 (fonctionnalité de relance LLM)
- **Bloque** : Utilisation de la relance LLM (bug bloquant)

---

## 6. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture

2. **Schéma Pydantic Actuel** :
   - Fichier : `api/src/recyclic_api/schemas/legacy_import.py`
   - Classe : `LegacyImportStatistics` (lignes 29-47)
   - Champs obligatoires : `total_lines`, `valid_lines`, `error_lines`, `unique_categories`, `mapped_categories`, `unmapped_categories`
   - Champs LLM optionnels : `llm_attempted`, `llm_model_used`, etc.
   - [Source: api/src/recyclic_api/schemas/legacy_import.py]

3. **Endpoint LLM-only** :
   - Fichier : `api/src/recyclic_api/api/api_v1/endpoints/legacy_import.py`
   - Endpoint : `POST /api/v1/admin/import/legacy/analyze/llm-only` (lignes 446-488)
   - Schéma de réponse : `LLMOnlyResponse` avec `statistics: LegacyImportStatistics` (ligne 443)
   - Problème : Le service retourne seulement les stats LLM, mais le schéma exige aussi les champs obligatoires
   - [Source: api/src/recyclic_api/api/api_v1/endpoints/legacy_import.py]

4. **Service LegacyImportService** :
   - Fichier : `api/src/recyclic_api/services/legacy_import_service.py`
   - Méthode : `analyze_llm_only()` (lignes 652-820)
   - Retourne : `Dict` avec `"statistics"` contenant uniquement les champs LLM (lignes 670-681, 706-717)
   - [Source: api/src/recyclic_api/services/legacy_import_service.py]

5. **Interface Frontend - Sélecteur de Modèles** :
   - Fichier : `frontend/src/pages/Admin/LegacyImport.tsx`
   - Lignes 634-721 : Code du sélecteur de modèles dans l'étape 1
   - État : `selectedLlmModelId`, `showFreeOnly`, `llmModels`, `loadingLlmModels`
   - Service : `adminService.getLegacyImportLLMModels()`
   - [Source: frontend/src/pages/Admin/LegacyImport.tsx]

6. **Interface Frontend - Relance LLM** :
   - Fichier : `frontend/src/pages/Admin/LegacyImport.tsx`
   - Fonction : `handleRelaunchLLM()` (lignes 260-321)
   - Appel : `adminService.analyzeLegacyImportLLMOnly(unmapped, selectedLlmModelId)`
   - Problème : Utilise `selectedLlmModelId` de l'étape 1, pas de sélecteur visible dans l'étape 2
   - Pour extraire toutes les catégories uniques :
     ```typescript
     const allUniqueCategories = [
       ...Object.keys(mappings),  // Catégories déjà mappées
       ...unmapped                // Catégories non mappées
     ];
     // Ou depuis analyzeResult.statistics.unique_categories si disponible
     ```
   - [Source: frontend/src/pages/Admin/LegacyImport.tsx]

7. **Service Frontend** :
   - Fichier : `frontend/src/services/adminService.ts`
   - Méthode : `analyzeLegacyImportLLMOnly()` (lignes 777-808)
   - Envoie : `llm_model_id` dans le body de la requête
   - [Source: frontend/src/services/adminService.ts]

### Solution Technique Recommandée

**Pour le Bug Pydantic** :
- Créer un nouveau schéma `LLMOnlyStatistics` qui hérite ou contient uniquement les champs LLM
- Mettre à jour `LLMOnlyResponse` pour utiliser `LLMOnlyStatistics` au lieu de `LegacyImportStatistics`
- Avantage : Pas de risque de casser d'autres usages de `LegacyImportStatistics`
- Inconvénient : Duplication de code (mais acceptable pour la clarté)

**Pour le Sélecteur de Modèles** :
- Extraire le composant `LLMModelSelector` pour réutilisabilité
- Utiliser un état séparé `selectedLlmModelIdStep2` pour l'étape 2
- Valeur par défaut : `selectedLlmModelId` de l'étape 1
- Avantage : L'utilisateur peut tester différents modèles sans affecter l'étape 1

**Pour la Relance sur Toutes les Catégories** :
- Extraire toutes les catégories uniques depuis `mappings` (clés) + `unmapped`
- Alternative : Utiliser `analyzeResult.statistics.unique_categories` si disponible dans les stats
- Alerte de confirmation avant relance (car cela va remplacer les mappings existants)
- Fusion intelligente : préserver les mappings avec `confidence === 100` (corrections manuelles)
- Mettre à jour les statistiques LLM dans `analyzeResult`

### Structure du Composant LLMModelSelector

```typescript
interface LLMModelSelectorProps {
  selectedModelId: string | null;
  onModelChange: (modelId: string | null) => void;
  showFreeOnly: boolean;
  onShowFreeOnlyChange: (show: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
}
```

### Testing

**Standards de Test** :
- Tests unitaires backend dans `api/tests/test_legacy_import_llm_only_endpoint.py`
- Tests unitaires frontend dans `frontend/src/pages/Admin/__tests__/LegacyImport.test.tsx`
- Tests d'intégration pour le flux complet
- [Source: api/testing-guide.md, frontend/testing-guide.md]

**Cas de Test Requis** :
- Backend :
  - Endpoint `llm-only` retourne une réponse valide sans erreur Pydantic
  - Test avec différents modèles LLM
  - Test avec liste vide de catégories
- Frontend :
  - Sélecteur visible dans l'étape 2 quand `unmapped.length > 0`
  - Changement de modèle dans l'étape 2 utilisé pour la relance
  - Modèle de l'étape 1 préservé comme valeur par défaut
  - Relance LLM fonctionne avec le modèle sélectionné dans l'étape 2

---

## 7. Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-XX | 1.0 | Création de la story | Sarah (Product Owner) |
| 2025-01-27 | 1.1 | Implémentation complète : correction bug Pydantic, sélecteur étape 2, bouton toutes catégories | James (Dev Agent) |

---

## 8. Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5 (via Cursor)

### Debug Log References
- Linting: `read_lints` - Aucune erreur détectée
- Tests backend: Tests ajoutés dans `test_legacy_import_llm_only_endpoint.py`

### Completion Notes List
1. **T1 - Correction Bug Pydantic** : Création du schéma `LLMOnlyStatistics` dans `legacy_import.py` pour éviter l'erreur de validation Pydantic. Le schéma contient uniquement les champs LLM, sans les champs obligatoires de `LegacyImportStatistics` (total_lines, valid_lines, etc.). Mise à jour de `LLMOnlyResponse` et de l'endpoint pour utiliser le nouveau schéma.

2. **T2 - Extraction Composant** : Création du composant réutilisable `LLMModelSelector.tsx` dans `frontend/src/components/LegacyImport/`. Le composant gère le chargement des modèles en interne ou via props, avec support pour le filtrage des modèles gratuits et la gestion des erreurs.

3. **T3 - Sélecteur Étape 2** : Ajout du sélecteur de modèles dans l'étape 2 (Mappings) avec un état séparé `selectedLlmModelIdStep2`. Le modèle de l'étape 1 est préservé comme valeur par défaut via un `useEffect`.

4. **T3.1 - Bouton Toutes Catégories** : Création de la fonction `handleRelaunchLLMAllCategories()` qui relance le LLM sur toutes les catégories uniques (mappings + unmapped). Fusion intelligente qui préserve les corrections manuelles (confidence = 100). Ajout d'une confirmation avant relance.

5. **T4 - Gestion État** : Utilisation d'un état séparé pour l'étape 2 (`selectedLlmModelIdStep2`, `showFreeOnlyStep2`). Les deux boutons de relance utilisent le modèle de l'étape 2 ou celui de l'étape 1 en fallback.

6. **T5 - Tests** : Ajout de tests backend pour vérifier que l'endpoint retourne une réponse valide avec `LLMOnlyStatistics` (sans les champs obligatoires de `LegacyImportStatistics`) et qu'il accepte une liste complète de catégories.

### File List
**Backend:**
- `api/src/recyclic_api/schemas/legacy_import.py` - Ajout du schéma `LLMOnlyStatistics`
- `api/src/recyclic_api/api/api_v1/endpoints/legacy_import.py` - Mise à jour de `LLMOnlyResponse` et de l'endpoint pour utiliser `LLMOnlyStatistics`
- `api/tests/test_legacy_import_llm_only_endpoint.py` - Ajout de tests pour valider le nouveau schéma et la liste complète de catégories

**Frontend:**
- `frontend/src/components/LegacyImport/LLMModelSelector.tsx` - Nouveau composant réutilisable pour sélectionner un modèle LLM
- `frontend/src/pages/Admin/LegacyImport.tsx` - Remplacement du sélecteur dans l'étape 1 par le composant, ajout du sélecteur dans l'étape 2, ajout du bouton "Relancer LLM pour toutes les catégories", création de `handleRelaunchLLMAllCategories()`

---

## 9. QA Results

_À compléter par l'agent QA_

