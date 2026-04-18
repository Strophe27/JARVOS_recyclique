---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - references/artefacts/2026-02-26_01_analyse-separation-frontend-backend-recyclic.md
  - references/artefacts/2026-02-26_02_track-enterprise-multi-utilisateur.md
  - references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md
  - references/ou-on-en-est.md
  - references/todo.md
  - references/versioning.md
---

# JARVOS_recyclique - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for JARVOS_recyclique, decomposing the requirements from the PRD, UX decisions (reuse 1.4.4 design + openings for dynamic layouts), and Architecture requirements into implementable stories. La cible de livraison est la **première version en production** (parité 1.4.4 + sync, sans rupture). La planification est portée par les epics et stories ; les numéros de version intermédiaires ne pilotent pas le développement (voir `references/versioning.md`). Stories à sous-découper par niveau de difficulté pour les cycles SM/DEV/vérification ; re-découpage possible en implémentation (ex. par l'agent SM) si une story est trop grande.

## Requirements Inventory

### Functional Requirements

FR1: Un opérateur habilité peut démarrer une session de caisse (avec fond de caisse) sur un poste donné.
FR2: Un opérateur habilité peut enregistrer des ventes (lignes, catégories, quantités, prix, poids éventuels, paiements multi-moyens) pendant la session.
FR3: Un opérateur habilité peut clôturer la session de caisse (comptage physique, totaux, écart éventuel) et déclencher le contrôle et la sync comptable.
FR4: Le système peut restreindre l'accès au menu caisse uniquement lorsque le poste est en mode caisse (écran verrouillé sur la caisse).
FR5: Une personne habilitée peut déverrouiller la session (ou quitter le mode caisse) en saisissant son code PIN.
FR6: Le système peut gérer plusieurs lieux et plusieurs caisses (multi-sites, multi-caisses).
FR7: Le système peut pousser chaque ticket de vente vers Paheko (push par ticket, file résiliente) sans double saisie compta.
FR7b: Le système peut permettre la saisie caisse hors ligne (buffer local) et synchroniser les tickets vers Paheko au retour en ligne (file Redis Streams côté backend).
FR8: Un opérateur peut ouvrir un poste de réception et créer des tickets de dépôt.
FR9: Un opérateur peut saisir des lignes de réception (poids, catégorie, destination) sur un ticket.
FR10: Le système conserve la réception comme source de vérité matière/poids (aucune sync manuelle obligatoire vers Paheko).
FR11: Le système peut synchroniser les données caisse (sessions, tickets, lignes, paiements) vers Paheko à la clôture (contrôle totaux, syncAccounting). Une session RecyClique = une session Paheko par caisse (multi-caisses).
FR12: Un responsable compta peut administrer la compta via l'interface Paheko (v1) en attendant les interfaces RecyClique.
FR13: (Post-MVP) Un responsable compta peut effectuer les opérations compta (bilan, rapprochement, scan factures, notes de frais) depuis RecyClique.
FR13b: Le système peut gérer un mapping prédéfini entre RecyClique et Paheko (moyens de paiement, catégories caisse, sites/emplacements, etc.) pour la v1 ; périmètre à figer lorsque BDD et instance dev sont stabilisées.
FR14: Un administrateur peut démarrer un poste (caisse ou réception) avec un compte administrateur (ou équivalent).
FR15: Le système peut associer un code PIN à chaque personne habilitée à la caisse pour le déverrouillage de session.
FR16: (Phase initiale) Le système peut authentifier les utilisateurs terrain via JWT (FastAPI) et les utilisateurs admin via Paheko (auth séparée).
FR17: (Phase ultérieure) Le système peut offrir un SSO entre RecyClique et Paheko (à documenter).
FR18: Un admin technique peut déployer et configurer l'instance (RecyClique en un container : front + middleware, Paheko, PostgreSQL, Redis) via Docker Compose.
FR19: Un admin technique peut configurer le canal push RecyClique → Paheko (endpoint, secret, résilience).
FR20: Le système peut conserver les tickets non poussés en file (Redis Streams) et les repousser après indisponibilité de Paheko (retry sans perte).
FR21: Un utilisateur peut accéder à des écrans ou placeholders « vie associative » depuis RecyClique (calendrier, activités à dérouler post-MVP).
FR22: Le système peut produire et conserver les données déclaratives (poids, flux, catégories, périodes) dans RecyClique pour les déclarations éco-organismes.
FR23: (Post-MVP) Le système peut exposer un module décla éco-organismes (exports, multi-éco-organismes) depuis RecyClique.
FR24: Le système peut charger et activer des modules RecyClique via configuration (TOML, ModuleBase, EventBus Redis Streams, slots React).
FR25: Le système peut faire coexister des plugins Paheko et des modules RecyClique pour activer de nouvelles fonctionnalités (combinaison des deux écosystèmes).
FR26: Le système peut exposer des points d'extension (LayoutConfigService, VisualProvider) avec implémentations stub en v1, pour brancher ultérieurement affichage dynamique et service Peintre (JARVOS Mini).
FR27: (Post-MVP) Le système peut gérer un fonds documentaire RecyClique (statutaire, com, prise de notes) distinct de la compta/factures Paheko ; stockage K-Drive ou volume dédié ; évolution JARVOS Nano/Mini pour recherche/édition intelligentes.

