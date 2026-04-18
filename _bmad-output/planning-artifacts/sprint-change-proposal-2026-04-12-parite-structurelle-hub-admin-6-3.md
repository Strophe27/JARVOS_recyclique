# Sprint Change Proposal — Parité structurelle hub `/admin` (6 + 3) avant Epic 20

**Date :** 2026-04-12  
**Auteur (workflow) :** Correct Course BMAD (`bmad-correct-course` + `checklist.md`)  
**Destinataire :** Strophe (PO) — exécution dev / Story Runner après validation  
**Langue :** français  

---

## 0. Synthèse exécutive

| Élément | Contenu |
|--------|---------|
| **Chemin cible** | `http://localhost:4444/admin` (runtime Peintre reviewable) |
| **Référence legacy** | `http://localhost:4445/admin` — `recyclique-1.4.4/frontend/src/pages/Admin/DashboardHomePage.jsx` |
| **Invariant produit** | **6** boutons sous **Navigation principale** + **3** boutons sous **Administration Super-Admin** (si `role === 'super-admin'`), mêmes **intentions de navigation** et **ordre logique** que le legacy (libellés admis : harmonisation i18n / CREOS tant que la carte des routes reste équivalente). |
| **Approche** | **Ajustement direct** sur les stories **18.1** puis **17.1 / 17.2 / 19.1** et artefacts CREOS associés — **sans** reporter la clarification à l’Epic 20 (Epic 20 reste arbitrage **classe C**, pas correctif de parité **A** du hub index). |
| **Portée** | **Modérée** : réordonnancement backlog léger + modifications manifestes/widgets + tests contrat/e2e. |

**Checklist (extrait)** : déclencheur et preuves [x] ; epics 17–19 impactés [x] ; PRD [x] conflit mineur (précision parité) ; chemin retenu = option 1 Direct Adjustment [x] ; approbation explicite utilisateur pour mise en œuvre [ ] → document **actionnable** ; statut global **NEEDS_HITL** tant que le PO n’a pas coché l’invariant « intentions équivalentes » sur les routes encore non manifestées (ex. `/admin/users`, `/admin/groups` hors périmètre portage immédiat).

---

## 1. Problème (déclencheur)

**Constat** : la cible admin `4444/admin` **ne respecte pas** la parité **structurelle** du legacy `4445/admin` tel que codé dans `DashboardHomePage.jsx` :

- **Legacy** — grille **3×2** « Navigation principale » : Utilisateurs & Profils → `/admin/users` ; Groupes & Permissions → `/admin/groups` ; Catégories & Tarifs → `/admin/categories` ; **Sessions de Caisse** → `/admin/session-manager` ; Sessions de Réception → `/admin/reception-sessions` ; Activité & Logs → `/admin/audit-log`. Puis bloc **Super-Admin** conditionnel : Santé → `/admin/health` ; Paramètres → `/admin/settings` ; Sites & Caisses → `/admin/sites-and-registers`.
- **Peintre** — la `PageManifest` `page-transverse-admin-reports-hub.json` compose **deux** surfaces : le widget **`admin.reports.supervision.hub`** (grille d’entrées **différente** : caisses enregistrées, pending, sites, session-manager, stats réception, tickets) **puis** le widget **`admin.legacy.dashboard.home`**. Or, dans ce dernier, la **4e** tuile « Navigation principale » pointe déjà vers **`/admin/cash-registers`** (remplacement de **Sessions de Caisse** / `session-manager`), avec note de dette — ce qui **casse** l’invariant **6+3** aligné legacy.

**Preuve** : comparaison directe des fichiers  
`recyclique-1.4.4/frontend/src/pages/Admin/DashboardHomePage.jsx` (titres « Navigation principale » / « Administration Super-Admin », lignes ~285–395) et  
`peintre-nano/src/widgets/admin/AdminLegacyDashboardHomeWidget.tsx` (même section ~506–625, 4e bouton `cash-registers`).

**Cause systémique** : la chaîne **CREOS** a introduit un **second** bloc d’entrées (hub 18.1) **sans** trancher une **autorité unique** pour la grille 6+3 ; les filtres **toolbar live** (`prune-navigation-for-live-toolbar.ts`, `toolbar-selection-for-live-path.ts`) et le manifest **`navigation-transverse-served.json`** restent la **vérité** pour le shell, mais le **contenu** du hub `/admin` a dérivé vers des **stories** orientées « entrées manifestées » plutôt que « **même carte** que l’index legacy ».

