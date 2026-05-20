# 13 — Pont idées Kanban ↔ pack protocole modules

**Statut :** brouillon normatif (enrichissement pack)  
**Date :** 2026-05-20  
**Audience :** Strophe, architecte, agents Cursor  
**Objectif :** relier **cinq fiches** `references/idees-kanban/` au pack `01` / `07-adr` / `09` **sans recopier** leur contenu (titres + résumés uniquement). Lecture cible : **≤ 2 pages**.

**Règle :** pour le détail d'une idée, ouvrir la fiche Kanban ; pour la norme v2, suivre le pack — pas l'inverse.

**Complète :** [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) §9 (citation minimale) ; ne pas dupliquer les tableaux HITL / T-MOD de `09`.

---

## 1. Tableau de liaison (synthèse)

| Idée (titre Kanban) | Stade kanban | Statut v2 / post-v2 / hors-scope | Fichiers pack | L-ID |
|---------------------|--------------|----------------------------------|---------------|------|
| **Plugin framework Recyclic** | `a-creuser` | **Hors-scope v2** — design v0.1 (TOML, `ModuleBase`, Pluggy) **remplacé** par CREOS + registre ; bundles Paheko+Recyclique **non retenus** | [`01`](01-MOD-matrice-choix-modularite.md) §3.1–3.2, §5, §7 ; [`07-adr`](07-MOD-adr-reconciliation-v01-v02.md) §1, §8, annexe C ; [`09`](09-MOD-lacunes-et-questions-ouvertes.md) §9–§10 | **L-15** |
| **Module store Recyclic** | `a-conceptualiser` | **Post-v2** — distribution optionnelle par ressourcerie (dépôt GitHub / catalogue) ; aligné **marketplace** complémentaire, pas le modèle d'activation v2 | [`01`](01-MOD-matrice-choix-modularite.md) §3.1 (entry points), §7 ; [`14`](14-MOD-marketplace-post-v2-fiche-citation.md) ; [`06`](06-MOD-cookbook-nouveau-module-optionnel.md) pour v2 | **L-14** |
| **Module correspondance Paheko** | `a-conceptualiser` | **v2** (périmètre **intégration / sync**, pas « plugin framework ») — traducteur métier → API Paheko ; chaîne **outbox** et mapping ; distinct du module décla éco-organismes | [`01`](01-MOD-matrice-choix-modularite.md) §3.4, §6 ; [`03`](03-MOD-protocole-backend.md) §10 ; [`05`](05-MOD-registre-module-key.md) (`synchronisation-paheko`, **réservé**) ; [`06`](06-MOD-cookbook-nouveau-module-optionnel.md) phase 9 | — *(T-5, Q-HITL-10 dans `09` §4–§5)* |
| **UI modulaire configurable** | `a-creuser` | **v2** — principe d'architecture **conservé** : slots nommés, lazy, un build ; **implémentation remplacée** par Peintre_nano + CREOS (`slot_id`, registre widgets) | [`01`](01-MOD-matrice-choix-modularite.md) §3.5, §4 briques 3–4 ; [`07-adr`](07-MOD-adr-reconciliation-v01-v02.md) §6 ; [`04`](04-MOD-protocole-front-creos.md) | — *(couvert par réconciliation v0.1↔v2, pas lacune dédiée)* |
| **IA / LLM modules intelligents** | `a-creuser` | **Hors-scope protocole modules v2** — décision produit / intégration Ganglion reportée ; imports intelligents = modules optionnels **à trancher** hors ce pack | [`09`](09-MOD-lacunes-et-questions-ouvertes.md) §9 | — |
| **Peintre gardien du seuil (conscience affichage)** | `a-creuser` | **v2** — couche agent « pense la page » ; hooks + bypass ; outils TBD ; complète modules/agents qui modifient l'UI | [`04`](04-MOD-protocole-front-creos.md) §17 · [`05-ARCH`](../dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md) §7.4 | **L-16** · **T-PEINT-1** |

**Chemins fiches Kanban :** `references/idees-kanban/<stade>/2026-02-24_<slug>.md` (index global : [`references/idees-kanban/index.md`](../idees-kanban/index.md)).

---

## 2. Résumés idées (une ligne chacune)

| Slug fiche | Résumé (non normatif) |
|------------|----------------------|
| `plugin-framework-recyclic` | Mécanisme technique pour combiner plugins Paheko + modules Recyclique (manifeste, lifecycle) ; recherche Pluggy/stevedore ; design fév. 2026 partiellement **obsolète** face à la ligne v2. |
| `module-store-recyclic` | Catalogue de modules optionnels par ressourcerie (codes-barres, imports, etc.) ; distribution via dépôt GitHub (placeholder Le Fil). |
| `module-correspondance-paheko` | Middleware traducteur objets Recyclique → appels API Paheko (caisse, ventes, poids) ; tableaux de correspondance ; **pas** synchroniseur BDD seul. |
| `ui-modulaire-configurable` | Contrainte : UI modulaire dès la conception (futur Peintre) ; pattern v0.1 : monorepo React, `ModuleSlot`, lazy routes. |
| `ia-llm-modules-intelligents` | LLM en 1.4.4 pour classification import ; futurs modules « intelligents » ; v0.1.0 = placeholder Ganglion, stratégie reportée. |
| `peintre-gardeien-seuil-conscience-affichage` | Gardien du seuil : agent valide/repense ergonomie avant rendu dynamique (widget, flow, manifest) ; réceptacles v2 même si bypass. |

