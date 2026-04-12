# Stories de redressement documentaire — hub `/admin` (avant Epic 20)

**Date :** 2026-04-12  
**Contexte :** corriger la dérive de structure (cohérence **4444** Peintre vs **4445** legacy) sur le périmètre **`/admin`** avant l’Epic 20 (rail **P**, arbitrages classe C). Aucune implémentation dans ce livrable : pilotage et critères d’exécution pour stories BMAD ultérieures.

**Source de vérité legacy (non négociable) :** `recyclique-1.4.4/frontend/src/pages/Admin/DashboardHomePage.jsx`

| Bloc | # | Libellé | Route |
|------|---|---------|-------|
| Navigation principale | 1 | Utilisateurs & Profils | `/admin/users` |
| | 2 | Groupes & Permissions | `/admin/groups` |
| | 3 | Catégories & Tarifs | `/admin/categories` |
| | 4 | Sessions de Caisse | `/admin/session-manager` |
| | 5 | Sessions de Réception | `/admin/reception-sessions` |
| | 6 | Activité & Logs | `/admin/audit-log` |
| Super-Admin (`role === 'super-admin'`) | 7 | Santé Système | `/admin/health` |
| | 8 | Paramètres Avancés | `/admin/settings` |
| | 9 | Sites & Caisses | `/admin/sites-and-registers` |

**Dérive actuelle (constat technique — pour cadrage stories, pas action code ici) :**

- **Manifeste / page :** `page-transverse-admin-reports-hub.json` oriente le `page_key` vers un hub « rapports / supervision » avec textes d’écart K, alors que le legacy est un **tableau de bord d’administration** avec grille 6+3.
- **Double logique hub / widget :** même page empile `admin.reports.supervision.hub` (`AdminReportsSupervisionHubWidget`) et `admin.legacy.dashboard.home` (`AdminLegacyDashboardHomeWidget`) — intentions et libellés non hiérarchisés dans le contrat CREOS.
- **« Prune toolbar à 4 » :** à ne pas confondre avec le hub — `pruneNavigationEntriesForLiveToolbar` (`peintre-nano/src/runtime/prune-navigation-for-live-toolbar.ts`) limite volontairement la **barre transverse** à quatre entrées (Tableau de bord, Caisse, Réception, Administration), en parité avec `Header.jsx` legacy. Le redressement porte sur le **contenu `/admin`**, pas sur l’élargissement de cette barre sans décision produit.

**Dépendance Epic 20 :** Epic 20 (`epics.md` § Epic 20) arbitre les surfaces classe **C** ; ces quatre stories de redressement **précèdent** ou **bloquent** toute extension de scope admin ambiguë jusqu’à ce que le hub 6+3 soit normatif et prouvé.

---

## Liste proposée (4 stories max, ordre recommandé)

### ADM-RED-01 — Canon hub `/admin` : grille 6+3 et constat d’écart 4444 / 4445

**Objectif :** figer une fiche normative unique (libellés, routes, condition super-admin) et la comparer à l’état observable Peintre (titres H1, ordre des blocs, présence des neuf CTA).

**AC (courts) :**

- Fiche canon recopie la table ci-dessus avec la même sémantique que `DashboardHomePage.jsx`.
- Écart explicite : titre de page / premier bloc vs legacy ; rôle de `AdminLegacyDashboardHomeWidget` (déjà miroir 6+3 dans le code) vs ce que voit l’utilisateur (masquage, ordre, doublon avec le hub supervision).
- Référence croisée : matrice parité (extension ligne dédiée « hub admin 6+3 ») ou note dans `peintre-nano/docs/03-contrats-creos-et-donnees.md` § admin hub — **rédaction documentaire uniquement**.

**Dépendances :** aucune. **Bloque :** ADM-RED-02, ADM-RED-03, ADM-RED-04.

---

### ADM-RED-02 — Décision d’assemblage CREOS : fin de la double vérité hub / widget sur `/admin`

