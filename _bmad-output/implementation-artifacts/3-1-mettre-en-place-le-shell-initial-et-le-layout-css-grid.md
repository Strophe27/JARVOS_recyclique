# Story 3.1 : Mettre en place le shell initial et le layout CSS Grid

**Clé fichier (obligatoire) :** `3-1-mettre-en-place-le-shell-initial-et-le-layout-css-grid`  
**Epic :** epic-3 — Poser le socle frontend greenfield `Peintre_nano`  
**Statut :** done

<!-- Note : validation optionnelle via validate-create-story avant dev-story. -->

---

## Identité Story 3.1

- **Story :** 3.1 — **shell racine** et **structure spatiale** basée sur **CSS Grid** (zones nommées), prête pour la composition ultérieure par slots / manifests.
- **Clé de fichier (exacte, obligatoire) :** `3-1-mettre-en-place-le-shell-initial-et-le-layout-css-grid` — toute autre variante de slug est **incorrecte** pour les chemins `implementation-artifacts` et `sprint-status.yaml`.
- **Epic :** epic-3 — runtime UI v2 minimal mais réel.
- **Nano + CREOS :** périmètre **structure visuelle et spatiale** du shell ; **pas** de bus, pas d'agent mini/macro, pas de pipeline manifest → rendu dynamique complet (stories 3.2–3.3).

---

## Primauté ADR (obligatoire)

**Phrase de primauté (non négociable) :** le document `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` est **accepté** ; cette ADR **prime** sur toute section du concept ou de la vision qui laisserait ouverts P1/P2, le choix CSS ou la stack UI.

**Implications directes pour 3.1 :**

- Grille globale **CSS Grid** + **zones nommées** dans des fichiers `.module.css` (ou `.css` dédiés au shell), avec **design tokens** (`var(--pn-…)` depuis `src/styles/tokens.css`) — **pas** de valeurs magiques hors tokens.
- **Mantine v8** : composants riches (titres, texte, listes, champs…) OK ; **interdit** pour le **layout structurel du shell** : pas de `Stack`, `Group`, `SimpleGrid`, `Flex` Mantine comme substitut à la grille / au positionnement spatial du cadre d'application (aligné instruction P1 / story 3.0).

---

## Contexte nano → mini → macro

- **Nano** : composition déclarative à terme ; en 3.1 on pose **uniquement** le cadre spatial inspectable (grille + régions), sans charger ni valider les manifests (3.2) ni le registre widgets (3.3).
- **Mini / macro** : **hors périmètre** — ne pas introduire de dépendances bus / agent / SDUI piloté par JSON externe pour le graphe UI.

---

## Périmètre Story 3.1 vs stories adjacentes

| Zone | Story 3.1 | Hors périmètre (autres stories) |
|------|-----------|----------------------------------|
| Shell racine, `grid-template-areas`, régions visibles | **Oui** | — |
| Chargement / validation `NavigationManifest` / `PageManifest` | — | **3.2** |
| Registre widgets, slots, rendu déclaratif catalogue | — | **3.3** |
| Adaptateur auth/session, `ContextEnvelope` réel | — | **3.4** |
| `UserRuntimePrefs` bornées, fallbacks runtime, page démo composée | — | **3.5–3.7** |
| Socle Vite, quatre artefacts types, `tokens.css` | **Prérequis (3.0 done)** | Ne pas refaire le socle sauf ajustements nécessaires au shell |

**Continuité 3.0 :** `peintre-nano/` existe ; `App.tsx` + `App.module.css` posent un contenu minimal. La 3.1 **extrait ou remplace** progressivement par un **composant shell dédié** (ex. sous `src/app/layouts/` ou `src/app/`) dont le **layout spatial** est **CSS Grid**, pas le simple flex colonne actuel du contenu si la story exige une grille multi-zones nommées.

---

## Les quatre artefacts (rappel — pas de substitut)

| Artefact | En 3.1 |
|----------|--------|
| `NavigationManifest` | **Pas** de chargement ni de routes métier codées en dur comme substitut — le shell peut afficher des **labels de démo** ou des **placeholders** de zones (ex. « zone nav ») **sans** inventer une hiérarchie de routes commanditaire. |
| `PageManifest` | Idem : pas de pages métier inventées en dur ; zone **main** / **content** comme conteneur neutre. |
| `ContextEnvelope` | Inchangé : mocks / stubs structurels acceptables (Piste A) jusqu'à Convergence 1 ; **pas** d'obligation d'enrichir l'adaptateur dans 3.1. |
| `UserRuntimePrefs` | Pas de nouvelle source de vérité métier ; préférences UI éventuelles **hors** permissions / navigation. |

