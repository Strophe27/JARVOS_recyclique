---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-JARVOS_recyclique-2026-02-25.md
  - _bmad-output/planning-artifacts/research/technical-affichage-dynamique-peintre-extension-points-research-2026-02-25.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - references/artefacts/2026-02-26_01_analyse-separation-frontend-backend-recyclic.md
  - references/artefacts/2026-02-26_02_track-enterprise-multi-utilisateur.md
workflowType: architecture
project_name: JARVOS_recyclique
user_name: Strophe
date: '2026-02-26'
lastStep: 8
status: complete
completedAt: '2026-02-26'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Les 27 FR du PRD couvrent : caisse (sessions, ventes, clôture, push par ticket, multi-sites/caisses, mode verrouillé, PIN), réception (postes, tickets, lignes, source de vérité matière), compta et sync (syncAccounting à la clôture, admin compta v1 via Paheko), mapping RecyClique↔Paheko (FR13b), utilisateurs et auth (admin pour démarrage poste, PIN par opérateur, JWT v0.1, SSO v0.2+), admin et déploiement (Docker Compose, config push, file Redis Streams et retry), vie asso (placeholders v1), données déclaratives et éco-organismes, architecture modulaire (TOML, ModuleBase, EventBus, slots, extension points). Implications : un périmètre auth/autorisation riche (RBAC, PIN, mode caisse), une couche d'orchestration RecyClique entre front et Paheko, une file résiliente (Redis Streams), un module de correspondance et des points d'extension pour v2+.

**Non-Functional Requirements:**
- **Performance (NFR-P1, NFR-P2)** : vente < 2 s ; clôture ne bloque pas > 10 s (push/sync en arrière-plan).
- **Security (NFR-S1 à S4)** : HTTPS + secret partagé pour RecyClique↔Paheko ; secrets en env/secrets manager ; accès caisse restreint (mode verrouillé, PIN) ; RGPD.
- **Integration & reliability (NFR-I1, I2)** : aucun ticket perdu (Redis Streams, retry) ; écritures compta alignées sur la config Paheko.
- **Accessibility (NFR-A1)** : bonnes pratiques de base (contraste, clavier).

**Scale & Complexity:**
- Primary domain: full-stack web (SPA/PWA React, API FastAPI, Paheko PHP, Redis).
- Complexity level: high / enterprise (track Enterprise, brownfield, double backend, conformité réglementaire et sécurité).
- Composants architecturaux principaux : application RecyClique (front + middleware, un container), Paheko (service séparé, SQLite), Redis (EventBus + file push), PostgreSQL (RecyClique uniquement ; voir Database Strategy ci-dessous), canal sécurisé RecyClique↔Paheko, couche auth (JWT + PIN + rôles), module correspondance, workers/consumers Redis Streams.

### Technical Constraints & Dependencies

- **Déploiement** : un seul container RecyClique (front build React servi en statics par FastAPI + routes API) ; Paheko, PostgreSQL, Redis en services séparés (Docker Compose). Pas de séparation front/back en déploiement côté RecyClique.
- **Stack v1** : SPA + API REST ; pas de GraphQL ni SSR pour v1. EventBus / Redis Streams côté serveur uniquement ; le front passe par l'API.
- **Dépendances** : Paheko (API + plugin PHP custom pour push/sync), Redis (Streams), contrat et mapping RecyClique↔Paheko (moyens de paiement, catégories, sites). Import 1.4.4 selon checklist copy + consolidate + security.
- **Track Enterprise** : sécurité et conformité traitées dans le PRD et à détailler dans l'architecture (Authentication & Security, Infrastructure & Deployment).

### Database Strategy

