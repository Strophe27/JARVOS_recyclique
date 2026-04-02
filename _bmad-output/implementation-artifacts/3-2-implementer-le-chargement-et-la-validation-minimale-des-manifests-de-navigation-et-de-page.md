# Story 3.2 : Implémenter le chargement et la validation minimale des manifests de navigation et de page

**Clé fichier (obligatoire) :** `3-2-implementer-le-chargement-et-la-validation-minimale-des-manifests-de-navigation-et-de-page`  
**Epic :** epic-3 — Poser le socle frontend greenfield `Peintre_nano`  
**Statut :** done

**Références skills BMAD (brief Story Runner — chemins contractuels) :**

- `create_story` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-create-story\SKILL.md`
- `dev_story` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-dev-story\SKILL.md`
- `qa_e2e` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-qa-generate-e2e-tests\SKILL.md`
- `code_review` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-code-review\SKILL.md`

<!-- Note : validation optionnelle via validate-create-story avant dev-story. -->

---

## Identité Story 3.2

- **Story :** 3.2 — **chargement** (parse + hydratation typée) et **validation minimale** de `NavigationManifest` et `PageManifest`, avec **rejets explicites** (collisions, liens non résolus, widgets inconnus, structure invalide) — sans inventer la structure métier côté frontend.
- **Clé de fichier (exacte, obligatoire) :** `3-2-implementer-le-chargement-et-la-validation-minimale-des-manifests-de-navigation-et-de-page` — toute autre variante de slug est **incorrecte** pour les chemins `implementation-artifacts` et `sprint-status.yaml`.
- **Epic :** epic-3 — runtime UI v2 minimal mais réel.
- **Nano + CREOS :** périmètre **contrat commanditaire → runtime** ; **pas** de bus, pas d’agent mini/macro ; **pas** de registre de rendu complet des widgets (**3.3**).

---

## Primauté ADR (obligatoire)

**Phrase de primauté (non négociable) :** le document `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` est **accepté** ; cette ADR **prime** sur toute section du concept ou de la vision qui laisserait ouverts P1/P2, le choix CSS ou la stack UI.

**Implications directes pour 3.2 :**

- Toute **UI** liée aux erreurs de manifest (bandeau, zone dédiée, console de dev uniquement si story trop large — **préférer** erreurs **structurées** + tests) reste stylée **CSS Modules + tokens** (`var(--pn-…)`) si des composants visuels sont ajoutés ; **pas** de `Stack` / `Group` Mantine pour **positionner** le shell (déjà posé en 3.1).
- **Mantine v8** : OK pour composants riches **dans** une zone existante du shell si besoin d’afficher une erreur lisible ; **interdit** comme substitut au **layout spatial** du cadre d’application.

---

## Contexte nano → mini → macro

- **Nano** : le runtime **charge** et **valide** les manifests comme entrées externes ; la **résolution** des widgets en composants React est **hors périmètre strict** sauf stubs minimaux pour tests (voir **3.3**).
- **Mini / macro** : **hors périmètre** — pas de pipeline SDUI agent, pas de bus.

---

## Périmètre Story 3.2 vs stories adjacentes

| Zone | Story 3.2 | Hors périmètre (autres stories) |
|------|-----------|----------------------------------|
| Chargement JSON/YAML → types, validation structurelle + règles collisions / liens / widgets connus | **Oui** | — |
| Shell CSS Grid, zones nommées | **Réutilisation** (3.1) | Ne pas refondre le shell sauf branchement minimal (ex. affichage état erreur dans `main`). |
| Registre widgets, rendu déclaratif catalogue, résolution `widgetType` → composant | **Non** (sauf **liste d’autorisation minimale** pour valider « widget connu » — voir Dev Notes) | **3.3** |
| Adaptateur auth/session, filtrage nav par `ContextEnvelope` réel | — | **3.4** |
| `UserRuntimePrefs` comme source de vérité métier | — | **3.5** (et rappel : jamais substitut commanditaire) |
| Fallbacks runtime **visuels** métier | — | **3.6** (ici : **rejeter** plutôt que masquer silencieusement) |

