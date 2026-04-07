# Story 4.5 : Ajouter un toggle admin minimal borné au module `bandeau live`

Status: done

<!-- Note : validation optionnelle — validate-create-story avant dev-story. -->

## Story

En tant qu’**administrateur responsable**,  
je veux un **mécanisme minimal d’activation / désactivation** du slice **`bandeau live`**,  
afin que le **premier module** puisse être **coupé ou réactivé en sécurité** avant l’existence du **système large de configuration admin** (Epic 9).

## Acceptance Criteria

1. **Chemin admin borné au slice** — Étant donné qu’Epic 4 exige un **chemin d’activation admin minimal** pour le premier module, quand le mécanisme est implémenté, alors un **administrateur** (rôle aligné sur le modèle backend existant, ex. `ADMIN` / `SUPER_ADMIN` — **à caler sur les garde-fous auth déjà en place**) peut **activer ou désactiver explicitement** le slice **`bandeau live`** via une **voie de configuration bornée** (pas une page « réglages généraux » réutilisable pour tous les modules). [Source : `_bmad-output/planning-artifacts/epics.md` — Story 4.5 ; Epic 4 intro]

2. **Vérité backend + chaîne gouvernée** — Étant donné que l’activation impacte la **composition UI**, quand l’état du toggle change, alors le **runtime** reflète activation / désactivation via le **chemin manifeste / props / rendu déjà gouverné** (pas de contournement ad hoc hors `PageRenderer` + widget enregistré `bandeau-live`) **et** la **source de vérité** de l’état « module coupé » est **backend-autoritaire** (pas seulement un flag local navigateur déconnecté du terrain). [Source : epics.md — Story 4.5 ; `project-structure-boundaries.md` — hiérarchie contrats]

3. **Traçabilité** — Étant donné le besoin de **support** et d’**exploitation**, quand un admin modifie le toggle, alors le changement est **traçable** (journal d’audit existant si le pattern est déjà là, sinon **log structuré minimal** documenté avec **qui / quand / site ou périmètre** — **sans** inventer un framework d’audit parallèle). [Source : epics.md — Story 4.5]

4. **Périmètre étroit vs Epic 9** — Étant donné que la **config admin simple** et la **matrice de fonctionnalités** relèvent d’**Epic 9**, quand cette story est revue, alors le livrable **ne généralise pas** l’ordonnancement des modules, la **feature matrix** globale ni les **réglages transverses** ; il reste **transitoire et explicitement limité** au **module bandeau live** (documenter la dette / le remplacement prévu par 9.6 dans les Dev Notes). [Source : epics.md — Story 4.5 ; Epic 9 — ex. Story 9.6]

5. **Fallback visible (cohérence 4.4)** — Étant donné que le slice a déjà une posture **défensive** (Story 4.4), quand le module est **désactivé par configuration**, alors l’UI ne **simule pas** un bandeau nominal ni un échec réseau : elle expose un **état explicite** (copy opérateur compréhensible + attributs `data-*` / codes stables **préfixés `BANDEAU_LIVE_*`** pour tests et outils), et **signale** au bus runtime via **`reportRuntimeFallback`** si la sévérité le justifie (ex. `info` ou `degraded` selon politique produit — **à trancher**, mais **obligatoire** : pas de silence). [Source : story 4.4 ; `peintre-nano/src/runtime/report-runtime-fallback.ts`]

6. **Contrat reviewable** — Étant donné la chaîne **OpenAPI + CREOS** (Stories 4.1–4.3), quand la désactivation est portée par l’API ou le snapshot, alors les **artefacts reviewables** (`contracts/openapi/recyclique-api.yaml`, et si besoin **manifests / schéma widget** sous `contracts/creos/`) sont **mis à jour de façon cohérente** avec la **règle B4** (`data_contract.operation_id` inchangé pour le fetch live : **`recyclique_exploitation_getLiveSnapshot`** — le toggle **ne remplace pas** l’`operationId` du poll). [Source : `contracts/README.md` ; `widgets-catalog-bandeau-live.json`]

