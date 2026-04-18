# Point de situation — Kanban idées JARVOS Recyclique

**Date de l’instantané :** 2026-04-18  
**Emplacement :** `references/artefacts/2026-04-18_02_point-situation-kanban-idees-jarvos.md`

---

## Concept (pourquoi ce fichier)

Ce document est une **photographie à date fixe** du stade d’avancement des idées (`references/idees-kanban/`) croisée avec une **lecture repo** (`recyclique/api/`, `peintre-nano/`). Ce n’est **pas** un journal multi-dates : pour une nouvelle photographie, dupliquer ou créer un nouvel artefact daté.

**Pratique proche :** *status report* / *point de situation* en gestion de projet ; utile avant une planification BMAD ou une revue de priorisation.

---

## Méthode de production (cette édition)

Remplissage **séquentiel** : un orchestrateur par stade Kanban, chacun déléguant par carte (sous-agents `explore` si besoin), **sans paralléliser** les quatre orchestrateurs entre eux.

| Ordre | Stade Kanban | Responsable rédaction (session) |
|-------|----------------|----------------------------------|
| 1 | `a-conceptualiser/` | Orchestrateur #1 |
| 2 | `a-rechercher/` | Orchestrateur #2 |
| 3 | `a-creuser/` | Orchestrateur #3 |
| 4 | `a-faire/` | Orchestrateur #4 |

**Hors périmètre de cette feuille :** `archive/` (vide au 2026-04-18), `index.md`.

---

## Stade — À conceptualiser

<!-- EMPLACEMENT-A-CONCEPTUALISER — rempli par orchestrateur #1 -->

| Fichier | Statut | Gap | Effort | Preuve(s) |
|---------|--------|-----|--------|-----------|
| `2026-02-24_jarvos-le-fil-placeholder-github.md` | Hors code | Aucune intégration produit (API/UI) vers dépôt public ou « fil » communautaire ; livrable = artefact GitHub externe. | S | `recyclique/api/src/recyclic_api/api/api_v1/api.py` ; pas de client « Le Fil » / GitHub dans `peintre-nano/src` |
| `2026-02-24_module-correspondance-paheko.md` | Partiel | Paheko couvert surtout pour la clôture de session (outbox, mappings) ; pas l’équivalent pour dépôts/poids ni un traducteur métier complet ventes/catégories. | L | `recyclique/api/.../paheko_mapping_service.py` ; `.../paheko_accounting_client.py` ; `peintre-nano/.../AdminPahekoCashSessionCloseMappingsSection.tsx` |
| `2026-02-24_readme-international-ou-multipays.md` | Non démarré | Pas d’encart international dans le README racine ; pas d’archi i18n / multi-pays dans API ni UI (FR/EUR dominant). | S (L si multi-pays natif) | `README.md` ; `peintre-nano/src/domains/admin-config/SessionManagerAdminWidget.tsx` ; pas de couche i18n sous `recyclique/api/src` |
| `2026-02-24_readme-contexte-projet-ancien-repo.md` | Hors code | Documentation et actions sur dépôt GitHub historique ; pas une capacité dans le code applicatif. | S | `recyclique/api/README.md` ; `peintre-nano/README.md` |
| `2026-02-24_module-store-recyclic.md` | Non démarré | Aucun catalogue, distribution GitHub ni activation par site pour modules optionnels. | L | Idée source ; `recyclique/api/.../endpoints/__init__.py` ; pas de marketplace dans `peintre-nano/src` |
| `2026-04-14_configuration-raccourcis-clavier-par-poste.md` | Non démarré | Pas de modèle/API/UI pour layout et raccourcis par poste ou terminal ; raccourcis au niveau catégorie et grilles AZERTY figées. | L | `recyclique/api/.../models/category.py` (`shortcut_key`) ; `peintre-nano/.../CategoryHierarchyPicker.tsx` |
| `2026-02-24_nouvelles-ui-workflows-paheko.md` | Partiel | Intégration Paheko actuelle = compta/outbox/admin ; absence des routes `/modules/paheko/*`, `ModuleSlot` et workflows terrain décrits. | L | `peintre-nano/.../AdminAccountingExpertShellWidget.tsx` ; `.../RuntimeDemoApp.tsx` ; `recyclique/api/.../admin_paheko_outbox.py` |
| `2026-02-26_parcours-ouverture-caisse-postes-acces-pin.md` | Partiel | Briques présentes (session caisse, PIN, permissions, step-up) mais pas le parcours produit unifié veille → PIN → navigation selon niveau ni gestion explicite multi-postes/caisses comme dans la note. | L | `recyclique/api/.../cash_session_opening.py` ; `.../endpoints/auth.py` (PIN) ; `.../core/step_up.py` |

