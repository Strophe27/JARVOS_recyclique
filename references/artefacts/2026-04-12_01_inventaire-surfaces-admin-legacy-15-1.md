# Inventaire des surfaces admin legacy a porter vers Peintre_nano (Story 15.1)

**Date :** 2026-04-12  
**Story :** `15-1-auditer-exhaustivement-les-surfaces-admin-legacy-a-porter-vers-peintre-nano`  
**Corpus normatif :** `recyclique-1.4.4/frontend/src/App.jsx`, `recyclique-1.4.4/frontend/src/config/adminRoutes.js`, pages sous `recyclique-1.4.4/frontend/src/pages/Admin/*`  
**Croisements :** `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`, `peintre-nano/docs/03-contrats-creos-et-donnees.md`

---

## 0. Perimetre et renvoi Epic 14 (shell admin)

Le **shell admin legacy** (`AdminLayout.jsx` : barre verte, liens transverses Tableau de bord `/`, Caisse, Reception, Administration `/admin`, menu utilisateur) est deja traite cote parite sous la ligne matrice **`ui-pilote-14-01-admin-shell-perimetre`** (Story 14.1). Ce document **ne redetaille pas** ce shell ; il inventorie les **routes et ecrans sous `/admin` et satellites** necessaires au decoupage 15.2+.

---

## 1. Inventaire synthetique des routes `/admin*` (retenues)

Source de verite routage : `App.jsx` (routes nested sous `<Route path="/admin" …>`). La constante `ADMIN_ROUTES` dans `adminRoutes.js` couvre un **sous-ensemble** ; plusieurs routes existantes **ne sont pas** dans `ADMIN_NAVIGATION_ITEMS` (nav laterale hypothetique non utilisee seule dans `AdminLayout` — la navigation interne repasse surtout par `DashboardHomePage`, `Dashboard.tsx` / journal caisse, `ReportsHub`, liens in-page).

| Route (pattern) | Composant page | Garde `App.jsx` (resume) | Famille fonctionnelle |
|-----------------|----------------|---------------------------|------------------------|
| `/admin`, `/admin/dashboard` | `DashboardHomePage.jsx` | `adminOnly` | **Tableau de bord admin** (KPIs jour, entetes alertes/CA/utilisateur, grille navigation vers sous-modules) |
| `/admin/cash-sessions/:id` | `CashSessionDetail.tsx` | `adminOnly` | **Supervision caisse** (detail session, retour vers gestionnaire) |
| `/admin/reception-stats` | `ReceptionDashboard.tsx` | `adminOnly` | **Reception — stats agregees** |
| `/admin/reception-reports` | `ReceptionReports.tsx` | `adminOnly` | **Reception — rapports / exports** |
| `/admin/reception-sessions` | `ReceptionSessionManager.tsx` | `adminOnly` | **Reception — gestion sessions** |
| `/admin/reception-tickets/:id` | `ReceptionTicketDetail.tsx` | `adminOnly` | **Reception — detail ticket** |
| `/admin/reports` | `ReportsHub.tsx` | `adminOnly` | **Rapports — hub** (cartes vers cash-sessions et reception-reports) |
| `/admin/reports/cash-sessions` | `Reports.tsx` + `Dashboard.tsx` (alias lazy `CashJournal`) | `adminOnly` | **Rapports caisse / journal** (meme famille que supervision sessions) |
| `/admin/users` | `Users.tsx` | `adminOnly` | **Comptes utilisateurs** |
| `/admin/pending` | `PendingUsers.tsx` | `adminOnly` | **Inscriptions en attente** |
| `/admin/session-manager` | `SessionManager.tsx` | `adminOnly` | **Gestionnaire sessions de caisse** |
| `/admin/quick-analysis` | `QuickAnalysis.tsx` | `adminOnly` | **Analyse rapide** (lien depuis SessionManager) |
| `/admin/cash-registers` | `CashRegisters.tsx` | `adminOnly` | **Configuration postes de caisse** |
| `/admin/sites` | `Sites.tsx` | `adminOnly` | **Sites et emplacements** |
| `/admin/categories` | `Categories.tsx` | `ADMIN` + `SUPER_ADMIN` | **Categories / tarifs** |
| `/admin/groups` | `GroupsReal.tsx` | `ADMIN` + `SUPER_ADMIN` | **Groupes et permissions** |
| `/admin/audit-log` | `AuditLog.tsx` | `ADMIN` + `SUPER_ADMIN` | **Journal d'audit** |
| `/admin/email-logs` | `EmailLogs.tsx` | `ADMIN` + `SUPER_ADMIN` | **Logs e-mails sortants** |
| `/admin/health` | `HealthDashboard.tsx` | `adminOnly` | **Sante systeme** |
| `/admin/settings` | `Settings.tsx` | `SUPER_ADMIN` | **Parametres avances / maintenance** |
| `/admin/sites-and-registers` | `SitesAndRegistersPage.tsx` | `SUPER_ADMIN` | **Vue combinee sites et caisses** |
| `/admin/import/legacy` | `LegacyImport.tsx` | `ADMIN` + `SUPER_ADMIN` | **Import / outils legacy** |