- **Décision** : **Paheko reste en SQLite** (choix d'origine des développeurs) ; **RecyClique utilise PostgreSQL** (une base dédiée). Pas de mutualisation des bases en v1 : simplicité, séparation nette, moindre risque.
- **Option Bypass (à documenter et à réévaluer si besoin)** : Dans certains cas, RecyClique pourrait **lire ou écrire directement dans la base Paheko** (sans passer par l'API) pour gagner du temps, de l'énergie et des ressources — par exemple quand une API Paheko n'existe pas encore (liste des moyens de paiement, plan comptable, sessions caisse, écritures compta spécifiques). Cette option n'est possible que si l'on passe à une **base partagée** (ex. une instance PostgreSQL avec deux schémas `paheko` et `recyclic`) ; avec Paheko en SQLite, pas d'accès direct. À noter dans l'architecture comme **astuce architecturale** à activer si la mutualisation PostgreSQL est un jour retenue.

### Workflows et admin / settings RecyClique

- **À analyser en profondeur** : tous les workflows existants dans RecyClique (examen et export des sessions de caisse, sessions de réception, etc.). L'admin et les settings contiennent de nombreuses fonctionnalités à **conserver** tout en les **réécrivant** (architecture modulaire, sécurité, alignement Paheko). Ces besoins doivent être pris en compte dès les décisions d'architecture (routes API, modèles, droits, UX admin). Pour le détail des parcours et écrans v1 (caisse, réception, admin), voir la spécification UX (`_bmad-output/planning-artifacts/ux-design-specification.md`).
- **Implication** : l'architecture doit prévoir la place pour ces écrans et flux (admin, paramètres, exports, rapports) sans les considérer comme secondaires.

### Évolution frontend (approche plus dynamique)

- **Objectif** : faire évoluer le frontend vers une approche plus dynamique (layout, composants, éventuelle personnalisation par rôle ou utilisateur).
- **Déjà couvert** : la recherche technique « affichage dynamique, extension points Peintre » (document en input) définit des interfaces type LayoutConfigService, VisualProvider, stubs en v1.0, et une roadmap v2+ (layout configurable, intégration Peintre / JARVOS Mini). La **spécification UX** (`_bmad-output/planning-artifacts/ux-design-specification.md`) formalise la stratégie v1 (réutilisation écrans 1.4.4, copy + consolidate + security), le périmètre des écrans et la préparation des extension points pour v2+.
- **À prendre en compte dès le début** : les choix d'architecture (structure frontend, slots, extension points, bootstrap) doivent anticiper cette évolution pour éviter une refonte ultérieure coûteuse.

### Cross-Cutting Concerns Identified

- **Authentification et autorisation** : compte admin pour postes, PIN par opérateur caisse, RBAC (opérateur caisse, opérateur réception, responsable compta/admin, admin technique, bénévole), mode caisse verrouillé (menu caisse seul).
- **Sécurité des échanges et des secrets** : canal push RecyClique→Paheko (HTTPS, secret partagé), gestion des secrets (env / secrets manager), pas de secret en clair dans les requêtes.
- **Résilience et traçabilité** : file Redis Streams (push par ticket, retry sans perte), traçabilité des sessions, push et clôtures ; audit et replay possibles.
- **Conformité** : compta (référence config Paheko), RGPD (utilisateurs, adhésions), déclarations éco-organismes (source de vérité RecyClique, module dédié).
- **Déploiement et exploitation** : une instance par ressourcerie, Docker Compose, configuration plugin (endpoint, secret), surveillance workers et clôtures.

## Starter Template Evaluation

### Primary Technology Domain

**Full-stack web (SPA/PWA + API)** — Déjà fixé par le PRD et le contexte projet : RecyClique = front React (Vite, TypeScript) + middleware FastAPI dans un seul container ; Paheko en service séparé. Contexte brownfield : le code métier provient de l'import RecyClique 1.4.4 (checklist copy + consolidate + security), pas d'un starter greenfield ; le « starter » définit la **structure cible** et les **outils d'échafaudage** pour le frontend et l'API.

### Starter Options Considered

- **Frontend** : **Vite + React + TypeScript** — Template officiel `react-ts` via `create-vite@latest`. Pas d'autre starter évalué : le PRD et l'artefact déploiement imposent React/Vite/TS ; PWA et extension points (recherche technique) s'ajoutent ensuite dans la même base.
- **Backend RecyClique (API)** : **FastAPI** — Aucun CLI « create FastAPI » standard ; structure manuelle alignée sur les bonnes pratiques (routers par domaine, schemas Pydantic, config, services). Cohérent avec « routes par module » et un container unique servant le build React + l'API.
- **Paheko / PostgreSQL / Redis** : Hors périmètre « starter » ; stack existante ou infrastructure (Paheko en PHP, BDD et Redis déjà décidés).

### Selected Starter: Vite (react-ts) + structure FastAPI cible

**Rationale for Selection:**
- Le frontend doit être échafaudé proprement (Vite react-ts) pour accueillir le code migré 1.4.4 et les slots/extension points ; une base TypeScript stricte et un build optimisé sont requis.
- L'API RecyClique n'a pas de starter CLI universel ; on adopte une structure FastAPI par domaine (routers, schemas, config, mount des statics + catch-all SPA) documentée dans l'architecture pour que les agents et le dev implémentent de façon cohérente.
- Un seul container : build React → `frontend/dist` servi par FastAPI (StaticFiles + route catch-all pour le SPA), plus les routes `/api/...`.

**Initialization Command (frontend uniquement) :**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```

*(Pour un monorepo existant : créer le dossier `frontend/` à la racine du repo RecyClique puis exécuter la commande dans le répertoire parent, ou initialiser à la racine et déplacer le contenu dans `frontend/`.)*

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript strict pour le frontend ; ESLint inclus dans le template Vite react-ts. Python 3.x pour FastAPI (version à figer dans le Dockerfile et les docs).

**Styling Solution:**
- Non imposé par le template Vite ; à trancher en implémentation (CSS modules, Tailwind, ou alignement avec l'existant 1.4.4 lors de l'import).

**Build Tooling:**
- Vite pour le frontend (dev server, HMR, build optimisé). FastAPI + Uvicorn/Gunicorn pour l'API ; en prod, build React puis FastAPI sert `frontend/dist` et les routes API. Pas de séparation front/back en déploiement.

**Testing Framework:**
- Vite react-ts : pas de framework de test inclus par défaut ; à ajouter (Vitest, React Testing Library) selon les stories. Côté API : pytest (convention courante FastAPI).

**Code Organization:**
- Frontend : `frontend/src/` avec structure par module/domaine (à aligner avec modules RecyClique et slots). API : `api/` ou `backend/` avec `routers/` par domaine (auth, caisse, réception, etc.), `schemas/`, `services/`, `config/` ; montage des statics et route catch-all pour le SPA dans l'app FastAPI.

**Development Experience:**
- `npm run dev` (frontend, port 5173) et serveur FastAPI (ex. port 8000) en parallèle en dev ; CORS configuré si besoin. En prod : un seul processus (FastAPI) servant build + API.

**Note:** L'initialisation du frontend avec cette commande (ou l'équivalent en pnpm/yarn) et la mise en place de la structure FastAPI cible + montage des statics doivent figurer comme première(s) story(s) d'implémentation du socle.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Paheko SQLite, RecyClique PostgreSQL (bases séparées).
- Auth : JWT v0.1, PIN par opérateur caisse, RBAC, compte admin pour postes (PRD).
- API REST, JSON, EventBus/Redis Streams côté serveur uniquement.
- Un container RecyClique (front + middleware), Docker Compose.
- Logging structuré et audit log (voir ci-dessous).

**Important Decisions (Shape Architecture):**
- State management : Context + state local en v1 ; option store global (ex. Zustand) prête à activer (architecture + commentaires dans le code).
- Cache applicatif : option réservée (stratégie d'invalidation et fallback à définir si activation).
- Monitoring technique + audit log avec analyses et messages clairs aux dev/super-admin pour déclencher l'activation des options (state management, cache) quand les seuils sont dépassés.
- Option Bypass (lecture/écriture directe BDD Paheko) documentée pour réévaluation si base partagée un jour.

**Deferred Decisions (Post-MVP):**
- CI/CD (déploiements automatiques depuis GitHub) : à détailler plus tard.
- SSO RecyClique↔Paheko (v0.2+).
- Monitoring avancé (métriques Prometheus, alertes, dashboards) : prévu, détail après v1.

### Data Architecture

- **Paheko** : SQLite (choix d'origine). Une base fichier par instance ; sauvegardes = copie du fichier.
- **RecyClique** : PostgreSQL dédié. Schéma et modèles dans l'API (SQLAlchemy ou équivalent) ; pas d'accès direct au fichier SQLite Paheko.
- **Option Bypass** : Si, plus tard, une base partagée est adoptée (ex. une instance PostgreSQL, schémas `paheko` et `recyclic`), RecyClique pourra lire/écrire directement certaines ressources Paheko (ex. moyens de paiement, plan comptable, sessions) pour éviter de créer des APIs inexistantes ou de multiplier les appels. Documenter cette option comme **astuce architecturale** à réactiver si mutualisation PostgreSQL.
- **Redis** : EventBus (Streams) + file de push caisse→Paheko uniquement en v1. Cache applicatif = option réservée (voir Frontend / Options prêtes à activer).

### Authentication & Security

- **Authentification** : JWT (v0.1) pour le terrain ; compte admin (ou équivalent) pour démarrage poste ; PIN par opérateur habilité à la caisse ; SSO v0.2+ à documenter.
- **Autorisation** : RBAC selon matrice PRD (opérateur caisse, opérateur réception, responsable compta/admin, admin technique, bénévole) ; mode caisse verrouillé (menu caisse seul).
- **Sécurité des échanges** : HTTPS, secret partagé RecyClique↔Paheko ; secrets en env / secrets manager ; pas de secret en clair dans les requêtes (NFR-S1 à S4).
- **Données personnelles** : conformité RGPD dans le périmètre géré (utilisateurs, adhésions).

### API & Communication Patterns

- **API** : REST, JSON ; montants en centimes ; poids en kg (réception) / conversion vers Paheko si besoin. Pas de GraphQL ni SSR en v1.
- **Communication RecyClique↔Paheko** : API HTTP + plugin PHP (endpoint sécurisé) ; push par ticket, file Redis Streams, retry sans perte.
- **EventBus** : Redis Streams côté serveur uniquement ; le front passe par l'API.
- **Documentation** : contrat API clair, schémas partagés (Pydantic côté FastAPI, types TS en monorepo).

### Frontend Architecture

- **State management (v1)** : React state + Context(s) par domaine (session caisse, auth, config). Structure claire et conventions de nommage.
- **Option prête à activer** : store global (ex. Zustand) si l'état partagé devient lourd (re-renders excessifs, nombreux écrans partageant les mêmes données). À documenter dans l'architecture **et en commentaires dans le code** (ex. au niveau des Contexts : « Option prête à activer : si état partagé lourd → migrer vers store global ; voir architecture section Frontend »).
- **Capteurs et critères d'activation** : tests ou revues périodiques (perf front, complexité des Contexts) ; si seuils dépassés (ex. revue de code ou métriques re-renders) → message clair aux dev/super-admin pour envisager l'activation (voir Monitoring ci-dessous).
- **Slots, extension points** : LayoutConfigService, VisualProvider en stubs v1 ; recherche technique Peintre en référence.

### Cache applicatif et options prêtes à activer

- **Redis en v1** : EventBus + file de push uniquement. Pas de cache applicatif Redis en v1.
- **Cache applicatif** : option réservée ; à activer si besoin de perf ou de charge, avec stratégie d'invalidation et fallback définie.
- **Capteurs pour activer le cache (et autres options)** : définir dès maintenant des **métriques** (latence P95/P99 des routes sensibles, charge BDD, taille file Redis) et des **seuils** (ex. P95 > 500 ms ou régression > 20 % en tests de charge). **Revue périodique** (ex. trimestrielle ou après release) : si seuils dépassés → déclencher une revue (activation cache, optimisation requêtes). Faire le **pont avec le monitoring** : les analyses produisent des **messages clairs aux dev ou super-admin** quand il est temps d'implémenter de nouvelles choses (activer cache, activer store global frontend). Même logique pour l'option state management (point 2) : critères + messages explicites.
- **Règle** : ne pas seulement « réserver » des options pour plus tard, mais **définir les critères et le processus** (métriques, seuils, revue, messages) pour savoir **quand** les activer.

### Infrastructure & Deployment

- **Déploiement** : Docker Compose ; un container RecyClique (front + middleware), Paheko, Redis, PostgreSQL (RecyClique). Une instance par ressourcerie.
- **CI/CD** : à détailler plus tard (déploiements automatiques depuis GitHub, build + tests + déploiement). Pas urgent pour v1.
- **Environnement** : config via variables d'environnement / secrets manager ; pas de secrets en dur.

### Logging

- **Logs techniques** : format structuré (JSON ou format fixe) ; timestamp, niveau (info/warn/error), module ou route, message ; pour les erreurs : trace ou request_id. Aucune donnée sensible (mots de passe, tokens).
- **Corrélation** : request_id propagé (front → back) pour tracer un parcours (ex. une clôture et toute la chaîne de requêtes).
- **Health check** : endpoint (ex. `/health` ou `/ready`) vérifiant : app up, connexion BDD RecyClique, Redis (ping), éventuellement Paheko joignable.

### Monitoring technique et audit log (journal des actions)

Deux axes à prévoir et à relier aux options prêtes à activer (state management, cache) :

**A. Monitoring technique**
- Health checks (voir Logging ci-dessus).
- Visibilité sur la file de push (taille, retard) pour détecter Paheko down ou retard.
- Métriques (ex. Prometheus) : nb requêtes, latence, erreurs par route, taille file Redis — à prévoir dans l'architecture même si l'outil (Grafana, alertes) vient après v1.
- Ces métriques et seuils alimentent les **capteurs** qui déclenchent les messages « il est temps d'activer le cache » ou « revue state management » (voir Cache applicatif et Frontend ci-dessus).

**B. Audit log / journal des actions métier**
- **Objectif** : tracer les actions critiques (ouvertures de caisse, clôtures, ouvertures/fermetures de session réception, modifications de config sensibles, connexions/déconnexions) pour conformité, litiges et exploitation (ex. « qui a ouvert cette caisse à cette date ? »).
- **Modèle** : table ou schéma dédié (ex. `audit_events` : timestamp, user_id, action, resource_type, resource_id, détails, etc.) ; à placer dans la BDD RecyClique (ou à centraliser avec Paheko si choix métier).
- **Liste des actions à journaliser** : à affiner avec le métier ; au minimum : ouverture/fermeture caisse, ouverture/fermeture session réception, clôture avec sync, modifications config sensibles.
- **Intégration avec les analyses** : les mêmes processus (revue périodique, seuils) peuvent produire des **messages clairs aux dev ou super-admin** lorsqu'il est temps d'implémenter de nouvelles choses — par exemple « Seuils de latence dépassés : envisager activation du cache applicatif » ou « Complexité state front élevée : envisager activation du store global (Zustand) ». Ainsi, monitoring technique + audit log + options prêtes à activer (points 2 et 3) sont reliés : les analyses et le monitoring informent explicitement quand repasser sur le billard et changer des organes.

### Decision Impact Analysis

**Implementation sequence (résumé) :**
1. Socle : frontend (Vite react-ts), API (structure FastAPI), montage statics + health check, Docker Compose (RecyClique, Paheko SQLite, Redis, PostgreSQL RecyClique).
2. Auth, RBAC, PIN, mode caisse.
3. Caisse, réception, push Redis Streams, plugin Paheko, syncAccounting.
4. Logging structuré, request_id, audit log (actions critiques).
5. Métriques et seuils pour capteurs ; messages dev/super-admin lorsque seuils dépassés (activation options cache / state management).
6. CI/CD et monitoring avancé après v1.

**Cross-component dependencies :**
- Option Bypass dépend d'une éventuelle base partagée PostgreSQL (non retenue en v1).
- Messages « temps d'activer une option » dépendent de la mise en place des métriques, seuils et revue périodique (logging + monitoring).
- Audit log et monitoring technique partagent la même exigence de clarté des messages et de processus de revue.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** Zones où les agents IA pourraient diverger (nommage BDD/API/code, structure des dossiers, formats JSON/erreurs, événements Redis, gestion erreurs et loading).

### Naming Patterns

**Database Naming Conventions (PostgreSQL / RecyClique):**
- Tables : **snake_case pluriel** (ex. `pos_sessions`, `reception_tickets`, `audit_events`).
- Colonnes : **snake_case** (ex. `user_id`, `created_at`, `total_cents`).
- Clés étrangères : `{table_singulier}_id` (ex. `session_id`, `user_id`).
- Index : `idx_{table}_{colonne(s)}` ou `idx_{table}_{suffix}` (ex. `idx_pos_sessions_created_at`).
- Cohérence avec l'existant 1.4.4 et Paheko à vérifier à l'import ; en cas de conflit, privilégier snake_case pour la BDD RecyClique.

**API Naming Conventions (REST FastAPI):**
- Endpoints : **pluriel**, snake_case dans les segments (ex. `/api/pos/sessions`, `/api/reception/tickets`, `/api/auth/me`).
- Paramètres de route : `{id}` ou nom explicite (ex. `/api/pos/sessions/{session_id}`).
- Query params : **snake_case** (ex. `user_id`, `from_date`).
- Headers custom : préfixe cohérent (ex. `X-Request-Id`) ; éviter les conflits avec headers standards.

**Code Naming Conventions:**
- **Frontend (React/TS)** : composants **PascalCase** (`UserCard.tsx`, `SessionCaisseList`). Fichiers composants = même nom que le composant. Hooks/fonctions **camelCase** (`useSessionCaisse`, `getUserData`). Variables **camelCase**. Constantes en **UPPER_SNAKE** si vraiment constantes.
- **Backend (Python/FastAPI)** : modules et fichiers **snake_case** (`pos_sessions.py`, `reception_service.py`). Classes **PascalCase**. Fonctions et variables **snake_case**. Modèles Pydantic : champs **snake_case** (aligné API et BDD).
- **Événements Redis / EventBus** : nommage **dot.lowercase** ou **snake_case** (ex. `pos.ticket.created`, `reception.ticket.closed`) ; payload JSON avec champs **snake_case**.

### Structure Patterns

**Project Organization:**
- **Frontend** : `frontend/src/` avec sous-dossiers par **domaine/module** (ex. `caisse/`, `reception/`, `auth/`, `admin/`, `shared/`). Composants d'un module dans le dossier du module ; composants partagés dans `shared/`. Tests : **co-located** `*.test.tsx` ou dossier `__tests__` au niveau module (à trancher une fois pour toute l'app).
- **Backend** : `api/` (ou `backend/`) avec `routers/` par domaine (`auth`, `pos`, `reception`, etc.), `schemas/`, `services/`, `models/`, `config/`. Utilitaires partagés dans un module `core/` ou `common/`. Tests : dossier `tests/` à la racine de l'API, structure miroir des modules (ex. `tests/routers/test_pos_sessions.py`).
- **Config** : `.env` (ou secrets) à la racine du repo ; config chargée via Pydantic Settings dans `api/config/`. Pas de secrets en dur.

**File Structure:**
- Fichiers de config : `api/config/settings.py` (ou équivalent). Assets statics : `frontend/public/` (Vite). Build output : `frontend/dist/` servi par FastAPI. Documentation technique : `doc/` (racine) ou `references/` selon conventions projet.

### Format Patterns

**API Response Formats:**
- **Succès** : corps = objet ou liste directement (pas de wrapper `{ data: ... }` sauf si convention explicite pour pagination). Pagination : champs `items`, `total`, `page`, `page_size` (snake_case).
- **Erreur** : objet structuré **`{ "detail": "message" }`** (FastAPI standard) ou **`{ "error": { "code": "...", "message": "..." } }`** si besoin de codes métier. Toujours **HTTP status code** approprié (4xx/5xx).
- **Dates** : **ISO 8601** en string (ex. `2026-02-26T10:00:00Z` ou avec offset). Pas de timestamps numériques seuls pour les échanges API.
- **Montants** : **entiers en centimes** côté API et BDD (décision PRD).

**Data Exchange Formats:**
- **JSON** : champs en **snake_case** pour l'API (aligné backend et contrat). Frontend peut convertir en camelCase en entrée/sortie si convention TS interne camelCase ; garder un seul style côté API.
- **Booléens** : `true` / `false`. Pas de 1/0 dans le JSON.
- **Null** : utiliser `null` pour absent ; éviter champs omis si la sémantique doit être explicite.

### Communication Patterns

**Event System (Redis Streams / EventBus):**
- Nom d'événement : **snake_case** ou **dot.lowercase** (ex. `pos.ticket.created`, `reception.ticket.closed`). Payload : objet JSON, champs **snake_case**. Version ou type de payload à inclure si évolution prévue (ex. `event_type`, `payload_version`).
- Consommateurs : idempotence si possible ; acks après traitement réussi ; retry avec backoff en cas d'échec (aligné NFR-I1).

**State Management (Frontend):**
- Mises à jour **immuables** (pas de mutation directe des objets d'état). Nommage des actions/handlers : **camelCase** (ex. `setSessionCaisse`, `addTicketLine`). Organisation de l'état : par domaine (session caisse, réception, auth) ; voir section Frontend Architecture pour option store global.

### Process Patterns

**Error Handling:**
- **Backend** : exceptions métier → HTTP 4xx avec `detail` ou `error` structuré ; exceptions inattendues → 500, message générique côté réponse, détail en logs (avec request_id). Pas de stack trace dans la réponse API.
- **Frontend** : erreurs API → message utilisateur lisible (i18n si prévu) ; log technique (console ou logger) avec request_id. Error boundaries React pour contenir les crashes de sous-arbre.
- **Logging** : niveau **error** pour échecs métier ou techniques à tracer ; **warn** pour dégradation ; **info** pour flux importants (ex. clôture, push). Format structuré (voir Logging dans Core Decisions).

**Loading States:**
- Convention de nom : **`isLoading`** ou **`isPending`** pour l'état de chargement (éviter mélange `loading` / `fetching` / `pending`). État global (ex. layout) vs local (ex. bouton) : local par défaut ; global uniquement si blocant toute l'UI. Afficher un indicateur cohérent (spinner ou skeleton) selon le contexte ; pas de blocage silencieux sans feedback.

### Enforcement Guidelines

**All AI Agents MUST:**
- Respecter les conventions de **nommage** (snake_case BDD/API, PascalCase composants, camelCase front) et les **formats** (dates ISO, montants centimes, erreurs structurées).
- Placer les fichiers selon la **structure** (routers par domaine, frontend par module, tests selon convention choisie).
- Utiliser **request_id** pour la corrélation logs et propager en header si appel API front→back.
- Documenter toute **déviation** temporaire (commentaire + référence à ce document) et proposer une mise à jour des patterns si récurrent.

**Pattern Enforcement:**
- Vérification : revue de code et checklist avant merge ; linter/format (ESLint, Prettier, Black, ruff) alignés sur ces règles.
- Violations : documenter dans une section « Pattern violations » du doc d'architecture ou dans les PRs ; décider si exception acceptée ou refactor.
- Évolution : toute évolution des patterns se fait par mise à jour de cette section et communication (doc, ADR si décision majeure).

### Pattern Examples

**Good Examples:**
- Route API : `GET /api/pos/sessions?from_date=2026-02-26` ; réponse `[{ "id": "...", "created_at": "2026-02-26T08:00:00Z", "total_cents": 1250 }]`.
- Événement Redis : `pos.ticket.created` avec payload `{ "ticket_id": "...", "session_id": "...", "total_cents": 1000 }`.
- Composant : `SessionCaisseList.tsx` avec hook `useSessionCaisse(sessionId)` ; état `isLoading`, `error`, `session`.

**Anti-Patterns:**
- BDD : colonnes en camelCase ou noms de tables singuliers incohérents (`User` vs `pos_sessions`).
- API : réponses en camelCase alors que le reste du backend est snake_case ; erreur en string seule sans structure.
- Frontend : mutation directe de l'état (`state.items.push(x)` au lieu de `setState([...state.items, x])`) ; mélange de conventions de nommage dans un même module.
- Events : payload sans type ni version si le format peut évoluer ; acks avant traitement effectif (risque de perte).

## Project Structure & Boundaries

### Complete Project Directory Structure

```
JARVOS_recyclique/
├── README.md
├── .env.example
├── .env
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/assets/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   ├── auth/
│   │   ├── caisse/
│   │   ├── reception/
│   │   ├── admin/
│   │   ├── shared/
│   │   ├── core/
│   │   └── types/
│   └── dist/
├── api/
│   ├── main.py
│   ├── config/
│   ├── routers/
│   │   ├── auth/
│   │   ├── pos/
│   │   ├── reception/
│   │   └── admin/
│   ├── schemas/
│   ├── services/
│   ├── models/
│   ├── db/
│   ├── workers/
│   ├── core/
│   └── tests/
├── doc/
├── references/
└── _bmad-output/
```

### Architectural Boundaries

**API:** Frontend appelle `/api/*`. Routers par domaine (`/api/auth/*`, `/api/pos/*`, `/api/reception/*`, `/api/admin/*`). Paheko via `paheko_client.py` uniquement.

**Components:** Frontend = un module = un dossier (auth, caisse, reception, admin). State par domaine (Contexts). API client dans `frontend/src/api/`.

**Services:** Routers = HTTP ; services = logique métier ; workers = consommateurs Redis Streams → Paheko.

**Data:** PostgreSQL RecyClique = `api/models/`. Redis = EventBus + file push. Paheko = API/plugin uniquement en v1.

### Requirements to Structure Mapping

- **Caisse / POS** : `api/routers/pos/`, `api/services/pos_service.py`, `frontend/src/caisse/`, workers.
- **Réception** : `api/routers/reception/`, `api/services/reception_service.py`, `frontend/src/reception/`.
- **Auth, RBAC, PIN** : `api/routers/auth/`, `frontend/src/auth/`.
- **Admin, exports** : `api/routers/admin/`, `frontend/src/admin/`.
- **Audit log** : `api/models/audit_events.py`.
- **Health** : `api/routers/admin/health.py`.

**Cross-cutting:** `api/core/deps.py`, `api/core/middleware.py`, `api/config/settings.py`.

### Integration Points

Frontend → API (REST, X-Request-Id). API → BDD, Redis (EventBus), Paheko (paheko_client). Workers → Redis → Paheko. Config : `.env`, `api/config/settings.py`. Dev : `npm run dev` + `uvicorn api.main:app --reload`. Build : frontend → dist ; Docker = dist + API. Deploy : docker-compose ; health `/health` ou `/ready`.

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** Les choix (Paheko SQLite, RecyClique PostgreSQL, un container, REST, JWT+PIN, Redis EventBus+push, Context+option Zustand, audit log + monitoring) sont compatibles entre eux. Aucune contradiction. Versions à figer en implémentation (Python, Node, Vite, FastAPI).

**Pattern Consistency:** Les patterns (snake_case BDD/API, PascalCase/camelCase front, structure par domaine, formats JSON/erreurs, événements Redis) soutiennent les décisions. Cohérents avec le stack.

**Structure Alignment:** L'arborescence (frontend/src par module, api/routers par domaine, workers, core, tests) supporte les décisions et les patterns. Frontières claires.

### Requirements Coverage Validation

**Functional Requirements Coverage:** Les 27 FR (caisse, réception, auth, admin, audit, health, etc.) sont couverts par les décisions et le mapping FR vers structure. Workflows admin/settings et module correspondance (FR13b) prévus ; détail à affiner en implémentation.

**Non-Functional Requirements Coverage:** NFR-P1/P2, NFR-S1 à S4, NFR-I1/I2, NFR-A1 et track Enterprise adressés dans le document.

### Implementation Readiness Validation

**Decision Completeness:** Décisions critiques documentées avec options (Bypass, cache, state management). Versions à figer au démarrage. Patterns et exemples fournis.

**Structure Completeness:** Arborescence et intégration points définis. Détail suffisant pour démarrer ; à enrichir au fil des stories.

**Pattern Completeness:** Points de conflit couverts. Règles d'enforcement et anti-patterns documentés.

### Gap Analysis Results

**Critical Gaps:** Aucun bloquant. Loader modules (TOML, ModuleBase) et slots à intégrer dans la structure lors des premières stories modulaires.

**Important Gaps:** Convention tests frontend à trancher en v0.1. Version Python/Node à inscrire dans Dockerfile et README. Détail mapping FR13b après confrontation BDD/instance dev.

**Nice-to-Have:** Exemples de fichiers squelettes pour premier commit ; non bloquant.

### Architecture Completeness Checklist

**Requirements Analysis:** [x] Contexte, scale, contraintes, cross-cutting concerns.

**Architectural Decisions:** [x] Décisions critiques et importantes, stack, intégrations, perf.

**Implementation Patterns:** [x] Nommage, structure, formats, communication, process, enforcement.

**Project Structure:** [x] Arborescence, boundaries, intégrations, FR vers structure.

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** Élevé. Quelques précisions à trancher en v0.1 (tests front, versions exactes, loader modules).

**Key Strengths:** Décisions claires, patterns explicites, mapping FR vers dossiers, audit log et monitoring avec messages dev/super-admin.

**Areas for Future Enhancement:** CI/CD, SSO, monitoring avancé, mutualisation PostgreSQL + Bypass si besoin.

### Implementation Handoff

**AI Agent Guidelines:** Suivre les décisions et patterns de ce document. Respecter la structure et les frontières. Référence unique pour les questions d'architecture.

**First Implementation Priority:** Initialiser le frontend (npm create vite@latest frontend -- --template react-ts), créer la structure API (main.py, config, routers, montage statics + catch-all + health), Docker Compose minimal (RecyClique, Paheko, Redis, PostgreSQL RecyClique). Voir Starter Template Evaluation et Project Structure.