**Résumé (stade à conceptualiser)**

1. **Hors code (2)** : placeholder GitHub « Le Fil », README contexte ancien repo — effort surtout documentation / GitHub (**S**).
2. **Non démarré dans le code (3)** : README international, store de modules, raccourcis par poste — effort **S** (texte README) à **L** (store, par poste, multi-pays natif).
3. **Partiel (3)** : correspondance Paheko (clôture oui, périmètre élargi non) ; nouvelles UI Paheko (admin/outbox oui, `/modules/paheko` non) ; ouverture caisse/PIN (briques oui, parcours unifié non).
4. Charge restante souvent **L** tant que le périmètre métier n’est pas cadré puis découpé en stories.
5. Aligner les README « doc only » avec les priorités produit avant d’investir dans multi-pays ou marketplace.

<!-- FIN-EMPLACEMENT-A-CONCEPTUALISER -->

---

## Stade — À rechercher

<!-- EMPLACEMENT-A-RECHERCHER — rempli par orchestrateur #2 -->

| Fichier | Statut | Gap | Effort | Preuve(s) |
|---------|--------|-----|--------|-----------|
| `2026-03-31_peintre-workflows-raccourcis-navigation.md` | Partiel | Pas de moteur déclaratif commun de workflows ; nav et raccourcis surtout codés par écran + validation bundle (`SHORTCUT_COLLISION`). | L | `peintre-nano/src/types/navigation-manifest.ts` ; `peintre-nano/src/validation/validate-bundle-rules.ts` ; `peintre-nano/src/widgets/category-hierarchy-picker/CategoryHierarchyPicker.tsx` ; `recyclique/api/src/recyclic_api/models/category.py` (`shortcut_key`) |
| `2026-02-24_calendar-espace-fichiers-paheko.md` | Partiel | Décision doc (Paheko fichiers, calendrier externe) ; pas de module agenda ni liens « espace fichiers Paheko » dans l’API ou Peintre. | M | `recyclique/api/openapi.json` ; `contracts/creos/manifests/navigation-transverse-served.json` ; `peintre-nano/src/widgets/demo/LegacyDashboardPersonalWidget.tsx` |
| `2026-02-24_integration-paheko-core.md` | Partiel | Dual-backend et flux ciblé (clôture caisse, outbox, admin mappings/diagnostics) ; la fiche vise encore API caisse plugin, Saisie au poids, SSO, dumps — largement hors périmètre code actuel. | L | `docker-compose.yml` ; `recyclique/api/src/recyclic_api/services/paheko_accounting_client.py` (+ `paheko_outbox_*`, `admin_paheko_*`) ; `peintre-nano/src/domains/admin-config/AdminPahekoCashSessionCloseMappingsSection.tsx` |
| `2026-02-24_sync-financiere-caisse-paheko.md` | Partiel | Implémentation = outbox PostgreSQL + POST Paheko à la **clôture de session** ; la spec évoque aussi granularité ticket, Redis Streams, « Paheko seul » — non alignés. | L | `recyclique/api/src/recyclic_api/services/cash_session_service.py` ; `paheko_outbox_service.py` / `paheko_outbox_processor.py` / `paheko_accounting_client.py` ; `peintre-nano/src/api/admin-paheko-outbox-client.ts` |

**Résumé (stade à rechercher)**