**Règle d'or :** hiérarchie OpenAPI / `ContextEnvelope` / manifests / `UserRuntimePrefs` — voir `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` (Data Boundaries).

---

## Frontières repo (Piste A) et boundaries structurels

- **Mocks jusqu'à Convergence 1** : OK pour données backend / enveloppe ; le shell reste **présentation + structure**.
- **Aucun import runtime** depuis `references/` — documentation uniquement hors bundle applicatif.
- **`registry/` et `runtime/`** : **ne pas fusionner** sans story + ADR ; le shell vit typiquement sous `src/app/` (layouts, providers) — respecter `project-structure-boundaries.md`.

---

## Flows cashflow (a) / (b) — note de cadrage

La Story 3.1 **ne tranche pas** l'implémentation métier caisse / réception (`wizard`/`tabbed` vs `type: "cashflow"` natif).

- Règles et fondations : `references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md` §7 ; clôture documentaire / ordre des merges : `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md` §16.
- Le dev **ne doit pas** introduire dans le shell une logique caisse / cashflow ou un second pipeline de rendu métier sous prétexte de « zones » — si le sujet apparaît, **renvoi explicite** aux documents ci-dessus et stories dédiées.

---

## Stack P1 / liens

- **P1** : CSS Modules + `tokens.css` + Mantine v8 (composants riches uniquement pour le contenu **dans** les zones, pas pour la grille shell).
- Sources : `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`, `references/peintre/2026-04-01_instruction-cursor-p1-p2.md`.
- **Écarts schémas historiques** : si un diagramme diffère de `project-structure-boundaries.md`, **ce dernier fait foi** pour les chemins `peintre-nano/src/...`.

---

## Story

As a **frontend runtime**,  
I want a **minimal shell and layout system based on CSS Grid**,  
So that **pages can be composed in named zones** before business modules are migrated.

---

## Critères d'acceptation (BDD — source epics)

**Given** CSS Grid is mandatory for the v2 layout engine  
**When** the shell foundation is implemented  
**Then** the app renders a visible root shell with **named layout regions** and a **deterministic grid-based page structure**  
**And** the shell is usable before any real business module is plugged in  
**Preuve testable :** au moins un fichier `.module.css` (ou équivalent shell) définit `display: grid`, `grid-template-areas` (noms explicites) et `grid-template-columns` / `rows` cohérents avec les tokens ; les régions sont **visibles** au démarrage (bordures / fonds légers via tokens ou `data-testid` par zone pour tests).

**Given** the first milestone must prove actual rendering, not only file scaffolding  
**When** the shell starts successfully  
**Then** it displays a blank or demo page with **visible layout zones** that make future slot composition inspectable  
**And** it avoids introducing **business logic** hidden inside the shell  

**Given** later epics will reuse the same composition surface  
**When** this story is completed  
**Then** Epic 4 and Epic 5 can build on one shell contract  
**And** migration work does not need to reinvent page framing per domain  

[Source : `_bmad-output/planning-artifacts/epics.md` — Story 3.1]

---

## Tâches / sous-tâches

- [x] **T1** — Introduire un **RootShell** (ou équivalent) : composant racine qui enveloppe le contenu de l'app et applique la **grille CSS** (zones nommées documentées en commentaire court dans le module CSS si utile).
- [x] **T2** — Définir **au minimum** des régions stables (exemples indicatifs : `header`, `nav`, `main`, `aside`, `footer` — ajuster au besoin tant que les zones sont **nommées**, **visibles** et **extensibles** pour futurs slots ; pas d'obligation d'implémenter toutes les zones métier finales).
- [x] **T3** — Styliser exclusivement via **CSS Modules + variables** de `tokens.css` (espacements, couleurs de fond/bordure des zones de démo).
- [x] **T4** — Brancher le shell depuis le point d'entrée UI (`App.tsx` ou `main.tsx`) sans casser les scripts existants ; conserver Mantine provider si déjà présent.
- [x] **T5** — Tests : au moins un test **Vitest** + **Testing Library** qui montre que les **zones** (ex. `data-testid="shell-zone-main"`) sont **présentes** dans le DOM au rendu racine — **ou** documenter équivalent vérifiable ; ne pas sur-vendre l'E2E (Playwright reste N/A sauf story dédiée).

---