**Satellite hors prefixe `/admin` mais intention admin / supervision :**

| Route | Composant | Garde | Note |
|-------|-----------|-------|------|
| `/rapports/caisse` | `Dashboard.tsx` (`CashJournal`) | `ADMIN` + `SUPER_ADMIN` | Journal de caisse « transverse » relie aux rapports admin (`navigate('/admin/reports')` dans le composant). A traiter avec la famille **rapports / supervision caisse** pour la parite navigation (ecart chemin vs `/admin/...`). |

---

## 2. Regroupement par familles d'ecrans

1. **Accueil admin et pilotage** — `/admin`, `/admin/dashboard` (`DashboardHomePage`).
2. **Identite et acces** — `/admin/users`, `/admin/pending`, `/admin/groups`, `/admin/categories`.
3. **Caisse — configuration et supervision** — `/admin/cash-registers`, `/admin/session-manager`, `/admin/cash-sessions/:id`, `/admin/quick-analysis`, `/admin/reports`, `/admin/reports/cash-sessions`, `/rapports/caisse`, hub interne `ReportsHub`.
4. **Reception — pilotage** — `/admin/reception-stats`, `/admin/reception-reports`, `/admin/reception-sessions`, `/admin/reception-tickets/:id`, lien depuis `Reception.tsx` vers sessions admin.
5. **Exploitation / conformite** — `/admin/audit-log`, `/admin/email-logs`.
6. **Infrastructure et super-admin** — `/admin/health`, `/admin/settings`, `/admin/sites`, `/admin/sites-and-registers`, `/admin/import/legacy`.

---

## 3. Fiches ecran retenues (intention, zones, actions, navigation, parite)

Les **points de parite** suivent la matrice (titres, nav, controles, blocs donnees, exports, signaux de contexte). Reference matrice : lignes **14-01**, **14-02**, **14-03** pour recoupement ; caisse/reception metier hors admin pur deja couvert par pilotes **03** et receptacles Epic 7.

### 3.1 Dashboard admin (`DashboardHomePage`)

- **Intention :** point d'entree post-login dans la zone admin ; vue synthetique **jour** (CA, dons, poids recu/sorti) et **grille** vers modules.
- **Zones visibles :** cartes statistiques ; `HeaderAlerts`, `HeaderCA`, `HeaderUser` ; section « Navigation principale » ; bloc super-admin conditionnel.
- **Actions :** navigation vers users, groups, categories, session-manager, reception-sessions, audit-log ; super-admin : health, settings, sites-and-registers ; logique conditionnelle vers **detail session caisse** ou hub **rapports** selon etat sessions (`navigate` vers `/admin/cash-sessions/:id` ou `/admin/reports`).
- **Navigation :** entree `/admin` depuis shell transverse ; liens internes liste ci-dessus.
- **Parite :** alignee matrice **`ui-pilote-14-03-admin-supervision-simple`** (stats jour, en-tetes) — cote Peintre : **gap** widget `data_contract` documente matrice ; widget demo `admin.legacy.dashboard.home` **partiel** (recomposition visuelle + APIs reviewables, pas equivalence ligne a ligne).

