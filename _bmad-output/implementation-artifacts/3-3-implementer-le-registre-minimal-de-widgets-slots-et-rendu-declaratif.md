# Story 3.3 : Implémenter le registre minimal de widgets, slots et rendu déclaratif

**Clé fichier (obligatoire) :** `3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif`  
**Epic :** epic-3 — Poser le socle frontend greenfield `Peintre_nano`  
**Statut :** done

**Références skills BMAD (brief Story Runner — chemins contractuels) :**

- `create_story` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-create-story\SKILL.md`
- `dev_story` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-dev-story\SKILL.md`
- `qa_e2e` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-qa-generate-e2e-tests\SKILL.md`
- `code_review` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-code-review\SKILL.md`

<!-- Note : validation optionnelle via validate-create-story avant dev-story. -->

---

## Identité Story 3.3

- **Story :** 3.3 — **registre minimal** `widgetType` → composant React, **placement déclaratif** des widgets dans des **slots** nommés issus du `PageManifest`, et **rendu** d'un **catalogue starter** (infra runtime, pas UI métier déguisée).
- **Clé de fichier (exacte, obligatoire) :** `3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif` — toute autre variante de slug est **incorrecte** pour les chemins `implementation-artifacts` et `sprint-status.yaml`.
- **Epic :** epic-3 — runtime UI v2 minimal mais réel.
- **Prérequis livrés :** 3.2 fournit chargement + validation du bundle manifests ; l'allowlist des `widgetType` doit être **la même source** que le registre (`peintre-nano/src/validation/allowed-widget-types.ts` importe `getRegisteredWidgetTypeSet` depuis `src/registry/`) — **aucune** deuxième liste parallèle non synchronisée.

---

## Primauté ADR (obligatoire)

**Phrase de primauté (non négociable) :** le document `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` est **accepté** ; cette ADR **prime** sur toute section du concept ou de la vision qui laisserait ouverts P1/P2, le choix CSS ou la stack UI.

**Implications directes pour 3.3 :**

- Chaque widget du catalogue starter = **composant React** + **`.module.css`** ; style interne + **tokens** `var(--pn-…)` ; **pas** de valeurs magiques hors tokens.
- **Mantine v8** : utilisable **à l'intérieur** d'un widget (composants riches), comme en ADR ; **interdit** comme substitut au **layout spatial** du shell (`RootShell` reste grille CSS — story 3.1).
- Le **placement sur la page** (slots / grille) reste **hors** des modules widget : le moteur de composition (registre + renderer de page) applique la structure ; les widgets ne se positionnent pas eux-mêmes sur le shell global.

---

## Contexte nano → mini → macro

- **Nano :** registre + résolution + rendu déclaratif à partir de manifests **déjà validés** (3.2) ; **pas** de bus, **pas** d'agent SDUI, **pas** de `FlowRenderer` complet sauf si déjà imposé ailleurs (hors périmètre par défaut).
- **Mini / macro :** hors périmètre — pas de pipeline agent, pas d'enrichissement automatique des manifests.

---

## Périmètre Story 3.3 vs stories adjacentes

| Zone | Story 3.3 | Hors périmètre (autres stories) |
|------|-----------|----------------------------------|
| Registre `widgetType` → composant, props sérialisables | **Oui** | — |
| Rendu des `slots` du `PageManifest` dans le shell (zones nommées ou sous-grille documentée) | **Oui** | — |
| Chargement HTTP / parse JSON / règles collisions nav-page-widget allowlist | **Réutilisation** (3.2) | Ne pas supprimer la validation ; **brancher** l'allowlist sur le registre |
| Filtrage nav par permissions / `ContextEnvelope` réel | — | **3.4** |
| `UserRuntimePrefs` (densité, panneaux) | — | **3.5** |
| Bandeau live, `data_contract`, hooks OpenAPI | — | **Epic 4** / Convergence 2 |
| États fallback **visuels** unifiés (severity, messages opérateur) | **Minimal** (placeholder inconnu = explicite en dev / test) | **3.6** pour la politique complète |

