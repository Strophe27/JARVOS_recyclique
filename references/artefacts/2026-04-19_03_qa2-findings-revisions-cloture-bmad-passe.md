# Synthèse — réponses aux findings QA2 (passe BMAD 2026-04-19)

**Date :** 2026-04-19  
**Objet :** Chaîner les livrables modifiés après le rapport QA2 fusionné (correct course, sprint-status, PRD, research, readiness, PRD vision, Kanban) pour que la **prochaine passe QA** retrouve sans ambiguïté les **réponses** aux écarts signalés.

---

## Findings → réponse documentaire

| Finding (résumé) | Réponse |
|------------------|---------|
| Frontmatter YAML de la **research** invalide (`##` sous `---`) | Frontmatter YAML réparé ; `inputDocuments` enrichi (PRD canon, readiness, sprint-change) ; méta `qa_traceability_post_revision` à la place d’un score obsolète. |
| **§6.4** sprint-change « voir commit » | Formulation remplacée par une **preuve datée** et des **chemins** relisibles sans hash Git. |
| **prd.md** : `inputDocuments` sans **readiness** | Ajout de `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` et de ce fichier. |
| **validationReportUsed** daté 2026-04-15 vs révisions postérieures | Champ `validationReportChainNote` dans le frontmatter du PRD : la validation reste **archivée** ; les revues ultérieures sont **chainées** explicitement. |
| Lecteurs du **corps** sans contexte gel / YAML | Encart **Pilotage BMAD (gel)** sous l’en-tête du PRD ; **§12.1** rappel gel ; commentaires YAML devant **epic-10**, **epic-13–15**. |
| Tension **Redis (vision)** vs **outbox SQL (canon)** | PRD vision §NFR5 + tableau gouvernance PRD ; research § périmètre de preuve. |
| **NOT READY PWA** vs **§17** « sans lacune » | **§2.4** + paragraphe **§17** : distinction **rédactionnel / gate implementation**. |
| Numérotation **EPIC 1–4 vision** vs `epics.md` | Note explicite dans le PRD vision sous **§4**. |
| Kanban alignement vs correct course | Fiche Kanban : cette synthèse et le gel sont les **pointeurs** de pilotage. |

---

## Fichiers touchés (liste de contrôle QA)

- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`
- `references/idees-kanban/a-faire/2026-04-19_aligner-brownfield-prd-architecture-permissions-bmad.md` (pointeur)
- `references/artefacts/index.md` (entrée d’index)

---

**Fin de l’artefact.**
