# Story 25.1 : Cartographier les exigences importées et fermer la matrice d'alignement vision → canonique

Status: done

**Story key :** `25-1-cartographier-les-exigences-importees-et-fermer-la-matrice-dalignement-vision-canonique`  
**Epic :** 25 — Socle d'alignement PRD vision kiosque / multisite / permissions, brownfield et ADR  
**Implementation artifact :** `_bmad-output/implementation-artifacts/25-1-cartographier-les-exigences-importees-et-fermer-la-matrice-dalignement-vision-canonique.md`

## Contexte produit

Première story de l'Epic 25 : produire la **matrice unique** entre PRD vision, canon brownfield (`prd.md`, architecture), readiness, correct course et note QA2, pour que les stories **25.2–25.5** et le pilotage YAML s'appuient sur des statuts explicites (`canonique`, `cible`, `ADR requise`, `hors gate`) et une classification de périmètre (`noyau Epic 25`, `future story`, `hors périmètre assumé du gel`).

## Story (BDD)

As a **product and architecture lead**,  
I want **a single alignment matrix** between the PRD vision, the brownfield canon, the readiness report, and the correct course,  
So that **every future `25-*` story** knows what is already canonical, what still needs an ADR, and what remains blocked by the gel.

## Acceptance criteria

Voir `_bmad-output/planning-artifacts/epics.md` — Story 25.1. Couverture vérifiée par le livrable `references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md` (sections « Matrice principale », « Travail documentaire vs story de code », légendes).

## Définition of Done

- [x] Matrice publiée avec sujets PIN kiosque, async Paheko, multisite analytique, permissions, device/token kiosque, offline queue, auto-suspend, canaux d'alerte + lignes de pilotage (gel, chantier API).
- [x] Chaque ligne cite au moins un chemin explicite parmi : `_bmad-output/planning-artifacts/prd.md`, `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`, `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`, `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`, `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md` (conforme aux AC `epics.md` §25.1).
- [x] Colonne **Statut alignement** : une seule valeur (`canonique` \| `cible` \| `ADR requise` \| `hors gate`) par ligne ; nuances en **Notes** (dont chantier audit API = orthogonal / non prescriptif pour Epic 25).
- [x] Distinction explicite documentaire / story de dev / déjà couvert par epics.
- [x] Section **Trace Epic 25 — ADR** ci-dessous renseignée (25.1 : pas de nouvelle ADR ; pas de fichier « matrice ADR » séparé dans le dépôt).

## Livrables

| Livrable | Chemin |
|----------|--------|
| Matrice d'alignement vision → canonique | `references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md` |
| Index vision-projet (entrée ajoutée) | `references/vision-projet/index.md` |

## QA Gate (story documentaire)

| # | Vérification | Résultat |
|---|----------------|----------|
| Q1 | Chaque AC epics §25.1 a une section ou des lignes de matrice correspondantes | OK — légendes + matrice principale + section QA2 + liste des chemins obligatoires |
| Q2 | Statuts matrice : une valeur par ligne ; affirmations « canonique » traçables vers les sources listées en colonne (dont `prd.md`, readiness, research, PRD vision, QA2 selon ligne) | OK — post-correction DS |
| Q3 | Gel et `25-*` mentionnés pour le pilotage hors scope creep ; chantier audit API explicite comme orthogonal / non prescriptif Epic 25 | OK |

**Preuve de relecture :** checklist ci-dessus + présent fichier ; pas d'e2e applicatif requis pour 25.1.

## Trace Epic 25 — ADR

| Élément | Valeur |
|---------|--------|
| ADR requis par la story ? | **Non** — livrable = matrice d'alignement uniquement ; aucune décision d'architecture nouvelle au sens ADR dépôt. |
| Justification | Les AC demandent la **cartographie** et les statuts ; les ADR structurantes sont explicitement réservées aux stories **25.2** (PIN kiosque) et **25.3** (async Paheko), conformément à `epics.md` §25. |
| Fichiers ADR | N/A |
| Statut | **N/A documenté** pour 25.1 — aucun livrable ADR nouveau ; la traçabilité décisionnelle Epic 25 reste dans `epics.md`, la matrice d'alignement ci-dessus (`references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md`) et les futures stories 25.2–25.5. |

## Dev Agent Record

### File List

- `references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md` (créé ; révisé post-QA2 / étape DS)
- `references/vision-projet/index.md` (entrée ajoutée)
- `_bmad-output/implementation-artifacts/25-1-cartographier-les-exigences-importees-et-fermer-la-matrice-dalignement-vision-canonique.md` (ce fichier)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (epic-25, clé 25-1)

### Résumé

Matrice fermée (post-QA2 / DS) : statuts à valeur unique + colonne Notes ; chaque ligne cite au moins un des cinq chemins AC ; chantier audit API qualifié orthogonal / non prescriptif pour Epic 25. Sources : `_bmad-output/planning-artifacts/prd.md`, PRD vision `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`, `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`, `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`, `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md`. Prochaine story Epic 25 : **25.2** (ADR PIN kiosque).

### Debug Log — références

- Epic 25 — `epics.md` (bloc Story 25.1–25.5).
- Correct course — `sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md`.
- DS (2026-04-19) : matrice — statuts uniques + Notes ; chemins AC explicites par ligne ; ligne chantier audit API clarifiée (orthogonal Epic 25) ; story — DoD / QA Gate / trace ADR alignés.
