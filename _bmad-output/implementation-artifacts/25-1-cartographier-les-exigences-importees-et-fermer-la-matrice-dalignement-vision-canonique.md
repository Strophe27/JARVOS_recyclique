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
- [x] Chaque ligne cite au moins une source parmi les chemins exigés par les AC epics.
- [x] Distinction explicite documentaire / story de dev / déjà couvert par epics.
- [x] Section **Trace Epic 25 — ADR** ci-dessous renseignée.

## Livrables

| Livrable | Chemin |
|----------|--------|
| Matrice d'alignement vision → canonique | `references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md` |
| Index vision-projet (entrée ajoutée) | `references/vision-projet/index.md` |

## QA Gate (story documentaire)

| # | Vérification | Résultat |
|---|----------------|----------|
| Q1 | Chaque AC epics §25.1 a une section ou des lignes de matrice correspondantes | OK — légendes + tableau + paragraphe QA2 |
| Q2 | Aucune affirmation « canonique » sans renvoi à `prd.md`, readiness, research ou PRD vision | OK |
| Q3 | Gel et `25-*` mentionnés pour le pilotage hors scope creep | OK |

**Preuve de relecture :** checklist ci-dessus + présent fichier ; pas d'e2e applicatif requis pour 25.1.

## Trace Epic 25 — ADR

| Élément | Valeur |
|---------|--------|
| ADR requis par la story ? | **Non** — livrable = matrice d'alignement uniquement ; aucune décision d'architecture nouvelle au sens ADR dépôt. |
| Justification | Les AC demandent la **cartographie** et les statuts ; les ADR structurantes sont explicitement réservées aux stories **25.2** (PIN kiosque) et **25.3** (async Paheko), conformément à `epics.md` §25. |
| Fichiers ADR | N/A |
| Statut | **N/A documenté** — cohérent avec la matrice ADR Epic 25 (25-1 : souvent N/A). |

## Dev Agent Record

### File List

- `references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md` (créé)
- `references/vision-projet/index.md` (entrée ajoutée)
- `_bmad-output/implementation-artifacts/25-1-cartographier-les-exigences-importees-et-fermer-la-matrice-dalignement-vision-canonique.md` (ce fichier)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (epic-25, clé 25-1)

### Résumé

Matrice fermée : statuts et périmètres alignés sur `prd.md`, PRD vision 2026-04-19, research, readiness 2026-04-19 et synthèse QA2. Prochaine story Epic 25 : **25.2** (ADR PIN kiosque).

### Debug Log — références

- Epic 25 — `epics.md` (bloc Story 25.1–25.5).
- Correct course — `sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md`.
