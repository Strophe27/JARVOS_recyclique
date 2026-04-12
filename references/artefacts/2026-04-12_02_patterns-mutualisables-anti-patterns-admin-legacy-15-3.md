# Story 15.3 — Patterns mutualisables et anti-patterns de l'admin legacy

**Date :** 2026-04-12  
**Story :** `15-3-identifier-les-patterns-mutualisables-et-les-anti-patterns-du-legacy-admin`  
**Epic :** 15  
**Sources code :** `recyclique-1.4.4/frontend/src/App.jsx`, `recyclique-1.4.4/frontend/src/config/adminRoutes.js`, `recyclique-1.4.4/frontend/src/pages/Admin/*`, `recyclique-1.4.4/frontend/src/components/Admin/*`

---

## 0. Corpus et dépendances 15.1 / 15.2

- **15.1** : inventaire publié — `references/artefacts/2026-04-12_01_inventaire-surfaces-admin-legacy-15-1.md` (source de vérité routes / écrans retenus). Les exemples du **§1** restent cohérents avec ce périmètre.
- **15.2** : livrable fichier de cartographie API / permissions **non vérifié** dans cette session ; ne pas inférer d'autorité depuis le JSX seul — à croiser quand `15.2` sera dans `references/artefacts/`.

**Preuves directes complémentaires** (patterns, implémentations) :

- Routage `/admin/*` : `App.jsx` (routes imbriquées admin) croisé avec `ADMIN_ROUTES` / `ADMIN_NAVIGATION_ITEMS` dans `adminRoutes.js`.
- Toute divergence entre `adminRoutes.js` (ex. chemins annoncés) et `App.jsx` (chemins réels) est une **divergence de configuration** : à traiter en portage (ne pas la recopier telle quelle).

---

## 1. Catalogue des familles de patterns (comportement commun, variantes, exemples)

Chaque famille cite **au moins** une route ou un fichier page issu du périmètre admin (équivalent inventaire 15.1).

| # | Famille | Comportement commun réutilisable | Variantes observées | Exemples (route → page) |
|---|---------|----------------------------------|----------------------|-------------------------|
| 1 | **Listes / tableaux** | Charger une collection, afficher colonnes triables ou triables localement, ligne cliquable pour détail | Mantine `Table` + Stepper ; tableau HTML custom + styled-components ; composant métier dédié (`UserListTable`) | `/admin/users` → `Users.tsx` ; `/admin/session-manager` → `SessionManager.tsx` ; `/admin/import/legacy` → `LegacyImport.tsx` |
| 2 | **Filtres / recherche / tri / pagination** | Barre de critères (dates, statuts, opérateur), synchronisation optionnelle URL, rafraîchissement | Accordéon filtres avancés (`AdvancedFiltersAccordion`) vs grilles de champs styled inline vs `Select` / `TextInput` Mantine | `/admin/session-manager` + `components/Admin/AdvancedFiltersAccordion.tsx` ; `/admin/reception-reports` → `ReceptionReports.tsx` ; `/admin/users` → filtres Mantine + pagination |
| 3 | **Vues détail** | Lecture d'une ressource par ID, sections d'information, retour liste | Route dédiée `/…/:id` vs panneau latéral dans la même page | `/admin/cash-sessions/:id` → `CashSessionDetail.tsx` ; `/admin/reception-tickets/:id` → `ReceptionTicketDetail.tsx` ; utilisateurs : `UserDetailView` dans `Users.tsx` |
| 4 | **Création / édition** | Formulaires, validation, feedback toast | Modal création utilisateur ; wizard multi-étapes (import) | `/admin/users` (modal) ; `/admin/import/legacy` (`LegacyImport.tsx`, Stepper Mantine) |
| 5 | **Exports CSV / XLS / bulk** | Appel service → téléchargement fichier ; parfois menu format | Dropdown export (sessions) vs bouton direct (réception) vs export JSON/CSV remappé (import) | `SessionManager.tsx` (icônes `Download`, `FileSpreadsheet`) ; `ReceptionReports.tsx` (`exportReceptionLignesCSV`) ; `LegacyImport.tsx` |
| 6 | **Barres d'actions / CTA** | Actions primaires à droite du titre, secondaires en ghost | `styled.button` custom vs `Group` Mantine | `SessionManager.tsx` (`TitleBar`, `Toolbar`) ; `Users.tsx` (Mantine `Group`, `Button`) |
| 7 | **Modales / confirmations / drawers** | Bloquer l'action destructive, confirmer | Mantine modals / notifications vs patterns custom | `Users.tsx` (`notifications`, état modal) ; autres pages : à compléter au fil du portage |
| 8 | **Step-up / actions sensibles** | Garde d'accès avant rendu page | **Niveau route** : `ProtectedRoute` avec `requiredRoles` / `adminOnly` dans `App.jsx` | `/admin/categories`, `/admin/groups`, `/admin/audit-log`, `/admin/settings`, `/admin/sites-and-registers`, `/admin/import/legacy` |
| 9 | **États vide / chargement / erreur** | Spinner, message, retry | `Alert` Mantine ; états `loading`/`error` dans stores vs local `useState` | `Users.tsx` (store + Alert) ; pages styled (patterns hétérogènes) |
| 10 | **Navigation secondaire / hub** | Cartes ou liens vers sous-domaines admin | Grille de cartes styled ; hub rapports | `/admin` et `/admin/dashboard` → `DashboardHomePage.jsx` ; `/admin/reports` → `ReportsHub.tsx` |
| 11 | **Tableaux de bord / KPI** | Agrégats en tête de page, cartes indicateurs | Composants partagés `StatWidget`, `ComparisonCards` vs KPI inline dans SessionManager | `components/Admin/StatWidget.jsx`, `ComparisonCards.tsx` ; `SessionManager.tsx` (`KPICards`) |
| 12 | **Pattern émergent — « analytics rapide »** | Page outil d'analyse ad hoc branchée sur services | Style et data flow propres à la page | `/admin/quick-analysis` → `QuickAnalysis.tsx` |

