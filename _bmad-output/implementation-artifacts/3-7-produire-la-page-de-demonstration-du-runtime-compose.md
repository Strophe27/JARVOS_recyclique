# Story 3.7 : Produire la page de démonstration du runtime composé

**Clé fichier (obligatoire) :** `3-7-produire-la-page-de-demonstration-du-runtime-compose`  
**Epic :** epic-3 — Poser le socle frontend greenfield `Peintre_nano`  
**Statut :** done

**Références skills BMAD (chemins contractuels) :**

- `create_story` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-create-story\SKILL.md`
- `dev_story` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-dev-story\SKILL.md`
- `qa_e2e` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-qa-generate-e2e-tests\SKILL.md`
- `code_review` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-code-review\SKILL.md`

<!-- Validation optionnelle : validate-create-story avant dev-story. -->

---

## Identité Story 3.7

- **Story :** 3.7 — livrer une **page (parcours) de démonstration** qui enchaîne le **vrai** pipeline runtime : `RootShell`, chargement / validation du lot de manifests, filtrage navigation par `ContextEnvelope`, résolution d'accès page, rendu déclaratif via registre de widgets et slots — avec au moins un **chemin nominal** et au moins un **chemin de fallback visible** (s'appuyant sur les mécanismes 3.6), de façon **explicite** (bac à sable / route de démo), **pas** comme écran métier déguisé.
- **Clé de fichier (exacte, obligatoire) :** `3-7-produire-la-page-de-demonstration-du-runtime-compose` — toute autre variante de slug est **incorrecte** pour `implementation-artifacts` et `sprint-status.yaml`.
- **Epic :** epic-3 — preuve concrète du moteur avant injection des modules métier (Epic 4+).
- **Prérequis livrés :** 3.1–3.6 (shell grid, manifests, registre, auth + enveloppe, prefs bornées, fallbacks/rejets visibles + `reportRuntimeFallback`). Le code actuel concentre déjà une grande partie du flux dans `App.tsx` et des fixtures — cette story **structure** l'offre « démo runtime » pour qu'elle soit **inspectable**, **réutilisable** comme référence d'intégration, et **testée** comme telle.

---

## Primauté ADR (obligatoire)

**Phrase de primauté (non négociable) :** le document `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` est **accepté** ; cette ADR **prime** sur toute section du concept ou de la vision qui laisserait ouverts P1/P2, le choix CSS ou la stack UI.

**Implications directes pour 3.7 :**

- Tout **nouveau** marquage visuel de la zone démo (en-tête bac à sable, panneaux, listes) : **CSS Modules** + **tokens** (`var(--pn-…)`). **Pas** de layout spatial du **shell** via **Stack / Group Mantine** comme moteur de composition globale (la grille `RootShell` reste la référence — story 3.1).
- Mantine reste autorisée pour **composants riches** à l'intérieur de blocs (boutons, texte, etc.), conformément à l'ADR.
- **P2 (PostgreSQL / config admin)** : hors périmètre — la démo ne persiste pas d'état serveur.

---

## Contexte nano → mini → macro

- **Nano :** composition UI pilotée par manifests + registre + enveloppe + prefs, rendu dans le shell ; **bac à sable** documenté.
- **Mini / macro :** hors périmètre sauf mention contraire dans une story dédiée — **pas** de bus métier, **pas** d'agent SDUI dans 3.7.

---

## Périmètre Story 3.7 vs stories adjacentes

| Zone | Story 3.7 | Hors périmètre |
|------|-----------|----------------|
| Parcours **démo** unique (ou très petit nombre de routes démo) passant par le **même** pipeline que le reste de l'app (pas de rendu parallèle « magique ») | **Oui** | — |
| **Chemin nominal** + **chemin fallback visible** (ex. widget inconnu, page refusée, manifest invalide **sur un scénario démo contrôlé**) | **Oui** | Redéfinir toute la taxonomie 3.6 |
| Signalisation **bac à sable** (libellé, `data-testid`, ou route dédiée claire) | **Oui** | — |
| Widget / module **bandeau live** | — | **Epic 4** |
| Backend réel, OpenAPI générée | — | **Convergence 1 / Piste B** |
| Migration flows métier | — | Epics 5–7 |

