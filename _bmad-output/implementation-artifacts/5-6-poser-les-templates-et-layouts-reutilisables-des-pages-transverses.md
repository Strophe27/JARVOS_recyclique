# Story 5.6 : Poser les templates et layouts réutilisables des pages transverses

Status: done

<!-- Create-story BMAD 2026-04-07 (CS) — Epic 5 ; infrastructure de présentation transverse, compatible manifests + CSS Grid, sans logique métier dans les templates. -->

## Story

En tant qu’**équipe de composition frontend**,  
je veux des **templates et conventions de layout réutilisables** pour les écrans transverses,  
afin que **dashboard**, **admin**, **listings** et **consultation** partagent **un même modèle de composition** cohérent avec le runtime manifest-driven.

## Acceptance Criteria

1. **Patrons de layout transverses nommés** — Étant donné que le **shell** et le **moteur de grille** existent déjà (`RootShell`, `CSS Grid`, zones `header` / `nav` / `main` / `aside` / `footer`), quand les templates transverses sont formalisés, alors le projet définit des **patrons réutilisables** pour les familles d’écrans transverses : au minimum **dashboard**, **listing**, **détail (consultation)** et **admin** (structure de page, pas le contenu métier des widgets). Ces patrons restent **compatibles** avec la composition pilotée par **`PageManifest`** (slots → `buildPageManifestRegions` / `mapSlotIdToShellRegion`) et avec la grille du shell existante. [Source : `epics.md` — Story 5.6 ; `peintre-nano/src/app/layouts/RootShell.module.css` ; `peintre-nano/src/app/PageRenderer.tsx`]

2. **Réduction de la duplication structurelle** — Étant donné que les stories **5.2**–**5.4** ont déjà branché des pages transverses via manifests sous `contracts/creos/manifests/`, quand de nouvelles pages transverses sont ajoutées au runtime, alors elles **peuvent** s’appuyer sur des **composants / modules CSS** de template partagés (ex. en-tête de zone `main`, grilles internes de listing, colonnes détail) **au lieu** de recomposer ad hoc les mêmes `flex` / `grid` dans chaque intégration démo ou widget. [Source : `epics.md` — Story 5.6 ; `peintre-nano/src/app/PageRenderer.module.css`]

3. **Séparation stricte infrastructure / contenu widget** — Étant donné la checklist PR Peintre, quand un template est introduit, alors il ne porte **aucune** règle métier, **aucune** permission dérivée et **aucun** appel API ; il fournit uniquement des **gabarits de mise en page**, des **tokens** (`src/styles/tokens.css`) et des **zones sémantiques** (ex. `TransversePageHeader`, `TransverseTwoColumnBody`) dans lesquelles le runtime continue d’injecter les **widgets** résolus depuis le manifest. Les widgets métier restent dans `registry` / `domains` / contrats `data_contract.operation_id`. [Source : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — points 3, 5, 12]

4. **Pas de contournement des contrats** — Étant donné la hiérarchie `OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs`, quand les templates sont câblés, alors **aucune** nouvelle `page_key`, route ou permission n’apparaît **uniquement** dans le code des templates ; la structure informationnelle reste **commanditaire** via CREOS + OpenAPI. [Source : `navigation-structure-contract.md` ; checklist §2]

5. **Langage de layout stable pour les epics suivants** — Étant donné que les epics **6**–**9** migreront des flows riches, quand la story **5.6** est livrée, alors la documentation embarquée (README sous `templates/` + commentaires ciblés sur les exports publics) décrit **quand** utiliser quel patron transverse, de façon **réutilisable** sans « hacks » spécifiques dashboard. La story **5.7** reste responsable des **états vide / chargement / erreur** transverses : **ne pas** les absorber entièrement ici sauf hooks visuels minimaux (ex. conteneur prévu pour un futur slot d’état). [Source : `epics.md` — Stories 5.6, 5.7]

6. **Preuve par refactor ciblé** — Étant donné les manifests transverses déjà servis (ex. `page-transverse-dashboard.json`, listings, consultation, admin du lot **5.3**–**5.4**), quand l’implémentation est terminée, alors **au moins deux** écrans transverses du lot existant **réutilisent** explicitement le même module de template (import partagé + classes cohérentes), de manière observable dans le code et couverte par au moins un test (unitaire ou e2e jsdom) qui vérifie la présence des `data-testid` / structure attendue. [Source : `contracts/creos/manifests/page-transverse-*.json` ; `peintre-nano/src/app/demo/runtime-demo-manifest.ts`]

## Tasks / Subtasks

- [x] **Cartographier l’existant et nommer les patrons** (AC: 1, 5)
  - [x] Lister les pages transverses déjà branchées (clés `page_key` / fichiers manifest) et leur structure visuelle actuelle dans `RuntimeDemoApp` / widgets.
  - [x] Définir une convention de nommage (ex. `Transverse*Layout`, fichiers sous `peintre-nano/src/app/templates/transverse/`) alignée sur `project-structure-boundaries.md`.

- [x] **Implémenter les modules template + CSS Modules** (AC: 1–4)
  - [x] Créer les composants de présentation (dashboard, listing, détail, admin) en **CSS Grid / flex** avec **tokens** uniquement — pas de Mantine **layout** pour la structure spatiale des grilles de page (ADR P1, cohérent avec `RootShell`).
  - [x] Brancher les widgets existants **sans** modifier la sémantique des `PageManifest` sauf si un ajustement **purement structurel** de slot est documenté et validé côté contrat CREOS.

- [x] **Refactor ciblé + preuve** (AC: 2, 6)
  - [x] Appliquer le template partagé à **au moins deux** parcours transverses existants (ex. une page listing + une page consultation, ou dashboard + admin selon ce qui réduit le plus la duplication).
  - [x] Ajouter / mettre à jour tests Vitest (unit ou `tests/e2e/`) pour la structure attendue.

