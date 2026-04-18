# Story 3.0 : Initialiser `Peintre_nano` et ses quatre artefacts minimaux

**Clé fichier (obligatoire) :** `3-0-initialiser-peintre-nano-et-ses-quatre-artefacts-minimaux`  
**Epic :** epic-3 — Poser le socle frontend greenfield `Peintre_nano`  
**Statut :** done

<!-- Note : validation optionnelle via validate-create-story avant dev-story. -->

---

## Identité Story 3.0

- **Story :** 3.0 — socle **Peintre_nano** (première story de l'epic-3).
- **Clé de fichier (exacte, obligatoire) :** `3-0-initialiser-peintre-nano-et-ses-quatre-artefacts-minimaux` — toute autre variante de slug est **incorrecte** pour les chemins `implementation-artifacts` et `sprint-status.yaml`.
- **Epic :** epic-3 — poser le socle frontend greenfield Peintre_nano.
- **Nano + CREOS :** transport **documentaire** (JSON / fichiers au build ou en artefacts versionnés) ; **pas** de bus ni d'agent **mini/macro** dans le périmètre 3.0.

---

## Primauté ADR (obligatoire)

**Phrase de primauté (non négociable) :** le document `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` est **accepté** ; cette ADR **prime** sur toute section du concept ou de la vision qui laisserait ouverts P1/P2, le choix CSS ou la stack UI.

---

## Contexte nano → mini → macro

- **Nano** : moteur de composition déclaratif ; transport CREOS **documentaire** (JSON / fichiers, pas de bus). Voir `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md` §1.2 et `references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md` §2.
- **Mini / macro** : agent, bus Redis/RabbitMQ, SDUI avancé — **hors périmètre** de la Story 3.0 ; ne pas introduire de dépendances ou d'hypothèses qui les pré-supposent.

---

## Phases SDUI 0–3 (ne pas casser / hors périmètre)

| Phase | Contenu | Exigence pour l'implémentation 3.0 |
|-------|---------|--------------------------------------|
| **0** | Manifests statiques ; slots remplis par code / imports TS ; **pas** de JSON dynamique de composition pour l'ossature | Respecter : pas de pilotage à chaud du graphe UI par JSON externe pour le socle. Les mêmes schémas / vocabulaire s'appliquent au contenu statique (validation build quand la chaîne existe). |
| **1–3** | Mini-DSL, JSON agent, SDUI avancé | **Hors périmètre** 3.0 ; ne pas implémenter le pipeline « document validé → rendu dynamique » complet ici. |

Sources : `references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md` §6.

---

## Les quatre artefacts minimaux

| Artefact | Rôle (hiérarchie de vérité) | Propriétaire / note |
|----------|----------------------------|---------------------|
| `NavigationManifest` | Structure informationnelle commanditaire (navigation, routes, raccourcis structurels) | **Commanditaire** (`recyclique` / contrats) — le runtime **interprète** sans réinventer la structure métier. |
| `PageManifest` | Composition de page déclarative (référence aux widgets / slots selon contrats) | **Commanditaire** — pas de pages métier « inventées » uniquement en dur côté app. |
| `ContextEnvelope` | Contexte actif autoritatif (site, caisse, permissions effectives, etc.) | **Backend** via OpenAPI (schéma canonique) ; en **Piste A** jusqu'à Convergence 1 : **mock / stub structurellement aligné** acceptable (Story 3.4 branchera l'adaptateur réel). |
| `UserRuntimePrefs` | Personnalisation **locale non métier** (densité, panneaux, onboarding…) | **Runtime frontend** — ne doit **jamais** devenir une seconde source de vérité pour permissions ou navigation. |

**Règle d'or :** hiérarchie explicite OpenAPI / `ContextEnvelope` / manifests / `UserRuntimePrefs` — voir `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` (Data Boundaries) et epics AR39–AR43.

**Interdit en 3.0 (et au-delà) :** utiliser des routes, permissions ou structures métier **codées en dur** comme **substitut** aux contrats commanditaires.

