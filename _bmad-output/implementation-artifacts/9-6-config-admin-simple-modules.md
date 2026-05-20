# Story 9.6 : Livrer la config admin simple pour modules et reglages simples

Status: backlog (story seed P1 — 2026-05-20)

<!-- Note : validation optionnelle — validate-create-story avant dev-story. Seed aligne epics.md Story 9.6, HITL reco 06, pack protocole modules. -->

## Story

En tant que **super-admin ou administrateur responsable**,  
je veux une **surface de configuration simple** pour les **modules** et les **reglages de faible complexite**,  
afin de piloter l'activation et quelques controles module sans refonte ACL ni panneau expert comptable (hors perimetre 9.6).

## Acceptance Criteria

1. **Perimetre simple admin** — Etant donne que v2 inclut une capacite de config admin simple (PRD §7.1), quand le module admin-config est livre, alors les utilisateurs autorises peuvent gerer le perimetre prevu : **activation**, **ordre** (si applicable), **variantes simples d'affichage**, ou autres controles module explicitement autorises — **sans** devenir un plan de controle expert transverse. [Source : `_bmad-output/planning-artifacts/epics.md` — Story 9.6]

2. **Clarte roles et effet** — Etant donne que certains reglages sont plus sensibles, quand l'UI de configuration est utilisee, alors l'ecran indique **qui peut agir**, sur **quel perimetre**, et avec **quel effet** ; les changements sensibles restent **traçables** pour la supervision. [Source : epics.md — Story 9.6]

3. **Persistance ADR P2 + merge deterministe** — Etant donne que **ADR P2** gouverne la persistance du perimetre simple-admin, quand des surcharges sont stockees et fusionnees au runtime, alors le stockage durable utilise **PostgreSQL** (modele/table dedie) avec **merge deterministe** sur les **defauts des manifests build**, **pas** un fichier JSON sur disque en **production** pour cette couche ; les changements enregistrent **auteur**, **horodatage** et **motif** lorsque le produit l'exige. [Source : epics.md — Story 9.6 ; AR45]

4. **DEC-03 — JSON `module_key` fait foi** — Etant donne la decision architecte **DEC-03** (artefact bouclage 04 §C), quand `sites.configuration` et un document JSON `module_key` scopé `site_id` divergent, alors **le JSON gagne** ; `sites.configuration` ne **reactive jamais** un module desactive au rang 1. La story 9.6 edite le JSON (rang 1), pas une autorite concurrente. [Source : [`references/artefacts/2026-05-20_04_reponse-architecte-bouclage-modules-v2.md`](../../references/artefacts/2026-05-20_04_reponse-architecte-bouclage-modules-v2.md) · [`references/artefacts/2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md`](../../references/artefacts/2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md)]

5. **API `module-config` interne jusqu'a stabilite** — Etant donne le HITL **F1** (reco 06, QCM 8/8 reponse **A**), quand les routes `GET/PATCH /v1/sites/{site_id}/module-config/{module_key}` sont exposees, alors elles restent tag **`ModuleConfig`** et **API interne Recyclique** (non contrat public multi-apps JARVOS) **jusqu'a** livraison et stabilite de cette story ; codegen et revue CREOS s'appuient sur le contrat canonique deja fusionne. [Source : `contracts/openapi/recyclique-api.yaml` — `recyclique_moduleConfig_*` ; reco 06 §F1]

6. **Migration toggle bandeau → `kpi-live-banner`** — Etant donne la dette Epic **4.5** (`bandeau_live_slice_enabled` + `recyclique_exploitation_patchBandeauLiveSlice`), quand la config admin simple est operationnelle pour le pilote bandeau, alors l'activation du slice transite vers **`module_key=kpi-live-banner`** via `recyclique_moduleConfig_patchSiteModuleConfig` et le schema [`kpi-live-banner.v1.json`](../../references/config-modules-site-id/schemas/kpi-live-banner.v1.json) ; le chemin transitoire est **deprecie** documente (pas de second PATCH ad hoc par module). Le poll widget conserve **`recyclique_exploitation_getLiveSnapshot`** (regle B4). [Source : [`references/protocole-modules-recyclique/05-MOD-registre-module-key.md`](../../references/protocole-modules-recyclique/05-MOD-registre-module-key.md) §6 · [`18-MOD-config-modules-crosswalk.md`](../../references/protocole-modules-recyclique/18-MOD-config-modules-crosswalk.md)]

7. **UI Peintre — route `/admin/modules`** — Etant donne le modele mental pose par le transcript bandeau (`0c9a9709`) et la navigation CREOS, quand le panneau « Gestion des modules » est livre, alors il est accessible via la route Peintre **`/admin/modules`** (manifests `navigation-transverse-served.json`, page admin-config CREOS) et generalise le prototype transitoire (`localStorage` / widget admin KPI) vers la **verite serveur** + merge PG P2. [Source : `contracts/creos/manifests/navigation-transverse-served.json` · `peintre-nano/src/domains/admin-config/`]

## Repartition des taches (P1 seed — ne pas confondre avec AC finaux)

