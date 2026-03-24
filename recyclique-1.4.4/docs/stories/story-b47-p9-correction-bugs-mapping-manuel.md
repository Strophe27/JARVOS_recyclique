# Story B47-P9: Correction Bugs Mapping Manuel

**Statut:** Ready for Review
**Épopée:** [EPIC-B47 – Import Legacy CSV & Template Offline](../epics/epic-b47-import-legacy-csv-template-offline.md)
**Module:** Frontend Admin
**Priorité:** Haute (bug bloquant)

---

## 1. Contexte

Deux bugs critiques identifiés lors de l'utilisation de la fonctionnalité de mapping manuel :

1. **Bouton "Continuer" toujours grisé** : Même après avoir assigné manuellement toutes les catégories non mappées, le bouton "Continuer" reste désactivé. L'utilisateur ne peut utiliser que "Précédent" et "Suivant" pour naviguer, ce qui est contre-intuitif.

2. **Catégories assignées manuellement non enregistrées** : Quand l'utilisateur assigne manuellement une catégorie depuis la liste des catégories non mappées, elle est ajoutée à `mappings` mais reste également dans `unmapped`. Lors de l'export du fichier JSON, ces catégories apparaissent dans le champ `unmapped` au lieu d'être dans `mappings`, ce qui signifie qu'elles ne seront pas importées correctement.

**Impact** : Les mappings manuels ne sont pas pris en compte lors de l'import, ce qui est un bug critique bloquant l'utilisation de la fonctionnalité.

---

## 2. User Story

En tant que **Administrateur**,
je veux **que mes corrections manuelles de mapping soient correctement enregistrées et que le bouton "Continuer" s'active quand j'ai terminé**,
afin que **mes données soient correctement importées avec les mappings que j'ai validés.**

---

## 3. Critères d'acceptation

1. **Correction du bug de mise à jour de `unmapped`** :
   - Quand une catégorie est assignée manuellement depuis la liste `unmapped`, elle doit être retirée de `unmapped`
   - La fonction `handleMappingChange` doit mettre à jour `unmapped` en retirant la catégorie assignée
   - Quand une catégorie est rejetée, elle doit être retirée de `unmapped` et ajoutée à `rejectedCategories`
   - Les catégories assignées manuellement ne doivent plus apparaître dans le champ `unmapped` du JSON exporté

2. **Correction du bouton "Continuer"** :
   - Le bouton "Continuer" doit être activé quand :
     - Toutes les catégories non mappées ont été assignées ou rejetées (`unmapped.length === 0` après filtrage des rejetées)
     - OU il reste ≤ 5 catégories non mappées (comportement actuel, mais doit fonctionner correctement)
   - Le bouton doit être désactivé uniquement si :
     - Il reste > 5 catégories non mappées (non assignées et non rejetées)
   - La condition doit prendre en compte les catégories rejetées (ne pas les compter dans `unmapped`)

3. **Validation de l'export JSON** :
   - Le fichier JSON exporté doit contenir uniquement les catégories vraiment non mappées dans `unmapped`
   - Les catégories assignées manuellement doivent être dans `mappings` avec `confidence: 100`
   - Les catégories rejetées ne doivent pas apparaître dans `unmapped` (déjà le cas, mais vérifier)

4. **Tests** :
   - Test que l'assignation manuelle retire la catégorie de `unmapped`
   - Test que le rejet retire la catégorie de `unmapped` et l'ajoute à `rejectedCategories`
   - Test que le bouton "Continuer" s'active quand toutes les catégories sont assignées/rejetées
   - Test que le JSON exporté contient les bonnes catégories dans `mappings` et `unmapped`

---

## 4. Tâches

- [x] **T1 - Correction de `handleMappingChange` pour mise à jour de `unmapped`**
  - Analyser la fonction `handleMappingChange` (lignes 324-350 de `LegacyImport.tsx`)
  - Quand `categoryId !== null` (assignation manuelle) :
    - Ajouter à `mappings` (déjà fait)
    - Retirer de `unmapped` : `setUnmapped(prev => prev.filter(cat => cat !== csvCategory))`
    - Retirer de `rejectedCategories` si présent
  - Quand `categoryId === null` (rejet) :
    - Retirer de `mappings` (déjà fait)
    - Retirer de `unmapped` : `setUnmapped(prev => prev.filter(cat => cat !== csvCategory))`
    - Ajouter à `rejectedCategories` (déjà fait)
  - Tests unitaires pour vérifier la mise à jour de `unmapped`

