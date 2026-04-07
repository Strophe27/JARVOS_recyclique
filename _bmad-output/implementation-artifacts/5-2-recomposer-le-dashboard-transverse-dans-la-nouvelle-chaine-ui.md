# Story 5.2 : Recomposer le dashboard transverse dans la nouvelle chaîne UI

Status: done

<!-- Create-story BMAD 2026-04-07 — contexte dev ; révision VS 2026-04-07 (checklist PR 6–12, codegen, navigation-structure-contract, report-runtime-fallback). -->

## Story

En tant qu'**opératrice ou responsable**,  
je veux que le **dashboard transverse** existe dans le **runtime v2 composé** (`Peintre_nano`),  
afin de lire les **informations opérationnelles transverses principales** depuis le **nouveau shell** avant que la migration métier complète ne soit terminée — **sans** recoder la logique métier `Recyclique` côté front ni créer une pile dashboard parallèle.

## Acceptance Criteria

1. **Même chaîne contract-driven que le reste du shell** — Étant donné qu'**Epic 4** a prouvé le premier slice vertical et que **5.1** sert la navigation transverse depuis `contracts/creos/manifests/`, quand le dashboard est recomposé, alors il est rendu via les **mêmes mécanismes** : chargement bundle (`loadManifestBundle`), résolution `PageManifest`, **slots / registre de widgets**, layout shell (`RootShell`, `buildPageManifestRegions`), garde d'accès page (`resolvePageAccess`) ; et il reste **borné à l'information transverse** (résumés, indicateurs légers, liens d'entrée) **sans** embarquer des **workflows métier complets** (caisse, réception, sync, modules sensibles). [Source : `_bmad-output/planning-artifacts/epics.md` — Story 5.2 ; Story 5.1]

2. **Cohérence contexte actif et permissions** — Étant donné que le dashboard doit rester aligné sur le **périmètre actif**, quand il s'affiche, alors le contenu **visible** reflète le **`ContextEnvelope`** et les **permissions** consommées depuis le backend (pas de déduction front des droits effectifs) ; les règles de **non-fuite** cross-site / cross-caisse sont les **mêmes** que pour le reste du runtime (`requires_site`, marqueurs de contexte, `filterNavigation` déjà en place pour la nav). Toute **granularité** supplémentaire sur le dashboard (masquage de blocs) doit rester **déclarative** dans le manifest ou pilotée par des données backend, **pas** par une logique métier inventée dans `peintre-nano`. [Source : `epics.md` — Story 5.2 ; `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — points 3–5, 8]

3. **Runtime partagé, erreurs et fallbacks** — Étant donné que ce dashboard fait partie de la **migration** et non d'une architecture séparée, quand la story est livrée, alors il **réutilise** le **runtime partagé**, la **gestion d'erreurs** et les **règles de fallback** existantes (`reportRuntimeFallback`, bandeaux / états dégradés visibles, alignement **AR32** / pas de succès silencieux sur contrat ou widget inconnu) ; et il **ne crée pas** une pile dashboard **parallèle** hors `Peintre_nano` (pas de route React orpheline, pas de second chargeur de manifests). [Source : `epics.md` — Story 5.2 ; story `5-1-...md` — Dev Notes AR32]