---

## Périmètre Story 3.0 vs 3.1–3.3+

**Dans 3.0 :**

- Application **React + TypeScript + Vite** **runnable** sous `peintre-nano/` alignée sur `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` (arborescence `src/app/*`, `registry/`, `widgets/`, `slots/`, `runtime/`, `validation/`, `generated/`, `styles/`, `types/`, `tests/`, etc.).
- **Quatre artefacts** : modules ou dossiers **nommés et documentés** (types TypeScript minimaux, README ou commentaires de boundary), **propriété** et **responsabilité runtime** claires — **sans** exiger encore le chargement JSON complet ni la validation runtime exhaustive (Stories 3.2–3.3).
- Fichiers de base **P1** : `src/styles/tokens.css` (tokens CSS variables), conventions **CSS Modules** ; **Mantine v8** peut être déclarée en dépendance si le socle l'intègre (provider racine minimal acceptable) — **sans** enrichir le shell grille (3.1).

**Hors 3.0 (stories suivantes) :**

- **3.1** : shell initial, layout **CSS Grid** visible, zones nommées.
- **3.2** : chargement + validation **NavigationManifest** / **PageManifest**.
- **3.3** : registre widgets / slots / rendu déclaratif catalogue.
- **3.4+** : adaptateur auth/session, `ContextEnvelope` réel, prefs bornées, fallbacks, page démo.

---

## Frontières repo (Piste A)

- **Mocks jusqu'à Convergence 1** pour données backend / enveloppe : OK pour préparation types et conventions, pas d'exiger API réelle en 3.0.
- **Aucun import runtime** depuis `references/` — `references/` est documentation / vérité de cadrage uniquement. Voir `project-structure-boundaries.md` (Paheko Boundary, même principe général).

---

## Stack P1 / P2 et liens

- **P1 (CSS / UI)** : CSS Modules + `tokens.css` + Mantine v8 comme bibliothèque de composants ; **interdits** : Tailwind, Emotion/styled-components, `utilities.css` global, valeurs CSS magiques hors tokens, classes CSS / Mantine dans manifests ou props CREOS.
- **Layout structurel (alignement instruction P1)** : ne pas structurer le **layout** de l'app avec des primitives Mantine (`Stack`, `Group`, `SimpleGrid`, etc.) — le shell et la composition spatiale passent par **CSS Modules** et les variables de `tokens.css` ; Mantine reste réservée aux **composants riches** (titres, texte, listes, champs, etc.), pas comme substitut à la grille / flex du socle.
- **P2 (config admin)** : PostgreSQL pour surcharges admin — **pas d'implémentation métier** dans la Story 3.0 ; simple rappel d'alignement futur backend.

Sources détaillées :

- `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`
- `references/peintre/2026-04-01_instruction-cursor-p1-p2.md`

**Revue P1 rapide** : s'appuyer sur la checklist **§ Vérifications** du fichier instruction Cursor ci-dessus (sans dupliquer tout le document dans cette story).

**Écarts approuvés (design system / arborescence)** : si un schéma ou un diagramme historique (ex. chemins imbriqués dans l'instruction Cursor) diffère de l'arborescence **normative** du fichier `project-structure-boundaries.md`, **ce dernier fait foi** pour les chemins `peintre-nano/src/...`. Documenter tout écart résiduel ici en une ligne lors de l'implémentation.

**Implémentation 2026-04-02 :** aucun écart résiduel — arborescence `peintre-nano/src/...` alignée sur `project-structure-boundaries.md` ; `registry/` et `runtime/` restent distincts.

---

## Flows cashflow (a) / (b) — note de cadrage

La Story 3.0 **ne tranche pas** l'implémentation métier caisse / réception (`wizard`/`tabbed` + raccourcis vs `type: "cashflow"` natif).

- Règle **(a)/(b)** et critère « repo consomme déjà le schéma pour `cashflow` » : `references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md` §7.
- Clôture documentaire : `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md` §16 (ordre des merges / livrables).

Le dev **ne doit pas** introduire un second pipeline de rendu ou une logique caisse complète dans le socle 3.0.

---

## Contrats et schémas

- Vue d'ensemble : `contracts/README.md`.
- Schémas CREOS actuels (liste indicative au moment de la rédaction) : `contracts/creos/schemas/` (`widget-declaration.schema.json`, `widget-data-states.schema.json`, `README.md`). Aligner les types / imports futurs sur l'évolution de ce dossier.
- **data_contract** : pour les stories suivantes (slices backend ↔ UI), s'appuyer sur les contrats versionnés du dépôt (`openapi`, CREOS, enveloppes) lorsque l'epic ou le ticket exige un `data_contract` explicite — hors périmètre de trancher le contenu métier en 3.0.
- Consommation : artefacts générés / copiés dans `peintre-nano/src/generated/` selon la chaîne d'outillage (pas d'édition manuelle parallèle non gouvernée).

