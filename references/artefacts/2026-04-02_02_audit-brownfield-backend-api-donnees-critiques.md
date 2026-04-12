# Audit brownfield — backend Recyclique 1.4.4, API et données critiques

**Date de livraison (artefact) :** 2026-04-02  
**Dernière mise à jour (continuité) :** 2026-04-02 — recoupement **OpenAPI live** stack Docker **`recyclic-local`** (`recyclique-1.4.4`) vs inventaire versionné `references/ancien-repo/v1.4.4-liste-endpoints-api.md`.  
**Story :** Epic 1 — `1-2-auditer-le-brownfield-backend-api-existante-et-les-donnees-critiques`  
**Baseline métier :** **recyclique-1.4.4** (logique critique de référence).  
**Périmètre :** synthèse **actionnable** pour Piste B (stabilisation backend, préparation OpenAPI) — **sans** rédiger `contracts/openapi/recyclique-api.yaml` (Story 1.4) ni modifier le code applicatif v2.

---

## Traçabilité Acceptance Criteria → sections

| AC (résumé) | Sections qui répondent |
|-------------|-------------------------|
| Points d'entrée, domaines, structures, flux (cashflow, réception, auth, permissions, contexte, sync) | §3 Cartographie par domaine |
| Réutilisable / fragile / bloquant | §4 Matrice |
| Surfaces sûres en premier | §5 |
| DTO / contrats à stabiliser avant large migration UI | §6 |
| Liste priorisée + conséquences Epics 2, 3, 6, 7, 8 | §7 |
| Pas d'inventaire vain | Tout le document (renvois aux sources déjà versionnées) |
| Croisement contrats repo (`contracts/`) | §8 |
| Alignement inventaire markdown ↔ schéma OpenAPI **réel** | §1 bis |

---

## 1. Résumé exécutif

Le brownfield **1.4.4** expose une **API REST FastAPI** riche et **documentée par inventaire** sous `references/ancien-repo/` (liste d'endpoints, modèles, architecture). Les domaines **caisse / ventes / sessions** et **réception / tickets / lignes** sont les **cœurs métier** les plus structurés côté routes et BDD ; les audits **migration-paheko** en donnent la traçabilité fine vers les tables (`cash_sessions`, `sales`, `sale_items`, `payment_transactions`, postes et tickets réception, `ligne_depot`, etc.).

Les **risques structurels** identifiés dans la consolidation **1.4.5** restent pertinents : frontières transactionnelles floues, gros fichiers d'endpoints, **schéma / migrations** historiquement mal ancrés (avec un **chantier DB ultérieur** documenté jusqu'à exécution contrôlée locale dans `references/consolidation-1.4.5/`), couplage services / `HTTPException`, santé dupliquée. Pour le frontend v2, la priorité est de **s'appuyer sur des surfaces HTTP stables et des DTO explicites** plutôt que sur des détails d'implémentation internes.

**Recommandations top (ordre décisionnel) :**

1. **Story 1.4 / Epic 2** : figer en OpenAPI reviewable les **operationId** des flux critiques (auth, `users/me`, permissions, sites, caisse session courante, vente nominale, réception poste/ticket/ligne, catégories exposées caisse/réception) — aligné `contracts/README.md` et hiérarchie **OpenAPI > ContextEnvelope > manifests > UserRuntimePrefs**.
2. **Epic 2** : livrer **ContextEnvelope** et recalcul explicite de contexte **sans** recoder toute la 1.4.4.
3. **Epics 6 / 7** : mapper chaque étape de flow critique aux **endpoints et DTO** déjà nominaux dans la liste v1 ; isoler ce qui est **fragile** (admin monolithique, chemins de maintenance) derrière des contrats v2 réduits.
4. **Epic 8 / Story 1.5** : traiter **sync / Paheko** comme **couche d'intégration** à concevoir (outbox, états) — ce n'est **pas** une surface REST « sync » unique lisible dans l'inventaire public `/v1` ; la **sync comptable réelle** est le chantier cible, pas le socle caisse/réception local.

**Accès code source (réalité terrain, avril 2026) :**