4. **Artefacts contractuels nommés et reviewables** — Étant donné la checklist PR, quand le dashboard est implémenté, alors la PR / les notes dev citent explicitement les fichiers **`contracts/creos/manifests/`** touchés (ex. évolution de `page-transverse-dashboard-placeholder.json` → manifest dashboard stable, éventuels **widgets catalogue** ou extensions OpenAPI si des widgets data sont ajoutés) ; tout widget officiel avec **`data_contract`** pointe vers un **`operation_id`** résolu dans `contracts/openapi/recyclique-api.yaml` (pas d'endpoint implicite). Si le manifest reste un **placeholder minimal** faute de données backend prêtes, le livrable **documente** ce gap et reste **cohérent** avec AC1–3 (composition shell réelle, pas un écran isolé). [Source : `2026-04-07_03_checklist-pr-peintre-sans-metier.md` — points 3, 11]

## Tasks / Subtasks

- [x] **Cadrer le périmètre dashboard transverse** (AC: 1, 2, 4)
  - [x] Remplacer ou faire évoluer `page-transverse-dashboard-placeholder.json` en un **`PageManifest` dashboard** nommé et stable (conserver ou renommer `page_key` de façon **traçable** dans `navigation-transverse-served.json` si nécessaire — **sans** casser la route `/dashboard` ni les permissions `transverse.dashboard.view`).
  - [x] Lister dans la story / ticket les **slots** prévus (ordre, `slot_id`, `widget_type`) : viser un **ensemble borné** (ex. en-tête + 2–4 blocs transverses), **pas** un tableau de bord métier exhaustif.
  - [x] Pour chaque widget **data** : vérifier / ajouter l'`operation_id` OpenAPI et le chemin manifeste ; sinon rester sur widgets **présentation** déjà allowlistés ou étendre le registre de façon **documentée**.

- [x] **Brancher la composition dans le pipeline servi** (AC: 1, 3)
  - [x] Mettre à jour `runtime-demo-manifest.ts` (tableau `pageManifestsJson` + `sourceLabels`) pour refléter le manifest dashboard final.
  - [x] Vérifier que `RuntimeDemoApp` / `resolvePageAccess` appliquent les mêmes règles sur la page dashboard que sur les autres pages transverses (`required_permission_keys`, `requires_site`, fraîcheur si pertinent).
  - [x] S'assurer que la grille / regions produites par `buildPageManifestRegions` restent **cohérentes** avec les conventions shell (CSS Grid — AR2 ; Mantine en adaptation ADR P1).

- [x] **Respecter les hors-périmètres Epic 6 / 7 / 8 / 9** (AC: 1, 2)
  - [x] Ne pas implémenter parcours **caisse**, **réception**, **sync Paheko**, **modules complémentaires** ou mutations sensibles dans cette story.
  - [x] Les liens vers des zones futures restent des **entrées de navigation** déjà portées par le manifest / Epic 5.3+ si besoin, sans simuler les flows.

- [x] **Tests et non-régression** (AC: 1–4)
  - [x] Étendre ou ajouter tests **contract** sur le bundle incluant le dashboard (pattern `navigation-transverse-served-5-1.test.ts`).
  - [x] Tests **unitaires** ciblés si nouvelle logique de résolution / props manifeste.
  - [x] **e2e** : parcours `/dashboard` avec enveloppe démo autorisée — rendu attendu, pas de régression nav 5.1 / bandeau Epic 4.
- [x] `npm test` et `npm run build` dans `peintre-nano/` ; **pas** d'édition manuelle des fichiers **générés** (`generated/` ou équivalent pipeline) pour corriger un contrat — correction dans `contracts/` + codegen (checklist PR point 9, aligné story 5.1). _(Gates exécutées par l’orchestrateur parent selon le brief ; preuve servie validée ensuite manuellement sur l’application réellement servie.)_

### Slots livrés (story 5.2 — ordre stable)

| Ordre | `slot_id` | `widget_type` | Rôle |
|-------|-----------|----------------|------|
| 1 | `dashboard.header` | `demo.text.block` | Synthèse transverse / hors workflows métier lourds |
| 2 | `dashboard.overview` | `demo.text.block` | Rappel enveloppe + permissions backend (pas de logique UI) |
| 3 | `dashboard.hints` | `demo.text.block` | Entrées futures via nav (5.3+, 5.4+) |
| 4 | `dashboard.data-gap` | `demo.text.block` | Gap documenté : pas de `data_contract` tant qu’OpenAPI/backend KPI transverses ne sont pas prêts |

## Dev Notes

### Garde-fous architecture et checklist PR Peintre

Avant toute implémentation, relire `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` et la note agents Epic 5 dans `epics.md` (hypothèse Peintre autonome, gouvernance contractuelle).

Points critiques pour **5.2** :

- Aucune **route** ou **`page_key`** métier **uniquement** dans le code React.
- Hiérarchie de vérité : `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs`.
- Pas de **recalcul** des permissions côté UI ; consommer l'enveloppe et les réponses API.
- Manifests officiels sous **`contracts/creos/manifests/`** (reviewables), pas seulement fixtures locales non promues.

**Rappel checklist PR — points complémentaires** (aligné story **5.1** ; `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`) :

- Tout widget officiel avec `data_contract` : **`operation_id`** résolu dans `contracts/openapi/recyclique-api.yaml` (point 3).
- Aucune **mutation sensible** ni **intégration externe métier** depuis le front ; le backend revalide (points 6–7).
- Aucun **état local** (ex. store client) comme source de vérité permission / contexte / navigation (point 8).
- **Point 9 (Codegen)** — Ne pas éditer à la main les **fichiers générés** (dossiers / artefacts produits par le pipeline OpenAPI ou codegen, p.ex. sous `generated/` ou chemins équivalents du repo) pour « corriger » un type ou un client API. Toute correction remonte vers **`contracts/`** (OpenAPI, schémas, manifests CREOS) puis **regénération** / étapes de codegen documentées — **même règle** que la story **5.1** (`npm run lint` / tests sans bricolage des sorties générées).
- **Fraîcheur contexte** / conventions **`DATA_STALE`** / états dégradés / **fallbacks visibles** : pas de succès silencieux sur contrat, widget inconnu ou données périmées (point 10, UX-DR10) ; s'appuyer sur `reportRuntimeFallback` et les patterns bandeau / garde page déjà en place.
- **Découplage `Recyclique`** : aucune dépendance ou import qui couple le runtime Peintre aux **détails internes métier** de `Recyclique` (point 12).

**Cohérence CREOS / `page_key` / routes** — Pour rester aligné avec la navigation transverse **5.1**, toute évolution du dashboard (renommage `page_key`, entrée nav, `path`) doit respecter les règles de structure et de validation décrites dans **`_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md`** (*Validation Rules*, *Runtime Interpretation Rules*, hiérarchie de vérité) : unicité `route_key` / `path` / `page_key`, chaque entrée résolue vers un `PageManifest`, shortcuts valides ; signal rouge si une route ou `page_key` n'existe que dans le code React.

### Structure projet et fichiers typiques

| Zone | Rôle |
|------|------|
| `contracts/creos/manifests/page-transverse-dashboard-placeholder.json` | Point de départ story 5.1 — à faire évoluer en manifest dashboard transverse |
| `contracts/creos/manifests/navigation-transverse-served.json` | Entrée `transverse-dashboard` → `/dashboard`, visibilité `transverse.dashboard.view` + contexte `site` ; garder la **cohérence** `page_key` ↔ manifest (voir `navigation-structure-contract.md`) |
| `peintre-nano/src/app/demo/runtime-demo-manifest.ts` | Assemblage `runtimeServedManifestLoadResult` |
| `peintre-nano/src/app/demo/RuntimeDemoApp.tsx` | Shell servi, filtre nav, rendu page |
| `peintre-nano/src/runtime/load-manifest-bundle.ts` | Validation bundle |
| `peintre-nano/src/runtime/resolve-page-access.ts` | Garde page |
| `peintre-nano/src/runtime/report-runtime-fallback.ts` | `reportRuntimeFallback` — reporting structuré des échecs manifeste / runtime (visibilité **AR32**, pas de second bus d'événements) |
| `peintre-nano/src/app/PageRenderer.tsx` (`buildPageManifestRegions`) | Découpage slots → regions |
| Registre widgets `peintre-nano/src/...` | Tout nouveau `widget_type` doit être enregistré + allowlist chargement si nécessaire |

[Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — arborescence contrats / manifests]

**Exemple minimal de slots (illustratif, non normatif)** — même forme que le placeholder actuel ; à remplacer par le manifest stable de la story :

```json
{
  "slots": [
    {
      "slot_id": "dashboard.header",
      "widget_type": "demo.text.block",
      "widget_props": { "title": "Synthèse transverse", "body": "…" }
    },
    {
      "slot_id": "dashboard.secondary",
      "widget_type": "demo.text.block",
      "widget_props": { "title": "Bloc secondaire", "body": "…" }
    }
  ]
}
```

### Intelligence story 5.1 (continuité)

- Le bundle servi importe déjà **`navigation-transverse-served.json`** et les pages dont **`page-transverse-dashboard-placeholder.json`**.
- **`filterNavigation`** applique `visibility.permission_any` et `contexts_all` / `contexts_any` via `ContextEnvelope` et `resolveContextMarkersFromEnvelope`.
- Permissions démo **`transverse.dashboard.view`** / **`transverse.admin.view`** sont dans l'adaptateur auth démo — conserver la **cohérence** quand le dashboard gagne du contenu (pas d'exiger des permissions fantômes non présentes dans l'enveloppe de test).
- Tests de référence : `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`, e2e `navigation-transverse-5-1.e2e.test.tsx`.

### Périmètre fonctionnel rappel (Epic 5)

- **In scope** : composition transverse **lisible**, **contract-driven**, alignée shell v2, indicateurs / blocs d'accueil opérationnels **légers**.
- **Out of scope** : stories **5.3–5.8** (listings, admin lot, libellés, templates transverses dédiés, états vides globaux, validation cohérence shell finale) sauf **réutilisation** ponctuelle si déjà disponible ; **Epic 6** (caisse), **7** (réception), **8** (sync), **9** (modules / ACL).

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.2]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — jalons Epic 5]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md` — CREOS, `page_key`, routes, validation]
- [Source : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` — cité epics Epic 5]
- [Source : `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-peintre-autonome-applications-contributrices.md` — extractibilité, hors implémentation directe]
- [Source : `_bmad-output/implementation-artifacts/5-1-recomposer-la-navigation-transverse-commanditaire-dans-peintre-nano.md`]

