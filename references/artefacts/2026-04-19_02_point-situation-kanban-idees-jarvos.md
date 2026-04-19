# Point de situation — Kanban idées JARVOS Recyclique (mise à jour)

**Date de l’instantané :** 2026-04-19  
**Emplacement :** `references/artefacts/2026-04-19_02_point-situation-kanban-idees-jarvos.md`

---

## Relation avec l’instantané précédent

L’analyse **détaillée par carte** (tableaux Statut / Gap / Effort / Preuves pour les quatre stades, synthèses transversales, dépendances, ordre de travail suggéré) reste dans :

**[`2026-04-18_02_point-situation-kanban-idees-jarvos.md`](2026-04-18_02_point-situation-kanban-idees-jarvos.md)** (21 cartes, session 2026-04-18).

Ce document du 2026-04-19 sert à **réaligner le comptage**, documenter le **delta** depuis cette base, et fournir une **liste exhaustive** des fichiers carte au jour J — sans dupliquer les pages d’analyse déjà valides.

**Repère permanent à côté du Kanban :** [`references/idees-kanban/point-situation.md`](../idees-kanban/point-situation.md).

---

## Delta depuis 2026-04-18

| Élément | Détail |
|---------|--------|
| **Nouvelle carte (1)** | `references/idees-kanban/a-faire/2026-04-19_aligner-brownfield-prd-architecture-permissions-bmad.md` — aligner brownfield vs **PRD** multisite / permissions / kiosques ([`references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`](../vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md)) ; chemin BMAD (recherche technique, `correct course`, epics). |
| **Nouvelle carte (2)** | `references/idees-kanban/a-faire/2026-04-19_chantier-refactor-api-recyclique-audit-brownfield-handoff.md` — refactor **`recyclique/api`** selon [`2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md`](2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md) ; repère prioritaire dans [`references/idees-kanban/index.md`](../idees-kanban/index.md). |
| **Stade concerné** | **a-faire** : **6** cartes (ajout alignement PRD + chantier API par rapport au stock 2026-04-18). |
| **Inventaire** | **23** fiches idée `.md` (hors `index.md` et `point-situation.md` — voir tableau ci-dessous). |

Les autres stades (à conceptualiser, à rechercher, à creuser) sont **supposés inchangés** dans leur analyse qualitative depuis le 2026-04-18 ; rouvrir une session orchestrée si une fiche a été substantiellement modifiée depuis.

---

## Contrôle d’exhaustivité (23 cartes — 2026-04-19)

| # | Fichier | Stade (dossier) |
|---|---------|-----------------|
| 1 | `2026-02-24_jarvos-le-fil-placeholder-github.md` | a-conceptualiser |
| 2 | `2026-02-24_module-correspondance-paheko.md` | a-conceptualiser |
| 3 | `2026-02-24_readme-international-ou-multipays.md` | a-conceptualiser |
| 4 | `2026-02-24_readme-contexte-projet-ancien-repo.md` | a-conceptualiser |
| 5 | `2026-02-24_module-store-recyclic.md` | a-conceptualiser |
| 6 | `2026-04-14_configuration-raccourcis-clavier-par-poste.md` | a-conceptualiser |
| 7 | `2026-02-24_nouvelles-ui-workflows-paheko.md` | a-conceptualiser |
| 8 | `2026-02-26_parcours-ouverture-caisse-postes-acces-pin.md` | a-conceptualiser |
| 9 | `2026-02-24_calendar-espace-fichiers-paheko.md` | a-rechercher |
| 10 | `2026-02-24_sync-financiere-caisse-paheko.md` | a-rechercher |
| 11 | `2026-03-31_peintre-workflows-raccourcis-navigation.md` | a-rechercher |
| 12 | `2026-02-24_integration-paheko-core.md` | a-rechercher |
| 13 | `2026-02-25_chantier-fichiers-politique-documentaire.md` | a-creuser |
| 14 | `2026-02-24_jarvos-ports-nano-mini-peintre.md` | a-creuser |
| 15 | `2026-02-24_plugin-framework-recyclic.md` | a-creuser |
| 16 | `2026-02-24_ia-llm-modules-intelligents.md` | a-creuser |
| 17 | `2026-02-24_ui-modulaire-configurable.md` | a-creuser |
| 18 | `2026-04-18_finir-ecarts-qa-parametrage-comptable-superadmin.md` | a-faire |
| 19 | `2026-04-18_durcissement-sync-paheko-outbox-post-audit.md` | a-faire |
| 20 | `2026-03-01_workflow-evenements-caisse-recyclique-paheko.md` | a-faire |
| 21 | `2026-04-18_chantier-operations-speciales-caisse-prd-v1-1.md` | a-faire |
| 22 | `2026-04-19_aligner-brownfield-prd-architecture-permissions-bmad.md` | a-faire |
| 23 | `2026-04-19_chantier-refactor-api-recyclique-audit-brownfield-handoff.md` | a-faire |