### NonFunctional Requirements

NFR-P1: L'enregistrement d'une vente (saisie + envoi) se termine en moins de 2 secondes dans des conditions normales.
NFR-P2: La clôture de session ne bloque pas l'opérateur plus de 10 secondes ; le push et la sync comptable peuvent s'achever en arrière-plan.
NFR-S1: Les échanges RecyClique ↔ Paheko (push) passent par HTTPS avec un secret partagé ; aucun secret en clair dans les requêtes.
NFR-S2: Les secrets (endpoint plugin, credentials) sont gérés via variables d'environnement ou secrets manager, pas en dur dans le code.
NFR-S3: Accès caisse restreint par mode verrouillé (menu caisse seul) et déverrouillage par PIN par opérateur habilité.
NFR-S4: Données personnelles (utilisateurs, adhésions) conformes au RGPD dans le périmètre géré par Paheko/RecyClique.
NFR-I1: La file de push (Redis Streams) garantit qu'aucun ticket n'est perdu en cas d'indisponibilité temporaire de Paheko ; retry jusqu'à succès (ou traitement manuel documenté).
NFR-I2: Les écritures compta (syncAccounting) respectent la configuration Paheko (comptes, exercice, moyens de paiement) ; la config Paheko est la référence.
NFR-A1: Bonnes pratiques d'accessibilité de base (contraste, navigation clavier) pour les écrans caisse et réception ; renforcement possible post-MVP.

### Additional Requirements

**Starter / Epic 1 Story 1 (Architecture):**
- Frontend : initialiser avec `npm create vite@latest frontend -- --template react-ts` (Vite + React + TypeScript) ; structure par domaine (caisse, reception, auth, admin, shared).
- Backend RecyClique : structure FastAPI manuelle (routers par domaine, schemas Pydantic, config, services) ; montage des statics (frontend/dist) + route catch-all SPA + health check.
- Un seul container RecyClique (front build + API) ; Paheko, PostgreSQL, Redis en services séparés (Docker Compose).

**Infrastructure et déploiement:**
- Docker Compose : RecyClique (un container), Paheko (SQLite), PostgreSQL (RecyClique), Redis (EventBus + file push). Une instance par ressourcerie.
- Config via variables d'environnement / secrets manager ; pas de secrets en dur.

**Intégration et résilience:**
- API REST, JSON ; montants en centimes ; poids en kg (réception) / conversion vers Paheko (g si besoin).
- EventBus Redis Streams côté serveur uniquement ; le front passe par l'API.
- Paheko : API HTTP + plugin PHP custom (endpoint sécurisé) pour push/syncAccounting.

**Logging et observabilité:**
- Logs structurés (JSON ou format fixe) ; request_id propagé front → back ; pas de données sensibles en logs.
- Health check : app up, BDD RecyClique, Redis (ping), éventuellement Paheko joignable.
- Audit log / journal des actions métier : table dédiée (ex. audit_events) pour ouvertures/fermetures caisse et réception, clôtures avec sync, modifications config sensibles, connexions/déconnexions.

**Monitoring technique (architecture):**
- Visibilité sur la file de push (taille, retard) pour détecter Paheko down ou retard.
- Métriques (ex. Prometheus) : nb requêtes, latence, erreurs par route, taille file Redis — à prévoir même si outil (Grafana, alertes) vient après v1.
- Capteurs et seuils pour déclencher messages dev/super-admin (activation cache applicatif, store global frontend) — définir métriques et processus de revue.

**Patterns et conventions (implémentation):**
- BDD : snake_case (tables pluriel, colonnes, index idx_{table}_{colonne}).
- API : endpoints pluriel snake_case ; réponses succès = objet ou liste ; erreur = { "detail": "..." } ou { "error": { "code", "message" } } ; dates ISO 8601 ; montants centimes.
- Frontend : composants PascalCase, hooks/fonctions camelCase ; state immuable ; isLoading/isPending pour chargement.
- Événements Redis : nommage dot.lowercase ou snake_case (ex. pos.ticket.created) ; payload JSON snake_case ; idempotence et acks après traitement.

