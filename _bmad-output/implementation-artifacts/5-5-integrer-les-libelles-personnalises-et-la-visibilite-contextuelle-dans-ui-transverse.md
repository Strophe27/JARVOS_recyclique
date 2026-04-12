# Story 5.5 : Intégrer les libellés personnalisés et la visibilité contextuelle dans l'UI transverse

Status: done

<!-- Create-story BMAD 2026-04-07 (CS) — Epic 5 ; présentation-only + politique nav masquée / actions bloquées alignée ContextEnvelope. -->

## Story

En tant qu'**utilisatrice d'une ressourcerie**,  
je veux que l'**UI transverse** reflète des **libellés locaux** et une **visibilité cohérente avec le contexte et les droits**,  
afin que le **shell recomposé** paraisse **aligné sur l'organisation locale** **sans** que la **vérité de sécurité** (clés techniques, permissions) soit **remplacée** ou **réécrite** côté front.

## Acceptance Criteria

1. **Libellés backend, présentation uniquement** — Étant donné que les intitulés peuvent varier par ressourcerie, quand le shell transverse et les entrées de navigation / zones pertinentes sont rendus, alors le runtime peut **afficher** des libellés fournis par le **backend** (via l'instance **`ContextEnvelope`** alignée OpenAPI, ou extension **reviewable** du schéma) pour résoudre des **`label_key`** déclarés dans les contrats CREOS ; ces libellés restent **strictement présentation** et **ne remplacent jamais** les **clés stables** de permission, de route, de `page_key` ni les identifiants techniques utilisés pour la garde d'accès. [Source : `epics.md` — Story 5.5 ; `navigation-structure-contract.md` — Truth Hierarchy]

2. **Résolution déterministe `label_key` → texte affichable** — Étant donné que `NavigationManifest` porte déjà un champ optionnel `label_key` (JSON `label_key`) consommé tel quel aujourd'hui dans `FilteredNavEntries`, quand cette story est livrée, alors le rendu transverse applique une **résolution explicite** : si l'enveloppe (ou le contrat convenu) fournit une entrée pour la clé, afficher ce texte ; **sinon** fallback **documenté** (ex. clé elle-même ou libellé manifeste statique **déjà** porté par le contrat — **sans** inventer de texte métier côté `peintre-nano`). [Source : `peintre-nano/src/types/navigation-manifest.ts` ; `peintre-nano/src/app/FilteredNavEntries.tsx`]

3. **Politique unifiée : navigation structurelle masquée vs accès page / action bloqués avec feedback** — Étant donné que certaines zones dépendent du contexte ou des permissions, quand l'UI transverse décide quoi montrer, alors : (a) les **entrées de navigation structurelles** non autorisées restent **filtrées hors rendu** via `filterNavigation` (pas de « fantômes » cliquables) ; (b) lorsqu'une **page** est sélectionnée mais **non autorisée** par l'intersection enveloppe + `PageManifest`, le blocage reste porté par **`resolvePageAccess`** + **`PageAccessBlocked`** avec **message explicite** et **traçabilité** `reportRuntimeFallback` ; (c) si le schéma OpenAPI expose un **`restriction_message`** (ou équivalent) pour les états `degraded` / `forbidden`, le runtime **peut** l'**exposer** dans la zone shell / bannière de contexte **sans** en faire une source d'autorisation. [Source : `epics.md` — Story 5.5 ; `resolve-page-access.ts` ; `PageAccessBlocked.tsx` ; `contracts/openapi/recyclique-api.yaml` — `ContextEnvelope.restriction_message`]

4. **Cohérence avec l'enveloppe active** — Étant donné un **`ContextEnvelope`** `ok`, `degraded`, `forbidden` ou périmé (`STALE_CONTEXT`), quand l'utilisatrice parcourt le transverse, alors le comportement de **filtrage nav**, **garde page** et **messages** reste **aligné** sur les **mêmes** règles que les stories **5.1**–**5.4** ; **aucun** recalcul de permissions « au feeling » dans `peintre-nano`. [Source : `filter-navigation-for-context.ts` ; `2026-04-07_03_checklist-pr-peintre-sans-metier.md` — points 5, 8]

5. **`UserRuntimePrefs` inchangés sur la sémantique** — Étant donné la story **3.5**, quand les libellés contextuels sont ajoutés, alors les **prefs locales** ne participent **toujours pas** à `filterNavigation` ni à `resolvePageAccess` ; toute personnalisation **locale** reste **hors** périmètre des libellés **ressourcerie** portés par le backend. [Source : `_bmad-output/implementation-artifacts/3-5-borner-userruntimeprefs-a-la-personnalisation-locale-non-metier.md`]

6. **Contrats nommés et hiérarchie de vérité** — Étant donné la checklist PR, quand la PR est rédigée, elle cite explicitement les évolutions **`contracts/openapi/recyclique-api.yaml`** (champs présentation sur `ContextEnvelope` ou sous-objet dédié **additive**) et, si besoin, **`contracts/creos/manifests/`** (ex. harmonisation `label_key` sur un lot transverse **déjà** servi) + adaptation **`ContextEnvelopeStub`** / adaptateur démo ; **pas** d'édition manuelle des **fichiers générés** pour contourner le contrat. [Source : checklist PR — points 3, 9, 11]

7. **Jeux de règles stables pour les epics suivants** — Étant donné l'objectif Epic 5, quand cette story est terminée, alors la **politique** (masquage nav vs blocage page + messages) et le **mécanisme de libellés** sont **documentés** dans le story file / code (commentaires ciblés ou petit module `resolvePresentationLabel`) de façon **réutilisable** par **5.6**–**5.8** et les epics **6**–**9** sans refonte écran par écran. [Source : `epics.md` — Story 5.5]

## Tasks / Subtasks

- [x] **Contrat OpenAPI + stub runtime** (AC: 1, 2, 6)
  - [x] Proposer et figer une extension **additive** au schéma `ContextEnvelope` pour porter les libellés présentation (ex. propriété nommée `presentation_labels` avec map `label_key` → chaîne UTF-8, ou objet `presentation_copy` versionné) — **review** dans `contracts/openapi/recyclique-api.yaml` ; **attention** : le schéma actuel impose `additionalProperties: false` sur `ContextEnvelope` : ajouter des clés **déclarées** sous `properties` (pas de champs dynamiques à la racine de l'objet) ; documenter la rétrocompatibilité (champs optionnels).
  - [x] Étendre `ContextEnvelopeStub` (`peintre-nano/src/types/context-envelope.ts`) + mapping adaptateur auth / démo (`default-demo-auth-adapter.ts` ou couche unique) pour refléter le schéma sans inférer de permissions.
  - [x] Enrichir `createDefaultDemoEnvelope` avec **au moins un** couple `label_key` / valeur pour prouver la résolution sur la nav transverse servie.

- [x] **Résolution des libellés dans le rendu transverse** (AC: 1, 2, 5, 7)
  - [x] Introduire une fonction pure **testable** du type `resolveNavEntryDisplayLabel(entry, envelope)` (emplacement : `peintre-nano/src/runtime/` ou `app/navigation/`) consommée par `FilteredNavEntries` (et `FilteredNavList` si utilisé sur le même bundle).
  - [x] Vérifier les manifests `contracts/creos/manifests/navigation-transverse-served.json` : utiliser des **`label_key`** stables (préfixe explicite, ex. `nav.transverse.*`) là où le produit veut une personnalisation backend ; garder les **permissions** et **`route_key`** inchangées.

- [x] **Visibilité, restriction_message, cohérence UX** (AC: 3, 4, 7)
  - [x] Cartographier les chemins existants : nav filtrée, `PageAccessBlocked`, enveloppe `degraded` / `forbidden` / stale — **aucune** régression sur les tests **5.1**–**5.4**.
  - [x] Si `restriction_message` est ajouté au stub : l'afficher dans un emplacement shell **non bloquant** (ex. bandeau contexte sous le shell démo) **uniquement** quand l'enveloppe l'expose, sans court-circuiter `resolvePageAccess`.

- [x] **Tests** (AC: 1–7)
  - [x] Tests **unitaires** : résolution libellé (présent / absent), absence d'effet des `UserRuntimePrefs` sur la résolution autorisation.
  - [x] Tests **contract** / **e2e** : au moins un libellé démo résolu depuis l'enveloppe sur une entrée nav transverse ; scénario permission manquante inchangé (nav masquée ou page bloquée selon le parcours).
  - [ ] `npm run lint` et `npm test` dans `peintre-nano/` — **gates shell** (non exécuté dans le spawn DS ; à valider en CI / terminal).

## Dev Notes

### Garde-fous architecture et checklist PR Peintre

Relire intégralement `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` : pas de seconde vérité métier dans le front, pas de permissions déduites, hiérarchie `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs`.

**Périmètre checklist §3 (widgets / `operation_id`)** : cette story ne livre pas de nouveau widget métier chargé par données ; si un correctif touche un widget existant, chaque `data_contract.operation_id` doit rester résolu dans `contracts/openapi/recyclique-api.yaml` (pas d'endpoint implicite).

**Alignement `epics.md` Story 5.5 :** libellés **présentation** ; politique **nav masquée** (filtrage) **vs** **blocage page / feedback explicite** ; cohérence avec **`ContextEnvelope`** actif.

### Structure projet et fichiers typiques

| Zone | Rôle |
|------|------|
| `contracts/openapi/recyclique-api.yaml` | Extension schéma `ContextEnvelope` (libellés / copy présentation) |
| `contracts/creos/manifests/navigation-transverse-served.json` | `label_key` stables sur entrées transverses |
| `peintre-nano/src/types/context-envelope.ts` | Stub aligné OpenAPI |
| `peintre-nano/src/app/auth/default-demo-auth-adapter.ts` | Données démo pour libellés |
| `peintre-nano/src/app/FilteredNavEntries.tsx` | Consommateur résolution libellé |
| `peintre-nano/src/runtime/filter-navigation-for-context.ts` | Masquage structurel (inchangé sémantiquement) |
| `peintre-nano/src/runtime/resolve-page-access.ts` | Garde page |
| `peintre-nano/src/app/PageAccessBlocked.tsx` | Feedback blocage page |
| `peintre-nano/tests/unit/`, `tests/e2e/`, `tests/contract/` | Preuves |

[Source : `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md` ; `project-structure-boundaries.md`]

### Intelligence story 5.4 (continuité directe)

- **5.4** : lot admin transverse sous contrat + permissions `transverse.admin.view` + tests contract/e2e — **5.5** **ne casse pas** ces parcours ; elle **ajoute** la couche libellés + renforce la **lisibilité** des états contextuels.
- Fichier de référence : `_bmad-output/implementation-artifacts/5-4-migrer-un-premier-lot-cible-de-pages-admin-transverses.md`.

### Stories adjacentes (ne pas absorber)

- **5.6** : templates / layouts réutilisables — **hors** périmètre sauf si un tout petit hook d'affichage bandeau contexte partagé est nécessaire ; pas de refonte layout.
- **5.7** : états vides / chargement / erreurs transverses — ne pas remplacer par cette story ; seulement **câbler** les messages déjà prévus (ex. `restriction_message`) si pertinent.

### Conformité stack

- React 18, Vite 6, TypeScript ~5.7, Vitest 3 — pas d'upgrade majeure implicite.
- CSS Grid / ADR P1 pour tout nouveau placement shell.

### Références

- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — cadre pilotage v2, enchaînement shell / transverse]
- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.5]
- [Source : `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]
- [Source : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`]
- [Source : `contracts/openapi/recyclique-api.yaml` — `ContextEnvelope`]
- [Source : `_bmad-output/implementation-artifacts/5-4-migrer-un-premier-lot-cible-de-pages-admin-transverses.md`]
- [Source : `_bmad-output/implementation-artifacts/3-5-borner-userruntimeprefs-a-la-personnalisation-locale-non-metier.md`]

## Dev Agent Record

### Agent Model Used

Composer (agent dev-story BMAD), session 2026-04-07.

### Debug Log References

_(Néant.)_

### Completion Notes List

- Extension OpenAPI `ContextEnvelope.presentation_labels` (map string → string, nullable) + description Story 5.5.
- `ContextEnvelopeStub` : `presentationLabels`, `restrictionMessage` ; `createDefaultDemoEnvelope` fusionne `presentationLabels` et fournit un libellé démo pour `nav.transverse.dashboard`.
- `resolveNavEntryDisplayLabel` (runtime pur) : enveloppe puis fallback `label_key` / `route_key` ; `FilteredNavEntries` + `FilteredNavList` prennent `envelope`.
- Manifest CREOS : `label_key` transverses harmonisés `nav.transverse.*` (permissions et routes inchangées).
- `RuntimeDemoApp` : bandeau `restriction_message` au-dessus du shell (`ContextRestrictionBanner`), sans modifier `resolvePageAccess`.
- Tests : unit `resolve-nav-entry-display-label` (dont variante `presentation_labels` côté enveloppe uniquement), renfort `user-runtime-prefs-vs-authorization`, contract OpenAPI (`presentation_labels` + `restriction_message`) + nav servie, e2e 5.5 (libellé résolu + dégradé + bannière). **Lint / Vitest : non exécutés dans ce spawn DS** — lancer `npm run lint` et `npm test` en gates.

### File List

- `contracts/openapi/recyclique-api.yaml`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `peintre-nano/src/types/context-envelope.ts`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/src/runtime/resolve-nav-entry-display-label.ts`
- `peintre-nano/src/app/FilteredNavEntries.tsx`
- `peintre-nano/src/app/FilteredNavList.tsx`
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`
- `peintre-nano/src/app/demo/RuntimeDemoApp.module.css`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/tests/unit/resolve-nav-entry-display-label.test.ts`
- `peintre-nano/tests/unit/user-runtime-prefs-vs-authorization.test.ts`
- `peintre-nano/tests/contract/recyclique-openapi-governance.test.ts`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/5-5-integrer-les-libelles-personnalises-et-la-visibilite-contextuelle-dans-ui-transverse.md`

## Change Log

- **2026-04-07** : Story Runner — gates (`npm test`, `npm run build`) OK ; QA e2e traçabilité ; CR APPROVE + preuve servie `http://127.0.0.1:4444` ; `sprint-status` : `5-5-…` → `done` ; fichier story `done`.
- **2026-04-07** : Pass DS spawn — test gouvernance OpenAPI `restriction_message` ; test unitaire « libellé = f(envelope) » ; story `ready-for-gates`, sous-tâche npm explicitement hors spawn.
- **2026-04-07** : Implémentation dev-story 5.5 — OpenAPI `presentation_labels`, résolution libellés nav, bandeau `restriction_message`, manifests `nav.transverse.*`, tests + statut sprint `review`.
- **2026-04-07** : Create-story validate (VS) — référence story 3.5 explicite ; contrainte OpenAPI `additionalProperties: false` sur `ContextEnvelope` ; garde-fou checklist §3 (widgets / `operation_id`).
- **2026-04-07** : Create-story (CS) — fichier story 5.5 créé ; `sprint-status` : `5-5-…` → `ready-for-dev`.
- **2026-04-07** : Create-story (CS) — relecture Story Runner : ajout référence `guide-pilotage-v2.md` ; statut inchangé `ready-for-dev`.

---

**Note create-story :** analyse contexte exhaustive — Ultimate context engine analysis completed ; guide développeur prêt pour `dev-story`.
