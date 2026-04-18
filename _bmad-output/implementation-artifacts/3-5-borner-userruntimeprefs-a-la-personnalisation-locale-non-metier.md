# Story 3.5 : Borner `UserRuntimePrefs` à la personnalisation locale non métier

**Clé fichier (obligatoire) :** `3-5-borner-userruntimeprefs-a-la-personnalisation-locale-non-metier`  
**Epic :** epic-3 — Poser le socle frontend greenfield `Peintre_nano`  
**Statut :** done

**Références skills BMAD (chemins contractuels) :**

- `create_story` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-create-story\SKILL.md`
- `dev_story` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-dev-story\SKILL.md`
- `qa_e2e` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-qa-generate-e2e-tests\SKILL.md`
- `code_review` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-code-review\SKILL.md`

<!-- Validation optionnelle : validate-create-story avant dev-story. -->

---

## Identité Story 3.5

- **Story :** 3.5 — formaliser **`UserRuntimePrefs`** comme couche **uniquement** de personnalisation **locale** (présentation, confort) **sans** altérer vérité métier, permissions, navigation commanditaire ou sens des écrans.
- **Clé de fichier (exacte, obligatoire) :** `3-5-borner-userruntimeprefs-a-la-personnalisation-locale-non-metier` — toute autre variante de slug est **incorrecte** pour `implementation-artifacts` et `sprint-status.yaml`.
- **Epic :** epic-3 — runtime UI v2 minimal mais réel.
- **Prérequis livrés :** 3.1–3.4 (shell, manifests, registre + rendu, auth + `ContextEnvelope` + filtrage nav / garde page). Le type `UserRuntimePrefs` existe déjà dans `peintre-nano/src/types/user-runtime-prefs.ts` avec des champs minimaux ; cette story **borne** l'usage runtime, **expose** un provider / hooks stables et **garantit** par tests que les prefs **ne contournent** pas `filterNavigation` / `resolvePageAccess`.

---

## Primauté ADR (obligatoire)

**Phrase de primauté (non négociable) :** le document `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` est **accepté** ; cette ADR **prime** sur toute section du concept ou de la vision qui laisserait ouverts P1/P2, le choix CSS ou la stack UI.

**Implications directes pour 3.5 :**

- Tout **contrôle UI** lié aux prefs (toggles densité, panneaux, onboarding) : **CSS Modules** + **tokens** (`var(--pn-…)`) pour le code UI nouveau ; **pas** de layout spatial du **shell** via **Stack / Group Mantine** (la grille `RootShell` reste la référence — story 3.1).
- Mantine reste autorisée pour **composants riches** à l'intérieur de blocs (Switch, Text, etc.), conformément à l'ADR, **sans** en faire le moteur de composition spatiale globale.
- **P2 (PostgreSQL pour config admin)** : hors périmètre — les prefs de cette story restent **locales par défaut** ; pas de persistance serveur ni table SQL dans 3.5.

---

## Contexte nano → mini → macro

- **Nano :** provider / hooks **`UserRuntimePrefs`**, mise à jour locale, effets **purement présentationnels** — **pas** de bus métier, **pas** d'agent SDUI.
- **Mini / macro :** hors périmètre sauf mention contraire dans une story dédiée.

---

## Périmètre Story 3.5 vs stories adjacentes

| Zone | Story 3.5 | Hors périmètre |
|------|-----------|----------------|
| Définition / évolution du **type** `UserRuntimePrefs` (champs autorisés : densité, panneaux, onboarding, raccourcis **personnels** non structurels, etc.) | **Oui** (rétrocompatible si extension) | Clés de permission, `siteId`, routes — **jamais** dans les prefs |
| **Provider React** + API stable (`useUserRuntimePrefs`, etc.) | **Oui** | — |
| Persistance **locale** (ex. `localStorage` derrière une façade testable) | **Oui** (optionnel mais recommandé pour preuve « local by default ») | Endpoint backend, sync multi-appareil — **hors** 3.5 (futur endpoint **explicite** seulement, cf. AR43 epics) |
| **Garantie** : prefs n'influencent **pas** `filterNavigation` / `resolvePageAccess` | **Oui** (tests obligatoires) | — |
| Application des prefs au **rendu** (classes CSS / data attributes / tokens) dans le shell ou widgets démo | **Oui** (minimal, testable) | Refonte visuelle complète |
| Politique unifiée **fallbacks** runtime (severity, messages) | — | **3.6** |
| Page démo runtime composé bout-en-bout | — | **3.7** |
| Personnalisation transverse produit (Epic 5) | **Prépare** le mécanisme sûr | **Pas** l'implémentation Epic 5 |

