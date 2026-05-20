# 14 — Fiche citation — marketplace post-v2 (Recyclique + outillage Cursor)

**Statut :** fiche citation du pack `references/protocole-modules-recyclique/` — **hors procédure**  
**Date :** 2026-05-20  
**Audience :** architecte, product, agents Cursor — lecture **après** le parcours v2 opérationnel  
**Rôle :** clôturer la lacune documentaire **L-14** (marketplace / modules tiers) par **citation** des sources BMAD et artefact mai 2026, sans ouvrir de procédure marketplace dans ce pack.

**Ce document ne remplace pas :** le cookbook v2 [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) (création / activation d’un module optionnel **first-party**). Pour tout travail d’implémentation v2, **commencer et finir par `06`**.

**Stratégie `refs_first` :** pas de copie intégrale des hypothèses BMAD ; chemins relatifs vers les sources listées en §8.

---

## 1. Périmètre et statut

| Élément | Position |
|---------|----------|
| **Hypothèse produit** | Distribution commerciale (vente, location) de **modules complémentaires** — **après** v2 stabilisée |
| **Engagement** | **Non engagée** tant qu’aucun cas business réel et qu’aucune étude explicite de l’écosystème cible (marketplace, exploitation, support, cloud/self-host) |
| **Backlog BMAD** | **Hors** périmètre v2 et stories courantes ; promotion = PRD addendum, ADR ou epic dédié (cf. déclencheurs §6) |
| **Pack protocole** | **Citation uniquement** — aucune checklist d’installation catalogue, licence ou publication d’artefacts tiers |

Source maître : [`_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md`](../../_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md).

---

## 2. Deux « marketplaces » à ne pas confondre