- [x] **Documentation** (AC: 5)
  - [x] Remplacer ou enrichir `peintre-nano/src/app/templates/README.md` : tableau patron → cas d’usage → lien fichiers ; rappel séparation template / widget métier.

- [x] **Gates** (hors spawn DS si applicable)
  - [x] `npm run lint` et `npm test` dans `peintre-nano/`.

## Dev Notes

### Garde-fous architecture et checklist PR Peintre

Relire intégralement `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` : pas de seconde vérité métier, pas de permissions déduites, pas de `operation_id` implicite sur de nouveaux widgets métier. Les templates sont du **pur habillage**.

**Note Epic 5 (agents)** : relire aussi `epics.md` — note agents (hypothèse Peintre autonome + gouvernance contractuelle) pour tout changement touchant `peintre-nano` sur Epics 5–10.

### Structure projet et fichiers typiques

| Zone | Rôle |
|------|------|
| `peintre-nano/src/app/layouts/RootShell.tsx` | Grille shell ; régions nommées — **ne pas** casser les `data-testid` shell existants sans migration tests |
| `peintre-nano/src/app/PageRenderer.tsx` | Mapping manifest → régions ; les templates vivent **sous** `main` / à côté des stacks de slots selon design choisi |
| `peintre-nano/src/registry/shell-slot-regions.ts` | Vérité slot → région shell |
| `peintre-nano/src/app/templates/` | Cible naturelle des nouveaux patrons (remplacer le stub README minimal) |
| `contracts/creos/manifests/page-transverse-*.json` | Pages transverses de référence pour le refactor |
| `src/styles/tokens.css` | Couleurs, espacements — pas de magic numbers hors tokens |

### Intelligence story 5.5 (continuité)

- **5.5** : libellés présentation + `ContextRestrictionBanner` + résolution nav — les templates **5.6** doivent **prévoir l’emplacement** du contenu `main` de façon compatible avec le shell actuel (bandeau restriction **au-dessus** du shell dans `RuntimeDemoApp`, inchangé sauf harmonisation visuelle **non fonctionnelle**).
- Fichier de référence : `_bmad-output/implementation-artifacts/5-5-integrer-les-libelles-personnalises-et-la-visibilite-contextuelle-dans-ui-transverse.md`.

### Stories adjacentes (ne pas absorber)

- **5.7** : états vides, chargement, erreurs, dégradation locale — **hors périmètre fonctionnel** de **5.6** ; ne pas implémenter ici toute la couche d’états.
- **5.8** : validation transverse globale — pas de checklist produit complète dans **5.6**.

### Conformité stack

- React 18, Vite 6, TypeScript ~5.7, Vitest 3, Mantine 8 pour composants **locaux** uniquement si cohérent avec le reste du transverse ; structure de page en **CSS Modules + Grid** prioritaire pour alignement ADR P1.

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.6]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md`]
- [Source : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-peintre-autonome-applications-contributrices.md`]
- [Source : `peintre-nano/src/app/layouts/RootShell.tsx` ; `RootShell.module.css`]
- [Source : `peintre-nano/src/app/PageRenderer.tsx` ; `PageRenderer.module.css`]
- [Source : `_bmad-output/implementation-artifacts/5-5-integrer-les-libelles-personnalises-et-la-visibilite-contextuelle-dans-ui-transverse.md`]

## Dev Agent Record

### Agent Model Used

Composer (implémentation story 5.6 — DS).

### Debug Log References

_(Aucun blocage.)_

### Completion Notes List

- Patrons `TransverseHubLayout` (dashboard, listings, admin) et `TransverseConsultationLayout` (fiches 4 blocs) sous `templates/transverse/`, tokens CSS uniquement, placeholder `transverse-state-slot-placeholder` pour story 5.7.
- Injection runtime : option `wrapUnmappedSlotContent` sur `buildPageManifestRegions` + `RuntimeDemoApp` applique `TransverseMainLayout` selon `resolveTransverseMainLayoutMode(page_key)` — manifests CREOS inchangés.
- Tests unitaires `transverse-templates-5-6.test.tsx` : `data-testid`, partage explicite de `TransverseHubLayout` entre dashboard et listings via `TransverseMainLayout`.

### File List

- `peintre-nano/src/app/PageRenderer.tsx`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/app/templates/README.md`
- `peintre-nano/src/app/templates/transverse/index.ts`
- `peintre-nano/src/app/templates/transverse/resolve-transverse-main-layout.ts`
- `peintre-nano/src/app/templates/transverse/TransverseConsultationLayout.tsx`
- `peintre-nano/src/app/templates/transverse/TransverseConsultationLayout.module.css`
- `peintre-nano/src/app/templates/transverse/TransverseHubLayout.tsx`
- `peintre-nano/src/app/templates/transverse/TransverseHubLayout.module.css`
- `peintre-nano/src/app/templates/transverse/TransverseMainLayout.tsx`
- `peintre-nano/tests/unit/transverse-templates-5-6.test.tsx`
- `_bmad-output/implementation-artifacts/5-6-poser-les-templates-et-layouts-reutilisables-des-pages-transverses.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- **2026-04-07** : Create-story (CS) — fichier story 5.6 créé ; `sprint-status` : `5-6-…` → `ready-for-dev`.
- **2026-04-07** : Implémentation (DS) — gabarits transverses, `wrapUnmappedSlotContent`, tests Vitest ; story → `review`, sprint-status → `review`.

---

**Note create-story :** analyse contexte exhaustive — Ultimate context engine analysis completed ; guide développeur prêt pour `dev-story`.