## Critères de done testables (commandes — depuis `peintre-nano/`)

À exécuter depuis la racine du package `peintre-nano/` :

1. `npm ci` (ou `npm install`) — succès.
2. `npm run lint` — succès (TypeScript projet / règles du package).
3. `npm run build` — build production réussi.
4. `npm run test` — succès avec **assertions réelles** (y compris test shell / zones si ajouté).
5. `npm run dev` — démarrage ; dans le navigateur, **grille et zones** visibles (inspection visuelle ou test automatisé ci-dessus).

---

## Anti-patterns (à éviter)

1. Importer `references/` au runtime.
2. Remplacer la grille shell par **Stack / Group / Flex Mantine** pour la structure spatiale globale.
3. Hardcoder une **arborescence de routes** ou des **permissions** comme substitut aux manifests / OpenAPI.
4. Charger ou parser des JSON de `NavigationManifest` / `PageManifest` en **3.1** (reporté en **3.2**).
5. Introduire registre widgets / composition déclarative complète (**3.3**).
6. Trancher cashflow (a)/(b) ou logique caisse dans le shell sans story / sans renvoi §16.

---

## Notes dev — architecture et patterns

- Structure & limites : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`.
- Epic & critères : `_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.1).
- Story précédente (patterns, Vitest, P1 layout) : `_bmad-output/implementation-artifacts/3-0-initialiser-peintre-nano-et-ses-quatre-artefacts-minimaux.md`.
- Contrats (contexte futur, pas implémentation 3.1) : `contracts/README.md`, `contracts/creos/schemas/`.

---

## Dev Agent Record

### Agent Model Used

Cursor Agent (bmad-dev-story / sous-agent Task Story Runner), 2026-04-02.

### Debug Log References

— (aucun blocage)

### Completion Notes List

- **RootShell** (`src/app/layouts/`) : grille CSS `grid-template-areas` header / nav / main / aside / footer ; tokens `--pn-shell-*` ajoutés dans `tokens.css` pour les `minmax` des colonnes.
- Zones de démo avec `data-testid` `shell-zone-*` ; contenu 3.0 déplacé dans la zone **main** via `App.tsx` ; structure shell sans Stack/Group Mantine.
- Test Vitest `tests/unit/root-shell.test.tsx` : présence des cinq testids de zones + enfant dans `main`.
- Validations : `npm run lint`, `build`, `test` depuis `peintre-nano/` — succès.

### File List

- `peintre-nano/src/styles/tokens.css`
- `peintre-nano/src/app/layouts/RootShell.tsx`
- `peintre-nano/src/app/layouts/RootShell.module.css`
- `peintre-nano/src/app/App.tsx`
- `peintre-nano/src/app/App.module.css`
- `peintre-nano/tests/unit/root-shell.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/3-1-mettre-en-place-le-shell-initial-et-le-layout-css-grid.md`

---

## Checklist SM (couverture — Story 3.1 — sortie CS)

| Exigence | Section / preuve dans ce fichier |
|----------|----------------------------------|
| Identité Story 3.1 + clé `3-1-mettre-en-place-le-shell-initial-et-le-layout-css-grid` | § Identité Story 3.1 + en-tête |
| Primauté ADR | § Primauté ADR |
| Périmètre vs 3.0 / 3.2 / 3.3 | § Périmètre Story 3.1 vs stories adjacentes |
| Quatre artefacts (pas de substitut contrats) | § Les quatre artefacts |
| P1 layout shell (Grid + modules, pas Stack/Group shell) | § Primauté ADR + Stack P1 |
| Frontières Piste A / pas d'import `references/` | § Frontières repo |
| Boundaries `registry/` / `runtime/` | § Frontières repo |
| Cashflow (a)/(b) + pipeline §16 | § Flows cashflow |
| Critères de done testables (`peintre-nano/`) | § Critères de done testables |

**Note fin create-story (CS) :** enchaîner **VS** (validate-create-story) selon le pipeline parent Story Runner.

---

## Change Log

- **2026-04-02** — Implémentation **bmad-dev-story** : RootShell (CSS Grid + zones), tests, story passée en **review**, entrée sprint `3-1-mettre-en-place-le-shell-initial-et-le-layout-css-grid` → **review**.
- **2026-04-02** — Création **bmad-create-story** (mode create, sous-agent Task) : story **ready-for-dev**, `sprint-status.yaml` mis à jour pour la clé `3-1-mettre-en-place-le-shell-initial-et-le-layout-css-grid`.