1. Les quatre cartes sont **documentées / décidées** en note ; côté code, toutes sont au mieux **partielles** — aucune intégration « finie » au sens produit complet de chaque fiche.
2. **Peintre** : briques manifeste nav, collisions raccourcis, raccourcis widgets — pas le moteur déclaratif ni les liaisons globales décrites.
3. **Paheko** : socle Compose + HTTP compta, outbox durable, UI admin mappings / file — pas l’intégration « core » étendue ni l’agenda / fichiers dédiés.
4. **Sync financière** : réalité **session-close** ; écart avec les variantes ticket / Redis / vérité unique à clarifier dans la spec ou le backlog.
5. Charge dominante **L** sauf calendrier/fichiers (**M** pour une coquille minimale avant un agenda métier complet).
6. Prochain arbitrage : trancher **spec vs implémentation actuelle** (outbox session), puis prioriser **élargissement Paheko** vs **workflows Peintre**.

<!-- FIN-EMPLACEMENT-A-RECHERCHER -->

---

## Stade — À creuser

<!-- EMPLACEMENT-A-CREUSER — rempli par orchestrateur #3 -->

| Fichier | Statut | Gap | Effort | Preuve(s) |
|---------|--------|-----|--------|-----------|
| `2026-02-24_jarvos-ports-nano-mini-peintre.md` | Partiel | Pas de port unique Nano/Mini ni relais explicite vers un futur Peintre ; deux origines dev (4444 vs 4445) ; proxy `/api` vers l’API Recyclique. | M | `docker-compose.yml` ; `peintre-nano/vite.config.ts` ; `recyclique/api/README.md` ; `peintre-nano/docs/01-perimetre-et-positionnement.md` |
| `2026-02-25_chantier-fichiers-politique-documentaire.md` | Partiel | Pas de politique documentaire transverse ni matrice « où vit le doc » ; Paheko sans couche fichiers dédiée ; nano limité aux uploads métier (CSV, dump, exports). | L | `recyclique/api/.../services/sync_service.py` (`KDriveSyncService`) ; `recyclique/api/.../core/config.py` (`KDRIVE_*`) ; `recyclique/api/.../main.py` (sync périodique) ; `peintre-nano/.../admin-db-operations-client.ts` ; `peintre-nano/.../AdminCategoriesWidget.tsx` |
| `2026-02-24_ia-llm-modules-intelligents.md` | Partiel | Backend : import legacy + mapping LLM OpenRouter OK ; nano : import CSV sans `/admin/import/legacy/*` ; pas Ganglion ni pipelines papier/vocal. | L | `recyclique/api/.../legacy_import_service.py` ; `.../llm_openrouter_client.py` ; `.../endpoints/legacy_import.py` ; `recyclic_api/core/config.py` (`LEGACY_IMPORT_*`, `OPENROUTER_*`) ; `peintre-nano/.../category-admin-csv-import.ts` |
| `2026-02-24_plugin-framework-recyclic.md` | Absent / partiel | API : pas de `module.toml`, `ModuleBase`, loader ni bus Redis Streams ; nano : `registerWidget` / `resolveWidget` statique au build, pas lifecycle plugins. | L | `recyclique/api/.../core/redis.py` ; `peintre-nano/src/registry/widget-registry.ts` ; `peintre-nano/src/registry/index.ts` ; recherche `ModuleBase` / Streams dans `recyclique/api` : vide |
| `2026-02-24_ui-modulaire-configurable.md` | Partiel | Manifests CREOS + shell + slots par `slot_id` existent ; pas les symboles du design (`ModuleSlot`, `useModuleExtensions`) ; peu/pas de lazy par route ; manifests non servis par l’API (`ContextEnvelope` ≠ registre UI). | M | `peintre-nano/src/registry/widget-registry.ts` ; `peintre-nano/src/app/PageRenderer.tsx` ; `peintre-nano/src/registry/shell-slot-regions.ts` ; `peintre-nano/src/app/demo/runtime-demo-manifest.ts` ; `recyclique/api/.../endpoints/users.py` (`get_my_context_envelope`) |

