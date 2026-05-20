# 10 — Cartographie sources → pack protocole modules

**Date :** 2026-05-20  
**Rôle :** tableau unique **source projet → fichier(s) pack → statut de couverture** ; enrichissement v1 clos ([`00-MOD-plan-enrichissement-modules.md`](00-MOD-plan-enrichissement-modules.md)) · sync v2 ([`00-MOD-plan-enrichissement-v2-2026-05-20.md`](00-MOD-plan-enrichissement-v2-2026-05-20.md), QA2 **96 %**).  
**Procédures pas à pas :** ne pas dupliquer [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) — s’y reporter pour créer / activer un module.

**Portes d’entrée pack :** [`index.md`](index.md) · lacunes L-03…L-15 : [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) §3.

**Règle `refs_first` :** chemins relatifs vers `_bmad-output/`, `contracts/`, code — **aucune** copie PRD/epics/stories dans ce fichier.

---

## Légende

| Statut | Signification |
|--------|----------------|
| **couvert** | Source citée et exploitable dans le pack consommateur (`01`–`09`) sans doc enrichissement dédiée |
| **partiel** | Citation ou checklist présente ; décision, crosswalk ou synthèse manquants (→ enrichissement `11`–`22` ou patch pack) |
| **gap** | Source non indexée ou décision terrain non reprise dans le pack actuel |

| Type | Signification |
|------|----------------|
| pack | Fichier du dossier `references/protocole-modules-recyclique/` |
| meta | Plans / QA2 / prompt (hors parcours consommateur linéaire) |
| BMAD | `_bmad-output/planning-artifacts/` ou `implementation-artifacts/` |
| config | `references/config-modules-site-id/` |
| artefact | `references/artefacts/` |
| recherche | `references/recherche/` |
| vision | `references/vision-projet/` |
| peintre | `references/peintre/` |
| archi | `references/dossier-architecte-externe-v2/` |
| contrat | `contracts/` |
| code | `peintre-nano/` (reviewable, non normatif pack) |
| kanban | `references/idees-kanban/` |
| transcript | `agent-transcripts/<uuid>/` (hors dépôt git) |
| plan | `.cursor/plans/` |

---

## Table principale (sources → pack)

