# Story B47-P11: Sélection Date d'Import Manuelle

**Statut:** Ready
**Épopée:** [EPIC-B47 – Import Legacy CSV & Template Offline](../epics/epic-b47-import-legacy-csv-template-offline.md)
**Module:** Backend API + Frontend Admin
**Priorité:** Moyenne (amélioration UX)

---

## 1. Contexte

Actuellement, lors de l'import legacy, les données sont importées avec les dates du CSV. Chaque date unique du CSV devient un `PosteReception` et un `TicketDepot` séparé. Cela signifie que si le CSV contient des données sur plusieurs jours (par exemple, 17/09, 18/09, 19/09), l'import créera 3 postes et 3 tickets différents.

Cependant, il peut être utile de pouvoir importer toutes les données avec une date unique choisie manuellement. Par exemple :
- Importer toutes les données historiques avec la date d'aujourd'hui
- Importer avec une date spécifique pour regrouper toutes les données
- Corriger une erreur de date dans le CSV en utilisant une date manuelle

**Besoin utilisateur :** 
- Pouvoir choisir une date d'import manuelle dans l'étape de récapitulatif, qui remplacera toutes les dates du CSV pour créer un seul poste/ticket avec cette date.
- Pouvoir exporter le CSV avec les catégories remappées (catégories CSV remplacées par les noms de catégories de la base de données) pour sauvegarder le fichier corrigé.

---

## 2. User Story

En tant que **Administrateur**,
je veux **pouvoir sélectionner une date d'import manuelle dans l'étape de récapitulatif et exporter le CSV avec les catégories remappées**,
afin que **toutes les données soient importées avec cette date unique au lieu d'utiliser les dates du CSV, et que je puisse sauvegarder le CSV corrigé avec les mappings appliqués.**

---

## 3. Critères d'acceptation

1. **Sélecteur de date dans l'étape 3 (Récapitulatif & Import)** :
   - Ajouter un sélecteur de date (input type="date") dans l'étape 3, avant le récapitulatif
   - Le sélecteur est optionnel (par défaut, utilise les dates du CSV)
   - Label : "Date d'import (optionnel)"
   - Description : "Si une date est sélectionnée, toutes les données seront importées avec cette date unique. Sinon, les dates du CSV seront utilisées."
   - Validation : La date ne peut pas être dans le futur
   - Valeur par défaut : Vide (utilise les dates du CSV)
   - Icône calendrier pour cohérence avec le reste de l'interface

2. **Mise à jour du récapitulatif** :
   - Si une date d'import est sélectionnée :
     - Afficher un `Alert` avec un avertissement : "⚠️ Toutes les données seront importées avec la date [DATE] au lieu des dates du CSV"
     - Le récapitulatif doit indiquer clairement que toutes les données seront regroupées sous une seule date
     - Afficher la date choisie dans la section "Total général"
   - Si aucune date n'est sélectionnée :
     - Le récapitulatif reste inchangé (affiche la répartition par date du CSV)

3. **Modification de l'endpoint `execute`** :
   - Ajouter un paramètre optionnel `import_date` (format ISO 8601: `YYYY-MM-DD`) dans l'endpoint `POST /api/v1/admin/import/legacy/execute`
   - Si `import_date` est fourni :
     - Utiliser cette date pour créer un seul `PosteReception` et un seul `TicketDepot`
     - Ignorer les dates du CSV
     - Toutes les lignes seront associées à ce ticket unique
   - Si `import_date` n'est pas fourni :
     - Comportement actuel : créer un poste/ticket par date du CSV
   - Validation : La date ne peut pas être dans le futur

4. **Mise à jour du schéma Pydantic** :
   - Ajouter le champ `import_date: Optional[str]` dans le schéma de requête de l'endpoint `execute`
   - Validation du format ISO 8601
   - Validation que la date n'est pas dans le futur

