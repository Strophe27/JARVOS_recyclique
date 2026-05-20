# 19 — Crosswalk checklist v0.1 ↔ pack protocole modules

**Statut :** brouillon normatif — clôture lacune **L-03** (crosswalk manquant)  
**Date :** 2026-05-20  
**Audience :** Strophe (HITL), architecte, agents BMAD, dev  
**Rôle :** pour chaque item des artefacts **v0.1** (février 2026), indiquer le **statut pack** (conservé / remplacé / abandonné / post-v2), la **cible v2** et le renvoi normatif (`01`, `07-adr`). Ne remplace pas la matrice détaillée [`01-MOD-matrice-choix-modularite.md`](01-MOD-matrice-choix-modularite.md) ni l’ADR [`07-MOD-adr-reconciliation-v01-v02.md`](07-MOD-adr-reconciliation-v01-v02.md) — les **complète** au grain « checklist / décision arbitrée ».

**Sources v0.1 :**

| Artefact | Chemin |
|----------|--------|
| Checklist architecture v0.1 | [`references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md`](../artefacts/2026-02-26_03_checklist-v0.1-architecture.md) |
| Design système modules | [`references/artefacts/2026-02-24_07_design-systeme-modules.md`](../artefacts/2026-02-24_07_design-systeme-modules.md) |

**Norme pack (v2) :** [`01-MOD-matrice-choix-modularite.md`](01-MOD-matrice-choix-modularite.md) · [`07-MOD-adr-reconciliation-v01-v02.md`](07-MOD-adr-reconciliation-v01-v02.md) (**Accepted** 2026-05-20 — **L-03** clos).

---

## 1. Légende des statuts

| Statut | Signification | Action agent / dev |
|--------|---------------|-------------------|
| **Conservé** | Intention ou contrainte v0.1 **retrouvée** en v2 (autre artefact ou couche). | Implémenter via mécanisme v2 (CREOS, ADR-001, outbox, etc.). |
| **Remplacé** | L’artefact ou l’API v0.1 n’est plus la norme ; la v2 impose un autre porteur documenté. | Ne pas réintroduire le pattern v0.1 comme chemin nominal. |
| **Abandonné** | Exclu du périmètre v2 (dette assumée ou sur-ingénierie). | Ne pas planifier de story sur ce livrable. |
| **Post-v2** | Piste valide après preuve de la chaîne modulaire v2. | Citer `post-v2-hypothesis-marketplace-modules.md` uniquement ; pas d’implémentation v2. |
| **Ouvert** | Non tranché par le pack ; hors réconciliation framework (infra, métier, HITL). | Suivre lacune / question listée (ex. **L-07**, **Q-HITL-03**). |

**L-03 :** **clos** — ADR-007 **Accepted** (HITL 2026-05-20) ; miroir BMAD present ([`architecture/index.md`](../../_bmad-output/planning-artifacts/architecture/index.md)).

---

## 2. Checklist architecture v0.1 (2026-02-26)

Extrait de la section « À faire en v0.1 » — items socle / premières stories modulaires.

| ID | Item checklist v0.1 | Statut pack | Cible v2 / traitement | Réf. pack |
|----|---------------------|-------------|------------------------|-----------|
| **CHK-01** | **Loader modules (TOML, `ModuleBase`) et slots** — intégrer dès les premières stories modulaires ; prévoir l’arborescence front/API | **Remplacé** (mécanisme) · **Conservé** (intention timing + slots) | **Back :** routers FastAPI + registre / feature flags — pas `core/module_loader.py` + `module.toml`. **UI :** slots via **CREOS** `PageManifest` + **Peintre_nano** — pas `ModuleSlot` alimenté par Python. **Timing :** chaîne dès pilote Epic 4 (fait) ; cookbook `06` pour modules suivants. | `01` §3.1–3.2, §3.5 · `07-adr` §1–2, §6 · `03`, `04`, `06` |
| **CHK-02** | **Convention tests frontend** — co-located `*.test.tsx` vs `__tests__` au niveau module | **Ouvert** (hors réconciliation TOML/CREOS) | Non arbitré dans `01` / `07-adr`. Rester aligné sur conventions du monorepo **Peintre_nano** / brownfield ; trancher au moment d’un epic test front (Epic 10+). | — · évent. `04` § CI |
| **CHK-03** | **Versions Python et Node** — Dockerfile + README (ex. Python 3.12, Node 20 LTS) | **Conservé** | Exigence **infra / reproductibilité** — indépendante du choix CREOS vs TOML. Maintenir dans doc déploiement projet. | Hors pack modules (pas de statut abandonné) |
| **CHK-04** | **Détail module correspondance (FR13b)** — champs et règles après BDD + instance dev + analyste | **Conservé** (périmètre métier) | **Pas** un item framework : spec domaine + tables/API métier. Distinction **config UI** (ADR-001) **≠** données correspondance (`07-adr` §7, `02` §6.3). | `08` (workflow) si lien clôture ; dossier architecte **T-MET-1** |

