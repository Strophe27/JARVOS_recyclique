# Story 3.4 : Intégrer l'adaptateur auth/session et la résolution par `ContextEnvelope`

**Clé fichier (obligatoire) :** `3-4-integrer-ladaptateur-authsession-et-la-resolution-par-contextenvelope`  
**Epic :** epic-3 — Poser le socle frontend greenfield `Peintre_nano`  
**Statut :** done

**Références skills BMAD (chemins contractuels) :**

- `create_story` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-create-story\SKILL.md`
- `dev_story` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-dev-story\SKILL.md`
- `qa_e2e` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-qa-generate-e2e-tests\SKILL.md`
- `code_review` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-code-review\SKILL.md`

<!-- Validation optionnelle : validate-create-story avant dev-story. -->

---

## Identité Story 3.4

- **Story :** 3.4 — **adaptateur auth/session** côté `Peintre_nano` + **résolution d'affichage** pilotée par un **`ContextEnvelope`** autoritatif (réel post-Convergence 1 ou **mock / stub** structurellement aligné avant).
- **Clé de fichier (exacte, obligatoire) :** `3-4-integrer-ladaptateur-authsession-et-la-resolution-par-contextenvelope` — toute autre variante de slug est **incorrecte** pour `implementation-artifacts` et `sprint-status.yaml`.
- **Epic :** epic-3 — runtime UI v2 minimal mais réel.
- **Prérequis livrés :** 3.1 (shell grille), 3.2 (chargement + validation manifests), 3.3 (registre + `PageRenderer` + slots). La story **réutilise** le bundle manifests validé et le rendu déclaratif ; elle y **superpose** session + enveloppe de contexte et la **règle d'intersection** (nav / page / permissions).

---

## Primauté ADR (obligatoire)

**Phrase de primauté (non négociable) :** le document `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` est **accepté** ; cette ADR **prime** sur toute section du concept ou de la vision qui laisserait ouverts P1/P2, le choix CSS ou la stack UI.

**Implications directes pour 3.4 :**

- Tout **état dégradé / bannière / shell** lié au contexte ou à la session : **CSS Modules** + **tokens** (`var(--pn-…)` pour le code UI nouveau) ; pas de layout spatial du shell via **Stack / Group Mantine** (la grille `RootShell` reste la référence — story 3.1).
- Mantine reste autorisée pour **composants riches** à l'intérieur de blocs (Text, Alert, etc.), conformément à l'ADR, **sans** en faire le moteur de composition spatiale globale.

---

## Contexte nano → mini → macro

- **Nano :** provider / hooks d'**auth+contexte**, filtrage nav, garde de rendu page, mocks Piste A — **pas** de bus d'événements métier, **pas** d'agent SDUI, **pas** de `FlowRenderer` complet sauf exigence explicite ailleurs.
- **Mini / macro :** hors périmètre sauf mention contraire dans une story dédiée.

---

## Périmètre Story 3.4 vs stories adjacentes

| Zone | Story 3.4 | Hors périmètre |
|------|-----------|----------------|
| Adaptateur session (état connu côté UI, aligné contrat backend / OpenAPI) | **Oui** | — |
| Fourniture / rafraîchissement de `ContextEnvelope` (instance runtime) | **Oui** (mock ou client futur derrière une **façade** stable) | Implémentation **serveur** du `ContextEnvelope` → **Epic 2** (ex. 2.1, 2.2) |
| Filtrage des entrées de **navigation** selon permissions / signaux de contexte | **Oui** | — |
| Blocage ou état restreint si contexte requis manquant / ambigu | **Oui** | — |
| `UserRuntimePrefs` (densité, panneaux, etc.) | **Hors** logique d'autorisation | **3.5** |
| Politique unifiée de **fallbacks visuels** (severity, messages opérateur) | **Minimal** (explicite, testable) | **3.6** complète |
| Widgets métier, bandeau live, OpenAPI généré branché en prod | — | **Epic 4** / Convergence 1–2 |

**Continuité 3.3 :** ne pas casser `widget-registry`, `PageRenderer`, `allowed-widget-types` ni les tests existants ; **enrichir** la résolution (nav + page) avec les données d'enveloppe **sans** dupliquer une seconde vérité permissions en local.

