# Story 13.1 : Retrouver les ecrans caisse adjacents au kiosque observable dans `Peintre_nano`

Status: done

**Story ID :** 13.1  
**Story key :** `13-1-retrouver-les-ecrans-caisse-adjacents-au-kiosque-observable-dans-peintre-nano`  
**Epic :** 13 — Etendre la parite UI legacy de la caisse au-dela du kiosque nominal dans `Peintre_nano`

**Note create-story (2026-04-11) :** suite directe de la fondation 11.3 (kiosque nominal technique). Cette story elargit la **parite UI observable** aux etats **immediatement avant ou apres** le flux kiosque nominal, avec preuves Legacy vs Peintre et bornes contractuelles explicites. Epic 6 reste l'autorite fonctionnelle caisse ; pas de nouvelles regles metier ici.

## Story

En tant que **caissier avec une session active**,

je veux que les etats UI **juste avant ou juste apres** le parcours de vente kiosque nominal dans `Peintre_nano` se rapprochent du comportement legacy observe (shell, contexte, transitions),

afin que le chemin migre ne s'arrete pas sur un ecran kiosque isole trompeur par rapport au terrain.

## Scope (a figer par observation DevTools)

- **Perimetre borne** : ecrans et transitions **adjacents** au kiosque nominal deja couvert par 11.3 — typiquement : arrivee depuis le hub caisse, selection / confirmation de **poste de caisse** ou equipement, et **sorties** immediates vers le hub ou etats intermediaires visibles avant la vente plein ecran, selon ce qui est **reellement observe** sur `http://localhost:4445` avec le compte de reference.
- Alignement sur les manifests `CREOS` et routes reviewables existants ; tout ecart route legacy vs ancrage CREOS documente noir sur blanc (principe 11.3 / `peintre-nano/docs/03-contrats-creos-et-donnees.md`).
- Mise a jour ou ajout de lignes dans la **matrice de parite** pour les nouveaux flux retenus (preuves + `operationId` + artefacts).

## Non-scope

- Variantes `virtual` / `deferred` et parite exhaustive de tout l'historique caisse (report explicite si hors story).
- Re-specification metier caisse (Epic 6) ; sync Paheko / cloture complete de session comme **doctrine metier** hors UI (voir stories 13.2 / 13.3 pour variantes et cloture UI).
- Equivalence implicite entre le slice `CREOS` hub `/caisse` et toute route legacy plus riche **sans decision ecrite**.

## Hypotheses terrain (a valider par DevTools, pas comme exigences figees)

- **Legacy** : `/caisse` joue un role de **selection de poste** / entree dans le workspace caisse avant la vente kiosque.
- **Peintre** : `/caisse` peut presenter un **workspace hybride** (nav + contenu) different du ressenti legacy — si confirme, la story doit soit **rapprocher l'UX** par contrats, soit **documenter un ecart accepte** avec matrice et decision produit, sans bricolage metier front.

## Acceptance Criteria

1. **Observation legacy bornee** — Etant donne le legacy sur `http://localhost:4445` avec session **admin** / `Changeme123!`, quand on reproduit le parcours vers le kiosque et ses **ecrans adjacents** en scope, alors une **checklist** (routes, headings, boutons critiques, etats vides/chargement/erreur) est produite a partir d'observations reelles (pas de supposition).
2. **Comparaison Peintre** — Etant donne `Peintre_nano` sur `http://localhost:4444` avec les memes credentials et `VITE_LIVE_AUTH` selon le runbook du projet, quand on repete les memes intentions, alors le document de story ou un artefact lie (matrice / note) contient la **comparaison** ecran par etat majeur (equivalent, ecart accepte, gap).
3. **Contrats et pas de metier front** — Etant donne la hierarchie `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs`, quand le livrable est pret pour review, alors **chaque bloc visible** du perimetre est mappe a un contrat reviewable (`operationId`, manifeste, schema) ou etiquete **gap / differe** ; **aucune** logique metier caisse (permissions effectives, regles de session, regles de vente) n'est recreee comme source de verite dans le frontend.
4. **Reseau et correlation** — Etant donne la criticite terrain, quand la story est fermee cote implementation, alors un **inventaire d'appels** representatif est documente pour legacy vs Peintre sur au moins un parcours adjacent valide (ex. cote legacy : `users/me`, `permissions`, `cash-registers/status`, etc. ; cote Peintre : `users/me/context`, `cash-sessions/current`, `live-snapshot`, etc. — **ajuster aux captures reelles**, ne pas inventer des URLs).
5. **Flux legacy « Ouvrir » poste** — Etant donne que le legacy peut presenter un flux **Ouvrir** (poste caisse) interruptible, quand la capture ou le scenario l'exige, alors la preuve inclut la **reprise** ou le chemin complet documente (pas un etat intermediaire ambigu laisse comme succes silencieux).

## Contraintes techniques et garde-fous