- **Arborescence de travail dans le dépôt JARVOS_recyclique :** dossier **`recyclique-1.4.4/`** (code et `docker-compose.yml` alignés sur la baseline 1.4.4).
- **Stack Docker locale de référence :** projet Compose **`recyclic-local`**, fichier de config typique  
  `JARVOS_recyclique/recyclique-1.4.4/docker-compose.yml` (conteneurs `recyclic-local-api-1`, `recyclic-local-frontend-1`, postgres, redis, migrations — noms observés sur l'environnement Strophe).
- **Documentation brownfield versionnée :** `references/ancien-repo/` (dont **`v1.4.4-liste-endpoints-api.md`**, réconcilié avec l'OpenAPI live — voir §1 bis).
- **Clone optionnel non versionné :** `references/ancien-repo/repo/` (gitignore, voir `references/ancien-repo/README.md`) ; peut être absent sur un clone nu — dans ce cas le dossier **`recyclique-1.4.4/`** fait foi pour le code.

---

## 1 bis. Contrôle de continuité — schéma OpenAPI live (`recyclic-local`)

**Objectif :** vérifier que l'inventaire markdown utilisé pour l'audit (et la Story 1.2) **reflète** ce que l'application **expose réellement** dans le schéma OpenAPI, pour la continuité Piste B / future OpenAPI v2.

**Quand :** 2026-04-02 (API et conteneurs **démarrés** localement).

**URLs utiles :**

- Interface : `http://localhost:8000/docs` (Swagger UI ; port selon mapping compose, **8000** sur la stack observée).
- Export schéma : **`http://localhost:8000/v1/openapi.json`** — à privilégier pour une comparaison exhaustive (à la racine, `/openapi.json` peut répondre **404** si l'app ne monte le schéma qu'under `/v1`).

**Méthode :** comparaison ensemble des couples **(méthode HTTP, chemin)** entre :

1. le JSON `openapi.json` (clé `paths`, toutes les méthodes `get` / `post` / …) ;
2. les lignes des tableaux de `references/ancien-repo/v1.4.4-liste-endpoints-api.md` (colonnes Méthode + Chemin).

**Normalisation :** suppression du **slash final** sur les chemins pour équivalence FastAPI (`/v1/sites` ≡ `/v1/sites/`).

**Chiffres (après normalisation) :**

| Source | Opérations (méthode + chemin) |
|--------|-------------------------------|
| Tableaux `v1.4.4-liste-endpoints-api.md` (avant correction ciblée) | 193 |
| `openapi.json` live | 196 |
| **Uniquement dans l'OpenAPI live** (absents des tableaux tels qu'ils étaient rédigés avant réconciliation) | **8** |
| **Uniquement dans le markdown** (absents du schéma live exporté) | **5** |

**Liste exhaustive — présents dans l'OpenAPI live, absents de l'ancienne rédaction des tableaux :**

| Méthode | Chemin | Commentaire |
|---------|--------|-------------|
| GET | `/` | Racine hors préfixe `/v1`. |
| GET | `/health` | Santé hors montage `/v1` (complément de `GET /v1/health` documenté). |
| GET | `/v1/monitoring/auth/metrics` | Métriques auth. |
| GET | `/v1/monitoring/auth/metrics/prometheus` | Export Prometheus. |
| POST | `/v1/monitoring/auth/metrics/reset` | Reset métriques auth. |
| GET | `/v1/monitoring/sessions/metrics` | Métriques sessions. |
| GET | `/v1/monitoring/sessions/metrics/prometheus` | Export Prometheus. |
| POST | `/v1/monitoring/sessions/metrics/reset` | Reset métriques sessions. |

**Liste exhaustive — figuraient dans le markdown avant correction, absents du schéma OpenAPI live exporté :**

| Méthode | Chemin | Interprétation |
|---------|--------|----------------|
| GET | `/v1/admin/users/{user_id}` | Le live expose **PUT** `/v1/admin/users/{user_id}` et des **GET** sur des sous-ressources (`.../history`, etc.), **pas** de GET sur la ressource seule `{user_id}` dans l'export — le tableau listait une ligne ambiguë / obsolète. |
| GET | `/v1/test-auth/test` | Non présent dans l'export (route de test retirée ou non enregistrée dans l'app courante). |
| POST | `/v1/deposits/from-bot` | **Retiré** du périmètre HTTP dans la consolidation documentée (`references/artefacts/2026-03-26_04_paquet-3-suppression-routes-api-bot-historique.md` et suites). |
| POST | `/v1/deposits/{deposit_id}/classify` | Idem (flux bot / classification HTTP historique). |
| POST | `/v1/users/link-telegram` | Absent du schéma live exporté (à confirmer selon branche ; ne pas supposer côté contrat v2 sans `operationId` live). |

