# Story 13.2 : Retrouver les variantes caisse explicitement retenues dans la matrice de parite

Status: done

**Story ID :** 13.2  
**Story key :** `13-2-retrouver-les-variantes-caisse-explicitement-retenues-dans-la-matrice-de-parite`  
**Epic :** 13 — Etendre la parite UI legacy de la caisse au-dela du kiosque nominal dans `Peintre_nano`

**Note create-story (2026-04-11, CS) :** cette story traite les **branches caisse terrain** (virtuel, differe, autres chemins legacy) **uniquement** si elles sont **observees, arbitrees et inscrites** comme lignes dans `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`. Methode **legacy-code-first** + **DevTools obligatoire** sur `http://localhost:4445` vs `http://localhost:4444`. L'Epic 6 reste l'autorite metier caisse : **aucune** nouvelle regle metier ni reinterpretation des parcours 6.x. La story **13.3** (cloture / fin de session UI) est **hors perimetre**.

## Story

En tant que **caissier**,

je veux que les **variantes caisse** deja **approuvees et tracees dans la matrice de parite** se comportent et s'affichent comme sur le legacy observe,

afin que les branches terrain critiques restent **testables dans `Peintre_nano`** sans improvisation UI.

## Scope

- **Matrice comme liste blanche** : livrer en Peintre **seulement** les variantes pour lesquelles une ligne matrice existe avec statut explicite (`Valide`, `En cours` avec criteres, `Ecart accepte`, etc.) et preuve / validation renseignee ou en cours de completion selon les regles de la matrice (cf. section *Regles d'usage* du document matrice).
- **Alignement** : `localhost:4445` (legacy) vs `localhost:4444` (`Peintre_nano`, `VITE_LIVE_AUTH` selon runbook), comparaison **DevTools** (snapshots, reseau, redirections) comme pour 11.x et 13.1.
- **Code legacy de reference** (routes, modes, libelles) : `recyclique-1.4.4/frontend/src/pages/CashRegister/CashRegisterDashboard.tsx` (hub `/caisse`, cartes **Caisse virtuelle** / **Saisie differee**, chemins `/cash-register/virtual/...`, `/cash-register/deferred/...`, permissions `caisse.access`, `caisse.virtual.access`, `caisse.deferred.access`, flags `enable_virtual` / `enable_deferred` sur les postes) et `OpenCashSession.tsx` (`basePath` selon `isVirtualMode` / `isDeferredMode`, query `register_id`, redirections).
- **Pilotes deja dans la matrice** : `ui-pilote-03-caisse-vente-kiosk`, `ui-pilote-03a-caisse-adjacents-kiosque` (story **13.1** **done**) — ne pas les casser ; 13.2 ajoute ou complete les lignes **dediees aux variantes** encore absentes ou en gap, puis implementation alignee.

## Non-scope

- Inventer des variantes ou des URLs non observees au legacy.
- Etendre la matrice sans decision ecrite (produit / archi) puis traiter comme in-scope silencieusement.
- Story **13.3** (cloture observable) et toute logique **backend** de cloture / sync hors **parite UI** reviewable.
- Re-specifier les regles metier de l'Epic 6 (ticket en attente, remboursement, encaissements speciaux, etc.) : seulement **rendu et navigation** alignes sur contrats existants + matrice.

## Acceptance Criteria

1. **Liste blanche matrice** — Etant donne la matrice `2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`, quand la story est prete pour implementation, alors **chaque** variante livree en Peintre correspond a une **cle pilote** (ex. nouvelle ligne `ui-pilote-…`) avec colonnes *Reference legacy*, *Artefact CREOS*, *OpenAPI*, *Critere de parite*, *Statut* et *Ecarts / decisions* **remplies ou explicitement marquees en gap borne** ; toute variante **non** ligne matrice reste **hors livraison** ou **gap documente**.
2. **Observation legacy** — Etant donne `http://localhost:4445` avec session et permissions **coherentes avec la variante** (compte de reference **admin** / `Changeme123!` ou compte explicitement requis par la ligne matrice), quand on reproduit les parcours des variantes **retenues**, alors une **checklist** (routes exactes, headings, CTA, badges, etats chargement/erreur) est produite a partir de **DevTools** (pas de supposition).
3. **Comparaison Peintre** — Etant donne `http://localhost:4444` avec les memes intentions (compte **admin** / `Changeme123!`, `VITE_LIVE_AUTH` selon le runbook du projet), quand le livrable est examine, alors le document ou la matrice contient la **comparaison** par etat majeur (equivalent, ecart accepte nomme, gap).
4. **Hierarchie contrats** — Etant donne `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs`, quand un bloc UI est affiche, alors il est **mappe** a un contrat reviewable ou etiquete **gap / differe** ; **aucune** logique metier caisse ne devient source de verite dans le frontend.
5. **Epic 6 autorite** — Etant donne la revue, quand on valide la story, alors la preuve montre la **parite UI** sans **redefinir** les regles metier caisse ; tout ecart de forme de route legacy vs slice CREOS est **ecrit** (doc 03 + matrice).

## Contraintes techniques et garde-fous

- `Peintre_nano` **compose** ; pas d'auteur metier. Reutiliser patterns **13.1** / **11.3** : alias runtime, `RuntimeDemoApp`, `page-cashflow-nominal.json`, `peintre-nano/docs/03-contrats-creos-et-donnees.md`.
- Checklist PR : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`.
- DevTools MCP `user-chrome-devtools` : lire les descripteurs JSON avant tout appel MCP (schemas parametres / resultats).

## Preuve obligatoire — Chrome DevTools MCP (`user-chrome-devtools`)

- **Usage obligatoire** pour 13.2 : comparer **Legacy** `http://localhost:4445` et **Peintre** `http://localhost:4444` pour **chaque** variante matrice livree, avec login coherent (souvent **admin** / `Changeme123!` ; sinon valeur **ecrite** sur la ligne matrice).
- **Descripteurs d'outils** : lire les fichiers JSON **avant** tout appel MCP. Sur cette machine Cursor, chemins types :
  `C:\Users\Strophe\.cursor\projects\d-users-Strophe-Documents-1-IA-La-Clique-Qui-Recycle-JARVOS-recyclique\mcps\user-chrome-devtools\tools\`
  (equivalent relatif au workspace ouvert : `mcps/user-chrome-devtools/tools/*.json`.)
- **Pratique recommandee** : `navigate_page` / `list_pages` → `take_snapshot` → `list_network_requests` + `get_network_request` sur XHR/fetch → extraits consignes dans matrice / **Dev Agent Record** (alignement story 13.1).

## Intelligence story precedente (13.1)

- Ligne matrice **`ui-pilote-03a-caisse-adjacents-kiosque`** : hub `/caisse` + `/cash-register/session/open` ; sur Peintre, **nav visible** sur session open (contrairement au kiosque) ; correlation reseau legacy vs Peintre documentee.
- Les **cartes** virtuel / differe sur le hub legacy existent dans le code (`CashRegisterDashboard.tsx`) ; en **13.1** l'ecran session open Peintre a **masque** les entrees variantes pour coller a un ecran isole legacy — **13.2** decide via **matrice** si on **reexpose** / **aligne** ces variantes et sous quelles routes alias.
- **Gap nomme** 13.1 : libelle poste convivial tant que l'API / enveloppe ne fournit pas de libelle reviewable pour `register_id` — ne pas le fermer implicitement dans 13.2 sans contrat.

## Exigences architecture / fichiers

- Manifests CREOS : `contracts/creos/manifests/` ; pas d'equivalence implicite route legacy sans ligne *Ecarts / decisions*.
- Routing demo / live : `peintre-nano/src/app/demo/RuntimeDemoApp.tsx` ; widgets caisse : `peintre-nano/src/domains/cashflow/`.
- Mise a jour **matrice** + eventuellement `peintre-nano/docs/03-contrats-creos-et-donnees.md` pour chaque alias ou ecart.

## Tests

- Tests unitaires / e2e cibles pour **chaque** variante matrice livree (pattern `runtime-demo-…`, `*.e2e.test.tsx` ; reference 13.1 : `peintre-nano/tests/unit/runtime-demo-cash-register-session-open-13-1.test.tsx`, `peintre-nano/tests/e2e/cash-register-session-open-13-1.e2e.test.tsx`).
- Les preuves humaines DevTools restent la reference pour la **parite observable** ; les tests verrouillent les invariants contractuels.

## Recherche technique recente (versions)

- Pas de nouvelle stack majeure attendue pour cette story : suivre les versions du monorepo (`peintre-nano/package.json`) et regles codegen OpenAPI existantes.

## Reference project-context

- Aucun `project-context.md` detecte a la racine ; s'appuyer sur `references/index.md` et documents listes ci-dessous.

## Statut story (create-story)

- **done** (2026-04-11) — Reprise DevTools : parité **après clic** validée sur **les trois variantes** (réel / virtuel / différé) `localhost:4445` vs `localhost:4444` ; correctif **ordre des champs** différé (Date du cahier puis Fond de caisse, aligné `OpenCashSession.tsx` legacy) ; gates lint / test / build verts.

## Tasks / Subtasks

- [x] Cartographier dans le legacy (DevTools + `CashRegisterDashboard.tsx` / `OpenCashSession.tsx`) les **variantes** observees (virtuel, differe, autres si presents) : URLs, conditions d'affichage, libelles.
- [x] Proposer ou mettre a jour les **lignes matrice** (cles dediees) pour les variantes **retenues** explicitement ; laisser les autres en *gap* ou hors scope.
- [x] Pour chaque ligne matrice **dans le scope 13.2**, reproduire sur Peintre `:4444` et documenter ecarts + decisions CREOS.
- [x] Implementer dans `Peintre_nano` via contrats uniquement (routing, `widget_props`, pas de metier invente).
- [x] Ajouter / ajuster tests et gates cibles ; mettre a jour `test-summary` si convention sprint.
- [x] Consigner preuves et inventaire reseau dans **Dev Agent Record**.

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 13, Story 13.2]
- [Source: `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`]
- [Source: `references/artefacts/2026-04-10_04_story-seeds-parite-ui-pilotes-peintre.md`]
- [Source: `references/artefacts/2026-04-11_01_prompt-extension-parite-ui-legacy-peintre.md`]
- [Source: `references/artefacts/2026-04-10_02_cadrage-parite-ui-legacy-peintre.md`]
- [Source: `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source: `peintre-nano/docs/03-contrats-creos-et-donnees.md`]
- [Source: `recyclique-1.4.4/frontend/src/pages/CashRegister/CashRegisterDashboard.tsx`]
- [Source: `recyclique-1.4.4/frontend/src/pages/CashRegister/OpenCashSession.tsx`]
- [Source: `_bmad-output/implementation-artifacts/13-1-retrouver-les-ecrans-caisse-adjacents-au-kiosque-observable-dans-peintre-nano.md`]

## Cadrage initial (Story Runner 2026-04-11)

**Variantes / pilotes — matrice actuelle**

- **Déjà retenus et tracés** : `ui-pilote-03-caisse-vente-kiosk`, `ui-pilote-03a-caisse-adjacents-kiosque` (héritage 11.3 / 13.1 **done**).
- **Candidats 13.2 (code legacy, pas encore lignes matrice dédiées)** : **virtuel** (`/cash-register/virtual/...`, `VirtualCashRegister`, `VirtualSale`, stores `virtual*`) et **différé** (`/cash-register/deferred/...`, logique date session, `checkDeferredSessionByDate`). Conditions legacy : `enable_virtual` / `enable_deferred` sur postes, permissions `caisse.virtual.access`, `caisse.deferred.access`, `hasVirtualCashAccess` / `hasDeferredCashAccess`.
- **Exclu par périmètre epic** : **13.3** (clôture / `CloseSession.tsx` et fin de session UI) — ne pas traiter ici.

**Preuves legacy à capturer (DevTools obligatoire)**

- Par variante retenue : navigation `:4445` vs `:4444`, `take_snapshot`, `list_network_requests` sur les GET/POST caisse pertinents ; même compte **admin** / `Changeme123!` sauf ligne matrice autre.
- Consigner headings, CTA, badges « formation » / différé, et écarts de route vs alias `RuntimeDemoApp` / `cashflow-nominal`.

**Zones code legacy à lire en priorité**

- `CashRegisterDashboard.tsx` (cartes virtuel / différé, navigation), `OpenCashSession.tsx` (basePath, session open virtuel/différé), puis `Sale.tsx`, `SaleWrapper.tsx`, `CloseSession.tsx` (référence seulement, hors scope), `VirtualCashRegister.tsx`, routes router cash-register.

**Risques / gaps initiaux**

- **Liste blanche** : aucune ligne `ui-pilote-*` dédiée virtuel/différé dans la matrice — **à ajouter** avant livraison Peintre, sinon hors scope explicite.
- **13.1** : entrées variantes masquées sur Peintre session open — **décision produit + matrice** pour réexposition alignée legacy.
- **Libellé poste** : gap déjà nommé 13.1 ; ne pas le « résoudre » sans contrat reviewable.

**DS** : non amorcé dans ce run (preuve navigateur requise pour la première tâche dev — cartographie DevTools).

## Dev Agent Record

### Agent Model Used

Composer (agent Task BMAD Story Runner), session 2026-04-11.

### Debug Log References

- Chrome DevTools MCP `user-chrome-devtools` : descripteurs lus sous `mcps/user-chrome-devtools/tools/` (`navigate_page`, `take_snapshot`, `wait_for`, `list_network_requests`, `click`, `fill`, `select_page`).
- **Legacy `http://localhost:4445`** (isolatedContext legacy-epic13) : login `admin` / `Changeme123!` ; `/caisse` — snapshot headings *Sélection du Poste de Caisse*, *La Clique Caisse 1*, *Caisse Virtuelle* + *Simuler*, *Saisie différée* + *Accéder* ; clic *Simuler* → URL `…/cash-register/virtual/session/open?register_id=31d56e8f-08ec-4907-9163-2a5c49c5f2fe`, heading *Ouverture de Session de Caisse*, *Fond de caisse initial*, *Annuler* / *Ouvrir la Session* ; retour hub puis clic *Accéder* → `…/cash-register/deferred/session/open?register_id=…` + champs *Date du cahier* + *Fond de caisse initial* ; reseau session open virtuel (xhr/fetch) : `GET …/users/me`, `…/permissions`, `…/cash-registers/status`, `…/cash-registers/{id}` (+ pings).
- **Peintre `http://localhost:4444`** (isolatedContext peintre-epic13) : `/cash-register/virtual/session/open?register_id=…` — nav visible, heading *Ouverture de Session de Caisse*, intro fond de caisse ; `/cash-register/deferred/session/open?…` — intro avec *date réelle de vente (cahier)* ; reseau (extrait) : `GET /api/v1/users/me/context`, `GET /api/v1/cash-sessions/current`.
- **Reprise 2026-04-11 (post-correctif ordre différé)** — Après patch : sur **différé** `:4444`, arbre a11y = *Date du cahier* (contrôle date) **puis** *Fond de caisse initial* (comme legacy). **Virtuel** : attendre le chargement du poste (*La Clique Caisse 1*) avant *Simuler* pour obtenir `?register_id=` (sinon navigation sans id → écran complet non « bare »). **Réel** : `/cash-register/session/open?register_id=…`, formulaire minimal aligné legacy.

### Completion Notes List

- Matrice : deux lignes **`ui-pilote-03b-caisse-virtuelle-legacy-urls`** et **`ui-pilote-03c-caisse-saisie-differee-legacy-urls`** avec colonnes remplies, ecarts nommes (hub `/cash-register/virtual`, widget date cahier, bouton Annuler → `/caisse`).
- Peintre : `RuntimeDemoApp` etend les alias 13.1 aux chemins virtual/deferred (session open, kiosque vente, hub virtuel, normalisation `/cash-register/deferred`) ; `CaisseBrownfieldDashboardWidget` aligne les CTA *Simuler* / *Accéder* sur les prefixes URL legacy ; intro différée via `widget_props` fusionnes ; **post-CR** : sur hub **`/cash-register/virtual`**, `widget_props.cash_register_hub_base_path` = `/cash-register/virtual` pour que **Ouvrir** / **Reprendre** sur cartes postes réels utilisent le meme `basePath` que `CashRegisterDashboard` legacy (`handleOpen` / `handleResume`).
- Tests : `runtime-demo-cash-register-variants-13-2.test.tsx`, `cash-register-variants-13-2.e2e.test.tsx` (incl. e2e hub virtuel + **Ouvrir**) ; `test-summary.md` section 13.2.
- Sprint : `13-2-…` → **done** (Story Runner 2026-04-11).

### File List

- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/domains/cashflow/CaisseBrownfieldDashboardWidget.tsx`
- `peintre-nano/tests/unit/runtime-demo-cash-register-variants-13-2.test.tsx`
- `peintre-nano/tests/e2e/cash-register-variants-13-2.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/tests/test-summary.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/13-2-retrouver-les-variantes-caisse-explicitement-retenues-dans-la-matrice-de-parite.md`

### Change Log

- 2026-04-11 — DS Task : matrice 03b/03c, routage Peintre 13.2, tests + doc 03, sprint → review.
- 2026-04-11 — Story Runner : revue CR → correctif `cash_register_hub_base_path` + e2e hub ; gates complets ; sprint → **done** (invalidé ensuite côté produit).
- 2026-04-11 — Reprise 13.2 : parité **écran session open** vs legacy (`OpenCashSession`) — `legacySessionOpenBareForm` (hub → `?register_id=` + pas de session résolue), `urlBranch` pour date différée `type="date"` vs datetime atelier, Annuler par branche ; tests 6.1 / 13.1 / 13.2 ajustés ; lint + test + build OK. Sprint → **review** ; preuve DevTools « poste fermé » = **HITL** (session déjà ouverte sur :4444 au contrôle MCP).
- 2026-04-11 — Reprise Story Runner + DevTools MCP : comparaison **EN VRAI** `:4445` / `:4444` sur Ouvrir / Simuler / Accéder ; écart **ordre DOM différé** corrigé (`Date du cahier` avant `Fond de caisse initial`) ; re-vérif snapshot après patch ; sprint → **done**.

### Git / historique depot (indicateur)

- Journal git racine recent : epics larges (5, 6, 7, 8, 11) ; le detail 13.x peut etre en modifications locales non commit — se fier aux fichiers story et matrice pour le fil de continuite.