5. **Mise à jour du service frontend** :
   - Modifier `executeLegacyImport` dans `adminService.ts` pour accepter un paramètre optionnel `importDate?: string`
   - Envoyer `import_date` dans le body de la requête si fourni

6. **Bouton "Exporter CSV remappé" dans l'étape 3** :
   - Ajouter un bouton "Exporter CSV remappé" dans l'étape 3 (Récapitulatif & Import)
   - Le bouton doit être visible quand le récapitulatif est disponible (après analyse)
   - Le bouton doit être placé à côté du bouton "Valider et importer" ou dans un groupe de boutons
   - Le CSV exporté doit avoir les catégories CSV remplacées par les catégories mappées (noms de la base de données)
   - Le CSV exporté doit conserver toutes les autres colonnes (date, poids_kg, destination, notes)
   - Le nom du fichier doit être descriptif : `import_legacy_remappe_YYYYMMDD_HHMMSS.csv`

7. **Endpoint backend pour exporter le CSV remappé** :
   - Nouvel endpoint `POST /api/v1/admin/import/legacy/export-remapped` :
     - Accepte le fichier CSV et le mapping JSON
     - Applique les mappings pour remplacer les catégories CSV par les catégories mappées
     - Retourne le CSV remappé en téléchargement (StreamingResponse)
   - Protection par rôle (ADMIN, SUPER_ADMIN)
   - Gestion des erreurs avec messages clairs

8. **Tests** :
   - Test backend : Import avec date manuelle crée un seul poste/ticket
   - Test backend : Import sans date manuelle crée un poste/ticket par date du CSV (comportement actuel)
   - Test backend : Export CSV remappé remplace correctement les catégories
   - Test frontend : Le sélecteur de date s'affiche dans l'étape 3
   - Test frontend : L'avertissement s'affiche quand une date est sélectionnée
   - Test frontend : Le bouton "Exporter CSV remappé" s'affiche et fonctionne
   - Test frontend : L'import fonctionne avec et sans date manuelle

---

## 4. Tâches

- [x] **T1 - Ajout du sélecteur de date dans l'étape 3 (Frontend)**
  - Ajouter un `TextInput` avec `type="date"` dans l'étape 3 (Récapitulatif & Import)
  - Position : Avant le récapitulatif, dans une section dédiée
  - État : `importDate: string | null` (initialisé à `null`)
  - Validation : Date ne peut pas être dans le futur (`max={new Date().toISOString().split('T')[0]}`)
  - Label : "Date d'import (optionnel)"
  - Description : "Si une date est sélectionnée, toutes les données seront importées avec cette date unique. Sinon, les dates du CSV seront utilisées."
  - Icône : `IconCalendar` pour cohérence
  - Style : Cohérent avec les autres sélecteurs de date du projet (comme dans `Reception.tsx`)

- [x] **T2 - Mise à jour du récapitulatif avec avertissement**
  - Si `importDate` est sélectionné :
    - Afficher un `Alert` avec type "warning" avant le récapitulatif
    - Message : "⚠️ Toutes les données seront importées avec la date [DATE] au lieu des dates du CSV"
    - Afficher la date choisie dans la section "Total général" (nouveau champ "Date d'import")
  - Si `importDate` est `null` :
    - Le récapitulatif reste inchangé
  - Mettre à jour l'appel à `previewLegacyImport` pour inclure `importDate` si fourni (optionnel)

- [x] **T3 - Modification de l'endpoint `execute` (Backend)**
  - Modifier `POST /api/v1/admin/import/legacy/execute` dans `legacy_import.py`
  - Ajouter un paramètre optionnel `import_date: Optional[str]` dans le body de la requête
  - Validation : Format ISO 8601 (`YYYY-MM-DD`)
  - Validation : Date ne peut pas être dans le futur
  - Si `import_date` est fourni :
    - Convertir en `date` Python
    - Modifier la logique d'import pour créer un seul poste/ticket avec cette date
    - Ignorer les dates du CSV (grouper toutes les lignes sous cette date unique)
  - Si `import_date` n'est pas fourni :
    - Comportement actuel : créer un poste/ticket par date du CSV

