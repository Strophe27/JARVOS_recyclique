# Architecture consolidée du projet Recyclic

- **Auteur**: BMad Master (Synthèse)
- **Version**: 3.2
- **Date**: 2025-01-27
- **Objectif**: Remplacer les 21+ fichiers d'architecture précédents par une source de vérité unique, claire et exploitable pour tous les agents (IA et humains). Cette version intègre le pivot stratégique de l'abandon de kDrive au profit des rapports par email et l'ajout de l'historique utilisateur.
- **Changements v3.2** :
  - Documentation complète du modèle `CashSession` avec tous les champs
  - Ajout du workflow de saisie différée (Story B44-P1)
  - Documentation de l'exclusion des sessions vides (Story B44-P3)
  - Documentation des notes sur les ventes (Story B40-P4)
  - Documentation complète du système d'audit et traçabilité

---

## 1. Vision et Objectifs Métier

Recyclic est une plateforme de gestion complète pour les ressourceries, conçue pour digitaliser l'ensemble du workflow, de la collecte à la vente. L'objectif principal est de réduire drastiquement la charge administrative (de 3h à moins d'1h par jour) et d'assurer une conformité réglementaire sans faille (exports Ecologic), avec une classification d'objets assistée par IA sur les parcours actifs (interface web / API — voir `docs/architecture-current/`).

## 2. Principes et Patterns d'Architecture

L'architecture repose sur des choix pragmatiques visant la robustesse, la simplicité de déploiement et la maintenabilité.

- **Microservices Légers**: Le projet est découpé en services Docker indépendants (`api`, `frontend` ; ancien service automate messager retiré du compose par défaut) qui communiquent via des API REST. Cela permet une séparation claire des responsabilités.
- **PWA Offline-First**: L'interface de caisse est une Progressive Web App conçue pour fonctionner même sans connexion internet. Les données sont stockées localement (IndexedDB) et synchronisées dès que la connexion est rétablie.
- **API Gateway**: Un reverse proxy Nginx sert de point d'entrée unique, gérant le routage vers les services et la terminaison SSL.
- **Repository Pattern**: L'accès à la base de données dans le backend est abstrait via un Repository Pattern, ce qui isole la logique métier des détails de l'implémentation de la base de données.

## 3. Stack Technologique

| Catégorie          | Technologie        | Version | Rationale                                     |
| ------------------ | ------------------ | ------- | --------------------------------------------- |
| **Backend**        | Python / FastAPI   | 3.11+   | Performance, écosystème IA, OpenAPI natif.    |
| **Frontend**       | React / Vite / TS  | 18+     | Ecosystème mature, PWA, performance.          |
| **Base de données**| PostgreSQL         | 15      | Fiabilité, robustesse, support JSONB.         |
| **Cache & Jobs**   | Redis              | 7+      | Gestion des sessions et tâches asynchrones.   |
| **Infrastructure** | Docker Compose     | latest  | Simplicité de déploiement et de développement.|
| **Tests**          | Pytest / Vitest    | latest  | Standards des écosystèmes respectifs.         |

## 4. Composants du Système

```mermaid
graph TD
    subgraph "Accès Utilisateur"
        U2[💻 Bénévoles / caissiers via PWA et web]
    end

    subgraph "Infrastructure Docker"
        API[⚡ Backend FastAPI]
        WEB[🌐 Frontend React]
        NGINX[🔀 Reverse Proxy]
    end

    subgraph "Services de Données"
        PG[(📊 PostgreSQL)]
        RD[(⚡ Redis)]
    end

    subgraph "API Externes"
        AI[🧠 Gemini AI]
    end

    U2 --> NGINX
    NGINX --> WEB
    NGINX --> API
    API --> PG
    API --> RD
    API --> AI
```

- **Backend (FastAPI)**: Le cerveau de l'application. Il gère la logique métier, l'authentification, et la communication avec la base de données.
- **Frontend (React PWA)**: L'interface de caisse tactile, conçue pour être simple et fonctionner hors-ligne.
- **Dépôts (web)** : saisie des dépôts via les parcours documentés dans `architecture-current/` ; d’anciens flux « automate messager » ne sont plus déployés par défaut.

## 5. Architecture des Données

Les modèles de données principaux sont conçus pour être simples et relationnels.

- **`User`**: Gère les utilisateurs, leurs rôles et leur statut (voir section "Stratégie des Rôles" pour détails).
- **`UserStatusHistory`**: Trace l'historique des changements de statut d'un utilisateur.
- **`Deposit`**: Représente un dépôt d'objet, avec sa description, sa catégorie EEE et le statut de validation.
- **`Sale`**: Représente une vente, liée à une session de caisse. Peut contenir une note (Story B40-P4).
- **`CashSession`**: Gère l'ouverture, la fermeture et le suivi d'une caisse. Supporte la saisie différée (Story B44-P1).
- **`AuditLog`**: Journal d'audit centralisé pour traçabilité complète des actions système.

**Note importante**: Les interfaces TypeScript ci-dessous sont un exemple de ce qui **devrait être généré automatiquement** (voir section 7).

```typescript
// Exemple: /models/user.ts
export enum UserRole {
  SUPER_ADMIN = 'super-admin',
  ADMIN = 'admin',
  // ... etc
}

export interface User {
  id: string;
  username?: string;
  role: UserRole;
  // ... etc
}
```

> **Annexe A : Schéma SQL Complet**
> Le code SQL complet pour la création des tables, des types et des index est disponible dans le document :
> [**Annexe A : Schéma de la Base de Données](./appendix-database-schema.md)

### 5.2. Modèle CashSession - Structure Complète

Le modèle `CashSession` représente une session de caisse avec toutes ses métriques et son suivi.

**Champs Principaux :**
- `id` : UUID unique de la session
- `operator_id` : ID de l'opérateur (caissier) responsable
- `site_id` : ID du site où se déroule la session
- `register_id` : ID du poste de caisse (registre) utilisé (optionnel)
- `initial_amount` : Montant initial du fond de caisse
- `current_amount` : Montant actuel en caisse
- `status` : Statut de la session (`open` ou `closed`)

**Timestamps :**
- `opened_at` : Date et heure d'ouverture (peut être dans le passé pour saisie différée - Story B44-P1)
- `closed_at` : Date et heure de fermeture (null si session ouverte)

**Métriques d'Étapes (Workflow) :**
- `current_step` : Étape actuelle du workflow (`ENTRY`, `SALE`, `EXIT`)
- `last_activity` : Dernière activité utilisateur (pour gestion timeout)
- `step_start_time` : Début de l'étape actuelle (pour métriques de performance)

**Statistiques de Vente :**
- `total_sales` : Total des ventes effectuées
- `total_items` : Nombre total d'articles vendus

**Champs de Fermeture (Contrôle des Montants) :**
- `closing_amount` : Montant théorique calculé à la fermeture (fond initial + ventes)
- `actual_amount` : Montant physique compté à la fermeture
- `variance` : Écart entre théorique et physique
- `variance_comment` : Commentaire sur l'écart (obligatoire si écart significatif)

**Relations :**
- `sales` : Liste des ventes associées à la session (relation 1:N)
- `operator` : Relation vers l'utilisateur opérateur
- `site` : Relation vers le site
- `register` : Relation vers le poste de caisse

**Fonctionnalités Spéciales :**

1. **Saisie Différée (Story B44-P1)** :
   - Le champ `opened_at` peut être défini dans le passé pour saisir des ventes d'anciens cahiers
   - Seuls les ADMIN et SUPER_ADMIN peuvent créer des sessions avec `opened_at` personnalisé
   - Les sessions différées sont automatiquement exclues des statistiques live (KPIs)
   - Les ventes créées dans une session différée utilisent `opened_at` de la session comme `created_at`

2. **Exclusion des Sessions Vides (Story B44-P3)** :
   - Par défaut, les sessions vides (`total_sales = 0` ET `total_items = 0`) sont exclues des listes
   - Le filtre `include_empty=True` permet d'inclure ces sessions si nécessaire

### 5.3. Modèle Sale - Notes et Métadonnées

Le modèle `Sale` représente une vente individuelle dans une session de caisse.

**Champs Principaux :**
- `id` : UUID unique de la vente
- `cash_session_id` : ID de la session de caisse associée
- `operator_id` : ID de l'opérateur (optionnel, peut différer de l'opérateur de la session)
- `total_amount` : Montant total de la vente
- `donation` : Montant du don (optionnel, par défaut 0.0)
- `payment_method` : Méthode de paiement (`cash`, `card`, `check`)
- `note` : Note textuelle associée à la vente (Story B40-P4)
- `created_at` : Date et heure de création (utilise `opened_at` de la session si session différée)
- `updated_at` : Date et heure de dernière mise à jour