**Continuité 3.6 :** réutiliser `reportRuntimeFallback`, sévérités et composants d'état existants ; la démo **déclenche** ou **navigue vers** des cas déjà supportés, sans affaiblir la visibilité des échecs.

**Ouverture Epic 4 :** la démo sert de **surface de régression** pour le socle ; Epic 4 ajoute le slice contractuel `bandeau live` sans devoir re-déboguer le shell depuis zéro.

---

## Les quatre artefacts (rappel — pas de substitut contractuel)

| Artefact | En 3.7 |
|----------|--------|
| `NavigationManifest` | Entrées démo (labels, `page_key`, `required_permission_keys`) restent dans le **contrat** chargé — pas de liste de routes codée en dur **à la place** du manifest pour la navigation principale. |
| `PageManifest` | La page démo est rendue via **PageManifest** (slots / widgets), pas un JSX métier qui court-circuite `PageRenderer` pour le cœur de la preuve. |
| `ContextEnvelope` | Le filtrage nav et la garde page restent **autoritaires** ; les scénarios nominal / refus doivent être **explicables** par une enveloppe mock ou fixture (Piste A). |
| `UserRuntimePrefs` | Peuvent illustrer la personnalisation **locale** (densité, etc.) **sans** bypass d'autorisation. |

**Hiérarchie de vérité :** `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs` — [Source : `_bmad-output/planning-artifacts/epics.md` — AR39 ; `project-structure-boundaries.md` — Data Flow]

---

## Frontières repo (Piste A) et boundaries structurels

- **Mocks jusqu'à Convergence 1 :** code sous `peintre-nano/` ; **aucun** `import` **runtime** depuis `references/`.
- **`registry/`**, **`runtime/`**, **`validation/`** : **ne pas fusionner** les dossiers sans story + ADR. La démo peut ajouter des composants sous `app/` (ex. conteneur démo), des fixtures sous `fixtures/`, et des entrées de manifest sous `public/manifests/` **ou** chaîne équivalente **à condition** que le **chemin de chargement** reste celui utilisé par l'app (pas une branche « démo only » qui ne lit jamais `loadManifestBundle`).
- **Convergence 2** : ne pas introduire ici de logique **spécifique** bandeau live.

---

## Flows cashflow (a) / (b) — note de cadrage

Cette story **ne tranche pas** le format des flows caisse. **Ne pas trancher silencieusement :** toute évolution touchant aux flows ou à leur validation doit renvoyer explicitement aux fondations et au pipeline **§16** — [Source : `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md` §16]. Le périmètre 3.7 est la **démonstration du runtime de composition**, pas la sémantique métier caisse.

---

## Stack P1 / versions

- **P1** : CSS Modules + `tokens.css` + Mantine v8 (usage conforme ADR).
- **React / TypeScript / Vite** : alignés sur `peintre-nano/package.json`.

---

## Story

As a **development team**,  
I want **a demo page that exercises the minimal runtime composition chain**,  
So that **the frontend foundation can be inspected and validated before real business modules are injected**.

---

## Critères d'acceptation (BDD — source epics)

**Given** the initial milestone must prove the composed frontend in practice  
**When** the demo page is delivered  
**Then** it renders through the real shell, manifest loading path, widget registry, and context-aware resolution path  
**And** it demonstrates at least one nominal render path and one visible fallback path  

**Given** this page is meant to validate the runtime rather than ship business value directly  
**When** the demo scope is defined  
**Then** it remains a controlled sandbox or demonstration route and not a hidden business screen  
**And** it can be used to verify progressive improvements before domain migration begins  

**Given** Epic 4 depends on a proven base rather than only theoretical contracts  
**When** this story is completed  
**Then** the project has a concrete runtime proof prior to the first real module slice  
**And** the `bandeau live` epic can focus on the module chain itself instead of debugging the entire shell from scratch  

[Source : `_bmad-output/planning-artifacts/epics.md` — Story 3.7]

---

## Exigences techniques détaillées (pour le dev)

1. **Pipeline identique**  
   - La démo doit passer par les mêmes briques que le produit minimal : au minimum `loadManifestBundle` (ou équivalent unique documenté), `filterNavigation`, `resolvePageAccess`, `PageRenderer` / `buildPageManifestRegions`, registre widgets. **Interdit** : un second rendu « démo » qui duplique la logique de composition sans passer par ces points.

