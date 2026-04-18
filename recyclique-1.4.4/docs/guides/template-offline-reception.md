# Guide d'Utilisation - Template CSV Offline pour les Réceptions

## Introduction

Ce guide explique comment utiliser le template CSV offline pour saisir manuellement les réceptions en cas de panne réseau. Une fois la connexion rétablie, les données peuvent être importées dans Recyclic via l'interface d'administration.

## Quand Utiliser le Template Offline ?

Le template CSV offline est utile dans les situations suivantes :

- **Panne réseau** : Internet est indisponible et vous devez enregistrer des réceptions
- **Saisie différée** : Vous préférez noter les réceptions sur papier puis les saisir plus tard
- **Backup manuel** : Vous souhaitez conserver une copie locale des réceptions

## Téléchargement du Template

### Via l'Interface Web

1. Connectez-vous à l'interface d'administration Recyclic
2. Accédez à la page **Import Legacy** (`/admin/import/legacy`)
3. Cliquez sur le bouton **"Télécharger le template"**
4. Le fichier `template-reception-offline.csv` sera téléchargé automatiquement

### Via l'API (pour les développeurs)

```bash
GET /api/v1/admin/templates/reception-offline.csv
Headers: Authorization: Bearer <admin_token>
```

## Structure du Template

Le template CSV contient les colonnes suivantes :

| Colonne | Description | Format | Obligatoire |
|---------|-------------|--------|-------------|
| `date` | Date de la réception | ISO 8601 (`YYYY-MM-DD`) | ✅ Oui |
| `category` | Nom de la catégorie | Nom exact en base | ✅ Oui |
| `poids_kg` | Poids en kilogrammes | Nombre décimal (2 décimales) | ✅ Oui |
| `destination` | Destination de l'objet | `MAGASIN`, `RECYCLAGE`, ou `DECHETERIE` | ✅ Oui |
| `notes` | Notes libres | Texte libre | ❌ Non |

**⚠️ Important :** Le template téléchargé contient une **ligne d'exemple** après les en-têtes. Cette ligne doit être **supprimée avant l'import** ou remplacée par vos données réelles.

### Exemple de Ligne

```csv
date,category,poids_kg,destination,notes
2025-01-27,EEE - Informatique,12.50,MAGASIN,Ordinateur portable fonctionnel
```

## Règles de Saisie

### 1. Dates (Colonne `date`)

**Format requis :** ISO 8601 (`YYYY-MM-DD`)

**Exemples valides :**
- `2025-01-27` ✅
- `2025-12-31` ✅
- `2025-02-29` ✅ (année bissextile)

**Exemples invalides :**
- `27/01/2025` ❌ (format français)
- `2025-1-27` ❌ (mois/jour sans zéro)
- `27-01-2025` ❌ (ordre incorrect)

**Conseil :** Utilisez un tableur (Excel, LibreOffice Calc) pour formater automatiquement les dates en ISO 8601.

### 2. Catégories (Colonne `category`)

**Important :** Le nom de la catégorie doit correspondre **exactement** au nom enregistré dans la base de données Recyclic.

**Comment connaître les catégories disponibles ?**

1. **Via l'interface web** : Accédez à la page de réception et consultez la liste des catégories
2. **Via l'API** : `GET /api/v1/reception/categories` (nécessite authentification)

**Exemples de catégories courantes :**
- `EEE - Informatique`
- `EEE - Gros électroménager`
- `EEE - Petits appareils ménagers`
- `Mobilier`
- `Textile`
- `Divers`

**⚠️ Attention :** Les catégories sont sensibles à la casse et aux espaces. Utilisez exactement le nom tel qu'il apparaît dans l'interface.

**En cas d'erreur :** Si une catégorie n'est pas reconnue lors de l'import, le système proposera un mapping automatique (fuzzy matching) que vous pourrez valider ou corriger.

### 3. Poids (Colonne `poids_kg`)

**Format requis :** Nombre décimal avec 2 décimales maximum

**Exemples valides :**
- `12.50` ✅
- `0.75` ✅
- `150.00` ✅
- `5` ✅ (sera interprété comme `5.00`)

