# Story 4.1 : Publier le contrat et les manifests minimaux du module `bandeau live`

Status: done

<!-- Note : validation optionnelle — validate-create-story avant dev-story. -->

## Story

En tant que système de modules piloté par le commanditaire,
je veux que le module `bandeau live` dispose de **contrats backend et UI explicites** (OpenAPI + manifests CREOS reviewables),
afin que le **premier slice vertical** prouve une **vraie chaîne modulaire** plutôt qu’un widget de démo codé en dur.

## Acceptance Criteria

1. **Slice minimal obligatoire (v2)** — Étant donné que `bandeau live` est le premier module métier obligatoire à prouver la chaîne, quand le slice minimal est défini, alors le dépôt **publie** le **contrat backend minimal**, les entrées **`NavigationManifest`** et **`PageManifest`** nécessaires pour **placer le module dans une page réellement composée** ; et ces artefacts restent **alignés sur la hiérarchie de vérité** et la **propriété commanditaire** (`recyclique` auteur structurel, `Peintre_nano` moteur). [Source : `_bmad-output/planning-artifacts/epics.md` — Story 4.1]

2. **Périmètre borné** — Étant donné que le module doit rester minimal à ce stade, quand les contrats sont revus, alors ils ne couvrent que les **besoins de données et de composition** du **bandeau live** ; et ils **n’absorbent pas** le périmètre **dashboard**, **admin** généralisé, ni **réglages transverses** hors slice. [Source : epics.md — Story 4.1]

3. **Ancrage contractuel pour scénarios nominaux et d’échec** — Étant donné que la chaîne modulaire repose sur des artefacts reviewables, quand cette story est acceptée, alors l’Epic 4 dispose d’un **ancrage au niveau contrat** pour les scénarios **nominal** et **échec** (contrat HTTP + schéma de réponse + lien manifest → `operation_id`) ; et les modules ultérieurs peuvent **réutiliser le même motif vertical**. [Source : epics.md — Story 4.1]

4. **Cohérence OpenAPI ↔ CREOS** — Le manifeste de widget (catalogue CREOS) ou la déclaration associée référence un **`data_contract.operation_id`** qui correspond exactement à un **`operationId`** stable dans `contracts/openapi/recyclique-api.yaml` (pour le bandeau : `recyclique_exploitation_getLiveSnapshot` sur `GET /v2/exploitation/live-snapshot`). Le paramètre d’en-tête **`X-Correlation-ID`** est **documenté** sur cette opération (déjà présent dans le YAML) et la story rappelle l’obligation de **corrélation** pour les appels live (exigence explicitée pour la convergence bout-en-bout en stories 4.3 / 4.6). [Source : `contracts/openapi/recyclique-api.yaml` ; epics.md — Story 4.3 / 4.6]

## Tasks / Subtasks

- [x] **Artefacts reviewables sous `contracts/creos/manifests/`** (AC: 1, 2, 3, 4)
  - [x] Créer le dossier `contracts/creos/manifests/` s’il n’existe pas (jalon promotion — [Source : `contracts/README.md`])
  - [x] Y placer un **`NavigationManifest` minimal** : au moins une route / `page_key` dédiée au slice bandeau (ex. route bac à sable ou route métier minimale **sans** élargir au dashboard) ; format JSON **aligné sur l’ingest Peintre_nano** (`version`, `entries`, champs `route_key`, `path`, `page_key`, permissions déclaratives si utilisées — calquer sur `peintre-nano/public/manifests/navigation.json`). [Source : `peintre-nano/public/manifests/navigation.json` ; `navigation-structure-contract.md` — Minimal Artifacts]
  - [x] Y placer un **`PageManifest` minimal** : template/slots cohérents avec le shell existant ; au moins un **slot** pour le futur widget bandeau dont la **clé / `widget_type`** est **la même** que dans le **catalogue widget** ci-dessous (traçabilité manifest page → déclaration CREOS → contrat HTTP — **Story 4.2** enregistrera le composant dans le registre). [Source : `peintre-nano/public/manifests/page-home.json` ; epics.md — Story 4.2 frontière]
  - [x] **Obligatoire (AC 4)** — Publier un fichier de **catalogue widget** (déclaration CREOS) pour `bandeau-live` avec bloc **`data_contract`** : `refresh: polling`, `polling_interval_s` documenté, **`operation_id` exactement `recyclique_exploitation_getLiveSnapshot`** (caractère pour caractère identique à l’`operationId` dans `contracts/openapi/recyclique-api.yaml`), `endpoint_hint: GET /v2/exploitation/live-snapshot`, `source` aligné tag `exploitation`. Sans ce fichier (ou équivalent reviewable au même emplacement listant la même `operation_id`), la story **n’est pas** complète. [Source : `contracts/creos/schemas/widget-declaration.schema.json` ; AC 4]