**Relations :**
- `cash_session` : Relation vers la session de caisse
- `operator` : Relation vers l'utilisateur opérateur
- `items` : Liste des articles vendus (relation 1:N vers `SaleItem`)

### 5.4. Système d'Audit et Traçabilité

Le système d'audit (`recyclic_api.core.audit`) fournit une traçabilité complète de toutes les actions système.

**Modèle AuditLog :**
- `id` : UUID unique de l'entrée d'audit
- `timestamp` : Date et heure de l'action
- `actor_id` : ID de l'utilisateur qui a effectué l'action
- `actor_username` : Nom d'utilisateur (pour traçabilité même si utilisateur supprimé)
- `action_type` : Type d'action (enum `AuditActionType`)
- `target_id` : ID de la cible de l'action (ex: ID de session, ID d'utilisateur)
- `target_type` : Type de la cible (ex: "cash_session", "user", "system")
- `details_json` : Détails supplémentaires en JSON (structure flexible)
- `description` : Description textuelle de l'action
- `ip_address` : Adresse IP de l'acteur (optionnel)
- `user_agent` : User-Agent de la requête (optionnel)

**Fonctions Spécialisées :**

1. **`log_cash_session_opening()`** :
   - Enregistre l'ouverture d'une session de caisse
   - Supporte la saisie différée avec `is_deferred`, `opened_at`, `created_at`
   - Trace le montant d'ouverture et le succès/échec

