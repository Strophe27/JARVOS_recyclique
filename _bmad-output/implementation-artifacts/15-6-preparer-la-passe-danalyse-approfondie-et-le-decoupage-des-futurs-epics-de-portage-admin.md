# Story 15.6 : Preparer la passe danalyse approfondie et le decoupage des futurs epics de portage admin

Status: done

**Story key :** `15-6-preparer-la-passe-danalyse-approfondie-et-le-decoupage-des-futurs-epics-de-portage-admin`  
**Epic :** 15

## Objectif

Assembler le package final de fondation pour une passe d'analyse plus forte, puis en deduire les futurs epics de portage admin.

## Livrables attendus

1. Brief complet pour la passe « modele fort ».
2. Corpus exact a fournir a cette analyse.
3. Sortie attendue de cette analyse (briques, taxonomie, ordre de portage).
4. Proposition de roadmap epics admin apres fondation.
5. Preparation des prochaines stories BMAD.

**Livrable principal :** `references/artefacts/2026-04-12_05_package-fondation-passe-analyse-epics-admin-15-6.md`

## Contraintes

- La passe forte part d'audits consolides, pas de notes brutes.
- Le decoupage doit rester pilotable par domaines.
- Les besoins HITL / Browser doivent etre nommes explicitement.
- **Ferme (15.5 §7.1) :** ne pas melanger dans un meme futur epic le **portage UI**, la **remediation backend / OpenAPI / securite**, et les **arbitrages produit** ; s'appuyer sur la classification **A / B / C** et sur `2026-04-12_03_recommandation-architecture-admin-peintre-nano-15-5.md`.

## Tasks / Subtasks

- [x] Preparer le brief et le corpus de la passe forte.
- [x] Definir les questions a poser au modele plus fort.
- [x] Transformer la sortie attendue en futurs epics admin ordonnes.
- [x] Lister les incertitudes restantes et les besoins de preuve humaine.

## References

- [Source: `c:\Users\Strophe\.cursor\plans\portage_admin_creos_fba1968d.plan.md`]
- [Source: `_bmad-output/planning-artifacts/guide-pilotage-v2.md`]
- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 15]
- `references/artefacts/2026-04-12_03_recommandation-architecture-admin-peintre-nano-15-5.md` (15.5, A/B/C)
- `references/artefacts/2026-04-12_01_inventaire-surfaces-admin-legacy-15-1.md` (15.1)
- `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` (15.2)
- `references/artefacts/2026-04-12_02_patterns-mutualisables-anti-patterns-admin-legacy-15-3.md` (15.3)
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (15.4)

## Execution (Story Runner, sans recreation story)

- **CS :** omis (story existante, instruction explicite ne pas recreer).
- **VS :** omis (deja validee en ready-for-dev).
- **DS :** production artefact **15.6** + mises a jour index / sprint-status.
- **Gates :** non pertinents (livraison documentaire uniquement ; pas de lint/test code cible).
- **QA :** grille documentaire dans l'artefact §6 — **PASS**.
- **CR :** synthese dans l'artefact §7 — **Approuve**.

## Notes

- Risque documentaire : normalisation typographique sur `_bmad-output/implementation-artifacts` — ne pas s'en servir comme corpus pour la passe forte sans revue humaine.
