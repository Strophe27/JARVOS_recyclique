# Matrice gaps pack modules × pilotage BMAD (Story 9.6)

**Date :** 2026-05-20  
**Rôle :** pont **lacunes pack** (`L-03`…`L-15`) ↔ **stories/epics** BMAD et **statut sprint** — pour prioriser la **Story 9.6** et les promotions post-HITL sans recopier le PRD.

**Stratégie :** `refs_first` — vérités produit dans `_bmad-output/` ; ce fichier **documente** les écarts et critères de clôture.

---

## Instantané sprint (recoupe obligatoire avant exécution)

Source : [`_bmad-output/implementation-artifacts/sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml) — clé racine **`last_updated` : 2026-04-23**.

| Epic / story | Statut sprint | Lien lacunes |
|--------------|---------------|--------------|
| **`epic-3`** | **done** | Socle Peintre (registre widgets — **3-3** **done**) |
| **`epic-4`** | **done** | Preuve modulaire bandeau (**4-1**…**4-6b** **done**) — dette **L-08** |
| **`epic-9`** | **backlog** | Modules complémentaires ; **9-6** **backlog** |
| **`9-6-livrer-la-config-admin-simple-pour-modules-et-reglages-simples`** | **backlog** | Porteur **T-MOD-4** ; absorbe **L-04**–**L-08**, **L-05**–**L-07** (partiel) |
| **`epic-10`** | **backlog** | Industrialisation ; **L-11** (CI CREOS) |
| **`1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope`** | **done** | Gouvernance contrats — prérequis fusion **L-04** |
| **`3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif`** | **done** | Registre runtime — prérequis pilote Epic 4 |

**Stories pilote Epic 4 (toutes `done`) :** `4-1`, `4-2`, `4-3`, `4-4`, `4-5`, `4-6`, `4-6b` — trace : [`index.md`](index.md) § instantané Epic 4.

**Crosswalk OpenAPI / schémas (livré 2026-05-20) :** [`18-MOD-config-modules-crosswalk.md`](18-MOD-config-modules-crosswalk.md) — owner documentaire **L-04** / **L-06** (grep `contracts/`, plan fusion T-MOD-3) ; complément registre : [`05-MOD-registre-module-key.md`](05-MOD-registre-module-key.md) · brouillon [`config-modules-site-id/openapi-module-config.yaml`](../config-modules-site-id/openapi-module-config.yaml).

**Enrichissement pack v2 :** pont exécutable dossier architecte → [`22-MOD-dossier-architecte-pont-t-mod.md`](22-MOD-dossier-architecte-pont-t-mod.md) ; plan v2 [`00-MOD-plan-enrichissement-v2-2026-05-20.md`](00-MOD-plan-enrichissement-v2-2026-05-20.md).

---

## Matrice L-03 → L-15

Colonnes : **lacune pack** (résumé) · **L-ID** · **story/epic** · **statut sprint** · **critère clôture** · **owner** · **fichier pack** · **pack v2 / pont `22`**.

| Lacune pack | L-ID | Story / Epic | Statut sprint | Critère clôture | Owner | Fichier pack | Pack v2 / pont `22` |
|-------------|------|--------------|---------------|-----------------|-------|--------------|---------------------|
| ~~ADR-007 Proposed~~ — **L-03 clos** (HITL 2026-05-20) : ADR-007 **Accepted** + miroir BMAD ; double récit v0.1/v2 gelé | **L-03** | **T-MOD-2** · Epic **9** · **4-x** / **1-4** | **epic-4** **done** · **1-4** **done** | **Fait** — voir [`07`](07-MOD-adr-reconciliation-v01-v02.md), [`19`](19-MOD-checklist-v0-1-vs-pack.md) | — | [`07`](07-MOD-adr-reconciliation-v01-v02.md) · [`09`](09-MOD-lacunes-et-questions-ouvertes.md) | [`22`](22-MOD-dossier-architecte-pont-t-mod.md) **T-MOD-2** **clos** |
| ~~Routes module-config absentes~~ — **L-04 clos** (2026-05-20) : ops `recyclique_moduleConfig_*` dans `recyclique-api.yaml` + handler + 5 tests | **L-04** | **Story 9.6** · **T-MOD-3** · **1-4** **done** | **9-6** **backlog** (front) · **1-4** **done** | **Fait** — dépréciation `patchBandeauLiveSlice` **après** migration 9.6 ; étendre tests PATCH (story 9.6) | **Dev API** (réserves tests) | [`05`](05-MOD-registre-module-key.md) · [`18`](18-MOD-config-modules-crosswalk.md) | [`22`](22-MOD-dossier-architecte-pont-t-mod.md) **T-MOD-3** **clos** |
| Registre serveur : seule **`kpi-live-banner`** **actif** ; autres clés PRD §7 en **réservé** | **L-05** | **Story 9.6** · **T-MOD-5** · Epic **4** (pilote **done**) | **9-6** **backlog** · **epic-4** **done** | Whitelist code = tableau [`05`](05-MOD-registre-module-key.md) §3 ; promotion **actif** par clé produit avec schéma JSON ; `GET/PATCH module-config` opérationnels pour clés activées ; clé inconnue → 404/403 ; NFKC | **Dev API** · **Product** (périmètre clés) | [`05-MOD-registre-module-key.md`](05-MOD-registre-module-key.md) · [`09`](09-MOD-lacunes-et-questions-ouvertes.md) §6.1 T-MOD-5 | [`22`](22-MOD-dossier-architecte-pont-t-mod.md) **T-MOD-5** |
| Schémas JSON config absents pour clés **réservées** (`cashflow`, `reception`, `comptage-pieces-billets`, `helloasso`, `eco-organismes`, `adherents`, `synchronisation-paheko`, `config-admin-simple`) | **L-06** | **Story 9.6** · **9-1**…**9-5** *(backlog)* · **T-MOD-3** | **epic-9** **backlog** · **9-6** **backlog** | Fichiers `references/config-modules-site-id/schemas/{module_key}.v*.json` pour chaque clé **activée** ; validation payload impossible → **résolu** par schéma + tests ; alignement PRD §7.1 | **Dev API** · **Architecte** | [`05-registre`](05-MOD-registre-module-key.md) §3 · [`09`](09-MOD-lacunes-et-questions-ouvertes.md) §3 · [`18-MOD-config-modules-crosswalk.md`](18-MOD-config-modules-crosswalk.md) §7 **livré** | [`22`](22-MOD-dossier-architecte-pont-t-mod.md) **T-MOD-3** / **T-MOD-5** |
| Précédence non tranchée : `sites.configuration` vs JSON `module_key` vs surcharges PostgreSQL ADR P2 vs défauts manifests CREOS | **L-07** | **Story 9.6** · **Epic 2** (persistance) · **AR45** | **9-6** **backlog** | Ordre de merge **déterministe** documenté et implémenté (réponse **Q-HITL-03**) ; ADR complémentaire ou section registre sans ambiguïté ; Story 9.6 AC « merge sur défauts manifest build » satisfait | **Strophe** (HITL) · **Architecte** | [`03-MOD-protocole-backend.md`](03-MOD-protocole-backend.md) §8 D.3.5 · [`05-registre`](05-MOD-registre-module-key.md) · [`09`](09-MOD-lacunes-et-questions-ouvertes.md) §4.2, §5.1 Q-HITL-03 · [`18`](18-MOD-config-modules-crosswalk.md) §5 | [`22`](22-MOD-dossier-architecte-pont-t-mod.md) **T-MOD-4** (dépend **Q-HITL-03**) |
| Double chemin activation bandeau : `bandeau_live_slice_enabled` + `PATCH bandeau-live-slice` vs cible `module_key=kpi-live-banner` | **L-08** | **Story 9.6** (**T-MOD-4**) · **Story 4.5** (toggle transitoire — **done**) | **9-6** **backlog** · **4-5** **done** | Panneau SuperAdmin « Gestion des modules » (périmètre simple PRD §7.1) ; migration toggle 4.5 → `patchSiteModuleConfig` ; un seul chemin d’activation documenté en prod ; traçabilité auteur / date / motif | **Dev full-stack** · **Product** | [`05-registre`](05-MOD-registre-module-key.md) §5.1, §6 migration · [`09`](09-MOD-lacunes-et-questions-ouvertes.md) §6.1 T-MOD-4 · [`18`](18-MOD-config-modules-crosswalk.md) §4 · stories **4-5**, **4-6** *(done)* | [`22`](22-MOD-dossier-architecte-pont-t-mod.md) **T-MOD-4** — hub Story **9.6** |
| Convention unique d’enregistrement routes / services « module optionnel » (éviter réinvention par epic) | **L-09** | **Epic 4** (template **done**) · **3-3** (registre **done**) · futures **9-x** / modules métier | **epic-4** **done** · **3-3** **done** · **epic-9** **backlog** | Section normative dans `03` (package `api_v2`, prefix OpenAPI, `module_key`, feature flag) **validée HITL** ; au moins **un** exemple complet cité (bandeau = Epic **4-1**…**4-6b**) ; cookbook § back renvoie sans second pattern | **Architecte** · **Dev API** | [`03-MOD-protocole-backend.md`](03-MOD-protocole-backend.md) §6 · [`06-cookbook`](06-MOD-cookbook-nouveau-module-optionnel.md) · [`11-MOD-synthese-recherches-modularite.md`](11-MOD-synthese-recherches-modularite.md) §6.1 · [`20`](20-MOD-peintre-code-refs-bandeau-live.md) | [`22`](22-MOD-dossier-architecte-pont-t-mod.md) **T-MOD-1** (protocole livré) |
| Protocoles **slice** (header) vs **workflow step** (clôture) partiellement séparés — risque de modéliser la clôture comme simple widget | **L-10** | **Epic 6** (clôture) · **T-MET-1** · **Epic 4** (slice — **done**) | **epic-6** **done** (impl. comptage **pas** lancée) · **epic-4** **done** | Validation architecte sur [`08`](08-MOD-exemple-pilote-comptage-pieces-billets.md) ; réponses **Q-HITL-09**–**11** ; distinction `02` §4.5 / `04` §9 **confirmée** ; stories BMAD comptage **créées après** HITL | **Architecte externe** · **Strophe** | [`08-MOD-exemple-pilote-comptage-pieces-billets.md`](08-MOD-exemple-pilote-comptage-pieces-billets.md) · [`02-MOD-taxonomie-types-de-modules.md`](02-MOD-taxonomie-types-de-modules.md) · [`04-MOD-protocole-front-creos.md`](04-MOD-protocole-front-creos.md) §9 · [`06`](06-MOD-cookbook-nouveau-module-optionnel.md) §10 | [`22`](22-MOD-dossier-architecte-pont-t-mod.md) **T-MET-1** |
| CI de validation des schémas / manifests **CREOS** — Epic 10 backlog | **L-11** | **Story 10.3** (manifests CREOS) · **Story 10.1** (CI minimale) · **Story 1.4** (**done**) | **epic-10** **backlog** · **10-3** **backlog** · **1-4** **done** | Pipeline vérifie schémas CREOS + contraintes structurelles ; `operation_id` manifest ↔ `operationId` OpenAPI même snapshot ; régression manifests **bloquante** en CI (NFR28 / AR18) | **Plateforme / DevOps** · **Dev front** | [`04-MOD-protocole-front-creos.md`](04-MOD-protocole-front-creos.md) § CI · [`09`](09-MOD-lacunes-et-questions-ouvertes.md) §3 · [`21-MOD-gouvernance-contrats-modules.md`](21-MOD-gouvernance-contrats-modules.md) **livré** | [`22`](22-MOD-dossier-architecte-pont-t-mod.md) — Epic **10** |
| Libellé protocole **outbox SQL** vs **Redis Streams** pour transport Paheko ambigu | **L-12** | **Epic 8** (**done**) · **Epic 22** (**done**) · **Story 25-3** ADR async (**done**) | **epic-8** **done** · **epic-22** **done** | Libellé nominal aligné PRD + ADR sync dans `03` §7 et doc migration ; pas de réintroduction Pluggy / EventBus v0.1 ; réponse **Q-HITL-04** | **Architecte** · **Strophe** (ADR) | [`03-MOD-protocole-backend.md`](03-MOD-protocole-backend.md) §7 · [`07-adr`](07-MOD-adr-reconciliation-v01-v02.md) · [`references/migration-paheko/`](../migration-paheko/index.md) | — (doc migration + `03`) |
| Tests d’**interactions inter-modules** (bus, ordre d’activation) absents | **L-13** | **Story 9.8** (cohérence epic 9) · stories **post-socle** *(à créer)* | **9-8** **backlog** · **epic-9** **backlog** | Suite de tests (ou epic dédié) couvrant ordre activation / dépendances `module_key` ; non bloquant pour **9.6** mais requis avant industrialisation large modules | **QA** · **Architecte** | [`09`](09-MOD-lacunes-et-questions-ouvertes.md) §3 · [`06-cookbook`](06-MOD-cookbook-nouveau-module-optionnel.md) *(renvoi tests)* | — ; post **9.6** |
| **Marketplace / modules tiers** — hors v2 ; ne pas figer trop tôt les APIs config | **L-14** | **Epic 20** *(backlog)* · hypothèse post-v2 · **pas** de story 9.6 | **epic-20** **backlog** | Aucun état `listed` / `licensed` imposé dans v2 sans décision **Q-HITL-08** ; fiche citation post-v2 livrée ; **L-14** clôturé doc (interfaces v2 sans marketplace) | **Strophe** · **Product** | [`14-MOD-marketplace-post-v2-fiche-citation.md`](14-MOD-marketplace-post-v2-fiche-citation.md) · `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md` · [`13-idees-kanban`](13-MOD-idees-kanban-modules-liens.md) | — doc **clôturée** v2 |
| **Framework plugins** Paheko + Recyclique (bundles, Pluggy) — aucune solution retenue v2 | **L-15** | **Aucune story v2** — idée kanban · **Epic 9** hors scope | **epic-9** **backlog** (sans story dédiée) | Décision maintenue : **CREOS + registre `module_key`**, pas framework TOML ; fiche kanban à jour ; **pas** d’implémentation tant que **L-03** / **T-MOD-2** non clos | **Strophe** · **Product** | [`13-MOD-idees-kanban-modules-liens.md`](13-MOD-idees-kanban-modules-liens.md) · [`09`](09-MOD-lacunes-et-questions-ouvertes.md) §9–§10 · [`11-synthese`](11-MOD-synthese-recherches-modularite.md) §6.2 | — ; lié **T-MOD-2** via **L-03** |

---

## Story 9.6 — critères agrégés (T-MOD-4)

Extrait [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) §6.1 — la story **9-6** est le **hub d’implémentation** pour la ligne de lacunes suivantes :

| T-MOD / lacune | Couvert par 9.6 quand… |
|----------------|-------------------------|
| **T-MOD-4** / **L-08** | Toggle 4.5 migré ; UI modules simple ; merge PG P2 + manifests |
| **L-04**, **L-06** | OpenAPI + schémas alignés sur panneau admin (souvent **même** livraison ou juste après **Q-HITL-03**) |
| **L-05**, **L-07** | Whitelist et précédence opérationnelles en prod |
| **L-03** | **Non** — ADR-007 doit être **Accepted** **avant** promotion BMAD large (§7.1 `09`) |

**Acceptance Criteria (source)** : [`_bmad-output/planning-artifacts/epics.md`](../../_bmad-output/planning-artifacts/epics.md) — Story **9.6** (config admin simple, ADR P2 PostgreSQL, traçabilité).

---

## Chaîne pilote déjà livrée (référence matrice)

Les stories **done** ci-dessous **ne ferment pas** les lacunes **L-03**–**L-15** seules ; elles fournissent la **preuve** et la **dette** documentée :

| Story | Statut | Apport / dette pack |
|-------|--------|---------------------|
| **1-4** | **done** | Gouvernance OpenAPI / CREOS / ContextEnvelope — prérequis **L-04**, **L-11** |
| **3-3** | **done** | Registre widgets / slots — prérequis **L-09**, Epic 4 |
| **4-1** … **4-6b** | **done** | Chaîne 7 briques pilote #1 — source **L-08** (toggle **4-5**) ; template **L-09** |

---

## Priorisation HITL (lien **Q-HITL-13**)

| Ordre suggéré | Action | Lacunes touchées |
|---------------|--------|------------------|
| 1 | Accepter **ADR-007** + trancher **Q-HITL-03** | **L-03**, **L-07** |
| 2 | **Create-story** / exécuter **9.6** | **L-04**–**L-08**, **L-05**, **L-06** |
| 3 | Fusion OpenAPI (**T-MOD-3**) si non incluse dans 9.6 | **L-04** |
| 4 | **Epic 10** (CI CREOS) quand manifests stabilisés | **L-11** |
| 5 | Post-v2 / kanban seulement | **L-14**, **L-15** |

---

## Références `refs_first`

| Document | Usage |
|----------|--------|
| [`sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml) | Statuts sprint (recouper `last_updated` racine) |
| [`epics.md`](../../_bmad-output/planning-artifacts/epics.md) | Epic **3**, **4**, **9**, **10** ; stories **1.4**, **3.3**, **4.1**–**4.6b**, **9.6** |
| [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) | Tableau §3 · T-MOD §6 · promotion §7 |
| [`05-MOD-registre-module-key.md`](05-MOD-registre-module-key.md) | Statuts **actif** / **réservé** · mapping stories **4-x** / **9.6** |
| [`18-MOD-config-modules-crosswalk.md`](18-MOD-config-modules-crosswalk.md) | Owner **L-04** / **L-06** — crosswalk livré |
| [`22-MOD-dossier-architecte-pont-t-mod.md`](22-MOD-dossier-architecte-pont-t-mod.md) | Pont T-MOD/T-MET exécutable |
| [`index.md`](index.md) | Instantané Epic 4 · stratégie `refs_first` |

---

_Matrice gaps — chantier enrichissement pack modules. Ne pas confondre avec le fichier story BMAD `9-6-*.md` (à créer via `bmad-create-story` après HITL)._
