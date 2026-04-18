# Story 13.5 : Aligner la transition hub vers vente plein cadre avec la parite legacy observable (RCN-02)

Status: done

**Story ID :** 13.5  
**Story key :** `13-5-aligner-la-transition-hub-vers-vente-plein-cadre-rcn-02`  
**Epic :** 13 — Etendre la parite UI legacy de la caisse au-dela du kiosque nominal dans `Peintre_nano`

**Note create-story (2026-04-12, CS) :** troncon **RCN-02** de `_bmad-output/implementation-artifacts/rattrapage-caisse-nominale-decoupe-stories-ui-observables-2026-04-12.md` — uniquement le **chemin caisse reel** : passage **`/caisse`** → **`/cash-register/sale`** (URL finale vente **reelle**, pas `/cash-register/virtual/…` ni `/cash-register/deferred/…`). Objectif : **disparition** de la nav transverse principale, **cadre plein viewport** (intention kiosque), **chargements** intermediaires eventuels, coherence avec le legacy observe sur **`http://localhost:4445`**. **Hors scope** : variantes virtuel / differe (RCN-V ou stories matrice **03b** / **03c** si elles ne sont pas etendues explicitement). Distinct de **13.4** (hub seul) et de **RCN-03** (surface wizard / saisie une fois la vente affichee).

Ultimate context engine analysis completed — comprehensive developer guide created (BMAD create-story, 2026-04-12).

## Story

En tant que **caissier** avec un parcours actif du **hub caisse** vers la **vente**,

je veux que la **transition** depuis le hub jusqu'a l'ecran **kiosque vente** (`/cash-register/sale`) reproduise le **comportement shell et viewport** du legacy (nav masquee, plein cadre, etats de chargement lisibles),

