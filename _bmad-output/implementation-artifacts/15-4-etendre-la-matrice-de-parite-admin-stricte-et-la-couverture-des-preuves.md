# Story 15.4 : Etendre la matrice de parite admin stricte et la couverture des preuves

Status: review

**Story key :** `15-4-etendre-la-matrice-de-parite-admin-stricte-et-la-couverture-des-preuves`  
**Epic :** 15

## User story

As a pilotage team,  
I want the admin parity matrix extended screen by screen or by coherent admin slice,  
So that equivalence, derogations, gaps, and proof obligations are tracked consistently before implementation.

## Objectif

Etendre la matrice de parite admin pour couvrir toutes les surfaces retenues (inventaire 15.1), avec equivalence utilisateur, preuves attendues, derogations et gaps documentes, en s'appuyant sur la cartographie contrats / permissions (15.2) et le catalogue patterns / anti-patterns (15.3).

## Corpus minimal

- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (fichier a etendre — schema de tableau et § Regles d'usage)
- `references/artefacts/2026-04-10_02_cadrage-parite-ui-legacy-peintre.md`
- Livrables stories **15.1** (inventaire routes / ecrans retenus), **15.2** (ecran -> endpoints, permissions, gaps contrat), **15.3** (familles de patterns, anti-patterns)
- `contracts/openapi/recyclique-api.yaml`, `peintre-nano/docs/03-contrats-creos-et-donnees.md` (verification des colonnes contrat sans inventer d'operationId)
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md` (jalons preuve navigateur / MCP si imposes pour certaines lignes)

## Livrables attendus

1. Une ligne par ecran ou slice admin retenu dans le perimetre 15.1 (pas d'omission silencieuse).
2. Colonne **equivalence utilisateur / derogation PO** renseignee selon les regles de la matrice (OK, Derogation PO, Hors scope, N/A historique si applicable, date de revision).
3. **Source de preuve attendue** par ligne (legacy code, comparaison navigateur, tests existants ou dette tests, documentation / contrats).
4. **Etat de contrat** (OpenAPI / ContextEnvelope / CREOS) visible par ligne ; tout gap nomme explicitement (pas de validation implicite).
5. Lignes **non prouvables a ce stade** : statut / dette de preuve explicite (aligne AC epics : dette visible, pas validee par defaut).

## Acceptance criteria (alignement epics.md)

**Bloc A — Couverture matrice**

- [x] **Given** la couverture actuelle de la matrice est partielle, **when** la story est livree, **then** la matrice contient une ligne par ecran admin retenu ou slice coherente, avec intention d'equivalence explicite.
- [x] **And** chaque ligne indique perimetre, source de preuve attendue, statut contrat (OpenAPI / ContextEnvelope / CREOS) et derogations documentees le cas echeant.

**Bloc B — Preuves et dette**

- [x] **Given** les decisions de migration stricte reposent sur des preuves observables, **when** la matrice est relue, **then** chaque ligne conserve identifie la source de preuve attendue (code legacy, comparaison navigateur, preuve runtime, documentation).
- [x] **And** toute preuve manquante reste en **dette visible** (libelle / statut explicite), sans etre presentee comme validee.

## Garde-fous

- Ne pas inventer d'URLs, `operationId`, cles CREOS ou captures : marquer **gap** ou **a verifier** avec canal de prevu (ex. `localhost:4445` / `4444`, MCP si guide l'impose).
- Respecter la hierarchie de verite deja posee en 15.2 : OpenAPI > ContextEnvelope > manifests > prefs runtime.
- Coherence avec les lignes existantes **14.x** et pilotes anterieurs : pas de contradiction sans decision ecrite dans la colonne ecarts / decisions.

## Tasks / Subtasks

- [x] Etendre la matrice admin existante au-dela des lignes 14.x et des pilotes deja poses, en couvrant l'inventaire 15.1.
- [x] Definir pour chaque nouvelle ligne le **critere de parite testable** (observable utilisateur).
- [x] Renseigner preuve attendue, statut matrice et gaps contrat / CREOS.
- [x] Marquer explicitement les ecrans encore non prouvables (dette de preuve).
- [x] Verifier la coherence avec les stories **15.5** / **15.6** et les epics de portage admin futurs (pas de scope implicite).

## References

- [Source: `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`]
- [Source: `references/artefacts/2026-04-10_02_cadrage-parite-ui-legacy-peintre.md`]
- [Source: `_bmad-output/implementation-artifacts/15-1-auditer-exhaustivement-les-surfaces-admin-legacy-a-porter-vers-peintre-nano.md`]
- [Source: `_bmad-output/implementation-artifacts/15-2-cartographier-les-dependances-api-permissions-et-contextes-de-ladmin-legacy.md`]
- [Source: `_bmad-output/implementation-artifacts/15-3-identifier-les-patterns-mutualisables-et-les-anti-patterns-du-legacy-admin.md`]
- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 15.4]

## Notes Story Runner / QA

- **Validation story (VS)** : cette fiche sert de guide d'implementation **documentaire** ; les criteres ci-dessus remplacent un passage `bmad-create-story` mode validate pour cette story deja creee.
- **`bmad-qa-generate-e2e-tests`** : **non requis** pour le done de 15.4 (pas de feature code livree ici). Si l'equipe impose un garde-fou automatique, limite raisonnable : script ou checklist manuelle sur le depot markdown, hors scope standard du skill e2e.

## Preuves (types autorises pour les lignes matrice)

- code legacy
- comparaison navigateur / Browser integre / MCP si applicable
- tests existants ou dette tests explicite
- documentation / contrats actifs (`openapi`, CREOS, doc 03)

## Dev Agent Record

### Agent Model Used

Story Runner BMAD (sous-agent), resume_at DS, gates HITL skip.

### Debug Log References

- Perimetre routes : `recyclique-1.4.4/frontend/src/App.jsx` lignes 178-201 ; `adminRoutes.js`.

### Completion Notes List

- Section **Extension Epic 15 — admin strict** ajoutee dans `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` : 19 lignes (18 routes distinctes + ligne pont `/admin` / `/admin/dashboard` croisee 14.3).
- Substitut inventaire **15.1** : liste derivee du code explicitee dans l'annexe matrice tant que le livrable 15.1 archive n'est pas publie.
- Colonnes OpenAPI : references aux stories **15.2** / **15.3** sans inventer d'`operationId`.
- QA : substitution documentaire (checklist Notes Story) — pas d'E2E produit.

### File List

- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/index.md`
- `_bmad-output/implementation-artifacts/15-4-etendre-la-matrice-de-parite-admin-stricte-et-la-couverture-des-preuves.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-04-12 — DS Story 15.4 : extension matrice admin + statut story `review` + sprint-status `review`.

## QA documentaire (substitut `bmad-qa-generate-e2e-tests`)

| Check | Resultat |
|-------|----------|
| Chaque route `/admin*` sous `AdminLayout` dans `App.jsx` a au moins une ligne ou renvoi explicite (ex. home → 14.3) | OK |
| Aucune ligne en `Valide` sans preuve declaree | OK (statuts `Backlog` / `En cours` / `A confirmer`) |
| Gaps OpenAPI / CREOS nommes | OK |
| Coherence lignes 14.x | OK (renvois 14-02, 14-03) |

## Senior Developer Review (AI)

_(Vide — revue inline ci-dessous.)_

## Revue code / document (CR — contexte unique Story Runner)

**Verdict : Approuve avec reserves documentaires**

- Points positifs : pas d'`operationId` inventes ; CREOS `page-admin-cash-session-detail` cite uniquement ou existant ; hierarchie OpenAPI > ContextEnvelope respectee dans le texte ; dettes 15.2 / 15.6 explicites.
- Reserves : reprise obligatoire quand **15.1** publie un inventaire archive (reconcilier `quick-analysis`, `import/legacy` si exclusions produit) ; colonne OpenAPI restera generique jusqu'a **15.2**.

**Action items** : aucun bloquant ; `cr_loop` inchangé (0).
