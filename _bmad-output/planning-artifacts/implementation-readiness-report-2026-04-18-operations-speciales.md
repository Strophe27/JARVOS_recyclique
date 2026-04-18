# Rapport — implémentation prête (opérations spéciales caisse)



**Date :** 2026-04-18  

**Projet :** JARVOS_recyclique  

**Module BMAD :** BMM — phase 3 vers 4  

**Périmètre :** Epic 24 — `references/operations-speciales-recyclique/` + ADR architecture.



## Synthèse exécutive



| Artefact | État | Commentaire |

|----------|------|-------------|

| PRD canonique (`prd.md`) | **OK** | Références opérations spéciales, hiérarchie de lecture, coexistence des deux PRD caisse et renvois Annex C / §12 / §17 (révision 2026-04-18). |

| PRD domaine | **OK** | `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` — source produit détaillée pour parcours et tags. |

| Architecture | **OK** | ADR `2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` (D1 enrichi, alternatives, révision) + lien index architecture et TOC. |

| UX dédiée | **Partiel / N/A** | Le PRD ne fige pas le pixel-perfect ; pas de fichier UX séparé requis au gate si stories couvrent parcours (alignement BMAD standard brownfield). |

| Epics et stories (`epics.md` Epic 24) | **OK** | Dix stories ordonnées P0→P3 avec acceptance criteria ; convention `Implementation artifact` ; alignement `peintre-nano`. |

| Alignement PRD ↔ epics | **OK** | Chaque famille du prompt P0–P3 est couverte par au moins une story ; stratégie outbox/idempotence référencée en 24.1. |

| Vérification QA code (permission N-1) | **OK** | La permission `accounting.prior_year_refund` est implémentée côté API (`recyclique/api`) ; story 24.4 alignée. |



**Verdict :** **GO conditionnel pour phase 4** — premier incrément : story **24.1** (audit et matrices). Aucune story d’implémentation code volumineuse avant livraison **24.1**.



## Points de vigilance (à traiter pendant 24.1)



1. **Remboursement sans ticket :** décision technique explicite (nouveau modèle métier vs extension contrôlée des reversals) — doit figurer dans le livrable 24.1 ou un mini-ADR amendement.

2. **Ventilation Paheko des remboursements :** vérifier la continuité avec Epic 23 (pas de régression agrégée).

3. **Charge vs permission :** mapper les niveaux N1–N3 du PRD aux permissions et au step-up existants (`2-4`, accounting expert).



## Critères GO / NO-GO sprint planning



| Critère | Satisfait |

|---------|-----------|

| Liste d’epics/stories traçables vers FR/PRD | Oui |

| Risques Paheko / pas de double chaîne | Oui (ADR D1) |

| Ordre de dépendance Epic 22–23 respecté | Oui |

| Livrable audit avant code large | À produire dans **24.1** |

| Statuts sprint Epic 24 | Oui — `_bmad-output/implementation-artifacts/sprint-status.yaml` |



## Suite BMAD immédiate



1. ~~**`bmad-sprint-planning`** — statuts Epic 24 dans `sprint-status.yaml`~~ — **fait** (2026-04-18).

2. **`bmad-create-story`** — première story **24.1**, fichier dans `_bmad-output/implementation-artifacts/` (clé sprint = nom de fichier).

3. **`bmad-dev-story`** — après validation story 24.1.