**Conclusion :** l'audit brownfield (cartographie §3, priorités §5–§7) **reste valide** : le gros de l'inventaire `/v1/*` est **aligné** avec le runtime. Les écarts sont **localisés** (racine + monitoring auth/sessions, routes bot/Telegram retirées, détail admin user, test-auth). Le fichier **`v1.4.4-liste-endpoints-api.md`** et **`api-contracts-api.md`** ont été **mis à jour** dans le même mouvement pour refléter cette réalité et éviter de propager des lignes fantômes vers la Story 1.4 / OpenAPI v2. Une **copie figée** du JSON OpenAPI utilisé pour cette comparaison est archivée sous **`references/artefacts/2026-04-02_08_openapi-recyclique-live-recyclic-local.json`** (voir §9).

**Recommandation process :** après toute évolution majeure du backend 1.4.x, refaire un export **`/v1/openapi.json`** et une **diff** méthode+chemin contre `v1.4.4-liste-endpoints-api.md` (script ou revue manuelle). Option : archiver une copie datée du JSON sous `references/artefacts/` si besoin de preuve d'époque (sans secrets).

---

## 2. Baseline et sources (anti-réinvention)

| Source | Rôle pour cet audit |
|--------|---------------------|
| `references/ancien-repo/index.md`, `v1.4.4-liste-endpoints-api.md` | **Carte des entrées HTTP** `/v1/*` (auth, users, sites, deposits, sales, cash-sessions, cash-registers, categories, reception, stats, presets, transactions, activity, settings, admin, email, webhooks, monitoring). |
| `references/ancien-repo/data-models-api.md`, `architecture-brownfield.md`, `api-contracts-api.md` | Compléments structurels (à charger si besoin de détail schémas). |
| `references/dumps/schema-recyclic-dev.md` | Schéma BDD dev — référencé par les audits Paeco ; dossier **`references/dumps/`** en **gitignore** : ne pas commiter de secrets ni dumps bruts. |
| `references/consolidation-1.4.5/` (synthèse + audits `2026-03-23_*`, chantiers DB `2026-03-27_*`) | **Constats architecture / données / ops / tests** et historique d'assainissement. |
| `references/migration-paheko/audits/` | Traçabilité **caisse** et **réception/poids** ↔ API ↔ tables ; matrice Recyclique ↔ Paheko. |
| `references/paheko/index.md`, `liste-endpoints-api-paheko.md`, `analyse-brownfield-paheko.md` | Frontière **Paheko** (pas le cœur Recyclique, mais contrainte Epic 8). |
| `references/artefacts/2026-03-31_01_handoff-nettoyage-stabilisation-recyclique-1.4.4.md` | Posture **OpenAPI / tests alignés `API_V1_STR`**, nettoyages récents. |
| `references/artefacts/2026-04-02_01_surface-travail-v2-mode-reference-paheko.md` | Mode référence Paheko (Story 1.1) pour enchaînements Epic 1. |
| `_bmad-output/planning-artifacts/epics.md` | Formulation des **Epics 2, 3, 6, 7, 8** pour les conséquences. |
| `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` | Piste B, Convergences, OpenAPI. |

**Données sensibles :** aucune clé, mot de passe ou dump n'est inclus dans cet artefact. Respect du `.gitignore` sur `references/dumps/`.

---

## 3. Cartographie par domaine

### 3.1 Cashflow (caisse, ventes, encaissement)