**Synthèse checklist :** un seul item (**CHK-01**) mappe directement sur le double récit modularité ; il est **décomposé** en back (remplacé) + slots (conservé en concept, remplacé en implémentation). Les items **CHK-02** et **CHK-03** ne changent pas de statut avec la réconciliation v2.

---

## 3. Décisions arbitrées — design système modules (2026-02-24)

Table « Décisions arbitrées » du design v0.1, enrichie du statut pack.

| ID | Décision v0.1 | Choix retenu fév. 2026 | Statut pack | Porteur v2 | Réf. `01` / `07-adr` |
|----|---------------|------------------------|-------------|------------|----------------------|
| **DS-01** | Manifeste | TOML `module.toml` par module | **Abandonné** (manifeste transverse UI) · **Post-v2** (TOML backend-only éventuel) | Manifests **CREOS** (JSON) + **OpenAPI** ; `module_key` dans registre `05` | `01` §3.1 · `07-adr` §2, annexe A · **annexe E** (Q-HITL-07) |
| **DS-02** | Modules internes | Répertoires monorepo, pas pip par module | **Conservé** | Packages / apps dans monorepo brownfield | `01` §3.1 · `07-adr` §8 |
| **DS-03** | Modules tiers | Entry points setuptools si besoin | **Post-v2** | First-party v2 ; marketplace + gouvernance sécurité plus tard | `01` §3.1 · `07-adr` §8 |
| **DS-04** | Activation par instance | `config.toml` `[modules] enabled = [...]` | **Remplacé** | JSON **`site_id` + `module_key`** (ADR-001) ; transitoire `bandeau_live_slice_enabled` → Story **9.6** | `01` §3.3 · `07-adr` §4 |
| **DS-05** | Hooks inter-modules | **Redis Streams** / `EventBus` wrapper | **Remplacé** (API) · **Conservé** (principe async multi-workers, durabilité) | Outbox Paheko + événements métier nommés ; pas `bus.emit` générique documenté v2 | `01` §3.4 · `07-adr` §5 · **L-12** (transport SQL vs Redis) |
| **DS-06** | Frontend | Monorepo React, lazy loading, un seul build | **Conservé** | **Peintre_nano** — un build reviewable, lazy registre widgets | `01` §3.5 · `07-adr` §6 |
| **DS-07** | UI extension | Slots `<ModuleSlot name="..." />` | **Conservé** (concept) · **Remplacé** (implémentation) | `slot_id` dans **PageManifest** CREOS ; `PageRenderer` / registre TS | `01` §3.5 · `07-adr` §6 |
| **DS-08** | Contrat de base | `ModuleBase` — `startup`, `shutdown`, `register_routes`, `register_ui_extensions` | **Remplacé** | Lifespan FastAPI + routers ; extensions UI **uniquement** CREOS | `01` §3.2 · `07-adr` §1, §3, annexe C |
| **DS-09** | Dépendances inter-modules | `depends` + validation au démarrage, pas de tri topo auto | **Conservé** (principe) | Registre `05` + doc + CI ; échec explicite si dépendance manquante | `01` §3.2 · `07-adr` annexe B |
| **DS-10** | Sécurité modules tiers | Hors scope — first-party uniquement | **Conservé** (v2) · **Post-v2** (tiers) | Aligné hypothèse marketplace | `01` §3.2, §7 · `07-adr` §8 |

---

## 4. Patterns et briques techniques proposés (design v0.1)

Éléments hors tableau « Décisions arbitrées » mais présents dans le corps du design (contrat, loader, bus, push Paheko).