2. **`log_cash_session_closing()`** :
   - Enregistre la fermeture d'une session de caisse
   - Trace le montant de fermeture, l'écart (variance), et le commentaire

3. **`log_role_change()`** :
   - Enregistre les changements de rôle utilisateur
   - Trace l'ancien et le nouveau rôle

4. **`log_user_action()`** :
   - Version simplifiée pour les actions sur les utilisateurs
   - Utilisé pour création, modification, suppression d'utilisateurs

**Utilisation :**
Toutes les actions critiques sont tracées automatiquement dans le journal d'audit, permettant une traçabilité complète pour conformité et débogage.

## 5.1. Stratégie des Rôles Utilisateurs

### Vue d'Ensemble

Le système de gestion des utilisateurs de Recyclic repose sur un modèle de rôles hiérarchique simple mais efficace, conçu pour répondre aux besoins spécifiques des ressourceries.

### Rôles Définis

| Rôle | Code | Description | Permissions | Contexte Métier |
|------|------|-------------|-------------|-----------------|
| **Super Admin** | `super-admin` | Administrateur système complet | - Gestion complète des utilisateurs<br>- Configuration système<br>- Accès à tous les modules | Équipe technique interne |
| **Administrateur** | `admin` | Gestion opérationnelle | - Gestion des utilisateurs<br>- Validation des comptes<br>- Supervision des opérations | Direction de la ressourcerie |
| **Bénévole** | `user` | Utilisateur standard | - Enregistrement des dépôts<br>- Consultation de ses propres données | Bénévoles sur le terrain |

### Rôles Dépréciés (Non Utilisés)

**⚠️ Important :** Les rôles suivants ont été définis dans les types mais ne sont pas utilisés dans le contexte métier de Recyclic :

- `manager` : Non utilisé (pas de gestion hiérarchique complexe)
- `cashier` : Non utilisé (caisse gérée via interface PWA séparée)

Ces rôles sont conservés dans les types générés pour compatibilité technique mais ne doivent pas apparaître dans les interfaces utilisateur.

### Règles d'Attribution

1. **Super Admin** : Réservé à l'équipe de développement et aux administrateurs système
2. **Administrateur** : Attribué aux responsables de la ressourcerie pour la gestion quotidienne
3. **Bénévole** : Rôle par défaut pour tous les utilisateurs finaux

### Étiquettes d'Affichage

Pour assurer une expérience utilisateur cohérente, les étiquettes suivantes doivent être utilisées :

- `super-admin` → "Super Admin"
- `admin` → "Administrateur"
- `user` → "Bénévole"

### Contrôles d'Accès

Les permissions sont appliquées au niveau :
- **Backend** : Contrôle d'accès basé sur les rôles dans les endpoints FastAPI
- **Frontend** : Composants conditionnels selon le rôle utilisateur
- **API** : authentification JWT et contrôle des rôles sur les endpoints sensibles

