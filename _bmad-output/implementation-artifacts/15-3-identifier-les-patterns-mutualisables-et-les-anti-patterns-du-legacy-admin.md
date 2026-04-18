# Story 15.3 : Identifier les patterns mutualisables et les anti-patterns du legacy admin

Status: review

**Story key :** `15-3-identifier-les-patterns-mutualisables-et-les-anti-patterns-du-legacy-admin`  
**Epic :** 15

## User story (epics.md)

As an architecture team aiming to reduce duplication,  
I want a dedicated audit of recurring admin UI patterns and historical inconsistencies,  
So that `Peintre_nano` can converge on reusable building blocks instead of cloning fragmented legacy implementations.

## Objectif

Analyser le legacy admin pour isoler les patterns reutilisables, les variantes utiles, et les divergences historiques a ne pas recopier dans `Peintre_nano`.

## Prerequis / entrees

- Sorties a jour des stories **15.1** (inventaire routes/ecrans) et **15.2** (cartographie API / permissions / contextes) : utiliser leurs livrables comme **corpus de reference** pour ne pas re-decouvrir le perimetre.
- Si une incoherence apparait entre inventaire (15.1), cartographie (15.2) et patterns, **documenter le gap** plutot que trancher au hasard.

## Criteres d'acceptation (source epics.md)

**Given** the legacy admin contains lists, filters, detail views, editing flows, exports, and other repeated patterns built differently  
**When** this story is delivered  
**Then** a catalog of reusable pattern families is produced across the retained admin corpus  
**And** each family distinguishes reusable common behavior from true business-specific variation

**Given** not all useful patterns are known in advance  
**When** the audit progresses  
**Then** newly discovered emergent patterns are added to the catalog as first-class findings  
**And** anti-patterns or accidental historical divergences are explicitly marked as behaviors not to replicate in Peintre

## Corpus minimal

- Pages et composants admin legacy sous `recyclique-1.4.4/frontend/src/pages/Admin/` et chemins associes dans `recyclique-1.4.4/frontend/src/config/adminRoutes.js`.
- Composants partages admin si presents (ex. sous-dossiers `components`, `layouts`, hooks de liste/filtre) dans le frontend legacy ; a croiser avec l'inventaire 15.1.
- `references/peintre/index.md` et doc contrats : `peintre-nano/docs/03-contrats-creos-et-donnees.md`.
- Matrice et cadrages : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`, `references/artefacts/2026-04-10_02_cadrage-parite-ui-legacy-peintre.md`.

## Familles de patterns a examiner

- listes / tableaux
- filtres / recherche / tri / pagination
- vues detail
- creation / edition
- exports CSV / XLS / bulk
- barres d'actions / CTA
- modales / confirmations / drawers
- step-up / actions sensibles
- etats vide / chargement / erreur / stale
- navigation secondaire
- patterns emergents decouverts au fil de l'eau

## Livrables attendus

1. **Catalogue** de familles de patterns mutualisables (table ou sections numerotees), avec pour chaque famille : comportement commun, variantes observees, et lien vers des ecrans exemples (routes ou noms de pages issus de 15.1).
2. **Tableau** ou liste "variation metier legitime" vs "dette / divergence historique" (criteres explicites de distinction).
3. **Liste d'anti-patterns** : comportements a ne pas porter dans Peintre (formulation imperative, reference ecran quand possible).
4. **Premiere proposition** de familles de briques UI/admin cibles (sans entrer dans la recommandation d'architecture detaillee, reservee a la story 15.5).

## Emplacement du livrable

- Nouvel artefact date dans `references/artefacts/` (convention projet : `YYYY-MM-DD_NN_titre-court.md`), puis mise a jour de `references/artefacts/index.md`.

## Garde-fous

- Distinguer strictement **variation fonctionnelle** (exigence metier) et **duplication accidentelle** (deux implementations pour le meme besoin sans raison produit).
- Les patterns **emergents** hors liste initiale sont ajoutes au catalogue avec la meme rigueur que les familles prevues.
- Ne pas conclure sur la **mutualisation technique** finale (widgets CREOS, etc.) : rester au niveau catalogue + anti-patterns ; la story 15.5 tranchera l'architecture.
- Rester aligne **parite stricte cote usages** (Epic 15) : les anti-patterns portent sur ce qu'il ne faut pas **recopier comme implementation**, pas sur l'abandon de besoins utilisateur valides.

## Tasks / Subtasks

- [x] Comparer les ecrans similaires construits differemment.
- [x] Identifier ce qui peut devenir commun.
- [x] Distinguer variation metier et variation purement historique.
- [x] Ajouter les patterns emergents au fur et a mesure.
- [x] Produire une liste claire de comportements a ne pas recopier.

## Dev Agent Record

### Agent Model Used

Composer (Story Runner spawn unique, DS documentaire sans code produit).

### Debug Log References

_(aucun — pas de build applicatif.)_

### Completion Notes List

- Livrable principal : `references/artefacts/2026-04-12_02_patterns-mutualisables-anti-patterns-admin-legacy-15-3.md` (catalogue §1, critères §2, anti-patterns §3, briques cibles §4, traçabilité AC §5, QA doc §6, CR §7).
- §0 du livrable : rappel dépendance **15.2** ; inventaire **15.1** désormais disponible (`2026-04-12_01_inventaire-surfaces-admin-legacy-15-1.md`) — le livrable 15.3 a été ajusté après création pour éviter collision de nom `_01` (renommage `_02`).
- Gates : saut explicite HITL (brief) ; pas de suite de tests npm pour cette story.
- QA E2E : **non applicable** ; substitut = grille §6 du livrable (PASS).
- CR documentaire : **APPROVED** dans le livrable §7.

### File List

- `references/artefacts/2026-04-12_02_patterns-mutualisables-anti-patterns-admin-legacy-15-3.md` (créé)
- `references/artefacts/index.md` (entrée ajoutée)
- `_bmad-output/implementation-artifacts/15-3-identifier-les-patterns-mutualisables-et-les-anti-patterns-du-legacy-admin.md` (statut, tâches, Dev Agent Record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (15-3 → review)

### Change Log

- 2026-04-12 — DS documentaire : artefact 15.3 + index ; story en **review** ; sprint-status aligné.

## Verification / QA (story documentaire)

- Les deux blocs **Given / When / Then** des criteres d'acceptation sont couverts explicitement dans le livrable (sections ou annexes indexees).
- Chaque famille de patterns cite au moins **un** exemple d'ecran ou route du corpus retenu (15.1).
- Aucune affirmation de mutualisation sans **preuve** (comparaison d'au moins deux ecrans ou deux implementations pour les divergences).

## References

- Source : `_bmad-output/planning-artifacts/epics.md` (Epic 15, Story 15.3)
- Source : `_bmad-output/implementation-artifacts/15-1-auditer-exhaustivement-les-surfaces-admin-legacy-a-porter-vers-peintre-nano.md`
- Source : `_bmad-output/implementation-artifacts/15-2-cartographier-les-dependances-api-permissions-et-contextes-de-ladmin-legacy.md`
- Source : `references/peintre/index.md`
- Source : `references/artefacts/2026-04-10_02_cadrage-parite-ui-legacy-peintre.md`
- Source : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- Source : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
- Source : `peintre-nano/docs/03-contrats-creos-et-donnees.md`
