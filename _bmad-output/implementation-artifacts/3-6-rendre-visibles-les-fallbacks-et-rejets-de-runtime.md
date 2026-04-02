# Story 3.6 : Rendre visibles les fallbacks et rejets de runtime

**Clé fichier (obligatoire) :** `3-6-rendre-visibles-les-fallbacks-et-rejets-de-runtime`  
**Epic :** epic-3 — Poser le socle frontend greenfield `Peintre_nano`  
**Statut :** done

**Références skills BMAD (chemins contractuels) :**

- `create_story` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-create-story\SKILL.md`
- `dev_story` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-dev-story\SKILL.md`
- `qa_e2e` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-qa-generate-e2e-tests\SKILL.md`
- `code_review` : `D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\skills\bmad-code-review\SKILL.md`

<!-- Validation optionnelle : validate-create-story avant dev-story. -->

---

## Identité Story 3.6

- **Story :** 3.6 — lorsque un manifest, une route, un slot ou un widget ne peut pas être résolu, le runtime doit **échouer visiblement** (fallback ou blocage) selon une **sévérité** explicite, **sans** absorption silencieuse dans une page « normale » ; émettre une **charge utile structurée** exploitable pour journaux / diagnostics / futur tooling admin, tout en gardant un libellé opérateur **compréhensible** et **non fuite** de détails techniques inutiles.
- **Clé de fichier (exacte, obligatoire) :** `3-6-rendre-visibles-les-fallbacks-et-rejets-de-runtime` — toute autre variante de slug est **incorrecte** pour `implementation-artifacts` et `sprint-status.yaml`.
- **Epic :** epic-3 — runtime UI v2 minimal mais réel.
- **Prérequis livrés :** 3.1–3.5 (shell grid, chargement/validation manifests, registre + `PageRenderer`, auth + `ContextEnvelope` + garde page, `UserRuntimePrefs` bornés). Le code contient déjà des embryons : `ManifestErrorBanner`, erreurs de résolution widget dans `PageRenderer`, `PageAccessBlocked` — cette story **unifie la posture**, **complète les lacunes** (taxonomie, sévérité, journalisation structurée, couverture tests) et **prépare** Epic 4 sur la **même base** succès / échec.

---

## Primauté ADR (obligatoire)

**Phrase de primauté (non négociable) :** le document `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` est **accepté** ; cette ADR **prime** sur toute section du concept ou de la vision qui laisserait ouverts P1/P2, le choix CSS ou la stack UI.

**Implications directes pour 3.6 :**

- Tout **bloc UI** de fallback / erreur (bannières, panneaux d’état, placeholders de slot) : **CSS Modules** + **tokens** (`var(--pn-…)`) pour le code UI nouveau ou étendu ; **pas** de layout spatial du **shell** via **Stack / Group Mantine** comme moteur de composition globale (la grille `RootShell` reste la référence — story 3.1).
- Mantine reste autorisée pour **composants riches** à l’intérieur de blocs (Alert, Text, etc.), conformément à l’ADR.
- **P2 (PostgreSQL / config admin)** : hors périmètre — pas de persistance serveur des messages d’erreur dans 3.6.

---

## Contexte nano → mini → macro

- **Nano :** politique de visibilité runtime, composants / helpers de rendu d’état d’échec, hook ou façade de **reporting** structuré (ex. `console` en dev, point d’extension pour futur service de logs) — **pas** de bus métier, **pas** d’agent SDUI.
- **Mini / macro :** hors périmètre sauf mention contraire dans une story dédiée.

---

## Périmètre Story 3.6 vs stories adjacentes

| Zone | Story 3.6 | Hors périmètre |
|------|-----------|----------------|
| Taxonomie / sévérité des **échecs** (manifest invalide, widget inconnu, slot non mappé, accès page refusé, chargement bundle, etc.) | **Oui** | — |
| UI **visible** : fallback vs **blocage** selon criticité | **Oui** | — |
| **Information structurée** côté runtime (codes stables, champs alignés sur la trajectoire UX-DR8 : `code`, `detail`, `retryable`, `state`, `correlation_id` quand applicable) | **Oui** (implémentation **minimale** acceptable : sous-ensemble explicite documenté ; pas obligatoire d’implémenter toute la taxonomie sync/quarantaine Epic 8) | Pipeline sync Paheko, quarantaine réelle — **hors** 3.6 |
| **Journalisation** : au minimum un chemin unique testable (ex. fonction `reportRuntimeRejection` ou équivalent appelée depuis les points d’échec) | **Oui** | Agrégation centralisée prod, SIEM — **hors** 3.6 |
| **Isolation** : un widget en échec ne fait pas « disparaître » tout l’écran sans signal (UX-DR10) | **Oui** où pertinent | — |
| Page **démo** runtime composé (parcours inspectable sandbox) | — | **3.7** |
| Slice **bandeau live** bout-en-bout backend | — | **Epic 4 / Convergence 2** |

**Continuité 3.5 :** les prefs **ne** changent **pas** la sévérité ni la nature d’un rejet ; elles peuvent seulement affecter la **présentation** (densité, etc.) des composants d’état déjà affichés.

**Continuité 3.7 :** 3.6 fournit les **mécanismes** ; 3.7 **orchestre** une page démo qui montrera au moins un chemin nominal **et** un chemin fallback visible (référence explicite dans les AC epics 3.7).

---

## Les quatre artefacts (rappel — pas de substitut contractuel)

| Artefact | En 3.6 |
|----------|--------|
| `NavigationManifest` | Les rejets liés à la nav restent fondés sur le **contrat** + résolution ; pas de routes ou permissions **en dur** pour « réparer » un échec. |
| `PageManifest` | Idem — échecs de composition (widget inconnu, slot) = **signal** explicite, pas contournement local. |
| `ContextEnvelope` | Garde page / contexte reste **autorité** ; les états « contexte restreint » restent **explicites** (aligné 3.4). |
| `UserRuntimePrefs` | Ne **déclenchent** pas d’accès ni ne **masquent** des rejets contractuels. |

**Hiérarchie de vérité :** `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs` — [Source : `_bmad-output/planning-artifacts/epics.md` — AR39 ; `project-structure-boundaries.md` — Data Flow]

---

## Frontières repo (Piste A) et boundaries structurels

- **Mocks jusqu’à Convergence 1 :** code sous `peintre-nano/` ; **aucun** `import` **runtime** depuis `references/`.
- **`registry/`**, **`runtime/`**, **`validation/`** : **ne pas fusionner** les dossiers sans story + ADR — la politique de fallback peut vivre en **`runtime/`** (résolution, agrégation d’erreurs) et **`app/`** (composants visibles) ; le **registre** reste responsable de la **résolution** `widgetType` → composant, pas de la **taxonomie UX globale** si celle-ci est partagée (extraire un petit module partagé **dans** `peintre-nano/src` si nécessaire, sans violer les boundaries documentés).
- **Convergence 2** : Epic 4 réutilisera les mêmes patterns ; éviter les API **spécifiques bandeau** dans 3.6 — rester **générique** runtime.

---

## Flows cashflow (a) / (b) — note de cadrage

Cette story **ne tranche pas** le format des flows caisse. **Ne pas trancher silencieusement :** toute évolution qui toucherait aux flows ou à leur validation doit renvoyer explicitement aux fondations et au pipeline **§16** — [Source : `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md` §16]. Le périmètre 3.6 reste les **échecs de composition / contrats / rendu** du moteur `Peintre_nano`, pas la sémantique métier caisse.

---

## Stack P1 / versions

- **P1** : CSS Modules + `tokens.css` + Mantine v8 (usage conforme ADR).
- **React / TypeScript / Vite** : alignés sur `peintre-nano/package.json`.

---

## Story

As a **resilient UI engine**,  
I want **invalid contracts, unknown widgets, and missing composition inputs to fail visibly**,  
So that **operators and developers can distinguish degraded UI from valid business state**.

---

## Critères d’acceptation (BDD — source epics)

**Given** contract and rendering failures are expected during early assembly  
**When** a manifest, route, slot, or widget cannot be resolved  
**Then** the runtime shows an explicit visible fallback or blocking state according to the configured severity  
**And** the failure is not silently swallowed into an apparently normal page  

**Given** support and debugging will depend on readable runtime behavior  
**When** a fallback or rejection occurs  
**Then** the runtime emits enough structured information for logs, diagnostics, or future admin tooling  
**And** the displayed feedback stays understandable without leaking irrelevant technical details to operators  

**Given** the modular chain must be proven safely before business migration  
**When** this story is accepted  
**Then** Epic 4 can validate success and failure paths on the same runtime base  
**And** later modules inherit a defensive rendering posture by default  

[Source : `_bmad-output/planning-artifacts/epics.md` — Story 3.6]

**Alignement UX (guidage non normatif pour l’implémentation) :** UX-DR8 / UX-DR10 (epics) — erreurs, fallbacks et blocages **visibles** et **distincts** ; isolation quand possible — [Source : epics.md — UX-DR8, UX-DR10]

---

## Exigences techniques détaillées (pour le dev)

1. **Inventaire des points d’échec actuels**  
   - Parcourir au minimum : chargement bundle manifests (`load-manifest-bundle` / `App`), validation (`ManifestValidationIssue` → `ManifestErrorBanner`), `PageRenderer` / `resolveWidget`, `resolvePageAccess` / `PageAccessBlocked`, navigation filtrée.  
   - Lister les cas où l’UI est encore **trop silencieuse** ou **incohérente** (même nature d’échec, messages différents sans code stable).

2. **Modèle minimal de sévérité**  
   - Définir un petit ensemble **explicite** (ex. `info` | `degraded` | `blocked` — les noms exacts sont libres tant qu’ils sont **documentés** et **testés**).  
   - Mapper chaque catégorie d’échec à une sévérité : ex. manifest invalide → **blocked** ou **degraded** selon décision documentée ; widget inconnu dans une page autorisée → **degraded** (zone isolée) vs page entière **blocked**.

3. **Composants / attributs stables**  
   - Harmoniser `data-testid` / `data-*` pour les scénarios de test (ex. code d’erreur, sévérité) **sans** casser les tests existants sans migration contrôlée.  
   - Réutiliser ou factoriser les styles via **CSS Modules** + tokens.

4. **Chemin de reporting structuré**  
   - Introduire une **fonction ou module unique** (ex. `reportRuntimeFallback`) appelé depuis les branches d’échec, qui :  
     - accepte un objet typé (`code`, `message`, `severity`, et champs optionnels `detail`, `retryable`, `correlationId` si disponibles) ;  
     - en environnement test : peut être mocké / espionné ;  
     - en dev : peut utiliser `console.warn` / `console.error` de façon **contrôlée** (pas de spam non borné sur chaque render — préférer log côté **événement** d’échec, pas sur chaque commit React).

5. **Pas de second chemin de vérité**  
   - Ne **pas** coder de routes ou permissions **en dur** pour « débloquer » une démo : les échecs restent alignés **NavigationManifest** / **PageManifest** / **ContextEnvelope**.

6. **Tests (obligatoires)**  
   - **Unitaires** : pour au moins **deux** catégories d’échec distinctes (ex. validation manifest + widget inconnu), vérifier présence d’un **signal UI** (testid / rôle) **et** appel au reporter (mock).  
   - **e2e ou intégration** : scénario où une page ou zone affiche un **fallback visible** (pas écran vide sans explication) ; scénario **blocage** explicite si le produit choisit cette voie pour manifest invalide.  
   - Vérifier qu’un widget en échec **n’empêche** pas l’affichage d’un **signal global** de dégradation si les AC le exigent (selon mapping sévérité retenu).

7. **Fichiers & emplacements (indicatifs)**  
   - `peintre-nano/src/app/` — bannières / états (`ManifestErrorBanner`, `PageAccessBlocked`, facteurs communs éventuels)  
   - `peintre-nano/src/runtime/` — agrégation, helpers de sévérité, reporter  
   - `peintre-nano/src/registry/` — `resolveWidget` (messages / codes renvoyés)  
   - Tests : `peintre-nano/tests/unit/…`, `peintre-nano/tests/e2e/…`

---

## Tâches / sous-tâches

- [x] **T1** — Inventaire points d’échec + gaps silencieux ; proposition de mapping sévérité (court doc dans la story ou README ciblé).
- [x] **T2** — Types / module `reportRuntimeFallback` (ou équivalent) + tests mock.
- [x] **T3** — Harmoniser UI fallback / blocage (CSS Modules + tokens) ; `data-testid` stables.
- [x] **T4** — Brancher le reporter sur validation manifest, résolution widget, accès page (et autres points retenus).
- [x] **T5** — Tests unitaires + e2e couvrant au moins deux catégories et visible vs silencieux.
- [x] **T6** — `npm run lint`, `build`, `test` verts.

---

## Critères de done testables (commandes — depuis `peintre-nano/`)

À exécuter depuis la racine du package `peintre-nano/` :

1. `npm ci` (ou `npm install`) — succès.
2. `npm run lint` — succès.
3. `npm run build` — succès.
4. `npm run test` — succès, avec tests couvrant **au moins deux** types d’échec runtime, **signal UI visible**, et **appel** au chemin de reporting structuré (mock / espion).
5. Optionnel : `npm run dev` — vérifier visuellement bannière manifest, widget inconnu, page bloquée.

**Gate Story Runner (référence brief parent) :** depuis `peintre-nano/` : `npm ci` ; `npm run lint` ; `npm run build` ; `npm run test` (timeout conseillé 900 s).

---

## Anti-patterns (à éviter)

1. `import` runtime depuis `references/`.
2. **Avaler** silencieusement une erreur de validation ou de résolution (empty fragment sans `data-testid` ni message).
3. Exposer aux opérateurs des **stack traces** ou identifiants internes **non nécessaires** (garder `detail` pour logs / support).
4. **Stack / Group** Mantine pour la **structure spatiale** du shell global.
5. Fusionner `registry/` et `runtime/` (ou déplacer la validation CREOS) **sans** story + ADR.
6. Introduire un **bus** ou un **agent** pour les fallbacks.
7. Trancher **cashflow (a)/(b)** ou flows métier caisse dans cette story sans renvoi explicite au pipeline §16.

---

## Notes dev — références

- Structure & limites : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`.
- Epic & critères : `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.6 ; FR18, FR61, NFR7 (vision globale) ; UX-DR8, UX-DR10.
- Story précédente : `_bmad-output/implementation-artifacts/3-5-borner-userruntimeprefs-a-la-personnalisation-locale-non-metier.md`.
- Story suivante (démo) : `_bmad-output/planning-artifacts/epics.md` — Story 3.7.
- ADR P1/P2 : `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`.
- Code existant indicatif : `peintre-nano/src/app/ManifestErrorBanner.tsx`, `PageAccessBlocked.tsx`, `PageRenderer.tsx`, `peintre-nano/src/runtime/load-manifest-bundle.ts`, `resolve-page-access.ts`, `validation/manifest-validation-types.ts`.

---

## Dev Agent Record

### Agent Model Used

Cursor agent (bmad-dev-story / DS), 2026-04-02.

### Debug Log References

_(aucun)_

### Completion Notes List

- Module `report-runtime-fallback.ts` : `RuntimeRejectionSeverity`, `RuntimeFallbackPayload`, `reportRuntimeFallback` (console uniquement en dev, jamais en `MODE=test`).
- Rejets lot manifests : `rejectManifestBundle` dans `load-manifest-bundle.ts` (sévérité `blocked`, `state: manifest_bundle_invalid`).
- UI : `ManifestErrorBanner` — attributs `data-runtime-*` ; `PageAccessBlocked` — `useEffect` + `data-runtime-severity` / `data-runtime-code` ; `PageRenderer` — `WidgetResolveFallback` (degraded) et `UnmappedSlotsRegion` (info) ; `FilteredNavEntries` — nav vide → `FilteredNavEmpty` (info + report).
- Tests : `runtime-rejection-reporting.test.tsx` (manifest + widget + page) ; e2e manifest + auth enrichis (spy + DOM).

### File List

- `peintre-nano/src/runtime/report-runtime-fallback.ts` (nouveau)
- `peintre-nano/src/runtime/load-manifest-bundle.ts`
- `peintre-nano/src/runtime/README.md`
- `peintre-nano/src/app/ManifestErrorBanner.tsx`
- `peintre-nano/src/app/PageAccessBlocked.tsx`
- `peintre-nano/src/app/PageRenderer.tsx`
- `peintre-nano/src/app/FilteredNavEntries.tsx`
- `peintre-nano/tests/unit/runtime-rejection-reporting.test.tsx` (nouveau)
- `peintre-nano/tests/e2e/manifest-bundle.e2e.test.tsx`
- `peintre-nano/tests/e2e/auth-context-envelope.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-04-02 — Story 3.6 : visibilité des fallbacks/rejets, `reportRuntimeFallback`, attributs `data-runtime-*`, tests unitaires + e2e ; sprint-status → `review`.
- 2026-04-02 — Clôture : `sprint-status` → **done** ; harmonisation change log avec **Story completion status**.

---

## Story completion status

**Statut :** done

**Note :** Cycle BMAD terminé (**PASS**) ; `npm run lint`, `build`, `test` exécutés avec succès dans `peintre-nano/`. Nom canonique runtime : `reportRuntimeFallback` (alias / renommages historiques éventuels : tracer dans le change log si besoin).
