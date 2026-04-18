# Cartographie 1re passe — Integration Paheko core

**Date :** 2026-02-24  
**Contexte :** Session migration Paheko, ordre priorite 1re passe (sujet n°1).  
**Idee liee :** `references/idees-kanban/a-rechercher/2026-02-24_integration-paheko-core.md`

---

## Ce qui existe deja (guides migration-paheko)

Sources : `references/migration-paheko/2025-11_paheko-recyclique-integration-first-search.md`, `2025-11_v1.3.17_recyclique-guide-complet.md`.

### Architecture decrite

- **Dual stack** : Frontend React/Vite (PWA) → API FastAPI (middleware) → Paheko (PHP) + PostgreSQL + Redis.
- Ports evoques : Frontend 4444, API 4433, Paheko 8080, Postgres 5432, Redis 6379.
- Flux : operateur → Frontend → FastAPI (validation, IA) → appels API Paheko + BDD + Redis.

### Docker

- Compose propose : services `postgres`, `redis`, `paheko`, plus optionnel `middleware` (API Python).
- Paheko : Dockerfile dedie, config via env (DB_*, PAHEKO_*), extensions preinstallables via scripts (`activate-extensions.php`, etc.).
- Dossier `paheko/extensions/` pour modules a preinstaller.
- A valider pour v0.1.0 : un seul compose monorepo (Recyclic + Paheko) vs. deux stacks separes ; version Paheko cible (guides en 1.3.17). *(→ décidé 2026-02-25 : un seul Compose, version 1.3.19.x ; voir section « Décisions 1re passe ».)*

### Extensions / modules Paheko (listes dans les guides)

| Extension / module | Type | Usage RecyClique |
|-------------------|------|------------------|
| Caisse informatisee | Native | POS tactile, tickets, moyens paiement — **critique** |
| Gestion de stock | Native (avec Caisse) | Entrees/sorties, inventaires — **critique** |
| Saisie au poids | Extension | Decla eco-organismes, tracabilite poids — **critique** (decision max Paheko) |
| Suivi temps benevole | Extension | Heures, comptabilisation |
| Gestion materiel | Extension | Objets, prets, cessions |
| Documents/GED | Native | Photos, certificats, justificatifs |
| Site web | Native | Vitrine |
| Agenda et contacts | Extension | Calendriers vie associative — **a croiser avec idee calendar-espace-fichiers** |

Modules custom evoques (a developper / adapter) : Declarations eco-organismes (Brindille + API), Interface IA (API REST Paheko), Tarification dynamique (Brindille), Import/Export RecyClique (middleware Python).

### Middleware / correspondance

- Guides : « Middleware Python » ou « recyclique_connector » pour sync FastAPI ↔ Paheko.
- Aligne avec decision 08 : module correspondance = traducteur API Paheko (pas synchro BDD).

---

## Decisions 1re passe (2026-02-25)

- **Version Paheko** : v0.1.0 cible = derniere stable (1.3.19.x). Refs et analyse brownfield deja sur 1.3.19.1.
- **Docker / deploiement** : un seul Compose monorepo (Recyclic + Paheko + Postgres/Redis). Scripts deploiement (local dev, VPS staging/prod) et CI/CD Docker = a decider plus tard.
- **Auth / users** : a documenter en 2e passe (SSO ou lien Recyclic–Paheko).
- **Agenda/calendrier** : traite dans sujet n°2 (artefact 11) ; extension Agenda = individuel, pas collaboratif natif.

---

## Catalogue 1re passe

Reponse Perplexity : `references/recherche/2026-02-24_catalogue-plugins-modules-paheko_perplexity_reponse.md`. Synthese : 14 extensions officielles livrees avec le core (Caisse, Saisie au poids, Reservations, Recus fiscaux, Gestion stock velos, etc.) ; versionnement lie au core (1.3.x) ; ordre d'activation recommande pour RecyClique : Caisse puis Saisie au poids puis Reservations. Croiser avec le tableau extensions de la section « Ce qui existe deja » ci-dessus ; todo « Cataloguer modules Paheko » fait.

---

## Suite 2e passe (agenda deja dans artefact 08)

1. API Paheko caisse : endpoints, modeles (sessions, ventes, paiements).  
2. Extension Saisie au poids : fonctionnement, tables, API lecture/ecriture.  
3. ~~Catalogue modules Paheko optionnels~~ — fait (1re passe).  
4. Analyse dumps BDD Recyclic + Paheko (dans `references/dumps/` quand disponibles) pour correspondances reelles.

---

## Liens

- Idee : `references/idees-kanban/a-rechercher/2026-02-24_integration-paheko-core.md`
- Decision 08 : `references/artefacts/2026-02-24_08_decision-architecture-max-paheko.md`
- Migration Paheko : `references/migration-paheko/index.md`