**Couverture annoncée : 23/23** — chaque carte listée dans [`references/idees-kanban/index.md`](../idees-kanban/index.md) correspond à un fichier présent sur disque dans un des quatre stades actifs (`archive/` toujours hors périmètre court du point de situation).

---

## Stade — À faire (complément pour les cartes n°22 et n°23)

| Fichier | Objectif court | Notes |
|---------|----------------|-------|
| `2026-04-19_aligner-brownfield-prd-architecture-permissions-bmad.md` | Convergence brownfield ↔ PRD v2 (multisites, kiosques PWA, PIN, Paheko) | Livrable typique : artefact `references/artefacts/` type tableau PRD § → état repo → gap ; en amont : **`bmad-technical-research`**, **`bmad-correct-course`** si divergence epic ; voir fiche. |
| `2026-04-19_chantier-refactor-api-recyclique-audit-brownfield-handoff.md` | Refactor / garde-fous `recyclique/api` (findings F1–F8, backlog P0–P2) | Source : artefact **`2026-04-19_01_…`** ; distinct de l’alignement **PRD produit** (carte n°22). |

*(Les lignes « à faire » 18–21 restent décrites dans [`2026-04-18_02_…`](2026-04-18_02_point-situation-kanban-idees-jarvos.md) § Stade — À faire.)*

---

## Limites (identiques à l’instantané 2026-04-18)

Pas de re-scan repo pour cette MAJ : lecture **inventaire fichiers + nouvelle fiche** uniquement. Pour une nouvelle photo complète avec agents `explore`, reproduire la méthode décrite dans `2026-04-18_02_…` § Méthode de production.

---

## Note 2026-04-21 — Aplanissement Kanban (post-merge Epic 24)

| Élément | Détail |
|---------|--------|
| **Epic 24 → `master`** | Merge de **`epic/24-operations-speciales-orchestration`** effectué ; journal : [`references/ou-on-en-est.md`](../ou-on-en-est.md) § Dernière session 2026-04-21. |
| **Fiches désormais en `archive/`** | `2026-04-18_chantier-operations-speciales-caisse-prd-v1-1.md`, `2026-04-18_durcissement-sync-paheko-outbox-post-audit.md`, **`2026-03-01_workflow-evenements-caisse-recyclique-paheko.md`** (intention couverte par clôture Paheko + admin — mis de côté). |
| **« À faire » actif** | **3** fiches idée : **QA compta SuperAdmin** (reliquat spec), **alignement PRD multisite**, **refactor API** (bandeau prioritaire dans [`idees-kanban/index.md`](../idees-kanban/index.md)). |

Le tableau d’exhaustivité ci-dessus reste une **photo au 2026-04-19** ; les **stades** ont évolué — se fier au [`idees-kanban/index.md`](../idees-kanban/index.md) pour l’état courant.
