# Audit Import BDD Admin – EPIC B46 / Story B46-P0

## 1. Résumé exécutif

La fonctionnalité d’**import de sauvegarde BDD** est **pleinement implémentée côté backend** (`/api/v1/admin/db/import`) et **intégrée côté frontend** (page `Admin > Settings`), mais **désactivée au niveau UI** par un bouton inactif “🚧 Fonctionnalité en développement”.  
L’implémentation actuelle repose sur un **flux direct d’import SQL via SQLAlchemy** à partir d’un fichier `.sql` (plain `pg_dump`), après création d’une **sauvegarde automatique** avec `pg_dump`.  
En pratique, les tests réalisés avec de **vrais dumps PostgreSQL** ont mis en évidence des **erreurs critiques** (types existants, commandes `COPY`, directives non standard, transactions avortées) documentées dans la dette technique `story-b26-p2-db-import.md`, ce qui a conduit à **désactiver la fonctionnalité côté UI**.  
L’écosystème de sauvegarde/restauration du projet (scripts `verify-backup.sh`, guide `database-recovery.md`) est, lui, basé sur des dumps **au format `pg_restore`** (`.dump`) et des procédures manuelles/ops, ce qui crée un **écart de stratégie** avec l’import Admin Settings.  
Recommandation globale : **ne pas réactiver l’import BDD via l’UI** tant qu’un flux aligné sur les pratiques `pg_restore` et les règles projet (dump obligatoire, traçabilité, validation préalable) n’a pas été spécifié et implémenté (stories B46-P1/P2/P3).

---

## 2. Cartographie de l’existant

### 2.1 Frontend – Admin Settings

- **Page principale**
  - `frontend/src/pages/Admin/Settings.tsx`
  - Rôle : page **“⚙️ Paramètres”**, accessible uniquement aux `super-admin`, regroupant :
    - Outils BDD : export, *import (désactivé)*, purge transactionnelle, seuil d’activité.
    - Paramètres de sécurité (durée de session).
    - Paramètres email Brevo + test d’email.
- **UI Import BDD**
  - Carte “Import de sauvegarde” dans la section **“🗄️ Base de Données”** :
    - Texte : *« Importe un fichier SQL de sauvegarde et remplace la base de données existante. Une sauvegarde automatique est créée avant l'import. »*
    - Bouton :
      - Label : **“🚧 Fonctionnalité en développement”**
      - `variant="danger"`
      - `onClick={handleImportDatabase}`
      - `disabled={true}` + style `cursor: 'not-allowed'`, opacité réduite.
    - Avertissement : `WarningBox` expliquant que l’import est *temporairement désactivé* suite à des **problèmes techniques avec les fichiers de sauvegarde PostgreSQL**.
  - **Logique de modale d’import** (déjà en place mais actuellement inatteignable à cause du bouton désactivé) :
    - `showImportModal`, `selectedFile`, `importConfirmationText`, `importingDatabase`.
    - Sélection de fichier via `<input type="file" accept=".sql">` avec contrôle d’extension `.sql`.
    - Affichage du nom du fichier et de sa taille.
    - Zone d’avertissement rouge sur le **caractère irréversible** de l’opération.
    - Double confirmation via champ texte où l’admin doit recopier **"RESTAURER"** :
      - Le bouton d’action finale est désactivé tant que `importConfirmationText !== 'RESTAURER'`.
    - La logique de flux (telle que codée) appelle directement `handleImportStep2()` pour lancer l’import.

- **Service frontend Admin**
  - `frontend/src/services/adminService.ts`
  - Méthodes BDD pertinentes :
    - `exportDatabase()` :
      - POST `/v1/admin/db/export`, `responseType: 'blob'`, timeout 5 minutes.
      - Crée un `Blob` `application/sql`, déduit le nom du fichier depuis `Content-Disposition`, déclenche un téléchargement.
    - `purgeTransactionalData()` :
      - POST `/v1/admin/db/purge-transactions`.
      - Retourne `{ message, deleted_records, timestamp }`.
    - `importDatabase(file: File)` :
      - Crée un `FormData` avec la clé `'file'`.
      - POST `/v1/admin/db/import` avec `multipart/form-data`, timeout 10 minutes.
      - Retour : `{ message, imported_file, backup_created, backup_path, timestamp }`.