**Continuité 3.2 :** conserver `loadManifestBundle`, types `PageManifest` / `NavigationManifest`, tests existants verts ; étendre les types si le manifest doit porter des **props** par widget (voir tâches).

---

## Les quatre artefacts (rappel — pas de substitut)

| Artefact | En 3.3 |
|----------|--------|
| `NavigationManifest` | **Pas** de logique nouvelle ; le rendu page peut rester piloté par la page active choisie en **demo** (ex. première page du bundle ou sélection explicite pour tests) — **sans** inventer une couche de routing métier. |
| `PageManifest` | **Source** de la composition : `slots[]` → rendu via registre. |
| `ContextEnvelope` | **Non** branché sur les widgets starter (pas de données backend obligatoires pour cette story). |
| `UserRuntimePrefs` | **Ne pas** utiliser pour injecter des widgets ou contourner le manifest. |

**Règle d'or :** OpenAPI / `ContextEnvelope` → manifests → `UserRuntimePrefs` — `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` (Data Boundaries, flux § Data Flow).

---

## Frontières repo (Piste A) et boundaries structurels

- **Mocks jusqu'à Convergence 1 :** composants et registre sous `peintre-nano/` ; **aucun** `import` runtime depuis `references/`.
- **`registry/`**, **`widgets/`**, **`runtime/`**, **`validation/`** : **ne pas fusionner** les dossiers — le **registre** vit sous `peintre-nano/src/registry/` ; les **implémentations** de widgets starter sous `peintre-nano/src/widgets/` (ou sous-dossiers par famille) ; la **validation** reste sous `validation/` et **appelle** ou **importe** la liste des types enregistrés plutôt que maintenir une liste parallèle non synchronisée.
- **Schéma CREOS :** `contracts/creos/schemas/widget-declaration.schema.json` — les props exposées au manifest restent **JSON-serializables** (objets plats / tableaux / scalaires) ; pas de fonctions dans les props runtime.

---

## Flows cashflow (a) / (b) — note de cadrage

La story 3.3 **ne tranche pas** les parcours caisse / réception ni le format natif des flows métier.

- Fondations : `references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md` §7 ; ordre des merges / pipeline : `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md` §16.
- Le **catalogue starter** (texte, carte, KPI, liste) reste **neutre** et **démonstratif** — pas de second moteur métier.

---

## Stack P1 / versions

- **P1** : CSS Modules + `tokens.css` + Mantine v8 (usage conforme ADR).
- **React / TypeScript / Vite** : alignés sur `peintre-nano/package.json` existant — pas d'ajout de Tailwind, pas de CSS-in-JS runtime pour le shell.

---

## Story

As a **modular UI platform**,  
I want **a minimal registry for widgets and slots with declarative rendering**,  
So that **page manifests can render a first catalogue of safe UI blocks**.

---

## Critères d'acceptation (BDD — source epics)

**Given** the v2 runtime depends on slots and widget declarations  
**When** the minimal registry is implemented  
**Then** the frontend can resolve known widget types into renderable components within named slots  
**And** widget props are handled through a contract-compatible, serializable interface  

**Given** the initial milestone should prove real composition  
**When** a minimal manifest is rendered  
**Then** at least a small starter catalogue such as text, card, KPI, or list-like blocks can be displayed in the grid shell  
**And** this first catalogue is clearly runtime infrastructure, not hidden business UI  

**Given** future modules must plug into a common mechanism  
**When** the registry story is complete  
**Then** Epic 4 can register `bandeau live` through the same declarative path  
**And** later domain modules avoid bespoke rendering pipelines  

[Source : `_bmad-output/planning-artifacts/epics.md` — Story 3.3]

---

## Exigences techniques détaillées (pour le dev)

