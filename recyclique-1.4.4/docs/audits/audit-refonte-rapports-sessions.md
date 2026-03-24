# Audit : Refonte des Rapports et Sessions Admin

**Date** : 2025-01-27  
**Auteur** : Sarah (Product Owner)  
**Contexte** : Double emploi identifié entre "Session de caisse" et "Rapport de session de caisse", besoin d'harmoniser "Rapport de réception" sur le modèle de "Session de caisse"

---

## 📊 État Actuel

### 1. **Session de Caisse** (`/admin/session-manager`)
**Fichier** : `frontend/src/pages/Admin/SessionManager.tsx`

**Fonctionnalités** :
- ✅ Liste toutes les sessions de caisse avec filtres avancés
- ✅ KPIs en haut (CA total, nb ventes, poids total, dons, nb sessions)
- ✅ Filtres : date début/fin, statut, opérateur, site, recherche textuelle
- ✅ Tableau avec tri sur colonnes (statut, date, opérateur, ventes, montants, écart)
- ✅ Pagination côté client (20/50/100 par page)
- ✅ Export CSV par session (bouton "Télécharger CSV" sur chaque ligne)
- ✅ Clic sur ligne → détail session (`/admin/cash-sessions/:id`)
- ✅ Visualisation détaillée avec liste des ventes et modal de ticket

**Points forts** :
- Interface complète et cohérente
- Filtres puissants
- Navigation fluide
- Export au niveau session

---

### 2. **Rapports & Exports** (`/admin/reports`)
**Fichier** : `frontend/src/pages/Admin/ReportsHub.tsx`

**Fonctionnalités** :
- Hub de navigation avec 2 cartes :
  1. "Rapports de Sessions de Caisse" → `/admin/reports/cash-sessions`
  2. "Rapports de Réception" → `/admin/reception-reports`

**Problème** : Page intermédiaire qui ajoute un clic inutile

---

### 3. **Rapports de Sessions de Caisse** (`/admin/reports/cash-sessions`) ⚠️ **DOUBLON**
**Fichier** : `frontend/src/pages/Admin/Reports.tsx`

**Fonctionnalités** :
- Liste les fichiers CSV générés automatiquement lors de la fermeture de session
- Permet de télécharger ces fichiers
- Rafraîchissement manuel

**Problèmes identifiés** :
- ❌ **DOUBLE EMPLOI** : SessionManager fait déjà mieux
- ❌ Interface moins riche (pas de filtres, pas de KPIs)
- ❌ Pas de visualisation des données avant export
- ❌ Liste statique de fichiers vs liste dynamique de sessions

**Conclusion** : Cette page doit être **supprimée**

---

### 4. **Rapports de Réception** (`/admin/reception-reports`)
**Fichier** : `frontend/src/pages/Admin/ReceptionReports.tsx`

**Fonctionnalités actuelles** :
- ✅ Filtres : date début/fin, catégorie
- ✅ Tableau des **lignes de dépôt** (granularité ligne, pas ticket)
- ✅ Pagination serveur (25/50/100 par page)
- ✅ Export CSV global des lignes filtrées

**Manques critiques** :
- ❌ Pas de liste des **tickets de réception**
- ❌ Pas de visualisation détaillée d'un ticket
- ❌ Pas de KPIs (poids total, nb tickets, etc.)
- ❌ Pas de tri sur colonnes
- ❌ Pas d'export par ticket
- ❌ Interface différente de SessionManager (incohérence UX)

**Conclusion** : Cette page doit être **complètement remaniée** pour suivre le modèle de SessionManager

---

## 🎯 Objectifs de Refonte

### 1. Supprimer le doublon
- ❌ Supprimer `/admin/reports/cash-sessions` (AdminReports.tsx)
- ❌ Supprimer la carte correspondante dans ReportsHub.tsx
- ✅ SessionManager reste la référence unique pour les sessions de caisse

