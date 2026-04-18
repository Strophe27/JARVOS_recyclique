# Story 4.2 : Implémenter le widget `bandeau live` dans le registre `Peintre_nano`

Status: done

<!-- Note : validation optionnelle — validate-create-story avant dev-story. -->

## Story

En tant que **runtime UI composée**,  
je veux que le **`bandeau live`** soit **enregistré et rendu** via le **mécanisme standard de widgets** (registre + composition déclarative depuis `PageManifest`),  
afin que le **premier module métier** prouve qu'une UI orientée exploitation peut se brancher sur le **runtime partagé** sans chemin de rendu ad hoc.

## Acceptance Criteria

1. **Registre et composition standard** — Étant donné qu'Epic 3 fournit déjà le registre, les slots et la base shell, quand le widget `bandeau live` est introduit, alors il est enregistré via le **registre runtime standard** et rendu depuis une **composition pilotée par manifest** ; et il **ne s'appuie pas** sur un rendu one-off en dehors du runtime partagé. [Source : `_bmad-output/planning-artifacts/epics.md` — Story 4.2]

2. **Données métier visibles** — Étant donné que le module affiche un **état d'exploitation** plutôt qu'un texte statique, quand le widget reçoit des **données cohérentes avec le contrat** (forme `ExploitationLiveSnapshot` / sous-ensemble typé), alors il rend un **bandeau visible** dont le contenu reflète **au minimum** les signaux fournis (ex. `effective_open_state`, `cash_session_effectiveness`, `observed_at`, résumé sync si présent) ; et l'affichage reste **borné** au contexte actif et à la visibilité permise (pas d'invention de champs hors payload). [Source : epics.md — Story 4.2 ; `contracts/openapi/recyclique-api.yaml` — `ExploitationLiveSnapshot`]

3. **Référence réutilisable** — Étant donné que c'est le **premier vrai module** branché sur le socle, quand la story est terminée, alors le projet dispose d'une **référence concrète** pour l'intégration des futurs widgets domaine (emplacement fichiers, `registerWidget`, props sérialisables, alignement `widget_type` ↔ catalogue CREOS) ; et la preuve reste **petite** (pas de recomposition dashboard ni d'admin généralisé). [Source : epics.md — Story 4.2 ; Epic 4 intro]

## Tasks / Subtasks

- [x] **Enregistrement `bandeau-live` dans le registre** (AC: 1, 3)
  - [x] Ajouter un module d'enregistrement (ex. `peintre-nano/src/registry/register-bandeau-live-widgets.ts` ou équivalent) qui appelle `registerWidget('bandeau-live', BandeauLiveWidget)` avec la clé **exactement** `bandeau-live` (identique au champ `type` du catalogue CREOS et au `widget_type` du slot dans `contracts/creos/manifests/page-bandeau-live-sandbox.json`). [Source : `contracts/creos/manifests/widgets-catalog-bandeau-live.json` ; story 4.1]
  - [x] Importer ce module depuis `peintre-nano/src/registry/index.ts` **après** ou **à côté** de `registerDemoWidgets()` pour garantir le chargement au boot (même pattern side-effect que `register-demo-widgets.ts`). [Source : `peintre-nano/src/registry/index.ts`]
  - [x] Vérifier que `peintre-nano/src/validation/allowed-widget-types.ts` reste aligné : **aucune** liste parallèle de types — la source de vérité reste `getRegisteredWidgetTypeSet()` via import du registre. [Source : `_bmad-output/implementation-artifacts/3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif.md`]

- [x] **Composant widget `BandeauLive`** (AC: 1, 2, 3)
  - [x] Implémenter sous `peintre-nano/src/domains/bandeau-live/` (ex. `BandeauLive.tsx` + `BandeauLive.module.css`) en respectant **`RegisteredWidgetProps`** : `widgetProps` optionnel, JSON-sérialisable. [Source : `peintre-nano/src/registry/widget-registry.ts` ; `contracts/creos/schemas/widget-declaration.schema.json`]
  - [x] Typer le snapshot avec les types générés OpenAPI : importer `components['schemas']['ExploitationLiveSnapshot']` depuis `contracts/openapi/generated/recyclique-api.ts` (chemin relatif depuis `peintre-nano`, cohérent avec `peintre-nano/README.md`). **Ne pas** dupliquer le schéma à la main. [Source : `contracts/README.md` ; `peintre-nano/README.md`]
  - [x] **Story 4.2 — pas de fetch HTTP réel** : alimenter le rendu pour les critères d'acceptation via **`widget_props` du manifest** (ex. clé `snapshot` ou équivalent documenté) sur une page de démo / fixture, **ou** via tests qui passent un `widgetProps` minimal conforme ; le **branchement** `data_contract` / polling / `X-Correlation-ID` est **Story 4.3**. [Source : brief Story Runner ; epics.md — Story 4.3]
  - [x] Rendu minimal mais **honeste** : si pas de snapshot valide, afficher un **état explicite** (ex. « données live non disponibles ») — sans simuler un vert métier ; le raffinement **fallback** visuel unifié (sévérités, messages opérateur) est **4.4**. [Source : epics.md — Story 4.4]
  - [x] UI : **CSS Modules** + tokens `var(--pn-…)` ; Mantine v8 autorisé **dans** le widget comme en ADR ; pas de layout shell global dans le widget. [Source : `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` — primauté citée en 3.3]