---

## 2. Impact

### 2.1 Epics et stories

| Epic / story | Impact |
|--------------|--------|
| **18.1** | **Principal** : l’AC actuelle (« hub structure, labels, grouping ») est **trop floue** pour interdire la **double** grille ou une grille **non isomorphe** au legacy. Il faut une **AC normative 6+3** + règle **une seule autorité visuelle** pour la navigation principale sur `/admin`. |
| **17.1 / 17.2** | **Secondaire mais bloquant pour la cohérence** : `pending`, `cash-registers`, `sites` sont des **slices** légitimes, mais ne doivent **pas** remplacer les **6** raccourcis legacy sur l’index ; ils restent des **pages profondes** accessibles depuis la bonne tuile ou depuis la nav transverse servie, selon tranche PO. |
| **19.1** | **Risque de renfort de la dérive** si « Stats réception » est promue en **raccourci hub** à la place d’une tuile legacy (le legacy index **ne** met pas `reception-stats` dans les 6 — la réception y est « Sessions de Réception »). Toute entrée **supplémentaire** sur le hub doit être **hors** des 6 ou explicitee comme **dérogation PO** dans la matrice. |
| **18.3 / 19.3** | Les preuves de parité **doivent** inclure un **assert** automatisé (contrat + e2e) sur le **nombre** et l’**ordre** des CTA du bloc « Navigation principale » + présence **3** CTA super-admin si rôle simulé. |
| **Epic 20** | **Aucun report** : l’Epic 20 arbitre la **classe C** ; la présente correction est du **rail A** (structure index admin). Epic 20 démarre **après** fermeture de ce SCP côté implémentation ou après **dérogations** explicites dans `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`. |

### 2.2 Chaîne technique (alignement non négociable)

Ordre de vérité à respecter pour le redressement :

1. **OpenAPI** : aucune nouvelle « source métier » dans le hub ; les boutons sont des **navigations** (déjà couvertes par routes / permissions existantes ou **contract-gap** documentés).
2. **ContextEnvelope** : visibilité **super-admin** et permissions **`transverse.admin.view`** (et dérivés) restent le **filtre** ; pas de branche parallèle « hardcodée » hors manifeste.
3. **Manifests CREOS** : `navigation-transverse-served.json`, `page-transverse-admin-reports-hub.json` — **un** layout clair : soit **un seul** widget porte les **6+3**, soit composition **strictement ordonnée** sans duplication fonctionnelle (pas deux grilles concurrentes).
4. **Runtime** : résolution `page_key`, `spaNavigateTo`, guards inchangés ; ajuster uniquement **données déclaratives** (slots, `widget_props`) et **widgets**.
5. **UserRuntimePrefs** : uniquement pour **présentation locale** (compact / densité) si déjà prévu — **pas** pour ajouter/supprimer des tuiles métier sur `/admin`.

### 2.3 Artefacts documentaires

- **`epics.md`** : renforcer les AC des stories citées (une phrase + renvoi matrice).
- **`peintre-nano/docs/03-contrats-creos-et-donnees.md`** : sous-section **Hub `/admin`** — invariant 6+3 + lien vers ce SCP.
- **Matrice parité** : une ligne ou note sur **ui-admin-15-4-home-index-dashboard** : critère **structure 6+3** explicite.

---

## 3. Approche recommandée

**Choix : Ajustement direct (option 1 du checklist)** — pas de rollback massif du hub 18.1 ; **recadrage** des livrables.

1. **Trancher l’autorité UI** sur `/admin` :  
   - **Option A (recommandée)** : **`admin.legacy.dashboard.home`** est la **seule** grille **6+3** ; le hub **`admin.reports.supervision.hub`** ne conserve que le **bandeau** / gap **K** / liens **secondaires** hors des 6 (ou est retiré du slot principal jusqu’à contrat lecture `/v1/admin/reports/`).  
   - **Option B** : refondre **`AdminReportsSupervisionHubWidget`** pour qu’il **consomme** une liste **CREOS** (manifest / JSON) **isomorphe** au legacy 6+3 + bloc super-admin, et retirer la duplication du widget legacy — **plus** de travail, à n’envisager que si le PO veut **un** composant unique.

