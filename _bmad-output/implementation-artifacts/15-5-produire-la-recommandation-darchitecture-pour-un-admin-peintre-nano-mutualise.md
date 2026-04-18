# Story 15.5 : Produire la recommandation darchitecture pour un admin Peintre_nano mutualise

Status: done

**Story key :** `15-5-produire-la-recommandation-darchitecture-pour-un-admin-peintre-nano-mutualise`  
**Epic :** 15

## Objectif

Transformer les audits en recommandation d'architecture actionnable pour porter l'admin sous CREOS avec mutualisation maximale.

## Questions a trancher

- Qu'est-ce qui devient widget CREOS ?
- Qu'est-ce qui devient composant partage ?
- Qu'est-ce qui devient generateur de liste / detail / edition / export ?
- Quelles conventions de contrats admin faut-il stabiliser ?
- Quelles variations doivent rester specifiques a certains ecrans ?

## Livrables attendus

1. Vocabulaire cible des briques admin.
2. Frontieres entre widgets, composants et generateurs.
3. Regles d'assemblage des ecrans admin dans Peintre.
4. Rejets explicites des approches dupliquant le legacy ecran par ecran.

## Garde-fous

- Pas de seconde verite metier dans Peintre.
- Mutualisation maximale sans ecraser les differences metier reelles.
- Alignement avec les ADR / references Peintre et la checklist anti-metier.

## Tasks / Subtasks

- [x] Consolider les enseignements des audits 15.1 a 15.4.
- [x] Proposer une taxonomie de briques admin reutilisables.
- [x] Definir les frontieres de responsabilite entre contrats et presentation.
- [x] Formaliser les decisions d'architecture et les non-decisions restantes.

## Livrable principal

- `references/artefacts/2026-04-12_03_recommandation-architecture-admin-peintre-nano-15-5.md` (taxonomie, frontieres, regles d'assemblage, conventions contrats, rejets, non-decisions, QA doc, CR).

## References

- [Source: `references/peintre/index.md`]
- [Source: `peintre-nano/docs/03-contrats-creos-et-donnees.md`]
- [Source: `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source: `references/artefacts/2026-04-12_01_inventaire-surfaces-admin-legacy-15-1.md`]
- [Source: `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`]
- [Source: `references/artefacts/2026-04-12_02_patterns-mutualisables-anti-patterns-admin-legacy-15-3.md`]
- [Source: `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`]

## QA documentaire (substitut `bmad-qa-generate-e2e-tests`)

Le skill **`bmad-qa-generate-e2e-tests`** est **inapplicable** : aucun code executable produit dans cette story. Substitut : grille **§9** du livrable principal + cases ci-dessous.

- [x] Chaque question de la section « Questions a trancher » est adresse dans le livrable (sections indexees §2-§7).
- [x] Chaque livrable attendu de la story est present dans le document §2-§6.
- [x] Aucune instruction ne contredit la hierarchie OpenAPI > ContextEnvelope > manifests > prefs (doc 03 + §1 livrable).
- [x] Les references 15.1 a 15.4 sont consolidees explicitement (entree §0 du livrable).
- [x] Le livrable tranche explicitement les bornes du **generateur** et de la **configuration runtime admin** pour eviter une troisieme verite implicite.
- [x] Le livrable classe les familles admin en **A / B / C** pour preparer 15.6 sans melanger portage UI, remediations contrat et arbitrages produit.

**Verdict QA doc :** **PASS** (`qa_loop` : 0).

## Revue documentaire (CR)

**Verdict :** **Approuve apres renforcement architectural** — recommandation coherente avec 15.1-15.4, ADR P1/P2, checklist PR ; reserves sur synchronisation future contrats / matrice et sur le prealable securite `G-OA-03` pour la famille `users` (voir §11 du livrable).

**Compteur :** `cr_loop` : 0.

## Dev Agent Record

### Agent Model Used

Story Runner BMAD (sous-agent), `resume_at: DS`, CS/VS sautes (story prete), `gates_skipped_with_hitl: true`.

### Implementation Plan

- Lire livrables 15.1-15.4, doc 03 CREOS, checklist PR, ADR P1 ; rediger artefact unique §architecture ; mettre a jour story, `references/artefacts/index.md`, `sprint-status.yaml`.

### Debug Log

- Aucun incident bloquant.

### Completion Notes

- Livrable architecture livre sous `references/artefacts/2026-04-12_03_...` ; QA E2E non applicable ; QA documentaire + CR inline conformes au flux Story Runner documentaire.
- Passe architecte senior complementaire appliquee ensuite : ajout des bornes `generateur != moteur cache`, config runtime admin bornee par ADR P2, et classification `A / B / C` des familles pretes ou non au portage.

### File List

- `references/artefacts/2026-04-12_03_recommandation-architecture-admin-peintre-nano-15-5.md` (nouveau)
- `references/artefacts/index.md` (entree ajoutee)
- `_bmad-output/implementation-artifacts/15-5-produire-la-recommandation-darchitecture-pour-un-admin-peintre-nano-mutualise.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-04-12 — DS + QA doc + CR : artefact 15.5, story **done**, sprint-status aligne.
- 2026-04-12 — Relecture architecte senior : livrable 15.5 renforce sans changement de statut.
