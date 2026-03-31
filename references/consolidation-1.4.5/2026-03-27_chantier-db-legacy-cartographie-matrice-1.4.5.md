# Chantier DB / migrations legacy — cartographie, écarts et matrice de décision

**Date :** 2026-03-27  
**Périmètre :** `recyclique-1.4.4/api/` (Alembic opérationnel), scripts satellites hors périmètre runtime applicatif.  
**Type de session :** **cartographie + feuille de route exécutable conditionnée** aux préchecks base de données. Aucune migration nouvelle n’a été codée.

---

## 1. Entrées respectées et garde-fous

- Lu : `references/index.md`, `references/consolidation-1.4.5/index.md`, `2026-03-27_note-decision-db-migrations-legacy-1.4.5.md`, plan `chantier-db-legacy_12fcd71c.plan.md`.
- **`git status --short` :** vide (worktree propre au lancement de la session).
- **Source de vérité schéma :** Alembic sous `api/migrations/`, tête **`e8f9a0b1c2d3`** (confirmée par `python -m alembic heads` depuis `recyclique-1.4.4/api/`).
- **Chemin Alembic réellement utilisé :** `recyclique-1.4.4/api/migrations/` + `api/alembic.ini` (résolution d’URL dans `env.py` : `TEST_DATABASE_URL` si contexte test explicite, sinon `POSTGRES_*`, `DATABASE_URL`, `sqlalchemy.url`, puis `settings.DATABASE_URL`).

---

## 2. État réel du schéma (constat de cette session)

| Niveau | Résultat |
|--------|----------|
| **Code / graphe Alembic** | Tête unique **`e8f9a0b1c2d3`**. Chaîne valide depuis `335d7c71186e` (init) + révisions intermédiaires + merge `ea87fd9f3cdb` + branche menant à `d4e5f6a7b8c1` puis **`e8f9a0b1c2d3`** (renommages colonnes messagerie legacy → noms neutres, idempotent si déjà à jour). |
| **Base PostgreSQL cible** | **Non vérifiée** dans la session de rédaction ci-dessous (accès hôte / Settings). **Mise à jour :** une instance **Docker Compose locale** a été inspectée en lecture seule le 2026-03-27 — voir **`2026-03-27_chantier-db-legacy-prechecks-base-reelle-1.4.5.md`**. Staging / prod restent à contrôler séparément. |
| **SQLite ou autre locale** | Hors périmètre de vérification ; ne pas assimiler à la vérité prod (déjà cadré dans la note de décision). |

**Lecture :** pour **chaque** environnement d’exploitation (staging, prod, autres clones), exécuter `alembic current` + inspection enums/colonnes tant que non fait. Une **base Docker locale** a été lue le 2026-03-27 (voir note **prechecks-base-reelle**) ; cela ne couvre pas les autres cibles. La vérité **intentionnelle** (head) et les écarts vers scripts secondaires restent valables quel que soit l’environnement.

---

## 3. Schéma attendu par Alembic `head` (vue fonctionnelle)

L’`env.py` charge `Base.metadata` via `from recyclic_api.models import *` : le schéma nominal est la **somme** de la migration initiale et de toutes les révisions jusqu’à `e8f9a0b1c2d3`.

### 3.1 Révisions à forte valeur (rappel opératoire)

- **`335d7c71186e`** : schéma initial (tables métier, enums, `users` avec rôle incluant `manager`, `userstatus` incluant `active`, colonnes déjà `legacy_external_contact_id` / `external_registration_key` / `legacy_deposit_channel_user` dans le fichier actuel).
- **`07d1d205a8c6`** : retrait de `manager` sur le type PostgreSQL `userrole` (valeurs finales : `super-admin`, `admin`, `user`).
- **`1f030e91bee7`** : contrainte unicité sur `users.email` (à rappeler pour toute comparaison avec `create_schema.py` qui ne la crée pas).
- **`b47_p5_add_legacy_category_mapping_cache`** : table `legacy_category_mapping_cache`.
- **`d4e5f6a7b8c1`** : FK `users.site_id` → `sites.id` + nettoyage des orphelins (logique dupliquée côté `create_schema.py`).
- **`e8f9a0b1c2d3`** : sur bases **anciennes** encore avec les noms historiques de colonnes messagerie, renommage vers `legacy_external_contact_id`, `external_registration_key`, `legacy_deposit_channel_user` ; **downgrade explicite vide** (irréversible côté Alembic).

### 3.2 Tables portées par les modèles SQLAlchemy (proxy du metadata cible)

`admin_settings`, `audit_logs`, `cash_registers`, `cash_sessions`, `categories`, `deposits`, `email_events`, `email_logs`, `email_statuses`, `group_permissions` (association), `groups`, `legacy_category_mapping_cache`, `ligne_depot`, `login_history`, `payment_transactions`, `permissions`, `poste_reception`, `preset_buttons`, `registration_requests`, `sale_items`, `sales`, `settings`, `sites`, `sync_logs`, `ticket_depot`, `user_groups` (association), `user_sessions`, `user_status_history`, `users`.