- [x] **T4 - Modification du service `LegacyImportService.execute()`**
  - Ajouter un paramètre optionnel `import_date: Optional[date]` dans la méthode `execute()`
  - Si `import_date` est fourni :
    - Créer un seul `PosteReception` avec `opened_at = import_date` (début de journée en UTC)
    - Créer un seul `TicketDepot` pour ce poste
    - Associer toutes les lignes à ce ticket unique
    - Ignorer le groupement par date du CSV
  - Si `import_date` n'est pas fourni :
    - Comportement actuel : grouper par date du CSV et créer un poste/ticket par date
  - Mettre à jour le rapport d'import pour indiquer si une date manuelle a été utilisée

- [x] **T5 - Mise à jour du schéma Pydantic**
  - Modifier le schéma de requête pour l'endpoint `execute` dans `legacy_import.py`
  - Ajouter le champ `import_date: Optional[str] = None`
  - Validation : Format ISO 8601 si fourni
  - Validation : Date ne peut pas être dans le futur si fourni

- [x] **T6 - Mise à jour du service frontend**
  - Modifier `executeLegacyImport` dans `adminService.ts`
  - Ajouter un paramètre optionnel `importDate?: string`
  - Envoyer `import_date` dans le body de la requête si fourni
  - Mettre à jour l'appel dans `LegacyImport.tsx` pour passer `importDate`

- [x] **T7 - Endpoint backend pour exporter le CSV remappé**
  - Créer un nouvel endpoint `POST /api/v1/admin/import/legacy/export-remapped` dans `legacy_import.py`
  - Accepte : `file: UploadFile` (CSV), `mapping_file: UploadFile` (mapping JSON)
  - Logique :
    - Parser le CSV
    - Appliquer les mappings pour remplacer les catégories CSV par les catégories mappées (`category_name`)
    - Conserver toutes les autres colonnes (date, poids_kg, destination, notes)
    - Filtrer les lignes avec catégories non mappées (optionnel : les inclure avec leur nom CSV original)
    - Générer le CSV remappé
  - Retourner le CSV en `StreamingResponse` avec `Content-Disposition: attachment`
  - Nom de fichier : `import_legacy_remappe_YYYYMMDD_HHMMSS.csv`
  - Protection par rôle (ADMIN, SUPER_ADMIN)
  - Gestion des erreurs avec messages clairs