- [x] **Cohérence manifests / runtime** (AC: 1, 3)
  - [x] Optionnel mais recommandé : enrichir le manifest bac à sable reviewable **ou** un manifest sous `peintre-nano/public/manifests/` / fixtures utilisé en dev avec un **`widget_props.snapshot`** minimal valide pour démontrer le bandeau **sans** élargir au dashboard. Si le fichier sous `contracts/creos/manifests/` est modifié, **maintenir** les tests contract existants et la cohérence OpenAPI ↔ CREOS. [Source : `peintre-nano/tests/contract/creos-bandeau-live-manifests-4-1.test.ts`]

- [x] **Tests** (AC: 1, 2, 3)
  - [x] Tests Vitest : résolution `resolveWidget('bandeau-live')` OK après import registre ; rendu du composant avec **fixture** typée `ExploitationLiveSnapshot` (champs représentatifs : `effective_open_state`, `cash_session_effectiveness`, `observed_at`). [Source : `peintre-nano/README.md` — scripts test]
  - [x] Pas d'exiger la suite E2E chaîne complète ici (**réservée 4.6**) ; ne pas casser les tests contract **4.1**. [Source : story 4.1 — Tests]

- [x] **Documentation domaine** (AC: 3)
  - [x] Mettre à jour `peintre-nano/src/domains/bandeau-live/README.md` : lien vers le composant, le registre, rappel que **4.3** branche la source backend et **4.4** les fallbacks enrichis. [Source : fichier README actuel]

## Dev Notes

### Garde-fous architecture

- **Hiérarchie de vérité** : OpenAPI → manifests CREOS → runtime ; le widget **affiche** des données fournies, il ne recalcule pas la vérité métier serveur. [Source : `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md` — Truth Hierarchy / `data_contract`]
- **Extension `data_contract`** : déjà déclarée en **4.1** dans le catalogue ; le runtime ne l'**exécute** pas avant **4.3** — cette story se limite au **registre + rendu** avec données injectées de façon contractuelle. [Source : `navigation-structure-contract.md` — Extension `data_contract`]
- **Frontières repo** : pas d'`import` runtime depuis `references/` ; code sous `peintre-nano/`. [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]

### Périmètre explicite (ne pas faire)

- **Pas** de recomposition **dashboard** (Epic 5) ni d'**admin** généralisé.
- **Pas** d'appels `GET /v2/exploitation/live-snapshot` ni polling ni `X-Correlation-ID` côté client dans cette story (**4.3**).
- **Pas** de toggle admin module (**4.5**).
- **Pas** de politique complète de fallbacks runtime (**4.4**) — seulement un état dégradé **lisible** si données absentes.

### Structure projet et fichiers typiques à toucher

| Zone | Fichiers / dossiers |
|------|---------------------|
| Registre | `peintre-nano/src/registry/index.ts`, nouveau `register-bandeau-live-widgets.ts` (ou équivalent) |
| Widget domaine | `peintre-nano/src/domains/bandeau-live/*.tsx`, `*.module.css` |
| Types API | `contracts/openapi/generated/recyclique-api.ts` (lecture / import types uniquement) |
| Contrats reviewables | `contracts/creos/manifests/*.json` (optionnel, si extension `widget_props` démo) |
| Tests | `peintre-nano/tests/unit/` ou `tests/e2e/` (Vitest jsdom) selon conventions existantes |
| Doc | `peintre-nano/src/domains/bandeau-live/README.md` |

### Intelligence story précédente (4.1)