## 6. Architecture API

L'API est construite sur le standard REST avec FastAPI. La documentation de l'API est auto-générée par FastAPI au format OpenAPI, ce qui garantit qu'elle est toujours à jour.

> **Annexe B : Spécification OpenAPI**
> Un extrait de la spécification OpenAPI, montrant la structure des endpoints et des schémas, est disponible dans le document :
> [**Annexe B : Spécification OpenAPI](./appendix-api-specification.md)**

---

## 7. Réalité de l'Implémentation et Plan de Refactoring

Cette section est la plus importante. Elle décrit l'écart entre la théorie et la pratique, et définit le plan pour y remédier.

### 7.1. Le Problème : Duplication et Désynchronisation

L'analyse du code a révélé un problème majeur : **les types de données sont définis manuellement et dupliqués** entre le backend (en Python/Pydantic) et le frontend (en TypeScript). Par exemple, l'énumération `UserRole` existe à deux endroits.

**Ceci est une dette technique critique** qui cause :
- Des **bugs** lorsqu'un type est modifié d'un côté mais pas de l'autre.
- Une **maintenance lourde** et une perte de temps pour les développeurs.
- De la **confusion** pour les agents de développement.

### 7.2. La Solution : Générer le Code (Contrat d'API Fort)

La solution à ce problème est de traiter la spécification OpenAPI générée par le backend comme la **seule source de vérité**.

**Action Requise :**
La story technique suivante a été créée pour résoudre ce problème. **Elle doit être exécutée en priorité** après la finalisation de la Story 3.2.

- **Story de référence** : `docs/stories/story-tech-debt-api-codegen.md`
- **Objectif** : Créer un script (`npm run codegen`) qui lit la spécification OpenAPI et génère automatiquement tout le code client TypeScript, y compris les interfaces, les énumérations et les fonctions d'appel à l'API.

L'exécution de cette story **éliminera la duplication manuelle** et fiabilisera l'ensemble du processus de développement.

### 7.3. Amélioration des Tests Backend

L'analyse a montré que les tests du backend vérifient la disponibilité des endpoints, mais pas toujours le contenu des réponses. 

**Action Requise :**
Une future story technique devra être créée pour **renforcer les tests d'intégration backend** afin qu'ils valident que les réponses de l'API sont conformes au contrat défini dans la spécification OpenAPI.

## 8. Workflows Métier Principaux

### Workflow de dépôt d’objet (historique)

> **Note produit** : le scénario « message vocal → classification via automate externe » n’est plus le parcours livré par défaut. Les dépôts et validations passent par l’interface web et l’API selon `docs/architecture-current/fonctionnalites-actuelles.md`. Le diagramme séquentiel historique a été retiré pour éviter toute confusion avec l’exploitation courante.

### Workflow de Vente (Interface Caisse PWA)

```mermaid
sequenceDiagram
    participant C as Caissier
    participant PWA as Interface PWA
    participant SW as Service Worker
    participant API as FastAPI
    participant DB as PostgreSQL
    
    C->>PWA: Ouvrir session caisse
    PWA->>API: POST /cash-sessions {opening_amount}
    API->>DB: Create session
    API->>PWA: Session created
    
    C->>PWA: Mode Catégorie → EEE-4
    C->>PWA: Mode Quantité → 2
    C->>PWA: Mode Prix → 15€
    PWA->>SW: Save draft locally
    
    alt Online
        PWA->>API: POST /sales
        API->>DB: Save sale
        API->>PWA: Sale confirmed
    else Offline
        PWA->>SW: Queue for sync
        SW->>PWA: Saved locally
    end
```

### Workflow d'Envoi de Rapport par Email

```mermaid
sequenceDiagram
    participant C as Caissier
    participant API as FastAPI
    participant EMAIL as Brevo Service
    participant ADMIN as Admin

    C->>API: POST /cash-sessions/close
    API->>API: 1. Générer le rapport CSV/PDF
    API->>EMAIL: 2. Envoyer l'email avec rapport en PJ
    EMAIL-->>API: Statut de l'envoi
    API->>DB: 3. Enregistrer le statut de l'envoi
    EMAIL->>ADMIN: 4. Email reçu par l'admin
```

### Workflow de Saisie Différée (Story B44-P1)