### 2.2 Backend – Endpoints Admin BDD

- **Export BDD**
  - Fichier : `api/src/recyclic_api/api/api_v1/endpoints/db_export.py`
  - Route : `POST /api/v1/admin/db/export` (`/db/export` montée sous le router admin)
  - Comportement :
    - Rôle requis : `SUPER_ADMIN` via `require_super_admin_role()`.
    - Parse `settings.DATABASE_URL` pour extraire `db_user`, `db_password`, `db_host`, `db_port`, `db_name`.
    - Construit une commande `pg_dump` plain text :
      - `pg_dump -h <host> -p <port> -U <user> -d <db> -F p -f <export_path> --clean --if-exists --no-owner --no-privileges`.
      - `PGPASSWORD` injecté via l’environnement.
      - Timeout 5 minutes, capture des erreurs.
    - Vérifie l’existence du fichier exporté.
    - Retourne un `FileResponse` avec `Content-Disposition` adapté.

- **Import BDD**
  - Fichier : `api/src/recyclic_api/api/api_v1/endpoints/db_import.py`
  - Route : `POST /api/v1/admin/db/import` (`/db/import` montée sous le router admin)
  - Comportement :
    - Rôle requis : `SUPER_ADMIN` (`require_super_admin_role()`).
    - Reçoit un `UploadFile` obligatoire (`file: UploadFile = File(...)`).
    - Validations d’entrée :
      - Fichier présent, extension `.sql` obligatoire.
      - Taille max : 100 MB (contrôle sur le contenu lu en mémoire).
    - Parsing de `DATABASE_URL` (même logique que l’export) pour récupérer host/port/db/user/password.
    - **Sauvegarde automatique avant import** :
      - Génération d’un nom de fichier `recyclic_db_backup_before_import_<timestamp>.sql` dans `tempfile.gettempdir()`.
      - Commande `pg_dump` identique à l’export (plain text, `--clean`, `--if-exists`, no owner/privileges).
      - En cas d’échec, renvoie une 500 avec le stderr de `pg_dump`.
    - **Nettoyage du SQL importé** :
      - Décodage du contenu en UTF-8 (fallback Latin-1).
      - Filtrage des directives non standard `\restrict` / `\unrestrict`.
      - Réécriture dans un fichier temporaire `.sql` (via `tempfile.NamedTemporaryFile`).
    - **Stratégie d’import actuelle** :
      - **Pas de `psql` ni `pg_restore`** dans la version en place.
      - Import exécuté via **SQLAlchemy** :
        - Split du SQL filtré en commandes terminées par `;`.
        - Pour chaque commande :
          - `db.execute(text(sql_command))` + `db.commit()`.
          - En cas d’erreur : `db.rollback()`, puis :
            - Si le message contient certains mots-clés (`"already exists"`, `"type"`, `"table"`, `"sequence"`, `"index"`, `"constraint"`, `"collation version mismatch"`, `"warning:"`, `"hint:"`, `"current transaction is aborted"`), l’erreur est considérée comme *non critique* et ignorée.
            - Sinon, l’erreur est considérée comme critique → levée.
      - Nettoyage du fichier temporaire via `os.unlink`.
    - Réponse de succès :
      - `message`, `imported_file`, `backup_created`, `backup_path`, `timestamp`.

- **Purge transactionnelle**
  - Fichier : `api/src/recyclic_api/api/api_v1/endpoints/db_purge.py`
  - Route : `POST /api/v1/admin/db/purge-transactions`
  - Comportement :
    - Rôle requis : `SUPER_ADMIN`.
    - Tables purgées, dans l’ordre :
      - `sale_items`, `sales`, `ligne_depot`, `ticket_depot`, `cash_sessions`.
    - Pour chaque table :
      - `SELECT COUNT(*)` avant suppression.
      - `DELETE FROM <table>` sans conditions.
      - Commit global à la fin, rollback si erreur.
    - Réponse : `{ message, deleted_records: { table -> count }, timestamp }`.

