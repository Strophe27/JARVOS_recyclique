# Story 15.2 : Cartographier les dependances API, permissions et contextes de l'admin legacy

Status: review

**Story key :** `15-2-cartographier-les-dependances-api-permissions-et-contextes-de-ladmin-legacy`  
**Epic :** 15

## Story

As a team preparing contract-driven migration work,  
I want the admin screens mapped to their endpoints, permissions, step-up needs, and context constraints,  
So that future CREOS slices stay anchored to real backend authority and not frontend guesswork.

## Acceptance Criteria

**Given** admin screens depend on heterogeneous APIs and permission regimes  
**When** this story is completed  
**Then** the retained admin screens have an explicit mapping to the main endpoints, contracts, permissions, roles, and context requirements they rely on  
**And** sensitive flows such as step-up, super-admin actions, exports, or cross-context reads are called out separately

**Given** some screens may currently depend on unstable or implicit contracts  
**When** the mapping is reviewed  
**Then** each contract gap is named as an OpenAPI, ContextEnvelope, or CREOS gap  
**And** no missing authority is papered over as a frontend-only solution

## Objectif

Mapper les ecrans admin legacy (alignes sur l'inventaire 15.1) vers leurs endpoints, permissions, roles, step-up et contraintes de contexte pour preparer un portage contract-driven.

## Prerequis

- Inventaire admin legacy de la story **15.1** disponible et stable (meme perimetre d'ecrans ù retenus ù ; sinon figer une liste de routes/ecrans en annexe de ce livrable).

## Corpus minimal

- `recyclique-1.4.4/frontend/src/services/*`
- `recyclique-1.4.4/frontend/src/generated/api.ts`
- `contracts/openapi/recyclique-api.yaml`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/*`
- Backend : modules auth / permissions / contexte lies aux endpoints admin (a localiser sous `recyclique/api/src/recyclic_api/` si les chemins exacts divergent)
- Artefacts Epic 14 et `peintre-nano/docs/03-contrats-creos-et-donnees.md`

## Livrables attendus

1. Tableau ecran (ou route) -> endpoints / operationId (OpenAPI quand disponible).
2. Tableau ecran -> permissions / roles / step-up / contexte (sources : backend, OpenAPI security, pas d'inference ù au feeling ù depuis le JSX seul).
3. Liste des gaps OpenAPI / ContextEnvelope / CREOS identifies (avec gravite : bloquant portage / dette documentaire).
4. Liste des surfaces sensibles a traiter a part (exports, bulk, super-admin, lecture cross-contexte).

## Definition of Done

- Un document de synthese est ajoute sous `references/artefacts/` au format date `YYYY-MM-DD_NN_...md`, avec les quatre livrables ci-dessus complets pour **tous** les ecrans retenus 15.1.
- `references/artefacts/index.md` est mis a jour si un nouveau fichier est cree.
- Chaque ligne sensible (step-up, export, super-admin) est explicitement marquee dans les tableaux ou une annexe dediee.

## Garde-fous

- Hierarchie de verite : OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs.
- Pas de deduction locale des permissions ù au feeling ù.
- Les exports et actions sensibles sont traces explicitement.

## Tasks / Subtasks

- [x] Relever les endpoints principaux par ecran admin legacy (services + `api.ts` + OpenAPI).
- [x] Associer roles, permissions et contraintes de contexte (preuves citees : fichier OpenAPI, handler backend, ou spec explicite).
- [x] Reperer les usages step-up / super-admin / exports / bulk actions.
- [x] Distinguer ce qui est deja contractualise de ce qui reste implicite.
- [x] Produire la liste des gaps a traiter avant portage.

## Dev Notes

- Epic 15 : chantier de fondation ; pas de modification produit dans `peintre-nano` ni de PR fonctionnelle attendue pour cette story seule.
- Croiser systematiquement les appels frontend avec `operationId` / paths dans `contracts/openapi/recyclique-api.yaml` ; noter ù absent d'OpenAPI ù quand applicable.
- Pour ContextEnvelope / CREOS : s'appuyer sur la doc contrats Peintre et les manifests existants ; ne pas inventer de champs non references.

## QA / preuves (hors E2E code)

- Le skill **`bmad-qa-generate-e2e-tests`** ne s'applique pas : aucune feature executable a couvrir par tests auto dans cette story.
- Validation : revue statique ù chaque ecran 15.1 possede au moins une ligne dans les tableaux 1 et 2 ; chaque gap nomme a une categorie (OpenAPI / ContextEnvelope / CREOS) ; aucune permission sans source tracee.

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` ù Epic 15, Story 15.2]
- [Source: `contracts/openapi/recyclique-api.yaml`]
- [Source: `peintre-nano/docs/03-contrats-creos-et-donnees.md`]
- [Source: `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]

## Dev Agent Record

### Agent Model Used

Composer (agent Cursor) ó execution Story Runner sous-agent, reprise `resume_at: DS`.

### Debug Log References

- Cartographie livree : `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`
- Gates : sautes avec HITL explicite dans le brief ; pas de suite de tests auto lancee.

### Completion Notes List

- Livrable unique sous `references/artefacts/` avec les quatre sections demandees (tableaux 1-2, gaps, surfaces sensibles) ; perimetre ecrans fige depuis `App.jsx` / `adminRoutes.js` (15.1 inventaire date absent du depot).
- QA documentaire : checklist story section ´ QA / preuves ª validee en revue statique (substitut au skill E2E).

### File List

- `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`
- `references/artefacts/index.md`
- `_bmad-output/implementation-artifacts/15-2-cartographier-les-dependances-api-permissions-et-contextes-de-ladmin-legacy.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