*(Les colonnes et enums précis par table sont dans les migrations et les modèles ; une passe `alembic check` / autogenerate sur une base à jour reste un précheck recommandé.)*

---

## 4. Écarts : Alembic head ↔ modèles Python

**Position :** les modèles sont censés refléter le head ; cette session n’a pas exécuté d’autogenerate. Points de vigilance connus à ne pas oublier en précheck BDD :

- **`UserRole`** (modèle) : `super-admin`, `admin`, `user` — **aligné** avec `07d1d205a8c6`. Pas de `cashier` / `manager`.
- **`UserStatus`** (modèle) : inclut `active` — **aligné** avec l’init `335d7c71186e` ; tout script qui ne crée que `pending|approved|rejected` est **faux** par rapport au head.
- **Champs « compatibilité » sur `Deposit`** : `ai_classification`, `ai_confidence` (commentés legacy dans le modèle) — toujours en base via migrations ; à classer en matrice (données vs dette).

Si un écart apparaît après autogenerate, **priorité au head Alembic** jusqu’à correction ciblée du modèle ou d’une migration corrective.

---

## 5. Écarts : Alembic head ↔ `api/create_schema.py` (script secondaire)

Le script ne crée que **`sites`** + **`users`** (et enums associés). Il **ne constitue pas** le schéma complet.

| Sujet | Alembic / modèles | `create_schema.py` |
|--------|-------------------|---------------------|
| Tables | Tout le périmètre métier | Seulement `sites`, `users` |
| `userrole` | `super-admin`, `admin`, `user` | Inclut encore **`manager`** et **`cashier`** |
| `userstatus` | Inclut **`active`** | Uniquement `pending`, `approved`, `rejected` |
| Colonnes `users` | `email`, `hashed_password`, `hashed_pin`, champs profil, etc. | Grandes absentes (pas d’email obligatoire applicatif, pas de mot de passe, etc.) |
| Unicité / indexes | Ex. `ix_users_username`, contrainte email (`1f030e91bee7`) | Non reproduit intégralement |
| FK `site_id` | `d4e5f6a7b8c1` + logique orphelins | Logique orphelins **similaire** ; OK comme bricolage local |

**Conclusion :** toute base créée **uniquement** avec `create_schema.py` sera **structurellement divergente** du head (enums faux + tables manquantes).

---

## 6. Autres chemins parallèles (hors Alembic `api/`)

| Artefact | Risque |
|----------|--------|
| **`recyclique-1.4.4/create_tables.py`** | Crée `sites` / `deposits` avec `status` / `category` en **VARCHAR** au lieu des enums PostgreSQL du head ; colonne dépôt construite comme `telegram_user_id` (**pas** `legacy_deposit_channel_user`). Très risqué si encore utilisé. |
| **`recyclique-1.4.4/migrations/`** (racine) | Arbre Alembic **séparé et obsolète** pour l’opération courante — **ne pas confondre** avec `api/migrations/`. |
| **`recyclique-1.4.4/test_cli.py`** | Référence un flux WSL exécutant **`python create_schema.py`** — usage **historique / test CLI**, pas le chemin nominal de provisionnement. |

---

## 7. Inventaire des héritages legacy (classé)

### 7.1 Colonnes / clés à sémantique historique (schéma métier)

| Élément | Rôle | Dépendance |
|---------|------|------------|
| `users.legacy_external_contact_id` | Rapprochement / traces import ; **non exposée API** | Inscriptions, tests admin, audits |
| `registration_requests.external_registration_key` | Clé d’inscription externe (NOT NULL) | Flux registration |
| `deposits.legacy_deposit_channel_user` | Canal dépôt historique | Données existantes éventuelles |
| `deposits.ai_classification` / `ai_confidence` | Ancienne couche IA | Compatibilité / lectures (`confidence_score` préféré côté API dans certains endpoints) |

### 7.2 Table et services d’import legacy

| Élément | Rôle |
|---------|------|
| `legacy_category_mapping_cache` | Cache persistant fuzzy / LLM (B47-P5) |
| `LegacyImportService`, endpoints `legacy_import`, `LegacyCSVCleanerService` | Pipeline import CSV |
| `scripts/clean_legacy_import.py` | Préparation CSV offline (fichiers, pas schéma BDD) |
| Config `LEGACY_IMPORT_LLM_*` | Activation OpenRouter / modèles |

### 7.3 Enums et contraintes sensibles

- **`userrole`** : déjà migré (suppression `manager`) — ne pas réintroduire via scripts DDL ad hoc.
- **`userstatus`** : valeur `active` requise côté modèle / init ; scripts partiels qui l’omettent sont dangereux.
- **Renommages M11E (`e8f9a0b1c2d3`)** : bases mixtes (avant/après) gérées par migration idempotente ; **pas de rollback Alembic** fiable sur ces renommages.