- **Tests backend liés**
  - `api/tests/test_db_export_endpoint.py`
    - Couvre les cas 200, 401 (non auth), 403 (non super-admin), erreurs de `pg_dump`, etc.
  - `api/tests/test_db_import_endpoint.py`
    - Tests unitaires/intégration sur `/api/v1/admin/db/import` (validation d’entrée, rôles, erreurs, etc.).
  - `api/tests/test_db_purge.py`
    - Tests pour `/api/v1/admin/db/purge-transactions` (sécurité, purge effective).

### 2.3 Scripts & Runbooks Sauvegarde / Restauration

- **Vérification d’intégrité des backups**
  - Script : `scripts/verify-backup.sh`
  - Stratégie :
    - Répertoire des backups : `./backups`, logs dans `./logs`.
    - Utilise `pg_restore --list` pour vérifier l’intégrité de fichiers `postgres_backup_*.dump*` (format `pg_restore`, pas `.sql`).
    - Optionnellement (`TEST_RESTORE=true`), restauration dry-run dans une base temporaire avec `pg_restore --clean --if-exists`.
    - Génère des rapports de santé et métriques (taille, nombre, âge des backups, espace disque).

- **Guide de récupération BDD**
  - Doc : `docs/runbooks/database-recovery.md`
  - Contenu clé :
    - Procédures de récupération simples (dev/test) et de crise (perte volume, PITR).
    - Exemples d’utilisation de `pg_dump`, `psql` et **`pg_restore`**.
    - Scripts complémentaires :
      - `scripts/recovery-postgres.sh` : restaurations orchestrées depuis un fichier backup.
      - `scripts/test-recovery.sh` : scénario de test complet (dump, corruption simulée, restauration, vérification).
    - Intégration avec la stratégie globale de backup/monitoring (cron, `docker-compose.backup.yml`, alertes, etc.).

- **Dette technique import BDD**
  - Doc : `docs/pending-tech-debt/story-b26-p2-db-import.md`
  - Détaille :
    - Story initiale B26-P2 (import BDD) déclarée **terminée** fonctionnellement, avec QA verte… puis section ultérieure **“PROBLÈMES TECHNIQUES RENCONTRÉS”** requalifiant la fonctionnalité comme **non fonctionnelle** avec de vrais dumps.
    - Historique des tentatives (psql, SQLAlchemy, filtrage SQL…) et blocages.
    - Décision temporaire : **désactiver le bouton d’import dans l’UI** avec message “fonctionnalité en développement”.

---

## 3. Description du flux actuel (intentionnel)

### 3.1 Vue d’ensemble

Flux **conçu** (tel que codé et décrit dans B26-P2) :

1. **UI Admin Settings**
   - L’admin (Super Admin) va dans `Administration > Settings` → section “Base de Données”.
   - Clique sur “Import de sauvegarde” → ouverture d’une modale avec sélection de fichier `.sql` + avertissements.
   - Sélectionne un fichier puis confirme en recopiant **"RESTAURER"**.
2. **Appel frontend**
   - `adminService.importDatabase(selectedFile)` envoie le fichier en `multipart/form-data` à l’endpoint backend.
3. **Endpoint backend `/api/v1/admin/db/import`**
   - Valide le fichier, limite taille à 100 MB.
   - Parse `DATABASE_URL` et construit les paramètres Postgres.
   - **Crée une sauvegarde automatique** via `pg_dump` plain text dans un fichier `.sql` dans le `tempdir` du conteneur.
   - Filtre le SQL du fichier importé pour retirer certaines directives non standard.
   - **Importe** le contenu du dump en exécutant les commandes SQL une par une via SQLAlchemy.
4. **Remplacement BDD**
   - En cas de succès, la base Postgres **en place** est considérée comme remplacée par le contenu du fichier importé.
   - Un backup “avant import” existe dans le `tempdir`, mais n’est pas intégré au système de backups standard (`./backups`, `verify-backup.sh`, etc.).

### 3.2 Position de la “sauvegarde automatique avant import”

- Implémentée **dans l’endpoint d’import** (`db_import.py`) avant toute exécution SQL.
- Stratégie :
  - `pg_dump` de la base `recyclic` vers `recyclic_db_backup_before_import_<timestamp>.sql` dans le `tempdir` du conteneur.
  - Paramètres `--clean --if-exists --no-owner --no-privileges`.