| ID | Brique / pattern v0.1 | Statut pack | Équivalent ou règle v2 | Réf. pack |
|----|------------------------|-------------|-------------------------|-----------|
| **PT-01** | Classe **`ModuleBase`** (ABC) + méthodes lifecycle / routes / signals / UI | **Abandonné** comme contrat unique | Chaîne **7 briques** PRD §4.2 — pas d’ABC obligatoire par module | `01` §4 · `07-adr` §1, §3 |
| **PT-02** | Structure **`module.toml`** (`[permissions]`, `[ui]`, `[dependencies]`) | **Abandonné** (UI) | Annexe A `07-adr` : champs → CREOS + `ContextEnvelope` + deps projet | `07-adr` annexe A |
| **PT-03** | **`ModuleRegistry.load_from_config`** (TOML → import modules) | **Abandonné** | Activation **site** + registre serveur + inclusion routers explicite | `01` §3.2 · `07-adr` annexe C |
| **PT-04** | **`register_ui_extensions()`** côté Python | **Abandonné** | Aucune extension React depuis le backend | `07-adr` §3, annexe C |
| **PT-05** | **`register_signals(bus)`** + **`EventBus.on` / `emit`** (Redis Streams) | **Abandonné** (API standard v2) | Handlers sur flux métier / consumers outbox | `01` §3.4 · `07-adr` §5 |
| **PT-06** | **`ModuleRegistry.tsx`** + lazy `import()` par nom module | **Remplacé** | Registre **widgets** Peintre + résolution `widget_type` | `04` · `07-adr` §6 |
| **PT-07** | Composant **`ModuleSlot`** + `useModuleExtensions` | **Remplacé** | Slots déclarés dans manifest CREOS | `04` · `01` §3.5 |
| **PT-08** | **File push Paheko** (stream Redis dédié `push:paheko:*`) | **Conservé** (principe) · **Remplacé** (implémentation) | Pipeline sync / **outbox** — pas second framework parallèle à CREOS | `01` §3.4 · **L-12** |
| **PT-09** | **Redis Pub/Sub** | **Abandonné** | — | `01` §3.4 |
| **PT-10** | **`async-signals`** (in-process) | **Abandonné** | Multi-workers Gunicorn | `01` §3.4 |
| **PT-11** | **Pluggy** (hooks sync) | **Abandonné** (v2) | **Post-v2** si hooks multi-auteurs | `01` §3.1, §3.4 |
| **PT-12** | **Stevedore** / scan répertoire non conventionné | **Abandonné** (v2) | Registre maison / CREOS | `01` §3.1 |
| **PT-13** | **Module Federation** / **Piral** (recherche mars 2026) | **Abandonné** (v2) · **Post-v2** | **Peintre_nano** profil minimal | `01` §3.5, §7 |
| **PT-14** | **`localStorage`** vérité config module | **Abandonné** | Serveur = vérité (ADR-001) | `01` §3.3 · **Q-HITL-03** |
| **PT-15** | **Hot reload** module en dev (redémarrage FastAPI) | **Conservé** (acceptation) | Contrainte dev inchangée | `07-adr` §8 · `01` §5 |

---

## 5. Zones d’ombre et risques (design v0.1)

| ID | Sujet v0.1 | Statut pack | Suite documentée | L-ID / HITL |
|----|------------|-------------|------------------|-------------|
| **ZO-01** | **Tests interactions modules** (slots, signals) | **Ouvert** → dette **L-13** (P2) | Reprendre sur pilotes réels dans `03` / `04` | **L-13** |
| **ZO-02** | **Hot reload** en dev | **Conservé** | Accepté (Docker compose) | — |
| **ZO-03** | **Risque principal** — frontière monorepo / builds séparés au premier module UI | **Conservé** (alerte) · **Atténué** v2 | Imposition **Peintre_nano + CREOS** dès pilote bandeau live | Epic 4 **done** ; `01` §3.5 |

---

## 6. Tableau maître — index rapide (tous items)

Statuts agrégés pour revue HITL (**L-03**). Ordre : checklist → décisions → patterns → zones d’ombre.

