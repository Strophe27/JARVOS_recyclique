# Story B46-P0: Diagnostic Import BDD Admin (Analyse uniquement)

**Statut:** Done
**Épopée:** [EPIC-B46 – Administration Import / Restauration BDD](../epics/epic-b46-admin-import-bdd.md)
**Module:** Admin Settings + Backend API + Ops
**Priorité:** P0 (Urgent – préalable à toute implémentation)

---

## 1. Contexte

Dans l’écran d’administration (`Administration > Settings`), une section permet théoriquement d’**importer une sauvegarde de base de données**.
L’UI affiche actuellement un message indiquant que :

- l’import de sauvegarde **remplacerait la base existante** après avoir créé une sauvegarde automatique,
- la fonctionnalité est **temporairement désactivée** en raison de problèmes techniques avec les fichiers de sauvegarde PostgreSQL.

Aujourd’hui, on ne sait pas précisément :

- Jusqu’où le flux d’import a été implémenté (frontend, backend, scripts),
- Quelles commandes/stratégies sont utilisées côté Postgres / Docker,
- Quelles erreurs concrètes ont motivé la désactivation,
- Quels sont les **risques réels** (perte de données, incompatibilité de dumps, contraintes Docker/WSL).

Avant de décider **comment** réactiver cette fonctionnalité (et avec quelles garanties), il faut une **story d’analyse/diagnostic** dédiée, sans aucune modification fonctionnelle du système.

---

## 2. User Story

En tant que **Product Owner / Super-Admin**,
je veux **comprendre précisément l’état actuel de la fonctionnalité d’import de base de données en Admin Settings**,
afin de **décider en connaissance de cause** des stories nécessaires pour la rendre fiable, sûre et alignée avec les règles du projet.

---

## 3. Critères d’acceptation

1. **Cartographie complète de l’existant** :
   - Les fichiers frontend impliqués dans l’UI Admin Settings (page, composants, hooks, services) sont identifiés et listés.
   - Les endpoints backend, services Python et scripts éventuellement utilisés pour l’import/restauration sont identifiés et listés.

2. **Description du flux actuel (intentionnel)** :
   - Un schéma (ou description textuelle) documente le flux **tel qu’il a été conçu** :
     UI → endpoint → commande (pg_restore / psql / autre) → remplacement BDD.
   - La place de la “sauvegarde automatique avant import” est clairement indiquée (où, comment elle est/était censée être faite).

3. **Diagnostic des problèmes connus / potentiels** :
   - Les raisons de la désactivation (si elles existent dans le code, les logs ou la doc) sont listées et référencées.
   - Les problèmes techniques identifiés sont classés (compatibilité dump, taille, temps d’exécution, droits, Docker/WSL, etc.).

4. **Analyse de conformité avec les règles projet** :
   - Le diagnostic vérifie l’alignement avec :
     - La règle de **dump obligatoire avant action destructrice** (cf. règles Agent / DB),
     - L’interdiction de certaines commandes Docker destructrices (`down -v`, suppression de volumes),
     - Les contraintes WSL/Docker et chemins de fichiers (Windows vs WSL).
   - Les écarts éventuels sont clairement listés.

5. **Livrable de diagnostic** :
   - Un document `docs/audits/audit-import-bdd-admin.md` est créé ou mis à jour, contenant au minimum :
     - **État actuel** (cartographie, flux, code existant),
     - **Problèmes** identifiés,
     - **Options de solution** possibles (stratégies de restauration),
     - **Recommandations** pour les stories suivantes (B46-P1, P2, P3).

6. **Aucun changement fonctionnel** :
   - La fonctionnalité d’import reste **désactivée** à l’issue de cette story.
   - Aucun endpoint ou script de restauration n’est activé/branché dans l’UI.
   - Aucun traitement effectif d’import/dump n’est lancé dans les environnements cibles dans le cadre de cette story (analyse uniquement).