| Élément | Contenu |
|---------|---------|
| **Points d'entrée** | Préfixe `/v1/cash-sessions`, `/v1/cash-registers`, `/v1/sales`, `/v1/presets`, `/v1/transactions` ; workflow session (`/step`, ouverture/fermeture, différée `deferred/check`) ; ventes avec lignes et paiements multiples ; correctifs admin ciblés (`/v1/admin/cash-sessions/fix-blocked-deferred`, `merge-duplicate-deferred`). |
| **Données / tables** | `cash_sessions`, `sales`, `sale_items`, `payment_transactions`, `preset_buttons`, postes `cash_registers` ; détail : `references/migration-paheko/audits/audit-caisse-recyclic-1.4.4.md`. |
| **Flux nominal** | Ouverture session → étapes entry/sale/exit → `POST /v1/sales` (lignes, `payments[]`, `sale_date` pour différé) → clôture session ; presets actifs `GET /v1/presets/active`. |
| **Dépendances** | Permissions métier type `caisse.access` / virtuel / différé (côté modèle authz 1.4.4) ; **Paheko** : pas de push synchrone dans l'inventaire route ; alignement futur via Epic 8 et matrice Paeco. |

### 3.2 Réception (flux matière, poids)

| Élément | Contenu |
|---------|---------|
| **Points d'entrée** | `/v1/reception/postes/*`, `/v1/reception/tickets/*`, `/v1/reception/lignes/*`, stats `.../stats/live`, catégories réception ; exports CSV ticket / période ; bulk admin `.../admin/reports/reception-tickets/export-bulk`. |
| **Données / tables** | Postes, tickets, lignes (poids, catégorie, destination, `is_exit`) — voir `audit-reception-poids-recyclic-1.4.4.md`. |
| **Flux nominal** | Ouverture poste (dont saisie différée `opened_at`) → tickets → lignes → fermeture ; PATCH poids ligne. |
| **Dépendances** | Catégories (`/v1/categories/entry-tickets`, visibilité réception) ; template offline admin. |

### 3.3 Auth

| Élément | Contenu |
|---------|---------|
| **Points d'entrée** | `/v1/auth/login`, `signup`, `logout`, `refresh`, `forgot-password`, `reset-password`, `pin`. |
| **Données / tables** | Utilisateurs, sessions/tokens (selon implémentation — détail dans modèles 1.4.4). |
| **Flux nominal** | Login password ou PIN → tokens → refresh ; reset par email. |
| **Dépendances** | Email (Brevo) via `/v1/email/*` et webhooks ; pas de délégation SSO Paheko dans la liste `/v1` (intégration future à cadrer en Epic 2 / 1.x). |

### 3.4 Permissions

| Élément | Contenu |
|---------|---------|
| **Points d'entrée** | `GET /v1/users/me/permissions` ; admin `/v1/admin/groups`, `/v1/admin/permissions` (CRUD groupes, liaison permissions / utilisateurs). |
| **Données** | Groupes, permissions, rôles utilisateur (admin). |
| **Flux** | Calcul effectif côté backend sur requêtes métier ; **Epic 2** doit **canonicaliser** clés stables et union additive (cf. Story 2.3). |
| **Dépendances** | Alignement futur **ContextEnvelope** (Story 2.2) pour éviter double vérité frontend. |

### 3.5 Contexte (site, opérateur, périmètre d'exploitation)

| Élément | Contenu |
|---------|---------|
| **Points d'entrée** | `GET /v1/users/me`, `GET /v1/sites`, `GET /v1/sites/{id}` ; caisse `GET /v1/cash-sessions/current`, `.../status/{register_id}` ; réception postes ouverts ; `GET /v1/users/active-operators`. |
| **Données** | `sites`, rattachement utilisateur (`User.site_id` — intégrité FK signalée comme **fragile** dans audits data). |
| **Flux** | Agrégation **implicite** aujourd'hui via multiples appels ; **v2** : **ContextEnvelope** unique (Story 2.2). |
| **Dépendances** | Epic 3 consommateur ; widgets `data_contract.operation_id` pointeront vers opérations OpenAPI stables. |

### 3.6 Sync (intra-système et inter-système)