---

## Anti-patterns (à éviter explicitement)

1. Importer `references/` au runtime.
2. Hardcoder routes, permissions ou pages métier **à la place** de `NavigationManifest` / `PageManifest` / OpenAPI.
3. Introduire Tailwind, CSS-in-JS runtime, ou fichier utilitaires CSS global (violation P1).
4. Faire de `UserRuntimePrefs` ou d'un store local une **seconde vérité** sur le contexte ou les droits.
5. Livrer shell grille riche, validateur manifests complet ou registre widgets **dans** 3.0 (scope 3.1–3.3).
6. Sur-vendre la couverture E2E alors que Playwright peut ne pas être posé en 3.0.

---

## Story

As a **frontend platform team**,  
I want a **runnable `Peintre_nano` foundation** with the **four minimal artifacts** wired conceptually,  
So that the **v2 frontend** starts from a **real runtime base** rather than scattered prototypes.

---

## Critères d'acceptation (BDD — source epics)

**Given** `Peintre_nano` is the new frontend v2  
**When** the frontend foundation is initialized  
**Then** the repository contains a runnable `React` + `TypeScript` + `Vite` app structure aligned with the agreed project boundaries  
**And** the app clearly separates app shell, routing, auth, context, layouts, runtime, validation, registry, widgets, slots, and generated contract consumption areas — **preuve vérifiable** : arborescence `peintre-nano/src/` conforme à `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` (dossiers attendus présents ou documentés par README), sans fusion `registry/` / `runtime/` non approuvée  

**Given** the socle v2 distinguishes four minimal artifacts  
**When** Story 3.0 is completed  
**Then** the frontend foundation is explicitly organized around `NavigationManifest`, `PageManifest`, `ContextEnvelope`, and `UserRuntimePrefs`  
**And** each artifact has a defined ownership and runtime responsibility consistent with the agreed truth hierarchy  

**Given** this story is the entry point for all later UI work  
**When** the initial frontend base is accepted  
**Then** future stories can extend one coherent runtime instead of creating competing shell experiments  
**And** no business route, permission, or structure is hardcoded as a replacement for commanditaire contracts  

[Source : `_bmad-output/planning-artifacts/epics.md` — Story 3.0]

---

## Tâches / sous-tâches

- [x] **T1** — Initialiser `peintre-nano/` (package.json, Vite, TS, React strict, scripts `dev` / `build` / `test` ou équivalent minimal).
- [x] **T2** — Créer l'arborescence `src/` conforme à `project-structure-boundaries.md` (dossiers vides ou fichiers `README.md` / `.gitkeep` **ou** modules stub exportés).
- [x] **T3** — Ajouter `src/styles/tokens.css` avec un jeu minimal de variables (couleurs, espacements, radius, typo) et brancher l'import global dans le point d'entrée.
- [x] **T4** — Définir les **quatre artefacts** comme modules TypeScript (ex. `src/types/` ou dossiers dédiés `navigation-manifest.ts`, `page-manifest.ts`, `context-envelope.ts`, `user-runtime-prefs.ts`) avec types **minimaux** alignés sur la direction des schémas `contracts/creos/` et OpenAPI (sans dupliquer toute la spec).
- [x] **T5** — Point d'entrée UI minimal (`App.tsx`) prouvant que l'app démarre (page simple « socle Peintre_nano ») — **sans** exiger la grille shell de 3.1.
- [x] **T6** — Tests : **ne pas sur-vendre** — soit **tests unitaires minimaux** (ex. Vitest sur un pur type/helper), soit **squelette** `tests/` documenté ; si Playwright n'est pas en place, ne pas prétendre à de l'E2E.

