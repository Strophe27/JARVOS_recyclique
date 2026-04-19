# Index — references/operations-speciales-recyclique/

Pack **produit + exécution agent** pour le chantier **opérations spéciales de caisse** (parcours annulation, remboursement, décaissement, mouvement interne, échange, tags métier, Paheko), aligné PRD v1.1 du 2026-04-18.

> Charger si : cadrage ou implémentation du périmètre « opérations spéciales », découpage stories BMAD, audit repo avant dev, synchronisation flux financiers vers Paheko.

---

## Fichiers


| Fichier                                                                         | Contenu                                                                                                                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` | **PRD** — périmètre fonctionnel cible, résumé exécutif, objectifs, parcours N1–N3, tags métier, intégration Paheko ; destiné équipe produit et Story Runner. |
| `2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md`  | **Prompt agent ultra opérationnel** — mission ordonnée (audit repo-aware, découpage P0–P3, BMAD/stories, garde-fous compta et PIN).                          |
| `2026-04-18_paquet-audit-p0-operations-speciales-recyclique.md` | **Paquet d’audit P0 (Story 24.1)** — matrices PRD ↔ dépôt, permissions / preuves, machine d’états, plan de tests P0, stratégie Paheko (outbox, idempotence), arbitrages ouverts. |


**Suite logique :** lire le PRD, puis le prompt comme checklist d’exécution ; croiser avec `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` et l’état réel du code (`recyclique/api/`, `peintre-nano/`).

**Pilotage BMAD (2026-04-18) :** Epic 24 et stories dans `_bmad-output/planning-artifacts/epics.md` ; statuts dans `_bmad-output/implementation-artifacts/sprint-status.yaml` ; ADR `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` ; readiness `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-18-operations-speciales.md`.