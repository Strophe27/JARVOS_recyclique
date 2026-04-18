# Guide de Mapping des Catégories

## Introduction

Ce guide vous accompagne dans la création des correspondances (mappings) entre les catégories RecyClique et les catégories des éco-organismes partenaires. Un mapping correct est essentiel pour :
- ✅ Assurer le calcul automatique des poids par catégorie éco-organisme
- ✅ Simplifier les déclarations trimestrielles
- ✅ Maximiser les soutiens financiers perçus
- ✅ Garantir la conformité avec les exigences des éco-organismes

---

## Principe du Mapping

### Qu'est-ce qu'un Mapping ?

Un **mapping** (ou correspondance) est un lien entre :
- **Une catégorie RecyClique** : Votre classification interne des objets
- **Une catégorie éco-organisme** : La classification imposée par le partenaire REP (ex: eco-maison)

### Exemple Simple

```
Catégorie RecyClique          →    Catégorie eco-maison
─────────────────────────────────────────────────────────
"Chaises"                     →    DEA - Assise
"Tables"                      →    DEA - Plan de pose
"Peluches"                    →    Jouets - Éveil et Premier Âge
```

### Flux Concernés

Un mapping peut s'appliquer à un ou plusieurs flux :
- **RECEIVED** (Objets reçus/gisement)
- **REUSED** (Objets vendus/réemployés)
- **RECYCLED** (Objets recyclés/détruits)
- **ALL** (Tous les flux)

**Exemple** : Si vous recevez des peluches mais ne les recyclez jamais, vous pouvez créer 2 mappings :
- Peluches → Jouets Éveil (flux: RECEIVED)
- Peluches → Jouets Éveil (flux: REUSED)

Ou plus simplement :
- Peluches → Jouets Éveil (flux: ALL)

---

## Méthodologie de Mapping

### Étape 1 : Inventaire

#### 1.1 Lister les Catégories RecyClique
Extrayez la liste complète de vos catégories actuelles :
```sql
SELECT id, name, parent_id FROM categories ORDER BY name;
```

Organisez-les hiérarchiquement (si applicable).

#### 1.2 Lister les Catégories Éco-organisme
Pour eco-maison, référez-vous à la [Fiche Technique eco-maison](01-fiche-eco-maison.md) :
- **DEA** : Assise, Couchage, Rangement, Plan de pose, Décoration textile
- **Jouets** : Éveil, Préscolaires, Plein Air
- **ABJ** : Bricolage, Jardin

### Étape 2 : Analyse Sémantique

Pour chaque catégorie RecyClique, demandez-vous :
1. **Quel est l'usage principal ?** (s'asseoir, dormir, ranger, jouer, jardiner...)
2. **Où est utilisé l'objet ?** (intérieur, extérieur, enfant, adulte...)
3. **Quelle est la matière principale ?** (bois, textile, plastique, métal...)
4. **Quelle est la catégorie éco-organisme la plus proche ?**

### Étape 3 : Décision de Mapping

Utilisez l'arbre de décision ci-dessous pour eco-maison :

```
Objet à mapper
    │
    ├─ Usage = S'asseoir ? ──────────────────► DEA - Assise
    │
    ├─ Usage = Dormir / Repos ? ─────────────► DEA - Couchage
    │
    ├─ Usage = Ranger / Stocker ? ───────────► DEA - Rangement
    │
    ├─ Usage = Poser / Travailler ? ─────────► DEA - Plan de pose
    │
    ├─ Type = Textile d'ameublement ? ───────► DEA - Décoration textile
    │
    ├─ Usage = Jouet (enfant < 14 ans) ? ────► Jouets (sous-catégorie selon âge)
    │
    ├─ Lieu = Extérieur (jardin) ? ──────────► ABJ - Jardin
    │
    └─ Usage = Bricolage / Outil ? ──────────► ABJ - Bricolage
```

### Étape 4 : Configuration Technique

Pour chaque mapping, définissez :

#### a) Catégorie Source (RecyClique)
- ID ou nom de la catégorie