**Résumé (stade à creuser)**

1. **Ports Nano / Peintre** : Vite + proxy documentés, mais pas d’entrée unique ni bascule explicite vers un futur backend Peintre — effort **M** (harmoniser compose, proxy, CORS, brief relais).
2. **Politique fichiers** : synchro optionnelle kDrive côté API ; pas de pont fichiers Paheko ni dépôt unifié côté nano — **L** (contrats, auth, UI/ops).
3. **LLM « modules intelligents »** : socle backend mapping legacy présent ; écart majeur avec le front et avec la vision Ganglion / papier / vocal — **L**.
4. **Plugin framework** : aucun loader événementiel côté API ; nano = registre widgets — **L** (socle transversal + alignement front).
5. **UI modulaire** : implémentation proche du besoin sous d’autres noms ; reste alignement design, lazy route, éventuelle config pilotée API — **M**.
6. Priorisation indicative : traiter **M** (ports, UI modulaire) quand ils débloquent le quotidien dev ; paralléliser ou suivre les **L** selon arbitrage produit (fichiers vs plugins vs LLM étendu).
7. Aucune des cinq cartes n’est « terminée » au sens produit ; le stade **à creuser** confirme surtout des **partiels** et des **chantiers transverses**.

<!-- FIN-EMPLACEMENT-A-CREUSER -->

---

## Stade — À faire

<!-- EMPLACEMENT-A-FAIRE — rempli par orchestrateur #4 -->

| Fichier | Objectif court | Statut | Effort | Gap (chemin restant) | Preuve(s) |
|---------|----------------|--------|--------|----------------------|-----------|
| `2026-04-18_finir-ecarts-qa-parametrage-comptable-superadmin.md` | Boucler les écarts QA SuperAdmin (compta expert, Paheko, UX) vs spec B/M/I | Partiel / quasi-fait | **M** | M5 (liste ou validation exercice Paheko), M1 (surplus vs moyen `donation`), passe QA ligne à ligne, vérif migration `s22_7` et donnée `7073` | `admin_accounting_expert.py`, `accounting_expert_service.py`, `AdminPahekoCashSessionCloseMappingsSection.tsx`, `KioskFinalizeSaleDock.tsx`, tests story 22.3 / 23.1 |
| `2026-04-18_durcissement-sync-paheko-outbox-post-audit.md` | Durcir synchro Paheko (outbox, bandeau live, admin) après audit red-team | Partiel (socle OK, gaps nommés ouverts) | **L** | Seeds AGR / SNAP / DEL / REL et tests §5 artefact (agrégat `rejete` + `a_reessayer`, `partial_success` vs bandeau, DELETE prudent) | `exploitation_live_snapshot_service.py`, `SyncOperationalSummaryOut`, `admin_paheko_outbox.py`, `cashflow-operational-sync-notice.tsx`, `contracts/openapi/recyclique-api.yaml` |
| `2026-03-01_workflow-evenements-caisse-recyclique-paheko.md` | Pousser les flux comptables « caisse » vers Paheko (vision ticket / transaction) | Non aligné avec le code actuel ; intention **a-faire** | **L** | Nouveaux événements ou outbox hors clôture, persistance ticket ↔ Paheko, corriger lien cassé vers `references/recherche/...` (fichier sous `references/temporaire-pour-tri/recherche/`) | `PahekoOutboxOperationType` = `cash_session_close` seul, `enqueue_cash_session_close_outbox`, admin outbox UI sans flux ticket-par-ticket |
| `2026-04-18_chantier-operations-speciales-caisse-prd-v1-1.md` | Opérations spéciales caisse (PRD v1.1, tags, permissions, Paheko, BMAD) | Doc / planification ; implémentation partielle vs PRD | **L** | Audit PRD ↔ repo, permissions PRD absentes (`caisse.cancel`, `cash.disbursement`, etc.), hub UI unifié, états sync Paheko par opération | `sales.py` reversals / `caisse.refund`, `sale_service.py`, widgets cashflow et manifests CREOS ; pas de correspondance grep des clés §16 PRD |