---

## 4. Périmètre de l’analyse (What to look at)

### 4.1 Frontend Admin Settings

- Page et composants liés à l’écran d’Administration > Settings (titre, texte, bouton d’import, états désactivés).
- Services ou hooks JS/TS utilisés pour :
  - Uploader un fichier (s’il y a eu un début d’implémentation),
  - Appeler un éventuel endpoint d’import,
  - Afficher l’état/désactivation.

### 4.2 Backend API / Services Python

- Endpoints potentiels liés à l’import/restauration de DB (ex: `/admin/db/import`, `/admin/db/restore`, `/admin/maintenance/...`).
- Services internes qui :
  - Appellent `pg_dump`, `pg_restore`, `psql` ou une commande équivalente,
  - Accèdent au container Postgres via Docker ou réseau interne,
  - Manipulent des fichiers de dump (lecture, écriture, validation).

### 4.3 Scripts & Infrastructure

- Scripts shell ou Python dédiés aux sauvegardes/restaurations (dans `scripts/`, `ops/`, etc.).
- Extraits pertinents de `docker-compose.yml` ou de la doc (`start.sh`, `env.example`) impactant :
  - Le volume `postgres_data`,
  - L’accès aux commandes `pg_dump` / `pg_restore` depuis les containers,
  - Les chemins d’accès aux dumps entre Windows & WSL (`/mnt/d/...`).

---

## 5. Dev Notes (pour l’agent / dev qui mène l’analyse)

> **Important :** cette story ne doit lancer **aucune commande destructive** ni modifier la base.
> Se limiter à la **lecture de code** et à l’analyse de documentation / configuration.

### 5.1 Références projet

1. **Règles Agent / DB & Docker**
   - Règle : **dump obligatoire** avant toute action destructive sur la base
   - Règle : **interdiction** des commandes Docker destructrices (`down -v`, suppression de volumes, etc.)

2. **Configuration WSL / Docker**
   - Règle : toutes les commandes terminal passent par WSL (`wsl -e bash -lc ...`)
   - Chemins BDD via `/mnt/d/...` pour accéder au repo sous Windows.

3. **Architecture & Admin**
   - Fichier architecture général (si existant, ex: `docs/architecture/index.md` ou équivalent),
   - Doc Admin Settings (s’il y en a une),
   - Toute référence à des “backups”, “sauvegardes”, “imports”, “restore” dans les docs.

### 5.2 Livrable attendu (structure suggérée du document d’audit)

Dans `docs/audits/audit-import-bdd-admin.md` :

1. **Résumé exécutif**
   - 5–10 lignes expliquant l’état actuel et les grandes lignes des problèmes/risques.
2. **Cartographie de l’existant**
   - Liste des fichiers frontend/backend/scripts pertinents, avec chemins et rôle.
3. **Description du flux actuel**
   - Diagramme texte (ou Mermaid) du flux tel qu’il est (ou était) prévu.
4. **Problèmes identifiés**
   - Liste numérotée, chaque problème avec : description, impact potentiel, sévérité.
5. **Options de solution**
   - 2–3 approches possibles pour un import sûr (ex: restauration offline, import dans DB séparée puis swap, etc.).
6. **Recommandations pour stories suivantes**
   - Ce qui devrait être traité dans B46-P1, P2, P3 (spécification, implémentation, audit/logs).

---

## 6. Tasks / Subtasks

- [x] **T1 – Cartographie Frontend Admin Settings**
  - [x] Identifier la page Admin Settings et les composants liés à l’import BDD.
  - [x] Lister les services/hooks appelés pour cet écran.
  - [x] Noter les textes affichés, les états (désactivé/actif) et éventuels TODOs/commentaires dans le code.

- [x] **T2 – Cartographie Backend & Scripts**
  - [x] Rechercher endpoints liés à l’import/restauration BDD.
  - [x] Identifier les services Python qui appellent des commandes Postgres ou manipulent des dumps.
  - [x] Lister les scripts shell/Python relatifs aux sauvegardes/restaurations.