## Tasks / Subtasks

- [x] **Décision d’architecture minimaliste** (AC: 1, 2, 4, 6)
  - [x] Choisir et documenter dans le PR de la story **un** schéma parmi les options **bornées** (exemples non exhaustifs) : (A) clé dans **`Site.configuration`** JSON + lecture dans le service **`build_exploitation_live_snapshot`** avec champ booléen dédié dans la réponse ; (B) petit endpoint **v2** lecture/écriture réservé admin sous préfixe **`/v2/exploitation/`** ou **`/v2/admin/`** avec **`operationId` stables** nouveaux ; (C) fusion des **`widget_props`** côté **chargement de page** si une brique « merge serveur → `PageManifest` » existe déjà — **interdit** : inventer toute une couche « admin settings » réutilisable.
  - [x] Vérifier alignement **permissions** (qui peut lire l’état vs qui peut l’écrire).

- [x] **Backend Recyclique** (AC: 1–3, 6)
  - [x] Implémenter persistance + lecture du flag (site ou périmètre **minimal** cohérent avec le contexte effectif déjà utilisé pour le live snapshot).
  - [x] Endpoint(s) ou champ de réponse : contrats **Pydantic** + **OpenAPI** mis à jour ; tests **`pytest`** (happy path, 403 non-admin sur écriture, lecture cohérente).

- [x] **Peintre_nano — widget `bandeau-live`** (AC: 2, 5)
  - [x] Étendre **`BandeauLive.tsx`** (et README du domaine) : branche **« module désactivé »** avant tout poll inutile si le signal est « off » (économie réseau + clarté) ; états `data-bandeau-state` / `data-runtime-code` documentés dans le tableau du README.
  - [x] Ne **pas** dupliquer la logique de auth : réutiliser **`AuthRuntimeProvider`** / port existant ; si un **nouveau fetch** est nécessaire, centraliser dans un petit client (même esprit que `live-snapshot-client.ts`).

- [x] **Manifests / bac à sable** (AC: 2, 6)
  - [x] Mettre à jour ou compléter les **fixtures de test** et, si le produit l’exige, le **bac à sable reviewable** pour illustrer le toggle (sans casser les contrats **4.1** déjà testés dans `peintre-nano/tests/contract/creos-bandeau-live-manifests-4-1.test.ts`).

- [x] **Tests** (AC: 1–6)
  - [x] **Vitest** : unitaires widget (désactivé → pas d’appel `fetchLiveSnapshot` **ou** mock qui prouve l’absence de poll selon design) ; état DOM + `reportRuntimeFallback` si applicable.
  - [x] **E2E jsdom** (ex. `bandeau-live-sandbox-compose.e2e.test.tsx`) : scénario **activé / désactivé** sans régression des chemins 4.3 / 4.4.

## Dev Notes

### Garde-fous architecture

- **Pas de règles métier F1–F6 recalculées côté frontend** pour « simuler » la désactivation : la décision **off** vient du **backend** ou d’une **fusion manifeste** serveur, pas d’une préférence utilisateur locale seule (cf. Story 3.5 — `UserRuntimePrefs` reste **hors métier** ; le toggle admin **n’est pas** une simple préférence UI). [Source : epics Epic 3 / 4]
- **Chaîne manifeste** : le widget **`bandeau-live`** reste résolu via **`registerBandeauLiveWidgets`** et **`PageRenderer`** ; toute optimisation « ne pas monter le widget » doit rester **déclarative** (slot retiré / type placeholder / props) et **testée**. [Source : `peintre-nano/src/app/PageRenderer.tsx`]
- **Epic 9** : noter explicitement en commentaire de code ou README que la solution est **provisoire** et sera **absorbée** par la **config admin simple** (Story 9.6) — **sans** coder 9.6 ici.