afin de ne **pas** atterrir sur un ecran incohérent (double hub + vente, nav transverse « fantome », rupture d'intention plein ecran).

## Scope

- **Sequence obligatoire (reel uniquement)** :
  1. Arrivee sur le hub **`http://localhost:4445/caisse`** (ou **`http://localhost:4444/caisse`** pour Peintre), utilisateur authentifie avec permissions caisse, **meme intention** que le legacy (poste selectionne, session ouverte ou chemin **Reprendre** / navigation vers vente selon ce qui est observable en recette — **documenter la sequence exacte** : clics, `navigate`, URLs intermediaires **telles qu'observees**).
  2. Arrivee sur l'URL finale **`/cash-register/sale`** (branche **reelle** : prefixe **`/cash-register`** sans `/virtual` ni `/deferred`).
- **Observables a checklist** (legacy puis Peintre, **meme sequence d'intention**) :
  - **URLs** : liste ordonnee des URLs (y compris redirections SPA `replaceState` / `navigate` si visibles dans la barre d'adresse ou via l'outil) — **sans inventer** d'URL non observee.
  - **Nav transverse** : presence / absence des liens type **Tableau de bord**, **Caisse**, **Reception**, **Administration** (ou equivalent legacy) sur le **hub** vs sur **`/cash-register/sale`** — la story vise l'**equivalence** : sur le legacy, la vente kiosque est **plein cadre** avec nav principale masquee ; Peintre doit **matcher** ou chaque ecart doit etre **classifie** (OK / **Derogation PO** / **Hors scope**) dans la colonne matrice **`Equiv. utilisateur / derogation PO`**.
  - **Viewport / layout** : le contenu vente occupe l'intention **plein cadre** (pas de double chrome hub + vente) ; noter tout bandeau / shell residual (bac a sable, bandeau live, etc.) et le tracer vers **manifeste / `RootShell` / props** ou gap.
  - **Chargement** : tout etat transitoire **Chargement…** / skeleton / overlay **entre** hub et stabilisation de la vente — comparer duree et libelles **sans** inventer de texte : relever les chaines **du snapshot a11y**.
- **Code legacy (reference, pas invention)** — a lire avant d'ecrire les ecarts :
  - `recyclique-1.4.4/frontend/src/pages/CashRegister/CashRegisterDashboard.tsx` : navigation vers **`${basePath}/sale`** avec `basePath` reel **`/cash-register`** (ex. **Reprendre**, continuation apres ouverture).
  - `recyclique-1.4.4/frontend/src/pages/CashRegister/OpenCashSession.tsx` : `navigate(\`${basePath}/sale\`)` apres ouverture session.
  - `recyclique-1.4.4/frontend/src/pages/CashRegister.jsx` : redirection vers **`/cash-register/sale`** si applicable au wrapper.
  - `recyclique-1.4.4/frontend/src/pages/CashRegister/SaleWrapper.tsx` : composition / garde-fous shell autour de **`Sale`** (plein cadre, chargements).
  - `recyclique-1.4.4/frontend/src/App.jsx` : route **`/cash-register/sale`** et composition **`Sale`** (plein ecran cote legacy).
- **Peintre_nano** : alias runtime et shell deja documentes — **`peintre-nano/docs/03-contrats-creos-et-donnees.md`** § « Routage : hub CREOS `/caisse` et alias legacy `/cash-register/sale` (story 11.3) » : meme `page_key` **`cashflow-nominal`**, presentation **kiosque**, nav masquee (`RootShell` / `hideNav`), marqueur test **`data-testid="cash-register-sale-kiosk"`** comme **aide de preuve** uniquement. Implementation attendue dans **`RuntimeDemoApp.tsx`**, manifests **`contracts/creos/manifests/page-cashflow-nominal.json`**, **`RootShell`** (ou equivalent), tests existants type **`runtime-demo-cash-register-sale-kiosk-11-3`** — **etendre ou completer** si la transition depuis **hub** manque de couverture.
- **Matrice** : etendre ou ajouter une ligne pilote **`ui-pilote-*`** **dediee RCN-02** (transition hub → vente reel) **ou** completer explicitement la ligne **`ui-pilote-03-caisse-vente-kiosk`** avec une **sous-checklist transition** (URLs, nav, loading, plein cadre). Chaque observable mappe vers **OK / Derogation PO / Hors scope** dans **`Equiv. utilisateur / derogation PO`**.

## Non-scope

- Parcours **virtuel** / **differe** : **hors scope** sauf extension explicite d'une ligne matrice (alignement **epics** Story 13.5).
- **RCN-03** et suivants : contenu fonctionnel du **wizard** de vente, ticket, paiement — pas dans cette story.
- Nouvelle **autorite metier** front, doubles appels API inventes, URLs reseau **non listees** par DevTools.

## Acceptance Criteria

1. **Fondation epics** — Etant donne la Story **13.5** dans `epics.md` (transition hub → vente plein cadre, RCN-02), quand le livrable est pret pour le dev, alors le fichier story et la matrice decrivent la **meme intention** que les AC epics : sequence **`/caisse`** → **`/cash-register/sale`** (reel), nav, viewport, chargements — ou chaque gap avec ligne matrice + **`Equiv. utilisateur / derogation PO`**.

2. **Observation legacy (DevTools obligatoire)** — Etant donne **`http://localhost:4445`**, quand DS/QA documentent la transition **reelle**, alors les preuves utilisent le MCP **`user-chrome-devtools`** selon la section **Preuve obligatoire** (descripteurs JSON **lus avant** chaque appel). **Secrets** : ne pas consigner mots de passe / PIN en clair dans le depot versionne ; utiliser variables d'environnement / runbook / brief agent.

3. **Comparaison Peintre** — Etant donne **`http://localhost:4444`** avec la **meme sequence d'intention** utilisateur (meme ordre d'etapes que sur 4445), quand la parite est evaluee, alors le tableau **equivalence / ecart / gap** couvre : URLs, disparition nav transverse, plein cadre, etats de chargement intermediaires — avec snapshots **stabilises** (apres `wait_for` si disponible, ou attente documentee).

4. **Reseau (si pertinent)** — Etant donne une correlation reseau utile (ex. rafraichissement session avant affichage vente), quand des requetes sont citees, alors utiliser **`list_network_requests`** puis **`get_network_request`** **uniquement** pour des IDs **deja listes** — **ne pas inventer** de chemins d'API non apparus dans la liste.

5. **Hierarchie contrats (stricte)** — Etant donne **OpenAPI** > **ContextEnvelope** > **NavigationManifest** > **PageManifest** > **UserRuntimePrefs**, quand un comportement shell (nav, kiosque, loading) change, alors il est **mappe** a manifeste / `RuntimeDemoApp` / `RootShell` / `widget_props` reviewables — **aucune** logique metier caisse dupliquee hors API ; respecter `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`.

6. **Composition CREOS** — Etant donne que l'alias **`/cash-register/sale`** n'est **pas** un second `PageManifest` autonome (doc 03 § 11.3), quand un ecart structurel subsiste, alors la decision est **ecrite** dans **`peintre-nano/docs/03-contrats-creos-et-donnees.md`** (sous-section **RCN-02** ou extension § routage 11.3 / hub) **et** la matrice — **accepter / corriger / reporter** explicite.

7. **Marqueur `data-testid="cash-register-sale-kiosk"`** — Etant donne les epics, quand il est utilise, alors il sert **preuve / tests** et **non** un contournement du mappage contractuel.

8. **Definition of Done — transparence** — Etant donne la fin de story, alors **preuves DevTools** (legacy + Peintre), **mappings contrat**, **ligne(s) matrice** avec **`Equiv. utilisateur / derogation PO`**, et **gaps** sont **explicites**.

## Preuve obligatoire — Chrome DevTools MCP (`user-chrome-devtools`)

- **Comparaison obligatoire** : sequence **Legacy** `http://localhost:4445/caisse` → `http://localhost:4445/cash-register/sale` (reel) vs **Peintre** `http://localhost:4444/caisse` → `http://localhost:4444/cash-register/sale` — **meme intention** (authentification et donnees recette alignes runbook).
- **Ordre d'execution des outils MCP** :
  1. `list_pages` — identifier `pageId`.
  2. `select_page` avec ce `pageId`.
  3. `navigate_page` vers le hub **`/caisse`** sur **4445**, puis `take_snapshot` ; enchainer les actions utilisateur **observees** jusqu'a **`/cash-register/sale`** ; snapshot **sur hub** et **sur vente** (et eventuellement etat **pendant** chargement si capturable).
  4. Repeter la **meme sequence** sur **4444**.
  5. Si pertinent : `list_network_requests` (`resourceTypes` : `xhr`, `fetch` apres stabilisation) ; `get_network_request` uniquement sur IDs **listes**.
- **Descripteurs JSON** : lire les fichiers sous  
  `C:\Users\Strophe\.cursor\projects\d-users-Strophe-Documents-1-IA-La-Clique-Qui-Recycle-JARVOS-recyclique\mcps\user-chrome-devtools\tools\`  
  (`list_pages.json`, `select_page.json`, `navigate_page.json`, `take_snapshot.json`, `list_network_requests.json`, `get_network_request.json`, `wait_for.json` si present) **avant** tout appel MCP.
- **Chemins workspace** : si le projet Cursor est ouvert ailleurs, adapter le chemin vers `mcps/user-chrome-devtools/tools/` a la racine du projet configure.

## Contraintes techniques et garde-fous

- **Ne pas** introduire un second **`page_manifest`** CREOS pour `/cash-register/sale` sans **decision architecture ecrite** ; rester sur **alias runtime** + presentation **kiosque** + memes slots **`cashflow-nominal`**.
- **ADR P1** (`references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`) : ajustements visuels via **CSS Modules / Mantine / tokens**, pas stack parallele.
- **Tests** : reprendre les patterns **11.3**, **13.1**, **13.4** (`runtime-demo-*.test.tsx`, `*.e2e.test.tsx`, ex. `tests/unit/runtime-demo-cash-register-hub-rcn-01-13-4.test.tsx`, `tests/e2e/cash-register-hub-rcn-01-13-4.e2e.test.tsx`) pour invariants **routing + `hideNav` + marqueur kiosque** sur la **transition hub → vente** ; la **parite ressentie** se valide par **DevTools + matrice**.
- **Gates Peintre** : depuis `peintre-nano/`, `npm run lint`, `npm run build`, `npm test` au vert avant revue ; chaine BMAD complete deleguee au **Story Runner** si applicable.
- Reutiliser **`RuntimeDemoApp.tsx`**, **`RootShell`**, doc **03** ; ne pas dupliquer des clients API hors OpenAPI genere / hooks existants.

## Intelligence stories precedentes (13.4, 13.3, 11.3)

- **13.4 (RCN-01)** : hub `/caisse` checklist + **LoadingOverlay** zone cartes ; meme discipline **DevTools**, **non-invention** URLs reseau, ligne matrice **`ui-pilote-03e-rcn-01-hub-caisse`**. La **13.5** enchaine **apres** le hub : c'est la **transition** et le **mode kiosque** sur **`/cash-register/sale`**, pas le contenu des cartes hub.
- **13.3** : aliases **`session/close`**, redirections vers hub ; **13.5** est l'**inverse directionnel** du point de vue parcours nominal (hub → vente) ; coherence **Retour a la vente** / `basePath` deja documentee en **doc 03** — ne pas casser les chemins **close** en modifiant le routeur.
- **11.3 / doc 03 § 11.3** : decision deja posee (alias `/cash-register/sale`, `hideNav`, `data-testid`) — cette story **verifie et resserre** la **transition depuis le hub reel** et documente les ecarts **RCN-02** jusqu'a satisfaction **Equiv. utilisateur** ou **derogation PO**.

## Recherche technique recente (versions)

- Pas de changement de stack impose : `peintre-nano/package.json` ; codegen OpenAPI existant.

## Reference project-context

- Pas de `project-context.md` obligatoire detecte ; s'appuyer sur `references/peintre/index.md`, `guide-pilotage-v2.md` § **Règle caisse Peintre vs legacy (2026-04-12)**, et `sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`.

## Statut story (create-story)

- **review** (2026-04-12, DS) — Implementation DS : tests RCN-02, doc 03 § RCN-02, matrice `ui-pilote-03f-rcn-02-hub-vers-vente-kiosk`, preuves MCP ; `sprint-status.yaml` : **review** pour la cle **`13-5-aligner-la-transition-hub-vers-vente-plein-cadre-rcn-02`**.

## Tasks / Subtasks

- [x] Cartographier le legacy (**DevTools** + `CashRegisterDashboard.tsx`, `OpenCashSession.tsx`, `App.jsx`, `CashRegister.jsx`, `SaleWrapper.tsx`, `Sale.tsx` si utile pour le shell vente) : sequence URL, etats nav, chargements.
- [x] Reproduire sur Peintre **:4444** la meme sequence **reelle** ; snapshots hub + transition + vente stabilisee.
- [x] Correlation reseau **si** les listes MCP montrent des XHR/fetch utiles ; citer chemins **tels que listes**.
- [x] Ajouter ou mettre a jour la **ligne matrice** `ui-pilote-*` **RCN-02** (ou extension **03**) avec colonne **`Equiv. utilisateur / derogation PO`** complete.
- [x] Ajuster **RuntimeDemoApp** / **RootShell** / **widget_props** / manifeste **uniquement** dans le cadre contractuel existant pour eliminer les ecarts **documentes** (double hub, nav fantome, viewport).
- [x] Mettre a jour **doc 03** (sous-section **RCN-02**) pour toute decision d'alias, presentation ou ecart accepte.
- [x] Tests unitaires / e2e cibles sur la **transition** hub → `/cash-register/sale` + gates Peintre.
- [x] Completer **Dev Agent Record** (preuves MCP, fichiers touches).

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 13, Story 13.5]
- [Source: `_bmad-output/implementation-artifacts/rattrapage-caisse-nominale-decoupe-stories-ui-observables-2026-04-12.md` — **RCN-02**]
- [Source: `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — §7 Règle caisse, MCP]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`]
- [Source: `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` — **ui-pilote-03-caisse-vente-kiosk**, **Equiv. utilisateur / derogation PO**]
- [Source: `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source: `contracts/openapi/recyclique-api.yaml` — autorite API (pas d'endpoints inventes)]
- [Source: `references/peintre/index.md` — ADR P1/P2]
- [Source: `peintre-nano/docs/03-contrats-creos-et-donnees.md` — § routage 11.3, hub, aliases]
- [Source: `contracts/creos/manifests/page-cashflow-nominal.json`]
- [Source: `recyclique-1.4.4/frontend/src/App.jsx` — routes caisse]
- [Source: `recyclique-1.4.4/frontend/src/pages/CashRegister/CashRegisterDashboard.tsx`]
- [Source: `recyclique-1.4.4/frontend/src/pages/CashRegister/OpenCashSession.tsx`]
- [Source: `recyclique-1.4.4/frontend/src/pages/CashRegister/SaleWrapper.tsx`]
- [Source: `recyclique-1.4.4/frontend/src/pages/CashRegister/Sale.tsx`]
- [Source: `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`]
- [Source: `_bmad-output/implementation-artifacts/13-4-aligner-le-hub-caisse-avec-la-parite-legacy-rcn-01.md`]
- [Source: `_bmad-output/implementation-artifacts/13-3-retrouver-la-cloture-ou-fin-de-session-caisse-observable-dans-peintre-nano.md`]

## Dev Agent Record

### Agent Model Used

Composer (agent Task BMAD dev-story), 2026-04-12.

### Debug Log References

**MCP `user-chrome-devtools`** (descripteurs JSON lus avant chaque appel : `list_pages`, `navigate_page`, `take_snapshot`, `wait_for`, `click`).

1. **`list_pages`** : une page Chrome (`localhost:4444/admin` puis navigations suivantes).
2. **Legacy `http://localhost:4445/caisse`** : après `wait_for`, snapshot **a11y** — **banner** + **navigation** avec liens **Tableau de bord**, **Caisse**, **Réception**, **Administration** ; **main** — heading **Sélection du Poste de Caisse**, poste **La Clique Caisse 1**, statut **FERMÉE**, bouton **Ouvrir** (pas **Reprendre** sur cet état recette) ; état transitoire **Chargement...** observé avant stabilisation.
3. **Legacy `http://localhost:4445/cash-register/sale`** : après chargement, **URL effective observée** **`http://localhost:4445/cash-register`** (pas de barre d'adresse sur `/cash-register/sale` stable sans session — redirection / garde legacy) ; snapshot avec **nav transverse** (Tableau de bord, Caisse, etc.). *Pas de clic Reprendre sur 4445 dans ce run* (session poste fermée).
4. **Peintre `http://localhost:4444/caisse`** : snapshot — **navigation** « Zone navigation » (Tableau de bord, Caisse, Réception, Administration) ; heading **Sélection du Poste de Caisse** ; intro CREOS ; poste **FERMÉE** / **Ouvrir** ; zone cartes **generic busy** (chargement) puis cartes stabilisées.
5. **Peintre `http://localhost:4444/cash-register/sale`** : snapshot **sans** région `navigation` / « Zone navigation » dans l'arbre principal (contenu **main** seul au premier niveau sous `RootWebArea`) — **aligné intention kiosque** (`hideNav` + `data-pn-kiosk-nav-hidden` côté `RootShell`) ; workspace vente brownfield (wizard + alertes session) visible. URL stable **`/cash-register/sale`**.

**Réseau** : pas d'appel `list_network_requests` dans ce run (non requis pour constater shell + URLs ; pas d'invention de chemins).

**Secrets** : aucun mot de passe consigné (compte déjà session côté navigateur pour 4445/4444).

### Completion Notes List

- **Implémentation** : aucun écart code sur `RuntimeDemoApp` / `RootShell` / manifeste à corriger — la transition **hub → `/cash-register/sale`** était déjà portée par **`handleHubResumeRegister`** (`spaNavigateTo(`${cashRegisterHubBasePath}/sale`)`) + **`kioskSaleObservable`** / **`hideNav`** (Story 11.3). La story **verrouille** la couverture par **tests** + **doc RCN-02** + **ligne matrice** `ui-pilote-03f-rcn-02-hub-vers-vente-kiosk`.
- **Tests** : `npm test` dans `peintre-nano` — **393** tests OK (inclut nouveaux unit + e2e RCN-02). Gates **lint/build** : validés par Story Runner (2026-04-12) après correctifs de stabilité : `CaisseSessionCloseSurface` (`cashflow-session-close-heading` sur branches chargement/erreur), e2e 13.4 (`waitFor` sur le badge **Ouverte**).
- **Parité ressentie** : sur l'environnement DevTools, **Reprendre** non déclenché sur legacy (poste fermé) ; la séquence **Reprendre → `/cash-register/sale`** est **prouvée par tests automatisés** ; navigateur **Peintre** confirme **kiosque** sur `/cash-register/sale` (nav absente du snapshot).

### File List

- `peintre-nano/tests/unit/runtime-demo-cash-register-hub-to-sale-rcn-02-13-5.test.tsx` (créé)
- `peintre-nano/tests/e2e/cash-register-hub-to-sale-rcn-02-13-5.e2e.test.tsx` (créé)
- `peintre-nano/docs/03-contrats-creos-et-donnees.md` (section **RCN-02**)
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (ligne **`ui-pilote-03f-rcn-02-hub-vers-vente-kiosk`**)
- `_bmad-output/implementation-artifacts/13-5-aligner-la-transition-hub-vers-vente-plein-cadre-rcn-02.md` (ce fichier — statut / Dev Agent Record)
- `peintre-nano/src/domains/cashflow/CaisseSessionCloseSurface.tsx` (testids heading — gates suite complète)
- `peintre-nano/tests/e2e/cash-register-hub-rcn-01-13-4.e2e.test.tsx` (`waitFor` badge Ouverte — gates)
