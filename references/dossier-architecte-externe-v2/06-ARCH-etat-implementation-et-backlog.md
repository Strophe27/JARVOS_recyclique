# 06 — État d'implémentation et backlog (synthèse)

**Référence statut :** `_bmad-output/implementation-artifacts/sprint-status.yaml` — **instantané BMAD au 2026-04-23** (`last_updated` dans le YAML). Ce pack est daté **2026-05-20** : avant toute décision d'architecture, vérifier la fraîcheur du YAML et [`references/ou-on-en-est.md`](../ou-on-en-est.md).

**Ligne directrice :** évolution incrémentale depuis `recyclique-1.4.4`, pas réécriture from scratch.

---

## Socle v2 — epics **done** (périmètre modulaire et métier)

| Epic | Thème | Pertinence architecte |
|------|--------|------------------------|
| **1–2** | Contrats, auth, ContextEnvelope, signaux backend | Prérequis à tout module |
| **3** | Moteur Peintre (shell, manifests, registre, slots) | Runtime UI |
| **4** | Preuve modulaire **bandeau live** (chaîne complète) | **Référence** pour futurs modules |
| **5** | Navigation transverse commanditaire | Composition multi-domaines |
| **6–8** | Caisse, réception, décla éco (flows v2) | Workflows métier porteurs |
| **11–18** | Admin, parité legacy, portage Peintre | Surfaces transverses |
| **13–14** | Kiosque / admin supervision | Multisite terrain |
| **15–17** | Parité admin, CREOS admin slices | Patterns réutilisables |
| **19** | Parité admin **réception** dans Peintre_nano | Surfaces réception côté admin |
| **22–23** | Rail comptable canonique Paheko (correct course) | Chaîne snapshot → outbox |
| **24** | Opérations spéciales caisse (hub, remboursements, décaissements, tags) | **Livré** — ne pas re-proposer comme backlog |
| **25** | Socle multisite, permissions, outbox Paheko (phase documentée) | Infra transverse |
| **26** | Assainissement API (pytest, services, PEP604) | Dette technique |

---

## Backlog structurant (modules et plateforme)

| Epic / story | Statut | Impact modularité |
|------------|--------|-------------------|
| **Epic 9** (modules complémentaires, eco-organismes, HelloAsso, décla, adhérents) | `backlog` | Modules métier v2 pas encore industrialisés ; stories 9-1…9-8 en attente |
| **Story 9.6** config admin simple (activation modules) | `backlog` | Généralisation au-delà du toggle bandeau live |
| **Epic 10** CI CREOS / validation contrats | `backlog` | Industrialisation manifests ; **sous-ensemble infra livré** : stories **10-6b … 10-6e** `done` (Docker local, spike PG 15→17, compose racine, CI non-legacy PG17) |
| **Epic 12** — parité UI legacy réception dans Peintre_nano | `backlog` | Étendre la réception v2 au-delà des flows déjà portés |
| **Epic 20** admin classe C (supervision / paramétrage avancé) | `backlog` | Surfaces admin transverses |
| **Epic 21** users admin Peintre (gestion utilisateurs UI v2) | `backlog` | Gouvernance accès terrain |

---

## Hypothèses **post-v2** (hors backlog actuel)

| Document | Sujet |
|----------|--------|
| [`post-v2-hypothesis-marketplace-modules.md`](../../_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md) | Marketplace / modules commerciaux optionnels |
| [`post-v2-hypothesis-peintre-autonome-applications-contributrices.md`](../../_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-peintre-autonome-applications-contributrices.md) | Peintre autonome, apps contributrices |

---

## Ce qui est **prouvé** vs **déclaré**

| Élément | État |
|---------|------|
| Chaîne modulaire bout en bout (PRD §4.2) | **Prouvée** sur pilote bandeau live (Epic 4 done) |
| Registre `module_key` + API `module-config/{site_id}` | **Normatif** dans `references/config-modules-site-id/`, **pas** fusionné OpenAPI canonique |
| Cookbook « nouveau module optionnel » | **Absent** |
| Design v0.1 (`module.toml`, ModuleBase) | **Documenté**, non réconcilié officiellement avec v2 |

---

## PWA / beta vendable

Voir PRD gates et note readiness post-Epic 25 : le socle technique avance ; **Epics 9–10–12, 20–21** et parité métier complète restent des jalons produit.