**Objectif :** trancher par écrit le rôle de chaque slot sous `transverse-admin-reports-hub` : supervision / rapports vs « home admin » legacy ; ordre des slots ; titres et `widget_type` cibles (sans PR code dans cette story documentaire).

**AC :**

- Schéma cible « un utilisateur comprend une entrée unique vers les six domaines » ; si deux blocs coexistent, règle de titrage (ex. section secondaire clairement nommée) et pas de duplication de destinations sans raison métier.
- Liste des fichiers contrat impactés (`page-transverse-admin-reports-hub.json`, éventuellement manifests dérivés) pour la story d’implémentation suivante.
- Alignement avec la recommandation architecture admin (**15.5**) : pas de seconde vérité implicite.

**Dépendances :** ADM-RED-01. **Parallélisable avec :** ADM-RED-03 après ADM-RED-01.

---

### ADM-RED-03 — Barre transverse « quatre entrées » vs accès aux six domaines admin

**Objectif :** documenter que la prune à quatre IDs est **intentionnelle** pour la parité `Header.jsx` ; définir si le seul point d’accès aux six intentions reste le hub `/admin` (acceptable) ou si un complément UI (sous-nav admin, menu) est requis — **décision produit courte**, sans code ici.

**AC :**

- Une section « périmètre toolbar vs hub » référence `LIVE_LEGACY_TOOLBAR_ENTRY_IDS` et le legacy.
- Si décision « hub seul » : critère d’acceptation pour les futures stories : les six routes sont atteignables en un clic depuis `/admin` pour un admin standard.
- Si décision « complément » : esquisse d’impact sur manifests / shell (pour create-story ultérieur).

**Dépendances :** ADM-RED-01.

---

### ADM-RED-04 — Protocole de preuve et gate avant Epic 20

**Objectif :** checklist rejouable (4445 legacy / 4444 Peintre) pour valider les **six** boutons principaux visibles pour un admin site, et les **trois** boutons super-admin avec un compte `super-admin` ; capture ou séquence MCP si disponible, sinon **NEEDS_HITL** (même esprit que `2026-04-12_07_preuve-parite-admin-surfaces-caisse-18-3-needs-hitl.md`).

**AC :**

- Checklist numérotée 1–6 + 7–9 avec URL attendue après clic.
- Lien vers la ligne matrice / preuve archive.
- Critère de **gate** : Epic 20.1 ne traite pas de surfaces classe C qui contredisent le canon ADM-RED-01 sans arbitrage explicite.

**Dépendances :** ADM-RED-01 ; idéalement ADM-RED-02 et ADM-RED-03 clos pour éviter les reprises de preuve.

---

## Synthèse ordre et graphe

1. **ADM-RED-01** (fondation normative)  
2. **ADM-RED-02** et **ADM-RED-03** en parallèle une fois 01 livré  
3. **ADM-RED-04** en dernier (preuve + gate Epic 20)

**Réduction à 3 stories (si pilotage ultra-compact) :** fusionner **ADM-RED-03** dans **ADM-RED-01** (sous-section toolbar) et garder 01 / 02 / 04.

---

## Références rapides

- Legacy : `recyclique-1.4.4/frontend/src/pages/Admin/DashboardHomePage.jsx`
- Peintre : `contracts/creos/manifests/page-transverse-admin-reports-hub.json`, `AdminReportsSupervisionHubWidget.tsx`, `AdminLegacyDashboardHomeWidget.tsx`
- Prune transverse : `peintre-nano/src/runtime/prune-navigation-for-live-toolbar.ts`
- Epic 20 : `_bmad-output/planning-artifacts/epics.md` (Epic 20)
- Inventaire / archi admin : `references/artefacts/2026-04-12_01_inventaire-surfaces-admin-legacy-15-1.md`, `2026-04-12_03_recommandation-architecture-admin-peintre-nano-15-5.md`