- [x] **T3 – Analyse des Règles & Contraintes**
  - [x] Recouper avec les règles de dump obligatoire / interdiction Docker destructif.
  - [x] Vérifier les implications WSL/Docker/chemins pour les fichiers de dump.

- [x] **T4 – Rédaction du Document d’Audit**
  - [x] Créer ou mettre à jour `docs/audits/audit-import-bdd-admin.md`.
  - [x] Y consigner : état actuel, problèmes, options, recommandations.

- [x] **T5 – Validation PO**
  - [x] Faire valider le document d’audit par le PO (toi).
  - [x] Ajuster si nécessaire la liste des stories suivantes (B46-P1/P2/P3).

---

## 7. Dépendances

- **Pré-requis** : aucun d’un point de vue technique (analyse pure).
- **Bloqueur pour** : B46-P1, B46-P2, B46-P3 (implémentation et sécurisation import).

---

## 9. Guide d’exécution pour agent dev (mode analyse uniquement)

> **Rappel dur** :
> - AUCUNE commande ne doit modifier la base ou les volumes Docker.
> - Se limiter strictement à la lecture de code, de configs, de docs et aux outils de recherche (grep, recherche plein‑texte, etc.).

### 9.1 Entrées / Docs à lire en premier

- Lire l’**epic B46** : `docs/epics/epic-b46-admin-import-bdd.md` (contexte global, risques, stories suivantes).
- Parcourir la doc d’architecture et la doc Admin/DB si elles existent (références indiquées en section 5.1).

### 9.2 Plan d’exécution proposé

1. **Cartographie Frontend (T1)**
   - Identifier la page Admin Settings dans le frontend (recherche de `Administration > Settings`, `import`, `backup`, etc.).
   - Lister les composants et services/hooks impliqués dans l’UI d’import BDD.
   - Noter les textes, états (désactivé/actif), TODOs/commentaires.
2. **Cartographie Backend & Scripts (T2)**
   - Rechercher les endpoints d’API liés à l’import/restauration BDD.
   - Lister les services Python et scripts (shell/Python) manipulant des dumps ou appelant `pg_dump`/`pg_restore`/`psql`.
   - Lister les extraits de `docker-compose.yml`, scripts `start.sh`, etc. pertinents.
3. **Analyse Règles & Contraintes (T3)**
   - Vérifier, à partir de la doc projet, si l’existant respecte les règles : dump obligatoire, interdiction Docker destructif, contraintes WSL/chemins.
   - Noter clairement tous les écarts.
4. **Rédaction du document d’audit (T4)**
   - Créer/mettre à jour `docs/audits/audit-import-bdd-admin.md` avec la structure de la section 5.2.
   - Y consigner : état actuel, problèmes, options, recommandations pour B46-P1/P2/P3.
5. **Préparation pour validation PO (T5)**
   - Faire un court **résumé exécutif** (5–10 lignes) en début d’audit.
   - Lister explicitement quelles stories suivantes sont proposées/à ajuster (B46-P1, P2, P3).

### 9.3 Sorties attendues pour clôture de la story

- Fichier `docs/audits/audit-import-bdd-admin.md` existant et rempli conformément aux critères d’acceptation.
- Liste claire des problèmes identifiés + options de solution + recommandations pour B46-P1/P2/P3.
- Aucun changement fonctionnel dans le code (UI Admin ou API) et aucune commande destructive exécutée.

---

## 8. Change Log

| Date       | Version | Description                    | Auteur |
|-----------|---------|--------------------------------|--------|
| 2025-01-27 | 1.0     | Création de la story de diagnostic | PO/Dev Agent |
| 2025-01-27 | 1.1 | Clôture de la story (Audit réalisé) | Dev Agent |