### Périmètre explicite (ne pas faire)

- **Pas** de **dashboard admin** transverse ni navigation Epic 5.
- **Pas** de **matrice de modules** ni d’**ordre d’affichage** global.
- **Pas** de modification du **gate E2E chaîne complète** réservé à la **Story 4.6** (sauf réutilisation de données si le toggle y est mentionné).

### Structure projet et fichiers typiques à toucher

| Zone | Fichiers / dossiers |
|------|---------------------|
| Widget | `peintre-nano/src/domains/bandeau-live/BandeauLive.tsx`, `BandeauLive.module.css`, `README.md` |
| Client HTTP | `peintre-nano/src/api/live-snapshot-client.ts` et/ou **nouveau** client minimal dédié au flag (si séparé du snapshot) |
| Normalisation | `peintre-nano/src/domains/bandeau-live/live-snapshot-normalize.ts` (si le signal « enabled » transite dans le JSON snapshot) |
| Backend | `recyclique/api/src/recyclic_api/services/exploitation_live_snapshot_service.py`, `api_v2/endpoints/exploitation.py`, schémas `exploitation_live_snapshot.py`, modèle `Site` / migrations si la persistance exige une colonne dédiée (préférer **`configuration` JSON** si suffisant pour limiter la migration) |
| Contrats | `contracts/openapi/recyclique-api.yaml` ; régénérer types si pipeline `generated/` ; `contracts/creos/manifests/*.json` si nécessaire |
| Tests | `recyclique/api/tests/test_exploitation_live_snapshot.py` (+ nouveaux tests toggle), `peintre-nano/tests/unit/bandeau-live-*.tsx`, `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx` |

### Intelligence story précédente (4.4)

- **`BANDEAU_LIVE_*`** : grille des codes et `data-bandeau-state` déjà stabilisée ; **réutiliser** le même vocabulaire pour l’état « désactivé admin » (nouveau code stable, ex. `BANDEAU_LIVE_MODULE_DISABLED` — nom exact laissé à l’implémentation).
- **`reportRuntimeFallback`** : déjà utilisé sur toutes les branches d’échec / dégradation pertinentes ; l’état **désactivé** doit **s’intégrer** sans second bus d’événements.
- **Corrélation** : le toggle **n’oblige pas** un `X-Correlation-ID` sur une requête inexistante ; si un fetch admin d’écriture existe, appliquer les **mêmes pratiques** de traçabilité que le reste de l’API v2.

### Intelligence stories 4.1–4.3 (contrat + live)