- Limites :
  - Stockage **éphémère**, non intégré aux répertoires `./backups` ni au monitoring `verify-backup.sh`.
  - Chemin et métadonnées non remontés dans le système de logs centralisés (hormis le `backup_path` retourné à l’appelant).
  - Aucun usage de `pg_restore --list` ou de tests de restauration dry-run pour cette sauvegarde.

---

## 4. Diagnostic des problèmes connus / potentiels

### 4.1 Problèmes documentés (story B26-P2)

Les tests avec un dump réel (`prod_database_dump_20251016_202929.sql`) ont mis en évidence :

1. **Types PostgreSQL déjà existants**
   - Erreurs du type : `ERROR: type "cashsessionstatus" already exists`.
   - Les dumps `pg_dump` contiennent des `CREATE TYPE` et objets déjà présents → provoquent des erreurs répétées.

2. **Commandes `COPY` incompatibles avec SQLAlchemy**
   - `psycopg2.ProgrammingError: can't execute COPY FROM: use the copy_from() method instead`.
   - Les commandes `COPY` ne peuvent pas être correctement exécutées via un simple `db.execute(text(...))`.

3. **Transactions avortées**
   - Erreurs du type : `current transaction is aborted, commands ignored until end of transaction block`.
   - Malgré les `rollback()` dans la boucle, l’état de transaction reste complexe à gérer et provoque des cascades d’échecs.

4. **Directives non standard et warnings**
   - Présence de directives `\restrict`, `\unrestrict` et autres commandes spécifiques à `psql`.
   - Avertissements de collation et autres messages bruités dans les dumps.

5. **Blocages / timeouts**
   - `psql` avait été tenté avec des options avancées (`ON_ERROR_STOP`, `--single-transaction`, etc.), mais entraînait blocages, demande de mot de passe, ou temps d’exécution anormaux.
   - D’où le basculement vers SQLAlchemy, qui ne gère néanmoins pas tous les cas PostgreSQL.

Conclusion de la dette B26-P2 : la combinaison **dump plain text + exécution SQLAlchemy** est **structurellement inadaptée** aux vrais dumps complets et a conduit à **désactiver la fonctionnalité** côté UI.

### 4.2 Problèmes / risques complémentaires

1. **Alignement incomplet avec la règle “dump obligatoire avant action destructive”**
   - ✅ L’endpoint `db_import.py` crée effectivement un **dump automatique** avant import.
   - ❌ Mais ce dump :
     - Est stocké en **temporaire** côté conteneur (non persistant, non archivage projet).
     - N’est pas intégré à la logique de monitoring (`./backups`, `verify-backup.sh`, métriques, alertes).
     - N’est pas explicitement documenté dans les guides d’opérations.

2. **Écart avec la stratégie `pg_restore` / `.dump` du reste du projet**
   - Les scripts de vérification et de récupération (`verify-backup.sh`, `database-recovery.md`, `recovery-postgres.sh`) travaillent avec des dumps **au format `pg_restore`** (`.dump`), pas avec des `.sql` plain text.
   - La logique d’import Admin Settings repose sur un **plain SQL** (format `pg_dump -F p`) et une exécution applicative manuelle, ce qui :
     - Empêche l’usage direct de `pg_restore --list` pour validation.
     - Rend la compatibilité avec les outils existants plus fragile.

3. **Surface de risque en cas d’activation UI**
   - Le backend `/api/v1/admin/db/import` est **actif** et exposé (protégé par rôle, mais accessible techniquement).
   - Le frontend empêche l’appel via bouton désactivé, mais :
     - Un appel manuel (via `curl`, scripts, etc.) reste possible.
     - En cas de réactivation du bouton sans refonte du flux, le système exposerait à nouveau les risques identifiés.

4. **Traçabilité et audit**
   - Les endpoints d’export/import/purge loguent dans les logs applicatifs (logger), mais :
     - Il n’y a pas encore de **journal d’audit structuré** spécifique pour les imports, avec checksum de fichier, IP, etc. (cible B46-P3).