- [x] **Contrat OpenAPI « publié » et exploitable** (AC: 3, 4)
  - [x] Finaliser la **documentation** de `GET /v2/exploitation/live-snapshot` : retirer ou préciser le libellé « brouillon Story 1.7 » si le contrat est désormais **l’ancrage officiel** du slice ; confirmer que l’**`operationId`** publié est bien **`recyclique_exploitation_getLiveSnapshot`** (même chaîne que dans le catalogue CREOS — AC 4) ; garder les **références** à l’artefact signaux (`references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`) et à **Epic 2.7** pour la sémantique. [Source : `contracts/openapi/recyclique-api.yaml`]
  - [x] Vérifier que le schéma **`ExploitationLiveSnapshot`** et les règles **null / dégradation** restent alignés Story 2.6 / 2.7 (pas de régression documentaire). [Source : même fichier — `ExploitationLiveSnapshot`]
  - [x] Régénérer les types TS consommés : depuis `contracts/openapi/`, `npm run generate` ; **commiter** `contracts/openapi/generated/recyclique-api.ts` si le YAML change. [Source : `contracts/README.md` ; `peintre-nano/README.md`]

- [x] **Documentation d’intégration du domaine** (AC: 1, 2, 4)
  - [x] Enrichir `peintre-nano/src/domains/bandeau-live/README.md` : lien vers les **fichiers manifests reviewables** (navigation, page, **catalogue widget** avec `data_contract.operation_id`), vers **OpenAPI** (`live-snapshot`, `recyclique_exploitation_getLiveSnapshot`, `X-Correlation-ID`), rappel **hors scope** dashboard/admin ; une phrase sur la **suite Epic 4** (4.2–4.6). [Source : brief Story Runner ; fichier actuel minimal]

- [x] **Vérifications** (AC: 1–4)
  - [x] Cohérence des **`route_key` / `page_key`** entre navigation et page.
  - [x] **Ancrage AC 4 (bloquant)** : dans le JSON catalogue (ou déclaration reviewable livrée sous `contracts/creos/manifests/`), `data_contract.operation_id` vaut **`recyclique_exploitation_getLiveSnapshot`** et correspond à l’**`operationId`** de la même opération dans `contracts/openapi/recyclique-api.yaml` ; le slot **PageManifest** référence le **même** widget que ce catalogue (pas de « page seule » sans lien CREOS ↔ OpenAPI).
  - [x] **`X-Correlation-ID`** : présent et documenté sur l’opération OpenAPI concernée ; rappel corrélation repris dans la doc domaine si pertinent. [Source : AC 4]
  - [x] Pas d’`operationId` dupliqué ni renommage sans mise à jour des références manifestes (règle B4 — [Source : `contracts/README.md`])

## Dev Notes

### Garde-fous architecture

- **Hiérarchie de vérité** : OpenAPI → ContextEnvelope → NavigationManifest → PageManifest → UserRuntimePrefs. Les manifests ne portent **pas** de vérité métier ni permissions calculées seules. [Source : `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md` — Truth Hierarchy]
- **Emplacement canonique** reviewable : `contracts/creos/manifests/` (à distinguer des démos Epic 3 sous `peintre-nano/public/manifests/` et `src/fixtures/manifests/`). [Source : `navigation-structure-contract.md` — Canonical location ; `contracts/README.md`]
- **Slice bandeau minimal** (vision d’ensemble Epic 4) : navigation + page + contexte + prefs + bandeau + contrat backend + rejet visible — cette story ne livre **que** contrat + manifests ; le **rendu widget** est **4.2**, **branchement backend réel** **4.3**, **fallbacks visibles** **4.4**, **toggle admin** **4.5**, **E2E chaîne** **4.6**. [Source : `navigation-structure-contract.md` — Bandeau Live Minimal Slice ; epics.md — Stories 4.2–4.6]

