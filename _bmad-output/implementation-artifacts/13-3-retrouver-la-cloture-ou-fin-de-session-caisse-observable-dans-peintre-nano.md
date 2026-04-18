# Story 13.3 : Retrouver la cloture ou fin de session caisse observable dans `Peintre_nano`

Status: done

**Story ID :** 13.3  
**Story key :** `13-3-retrouver-la-cloture-ou-fin-de-session-caisse-observable-dans-peintre-nano`  
**Epic :** 13 — Etendre la parite UI legacy de la caisse au-dela du kiosque nominal dans `Peintre_nano`

**Note create-story (2026-04-12, CS) :** cette story prolonge **13.1** / **13.2** sur le **parcours fin de session** tel qu'il est **visible** sur le legacy (`CloseSession`, routes `…/session/close`). Elle est **distincte** de la **Story 6.7** (cloture locale exploitable dans le continuum brownfield v2) : 6.7 fixe le **metier** et les **contrats** de fermeture ; **13.3** impose la **parite UI observable** legacy `localhost:4445` vs Peintre `localhost:4444`, alias runtime, matrice, preuves DevTools — **sans** redefinir les regles metier Epic 6 ni absorber sync comptable (Epic 8).

Ultimate context engine analysis completed — comprehensive developer guide created (BMAD create-story, 2026-04-12).

## Story

En tant que **caissier ou superviseur**,

je veux que l'**interface bornee de cloture / fin de session caisse** corresponde au **legacy observe** la ou le perimetre est retenu,

afin que le prolongement caisse au-dela du kiosque nominal reste **coherent de la vente aux signaux de fin de session**.

## Scope

- **Chemins legacy a couvrir** (reference code + routes, pas invention) :
  - `App.jsx` : `ProtectedRoute` + `CloseSession` sur  
    `/cash-register/session/close`,  
    `/cash-register/virtual/session/close` (`caisse.virtual.access`),  
    `/cash-register/deferred/session/close` (`caisse.deferred.access`).
  - Entree utilisateur typique depuis la vente : `Sale.tsx` — `handleCloseSession` → `navigate(\`${basePath}/session/close\`)` avec `basePath` reel / virtuel / differe.
- **Surface UI legacy** (`CloseSession.tsx`, extraits a reproduire ou a cartographier en ecarts nommes) :
  - Titre **Fermeture de Caisse** ; retour **Retour a la vente** vers `…/sale` selon le mode ; etat chargement **Chargement des donnees de la session...**.
  - Bloc **Session sans transaction** (titre **Session sans transaction**, texte explicatif, CTA **Continuer quand meme** / **Annuler**) quand session vide.
  - Parcours avec transactions : **Resume de la Session** (Fond de Caisse Initial, Total des Ventes, Total des Dons si > 0, Montant Theorique, Articles Vendus), **Controle des Montants** (**Montant Physique Compte** *, variance, commentaire obligatoire si ecart*, boutons **Annuler** / **Fermer la Session** / etat **Fermeture en cours...**).
  - Redirection si pas de session ouverte : vers **`/caisse`** (comportement legacy documente).
- **Matrice** : ajouter (ou completer) au moins une ligne pilote **`ui-pilote-…`** dediee **cloture / session close** dans `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` — **liste blanche** comme en 13.2 : rien n'est « in-scope parite » sans ligne matrice explicite et statut gere.
- **Peintre_nano** : alias runtime + composition **CREOS** (`page_key` existant ou extension **reviewable** — pas de second manifeste implicite sans decision ecrite), alignes `peintre-nano/docs/03-contrats-creos-et-donnees.md` (nouvelle sous-section **session/close** attendue apres validation).

## Non-scope

- Re-specifier ou reimplementer la **politique metier** de cloture deja couverte par **6.7** et les tests backend (tolerance 0.05 EUR, holds, etc.) : seulement **s'aligner** ou **reutiliser** les appels existants cote Peintre (`postCloseCashSession` dans `peintre-nano/src/api/cash-session-client.ts` — `X-Step-Up-Pin`, `Idempotency-Key`, `X-Request-Id`).
- Sync Paheko, reconciliation, quarantaine (Epic 8).
- Inventer des ecrans de cloture sans lecture **legacy-code-first** (`CloseSession.tsx`, `CloseSessionWrapper.tsx` si pertinent).

## Acceptance Criteria

