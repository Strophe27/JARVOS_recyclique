# Index des plans Cursor — `.cursor/plans/`

**Date :** 2026-05-21  
**Role :** correspondance fichier plan ↔ chantier / UUID transcript / pattern ; pour sessions `orchestration-graph`.

Les plans utilisent le frontmatter YAML (`name`, `overview`, `todos`). L'**ID fichier** (suffixe hash) est l'identifiant stable sur disque ; l'UI Cursor peut afficher uniquement `name`.

---

## Plans actifs ou reprise recommandee

| Fichier plan | name (frontmatter) | Chantier | Pattern(s) | Notes |
|--------------|-------------------|----------|------------|-------|
| `chantier_protocole_modules_fe3bc68e.plan.md` | Chantier protocole modules | Pack `protocole-modules-recyclique/` + pont architecte | P-GRAPH-META-PLAN, P-CARTO-WORKERS, P-ARCH-EXTERN | Phase 0 architecte **done** ; phases MOD en cours |
| `qa2_global_modules_737cba4e.plan.md` | QA2 global modules | QA2 fusionne post-HITL modules v2 | P-QA2-GATE, P-GRAPH-WORKERS-PLAN | Gate >= 95 % avant dev-story 9.6 |
| `cadrage-v2-global_c2cc7c6d.plan.md` | (cadrage v2 global) | Pilotage v2 multi-epics | P-GRAPH-META-PLAN | Reprise selon `guide-pilotage-v2.md` |
| `separation-peintre-recyclique_4777808d.plan.md` | (separation Peintre) | Frontieres Peintre_nano / API | P-SANS-BMAD partiel | Doc + contrats |

---

## Plans historiques / livres (reference)

| Fichier plan | Domaine | Statut indicatif |
|--------------|---------|------------------|
| `paheko_outbox_hardening_v2_121f6d80.plan.md` | Outbox Paheko hardening | Livre — voir artefact `2026-04-18_03_livraison-paheko-outbox-hardening-v2-plan-cloud.md` |
| `qa-compta-superadmin-20260418.plan.md` | QA parametrage compta SuperAdmin | Phase 0 inventaire `2026-04-18_03_inventaire-qa-parametrage-comptable-superadmin.md` |
| `category-hierarchy-picker-widget.plan.md` | Widget Peintre categories | Story / widget ponctuel |
| `coherence-moyens-paiement-caisse-admin_a4b8c9d2.plan.md` | Caisse / moyens paiement | Correctif transverse |
| `profil-creos-minimal_6cf1006d.plan.md` | CREOS minimal | Epic 4 / contrats |

---

## Lien transcript UUID (modularite)

| UUID | Plan / chantier associe |
|------|-------------------------|
| `c8a645ab-a1ff-4d86-a559-4362f9c8c30b` | Cartographie → `chantier_protocole_modules_fe3bc68e` + artefacts `2026-05-20_03`–`06` |
| `242de5e4-0344-4a77-8453-fbde98f78a8a` | Brainstorm CREOS — amont cadrage v2 |
| `0c9a9709-d1f8-406b-a9ea-26ff2c59a7fd` | Bandeau KPI — pilote module `kpi-live-banner` |

Index complet transcripts : [`../protocole-modules-recyclique/12-MOD-index-transcripts-modularite.md`](../protocole-modules-recyclique/12-MOD-index-transcripts-modularite.md).

---

## Usage agent

1. Lire ce fichier pour choisir le **plan** adapte au chantier.  
2. Ouvrir le `.plan.md` — respecter `todos` et chemins `scope_paths` du plan ou du brief Task.  
3. Apres chaque vague : mettre a jour todos + sync disque (`long-run-orchestrator`).  
4. Cloture : commande `revisions-et-rapport` ou artefact handoff date.

Ne pas dupliquer le contenu integral d'un plan dans `references/jarvos-agentique/sessions/` — une fiche session resume decisions seulement.