**Exemples invalides :**
- `12,50` ❌ (virgule au lieu du point)
- `12.5` ⚠️ (accepté mais préférez `12.50` pour la clarté)
- `abc` ❌ (non numérique)
- `0` ❌ (poids doit être > 0)

**Conseil :** Utilisez toujours le point (`.`) comme séparateur décimal, même si votre système utilise la virgule par défaut.

### 4. Destination (Colonne `destination`)

**Valeurs autorisées :**
- `MAGASIN` : Objet destiné à la vente en magasin
- `RECYCLAGE` : Objet destiné au recyclage
- `DECHETERIE` : Objet destiné à la déchèterie

**⚠️ Important :** Les valeurs sont en **MAJUSCULES** et doivent correspondre exactement.

**Exemples valides :**
- `MAGASIN` ✅
- `RECYCLAGE` ✅
- `DECHETERIE` ✅

**Exemples invalides :**
- `magasin` ❌ (minuscules)
- `Magasin` ❌ (majuscule/minuscule)
- `MAGASIN ` ❌ (espace en fin)

### 5. Notes (Colonne `notes`)

**Format :** Texte libre (optionnel)

**Utilisation :**
- Décrire l'état de l'objet
- Noter des informations complémentaires
- Ajouter des remarques pour le traitement

**Exemples :**
- `Ordinateur portable fonctionnel, écran 15 pouces`
- `Chaise en bon état, légèrement usée`
- `À vérifier avant mise en vente`

**Limite :** Pas de limite de caractères, mais gardez les notes concises pour faciliter la lecture.

## Processus d'Import

Une fois le template rempli et la connexion rétablie :

### 1. Préparer le Fichier

- **Supprimez la ligne d'exemple** (si elle est encore présente) ou remplacez-la par vos données réelles
- Vérifiez que toutes les colonnes obligatoires sont remplies
- Vérifiez le format des dates (ISO 8601)
- Vérifiez que les destinations sont en MAJUSCULES
- Sauvegardez le fichier en CSV (UTF-8 avec BOM recommandé)

### 2. Accéder à l'Interface d'Import

1. Connectez-vous à l'interface d'administration
2. Accédez à **Import Legacy** (`/admin/import/legacy`)
3. Cliquez sur **"Choisir un fichier"** ou **"Upload CSV"**

### 3. Analyser le Fichier

1. Sélectionnez votre fichier CSV rempli
2. Cliquez sur **"Analyser"**
3. Le système va :
   - Valider la structure du CSV
   - Proposer des mappings automatiques pour les catégories (fuzzy matching)
   - Identifier les catégories non mappables

### 4. Valider les Mappings

1. **Mappings automatiques** : Vérifiez que les propositions sont correctes
   - Indicateur de confiance affiché (ex: 95%)
   - Corrigez manuellement si nécessaire

2. **Catégories non mappables** :
   - Mappez vers une catégorie existante
   - Ou rejetez la ligne si la catégorie est invalide

3. **Export du mapping** : Optionnellement, exportez le fichier de mapping validé pour référence

### 5. Exécuter l'Import