**Résumé (stade à faire)**

1. **Deux chantiers de finition** sur socle déjà présent : QA paramétrage comptable (**M**) et durcissement outbox / bandeau live (**L**).
2. **Deux chantiers larges** encore en décalage spec ↔ code : workflow événements caisse ↔ Paheko (**L**, outbox limitée à la clôture) et opérations spéciales caisse PRD v1.1 (**L**, permissions et hub non couverts).
3. Priorité raisonnable : boucler **M5 / M1** et la **passe QA** compta avant d’étendre le périmètre Paheko hors session.
4. Côté outbox : traiter les **seeds et tests** listés dans l’artefact audit quand la **sécurité d’exploitation** et la **lisibilité support** priment.
5. Côté workflow caisse : trancher **spec** (ticket / transaction) vs **impl** (session-close seule), puis réparer les **chemins de documentation** (fichier déplacé sous `temporaire-pour-tri`).
6. Côté opérations spéciales : formaliser l’**écart PRD ↔ repo** (permissions, hub) avant gros développement ; s’appuyer sur **remboursement** et widgets cashflow déjà là.
7. Synthèse d’effort : **un M**, **trois L** ; charge dominante sur **Paheko** (compta, sync, événements) et **caisse** (parcours métier).
8. Les **explore** ont été **readonly** ; le **transcript Cursor** cité sur la carte compta n’est pas un fichier relu dans le dépôt.

<!-- FIN-EMPLACEMENT-A-FAIRE -->

---

## Synthèse transversale (optionnel)

<!-- EMPLACEMENT-SYNTHESE-PARENT — peut être complété après les quatre stades -->

### Contrôle d’exhaustivité (cartes ↔ point de situation)

**Couverture : 21/21** — chaque fichier `.md` présent sous `references/idees-kanban/` dans les quatre stades actifs est cité dans **exactement une** des quatre sections « Stade — … » de ce document (tableaux ou résumés associés).

| # | Fichier carte | Stade attendu (dossier) | Présent dans le point de situation ? |
|---|---------------|-------------------------|-------------------------------------|
| 1 | `2026-02-24_jarvos-le-fil-placeholder-github.md` | `a-conceptualiser/` | oui |
| 2 | `2026-02-24_module-correspondance-paheko.md` | `a-conceptualiser/` | oui |
| 3 | `2026-02-24_readme-international-ou-multipays.md` | `a-conceptualiser/` | oui |
| 4 | `2026-02-24_readme-contexte-projet-ancien-repo.md` | `a-conceptualiser/` | oui |
| 5 | `2026-02-24_module-store-recyclic.md` | `a-conceptualiser/` | oui |
| 6 | `2026-04-14_configuration-raccourcis-clavier-par-poste.md` | `a-conceptualiser/` | oui |
| 7 | `2026-02-24_nouvelles-ui-workflows-paheko.md` | `a-conceptualiser/` | oui |
| 8 | `2026-02-26_parcours-ouverture-caisse-postes-acces-pin.md` | `a-conceptualiser/` | oui |
| 9 | `2026-02-24_calendar-espace-fichiers-paheko.md` | `a-rechercher/` | oui |
| 10 | `2026-02-24_sync-financiere-caisse-paheko.md` | `a-rechercher/` | oui |
| 11 | `2026-03-31_peintre-workflows-raccourcis-navigation.md` | `a-rechercher/` | oui |
| 12 | `2026-02-24_integration-paheko-core.md` | `a-rechercher/` | oui |
| 13 | `2026-02-25_chantier-fichiers-politique-documentaire.md` | `a-creuser/` | oui |
| 14 | `2026-02-24_jarvos-ports-nano-mini-peintre.md` | `a-creuser/` | oui |
| 15 | `2026-02-24_plugin-framework-recyclic.md` | `a-creuser/` | oui |
| 16 | `2026-02-24_ia-llm-modules-intelligents.md` | `a-creuser/` | oui |
| 17 | `2026-02-24_ui-modulaire-configurable.md` | `a-creuser/` | oui |
| 18 | `2026-04-18_finir-ecarts-qa-parametrage-comptable-superadmin.md` | `a-faire/` | oui |
| 19 | `2026-04-18_durcissement-sync-paheko-outbox-post-audit.md` | `a-faire/` | oui |
| 20 | `2026-03-01_workflow-evenements-caisse-recyclique-paheko.md` | `a-faire/` | oui |
| 21 | `2026-04-18_chantier-operations-speciales-caisse-prd-v1-1.md` | `a-faire/` | oui |

