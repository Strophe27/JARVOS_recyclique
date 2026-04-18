# Integration Paheko core

---

## 2026-02-24 — Mary (brainstorm migration)

Dual-backend Recyclic + Paheko : Docker setup, modules Paheko optionnels, auth/users natif Paheko, comptabilité asso. Lien vers `references/migration-paheko/`. Cartographier ce qui existe déjà dans les guides et ce qui reste à valider.

Intention : a-rechercher

---

## 2026-02-24 — Decision « max Paheko » + agenda recherche

**Decision** : Paheko = backend financier et matiere complet. Recyclic = surcouche UX + workflow terrain. On utilise toute l'API Paheko (caisse native, extension Saisie au poids). Artefact : `references/artefacts/2026-02-24_08_decision-architecture-max-paheko.md`.

**Agenda de recherche** : (1) API Paheko caisse — endpoints, modeles, sessions, ventes, paiements ; (2) Extension Saisie au poids — fonctionnement, tables, API lecture/ecriture ; (3) Catalogue modules Paheko optionnels ; (4) Analyse dumps BDD production Recyclic + Paheko (quand disponibles) pour correspondances reelles.

---

## 2026-02-24 — Cartographie 1re passe (session migration)

Cartographie realisee : contenu des guides migration-paheko (architecture, Docker, extensions listees, middleware). Artefact : `references/artefacts/2026-02-24_09_cartographie-integration-paheko-core.md`. Points a valider : version Paheko cible, un seul compose monorepo, auth/users Recyclic–Paheko. Agenda 2e passe inchange (API caisse, Saisie au poids, catalogue, dumps).

---

## 2026-02-24 — Doc officielle Paheko + prompts recherche (Analyst)

Artefact `references/artefacts/2026-02-24_10_doc-officielle-paheko-integration-core.md` : synthese doc officielle (Extensions + API). Cinq prompts Perplexity crees ; version et catalogue faits (2026-02-25) ; reste a executer : API caisse, Saisie au poids, auth/SSO.

---

## 2026-02-25 — Decisions 1re passe + reponses Perplexity

**Decisions** : Version Paheko v0.1.0 = 1.3.19.x (derniere stable). Un seul Compose monorepo (Recyclic + Paheko + Postgres/Redis) ; scripts deploiement / CI-CD a decider plus tard.  
**Reponses enregistrees** : `2026-02-24_version-paheko-stable_perplexity_reponse.md`, `2026-02-24_catalogue-plugins-modules-paheko_perplexity_reponse.md`. Artefact 09 mis a jour (section « Decisions 1re passe », « Catalogue 1re passe »). Suite 2e passe inchangee (API caisse, Saisie au poids, dumps BDD dans `references/dumps/`).
