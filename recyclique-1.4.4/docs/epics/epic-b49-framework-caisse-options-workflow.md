# EPIC-B49: Framework Caisse avec Options de Workflow

**Statut:** Draft  
**Module:** Backend API + Frontend Admin + Frontend Opérationnel (Caisse)  
**Priorité:** Haute (évolution majeure du workflow caisse)  
**Version:** 1.4.0

---

## 1. Contexte

Suite à la réunion RecycClique du 5 décembre 2025, un besoin majeur a été identifié : transformer la caisse en un **framework configurable** permettant d'activer différentes options de workflow selon les besoins de chaque poste de caisse.

**Problématique actuelle :**
- Le workflow de caisse est figé : Catégorie → Sous-catégorie → Poids → Quantité → Prix → Validation
- Impossible d'adapter le workflow selon le contexte (ex: affluence, type de vente)
- Les caisses virtuelles et différées ne sont pas liées aux caisses réelles (pas d'héritage des options)
- Pas de flexibilité pour gérer des cas particuliers (ex: articles sans prix, total négocié globalement)

**Vision :**
Chaque poste de caisse devient un **framework configurable** avec des options activables/désactivables qui modifient le workflow de manière rétrocompatible. Les caisses virtuelles et différées héritent automatiquement des options de leur caisse source.

---

## 2. Objectif de l'Epic

Créer un système d'options de workflow pour les postes de caisse, permettant :
1. **Configuration par caisse** : Chaque caisse peut avoir ses propres options activées
2. **Rétrocompatibilité** : Les caisses sans options activées fonctionnent exactement comme aujourd'hui
3. **Héritage virtuel/différé** : Les caisses virtuelles et différées héritent des options de leur caisse source
4. **Extensibilité** : Architecture prête pour ajouter d'autres options futures

**Valeur ajoutée :**
- Flexibilité opérationnelle : adaptation du workflow selon les besoins
- Fluidité en période d'affluence : mode "prix global" pour accélérer les transactions
- Cohérence : caisses virtuelles/différées alignées avec les caisses réelles
- Évolutivité : framework prêt pour futures options (ex: saisie vocale, workflows personnalisés)

---

## 3. Portée

### Inclus dans cet epic

#### Story B49-P1 : Infrastructure Options de Workflow
- Migration DB : Ajout colonne `workflow_options JSONB` sur table `cash_registers`
- Migration DB : Ajout colonnes `enable_virtual` et `enable_deferred` (Boolean) sur table `cash_registers`
- Backend : Schémas Pydantic pour `workflow_options` (structure typée)
- Backend : API expose options dans `CashRegisterResponse` et `CashRegisterUpdate`
- Backend : `CashSessionResponse` inclut `register_options` pour propagation au frontend
- **Estimation** : 3-4h

#### Story B49-P2 : Mode Prix Global (Option "Item sans prix")
- Backend : Structure JSON pour option `no_item_pricing` dans `workflow_options`
- Frontend Admin : Checkbox "Mode prix global (total saisi manuellement, article sans prix)" dans `CashRegisterForm`
- Frontend Caisse : Masquage étape "Quantité" quand option active
- Frontend Caisse : Écran prix en lecture seule (0€ grisé) avec possibilité saisie manuelle
- Frontend Caisse : Items à 0€ n'affichent pas "0€" dans le ticket
- Frontend Caisse : Affichage "Sous-total" (calculé sur items >0) dans ticket
- Frontend Caisse : Champ "Total à payer" (saisie manuelle) dans popup finalisation
- Frontend Caisse : Raccourci clavier Enter sur onglet Catégorie = Finaliser la vente
- Frontend Caisse : Badge inversé (fond blanc, texte vert) sur bouton "Finaliser la vente" quand onglet Catégorie actif
- Frontend Caisse : Raccourci clavier Escape dans popup finalisation = Annuler
- Backend : Acceptation `total_amount` ≠ Σ `total_price` dans API ventes
- **Estimation** : 8-10h
- **Dépendance** : B49-P1

#### Story B49-P3 : Refonte Caisses Virtuelles et Différées
- Frontend Admin : Checkboxes "Activer caisse virtuelle" et "Activer caisse différée" dans `CashRegisterForm`
- Frontend Dashboard : Filtrage cartes Virtual/Différée selon flags `enable_virtual`/`enable_deferred`
- Frontend Dashboard : Carte Virtual/Différée disparaît si aucune caisse n'a l'option activée
- Frontend Store : `CashStoreProvider` propage `register_options` aux stores virtuel/différé
- Frontend Store : Stores virtuel/différé héritent des options de la caisse source
- Frontend Caisse : Workflow virtuel/différé applique les mêmes options que la caisse réelle
- **Estimation** : 5-6h
- **Dépendance** : B49-P1

#### Story B49-P4 : Tests et Documentation
- Tests unitaires : Workflow standard vs mode prix global
- Tests d'intégration : API options, héritage virtuel/différé
- Tests E2E : Scénarios complets avec options activées/désactivées
- Documentation : Guide utilisateur pour configuration des options
- Documentation : Guide développeur pour ajouter de nouvelles options
- **Estimation** : 4-5h
- **Dépendance** : B49-P2, B49-P3

### Exclus (hors scope v1.4.0)

- Autres options de workflow (saisie vocale, workflows personnalisés) → Futures versions
- Migration automatique des caisses existantes → Option manuelle via Admin
- Reporting spécifique pour mode prix global → Utilise structure existante

---

## 4. Critères d'acceptation de l'Epic

1. **Options configurables** : Chaque caisse peut activer/désactiver "Mode prix global", "Caisse virtuelle", "Caisse différée"
2. **Rétrocompatibilité** : Les caisses sans options activées fonctionnent exactement comme avant
3. **Mode prix global fonctionnel** :
   - Étape Quantité masquée (quantité = 1 par défaut, items multiples/poids multiples conservés)
   - Écran prix : 
     - Affichage "0€" grisé par défaut (lecture seule)
     - Dès saisie d'un chiffre : champ devient actif et n'est plus grisé
     - Si effacement complet (touche C) : retour à 0€ grisé
     - **Validation possible même à 0€** (pas de blocage, contrairement au workflow standard)
   - Comportement prix : Si 0€ → item ajouté sans mention de prix ; Si prix saisi → item ajouté avec prix
   - Presets (Don, Don -18, Recyclage, Déchèterie) restent utilisables
   - Items à 0€ n'affichent **aucune mention de prix** dans le ticket (pas de "0€")
   - Affichage "Sous-total" uniquement si au moins un item a un prix >0 (masqué si tous items à 0€)
   - Champ "Total à payer" (saisie manuelle obligatoire, champ vide par défaut) dans finalisation
   - Raccourcis clavier Enter (Catégorie = Finaliser) et Escape (Finalisation = Annuler) fonctionnels
   - Badge inversé (fond blanc, texte vert) sur bouton "Finaliser la vente" quand onglet Catégorie actif
4. **Héritage virtuel/différé** : Les caisses virtuelles et différées héritent des options de leur caisse source
5. **Filtrage dashboard** : Cartes Virtual/Différée apparaissent uniquement si au moins une caisse a l'option activée
6. **Aucune régression** : Toutes les fonctionnalités existantes restent intactes
7. **Tests complets** : Tests unitaires, intégration et E2E pour tous les scénarios
8. **Documentation** : Guides utilisateur et développeur disponibles

---

## 5. Structure des Données

### Modifications Schema DB

**Table `cash_registers` :**
```sql
-- Options de workflow (structure JSON extensible)
workflow_options JSONB NOT NULL DEFAULT '{}'

-- Activation modes virtuels/différés
enable_virtual BOOLEAN NOT NULL DEFAULT false
enable_deferred BOOLEAN NOT NULL DEFAULT false
```

**Structure `workflow_options` (JSON) :**
```json
{
  "features": {
    "no_item_pricing": {
      "enabled": true,
      "label": "Mode prix global (total saisi manuellement, article sans prix)"
    }
  }
}
```

**Exemple de données :**
```json
{
  "workflow_options": {
    "features": {
      "no_item_pricing": {
        "enabled": true
      }
    }
  },
  "enable_virtual": true,
  "enable_deferred": false
}
```

### Modifications API

**`CashRegisterResponse` :**
- Ajout champ `workflow_options: dict`
- Ajout champs `enable_virtual: bool`, `enable_deferred: bool`

**`CashSessionResponse` :**
- Ajout champ `register_options: dict` (options de la caisse associée)

**`SaleCreate` :**
- Accepte `total_amount` ≠ Σ `total_price` (validation métier côté frontend)
- **Important** : Le champ `total_amount` reste le montant global du ticket (comme avant)
- En mode prix global, `total_amount` = valeur saisie manuellement dans "Total à payer"
- Aucun changement de structure DB nécessaire : `Sale.total_amount` continue de stocker le montant global
- Les items à 0€ ont `unit_price=0` et `total_price=0` mais n'affectent pas le `total_amount` de la vente

---

## 6. Stories (Ordre d'exécution)

### Story B49-P1 : Infrastructure Options de Workflow

**Objectif** : Créer l'infrastructure backend et frontend pour gérer les options de workflow par caisse

**Tâches :**
1. Migration Alembic : Ajouter colonnes `workflow_options`, `enable_virtual`, `enable_deferred`
2. Backend : Schémas Pydantic pour validation `workflow_options`
3. Backend : Mise à jour `CashRegisterService` pour gérer options
4. Backend : Mise à jour `CashSessionService` pour inclure `register_options` dans réponse
5. Frontend : Types TypeScript pour `workflow_options`
6. Frontend : Service API mis à jour pour exposer options
7. Backend : Mise à jour documentation OpenAPI/Swagger pour nouveaux champs (`workflow_options`, `enable_virtual`, `enable_deferred`, `register_options`)

**Estimation** : 3-4h  
**Prérequis** : Aucun

---

### Story B49-P2 : Mode Prix Global (Option "Item sans prix")

**Objectif** : Implémenter le workflow "Mode prix global" avec toutes ses spécificités

**Tâches Backend :**
1. Structure JSON pour option `no_item_pricing`
2. Validation API : Accepter `total_amount` ≠ Σ `total_price` dans `SaleCreate`
3. Tests API : Vérifier enregistrement ventes avec total override

**Tâches Frontend Admin :**
1. `CashRegisterForm` : Section "Options de workflow"
2. Checkbox "Mode prix global (total saisi manuellement, article sans prix)"
3. Affichage options dans liste `Admin/CashRegisters` (badges/colonnes)

**Tâches Frontend Caisse :**
1. `SaleWizard` : Masquer étape "Quantité" quand `no_item_pricing` actif (quantité = 1 par défaut)
2. `SaleWizard` : Écran prix avec comportement dynamique :
   - Par défaut : "0€" grisé (lecture seule)
   - Dès saisie d'un chiffre : champ devient actif et n'est plus grisé
   - Si effacement complet (touche C) : retour à 0€ grisé
   - Validation possible même à 0€ (pas de blocage)
3. `SaleWizard` : Modifier validation prix pour accepter 0€ en mode prix global (contrairement au workflow standard)
4. `SaleWizard` : Bouton "Valider" (au lieu de "Valider le prix")
5. `SaleWizard` : Gestion items à 0€ (pas d'affichage "0€" dans ticket)
6. `SaleWizard` : Presets (Don, Don -18, Recyclage, Déchèterie) restent utilisables et fonctionnent comme avant
7. `SaleWizard` : Items multiples et poids multiples conservés (comportement inchangé)
8. `Ticket` : Masquer montants unitaires quand 0€ (aucune mention de prix)
9. `Ticket` : Afficher "Sous-total" uniquement si au moins un item a un prix >0
10. `FinalizationScreen` : Champ "Total à payer" (saisie manuelle obligatoire, focus auto, champ vide par défaut)
11. `FinalizationScreen` : Champ "Sous-total" en lecture seule (si items >0, sinon masqué)
12. `FinalizationScreen` : Raccourci Escape = Annuler (ferme popup, retourne au wizard)
13. `Sale.tsx` : Raccourci Enter sur onglet Catégorie = Finaliser la vente (ouvre popup finalisation)
14. `Sale.tsx` : Badge inversé (fond blanc, texte vert "Entrée") sur bouton "Finaliser la vente" uniquement quand onglet Catégorie actif
15. `cashSessionStore` : Support `overrideTotalAmount` dans `submitSale` (remplace calcul automatique)

**Estimation** : 8-10h  
**Prérequis** : B49-P1 terminée

---

### Story B49-P3 : Refonte Caisses Virtuelles et Différées

**Objectif** : Lier les caisses virtuelles et différées aux caisses réelles avec héritage des options

**Tâches Frontend Admin :**
1. `CashRegisterForm` : Checkboxes "Activer caisse virtuelle" et "Activer caisse différée"
2. `Admin/CashRegisters` : Affichage badges pour options activées

**Tâches Frontend Dashboard :**
1. `CashRegisterDashboard` : Filtrer cartes Virtual/Différée selon flags `enable_virtual`/`enable_deferred` de chaque caisse
2. `CashRegisterDashboard` : Afficher carte Virtual uniquement si au moins une caisse a `enable_virtual=true`
3. `CashRegisterDashboard` : Afficher carte Différée uniquement si au moins une caisse a `enable_deferred=true`
4. `CashRegisterDashboard` : Si toutes les caisses ont `enable_virtual=false`, la carte Virtual disparaît complètement
5. `CashRegisterDashboard` : Si toutes les caisses ont `enable_deferred=false`, la carte Différée disparaît complètement
6. `CashRegisterDashboard` : Afficher caisse source pour modes virtuel/différé (pour traçabilité)

**Tâches Frontend Store :**
1. `CashStoreProvider` : Propager `register_options` aux stores virtuel/différé
2. `cashSessionStore` : Stocker `currentRegisterOptions` pour session courante
3. `virtualCashSessionStore` : Hériter options de caisse source
4. `deferredCashSessionStore` : Hériter options de caisse source

**Tâches Frontend Caisse :**
1. `Sale.tsx` : Appliquer options héritées en mode virtuel/différé
2. `SaleWizard` : Utiliser options depuis store (réel/virtuel/différé)

**Estimation** : 5-6h  
**Prérequis** : B49-P1 terminée

**Note sur séquençage :** B49-P2 et B49-P3 peuvent être développées en parallèle après B49-P1, car elles n'ont pas de dépendances entre elles.

---

### Story B49-P4 : Tests et Documentation

**Objectif** : Assurer la qualité et la maintenabilité du code

**Tâches Tests :**
1. Tests unitaires : `cashSessionStore.submitSale` avec `overrideTotalAmount`
2. Tests unitaires : `SaleWizard` workflow standard vs mode prix global
3. Tests unitaires : `FinalizationScreen` avec champ total manuel
4. Tests d'intégration : API options, création/update caisse avec options
5. Tests d'intégration : Héritage options virtuel/différé
6. Tests E2E : Scénario complet mode prix global (ajout items, finalisation)
7. Tests E2E : Scénario caisse virtuelle avec options héritées
8. Tests régression : Vérifier workflow standard inchangé

**Tâches Documentation :**
1. Guide utilisateur : Configuration options de workflow
2. Guide utilisateur : Utilisation mode prix global
3. Guide développeur : Architecture options de workflow
4. Guide développeur : Ajouter une nouvelle option de workflow
5. Changelog : Détail des nouvelles fonctionnalités

**Estimation** : 4-5h  
**Prérequis** : B49-P2, B49-P3 terminées

---

## 7. Spécifications Détaillées

### 7.1. Mode Prix Global - Comportement Workflow

**Étape Catégorie :**
- Comportement inchangé
- Raccourci Enter = Finaliser la vente (nouveau)
- Badge inversé sur bouton "Finaliser la vente" (nouveau)

**Étape Sous-catégorie :**
- Comportement inchangé

**Étape Poids :**
- Comportement inchangé : Saisie poids multiples possible (comme avant)
- Après validation poids → passe directement à Prix (Quantité masquée, quantité = 1 par défaut)
- **Note** : Les items multiples et poids multiples restent possibles (comportement conservé, seule l'étape Quantité est masquée)

**Étape Prix :**
- Affichage par défaut : "0 €" en lecture seule (grisé, non éditable)
- **Comportement dynamique du champ :**
  - Dès qu'un chiffre est saisi (ex: "4" pour 4€, "2.3" pour 2,3€), le champ devient actif et n'est plus grisé
  - Si l'opérateur efface tout (touche C du numpad) et revient à 0, le champ redevient grisé (état initial)
  - Le champ reste éditable tant qu'une valeur est saisie
- **Validation :**
  - **Important** : Même à 0€ (grisé), l'appui sur Enter permet d'ajouter l'item au ticket (pas de blocage de validation)
  - Si aucun prix saisi (reste à 0€ grisé) → Appuyer sur Enter ajoute l'item au ticket sans mention de prix (pas de "0€" affiché)
  - Si prix saisi manuellement (ex: 3, 4, 2.3) → Appuyer sur Enter ajoute l'item au ticket avec ce prix affiché
- Bouton : "Valider" (au lieu de "Valider le prix")
- Raccourci Enter : Ajoute l'item au ticket (avec ou sans prix selon saisie, même à 0€)
- Presets (Don, Don -18, Recyclage, Déchèterie) : Restent utilisables, ajoutent l'item à 0€ sans mention de prix

**Ticket :**
- Items à 0€ : Affichent uniquement catégorie, poids, destination (si preset), notes (si preset) - **AUCUNE mention de prix ou "0€"**
- Items avec prix >0 : Affichent catégorie, poids, prix unitaire, total ligne
- Sous-total : 
  - Affiché uniquement si au moins un item a un prix >0
  - **Si tous les items sont à 0€, la ligne "Sous-total" ne s'affiche pas du tout**
  - Calcul : Somme des `total_price` des items ayant un prix >0
- Total à payer : Non affiché dans ticket (affiché uniquement dans popup finalisation comme champ de saisie)

**Finalisation :**
- Champ "Total à payer" : 
  - Input numérique obligatoire (focus auto au chargement de la popup)
  - Champ vide par défaut (pas de pré-remplissage)
  - Validation :
    - Chiffres négatifs interdits
    - Peut être 0€ si tous les items sont en don/recyclage/déchèterie (pas de sous-total)
    - Si un sous-total existe (items avec prix >0), le total doit être au minimum égal au sous-total
    - Aucun message d'erreur affiché sauf si le total est inférieur au sous-total (dans ce cas, afficher une validation)
  - C'est cette valeur saisie qui sera enregistrée dans `Sale.total_amount` (pas le calcul automatique)
- Champ "Sous-total" : 
  - Affiché en lecture seule uniquement si au moins un item a un prix >0
  - Si tous items à 0€, ce champ n'apparaît pas
  - Calcul : Somme des `total_price` des items ayant un prix >0
- Champ "Don" : Fonctionne comme avant (peut être ajouté au total à payer)
- Champ "Moyen de paiement" : Fonctionne comme avant
- Raccourci Escape : Annule (ferme popup) et retourne au wizard pour continuer à ajouter des items

### 7.2. Héritage Options Virtuel/Différé

**Principe :**
- Les caisses virtuelles et différées sont **complètement raccordées** avec leur caisse source
- Toutes les options de workflow de la caisse réelle sont héritées automatiquement
- Si caisse réelle a "Mode prix global" activé → caisse virtuelle/différée applique le même workflow
- Si caisse réelle a "Mode prix global" désactivé → caisse virtuelle/différée applique le workflow standard
- **Objectif** : Cohérence totale entre caisse réelle et modes virtuel/différé (même workflow, mêmes options)

**Implémentation :**
- Au moment de l'ouverture d'une session virtuelle/différée, identifier la caisse source
- Charger les `workflow_options` de la caisse source depuis la base de données
- Stocker `register_options` dans le store virtuel/différé (même structure que caisse réelle)
- Appliquer les mêmes règles de workflow que la caisse réelle (masquage Quantité, prix global, etc.)
- Les presets, raccourcis clavier, et comportements sont identiques à la caisse source

### 7.3. Raccourcis Clavier

**Onglet Catégorie :**
- Enter : Finaliser la vente (ouvre popup finalisation)
- Badge inversé : 
  - Affiché uniquement quand l'onglet Catégorie est actif
  - Position : Sur le bouton "Finaliser la vente" (dans le composant Ticket)
  - Style : Fond blanc, texte vert "Entrée" (inversion des couleurs par rapport aux badges normaux qui sont fond vert, texte blanc)
  - Visibilité : Badge visible uniquement sur l'onglet Catégorie (pas sur les autres onglets)

**Popup Finalisation :**
- Escape : Annuler (ferme popup, retourne au wizard)

**Autres raccourcis :**
- Inchangés (Tab, AZERTY catégories, etc.)

---

## 8. Risques

1. **Migration DB** : Risque de perte de données si migration mal exécutée
   - *Mitigation* : Migration effectuée à la fermeture de la boutique, toutes les caisses fermées. Les scripts de déploiement (staging/prod) incluent déjà les procédures de sauvegarde. Tests sur environnement de dev avant déploiement.

2. **Rétrocompatibilité** : Risque de casser le workflow existant
   - *Mitigation* : Options désactivées par défaut, tests de régression complets

3. **Complexité workflow** : Risque de confusion avec deux modes différents
   - *Mitigation* : Interface claire, badges visuels, documentation utilisateur

4. **Performance** : Risque de ralentissement avec propagation options
   - *Mitigation* : Options chargées une seule fois à l'ouverture de session, cache si nécessaire

**Rollback Plan :**
- **Option privilégiée** : Désactivation via flag/Admin (fallback immédiat)
  - Les options peuvent être désactivées via l'interface Admin sans rollback de migration
  - Les colonnes DB restent en place, seule la fonctionnalité est désactivée dans le code
  - Aucun impact sur les ventes existantes créées en mode prix global
- **Option alternative** : Migrations réversibles (Alembic down) si nécessaire
  - Utilisée uniquement en cas de problème critique nécessitant la suppression complète des colonnes

---

## 9. Dépendances

**Dépendances internes :**
- Aucune (EPIC autonome)

**Dépendances externes :**
- Aucune

**Blocage potentiel :**
- ~~Validation métier sur "Total à payer" : Doit-on limiter à un montant max ?~~ → **Résolu** : Pas de limite max, validation minimum = sous-total si sous-total existe, peut être 0€ si tout en don/recyclage
- Comportement don en mode prix global : Le don s'ajoute-t-il au "Total à payer" saisi ou est-il inclus dans le total négocié ? → **Clarification** : Le don fonctionne comme avant (champ séparé, peut être ajouté au total)

---

## 10. Métriques de Succès

1. **Adoption** : Au moins 1 caisse configurée avec "Mode prix global" après 1 mois
2. **Performance** : Temps de transaction réduit de 30% en mode prix global (mesure manuelle)
3. **Qualité** : 0 régression sur workflow standard (tests automatisés)
4. **Satisfaction** : Retour positif équipe caisse sur fluidité en période d'affluence

**Note :** Les métriques de monitoring d'usage (nombre de transactions en mode prix global, temps moyen, etc.) peuvent être ajoutées post-MVP si nécessaire. Pas de priorité pour la v1.4.0.

---

## 11. Notes Techniques

### Architecture Options

**Principe de design :**
- Options stockées en JSONB pour flexibilité
- Structure typée côté backend (Pydantic) et frontend (TypeScript)
- Validation stricte pour éviter options invalides
- Extensible : nouvelles options ajoutables sans migration DB

**Exemple d'extension future :**
```json
{
  "features": {
    "no_item_pricing": { "enabled": true },
    "voice_input": { "enabled": false },
    "custom_workflow": { "enabled": false, "steps": ["category", "weight", "price"] }
  }
}
```

### Propagation Options

**Flux de données :**
1. Admin configure options dans `CashRegisterForm`
2. Options sauvegardées dans `cash_registers.workflow_options`
3. À l'ouverture de session, options chargées depuis `register`
4. Options propagées dans `CashSessionResponse.register_options`
5. Frontend stocke options dans `cashSessionStore.currentRegisterOptions`
6. `SaleWizard` et composants enfants utilisent options pour adapter workflow

### Comportement Total en Mode Prix Global

**Principe :**
- Le champ `Sale.total_amount` stocke toujours le montant global du ticket (comme avant)
- En mode standard : `total_amount = Σ(total_price des items) + donation`
- En mode prix global : `total_amount = valeur saisie dans "Total à payer" + donation`
- Les items à 0€ ont `unit_price=0` et `total_price=0` mais n'affectent pas le `total_amount`
- Le "Sous-total" affiché dans le ticket est un calcul visuel (Σ items avec prix >0) mais n'est pas stocké en DB
- **Important** : Aucun changement de structure DB, le champ `total_amount` continue de fonctionner comme avant

### Validation Prix en Mode Prix Global

**Différence avec workflow standard :**
- **Workflow standard** : Validation bloquée si prix = 0€ (minimum 0.01€ requis)
- **Mode prix global** : Validation **autorisée** même à 0€ (permettre items sans prix)
- **Implémentation** : Modifier `isPriceValid` dans `SaleWizard` pour accepter 0€ quand `no_item_pricing` est actif
- **Comportement champ** : 
  - État initial : 0€ grisé (lecture seule)
  - Dès saisie : champ actif (plus grisé)
  - Si effacement (touche C) : retour à 0€ grisé
  - Validation : Toujours possible (même à 0€ grisé)

---

## 12. Checklist de Validation

- [ ] Migration DB exécutée sans erreur
- [ ] Options configurables dans Admin
- [ ] Mode prix global fonctionnel (workflow complet)
- [ ] Raccourcis clavier Enter/Escape fonctionnels
- [ ] Badge inversé affiché correctement
- [ ] Héritage virtuel/différé fonctionnel
- [ ] Filtrage dashboard fonctionnel
- [ ] Tests unitaires passent
- [ ] Tests d'intégration passent
- [ ] Tests E2E passent
- [ ] Documentation complète
- [ ] Aucune régression workflow standard
- [ ] Validation équipe terrain

---

**Dernière mise à jour :** 2025-01-27  
**Auteur :** Agent Auto (PO BNAD)  
**Validation PO :** Complétée (Sarah)  
**Approbation :** En attente

**Notes de validation :**
- Migration DB : Effectuée à la fermeture de boutique, procédures de sauvegarde dans scripts de déploiement
- Validation "Total à payer" : Peut être 0€ si tout en don/recyclage, minimum = sous-total si sous-total existe, pas de négatifs
- Plan de communication : Documentation + guide vidéo (hors scope épic, réalisé séparément)
- Rollback : Option privilégiée = désactivation via flag/Admin (pas de rollback DB nécessaire)
- Séquençage : B49-P2 et B49-P3 peuvent être développées en parallèle après B49-P1