- **`Peintre_nano` compose uniquement** : pas d'auteur metier, pas de logique metier caisse recodee cote frontend ; consommation `ContextEnvelope` + manifests + operations OpenAPI generees.
- Respect strict de la checklist PR / create-story : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` (points 1–12 : pas de route/page/permission metier orpheline dans le front, pas de hook « permissions au feeling », types generes non edites a la main, etc.).
- Decoupage Epic 13 dans `epics.md` : cette story ne doit **pas** absorber les variantes matrice (13.2) ni la cloture session (13.3).

## Preuve obligatoire — Chrome DevTools MCP (`user-chrome-devtools`)

- **Usage obligatoire** pour 13.1 : comparer **Legacy** `http://localhost:4445` et **Peintre** `http://localhost:4444` apres login **admin** / `Changeme123!` sur les ecrans adjacents au kiosque en scope.
- **Descripteurs d'outils** : lire les fichiers JSON **avant** tout appel MCP (schemas de parametres et resultats). Sur cette machine Cursor, les descripteurs sont sous :
  `C:\Users\Strophe\.cursor\projects\d-users-Strophe-Documents-1-IA-La-Clique-Qui-Recycle-JARVOS-recyclique\mcps\user-chrome-devtools\tools\`
  (repertoire projet Cursor ; si le chemin racine differe, retrouver l'equivalent `mcps/user-chrome-devtools/tools/*.json` pour le workspace ouvert.)
- **Outils disponibles** (un fichier `.json` par outil) :  
  `click`, `close_page`, `drag`, `emulate`, `evaluate_script`, `fill`, `fill_form`, `get_console_message`, `get_network_request`, `handle_dialog`, `hover`, `lighthouse_audit`, `list_console_messages`, `list_network_requests`, `list_pages`, `navigate_page`, `new_page`, `performance_analyze_insight`, `performance_start_trace`, `performance_stop_trace`, `press_key`, `resize_page`, `select_page`, `take_memory_snapshot`, `take_screenshot`, `take_snapshot`, `type_text`, `upload_file`, `wait_for`.
- **Pratique recommandee** : `navigate_page` / `list_pages` → `take_snapshot` (accessibilite / structure) → `list_network_requests` + `get_network_request` sur les XHR/fetch pertinents → captures ou extraits consignes dans la matrice / story Dev Agent Record.

## Intelligence story precedente (11.3, meme filiere parite)

- 11.3 a livre surtout un **socle** : alias `/cash-register/sale`, shell kiosque, tests, doc d'ecart CREOS vs legacy ; la **parite ressentie terrain** du kiosque et voisinages est **explicitement** dans les Epics 12–14.
- Ne pas confondre **preuve technique** (routing, tests) et **parite observable operateur** : 13.1 doit pousser les **preuves comparatives** (snapshots + reseau) sur les etats adjacents.
- Garder la decision ecrite : canon CREOS **hub `/caisse`** + `page_key` `cashflow-nominal` ; `/cash-register/sale` = alias runtime (voir `peintre-nano/docs/03-contrats-creos-et-donnees.md`).

## Tasks / Subtasks

- [x] Cartographier sur legacy (DevTools) les etats **pre-kiosque** et **post-kiosque** retenus ; ecrire checklist + URLs exactes.
- [x] Reproduire les memes intentions sur Peintre `:4444` ; noter ecarts shell, navigation, contexte visible.
- [x] Lister les appels reseau significatifs des deux cotes pour au moins un parcours complet adjacent ; mapper aux `operationId` OpenAPI ou gaps.
- [x] Mettre a jour `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (nouvelle ligne ou extension pilote 03 / cle dediee **explicitement nommee**) avec colonnes cadrage + preuve.
- [x] Implementer dans `Peintre_nano` uniquement via contrats (manifests, routing existant, widgets) — pas de metier invente.
- [x] Tests / gates : lint, tests cibles touches, pas de regression sur alias kiosque 11.3. *(Gate npm lint/build/test global : delegue etape Story Runner ; vitest cible `runtime-demo-cash-register-session-open-13-1` + regression `11-3` executes localement par l’agent dev.)*
- [x] Consigner preuves dans **Dev Agent Record** (captures, liens snapshot, extraits reseau).

## Dev Notes

### Structure projet (rappel)

- Contrats : `contracts/openapi/`, `contracts/creos/manifests/`, codegen `contracts/openapi/generated/` consomme par `peintre-nano`.
- Runtime : `peintre-nano/src/` (shell, routing, registre, widgets) — suivre patterns des stories 11.x et 6.x.

### Fichiers / zones probables

- Navigation / routes : alignement avec `navigation-transverse-served.json`, `page-cashflow-nominal.json`, configuration runtime demo / live auth selon le code actuel post-11.3.
- Guards / contexte : adaptateurs `ContextEnvelope`, pas de duplication des permissions.

### Tests

- Reutiliser et etendre les patterns de tests 11.2 / 11.3 (`live-auth-shell`, `runtime-demo`, `root-shell`) si de nouveaux marqueurs `data-*` ou routes sont introduits.
- Les preuves humaines DevTools restent la reference pour la **parite observable** ; les tests automatisent les invariants contractuels.

## References

- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `references/artefacts/2026-04-10_02_cadrage-parite-ui-legacy-peintre.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/2026-04-10_04_story-seeds-parite-ui-pilotes-peintre.md`
- `references/artefacts/2026-04-11_01_prompt-extension-parite-ui-legacy-peintre.md`
- `_bmad-output/planning-artifacts/epics.md` (Epic 13, Story 13.1)
- `_bmad-output/implementation-artifacts/11-3-retrouver-la-vente-caisse-kiosque-observable-dans-peintre-nano.md` (contexte 11.3)

## Dev Agent Record

### Agent Model Used

Composer (agent dev BMAD Story Runner Task), session 2026-04-11.

### Debug Log References

- Chrome DevTools MCP `user-chrome-devtools` : `list_pages`, `select_page`, `navigate_page`, `take_snapshot`, `wait_for`, `list_network_requests` (descripteurs JSON lus sous `mcps/user-chrome-devtools/tools/`).

### Completion Notes List

1. **Checklist legacy (admin, session active)** — `http://localhost:4445/caisse` : heading `Sélection du Poste de Caisse`, poste `La Clique Caisse 1` + `FERMÉE` + bouton `Ouvrir`, sections virtuel / différé, shell transverse (Tableau de bord, Caisse, Réception, Administration). `http://localhost:4445/cash-register/session/open?register_id=31d56e8f-08ec-4907-9163-2a5c49c5f2fe` : heading `Ouverture de Session de Caisse`, `Fond de caisse initial`, boutons `Annuler` / `Ouvrir la Session`. **Post-kiosque** : navigation vers `/cash-register/sale` a conduit a une URL parente `http://localhost:4445/cash-register` avec arbre a11y minimal sur `main` (comportement legacy a preciser hors story si besoin) ; inventaire reseau partiel `GET …/categories/`.
2. **Peintre avant correctif** : `/cash-register/session/open?…` affichait le contenu **dashboard** (`Bienvenue sur RecyClique, admin`) car aucune entree nav ne correspondait — **gap de routage** corrige par alias runtime vers `cashflow-nominal` (nav visible, pas kiosque).
3. **Peintre apres correctif routage** : meme URL session open → nav visible, workspace brownfield ; **DS 2026-04-11 (parite observable)** : titres / CTA alignes legacy via `widget_props` (`page-cashflow-nominal.json`) + fusion presentationnelle dans `RuntimeDemoApp` sur `/cash-register/session/open` (sans second `PageManifest`). Reseau (reload) : `GET /api/v1/users/me/context`, `GET /api/v1/cash-sessions/current`, `GET /api/v2/exploitation/live-snapshot`.
4. **Implementation routage** : `RuntimeDemoApp` — fonction `isCashRegisterSessionOpenPath`, branche `syncSelectionFromPath` + `resolvedPageKey` ; pas de `hideNav` sur cet alias (distinct de `/cash-register/sale`).
5. **Correlation reseau** (repris dans matrice `ui-pilote-03a-…` et doc `03-contrats…` § 13.1) : legacy `users/me`, `users/me/permissions`, `cash-registers/status`, `cash-registers/{id}`, `cash-sessions/status/{register_id}`, `activity/ping` vs Peintre `users/me/context`, `cash-sessions/current`, `live-snapshot`.
6. **DS 2026-04-11 (parite titres / shell caisse)** : hub `/caisse` — heading *Sélection du Poste de Caisse*, rangée poste + badge FERMÉE/OUVERTE + bouton *Ouvrir* → `spaNavigateTo` session open avec `register_id` ; cartes virtuel / différé renommées. Session open — heading *Ouverture de Session de Caisse*, *Fond de caisse initial*, *Annuler* (retour `/caisse`), *Ouvrir la Session*, prefill `register_id` depuis query ; cartes d’entree variantes masquees (intention ecran isole legacy). **Gap nomme** : nom convivial du poste (ex. *La Clique Caisse 1*) absent tant que le contrat ne fournit pas de libelle reviewable pour l’UUID.

### File List

- `contracts/creos/manifests/page-cashflow-nominal.json`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/domains/cashflow/CaisseBrownfieldDashboardWidget.tsx`
- `peintre-nano/tests/unit/runtime-demo-cash-register-session-open-13-1.test.tsx`
- `peintre-nano/tests/e2e/cash-register-session-open-13-1.e2e.test.tsx`
- `peintre-nano/tests/e2e/cashflow-nominal-6-1.e2e.test.tsx`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `_bmad-output/implementation-artifacts/13-1-retrouver-les-ecrans-caisse-adjacents-au-kiosque-observable-dans-peintre-nano.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- **2026-04-11** — DS (Task Story Runner) : parite observable `/caisse` + `/cash-register/session/open` (titres legacy, rangée poste + statut + *Ouvrir*, CTA *Annuler* / *Ouvrir la Session*, prefill `register_id`) via `page-cashflow-nominal.json` + `withCashflowNominalSessionOpenPresentation` dans `RuntimeDemoApp` ; widget `CaisseBrownfieldDashboardWidget` consomme `widget_props` ; tests 13.1 + assertion hub 6.1.