2. **Surface « bac à sable » explicite**  
   - L'utilisateur (ou le test) doit pouvoir identifier la zone comme **démonstration runtime** : par exemple entrée de navigation dédiée (`label_key` / libellé clair), bandeau visuel discret, et/ou `data-testid` racine du parcours (ex. `runtime-demo-root`).  
   - Si le routage URL n'est pas encore branché sur plusieurs pages, documenter dans le code **comment** la démo reste un parcours contrôlé (ex. section principale dédiée) **sans** prétendre à un écran métier.

3. **Chemin nominal**  
   - Au moins une **PageManifest** démo affiche des widgets **enregistrés** dans des slots attendus, avec `ContextEnvelope` mock permettant l'accès (permissions requises satisfaites).

4. **Chemin fallback visible**  
   - Au moins **un** scénario parmi (non exhaustif) : widget inconnu dans une page autorisée, page refusée (`PageAccessBlocked`), lot manifest invalide **sur un scénario de test ou toggle démo** — l'essentiel est un **signal UI** aligné 3.6 + appel au chemin de reporting structuré là où c'est déjà branché.  
   - **Ne pas** masquer l'échec pour « faire joli ».

5. **Manifests / fixtures**  
   - Réutiliser ou étendre `peintre-nano/public/manifests/` et/ou `peintre-nano/src/fixtures/manifests/` de façon **cohérente** : une seule source de vérité par environnement (tests vs dev) documentée en commentaire README court ou en tête de module si nécessaire — éviter deux JSON divergents sans lien.

6. **Refactor `App.tsx` (attendu)**  
   - Extraire la logique de présentation démo dans un ou plusieurs modules dédiés (ex. `RuntimeDemoShell`, `RuntimeDemoPage`) pour que `App.tsx` reste un **orchestrateur fin** ; garder les tests existants verts ou les migrer proprement.

7. **Tests (obligatoires)**  
   - **e2e (RTL)** : scénario **nominal** — présence du marqueur bac à sable / racine démo + rendu d'au moins un widget résolu depuis le manifest.  
   - **e2e ou unitaire d'intégration** : scénario **fallback visible** — assertion sur un état d'échec visible (bannière, `PageAccessBlocked`, zone widget dégradée, etc.) **et** où pertinent espion / mock sur `reportRuntimeFallback`.  
   - Les commandes de done ci-dessous doivent passer sans régression des stories 3.x.

8. **Fichiers & emplacements (indicatifs)**  
   - `peintre-nano/src/app/` — composition démo, éventuellement sous-dossier `demo/` si le repo le suit.  
   - `peintre-nano/src/runtime/`, `peintre-nano/src/registry/` — seulement si extension minimale nécessaire (pas de fusion avec `validation/`).  
   - Manifests JSON — `public/manifests/` et/ou `fixtures/`.  
   - Tests : `peintre-nano/tests/e2e/…`, `peintre-nano/tests/unit/…`

---

## Tâches / sous-tâches

- [x] **T1** — Cartographier l'état actuel (`App.tsx`, fixtures, `public/manifests`) ; décider source manifests dev/test et documenter en une phrase dans la story ou README module.
- [x] **T2** — Introduire la surface bac à sable (navigation + libellés / testids) et factoriser le JSX démo hors de `App.tsx`.
- [x] **T3** — Garantir parcours nominal 100 % manifest + registre + enveloppe.
- [x] **T4** — Intégrer un parcours fallback visible exploitable depuis les tests (mock enveloppe, page manifest volontairement défectueuse, ou widget inconnu sur page démo).
- [x] **T5** — Tests e2e (nominal + fallback) + `npm run lint`, `build`, `test` verts.

---

## Critères de done testables (commandes — depuis `peintre-nano/`)

À exécuter depuis la racine du package `peintre-nano/` :

1. `npm ci` (ou `npm install`) — succès.
2. `npm run lint` — succès.
3. `npm run build` — succès.
4. `npm run test` — succès, incluant les **nouveaux** tests couvrant **nominal** + **fallback visible** sur la démo runtime.
5. Optionnel : `npm run dev` — parcourir la démo : chemin OK + chemin dégradé/bloqué selon scénario retenu.