1. **API du registre (minimal mais propre)**  
   - Enregistrement explicite : `widgetType` (string stable, alignée CREOS) → fabrique ou composant.  
   - Fonction de résolution : `resolveWidget(type)` → `React.ComponentType` ou rendu + **erreur structurée** si inconnu (testable).  
   - Export d'un **ensemble** (ou liste) des types enregistrés pour **réutilisation par** `validate-bundle-rules` / allowlist — **remplacer** le pattern « deux listes » hérité de 3.2.

2. **Props**  
   - `PageSlotPlacement` porte déjà `widgetProps` optionnel (`PageWidgetProps`), alimenté par **`widget_props`** côté JSON après ingest (story 3.2) — **vérifier** cohérence loader / fixtures / schéma plutôt que dupliquer un second champ.  
   - Documenter le mapping `widget_props` → `widgetProps` dans `peintre-nano/src/types/README.md` si ce n'est pas déjà explicite.

3. **Slots → UI**  
   - Mapper `slot_id` du manifest vers des **régions du shell** ou une **sous-grille** dans `main` (documenter la table de correspondance dans `src/registry/README.md` ou `src/slots/README.md`).  
   - Les zones `data-testid` du `RootShell` existantes ne doivent **pas** être cassées.

4. **Catalogue starter (infra)**  
   - Au minimum **quatre** familles illustratives parmi : bloc texte / titre, « carte » container, indicateur type KPI (valeur + label), liste simple (données **mock** en dur ou passées par props du manifest).  
   - Noms de `widgetType` : préfixe stable (ex. `demo.text.block`, `demo.card`, …) — **enregistrés** dans le registre et **acceptés** par la validation du bundle.

5. **Intégration `App` + moteur de composition**  
   - Lorsque le bundle est `ok`, afficher le **rendu déclaratif** de la page de démo (`page_key` **`demo-home`** dans les fixtures) via le shell : **`peintre-nano/src/app/PageRenderer.tsx`** (`buildPageManifestRegions`) branché depuis **`App.tsx`** (prop `regions` de `RootShell`) — en conservant le flux erreur 3.2 (`ManifestErrorBanner` si `!ok`).

---

## Tâches / sous-tâches

- [x] **T1** — Définir l'API TypeScript du registre (`src/registry/`) + tests unitaires (résolution, type inconnu, liste des types).
- [x] **T2** — Implémenter les **widgets starter** + CSS Modules + tokens ; enregistrer chaque `widgetType` au registre.
- [x] **T3** — Étendre les **types** `PageManifest` / placements de slots pour **props** optionnelles ; mettre à jour fixtures **valid** + éventuellement jeux invalides si nouvelles règles.
- [x] **T4** — **Refactor** : `allowed-widget-types` / validation bundle consomme **uniquement** les clés du registre (ou module unique exporté par `registry/` importé par `validation/` — respecter la séparation des dossiers).
- [x] **T5** — **PageRenderer** : à partir d'un `PageManifest` validé + registre, rendre les slots dans le shell ; brancher depuis `App.tsx` — **fichier cible actuel :** `peintre-nano/src/app/PageRenderer.tsx`.
- [x] **T6** — **Tests** : Vitest — rendu d'au moins un widget par type starter ; slot inconnu / widget inconnu → comportement explicite observable (`data-testid` ou erreur structurée) ; e2e existants mis à jour si nécessaire. **Garde-fou Testing Library :** ne pas utiliser un `getByRole('list')` **global** ou ambigu lorsque la composition ajoute des `<ul>` / `<ol>` (ex. widget liste + `List` Mantine pour les quatre artefacts) — scoper avec `within`, `*AllBy*` + choix explicite, ou `data-testid` / `aria-label` sur la liste « artefacts ».
- [x] **T7** — README : `src/registry/`, `src/widgets/` (si créé), `src/types/` — brefs ; pas de roman.

---

## Critères de done testables (commandes — depuis `peintre-nano/`)

À exécuter depuis la racine du package `peintre-nano/` :