### 3.2 Detail session caisse (`CashSessionDetail`)

- **Intention :** inspection fine d'une session (lignes, totaux, controles, historique selon implementation).
- **Zones / actions :** detail + retour gestionnaire (`navigate('/admin/session-manager')`).
- **Parite :** supervision caisse ; croiser OpenAPI sessions / ventes ; Peintre : widget **`admin-cash-session-detail`** (manifest `page-admin-cash-session-detail.json`) = **partiel** (slice reviewable existe, route SPA demo a valider vs legacy).

### 3.3 Reception admin (stats, rapports, sessions, ticket)

- **Intention :** pilotage reception cote admin (volumes, exports CSV, liste sessions, drill-down ticket).
- **Actions typiques :** filtres, tableaux, export ; navigation ticket -> sessions.
- **Parite :** blocs donnees + exports ; signaux contexte site ; Peintre : **absent** en admin dedie reviewable (reception Peintre = parcours operateur Epic 12, pas tableau admin equivalent).

### 3.4 Hub et rapports (`ReportsHub`, `Reports`, journal `/rapports/caisse`)

- **Intention :** agregation des chemins « rapports » vers cash-sessions et reception-reports ; journal caisse sur chemin transverse.
- **Parite :** titres cartes hub ; coherence avec **`/admin/reports/cash-sessions`** ; ecart **`/rapports/caisse`** vs `/admin/*` pour la **nav observable** (matrice / doc 03 : pas de fusion silencieuse des chemins).

### 3.5 Utilisateurs et pending (`Users`, `PendingUsers`)

- **Intention :** gestion comptes ; file d'attente validation inscriptions.
- **Parite :** listes, roles, actions CRUD ; lien pending -> users.
- **Peintre :** **absent** (pas de manifest admin users reviewable au 2026-04-12).

### 3.6 Session manager et analyse rapide (`SessionManager`, `QuickAnalysis`)

- **Intention :** liste/filtre sessions caisse ; analyse rapide depuis bouton ghost.
- **Parite :** tables, filtres, navigation detail ; Peintre : renvois textuels dans wizards caisse vers **zone admin** demo — **partiel** (SPA navigate `/admin`), pas ecran reviewable iso.

### 3.7 Postes de caisse et sites (`CashRegisters`, `Sites`)

- **Intention :** configuration postes ; gestion sites / emplacements.
- **Parite :** alignement matrice **14-02** (parametres simples) ; Peintre : pages **`page-transverse-admin-access-overview`**, **`page-transverse-admin-site-overview`** = **partiel** (hubs cadrage, pas persistance metier complete dans les slots demo).

### 3.8 Categories et groupes (`Categories`, `GroupsReal`)

- **Intention :** referentiels tarifs/categories ; groupes et permissions effectives.
- **Parite :** actions sensibles admin / super-admin ; Peintre : **absent** en CREOS admin dedie.

### 3.9 Audit et e-mails (`AuditLog`, `EmailLogs`)

- **Intention :** traceabilite actions ; diagnostic envois.
- **Parite :** filtres, pagination, export eventuel ; lien depuis `Settings` vers audit filtre import.
- **Peintre :** **absent**.

### 3.10 Sante et settings (`HealthDashboard`, `Settings`)

- **Intention :** supervision technique ; panneau maintenance (export DB, flags, etc. selon code).
- **Parite :** 14-02 / super-admin ; Peintre : **partiel** (placeholders transverse admin, pas stack metier settings legacy).

### 3.11 Sites et caisses combine (`SitesAndRegistersPage`)

- **Intention :** raccourci super-admin vers `/admin/sites` et `/admin/cash-registers`.
- **Parite :** navigation secondaire ; Peintre : **absent** en page dediee.

### 3.12 Import legacy (`LegacyImport`)

- **Intention :** outils import ; atteint depuis reception sessions.
- **Parite :** flux sensibles ; Peintre : **absent**.

---

## 4. Exclusions ou report explicites