| Lot | Statut attendu (2026-05-20) | Contenu |
|-----|------------------------------|---------|
| **Backend contrat `module-config`** | **Fait (P0 T-MOD-3)** | `recyclique_moduleConfig_getSiteModuleConfig` / `recyclique_moduleConfig_patchSiteModuleConfig` dans `contracts/openapi/recyclique-api.yaml` ; `openapi-module-config.yaml` **DEPRECATED** ; `npm run generate` OK. **Handler Python + whitelist + tests IDOR/409** = scope **cette story**. |
| **Front Story 9.6** | **A faire** | Panneau `/admin/modules`, branchement `module-config` + merge manifests ; migration prefs bandeau ; traçabilite UI. |
| **Merge PostgreSQL P2** | **A faire (meme story ou lot lie Epic 2)** | Table/modele surcharges simple-admin ; merge deterministe manifest build → PG → JSON `module_key` (ordre **Q-HITL-03**). |
| **Registre / schemas** | **Partiel** | `kpi-live-banner` actif + schema v1 ; stub [`config-admin-simple.v1.json`](../../references/config-modules-site-id/schemas/config-admin-simple.v1.json) placeholder ; autres cles **reservees** jusqu'a promotion T-MOD-5. |

## Tasks / Subtasks

### Backend (handler + persistance)

- [x] Implementer router/handler `module-config` aligne OpenAPI (`recyclique_moduleConfig_*`) — **fait T-MOD-3** 2026-05-20.
- [x] Whitelist serveur = registre [`05`](../../references/protocole-modules-recyclique/05-MOD-registre-module-key.md) §3 (`kpi-live-banner` seul).
- [x] Validation payload `kpi-live-banner` ; membership GET ; ETag / 409 PATCH mismatch — **5 tests** `test_module_config_site.py`.
- [ ] Persistance JSONB ADR-001 : table `site_module_configs` **faite** ; pont merge PG P2 (AR45) pour surcharges simple-admin — **reste story 9.6**.
- [ ] Migrer ecriture activation bandeau : deprecier `PATCH bandeau-live-slice` apres bascule prod Peintre.
- [ ] Tests pytest **etendus** : PATCH IDOR, 401, If-Match malforme → 422, Cache-Control (P1 QA2).

### Front Peintre (Story 9.6)

- [ ] Page `/admin/modules` : liste modules **simples** (activation + reglages bornes du registre).
- [ ] Remplacer source transitoire `kpi-live-banner-settings` (localStorage) par `GET/PATCH module-config` pour prefs bandeau (`show_on_caisse`, `show_on_reception`, `refresh_interval_seconds`).
- [ ] Respecter signal « module off » **backend-autoritaire** (`bandeau_live_slice_enabled` / payload jusqu'a fin migration).
- [ ] Traçabilite affichage : auteur / date / motif sur PATCH sensibles (alignement AC epics).
- [ ] Tests Vitest + e2e jsdom : admin modules, bandeau on/off via API mockée.

### Documentation / contrats (fin de story)

- [ ] MAJ [`05-MOD-registre-module-key.md`](../../references/protocole-modules-recyclique/05-MOD-registre-module-key.md) : promouvoir `config-admin-simple` si panneau porte la meta-config.
- [ ] Crosswalk [`18-MOD-config-modules-crosswalk.md`](../../references/protocole-modules-recyclique/18-MOD-config-modules-crosswalk.md) : cloturer L-08.
- [ ] Ne pas exposer `ModuleConfig` comme API publique externe avant revue produit post-9.6.

## Dev Notes

### HITL et ordre chantier (reco 2026-05-20_06)

- **ADR-007 Accepted** ; ordre P0 : T-MOD-2 → T-MOD-3 → T-MOD-1 → **Story 9.6** (T-MOD-4).
- **F1** : `module-config` **interne** jusqu'a 9.6 stable.
- **F3** : 1 `module_key` = 1 package backend strict.
- **Pas dans 9.6** : 2e module metier (comptage T-MET-1), marketplace, gardien du seuil (T-PEINT-1).

### Garde-fous

- **Ne pas** absorber le parametrage comptable expert (sprint-change 2026-04-15) — rester PRD « config admin **simple** ».
- **Ne pas** stocker secrets HelloAsso ou donnees metier volumineuses dans `ModuleConfigDocument.payload`.
- **Ne pas** changer l'`operationId` du poll bandeau (`recyclique_exploitation_getLiveSnapshot`).

### Fichiers typiques

| Zone | Chemins |
|------|---------|
| Contrats | `contracts/openapi/recyclique-api.yaml` ; `contracts/openapi/generated/recyclique-api.ts` |
| Schemas config | `references/config-modules-site-id/schemas/` |
| Registre pack | `references/protocole-modules-recyclique/05-MOD-registre-module-key.md` |
| Admin UI | `peintre-nano/src/domains/admin-config/` ; route `/admin/modules` |
| Bandeau | `peintre-nano/src/domains/bandeau-live/` ; Epic 4 stories **4-5** (toggle transitoire) |
| Backend | `recyclique/api/src/recyclic_api/` — nouveau package ou module `module_config` (convention `03-MOD` §6 C.4) |
| Matrice gaps | `references/protocole-modules-recyclique/15-MOD-matrice-gaps-bmad-story-9-6.md` |

### Dette absorbee (Epic 4.5)

Story **4.5** (`4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live.md`) reste **done** ; cette story **generalise** le mecanisme vers registre `module_key` + config admin simple, sans elargir ACL globale.

## References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Story 9.6]
- [Source : `references/artefacts/2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md`]
- [Source : `references/artefacts/2026-05-20_04_reponse-architecte-bouclage-modules-v2.md` — DEC-03]
- [Source : `references/protocole-modules-recyclique/05-MOD-registre-module-key.md`]
- [Source : `references/protocole-modules-recyclique/15-MOD-matrice-gaps-bmad-story-9-6.md`]
- [Source : `references/protocole-modules-recyclique/09-MOD-lacunes-et-questions-ouvertes.md` — T-MOD-4, L-05, L-08]
- [Source : `_bmad-output/implementation-artifacts/4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live.md`]