1. **Fondation epics** — Etant donne la Story 13.3 dans `epics.md` (fin de session / cloture bornee, sensibilite operationnelle), quand le livrable est pret pour le dev, alors le fichier story + la matrice decrivent **les memes intentions** : parite **shell, signaux, etapes visibles operateur** ; consequences **sync / compta / backend lourds** hors UI restent deleguees aux epics et contrats appropriés.

2. **Observation legacy (DevTools obligatoire)** — Etant donne `http://localhost:4445` avec session caisse **ouverte** jusqu'a l'ecran **Fermeture de Caisse** (parcours reel / virtuel / differe **selon la ligne matrice**), quand DS/QA documentent la parite, alors les preuves utilisent le MCP **`user-chrome-devtools`** conformement a la section **Preuve obligatoire** (descripteurs JSON avant appel ; chemins types Windows + relatif workspace). Outils : `navigate_page`, `take_snapshot`, `list_network_requests` / `get_network_request` sur les **POST/GET** pertinents (ex. rafraichissement session, **POST** `…/cash-sessions/…/close` si declenche). **Compte terrain de reference** (fichier interne depot, ne pas diffuser inutilement hors repo) : login **`admin`** / **`Changeme123!`** ; pour tout appel **step-up** aligne OpenAPI : PIN **`1234`** (story **2.4** / **6.7**).

3. **Comparaison Peintre** — Etant donne `http://localhost:4444` (`VITE_LIVE_AUTH` selon runbook), quand les memes intentions sont rejouees, alors la matrice et/ou la story enregistrent l'**equivalence**, **ecart accepte nomme**, ou **gap** pour chaque etat majeur (navigation, titres, resume, session vide, erreurs, redirection post-success vers hub caisse).

4. **Hierarchie contrats (stricte)** — Etant donne l'ordre **OpenAPI** > **ContextEnvelope** > **NavigationManifest** > **PageManifest** > **UserRuntimePrefs**, quand un bloc UI est affiche, alors il est **mappe** a une source reviewable ou etiquete **gap / differe** ; **aucune** logique metier caisse ne devient source de verite dans le **frontend** (checklist : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`).

5. **Routage runtime** — Etant donne les URLs legacy `…/session/close` (reel, virtuel, differe), quand Peintre les sert, alors elles sont traitees comme en **13.1** / **13.2** : **alias runtime** documentes dans `RuntimeDemoApp.tsx` + section **doc 03**, avec correlation **NavigationManifest** (absence d'entree = normal ; pas d'equivalence silencieuse).

6. **Autorite Epic 6** — Etant donne la revue, quand on valide la story, alors la preuve demontre la **parite UI** sans **redefinir** les regles metier caisse ; les ecarts de forme route legacy vs slice CREOS sont **ecrits** (matrice + doc 03).