| Périmètre | Où | Rapport avec Recyclique |
|-----------|-----|-------------------------|
| **Plateforme d’extensions Recyclique** (hypothèse post-v2) | Catalogue, licences, billing, artefacts signés — **client** dans chaque installation | Produit terrain / ressourcerie ; **orthogonale** au métier dépôt-caisse |
| **Marketplace [cursor.com/marketplace](https://cursor.com/marketplace)** | Plugins MCP, automations cloud, canvas IDE | **Outillage** dev/CI/doc pour le chantier JARVOS — **pas** le modèle de distribution des modules Recyclique |

Évaluation outillage Cursor (mai 2026) : [`references/artefacts/2026-05-20_02_marketplace-cursor-com-evaluation-jarvos.md`](../artefacts/2026-05-20_02_marketplace-cursor-com-evaluation-jarvos.md). Complément BMAD local : [`2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md`](../artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md).

**Règle de lecture :** installer Sonatype, Modern Web Guidance ou des automations CI depuis Cursor **ne préfigure pas** l’API d’un futur store modules Recyclique.

---

## 3. Séparation des domaines (citation)

Quatre domaines à garder **distincts** — ne pas les fusionner dans une seule couche « modules » :

| Domaine | Rôle | Autorité |
|---------|------|----------|
| **Cœur Recyclique** | API métier, données, authz terrain, audit métier, intégrations Paheko | Vérité métier (« ce qui est vrai » sur le terrain) |
| **Installation cliente** | Instance self-host ou cloud managé par ressourcerie | Config locale, modules installés, admin locale |
| **Plateforme d’extensions** *(hypothèse)* | Catalogue, licences, billing, publication d’artefacts, confiance | **Orthogonale** au métier ; client dans l’installation |
| **Peintre_nano** | CREOS, widgets, rendu | v2 : build-time ; post-v2 : **chargement contrôlé** d’extensions, sans remplacer les contrats |

**Auth utilisateurs / authz métier** : restent sur **Recyclique**. **Licence / abonnement module** (qui a payé, jusqu’à quand, sur quelle instance) = problème **séparé**, branché sur endpoints ou service dédié — **pas** de pollution des tables métier sans design explicite.

---

## 4. Nature d’un futur module complémentaire (citation)

Un module complémentaire **complet** n’est pas un simple widget front. Il peut regrouper :

- package UI ;
- contrats (`OpenAPI`, `CREOS`, schémas, capabilities) ;
- extension backend ;
- installation / migration et surfaces d’administration.

Conséquence pour la v2 : le fil conducteur reste la **chaîne 7 briques** et le registre `module_key` (voir **`06`**). L’hypothèse post-v2 suppose une évolution du **runtime frontend**, de la **distribution d’artefacts**, de la **compatibilité** et de l’**admin** — **pas** une refonte du cœur métier si les frontières v2 restent propres.

Alignement v2 déjà préparé (sans implémenter le marketplace) :

- contrats stables (`operationId`, CREOS, `data_contract`) ;
- levier « capacité activée » (famille Epic 4.5 → Epic 9) réutilisable comme piste **entitlement** future ;
- **refus explicite v2** du chargement dynamique de manifests **tiers hors build** — ouverture future **sous gouvernance**, pas dette implicite du sprint.

---

## 5. L-14 — Interfaces et modèles à **ne pas figer** en v2

Objectif : éviter de **geler** dans OpenAPI, schémas JSON `module_key`, CREOS ou tables métier des formes qui **présument** une marketplace complète avant décision produit.

### 5.1 États et APIs d’entitlement commerciale

**Ne pas** imposer dans les contrats v2 une hiérarchie complète du type :

`listed` → `downloaded` → `installed` → `compatible` → `licensed` → `enabled_by_admin` → `visible_in_ui`

| État (hypothèse post-v2) | Question | Autorité (future) |
|--------------------------|----------|-------------------|
| `listed` | Existe dans le catalogue ? | Plateforme d’extensions |
| `downloaded` / `installed` | Artefact sur l’instance ? | Installation cliente |
| `compatible` | Version OK pour la stack ? | Vérification locale + contrats |
| `licensed` | Droit d’usage payant ? | Plateforme d’extensions |
| `enabled_by_admin` | Activé localement ? | Recyclique / config |
| `visible_in_ui` | Exposé dans l’UI ? | Runtime + Peintre |

**v2 acceptable :** `enabled` / toggle admin / registre serveur + JSON ADR-001 (cf. **`06`** Phase 6, Story 9.6). **v2 à éviter :** champs ou ops dédiés `listed`, `licensed`, `catalog_version`, webhook billing, sans **Q-HITL** explicite (question ouverte : `09` §5.2 **Q-HITL-08** — trancher avant d’étendre l’API config).

### 5.2 Surfaces API et persistance

| Zone | Ne pas figer prématurément | Alternative v2 |
|------|----------------------------|----------------|
| **OpenAPI Recyclique** | Routes catalogue public, sync licence, upload artefact module tiers | `module-config/{module_key}` + ops métier existantes ; fusion post-HITL (`21`, T-MOD-3) |
| **JSON `module_key`** | Payload type « abonnement », SKU, dates de licence, dépendances marketplace | Schémas **par module** (ex. `kpi-live-banner`) — préférences UI / activation locale |
| **Tables métier** | Colonnes licence, provenance package, graphe `depends` marketplace | Données métier module (ex. comptage clôture) ; config UI ≠ god-namespace |
| **CREOS / Peintre** | Chargement runtime manifests **tiers hors build** | Build-time + registre widgets ; slice Epic 4 comme template |
| **Backend Python** | `ModuleBase` normatif, loader `module.toml`, entry points `recyclic.modules` découverte tiers | Routers FastAPI + feature flags + registre `05` |
| **Transport async** | EventBus Redis générique « plugins » | Événements métier + outbox Paheko (`03`, **`06`** §9) |

### 5.3 Sécurité et gouvernance (rappel — pas d’impl v2)

Invariants à poser **avant** ouverture large (citation hypothèse §6) : signature / provenance, compatibilité versionnée shell/module/backend, API bornée au module, kill-switch local, traçabilité install/update/activate, révocation. **Aucun** choix technique figé ici (`micro-frontend`, packages signés, sidecar, etc.).

### 5.4 Checklist agent / dev (v2)

Avant de merger une story touchant `module-config`, CREOS ou OpenAPI :

1. La modification sert-elle un **module first-party v2** documenté dans **`06`** ?
2. Introduit-elle un état ou une route qui **suppose** catalogue tiers, licence commerciale ou chargement dynamique hors build ?
3. Si oui → **stop** ; noter besoin post-v2 ; lire cette fiche + source BMAD ; ne pas étendre le registre `05` sans HITL.

---

## 6. Déclencheurs de promotion (citation)

Promouvoir en PRD addendum, ADR ou epic lorsqu’**au moins un** cas devient réel :

1. premier module **payant** ou loué ;
2. chargement d’artefact **hors dépôt principal** ;
3. gestion **compatibilité multi-versions** shell / module / backend ;
4. **révocation** ou contrôle de licence à l’échelle instance ;
5. **extension backend distribuée** indépendante du cœur par défaut.

Tant que ces déclencheurs sont absents : ce document + l’hypothèse BMAD restent un **cadrage**, pas un chantier.

---

## 7. UX produit plausible (citation — non normatif)

Une installation pourrait exposer une **page locale** (catalogue, install, activation, licences, compatibilité, historique) en **client** de la plateforme d’extensions — pas la plateforme elle-même. **Aucune** maquette ni spec UI imposée par ce pack.

Idées Kanban liées (store, plugins) : [`13-MOD-idees-kanban-modules-liens.md`](13-MOD-idees-kanban-modules-liens.md) — pont uniquement, pas duplication des fiches idées.

---

## 8. Outillage Cursor marketplace (synthèse artefact 02)

Usage **recommandé** pour le repo JARVOS (développement / qualité), **sans** lien contractuel avec le futur store Recyclique :

| Priorité | Extension (cursor.com) | Usage |
|----------|------------------------|--------|
| 1–2 | Sonatype, Modern Web Guidance | Sécurité deps ; qualité web Peintre |
| 3–5 | Add test coverage, Fix CI failures, Generate docs | Gates pytest / CI / sync `references/` |
| 6–7 | Docs Canvas, PR Review Canvas | Lecture pack architecte ; revues epic |
| 8–10 | Remediate vulnerabilities, Monitor invariants, Cursor SDK | Boucle sécurité ; invariants projet ; scripts légers |

**Ne pas remplacer :** `@bmad-epic-runner`, `qa2-orchestrator`, skills projet `.cursor/skills/`. **Écarter par défaut** : Linear, Slack, Datadog, Stripe, e-commerce — backlog = `epics.md` + BMAD, pas outils SaaS parallèles.

---

## 9. Renvois pack et BMAD

| Besoin | Document |
|--------|----------|
| **Implémenter ou activer un module v2** | [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) |
| Matrice v0.1 / v2 / post-v2 par dimension | [`01-MOD-matrice-choix-modularite.md`](01-MOD-matrice-choix-modularite.md) §3.1, §7 |
| Pont idées Kanban | [`13-MOD-idees-kanban-modules-liens.md`](13-MOD-idees-kanban-modules-liens.md) |
| Gaps sprint × L-ID | [`15-MOD-matrice-gaps-bmad-story-9-6.md`](15-MOD-matrice-gaps-bmad-story-9-6.md) |
| Porte d’entrée pack | [`index.md`](index.md) — hors-scope marketplace inchangé |

| Source externe pack | Chemin |
|---------------------|--------|
| Hypothèse BMAD | [`post-v2-hypothesis-marketplace-modules.md`](../../_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md) |
| Évaluation Cursor.com | [`2026-05-20_02_marketplace-cursor-com-evaluation-jarvos.md`](../artefacts/2026-05-20_02_marketplace-cursor-com-evaluation-jarvos.md) |

---

_Fiche citation L-14 — ne pas confondre avec une procédure marketplace. Pour l’exécution v2 : **`06`**._