| Élément | Contenu |
|---------|---------|
| **Ce que `/v1` expose** | Pas de route unique « `/v1/sync/paheko` » dans l'inventaire public. Signaux **indirects** : `GET /v1/admin/health/scheduler`, jobs / maintenance, emails et webhooks, monitoring classification. |
| **Flux métier « différé »** | Caisse et réception **différées** (dates réelles) — logique produit, pas sync externe. |
| **Interop Paheko** | Documentée dans **decisions / matrice Paeco** et **Epic 8** : file durable, états, idempotence — **à construire** plutôt qu'à extraire telle quelle d'un endpoint legacy. |
| **Risque** | Confondre **persistance locale** (Epics 6–7) et **réconciliation comptable** (Epic 8) : l'audit impose de **séparer** contrats. |

---

## 4. Matrice réutilisable / fragile / bloquant

| Zone | Classification | Justification courte |
|------|----------------|----------------------|
| Liste endpoints + guides Paeco (caisse / réception) | **Réutilisable** | Contrat **sémantique** pour nommer les `operationId` v2 et flows terrain. |
| Auth login / refresh / PIN + `users/me` | **Réutilisable** | Surface stable **si** DTO et erreurs normalisées (Epic 2). |
| Sites, catégories (hierarchy, visibilité caisse/réception) | **Réutilisable** | Lecture métier structurée ; écriture admin à isoler. |
| Sessions caisse + ventes + paiements | **Fragile** | Fichiers volumineux, transactions dispersées, cas différés / correctifs admin. |
| Modèle données / migrations / `User.site_id` | **Fragile** (historique **bloquant** si non maîtrisé) | Dette schema ; chantier DB documenté en consolidation — à **verrouiller** avant scaling. |
| Admin monolithique (`admin.py`), multiples routeurs `/admin` | **Fragile** | Risque collision et régression ; **ne pas** en faire la façade principale du greenfield UI. |
| Sync Paheko bout-en-bout | **Bloquant / inconnu** au sens produit | Non satisfait par l'API publique inventoriée seule ; nécessite **Epic 8** + Story 1.5. |
| Double santé `/health` vs `/v1/.../health` | **Fragile** | Confusion ops ; à unifier côté v2 (observabilité). |

---

## 5. Surfaces sûres en premier (exposition ou adaptation prioritaire)

1. **Auth** : login, refresh, logout, PIN — avec schémas d'erreur et cookies / headers **explicitement** spécifiés en OpenAPI (Epic 2.1).  
2. **Profil et permissions** : `users/me`, `users/me/permissions`.  
3. **Sites** : liste et détail pour ancrage multi-contexte.  
4. **Lecture métier stable** : catégories (hiérarchie, entry/sale tickets), presets actifs, session caisse **courante**, statut poste.  
5. **Réception lecture** : tickets list/detail, lignes, stats live en **lecture** avant d'exposer mutations complexes.  
6. **Santé** : un seul contrat de liveness/readiness documenté (à trancher Piste B).

Ces surfaces alimentent **Convergence 1** (Peintre ↔ backend réel) sans absorber l'admin technique.

---

## 6. Contrats / DTO à stabiliser avant large migration UI