### Périmètre explicite (ne pas faire)

- Pas de **recomposition dashboard** (Epic 5).
- Pas de **config admin simple** complète (Epic 9) — au plus préparer des **clés déclaratives** si déjà nécessaires au manifest, sans implémenter l’UI admin du toggle (story 4.5).
- Pas de **polling runtime** ni **journalisation backend** ici : documenter et câbler dans les stories suivantes ; la story 4.1 **ancre** les IDs et fichiers.

### Structure projet et fichiers typiques à toucher

| Zone | Fichiers / dossiers |
|------|---------------------|
| Contrat HTTP | `contracts/openapi/recyclique-api.yaml`, `contracts/openapi/generated/recyclique-api.ts` |
| Manifests reviewables | `contracts/creos/manifests/*.json` (nouveau lot) |
| Schémas CREOS (référence) | `contracts/creos/schemas/widget-declaration.schema.json` |
| Doc domaine | `peintre-nano/src/domains/bandeau-live/README.md` |
| Index contrats (si nouvelle section manifests) | `contracts/README.md` — ajouter une ligne listant le sous-dossier `creos/manifests/` si utile pour les humains |

### Tests

- Pas exiger une suite E2E complète ici (réservée **4.6**) ; si le YAML change : s’assurer que **`npm run generate`** passe et que le dépôt ne laisse pas de drift TS.
- Si une validation JSON ou un script CI existant référence les manifests : l’étendre **sans** casser les lots démo Epic 3.

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.1 ; Stories 4.2–4.6 pour dépendances]
- [Source : `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md` — Truth Hierarchy, Minimal Artifacts, Bandeau Live Minimal Slice, data_contract]
- [Source : `contracts/README.md` — gouvernance, codegen, `creos/manifests/`]
- [Source : `contracts/openapi/recyclique-api.yaml` — `/v2/exploitation/live-snapshot`, `X-Correlation-ID`, `ExploitationLiveSnapshot`]
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` — pivot gouvernance]
- [Source : `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md` — sémantique champs]
- [Source : `_bmad-output/implementation-artifacts/3-7-produire-la-page-de-demonstration-du-runtime-compose.md` — continuité socle / hors bandeau Epic 3]

## Dev Agent Record

### Agent Model Used

Composer (agent dev-story BMAD), session 2026-04-07.

### Debug Log References

_(aucun blocage)_

### Completion Notes List

- Manifests reviewables CREOS : navigation bac à sable `bandeau-live-sandbox`, page avec slot `widget_type` **bandeau-live**, catalogue `widgets-catalog-bandeau-live.json` avec `data_contract` (polling 30 s, `operation_id` **recyclique_exploitation_getLiveSnapshot**).
- OpenAPI : doc d’opération positionnée comme ancrage Epic 4.1 ; `X-Correlation-ID` documenté ; `info.version` **0.1.1-draft** (patch doc) ; schéma `ExploitationLiveSnapshot` inchangé (relecture 2.6 / 2.7).
- `npm run generate` exécuté dans `contracts/openapi` (succès).
- `contracts/README.md` et `peintre-nano/src/domains/bandeau-live/README.md` mis à jour (liens, hors scope, suite 4.2–4.6).

### File List

- `contracts/creos/manifests/navigation-bandeau-live-slice.json`
- `contracts/creos/manifests/page-bandeau-live-sandbox.json`
- `contracts/creos/manifests/widgets-catalog-bandeau-live.json`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `contracts/README.md`
- `peintre-nano/src/domains/bandeau-live/README.md`
- `_bmad-output/implementation-artifacts/4-1-publier-le-contrat-et-les-manifests-minimaux-du-module-bandeau-live.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

| Date | Résumé |
|------|--------|
| 2026-04-07 | Story 4.1 : manifests CREOS bandeau live, doc OpenAPI live-snapshot, README domaine + contrats, codegen OpenAPI. Statut → review. |
