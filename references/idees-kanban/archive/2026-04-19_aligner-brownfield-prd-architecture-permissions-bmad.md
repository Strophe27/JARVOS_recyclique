# Aligner brownfield vs PRD architecture permissions multisite — BMAD

---

## 2026-04-22 — Intégrée (Epic 25 clôturé)

**Passage à `archive`.** L’intention Kanban est **portée par l’Epic 25** (« socle d’alignement PRD / multisite / kiosque / permissions »), exécutée sur **`epic/25-socle-alignement-prd-architecture`** : **15** stories **25.1 → 25.15** (**done**), puis **`epic-25`** → **`done`** dans **`_bmad-output/implementation-artifacts/sprint-status.yaml`** ; **rétrospective** [**`epic-25-retro-2026-04-22.md`**](../../../_bmad-output/implementation-artifacts/epic-25-retro-2026-04-22.md).

Synthèse volée : ADR **25-2** (PIN kiosque / opérateur / step-up), ADR **25-3** (async Paheko — outbox durable PG, Redis auxiliaire), spec multisite **25.4**, levée de gel process (**25.6**), **`CONTEXT_STALE`** (**25.8**), projection mapping Paheko avant outbox (**25.9**), contrats enveloppe (**25.11**), audits / logs / step-up / spike IndexedDB sans PWA (**25.12–25.15**).

**Suivi hors fiche :** readiness PWA programme toujours **NOT READY** (notes **2026-04-20**) ; chantier refactor API → **clos Epic 26** — fiche [**`2026-04-19_chantier-refactor-api-recyclique-audit-brownfield-handoff.md`**](2026-04-19_chantier-refactor-api-recyclique-audit-brownfield-handoff.md).

---

## 2026-04-19 — Strophe + agent

Cartonner un **chantier de convergence** entre l’état réel du repo (API Recyclic, Peintre_nano, Paheko) et le PRD cible multisites / permissions / kiosques PWA.

**PRD source (vision projet)** : `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`

**Intention :** *(historique 2026-04-19 — après archivage Epic 25, voir §2026-04-22)* a-faire (le **livrable research + intégration `prd.md`** est clos — voir §Preuve de sortie ; suivi ADR / readiness alors encore ouvert — désormais couvert par **25.1–25.15**).

**Gel exécution BMAD (2026-04-19) :** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` — pas de **`bmad-dev-story`** hors stories **25-*** tant que le gel n’est pas levé par décision tracée. Synthèse des réponses QA2 : `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md`.

### Objectif

Produire une base décisionnelle avant gros découpage epic/story : où le brownfield colle déjà au PRD, où il manque des briques (identity PIN, files Redis Paheko, multi-site analytique, etc.), et si un **correct course** sprint/epic est nécessaire.

### Pistes BMAD / livrables

| Besoin | Skill ou agent utile |
|--------|---------------------|
| Cartographie écarts technique détaillée | **`bmad-technical-research`** (rapport structuré) ou analyste **`bmad-agent-architect`** |
| Si la trajectoire epic actuelle diverge du PRD | **`bmad-correct-course`** |
| Ré-alignement PRD vs impl existante | Lecture **`references/vision-projet/`** + **`references/migration-paheko/`** + audits **`references/artefacts/`** ; doc brownfield **`references/ancien-repo/`** si besoin |
| Ensuite découpage | **`bmad-create-epics-and-stories`** / **`bmad-create-story`** selon votre flux |

### Critère de sortie suggéré

Document court ou artefact daté dans `references/artefacts/` : tableau **PRD § → état repo → gap → priorité**, avec recommandation « poursuivre tel epic » ou « ouvrir correct course sur X ».

### Preuve de sortie (2026-04-19 — acceptation process)

Le critère Kanban initial (« artefact daté avec tableau PRD → état repo → gap ») est **tenu** par : **`_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`**, intégré au **`_bmad-output/planning-artifacts/prd.md`** canonique (edit-prd + post-QA2). Pas d’exigence de **duplicata** séparé sous `references/artefacts/` tant que cette chaîne reste dans `inputDocuments` du PRD et que le tableau de **gouvernance** y fige les statuts (vision 2026-04-19 = cible non canonique jusqu’aux ADR).

### Chantier associé (api, non confondre)

L’**alignement produit** s’appuie sur les **artefacts** en général ; l’**exécution** des refactors sur le code `recyclique/api` (**F1–F11** §7 audit, P0–P2 backlog) est suivi **séparément** : fiche [**2026-04-19_chantier-refactor-api-recyclique-audit-brownfield-handoff.md**](2026-04-19_chantier-refactor-api-recyclique-audit-brownfield-handoff.md).