---

## 8. Matrice de décision (trajectoire, pas implémentation)

| Héritage | Garder temporairement | Déprécier applicativement | Migrer physiquement | Supprimer plus tard |
|----------|------------------------|---------------------------|---------------------|---------------------|
| `legacy_external_contact_id` | Oui tant qu’import / rapprochement utile | API déjà hors surface ; documenter « no new writes » si politique arrêtée | Renommer/supprimer colonne | Après validation données + snapshot |
| `external_registration_key` | Oui (contrat métier inscription) | — | Éventuellement renommer pour clarté | Non sans remplacement de flux |
| `legacy_deposit_channel_user` | Oui si données historiques | Ne plus alimenter si canal abandonné | Suppression colonne | Après archivage / export |
| `ai_classification` / `ai_confidence` | Oui si lectures ou rapports | Rediriger tout nouveau code vers champs canoniques | Fusion / drop | Après migration données vers champs cibles |
| `legacy_category_mapping_cache` | Oui pendant usage import | TTL / purge policy documentée | — | Si import legacy arrêté définitivement |
| `create_schema.py` | Non comme vérité | Marquer README « debug only » / dépréciation | — | Retrait ou réécriture **après** une seule voie Alembic validée |
| `create_tables.py` (racine) | Non | **Déprécier fortement** | — | Supprimer ou isoler hors doc « quick start » |
| Dossier `migrations/` racine | Non pour ops | Ignorer dans runbooks | — | Archiver ou supprimer quand plus aucun outil ne le référence |

---

## 9. Séquence d’exécution recommandée (chantier DB dédié)

1. **Snapshot / dump** de la base cible (obligatoire avant toute opération destructive).
2. **Configurer l’environnement** (`.env` ou secrets) pour que `alembic` résolve la bonne URL (**pas** `TEST_DATABASE_URL` hors contexte test — voir garde-fous `env.py`).
3. **`alembic heads`** → doit afficher `e8f9a0b1c2d3` ; **`alembic current`** → doit correspondre à la tête ou documenter l’écart (branche partielle, base ancienne).
4. **Requêtes d’inspection** (ou `\d` / information_schema) : enums `userrole`, `userstatus` ; colonnes `users`, `registration_requests`, `deposits` ; présence table `legacy_category_mapping_cache` ; intégrité `users.site_id`.
5. **Comparer** le résultat aux migrations et modèles ; si écart, **stop** et ticket de remédiation (upgrade manquant vs dérive manuelle).
6. **Décisions métier** sur colonnes legacy (matrice §8) avec validation humaine.
7. **Seulement ensuite** : concevoir migrations Alembic + scripts de nettoyage de données ; ordre = données → contraintes → suppressions.

---

## 10. Préchecks obligatoires (checklist)

1. Chemin Alembic = `recyclique-1.4.4/api/`.
2. `alembic heads` = `e8f9a0b1c2d3`.
3. `alembic current` sur l’environnement cible + copie dans la prochaine note.
4. Nature de l’analyse : **cette note = code + heads uniquement** ; prochaine passe = base restaurée / env cible.
5. Existence d’un **dump** avant action risquée.
6. Inventaire des usages de `create_schema.py`, `create_tables.py`, `test_cli.py` dans CI, docs, scripts ops.

---

## 11. Rollback réaliste

- **Migrations avec `downgrade` vide ou no-op partiel** (`e8f9a0b1c2d3`) : **pas de retour arrière** fiable via Alembic pour les renommages déjà appliqués.
- **Stratégie** : **restauration snapshot** (backup BDD) comme rollback principal pour toute évolution destructive ; migrations réversibles seulement quand `downgrade()` est complet et testé.
- **Données** : scripts de rollback données à maintenir à part (hors Alembic) si transformations complexes.

---

## 12. Synthèse pour handoff

| Sûr à faire maintenant (sans toucher la BDD) | Reporté explicitement | Nécessite validation humaine |
|---------------------------------------------|------------------------|------------------------------|
| Documenter chemins ; marquer scripts parallèles comme non nominaux | Migrations destructives ; refonte `create_schema.py` | Suppression colonnes legacy ; purge cache import ; abandon `create_tables.py` en prod |
| Exécuter préchecks `alembic` sur base réelle | Fusion / réécriture graphe Alembic | Politique de rétention des identifiants externes |

**Inconnues bloquantes restantes :** révision réelle en table `alembic_version` sur chaque environnement ; état des enums et colonnes sur copies prod/staging ; usage effectif de `create_tables.py` ou `create_schema.py` hors dépôt (runbooks internes).

---

*Document produit dans le cadre du plan chantier DB legacy ; cohérent avec `2026-03-27_note-decision-db-migrations-legacy-1.4.5.md`.*