- Manifests reviewables en place : `navigation-bandeau-live-slice.json`, `page-bandeau-live-sandbox.json`, `widgets-catalog-bandeau-live.json` avec `operation_id` **recyclique_exploitation_getLiveSnapshot** et `type` **bandeau-live**. [Source : `_bmad-output/implementation-artifacts/4-1-publier-le-contrat-et-les-manifests-minimaux-du-module-bandeau-live.md` — Completion Notes / File List]
- Tests contract statiques : `peintre-nano/tests/contract/creos-bandeau-live-manifests-4-1.test.ts` — à garder verts.
- Le catalogue indiquait `component: bandeau-live.placeholder` côté CREOS (métadonnée) ; le **vrai** composant React doit être le **`registerWidget`** Peintre_nano, pas un second moteur parallèle.

### Références techniques / synthèse « dernier mile »

- Moteur de composition : `peintre-nano/src/app/PageRenderer.tsx` — passe `widgetProps` au composant enregistré ; pas de chemin parallèle.
- Registre : `peintre-nano/src/registry/widget-registry.ts` — `registerWidget`, `resolveWidget`, `getRegisteredWidgetTypeSet`.

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.2 ; Stories 4.3–4.6 pour dépendances]
- [Source : `_bmad-output/implementation-artifacts/4-1-publier-le-contrat-et-les-manifests-minimaux-du-module-bandeau-live.md`]
- [Source : `_bmad-output/implementation-artifacts/3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif.md` — registre, allowlist]
- [Source : `contracts/creos/manifests/widgets-catalog-bandeau-live.json` ; `page-bandeau-live-sandbox.json`]
- [Source : `contracts/openapi/recyclique-api.yaml` — `ExploitationLiveSnapshot`, live-snapshot]
- [Source : `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` — stack UI]

### Contexte projet (`project-context.md`)

- Aucun fichier `project-context.md` trouvé à la racine du dépôt ; s'appuyer sur les artefacts ci-dessus et sur `references/index.md` si besoin de cadrage additionnel.

## Dev Agent Record

### Agent Model Used

Cursor agent (bmad-dev-story / sous-agent Task), 2026-04-07.

### Debug Log References

_(aucun blocage)_

### Completion Notes List

- Registre : `register-bandeau-live-widgets.ts` + `registerWidget('bandeau-live', BandeauLive)` ; chargé depuis `registry/index.ts` après les widgets démo.
- Widget : `BandeauLive` lit `widget_props.snapshot` ; types `ExploitationLiveSnapshot` via `contracts/openapi/generated/recyclique-api.ts` ; état dégradé explicite sans signaux ; affichage borné aux champs présents.
- Manifest reviewable : `page-bandeau-live-sandbox.json` enrichi avec un `snapshot` minimal de démo ; tests contract 4.1 verts.
- Tests : `bandeau-live-widget.test.tsx` (resolve + rendu fixture + dégradé) ; `widget-registry.test.ts` étendu avec `bandeau-live`.
- `npm run lint` et `npm run test` (peintre-nano) : OK.
- QA (bmad-qa-generate-e2e-tests) : E2E bac à sable `bandeau-live-sandbox-compose.e2e.test.tsx` ; `BandeauLive` accepte snapshot snake_case (JSON) et camelCase (runtime).

### File List

- `peintre-nano/src/registry/register-bandeau-live-widgets.ts`
- `peintre-nano/src/registry/index.ts`
- `peintre-nano/src/domains/bandeau-live/BandeauLive.tsx`
- `peintre-nano/src/domains/bandeau-live/BandeauLive.module.css`
- `peintre-nano/src/domains/bandeau-live/README.md`
- `contracts/creos/manifests/page-bandeau-live-sandbox.json`
- `peintre-nano/tests/unit/bandeau-live-widget.test.tsx`
- `peintre-nano/tests/unit/widget-registry.test.ts`
- `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/tests/test-summary.md` (section Story 4.2)

## Change Log

| Date | Résumé |
|------|--------|
| 2026-04-07 | CS create-story : story 4.2 rédigée, statut ready-for-dev, sprint-status mis à jour. |
| 2026-04-07 | DS : widget `bandeau-live` enregistré, `BandeauLive` + tests + manifest sandbox ; statut **review**. |
| 2026-04-07 | QA e2e : `bandeau-live-sandbox-compose.e2e.test.tsx` ; ajustement `BandeauLive` snake_case/camelCase. Gates + CR Story Runner : **done**. |

---

**Story completion status (Story Runner)** : **done** — CS → VS → DS → gates → QA → CR **PASS** ; `sprint-status` : **done**.