---

## Critères de done testables (après Vite)

À exécuter depuis la racine du package `peintre-nano/` (adapter si gestionnaire `pnpm` / `yarn`) :

1. `npm install` (ou équivalent) — succès sans erreur.
2. `npm run dev` — serveur de dev démarre ; page d'accueil du socle visible dans le navigateur.
3. `npm run build` — build de production réussit.
4. `npm run test` (ou script défini dans le story dev) — **succès uniquement** si des tests **exécutent des assertions réelles** ; interdit de laisser un script qui retourne toujours 0 sans tests. Si squelette sans assertions : documenter « N/A » dans les notes de complétion et **ne pas** prétendre à de la couverture ; pas de couverture E2E fictive.
5. `npm run lint` — vérification TypeScript projet (`tsc -b`, sans bundle Vite) ; succès requis en clôture 3.0.

---

## Clôture formelle — 2026-04-02

**Story 3.0 fermée** : aucun travail résiduel **obligatoire** dans ce périmètre avant d'ouvrir la story **3.1**. L'epic-3 reste `in-progress` tant que les stories 3.1+ ne sont pas `done`.

| Contrôle | État attendu |
|----------|----------------|
| `sprint-status.yaml` → `3-0-initialiser-peintre-nano-et-ses-quatre-artefacts-minimaux` | `done` |
| `epic-3` | `in-progress` (suite epic) |
| Depuis `peintre-nano/` : `npm ci`, `npm run lint`, `npm run build`, `npm run test` | Tous succès |
| QA2 (5 passes) + correctifs P1 | Traités ; dette **documentaire** archi (matrice surcharges, CI OpenAPI, `domains/*`) **tracée** au Change log — hors scope 3.0 |
| Dépôt | Pas de fichier QA ad hoc sous `_bmad-output/implementation-artifacts/tests/` (emplacement non normatif) |

---

## Notes dev — architecture et patterns

- Epics FR/AR pertinents : FR6–FR10, FR37, FR45, FR48–FR54, NFR5, NFR12–NFR13, NFR24–NFR28, AR1–AR5, AR13, AR15–AR16, AR20–AR23, AR26–AR31, AR34, AR38–AR43 (extrait `_bmad-output/planning-artifacts/epics.md`).
- Pilotage d'exécution complémentaire : `guide-pilotage-v2.md` (référencé depuis epics Epic 3).
- **Zustand** : réservé à l'état UI éphémère (AR26) — pas obligatoire en 3.0 ; si introduit, rester minimal et non autoritatif sur le métier.

### Références (chemins projet)