5. **Compatibilité WSL / Docker / chemins**
   - Le flux Admin Settings **ne dépend pas** des chemins WSL côté utilisateur : le fichier est uploadé via le navigateur.
   - Les scripts d’ops (`database-recovery.md`, `verify-backup.sh`) supposent en revanche que les commandes sont lancées via Docker/WSL, avec des chemins `/mnt/...`.
   - Il n’y a pas de conflit direct, mais une **cohabitation de deux mondes** (import via API vs restauration ops) qui doit être clarifiée.

---

## 5. Analyse de conformité avec les règles projet

1. **Dump obligatoire avant action destructive**
   - Endpoint import :
     - ✅ Respect **partiel** : création d’un dump automatique avant tout import.
     - ❌ Pas de stockage dans `./backups` ni d’enregistrement explicite (hash, taille, chemin) dans les logs projet.
   - Procédures ops :
     - ✅ Alignées sur les règles (sauvegardes régulières, scripts de vérification/recouvrement, docs précises).

2. **Interdiction des commandes Docker destructrices (`down -v`, suppression de volumes)**
   - L’implémentation actuelle des endpoints **n’appelle jamais** `docker-compose` ni ne manipule directement des volumes.
   - ✅ Conforme : pas de `down -v` ou `docker volume rm` dans ces endpoints.

3. **Contraintes WSL/Docker et chemins de fichiers**
   - Les endpoints `db_export.py` / `db_import.py` travaillent **dans le conteneur** en utilisant `tempfile` et `pg_dump`/SQLAlchemy.
   - ✅ Aucun chemin Windows/WSL n’est manipulé côté backend : la règle d’usage WSL/`wsl -e bash -lc` concerne les commandes manuelles, non ces endpoints.
   - ❗ Cependant, la **stratégie globale de sauvegarde** (guides + scripts) repose sur des dossiers `./backups` et `./logs` sur l’hôte, montés via Docker : l’import Admin Settings ne s’inscrit pas encore clairement dans cette stratégie homogène.

4. **Stratégie de sauvegarde et monitoring**
   - Scripts `verify-backup.sh` et `database-recovery.md` décrivent un système très structuré (vérifications, dry-runs, métriques).
   - L’import Admin Settings contourne cette chaîne en important directement un dump sans validation `pg_restore --list` ni test de restauration.

Conclusion : **aucune violation directe** des interdits critiques (pas de `down -v`, pas de suppression de volumes), mais un **misalignment significatif** entre la manière dont l’Admin Settings gère l’import BDD et la stratégie globale de sauvegarde/restauration définie par le projet.

---

## 6. Options de solution possibles

### Option A – Maintien de la désactivation + usage réservé aux Ops

- Garder :
  - Le bouton d’import **désactivé** dans l’UI Admin Settings.
  - L’endpoint `/api/v1/admin/db/import` **actif mais non documenté** côté UI (usage ponctuel possible par l’équipe technique, avec connaissances approfondies).
- Avantages :
  - Risque produit limité (pas d’accès “self-service” pour les admins métier).
  - Aucun changement de code immédiat.
- Inconvénients :
  - Incohérence documentaire (story B26-P2 vs état réel).
  - Complexité de communication (fonctionnalité visible mais indiquée comme “en développement”).
  - Ne résout pas la dette technique sur l’import.

### Option B – Refonte complète de l’import pour s’aligner sur `pg_restore` (recommandée)

Principe : basculer vers un flux d’import fondé sur des dumps **au format `pg_restore`** (`.dump`) et aligné avec la chaîne `verify-backup.sh` / `database-recovery.md`.

Éléments clés :

- Restreindre l’import à des fichiers :
  - Produits par le système officiel de backup (`postgres_backup_*.dump*`).
  - Validés au préalable via `pg_restore --list` (intégrité minimale).
- Dans l’endpoint :
  - Créer une sauvegarde automatique **cohérente** avec la stratégie `.dump` et la déposer dans `./backups` (via un volume monté).
  - Utiliser `pg_restore` avec options :
    - `--clean --if-exists --no-owner --no-privileges`, éventuellement dans une base temporaire avec swap final.
  - Ajouter une journalisation d’audit structurée (acteur, timestamp, checksum du fichier, résultat).
- Côté UI :
  - Réduire les cas d’usage à des **imports de dumps “officiels”** seulement (par ex. en proposant un sélecteur ou en demandant de déposer uniquement des fichiers conformes).

