# Idees et suivi (Kanban, todo, ou-on-en-est)

## Synthese executive

Le Kanban compte 14 fiches (hors index) : aucun dossier `archive` dans `references/idees-kanban/` au moment du scan. La spirale « decouverte » est cloturee ; beaucoup de decisions Paheko / caisse / push sont actees (version 1.3.19.x, plugin PHP, Redis Streams, source de verite Paheko). **TODO / travail ouvert** (Kanban + `todo.md`) : README / archivage ancien repo, internationalisation, store modules, Le Fil, parcours PIN/postes, affinage correspondance et presets, politique fichiers, strategie LLM post-brief, checklist v0.1 architecture, etc. `ou-on-en-est.md` (MAJ 2026-02-26) place le projet en READY FOR IMPLEMENTATION avec PRD, architecture, sprint-status ; prochaine vague = stories implementables + vigilance checklist v0.1.

## Idees Kanban (liste par fichier)

| Fichier | Stade | Resume | Paheko / Recyclique / migration |
|---------|-------|--------|----------------------------------|
| `a-conceptualiser/2026-02-24_readme-contexte-projet-ancien-repo.md` | a-conceptualiser | README JARVOS : contexte La Clique, ABZenobre, lien repo 1.4.4 fige ; **reste** archiver GitHub + nettoyer avant archivage. | Repo legacy Recyclique 1.4.4 |
| `a-conceptualiser/2026-02-24_readme-international-ou-multipays.md` | a-conceptualiser | Option A encart EN « fork pour ton pays » vs B multi-pays natif — a trancher a la redaction README. | Positionnement produit |
| `a-conceptualiser/2026-02-24_nouvelles-ui-workflows-paheko.md` | a-conceptualiser | UI terrain via Paheko ; pattern routes `/modules/paheko/*`, slots, Paheko natif en super-admin ; **workflows metier** encore a definir. | Integration Paheko, UI modules |
| `a-conceptualiser/2026-02-24_module-store-recyclic.md` | a-conceptualiser | Store de modules optionnels par ressourcerie ; distribution GitHub (placeholder Le Fil) ; detail en 2e passe / Brief. | Ecosysteme Recyclique |
| `a-conceptualiser/2026-02-24_jarvos-le-fil-placeholder-github.md` | a-conceptualiser | Reseau inter-ressourceries (Le Fil) vision long terme ; placeholder GitHub public pour ressources ; Ganglion hors scope. | Communaute / partage |
| `a-conceptualiser/2026-02-24_module-correspondance-paheko.md` | a-conceptualiser | Middleware traducteur Recyclic vers API Paheko (caisse, ventes, depots/poids) ; distinct module decla eco ; questions resilience / granularite. | **Cœur migration Paheko** |
| `a-conceptualiser/2026-02-26_parcours-ouverture-caisse-postes-acces-pin.md` | a-conceptualiser | Postes reception vs caisse, multi-caisses/postes, PIN vers niveaux d'acces ; benchmark POS a faire **avant** archi/PRD detaille sur ce point. | Caisse / auth terrain Recyclique |
| `a-rechercher/2026-02-24_integration-paheko-core.md` | a-rechercher | Dual-backend, Docker, modules optionnels, « max Paheko » ; version 1.3.19.x, mono Compose ; cartographie + doc officielle ; suite API / dumps deja largement traitee ailleurs. | **Integration Paheko core** |
| `a-rechercher/2026-02-24_sync-financiere-caisse-paheko.md` | a-rechercher | Sync caisse vers ecritures : **decisions** source Paheko, push par ticket, plugin PHP, Redis Streams, syncAccounting ; fiche historique riche. | **Migration financiere / Paheko** |
| `a-rechercher/2026-02-24_calendar-espace-fichiers-paheko.md` | a-rechercher | Capacites Paheko verifiees ; agenda = Recyclic + externes, v0.1 placeholders ; fichiers natifs Paheko. | Paheko + perimetre Recyclic |
| `a-creuser/2026-02-24_plugin-framework-recyclic.md` | a-creuser | Framework modules : TOML, ModuleBase, **Redis Streams**, design dans artefact 07 ; zones residuelles hooks/tests. | Architecture modulaire (Paheko + Recyclic) |
| `a-creuser/2026-02-24_ui-modulaire-configurable.md` | a-creuser | Slots React, lazy routes, `register_ui_extensions` ; a creuser : `useModuleExtensions`, registre front. | Front / Peintre futur |
| `a-creuser/2026-02-24_jarvos-ports-nano-mini-peintre.md` | a-creuser | Port unique Nano/Mini, relay Peintre ; detail avec Brief / architecture. | JARVOS / IA |
| `a-creuser/2026-02-24_ia-llm-modules-intelligents.md` | a-creuser | Inventaire 1.4.4 (Excel/categories) ; v0.1 placeholder Ganglion ; strategie reportee post-Brief ; modules intelligents futurs. | Recyclique + IA |
| `a-creuser/2026-02-25_chantier-fichiers-politique-documentaire.md` | a-creuser | Politique documentaire, acces unifie Paheko + tiers, scans factures, upload Recyclic vers Paheko (WebDAV vs plugin) ; **versions futures**. | **Fichiers / Paheko / migration** |