1. `npm ci` (ou `npm install`) — succès.
2. `npm run lint` — succès.
3. `npm run build` — succès.
4. `npm run test` — succès, avec tests couvrant **registre** + **rendu déclaratif** (pas seulement smoke).
5. Optionnel : `npm run dev` — vérifier visuellement le catalogue starter dans le shell.

---

## Anti-patterns (à éviter)

1. Importer `references/` au runtime.
2. Hardcoder une page produit dans `App.tsx` **à la place** du contenu du `PageManifest` (la sélection de page peut rester **fixe pour la démo**, mais le **contenu** doit venir du manifest + registre).
3. Dupliquer la liste des widgets entre `validation/` et `registry/` sans mécanisme de vérité unique.
4. Utiliser `Stack` / `Group` Mantine pour **structure spatiale** du shell global.
5. Introduire **auth réelle** ou filtrage **ContextEnvelope** (**3.4**).
6. Fusionner physiquement `registry/` et `runtime/` ou déplacer toute la validation dans les widgets.

---

## Notes dev — architecture et patterns

- Structure & limites : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`.
- Epic & critères : `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.3).
- Story précédente (validation manifests) : `_bmad-output/implementation-artifacts/3-2-implementer-le-chargement-et-la-validation-minimale-des-manifests-de-navigation-et-de-page.md`.
- Fichiers de référence actuels (branche epic-3 — à jour pour dev-story) :  
  - `peintre-nano/src/registry/index.ts` (side-effect `registerDemoWidgets`)  
  - `peintre-nano/src/registry/widget-registry.ts`  
  - `peintre-nano/src/registry/register-demo-widgets.ts`  
  - `peintre-nano/src/registry/shell-slot-regions.ts`  
  - `peintre-nano/src/widgets/demo/` (composants starter `demo.*`)  
  - `peintre-nano/src/validation/allowed-widget-types.ts`  
  - `peintre-nano/src/runtime/load-manifest-bundle.ts`  
  - `peintre-nano/src/types/page-manifest.ts`  
  - `peintre-nano/src/app/PageRenderer.tsx`  
  - `peintre-nano/src/app/App.tsx`  
  - `peintre-nano/src/app/layouts/RootShell.tsx`  
  - `peintre-nano/src/fixtures/manifests/valid/page-home.json`  
  - `peintre-nano/public/manifests/` (miroir optionnel pour fetch statique — garder aligné avec les fixtures valides)

### Intelligence story précédente (3.2)

- `ManifestErrorBanner` + `manifest-bundle-ok` : conserver le contrat de test existant pour les bundles invalides.
- Normalisation des clés : réutiliser `key-normalize` / conventions du loader si extension des champs JSON.

### État d'implémentation (post dev-story — 2026-04-02)

- Tâches T1–T7 cochées ; README `registry/`, `widgets/`, `types/` ; tests liste artefacts via `data-testid="four-artifacts-list"` (garde-fou T6).

### Reuse / extension

- Préparer le registre pour **enregistrement ultérieur** du widget Epic 4 (même API `register` / map) sans l'implémenter ici.

---

## Dev Agent Record

### Agent Model Used

Cursor agent (implémentation story 3.3 — dev-story workflow).

### Debug Log References

- Vérification spawn dev-story (2026-04-02) : `npm run lint`, `npm run build`, `npm run test` depuis `peintre-nano/` — succès. `npm ci` : gate parent / CI (non rejoué dans ce spawn).

### Completion Notes List

- Registre minimal (`registerWidget`, `resolveWidget`, erreur structurée, `getRegisteredWidgetTypes` / set pour allowlist) ; catalogue `demo.text.block`, `demo.card`, `demo.kpi`, `demo.list.simple`.
- `PageSlotPlacement.widgetProps` (JSON `widget_props` → camelCase via ingest existant) ; allowlist = types enregistrés uniquement (`allowed-widget-types` → `../registry`).
- `buildPageManifestRegions` + `RootShell.regions` : mapping `slot_id` → zones shell documenté dans `src/registry/README.md` ; slot inconnu → `page-slot-unmapped` ; widget inconnu au rendu → `widget-resolve-error`.
- App : page `demo-home` du bundle + rendu déclaratif conservant `manifest-bundle-ok` et tests e2e existants.