### Option C – Flux “offline” : Admin Settings déclenche uniquement un backup + instructions

Principe : transformer la section Admin Settings en **panneau d’orchestration/infos** plutôt que de lancer directement une restauration en ligne.

- L’UI pourrait :
  - Proposer un bouton “Préparer une restauration” qui :
    - Crée un backup récent.
    - Affiche les chemins et commandes (WSL/Docker) permettant à l’équipe technique de faire une restauration manuelle contrôlée.
  - Renvoyer l’utilisateur vers la doc `database-recovery.md` avec un contexte prérempli (backup utilisé, timestamp).
- Avantages :
  - Très faible risque applicatif (pas d’import destructeur lancé depuis l’UI).
  - S’aligne parfaitement avec la philosophie “ops contrôlent les restaurations”.
- Inconvénients :
  - Ne propose pas une restauration “one-click” pour les super-admins métier.

---

## 7. Recommandations pour les stories suivantes (B46-P1, B46-P2, B46-P3)

### B46-P1 – Spécification du flux cible d’import & sauvegarde automatique

Recommandations pour la future story de spécification :

1. **Choisir un format de dump unique** pour tout le projet (recommandé : format `pg_restore` custom).
2. **Définir précisément** :
   - Les prérequis d’un fichier importable (provenance, format, intégrité).
   - Le comportement en cas d’erreur (`pg_restore` partiel, annulation, messages clair côté UI).
   - La stratégie de sauvegarde automatique (où est stocké le backup pré-import, comment est-il vérifié).
3. **Aligner** le flux Admin Settings avec :
   - `scripts/verify-backup.sh` (validation de backup).
   - `docs/runbooks/database-recovery.md` (procédures officielles).
4. **Spécifier la politique UX** :
   - Double confirmation, mentions explicites de la perte de données.
   - Distinction claire entre “importer un dump officiel” et “tester une restauration”.

### B46-P2 – Implémentation de l’import BDD sécurisé (Backend + Admin UI)

1. **Refactor backend** :
   - Remplacer la logique SQLAlchemy d’import par une orchestration `pg_restore` cohérente.
   - Ajouter des checks préalables : `pg_restore --list`, taille max, type de fichier, provenance.
   - Intégrer le backup pré-import dans `./backups` avec log et métriques.
2. **Mettre à jour le frontend** :
   - Activer le bouton d’import uniquement après validation de la nouvelle implémentation.
   - Clarifier les textes et avertissements en fonction du nouveau flux.
3. **Tests** :
   - Créer des tests d’intégration couvrant :
     - Dump simple.
     - Dump volumineux.
     - Dumps invalides / corrompus.
   - Ajouter des tests E2E UI pour le parcours complet d’import (avec mock de backend).

### B46-P3 – Audit, logs & documentation

1. **Audit structuré** :
   - Intégrer les imports BDD dans le système d’`AuditLog` existant (acteur, fichier, hash, résultat).
2. **Historique des imports** :
   - Ajouter une vue Admin listant les imports passés (succès/échecs, dates, utilisateur).
3. **Documentation** :
   - Étendre `docs/runbooks/database-recovery.md` avec une section “Restauration via Admin Settings”.
   - Mettre à jour la charte de tests pour inclure des cas d’import BDD.

---

## 8. Statut et conclusions

- **État actuel**
  - Backend : endpoints d’export/import/purge BDD implémentés et testés.
  - Frontend : UI d’import présente mais **verrouillée** par un bouton désactivé avec message “fonctionnalité en développement”.
  - Ops : chaîne de sauvegarde/restauration robuste existante, mais **parallèle** à l’import Admin Settings.
- **Problèmes clés**
  - Import BDD via SQLAlchemy inadapté aux dumps Postgres complets.
  - Manque d’alignement avec la stratégie `pg_restore` + scripts existants.
  - Risques élevés si réactivation UI sans refonte technique.
- **Recommandation**
  - **Maintenir la désactivation UI** tant que B46-P1/P2/P3 ne sont pas réalisées.
  - Prioriser B46-P1 pour définir un flux unique, sûr et aligné sur les scripts d’ops et les règles projet.