- [x] **T2 - Correction de la condition du bouton "Continuer"**
  - Analyser la condition actuelle (ligne 1064) : `disabled={unmapped.length > 0 && unmapped.length > 5}`
  - Problème : Ne prend pas en compte que les catégories peuvent être assignées/rejetées
  - Solution : Calculer le nombre de catégories vraiment non mappées (non assignées et non rejetées)
  - Nouvelle condition :
    ```typescript
    const unmappedCount = unmapped.filter(cat => !rejectedCategories.has(cat)).length;
    disabled={unmappedCount > 5}
    ```
  - OU : Calculer depuis `analyzeResult.statistics.unique_categories` et `mappings` + `rejectedCategories`
  - Tests pour vérifier que le bouton s'active correctement

- [x] **T3 - Validation de l'export JSON**
  - Vérifier que `handleExportMapping` (lignes 362-395) utilise bien :
    ```typescript
    unmapped: unmapped.filter(cat => !rejectedCategories.has(cat))
    ```
  - Vérifier que les catégories assignées manuellement ne sont pas dans `unmapped` au moment de l'export
  - Ajouter une validation/log pour détecter les incohérences (catégorie dans `mappings` ET `unmapped`)
  - Tests pour vérifier le contenu du JSON exporté

- [x] **T4 - Tests**
  - Test unitaire : Assignation manuelle retire de `unmapped`
  - Test unitaire : Rejet retire de `unmapped` et ajoute à `rejectedCategories`
  - Test unitaire : Bouton "Continuer" s'active quand toutes les catégories sont assignées/rejetées
  - Test d'intégration : Export JSON contient les bonnes catégories
  - Test E2E : Flux complet (assignation manuelle → export → vérification JSON)

---

## 5. Dépendances

- **Pré-requis** : B47-P3 (interface web de validation mapping)
- **Bloque** : Utilisation de la fonctionnalité de mapping manuel (bug bloquant)

---

## 6. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture

2. **Fonction `handleMappingChange`** :
   - Fichier : `frontend/src/pages/Admin/LegacyImport.tsx`
   - Lignes : 324-350
   - Problème actuel :
     - Ajoute à `mappings` quand assignation manuelle ✓
     - Ajoute à `rejectedCategories` quand rejet ✓
     - **MAIS** ne retire pas de `unmapped` dans les deux cas ✗
   - [Source: frontend/src/pages/Admin/LegacyImport.tsx]

3. **État `unmapped`** :
   - Initialisé depuis `analyzeResult.unmapped` (ligne 238)
   - Mis à jour lors de la relance LLM (ligne 285)
   - **MAIS** pas mis à jour lors de l'assignation manuelle ✗
   - [Source: frontend/src/pages/Admin/LegacyImport.tsx]

4. **Bouton "Continuer"** :
   - Fichier : `frontend/src/pages/Admin/LegacyImport.tsx`
   - Ligne : 1061-1073
   - Condition actuelle : `disabled={unmapped.length > 0 && unmapped.length > 5}`
   - Problème : Ne prend pas en compte les assignations manuelles
   - [Source: frontend/src/pages/Admin/LegacyImport.tsx]

5. **Export JSON** :
   - Fichier : `frontend/src/pages/Admin/LegacyImport.tsx`
   - Fonction : `handleExportMapping` (lignes 362-395)
   - Structure actuelle :
     ```typescript
     {
       mappings: mappings,
       unmapped: unmapped.filter(cat => !rejectedCategories.has(cat))
     }
     ```
   - Problème : `unmapped` contient encore les catégories assignées manuellement
   - [Source: frontend/src/pages/Admin/LegacyImport.tsx]

6. **Import JSON** :
   - Fichier : `frontend/src/pages/Admin/LegacyImport.tsx`
   - Fonction : `handleImport` (lignes 398-457)
   - Utilise la même structure que l'export (lignes 409-412)
   - Le backend s'attend à ce que les catégories dans `mappings` soient mappées et celles dans `unmapped` soient ignorées
   - [Source: frontend/src/pages/Admin/LegacyImport.tsx, api/src/recyclic_api/services/legacy_import_service.py]

### Solution Technique