---

## 2. Variation métier légitime vs dette / divergence historique

**Critères (à appliquer systématiquement en revue de portage)**

| Critère | Variation métier **légitime** | Dette / divergence **historique** |
|---------|-------------------------------|-----------------------------------|
| **Motivation produit** | Deux UX différentes parce que **deux personas** ou **deux niveaux de risque** (ex. super-admin vs admin) | Deux implémentations pour le **même persona** et le **même risque** sans différence fonctionnelle |
| **Autorité** | Différence imposée par **rôles / permissions** réelles (backend + route) | Différence **purement visuelle** (Mantine vs styled) sans contrainte d'autorité |
| **Données** | Champs ou filtres supplémentaires dus au **domaine** (caisse vs réception) | Duplication de champs filtres équivalents recodés à la main sur plusieurs pages |
| **Traçabilité** | Comportement documenté (OpenAPI, spec) | Comportement « seulement dans le JSX » non aligné contrat v2 |

**Exemples concrets**

- **Légitime :** wizard fichier CSV (`LegacyImport`) vs liste simple utilisateurs — parcours métier différent.
- **Légitime :** garde `SUPER_ADMIN` sur `settings` vs simple `adminOnly` sur le shell — hiérarchie de risque.
- **Dette :** barres de filtres **structurellement équivalentes** implémentées en styled-components maison sur `ReceptionReports` et `SessionManager` sans composant partagé unique (hors `AdvancedFiltersAccordion` partiellement réutilisé).
- **Dette :** **hétérogénéité de stack UI** (Mantine dense sur `Users` / `LegacyImport` vs styled-components sur `SessionManager` / `ReceptionReports`) pour des **patterns liste + filtres** comparables — coût de maintenance et risque d'incohérence visuelle en parité Peintre.
- **Divergence config :** `adminRoutes.js` mentionne `REPORTS`, `HEALTH`, `SETTINGS` avec chemins qui ne reflètent pas tous les segments réellement montés dans `App.jsx` (à réconcilier ; ne pas recopier la désynchronisation).

---

## 3. Anti-patterns — à ne **pas** recopier dans Peintre (implémentation)

Formulation impérative ; référence écran quand possible. **Ne pas confondre** avec abandon du besoin utilisateur : le besoin reste, l'implémentation change.

1. **Ne pas** multiplier les **DSL de style parallèles** (styled-components + Mantine + boutons HTML styled) sur le même périmètre admin sans règle de migration — préférer l'**ADR P1** (`references/peintre/index.md` : CSS Modules + tokens + Mantine ciblée).
2. **Ne pas** dupliquer des **grilles de filtres** ad hoc page par page quand une famille « liste analytique » existe — factoriser en **brique filtres** alimentée par contrat (CREOS / données) plutôt que copier `FiltersBar` / `FiltersSection`.
3. **Ne pas** ancrer la **navigation admin** sur deux vérités (`ADMIN_NAVIGATION_ITEMS` vs routes réelles) sans couche unique — risque de liens morts ou d'écrans orphelins.
4. **Ne pas** porter tel quel le **polling client** comme unique stratégie de fraîcheur (ex. statuts utilisateurs dans `Users.tsx`) sans passer par le **modèle de signaux** / contrats prévus côté v2 (bandeau live, ContextEnvelope, etc.).
5. **Ne pas** laisser des **fichiers `_old` ou doubles implémentations** (`Categories_old.tsx`) dans le chemin de portage — traiter comme dette à résoudre avant équivalence fonctionnelle.
6. **Ne pas** réutiliser l'**alias trompeur** `CashJournal` → `Dashboard.tsx` pour `/rapports/caisse` **hors** `/admin` sans clarifier le modèle mental — documenter le rôle réel ou renommer côté portage.
7. **Ne pas** implémenter des **exports sensibles** sans expliciter permission, audit et corrélation (les pages actuelles mélangent appels services ; la **story 15.5** posera l'architecture — ici on refuse seulement l'« export copié-collé sans autorité »).