**Gate Story Runner (référence brief parent) :** depuis `peintre-nano/` : `npm ci` ; `npm run lint` ; `npm run build` ; `npm run test` (timeout conseillé 900 s).

---

## Anti-patterns (à éviter)

1. `import` runtime depuis `references/`.
2. Rendu démo par un **gros JSX** qui **contourne** `PageRenderer` / registre pour le cœur de la preuve.
3. Liste de routes ou permissions **en dur** **à la place** des manifests pour la navigation ou les pages démo.
4. **Stack / Group** Mantine pour la **structure spatiale** du shell global.
5. Fusionner `registry/` et `runtime/` (ou déplacer la validation CREOS) **sans** story + ADR.
6. Introduire un **bus** ou un **agent** pour la démo.
7. Trancher **cashflow (a)/(b)** sans renvoi explicite au pipeline §16.

---

## Notes dev — références

- Structure & limites : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`.
- Epic & critères : `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.7.
- Story précédente : `_bmad-output/implementation-artifacts/3-6-rendre-visibles-les-fallbacks-et-rejets-de-runtime.md`.
- ADR P1/P2 : `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`.
- Code indicatif : `peintre-nano/src/app/App.tsx`, `RootShell.tsx`, `PageRenderer.tsx`, `FilteredNavEntries.tsx`, `load-manifest-bundle.ts`, `register-demo-widgets.ts`, `public/manifests/`, `src/fixtures/manifests/`.

---

## Dev Agent Record

### Agent Model Used

Composer / agent dev-story (session 2026-04-02).

### Debug Log References

— 

### Completion Notes List

- `RuntimeDemoApp` + `runtime-demo-manifest.ts` : lot nav + 3 pages, allowlist étendue pour `demo.runtime.stub-only` (validation OK, registre sans impl → fallback dégradé + `reportRuntimeFallback`).
- Nav interactive optionnelle sur `FilteredNavEntries` (`onSelectEntry`) ; parcours refus page via entrée `demo-guarded-nav` sans `required_permission_keys` + `PageManifest` exigeant `demo.permission.admin-only`.
- Fixtures : `navigation-demo-home-only.json` pour tests unitaires qui ne chargent qu'une page ; `navigation.json` complet aligné avec `public/manifests/`.
- Commandes validées depuis `peintre-nano/` : `npm ci`, `npm run lint`, `npm run test`, `npm run build`.

### File List

- `peintre-nano/src/app/App.tsx`
- `peintre-nano/src/app/FilteredNavEntries.tsx`
- `peintre-nano/src/app/FilteredNavEntries.module.css`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/app/demo/RuntimeDemoApp.module.css`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/app/demo/flatten-navigation-entries.ts`
- `peintre-nano/src/fixtures/manifests/valid/navigation.json`
- `peintre-nano/src/fixtures/manifests/valid/navigation-demo-home-only.json`
- `peintre-nano/src/fixtures/manifests/valid/page-unknown-widget.json`
- `peintre-nano/src/fixtures/manifests/valid/page-guarded.json`
- `peintre-nano/src/fixtures/manifests/README.md`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/public/manifests/page-unknown-widget.json`
- `peintre-nano/public/manifests/page-guarded.json`
- `peintre-nano/tests/e2e/runtime-demo-compose.e2e.test.tsx`
- `peintre-nano/tests/unit/manifest-loader-validation.test.tsx`
- `peintre-nano/tests/unit/runtime-rejection-reporting.test.tsx`
- `peintre-nano/tests/e2e/widget-declarative-rendering.e2e.test.tsx`
- `peintre-nano/tests/e2e/app-shell.e2e.test.tsx`
- `peintre-nano/tests/e2e/auth-context-envelope.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/3-7-produire-la-page-de-demonstration-du-runtime-compose.md`

### Change Log

- 2026-04-02 — Story 3.7 : page démo runtime composé, tests e2e nominal + fallbacks, sprint → review puis **done** après Story Runner complet.
- **2026-04-02** — Harmonisation statuts fichier ↔ `sprint-status.yaml` (epic-3 **done**).

---

## Story completion status

**Statut :** done

**Note :** Story Runner terminé (**PASS**) ; seule source de vérité process pour l'état backlog : `sprint-status.yaml`. `project-context.md` absent du dépôt au moment de la rédaction.