*(Stade attendu = emplacement réel du fichier ; l’index Kanban peut diverger — voir note en bas.)*

---

### Regroupement par thème

- **Paheko / outbox / compta** : `module-correspondance-paheko`, `nouvelles-ui-workflows-paheko`, `integration-paheko-core`, `sync-financiere-caisse-paheko`, `calendar-espace-fichiers-paheko`, `durcissement-sync-paheko-outbox-post-audit`, `workflow-evenements-caisse-recyclique-paheko`, `finir-ecarts-qa-parametrage-comptable-superadmin`. Cœur implémenté : clôture de session, outbox durable, admin expert / mappings ; tensions : ticket vs session, élargissement « core Paheko », fichiers/agenda côté Paheko.
- **Peintre / CREOS / navigation** : `peintre-workflows-raccourcis-navigation`, `ui-modulaire-configurable`, `nouvelles-ui-workflows-paheko` (routes modules), `configuration-raccourcis-clavier-par-poste`, `parcours-ouverture-caisse-postes-acces-pin`. Manifestes, slots, collisions raccourcis existent ; manquent moteur déclaratif global, `/modules/paheko/*`, profils par poste.
- **Caisse / vente / parcours terrain** : `sync-financiere-caisse-paheko`, `parcours-ouverture-caisse-postes-acces-pin`, `workflow-evenements-caisse`, `chantier-operations-speciales-caisse-prd-v1-1`. Dépendance forte à la décision **granularité comptable** (clôture batch vs événements).
- **LLM** : `ia-llm-modules-intelligents` — backend legacy/OpenRouter partiel ; pas aligné front ni vision Ganglion / papier / vocal.
- **Plugins / extensibilité** : `plugin-framework-recyclic`, `module-store-recyclic`, `jarvos-le-fil-placeholder-github` (distribution future). Aucun loader runtime unifié ; store et « Fil » restent conceptuels.
- **Fichiers / politique documentaire** : `chantier-fichiers-politique-documentaire`, `calendar-espace-fichiers-paheko`, partie « fichiers » de `integration-paheko-core`. kDrive/sync API sans matrice documentaire ni pont Paheko fichiers côté nano.
- **Infra / ports / dev UX** : `jarvos-ports-nano-mini-peintre` — harmonisation compose/proxy/CORS (**M**), prérequis pour tester les flux sans friction.
- **Produit pur documentation / communauté** : `readme-international-ou-multipays`, `readme-contexte-projet-ancien-repo`, `jarvos-le-fil-placeholder-github` — hors code ou presque ; utiles pour onboarding et image projet.

---

### Dépendances et risques