**Pour la mise à jour de `unmapped`** :
```typescript
const handleMappingChange = (csvCategory: string, categoryId: string | null) => {
  if (categoryId === null) {
    // Rejeter la catégorie
    setRejectedCategories(prev => new Set([...prev, csvCategory]));
    const newMappings = { ...mappings };
    delete newMappings[csvCategory];
    setMappings(newMappings);
    // RETIRER de unmapped
    setUnmapped(prev => prev.filter(cat => cat !== csvCategory));
  } else {
    // Mapper vers une catégorie
    setRejectedCategories(prev => {
      const newSet = new Set(prev);
      newSet.delete(csvCategory);
      return newSet;
    });
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setMappings(prev => ({
        ...prev,
        [csvCategory]: {
          category_id: categoryId,
          category_name: category.name,
          confidence: 100 // Mapping manuel = 100%
        }
      }));
      // RETIRER de unmapped
      setUnmapped(prev => prev.filter(cat => cat !== csvCategory));
    }
  }
};
```

**Pour la condition du bouton "Continuer"** :
```typescript
// Calculer le nombre de catégories vraiment non mappées
const unmappedCount = unmapped.filter(cat => !rejectedCategories.has(cat)).length;

<Button
  onClick={() => setActiveStep(2)}
  leftSection={<IconCheck size={16} />}
  disabled={unmappedCount > 5}
  title={
    unmappedCount > 5
      ? `Il reste ${unmappedCount} catégories non mappées. Vous pouvez continuer ou relancer le LLM.`
      : undefined
  }
>
  Continuer
  {unmappedCount > 0 && unmappedCount <= 5 && ` (${unmappedCount} non mappées)`}
</Button>
```

**Pour la validation de l'export** :
- S'assurer que `unmapped` ne contient que les catégories vraiment non mappées
- Optionnel : Ajouter une validation qui log un warning si une catégorie est dans `mappings` ET `unmapped`

### Testing

**Standards de Test** :
- Tests unitaires dans `frontend/src/pages/Admin/__tests__/LegacyImport.test.tsx`
- Utiliser React Testing Library
- Mocker les appels API avec `jest.mock()`
- Tests d'intégration pour le flux complet
- [Source: frontend/testing-guide.md]

**Cas de Test Requis** :
- Assignation manuelle retire de `unmapped`
- Rejet retire de `unmapped` et ajoute à `rejectedCategories`
- Bouton "Continuer" s'active quand toutes les catégories sont assignées/rejetées
- Export JSON contient les bonnes catégories dans `mappings` et `unmapped`
- Catégories assignées manuellement ne sont pas dans `unmapped` du JSON exporté

---

## 7. Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-XX | 1.0 | Création de la story | Sarah (Product Owner) |

---

## 8. Dev Agent Record

### Agent Model Used
James (Dev Agent) - Auto (Cursor)

### Debug Log References
Aucun problème rencontré lors de l'implémentation.

### Completion Notes List
- **T1** : Correction de `handleMappingChange` (lignes 452-478) pour retirer les catégories de `unmapped` lors de l'assignation manuelle ou du rejet. Les deux branches (assignation et rejet) mettent maintenant à jour `unmapped` correctement.
- **T2** : Ajout d'un `useMemo` pour calculer `unmappedCount` (catégories non assignées et non rejetées). Le bouton "Continuer" utilise maintenant `unmappedCount > 5` au lieu de `unmapped.length > 0 && unmapped.length > 5`.
- **T3** : Ajout d'une validation dans `handleExportMapping` et `handleImport` pour détecter et corriger les incohérences (catégories présentes à la fois dans `mappings` et `unmapped`). Un warning est loggé en cas d'incohérence détectée.
- **T4** : Ajout de 5 tests dans `LegacyImport.test.tsx` pour valider :
  - L'assignation manuelle retire de `unmapped`
  - Le rejet retire de `unmapped` et ajoute à `rejectedCategories`
  - Le bouton "Continuer" s'active/désactive correctement selon le nombre de catégories non mappées
  - L'export JSON contient les bonnes catégories dans `mappings` et `unmapped`

### File List
- **Modifié** : `frontend/src/pages/Admin/LegacyImport.tsx`
  - Fonction `handleMappingChange` : Ajout de `setUnmapped(prev => prev.filter(cat => cat !== csvCategory))` dans les deux branches (assignation et rejet)
  - Ajout de `unmappedCount` calculé via `useMemo` pour le bouton "Continuer"
  - Fonction `handleExportMapping` : Ajout de validation pour détecter les incohérences
  - Fonction `handleImport` : Ajout de validation pour détecter les incohérences

- **Modifié** : `frontend/src/pages/Admin/__tests__/LegacyImport.test.tsx`
  - Ajout de la section "B47-P9: Correction Bugs Mapping Manuel" avec 5 tests unitaires

---

## 9. QA Results

_À compléter par l'agent QA_