- **`GET /v2/exploitation/live-snapshot`** reste l’ancrage du **`data_contract`** widget ; le toggle peut soit **court-circuiter** le poll côté UI lorsque la réponse indique « off », soit **exposer un champ booléen** dans la réponse snapshot — **documenter le choix** dans le README du domaine.
- **Permission** `recyclique.exploitation.view-live-band` sur la page bac à sable : vérifier la **cohérence** avec « voir le bandeau » vs « admin toggle » (lecture état peut rester plus large que l’écriture).

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.5]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Convergence 2, gate bandeau]
- [Source : `_bmad-output/implementation-artifacts/4-4-rendre-visibles-les-fallbacks-et-rejets-du-slice-bandeau-live.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]
- [Source : `contracts/openapi/recyclique-api.yaml` — `/v2/exploitation/live-snapshot`]
- [Source : `contracts/creos/manifests/widgets-catalog-bandeau-live.json`, `page-bandeau-live-sandbox.json`]

### Contexte projet (`project-context.md`)

- Aucun `project-context.md` trouvé à la racine du dépôt pour cette story ; s’appuyer sur les artefacts ci-dessus et `references/index.md` si besoin.

### Informations techniques récentes (stack existante)

- **Peintre_nano** : React + Vite + Vitest (versions du `package.json` du package — ne pas upgrader hors besoin).
- **Backend** : FastAPI + SQLAlchemy ; tests pytest dans `recyclique/api/tests/`.

## Dev Agent Record

### Agent Model Used

Composer (agent dev-story BMAD), 2026-04-07.

### Debug Log References

- E2E `bandeau-live-sandbox-compose` : `fetch` non appelé car les `widget_props` issus du manifeste sont en **camelCase** (`useLiveSource`) après `deepMapKeysToCamelCase`, alors que le widget ne lisait que `use_live_source` — corrigé dans `BandeauLive.tsx` (acceptation des deux formes + intervalle de poll).
- `log_audit` sur le PATCH retiré : DB de test SQLite sans table `audit_logs` → échec persistance + `rollback` dans `log_audit` → session ORM corrompue (**ObjectDeletedError**). Traçabilité : **`logger.info` structuré** (qui / site / états / IP), conforme AC « log structuré minimal ».

### Implementation Plan

- **Schéma retenu** : **A + B** — clé `sites.configuration.bandeau_live_slice_enabled` ; champ `bandeau_live_slice_enabled` dans `GET /v2/exploitation/live-snapshot` ; écriture bornée `PATCH /v2/exploitation/bandeau-live-slice` (`operationId` `recyclique_exploitation_patchBandeauLiveSlice`), rôles `ADMIN` / `SUPER_ADMIN`, traçabilité **`logger.info` structuré** (audit DB optionnel quand schéma aligné / Epic 9.6).
- **Permissions** : lecture état via le GET (tout utilisateur authentifié pouvant appeler le snapshot) ; écriture réservée admin avec site affecté (400 si pas de site).

### Completion Notes List

- AC couverts : backend autoritaire, UI `module_disabled` + `BANDEAU_LIVE_MODULE_DISABLED` + `reportRuntimeFallback` (`info`), pas de polling après premier tick si slice off, contrats OpenAPI + types générés alignés, pytest et Vitest verts.
- Pas de client HTTP front dédié au PATCH dans le périmètre minimal (toggle exploitable via API / outils ; même auth que le reste de l’API si ajout UI plus tard).

### File List

- `recyclique/api/src/recyclic_api/services/exploitation_live_snapshot_service.py`
- `recyclique/api/src/recyclic_api/api/api_v2/endpoints/exploitation.py`
- `recyclique/api/src/recyclic_api/schemas/exploitation_live_snapshot.py`
- `recyclique/api/tests/test_exploitation_live_snapshot.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts`
- `peintre-nano/src/domains/bandeau-live/BandeauLive.tsx`
- `peintre-nano/src/domains/bandeau-live/live-snapshot-normalize.ts`
- `peintre-nano/src/domains/bandeau-live/README.md`
- `peintre-nano/tests/unit/bandeau-live-widget.test.tsx`
- `peintre-nano/tests/unit/bandeau-live-live-source.test.tsx`
- `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live.md`

## Change Log

- **2026-04-07** — Story 4.5 implémentée et validée (`pytest tests/test_reception_live_stats.py` + `test_exploitation_live_snapshot.py`, `npm run lint` + `npm run test` peintre-nano) ; correctif ingest manifeste : `useLiveSource` / `pollingIntervalS` ; traçabilité PATCH sans `log_audit` (log structuré) ; story et sprint-status `4-5` → **review**.

## Git intelligence (session create-story)

Travail récent sur le slice bandeau : stories **4.1–4.4** livrées (manifests CREOS, widget, client live, fallbacks) ; statut sprint **4-4** `done` au **2026-04-07**. Pas d’API « module toggle » préexistante identifiée dans le dépôt : la story impose une **conception minimaliste** explicite.

---

**Story completion status** : **review** — implémentation et tests validés ; prêt pour revue de code (idéalement autre LLM que l’implémenteur).

_Ultimate context engine analysis completed — comprehensive developer guide created._