## Todo.md — items migration / Paheko / architecture

**Ouverts (pertinents Recyclique / Paheko / archi)**

- `[ ]` **v0.1 — Checklist architecture** : loader modules (TOML, ModuleBase), slots, convention tests frontend, versions Python/Node Dockerfile/README vers artefact `2026-02-26_03_checklist-v0.1-architecture.md`.
- `[ ]` **Politique fichiers** : matrice, backends, scan factures, upload RecyClique vers Paheko (chantier versions futures).
- `[ ]` **Presets / boutons rapides** (Don, Recyclage, Decheterie…) : eco vs non-eco ou reste RecyClique — matrice ou spec.
- `[ ]` **Module correspondance** : affiner champs/regles apres BDD + instance dev + analyste.
- `[ ]` **Strategie LLM/IA** : hardcode + placeholder Ganglion vs JARVOS Nano/Mini — reportee apres brief (v0.1.0 = placeholder).

**Faits (rappel migration / Paheko)**

Repo 1.4.4, document project brownfield, PRD, architecture READY, perimetre v0.1.0, catalogue modules Paheko, version Paheko 1.3.19.x, auth/SSO recherche, sync financiere + API caisse + saisie au poids, source de verite caisse, granularite push + Redis, BDD dev + instance Paheko, confrontation Recyclic versus Paheko, checklist import 1.4.4, inventaire LLM, structure travail, plan Git.

## ou-on-en-est — etat et prochaines etapes

- **Etat** : v0.1.0 initialise ; brownfield 1.4.4 et Paheko documentes ; framework modules arbitre ; Brief, PRD, architecture, UX v1.0 (copie ecrans 1.4.4) ; 2e passe spirale (BDD, confrontation) faite ; decisions push/Redis/source EEE ; track Enterprise ; BMAD 6.0.3.
- **Derniere session notee** : 2026-02-26 — Sprint Planning, `sprint-status.yaml` (8 epics, 22 stories, tout en backlog) ; pas encore de fichiers story dans implementation-artifacts.
- **Prochaines etapes listees** : Create Epics and Stories (si pas deja couvert par epics.md), Check Implementation Readiness, cycle Create Story vers Dev Story vers Code Review ; **points vigilance v0.1** = checklist 2026-02-26_03 ; derive vers Correct Course.

## Lacunes

- **`ou-on-en-est.md`** : derniere MAJ 2026-02-26 ; l'etat reel du depot au 2026-03-24 (ex. code dans `recyclique-1.4.4/`) peut etre posterieur a ce document.
- Pas de sous-dossier `archive` dans le Kanban au moment du scan.

## Meta

Rapport produit par sous-agent explore (2026-03-24) ; fichier materialise par l'orchestrateur.