**Continuité 3.0 / 3.1 :** types minimaux dans `peintre-nano/src/types/navigation-manifest.ts` et `page-manifest.ts` ; shell `RootShell` avec zones `data-testid`. La 3.2 **étend ou ajuste** les types si le profil JSON commanditaire exige des champs supplémentaires (voir critères epics : `route_key`, `path`, `page_key`, raccourcis). Hiérarchie de vérité inchangée.

---

## Les quatre artefacts (rappel — pas de substitut)

| Artefact | En 3.2 |
|----------|--------|
| `NavigationManifest` | **Chargement + validation** ; **aucune** arborescence métier inventée en dur dans le code applicatif. Les **fixtures** de démo / tests sont des **fichiers** simulant le commanditaire, pas une seconde source de vérité compile-time. |
| `PageManifest` | Idem. |
| `ContextEnvelope` | **Pas** d’intégration nouvelle ; mocks 3.0 / 3.4 inchangés pour cette story. |
| `UserRuntimePrefs` | **Pas** de nouveau rôle ; ne pas utiliser pour « réparer » un manifest invalide. |

**Règle d’or :** OpenAPI / `ContextEnvelope` → manifests → `UserRuntimePrefs` — `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` (Data Boundaries, flux § Data Flow).

---

## Frontières repo (Piste A) et boundaries structurels

- **Mocks jusqu’à Convergence 1 :** les manifests peuvent être servis comme **fichiers statiques** (`peintre-nano/public/...`) ou **imports** de JSON sous `peintre-nano/src/...` (ex. dossier `fixtures/` / `mocks/`) — **jamais** `import` depuis `references/` au runtime bundle.
- **`contracts/creos/manifests/`** : cible canonique **repo** ; si le dossier n’existe pas encore, la story **n’impose pas** de le créer seule pour débloquer : **copier** les exemples reviewables dans le package `peintre-nano` ou référencer un chemin `public/` **à documenter** pour le handoff Piste B. **Ne pas** bloquer la story sur l’existence physique de `contracts/creos/manifests/` si le skill livre des fixtures internes au package.
- **`registry/`** et **`runtime/`** : **ne pas fusionner** les responsabilités — la **validation pure** (fonctions, types d’erreur) vit plutôt sous `peintre-nano/src/validation/` ; le **chargement** (fetch, parse) peut vivre sous `peintre-nano/src/runtime/` en **appelant** la validation, sans y mettre la logique métier des widgets (**3.3**).

---

## Flows cashflow (a) / (b) — note de cadrage

La story 3.2 **ne tranche pas** l’implémentation métier caisse / réception ni le format natif des flows.

- Fondations : `references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md` §7 ; ordre des merges / pipeline : `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md` §16.
- Si un manifest de démo touche au domaine caisse, rester sur des **clés neutres** de démo — **pas** de second moteur de rendu métier.

---

## Stack P1 / liens

- **P1** : CSS Modules + `tokens.css` + Mantine v8 (usage conforme ADR ci-dessus).
- **Schéma widget** (contexte types `widgetType`) : `contracts/creos/schemas/widget-declaration.schema.json` + README du dossier schemas.
- **Écarts** : si un diagramme historique contredit `project-structure-boundaries.md`, **ce dernier fait foi** pour les chemins `peintre-nano/src/...`.

---

## Story

As a **contract-driven UI engine**,  
I want **`Peintre_nano` to load and validate `NavigationManifest` and `PageManifest`**,  
So that **navigation and page composition come from reviewable contracts instead of ad hoc frontend code**.

---

## Critères d’acceptation (BDD — source epics)

**Given** `recyclique` remains author of structural business information  
**When** manifest loading is implemented  
**Then** the frontend consumes `NavigationManifest` and `PageManifest` as external commanditaire inputs  
**And** route or page structure is not invented locally outside these contracts  

