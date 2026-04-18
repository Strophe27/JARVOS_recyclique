# Story B47-P10: Simplification Workflow et Récapitulatif Pré-Import

**Statut:** Ready for Review
**Épopée:** [EPIC-B47 – Import Legacy CSV & Template Offline](../epics/epic-b47-import-legacy-csv-template-offline.md)
**Module:** Frontend Admin
**Priorité:** Haute (amélioration UX majeure)

---

## 1. Contexte

Le workflow actuel de l'import legacy présente deux problèmes majeurs d'expérience utilisateur :

1. **Workflow redondant** : L'utilisateur doit exporter le mapping JSON puis le ré-uploader, alors que le mapping est déjà disponible dans l'interface. Cette étape intermédiaire est inutile et contre-intuitive.

2. **Manque de visibilité avant import** : L'utilisateur n'a pas de récapitulatif visuel de ce qui va être importé avant de lancer l'import. Il ne peut pas vérifier :
   - Le total des kilos qui seront ajoutés
   - La répartition par catégorie
   - Le nombre de lignes par catégorie
   - Les dates concernées

**Impact** : Expérience utilisateur frustrante et risque d'erreur (import sans validation visuelle).

---

## 2. User Story

En tant que **Administrateur**,
je veux **voir un récapitulatif complet de ce qui sera importé et pouvoir lancer l'import directement sans étape intermédiaire**,
afin que **je puisse valider visuellement les données avant l'import et simplifier le processus.**

---

## 3. Critères d'acceptation

1. **Suppression de l'étape export/import séparée** :
   - Supprimer l'étape 4 (Export) du stepper
   - Le mapping est créé en mémoire directement depuis l'état de l'interface
   - L'import utilise le mapping en mémoire, pas un fichier uploadé
   - Optionnel : Bouton "Télécharger le mapping" dans l'étape 2 pour sauvegarde (pas obligatoire)