---

## 3. Lecture croisée par statut

### 3.1 v2 — intégrer via le pack, pas via le framework plugins

- **Correspondance Paheko :** traiter comme **module métier backend** + sync ([`02-MOD-taxonomie-types-de-modules.md`](02-MOD-taxonomie-types-de-modules.md) §4) ; emprunter [`03-MOD-protocole-backend.md`](03-MOD-protocole-backend.md) §10 (outbox, mapping) et le cookbook phase 9. Clé registre voisine : **`synchronisation-paheko`** ([`05-MOD-registre-module-key.md`](05-MOD-registre-module-key.md) §3, **réservé**). Ne pas confondre avec **L-15** (framework multi-plugins).
- **UI modulaire :** la v2 **honore** l'intention (extension par points nommés) via **CREOS + Peintre_nano** ; ne pas réimplémenter `ModuleSlot` / `register_ui_extensions()` Python ([`07-adr`](07-MOD-adr-reconciliation-v01-v02.md) §6, annexe C).

### 3.2 Post-v2 — marketplace et store

- **Module store** et **modules tiers** partagent la même frontière : [`01`](01-MOD-matrice-choix-modularite.md) statut **Post-v2** (entry points, marketplace) ; lacune pack **L-14**.
- **Citation maître (extrait)** — `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md` :

  > *« Permettre, **après** une v2 stabilisée, la **distribution commerciale** (vente, location) de **modules complémentaires** : découverte, téléchargement, installation, activation / désactivation, mises à jour, cycle de vie et révocation éventuelle. »*  
  > *« L'état d'un module ne doit pas être réduit à un seul booléen »* — hiérarchie `listed` → `licensed` → `enabled_by_admin` → `visible_in_ui` (§5).

- Alignement v2 sans marketplace : contrats stables, activation serveur (`module_key`), **refus** du chargement dynamique tiers hors build ([`07-adr`](07-MOD-adr-reconciliation-v01-v02.md) annexe D ; même doc post-v2 §4).

### 3.3 Hors-scope v2 — ne pas lancer depuis ce chantier

- **Plugin framework (L-15) :** [`09`](09-MOD-lacunes-et-questions-ouvertes.md) §10 — *aucune solution retenue* ; décision v2 = **chaîne CREOS + registre**, pas framework TOML. Agents : **ne pas** démarrer d'implémentation « plugin framework » tant que **T-MOD-1/2** et ADR-007 **Accepted** ne sont pas clos ([`09`](09-MOD-lacunes-et-questions-ouvertes.md) §9, synthèse).
- **IA / LLM :** hors **protocole modules** ; suivi produit / intégration séparé (fiche Kanban `ia-llm-modules-intelligents`).

---

## 4. Matrice idée → décisions pack (rappel ultra-court)

| Idée | v0.1 (fév. 2026) | Verdict pack (`01` / `07`) |
|------|------------------|----------------------------|
| Plugin framework | `module.toml`, `ModuleBase`, hooks Pluggy/Redis | **Abandonné / remplacé** — CREOS, FastAPI, outbox métier |
| Module store | Liste `enabled` + dépôt modules | **Post-v2** — registre serveur + marketplace hypothèse |
| Correspondance Paheko | Module `ModuleBase` dédié (envisagé) | **v2** — domaine sync, pas loader TOML |
| UI modulaire | `ModuleSlot` React + lazy | **Conservé** (concept) → **CREOS** `slot_id` |
| IA / LLM | Modules optionnels « intelligents » | **Hors pack** — pas de L-ID |

---

## 5. Actions recommandées (agents / Strophe)

| Si l'idée… | Alors… |
|------------|--------|
| … concerne **l'UI modulaire** ou **Paheko métier** | Suivre [`06-cookbook`](06-MOD-cookbook-nouveau-module-optionnel.md) + `03`/`04` ; valider ADR-007 (**L-03**) |
| … concerne un **store** ou **catalogue** de modules | Lire post-v2 §1–§6 ; **ne pas** figer l'API v2 sur un marketplace ; noter **L-14**, **Q-HITL-08** (`09` §5.2) |
| … concerne un **framework plugins** multi-sources | Stopper — **L-15** ; mise à jour fiche Kanban seulement (skill idees-kanban), pas spec pack |
| … concerne **LLM / imports intelligents** | Hors ce pack ; pas de story modules dérivée de `13` |

---

## 6. Sources citées

| Document | Usage |
|----------|--------|
| [`01-MOD-matrice-choix-modularite.md`](01-MOD-matrice-choix-modularite.md) | Statuts abandonné / remplacé / post-v2 par dimension |
| [`07-MOD-adr-reconciliation-v01-v02.md`](07-MOD-adr-reconciliation-v01-v02.md) | Réconciliation structurante v0.1 ↔ v2 |
| [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) | **L-14**, **L-15** ; §9 citation Kanban |
| `post-v2-hypothesis-marketplace-modules.md` | Horizon marketplace (BMAD architecture) |
| Fiches `references/idees-kanban/` | Détail idées — **non dupliqué** ici |

---

_Retour pack : [`index.md`](index.md) — Pont enrichissement ; lecture après `01`/`07` si réconciliation nécessaire, avant implémentation d'une idée Kanban._