**Contexte :** Les caissiers utilisent des cahiers papier pour enregistrer les ventes lors de coupures internet ou pour gérer plusieurs jours de vente sur un même cahier. La saisie différée permet de saisir ces ventes a posteriori avec la date réelle de vente (date du cahier), pas la date de saisie.

**Permissions :** Seuls les ADMIN et SUPER_ADMIN peuvent créer des sessions avec date personnalisée.

```mermaid
sequenceDiagram
    participant A as Admin
    participant PWA as Interface PWA
    participant API as FastAPI
    participant DB as PostgreSQL
    participant AUDIT as Audit Log

    A->>PWA: Accéder mode saisie différée
    PWA->>A: Formulaire avec sélection date passée
    A->>PWA: Sélectionner date (ex: hier)
    A->>PWA: Saisir montant fond de caisse
    PWA->>API: POST /cash-sessions {opened_at: hier}
    API->>API: Valider opened_at <= now()
    API->>API: Vérifier permissions (ADMIN/SUPER_ADMIN)
    API->>DB: Créer session avec opened_at personnalisé
    API->>AUDIT: log_cash_session_opening(is_deferred=True)
    API->>PWA: Session créée
    
    A->>PWA: Saisir ventes (workflow normal)
    PWA->>API: POST /sales {session_id}
    API->>API: Détecter session différée (opened_at < now())
    API->>DB: Créer vente avec created_at = session.opened_at
    API->>PWA: Vente créée avec date du cahier
```

**Règles Métier :**
- `opened_at` ne peut pas être dans le futur
- Pas de limite dans le passé (peut saisir des cahiers très anciens)
- Les ventes créées dans une session différée utilisent `opened_at` de la session comme `created_at`
- Les sessions différées sont **automatiquement exclues** des statistiques live (KPIs) pour éviter de fausser les métriques
- Un opérateur peut avoir une session normale ouverte ET une session différée ouverte simultanément

**Impact sur les Statistiques :**
Les endpoints de statistiques (`/cash-sessions/stats`) excluent automatiquement les sessions différées en filtrant `opened_at >= date_from`. Cela garantit que les KPIs reflètent uniquement les sessions réellement ouvertes dans la période demandée.

### Workflow de Filtrage des Sessions (Story B44-P3)

**Comportement par défaut :** Les sessions vides (sans transaction : `total_sales = 0` ET `total_items = 0`) sont exclues des listes par défaut.

**Filtre `include_empty` :**
- `include_empty=False` (défaut) : Exclut les sessions vides
- `include_empty=True` : Inclut toutes les sessions, y compris les vides

**Utilisation :**
- Interface admin : Par défaut, seules les sessions avec activité sont affichées
- Audit complet : Utiliser `include_empty=True` pour voir toutes les sessions, y compris celles ouvertes puis fermées sans transaction

## 9. Stratégies Transverses (Qualité, Sécurité, Opérations)

Cette section définit les stratégies globales qui s'appliquent à l'ensemble du projet.

### 9.1. Stratégie de Test
La qualité est assurée par une approche en pyramide : un grand nombre de **tests unitaires** rapides, des **tests d'intégration** pour vérifier la communication entre les services (API+BDD, Frontend+API), et quelques **tests de bout-en-bout (E2E)** pour valider les parcours utilisateurs critiques.

Pour une documentation détaillée sur la manière de lancer les tests pour chaque partie du projet, veuillez consulter les guides suivants :
- **Backend:** [`api/testing-guide.md`](../../api/testing-guide.md)
- **Frontend:** [`frontend/TESTS_README.md`](../../frontend/TESTS_README.md)

### 9.2. Stratégie de Sécurité
- **Authentification** : JWT pour l’API et le frontend (nom d’utilisateur / mot de passe).
- **Autorisation**: Un système de rôles (RBAC) est appliqué sur les endpoints de l'API pour restreindre l'accès aux fonctionnalités sensives.

#### Routes Publiques
Certaines routes frontend sont accessibles sans authentification :
- `/login` - Page de connexion
- `/signup` - Page de création de compte
- `/forgot-password` - Page de récupération de mot de passe
- `/reset-password` - Page de réinitialisation de mot de passe
- `/inscription` - **Page d'inscription publique** (paramètres d’ancrage optionnels selon l’implémentation)

#### Routes Protégées
Toutes les autres routes nécessitent une authentification via le composant `ProtectedRoute`.