---

## Les quatre artefacts (rappel — pas de substitut contractuel)

| Artefact | En 3.4 |
|----------|--------|
| `NavigationManifest` | Entrées **filtrées** pour l'affichage selon **intersection** avec `ContextEnvelope` (et éventuelles **contraintes déclaratives** du manifest, ex. clés de permission requises — **à ajouter au type / ingest si le contrat CREOS les prévoit** ; sinon étendre de façon **optionnelle** et documentée pour les fixtures de test uniquement, sans inventer de sémantique métier parallèle). |
| `PageManifest` | Rendu **uniquement** si le contexte actif autorise l'accès à la page sélectionnée (règle explicite : même principe d'intersection). |
| `ContextEnvelope` | **Source autoritative** des permissions effectives et signaux de contexte pour l'UI ; le stub TypeScript actuel (`ContextEnvelopeStub`) doit **rester aligné** sur la trajectoire OpenAPI ; enrichissement des champs **sans** figer une seconde spec si le fichier OpenAPI canonique n'est pas encore dans le repo. |
| `UserRuntimePrefs` | **Ne pas** utiliser pour révéler routes/pages ni contourner le filtrage ; story **3.5** bornera les prefs. |

**Hiérarchie de vérité (architecture / epics) :** `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs` — [Source : `_bmad-output/planning-artifacts/epics.md` — AR39 ; `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Data Flow / Piste A]

**Règle produit :** l'affichage ne vaut pas autorisation — [Source : epics FR72, AR23, UX-DR3]

---

## Frontières repo (Piste A) et boundaries structurels

- **Mocks jusqu'à Convergence 1 :** code sous `peintre-nano/` ; **aucun** `import` **runtime** depuis `references/` (la doc peut citer des chemins en story uniquement).
- **`registry/`**, **`runtime/`**, **`validation/`** : **ne pas fusionner** les dossiers sans story + ADR — l'adaptateur vit typiquement sous `src/app/auth/` et/ou `src/app/context/` (voir arborescence cible dans `project-structure-boundaries.md`) ; la **résolution** (filtrage, garde) peut vivre dans un module **`runtime/`** ou **`app/guards/`** selon conventions existantes, **sans** déplacer toute la validation CREOS dans le registre widgets.
- **Convergence 1 :** le **basculement** mock → client HTTP / types générés OpenAPI ne doit **pas** obliger à réécrire les widgets — seulement les **hooks / client** derrière la façade d'adaptateur [Source : epics Story 3.4, `project-structure-boundaries.md` § Convergence 1].

---

## Convention `MAX_CONTEXT_AGE_MS` (Piste A)

- Documenter et implémenter une **convention de fraîcheur** côté UI : si l'enveloppe est considérée comme **périmée** (horodatage / âge > seuil configurable pour les tests), le runtime bascule en **état dégradé explicite** (pas de supposition silencieuse d'un contexte métier valide) — aligné PRD §10.1 / pipeline §2 [Source : `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md` §2, §16].

---

## Flows cashflow (a) / (b) — note de cadrage

La story 3.4 **ne tranche pas** le format natif des flows caisse (`cashflow` vs `wizard`/`tabbed`).

- **Ne pas trancher silencieusement :** si une implémentation touche aux flows ou à leur validation, renvoyer explicitement aux fondations et au pipeline **§16** (critère (a)/(b) et ordre des merges) — [Source : `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md` §16 ; `references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md` §7].

---

## Stack P1 / versions

- **P1** : CSS Modules + `tokens.css` + Mantine v8 (usage conforme ADR).
- **React / TypeScript / Vite** : alignés sur `peintre-nano/package.json` — pas d'ajout de bus ou de librairie auth lourde sans justification dans la story + alignement architecture.

---

## Story

As a **secure frontend runtime**,  
I want **`Peintre_nano` to consume backend auth/session state and `ContextEnvelope`**,  
So that **visible navigation and rendered pages stay aligned with backend-owned permissions and context**.

---

## Critères d'acceptation (BDD — source epics)

**Given** backend auth and context are authoritative  
**When** the frontend auth/context adapter is implemented  
**Then** `Peintre_nano` consumes session state and `ContextEnvelope` from backend-owned contracts  
**And** it does not promote local runtime state to a second source of truth for permissions or active context  

**Given** la **Piste A** peut valider l'adaptateur avec un **mock** de session et d'enveloppe conforme aux types attendus  
**When** la **Convergence 1** n'est pas encore livrée  
**Then** les tests et la demo peuvent utiliser des mocks tout en préservant la forme contractuelle (y compris convention de fraîcheur `MAX_CONTEXT_AGE_MS` côté UI)  
**And** le basculement vers les réponses réelles du backend ne nécessite pas de réécrire les composants widgets, seulement les hooks / client API  

**Given** effective rendering is the intersection of commanditaire contracts and active backend context  
**When** a page is resolved  
**Then** inaccessible navigation entries are filtered according to backend permission and context signals  
**And** no business page is rendered when required context or permissions are missing  

**Given** context can become ambiguous or incomplete  
**When** the runtime receives restricted or degraded backend context  
**Then** the frontend reflects that explicit state instead of guessing a valid business configuration  
**And** it preserves the security-first rule defined in the PRD  

[Source : `_bmad-output/planning-artifacts/epics.md` — Story 3.4]

---

## Exigences techniques détaillées (pour le dev)

1. **Façade adaptateur (session + `ContextEnvelope`)**  
   - Exposer un **contexte React** (ou équivalent idiomatique) : `useAuthSession()`, `useContextEnvelope()` (noms indicatifs), plus un **fournisseur** racine dans `main.tsx` / `App` selon l'architecture actuelle.  
   - **Implémentation Piste A :** module **`mock`** ou `createMockAuthContext(...)` pour tests + démo, retournant des données **typées** (`ContextEnvelopeStub` étendu si nécessaire : ex. `issuedAt` / `maxAgeMs`, statut `ok` | `degraded` | `forbidden`, etc. — **sans** dupliquer une spec OpenAPI complète si absente du repo ; commenter les champs « à aligner sur OpenAPI »).  
   - **Préparation Convergence 1 :** interface stable (ex. `AuthContextPort`) pour brancher ultérieurement un client fetch / TanStack Query sans changer les consommateurs UI.

2. **Session**  
   - Représenter au minimum : utilisateur authentifié ou non, identifiants non sensibles utiles aux tests (ex. `userId` optionnel), et tout champ **strictement nécessaire** pour simuler les garde-fous (pas de secrets en clair dans les fixtures).

3. **Filtrage navigation**  
   - À partir d'un `NavigationManifest` **déjà validé** (3.2), produire une **vue filtrée** (liste / arbre) pour le rendu : une entrée est **masquée** si les **permission keys** effectives de l'enveloppe ne satisfont pas les exigences déclaratives de l'entrée.  
   - Si le schéma JSON actuel n'expose pas encore `required_permission_keys` (ou équivalent), **étendre** `NavigationEntry` + `navigation-ingest` de façon **rétrocompatible** (champ optionnel) et mettre à jour les **fixtures** avec au moins un cas « visible » et un cas « masqué » pour les tests.

4. **Résolution de page**  
   - Lier la page active (ex. `demo-home`) à une règle : si le contexte exige un `siteId` / permissions minimales pour afficher la page métier, **ne pas** rendre `PageRenderer` avec le manifest métier ; afficher un **état explicite** (message bref, `data-testid` stable — CSS Module pour le conteneur si nouveau).  
   - Ne **pas** hardcoder des routes ou permissions **métier** en substitution des contrats : la démo peut utiliser des **clés de permission factices** cohérentes avec les mocks (`demo.permission.view-home`, etc.).

5. **Intégration `App` / `RootShell`**  
   - Brancher le **nav filtré** dans la zone `nav` du shell (remplacer ou compléter le placeholder actuel de façon **testable**).  
   - Conserver le flux **ManifestErrorBanner** si le bundle est invalide (priorité : erreurs manifest **avant** résolution contextuelle).

6. **Fichiers & emplacements (indicatifs)**  
   - `peintre-nano/src/app/auth/` — déjà annoncé par README existant ; y placer provider + hooks ou réexporter depuis sous-modules clairs.  
   - `peintre-nano/src/types/context-envelope.ts` — faire évoluer le stub avec commentaires d'alignement OpenAPI.  
   - Module utilitaire de **filtrage** : `peintre-nano/src/runtime/filter-navigation-for-context.ts` (fonction pure `filterNavigation(manifest, envelope)` — **un seul** endroit de vérité ; pas de fichier `resolve-navigation-for-context.ts` dans le dépôt).

7. **Tests**  
   - **Vitest** : cas unitaires sur la fonction de filtrage ; cas de rendu : entrée masquée, page bloquée, contexte périmé (`MAX_CONTEXT_AGE_MS`), contexte dégradé.  
   - Mettre à jour ou ajouter des **e2e** légers si la suite existante couvre le shell (`data-testid` nav).  
   - Respecter les garde-fous Testing Library (scoper les queries comme en 3.3 si plusieurs listes).

---

## Tâches / sous-tâches

- [x] **T1** — Définir les types / façade `AuthContextPort` + état session minimal ; provider racine.
- [x] **T2** — Étendre `ContextEnvelopeStub` (champs fraîcheur + statut dégradé si besoin) ; mocks réutilisables pour tests.
- [x] **T3** — Étendre `NavigationEntry` + ingest JSON pour **exigences de permission optionnelles** ; fixtures avec cas filtrés.
- [x] **T4** — Implémenter `filterNavigation` (pur) + tests unitaires.
- [x] **T5** — Garde de rendu page + intégration `App` / `RootShell` / zone `nav`.
- [x] **T6** — Tests e2e / intégration mis à jour ; `npm run lint`, `npm run build`, `npm run test` verts.
- [x] **T7** — README courts : `src/app/auth/`, module de résolution choisi — mention Convergence 1 et **interdiction** import `references/` au runtime.

---

## Critères de done testables (commandes — depuis `peintre-nano/`)

À exécuter depuis la racine du package `peintre-nano/` :

1. `npm ci` (ou `npm install`) — succès.
2. `npm run lint` — succès.
3. `npm run build` — succès.
4. `npm run test` — succès, avec tests couvrant **filtrage nav**, **garde page**, et **au moins un** chemin **contexte dégradé / périmé**.
5. Optionnel : `npm run dev` — vérifier visuellement le nav filtré et l'état bloqué / dégradé.

---

## Anti-patterns (à éviter)

1. `import` runtime depuis `references/`.
2. Promouvoir un état React local (prefs, cache ad hoc) comme **vérité** des permissions ou du contexte actif.
3. Hardcoder une arborescence de navigation **métier** hors `NavigationManifest`.
4. Utiliser **Stack / Group** Mantine pour la **structure spatiale** du shell global.
5. Fusionner `registry/` et `runtime/` (ou déplacer la validation CREOS dans le registre) **sans** story + ADR.
6. Implémenter le **backend** `ContextEnvelope` ou les endpoints session réels (Epic 2) dans cette story.
7. Introduire un **bus** ou un **agent** pour remplacer un simple provider / hooks.

---

## Notes dev — architecture et intelligence story précédente

- Structure & limites : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`.
- Epic & critères : `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.4) ; AR13, AR23, AR39, AR40, AR42, UX-DR3.
- Backend autoritatif (contexte) : `_bmad-output/planning-artifacts/epics.md` — Epic 2, stories 2.1, 2.2 (contrats futurs ; pas d'implémentation dans 3.4).
- Story précédente (registre + rendu) : `_bmad-output/implementation-artifacts/3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif.md` — patterns : allowlist ↔ registre, `PageRenderer`, pas d'auth dans 3.3.
- Fichiers code actuels utiles :  
  - `peintre-nano/src/app/App.tsx`, `peintre-nano/src/app/layouts/RootShell.tsx`  
  - `peintre-nano/src/types/context-envelope.ts`, `peintre-nano/src/runtime/conceptual-artifacts.ts`  
  - `peintre-nano/src/validation/navigation-ingest.ts`, `peintre-nano/src/types/navigation-manifest.ts`  
  - `peintre-nano/src/app/auth/README.md`

---

## Recherche technique / versions (rappel)

- Stack figée par le repo : **React 18+**, **TypeScript**, **Vite**, **Mantine v8** — pas de migration majeure dans cette story.
- Lorsque `contracts/openapi/recyclique-api.yaml` exposera le schéma canonique de `ContextEnvelope`, **regénérer** les types dans `src/generated/openapi/` (ou équivalent) et **remplacer** progressivement le stub par les types générés — hors périmètre tant que Convergence 1 n'est pas livrée.

---

## Références projet-context (si présent)

- Charger `**/project-context.md` au moment du `dev-story` s'il existe à la racine ou sous `_bmad-output/` ; ce fichier peut compléter les conventions d'équipe non dupliquées ici.

---

## Dev Agent Record

### Agent Model Used

_(Cursor agent — dev-story 3.4)_

### Debug Log References

### Completion Notes List

- Façade `AuthContextPort`, `createMockAuthAdapter`, `getDefaultDemoAuthAdapter` / `createDefaultDemoEnvelope`, `AuthRuntimeProvider` + `useAuthSession` / `useContextEnvelope`, intégration dans `RootProviders` (`authAdapter` optionnel pour les tests).
- `ContextEnvelopeStub` enrichi (`issuedAt`, `maxAgeMs?`, `runtimeStatus`) ; `MAX_CONTEXT_AGE_MS` + `isEnvelopeStale` dans `context-envelope-freshness.ts`.
- `NavigationEntry.requiredPermissionKeys` + ingest ; `PageManifest.requiredPermissionKeys` / `requiresSite` + ingest ; fixtures nav + page + `public/manifests` alignés.
- `filterNavigation` (runtime) : permissions + vidage si `forbidden` / `degraded` / périmé ; `resolvePageAccess` pour la garde page ; UI `FilteredNavList`, `PageAccessBlocked`.
- Tests unitaires + e2e `auth-context-envelope.e2e.test.tsx` ; script `npm run test` via `node …/vitest.mjs` pour robustesse Windows.

### File List

- `peintre-nano/package.json`
- `peintre-nano/src/types/context-envelope.ts`
- `peintre-nano/src/types/navigation-manifest.ts`
- `peintre-nano/src/types/page-manifest.ts`
- `peintre-nano/src/validation/navigation-ingest.ts`
- `peintre-nano/src/validation/page-manifest-ingest.ts`
- `peintre-nano/src/runtime/context-envelope-freshness.ts`
- `peintre-nano/src/runtime/filter-navigation-for-context.ts`
- `peintre-nano/src/runtime/resolve-page-access.ts`
- `peintre-nano/src/runtime/conceptual-artifacts.stub.ts`
- `peintre-nano/src/runtime/README.md`
- `peintre-nano/src/app/App.tsx`
- `peintre-nano/src/app/FilteredNavList.tsx`
- `peintre-nano/src/app/FilteredNavList.module.css`
- `peintre-nano/src/app/PageAccessBlocked.tsx`
- `peintre-nano/src/app/PageAccessBlocked.module.css`
- `peintre-nano/src/app/providers/RootProviders.tsx`
- `peintre-nano/src/app/auth/auth-context-port.ts`
- `peintre-nano/src/app/auth/mock-auth-adapter.ts`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/src/app/auth/AuthRuntimeProvider.tsx`
- `peintre-nano/src/app/auth/README.md`
- `peintre-nano/src/fixtures/manifests/valid/navigation.json`
- `peintre-nano/src/fixtures/manifests/valid/page-home.json`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/public/manifests/page-home.json`
- `peintre-nano/tests/unit/filter-navigation-for-context.test.ts`
- `peintre-nano/tests/unit/resolve-page-access.test.ts`
- `peintre-nano/tests/unit/context-envelope-freshness.test.ts`
- `peintre-nano/tests/e2e/auth-context-envelope.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/3-4-integrer-ladaptateur-authsession-et-la-resolution-par-contextenvelope.md`

### Change Log

- 2026-04-02 — Story 3.4 : adaptateur auth/contexte, `filterNavigation`, `resolvePageAccess`, intégration shell + tests + README.

---

## Story completion status

**Statut :** done

**Note :** Cycle BMAD terminé (**PASS**) ; `sprint-status.yaml` aligné. Gates `lint` / `build` / `test` exécutés avec succès.