| Element | Raison |
|---------|--------|
| `Categories_old.tsx` | Fichier present sous `pages/Admin/` mais **aucune** route dans `App.jsx` — code non monte ; hors perimetre portage tant qu'il n'est pas reactive. |
| Sous-routes `/admin/*` non listees dans `App.jsx` | **Inexistantes** ; toute route inventee serait une erreur. |
| Parite **pixel-perfect** composants legacy | Exclu par cadrage Epic 15 : parite **observable** et chaine contrats, pas clone technique. |
| Detail **operationId** par ecran | **Reporte** Story **15.2** (cartographie API / permissions / contextes). |

---

## 5. Couverture Peintre (deja / partiel / absent)

Sans inventer de metier : etat au **2026-04-12** d'apres `contracts/creos/manifests/*admin*`, `peintre-nano/docs/03-contrats-creos-et-donnees.md`, code `LiveAdminPerimeterStrip`, `TransverseHubLayout` `shellAdmin`, widgets enregistres.

| Famille legacy | Peintre (resume) |
|----------------|------------------|
| Shell + bandeau perimetre admin | **Deja** (14.1) — strip + hub placeholder ; matrice 14-01. |
| Parametres simples sites / acces | **Partiel** (14.2) — manifests access + site overview. |
| Dashboard supervision KPIs | **Partiel** — widget demo `admin.legacy.dashboard.home` ; matrice 14-03 = gap `data_contract`. |
| Detail session caisse admin | **Partiel** — `page-admin-cash-session-detail` + widget. |
| Users, pending, groups, categories | **Absent** reviewable. |
| Reception admin (4 routes) | **Absent** reviewable. |
| Rapports hub + reports cash | **Absent** reviewable (hors liens demo SPA). |
| Session manager, quick analysis | **Absent** reviewable. |
| Audit, email logs | **Absent** reviewable. |
| Health, settings, import legacy | **Absent** reviewable. |
| `/rapports/caisse` | **Absent** (route non `/admin` ; a decisions produit avec 14-03). |

---

## 6. Gaps nommes (non absorbes)

1. **Ecart chemins** : `/rapports/caisse` vs famille `/admin/reports*` — a arbitrer pour la **nav transverse** et les manifests CREOS.
2. **`adminRoutes.js` vs `App.jsx`** : constantes et `ADMIN_NAVIGATION_ITEMS` ne listent pas `groups`, `audit-log`, `email-logs`, `pending`, `quick-analysis`, `reception-sessions`, `import/legacy`, etc. — **risque de derive** documentation / nav ; a synchroniser ou documenter comme « nav secondaire uniquement code ».
3. **Preuves navigateur** : matrice 14-01 note MCP Chrome occupe — **preuve visuelle admin legacy** non rejouee dans ce run ; les fiches s'appuient sur **code source** + matrice existante.
4. **OpenAPI / permissions** : non exhaustif ici — Story **15.2**.

---

## 7. QA documentaire (substitut E2E — coche Story 15.1)

- [x] Chaque route `/admin*` ou satellite declaree section 1 est traitee ou section 4.
- [x] Chaque exclusion a une raison.
- [x] Chaque ecran retenu section 3 a intention, zones, actions, nav, references parite.
- [x] Incertitudes isolees section 6.
- [x] Un agent peut enchainer **15.2** sans relire tout le legacy (table + familles + renvoi 14).

---

## 8. Fichiers sources parcourus (traca)

- `recyclique-1.4.4/frontend/src/App.jsx`
- `recyclique-1.4.4/frontend/src/config/adminRoutes.js`
- `recyclique-1.4.4/frontend/src/components/AdminLayout.jsx`
- `recyclique-1.4.4/frontend/src/pages/Admin/DashboardHomePage.jsx`
- Inventaire dossier `recyclique-1.4.4/frontend/src/pages/Admin/*` (30 fichiers dont tests et `Categories_old.tsx`)
- Recherche liens `'/admin` dans `recyclique-1.4.4/frontend/src`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (lignes admin 14-xx)
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `contracts/creos/manifests/page-transverse-admin-*.json`, `page-admin-cash-session-detail.json`