- **Validation des Entrées**: Toutes les données entrant dans l'API sont validées via les schémas Pydantic pour prévenir les injections.
- **RGPD**: Les données sont hébergées en Europe et les principes de protection des données sont appliqués.

### 9.3. Stratégie de Gestion des Erreurs
Chaque service (frontend et backend) doit avoir un gestionnaire d'erreurs centralisé. Les erreurs sont catégorisées (erreur de validation, erreur de service, erreur inconnue) et retournées dans un format JSON standardisé. Le frontend doit être capable d'afficher des messages clairs à l'utilisateur et de gérer les modes dégradés (ex: mode offline).

### 9.4. Stratégie de Monitoring
L'application est monitorée sur deux axes :
- **Technique**: Performance des serveurs, taux d'erreur, temps de réponse (Prometheus/Grafana, Sentry).
- **Produit**: Suivi des parcours utilisateurs et des fonctionnalités clés pour prendre des décisions basées sur les données (nécessite l'intégration d'un outil d'analytics).

## 10. Standards et Règles d'Implémentation Critiques

Cette section définit les règles obligatoires pour garantir la qualité, la performance et la sécurité du code.

### 10.1. Standards Généraux
- **Nommage :** Les conventions (PascalCase/React, snake_case/Python) sont à suivre scrupuleusement.
- **Tests :** La pyramide de tests (Unit, Integration, E2E) est la stratégie de référence. Toute nouvelle fonctionnalité doit être accompagnée de tests pertinents.
- **Développement Local :** Le `docker-compose.yml` est le point d'entrée unique pour l'environnement de développement.

### 10.2. Règles Backend Obligatoires
- **Performance (Anti N+1) :** Toute requête retournant une liste d'objets doit impérativement utiliser le "Eager Loading" (`selectinload` de SQLAlchemy) pour charger les relations nécessaires en une seule fois.
- **Séparation des Couches :** Aucune logique métier (calculs, conditions complexes) ne doit se trouver dans les endpoints de l'API. Les endpoints valident l'entrée, appellent **une seule** méthode de service, et retournent la réponse.
- **Sécurité (Anti Mass-Assignment) :** Des schémas Pydantic spécifiques doivent être créés pour les entrées (`Update`, `Create`). Ils ne doivent exposer **que** les champs modifiables par l'acteur de la requête.

### 10.3. Règles Frontend Obligatoires
- **Gestion de l'État :** Les stores Zustand doivent être séparés par domaine métier (`authStore`, `cashStore`, etc.). Un store global unique est interdit.
- **Performance :** L'application doit implémenter le "code-splitting" par route et le "lazy loading" pour les composants lourds afin de garantir un temps de chargement initial minimal.

### 10.4. Qualité du Code (Processus)
- **Linting Automatisé :** Le projet doit être configuré avec des linters stricts (`ruff`, `eslint`) et un hook de **pre-commit** qui empêche tout commit de code ne respectant pas les standards.
- **Revue de Code Obligatoire :** Aucune story ne peut passer en QA sans avoir été validée par une revue de code. Le relecteur doit vérifier la conformité du code avec toutes les règles définies dans ce document d'architecture. C'est le principal rempart contre la "spéculation".

## 11. Infrastructure et Déploiement

L'application est entièrement conteneurisée avec Docker. Le déploiement sur les différents environnements (staging, production) est géré via des scripts et potentiellement une pipeline CI/CD (ex: GitHub Actions) qui automatise les tests et le déploiement.

### 11.1. Configuration des Ports

La configuration des ports est cruciale pour le bon fonctionnement de l'application en environnement de développement et de production.

#### Ports de Développement (docker-compose.yml)

| Service | Port Interne | Port Externe | Description |
|---------|--------------|--------------|-------------|
| **Frontend** | 5173 | 4444 | Interface utilisateur React (Vite dev server) |
| **API** | 8000 | 8000 | Backend FastAPI |
| **PostgreSQL** | 5432 | 5432 | Base de données |
| **Redis** | 6379 | 6379 | Cache et sessions |

#### Configuration Vite

Le serveur de développement Vite est configuré pour :
- **Port interne** : 5173 (port par défaut de Vite)
- **Host** : `0.0.0.0` (accessible depuis l'extérieur du conteneur)
- **Proxy API** : `/api` → `http://api:8000` (communication inter-conteneurs)

#### Healthchecks

Chaque service dispose d'un healthcheck pour s'assurer de sa disponibilité :

```yaml
# Exemple pour le frontend
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5173/"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

#### Accès aux Services

- **Frontend** : http://localhost:4444
- **API** : http://localhost:8000
- **API Docs** : http://localhost:8000/docs
- **PostgreSQL** : localhost:5432 (utilisateur: recyclic)
- **Redis** : localhost:6379

### Exemple de Workflow de Déploiement (`deploy.yaml`)

Le code ci-dessous est l'exemple de base pour le workflow de déploiement continu qui doit être créé par la story `story-tech-debt-create-deploy-workflow.md`.

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          npm ci
          cd apps/api && pip install -r requirements.txt
      
      - name: Lint code
        run: npm run lint
      
      - name: Run tests
        run: |
          npm run test
          npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  build-and-deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker images
        run: |
          docker build -t recyclic-api -f api/Dockerfile .
          docker build -t recyclic-bot -f bot/Dockerfile .
          docker build -t recyclic-web -f frontend/Dockerfile .
      
      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/recyclic
            git pull origin main
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml up -d --build
            docker system prune -f
```

## 12. Procédure de Rollback

En cas de problème lors d'un déploiement en production, une procédure de rollback simple et fiable permet de revenir immédiatement à la version stable précédente.

### 12.1. Principe de Fonctionnement

Le système de rollback repose sur le versionnement des images Docker :
- Chaque déploiement génère un tag unique basé sur le SHA du commit Git (7 caractères)
- Les 5 dernières versions d'images sont conservées sur le serveur de production
- Le script de rollback identifie automatiquement la version précédente et redéploie les conteneurs

### 12.2. Utilisation du Script de Rollback

Le script `scripts/rollback.sh` fournit une interface simple pour effectuer un rollback :

```bash
# Rollback automatique vers la version précédente
bash scripts/rollback.sh

# Rollback vers une version spécifique
bash scripts/rollback.sh abc1234

# Aide et liste des versions disponibles
bash scripts/rollback.sh --help
```

### 12.3. Processus de Rollback

1. **Identification de la version cible** : Le script détermine automatiquement la version précédente ou utilise celle spécifiée
2. **Vérification de disponibilité** : Contrôle que toutes les images de la version cible existent
3. **Confirmation utilisateur** : Demande confirmation avant d'effectuer le rollback
4. **Arrêt des services** : Arrête les conteneurs actuels
5. **Redémarrage avec l'ancienne version** : Utilise les images de la version précédente
6. **Vérification** : Contrôle que les services redémarrent correctement

### 12.4. Configuration Requise

Pour que le rollback fonctionne, les fichiers suivants doivent être configurés :

- **`docker-compose.yml`** : Utilise des variables d'environnement pour les tags d'images
- **`.env.production`** : Généré automatiquement par le workflow de déploiement
- **Images Docker** : Au moins 2 versions doivent être disponibles sur le serveur

### 12.5. Monitoring et Métriques

Le script de rollback enregistre automatiquement des métriques dans `logs/rollback-metrics.json` :

```json
{
  "timestamp": "2025-01-27T10:30:00Z",
  "event": "rollback_success",
  "version": "abc1234",
  "duration_seconds": "45",
  "status": "success",
  "hostname": "production-server",
  "user": "deploy-user"
}
```

**Événements trackés** :
- `rollback_success` : Rollback réussi
- `rollback_failed` : Échec du rollback
- `rollback_cancelled` : Rollback annulé par l'utilisateur

### 12.6. Tests Automatisés

Le script de rollback inclut des tests automatisés complets :

```bash
# Test rapide (recommandé pour la validation)
bash scripts/test-rollback-quick.sh

# Tests complets (environnement de test requis)
bash tests/test_rollback.sh
```

**Couverture des tests** :
- Validation des arguments et options
- Détection des répertoires de travail
- Gestion des versions inexistantes
- Fonctions de métriques
- Détection des versions actuelles et précédentes
- Simulation de rollback

### 12.7. Sécurité et Bonnes Pratiques

- **Test en staging** : Toujours tester la procédure de rollback sur un environnement de staging
- **Sauvegarde des données** : Le rollback ne touche que le code, pas les données de la base
- **Monitoring** : Surveiller les métriques dans `logs/rollback-metrics.json` après un rollback
- **Tests automatisés** : Exécuter les tests avant tout déploiement en production
- **Communication** : Informer l'équipe en cas de rollback en production