---

## 4. Première proposition de familles de **briques** UI/admin cibles (hors archi détaillée 15.5)

But : noms de **familles produit** pour guider CREOS / widgets plus tard, **sans** trancher widgets finaux.

1. **Shell liste admin** — en-tête, toolbar, slot tableau, slot filtres, pagination.
2. **Bloc filtres analytics** — accordéon ou barre compacte, persistance d'URL optionnelle.
3. **Cartes KPI** — série d'indicateurs + lien « voir détail ».
4. **Hub navigation secondaire** — tuiles ou liste vers sous-parcours.
5. **Route détail ressource** — layout deux colonnes ou page pleine avec breadcrumbs / retour.
6. **Console export** — bouton principal + menu formats + états disabled selon permission.
7. **Wizard sensible** — étapes, validation intermédiaire, téléchargement gabarit.
8. **Garde d'accès** — intégration **route-level** + messages d'accès refusé homogènes (alignés matrice parité).

---

## 5. Traçabilité critères d'acceptation (Given / When / Then)

### Bloc 1 — Catalogue et distinction commun / variation métier

- **Given** le legacy admin contient listes, filtres, vues détail, édition, exports, CTA, etc. **When** ce document est livré **Then** le **§1** catalogue les familles sur le corpus routé et **§2** distingue variation légitime vs dette.  
- Preuve de divergence sans trancher au hasard : **§0** (gap 15.1/15.2) + comparaison explicite **Users** vs **SessionManager** vs **ReceptionReports** (listes + filtres).

### Bloc 2 — Patterns émergents et anti-patterns

- **When** l'audit progresse **Then** le **§1** inclut un pattern émergent (#12 Quick Analysis) **And** le **§3** liste les anti-patterns à éviter en implémentation Peintre.

---

## 6. QA documentaire (substitut `bmad-qa-generate-e2e-tests`)

**Constat :** aucune fonctionnalité exécutable nouvelle dans Peintre pour cette story ; **pas** d'exécution de tests E2E automatisés.

| Contrôle story | Preuve dans ce livrable |
|----------------|-------------------------|
| AC Given/Then couverts | **§5** |
| Chaque famille ≥ 1 exemple route/page | **§1** colonne « Exemples » (alignée inventaire 15.1) |
| Pas d'affirmation de mutualisation sans comparaison | **§2** critères + paires d'écrans **Users / SessionManager / ReceptionReports** |
| Liste anti-patterns impérative | **§3** |

**Verdict QA doc :** **PASS** (suivi **15.2** : compléter croisement autorité/API hors JSX quand le livrable 15.2 existera).

---

## 7. Revue code / doc (CR — contexte unique)

- Cohérence avec garde-fous story (pas d'architecture finale, pas d'abandon besoin) : **OK**.
- Risque résiduel : alignement fin avec **15.2** (permissions / endpoints) — hors périmètre strict de ce catalogue UI ; à croiser en story suivante.

**Décision CR :** **APPROVED** pour passage en revue humaine / matrice 15.4.

---

## 8. Fichiers legacy cités (audit rapide)

**Pages :** `Dashboard.tsx`, `DashboardHomePage.jsx`, `Users.tsx`, `PendingUsers.tsx`, `SessionManager.tsx`, `CashSessionDetail.tsx`, `ReceptionDashboard.tsx`, `ReceptionReports.tsx`, `ReceptionSessionManager.tsx`, `ReceptionTicketDetail.tsx`, `Reports.tsx`, `ReportsHub.tsx`, `CashRegisters.tsx`, `Sites.tsx`, `Categories.tsx`, `GroupsReal.tsx`, `Settings.tsx`, `HealthDashboard.tsx`, `AuditLog.tsx`, `EmailLogs.tsx`, `SitesAndRegistersPage.tsx`, `LegacyImport.tsx`, `QuickAnalysis.tsx`.

**Composants admin partagés :** `components/Admin/AdvancedFiltersAccordion.tsx`, `ComparisonChart.tsx`, `ComparisonCards.tsx`, `PeriodSelector.tsx`, `StatWidget.jsx`, `HeaderUser.jsx`, `HeaderCA.jsx`, `HeaderAlerts.jsx`.

**Config :** `config/adminRoutes.js`, routes imbriquées `App.jsx`.