7. **Definition of Done — transparence** — Etant donne la sensibilite du flux, quand la story est acceptee, alors **preuves DevTools**, **mappings contrat**, et **gaps residuels** sont **explicites** (pas d'etat de completion ambigu).

## Preuve obligatoire — Chrome DevTools MCP (`user-chrome-devtools`)

- Meme discipline que **13.1** / **13.2** : comparer **Legacy** `http://localhost:4445` et **Peintre** `http://localhost:4444` pour **chaque** branche `…/session/close` **retenue dans la matrice** (reel ; virtuel / differe seulement si une ligne pilote dediee ou une extension de ligne existante le trace explicitement).
- **Descripteurs d'outils** : lire les fichiers JSON **avant** tout appel MCP. Sur poste Windows Cursor, chemins types :  
  `C:\Users\Strophe\.cursor\projects\d-users-Strophe-Documents-1-IA-La-Clique-Qui-Recycle-JARVOS-recyclique\mcps\user-chrome-devtools\tools\`  
  (equivalent relatif si le dossier est a la racine du workspace ouvert : `mcps/user-chrome-devtools/tools/*.json`.)
- **Pratique** : `navigate_page` / `take_snapshot` / `list_network_requests` + `get_network_request` sur `GET` session / etat et sur **`POST` cloture** (`…/cash-sessions/…/close` ou chemin reviewable aligne OpenAPI) ; consigner extraits dans la **ligne matrice** `ui-pilote-*` et le **Dev Agent Record**.

## Contraintes techniques et garde-fous

- **Client HTTP cloture** : `peintre-nano/src/api/cash-session-client.ts` — `postCloseCashSession` / `recyclique_cashSessions_closeSession` ; conserver step-up (**ne jamais** logger le PIN).
- **Widgets / demo** : `peintre-nano/src/domains/cashflow/`, `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`, manifests `contracts/creos/manifests/page-cashflow-*.json`.
- **Tests** : suivre les patterns **13.1** / **13.2** (`runtime-demo-…`, `*.e2e.test.tsx`) ; mocker les reponses API la ou la CI ne peut pas tenir une session reelle, tout en laissant la **parite observable** aux preuves DevTools + matrice.
- Methode **legacy-code-first** : `recyclique-1.4.4/frontend/src/pages/CashRegister/CloseSession.tsx`, `Sale.tsx` (navigation vers cloture), `App.jsx` (routes).

## Intelligence story precedente (13.1 / 13.2)

- **13.1** : ligne matrice **`ui-pilote-03a-caisse-adjacents-kiosque`** ; alias runtime **`/cash-register/session/open`** vers `cashflow-nominal` ; nav **visible** hors kiosque ; correlation reseau legacy vs Peintre deja documentee — la cloture prolonge le meme modele d'**alias** + preuves.
- Matrice **liste blanche** : toute livraison passe par une ligne **`ui-pilote-*`** avec colonnes remplies ou gap borne.
- **RuntimeDemoApp** + **doc 03** sont le lieu des **decisions d'alias** ; variantes **virtuel / differe** utilisent des **prefixes URL** distincts du mode reel — la cloture doit **repercuter** les trois `basePath` comme le legacy (`CloseSession.tsx` + `Sale.tsx`).
- **DevTools MCP** : meme discipline de descripteurs et de captures que 13.2 ; ecarts hub (ex. Annuler vers `/caisse` vs hub virtuel) doivent etre **nommes**, pas caches.

## Rappel Story 6.7 (non duplication fonctionnelle)

- La **cloture exploitable** v2 (continuum brownfield, step-up, idempotence, blocs metier) est deja cadree dans `_bmad-output/implementation-artifacts/6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md`. **13.3** ajoute la **couche parite routes + observabilite legacy** ; si le widget de cloture brownfield existe deja, l'objectif est surtout **exposition** sous les **URLs legacy**, **alignement libelle/flux**, et **preuves** — pas une seconde implementation metier.

## Recherche technique recente (versions)

- Pas de changement de stack attendu : versions dans `peintre-nano/package.json` ; codegen OpenAPI existant.

## Reference project-context

- Pas de `project-context.md` obligatoire detecte ; s'appuyer sur `references/index.md`, `references/artefacts/2026-04-11_01_prompt-extension-parite-ui-legacy-peintre.md`, et les artefacts listes ci-dessous.

## Statut story (create-story)

- **done** (2026-04-12, Story Runner BMAD : DevTools legacy vs Peintre + gates + QA + revue + correctif titres h1/h2/h3) — Preuves MCP `user-chrome-devtools` consignées ci-dessous et dans la matrice **`ui-pilote-03d-…`** ; `sprint-status.yaml` : **`13-3-…` → done**.

## Tasks / Subtasks

- [x] Cartographier le legacy (**DevTools** + `CloseSession.tsx`, `Sale.tsx`, `App.jsx`) : URLs exactes, libelles, ordre des blocs, reseau sur ouverture page et sur **close** ; noter **PIN** / headers si visibles cote client (sinon se referer aux tests API existants).
- [x] Ajouter ou mettre a jour la **ligne matrice** `ui-pilote-*` pour la cloture (reel et, si retenu, virtuel / differe) ; lier OpenAPI / CREOS / preuves.
- [x] Implementer / ajuster les **alias runtime** Peintre pour `…/session/close` (trois branches si la matrice les retient) + mise a jour **doc 03**.
- [x] Brancher l'UI de cloture sur les **contrats** existants (reutiliser appels deja conformes **2.4** / **6.7**) ; saisie PIN operateur pour `X-Step-Up-Pin` si le flux live l'exige — **valeur de test** `1234` uniquement en environnement de demo / doc interne.
- [x] Tests unitaires / e2e cibles + gates ; mettre a jour `test-summary` si convention sprint.
- [x] Completer **Dev Agent Record** (preuves, fichiers touches).

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 13, Story 13.3]
- [Source: `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` — ligne **`ui-pilote-03d-caisse-session-close-legacy-urls`** (Story 13.3)]
- [Source: `references/artefacts/2026-04-11_01_prompt-extension-parite-ui-legacy-peintre.md`]
- [Source: `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source: `peintre-nano/docs/03-contrats-creos-et-donnees.md`]
- [Source: `peintre-nano/src/api/cash-session-client.ts` — `postCloseCashSession`]
- [Source: `recyclique-1.4.4/frontend/src/pages/CashRegister/CloseSession.tsx`]
- [Source: `recyclique-1.4.4/frontend/src/pages/CashRegister/Sale.tsx` — `handleCloseSession`]
- [Source: `recyclique-1.4.4/frontend/src/App.jsx` — routes `session/close`]
- [Source: `_bmad-output/implementation-artifacts/13-1-retrouver-les-ecrans-caisse-adjacents-au-kiosque-observable-dans-peintre-nano.md` — adjacents / session open / matrice 03a]
- [Source: `_bmad-output/implementation-artifacts/13-2-retrouver-les-variantes-caisse-explicitement-retenues-dans-la-matrice-de-parite.md`]
- [Source: `_bmad-output/implementation-artifacts/6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md` — autorite fonctionnelle cloture v2]

## Dev Agent Record

### Agent Model Used

Sous-agent Task BMAD Story Runner (DS implementation), 2026-04-12.

### Debug Log References

- **Legacy** (`user-chrome-devtools`, 2026-04-12, Story Runner) : `navigate_page` → `http://localhost:4445/cash-register/session/close` **sans** session ouverte → apres `wait_for`, **URL** `http://localhost:4445/caisse`, heading **`Sélection du Poste de Caisse`** (aligne redirection `CloseSession.tsx`). Parcours **session ouverte** (ouverture hub + fond 50 EUR + vente) puis `…/session/close` : `take_snapshot` — **Fermeture de Caisse** (heading niveau **1**), **Session sans transaction** (h3), texte explicatif, CTA **Continuer quand même** / **Annuler**, **Retour à la vente** ; `list_network_requests` (xhr/fetch) inclut **`GET …/cash-sessions/{session_id}`** sur chargement de la page close.
- **Peintre** (`user-chrome-devtools`, 2026-04-12, Story Runner) : `navigate_page` → `http://localhost:4444/cash-register/session/close` **sans** session → **URL** `http://localhost:4444/caisse`, heading **`Sélection du Poste de Caisse`** (equivalence legacy). **Avec** session ouverte sans transaction : **Fermeture de Caisse**, **Session sans transaction**, memes libelles ; champ **Code step-up (PIN opérateur)** avant continuation (**ecart accepte** documente matrice : OpenAPI step-up 2.4 / 6.7 vs legacy sans champ PIN sur le bloc vide). **Correctif** post-revue : hierarchie titres **h1 / h2 / h3** dans `CaisseSessionCloseSurface.tsx` pour coller au legacy.

### Completion Notes List

- Alias runtime **trois** branches `…/session/close` ; surcouche `widget_props` + composant **`CaisseSessionCloseSurface`** (`getCurrentOpenCashSession`, `postCloseCashSession`, `theoreticalCloseAmount`, `needsVarianceComment`) ; CTA dashboard **Clôturer** → `/cash-register/session/close` (remplace `/caisse/cloture`).
- Gates (Story Runner 2026-04-12, apres correctif titres) : `npm run lint`, `npm run test` (**380** tests), `npm run build` — **OK**.
- Revue critique : **APPROVED** avec reserve documentee — PIN UI sur session vide (non present sur legacy meme bloc) justifie par contrat API ; pas de fuite PIN dans les logs applicatifs verifies (champ password + pas de `console.log` PIN).

### File List

- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/domains/cashflow/CaisseBrownfieldDashboardWidget.tsx`
- `peintre-nano/src/domains/cashflow/CaisseSessionCloseSurface.tsx` (nouveau)
- `peintre-nano/tests/unit/runtime-demo-cash-register-session-close-13-3.test.tsx` (nouveau)
- `peintre-nano/tests/e2e/cash-register-session-close-13-3.e2e.test.tsx` (nouveau)
- `peintre-nano/tests/unit/caisse-brownfield-dashboard-6-7.test.tsx`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `_bmad-output/implementation-artifacts/tests/test-summary.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/13-3-retrouver-la-cloture-ou-fin-de-session-caisse-observable-dans-peintre-nano.md`

## Change Log

- **2026-04-12 (DS)** : Story 13.3 — alias `session/close`, surface clôture brownfield, matrice `ui-pilote-03d`, doc 03, tests 13.3 + ajustement test 6.7 (CTA) ; sprint **13-3 → review**.
- **2026-04-12 (Story Runner BMAD)** : Comparaison DevTools legacy `localhost:4445` vs Peintre `localhost:4444` ; correctif **Titres** Mantine (h1/h2/h3) ; mise a jour matrice **03d**, doc 03 § 13.3, story + sprint **13-3 → done** ; gates lint/test/build verts.