2. **Nouvelle étape "Récapitulatif"** :
   - Nouvelle étape 3 (remplace l'ancienne étape 4) : "Récapitulatif & Import"
   - Affichage du récapitulatif avant l'import :
     - **Total général** :
       - Nombre total de lignes à importer
       - Total des kilos (somme de tous les `poids_kg`)
       - Nombre de dates uniques
       - Nombre de catégories uniques (après mapping)
     - **Répartition par catégorie** :
       - Tableau avec colonnes : Catégorie (nom DB), Nombre de lignes, Total kilos
       - Tri possible par catégorie, nombre de lignes, ou total kilos
       - Affichage des catégories non mappées (si présentes) avec indication visuelle
     - **Répartition par date** (optionnel mais recommandé) :
       - Liste des dates avec nombre de lignes et total kilos par date
       - Permet de vérifier la répartition temporelle

3. **Calcul du récapitulatif** :
   - Parser le CSV côté frontend (ou créer un endpoint backend dédié)
   - Appliquer les mappings validés pour transformer les catégories CSV en catégories DB
   - Filtrer les lignes avec catégories non mappées (si l'utilisateur a choisi de continuer avec des non mappées)
   - Calculer les totaux et agrégations

4. **Bouton "Valider et importer"** :
   - Bouton principal dans l'étape récapitulatif
   - Lance l'import directement avec le mapping en mémoire
   - Indicateur de progression pendant l'import
   - Affichage du rapport d'import après succès

5. **Option d'export du mapping** :
   - Bouton secondaire "Télécharger le mapping" dans l'étape 2 (validation mappings)
   - Permet de sauvegarder le mapping pour réutilisation future ou audit
   - Non obligatoire pour l'import

6. **Tests** :
   - Test que le récapitulatif affiche les bonnes données
   - Test que les totaux sont corrects
   - Test que l'import fonctionne sans étape export/import
   - Test que l'export optionnel fonctionne

---

## 4. Tâches

- [x] **T1 - Suppression de l'étape Export du Stepper**
  - Modifier `LegacyImport.tsx` pour supprimer l'étape 4 (Export)
  - Réorganiser les étapes : 1 (Upload), 2 (Mappings), 3 (Récapitulatif & Import)
  - Supprimer la fonction `handleExportMapping` ou la transformer en fonction optionnelle
  - Mettre à jour les numéros d'étapes dans le stepper

- [x] **T2 - Création de la fonction de calcul du récapitulatif**
  - Création d'un endpoint backend `/preview` qui calcule le récapitulatif
  - Méthode `preview()` dans `LegacyImportService` qui parse le CSV et applique les mappings
  - Calcul des totaux, répartition par catégorie et par date
  - Gestion des erreurs de parsing CSV

- [x] **T3 - Interface du récapitulatif**
  - Création de la nouvelle étape 3 dans le stepper : "Récapitulatif & Import"
  - Section "Total général" avec métriques principales (lignes, kilos, dates, catégories)
  - Section "Répartition par catégorie" avec tableau trié par total kilos décroissant
  - Section "Répartition par date" avec tableau trié par date
  - Section "Catégories non mappées" avec alert si présentes

- [x] **T4 - Intégration de l'import direct**
  - `handleImport` utilise déjà le mapping en mémoire (création du fichier mapping en mémoire)
  - Le bouton "Valider et importer" dans l'étape récapitulatif appelle directement `handleImport`
  - Indicateur de progression pendant l'import
  - Affichage du rapport d'import après succès

- [x] **T5 - Option d'export du mapping (optionnel)**
  - Bouton "Télécharger le mapping" ajouté dans l'étape 2 (Mappings)
  - Bouton secondaire, non obligatoire
  - Utilise la fonction `handleExportMapping` existante
  - Permet de sauvegarder le mapping pour audit ou réutilisation

- [x] **T6 - Gestion des erreurs et validations**
  - Validation que le CSV est toujours disponible avant le récapitulatif
  - Validation que les mappings sont valides
  - Gestion des erreurs de parsing CSV dans le récapitulatif
  - Messages d'erreur clairs si le calcul du récapitulatif échoue
  - Calcul automatique du récapitulatif à l'arrivée sur l'étape 3

- [ ] **T7 - Tests**
  - Test que le récapitulatif calcule correctement les totaux
  - Test que la répartition par catégorie est correcte
  - Test que l'import fonctionne sans étape export/import
  - Test que l'export optionnel fonctionne
  - Test avec différents scénarios (toutes catégories mappées, certaines non mappées, certaines rejetées)

---

## 5. Dépendances

- **Pré-requis** : B47-P3 (interface web de validation mapping), B47-P9 (correction bugs mapping manuel)
- **Bloque** : Aucune (amélioration UX, non bloquant)

---

## 6. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture

2. **Structure du CSV** :
   - Colonnes : `date`, `category`, `poids_kg`, `destination`, `notes`
   - Format : CSV avec en-têtes
   - Encodage : UTF-8
   - [Source: docs/epics/epic-b47-import-legacy-csv-template-offline.md]

3. **Parsing CSV côté frontend** :
   - Option A : Utiliser `Papaparse` (bibliothèque populaire pour parsing CSV en JS)
   - Option B : Parser manuellement avec `FileReader` et `split()`
   - Option C : Créer un endpoint backend `/api/v1/admin/import/legacy/preview` qui retourne le récapitulatif
   - **Recommandation** : Option A (Papaparse) pour robustesse et gestion d'encodage

4. **État actuel du mapping** :
   - `mappings: Record<string, CategoryMapping>` : Mappings validés
   - `unmapped: string[]` : Catégories non mappées
   - `rejectedCategories: Set<string>` : Catégories rejetées
   - [Source: frontend/src/pages/Admin/LegacyImport.tsx]

5. **Fonction `handleImport` actuelle** :
   - Fichier : `frontend/src/pages/Admin/LegacyImport.tsx`
   - Lignes : 398-457
   - Crée déjà le mapping en mémoire (lignes 409-415)
   - Upload le CSV + mapping créé en mémoire
   - [Source: frontend/src/pages/Admin/LegacyImport.tsx]

6. **Service backend `execute`** :
   - Fichier : `api/src/recyclic_api/services/legacy_import_service.py`
   - Méthode : `execute()` (lignes 899-1068)
   - Accepte `file_bytes` et `mapping_json` (Dict)
   - Ne nécessite pas de fichier uploadé pour le mapping
   - [Source: api/src/recyclic_api/services/legacy_import_service.py]

### Solution Technique Recommandée

**Pour le parsing CSV côté frontend** :
```typescript
import Papa from 'papaparse';

interface CSVRow {
  date: string;
  category: string;
  poids_kg: string;
  destination: string;
  notes: string;
}

const parseCSV = async (file: File): Promise<CSVRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as CSVRow[]);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};
```

**Pour le calcul du récapitulatif** :
```typescript
interface ImportSummary {
  totalLines: number;
  totalKilos: number;
  uniqueDates: number;
  uniqueCategories: number;
  byCategory: Array<{
    categoryName: string;
    categoryId: string;
    lineCount: number;
    totalKilos: number;
  }>;
  byDate: Array<{
    date: string;
    lineCount: number;
    totalKilos: number;
  }>;
  unmappedCategories: string[];
}

const calculateSummary = (
  csvRows: CSVRow[],
  mappings: Record<string, CategoryMapping>,
  unmapped: string[],
  rejectedCategories: Set<string>
): ImportSummary => {
  // Filtrer les lignes valides (mappées, non rejetées)
  const validRows = csvRows.filter(row => {
    const category = row.category.trim();
    return mappings[category] && !rejectedCategories.has(category);
  });

  // Calculer les totaux
  const totalKilos = validRows.reduce((sum, row) => {
    const poids = parseFloat(row.poids_kg) || 0;
    return sum + poids;
  }, 0);

  // Grouper par catégorie
  const byCategoryMap = new Map<string, { count: number; kilos: number; categoryId: string }>();
  validRows.forEach(row => {
    const category = row.category.trim();
    const mapping = mappings[category];
    if (mapping) {
      const existing = byCategoryMap.get(mapping.category_name) || { count: 0, kilos: 0, categoryId: mapping.category_id };
      existing.count++;
      existing.kilos += parseFloat(row.poids_kg) || 0;
      byCategoryMap.set(mapping.category_name, existing);
    }
  });

  const byCategory = Array.from(byCategoryMap.entries()).map(([name, data]) => ({
    categoryName: name,
    categoryId: data.categoryId,
    lineCount: data.count,
    totalKilos: data.kilos
  }));

  // Grouper par date
  const byDateMap = new Map<string, { count: number; kilos: number }>();
  validRows.forEach(row => {
    const date = row.date.trim();
    const existing = byDateMap.get(date) || { count: 0, kilos: 0 };
    existing.count++;
    existing.kilos += parseFloat(row.poids_kg) || 0;
    byDateMap.set(date, existing);
  });

  const byDate = Array.from(byDateMap.entries()).map(([date, data]) => ({
    date,
    lineCount: data.count,
    totalKilos: data.kilos
  })).sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalLines: validRows.length,
    totalKilos,
    uniqueDates: byDate.length,
    uniqueCategories: byCategory.length,
    byCategory: byCategory.sort((a, b) => b.totalKilos - a.totalKilos),
    byDate,
    unmappedCategories: unmapped.filter(cat => !rejectedCategories.has(cat))
  };
};
```

**Pour l'interface du récapitulatif** :
- Utiliser des composants Mantine : `Card`, `Table`, `Badge`, `Alert`, `Group`
- Affichage visuel clair avec icônes
- Tri et pagination pour les tableaux si nécessaire

### Structure du Nouveau Workflow

```
Étape 1 : Upload CSV + Analyse
  ├─ Upload du CSV
  ├─ Sélection du modèle LLM (optionnel)
  └─ Analyse → Affichage des mappings proposés

Étape 2 : Validation des Mappings
  ├─ Tableau des mappings proposés (correction possible)
  ├─ Liste des catégories non mappées (assignation manuelle possible)
  ├─ Liste des catégories rejetées
  ├─ Bouton "Télécharger le mapping" (optionnel)
  └─ Bouton "Continuer" → Passe à l'étape 3

Étape 3 : Récapitulatif & Import
  ├─ Section "Total général"
  ├─ Section "Répartition par catégorie"
  ├─ Section "Répartition par date" (optionnel)
  ├─ Section "Catégories non mappées" (si présentes)
  └─ Bouton "Valider et importer" → Lance l'import
```

### Testing

**Standards de Test** :
- Tests unitaires dans `frontend/src/pages/Admin/__tests__/LegacyImport.test.tsx`
- Utiliser React Testing Library
- Mocker le parsing CSV
- Tests d'intégration pour le flux complet
- [Source: frontend/testing-guide.md]

**Cas de Test Requis** :
- Calcul correct du récapitulatif avec différents CSV
- Affichage correct des totaux et répartitions
- Import fonctionne sans étape export/import
- Export optionnel fonctionne
- Gestion des erreurs de parsing CSV
- Affichage correct des catégories non mappées

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
Aucun problème rencontré

### Completion Notes List
- **Approche choisie** : Endpoint backend `/preview` au lieu de parser côté frontend
  - Avantages : Réutilise la logique de parsing existante, logique centralisée, réponse légère
  - L'endpoint parse le CSV, applique les mappings, et retourne uniquement le récapitulatif
- **Workflow simplifié** : 
  - Étape 1 : Upload CSV + Analyse
  - Étape 2 : Validation des Mappings (avec bouton export optionnel)
  - Étape 3 : Récapitulatif & Import (calcul automatique du récapitulatif, import direct)
- **Import direct** : Le mapping est créé en mémoire et utilisé directement, pas besoin d'uploader un fichier

### File List
**Backend :**
- `api/src/recyclic_api/schemas/legacy_import.py` : Ajout des schémas `ImportSummaryByCategory`, `ImportSummaryByDate`, `LegacyImportPreviewResponse`
- `api/src/recyclic_api/services/legacy_import_service.py` : Ajout de la méthode `preview()` pour calculer le récapitulatif
- `api/src/recyclic_api/api/api_v1/endpoints/legacy_import.py` : Ajout de l'endpoint `/import/legacy/preview`

**Frontend :**
- `frontend/src/services/adminService.ts` : Ajout de la méthode `previewLegacyImport()`
- `frontend/src/pages/Admin/LegacyImport.tsx` : 
  - Suppression de l'étape Export
  - Ajout de l'étape Récapitulatif & Import avec interface complète
  - Ajout du bouton export optionnel dans l'étape Mappings
  - Calcul automatique du récapitulatif à l'arrivée sur l'étape 3
  - Import direct avec mapping en mémoire

---

## 9. QA Results

_À compléter par l'agent QA_