| Source | Type | Pack cible | Statut | L-ID | Note |
|--------|------|------------|--------|------|------|
| [`index.md`](index.md) | pack | `index.md` | couvert | — | Porte d’entrée, glossaire, pilotes Epic 4, `refs_first` |
| [`00-MOD-cadrage-chantier.md`](00-MOD-cadrage-chantier.md) | pack | `00-cadrage`, `index` | couvert | — | Périmètre chantier, hors-scope marketplace |
| [`01-MOD-matrice-choix-modularite.md`](01-MOD-matrice-choix-modularite.md) | pack | `01`, `07-adr`, `11`, `19` | couvert | **L-03**, **L-15** | Matrice v0.1/v2 ; TOML backend-only → `07`/`19` (Q-HITL-07 HITL) |
| [`02-MOD-taxonomie-types-de-modules.md`](02-MOD-taxonomie-types-de-modules.md) | pack | `02`, `08` | partiel | **L-10** | Slice vs workflow step ; pas de fiche multi-magasins |
| [`03-MOD-protocole-backend.md`](03-MOD-protocole-backend.md) | pack | `03`, `06` (renvoi) | partiel | **L-07**, **L-09**, **L-12** | Checklist back ; précédence config et convention package à compléter (plan enrich.) |
| [`04-MOD-protocole-front-creos.md`](04-MOD-protocole-front-creos.md) | pack | `04`, `06`, `12`, `21` | couvert | **L-10**, **L-11** | CREOS + fallbacks ; CI Epic 10 → `21` (impl. backlog) |
| [`05-MOD-registre-module-key.md`](05-MOD-registre-module-key.md) | pack | `05`, `06` (renvoi) | couvert | **L-04** **clos**, **L-05**, **L-06**, **L-08** | 1 clé **actif** ; ops `module-config` dans canon ; L-08 → story 9.6 |
| [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) | pack | `06` | couvert | — | **Livrable procédural** — ne pas recopier ailleurs |
| [`07-MOD-adr-reconciliation-v01-v02.md`](07-MOD-adr-reconciliation-v01-v02.md) | pack | `07-adr`, `01`, `19`, `22` | couvert | **L-03** **clos** | ADR-007 **Accepted** (HITL 2026-05-20) + miroir BMAD |
| [`08-MOD-exemple-pilote-comptage-pieces-billets.md`](08-MOD-exemple-pilote-comptage-pieces-billets.md) | pack | `08`, `06` (renvoi) | partiel | **L-10** | Pilote #2 workflow step ; HITL Q-HITL-09–11 ouverts |
| [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) | pack | `09` | couvert | **L-03**…**L-15** | Registre normatif des lacunes et Q-HITL |
| [`19-MOD-checklist-v0-1-vs-pack.md`](19-MOD-checklist-v0-1-vs-pack.md) | pack | `19`, `01`, `07-adr` | couvert | **L-03** **clos** | Crosswalk v0.1 ; ADR-007 **Accepted** |
| [`prompt-agent-chantier-modules.md`](prompt-agent-chantier-modules.md) | pack | `prompt-agent`, `06` | partiel | — | Phases A→D ; cases `06`/`09` incomplètes (QA2 P2) |
| [`16-MOD-lien-operations-speciales-pattern.md`](16-MOD-lien-operations-speciales-pattern.md) | pack | `16`, `06` (renvoi) | couvert | — | Méta-procédure ops A→E ↔ cookbook ; pas duplicate `06` |
| [`00-MOD-plan-redaction-modules.md`](00-MOD-plan-redaction-modules.md) | meta | `index` (lien) | couvert | — | Chantier rédaction clos — méta uniquement |
| [`00-MOD-plan-enrichissement-modules.md`](00-MOD-plan-enrichissement-modules.md) | meta | `10` (ce fichier), `11`–`22` | couvert | **L-03**…**L-15** | Enrichissement v1 clos ; owners fichiers `11`–`22` livrés |
| [`00-MOD-plan-enrichissement-v2-2026-05-20.md`](00-MOD-plan-enrichissement-v2-2026-05-20.md) | meta | `index`, `10`, `22` | couvert | — | Cohérence post-QA2 96 % ; sync index/cartographie |
| [`qa2-rapport-final-v2.md`](qa2-rapport-final-v2.md) | meta | `09`, `index` | couvert | — | QA2 pack **97 %** GO (cycle 4 v2) ; [`qa2-rapport-final.md`](qa2-rapport-final.md) cycles 1–3 |
| [`11-MOD-synthese-recherches-modularite.md`](11-MOD-synthese-recherches-modularite.md) | pack | `01`, `03`, `index` § enrichi | couvert | **L-09**, **L-15** | Distillat recherche readonly — ne remplace pas `01`/`07` |
| [`12-MOD-index-transcripts-modularite.md`](12-MOD-index-transcripts-modularite.md) | pack | `04`, `02`, `index` § enrichi | couvert | **L-10** | Index 5 UUID ; modules imbriqués, config-modules |
| [`13-MOD-idees-kanban-modules-liens.md`](13-MOD-idees-kanban-modules-liens.md) | pack | `09` §10, `01`, `14` | couvert | **L-14**, **L-15** | Pont kanban sans duplication fiches |
| [`15-MOD-matrice-gaps-bmad-story-9-6.md`](15-MOD-matrice-gaps-bmad-story-9-6.md) | pack | `09`, `05`, `22` | couvert | **L-03**…**L-15** | Hub Story **9.6** × lacunes × sprint |
| [`18-MOD-config-modules-crosswalk.md`](18-MOD-config-modules-crosswalk.md) | pack | `05`, `03`, `09` | couvert | **L-04**, **L-06** | Owner crosswalk OpenAPI + schémas ; grep 0 route canonique documenté |
| [`20-MOD-peintre-code-refs-bandeau-live.md`](20-MOD-peintre-code-refs-bandeau-live.md) | pack | `04`, `06` (renvoi) | couvert | **L-08** | Liens code `peintre-nano/` pilote #1 |
| [`22-MOD-dossier-architecte-pont-t-mod.md`](22-MOD-dossier-architecte-pont-t-mod.md) | pack | `09`, `15`, `index` | couvert | **L-03**, **L-04**, **L-10** | T-MOD-1…5 / T-MET-1 exécutable ; renvoi `06` pour procédure |
| [`14-MOD-marketplace-post-v2-fiche-citation.md`](14-MOD-marketplace-post-v2-fiche-citation.md) | pack | `14`, `09` hors-scope, `13` | couvert | **L-14** | Citation post-v2 ; BMAD `post-v2-hypothesis-marketplace-modules.md` — doc clos |
| [`17-MOD-outillage-cursor-modules-2026-05-20.md`](17-MOD-outillage-cursor-modules-2026-05-20.md) | pack | `17`, `prompt-agent`, `index` | couvert | — | Outillage Cursor / BMAD mai 2026 ; artefact `2026-05-20_01` |
| [`21-MOD-gouvernance-contrats-modules.md`](21-MOD-gouvernance-contrats-modules.md) | pack | `21`, `04`, `03`, `06` | couvert | **L-11** | Owner L-11 ; checklist merge AR39/B4 ; CI Epic 10 = impl. backlog |
| [`qa2-plan-enrichissement.md`](qa2-plan-enrichissement.md) | meta | `00-plan-enrichissement` | couvert | — | Validation plan enrichissement (gates G2–G4) |
| [`.cursor/plans/chantier_protocole_modules_fe3bc68e.plan.md`](../../.cursor/plans/chantier_protocole_modules_fe3bc68e.plan.md) | plan | `00-cadrage`, `index` | partiel | — | Phase 0 architecte **done** ; todos pack init encore `pending` dans YAML |
| [`references/config-modules-site-id/index.md`](../config-modules-site-id/index.md) | config | `05`, `03`, `18`, `index` | couvert | **L-04**, **L-06** | Pack normatif JSON ; crosswalk `18` ; fusion OpenAPI = impl. |
| [`references/config-modules-site-id/ADR-001-configuration-modules-json-par-site.md`](../config-modules-site-id/ADR-001-configuration-modules-json-par-site.md) | config | `05`, `03` §8 | partiel | **L-07** | Décision JSON `site_id` ; précédence vs PG P2 non tabulée pack |
| [`references/config-modules-site-id/openapi-module-config.yaml`](../config-modules-site-id/openapi-module-config.yaml) | config | `05`, `03` | gap | **L-04** | Brouillon ; **0** route `module-config` dans `contracts/openapi/recyclique-api.yaml` |
| [`references/config-modules-site-id/livrable-normatif-architecture.md`](../config-modules-site-id/livrable-normatif-architecture.md) | config | `05`, `09`, `18` | couvert | **L-06** | Exigences QA2 config ; crosswalk [`18-MOD-config-modules-crosswalk.md`](18-MOD-config-modules-crosswalk.md) |
| [`references/config-modules-site-id/schemas/kpi-live-banner.v1.json`](../config-modules-site-id/schemas/kpi-live-banner.v1.json) | config | `05`, `08` (pilote #1) | couvert | **L-06** | Seul schéma publié à ce jour |
| [`references/config-modules-site-id/schemas/README.md`](../config-modules-site-id/schemas/README.md) | config | `05` | partiel | **L-06** | Convention répertoire ; stubs clés réservées absents |
| [`references/artefacts/2026-02-24_07_design-systeme-modules.md`](../artefacts/2026-02-24_07_design-systeme-modules.md) | artefact | `01`, `07-adr` | partiel | **L-03**, **L-09** | Design v0.1 TOML / ModuleBase / EventBus |
| [`references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`](../artefacts/2026-02-26_03_checklist-v0.1-architecture.md) | artefact | `19`, `07-adr`, `01` | couvert | **L-03** (partiel) | Crosswalk pack : [`19-MOD-checklist-v0-1-vs-pack.md`](19-MOD-checklist-v0-1-vs-pack.md) |
| [`references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`](../artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md) | artefact | `04`, `06`, `21` | couvert | **L-11** | AR39 ; checklist gouvernance [`21-MOD-gouvernance-contrats-modules.md`](21-MOD-gouvernance-contrats-modules.md) |
| [`references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`](../artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md) | artefact | `04`, `05`, `08` (pilote #1) | couvert | **L-08** | Signaux exploitation bandeau ; complète toggle 4.5 |
| [`references/artefacts/qa2-livrable-architecture-config-modules-json-site-id.md`](../artefacts/qa2-livrable-architecture-config-modules-json-site-id.md) | artefact | `05`, `09`, `18` | couvert | **L-04**, **L-06** | QA2 config-modules ; crosswalk [`18`](18-MOD-config-modules-crosswalk.md) |
| [`references/recherche/index.md`](../recherche/index.md) | recherche | `index`, `11` | couvert | **L-15** | Index + synthèse pack [`11-MOD-synthese-recherches-modularite.md`](11-MOD-synthese-recherches-modularite.md) |
| [`references/recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-1.md`](../recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-1.md) | recherche | `01`, `03`, `11` | couvert | **L-09**, **L-15** | Distillé dans `11` § Pluggy / entry points |
| [`references/recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-2-complement.md`](../recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-2-complement.md) | recherche | `01`, `04`, `11` | couvert | **L-03**, **L-15** | Distillé dans `11` § slots React / `module.toml` |
| [`references/recherche/2026-02-24_pluggy-vs-alternatives-hooks_perplexity_prompt.md`](../recherche/2026-02-24_pluggy-vs-alternatives-hooks_perplexity_prompt.md) | recherche | `03`, `09`, `11` | partiel | **L-13** | Hooks inter-modules — stratégie tests = backlog (`09` §3) |
| [`references/recherche/2026-02-24_catalogue-plugins-modules-paheko_perplexity_reponse.md`](../recherche/2026-02-24_catalogue-plugins-modules-paheko_perplexity_reponse.md) | recherche | `09` §10, `01`, `13` | couvert | **L-15** | Catalogue Paheko ; pont kanban `13` |
| [`references/recherche/2026-03-31_brique-nano-peintre-modularite-json-ui_perplexity_reponse.md`](../recherche/2026-03-31_brique-nano-peintre-modularite-json-ui_perplexity_reponse.md) | recherche | `02`, `04`, `11` | couvert | **L-10** | Distillé dans `11` ; complète taxonomie CREOS |
| [`references/vision-projet/2026-03-31_decision-directrice-v2.md`](../vision-projet/2026-03-31_decision-directrice-v2.md) | vision | `00-cadrage`, `07-adr` | partiel | **L-03** | Pivot v2 ; réconciliation v0.1 non gelée BMAD |
| [`references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`](../peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md) | peintre | `03`, `05`, `04` | partiel | **L-07** | ADR P2 PostgreSQL config admin ; merge avec JSON ADR-001 à trancher |
| [`_bmad-output/planning-artifacts/prd.md`](../../_bmad-output/planning-artifacts/prd.md) | BMAD | `index`, `03`, `05` | partiel | **L-06**, **L-12** | §4.2 chaîne 7 briques ; §7 modules obligatoires — **citation** |
| [`_bmad-output/planning-artifacts/epics.md`](../../_bmad-output/planning-artifacts/epics.md) | BMAD | `index`, `08`, `04` | partiel | **L-05**, **L-11** | Epic 3, 4, 9 (9.6), 10, 6 — **citation** |
| [`_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md`](../../_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md) | BMAD | `09` § hors-scope, `index`, `14` | couvert | **L-14** | Hypothèse post-v2 ; fiche [`14-MOD-marketplace-post-v2-fiche-citation.md`](14-MOD-marketplace-post-v2-fiche-citation.md) |
| [`_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`](../../_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md) | BMAD | `03`, `04` | partiel | **L-09** | Frontières repo ; convention package module optionnel à aligner |
| [`_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`](../../_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md) | BMAD | `08`, `03` | partiel | **L-12** | Chaîne compta ; libellé outbox/Redis dans `03` §7 ambigu |
| [`_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md`](../../_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md) | BMAD | `03`, `09` | partiel | **L-12** | Transport Paheko ; Q-HITL-04 |
| [`_bmad-output/implementation-artifacts/sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml) | BMAD | `index`, `09`, `05` | partiel | **L-05**, **L-08** | `9-6` **backlog** ; `epic-10` **backlog** (instantané 2026-04-23) |
| [`_bmad-output/implementation-artifacts/4-1-publier-le-contrat-et-les-manifests-minimaux-du-module-bandeau-live.md`](../../_bmad-output/implementation-artifacts/4-1-publier-le-contrat-et-les-manifests-minimaux-du-module-bandeau-live.md) | BMAD | `04`, `06` (renvoi) | couvert | — | Pilote #1 — contrats + manifests (**done**) |
| [`_bmad-output/implementation-artifacts/4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live.md`](../../_bmad-output/implementation-artifacts/4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live.md) | BMAD | `05`, `03` | partiel | **L-08** | Toggle transitoire ; dette Story 9.6 |
| [`_bmad-output/implementation-artifacts/4-6-valider-la-chaine-complete-backend-contrat-manifest-runtime-rendu-fallback.md`](../../_bmad-output/implementation-artifacts/4-6-valider-la-chaine-complete-backend-contrat-manifest-runtime-rendu-fallback.md) | BMAD | `06`, `index` pilotes | couvert | — | Preuve chaîne 7 briques Epic 4 (**done**) |
| [`_bmad-output/implementation-artifacts/3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif.md`](../../_bmad-output/implementation-artifacts/3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif.md) | BMAD | `04`, `02` | couvert | — | Socle Peintre registre widgets (**done**) |
| [`_bmad-output/implementation-artifacts/1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope.md`](../../_bmad-output/implementation-artifacts/1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope.md) | BMAD | `04`, `06`, `21` | couvert | **L-11** | Gouvernance contrats — [`21-MOD-gouvernance-contrats-modules.md`](21-MOD-gouvernance-contrats-modules.md) |
| [`references/idees-kanban/a-creuser/2026-02-24_plugin-framework-recyclic.md`](../idees-kanban/a-creuser/2026-02-24_plugin-framework-recyclic.md) | kanban | `09` §10, `01`, `13` | couvert | **L-15** | Pont [`13-MOD-idees-kanban-modules-liens.md`](13-MOD-idees-kanban-modules-liens.md) |
| [`references/idees-kanban/a-conceptualiser/2026-02-24_module-store-recyclic.md`](../idees-kanban/a-conceptualiser/2026-02-24_module-store-recyclic.md) | kanban | `09`, `14`, `13` | couvert | **L-14**, **L-15** | Statut post-v2 via `14` + `13` |
| [`references/idees-kanban/a-creuser/2026-02-24_ui-modulaire-configurable.md`](../idees-kanban/a-creuser/2026-02-24_ui-modulaire-configurable.md) | kanban | `02`, `04`, `13` | couvert | **L-15** | Relié taxonomie CREOS via `13` |
| [`references/idees-kanban/a-conceptualiser/2026-02-24_module-correspondance-paheko.md`](../idees-kanban/a-conceptualiser/2026-02-24_module-correspondance-paheko.md) | kanban | `08`, `03`, `13` | couvert | **L-12**, **L-15** | Pont kanban ; impl. Paheko = HITL `08` |
| [`references/artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md`](../artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md) | artefact | `prompt-agent`, `17` | couvert | — | Outillage agents mai 2026 — [`17-MOD-outillage-cursor-modules-2026-05-20.md`](17-MOD-outillage-cursor-modules-2026-05-20.md) |
| [`references/artefacts/2026-05-20_02_marketplace-cursor-com-evaluation-jarvos.md`](../artefacts/2026-05-20_02_marketplace-cursor-com-evaluation-jarvos.md) | artefact | `09` hors-scope, `14` | couvert | **L-14** | Marketplace Cursor.com ; synthèse §8 fiche `14` |
| [`contracts/openapi/recyclique-api.yaml`](../../contracts/openapi/recyclique-api.yaml) | contrat | `05`, `03`, `06` phase contrats | gap | **L-04** | Canonique prod ; pas de `module-config/{module_key}` |
| [`contracts/README.md`](../../contracts/README.md) | contrat | `04`, `06` | partiel | **L-11** | Ne mentionne pas explicitement module-config |
| [`contracts/creos/manifests/navigation-bandeau-live-slice.json`](../../contracts/creos/manifests/navigation-bandeau-live-slice.json) | contrat | `04`, `08` (pilote #1) | couvert | — | Manifest pilote bandeau live |
| [`peintre-nano/src/domains/bandeau-live/README.md`](../../peintre-nano/src/domains/bandeau-live/README.md) | code | `04`, `20` | couvert | **L-08** | Code reviewable — [`20-MOD-peintre-code-refs-bandeau-live.md`](20-MOD-peintre-code-refs-bandeau-live.md) |
| [`references/dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md`](../dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md) | archi | `04`, `02`, `08`, `12` | couvert | **L-10** | Tensions modularité ; transcript modules imbriqués → `12` |
| [`references/dossier-architecte-externe-v2/06-ARCH-etat-implementation-et-backlog.md`](../dossier-architecte-externe-v2/06-ARCH-etat-implementation-et-backlog.md) | archi | `index`, `09`, `15` | couvert | **L-05**, **L-11** | Backlog epics 9–10 ; matrice L-ID → [`15`](15-MOD-matrice-gaps-bmad-story-9-6.md) |
| [`references/dossier-architecte-externe-v2/07-ARCH-todos-et-questions-architecte.md`](../dossier-architecte-externe-v2/07-ARCH-todos-et-questions-architecte.md) | archi | `09`, `22` | couvert | **L-03**…**L-15** | T-MOD-1…5, T-MET-1 — [`22-MOD-dossier-architecte-pont-t-mod.md`](22-MOD-dossier-architecte-pont-t-mod.md) |
| [`references/migration-paheko/index.md`](../migration-paheko/index.md) | artefact | `08`, `03` | partiel | **L-12** | Intégration Paheko ; Q-HITL-10 |
| [Bandeau live → modules Peintre](0c9a9709-d1f8-406b-a9ea-26ff2c59a7fd) | transcript | `04`, `12` | couvert | **L-10** | Indexé [`12-MOD-index-transcripts-modularite.md`](12-MOD-index-transcripts-modularite.md) |
| [Commit pack config-modules](7f711038-9b17-4fcc-a327-5a9a52e71817) | transcript | `05`, `12`, `18` | couvert | **L-04**, **L-07** | Index `12` ; crosswalk `18` |
| [HelloAsso module optionnel](557456c1-20f8-4b56-b55f-233b00fec22a) | transcript | `05`, `02`, `12`, `14` | couvert | **L-14**, **L-15** | Index `12` ; post-v2 `14` |
| [Modules prévus vs livrés](2075d9e8-6eb4-4ac9-999b-a685ca1ad5a8) | transcript | `01`, `07-adr`, `19`, `12` | couvert | **L-03** | Crosswalk `19` + index transcript `12` |
| [Brainstorming CREOS v2](242de5e4-0344-4a77-8453-fbde98f78a8a) | transcript | `00-cadrage`, `02`, `12` | couvert | — | Index [`12-MOD-index-transcripts-modularite.md`](12-MOD-index-transcripts-modularite.md) |
| Stories Epic 4 `4-2`…`4-4`, `4-6b` (pattern `_bmad-output/implementation-artifacts/4-*.md`) | BMAD | `04`, `06` (renvoi) | couvert | **L-08** | Chaîne pilote #1 complète (**done**) — voir `index` tableau Epic 4 |
| [`references/recherche/2026-02-25_affichage-dynamique-peintre-extension-points_bmad_recherche.md`](../recherche/2026-02-25_affichage-dynamique-peintre-extension-points_bmad_recherche.md) | recherche | `04`, `02`, `11` | couvert | **L-10** | Distillé dans `11` ; complète `04` § extension |
| [`references/ou-on-en-est.md`](../ou-on-en-est.md) | artefact | `index`, `09` | partiel | **L-11** | État projet ; epics 9–10 backlog |

**Comptage :** **70 lignes** dans la table ci-dessus (hors en-tête). Couverture L-ID : chaque **L-03** à **L-15** apparaît sur **≥1** ligne ; lacunes **impl.** (OpenAPI, 9.6, ADR Accepted) restent dans [`09`](09-MOD-lacunes-et-questions-ouvertes.md).

---

## Synthèse par fichier pack (consommateur)

| Fichier pack | Sources principales alimentant | Lacunes résiduelles (voir `09`) |
|--------------|-------------------------------|----------------------------------|
| `01` + `07-adr` | design v0.1, vision v2, transcripts 2075d9e8 | ADR-007 non promu (**L-03**) |
| `02` + `08` | epics, dossier archi 05, recherche nano | Workflow step vs slice (**L-10**) |
| `03` | PRD §4.2, ADR Paheko, config ADR-001 | L-07, L-09, L-12 |
| `04` | Epic 4 stories, CREOS manifests, artefact 04/07 | L-11, liens code Peintre |
| `05` | config-modules, Epic 4.5, PRD §7 | L-04, L-05, L-06, L-08 |
| `06` | **Procédure unique** — agrège 03+04+05 après lecture | Validation HITL Q-HITL-06 |
| `09` | Toutes L-03…L-15 + Q-HITL + T-MOD-* | Terminal enrichissement Phase 3 |

---

## Gaps prioritaires (P0 / P1)

Aligné [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) §3 et [`00-MOD-plan-enrichissement-modules.md`](00-MOD-plan-enrichissement-modules.md) § audit.

| Priorité | L-ID | Gap | Prochain livrable pack (enrichissement) | Action HITL / BMAD |
|----------|------|-----|----------------------------------------|-------------------|
| ~~P0~~ | L-03 | **Clos** 2026-05-20 — ADR-007 **Accepted** + miroir BMAD | — | — |
| **P0** | L-10 | Doc **couvert** (`08`, `12`, `04`) ; validation architecte ouverte | **HITL** Q-HITL-09–11 sur `08` ; [`22`](22-MOD-dossier-architecte-pont-t-mod.md) T-MET-1 | Stories Epic 6 comptage post-HITL |
| **P1** | L-04 | Crosswalk **livré** (`18`) ; route canonique **absente** | **BMAD** T-MOD-3 → `recyclique-api.yaml` | Fusion OpenAPI + Story **9.6** |
| **P1** | L-05 | Matrice **livré** (`15`) ; whitelist = 1 clé active | **BMAD** T-MOD-5 + patch `05` | Story **9.6** |
| **P1** | L-06 | Crosswalk **livré** (`18`) ; stubs schémas manquants | Stubs `config-modules-site-id/schemas/` | Alignement PRD §7 |
| **P1** | L-07 | Tableau précédence partiel (`03` §8) | Patch `03` + **9.6** | Q-HITL-03 |
| **P1** | L-08 | Migration toggle documentée (`05`, `20`) | Story **9.6** | T-MOD-4 |
| **P1** | L-09 | Synthèse **livré** (`11`) ; convention package à valider HITL | Patch `03` §6 | Validation HITL |
| **P1** | L-11 | Gouvernance **livré** (`21`) ; CI Epic 10 **backlog** | Epic **10** pipeline | Story 10.x |
| **P2** | L-12 | Libellé outbox ambigu (`03` §7) | Patch `03` + migration-paheko | Q-HITL-04 |
| **P2** | L-13 | Hooks — doc partiel (`11`, `09`) | Stories post-socle / **9.8** | Backlog tests inter-modules |
| **P2** | L-14 | Fiche **livré** (`14`) — décision post-v2 | — | Ne pas figer interfaces v2 |
| **P2** | L-15 | Ponts **livré** (`11`, `13`) — pas framework TOML v2 | — | Hors scope v2 |

**Couverture documentaire enrichissement :** transcripts → [`12`](12-MOD-index-transcripts-modularite.md) ; recherche → [`11`](11-MOD-synthese-recherches-modularite.md) ; kanban → [`13`](13-MOD-idees-kanban-modules-liens.md) ; outillage mai 2026 → [`17`](17-MOD-outillage-cursor-modules-2026-05-20.md) ; T-MOD → [`22`](22-MOD-dossier-architecte-pont-t-mod.md).

---

## Fichiers enrichissement livrés (`10`–`22`)

| Fichier | Rôle | Statut doc (2026-05-20) |
|---------|------|-------------------------|
| [`10-MOD-cartographie-sources-modules.md`](10-MOD-cartographie-sources-modules.md) | Tableau sources → pack (ce fichier) | **Livré** |
| [`11-MOD-synthese-recherches-modularite.md`](11-MOD-synthese-recherches-modularite.md) | Distillat recherche readonly | **Livré** |
| [`12-MOD-index-transcripts-modularite.md`](12-MOD-index-transcripts-modularite.md) | Index 5 UUID transcripts | **Livré** |
| [`13-MOD-idees-kanban-modules-liens.md`](13-MOD-idees-kanban-modules-liens.md) | Pont kanban | **Livré** — L-14, L-15 doc clos |
| [`14-MOD-marketplace-post-v2-fiche-citation.md`](14-MOD-marketplace-post-v2-fiche-citation.md) | Citation post-v2 | **Livré** — L-14 doc clos |
| [`15-MOD-matrice-gaps-bmad-story-9-6.md`](15-MOD-matrice-gaps-bmad-story-9-6.md) | L-ID × story × sprint | **Livré** |
| [`16-MOD-lien-operations-speciales-pattern.md`](16-MOD-lien-operations-speciales-pattern.md) | Pattern ops spéciales | **Livré** |
| [`17-MOD-outillage-cursor-modules-2026-05-20.md`](17-MOD-outillage-cursor-modules-2026-05-20.md) | Outillage Cursor mai 2026 | **Livré** |
| [`18-MOD-config-modules-crosswalk.md`](18-MOD-config-modules-crosswalk.md) | Owner L-04, L-06 | **Livré** — fusion OpenAPI = impl. |
| [`19-MOD-checklist-v0-1-vs-pack.md`](19-MOD-checklist-v0-1-vs-pack.md) | Crosswalk v0.1 | **Livré** — ADR-007 **Accepted** |
| [`20-MOD-peintre-code-refs-bandeau-live.md`](20-MOD-peintre-code-refs-bandeau-live.md) | Liens code pilote #1 | **Livré** |
| [`21-MOD-gouvernance-contrats-modules.md`](21-MOD-gouvernance-contrats-modules.md) | Owner L-11 | **Livré** — CI Epic 10 = impl. |
| [`22-MOD-dossier-architecte-pont-t-mod.md`](22-MOD-dossier-architecte-pont-t-mod.md) | T-MOD-* / T-MET-* exécutable | **Livré** |

---

## Ordre de lecture recommandé (après cette carto)

1. Lacune ciblée dans la table → fichier pack colonne **Pack cible**.
2. Besoin procédural → [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) uniquement.
3. Détail normatif produit → chemin **Source** (`refs_first`).
4. Clôture gap **impl.** → [`22`](22-MOD-dossier-architecte-pont-t-mod.md) (T-MOD) + [`15`](15-MOD-matrice-gaps-bmad-story-9-6.md) ; doc terminal → [`09`](09-MOD-lacunes-et-questions-ouvertes.md).

---

_Cartographie enrichissement — pack protocole modules Recyclique (sync v2, QA2 96 %). Ne pas confondre avec le cookbook (`06`) ni la matrice gaps BMAD (`15`)._