- [x] **T8 - Bouton "Exporter CSV remappé" dans l'étape 3 (Frontend)**
  - Ajouter un bouton "Exporter CSV remappé" dans l'étape 3
  - Position : À côté du bouton "Valider et importer" ou dans un `Group` de boutons
  - Icône : `IconDownload` pour cohérence
  - Condition d'affichage : Visible quand `analyzeResult` existe (récapitulatif disponible)
  - Fonction `handleExportRemappedCSV()` :
    - Créer le mapping JSON en mémoire (comme pour l'import)
    - Appeler `adminService.exportRemappedLegacyImportCSV(csvFile, mappingFile)`
    - Gérer le téléchargement du fichier
  - Message de confirmation après export réussi

- [x] **T9 - Service frontend pour exporter le CSV remappé**
  - Ajouter méthode `exportRemappedLegacyImportCSV(file: File, mappingFile: File)` dans `adminService.ts`
  - Appel à l'endpoint `POST /api/v1/admin/import/legacy/export-remapped`
  - Gestion du téléchargement du fichier (blob response)
  - Gestion des erreurs avec messages clairs

- [ ] **T10 - Tests**
  - Tests backend :
    - Test que l'import avec `import_date` crée un seul poste/ticket
    - Test que l'import sans `import_date` crée un poste/ticket par date (comportement actuel)
    - Test que la validation rejette une date dans le futur
    - Test que la validation rejette un format de date invalide
    - Test que l'export CSV remappé remplace correctement les catégories
    - Test que l'export CSV remappé conserve toutes les autres colonnes
  - Tests frontend :
    - Test que le sélecteur de date s'affiche dans l'étape 3
    - Test que l'avertissement s'affiche quand une date est sélectionnée
    - Test que le bouton "Exporter CSV remappé" s'affiche quand le récapitulatif est disponible
    - Test que l'export CSV remappé fonctionne et télécharge le fichier
    - Test que l'import fonctionne avec date manuelle
    - Test que l'import fonctionne sans date manuelle (comportement actuel)

---

## 5. Dépendances

- **Pré-requis** : B47-P10 (Simplification Workflow et Récapitulatif Pré-Import)
- **Bloque** : Aucune (amélioration UX, non bloquant)

---

## 6. Dev Notes

### Références Architecturales Clés

1. **COMMENCER PAR** : `docs/architecture/index.md` - Navigation complète de l'architecture

2. **Sélecteur de date existant** :
   - Fichier : `frontend/src/pages/Reception.tsx` (lignes 619-660)
   - Pattern utilisé : `TextInput` avec `type="date"`
   - Validation : `max={new Date().toISOString().split('T')[0]}` pour empêcher les dates futures
   - Icône : `IconCalendar` de `@tabler/icons-react`
   - Style : Cohérent avec le reste de l'interface
   - [Source: frontend/src/pages/Reception.tsx]

3. **Endpoint `execute` actuel** :
   - Fichier : `api/src/recyclic_api/api/api_v1/endpoints/legacy_import.py`
   - Endpoint : `POST /api/v1/admin/import/legacy/execute`
   - Accepte : `file: UploadFile`, `mapping_file: UploadFile`
   - Appelle : `LegacyImportService.execute(file_bytes, mapping_json, admin_user_id)`
   - [Source: api/src/recyclic_api/api/api_v1/endpoints/legacy_import.py]

4. **Service `LegacyImportService.execute()`** :
   - Fichier : `api/src/recyclic_api/services/legacy_import_service.py`
   - Méthode : `execute(file_bytes, mapping_json, admin_user_id)` (lignes 1040-1201)
   - Logique actuelle :
     - Parse le CSV et groupe les lignes par date (lignes 1112-1149)
     - Crée un poste/ticket par date (lignes 1159-1173)
   - Méthode `_get_or_create_poste_for_date()` : Crée ou récupère un poste pour une date (lignes 995-1038)
   - [Source: api/src/recyclic_api/services/legacy_import_service.py]

5. **Service frontend `executeLegacyImport`** :
   - Fichier : `frontend/src/services/adminService.ts`
   - Méthode : `executeLegacyImport(csvFile: File, mappingFile: File)`
   - Envoie : `FormData` avec `file` et `mapping_file`
   - [Source: frontend/src/services/adminService.ts]

6. **Interface LegacyImport.tsx - Étape 3** :
   - Fichier : `frontend/src/pages/Admin/LegacyImport.tsx`
   - Étape 3 : "Récapitulatif & Import"
   - Affiche le récapitulatif et le bouton "Valider et importer"
   - [Source: frontend/src/pages/Admin/LegacyImport.tsx]

7. **Patterns d'export CSV existants** :
   - Fichier : `api/src/recyclic_api/api/api_v1/endpoints/reception.py` (lignes 694-781)
   - Pattern utilisé : `StreamingResponse` avec `io.StringIO()` et `csv.writer`
   - Encodage : UTF-8 avec BOM (`utf-8-sig`) pour Excel
   - Headers : `Content-Disposition: attachment; filename="..."` et `Content-Type: text/csv`
   - [Source: api/src/recyclic_api/api/api_v1/endpoints/reception.py]

### Solution Technique Recommandée

**Pour le sélecteur de date (Frontend)** :
```typescript
// Dans LegacyImport.tsx, étape 3
const [importDate, setImportDate] = useState<string | null>(null);

<TextInput
  type="date"
  label="Date d'import (optionnel)"
  placeholder="Sélectionnez une date d'import"
  value={importDate || ''}
  onChange={(e) => {
    const value = e.target.value;
    setImportDate(value || null);
  }}
  max={new Date().toISOString().split('T')[0]}
  icon={<IconCalendar size={16} />}
  mb="md"
  description="Si une date est sélectionnée, toutes les données seront importées avec cette date unique. Sinon, les dates du CSV seront utilisées."
/>

{importDate && (
  <Alert icon={<IconAlertCircle size={16} />} title="Date d'import sélectionnée" color="yellow" mb="md">
    ⚠️ Toutes les données seront importées avec la date <strong>{importDate}</strong> au lieu des dates du CSV.
  </Alert>
)}
```

**Pour l'endpoint backend** :
```python
# Dans legacy_import.py
@router.post("/execute", response_model=LegacyImportExecuteResponse)
async def execute_legacy_import(
    file: UploadFile = File(...),
    mapping_file: UploadFile = File(...),
    import_date: Optional[str] = Form(None),  # Nouveau paramètre
    current_user: User = Depends(get_current_user),
):
    # Validation de import_date si fourni
    import_date_obj = None
    if import_date:
        try:
            import_date_obj = datetime.strptime(import_date, "%Y-%m-%d").date()
            # Vérifier que la date n'est pas dans le futur
            if import_date_obj > date.today():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La date d'import ne peut pas être dans le futur"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format de date invalide. Utilisez YYYY-MM-DD"
            )
    
    # Appeler le service avec import_date_obj
    result = service.execute(file_bytes, mapping_json, current_user.id, import_date=import_date_obj)
    return result
```

**Pour le service `execute()`** :
```python
def execute(
    self, 
    file_bytes: bytes, 
    mapping_json: Dict[str, Any],
    admin_user_id: UUID,
    import_date: Optional[date] = None  # Nouveau paramètre
) -> Dict[str, Any]:
    # ... validation et parsing du CSV ...
    
    if import_date:
        # Mode date unique : créer un seul poste/ticket
        poste, is_new = self._get_or_create_poste_for_date(import_date, admin_user_id)
        ticket = self.reception_service.create_ticket(
            poste_id=poste.id,
            benevole_user_id=admin_user_id
        )
        
        # Associer toutes les lignes à ce ticket unique
        for row in all_rows:
            ligne = self.reception_service.create_ligne(...)
    else:
        # Mode normal : grouper par date du CSV (comportement actuel)
        rows_by_date: Dict[date, List[Dict[str, Any]]] = {}
        # ... groupement par date ...
        for date_obj, rows in rows_by_date.items():
            poste, is_new = self._get_or_create_poste_for_date(date_obj, admin_user_id)
            # ... création ticket et lignes ...
```

**Pour l'endpoint d'export CSV remappé** :
```python
# Dans legacy_import.py
@router.post("/export-remapped")
async def export_remapped_legacy_import(
    file: UploadFile = File(...),
    mapping_file: UploadFile = File(...),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    # Lire les fichiers
    file_bytes = await file.read()
    mapping_bytes = await mapping_file.read()
    mapping_json = json.loads(mapping_bytes.decode("utf-8"))
    
    # Parser le CSV
    text = file_bytes.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    
    # Appliquer les mappings
    mappings = mapping_json.get("mappings", {})
    output = io.StringIO()
    writer = csv.writer(output, delimiter=',', quoting=csv.QUOTE_MINIMAL)
    
    # En-têtes
    writer.writerow(["date", "category", "poids_kg", "destination", "notes"])
    
    # Lignes remappées
    for row in reader:
        csv_category = row.get("category", "").strip()
        if csv_category in mappings:
            # Remplacer par la catégorie mappée
            mapped_category = mappings[csv_category]["category_name"]
            writer.writerow([
                row.get("date", ""),
                mapped_category,  # Catégorie remappée
                row.get("poids_kg", ""),
                row.get("destination", ""),
                row.get("notes", "")
            ])
        # Optionnel : inclure les non mappées avec leur nom original
    
    # Générer le CSV
    csv_content = output.getvalue()
    csv_bytes = csv_content.encode('utf-8-sig')  # BOM pour Excel
    
    # Nom de fichier
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"import_legacy_remappe_{timestamp}.csv"
    
    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
```

**Pour le bouton frontend** :
```typescript
// Dans LegacyImport.tsx, étape 3
<Group position="right" mt="xl">
  <Button
    variant="outline"
    leftSection={<IconDownload size={16} />}
    onClick={handleExportRemappedCSV}
    disabled={!analyzeResult || !csvFile}
  >
    Exporter CSV remappé
  </Button>
  <Button
    onClick={handleImport}
    leftSection={<IconDatabaseImport size={16} />}
    loading={importing}
    disabled={!analyzeResult || importing}
  >
    Valider et importer
  </Button>
</Group>
```

### Testing

**Standards de Test** :
- Tests unitaires backend dans `api/tests/test_legacy_import_execute_endpoint.py`
- Tests unitaires frontend dans `frontend/src/pages/Admin/__tests__/LegacyImport.test.tsx`
- Utiliser pytest pour backend, React Testing Library pour frontend
- [Source: api/testing-guide.md, frontend/testing-guide.md]

**Cas de Test Requis** :
- Backend :
  - Import avec `import_date` crée un seul poste/ticket
  - Import sans `import_date` crée un poste/ticket par date (comportement actuel)
  - Validation rejette une date dans le futur
  - Validation rejette un format de date invalide
  - Export CSV remappé remplace correctement les catégories
  - Export CSV remappé conserve toutes les autres colonnes
  - Export CSV remappé gère les catégories non mappées (optionnel : les inclure avec nom original)
- Frontend :
  - Sélecteur de date s'affiche dans l'étape 3
  - Avertissement s'affiche quand une date est sélectionnée
  - Bouton "Exporter CSV remappé" s'affiche quand le récapitulatif est disponible
  - Export CSV remappé télécharge le fichier correctement
  - Import fonctionne avec date manuelle
  - Import fonctionne sans date manuelle (comportement actuel)

---

## 7. Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-XX | 1.0 | Création de la story | Sarah (Product Owner) |
| 2025-01-27 | 1.1 | Implémentation complète (T1-T9) | James (Dev Agent) |

---

## 8. Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5 (via Cursor)

### Debug Log References
Aucune erreur de linting détectée. Tous les fichiers compilent correctement.

### Completion Notes List
- Toutes les tâches T1-T9 ont été implémentées avec succès
- Le sélecteur de date a été ajouté dans l'étape 3 avec validation (pas de date future)
- L'endpoint backend accepte maintenant le paramètre `import_date` optionnel
- Le service `LegacyImportService.execute()` gère les deux modes : avec et sans date manuelle
- L'export CSV remappé est fonctionnel avec remplacement des catégories
- Tous les fichiers respectent les standards de codage du projet
- T10 (Tests) reste à implémenter

### File List
**Frontend:**
- `frontend/src/pages/Admin/LegacyImport.tsx` - Ajout du sélecteur de date, avertissement, bouton export CSV remappé
- `frontend/src/services/adminService.ts` - Mise à jour de `executeLegacyImport` et ajout de `exportRemappedLegacyImportCSV`

**Backend:**
- `api/src/recyclic_api/api/api_v1/endpoints/legacy_import.py` - Ajout du paramètre `import_date` dans `execute_legacy_import` et nouvel endpoint `export_remapped_legacy_import`
- `api/src/recyclic_api/services/legacy_import_service.py` - Modification de `execute()` pour gérer `import_date` optionnel

---

## 9. QA Results

_À compléter par l'agent QA_