- **Effet domino spec ↔ impl (sync)** : plusieurs fiches supposent encore granularité **ticket**, **Redis Streams** ou « Paheko seul » ; le code livré centre l’outbox sur **`cash_session_close`**. Tant que ce décalage n’est pas tranché en spec, tout chantier « événements caisse », « opérations spéciales » ou « sync financière étendue » risque de refaire surface ou de casser les attentes métier.
- **Dette spec vs impl** : `workflow-evenements-caisse` et `sync-financiere-caisse-paheko` + résumés « à rechercher » / « à faire » pointent le même risque systémique ; sans décision écrite, les **L** s’accumulent en parallèle incompatible.
- **Outbox durci ↔ audit** : la carte `durcissement-sync-paheko-outbox-post-audit` et les seeds/tests attendus recoupent directement les findings de `references/artefacts/2026-04-18_01_audit-red-team-paheko-outbox-synthese-agents.md` ; retarder seeds/tests laisse une **dette exploitation / support** (bandeau, états partiels, agrégats).
- **Opérations spéciales PRD** : `chantier-operations-speciales-caisse-prd-v1-1` + pack `references/operations-speciales-recyclique/` dépendent de permissions et hub non présents au grep — chevauchement avec caisse (`sales`, cashflow widgets) : risque de **double implémentation** si PRD et code divergent sans tableau d’écart maintenu.
- **QA compta SuperAdmin** : `finir-ecarts-qa-parametrage-comptable-superadmin` conditionne la confiance sur les mappings Paheko ; laisser des écarts M5/M1 nuit aux chantiers **L** aval (outbox, caisse).
- **Raccourcis / postes** : `configuration-raccourcis-clavier-par-poste` et `peintre-workflows-raccourcis-navigation` touchent les mêmes surfaces (`CategoryHierarchyPicker`, `shortcut_key`) — risque de redesign en cascade si l’on pousse un moteur global avant de figer le modèle « par poste ».

---

### Ordre de travail suggéré (M avant L quand pertinent)

1. **M — Finition QA compta** (`finir-ecarts-qa-parametrage-comptable-superadmin`) : débloquer la validation des mappings et l’alignement spec migration-paheko avant tout élargissement Paheko.
2. **M** — **Ports / proxy** (`jarvos-ports-nano-mini-peintre`) + **UI modulaire** (`ui-modulaire-configurable`) : réduire le frottement dev/test ; facilite les passes QA et les démos.
3. **L lié audit** — **Durcissement outbox** (`durcissement-sync-paheko-outbox-post-audit`) : exécuter en priorité les **seeds BMAD** et **tests §5** évoqués dans `2026-04-18_01_audit-red-team-paheko-outbox-synthese-agents.md` pour sécuriser l’exploitation (cohérence avec `SyncOperationalSummaryOut`, bandeau live, cas `rejete` / `a_reessayer`).
4. **Décision écrite** — Trancher **session-close vs ticket / événements** ; mettre à jour les fiches `sync-financiere-caisse-paheko` et `workflow-evenements-caisse` ; réparer les **liens doc cassés** (fichier déplacé sous `references/temporaire-pour-tri/…`) signalés dans le stade à faire.
5. **L** — **Opérations spéciales** (`chantier-operations-speciales-caisse-prd-v1-1`) : s’appuyer sur le pack `references/operations-speciales-recyclique/` pour un **audit PRD ↔ repo** (permissions §16, hub) puis enchaîner BMAD ; croiser avec remboursements / widgets cashflow déjà présents.
6. Ensuite : **élargissement Paheko** (`integration-paheko-core`, `nouvelles-ui-workflows-paheko`, `calendar…`) et **plugin / store / Fil** selon arbitrage produit ; **LLM étendu** et **politique fichiers** en parallèle seulement si capacité équipe.

---

### Limites de la méthode (cette photographie)

- **Lecture repo** surtout par **grep / fichiers ciblés** via sous-agents `explore` en **readonly** : pas d’exécution de tests ni audit manuel exhaustif du runtime.
- **Instantané daté** au **2026-04-18** : tout état « Partiel / Non démarré » est révocable dès le prochain commit.
- **`archive/`** déclarée vide — pas d’historique d’idées archivées dans ce périmètre.
- Les **transcripts Cursor** ou artefacts externes cités dans certaines cartes **ne sont pas** des preuves relues comme fichiers versionnés ici.

---

### Note — exhaustivité `index.md` vs disque

- **Alignement (2026-04-18, session)** : une ligne manquante dans `references/idees-kanban/index.md` pour **`2026-03-01_workflow-evenements-caisse-recyclique-paheko.md`** a été ajoutée — le tableau index compte désormais **21** entrées, comme les **21** fichiers cartes sur disque.

<!-- FIN-EMPLACEMENT-SYNTHESE-PARENT -->