### 2. Harmoniser "Sessions de Réception"
- ✅ Créer un nouveau composant `ReceptionSessionManager.tsx` calqué sur `SessionManager.tsx`
- ✅ Même structure : KPIs → Filtres → Tableau → Pagination
- ✅ Liste des **tickets de réception** (pas des lignes)
- ✅ Visualisation détaillée d'un ticket (`/admin/reception-tickets/:id`)
- ✅ Export CSV par ticket
- ✅ Filtres similaires : date, bénévole, statut, site, recherche

### 3. Simplifier la navigation
- ✅ Remplacer le bouton "Rapports & Exports" par "Sessions de Réception"
- ✅ Supprimer ReportsHub.tsx (plus besoin de hub)
- ✅ Accès direct : Dashboard → "Sessions de Réception"

---

## 📋 Plan d'Action Détaillé

### Phase 1 : Suppression du doublon

#### 1.1 Supprimer AdminReports.tsx
- [ ] Supprimer `frontend/src/pages/Admin/Reports.tsx`
- [ ] Supprimer l'import dans `App.jsx`
- [ ] Supprimer la route `/admin/reports/cash-sessions` dans `App.jsx`

#### 1.2 Nettoyer ReportsHub.tsx
- [ ] Supprimer la carte "Rapports de Sessions de Caisse"
- [ ] Garder uniquement la carte "Rapports de Réception" (temporaire, jusqu'à Phase 2)

#### 1.3 Vérifier les références
- [ ] Chercher toutes les références à `/admin/reports/cash-sessions`
- [ ] Chercher toutes les références à `AdminReports`
- [ ] Mettre à jour les liens si nécessaire

---

### Phase 2 : Création de ReceptionSessionManager

#### 2.1 Créer le nouveau composant
- [ ] Créer `frontend/src/pages/Admin/ReceptionSessionManager.tsx`
- [ ] S'inspirer de la structure de `SessionManager.tsx`
- [ ] Adapter pour les tickets de réception

#### 2.2 Structure du composant

**KPIs à afficher** :
- Poids total reçu (kg)
- Nombre de tickets
- Nombre de lignes de dépôt
- Nombre de bénévoles actifs
- (Optionnel) Répartition par catégorie

**Filtres** :
- Date début / Date fin
- Statut (ouvert/fermé)
- Bénévole (select avec recherche)
- Site (si applicable)
- Recherche textuelle (ID ticket, nom bénévole)

**Tableau** :
| Colonne | Tri | Description |
|---------|-----|-------------|
| Statut | ✅ | Badge ouvert/fermé |
| Date création | ✅ | Date/heure |
| Bénévole | ✅ | Nom du bénévole |
| Nb lignes | ✅ | Nombre de lignes de dépôt |
| Poids total | ✅ | Poids total en kg |
| Actions | ❌ | Voir détail, Export CSV |

**Pagination** :
- Côté client (comme SessionManager)
- Options : 20/50/100 par page

#### 2.3 Page de détail d'un ticket
- [ ] Créer `frontend/src/pages/Admin/ReceptionTicketDetail.tsx`
- [ ] Structure similaire à `CashSessionDetail.tsx`
- [ ] Afficher :
  - Informations du ticket (bénévole, date, statut)
  - Liste des lignes de dépôt avec catégorie, poids, destination, notes
  - Export CSV du ticket

#### 2.4 Routes
- [ ] Ajouter route `/admin/reception-sessions` → `ReceptionSessionManager`
- [ ] Ajouter route `/admin/reception-tickets/:id` → `ReceptionTicketDetail`

#### 2.5 Services API
- [ ] Vérifier que `/v1/reception/tickets` existe (✅ existe)
- [ ] Vérifier que `/v1/reception/tickets/{id}` existe (✅ existe)
- [ ] Créer service `receptionTicketsService.ts` si nécessaire
- [ ] Ajouter endpoint export CSV par ticket (à créer côté API si absent)

---

### Phase 3 : Mise à jour de la navigation

#### 3.1 Dashboard HomePage
- [ ] Remplacer le bouton "Rapports & Exports" par "Sessions de Réception"
- [ ] Changer l'icône (FileText au lieu de IconReport)
- [ ] Changer la couleur (cyan → autre couleur pour différencier)

#### 3.2 Supprimer ReportsHub
- [ ] Supprimer `frontend/src/pages/Admin/ReportsHub.tsx`
- [ ] Supprimer l'import dans `App.jsx`
- [ ] Supprimer la route `/admin/reports` dans `App.jsx`

#### 3.3 Navigation AdminLayout
- [ ] Vérifier si ReportsHub est dans le menu latéral
- [ ] Remplacer par "Sessions de Réception" si présent

---

### Phase 4 : Nettoyage et tests

#### 4.1 Nettoyage
- [ ] Supprimer `ReceptionReports.tsx` (remplacé par ReceptionSessionManager)
- [ ] Supprimer la route `/admin/reception-reports` dans `App.jsx`
- [ ] Chercher toutes les références à `ReceptionReports`
- [ ] Mettre à jour les liens

#### 4.2 Tests
- [ ] Tester la navigation complète
- [ ] Tester les filtres
- [ ] Tester la pagination
- [ ] Tester l'export CSV
- [ ] Tester la visualisation détaillée
- [ ] Vérifier la cohérence UX avec SessionManager

---

## 🔍 Analyse Technique

### Endpoints API existants

#### Sessions de Caisse
- ✅ `GET /v1/cash-sessions/` - Liste avec filtres
- ✅ `GET /v1/cash-sessions/{id}` - Détail
- ✅ `GET /v1/admin/reports/cash-sessions/by-session/{id}` - Export CSV

#### Tickets de Réception
- ✅ `GET /v1/reception/tickets` - Liste avec pagination
  - Paramètres : `page`, `per_page`, `status`
- ✅ `GET /v1/reception/tickets/{id}` - Détail
- ❌ `GET /v1/reception/tickets/{id}/export-csv` - **À CRÉER**

#### Lignes de Dépôt (actuel)
- ✅ `GET /v1/reception/lignes` - Liste filtrée
- ✅ `GET /v1/reception/lignes/export-csv` - Export global

**Recommandation** : Créer l'endpoint d'export par ticket pour cohérence avec sessions de caisse

---

## 📐 Structure Cible

```
/admin
├── session-manager          → Sessions de Caisse (existant, inchangé)
├── cash-sessions/:id        → Détail session caisse (existant, inchangé)
├── reception-sessions        → Sessions de Réception (NOUVEAU)
└── reception-tickets/:id     → Détail ticket réception (NOUVEAU)
```

**Supprimé** :
- `/admin/reports` (ReportsHub)
- `/admin/reports/cash-sessions` (AdminReports)
- `/admin/reception-reports` (ReceptionReports)

---

## ✅ Critères de Succès

1. **Cohérence UX** : Sessions de Réception identique à Sessions de Caisse
2. **Pas de doublon** : Une seule façon d'accéder aux sessions de caisse
3. **Navigation simplifiée** : Moins de clics pour accéder aux fonctionnalités
4. **Fonctionnalités complètes** : Liste, filtres, détails, export pour réceptions
5. **Code propre** : Suppression de tout code mort

---

## 🚨 Points d'Attention

1. **Export CSV par ticket** : Vérifier si l'endpoint existe, sinon le créer
2. **KPIs réception** : Définir quels KPIs sont pertinents (poids, tickets, bénévoles)
3. **Filtres** : Adapter les filtres au contexte réception (bénévole vs opérateur)
4. **Pagination** : Décider pagination côté client (comme sessions) ou serveur
5. **Migration** : Communiquer le changement aux utilisateurs

---

## 📝 Notes Complémentaires

- Le modèle `SessionManager.tsx` est excellent et doit servir de référence
- La structure actuelle de `ReceptionReports.tsx` est trop différente
- L'harmonisation améliorera la maintenabilité du code
- Les utilisateurs bénéficieront d'une expérience plus cohérente

---

**Prochaine étape** : Valider ce plan avec l'équipe avant implémentation