**Given** runtime resolution must remain deterministic and reject incoherence  
**When** manifests are validated  
**Then** collisions on `route_key`, `path`, `page_key`, or shortcuts are detected before activation  
**And** unresolved page links, unknown widgets, or structurally invalid manifests trigger explicit rejection behavior  

**Given** contract safety matters before UI richness  
**When** this story is delivered  
**Then** the loader favors traceable validation and clear errors over permissive silent fallback  
**And** later stories can plug real contracts into a governed runtime path  

[Source : `_bmad-output/planning-artifacts/epics.md` — Story 3.2]

---

## Règles de validation minimales (à implémenter — détail dev)

Les libellés ci-dessous suivent la **sémantique epics** ; le **format JSON** peut être `snake_case` côté fichier (alignement futur CREOS) avec **mapping explicite** vers les types TS (`camelCase`) dans le loader.

1. **Structure :** JSON parseable ; champs requis présents (`version`, arborescence / entrées nav, `page_key` + `slots` pour chaque page manifest chargé, etc.) ; types cohérents (tableaux, chaînes non vides pour clés stables).
2. **Navigation — unicité :** pas deux entrées avec le même `route_key` ; pas deux `path` identiques si le champ `path` est présent dans le modèle retenu.
3. **Pages — unicité :** dans l’ensemble des `PageManifest` considérés pour une activation donnée, **un seul** manifest par `page_key`.
4. **Raccourcis :** si des raccourcis clavier (ou identifiants de raccourci) sont modélisés, **détecter les collisions** entre entrées.
5. **Liens nav → page :** toute référence de navigation vers une `page_key` **doit** résoudre vers un `PageManifest` chargé dans le même lot (jeu de manifests « coactivés » défini par la story d’implémentation — ex. paire nav + N pages).
6. **Widgets :** chaque `widgetType` référencé dans un `PageManifest` doit être **autorisé** par une **liste minimale explicite** (fichier TS ou JSON dans `peintre-nano`, documenté) jusqu’à ce que le **registre** (**3.3**) devienne la source unique. **Rejet explicite** si inconnu — pas de fallback silencieux.
7. **Erreurs :** type ou union d’erreurs **structurées** (code + message + détail optionnel : clé en conflit, ligne/champ si pertinent) ; pas seulement `console.error` sans signal testable.

**Preuve testable :** tests unitaires Vitest couvrant au moins : manifest **valide** accepté ; collision `route_key` / `page_key` ; lien nav vers `page_key` manquant ; `widgetType` inconnu ; JSON mal formé.

---

## Tâches / sous-tâches

- [x] **T1** — Finaliser le **modèle de données** TS et/ou le **contrat JSON** minimal (étendre `NavigationEntry` / `NavigationManifest` / `PageManifest` si nécessaire pour `path`, cible de page, raccourcis) — en restant aligné epics et schémas CREOS lorsque publiés.
- [x] **T2** — Implémenter **parse + normalisation** (snake_case → camelCase si applicable) dans `peintre-nano/src/validation/` (module dédié manifests) avec fonctions pures testables.
- [x] **T3** — Implémenter le **chargement** pour la Piste A : `fetch` vers `public/` ou `import` de fixtures — **aucun** chemin vers `references/`.
- [x] **T4** — Implémenter la **validation croisée** (nav + ensemble de pages + allowlist widgets) et exposer un **résultat** `ok | err` (ou `Result` typé) consommable par `App` / shell (affichage minimal d’erreur dans la zone `main` **optionnel** mais **erreur doit être observable en test** sans navigateur si possible).
- [x] **T5** — Fournir **fixtures** : au moins un jeu **valide** et plusieurs jeux **invalides** (collision, lien cassé, widget inconnu, JSON cassé).
- [x] **T6** — **Tests** : Vitest + couverture des règles § « Règles de validation minimales » ; `npm run lint`, `npm run build`, `npm run test` depuis `peintre-nano/`.
- [x] **T7** — Mettre à jour les README concernés (`src/validation/`, `src/runtime/`, `src/types/` si besoin) — bref, pas de roman.

---