**UX v1 (PRD + décision projet):**
- Mêmes écrans que RecyClique 1.4.4 (copy + consolidate + security) ; pas de refonte UX pour la v1.
- Ouvertures pour designs dynamiques : extension points (LayoutConfigService, VisualProvider) en stubs v1 ; structure frontend et slots doivent anticiper évolution vers layout configurable et Peintre/JARVOS Mini.
- Référence détaillée : `_bmad-output/planning-artifacts/ux-design-specification.md` (stratégie, périmètre écrans, règle d'import, préparation v2+).

**Checklist v0.1 (artefact 2026-02-26_03):**
- Intégrer loader modules (TOML, ModuleBase) et slots dans les premières stories modulaires ; prévoir la place dans l'arborescence frontend/API dès le début.
- Trancher convention tests frontend : co-located *.test.tsx vs __tests__ au niveau module.
- Figer versions Python et Node dans Dockerfile et README (ex. Python 3.12, Node 20 LTS).
- Détail module correspondance (FR13b) : affiner après confrontation BDD + instance dev + analyste (stories correspondance).

**Versioning et livraison (references/versioning.md):**
- Cible : première version en production (parité usabilité 1.4.4 minimum). Les versions intermédiaires (v0.x) ne sont pas un plan de livraison contraignant ; voir `references/versioning.md`.

**Option Bypass (Architecture, documentée pour plus tard):**
- Si base partagée PostgreSQL (schémas paheko + recyclic) un jour retenue : RecyClique pourrait lire/écrire directement certaines ressources Paheko pour éviter APIs manquantes. Non applicable avec Paheko en SQLite en v1.

**Traçabilité FR :**
- FR26 s'appuie sur la recherche technique affichage dynamique / Peintre : `_bmad-output/planning-artifacts/research/technical-affichage-dynamique-peintre-extension-points-research-2026-02-25.md`.
- FR27 s'appuie sur la politique fichiers : artefact `references/artefacts/2026-02-25_02_chantier-fichiers-politique-documentaire.md`.

### FR Coverage Map

FR1: Epic 4 - Démarrer session de caisse
FR2: Epic 4 - Enregistrer ventes (lignes, catégories, paiements)
FR3: Epic 4 - Clôturer session et déclencher contrôle + sync
FR4: Epic 2 - Restreindre menu caisse (mode verrouillé)
FR5: Epic 2 - Déverrouiller par PIN
FR6: Epic 4 - Multi-sites, multi-caisses
FR7: Epic 4 - Push par ticket vers Paheko
FR7b: Epic 4 - Saisie caisse hors ligne + sync au retour
FR8: Epic 5 - Ouvrir poste réception, créer tickets dépôt
FR9: Epic 5 - Saisir lignes réception (poids, catégorie, destination)
FR10: Epic 5 - Réception source de vérité matière/poids
FR11: Epic 4 - Sync caisse vers Paheko à la clôture (syncAccounting)
FR12: Epic 6 - Administrer compta via Paheko (v1)
FR13: (Post-MVP) — Epic 6 ou évolution ultérieure
FR13b: Epic 3 - Mapping RecyClique↔Paheko (moyens de paiement, catégories, sites)
FR14: Epic 2 - Démarrer poste avec compte admin
FR15: Epic 2 - PIN par opérateur caisse
FR16: Epic 2 - Authentification JWT (terrain) et Paheko (admin)
FR17: Epic 2 - SSO RecyClique↔Paheko (phase ultérieure)
FR18: Epic 1 - Déployer et configurer instance (Docker Compose)
FR19: Epic 3 - Configurer canal push (endpoint, secret, résilience)
FR20: Epic 4 - File Redis Streams et retry sans perte
FR21: Epic 6 - Placeholders vie associative
FR22: Epic 7 - Données déclaratives (poids, flux, catégories, périodes)
FR23: (Post-MVP) Epic 7 - Module décla éco-organismes
FR24: Epic 1 - Charger modules (TOML, ModuleBase, EventBus, slots)
FR25: Epic 1 - Coexistence plugins Paheko et modules RecyClique
FR26: Epic 8 - Points d'extension (LayoutConfigService, VisualProvider) stubs v1
FR27: (Post-MVP) Epic 8 - Fonds documentaire RecyClique

### Epic List

### Epic 1: Socle technique et déploiement
Permettre à l'admin technique de déployer et faire tourner l'instance (RecyClique + Paheko + PostgreSQL + Redis), avec structure frontend (Vite React TS) et API (FastAPI), health check, et base pour le chargement de modules (TOML, ModuleBase, EventBus Redis Streams, slots React). Une instance par ressourcerie.
**FRs couverts :** FR18, FR24, FR25.

### Epic 2: Authentification et contrôle d'accès
Permettre aux utilisateurs de s'authentifier (JWT terrain, Paheko admin), à un admin de démarrer un poste (caisse ou réception), et aux opérateurs caisse d'utiliser un PIN pour déverrouiller la session ; le système restreint l'accès au menu caisse en mode caisse (écran verrouillé). SSO (phase ultérieure) à documenter.
**FRs couverts :** FR4, FR5, FR14, FR15, FR16, FR17 (phase ultérieure).

### Epic 3: Correspondance et configuration du canal push
Permettre à l'admin technique de configurer le mapping RecyClique↔Paheko (moyens de paiement, catégories caisse, sites/emplacements) et le canal push (endpoint, secret, résilience) pour que la caisse puisse synchroniser vers Paheko. **À préciser dans les stories :** périmètre exact du mapping catégories/poids et frontière réception vs caisse, à figer lorsque BDD et instance dev sont stabilisées.
**FRs couverts :** FR13b, FR19.

### Epic 4: Caisse et synchronisation Paheko
Permettre à un opérateur habilité de gérer des sessions de caisse (ouverture avec fond de caisse, enregistrement des ventes, clôture avec comptage et contrôle), en multi-sites/multi-caisses, avec push par ticket vers Paheko (file Redis Streams, retry sans perte) et sync comptable à la clôture. Option saisie hors ligne (buffer local) et sync au retour.
**FRs couverts :** FR1, FR2, FR3, FR6, FR7, FR7b, FR11, FR20.

### Epic 5: Réception et flux matière
Permettre à un opérateur d'ouvrir un poste de réception, de créer des tickets de dépôt et de saisir des lignes (poids, catégorie, destination). La réception reste source de vérité matière/poids dans RecyClique, sans sync manuelle obligatoire vers Paheko.
**FRs couverts :** FR8, FR9, FR10.

### Epic 6: Administration compta (v1) et vie associative
Permettre au responsable compta d'administrer la compta via l'interface Paheko en v1, et aux utilisateurs d'accéder à des écrans ou placeholders « vie associative » depuis RecyClique (calendrier, activités à dérouler post-MVP).
**FRs couverts :** FR12, FR21.

### Epic 7: Données déclaratives et éco-organismes
Permettre au système de produire et conserver les données déclaratives (poids, flux, catégories, périodes) dans RecyClique pour les déclarations éco-organismes. Module décla complet (exports, multi-éco-organismes) en post-MVP.
**FRs couverts :** FR22, FR23 (post-MVP).

### Epic 8: Extension points et évolution
Exposer des points d'extension (LayoutConfigService, VisualProvider) avec implémentations stub en v1 pour brancher ultérieurement affichage dynamique et service Peintre (JARVOS Mini). Fonds documentaire RecyClique (post-MVP). Références : recherche technique Peintre (FR26), politique fichiers (FR27).
**FRs couverts :** FR26, FR27 (post-MVP).

---

## Epic 1: Socle technique et déploiement

Permettre à l'admin technique de déployer et faire tourner l'instance (RecyClique + Paheko + PostgreSQL + Redis), avec structure frontend (Vite React TS) et API (FastAPI), health check, et base pour le chargement de modules (TOML, ModuleBase, EventBus Redis Streams, slots React). Une instance par ressourcerie.

### Story 1.1: Initialiser le frontend (Vite React TS) et la structure des dossiers par domaine

En tant qu'admin technique ou développeur,
je veux un frontend RecyClique initialisé avec Vite (template react-ts) et une arborescence par domaine (caisse, reception, auth, admin, shared),
afin de disposer d'une base TypeScript stricte et d'une structure prête pour l'import 1.4.4 et les slots.

**Critères d'acceptation :**

**Étant donné** un environnement avec Node et npm (ou pnpm/yarn) disponibles  
**Quand** j'exécute `npm create vite@latest frontend -- --template react-ts` (ou équivalent) et j'organise `frontend/src/` en sous-dossiers par domaine (caisse, reception, auth, admin, shared, core, types)  
**Alors** le projet frontend build sans erreur (`npm run build`)  
**Et** les conventions de nommage (composants PascalCase, hooks camelCase) et la structure sont documentées ou alignées avec l'architecture (Project Structure).

### Story 1.2: Créer la structure API FastAPI, montage statics et health check

En tant qu'admin technique ou développeur,
je veux une application FastAPI avec routers par domaine, montage des statics (frontend/dist), route catch-all pour le SPA et un endpoint de health check,
afin de servir le front et l'API dans un seul processus et de vérifier l'état de l'instance.

**Critères d'acceptation :**

**Étant donné** un environnement Python avec FastAPI installé  
**Quand** l'API est structurée (routers auth, pos, reception, admin ; config, schemas, services ; montage StaticFiles sur frontend/dist et route catch-all ; endpoint `/health` ou `/ready`)  
**Alors** l'endpoint health vérifie au minimum : application up, connexion BDD RecyClique (si configurée), ping Redis  
**Et** les réponses API suivent les patterns (snake_case, dates ISO 8601, montants en centimes) ; pas de secrets en dur (config via Pydantic Settings / env).

### Story 1.3: Docker Compose minimal et déploiement d'une instance

En tant qu'admin technique,
je veux déployer l'instance complète (RecyClique en un container, Paheko, PostgreSQL, Redis) via Docker Compose,
afin de faire tourner RecyClique et ses dépendances en une seule commande.

**Critères d'acceptation :**

**Étant donné** un fichier `docker-compose.yml` et un Dockerfile pour RecyClique (build frontend puis image avec FastAPI servant dist + API)  
**Quand** je lance `docker-compose up` avec les services RecyClique, Paheko (SQLite), PostgreSQL (RecyClique), Redis  
**Alors** le container RecyClique démarre et sert le front et l'API ; le health check répond  
**Et** les secrets et la config passent par variables d'environnement ou fichier .env (NFR-S2) ; les versions Python et Node sont figées dans le Dockerfile et documentées dans le README (checklist v0.1).

### Story 1.4: Squelette du loader de modules (TOML, ModuleBase) et place pour EventBus/slots

En tant que développeur,
je veux une base pour le chargement de modules RecyClique (TOML, contrat ModuleBase, place pour EventBus Redis Streams et slots React dans l'arborescence),
afin de pouvoir activer des modules par configuration sans refonte ultérieure.

**Critères d'acceptation :**

**Étant donné** l'arborescence frontend et API existante  
**Quand** le loader (côté API) lit une config TOML et enregistre des modules respectant un contrat ModuleBase, et que l'arborescence prévoit la place pour EventBus (workers, streams) et slots React (frontend)  
**Alors** au moins un module exemple ou stub peut être chargé au démarrage  
**Et** la structure est documentée dans l'architecture (FR24, FR25) ; convention de tests frontend tranchée (co-located *.test.tsx vs __tests__) et appliquée.

---

## Epic 2: Authentification et contrôle d'accès

Permettre aux utilisateurs de s'authentifier (JWT terrain, Paheko admin), à un admin de démarrer un poste (caisse ou réception), et aux opérateurs caisse d'utiliser un PIN pour déverrouiller la session ; le système restreint l'accès au menu caisse en mode caisse (écran verrouillé).

### Story 2.1: Authentification JWT (FastAPI) pour les utilisateurs terrain

En tant qu'opérateur terrain,
je veux me connecter à RecyClique avec un identifiant et un mot de passe et recevoir un token JWT,
afin d'accéder aux fonctionnalités selon mon rôle.

**Critères d'acceptation :**

**Étant donné** un utilisateur terrain avec identifiant et mot de passe valides  
**Quand** je soumets mes identifiants à l'API (ex. POST /api/auth/login)  
**Alors** l'API retourne un JWT (et éventuellement un refresh token) ; les requêtes avec le token dans le header sont reconnues (FR16)  
**Et** les utilisateurs admin peuvent continuer à s'authentifier via Paheko (auth séparée) ; les secrets et la config JWT sont en env (NFR-S2).

### Story 2.2: Démarrer un poste (caisse ou réception) avec un compte administrateur

En tant qu'administrateur,
je veux démarrer un poste de caisse ou de réception avec mon compte admin (ou équivalent),
afin qu'un opérateur puisse ensuite utiliser ce poste en mode verrouillé ou en réception.

**Critères d'acceptation :**

**Étant donné** un utilisateur avec rôle administrateur (ou équivalent) authentifié  
**Quand** je demande l'ouverture d'un poste caisse ou réception (ex. API ou écran dédié) pour un lieu/caisse donné  
**Alors** le poste est enregistré (session ou poste réception) et l'état est disponible pour la suite (FR14)  
**Et** l'action est tracée (audit log) ; en multi-sites/multi-caisses, le lieu/caisse est associé au poste.

### Story 2.3: Gestion des PIN opérateur caisse et déverrouillage de session

En tant qu'opérateur habilité à la caisse,
je veux avoir un code PIN personnel et pouvoir déverrouiller la session caisse (ou quitter le mode caisse) en le saisissant,
afin que seul un opérateur autorisé puisse sortir du mode caisse.

**Critères d'acceptation :**

**Étant donné** une personne habilitée à la caisse avec un PIN configuré  
**Quand** le poste est en mode caisse verrouillé et que je saisis mon PIN correct  
**Alors** la session se déverrouille (ou le mode caisse est quitté) et l'accès au reste de l'application est rétabli selon mes droits (FR5, FR15)  
**Et** un PIN incorrect ne déverrouille pas ; l'association PIN / utilisateur est gérée de façon sécurisée (NFR-S3).

### Story 2.4: Mode caisse verrouillé — restriction du menu à la caisse uniquement

En tant qu'opérateur en poste caisse,
je veux que l'écran soit verrouillé sur le menu caisse uniquement (aucun autre menu accessible) tant que la session n'est pas déverrouillée par PIN,
afin de garantir que seules les actions caisse sont possibles sur ce poste.

**Critères d'acceptation :**

**Étant donné** un poste en mode caisse actif (session ouverte par un admin)  
**Quand** je navigue dans l'application sans avoir déverrouillé par PIN  
**Alors** seul le menu (ou les écrans) caisse sont accessibles ; les autres routes sont inaccessibles ou masquées (FR4)  
**Et** le déverrouillage exige le PIN d'un opérateur habilité (Story 2.3) ; le comportement est cohérent avec la matrice RBAC du PRD.

### Story 2.5: (Phase ultérieure) SSO RecyClique–Paheko — documentation et objectif

En tant qu'admin technique,
je veux une documentation (ou une spec) pour le SSO entre RecyClique et Paheko,
afin de préparer l'authentification unifiée en phase ultérieure.

**Critères d'acceptation :**

**Étant donné** les choix d'auth actuels (JWT terrain, Paheko admin)  
**Quand** le périmètre phase ultérieure inclut le SSO  
**Alors** un document décrit l'objectif, les options (tokens, OpenID, etc.) et les contraintes Paheko (FR17)  
**Et** les stories d'implémentation pourront s'appuyer sur cette spec (cette story peut être limitée à la rédaction de la spec).

---

## Epic 3: Correspondance et configuration du canal push

Permettre à l'admin technique de configurer le mapping RecyClique↔Paheko (moyens de paiement, catégories caisse, sites/emplacements) et le canal push (endpoint, secret, résilience). À préciser dans les stories : périmètre exact du mapping catégories/poids et frontière réception vs caisse, à figer lorsque BDD et instance dev sont stabilisées.

### Story 3.1: Configuration du canal push (endpoint, secret, résilience)

En tant qu'admin technique,
je veux configurer l'endpoint du plugin Paheko, le secret partagé et les paramètres de résilience (retry, timeout) pour le push RecyClique → Paheko,
afin que la caisse puisse envoyer les tickets de façon sécurisée et fiable.

**Critères d'acceptation :**

**Étant donné** une instance RecyClique et Paheko déployées  
**Quand** je configure (via env, fichier de config ou API d'admin) l'URL de l'endpoint plugin, le secret partagé et les options de retry  
**Alors** la config est utilisée par le worker de push ; aucun secret n'est stocké en clair dans les requêtes (NFR-S1, NFR-S2)  
**Et** la résilience (nombre de tentatives, backoff) est documentée ou paramétrable (FR19).

### Story 3.2: Modèle et stockage du mapping RecyClique↔Paheko (moyens de paiement, catégories, sites)

En tant qu'admin technique ou responsable compta,
je veux que le système gère un mapping configurable entre les moyens de paiement, catégories caisse et sites/emplacements RecyClique et leurs équivalents Paheko,
afin que le push caisse produise les bonnes écritures compta.

**Critères d'acceptation :**

**Étant donné** une BDD RecyClique et une instance dev stabilisées  
**Quand** le périmètre exact du mapping (catégories, poids, frontière réception vs caisse) est figé (voir note Epic 3), **ou** lorsqu'un périmètre minimal est documenté (ex. moyens de paiement, sites) à étendre lorsque BDD et instance dev sont stabilisées  
**Alors** les entités ou tables nécessaires existent (moyens de paiement, catégories caisse, sites/emplacements) avec les champs de correspondance Paheko  
**Et** les données peuvent être créées/mises à jour via API ou interface ; la config Paheko reste la référence (NFR-I2, FR13b).

### Story 3.3: Interface ou API d'administration du mapping

En tant qu'admin ou responsable compta,
je veux consulter et modifier le mapping (moyens de paiement, catégories, sites) via une interface ou une API RecyClique,
afin de configurer à l'avance tout ce qui est nécessaire pour la sync caisse sans ouvrir Paheko pour cette config.

**Critères d'acceptation :**

**Étant donné** le modèle de mapping (Story 3.2) et un utilisateur avec droits admin  
**Quand** j'accède à l'écran ou à l'API d'administration du mapping  
**Alors** je peux lister et éditer les correspondances (RecyClique → Paheko) pour moyens de paiement, catégories caisse, sites/emplacements  
**Et** les modifications sensibles sont tracées (audit log) ; le périmètre (catégories/poids, réception vs caisse) est documenté dans la story ou le doc d'architecture quand il est figé.

---

## Epic 4: Caisse et synchronisation Paheko

Permettre à un opérateur habilité de gérer des sessions de caisse (ouverture avec fond de caisse, enregistrement des ventes, clôture avec comptage et contrôle), en multi-sites/multi-caisses, avec push par ticket vers Paheko (file Redis Streams, retry sans perte) et sync comptable à la clôture.

### Story 4.1: Ouverture et fermeture de session de caisse (avec fond de caisse) — multi-sites/multi-caisses

En tant qu'opérateur caisse (poste démarré par un admin),
je veux ouvrir une session de caisse avec un fond de caisse pour un lieu et une caisse donnés, et pouvoir la fermer (sans clôture comptable),
afin de tenir une caisse par point de vente et par jour.

**Critères d'acceptation :**

**Étant donné** un poste caisse actif (Epic 2) et un lieu/caisse identifiés  
**Quand** j'ouvre une session avec un montant de fond de caisse  
**Alors** la session est créée côté RecyClique ; lorsque l'intégration avec le plugin Paheko le permet, une session Paheko correspondante est créée (une session RecyClique = une session Paheko par caisse) ; je peux fermer la session sans lancer la clôture (FR1, FR6)  
**Et** les sessions sont listables et tracées (audit log) ; multi-sites/multi-caisses : chaque caisse a sa session.

### Story 4.2: Enregistrement des ventes (lignes, catégories, quantités, prix, poids, paiements multi-moyens)

En tant qu'opérateur caisse,
je veux enregistrer des ventes sous forme de tickets avec lignes (catégorie, quantité, prix, poids éventuel) et paiements (un ou plusieurs moyens),
afin que chaque vente soit enregistrée et prête à être poussée vers Paheko.

**Critères d'acceptation :**

**Étant donné** une session de caisse ouverte  
**Quand** j'ajoute des lignes à un ticket (catégorie, quantité, prix, poids si applicable) et je saisis un ou plusieurs paiements (montant par moyen)  
**Alors** le ticket et les lignes sont persistés en BDD RecyClique ; les montants sont en centimes (FR2)  
**Et** le temps de réponse pour enregistrer une vente reste inférieur à 2 secondes en conditions normales (NFR-P1) ; les moyens de paiement utilisés sont conformes au mapping (Epic 3).

### Story 4.3: Push par ticket vers Paheko (file Redis Streams, worker, plugin)

En tant qu'opérateur caisse,
je veux que chaque ticket de vente soit poussé automatiquement vers Paheko (file Redis Streams, worker, plugin sécurisé),
afin qu'aucun ticket ne soit perdu et que la compta reçoive les ventes sans double saisie.

**Critères d'acceptation :**

**Étant donné** un ticket enregistré (Story 4.2) et la config du canal push (Epic 3)  
**Quand** le ticket est finalisé (ou envoyé à la file)  
**Alors** il est ajouté à la file Redis Streams avec un payload structuré (snake_case, event type) ; un worker consomme la file et envoie les tickets à l'endpoint Paheko (HTTPS, secret partagé) (FR7, NFR-S1, NFR-I1)  
**Et** en cas d'échec (Paheko indisponible), le ticket reste en file et est repris au retry (FR20) ; les acks sont faits après traitement réussi (pas de perte).

### Story 4.4: Clôture de session (comptage physique, totaux, écart) et contrôle + syncAccounting

En tant qu'opérateur caisse,
je veux clôturer ma session en saisissant le comptage physique et les totaux, avec gestion d'un éventuel écart, et déclencher le contrôle et la sync comptable vers Paheko,
afin que la caisse soit bouclée et la compta à jour sans double saisie.

**Critères d'acceptation :**

**Étant donné** une session de caisse avec des tickets (certains déjà poussés, d'autres en file)  
**Quand** je lance la clôture et saisis les totaux (comptage physique, écart éventuel)  
**Alors** un contrôle des totaux RecyClique vs Paheko est effectué ; la sync comptable (syncAccounting) est déclenchée côté Paheko (via plugin) ; la session est marquée clôturée (FR3, FR11)  
**Et** l'opérateur n'est pas bloqué plus de 10 secondes ; le push et la sync peuvent s'achever en arrière-plan (NFR-P2) ; l'écriture compta respecte la config Paheko (NFR-I2).

### Story 4.5: (Optionnel v1) Saisie caisse hors ligne et synchronisation au retour

En tant qu'opérateur caisse,
je veux pouvoir enregistrer des ventes en local quand le réseau est indisponible, puis synchroniser les tickets vers Paheko au retour en ligne,
afin de ne pas bloquer la vente en cas de coupure.

**Critères d'acceptation :**

**Étant donné** un frontend avec buffer local (ex. IndexedDB ou state persistant) et une file Redis Streams côté backend  
**Quand** le frontend est hors ligne, je continue à saisir des ventes ; au retour en ligne, les tickets sont envoyés à l'API puis à la file  
**Alors** les tickets sont bien en file et traités comme en Story 4.3 ; aucune perte de donnée (FR7b)  
**Et** le périmètre (v1 ou post-v1) est clarifié dans le plan de release ; si reporté, la story peut être marquée optionnelle ou déplacée.

---

## Epic 5: Réception et flux matière

Permettre à un opérateur d'ouvrir un poste de réception, de créer des tickets de dépôt et de saisir des lignes (poids, catégorie, destination). La réception reste source de vérité matière/poids dans RecyClique.

### Story 5.1: Ouverture de poste de réception et création de tickets de dépôt

En tant qu'opérateur réception (poste démarré par un admin),
je veux ouvrir un poste de réception et créer des tickets de dépôt,
afin d'enregistrer les entrées matière de façon traçable.

**Critères d'acceptation :**

**Étant donné** un utilisateur autorisé avec un poste réception actif (Epic 2)  
**Quand** j'ouvre un poste de réception et je crée un nouveau ticket de dépôt  
**Alors** le poste et le ticket sont enregistrés en BDD RecyClique ; le ticket est listable et éditable (FR8)  
**Et** aucune sync manuelle vers Paheko n'est requise ; la réception est source de vérité matière (FR10).

### Story 5.2: Saisie des lignes de réception (poids, catégorie, destination)

En tant qu'opérateur réception,
je veux saisir sur chaque ticket des lignes avec poids, catégorie et destination,
afin que les flux matière soient disponibles pour les déclarations et le suivi.

**Critères d'acceptation :**

**Étant donné** un ticket de dépôt ouvert  
**Quand** j'ajoute des lignes avec poids (kg), catégorie et destination  
**Alors** les lignes sont persistées en BDD RecyClique ; les données sont disponibles pour exports ou déclarations (FR9, FR10)  
**Et** les bonnes pratiques d'accessibilité de base s'appliquent à l'écran (NFR-A1) ; pas de sync obligatoire vers Paheko pour la réception.

---

## Epic 6: Administration compta (v1) et vie associative

Permettre au responsable compta d'administrer la compta via l'interface Paheko en v1, et aux utilisateurs d'accéder à des écrans ou placeholders « vie associative » depuis RecyClique.

### Story 6.1: Accès et documentation pour l'administration compta via Paheko (v1)

En tant que responsable compta,
je veux savoir comment accéder à l'interface Paheko pour administrer la compta (écritures, bilan, rapprochement, etc.) en v1,
afin de faire la compta pendant que les interfaces RecyClique ne sont pas encore disponibles.

**Critères d'acceptation :**

**Étant donné** une instance avec RecyClique et Paheko déployés et la caisse synchronisée (Epic 4)  
**Quand** je consulte la documentation ou l'aide RecyClique  
**Alors** l'accès à l'interface Paheko pour la compta est documenté (URL, rôle requis) ; les écritures caisse sont déjà présentes grâce au push (FR12)  
**Et** aucun développement lourd n'est requis si l'accès Paheko existe déjà ; au besoin, un lien ou une redirection depuis RecyClique peut être ajouté.

### Story 6.2: Écrans ou placeholders « vie associative » dans RecyClique

En tant qu'utilisateur (ex. bénévole),
je veux accéder à des écrans ou placeholders « vie associative » (calendrier, activités) depuis RecyClique,
afin d'avoir un point d'entrée unique sans ouvrir Paheko pour la vie asso courante.

**Critères d'acceptation :**

**Étant donné** un utilisateur connecté avec accès vie asso (matrice RBAC)  
**Quand** je navigue vers la section vie associative  
**Alors** des écrans ou placeholders sont affichés (calendrier, activités à dérouler post-MVP) (FR21)  
**Et** le parcours complet (calendrier, événements) pourra être déroulé en growth ; en v1 les placeholders sont acceptables.

---

## Epic 7: Données déclaratives et éco-organismes

Permettre au système de produire et conserver les données déclaratives (poids, flux, catégories, périodes) dans RecyClique pour les déclarations éco-organismes.

### Story 7.1: Modèle et persistance des données déclaratives (poids, flux, catégories, périodes)

En tant que système,
je veux stocker les données nécessaires aux déclarations éco-organismes (poids, flux, catégories, périodes) dans RecyClique,
afin qu'elles soient la source de vérité pour les déclarations officielles.

**Critères d'acceptation :**

**Étant donné** les flux réception et caisse (Epics 4, 5) et les catégories mappées (Epic 3)  
**Quand** des données déclaratives sont produites (ex. agrégats par période, par catégorie, par flux)  
**Alors** elles sont persistées en BDD RecyClique (tables ou vues dédiées) ; les exports ou requêtes pour déclarations sont possibles (FR22)  
**Et** la traçabilité et le périmètre (alignement éco-organismes) sont documentés ou prévus pour une story ultérieure.

### Story 7.2: (Post-MVP) Module décla éco-organismes — exports et multi-éco-organismes

En tant que responsable,
je veux utiliser un module RecyClique dédié aux déclarations éco-organismes (exports, multi-éco-organismes),
afin de produire les déclarations officielles sans quitter RecyClique.

**Critères d'acceptation :**

**Étant donné** les données déclaratives (Story 7.1) et le périmètre post-MVP  
**Quand** le module décla est activé  
**Alors** je peux exporter ou soumettre les données selon le format attendu par les éco-organismes (FR23)  
**Et** la story est marquée post-MVP ; l'implémentation peut être reportée après v1.0.

---

## Epic 8: Extension points et évolution

Exposer des points d'extension (LayoutConfigService, VisualProvider) avec implémentations stub en v1 pour brancher ultérieurement affichage dynamique et service Peintre (JARVOS Mini).

### Story 8.1: Interfaces et stubs LayoutConfigService / VisualProvider (v1)

En tant que développeur ou intégrateur,
je veux des interfaces (LayoutConfigService, VisualProvider) et des implémentations stub exposées dans le frontend et l'API,
afin de brancher plus tard l'affichage dynamique et le service Peintre (JARVOS Mini) sans refonte majeure.

**Critères d'acceptation :**

**Étant donné** la structure frontend et l'architecture (recherche technique Peintre)  
**Quand** le code est en place  
**Alors** les interfaces (ou contrats) LayoutConfigService et VisualProvider existent et sont utilisables par les modules ; des stubs sont livrés en v1 (FR26)  
**Et** la structure et les slots permettent d'ajouter des implémentations réelles plus tard ; la recherche technique `technical-affichage-dynamique-peintre-extension-points-research-2026-02-25.md` est la référence.

### Story 8.2: (Post-MVP) Fonds documentaire RecyClique — stockage et frontière avec Paheko

En tant qu'organisation,
je veux gérer un fonds documentaire RecyClique (statutaire, com, prise de notes) distinct de la compta/factures Paheko, avec stockage type K-Drive ou volume dédié,
afin de centraliser la doc et préparer l'évolution JARVOS Nano/Mini (recherche, édition intelligentes).

**Critères d'acceptation :**

**Étant donné** la politique fichiers (artefact 2026-02-25_02) et le périmètre post-MVP  
**Quand** le fonds documentaire est implémenté  
**Alors** le stockage (volume dédié ou intégration type K-Drive) et la frontière avec Paheko sont définis (FR27)  
**Et** la story est post-MVP ; l'artefact politique fichiers est la référence pour le périmètre et la frontière.