| Sujet | Fichier |
|--------|---------|
| Structure & limites | `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` |
| Epic & critères | `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.0) |
| Concept nano | `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md` |
| Extraits opérationnels | `references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md` |
| ADR P1/P2 | `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` |
| Instruction P1/P2 Cursor | `references/peintre/2026-04-01_instruction-cursor-p1-p2.md` |
| Pipeline / §16 | `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md` |
| Contrats | `contracts/README.md`, `contracts/creos/schemas/` |

---

## Dev Agent Record

### Agent Model Used

Composer (agent dev-story BMAD) — 2026-04-02.

### Debug Log References

— 

### Completion Notes List

- Socle Vite + React 18 + TS strict + Mantine 8.3.x ; PostCSS preset Mantine ; `tokens.css` importé depuis `main.tsx`.
- Quatre artefacts : `src/types/*.ts` + `src/runtime/conceptual-artifacts.ts` (types) + `conceptual-artifacts.stub.ts` (stub tests + side-effect compilation via `main.tsx`) — pas de navigation métier codée en dur.
- Vitest : tests `user-runtime-prefs`, `conceptual-artifacts.stub`, `app.smoke` (UI) ; E2E documenté N/A dans `tests/e2e/README.md`.
- Vérifications locales : `npm ci`, `npm run lint`, `npm run build`, `npm run test` — succès.

### File List

Voir arborescence `peintre-nano/` (package.json, lockfile, configs Vite/TS/PostCSS/Vitest, `src/**`, `tests/**`, `public/**`, README). Fichiers de suivi : `sprint-status.yaml`, cette story.

## Change Log

- **2026-04-02** — Passage **bmad-create-story** (mode create, worker Task) : ajout § **Identité Story 3.0**, phrase de primauté ADR reformulée sur « le document … est accepté », checklist SM mise à jour ; statut story / sprint **inchangés** (`done`).
- **2026-04-02** — Implémentation story 3.0 : création du package `peintre-nano`, arborescence frontières, artefacts minimaux, tests Vitest minimal ; statut sprint → `review`.
- **2026-04-02** — Gates (`npm ci` / `npm run build`), QA Vitest renforcé, code review **PASS** ; statut sprint et story → `done`.
- **2026-04-02** — **QA2** (5 passes : prd, arch val/adv, code, transversal) : correctifs P1 — layout sans `Stack` Mantine, tokens pour liste, stub artefacts isolé (`*.stub.ts`), smoke test ancré sur `data-testid`, story enrichie (layout P1, BDD mesurable, done tests, notes Vitest). **Dette documentaire** laissée hors scope correctif immédiat : matrice précédence surcharges P2 / `runtime-overrides`, gate CI OpenAPI reviewable vs `generated/`, règles explicites `domains/*` (voir rapports arch adversarial — à traiter en stories / ADR annexe si besoin).
- **2026-04-02** — **Clôture** : script `npm run lint` (`tsc -b`) ajouté au package `peintre-nano` ; suppression du dossier orphelin `_bmad-output/implementation-artifacts/tests/` ; section « Clôture formelle » ajoutée — **rien d'autre ne doit rester ouvert côté Story 3.0** avant 3.1.

---

## Checklist SM (couverture — Story 3.0)

| Exigence | Section / preuve dans ce fichier |
|----------|----------------------------------|
| Identité Story 3.0 + clé `3-0-initialiser-peintre-nano-et-ses-quatre-artefacts-minimaux` | § Identité Story 3.0 + en-tête |
| Primauté ADR (phrase obligatoire) | § Primauté ADR |
| Contexte nano → mini → macro | § Contexte nano → mini → macro |
| Phases SDUI 0–3 | § Phases SDUI 0–3 |
| Quatre artefacts (hiérarchie, propriétaire, pas de substitut contrats) | § Les quatre artefacts minimaux |
| Périmètre 3.0 vs 3.1+ | § Périmètre Story 3.0 vs 3.1–3.3+ |
| Stack P1/P2 + liens | § Stack P1 / P2 et liens |
| Flows cashflow (a)/(b) + pipeline §16 | § Flows cashflow (a) / (b) + références pipeline |
| Anti-patterns | § Anti-patterns |
| Critères de done testables (commandes après Vite) | § Critères de done testables |
| Frontières Piste A / pas d'import `references/` | § Frontières repo (Piste A) |
| Contrats / schémas / data_contract (stories suivantes) | § Contrats et schémas |

**Note fin create-story (CS) :** document de contexte dev aligné annexe Epic 3 / Story 3.0 ; après CS, enchaîner **VS** (`validate-create-story` / validate story selon pipeline parent). Le statut d'implémentation et `sprint-status.yaml` (`done` pour cette clé au 2026-04-02) relèvent du cycle dev/review — ne pas les régresser lors d'un passage CS documentaire.
