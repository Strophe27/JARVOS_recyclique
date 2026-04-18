# Story 15.1 : Auditer exhaustivement les surfaces admin legacy a porter vers Peintre_nano

Status: review

**Story key :** `15-1-auditer-exhaustivement-les-surfaces-admin-legacy-a-porter-vers-peintre-nano`  
**Epic :** 15

## User story

As a product and architecture team preparing a strict admin migration,  
I want a complete audit of the legacy admin surfaces, routes, screens, and visible behaviors,  
So that the migration scope is explicit before any new admin epic is launched.

## Contexte epic (rappel pour l'agent dev)

Chantier **transversal de fondation** : pas d'ecrans admin finaux dans cette story ; livrer un **inventaire actionnable**. Capturer les **patterns emergents** en cours d'audit. Croiser l'existant **Epic 14** (shell admin Peintre) et la matrice de parite ; le detail matrice ligne a ligne est surtout **Story 15.4**.

**Repere de lecture** (depuis `epics.md`) : `App.jsx`, `adminRoutes.js`, pages `Admin/*`, `peintre-nano/docs/03-contrats-creos-et-donnees.md`, matrice `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` ; preuves navigateur / MCP quand utile.

## Objectif

Produire un inventaire actionnable des routes, ecrans, composants et comportements visibles de l'admin legacy a retenir pour un portage strict vers `Peintre_nano`.

## Acceptance criteria (source of truth : epics.md)

**Given** the legacy admin area spans multiple routes and page families  
**When** this story is delivered  
**Then** every retained admin route in scope is inventoried with its page component, key visible zones, and primary user intent  
**And** excluded or deferred routes are explicitly listed with reasons rather than silently omitted  

**Given** parity is expected at the user-observable level  
**When** the audit is reviewed  
**Then** each screen record states the legacy reference points that matter for parity (titles, navigation, controls, data blocks, exports, context cues)  
**And** the audit is actionable enough to support later story slicing without reopening discovery from scratch  

## Corpus minimal

- `recyclique-1.4.4/frontend/src/App.jsx`
- `recyclique-1.4.4/frontend/src/config/adminRoutes.js`
- pages `recyclique-1.4.4/frontend/src/pages/Admin/*`
- `_bmad-output/planning-artifacts/epics.md` (Epic 15)
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`

## Livrable principal (chemin attendu)

Un document unique d'audit, nom stable conseille : `references/artefacts/YYYY-MM-DD_NN_inventaire-surfaces-admin-legacy-15-1.md` (prefixe date + index selon `references/INSTRUCTIONS-PROJET.md`). A la fin du dev : mettre a jour `references/artefacts/index.md` si nouveau fichier.

Contenu minimal du livrable :

1. Inventaire des routes admin legacy **retenues** (table : route, composant page, famille fonctionnelle).
2. Regroupement par familles d'ecrans.
3. Pour chaque ecran retenu : intention utilisateur, blocs visibles, actions principales, dependances de navigation, **points de parite** (titres, nav, controles, blocs donnees, exports, signaux de contexte).
4. Liste explicite des ecrans / routes **exclus ou deferes** avec justification.
5. Tableau ou section **couverture Peintre** : deja couvert / partiel / absent (sans inventer de metier).

## Garde-fous

- Parite stricte cote usage, pas clone technique du legacy.
- Aucun metier reinvente cote front.
- Toute ambiguite est nommee comme gap, pas lissee.

## QA documentaire (story sans code - substitut au flux `bmad-qa-generate-e2e-tests`)

Le skill QA E2E du Story Runner s'applique aux **fonctionnalites codees** ; ici la **preuve de done** est la **relecture** du livrable contre les AC ci-dessus. Avant `review` / cloture :

- [x] Chaque route `/admin*` candidate ou exclue est traitee (aucune omission silencieuse).
- [x] Chaque ligne d'exclusion a une **raison** explicite.
- [x] Chaque ecran retenu a les champs : intention, zones visibles, actions, nav, **references parite**.
- [x] Les incertitudes sont en section **Gaps** nommes, pas absorbees dans le texte.
- [x] Le document permet a un agent de decouper 15.2+ sans relire tout le legacy.

## Tasks / Subtasks

- [x] Lister toutes les routes `/admin*` encore candidates au portage (y compris celles definies indirectement dans `App.jsx` hors `adminRoutes.js` si present).
- [x] Associer chaque route a sa page legacy et a sa famille fonctionnelle.
- [x] Relever les blocs visuels et actions structurantes de chaque ecran.
- [x] Identifier ce qui est deja couvert, partiellement couvert, ou absent dans Peintre (croiser doc 03 + code Peintre admin demo si pertinent).
- [x] Documenter les exclusions/deferes avec justification.

## Continuite Epic 14

Reutiliser comme socle observabilite admin Peintre : shell / hub transverse admin, bandeau perimeter (voir story 14.1 livree et matrice lignes admin shell). Ne pas dupliquer l'audit shell : le referencer et concentrer 15.1 sur le **reste du corpus** legacy admin.

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 15]
- [Source: `recyclique-1.4.4/frontend/src/App.jsx`]
- [Source: `recyclique-1.4.4/frontend/src/config/adminRoutes.js`]
- [Source: `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`]
- [Source: `peintre-nano/docs/03-contrats-creos-et-donnees.md`]

## Dev Agent Record

### Implementation Plan

- Auditer `App.jsx` + grep `/admin` + dossier `pages/Admin` ; croiser matrice 14-xx et doc 03 ; produire artefact unique `references/artefacts/2026-04-12_01_inventaire-surfaces-admin-legacy-15-1.md` et index artefacts.

### Debug Log

- Aucun incident bloquant.

### Completion Notes

- Livrable d'audit livre ; QA E2E **non applicable** (story documentaire) - substitut : section 7 du livrable + cases a cocher ci-dessus.
- Gates shell : **skippes** dans le brief (`gates_skipped_with_hitl: true`) ; aucune execution `npm test` dans ce run.

## File List

- `references/artefacts/2026-04-12_01_inventaire-surfaces-admin-legacy-15-1.md` (nouveau)
- `references/artefacts/index.md` (entree ajoutee)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (story 15-1 -> review)
- `_bmad-output/implementation-artifacts/15-1-auditer-exhaustivement-les-surfaces-admin-legacy-a-porter-vers-peintre-nano.md` (statut, taches, QA doc, record)

## Change Log

- 2026-04-12 - DS Story Runner : inventaire admin legacy 15.1, statut `review`, sprint-status aligne.