#### b) Catégorie Destination (Éco-organisme)
- Sélectionnez dans la hiérarchie de l'éco-organisme

#### c) Flux
- **ALL** par défaut (recommandé pour simplifier)
- Flux spécifique si logique métier différente

#### d) Ratio de Poids (optionnel)
- **1.0** par défaut (100% du poids)
- < 1.0 si seule une partie du poids doit être comptabilisée

**Exemple d'usage du ratio** :
- Catégorie "Meubles composites" contient 50% de mobilier et 50% de textile
- Créer 2 mappings :
  - Meubles composites → DEA Assise (ratio: 0.5)
  - Meubles composites → DEA Décoration textile (ratio: 0.5)

#### e) Priorité (optionnel)
- **0** par défaut
- Utilisé si plusieurs mappings possibles, le système prendra le plus prioritaire

---

## Guide Catégorie par Catégorie - eco-maison

### 📦 Catégories DEA (Éléments d'Ameublement)

#### DEA - Assise

**Inclure dans ce mapping :**
- ✅ Chaises (tous types)
- ✅ Tabourets
- ✅ Fauteuils (tous types : club, bureau, relax, etc.)
- ✅ Canapés (tous types et tailles)
- ✅ Bancs et banquettes
- ✅ Poufs
- ✅ Sièges de bureau

**Exclure :**
- ❌ Chaises de jardin → ABJ Jardin
- ❌ Sièges auto enfant → Hors périmètre eco-maison

**Mapping RecyClique suggéré :**
```
Chaises              → DEA - Assise
Fauteuils            → DEA - Assise
Canapés              → DEA - Assise
Tabourets            → DEA - Assise
Sièges de bureau     → DEA - Assise
Bancs (intérieur)    → DEA - Assise
```

---

#### DEA - Couchage

**Inclure dans ce mapping :**
- ✅ Lits (tous types et tailles)
- ✅ Lits bébé, berceaux
- ✅ Sommiers
- ✅ Matelas (tous types)
- ✅ Têtes de lit
- ✅ Canapés convertibles

**Exclure :**
- ❌ Literie (oreillers, couettes) → DEA Décoration textile
- ❌ Matelas gonflables camping → ABJ Jardin

**Mapping RecyClique suggéré :**
```
Lits                 → DEA - Couchage
Sommiers             → DEA - Couchage
Matelas              → DEA - Couchage
Lits bébé            → DEA - Couchage
Canapés-lits         → DEA - Couchage (OU Assise si usage principal = s'asseoir)
```