2. **Corriger la 4e tuile** dans `AdminLegacyDashboardHomeWidget.tsx` : réaligner sur **Sessions de Caisse** → `/admin/session-manager` (icône / libellé comme legacy), et placer **Caisses enregistrées** (`/admin/cash-registers`) comme entrée **17.2** via nav transverse ou tuile **hors** des 6 si dérogation.

3. **Mettre à jour les tests** : `navigation-transverse-served-5-1.test.ts`, e2e `navigation-transverse-5-1.e2e.test.tsx`, et tests unitaires du widget hub — **comptage** des `data-testid` ou rôles pour les CTA du bloc « Navigation principale ».

4. **Effort / risque** : effort **M** ; risque **M** (régression e2e hub, double navigation retirée) ; **pas** de glissement Epic 20 si la passe tient **≤ 1 sprint** focalisé.

---

## 4. Artefacts à corriger (liste actionnable)

| Artefact | Action |
|----------|--------|
| `contracts/creos/manifests/page-transverse-admin-reports-hub.json` | Réordonner / retirer slot redondant ; textes d’en-tête alignés sur **un** modèle (6+3). |
| `peintre-nano/src/domains/admin-config/AdminReportsSupervisionHubWidget.tsx` | Réduire ou reparamétrer `SupervisionEntryButtons` pour ne **pas** dupliquer les 6 raccourcis legacy ; aligner titres sur **Rapports / gap K** uniquement si option A. |
| `peintre-nano/src/widgets/admin/AdminLegacyDashboardHomeWidget.tsx` | Restaurer tuile 4 = **session-manager** ; texte d’aide retiré ou déplacé vers `contract-gap` / doc. |
| `contracts/creos/manifests/navigation-transverse-served.json` | Vérifier cohérence des `path` avec les 6 destinations (aucune entrée « fantôme » depuis le hub). |
| `peintre-nano/.../prune-navigation-for-live-toolbar.ts` + `toolbar-selection-for-live-path.ts` | Vérifier qu’aucune **prune** n’ôte une entrée requise pour la preuve 6+3 ou la sélection active sur `/admin`. |
| Tests `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`, e2e, unitaires hub / legacy | Ajouter assertions **6+3** (sélecteurs stables). |
| `_bmad-output/planning-artifacts/epics.md` | AC **18.1**, **18.3**, mentions **17.x / 19.1** : référence explicite **DashboardHomePage.jsx** + ce SCP. |
| `peintre-nano/docs/03-contrats-creos-et-donnees.md` | Paragraphe hub `/admin` + chaîne OpenAPI → … → UserRuntimePrefs. |

---

## 5. Handoff

| Rôle | Responsabilité |
|------|----------------|
| **PO (Strophe)** | Valider **option A vs B** ; signer les **dérogations** matrice si une tuile des 6 reste impossible (route non manifestée → alors **NEEDS_HITL** explicite avec contournement temporaire documenté). |
| **SM / create-story** | Mettre à jour les stories **18.1**, **18.3**, **17.1**, **17.2**, **19.1** avec AC mesurables (nombre de boutons, `href`/routes, super-admin conditionnel). |
| **Dev / Story Runner** | Implémenter le tableau §4, ouvrir PR unique ou deux au plus (manifest + widget + tests). |
| **QA** | Exécuter e2e 4444 vs matrice ; comparer 4445 en **HITL** pour confirmation visuelle finale. |

**Critères de succès** : sur `/admin`, avec compte admin **non** super-admin → **exactement 6** CTA « Navigation principale » aux **mêmes intentions** que le legacy ; avec **super-admin** → **+3** CTA dans le bloc distinct ; **aucune** seconde grille parallèle sans rôle documenté ; build + tests contrat + e2e verts.

---

## 6. Références croisées

- Legacy : `recyclique-1.4.4/frontend/src/pages/Admin/DashboardHomePage.jsx`
- Matrice : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (ligne **ui-admin-15-4-home-index-dashboard**)
- SCP voisin (parité caisse, méthode) : `sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`

---

*Fin du document — révision attendue après validation PO (NEEDS_HITL → PASS).*