**Continuité 3.4 :** ne **pas** modifier la sémantique de `ContextEnvelope`, `filterNavigation` ou `resolvePageAccess` pour « aider » les prefs ; les consommateurs de prefs lisent l'état **après** résolution commanditaire + contexte.

---

## Les quatre artefacts (rappel — pas de substitut contractuel)

| Artefact | En 3.5 |
|----------|--------|
| `NavigationManifest` | **Inchangé** comme source structurelle ; les prefs **ne peuvent pas** ajouter d'entrées ni révéler des entrées filtrées par le contexte. |
| `PageManifest` | Idem — **aucune** page supplémentaire via prefs. |
| `ContextEnvelope` | **Autorité** inchangée ; prefs **ne** portent **pas** de permissions effectives. |
| `UserRuntimePrefs` | **Objet de la story** — dernier maillon de la hiérarchie de vérité [AR39]. |

**Hiérarchie de vérité :** `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs` — [Source : `_bmad-output/planning-artifacts/epics.md` — AR39 ; `project-structure-boundaries.md` — Data Flow]

**Règle produit (UX-DR3, UX-DR12) :** les prefs n'ajustent que la **présentation locale** dans le périmètre déjà autorisé par contrats + contexte ; pas de route, page, permission ou visibilité métier supplémentaire — [Source : epics.md]

---

## Frontières repo (Piste A) et boundaries structurels

- **Mocks jusqu'à Convergence 1 :** code sous `peintre-nano/` ; **aucun** `import` **runtime** depuis `references/`.
- **`registry/`**, **`runtime/`**, **`validation/`** : **ne pas fusionner** les dossiers sans story + ADR — un **`UserRuntimePrefsProvider`** vit typiquement sous `src/app/providers/` ou `src/app/context/` ; éviter de mélanger prefs et auth dans un seul fichier monolithique **sans** séparation claire des responsabilités.
- **Convergence 1 :** un futur branchement backend pour prefs (si un jour endpoint dédié) ne doit **pas** obliger à réécrire les composants de présentation — seulement la **couche persistance** derrière une façade stable.

---

## Flows cashflow (a) / (b) — note de cadrage

Cette story **ne tranche pas** le format des flows caisse. **Ne pas trancher silencieusement :** toute évolution qui toucherait aux flows ou à leur validation doit renvoyer explicitement aux fondations et au pipeline **§16** — [Source : `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md` §16]. Si le périmètre reste limité aux prefs UI du shell, **aucune** implémentation cashflow n'est requise.

---

## Stack P1 / versions

- **P1** : CSS Modules + `tokens.css` + Mantine v8 (usage conforme ADR).
- **React / TypeScript / Vite** : alignés sur `peintre-nano/package.json`.

---

## Story

As a **user experience runtime**,  
I want **local runtime preferences to personalize presentation without altering business truth**,  
So that **users gain comfort without compromising permissions, routes, or domain meaning**.

---

## Critères d'acceptation (BDD — source epics)

**Given** `UserRuntimePrefs` belongs to frontend runtime only  
**When** local preferences are implemented  
**Then** they support allowed concerns such as density, panel state, onboarding, or shortcut overrides  
**And** they remain local by default unless an explicit dedicated backend endpoint is designed later  

**Given** local preferences must never become an authorization bypass  
**When** preferences are applied during rendering  
**Then** they cannot create a route, reveal a hidden business page, or grant extra visibility beyond commanditaire contracts and backend context  
**And** the runtime enforces this limitation structurally  

