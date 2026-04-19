# Aligner brownfield vs PRD architecture permissions multisite — BMAD

---

## 2026-04-19 — Strophe + agent

Cartonner un **chantier de convergence** entre l’état réel du repo (API Recyclic, Peintre_nano, Paheko) et le PRD cible multisites / permissions / kiosques PWA.

**PRD source (vision projet)** : `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`

**Intention :** a-faire

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
