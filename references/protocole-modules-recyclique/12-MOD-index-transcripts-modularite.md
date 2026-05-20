# Index transcripts Cursor — modularité Recyclique

**Date :** 2026-05-20  
**Rôle :** repères conversationnels (disque Cursor) pour le pack [`references/protocole-modules-recyclique/`](index.md) — décisions terrain, pivots et écarts **prévu / livré**, sans recopier les chats.  
**Source disque :** `%USERPROFILE%\.cursor\projects\d-users-Strophe-Documents-1-IA-La-Clique-Qui-Recycle-JARVOS-recyclique\agent-transcripts\`

Les titres ci-dessous sont des **libellés de reprise** (extrait du premier message utilisateur) ; l’UI Cursor n’expose en général pas de titre dans les `.jsonl`.

---

## Tableau synthèse

| UUID | Titre (reprise) | Date approx. | Thèmes | Décisions clés | Liens pack |
|------|-----------------|--------------|--------|----------------|------------|
| `0c9a9709-d1f8-406b-a9ea-26ff2c59a7fd` | [Bandeau KPI live mutualisé](0c9a9709-d1f8-406b-a9ea-26ff2c59a7fd) | 2026-04-19 | Slice transverse ; caisse + réception ; admin « Gestion des modules » ; poll unifié Legacy | Mutualiser `CashKPIBanner` / `ReceptionKPIBanner` 1.4.4 → `KpiLiveStrip` ; un bandeau, plusieurs écrans ; toggles caisse/réception + intervalle (transitoire `localStorage`) ; route CREOS `/admin/modules` | [04](04-MOD-protocole-front-creos.md), [05](05-MOD-registre-module-key.md), [08](08-MOD-exemple-pilote-comptage-pieces-billets.md), [06](06-MOD-cookbook-nouveau-module-optionnel.md) |
| `7f711038-9b17-4fcc-a327-5a9a52e71817` | [Commit pack config-modules](7f711038-9b17-4fcc-a327-5a9a52e71817) | 2026-04-23 | `site_id` / `module_key` ; ADR-001 ; index `references/` ; Kanban / docs | Publier `references/config-modules-site-id/` + redirect QA2 ; schéma `kpi-live-banner` ; brouillon OpenAPI module-config ; séparer commits Kanban vs pack modules | [05](05-MOD-registre-module-key.md), [01](01-MOD-matrice-choix-modularite.md), [07](07-MOD-adr-reconciliation-v01-v02.md), [09](09-MOD-lacunes-et-questions-ouvertes.md) |
| `557456c1-20f8-4b56-b55f-233b00fec22a` | [HelloAsso module optionnel](557456c1-20f8-4b56-b55f-233b00fec22a) | 2026-04-12 | Intégration tierce ; Paheko local vs plugin cloud ; Epic 9 ; webhooks | Pas de plugin HelloAsso Paheko (cloud only) → pont **HelloAsso → Recyclique → Paheko** ; module **optionnel** (app utilisable sans config) ; livraison par **vagues** (adhésion/dons d’abord) ; recherche Perplexity archivée sous `references/recherche/` | [05](05-MOD-registre-module-key.md) (`helloasso`), [03](03-MOD-protocole-backend.md), [09](09-MOD-lacunes-et-questions-ouvertes.md), [02](02-MOD-taxonomie-types-de-modules.md) |
| `2075d9e8-6eb4-4ac9-999b-a685ca1ad5a8` | [Modules prévus vs livrés](2075d9e8-6eb4-4ac9-999b-a685ca1ad5a8) | 2026-03-16 | v0.1 TOML/`ModuleBase` vs réalité ; emballement BMAD ; dump 1.4.4 ; Correct Course | Design **modulaire v0.1** (TOML, EventBus) ≠ schéma BDD ni dump prod ; epics 1–11 « done » sans validation terrain → audit + **Epic 19** ; garder l’infra, corriger par stories ciblées ; adaptateur dump 1.4.4 = P3 / hors MVP immédiat | [01](01-MOD-matrice-choix-modularite.md), [07](07-MOD-adr-reconciliation-v01-v02.md), [09](09-MOD-lacunes-et-questions-ouvertes.md) |
| `c8a645ab-a1ff-4d86-a559-4362f9c8c30b` | [Cartographie modules chantier protocole](c8a645ab-a1ff-4d86-a559-4362f9c8c30b) | 2026-05-20 | Cartographie sources modularite ; workers BMAD/docs/transcripts ; QCM HITL bouclage ; ADR-007 ; pack protocole | 4 workers paralleles (BMAD, `references/`, recherche, transcripts) sans livrables fichiers initiaux ; QCM **8/8 reponse A** -> **ADR-007 Accepted**, `module-config` **interne** jusqu'a **9.6**, ordre **P0** ADR + fusion OpenAPI puis story seed **9.6** | [00](00-MOD-cadrage-chantier.md), [07](07-MOD-adr-reconciliation-v01-v02.md), [09](09-MOD-lacunes-et-questions-ouvertes.md), [reco 06](../artefacts/2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md) |
| `242de5e4-0344-4a77-8453-fbde98f78a8a` | [Brainstorming CREOS modularité](242de5e4-0344-4a77-8453-fbde98f78a8a) | 2026-03-31 | Pivot v2 ; Peintre intégral ; CREOS ; preuves modulaires ; config admin | **Toute l’UI v2** sur Peintre_nano (login → dernier écran) ; richesse moteur **progressive** (pas la couverture écran) ; modularité : base solide + **activation/désactivation** (visée réorg.) ; preuves : éco-org + **bandeau live** + adhérents ; métier/Paheko > UI ; zéro fuite de contexte multi-site | [01](01-MOD-matrice-choix-modularite.md), [02](02-MOD-taxonomie-types-de-modules.md), [04](04-MOD-protocole-front-creos.md), [07](07-MOD-adr-reconciliation-v01-v02.md), [08](08-MOD-exemple-pilote-comptage-pieces-billets.md) |

---

## Détail par transcript

### [Bandeau KPI live mutualisé](0c9a9709-d1f8-406b-a9ea-26ff2c59a7fd) — ~2026-04-19

**Thèmes :** extraction bandeau violet « Live » Legacy 1.4.4 (caisse + réception) ; domaine Peintre `bandeau-live` ; pattern **un module, plusieurs hôtes** (caisse, réception, widget déclaratif) ; panneau SuperAdmin imbriqué dans l’écosystème « gestion des modules ».

**Décisions clés**

- Unifier les deux implémentations Legacy (polling `GET /v1/stats…`) dans **`KpiLiveStrip` + `useUnifiedLiveKpiPoll`**, branché d’abord sur la caisse V2 puis la réception (même hook, `siteId` via `ContextEnvelope`).
- Introduire une page transverse **`/admin/modules`** (CREOS + nav) comme **premier panneau « module »** : toggles affichage caisse/réception et période de rafraîchissement — modèle mental pour Story 9.6 / JSON `site_id` ultérieur.
- Persistance **transitoire navigateur** (`localStorage`, clé `pn.kpiLiveBundle.settings.v1`) : documente l’écart explicite vers activation serveur ([`05-registre`](05-MOD-registre-module-key.md), ADR-001).
- UX bandeau : supprimer le libellé « Actualisation… » ; LED + clignotement pendant refresh ; corriger la propagation des toggles (`useSyncExternalStore`, gating aussi sur `BandeauLive.tsx`).

**Liens pack :** pilote #1 Epic 4 → [04-protocole-front-creos](04-MOD-protocole-front-creos.md), registre `kpi-live-banner` → [05-registre-module-key](05-MOD-registre-module-key.md), distinction slice vs workflow step → [08-exemple-pilote](08-MOD-exemple-pilote-comptage-pieces-billets.md).

---

### [Commit pack config-modules](7f711038-9b17-4fcc-a327-5a9a52e71817) — ~2026-04-23

**Thèmes :** gouvernance `references/` ; session longue (Kanban, PRD permissions, git) ; **commit dédié** du dossier `config-modules-site-id` ; cohérence index vs fichiers réellement versionnés.

**Décisions clés**

- Livrer sur `master` le **pack documentaire** `references/config-modules-site-id/` : **ADR-001** (JSON par `site_id` + `module_key`), schéma **`kpi-live-banner.v1.json`**, brouillon **`openapi-module-config.yaml`**, redirect artefact QA2.
- Ne pas mélanger dans le même commit : Kanban / audit API / règles Cursor — **commits séparés** pour traçabilité (`docs(references): Kanban…` puis `docs(references): pack config-modules…`).
- Corriger le risque **liens morts** : les index `references/` pointaient vers le dossier avant son ajout Git — le commit modules comble l’écart (lacune **L-04** du plan d’enrichissement).
- Contexte parallèle : branche `feat/peintre-nano-bandeau-kpi-live` (impl bandeau) distincte de la doc config — fil conducteur **doc normative d’abord**, impl Epic 4 / 9.6 ensuite.

**Liens pack :** [05-registre-module-key](05-MOD-registre-module-key.md), matrice v0.1/v2 → [01-matrice-choix-modularite](01-MOD-matrice-choix-modularite.md), réconciliation TOML → CREOS+JSON → [07-adr-reconciliation-v01-v02](07-MOD-adr-reconciliation-v01-v02.md), toggles / Story 9.6 → [09-lacunes-et-questions-ouvertes](09-MOD-lacunes-et-questions-ouvertes.md).

---

### [HelloAsso module optionnel](557456c1-20f8-4b56-b55f-233b00fec22a) — ~2026-04-12

**Thèmes :** recherche technique BMAD ; spec [`references/migration-paheko/2026-04-12_specification-integration-helloasso-recyclique-paheko.md`](../migration-paheko/2026-04-12_specification-integration-helloasso-recyclique-paheko.md) ; module métier **optionnel** ; marketplace post-v2 (citation seulement).

**Décisions clés**

- **Abandon** de la piste plugin Paheko HelloAsso (extension cloud, incompatible Paheko **local** self-host) : orchestration **Recyclique** obligatoire entre HelloAsso API v5 et Paheko REST.
- Définir « optionnel » produit : **pas de régression** si l’asso ne configure pas HelloAsso (Epic 9 en backlog ; cœur caisse/réception/Paheko autonome).
- Architecture cible : webhooks signés + outbox / mappings existants (Epic 8) ; UI et enregistrements métier côté Recyclique ; compta via chaîne Paheko déjà normée.
- Archiver la recherche externe : renommage conventionnel `references/recherche/2026-04-12_helloasso-api-v5-paheko-perimetre-recyclique_perplexity_reponse.md` + index — alimente le registre placeholder `helloasso` sans impl prématurée.

**Liens pack :** [05-registre-module-key](05-MOD-registre-module-key.md), checklist back (routes, webhooks, feature flags) → [03-protocole-backend](03-MOD-protocole-backend.md), questions ouvertes Epic 9 / promotion BMAD → [09-lacunes-et-questions-ouvertes](09-MOD-lacunes-et-questions-ouvertes.md), type « module métier back » → [02-taxonomie-types-de-modules](02-MOD-taxonomie-types-de-modules.md).

---

### [Modules prévus vs livrés](2075d9e8-6eb4-4ac9-999b-a685ca1ad5a8) — ~2026-03-16

**Thèmes :** agent analyste BMAD ; bilan après epics 1–18 ; écart **refactor sur base 1.4.4** vs nouvelle BDD ; modularité **prévue** (TOML, `ModuleBase`, slots React) vs stack **livrée** ; procédure Correct Course.

**Décisions clés**

- Constat : le **système modulaire v0.1** du design fév. 2026 n’a pas été le fil conducteur de l’implémentation (schéma SQL neuf, import dump prod **impossible** sans adaptateur dédié).
- Ne pas « table rase » : **conserver** Docker, API FastAPI, auth, outbox Paheko, tests — corriger par **Epic 19** et validation terrain **story par story** (fin de l’enchaînement automatique).
- Séparer dette **produit** (caisse/réception KO) et dette **doc/archi modules** : input Correct Course + audit `references/artefacts/2026-03-16_audit-fonctionnel-terrain.md`.
- Reporter l’adaptateur dump 1.4.4 en **P3** (critique prod, hors MVP) — préfigure la reconciliation [01](01-MOD-matrice-choix-modularite.md) / [07-adr](07-MOD-adr-reconciliation-v01-v02.md).

**Liens pack :** tableau v0.1/v2/abandonné → [01-matrice-choix-modularite](01-MOD-matrice-choix-modularite.md), ADR brouillon TOML vs CREOS → [07-adr-reconciliation-v01-v02](07-MOD-adr-reconciliation-v01-v02.md), T-MOD-* et lacunes → [09-lacunes-et-questions-ouvertes](09-MOD-lacunes-et-questions-ouvertes.md).

---

### [Brainstorming CREOS modularité](242de5e4-0344-4a77-8453-fbde98f78a8a) — ~2026-03-31

**Thèmes :** reprise `_bmad-output/brainstorming/` + plans cadrage v2 ; rôles **Recyclique / Paheko / Peintre_nano / CREOS** ; feuille de route modularité et preuves ; bureaux d’étude (audit back, rétro Paheko).

**Décisions clés**

- **Pivot v2** : modularité = socle (contrats OpenAPI, manifests CREOS, activation par site) — pas le monolithe `module.toml` / `ModuleBase` comme UI runtime.
- **Couverture UI** : en v2, **100 % des écrans** passent par Peintre ; seules les **capacités** du moteur (config avancée, composition riche, agents) sont phasées — corrige l’ambiguïté « progressif » de la Phase 1.
- Config admin minimale vendable : **A** activer/désactiver modules, **visée B** réorganisation légère ; preuves modulaires : **déclaration éco-organismes**, **bandeau live**, **adhérents**.
- Invariants : métier Recyclique + Paheko compta > UI ; **zéro fuite de contexte** multi-site/caisse/opérateur ; résilience sync (données locales conservées).

**Liens pack :** taxonomie slices / workflow / domaines → [02-taxonomie-types-de-modules](02-MOD-taxonomie-types-de-modules.md), protocole CREOS → [04-protocole-front-creos](04-MOD-protocole-front-creos.md), matrice et ADR → [01](01-MOD-matrice-choix-modularite.md) + [07](07-MOD-adr-reconciliation-v01-v02.md), pilote #2 → [08-exemple-pilote-comptage-pieces-billets](08-MOD-exemple-pilote-comptage-pieces-billets.md).

---

### [Cartographie modules chantier protocole](c8a645ab-a1ff-4d86-a559-4362f9c8c30b) — 2026-05-20

**Thèmes :** session longue de **cartographie** (BMAD PRD/epics/archi, `references/`, idées kanban, transcripts Cursor, contrats) pour le protocole « créer et brancher des modules optionnels » ; enchaînement **HITL post-bouclage** (QCM 8 questions, toutes réponse **A**) ; promotion doc pack `protocole-modules-recyclique/` et ordre d'exécution **P0 → P1**.

**Décisions clés**

- **Ne pas** recopier les chats dans le dépôt : index transcripts + artefacts datés (`2026-05-20_03`…`06`) comme repères.
- **ADR-007 Accepted** ; **DEC-03** (`module_key` JSON fait foi) ; **F1** API `module-config` **interne** jusqu'à Story **9.6** ; **F3** strict 1 key = 1 package.
- Ordre exécution figé : T-MOD-2 → T-MOD-3 (fusion OpenAPI) → T-MOD-1 → seed/exec **9.6** ; 2e module métier et marketplace **reportés**.
- Agents : lecture **05 loup de mer → 04 bouclage → 06 cookbook** (note reco 06).

**Liens pack :** cadrage [00-MOD-cadrage-chantier](00-MOD-cadrage-chantier.md), lacunes/T-MOD [09-MOD-lacunes-et-questions-ouvertes](09-MOD-lacunes-et-questions-ouvertes.md), reco HITL [2026-05-20_06](../artefacts/2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md), story seed [`9-6-config-admin-simple-modules.md`](../../_bmad-output/implementation-artifacts/9-6-config-admin-simple-modules.md).

---

## Chronologie utile (modularité)

```text
2026-03-16  modules prévu vs livré (TOML / emballement epics)
2026-03-31  brainstorming CREOS — pivot v2, preuves bandeau + éco
2026-04-12  HelloAsso module optionnel (recherche + spec)
2026-04-19  bandeau mutualisé + panneau « Gestion des modules »
2026-04-23  commit pack config-modules-site-id (ADR-001, schémas)
2026-05-20  cartographie modules + HITL bouclage (ADR-007, pack protocole P1)
```

---

## Méthode — skill `explorer-transcripts-cursor`

Index construit avec le skill [`.cursor/skills/explorer-transcripts-cursor/SKILL.md`](../../.cursor/skills/explorer-transcripts-cursor/SKILL.md) :

1. **Script** `index_transcripts.py` sur `--agent-transcripts` (métadonnées : `mtime_utc`, `first_user_snippet`, outils) — **sans** charger les JSONL entiers dans le contexte agent.
2. **`rg`** ciblé par UUID pour thèmes et formulations de décision.
3. **Lecture partielle** d’un seul `.jsonl` parent si besoin de précision (ici : extraits assistant déjà structurés).

**Limites à respecter**

- Pas de titre UI fiable dans les exports ; utiliser **[titre court](uuid)** pour les citations projet.
- Contenu possiblement `[REDACTED]` ; index = **repères**, pas archive légale.
- Ne pas publier d’extraits secrets (tokens, credentials) dans le dépôt.
- Les sous-agents (`subagents/*.jsonl`) ne sont pas indexés ici sauf besoin d’audit ponctuel.

**Regénération (PowerShell, racine dépôt) :**

```powershell
python .cursor/skills/explorer-transcripts-cursor/scripts/index_transcripts.py `
  --agent-transcripts "$env:USERPROFILE\.cursor\projects\d-users-Strophe-Documents-1-IA-La-Clique-Qui-Recycle-JARVOS-recyclique\agent-transcripts" `
  --limit 200
```

Pour un UUID connu, filtrer la sortie JSON ou ouvrir `agent-transcripts\<uuid>\<uuid>.jsonl` uniquement après sélection.

---

## Voir aussi

- Plan d’enrichissement : [00-MOD-plan-enrichissement-modules.md](00-MOD-plan-enrichissement-modules.md) (lacune « transcripts absents » → ce fichier).
- Config normative : [`references/config-modules-site-id/`](../config-modules-site-id/index.md).
- Artefacts mai 2026 (outillage / marketplace) : [`2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md`](../artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md), [`2026-05-20_02_marketplace-cursor-com-evaluation-jarvos.md`](../artefacts/2026-05-20_02_marketplace-cursor-com-evaluation-jarvos.md) — hors transcripts, complément post-v2.

---

_Index transcripts modularité — pack protocole modules Recyclique._