**Given** future UI polish will build on this layer  
**When** this story is completed  
**Then** Epic 5 and later epics can reuse a safe personalization mechanism  
**And** they do not need to invent ad hoc UI preference stores with unclear authority  

[Source : `_bmad-output/planning-artifacts/epics.md` — Story 3.5]

---

## Exigences techniques détaillées (pour le dev)

1. **Façade prefs (provider + hooks)**  
   - Exposer un contexte React : ex. `useUserRuntimePrefs()` retournant `{ prefs, setPrefs | updatePrefs }` avec mises à jour **immutables** et typées (`UserRuntimePrefs`).  
   - Monter le provider sous `RootProviders` (ou équivalent) **sans** casser l'ordre existant auth / manifest.

2. **Type `UserRuntimePrefs`**  
   - Conserver ou étendre `peintre-nano/src/types/user-runtime-prefs.ts` : seuls des champs **non métier** (densité UI, état panneau latéral, progression onboarding, préférences d'affichage).  
   - **Interdit** dans le type : `permissionKeys`, `routes`, `siteId` métier, tout champ qui pourrait être confondu avec `ContextEnvelope`.

3. **Effet présentationnel minimal**  
   - Au moins un effet **visible** ou **testable** : ex. `uiDensity` appliquée via `data-attribute` sur le shell racine ou classe CSS Module mappée aux tokens (compact vs comfortable).  
   - Documenter dans un README court (`src/app/providers/` ou `src/types/README.md` existant) que **seuls** les consommateurs de **présentation** lisent les prefs.

4. **Séparation nette avec 3.4**  
   - `filter-navigation-for-context.ts` et `resolve-page-access.ts` : **ne pas** accepter `UserRuntimePrefs` en paramètre pour décider masquage / accès. Si un refactor introduit un paramètre « options », documenter explicitement que les prefs **n'y figurent pas**.

5. **Tests (obligatoires)**  
   - **Unitaires** : mise à jour des prefs ne change pas le résultat de `filterNavigation` / `resolvePageAccess` pour les mêmes entrées manifest + envelope (jeux de données fixes).  
   - **e2e ou intégration** : scénario où une entrée nav est masquée par permissions insuffisantes — basculer une pref (ex. densité) **ne fait pas** réapparaître l'entrée (`data-testid` stable).  
   - Optionnel : persistance `localStorage` avec clé namespacée (`peintre-nano:`) + test d'hydratation.

6. **Fichiers & emplacements (indicatifs)**  
   - `peintre-nano/src/types/user-runtime-prefs.ts`  
   - `peintre-nano/src/app/providers/` — nouveau `UserRuntimePrefsProvider.tsx` (+ `.module.css` si besoin)  
   - `peintre-nano/src/runtime/conceptual-artifacts.ts` — rappel hiérarchie si besoin, sans logique métier  
   - Tests : `peintre-nano/tests/unit/…`, `peintre-nano/tests/e2e/…`

---

## Tâches / sous-tâches

- [x] **T1** — Provider + hooks `UserRuntimePrefs` ; intégration `RootProviders`.
- [x] **T2** — Finaliser / étendre le type et validateurs locaux (`isUiDensity`, etc.).
- [x] **T3** — Appliquer au moins une pref au shell (attribut / classe + tokens).
- [x] **T4** — Tests unitaires : indépendance prefs ↔ filtrage nav / garde page.
- [x] **T5** — Test e2e (ou intégration) : prefs ne révèlent pas entrée masquée.
- [x] **T6** — README court ; `npm run lint`, `build`, `test` verts.

---

## Critères de done testables (commandes — depuis `peintre-nano/`)

À exécuter depuis la racine du package `peintre-nano/` :

1. `npm ci` (ou `npm install`) — succès.
2. `npm run lint` — succès.
3. `npm run build` — succès.
4. `npm run test` — succès, avec tests couvrant **indépendance prefs / autorisation** et au moins un **effet présentationnel** lié aux prefs.
5. Optionnel : `npm run dev` — vérifier visuellement le toggle / l'état densité (ou équivalent).

---

## Anti-patterns (à éviter)

1. `import` runtime depuis `references/`.
2. Utiliser les prefs pour **court-circuiter** `FilteredNavList`, `resolvePageAccess` ou tout filtre basé sur `ContextEnvelope`.
3. Stocker dans les prefs des **clés de permission** ou des **routes** comme source de vérité.
4. **Stack / Group** Mantine pour la **structure spatiale** du shell global.
5. Fusionner `registry/` et `runtime/` (ou déplacer la validation CREOS) **sans** story + ADR.
6. Implémenter un **endpoint backend** ou persistance PostgreSQL pour les prefs dans cette story.
7. Introduire un **bus** ou un **agent** pour les préférences utilisateur.

---

## Notes dev — références

- Structure & limites : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`.
- Epic & critères : `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.5 ; AR39, AR40, AR43, UX-DR3, UX-DR12.
- Story précédente : `_bmad-output/implementation-artifacts/3-4-integrer-ladaptateur-authsession-et-la-resolution-par-contextenvelope.md` — patterns auth, filtrage, garde page.
- ADR P1/P2 : `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`.
- Code existant : `peintre-nano/src/types/user-runtime-prefs.ts`, `peintre-nano/src/runtime/conceptual-artifacts.ts`, `peintre-nano/src/app/providers/RootProviders.tsx`.

---

## Dev Agent Record

### Agent Model Used

Cursor agent — sous-agent Task (étape DS / `bmad-dev-story`).

### Debug Log References

_(aucun)_

### Completion Notes List

- `UserRuntimePrefsProvider` + `useUserRuntimePrefs` sous `AuthRuntimeProvider` ; persistance `localStorage` clé `peintre-nano:user-runtime-prefs`, désactivable en tests via `disableUserPrefsPersistence` sur `RootProviders`.
- Type étendu avec `sidebarPanelOpen` ; `normalizeUserRuntimePrefs` pour hydratation sûre ; shell : `data-pn-ui-density`, `data-pn-sidebar-panel` + règles CSS Modules (tokens).
- `FilterNavigationOptions` / `ResolvePageAccessOptions` documentés : pas de prefs sur les chemins d'autorisation.
- Tests : indépendance prefs / `filterNavigation`+`resolvePageAccess`, persistance, e2e toggle densité + entrée admin toujours absente.

### File List

- `peintre-nano/src/types/user-runtime-prefs.ts`
- `peintre-nano/src/types/README.md`
- `peintre-nano/src/app/providers/UserRuntimePrefsProvider.tsx`
- `peintre-nano/src/app/providers/README.md`
- `peintre-nano/src/app/providers/RootProviders.tsx`
- `peintre-nano/src/app/App.tsx`
- `peintre-nano/src/app/App.module.css`
- `peintre-nano/src/app/layouts/RootShell.tsx`
- `peintre-nano/src/app/layouts/RootShell.module.css`
- `peintre-nano/src/runtime/filter-navigation-for-context.ts`
- `peintre-nano/src/runtime/resolve-page-access.ts`
- `peintre-nano/src/runtime/conceptual-artifacts.ts`
- `peintre-nano/src/runtime/conceptual-artifacts.stub.ts`
- `peintre-nano/tests/unit/user-runtime-prefs-vs-authorization.test.ts`
- `peintre-nano/tests/unit/user-runtime-prefs-storage.test.tsx`
- `peintre-nano/tests/unit/root-shell.test.tsx`
- `peintre-nano/tests/unit/conceptual-artifacts.test.ts`
- `peintre-nano/tests/e2e/user-runtime-prefs.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/3-5-borner-userruntimeprefs-a-la-personnalisation-locale-non-metier.md`

### Change Log

- 2026-04-02 — Story 3.5 : provider prefs, bornes type, shell présentationnel, tests indépendance / e2e / localStorage ; sprint `3-5` → `review` puis **done** après Story Runner (gates, QA e2e, CR PASS).

---

## Story completion status

**Statut :** done

**Note :** Cycle CS → VS → DS → GATE → QA → CR terminé avec PASS ; `sprint-status` aligné sur `done`.
