# Story 13.4 : Aligner le hub caisse (`/caisse`) avec la parite UI legacy observable (RCN-01)

Status: done

**Story ID :** 13.4  
**Story key :** `13-4-aligner-le-hub-caisse-avec-la-parite-legacy-rcn-01`  
**Epic :** 13 — Etendre la parite UI legacy de la caisse au-dela du kiosque nominal dans `Peintre_nano`

**Note create-story (2026-04-12, CS) :** troncon **RCN-01** de `_bmad-output/implementation-artifacts/rattrapage-caisse-nominale-decoupe-stories-ui-observables-2026-04-12.md` — hub **`/caisse`** (titre zone postes, cartes postes, **Ouvrir** / **Reprendre**, cartes virtuel / differe si visibles, shell transverse). Elle **complete** la ligne matrice **`ui-pilote-03a-…`** (adjacents / hub deja partiellement preuvee en 13.1) par une **checklist hub dediee** et des **ecarts / gaps** explicites si l'observable 4444 diverge. Distincte de **RCN-02** (transition hub → vente plein cadre) : ici seulement l'**ecran hub** et son intention « voir ou j'en suis et entrer en session de vente ».

Ultimate context engine analysis completed — comprehensive developer guide created (BMAD create-story, 2026-04-12).

## Story

En tant que **caissier ou superviseur**,

je veux que le **hub caisse** (`/caisse`) expose la **meme structure observable**, libelles et affordances que le **legacy de reference**,

afin de voir clairement **ou j'en suis** et **comment entrer dans une session de vente** sans ecart trompeur entre legacy et `Peintre_nano`.

## Scope

- **Route et code legacy (reference, pas invention)** :
  - `recyclique-1.4.4/frontend/src/App.jsx` : route **`/caisse`** → `ProtectedRoute` avec permissions `caisse.access` | `caisse.virtual.access` | `caisse.deferred.access` → composant **`CashRegister`** (wrapper vers le dashboard).
  - **Surface hub** : `recyclique-1.4.4/frontend/src/pages/CashRegister/CashRegisterDashboard.tsx` — titre de zone postes, cartes poste (`Title` nom, localisation optionnelle, badge **Ouverte** / **Fermée** — casse et libellés exacts a confirmer par snapshot legacy), boutons **Ouvrir** / **Reprendre**, blocs **Caisse virtuelle** / **Saisie différée** (badges, CTA type **Simuler** / **Accéder** selon permissions), menu super-admin si applicable, **LoadingOverlay** pendant chargement.
- **Peintre_nano** : route **`/caisse`**, `page_key` **`cashflow-nominal`** (`contracts/creos/manifests/page-cashflow-nominal.json`), composition runtime **`RuntimeDemoApp.tsx`**, widget principal **`CaisseBrownfieldDashboardWidget.tsx`**, donnees statut postes **`use-cash-registers-status.ts`** / OpenAPI aligne `GET /v1/cash-registers/status` (deja documente doc 03 / 13.1).
- **Matrice** : ajouter une ligne pilote **`ui-pilote-*`** **dediee hub RCN-01** ou **etendre** explicitement la colonne preuve de **`ui-pilote-03a-caisse-adjacents-kiosque`** avec une sous-checklist **hub seul** (titres, cartes, CTA, shell) — **liste blanche** : rien n'est « in-scope parite hub » sans ligne matrice explicite et statut gere.

## Non-scope