### Stack technique (ne pas changer de framework sans décision explicite)

Versions courantes du package `peintre-nano` : React ^18.3, Vite ^6, TypeScript ~5.7, Vitest ^3, Mantine 8.3.x. Respecter les patterns existants (pas d'ajout de librairie state global métier). [Source : `peintre-nano/package.json`]

### Project context

Aucun `project-context.md` racine détecté dans le dépôt à la date de création de cette story ; s'appuyer sur les documents listés ci-dessus.

## Dev Agent Record

### Agent Model Used

Composer (sous-agent Task Story Runner BMAD), session 2026-04-07.

### Debug Log References

Aucun blocage.

### Completion Notes List

- Manifest stable **`contracts/creos/manifests/page-transverse-dashboard.json`** : `page_key` **`transverse-dashboard`**, `required_permission_keys` + `requires_site` inchangés par rapport au placeholder ; **4 slots** `demo.text.block` uniquement ; bloc **`dashboard.data-gap`** documente l’absence de widgets `data_contract` / KPI jusqu’à OpenAPI+backend prêts (AC4).
- **`navigation-transverse-served.json`** : `page_key` aligné sur `transverse-dashboard` (route `/dashboard`, visibilité 5.1 inchangée).
- **`runtime-demo-manifest.ts`** : import + `sourceLabels` + commentaire story 5.2.
- **`RuntimeDemoApp`** / **`resolvePageAccess`** : aucun code spécifique — la page transverse suit le même pipeline que les autres `PageManifest` (garde permissions/site/fraîcheur déjà générique).
- Tests **contract** étendus (`navigation-transverse-served-5-1.test.ts`) ; **e2e** 5.1 mis à jour pour les titres/textes dashboard (non exécuté en gate complète par ce sous-agent ; vitest ciblé contract+e2e transverse : OK).
- Gates parent du brief exécutées : **`npm test`** puis **`npm run build`** dans `peintre-nano` → OK.
- Preuve servie validée manuellement sur l’application réellement servie à **`http://127.0.0.1:4444`** : chargement de `/`, manifests CREOS réseau (`navigation-transverse-served.json`, `page-transverse-dashboard.json`, `page-transverse-admin-placeholder.json`), affichage attendu sur **`/dashboard`** et **`/admin`**, aucun message console visible.

### File List

- `contracts/creos/manifests/page-transverse-dashboard.json` (nouveau)
- `contracts/creos/manifests/page-transverse-dashboard-placeholder.json` (supprimé)
- `contracts/creos/manifests/navigation-transverse-served.json`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/5-2-recomposer-le-dashboard-transverse-dans-la-nouvelle-chaine-ui.md`

## Change Log

- **2026-04-07** — Story 5.2 : manifest dashboard transverse contract-driven, nav `page_key` `transverse-dashboard`, tests contract + e2e alignés, gates parent `npm test` + `npm run build` OK, preuve servie validée manuellement sur `http://127.0.0.1:4444`. Statut sprint : `done`.