## Critères de done testables (commandes — depuis `peintre-nano/`)

À exécuter depuis la racine du package `peintre-nano/` :

1. `npm ci` (ou `npm install`) — succès.
2. `npm run lint` — succès.
3. `npm run build` — succès.
4. `npm run test` — succès, avec tests **manifest loader / validation** verts (assertions sur rejets explicites, pas seulement smoke).
5. Vérification manuelle optionnelle : `npm run dev` — si fixtures servies par `public/`, le chargement ne **échoue pas silencieusement** (comportement observable ou log d’erreur structuré en dev — sans dépendre de `references/`).

---

## Anti-patterns (à éviter)

1. Importer `references/` au runtime.
2. Hardcoder une **arborescence produit** dans `App.tsx` ou le shell comme **substitut** aux manifests.
3. **Ignorer** silencieusement entrées en double, pages manquantes ou widgets inconnus (« best effort » sans erreur traceable).
4. **Placer** la résolution `widgetType` → composant React **dans** le même module que le registre (**3.3**) tout en prétendant livrer seulement la validation — garder une **allowlist** minimale pour la validation, pas un faux registre complet.
5. Fusionner **`registry/`** et **`runtime/`** ou diluer la validation dans les widgets.
6. Introduire **auth réelle** ou filtrage par **ContextEnvelope** (**3.4**).

---

## Notes dev — architecture et patterns

- Structure & limites : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`.
- Epic & critères : `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.2).
- Story précédente (shell, grille, tests) : `_bmad-output/implementation-artifacts/3-1-mettre-en-place-le-shell-initial-et-le-layout-css-grid.md`.
- Types existants : `peintre-nano/src/types/navigation-manifest.ts`, `page-manifest.ts`, `peintre-nano/src/types/README.md`.
- Câblage conceptuel : `peintre-nano/src/runtime/conceptual-artifacts.ts` (à **ne pas** détourner comme source de manifests réels — utiliser loader + validation).
- Contrats CREOS : `contracts/creos/schemas/` ; manifests reviewables futurs : `contracts/creos/manifests/` (voir arborescence dans boundaries).

### Intelligence story précédente (3.1)

- **RootShell** : zones `shell-zone-*` ; ne pas casser les `data-testid` existants.
- **Tokens** : préfixe `--pn-` dans `src/styles/tokens.css`.
- **Tests** : Vitest + Testing Library déjà en place ; suivre le même style que `tests/unit/root-shell.test.tsx`.

### Reuse / extension

- Étendre les types existants plutôt que dupliquer des DTO parallèles.
- Centraliser les messages / codes d’erreur de validation pour réutilisation par **3.6** (fallbacks visuels) plus tard.

---

## Dev Agent Record

### Agent Model Used

Cursor agent (bmad-dev-story / worker Story Runner), 2026-04-02.

### Debug Log References

_(aucun blocage)_ — gates `npm ci`, `npm run lint`, `npm run build`, `npm run test` verts après ajustement smoke test StrictMode (`within(shell)`).

### Completion Notes List

- Types `NavigationEntry` étendus (`path`, `pageKey`, `shortcutId`) ; parse JSON + normalisation snake_case → camelCase ; règles collisions, liens nav→page, allowlist `widgetType` ; résultat `ok | err` avec issues structurées.
- Chargement : `loadManifestBundle` + `fetchManifestBundle` ; `App` consomme les fixtures JSON importées ; copies `public/manifests/` pour essais `fetch` en dev.
- UI erreur : `ManifestErrorBanner` + tests `data-testid` ; ligne de statut `manifest-bundle-ok` si lot valide.

### File List