1. Cliquez sur **"Importer"**
2. Le système va :
   - Créer les `PosteReception` par jour (ou réutiliser s'ils existent)
   - Créer les `TicketDepot` par jour
   - Créer les `LigneDepot` avec les catégories mappées
   - Générer un rapport d'import

3. **Rapport d'import** : Consultez les statistiques :
   - Nombre de postes créés/réutilisés
   - Nombre de tickets créés
   - Nombre de lignes importées
   - Erreurs éventuelles

## Exemples Pratiques

### Exemple 1 : Réception Simple

```csv
date,category,poids_kg,destination,notes
2025-01-27,EEE - Informatique,5.20,MAGASIN,Ordinateur portable
2025-01-27,Mobilier,12.50,MAGASIN,Chaise de bureau
2025-01-27,Textile,2.30,RECYCLAGE,Vêtements usés
```

### Exemple 2 : Réception avec Notes Détaillées

```csv
date,category,poids_kg,destination,notes
2025-01-27,EEE - Informatique,8.75,MAGASIN,Ordinateur fixe complet, écran 24 pouces inclus, fonctionnel
2025-01-27,EEE - Gros électroménager,45.00,DECHETERIE,Lave-linge HS, à recycler
2025-01-27,Mobilier,25.00,MAGASIN,Table en bois massif, excellent état
```

### Exemple 3 : Plusieurs Réceptions sur Plusieurs Jours

```csv
date,category,poids_kg,destination,notes
2025-01-27,EEE - Informatique,3.50,MAGASIN,Clavier et souris
2025-01-27,Textile,1.20,RECYCLAGE,Vêtements
2025-01-28,EEE - Informatique,12.00,MAGASIN,Écran 27 pouces
2025-01-28,Mobilier,8.50,MAGASIN,Étagère
2025-01-29,Textile,5.30,RECYCLAGE,Lot de vêtements
```

## Dépannage

### Erreur : "Format de date invalide"

**Cause :** La date n'est pas au format ISO 8601.

**Solution :**
- Vérifiez que le format est `YYYY-MM-DD`
- Utilisez un tableur pour formater automatiquement les dates
- Exemple : Dans Excel, sélectionnez la colonne → Format de cellule → Date → `YYYY-MM-DD`

### Erreur : "Catégorie non trouvée"

**Cause :** Le nom de la catégorie ne correspond pas exactement à celui en base.

**Solution :**
1. Consultez la liste des catégories disponibles via l'interface ou l'API
2. Vérifiez la casse (majuscules/minuscules)
3. Vérifiez les espaces (pas d'espaces en début/fin)
4. Utilisez le mapping automatique proposé par le système lors de l'analyse

### Erreur : "Poids invalide"

**Cause :** Le poids n'est pas un nombre valide ou est ≤ 0.

**Solution :**
- Vérifiez que le poids est un nombre (pas de texte)
- Utilisez le point (`.`) comme séparateur décimal
- Assurez-vous que le poids est > 0

### Erreur : "Destination invalide"

**Cause :** La destination n'est pas `MAGASIN`, `RECYCLAGE`, ou `DECHETERIE` (en MAJUSCULES).

**Solution :**
- Vérifiez que la destination est en MAJUSCULES
- Vérifiez qu'il n'y a pas d'espaces en début/fin
- Utilisez exactement : `MAGASIN`, `RECYCLAGE`, ou `DECHETERIE`

### Erreur : "Encodage invalide"

**Cause :** Le fichier n'est pas encodé en UTF-8.

**Solution :**
- Sauvegardez le fichier en UTF-8 avec BOM (pour Excel)
- Dans Excel : Fichier → Enregistrer sous → CSV UTF-8 (délimité par des virgules)
- Dans LibreOffice : Fichier → Enregistrer sous → CSV → Encodage : UTF-8

### Le fichier ne s'ouvre pas correctement dans Excel

**Cause :** Le fichier n'a pas le BOM UTF-8 ou utilise le mauvais séparateur.

**Solution :**
- Le template généré par Recyclic est déjà en UTF-8 avec BOM
- Si vous créez le fichier manuellement, assurez-vous d'utiliser UTF-8 avec BOM
- Utilisez la virgule (`,`) comme séparateur de colonnes

## Bonnes Pratiques

1. **Sauvegardez régulièrement** : Enregistrez votre fichier CSV régulièrement pendant la saisie
2. **Vérifiez avant l'import** : Validez le format des données avant d'importer
3. **Conservez une copie** : Gardez une copie du fichier CSV original pour référence
4. **Utilisez un tableur** : Excel ou LibreOffice Calc facilitent la saisie et la validation
5. **Vérifiez les catégories** : Consultez la liste des catégories disponibles avant de saisir
6. **Notes claires** : Rédigez des notes concises et utiles pour le traitement ultérieur

## Support

En cas de problème :

1. **Consultez ce guide** : La plupart des erreurs sont documentées dans la section Dépannage
2. **Vérifiez les logs** : Les erreurs d'import sont détaillées dans le rapport d'import
3. **Contactez l'administrateur** : Pour les problèmes techniques ou les questions sur les catégories

## Références

- **Story B47-P4** : Template CSV Offline & Documentation
- **Epic B47** : Import Legacy CSV & Template Offline
- **Interface d'import** : `/admin/import/legacy`
- **API Endpoint** : `GET /api/v1/admin/templates/reception-offline.csv`