**⚠️ Cas particulier : Canapé-lit**
- **Usage principal = s'asseoir** → DEA Assise
- **Usage principal = dormir** → DEA Couchage
- **Doute** → Privilégier DEA Assise (catégorie d'origine du meuble)

---

#### DEA - Rangement

**Inclure dans ce mapping :**
- ✅ Armoires, penderies
- ✅ Commodes
- ✅ Bibliothèques, étagères
- ✅ Buffets, vaisseliers
- ✅ Meubles TV, meubles HiFi
- ✅ Coffres, malles
- ✅ Meubles de salle de bain

**Exclure :**
- ❌ Boîtes de rangement plastique → ABJ ou hors périmètre

**Mapping RecyClique suggéré :**
```
Armoires             → DEA - Rangement
Commodes             → DEA - Rangement
Bibliothèques        → DEA - Rangement
Étagères             → DEA - Rangement
Buffets              → DEA - Rangement
Meubles TV           → DEA - Rangement
Coffres              → DEA - Rangement
```

---

#### DEA - Plan de Pose

**Inclure dans ce mapping :**
- ✅ Tables (salle à manger, basse, console, etc.)
- ✅ Tables de nuit, chevets
- ✅ Bureaux, secrétaires
- ✅ Dessertes
- ✅ Plans de travail cuisine

**Exclure :**
- ❌ Tables de jardin → ABJ Jardin
- ❌ Tables à repasser → ABJ Bricolage

**Mapping RecyClique suggéré :**
```
Tables (intérieur)   → DEA - Plan de pose
Tables basses        → DEA - Plan de pose
Bureaux              → DEA - Plan de pose
Tables de nuit       → DEA - Plan de pose
Consoles             → DEA - Plan de pose
Dessertes            → DEA - Plan de pose
Plans de travail     → DEA - Plan de pose
```

---

#### DEA - Décoration Textile

**Inclure dans ce mapping :**
- ✅ Rideaux, voilages
- ✅ Coussins
- ✅ Tapis
- ✅ Stores
- ✅ Linge de lit (draps, housses, couettes, oreillers)
- ✅ Cintres
- ✅ Housses de protection

**Exclure :**
- ❌ Vêtements → Textile habillement (autre filière REP)

**Mapping RecyClique suggéré :**
```
Rideaux              → DEA - Décoration textile
Coussins             → DEA - Décoration textile
Tapis                → DEA - Décoration textile
Linge de lit         → DEA - Décoration textile
Stores               → DEA - Décoration textile
```

---

### 🧸 Catégories Jouets

#### Jouets - Éveil et Premier Âge (0-3 ans)

**Inclure dans ce mapping :**
- ✅ Hochets, doudous
- ✅ Jouets de bain
- ✅ Tapis d'éveil
- ✅ Mobiles
- ✅ Jouets à empiler/encastrer

**Mapping RecyClique suggéré :**
```
Jouets 0-3 ans       → Jouets - Éveil
Jouets bébé          → Jouets - Éveil
Doudous              → Jouets - Éveil
Hochets              → Jouets - Éveil
```

---

#### Jouets - Préscolaires et Scolaires (3-12 ans)

**Inclure dans ce mapping :**
- ✅ Poupées, figurines
- ✅ Jeux de construction
- ✅ Jeux de société
- ✅ Puzzles
- ✅ Peluches
- ✅ Déguisements
- ✅ Instruments de musique jouets

**Exclure :**
- ❌ Jeux vidéo / consoles → DEEE (autre filière)

**Mapping RecyClique suggéré :**
```
Jouets enfants       → Jouets - Préscolaires
Poupées              → Jouets - Préscolaires
Peluches             → Jouets - Préscolaires
Jeux de société      → Jouets - Préscolaires
Puzzles              → Jouets - Préscolaires
Jeux de construction → Jouets - Préscolaires
Figurines            → Jouets - Préscolaires
```

---

#### Jouets - Plein Air et Sport

**Inclure dans ce mapping :**
- ✅ Draisiennes, tricycles
- ✅ Vélos enfants (≤ 16 pouces)
- ✅ Trottinettes jouets (non électriques)
- ✅ Ballons, balles
- ✅ Porteurs
- ✅ Jeux de plage

**Exclure :**
- ❌ Vélos adultes / > 16 pouces → Hors périmètre
- ❌ Trottinettes électriques → DEEE

**Mapping RecyClique suggéré :**
```
Vélos enfants        → Jouets - Plein Air
Draisiennes          → Jouets - Plein Air
Tricycles            → Jouets - Plein Air
Trottinettes         → Jouets - Plein Air (vérifier non électrique)
Ballons / Balles     → Jouets - Plein Air
```

---

### 🛠️ Catégories ABJ (Articles Bricolage et Jardin)

#### ABJ - Bricolage

**Inclure dans ce mapping :**
- ✅ Échelles, escabeaux
- ✅ Établis
- ✅ Outils manuels (marteaux, tournevis, scies, etc.)
- ✅ Tables à repasser
- ✅ Matériel de peinture (pinceaux, rouleaux, bacs)

**Exclure :**
- ❌ Outils électriques en état → DEEE
- ❌ Produits chimiques → DDS

**Mapping RecyClique suggéré :**
```
Échelles             → ABJ - Bricolage
Escabeaux            → ABJ - Bricolage
Outils manuels       → ABJ - Bricolage
Tables à repasser    → ABJ - Bricolage
```

---

#### ABJ - Jardin

**Inclure dans ce mapping :**
- ✅ Tables de jardin
- ✅ Chaises de jardin
- ✅ Transats, chilienne
- ✅ Parasols, tonnelles
- ✅ Salons de jardin
- ✅ Hamacs
- ✅ Pots, jardinières
- ✅ Arrosoirs
- ✅ Outils de jardinage (pelles, râteaux, bêches)
- ✅ Tondeuses manuelles
- ✅ Barbecues (sans bonbonne)

**Exclure :**
- ❌ Plantes vivantes → Hors périmètre
- ❌ Terre, terreau → Hors périmètre
- ❌ Bonbonnes de gaz → Autre filière

**Mapping RecyClique suggéré :**
```
Mobilier jardin      → ABJ - Jardin
Tables jardin        → ABJ - Jardin
Chaises jardin       → ABJ - Jardin
Transats             → ABJ - Jardin
Parasols             → ABJ - Jardin
Salons de jardin     → ABJ - Jardin
Outils jardin        → ABJ - Jardin
Pots / Jardinières   → ABJ - Jardin
Barbecues            → ABJ - Jardin
```

---

## Cas Particuliers et Règles de Décision

### Cas 1 : Objet Multi-Usage

**Problème** : Un objet peut avoir plusieurs usages.
**Exemple** : Banc coffre (on s'assoit + rangement)

**Règle** : Privilégier l'**usage principal** ou l'**usage le plus fréquent**.

**Solution pour Banc coffre** :
- Si usage principal = s'asseoir → **DEA Assise**
- Si usage principal = ranger → **DEA Rangement**
- **Recommandation** : DEA Assise (usage évident)

---

### Cas 2 : Objet Composite (Plusieurs Matières)

**Problème** : Un meuble en bois avec assise textile.
**Exemple** : Fauteuil bois + coussin textile

**Règle** : Mapper vers la catégorie du **composant principal** (en poids).

**Solution** :
- Structure bois > 70% du poids → **DEA Assise** (ratio: 1.0)
- (Pas besoin de découper, sauf cas très particuliers)

---

### Cas 3 : Intérieur vs. Extérieur

**Problème** : Différence entre chaise d'intérieur et chaise de jardin.

**Règle** :
- **Intérieur** → DEA Assise
- **Extérieur (jardin, terrasse)** → ABJ Jardin

**Identification** :
- Matériaux (résine, plastique traité UV) → Extérieur
- Design (pliante, empilable camping) → Extérieur
- Contexte d'acquisition (rayon jardin) → Extérieur

**Solution** :
```
Chaises (intérieur)  → DEA - Assise
Chaises de jardin    → ABJ - Jardin
```

---

### Cas 4 : Taille et Âge (Jouets)

**Problème** : Jouet destiné à plusieurs tranches d'âge.
**Exemple** : Jeu de société 6-12 ans

**Règle** : Utiliser la **tranche d'âge moyenne** ou **principale**.

**Solution** :
- 0-3 ans → Jouets Éveil
- 3-12 ans → Jouets Préscolaires
- > 12 ans → Hors périmètre jouets (sauf exception)

---

### Cas 5 : Objet Électrique/Électronique

**Problème** : Certains objets ont composants électriques.
**Exemple** : Fauteuil de massage électrique, jouet électronique

**Règle** :
- **Composant électrique accessoire** (ex: LED déco) → Mapper normalement, retirer composant électrique avant recyclage
- **Composant électrique principal** (ex: console jeux vidéo) → **DEEE** (filière séparée)

**Solution Fauteuil de massage** :
- Si structure meuble > composant électrique → **DEA Assise** (noter "retirer moteur")
- Si moteur = principal → **DEEE**

**Solution Jouet électronique** :
- Jouet éducatif avec sons/lumières → **Jouets** (catégorie selon âge)
- Console, tablette → **DEEE**

---

### Cas 6 : Objet Hors Périmètre

**Problème** : Objet ne rentre dans aucune catégorie eco-maison.
**Exemples** : Vélo adulte, vêtements, électroménager

**Règle** : **Ne pas créer de mapping**, l'objet ne sera pas comptabilisé pour eco-maison.

**Solution** :
- Identifier la filière REP correspondante (textile, DEEE, etc.)
- Créer mapping vers autre éco-organisme si partenariat existe
- Sinon : Pas de déclaration pour cet objet (normal)

---

### Cas 7 : Catégorie RecyClique Générique

**Problème** : Catégorie trop large (ex: "Mobilier").

**Règle** : **Éviter les mappings génériques**, privilégier des catégories spécifiques.

**Solution** :
1. **Diviser la catégorie RecyClique** :
   - Mobilier → Chaises, Tables, Lits, Armoires, etc.
2. **Mapper chaque sous-catégorie** précisément

Si division impossible :
- Créer **plusieurs mappings** avec ratios estimés :
  ```
  Mobilier → DEA Assise (ratio: 0.30, priorité: 1)
  Mobilier → DEA Couchage (ratio: 0.20, priorité: 2)
  Mobilier → DEA Rangement (ratio: 0.30, priorité: 3)
  Mobilier → DEA Plan pose (ratio: 0.20, priorité: 4)
  ```
  (⚠️ Déconseillé, peu précis)

---

## Matrice de Mapping Recommandée

### Tableau Récapitulatif eco-maison

| Catégorie RecyClique | Catégorie eco-maison | Flux | Ratio | Priorité | Notes |
|----------------------|----------------------|------|-------|----------|-------|
| Chaises              | DEA - Assise         | ALL  | 1.0   | 0        | - |
| Fauteuils            | DEA - Assise         | ALL  | 1.0   | 0        | - |
| Canapés              | DEA - Assise         | ALL  | 1.0   | 0        | - |
| Canapés-lits         | DEA - Couchage       | ALL  | 1.0   | 0        | Ou Assise si usage principal |
| Tables (intérieur)   | DEA - Plan de pose   | ALL  | 1.0   | 0        | - |
| Tables de jardin     | ABJ - Jardin         | ALL  | 1.0   | 0        | - |
| Lits                 | DEA - Couchage       | ALL  | 1.0   | 0        | - |
| Sommiers             | DEA - Couchage       | ALL  | 1.0   | 0        | - |
| Matelas              | DEA - Couchage       | ALL  | 1.0   | 0        | - |
| Armoires             | DEA - Rangement      | ALL  | 1.0   | 0        | - |
| Bibliothèques        | DEA - Rangement      | ALL  | 1.0   | 0        | - |
| Commodes             | DEA - Rangement      | ALL  | 1.0   | 0        | - |
| Rideaux              | DEA - Décoration textile | ALL | 1.0 | 0        | - |
| Tapis                | DEA - Décoration textile | ALL | 1.0 | 0        | - |
| Coussins             | DEA - Décoration textile | ALL | 1.0 | 0        | - |
| Linge de lit         | DEA - Décoration textile | ALL | 1.0 | 0        | - |
| Jouets 0-3 ans       | Jouets - Éveil       | ALL  | 1.0   | 0        | - |
| Peluches             | Jouets - Préscolaires | ALL | 1.0   | 0        | - |
| Jeux de société      | Jouets - Préscolaires | ALL | 1.0   | 0        | - |
| Poupées              | Jouets - Préscolaires | ALL | 1.0   | 0        | - |
| Vélos enfants        | Jouets - Plein Air   | ALL  | 1.0   | 0        | ≤ 16 pouces |
| Draisiennes          | Jouets - Plein Air   | ALL  | 1.0   | 0        | - |
| Ballons              | Jouets - Plein Air   | ALL  | 1.0   | 0        | - |
| Chaises de jardin    | ABJ - Jardin         | ALL  | 1.0   | 0        | - |
| Transats             | ABJ - Jardin         | ALL  | 1.0   | 0        | - |
| Parasols             | ABJ - Jardin         | ALL  | 1.0   | 0        | - |
| Salons de jardin     | ABJ - Jardin         | ALL  | 1.0   | 0        | - |
| Outils jardin        | ABJ - Jardin         | ALL  | 1.0   | 0        | Manuels |
| Pots / Jardinières   | ABJ - Jardin         | ALL  | 1.0   | 0        | - |
| Échelles             | ABJ - Bricolage      | ALL  | 1.0   | 0        | - |
| Outils bricolage     | ABJ - Bricolage      | ALL  | 1.0   | 0        | Manuels |
| Tables à repasser    | ABJ - Bricolage      | ALL  | 1.0   | 0        | - |

---

## Workflow de Création des Mappings

### Étape 1 : Préparation

1. **Télécharger** le [Template Excel](../templates/mapping-template.xlsx) (à créer)
2. **Lister** toutes vos catégories RecyClique actuelles
3. **Lire** la [Fiche Technique eco-maison](01-fiche-eco-maison.md)
4. **Identifier** les correspondances évidentes

### Étape 2 : Mapping Initial

1. **Remplir** le template Excel avec les mappings évidents
2. **Valider** avec l'équipe opérationnelle (personnes terrain)
3. **Marquer** les cas douteux pour révision

### Étape 3 : Validation

1. **Tester** les mappings avec des données réelles (1-2 semaines)
2. **Vérifier** les calculs automatiques de poids
3. **Comparer** avec pesées manuelles
4. **Ajuster** si écarts > 10%

### Étape 4 : Import

1. **Exporter** le fichier Excel finalisé
2. **Importer** dans RecyClique via interface admin
3. **Activer** les mappings
4. **Lancer** un premier calcul de test

### Étape 5 : Maintenance

1. **Réviser** les mappings trimestriellement
2. **Ajouter** nouveaux mappings si nouvelles catégories
3. **Désactiver** mappings obsolètes
4. **Documenter** les changements

---

## Bonnes Pratiques

### ✅ À Faire

1. **Privilégier la simplicité** : Flux "ALL" par défaut
2. **Mapper par usage principal**, pas par matière
3. **Tester avec données réelles** avant déploiement complet
4. **Documenter les cas particuliers** (notes sur chaque mapping)
5. **Impliquer les équipes terrain** (meilleure connaissance des objets)
6. **Réviser régulièrement** (au moins 1x/an)
7. **Utiliser ratio 1.0** sauf cas exceptionnels

### ❌ À Éviter

1. **Créer trop de mappings** (simplicité > exhaustivité)
2. **Mapper des catégories trop larges** (ex: "Divers")
3. **Utiliser ratios complexes** sans justification claire
4. **Ignorer les exclusions** des éco-organismes (risque de rejet déclaration)
5. **Mapper des objets hors périmètre** (ex: électroménager → eco-maison)
6. **Oublier de tester** avant mise en production
7. **Changer mappings** pendant une période de déclaration en cours

---

## Résolution de Problèmes (Troubleshooting)

### Problème 1 : Poids Calculés Incohérents

**Symptômes** : Totaux auto-calculés très différents des pesées réelles

**Causes possibles** :
- Mappings incorrects (objets mappés vers mauvaises catégories)
- Ratios mal configurés
- Catégories RecyClique trop larges

**Solutions** :
1. Comparer catégorie par catégorie : calculé vs. réel
2. Identifier les catégories avec gros écarts
3. Vérifier les mappings de ces catégories
4. Ajuster ou diviser les catégories source
5. Relancer le calcul

### Problème 2 : Catégories eco-maison Vides

**Symptômes** : Certaines catégories eco-maison ont 0 kg alors qu'on sait qu'on a des objets

**Causes possibles** :
- Pas de mapping créé pour cette catégorie
- Mapping désactivé
- Catégorie RecyClique source mal nommée

**Solutions** :
1. Vérifier existence mapping actif vers cette catégorie eco-maison
2. Vérifier les catégories RecyClique sources (nomenclature)
3. Créer mapping manquant
4. Relancer calcul

### Problème 3 : Doublons de Poids

**Symptômes** : Totaux sur-estimés (ex: 2x le poids réel)

**Causes possibles** :
- Plusieurs mappings actifs pour même objet vers même catégorie eco-maison
- Flux dupliqués (ex: mapping avec ALL + mapping avec RECEIVED)

**Solutions** :
1. Lister tous les mappings actifs
2. Chercher doublons (même source + destination)
3. Désactiver ou supprimer les doublons
4. Relancer calcul

### Problème 4 : Objets Non Comptabilisés

**Symptômes** : Certains objets n'apparaissent dans aucune catégorie

**Causes possibles** :
- Objets hors périmètre eco-maison (normal)
- Catégorie RecyClique non mappée
- Objets avec statut exclu du calcul

**Solutions** :
1. Vérifier statut des objets (ex: "pending" exclus ?)
2. Vérifier catégorie RecyClique de ces objets
3. Créer mapping si pertinent
4. Sinon, accepter que certains objets ne soient pas déclarables (ex: DEEE)

---

## Checkliste de Validation

Avant de finaliser vos mappings, vérifiez :

- [ ] Toutes les catégories RecyClique actives ont été examinées
- [ ] Les mappings évidents ont été créés
- [ ] Les cas douteux ont été documentés et décidés
- [ ] Les exclusions eco-maison ont été respectées
- [ ] Les flux sont correctement configurés (ALL ou spécifiques)
- [ ] Les ratios sont justifiés (1.0 par défaut)
- [ ] Aucun doublon de mapping (même source + destination + flux)
- [ ] Test de calcul effectué sur période réelle
- [ ] Écarts calculé vs. réel < 10% par catégorie
- [ ] Documentation complétée (notes sur mappings complexes)
- [ ] Équipe formée sur maintenance des mappings
- [ ] Plan de révision trimestrielle défini

---

## Annexes

### Annexe A : Arbre de Décision Visuel

```
                            OBJET À MAPPER
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
            MOBILIER / AMEUBLEMENT           AUTRE
                    │                            │
         ┌──────────┴──────────┐          ┌─────┴──────┐
         │                     │          │            │
      INTÉRIEUR             EXTÉRIEUR   JOUET       OUTIL
         │                     │          │            │
    ┌────┴────┐           ABJ-JARDIN      │      ┌─────┴─────┐
    │         │                      ┌────┴────┐ │           │
  ASSISE   RANGEMENT             0-3ans  3-12ans  JARDIN  BRICOLAGE
    │         │                     │       │       │         │
DEA-ASSISE DEA-RANGEMENT    JOUETS-ÉVEIL  JOUETS  ABJ      ABJ
                                           -PRESCO -JARDIN  -BRICO
  [Continuer subdivision...]
```

### Annexe B : Glossaire

- **Mapping** : Correspondance entre catégorie RecyClique et catégorie éco-organisme
- **Flux** : Type de mouvement (RECEIVED, REUSED, RECYCLED)
- **Ratio** : Coefficient multiplicateur de poids (0.1 à 1.0)
- **Priorité** : Ordre de préférence en cas de mappings multiples
- **Gisement** : Objets reçus/collectés (= RECEIVED)
- **Réemploi** : Objets vendus/donnés pour réutilisation (= REUSED)
- **Recyclage** : Objets détruits/valorisés (= RECYCLED)
- **DEA** : Déchets d'Éléments d'Ameublement
- **ABJ** : Articles de Bricolage et Jardin
- **REP** : Responsabilité Élargie du Producteur

### Annexe C : Contacts et Support

**Questions sur le mapping ?**
- 📧 Email : support-eco-organismes@recyclic.fr
- 📞 Téléphone : 01 XX XX XX XX
- 💬 Chat : Interface admin RecyClique

**Ressources complémentaires** :
- [Fiche Technique eco-maison](01-fiche-eco-maison.md)
- [Modèle de Données](02-modele-donnees.md)
- [Spécifications Fonctionnelles](03-specifications-fonctionnelles.md)

---

**Document créé le** : 2025-11-20
**Version** : 1.0
**Statut** : ÉTUDES - Guide pratique de mapping
**Prochaine révision** : Après premiers mappings en production