| ID | Libellé court | Statut |
|----|---------------|--------|
| CHK-01 | Loader TOML / ModuleBase + slots | Remplacé + Conservé (détail §2) |
| CHK-02 | Convention tests front | Ouvert |
| CHK-03 | Versions Python / Node | Conservé |
| CHK-04 | Module correspondance FR13b | Conservé (métier) |
| DS-01 | Manifeste `module.toml` | Abandonné / Post-v2 |
| DS-02 | Monorepo interne | Conservé |
| DS-03 | Entry points tiers | Post-v2 |
| DS-04 | `config.toml` activation | Remplacé |
| DS-05 | Redis Streams EventBus | Remplacé + Conservé (principe) |
| DS-06 | Un build React lazy | Conservé |
| DS-07 | Slots UI nommés | Conservé + Remplacé |
| DS-08 | `ModuleBase` | Remplacé |
| DS-09 | `depends` explicite | Conservé |
| DS-10 | First-party v2 | Conservé / Post-v2 tiers |
| PT-01 … PT-15 | Patterns §4 | Voir §4 |
| ZO-01 … ZO-03 | Zones d’ombre §5 | Voir §5 |

**Comptage statuts (items distincts DS + CHK + PT, hors ZO) :**

| Statut | Nombre indicatif |
|--------|------------------|
| Conservé | 8 |
| Remplacé | 12 |
| Abandonné | 9 |
| Post-v2 | 3 |
| Ouvert | 2 |

---

## 7. Alignement chaîne PRD §4.2 (rappel)

Le design v0.1 supposait parfois qu’un **`module.toml`** suffisait à prouver la modularité. Le pack retient la règle **`01` §4** / **`07-adr` §1** :

| Brique PRD | Artefact v0.1 typique | Statut transition |
|------------|----------------------|-------------------|
| Contrat métier | Logique + `[permissions]` TOML | **Remplacé** → OpenAPI + spec domaine |
| Récepteur backend | `register_routes`, `register_signals` | **Remplacé** → routers + outbox |
| Contrat UI | `[ui]` TOML, `register_ui_extensions` | **Remplacé** → CREOS |
| Runtime frontend | `ModuleSlot`, lazy routes | **Remplacé** → Peintre_nano |
| Permissions | TOML section/level | **Remplacé** → `ContextEnvelope` |
| Fallback / audit | Non formalisé | **Conservé** (exigence renforcée Epic 4) |

**Preuve v2 :** pilote **#1** bandeau live (Epic 4) — pas reprise du loader v0.1.

---

## 8. Actions HITL — clôture partielle L-03

| Action | Owner | Critère |
|--------|-------|---------|
| Valider ce crosswalk (aucune ligne v0.1 sans statut) | Strophe | Revue §6 tableau maître |
| ~~Passer ADR-007 Accepted~~ | **Fait** 2026-05-20 | Cohérence `01` §3.1–3.6 · [`09`](09-MOD-lacunes-et-questions-ouvertes.md) **L-03** clos |
| Ne pas rouvrir loader TOML / `ModuleBase` sans **exception** documentée | Agents / dev | Liste **annexe C** `07-adr` |
| Trancher **CHK-02** (tests front) | Équipe front | Hors L-03 strict |
| Trancher **Q-HITL-03** (précédence config) | Strophe | **L-07** — indépendant du présent fichier |
| Trancher **Q-HITL-07** (TOML backend-only autorisé ou interdit) | Strophe | [`07-adr`](07-MOD-adr-reconciliation-v01-v02.md) **annexe E** · **DS-01** ci-dessus |

**Promotion BMAD :** après acceptation ADR-007 — copie ou fusion vers `_bmad-output/planning-artifacts/architecture/` ; pointer depuis [`references/index.md`](../index.md).

---

## 9. Références croisées pack

| Document | Usage |
|----------|--------|
| [`01-MOD-matrice-choix-modularite.md`](01-MOD-matrice-choix-modularite.md) | Matrice canonique par dimension (§3.1–3.6) |
| [`07-MOD-adr-reconciliation-v01-v02.md`](07-MOD-adr-reconciliation-v01-v02.md) | ADR-007 — décisions structurantes, annexes A–D |
| [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) | **L-03**, **L-07**, **L-12**, **L-13**, Q-HITL |
| [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) | Exécution v2 post-crosswalk |
| [`10-MOD-cartographie-sources-modules.md`](10-MOD-cartographie-sources-modules.md) | Ligne checklist v0.1 → **couvert** par ce fichier |

---

_Document pack `references/protocole-modules-recyclique/` — 2026-05-20. Propriétaire lacune **L-03** (crosswalk checklist v0.1)._