- **POST ouverture de session** et regles metier d'ouverture : hors scope fonctionnel sauf si l'**observable** (libelles, desactivation boutons, messages d'erreur visibles) **diverge** du legacy — dans ce cas documenter l'ecart, ne pas re-specifier la politique metier (Epic 6, stories 6.x).
- Parcours **RCN-02** (transition vers `/cash-register/sale`, shell kiosque) : story separee / epic suite.
- Sync Paheko, compta, inventaire complet des variantes hors hub (deja 13.2 pour variantes matrice).

## Acceptance Criteria

1. **Fondation epics** — Etant donne la Story **13.4** dans `epics.md` (hub `/caisse`, parite observable RCN-01), quand le livrable est pret pour le dev, alors le fichier story + la matrice decrivent les **memes intentions** que les AC epics : checklist elements visibles (titres zone postes, cartes postes, actions **Ouvrir** / **Reprendre**, indices shell) ou **chaque gap** avec ligne matrice + note contrat.

2. **Observation legacy (DevTools obligatoire)** — Etant donne **`http://localhost:4445/caisse`** avec un utilisateur **authentifie** disposant des permissions caisse (session manuelle ou scenario agent), quand DS/QA documentent la parite hub, alors les preuves utilisent le MCP **`user-chrome-devtools`** selon la section **Preuve obligatoire** (lecture des descripteurs JSON **avant** chaque appel). **Secrets** : ne pas consigner dans les fichiers **versionnes** du depot les mots de passe / PIN de recette ; utiliser uniquement les **variables d'environnement locales**, le **runbook non versionne**, ou le **brief agent** pour les valeurs — jamais de credentials en clair dans les commits.

3. **Comparaison Peintre** — Etant donne **`http://localhost:4444/caisse`** (`VITE_LIVE_AUTH` selon runbook du projet), quand les **memes intentions** utilisateur sont rejouees (meme ordre de navigation que sur 4445), alors le tableau **equivalence / ecart accepte nomme / gap** couvre chaque point de checklist hub (y compris etats **chargement** et **liste vide** si observables).

4. **Reseau (si pertinent)** — Etant donne le hub charge des donnees postes, quand une correlation reseau aide la parite, alors `list_network_requests` (filtre `xhr` / `fetch` si utile) + eventuellement `get_network_request` sur les requetes **reellement listees** — **ne pas inventer** d'URLs non vues ; citer les chemins tels qu'apparus (ex. familles deja observees cote legacy : `users/me`, `permissions`, `cash-registers/status`, `cash-sessions/status/...`, `activity/ping` — **ajuster aux captures**).

5. **Hierarchie contrats (stricte)** — Etant donne l'ordre **OpenAPI** > **ContextEnvelope** > **NavigationManifest** > **PageManifest** > **UserRuntimePrefs**, quand un bloc UI du hub est affiche, alors il est **mappe** a une source reviewable ou etiquete **gap / differe** ; **aucune** logique metier caisse ne devient source de verite dans le **frontend** (`references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`).

6. **Richesse route legacy vs slice CREOS** — Etant donne que le hub legacy et le hub Peintre peuvent differer par **composition** ou **widget_props**, quand la story est acceptee, alors tout ecart structurel est **ecrit** dans `peintre-nano/docs/03-contrats-creos-et-donnees.md` (section hub / RCN-01 ou sous-section dediee) **et** la matrice — **pas d'equivalence silencieuse**.

7. **Autorite Epic 6** — Etant donne la revue, quand on valide la story, alors la preuve demontre la **parite UI hub** sans **redefinir** les regles metier caisse.

8. **Definition of Done — transparence** — Etant donne la visibilite operateur du hub, quand la story est acceptee, alors **preuves DevTools** (legacy + Peintre), **mappings contrat**, et **gaps residuels** sont **explicites**.

## Preuve obligatoire — Chrome DevTools MCP (`user-chrome-devtools`)

- **Comparaison obligatoire** : **Legacy** `http://localhost:4445/caisse` vs **Peintre** `http://localhost:4444/caisse` pour la **meme intention** (arrivee sur le hub apres auth, eventuellement rafraichissement / retour arriere si le scenario le exige).
- **Ordre d'execution des outils MCP** (meme onglet ou onglets distincts, une **page selectionnee** a la fois) :
  1. `list_pages` — identifier `pageId` cible.
  2. `select_page` avec ce `pageId`.
  3. `navigate_page` (`type: "url"`) vers **`http://localhost:4445/caisse`**, puis snapshot ; repeter avec **`http://localhost:4444/caisse`** (ou inverser l'ordre, mais **les deux** URLs hub doivent etre couvertes avec la meme intention utilisateur).
  4. `take_snapshot` (arbre a11y ; preferer snapshot a screenshot pour la checklist textuelle).
  5. Si pertinent : `list_network_requests` (ex. `resourceTypes: ["xhr","fetch"]`) apres stabilisation du chargement ; `get_network_request` uniquement pour des IDs **deja listes**.
- **Descripteurs JSON** : **lire** les fichiers sous  
  `C:\Users\Strophe\.cursor\projects\d-users-Strophe-Documents-1-IA-La-Clique-Qui-Recycle-JARVOS-recyclique\mcps\user-chrome-devtools\tools\`  
  (ex. `list_pages.json`, `select_page.json`, `navigate_page.json`, `take_snapshot.json`, `list_network_requests.json`, `get_network_request.json`) **avant** tout appel `call_mcp_tool` / equipement agent — valider noms de parametres (`type`, `url`, `pageId`, `verbose`, `resourceTypes`, etc.).
- **Equivalents chemins** : si le workspace Cursor est ouvert ailleurs, retrouver `mcps/user-chrome-devtools/tools/*.json` a la racine du projet Cursor configure.

## Contraintes techniques et garde-fous

- **Hub** : conserver le **canon** CREOS `page_key` **`cashflow-nominal`** sur **`/caisse`** ; les ajustements passent par **manifeste**, **`widget_props`**, **RuntimeDemoApp** (composition slots), et **textes** — pas un second `PageManifest` implicite sans decision ecrite.
- **Donnees postes** : reutiliser les clients / hooks existants (`use-cash-registers-status.ts`, operations OpenAPI generees) ; ne pas dupliquer des appels ad hoc.
- **Tests** : suivre les patterns **13.1** / **13.3** (`runtime-demo-*.test.tsx`, `*.e2e.test.tsx`) pour invariants routage + rendu hub ; la **parite visuelle fine** reste bornee aux **preuves DevTools** + matrice.

## Intelligence stories precedentes (13.1, 13.2, 13.3)

- **13.1** : a deja couvert une **partie** du hub dans **`ui-pilote-03a`** (heading **Selection du Poste de Caisse**, poste + **Fermee** + **Ouvrir**, sections virtuel / differe) ; **13.4** exige une **checklist hub complete** RCN-01 et une **synthese** equivalence / gap **dediee** (pas seulement les adjacents « autour » du kiosque).
- **13.2 / 13.3** : discipline **DevTools**, matrice liste blanche, alias runtime documentes dans **doc 03** ; memes exigences de **non-fuite** secrets et de **non-invention** d'URLs reseau.
- **Doc 03** § routage hub / aliases : toute nouvelle nuance hub vs legacy doit **completer** `peintre-nano/docs/03-contrats-creos-et-donnees.md` en coherence avec les sections 11.3 / 13.1 / 13.2 / 13.3.

## Recherche technique recente (versions)

- Pas de changement de stack attendu : `peintre-nano/package.json` ; codegen OpenAPI existant.

## Reference project-context

- Pas de `project-context.md` obligatoire detecte ; s'appuyer sur `references/index.md` et les artefacts listes ci-dessous.

## Statut story (create-story)

- **done** (2026-04-12) — Story Runner : DS + gates + QA + CR (Changes Requested → correctif libellé permission sans caisse) + gates + CR2 APPROVED ; sprint **done**.

## Tasks / Subtasks

- [x] Cartographier le legacy (**DevTools** + `CashRegisterDashboard.tsx`, `App.jsx`) : checklist hub (titres, badges, CTA, menus, loading) + URLs exactes.
- [x] Reproduire sur Peintre `:4444` la meme checklist ; noter ecarts shell, textes, ordre des blocs.
- [x] Correlation reseau **si** les listes MCP montrent des XHR/fetch utiles ; mapper aux `operationId` ou noter gap.
- [x] Ajouter ou mettre a jour la **ligne matrice** `ui-pilote-*` **RCN-01 hub** (ou extension tracee de 03a) ; lier OpenAPI / CREOS / preuves.
- [x] Ajuster **manifeste** / **widget_props** / **RuntimeDemoApp** / **CaisseBrownfieldDashboardWidget** pour rapprocher l'observable **sans** metier front nouveau.
- [x] Mettre a jour **doc 03** pour toute decision d'alias ou d'ecart accepte hub.
- [x] Tests unitaires / e2e cibles + gates (delegue Story Runner si chaine complete).
- [x] Completer **Dev Agent Record** (preuves, fichiers touches).

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 13, Story 13.4]
- [Source: `_bmad-output/implementation-artifacts/rattrapage-caisse-nominale-decoupe-stories-ui-observables-2026-04-12.md` — section **RCN-01**]
- [Source: `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` — pilotes **03a** et suivants]
- [Source: `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source: `peintre-nano/docs/03-contrats-creos-et-donnees.md` — hub `/caisse`, routage 11.3 / 13.x]
- [Source: `contracts/creos/manifests/page-cashflow-nominal.json`]
- [Source: `recyclique-1.4.4/frontend/src/App.jsx` — route `/caisse`]
- [Source: `recyclique-1.4.4/frontend/src/pages/CashRegister/CashRegisterDashboard.tsx`]
- [Source: `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`]
- [Source: `peintre-nano/src/domains/cashflow/CaisseBrownfieldDashboardWidget.tsx`]
- [Source: `peintre-nano/src/domains/cashflow/use-cash-registers-status.ts`]
- [Source: `_bmad-output/implementation-artifacts/13-1-retrouver-les-ecrans-caisse-adjacents-au-kiosque-observable-dans-peintre-nano.md`]
- [Source: `_bmad-output/implementation-artifacts/13-3-retrouver-la-cloture-ou-fin-de-session-caisse-observable-dans-peintre-nano.md` — structure preuve DevTools]

## Dev Agent Record

### Agent Model Used

Sous-agent Task BMAD bmad-dev-story (DS), 2026-04-12.

### Debug Log References

**Preuves MCP `user-chrome-devtools` (2026-04-12)** — descripteurs JSON lus avant appels ; flux `list_pages` → `select_page` → `navigate_page` → `wait_for` / `take_snapshot` → `list_network_requests` (URLs non inventees).

- **Legacy** `http://localhost:4445/caisse` : apres attente, snapshot a11y — heading **Sélection du Poste de Caisse**, **La Clique Caisse 1**, **Entrée Principale**, **FERMÉE**, **Ouvrir**, cartes **Caisse Virtuelle** (**SIMULATION**, **Simuler**), **Saisie différée** (**ADMIN**, **Accéder**), nav transverse ; etat transitoire **Chargement...** observe avant stabilisation. Reseau (familles listees) : `users/me`, `users/me/permissions`, `cash-registers/status`, `activity/ping`, etc.
- **Peintre** `http://localhost:4444/caisse` : memes intentions — heading + cartes + CTA ; intro manifeste + etat chargement postes puis contenu ; reseau : `users/me/context`, `cash-sessions/current`, `cash-registers/status` (chemins tels que listes par l'outil).

Aucune valeur de secret recette consignee dans les fichiers versionnes (AC2).

### Completion Notes List

- Ligne matrice **`ui-pilote-03e-rcn-01-hub-caisse`** : checklist hub, mappings CREOS / OpenAPI, equivalences et gaps (intro CREOS, menu admin legacy, LoadingOverlay zone cartes).
- Section **`peintre-nano/docs/03-contrats-creos-et-donnees.md`** : **Hub `/caisse` — parité observable RCN-01 (Story 13.4)**.
- **`CaisseBrownfieldDashboardWidget`** : **LoadingOverlay** Mantine sur la zone cartes hub lors du chargement `GET /v1/cash-registers/status` (alignement intention chargement vs legacy).
- Tests : `runtime-demo-cash-register-hub-rcn-01-13-4.test.tsx`, `cash-register-hub-rcn-01-13-4.e2e.test.tsx` ; **386** tests `vitest run` OK (post-QA chargement / liste vide).
- Story Runner : **cr_loop** = 1 — correctif **« Vous n'avez accès à aucune caisse. »** (suppression double négation) dans `CaisseBrownfieldDashboardWidget.tsx`.

### File List

- `peintre-nano/src/domains/cashflow/CaisseBrownfieldDashboardWidget.tsx`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `peintre-nano/tests/unit/runtime-demo-cash-register-hub-rcn-01-13-4.test.tsx`
- `peintre-nano/tests/e2e/cash-register-hub-rcn-01-13-4.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/tests/test-summary.md`
- `_bmad-output/implementation-artifacts/13-4-aligner-le-hub-caisse-avec-la-parite-legacy-rcn-01.md`

## Change Log

- 2026-04-12 — DS : matrice RCN-01 hub, doc 03, overlay chargement hub, tests + sprint **review**.
- 2026-04-12 — Story Runner : QA (scénarios chargement / liste vide), CR, correctif libellé FR, CR2 ; sprint + story **done** ; **epic-13** **done**.