- `peintre-nano/src/types/navigation-manifest.ts`
- `peintre-nano/src/types/README.md`
- `peintre-nano/src/validation/manifest-validation-types.ts`
- `peintre-nano/src/validation/key-normalize.ts`
- `peintre-nano/src/validation/allowed-widget-types.ts`
- `peintre-nano/src/validation/navigation-ingest.ts`
- `peintre-nano/src/validation/page-manifest-ingest.ts`
- `peintre-nano/src/validation/validate-bundle-rules.ts`
- `peintre-nano/src/validation/README.md`
- `peintre-nano/src/runtime/load-manifest-bundle.ts`
- `peintre-nano/src/runtime/README.md`
- `peintre-nano/src/fixtures/manifests/valid/navigation.json`
- `peintre-nano/src/fixtures/manifests/valid/page-home.json`
- `peintre-nano/src/fixtures/manifests/README.md`
- `peintre-nano/public/manifests/navigation.json`
- `peintre-nano/public/manifests/page-home.json`
- `peintre-nano/src/app/App.tsx`
- `peintre-nano/src/app/ManifestErrorBanner.tsx`
- `peintre-nano/src/app/ManifestErrorBanner.module.css`
- `peintre-nano/tests/unit/manifest-loader-validation.test.tsx`
- `peintre-nano/tests/unit/app.smoke.test.tsx`
- `peintre-nano/tests/e2e/manifest-bundle.e2e.test.tsx`
- `peintre-nano/tests/e2e/app-shell.e2e.test.tsx`
- `peintre-nano/vitest.config.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/3-2-implementer-le-chargement-et-la-validation-minimale-des-manifests-de-navigation-et-de-page.md`

---

## Checklist SM (couverture — Story 3.2 — sortie CS)

| Exigence | Section / preuve dans ce fichier |
|----------|----------------------------------|
| Identité Story 3.2 + clé `3-2-implementer-le-chargement-et-la-validation-minimale-des-manifests-de-navigation-et-de-page` | § Identité Story 3.2 + en-tête |
| Primauté ADR | § Primauté ADR |
| Périmètre vs 3.1 / 3.3 / 3.4 | § Périmètre Story 3.2 vs stories adjacentes |
| Quatre artefacts (pas de substitut contrats) | § Les quatre artefacts |
| P1 (pas Stack/Group pour layout shell) | § Primauté ADR |
| Frontières Piste A / pas d’import `references/` | § Frontières repo |
| Boundaries `registry/` / `runtime/` / `validation/` | § Frontières repo + Notes dev |
| Cashflow (a)/(b) + pipeline §16 | § Flows cashflow |
| Critères de done testables (`peintre-nano/`) | § Critères de done testables |
| Critères epics BDD + règles validation détaillées | § Critères d’acceptation + § Règles de validation minimales |

**Note fin create-story (CS) :** enchaîner **VS** (validate-create-story) selon le pipeline parent Story Runner.

---

## Change Log

- **2026-04-02** — Création **bmad-create-story** (mode create, sous-agent Task) : story **ready-for-dev**, mise à jour prévue de `sprint-status.yaml` pour la clé `3-2-implementer-le-chargement-et-la-validation-minimale-des-manifests-de-navigation-et-de-page`.
- **2026-04-02** — Implémentation **bmad-dev-story** : validation + chargement manifests, tests Vitest, statut sprint **review**.
- **2026-04-02** — Repasse **CS create** (Story Runner) : validation checklist context pack, insertion références skills contractuelles, complément **File List** (e2e, `vitest.config.ts`). `sprint-status.yaml` inchangé (clé déjà **review**, pas de régression **backlog → ready-for-dev**).
- **2026-04-02** — Clôture : `sprint-status` → **done** ; harmonisation des statuts dans ce fichier (plus de mention « en attente code-review »).

---

**Note interne workflow :** analyse exhaustive des entrées — `epics.md` (Epic 3, Story 3.2), `project-structure-boundaries.md`, ADR P1/P2, story 3.1, types `peintre-nano/src/types/*`, schéma `widget-declaration.schema.json` ; pas de `project-context.md` dans le dépôt ; recherche web omise (stack déjà figée par ADR et package existant).

**Statut story (workflow) :** **done** — cycle BMAD (VS → DS → GATE → QA → CR) terminé ; aligné sur `_bmad-output/implementation-artifacts/sprint-status.yaml` pour la clé `3-2-…`.