*(L'audit **informe** Story 1.4 — pas de duplication de gouvernance AR19.)*

| Zone | Stabiliser (priorité) | Où le formaliser (rappel) |
|------|------------------------|---------------------------|
| Réponses auth + tokens + erreurs auth | P0 | `contracts/openapi/recyclique-api.yaml` + politique transport Epic 2.1 |
| `ContextEnvelope` + champs contexte actif | P0 | OpenAPI + schémas alignés CREOS côté **contexte** (Story 1.4, 2.2) |
| Objet vente (lignes, paiements, `sale_date`) | P0/P1 | OpenAPI — base Epic 6, `data_contract.critical` |
| Session caisse (ouverture, step, clôture) | P0/P1 | OpenAPI — corrélation avec registers |
| Ticket / ligne réception (poids, destination) | P1 | OpenAPI — base Epic 7 |
| Groupes / permissions (clés techniques stables) | P1 | OpenAPI + Epic 2.3 |
| Admin maintenance (sessions différées, imports) | P2 | Hors chemin opérateur ; endpoints réservés rôles élevés |

**CREOS** : `contracts/creos/schemas/README.md` — les widgets référenceront des `operationId` ; l'audit recommande de **tagger** dans OpenAPI les **tags** cohérents avec `data_contract.source` (`contracts/README.md`).

---

## 7. Backlog décisionnel (priorisé) — conséquences Epics 2, 3, 6, 7, 8

| ID | Priorité | Problème / opportunité | Conséquences Epics |
|----|----------|------------------------|-------------------|
| B1 | P0 | Figer **operationId** et DTO des flux **auth + contexte + permissions** | **2** (2.1–2.3), **3** (consommation runtime), **6/7** (guards contexte) |
| B2 | P0 | Publier **ContextEnvelope** backend minimal | **2.2**, **3**, **6.2**, **7.2** |
| B3 | P1 | Normaliser **transactions** et réponses **vente / session** pour idempotence / step-up | **2.4**, **6** (paiement bloqué si stale), **8** (retry safe) |
| B4 | P1 | **Schéma BDD** et migrations sous contrôle (alignement modèles / Alembic) | **2.5**, **6/7** (intégrité données terrain), **8** (pas de double écriture) |
| B5 | P1 | Découper **surfaces admin** vs **API opérateur** dans OpenAPI | **2**, **3** (navigation / pages sans fuite admin) |
| B6 | P2 | Unifier **observabilité** (health unique, scheduler) | **2.7**, exploitation |
| B7 | P2 | Cadrer **premier slice sync** Recyclique → Paheko (hors scope caisse pure) | **8.1–8.3**, **1.5**, **6/7** (relais clôture locale vs compta) |

---

## 8. Croisement `contracts/` (sans réécrire la gouvernance)

- **`contracts/README.md`** : OpenAPI = source reviewable ; CREOS = manifests / widgets ; convention `data_contract.source` ↔ tags OpenAPI — l'audit recommande que les **premiers `operationId`** gravés correspondent aux surfaces §5 (auth, me, sites, session courante, vente nominale, ticket/ligne réception lecture puis écriture).  
- **`contracts/creos/schemas/`** : préparer la **cohérence** `data_contract.operation_id` ↔ OpenAPI (CI future Epic 10 mentionnée dans README CREOS).  
- **`contracts/openapi/recyclique-api.yaml`** : fichier **draft** à compléter en **1.4** ; cet audit fournit le **périmètre métier** et les **regroupements** à prioriser.

**Hiérarchie rappel (AR39 / Story 1.4) :** OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs.

---

## 9. Annexes — liens (pas de contenu sensible)

- `references/artefacts/2026-04-02_08_openapi-recyclique-live-recyclic-local.json` — **export OpenAPI archivé** (même contenu que l’appel live utilisé pour §1 bis, date de capture 2026-04-02)  
- `references/ancien-repo/v1.4.4-liste-endpoints-api.md` (inventaire réconcilié avec OpenAPI live — voir §1 bis)  
- `recyclique-1.4.4/docker-compose.yml` — stack Docker **`recyclic-local`** (référence locale)  
- `references/consolidation-1.4.5/2026-03-23_synthese-audit-consolidation-1.4.5.md`  
- `references/consolidation-1.4.5/2026-03-23_audit-backend-architecture-1.4.4.md`  
- `references/consolidation-1.4.5/2026-03-23_audit-backend-data-1.4.4.md`  
- `references/migration-paheko/audits/audit-caisse-recyclic-1.4.4.md`  
- `references/migration-paheko/audits/audit-reception-poids-recyclic-1.4.4.md`  
- `references/migration-paheko/audits/matrice-correspondance-caisse-poids.md`  
- `contracts/README.md`, `contracts/creos/schemas/README.md`  
- `_bmad-output/planning-artifacts/epics.md` (Epics 2, 3, 6, 7, 8)

---

*Fin du rapport — §1 bis ajoute la preuve de continuité OpenAPI live ; relecture HITL (critères story 1.2) peut porter sur ce bloc en plus du reste.*