### File List

- `peintre-nano/src/registry/` (widget-registry, register-demo-widgets, index, shell-slot-regions, README)
- `peintre-nano/src/widgets/` (demo/* + README)
- `peintre-nano/src/app/PageRenderer.tsx`, `PageRenderer.module.css`
- `peintre-nano/src/app/App.tsx`, `App.module.css` (data-testid liste artefacts)
- `peintre-nano/src/app/layouts/RootShell.tsx`
- `peintre-nano/src/types/page-manifest.ts`, `peintre-nano/src/types/README.md`
- `peintre-nano/src/validation/page-manifest-ingest.ts`, `peintre-nano/src/validation/allowed-widget-types.ts`
- `peintre-nano/src/fixtures/manifests/valid/page-home.json`
- `peintre-nano/tests/unit/widget-registry.test.ts`, `page-manifest-regions.test.tsx`, mises à jour `root-shell.test.tsx`, `app.smoke.test.tsx`, `manifest-loader-validation.test.tsx`, `tests/e2e/app-shell.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`, ce fichier story

---

## Checklist SM (couverture — Story 3.3 — sortie CS)

| Exigence | Section / preuve dans ce fichier |
|----------|----------------------------------|
| Identité Story 3.3 + clé `3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif` | § Identité Story 3.3 + en-tête |
| Primauté ADR | § Primauté ADR |
| Périmètre vs 3.2 / 3.4 / 3.6 / Epic 4 | § Périmètre Story 3.3 vs stories adjacentes |
| Quatre artefacts (pas de substitut contrats) | § Les quatre artefacts |
| P1 (pas Stack/Group pour layout shell) | § Primauté ADR |
| Frontières Piste A / pas d'import `references/` | § Frontières repo |
| Boundaries `registry/` / `widgets/` / `validation/` / `runtime/` | § Frontières repo + Notes dev |
| Cashflow (a)/(b) + pipeline §16 | § Flows cashflow |
| Critères de done testables (`peintre-nano/`) | § Critères de done testables |
| Critères epics BDD + exigences techniques | § Critères d'acceptation + § Exigences techniques détaillées |

**Note fin create-story (CS) :** enchaîner **VS** (validate-create-story) selon le pipeline parent Story Runner.

---

## Change Log

- **2026-04-02** — Création **bmad-create-story** (mode create, sous-agent Task) : story **ready-for-dev**, mise à jour de `sprint-status.yaml` pour la clé `3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif`.
- **2026-04-02** — Implémentation **bmad-dev-story** : registre widgets, props `widget_props`, `buildPageManifestRegions`, widgets démo, tests ; statut story → **review**, sprint-status → **review**.
- **2026-04-02** — Repasse CS : alignement sur le code réel (`PageRenderer`, registre, allowlist → registre), props `widget_props` / `widgetProps`, garde-fou tests liste multiple, section état branche + chemins fichiers à jour.
- **2026-04-02** — Clôture Story Runner : GATE → QA → CR **PASS** ; `sprint-status` → **done** ; statuts dans ce fichier harmonisés.

---

**Note interne workflow :** sources analysées — `epics.md` (Epic 3, Story 3.3), `project-structure-boundaries.md`, ADR P1/P2, story 3.2 (done), registre + `PageRenderer.tsx` + `App.tsx` + widgets `demo.*` sur la branche courante, fixtures `page-home.json` / `public/manifests/`, schéma `widget-declaration.schema.json`. Pas de `project-context.md` trouvé à la racine du dépôt. Recherche web omise : stack figée par ADR et `peintre-nano/package.json`.

**Statut story (workflow) :** **done** — aligné sur `sprint-status.yaml` (`3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif`).
